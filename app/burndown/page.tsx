import BurndownChart from '@/components/BurndownChart';

interface WeekRow {
  week_start: string;
  week_end: string;
  available_hrs: number;
  lane1_planned: number;
  lane2_planned: number;
  total_planned: number;
  variance: number;
  notes: string | null;
}

async function getCapacity(): Promise<WeekRow[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/capacity`, { cache: 'no-store' });
  if (!res.ok) return [];
  return res.json() as Promise<WeekRow[]>;
}

export default async function BurndownPage() {
  const weeks = await getCapacity();
  return (
    <div>
      <h1 className="text-xl font-bold text-[#0E4774] mb-4">Weekly Burndown</h1>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <BurndownChart weeks={weeks} />
      </div>
    </div>
  );
}
