import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import UsersManager from '@/components/UsersManager';

export default async function AdminUsersPage() {
  const user = await getSession();
  if (!user) redirect('/login');
  if (user.role !== 'Admin') {
    return (
      <div className="card p-8 text-center max-w-md mx-auto mt-10">
        <p className="text-[#2C3E50] font-medium">Admins only</p>
        <p className="text-sm text-[#404D5B] mt-1">You don’t have access to user management.</p>
      </div>
    );
  }
  return (
    <div>
      <h1 className="page-title text-2xl mb-1">Users</h1>
      <p className="text-sm text-[#404D5B] mb-5">Invite teammates and manage their roles. New users sign in with a temporary password they must change.</p>
      <UsersManager currentUserId={user.userId} />
    </div>
  );
}
