'use client';

import { useEffect, useState } from 'react';
import { calcFinish, HOURS_PER_DAY } from '@/lib/dateUtils';

interface UserOption { id: number; name: string; email: string }

interface Comment { id: number; author_name: string; body: string; created_at: string }
interface StatusHistoryEntry { id: number; from_status: string | null; to_status: string; changed_by_name: string; changed_at: string }

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

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
  percent_complete?: number;
  notes: string | null;
  goals: string[];
  predecessors?: Predecessor[];
  is_critical?: boolean;
  updated_at: string | null;
  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  assigned_user_email?: string | null;
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
  const [percent, setPercent] = useState(task.percent_complete ?? 0);
  const [finishDate, setFinishDate] = useState(task.finish_date?.split('T')[0] ?? '');
  const [finishDirty, setFinishDirty] = useState(false);
  const [effortHrs, setEffortHrs] = useState(task.effort_hrs != null ? String(task.effort_hrs) : '');
  const [autoFinish, setAutoFinish] = useState(false);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [assignedUserId, setAssignedUserId] = useState<string>(task.assigned_user_id ? String(task.assigned_user_id) : '');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const [newPred, setNewPred] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    fetch('/api/users/options').then((r) => r.ok ? r.json() : []).then(setUsers);
    const enc = encodeURIComponent(task.wbs_id);
    Promise.all([
      fetch(`/api/tasks/${enc}/comments`).then((r) => r.ok ? r.json() : []),
      fetch(`/api/tasks/${enc}/status-history`).then((r) => r.ok ? r.json() : []),
    ]).then(([c, h]) => { setComments(c); setStatusHistory(h); });
  }, [task.wbs_id]);

  async function postComment() {
    if (!commentBody.trim()) return;
    setPostingComment(true);
    await fetch(`/api/tasks/${encodeURIComponent(task.wbs_id)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentBody.trim() }),
    });
    const fresh = await fetch(`/api/tasks/${encodeURIComponent(task.wbs_id)}/comments`).then((r) => r.json()) as Comment[];
    setComments(fresh);
    setCommentBody('');
    setPostingComment(false);
  }

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

  // Convenience: picking a status nudges % to the matching extreme
  function handleStatusChange(value: string) {
    setStatus(value);
    if (value === 'Complete') setPercent(100);
    else if (value === 'Not Started' && percent === 100) setPercent(0);
  }

  // Convenience: dragging % to its extremes nudges status
  function handlePercentChange(value: number) {
    const p = Math.max(0, Math.min(100, value));
    setPercent(p);
    if (p === 100) setStatus('Complete');
    else if (p > 0 && (status === 'Not Started' || status === 'Complete')) setStatus('In Progress');
    else if (p === 0 && status === 'Complete') setStatus('Not Started');
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
        percent_complete: percent,
        assigned_user_id: assignedUserId ? Number(assignedUserId) : null,
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
            <select value={status} onChange={(e) => handleStatusChange(e.target.value)} className={fieldClass}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="flex items-center justify-between text-xs font-medium text-[#404D5B] mb-1">
              <span>% Complete</span>
              <span className="tabular-nums font-semibold text-[#0E4774]">{percent}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={percent}
              onChange={(e) => handlePercentChange(Number(e.target.value))}
              className="w-full accent-[#0E4774]"
            />
            <div className="mt-1.5 h-2 rounded-full bg-[#E7E6E6] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${percent}%`, backgroundColor: percent === 100 ? '#16a34a' : '#0E4774' }}
              />
            </div>
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
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Assignee</label>
            <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} className={fieldClass}>
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
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

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-[#0E4774] mb-2">Comments</label>
            {comments.length > 0 && (
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="bg-[#F4EFEF] rounded px-3 py-2">
                    <div className="flex items-center justify-between text-[11px] text-[#404D5B] mb-0.5">
                      <span className="font-semibold">{c.author_name}</span>
                      <span className="tnum">{fmtDateTime(c.created_at)}</span>
                    </div>
                    <p className="text-xs text-[#2C3E50] whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={2}
                placeholder="Add a comment…"
                className={`${fieldClass} resize-none flex-1`}
              />
              <button
                onClick={postComment}
                disabled={postingComment || !commentBody.trim()}
                className="px-3 py-2 text-sm font-medium text-white rounded shrink-0 self-end disabled:opacity-50"
                style={{ backgroundColor: '#0E4774' }}
              >
                {postingComment ? '…' : 'Post'}
              </button>
            </div>
          </div>

          {/* Status history */}
          {statusHistory.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#0E4774] mb-2">Status history</label>
              <ol className="relative border-l border-gray-200 space-y-2 pl-4">
                {statusHistory.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[1.125rem] top-1 w-2.5 h-2.5 rounded-full bg-[#0E4774] border-2 border-white" />
                    <p className="text-xs text-[#2C3E50]">
                      <span className="font-medium">{h.to_status}</span>
                      {h.from_status && <span className="text-[#404D5B]"> from {h.from_status}</span>}
                    </p>
                    <p className="text-[11px] text-[#404D5B] tnum">{h.changed_by_name} · {fmtDateTime(h.changed_at)}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
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
