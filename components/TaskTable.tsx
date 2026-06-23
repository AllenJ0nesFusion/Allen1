'use client';

import { useState, useMemo, Fragment } from 'react';
import StatusPill from './StatusPill';
import EditModal, { type TaskRow } from './EditModal';

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
  const [editTask, setEditTask] = useState<TaskRow | null>(null);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (laneFilter !== 'All' && !t.lane.includes(laneFilter)) return false;
      if (statusFilter !== 'All' && t.status !== statusFilter) return false;
      if (search && !t.task_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, statusFilter, laneFilter, search]);

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
    return lanes;
  }, [tasks, filtered]);

  function handleSaved(updated: TaskRow) {
    setTasks((prev) => prev.map((t) => t.wbs_id === updated.wbs_id ? { ...t, ...updated } : t));
    setEditTask(null);
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
              <th className="px-4 py-3">Finish</th>
              <th className="px-4 py-3">Effort</th>
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
                      colSpan={6}
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
                            onClick={() => setEditTask(t)}
                            className="border-b border-gray-50 hover:bg-[#F4EFEF] cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-2.5 text-xs text-[#404D5B] font-mono">{t.wbs_id}</td>
                            <td className="px-4 py-2.5 text-[#2C3E50]">{t.task_name}</td>
                            <td className="px-4 py-2.5 text-[#404D5B] text-xs">{t.owner ?? '—'}</td>
                            <td className="px-4 py-2.5"><StatusPill status={t.status} /></td>
                            <td className="px-4 py-2.5 text-xs text-[#404D5B]">{formatDate(t.finish_date as string | null)}</td>
                            <td className="px-4 py-2.5 text-xs text-[#404D5B]">{t.effort_hrs != null ? `${t.effort_hrs}h` : '—'}</td>
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
        <EditModal task={editTask} onClose={() => setEditTask(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
