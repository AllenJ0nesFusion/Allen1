'use client';

import { useState } from 'react';

const STATUS_OPTIONS = [
  'Not Started', 'In Progress', 'Complete', 'Waiting', 'Blocked', 'Decision Required', 'Contingent',
];

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
  updated_at: string | null;
}

interface Props {
  task: TaskRow;
  onClose: () => void;
  onSaved: (updated: TaskRow) => void;
  onDeleted?: (wbsId: string) => void;
}

export default function EditModal({ task, onClose, onSaved, onDeleted }: Props) {
  const [status, setStatus] = useState(task.status);
  const [finishDate, setFinishDate] = useState(task.finish_date?.split('T')[0] ?? '');
  const [notes, setNotes] = useState(task.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/tasks/${encodeURIComponent(task.wbs_id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes, finish_date: finishDate || null }),
    });
    const updated = await res.json() as TaskRow;
    setSaving(false);
    onSaved(updated);
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
    setDeleting(false);
    onDeleted?.(task.wbs_id);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-base font-semibold text-[#0E4774] mb-1">{task.wbs_id}</h2>
        <p className="text-sm text-[#404D5B] mb-4">{task.task_name}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4774]"
            >
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Finish Date</label>
            <input
              type="date"
              value={finishDate}
              onChange={(e) => setFinishDate(e.target.value)}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4774]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4774] resize-none"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between gap-3 mt-6">
          {onDeleted && (
            confirmDelete ? (
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
            )
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
