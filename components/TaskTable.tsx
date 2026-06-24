'use client';

import { useState, useMemo, Fragment, useEffect } from 'react';
import StatusPill from './StatusPill';
import EditModal, { type TaskRow } from './EditModal';
import AddTaskModal from './AddTaskModal';

const STATUS_OPTIONS = [
  'All', 'Not Started', 'In Progress', 'Complete', 'Waiting', 'Blocked', 'Decision Required', 'Contingent',
];

const LANE_OPTIONS = ['All', '1 - Training Redesign', '2 - Certification'];

interface Props {
  initialTasks: TaskRow[];
}

export default function TaskTable({ initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [statusFilter, setStatusFilter] = useState('All');
  const [laneFilter, setLaneFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.ok ? r.json() : null).then((u) => {
      if (u?.user?.userId) setCurrentUserId(u.user.userId);
    });
  }, []);

  async function refresh(): Promise<TaskRow[]> {
    const res = await fetch('/api/tasks', { cache: 'no-store' });
    const { tasks: data } = await res.json() as { tasks: TaskRow[]; projectEnd: string | null };
    setTasks(data);
    return data;
  }

  const editTask = editId ? tasks.find((t) => t.wbs_id === editId) ?? null : null;

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (laneFilter !== 'All' && !t.lane.includes(laneFilter)) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (search && !t.task_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (myTasksOnly && currentUserId && t.assigned_user_id !== currentUserId) return false;
      return true;
    });
  }, [tasks, statusFilter, laneFilter, search, myTasksOnly, currentUserId]);

  // Group by Lane → workstream (outline_level 2) → tasks (outline_level 3)
  const grouped = useMemo(() => {
    const lanes = new Map<string, { level2: Map<string, TaskRow[]>; level2Order: string[] }>();
    const allRows = tasks; // use unfiltered for structure
    for (const t of allRows) {
      if (!lanes.has(t.lane)) lanes.set(t.lane, { level2: new Map(), level2Order: [] });
    }
    // Build level2 groupings using parent
    const byWbsId = new Map(allRows.map((t) => [t.wbs_id, t]));
    for (const t of filtered) {
      if (t.outline_level !== 3) continue;
      const parentId = t.parent_wbs_id as string | null;
      const parent = parentId ? byWbsId.get(parentId) : null;
      const parentName = parent?.task_name ?? 'Other';
      const laneEntry = lanes.get(t.lane);
      if (!laneEntry) continue;
      if (!laneEntry.level2.has(parentName)) {
        laneEntry.level2.set(parentName, []);
        laneEntry.level2Order.push(parentName);
      }
      laneEntry.level2.get(parentName)!.push(t);
    }
    // Order tasks within each workstream by start date (nulls last), wbs_id as tiebreak
    for (const { level2 } of lanes.values()) {
      for (const arr of level2.values()) {
        arr.sort((a, b) => {
          const da = a.start_date ? new Date(a.start_date).getTime() : Infinity;
          const db = b.start_date ? new Date(b.start_date).getTime() : Infinity;
          if (da !== db) return da - db;
          return a.wbs_id.localeCompare(b.wbs_id, undefined, { numeric: true });
        });
      }
    }
    return lanes;
  }, [tasks, filtered]);

  async function handleCreated() {
    await refresh();
    setAdding(false);
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="search"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0E4774]"
        />
        <select
          value={laneFilter}
          onChange={(e) => setLaneFilter(e.target.value)}
          className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0E4774]"
        >
          {LANE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0E4774]"
        >
          {STATUS_OPTIONS.map((o) => <option key={o}>{o}</option>)}
        </select>
        {currentUserId && (
          <button
            onClick={() => setMyTasksOnly((v) => !v)}
            className="px-3 py-1.5 text-sm font-medium rounded border transition-colors"
            style={myTasksOnly
              ? { backgroundColor: '#0E4774', color: '#fff', borderColor: '#0E4774' }
              : { backgroundColor: 'transparent', color: '#0E4774', borderColor: '#0E4774' }}
          >
            My Tasks
          </button>
        )}
        <button
          onClick={() => setAdding(true)}
          className="ml-auto px-4 py-1.5 text-sm font-semibold text-white rounded transition-all hover:shadow-md"
          style={{ backgroundColor: '#0E4774' }}
        >
          + Add Task
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-[#404D5B] uppercase tracking-wide border-b border-gray-100">
              <th className="px-4 py-3">WBS</th>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Progress</th>
              <th className="px-4 py-3">Finish</th>
              <th className="px-4 py-3">Effort</th>
              <th className="px-4 py-3 text-[#C00000]" title="Critical path task">CP</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(grouped.entries()).map(([lane, { level2, level2Order }]) => {
              const hasAnyRows = level2Order.some((k) => (level2.get(k)?.length ?? 0) > 0);
              if (!hasAnyRows) return null;
              return (
                <Fragment key={`lane-${lane}`}>
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-2 text-sm font-bold text-white"
                      style={{ backgroundColor: '#0E4774' }}
                    >
                      {lane}
                    </td>
                  </tr>
                  {level2Order.map((parentName) => {
                    const rows = level2.get(parentName) ?? [];
                    if (rows.length === 0) return null;
                    return (
                      <Fragment key={`ws-${lane}-${parentName}`}>
                        <tr style={{ backgroundColor: '#E7E6E6' }}>
                          <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-[#404D5B]">
                            {parentName}
                          </td>
                        </tr>
                        {rows.map((t) => (
                          <tr
                            key={t.wbs_id}
                            onClick={() => setEditId(t.wbs_id)}
                            className="border-b border-gray-50 hover:bg-[#F4EFEF] cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-2.5 text-xs text-[#404D5B] font-mono">{t.wbs_id}</td>
                            <td className="px-4 py-2.5 text-[#2C3E50]">
                              {t.task_name}
                              {(t.predecessors?.length ?? 0) > 0 && (
                                <span
                                  className="ml-1.5 text-[10px] text-[#0E4774] align-middle"
                                  title={`Depends on ${t.predecessors!.length} task(s)`}
                                >
                                  🔗{t.predecessors!.length}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-[#404D5B] text-xs">
                              {t.assigned_user_name ?? t.assigned_user_email ?? t.owner ?? '—'}
                            </td>
                            <td className="px-4 py-2.5"><StatusPill status={t.status} /></td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2 w-28">
                                <div className="flex-1 h-1.5 rounded-full bg-[#E7E6E6] overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${t.percent_complete ?? 0}%`,
                                      backgroundColor: (t.percent_complete ?? 0) === 100 ? '#16a34a' : '#0E4774',
                                    }}
                                  />
                                </div>
                                <span className="text-[10px] tabular-nums text-[#404D5B] w-7 text-right">{t.percent_complete ?? 0}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-[#404D5B]">{formatDate(t.finish_date as string | null)}</td>
                            <td className="px-4 py-2.5 text-xs text-[#404D5B]">{t.effort_hrs != null ? `${t.effort_hrs}h` : '—'}</td>
                            <td className="px-4 py-2.5">
                              {t.is_critical && (
                                <span className="text-[10px] font-bold text-[#C00000]" title="On the critical path — any delay pushes the project end date">●</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {editTask && (
        <EditModal task={editTask} allTasks={tasks} onClose={() => setEditId(null)} onRefresh={refresh} />
      )}

      {adding && (
        <AddTaskModal tasks={tasks} onClose={() => setAdding(false)} onCreated={handleCreated} />
      )}
    </div>
  );
}
