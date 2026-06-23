import TaskTable from '@/components/TaskTable';
import { type TaskRow } from '@/components/EditModal';
import { headers } from 'next/headers';

async function getTasksData(): Promise<{ tasks: TaskRow[]; projectEnd: string | null }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const cookie = (await headers()).get('cookie') ?? '';
  const res = await fetch(`${baseUrl}/api/tasks`, { cache: 'no-store', headers: { cookie } });
  if (!res.ok) return { tasks: [], projectEnd: null };
  return res.json() as Promise<{ tasks: TaskRow[]; projectEnd: string | null }>;
}

export default async function TasksPage() {
  const { tasks } = await getTasksData();
  return (
    <div>
      <h1 className="page-title text-2xl mb-1">Tasks</h1>
      <p className="text-sm text-[#404D5B] mb-5">Every work item across both lanes — click a row to update status, date, or notes</p>
      <TaskTable initialTasks={tasks} />
    </div>
  );
}
