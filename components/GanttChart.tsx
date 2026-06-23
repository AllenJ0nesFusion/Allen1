'use client';

import { useState } from 'react';
import { type TaskRow } from './EditModal';
import EditModal from './EditModal';

const PROJECT_START = new Date('2026-06-15');
const PROJECT_END = new Date('2026-12-31');
const TOTAL_DAYS = Math.round((PROJECT_END.getTime() - PROJECT_START.getTime()) / 86400000) + 1;

const STATUS_BAR: Record<string, { bg: string; text: string }> = {
  'Not Started':       { bg: '#d1d5db', text: '#404D5B' },
  'In Progress':       { bg: '#0070C0', text: '#fff' },
  'Complete':          { bg: '#16a34a', text: '#fff' },
  'Waiting':           { bg: '#e5e7eb', text: '#404D5B' },
  'Blocked':           { bg: '#C00000', text: '#fff' },
  'Decision Required': { bg: '#7030A0', text: '#fff' },
  'Contingent':        { bg: '#E8941A', text: '#fff' },
};

function dayOffset(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.round((d.getTime() - PROJECT_START.getTime()) / 86400000);
}

function pct(days: number): string {
  return `${((days / TOTAL_DAYS) * 100).toFixed(3)}%`;
}

// Generate month markers
function monthMarkers() {
  const markers: { label: string; leftPct: string }[] = [];
  const d = new Date(PROJECT_START);
  d.setDate(1);
  while (d <= PROJECT_END) {
    if (d >= PROJECT_START) {
      const offset = Math.max(0, Math.round((d.getTime() - PROJECT_START.getTime()) / 86400000));
      markers.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        leftPct: pct(offset),
      });
    }
    d.setMonth(d.getMonth() + 1);
  }
  return markers;
}

// Today line
function todayPct(): string | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (today < PROJECT_START || today > PROJECT_END) return null;
  const offset = Math.round((today.getTime() - PROJECT_START.getTime()) / 86400000);
  return pct(offset);
}

interface GanttRow {
  type: 'lane' | 'workstream' | 'task';
  label: string;
  task?: TaskRow;
}

interface Props {
  tasks: TaskRow[];
}

