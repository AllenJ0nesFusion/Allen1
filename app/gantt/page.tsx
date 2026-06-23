import GanttChart from '@/components/GanttChart';
import { type TaskRow } from '@/components/EditModal';

async function getTasks(): Promise<TaskRow[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/tasks`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json() as Promise<TaskRow[]>;
}

export default async function GanttPage() {
  const tasks = await getTasks();
  return (
    <div>
      <h1 className="text-xl font-bold text-[#0E4774] mb-1">Timeline</h1>
      <p className="text-sm text-[#404D5B] mb-5">
        2026 project schedule — click any bar to edit status, date, or notes
      </p>
      <GanttChart tasks={tasks} />
    </div>
  );
}
