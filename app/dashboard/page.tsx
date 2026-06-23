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
    return (
      <div className="card p-8 text-center max-w-md mx-auto mt-10">
        <p className="text-[#2C3E50] font-medium">Can&apos;t reach the database</p>
        <p className="text-sm text-[#404D5B] mt-1">
          Check that your connection details are set, then refresh.
        </p>
      </div>
    );
  }

  const totalTasks = data.laneProgress.reduce((s, l) => s + Number(l.total), 0);
  const totalComplete = data.laneProgress.reduce((s, l) => s + Number(l.complete), 0);
  const totalInProgress = data.laneProgress.reduce((s, l) => s + Number(l.in_progress), 0);
  const overallPct = totalTasks ? Math.round((totalComplete / totalTasks) * 100) : 0;
  const cw = data.currentWeek;
  const cwColor = cw
    ? cw.variance < 0 ? '#C00000' : cw.variance <= cw.available_hrs * 0.1 ? '#E8941A' : '#16a34a'
    : '#9aa5b1';

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const metrics = [
    {
      label: 'Needs attention',
      value: String(data.needsAttention.length),
      sub: 'decisions & blockers',
      color: data.needsAttention.length > 0 ? '#C00000' : '#16a34a',
    },
    {
      label: 'In progress',
      value: String(totalInProgress),
      sub: 'tasks underway',
      color: '#0070C0',
    },
    {
      label: 'This week',
      value: cw ? `${cw.variance >= 0 ? '+' : ''}${cw.variance}h` : '—',
      sub: cw ? `${cw.total_planned}h planned / ${cw.available_hrs}h free` : 'no active week',
      color: cwColor,
    },
    {
      label: 'Overloaded weeks',
      value: String(data.overloadedWeeks),
      sub: 'over capacity',
      color: data.overloadedWeeks > 0 ? '#E8941A' : '#16a34a',
    },
  ];

  return (
    <div>
      {/* Hero: navy program band with headline progress */}
      <div
        className="rise card overflow-hidden mb-5 border-0"
        style={{ background: 'linear-gradient(135deg, #0E4774 0%, #305F8E 100%)' }}
      >
        <div className="px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>L&D Goals · 2026 Program</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">Program Dashboard</h1>
            <p className="text-sm text-white/70 mt-1">As of {today}</p>
          </div>
          <div className="flex items-end gap-4">
            <div className="text-right">
              <p className="text-5xl font-bold text-white tnum leading-none">{overallPct}<span className="text-2xl">%</span></p>
              <p className="text-xs text-white/70 mt-1.5 tnum">{totalComplete} of {totalTasks} tasks complete</p>
            </div>
          </div>
        </div>
        {/* Progress rail */}
        <div className="h-1.5 bg-white/15">
          <div className="h-full" style={{ width: `${overallPct}%`, backgroundColor: 'var(--fusion-orange)' }} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((m, i) => (
          <div key={m.label} className="rise card p-5" style={{ ['--i' as string]: i + 1 }}>
            <p className="eyebrow">{m.label}</p>
            <p className="text-3xl font-bold mt-1.5 tnum leading-none" style={{ color: m.color }}>{m.value}</p>
            <p className="text-xs text-[#404D5B] mt-1.5">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Needs Attention panel */}
        <div className="rise card p-5 lg:col-span-2" style={{ ['--i' as string]: 5 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#0E4774]">Needs Attention</h2>
            <span className="text-xs text-[#404D5B] tnum">{data.needsAttention.length} item{data.needsAttention.length === 1 ? '' : 's'}</span>
          </div>
          {data.needsAttention.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-[#404D5B]">Nothing blocked or awaiting a decision.</p>
              <p className="text-xs text-[#404D5B]/70 mt-1">You&apos;re clear to keep moving.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {data.needsAttention.map((t) => (
                <li
                  key={t.wbs_id}
                  className="border-l-[3px] pl-3 py-1.5 rounded-r-md transition-colors hover:bg-[#F4EFEF]"
                  style={{ borderColor: t.status === 'Blocked' ? '#C00000' : '#7030A0' }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-[#404D5B] tnum">{t.wbs_id}</span>
                    <StatusPill status={t.status} />
                    <span className="text-xs text-[#404D5B]">{t.owner ?? '—'} · due {fmtDate(t.finish_date)}</span>
                  </div>
                  <p className="text-sm text-[#2C3E50] mt-1 font-medium">{t.task_name.trim()}</p>
                  {t.notes && <p className="text-xs text-[#404D5B] mt-0.5 line-clamp-2">{t.notes}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="rise card p-5" style={{ ['--i' as string]: 6 }}>
            <h2 className="text-sm font-bold text-[#0E4774] mb-4">Progress by Lane</h2>
            <div className="space-y-4">
              {data.laneProgress.map((l) => {
                const pct = Number(l.total) ? Math.round((Number(l.complete) / Number(l.total)) * 100) : 0;
                return (
                  <div key={l.lane}>
                    <div className="flex justify-between text-xs text-[#404D5B] mb-1.5">
                      <span className="font-medium truncate pr-2">{l.lane}</span>
                      <span className="tnum">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E7E6E6] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: 'var(--fusion-deep)' }} />
                    </div>
                    <p className="text-xs text-[#404D5B]/80 mt-1 tnum">
                      {l.complete} done · {l.in_progress} active · {l.total} total
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rise card p-5" style={{ ['--i' as string]: 7 }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-[#0E4774]">Upcoming Milestones</h2>
              <Link href="/milestones" className="text-xs font-medium text-[#E8941A] hover:underline">View all</Link>
            </div>
            <ul className="space-y-3">
              {data.milestones.map((m) => (
                <li key={m.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: MILESTONE_DOT[m.type] ?? '#9aa5b1' }} />
                  <div>
                    <p className="text-sm text-[#2C3E50] leading-tight">{m.name}</p>
                    <p className="text-xs text-[#404D5B] mt-0.5 tnum">{fmtDate(m.date)} · {m.type}</p>
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
