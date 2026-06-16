import TaskTable from '@/components/TaskTable';
import { type TaskRow } from '@/components/EditModal';

async function getTasks(): Promise<TaskRow[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/tasks`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json() as Promise<TaskRow[]>;
}

export default async function TasksPage() {
  const tasks = await getTasks();
  return (
    <div>
      <h1 className="text-xl font-bold text-[#0E4774] mb-4">Tasks</h1>
      <TaskTable initialTasks={tasks} />
    </div>
  );
}
