import Link from 'next/link';
import StatusPill from '@/components/StatusPill';

interface LaneProgress {
  lane: string;
  total: number;
  complete: number;
  in_progress: number;
}
interface StatusCount { status: string; count: number; }
interface AttentionTask {
  wbs_id: string; task_name: string; lane: string; status: string;
  owner: string | null; finish_date: string | null; notes: string | null;
}
interface Milestone {
  id: number; type: string; name: string; date: string;
  lane_goal: string; allen_role: string;
}
interface CurrentWeek {
  week_start: string; week_end: string; available_hrs: number;
  total_planned: number; variance: number; notes: string | null;
}
interface DashboardData {
  laneProgress: LaneProgress[];
  statusBreakdown: StatusCount[];
  needsAttention: AttentionTask[];
  milestones: Milestone[];
  currentWeek: CurrentWeek | null;
  overloadedWeeks: number;
}

async function getData(): Promise<DashboardData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/dashboard`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json() as Promise<DashboardData>;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const MILESTONE_DOT: Record<string, string> = {
  'External - Client': '#C00000',
  'Internal - Deadline': '#0E4774',
  'Internal - Decision': '#7030A0',
  'Internal - Escalation': '#E8941A',
  'US Holiday': '#9aa5b1',
};

export default async function DashboardPage() {
  const data = await getData();

  if (!data) {
    return <p className="text-[#404D5B]">Unable to load dashboard. Is the database connected?</p>;
  }

  const totalTasks = data.laneProgress.reduce((s, l) => s + Number(l.total), 0);
  const totalComplete = data.laneProgress.reduce((s, l) => s + Number(l.complete), 0);
  const overallPct = totalTasks ? Math.round((totalComplete / totalTasks) * 100) : 0;
  const cw = data.currentWeek;
  const cwColor = cw
    ? cw.variance < 0 ? '#C00000' : cw.variance <= cw.available_hrs * 0.1 ? '#E8941A' : '#16a34a'
    : '#9aa5b1';

  return (
    <div>
      <h1 className="text-xl font-bold text-[#0E4774] mb-1">Dashboard</h1>
      <p className="text-sm text-[#404D5B] mb-6">L&D Goals — 2026 program overview</p>

      {/* Top metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#404D5B]">Overall Progress</p>
          <p className="text-3xl font-bold text-[#0E4774] mt-1">{overallPct}%</p>
          <p className="text-xs text-[#404D5B] mt-1">{totalComplete} of {totalTasks} tasks complete</p>
          <div className="mt-3 h-2 rounded-full bg-[#E7E6E6] overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${overallPct}%`, backgroundColor: '#16a34a' }} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#404D5B]">Needs Attention</p>
          <p className="text-3xl font-bold mt-1" style={{ color: data.needsAttention.length > 0 ? '#C00000' : '#16a34a' }}>
            {data.needsAttention.length}
          </p>
          <p className="text-xs text-[#404D5B] mt-1">decisions & blockers</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#404D5B]">This Week</p>
          {cw ? (
            <>
              <p className="text-3xl font-bold mt-1" style={{ color: cwColor }}>
                {cw.variance >= 0 ? `+${cw.variance}` : cw.variance}h
              </p>
              <p className="text-xs text-[#404D5B] mt-1">
                {cw.total_planned}h planned / {cw.available_hrs}h available
              </p>
            </>
          ) : (
            <p className="text-sm text-[#404D5B] mt-2">No active week</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#404D5B]">Overloaded Weeks</p>
          <p className="text-3xl font-bold mt-1" style={{ color: data.overloadedWeeks > 0 ? '#E8941A' : '#16a34a' }}>
            {data.overloadedWeeks}
          </p>
          <p className="text-xs text-[#404D5B] mt-1">
            <Link href="/burndown" className="underline hover:text-[#0E4774]">view burndown →</Link>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention panel */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-5">
          <h2 className="text-sm font-bold text-[#0E4774] mb-3">Needs Attention</h2>
          {data.needsAttention.length === 0 ? (
            <p className="text-sm text-[#404D5B]">Nothing blocked or awaiting a decision. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {data.needsAttention.map((t) => (
                <li key={t.wbs_id} className="border-l-4 pl-3 py-1" style={{ borderColor: t.status === 'Blocked' ? '#C00000' : '#7030A0' }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-[#404D5B]">{t.wbs_id}</span>
                    <StatusPill status={t.status} />
                    <span className="text-xs text-[#404D5B]">· {t.owner ?? '—'} · due {fmtDate(t.finish_date)}</span>
                  </div>
                  <p className="text-sm text-[#2C3E50] mt-0.5">{t.task_name.trim()}</p>
                  {t.notes && <p className="text-xs text-[#404D5B] mt-0.5 line-clamp-2">{t.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right column: progress by lane + upcoming milestones */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="text-sm font-bold text-[#0E4774] mb-3">Progress by Lane</h2>
            <div className="space-y-4">
              {data.laneProgress.map((l) => {
                const pct = Number(l.total) ? Math.round((Number(l.complete) / Number(l.total)) * 100) : 0;
                return (
                  <div key={l.lane}>
                    <div className="flex justify-between text-xs text-[#404D5B] mb-1">
                      <span className="font-medium">{l.lane}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E7E6E6] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: '#305F8E' }} />
                    </div>
                    <p className="text-xs text-[#404D5B] mt-1">
                      {l.complete} complete · {l.in_progress} in progress · {l.total} total
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-[#0E4774]">Upcoming Milestones</h2>
              <Link href="/milestones" className="text-xs underline text-[#404D5B] hover:text-[#0E4774]">all →</Link>
            </div>
            <ul className="space-y-2.5">
              {data.milestones.map((m) => (
                <li key={m.id} className="flex items-start gap-2">
                  <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: MILESTONE_DOT[m.type] ?? '#9aa5b1' }} />
                  <div>
                    <p className="text-sm text-[#2C3E50] leading-tight">{m.name}</p>
                    <p className="text-xs text-[#404D5B]">{fmtDate(m.date)} · {m.type}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
