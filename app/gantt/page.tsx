import GanttChart from '@/components/GanttChart';
import { type TaskRow } from '@/components/EditModal';

async function getTasksData(): Promise<{ tasks: TaskRow[]; projectEnd: string | null }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/tasks`, { cache: 'no-store' });
  if (!res.ok) return { tasks: [], projectEnd: null };
  return res.json() as Promise<{ tasks: TaskRow[]; projectEnd: string | null }>;
}

export default async function GanttPage() {
  const { tasks, projectEnd } = await getTasksData();
  return (
    <div>
      <h1 className="page-title text-2xl mb-1">Timeline</h1>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-[#404D5B]">
          2026 project schedule — click any bar to edit status, date, or notes
        </p>
        {projectEnd && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full border border-[#C00000] text-[#C00000]">
            Critical path end: {new Date(projectEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>
      <GanttChart tasks={tasks} />
    </div>
  );
}
