'use client';

import { useEffect, useState } from 'react';

const HEALTH = ['On Track', 'At Risk', 'Off Track', 'Not Started'] as const;
type Health = (typeof HEALTH)[number];

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
interface UserOption { id: number; name: string; email: string }

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No target date';
}

export default function GoalsManager({ canEdit }: { canEdit: boolean }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const [g, u] = await Promise.all([
      fetch('/api/goals', { cache: 'no-store' }).then((r) => r.ok ? r.json() : []),
      fetch('/api/users/options', { cache: 'no-store' }).then((r) => r.ok ? r.json() : []),
    ]);
    setGoals(g);
    setUsers(u);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-sm text-[#404D5B]">Loading goals…</p>;

  return (
    <div>
      {canEdit && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 text-sm font-semibold text-white rounded"
            style={{ backgroundColor: '#0E4774' }}
          >
            + New Goal
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((g) => (
          <div key={g.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-[#0E4774] truncate">{g.name}</h2>
                {g.description && <p className="text-xs text-[#404D5B] mt-0.5 line-clamp-2">{g.description}</p>}
              </div>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ backgroundColor: (HEALTH_COLOR[g.health] ?? '#9aa5b1') + '22', color: HEALTH_COLOR[g.health] ?? '#404D5B' }}
              >
                {g.health}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-3 mb-1.5">
              <div className="flex-1 h-2 rounded-full bg-[#E7E6E6] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${g.pct}%`, backgroundColor: g.pct === 100 ? '#16a34a' : '#0E4774' }} />
              </div>
              <span className="text-xs font-semibold tabular-nums text-[#0E4774] w-9 text-right">{g.pct}%</span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#404D5B] mt-2">
              <span>{g.owner_name || g.owner_email || 'Unassigned'}</span>
              <span className="tabular-nums">{Number(g.done_count)}/{Number(g.task_count)} tasks · {fmtDate(g.target_date)}</span>
            </div>

            {canEdit && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-right">
                <button onClick={() => setEditing(g)} className="text-xs text-[#0E4774] hover:underline">Edit</button>
              </div>
            )}
          </div>
        ))}
        {goals.length === 0 && (
          <p className="text-sm text-[#404D5B]">No goals yet.</p>
        )}
      </div>

      {(creating || editing) && (
        <GoalModal
          goal={editing}
          users={users}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={async () => { setCreating(false); setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}

function GoalModal({
  goal, users, onClose, onSaved,
}: {
  goal: Goal | null;
  users: UserOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(goal?.name ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [ownerId, setOwnerId] = useState<string>(goal?.owner_user_id ? String(goal.owner_user_id) : '');
  const [targetDate, setTargetDate] = useState(goal?.target_date?.split('T')[0] ?? '');
  const [health, setHealth] = useState<Health>((goal?.health as Health) ?? 'On Track');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const field = 'w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4774]';

  async function save() {
    if (!name.trim()) { setError('A goal name is required.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      name, description,
      owner_user_id: ownerId ? Number(ownerId) : null,
      target_date: targetDate || null,
      health,
    };
    const res = goal
      ? await fetch(`/api/goals/${goal.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      : await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})) as { error?: string }; setError(j.error ?? 'Save failed.'); return; }
    onSaved();
  }

  async function remove() {
    if (!goal) return;
    if (!confirm('Delete this goal? Its tasks will be unlinked (not deleted).')) return;
    setDeleting(true);
    await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' });
    setDeleting(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-[#0E4774] mb-4">{goal ? 'Edit Goal' : 'New Goal'}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Description</label>
            <textarea value={description ?? ''} onChange={(e) => setDescription(e.target.value)} rows={2} className={`${field} resize-none`} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#404D5B] mb-1">Owner</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={field}>
                <option value="">Unassigned</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#404D5B] mb-1">Health</label>
              <select value={health} onChange={(e) => setHealth(e.target.value as Health)} className={field}>
                {HEALTH.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Target date</label>
            <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={field} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <div className="flex items-center justify-between gap-3 mt-6">
          {goal ? (
            <button onClick={remove} disabled={deleting} className="px-3 py-2 text-sm font-medium rounded border border-[#C00000] text-[#C00000] hover:bg-[#C00000]/5">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[#404D5B] border border-gray-200 rounded hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 text-sm text-white rounded font-medium" style={{ backgroundColor: saving ? '#305F8E' : '#0E4774' }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
