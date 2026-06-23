import { type NeonQueryFunction } from '@neondatabase/serverless';
import { addWorkingDays, subtractWorkingDays, workingDaysBetween } from './dateUtils';

type Sql = NeonQueryFunction<false, false>;

export interface DepRow {
  wbs_id: string;
  predecessor_wbs_id: string;
  dep_type: string;
  lag_days: number;
}

/** Create the dependencies table if it doesn't exist (handles already-seeded DBs). */
export async function ensureDependenciesTable(sql: Sql): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS task_dependencies (
    wbs_id VARCHAR(20) REFERENCES tasks(wbs_id),
    predecessor_wbs_id VARCHAR(20) REFERENCES tasks(wbs_id),
    dep_type VARCHAR(2) NOT NULL DEFAULT 'FS',
    lag_days SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (wbs_id, predecessor_wbs_id)
  )`;
}

/**
 * Would adding edge (wbs_id depends on predecessor_wbs_id) create a cycle?
 * A cycle exists if predecessor is already reachable from wbs_id via existing edges.
 */
export function wouldCreateCycle(deps: DepRow[], wbsId: string, predecessorId: string): boolean {
  if (wbsId === predecessorId) return true;
  // Follow predecessor links starting from the proposed predecessor; if we reach wbsId, it's a cycle.
  const predOf = new Map<string, string[]>();
  for (const d of deps) {
    if (!predOf.has(d.wbs_id)) predOf.set(d.wbs_id, []);
    predOf.get(d.wbs_id)!.push(d.predecessor_wbs_id);
  }
  const stack = [predecessorId];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === wbsId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const p of predOf.get(cur) ?? []) stack.push(p);
  }
  return false;
}

interface TaskDates {
  wbs_id: string;
  start_date: string | null;
  finish_date: string | null;
}

/**
 * Forward-only cascade. For each Finish-to-Start dependency, if the successor would
 * start before predecessor.finish + lag (working days), push the successor forward,
 * preserving its working-day duration. Never pulls a task earlier.
 *
 * Returns the set of tasks whose dates changed.
 */
export function cascadeForward(tasks: TaskDates[], deps: DepRow[]): TaskDates[] {
  const byId = new Map(tasks.map((t) => [t.wbs_id, { ...t }]));

  // Build successor adjacency + in-degree for topological processing
  const successors = new Map<string, DepRow[]>();
  const indeg = new Map<string, number>();
  for (const t of tasks) indeg.set(t.wbs_id, 0);
  for (const d of deps) {
    if (d.dep_type !== 'FS') continue; // v1 schedules FS only
    if (!byId.has(d.wbs_id) || !byId.has(d.predecessor_wbs_id)) continue;
    if (!successors.has(d.predecessor_wbs_id)) successors.set(d.predecessor_wbs_id, []);
    successors.get(d.predecessor_wbs_id)!.push(d);
    indeg.set(d.wbs_id, (indeg.get(d.wbs_id) ?? 0) + 1);
  }

  // Kahn topological order (deps form a DAG — cycles are rejected at write time)
  const queue = [...indeg.entries()].filter(([, n]) => n === 0).map(([id]) => id);
  const order: string[] = [];
  const deg = new Map(indeg);
  while (queue.length) {
    const cur = queue.shift()!;
    order.push(cur);
    for (const d of successors.get(cur) ?? []) {
      deg.set(d.wbs_id, (deg.get(d.wbs_id) ?? 0) - 1);
      if (deg.get(d.wbs_id) === 0) queue.push(d.wbs_id);
    }
  }

  const changed: TaskDates[] = [];

  for (const id of order) {
    // Push this task's successors forward if they'd violate the FS constraint.
    // Topological order guarantees `id`'s own dates are already final here.
    for (const d of successors.get(id) ?? []) {
      const pred = byId.get(d.predecessor_wbs_id)!;
      const child = byId.get(d.wbs_id)!;
      if (!pred.finish_date || !child.start_date) continue;

      // Earliest the successor may start: working day after predecessor finishes, plus lag
      const earliest = addWorkingDays(new Date(pred.finish_date), 1 + (d.lag_days ?? 0));
      const earliestStr = earliest.toISOString().split('T')[0];

      if (new Date(child.start_date) < new Date(earliestStr)) {
        // Preserve the child's working-day span, shift it forward
        const span = child.finish_date
          ? workingDaysBetween(new Date(child.start_date), new Date(child.finish_date))
          : 0;
        child.start_date = earliestStr;
        child.finish_date = addWorkingDays(earliest, span).toISOString().split('T')[0];
        if (!changed.some((c) => c.wbs_id === child.wbs_id)) {
          changed.push({ wbs_id: child.wbs_id, start_date: child.start_date, finish_date: child.finish_date });
        } else {
          const existing = changed.find((c) => c.wbs_id === child.wbs_id)!;
          existing.start_date = child.start_date;
          existing.finish_date = child.finish_date;
        }
      }
    }
  }

  return changed;
}

/**
 * Classic CPM (Critical Path Method) — forward + backward pass over FS links.
 *
 * Forward pass:  EF[t] = max over predecessors of (EF[pred] + lag) + span
 * Backward pass: LS[t] = min over successors of (LS[succ] - lag) - span
 * Float = LF - EF  (in working days); float == 0 → task is on the critical path.
 *
 * Only tasks that have both start_date and finish_date participate.
 * Returns the set of wbs_ids on the critical path, plus the projected project end date.
 */
export function computeCriticalPath(
  tasks: TaskDates[],
  deps: DepRow[]
): { critical: Set<string>; projectEnd: string | null } {
  const dated = tasks.filter((t) => t.start_date && t.finish_date);
  if (dated.length === 0) return { critical: new Set(), projectEnd: null };

  const byId = new Map(dated.map((t) => [t.wbs_id, t]));

  // Build FS-only adjacency maps
  const successors = new Map<string, DepRow[]>();
  const predecessors = new Map<string, DepRow[]>();
  const indeg = new Map<string, number>(dated.map((t) => [t.wbs_id, 0]));

  for (const d of deps) {
    if (d.dep_type !== 'FS') continue;
    if (!byId.has(d.wbs_id) || !byId.has(d.predecessor_wbs_id)) continue;
    if (!successors.has(d.predecessor_wbs_id)) successors.set(d.predecessor_wbs_id, []);
    successors.get(d.predecessor_wbs_id)!.push(d);
    if (!predecessors.has(d.wbs_id)) predecessors.set(d.wbs_id, []);
    predecessors.get(d.wbs_id)!.push(d);
    indeg.set(d.wbs_id, (indeg.get(d.wbs_id) ?? 0) + 1);
  }

  // Kahn topological order
  const queue = [...indeg.entries()].filter(([, n]) => n === 0).map(([id]) => id);
  const order: string[] = [];
  const deg = new Map(indeg);
  while (queue.length) {
    const cur = queue.shift()!;
    order.push(cur);
    for (const d of successors.get(cur) ?? []) {
      deg.set(d.wbs_id, (deg.get(d.wbs_id) ?? 0) - 1);
      if (deg.get(d.wbs_id) === 0) queue.push(d.wbs_id);
    }
  }

  // Working-day span of each task (inclusive: 1 day if start == finish)
  const span = new Map<string, number>();
  for (const t of dated) {
    span.set(t.wbs_id, Math.max(1, workingDaysBetween(new Date(t.start_date!), new Date(t.finish_date!)) + 1));
  }

  // ── Forward pass ──────────────────────────────────────────────────────────────
  // EF[t] = working-day date when task can earliest finish
  const ef = new Map<string, Date>();
  const es = new Map<string, Date>();

  for (const id of order) {
    const t = byId.get(id)!;
    let earlyStart = new Date(t.start_date!);
    for (const d of predecessors.get(id) ?? []) {
      const predEF = ef.get(d.predecessor_wbs_id);
      if (!predEF) continue;
      const candidate = addWorkingDays(predEF, d.lag_days ?? 0); // EF is inclusive, so no extra +1
      if (candidate > earlyStart) earlyStart = candidate;
    }
    es.set(id, earlyStart);
    ef.set(id, addWorkingDays(earlyStart, span.get(id)! - 1));
  }

  // Project end = latest EF among all dated tasks
  let projectEndDate = new Date(0);
  for (const [, d] of ef) {
    if (d > projectEndDate) projectEndDate = d;
  }
  const projectEnd = projectEndDate.getTime() === 0 ? null : projectEndDate.toISOString().split('T')[0];

  // ── Backward pass ─────────────────────────────────────────────────────────────
  // LF[t] = latest working-day date task may finish without pushing project end
  const lf = new Map<string, Date>();
  const ls = new Map<string, Date>();

  for (const id of [...order].reverse()) {
    let lateFinish = projectEndDate;
    for (const d of successors.get(id) ?? []) {
      const succLS = ls.get(d.wbs_id);
      if (!succLS) continue;
      const candidate = subtractWorkingDays(succLS, d.lag_days ?? 0);
      if (candidate < lateFinish) lateFinish = candidate;
    }
    lf.set(id, lateFinish);
    ls.set(id, subtractWorkingDays(lateFinish, span.get(id)! - 1));
  }

  // Float = LF - EF in working days; 0 → critical
  const critical = new Set<string>();
  for (const id of order) {
    const earlyFinish = ef.get(id)!;
    const lateFinish = lf.get(id)!;
    const floatDays = workingDaysBetween(earlyFinish, lateFinish);
    if (floatDays === 0) critical.add(id);
  }

  return { critical, projectEnd };
}

/** Load deps, run the cascade, and persist any changed task dates. Returns changed wbs_ids. */
export async function reschedule(sql: Sql): Promise<string[]> {
  await ensureDependenciesTable(sql);
  const tasks = await sql`SELECT wbs_id, start_date, finish_date FROM tasks` as TaskDates[];
  const deps = await sql`SELECT wbs_id, predecessor_wbs_id, dep_type, lag_days FROM task_dependencies` as DepRow[];
  const changed = cascadeForward(tasks, deps);
  for (const c of changed) {
    await sql`UPDATE tasks SET start_date = ${c.start_date}::date, finish_date = ${c.finish_date}::date, updated_at = NOW() WHERE wbs_id = ${c.wbs_id}`;
  }
  return changed.map((c) => c.wbs_id);
}
