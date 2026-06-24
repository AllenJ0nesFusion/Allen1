import { Suspense } from 'react';
import GoalsManager from '@/components/GoalsManager';
import { getSession } from '@/lib/session';

export default async function GoalsPage() {
  const user = await getSession();
  const canEdit = user?.role === 'Admin' || user?.role === 'Owner';
  return (
    <div>
      <h1 className="page-title text-2xl mb-1">Goals</h1>
      <p className="text-sm text-[#404D5B] mb-5">
        Departmental goals with owner, target date, health, and rolled-up progress from their tasks.
      </p>
      <Suspense fallback={<p className="text-sm text-[#404D5B]">Loading goals…</p>}>
        <GoalsManager canEdit={canEdit} />
      </Suspense>
    </div>
  );
}
