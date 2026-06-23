'use client';

import { useEffect, useState } from 'react';
import { calcFinish, HOURS_PER_DAY } from '@/lib/dateUtils';

const STATUS_OPTIONS = [
  'Not Started', 'In Progress', 'Complete', 'Waiting', 'Blocked', 'Decision Required', 'Contingent',
];

export interface Predecessor {
  wbs_id: string;
  dep_type: string;
  lag_days: number;
}

export interface TaskRow {
  wbs_id: string;
  parent_wbs_id: string | null;
  outline_level: number;
  lane: string;
  task_name: string;
  start_date: string | null;
  finish_date: string | null;
  duration_days: number | null;
  effort_hrs: number | null;
  owner: string | null;
  status: string;
  notes: string | null;
  goals: string[];
  predecessors?: Predecessor[];
  updated_at: string | null;
}

interface Props {
  task: TaskRow;
  allTasks: TaskRow[];
  onClose: () => void;
  /** Refetches the full task list (cascade may change other tasks); returns the fresh list. */
  onRefresh: () => Promise<TaskRow[]>;
}

export default function EditModal({ task, allTasks, onClose, onRefresh }: Props) {
  const [status, setStatus] = useState(task.status);
  const [finishDate, setFinishDate] = useState(task.finish_date?.split('T')[0] ?? '');
  const [finishDirty, setFinishDirty] = useState(false);
  const [effortHrs, setEffortHrs] = useState(task.effort_hrs != null ? String(task.effort_hrs) : '');
  const [autoFinish, setAutoFinish] = useState(false);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [newPred, setNewPred] = useState('');
  const [linking, setLinking] = useState(false);

  // Keep the finish field in sync when a cascade (from a dependency change) moves this task,
  // unless the user has manually edited the field this session.
  useEffect(() => {
    if (!finishDirty) setFinishDate(task.finish_date?.split('T')[0] ?? '');
  }, [task.finish_date, finishDirty]);

  const predecessors = task.predecessors ?? [];
  const taskByeId = new Map(allTasks.map((t) => [t.wbs_id, t]));

  // Candidate predecessors: real tasks, not self, not already linked
  const candidates = allTasks
    .filter((t) => t.outline_level === 3 && t.wbs_id !== task.wbs_id)
    .filter((t) => !predecessors.some((p) => p.wbs_id === t.wbs_id))
    .sort((a, b) => a.wbs_id.localeCompare(b.wbs_id, undefined, { numeric: true }));

  function handleEffortChange(value: string) {
    setEffortHrs(value);
    const next = calcFinish(task.start_date, Number(value));
    if (next) {
      setFinishDate(next);
      setFinishDirty(true);
      setAutoFinish(true);
    }
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/tasks/${encodeURIComponent(task.wbs_id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        notes,
        finish_date: finishDate || null,
        effort_hrs: effortHrs === '' ? null : Number(effortHrs),
        duration_days: effortHrs ? Math.ceil(Number(effortHrs) / HOURS_PER_DAY) : null,
      }),
    });
    await onRefresh();
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    setDeleting(true);
    setError('');
    const res = await fetch(`/api/tasks/${encodeURIComponent(task.wbs_id)}`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? `Delete failed (${res.status})`);
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }
    await onRefresh();
    setDeleting(false);
    onClose();
  }

  async function addPredecessor() {
    if (!newPred) return;
    setLinking(true);
    setError('');
    const res = await fetch(`/api/tasks/${encodeURIComponent(task.wbs_id)}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predecessor_wbs_id: newPred }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? `Could not add dependency (${res.status})`);
      setLinking(false);
      return;
    }
    setNewPred('');
    await onRefresh();
    setLinking(false);
  }

  async function removePredecessor(predId: string) {
    setLinking(true);
    setError('');
    await fetch(
      `/api/tasks/${encodeURIComponent(task.wbs_id)}/dependencies?predecessor=${encodeURIComponent(predId)}`,
      { method: 'DELETE' }
    );
    await onRefresh();
    setLinking(false);
  }

  const fieldClass =
    'w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4774]';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-[#0E4774] mb-1">{task.wbs_id}</h2>
        <p className="text-sm text-[#404D5B] mb-4">{task.task_name}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Effort (hrs)</label>
            <input
              type="number"
              min="0"
              value={effortHrs}
              onChange={(e) => handleEffortChange(e.target.value)}
              className={fieldClass}
            />
            {!task.start_date && effortHrs && (
              <p className="text-xs text-[#404D5B] mt-1">No start date set — add one to auto-calculate the finish date.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Finish Date</label>
            <input
              type="date"
              value={finishDate}
              onChange={(e) => { setFinishDate(e.target.value); setFinishDirty(true); setAutoFinish(false); }}
              className={fieldClass}
            />
            {autoFinish && (
              <p className="text-xs text-[#E8941A] mt-1">
                Auto-set from effort ({Math.ceil(Number(effortHrs) / HOURS_PER_DAY)} working day{Math.ceil(Number(effortHrs) / HOURS_PER_DAY) === 1 ? '' : 's'} at {HOURS_PER_DAY} hrs/day). Edit to override.
              </p>
            )}
          </div>

          {/* Dependencies */}
          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Depends on (predecessors)</label>
            {predecessors.length > 0 ? (
              <ul className="space-y-1 mb-2">
                {predecessors.map((p) => {
                  const pt = taskByeId.get(p.wbs_id);
                  return (
                    <li key={p.wbs_id} className="flex items-center justify-between gap-2 text-xs bg-[#F4EFEF] rounded px-2 py-1.5">
                      <span className="text-[#2C3E50] truncate">
                        <span className="font-mono text-[#404D5B]">{p.wbs_id}</span>
                        {pt ? ` — ${pt.task_name.trim()}` : ''}
                      </span>
                      <button
                        onClick={() => removePredecessor(p.wbs_id)}
                        disabled={linking}
                        className="text-[#C00000] hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-[#404D5B] mb-2">No predecessors. This task isn’t blocked by another.</p>
            )}
            <div className="flex gap-2">
              <select value={newPred} onChange={(e) => setNewPred(e.target.value)} className={fieldClass}>
                <option value="">Add a predecessor…</option>
                {candidates.map((t) => (
                  <option key={t.wbs_id} value={t.wbs_id}>{t.wbs_id} — {t.task_name.trim()}</option>
                ))}
              </select>
              <button
                onClick={addPredecessor}
                disabled={!newPred || linking}
                className="px-3 py-2 text-sm font-medium text-white rounded shrink-0 disabled:opacity-50"
                style={{ backgroundColor: '#0E4774' }}
              >
                {linking ? '…' : 'Link'}
              </button>
            </div>
            <p className="text-[11px] text-[#404D5B] mt-1">
              Finish-to-start: if this task would start before a predecessor finishes, it’s pushed forward automatically.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className={`${fieldClass} resize-none`}
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between gap-3 mt-6">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#C00000]">Delete this task?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-xs text-white rounded font-medium"
                style={{ backgroundColor: '#C00000' }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-xs text-[#404D5B] border border-gray-200 rounded hover:bg-gray-50"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="px-3 py-2 text-sm font-medium rounded border border-[#C00000] text-[#C00000] hover:bg-[#C00000]/5"
            >
              Delete
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-[#404D5B] border border-gray-200 rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm text-white rounded font-medium"
              style={{ backgroundColor: saving ? '#305F8E' : '#0E4774' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