export default function GanttChart({ tasks }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const [updatedTasks, setUpdatedTasks] = useState<TaskRow[]>(tasks);
  const [labelW, setLabelW] = useState(260);

  async function refresh(): Promise<TaskRow[]> {
    const res = await fetch('/api/tasks', { cache: 'no-store' });
    const data = await res.json() as TaskRow[];
    setUpdatedTasks(data);
    return data;
  }

  const editTask = editId ? updatedTasks.find((t) => t.wbs_id === editId) ?? null : null;

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = labelW;
    function onMove(ev: MouseEvent) {
      const next = Math.min(560, Math.max(160, startW + (ev.clientX - startX)));
      setLabelW(next);
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  const months = monthMarkers();
  const todayLeft = todayPct();

  // Build display rows
  const rows: GanttRow[] = [];
  const lanes = new Map<string, Map<string, TaskRow[]>>();
  const laneOrder: string[] = [];
  const wsOrder = new Map<string, string[]>();
  const wbsById = new Map(updatedTasks.map(t => [t.wbs_id, t]));

  for (const t of updatedTasks) {
    if (!lanes.has(t.lane)) { lanes.set(t.lane, new Map()); laneOrder.push(t.lane); wsOrder.set(t.lane, []); }
    if (t.outline_level !== 3) continue;
    const parent = t.parent_wbs_id ? wbsById.get(t.parent_wbs_id) : null;
    const wsName = parent?.task_name?.trim() ?? 'Other';
    const laneMap = lanes.get(t.lane)!;
    if (!laneMap.has(wsName)) { laneMap.set(wsName, []); wsOrder.get(t.lane)!.push(wsName); }
    laneMap.get(wsName)!.push(t);
  }

  for (const lane of laneOrder) {
    rows.push({ type: 'lane', label: lane });
    for (const ws of wsOrder.get(lane) ?? []) {
      const taskRows = (lanes.get(lane)?.get(ws) ?? []).slice().sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date).getTime() : Infinity;
        const db = b.start_date ? new Date(b.start_date).getTime() : Infinity;
        if (da !== db) return da - db;
        return a.wbs_id.localeCompare(b.wbs_id, undefined, { numeric: true });
      });
      if (taskRows.length === 0) continue;
      rows.push({ type: 'workstream', label: ws });
      for (const t of taskRows) rows.push({ type: 'task', label: t.task_name.trim(), task: t });
    }
  }

  const ROW_H = 28;
  const HEADER_H = 32;

  // Geometry for dependency arrows: map each visible task bar to its row + horizontal span
  const geom = new Map<string, { row: number; startPct: number; endPct: number }>();
  rows.forEach((r, i) => {
    if (r.type !== 'task' || !r.task) return;
    const t = r.task;
    if (!t.start_date || !t.finish_date) return;
    const startOff = Math.max(0, dayOffset(t.start_date));
    const endOff = Math.min(TOTAL_DAYS - 1, dayOffset(t.finish_date));
    geom.set(t.wbs_id, {
      row: i,
      startPct: (startOff / TOTAL_DAYS) * 100,
      endPct: ((endOff + 1) / TOTAL_DAYS) * 100,
    });
  });
  const rowY = (row: number) => HEADER_H + row * ROW_H + ROW_H / 2;
  const arrows: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  for (const r of rows) {
    if (r.type !== 'task' || !r.task) continue;
    const succ = geom.get(r.task.wbs_id);
    if (!succ) continue;
    for (const p of r.task.predecessors ?? []) {
      if (p.dep_type !== 'FS') continue;
      const pred = geom.get(p.wbs_id);
      if (!pred) continue;
      arrows.push({
        key: `${p.wbs_id}->${r.task.wbs_id}`,
        x1: pred.endPct, y1: rowY(pred.row),
        x2: succ.startPct, y2: rowY(succ.row),
      });
    }
  }
  const timelineHeight = HEADER_H + rows.length * ROW_H;

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
        {Object.entries(STATUS_BAR).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1.5 text-xs text-[#404D5B]">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: c.bg }} />
            {s}
          </span>
        ))}
      </div>

      {/* Chart wrapper: resizable label col + scrollable timeline */}
      <div className="flex rounded-lg overflow-hidden shadow-sm border border-[#E7E6E6]">
        {/* Label column — relative + raised so header labels can span over the timeline */}
        <div className="flex-shrink-0 bg-white relative z-20" style={{ width: labelW }}>
          {/* Header */}
          <div style={{ height: 32 }} className="border-b border-[#E7E6E6] flex items-center px-3">
            <span className="eyebrow">Task</span>
          </div>
          {rows.map((r, i) => {
            if (r.type === 'lane') return (
              <div key={i} className="flex items-center px-3 font-bold text-xs text-white whitespace-nowrap pointer-events-none"
                style={{ height: ROW_H, backgroundColor: '#0E4774' }}>
                {r.label}
              </div>
            );
            if (r.type === 'workstream') return (
              <div key={i} className="flex items-center px-3 font-semibold text-xs text-[#404D5B] whitespace-nowrap pointer-events-none"
                style={{ height: ROW_H, backgroundColor: '#E7E6E6' }}>
                {r.label}
              </div>
            );
            return (
              <div key={i} className="flex items-center px-3 text-xs text-[#2C3E50] truncate border-b border-[#F4EFEF] hover:bg-[#F4EFEF] cursor-pointer"
                style={{ height: ROW_H }}
                title={r.label}
                onClick={() => r.task && setEditId(r.task.wbs_id)}>
                {r.label}
              </div>
            );
          })}

          {/* Resize grip pinned to the column's right edge */}
          <div
            onMouseDown={startResize}
            className="absolute top-0 right-0 h-full w-2 cursor-col-resize z-30 group"
            title="Drag to resize"
            role="separator"
            aria-orientation="vertical"
          >
            <div className="absolute right-0 top-0 h-full w-0.5 bg-[#E7E6E6] group-hover:bg-[#E8941A] transition-colors" />
          </div>
        </div>

        {/* Timeline area */}
        <div className="flex-1 overflow-x-auto scroll-fusion">
          <div style={{ minWidth: 800 }} className="relative">
            {/* Dependency arrows overlay (FS links) */}
            {arrows.length > 0 && (
              <svg
                className="absolute inset-0 pointer-events-none z-10"
                width="100%"
                height={timelineHeight}
                style={{ overflow: 'visible' }}
              >
                <defs>
                  <marker id="dep-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="#7030A0" />
                  </marker>
                </defs>
                {arrows.map((a) => (
                  <line
                    key={a.key}
                    x1={`${a.x1}%`} y1={a.y1}
                    x2={`${a.x2}%`} y2={a.y2}
                    stroke="#7030A0" strokeWidth={1.25} strokeOpacity={0.65}
                    markerEnd="url(#dep-arrow)"
                  />
                ))}
              </svg>
            )}
            {/* Month header */}
            <div className="relative border-b border-[#E7E6E6] bg-white" style={{ height: 32 }}>
              {months.map((m) => (
                <div key={m.label + m.leftPct} className="absolute top-0 h-full flex items-center"
                  style={{ left: m.leftPct }}>
                  <div className="h-full w-px bg-[#E7E6E6]" />
                  <span className="text-xs text-[#404D5B] pl-1.5 font-medium">{m.label}</span>
                </div>
              ))}
            </div>

            {/* Rows */}
            {rows.map((r, i) => {
              if (r.type === 'lane') return (
                <div key={i} style={{ height: ROW_H, backgroundColor: '#0E4774' }} />
              );
              if (r.type === 'workstream') return (
                <div key={i} style={{ height: ROW_H, backgroundColor: '#E7E6E6' }} />
              );

              // Task row
              const t = r.task!;
              const hasBar = t.start_date && t.finish_date;
              const barStyle = STATUS_BAR[t.status] ?? STATUS_BAR['Not Started'];

              let left = '0%', width = '0%';
              if (hasBar) {
                const startOff = Math.max(0, dayOffset(t.start_date!));
                const endOff = Math.min(TOTAL_DAYS - 1, dayOffset(t.finish_date!));
                const dur = Math.max(1, endOff - startOff + 1);
                left = pct(startOff);
                width = pct(dur);
              }

              return (
                <div key={i} className="relative border-b border-[#F4EFEF] hover:bg-[#faf9f8]"
                  style={{ height: ROW_H }}>
                  {/* Month grid lines */}
                  {months.map((m) => (
                    <div key={m.leftPct} className="absolute top-0 h-full w-px bg-[#F4EFEF]"
                      style={{ left: m.leftPct }} />
                  ))}
                  {/* Today line */}
                  {todayLeft && (
                    <div className="absolute top-0 h-full w-0.5 z-10"
                      style={{ left: todayLeft, backgroundColor: '#E8941A', opacity: 0.6 }} />
                  )}
                  {/* Task bar */}
                  {hasBar && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 rounded-sm cursor-pointer flex items-center px-1.5 overflow-hidden transition-opacity hover:opacity-80"
                      style={{
                        left, width,
                        height: 18,
                        backgroundColor: barStyle.bg,
                        color: barStyle.text,
                        fontSize: 10,
                        minWidth: 4,
                      }}
                      title={`${t.wbs_id} — ${t.task_name.trim()} (${t.status})`}
                      onClick={() => setEditId(t.wbs_id)}
                    >
                      <span className="truncate whitespace-nowrap">{t.task_name.trim()}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today marker label */}
      {todayLeft && (
        <p className="text-xs text-[#E8941A] mt-2 font-medium">
          ▲ Orange line = today
        </p>
      )}

      {editTask && (
        <EditModal
          task={editTask}
          allTasks={updatedTasks}
          onClose={() => setEditId(null)}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
