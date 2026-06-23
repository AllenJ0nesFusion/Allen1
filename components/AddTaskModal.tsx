'use client';

import { useState } from 'react';
import { type TaskRow } from './EditModal';

const STATUS_OPTIONS = [
  'Not Started', 'In Progress', 'Complete', 'Waiting', 'Blocked', 'Decision Required', 'Contingent',
];

interface Workstream {
  wbs_id: string;
  lane: string;
  task_name: string;
}

interface Props {
  tasks: TaskRow[];
  onClose: () => void;
  onCreated: (created: TaskRow) => void;
}

export default function AddTaskModal({ tasks, onClose, onCreated }: Props) {
  // Workstreams are the outline_level 2 rows — a new task hangs under one of them
  const workstreams: Workstream[] = tasks
    .filter((t) => t.outline_level === 2)
    .map((t) => ({ wbs_id: t.wbs_id, lane: t.lane, task_name: t.task_name.trim() }));

  const [parentWbsId, setParentWbsId] = useState(workstreams[0]?.wbs_id ?? '');
  const [taskName, setTaskName] = useState('');
  const [status, setStatus] = useState('Not Started');
  const [startDate, setStartDate] = useState('');
  const [finishDate, setFinishDate] = useState('');
  const [effortHrs, setEffortHrs] = useState('');
  const [owner, setOwner] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!parentWbsId || !taskName.trim()) {
      setError('Pick a workstream and enter a task name.');
      return;
    }
    setSaving(true);
    setError('');
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        parent_wbs_id: parentWbsId,
        task_name: taskName,
        status,
        start_date: startDate || null,
        finish_date: finishDate || null,
        effort_hrs: effortHrs ? Number(effortHrs) : null,
        owner: owner || null,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({})) as { error?: string };
      setError(json.error ?? `Create failed (${res.status})`);
      setSaving(false);
      return;
    }
    const created = await res.json() as TaskRow;
    setSaving(false);
    onCreated({ ...created, goals: created.goals ?? [] });
  }

  const fieldClass =
    'w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4774]';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-[#0E4774] mb-4">Add Task</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Workstream</label>
            <select value={parentWbsId} onChange={(e) => setParentWbsId(e.target.value)} className={fieldClass}>
              {workstreams.map((w) => (
                <option key={w.wbs_id} value={w.wbs_id}>
                  {w.lane} — {w.task_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Task name</label>
            <input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="What needs to happen?"
              className={fieldClass}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#404D5B] mb-1">Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#404D5B] mb-1">Finish date</label>
              <input type="date" value={finishDate} onChange={(e) => setFinishDate(e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#404D5B] mb-1">Effort (hrs)</label>
              <input
                type="number"
                min="0"
                value={effortHrs}
                onChange={(e) => setEffortHrs(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#404D5B] mb-1">Owner</label>
              <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} className={fieldClass} />
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-[#404D5B] border border-gray-200 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-4 py-2 text-sm text-white rounded font-medium"
            style={{ backgroundColor: saving ? '#305F8E' : '#0E4774' }}
          >
            {saving ? 'Adding…' : 'Add Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
