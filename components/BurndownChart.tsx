'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer,
} from 'recharts';

interface WeekRow {
  week_start: string;
  week_end: string;
  available_hrs: number;
  lane1_planned: number;
  lane2_planned: number;
  total_planned: number;
  variance: number;
  notes: string | null;
}

interface ActiveTask {
  wbs_id: string;
  task_name: string;
  owner: string;
  status: string;
  start_date: string;
  finish_date: string;
  effort_hrs: number;
}

function barColor(variance: number, available: number): string {
  if (variance < 0) return '#C00000';
  if (variance <= available * 0.1) return '#E8941A';
  return '#16a34a';
}

function fmtWeek(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BurndownChart({ weeks }: { weeks: WeekRow[] }) {
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleBarClick(data: { week_start: string }) {
    const week = data.week_start;
    if (selectedWeek === week) {
      setSelectedWeek(null);
      setActiveTasks([]);
      return;
    }
    setSelectedWeek(week);
    setLoading(true);
    const res = await fetch(`/api/capacity/${week}`);
    const json = await res.json() as { tasks: ActiveTask[] };
    setActiveTasks(json.tasks);
    setLoading(false);
  }

  const chartData = weeks.map((w) => ({
    ...w,
    label: fmtWeek(w.week_start),
  }));

  const selectedWeekData = weeks.find((w) => w.week_start === selectedWeek);

  return (
    <div>
      <ResponsiveContainer width="100%" height={360}>
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 16, left: 0, bottom: 40 }}
          onClick={(e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const payload = (e as any)?.activePayload?.[0]?.payload as { week_start: string } | undefined;
            if (payload) handleBarClick(payload);
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E6E6" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#404D5B' }}
            angle={-45}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fontSize: 11, fill: '#404D5B' }} />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [`${value} hrs`, name === 'available_hrs' ? 'Available' : 'Total Planned']}
            labelFormatter={(label) => `Week of ${label}`}
          />
          <Legend
            formatter={(value) => value === 'available_hrs' ? 'Available Hrs' : 'Total Planned'}
          />
          <Bar dataKey="available_hrs" fill="#305F8E" name="available_hrs" radius={[2, 2, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.week_start}
                fill={entry.week_start === selectedWeek ? '#0E4774' : '#305F8E'}
                cursor="pointer"
              />
            ))}
          </Bar>
          <Bar dataKey="total_planned" name="total_planned" radius={[2, 2, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.week_start}
                fill={barColor(entry.variance, entry.available_hrs)}
                cursor="pointer"
                opacity={entry.week_start === selectedWeek ? 1 : 0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-[#404D5B] mt-1 mb-4">
        Click a week to see active tasks. Planned bar: <span className="text-[#16a34a] font-medium">green</span> = surplus, <span className="text-[#E8941A] font-medium">orange</span> = within 10%, <span className="text-[#C00000] font-medium">red</span> = overloaded.
      </p>

      {selectedWeek && (
        <div className="bg-white rounded-lg shadow-sm p-4 mt-2">
          <h2 className="text-sm font-semibold text-[#0E4774] mb-1">
            Week of {fmtWeek(selectedWeek)}
            {selectedWeekData && (
              <span className="ml-2 text-xs font-normal text-[#404D5B]">
                — {selectedWeekData.available_hrs} hrs available, {selectedWeekData.total_planned} planned
                {selectedWeekData.notes && ` · ${selectedWeekData.notes}`}
              </span>
            )}
          </h2>
          {loading ? (
            <p className="text-sm text-[#404D5B]">Loading…</p>
          ) : activeTasks.length === 0 ? (
            <p className="text-sm text-[#404D5B]">No active tasks this week.</p>
          ) : (
            <table className="w-full text-sm mt-2">
              <thead>
                <tr className="text-xs text-[#404D5B] uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left py-1.5 pr-4">WBS</th>
                  <th className="text-left py-1.5 pr-4">Task</th>
                  <th className="text-left py-1.5 pr-4">Owner</th>
                  <th className="text-left py-1.5 pr-4">Status</th>
                  <th className="text-right py-1.5">Effort</th>
                </tr>
              </thead>
              <tbody>
                {activeTasks.map((t) => (
                  <tr key={t.wbs_id} className="border-b border-gray-50">
                    <td className="py-1.5 pr-4 font-mono text-xs text-[#404D5B]">{t.wbs_id}</td>
                    <td className="py-1.5 pr-4 text-[#2C3E50]">{t.task_name}</td>
                    <td className="py-1.5 pr-4 text-xs text-[#404D5B]">{t.owner ?? '—'}</td>
                    <td className="py-1.5 pr-4 text-xs text-[#404D5B]">{t.status}</td>
                    <td className="py-1.5 text-right text-xs text-[#404D5B]">{t.effort_hrs != null ? `${t.effort_hrs}h` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
