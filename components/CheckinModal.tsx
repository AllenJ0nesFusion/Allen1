'use client';

import { useEffect, useState } from 'react';

const HEALTH_OPTIONS = ['On Track', 'At Risk', 'Off Track', 'Not Started'] as const;
const HEALTH_COLOR: Record<string, string> = {
  'On Track': '#16a34a',
  'At Risk': '#E8941A',
  'Off Track': '#C00000',
  'Not Started': '#9aa5b1',
};

interface Checkin {
  id: number;
  goal_id: number;
  week_of: string;
  author_name: string | null;
  health_snapshot: string;
  notes: string;
  created_at: string;
}

interface Props {
  goalId: number;
  goalName: string;
  currentHealth: string;
  onClose: () => void;
}

/** Monday of the week containing `date` (local) */
function weekMonday(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function fmtWeek(weekOf: string) {
  const d = new Date(weekOf);
  const end = new Date(d);
  end.setDate(d.getDate() + 4); // Friday
  const fmt = (x: Date) => x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Week of ${fmt(d)} – ${fmt(end)}`;
}

const field =
  'w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4774]';

export default function CheckinModal({ goalId, goalName, currentHealth, onClose }: Props) {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<string>(currentHealth);
  const [notes, setNotes] = useState('');
  const [weekOf, setWeekOf] = useState(weekMonday());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/goals/${goalId}/checkins`, { cache: 'no-store' });
    setCheckins(r.ok ? await r.json() : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [goalId]);

  async function submit() {
    if (!notes.trim()) { setError('Please add some notes.'); return; }
    setSaving(true);
    setError('');
    const res = await fetch(`/api/goals/${goalId}/checkins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week_of: weekOf, health_snapshot: health, notes }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string };
      setError(j.error ?? 'Save failed.');
      return;
    }
    setNotes('');
    await load();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-semibold text-[#0E4774]">Weekly check-in</h2>
            <p className="text-xs text-[#404D5B] mt-0.5">{goalName}</p>
          </div>
          <button onClick={onClose} className="text-[#404D5B] hover:text-[#2C3E50] text-lg leading-none">×</button>
        </div>

        {/* New check-in form */}
        <div className="space-y-3 pb-5 mb-5 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#404D5B] mb-1">Week of</label>
              <input
                type="date"
                value={weekOf}
                onChange={(e) => setWeekOf(e.target.value)}
                className={field}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#404D5B] mb-1">Health this week</label>
              <select value={health} onChange={(e) => setHealth(e.target.value)} className={field}>
                {HEALTH_OPTIONS.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">
              Status notes <span className="font-normal text-[#9aa5b1]">(what happened, blockers, coming up)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="e.g. Completed module 3 review. Blocked on SME sign-off — following up Friday. Next: pilot scheduling."
              className={`${field} resize-none`}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white rounded"
              style={{ backgroundColor: saving ? '#305F8E' : '#0E4774' }}
            >
              {saving ? 'Saving…' : 'Add check-in'}
            </button>
          </div>
        </div>

        {/* History */}
        <h3 className="text-xs font-semibold text-[#404D5B] uppercase tracking-wide mb-3">History</h3>
        {loading ? (
          <p className="text-sm text-[#404D5B]">Loading…</p>
        ) : checkins.length === 0 ? (
          <p className="text-sm text-[#404D5B]">No check-ins yet. Add the first one above.</p>
        ) : (
          <ul className="space-y-4">
            {checkins.map((c) => (
              <li key={c.id} className="border-l-[3px] pl-3 py-1" style={{ borderColor: HEALTH_COLOR[c.health_snapshot] ?? '#9aa5b1' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-[#2C3E50]">{fmtWeek(c.week_of)}</span>
                  <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: (HEALTH_COLOR[c.health_snapshot] ?? '#9aa5b1') + '22', color: HEALTH_COLOR[c.health_snapshot] ?? '#404D5B' }}
                  >
                    {c.health_snapshot}
                  </span>
                  {c.author_name && <span className="text-[11px] text-[#9aa5b1]">by {c.author_name}</span>}
                </div>
                <p className="text-sm text-[#404D5B] mt-1 whitespace-pre-wrap">{c.notes}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
