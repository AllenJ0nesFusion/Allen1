'use client';

import { useState, useEffect } from 'react';
import { type TaskRow } from './EditModal';
import { calcFinish, HOURS_PER_DAY } from '@/lib/dateUtils';

interface UserOption { id: number; name: string; email: string }

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
  const workstreams: Workstream[] = tasks
    .filter((t) => t.outline_level === 2)
    .map((t) => ({ wbs_id: t.wbs_id, lane: t.lane, task_name: t.task_name.trim() }));

  const [parentWbsId, setParentWbsId] = useState(workstreams[0]?.wbs_id ?? '');
  const [taskName, setTaskName] = useState('');
  const [status, setStatus] = useState('Not Started');
  const [startDate, setStartDate] = useState('');
  const [finishDate, setFinishDate] = useState('');
  const [autoFinish, setAutoFinish] = useState(false);
  const [effortHrs, setEffortHrs] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/users/options').then((r) => r.ok ? r.json() : []).then(setUsers);
  }, []);

  function handleEffortChange(value: string) {
    setEffortHrs(value);
    const next = calcFinish(startDate, Number(value));
    if (next) {
      setFinishDate(next);
      setAutoFinish(true);
    }
  }

  function handleStartChange(value: string) {
    setStartDate(value);
    // Re-run auto-calc if effort is already set
    if (effortHrs) {
      const next = calcFinish(value, Number(effortHrs));
      if (next) {
        setFinishDate(next);
        setAutoFinish(true);
      }
    }
  }

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
        assigned_user_id: assignedUserId ? Number(assignedUserId) : null,
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

  const workDays = effortHrs ? Math.ceil(Number(effortHrs) / HOURS_PER_DAY) : 0;

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

          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Effort (hrs)</label>
            <input
              type="number"
              min="0"
              value={effortHrs}
              onChange={(e) => handleEffortChange(e.target.value)}
              className={fieldClass}
            />
            {effortHrs && !startDate && (
              <p className="text-xs text-[#404D5B] mt-1">Set a start date to auto-calculate finish.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#404D5B] mb-1">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartChange(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#404D5B] mb-1">Finish date</label>
              <input
                type="date"
                value={finishDate}
                onChange={(e) => { setFinishDate(e.target.value); setAutoFinish(false); }}
                className={fieldClass}
              />
              {autoFinish && workDays > 0 && (
                <p className="text-xs text-[#E8941A] mt-1">
                  Auto-set ({workDays} working day{workDays === 1 ? '' : 's'} at {HOURS_PER_DAY} hrs/day). Edit to override.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Assignee</label>
            <select value={assignedUserId} onChange={(e) => setAssignedUserId(e.target.value)} className={fieldClass}>
              <option value="">Unassigned</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
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
