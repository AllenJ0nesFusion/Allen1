'use client';

import { useEffect, useState } from 'react';

const ROLES = ['Admin', 'Owner', 'Contributor', 'Viewer'] as const;

interface UserRow {
  id: number;
  email: string;
  name: string;
  role: string;
  must_reset: boolean;
  active: boolean;
}

export default function UsersManager({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // invite form
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('Contributor');
  const [tempPassword, setTempPassword] = useState('');
  const [inviting, setInviting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/users', { cache: 'no-store' });
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInviting(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, role, tempPassword }),
    });
    setInviting(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string };
      setError(j.error ?? 'Could not create user.');
      return;
    }
    setEmail(''); setName(''); setRole('Contributor'); setTempPassword('');
    await load();
  }

  async function changeRole(id: number, newRole: string) {
    await fetch(`/api/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    await load();
  }

  async function toggleActive(id: number, active: boolean) {
    await fetch(`/api/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    await load();
  }

  async function resetPassword(id: number) {
    const temp = prompt('Enter a temporary password (min 8 chars). The user must change it on next login.');
    if (!temp) return;
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tempPassword: temp }),
    });
    if (!res.ok) { const j = await res.json().catch(() => ({})) as { error?: string }; alert(j.error ?? 'Failed'); return; }
    await load();
  }

  async function remove(id: number) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) { const j = await res.json().catch(() => ({})) as { error?: string }; alert(j.error ?? 'Failed'); return; }
    await load();
  }

  const field = 'border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4774]';

  return (
    <div className="space-y-6">
      {/* Invite */}
      <div className="card p-5">
        <h2 className="text-sm font-bold text-[#0E4774] mb-3">Invite a user</h2>
        <form onSubmit={invite} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${field} w-full`} required />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`${field} w-full`} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={field}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-[#404D5B] mb-1">Temp password</label>
            <input type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} className={`${field} w-full`} placeholder="min 8 chars" required />
          </div>
          <button type="submit" disabled={inviting} className="px-4 py-2 text-sm font-semibold text-white rounded" style={{ backgroundColor: '#0E4774' }}>
            {inviting ? 'Adding…' : 'Invite'}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <p className="text-xs text-[#404D5B] mt-2">Share the temp password with the person directly. They’ll be prompted to set their own on first sign-in.</p>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-[#404D5B] uppercase tracking-wide border-b border-gray-100">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-[#404D5B]">Loading…</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50">
                <td className="px-4 py-2.5 text-[#2C3E50]">{u.email}</td>
                <td className="px-4 py-2.5 text-[#404D5B]">{u.name || '—'}</td>
                <td className="px-4 py-2.5">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    disabled={u.id === currentUserId}
                    className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#0E4774] disabled:opacity-60"
                  >
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {!u.active
                    ? <span className="text-[#C00000]">Disabled</span>
                    : u.must_reset
                      ? <span className="text-[#E8941A]">Pending reset</span>
                      : <span className="text-[#16a34a]">Active</span>}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => resetPassword(u.id)} className="text-xs text-[#0E4774] hover:underline mr-3">Reset pwd</button>
                  {u.id !== currentUserId && (
                    <>
                      <button onClick={() => toggleActive(u.id, !u.active)} className="text-xs text-[#404D5B] hover:underline mr-3">
                        {u.active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => remove(u.id)} className="text-xs text-[#C00000] hover:underline">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
