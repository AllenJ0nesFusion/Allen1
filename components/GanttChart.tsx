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
  const [editTask, setEditTask] = useState<TaskRow | null>(null);
  const [updatedTasks, setUpdatedTasks] = useState<TaskRow[]>(tasks);
  const [labelW, setLabelW] = useState(260);

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
      const taskRows = lanes.get(lane)?.get(ws) ?? [];
      if (taskRows.length === 0) continue;
      rows.push({ type: 'workstream', label: ws });
      for (const t of taskRows) rows.push({ type: 'task', label: t.task_name.trim(), task: t });
    }
  }

  const ROW_H = 28;

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
                onClick={() => r.task && setEditTask(r.task)}>
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
          <div style={{ minWidth: 800 }}>
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
                      onClick={() => setEditTask(t)}
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
          onClose={() => setEditTask(null)}
          onSaved={(updated) => {
            setUpdatedTasks(prev => prev.map(t => t.wbs_id === updated.wbs_id ? { ...t, ...updated } : t));
            setEditTask(null);
          }}
        />
      )}
    </div>
  );
}
