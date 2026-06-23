import BurndownChart from '@/components/BurndownChart';
import { headers } from 'next/headers';

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
  const cookie = (await headers()).get('cookie') ?? '';
  const res = await fetch(`${baseUrl}/api/capacity`, { cache: 'no-store', headers: { cookie } });
  if (!res.ok) return [];
  return res.json() as Promise<WeekRow[]>;
}

export default async function BurndownPage() {
  const weeks = await getCapacity();
  return (
    <div>
      <h1 className="page-title text-2xl mb-1">Weekly Burndown</h1>
      <p className="text-sm text-[#404D5B] mb-5">Planned hours against your available capacity, week by week</p>
      <div className="card p-6">
        <BurndownChart weeks={weeks} />
      </div>
    </div>
  );
}
