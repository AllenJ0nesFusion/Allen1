'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const HEALTH_ORDER = ['Off Track', 'At Risk', 'On Track', 'Not Started'] as const;
const HEALTH_COLOR: Record<string, string> = {
  'On Track': '#16a34a',
  'At Risk': '#E8941A',
  'Off Track': '#C00000',
  'Not Started': '#9aa5b1',
};

interface Goal {
  id: number;
  name: string;
  description: string | null;
  owner_user_id: number | null;
  owner_name: string | null;
  owner_email: string | null;
  target_date: string | null;
  health: string;
  status: string;
  task_count: number;
  done_count: number;
  pct: number;
}

type SortKey = 'name' | 'owner' | 'health' | 'pct' | 'target_date';

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const target = new Date(d);
  const today = new Date();
  const t0 = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const n0 = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((t0 - n0) / 86400000);
}

export default function PortfolioView() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>('health');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  useEffect(() => {
    fetch('/api/goals', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((g) => { setGoals(g); setLoading(false); });
  }, []);

  const summary = useMemo(() => {
    const byHealth: Record<string, number> = { 'On Track': 0, 'At Risk': 0, 'Off Track': 0, 'Not Started': 0 };
    let taskTotal = 0, doneTotal = 0, pctWeightSum = 0, overdue = 0;
    for (const g of goals) {
      byHealth[g.health] = (byHealth[g.health] ?? 0) + 1;
      const tc = Number(g.task_count);
      taskTotal += tc;
      doneTotal += Number(g.done_count);
      pctWeightSum += Number(g.pct) * tc;
      const du = daysUntil(g.target_date);
      if (du !== null && du < 0 && Number(g.pct) < 100) overdue += 1;
    }
    const avgPct = taskTotal ? Math.round(pctWeightSum / taskTotal) : 0;
    return { byHealth, taskTotal, doneTotal, avgPct, overdue, count: goals.length };
  }, [goals]);

  const sorted = useMemo(() => {
    const arr = [...goals];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'owner': cmp = (a.owner_name ?? a.owner_email ?? '').localeCompare(b.owner_name ?? b.owner_email ?? ''); break;
        case 'health': cmp = HEALTH_ORDER.indexOf(a.health as typeof HEALTH_ORDER[number]) - HEALTH_ORDER.indexOf(b.health as typeof HEALTH_ORDER[number]); break;
        case 'pct': cmp = Number(a.pct) - Number(b.pct); break;
        case 'target_date': {
          const ta = a.target_date ? new Date(a.target_date).getTime() : Infinity;
          const tb = b.target_date ? new Date(b.target_date).getTime() : Infinity;
          cmp = ta - tb; break;
        }
      }
      return cmp * sortDir;
    });
    return arr;
  }, [goals, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(1); }
  }

  if (loading) return <p className="text-sm text-[#404D5B]">Loading portfolio…</p>;
  if (goals.length === 0) return <p className="text-sm text-[#404D5B]">No goals yet.</p>;

  const Th = ({ label, k, className = '' }: { label: string; k: SortKey; className?: string }) => (
    <th
      className={`px-4 py-3 cursor-pointer select-none hover:text-[#0E4774] ${className}`}
      onClick={() => toggleSort(k)}
    >
      {label}{sortKey === k && <span className="ml-1">{sortDir === 1 ? '▲' : '▼'}</span>}
    </th>
  );

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rise card p-5">
          <p className="eyebrow">Goals tracked</p>
          <p className="text-3xl font-bold mt-1.5 tnum leading-none text-[#0E4774]">{summary.count}</p>
          <p className="text-xs text-[#404D5B] mt-1.5">{summary.doneTotal} of {summary.taskTotal} tasks complete</p>
        </div>
        <div className="rise card p-5">
          <p className="eyebrow">Avg progress</p>
          <p className="text-3xl font-bold mt-1.5 tnum leading-none text-[#0E4774]">{summary.avgPct}%</p>
          <p className="text-xs text-[#404D5B] mt-1.5">task-weighted across goals</p>
        </div>
        <div className="rise card p-5">
          <p className="eyebrow">Needs attention</p>
          <p className="text-3xl font-bold mt-1.5 tnum leading-none" style={{ color: (summary.byHealth['At Risk'] + summary.byHealth['Off Track']) > 0 ? '#C00000' : '#16a34a' }}>
            {summary.byHealth['At Risk'] + summary.byHealth['Off Track']}
          </p>
          <p className="text-xs text-[#404D5B] mt-1.5">{summary.byHealth['Off Track']} off track · {summary.byHealth['At Risk']} at risk</p>
        </div>
        <div className="rise card p-5">
          <p className="eyebrow">Overdue</p>
          <p className="text-3xl font-bold mt-1.5 tnum leading-none" style={{ color: summary.overdue > 0 ? '#E8941A' : '#16a34a' }}>{summary.overdue}</p>
          <p className="text-xs text-[#404D5B] mt-1.5">past target, &lt;100%</p>
        </div>
      </div>

      <div className="rise card p-5 mb-6">
        <h2 className="text-sm font-bold text-[#0E4774] mb-3">Health distribution</h2>
        <div className="flex h-3 rounded-full overflow-hidden bg-[#E7E6E6]">
          {HEALTH_ORDER.map((h) => {
            const n = summary.byHealth[h];
            if (!n) return null;
            return <div key={h} style={{ width: `${(n / summary.count) * 100}%`, backgroundColor: HEALTH_COLOR[h] }} title={`${h}: ${n}`} />;
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {HEALTH_ORDER.map((h) => (
            <span key={h} className="flex items-center gap-1.5 text-xs text-[#404D5B]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: HEALTH_COLOR[h] }} />
              {h} · <span className="tnum font-semibold">{summary.byHealth[h]}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-[#404D5B] uppercase tracking-wide border-b border-gray-100">
              <Th label="Goal" k="name" />
              <Th label="Owner" k="owner" />
              <Th label="Health" k="health" />
              <Th label="Progress" k="pct" />
              <th className="px-4 py-3">Tasks</th>
              <Th label="Target" k="target_date" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((g) => {
              const pct = Number(g.pct);
              const du = daysUntil(g.target_date);
              const overdue = du !== null && du < 0 && pct < 100;
              return (
                <tr key={g.id} onClick={() => router.push(`/goals?goal=${g.id}`)} className="border-b border-gray-50 hover:bg-[#F4EFEF] transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="text-[#2C3E50] font-medium">{g.name}</p>
                    {g.description && <p className="text-xs text-[#404D5B] mt-0.5 line-clamp-1">{g.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#404D5B]">{g.owner_name || g.owner_email || 'Unassigned'}</td>
                  <td className="px-4 py-3">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: (HEALTH_COLOR[g.health] ?? '#9aa5b1') + '22', color: HEALTH_COLOR[g.health] ?? '#404D5B' }}
                    >
                      {g.health}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 w-32">
                      <div className="flex-1 h-2 rounded-full bg-[#E7E6E6] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16a34a' : '#0E4774' }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-[#0E4774] w-9 text-right">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#404D5B] tnum whitespace-nowrap">{Number(g.done_count)}/{Number(g.task_count)}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: overdue ? '#C00000' : '#404D5B' }}>
                    {fmtDate(g.target_date)}
                    {overdue && <span className="ml-1 font-semibold">({Math.abs(du!)}d late)</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
