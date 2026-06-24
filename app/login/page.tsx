'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get('next') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // must-reset flow
  const [mustReset, setMustReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string };
      setError(j.error ?? 'Login failed.');
      return;
    }
    const { mustReset: mr } = await res.json() as { mustReset: boolean };
    if (mr) { setMustReset(true); return; }
    router.push(nextPath);
    router.refresh();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const res = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: password, newPassword }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string };
      setError(j.error ?? 'Could not set password.');
      return;
    }
    router.push(nextPath);
    router.refresh();
  }

  const field = 'w-full border border-gray-200 rounded px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E4774]';

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-[#0E4774] font-bold text-2xl tracking-tight">Fusion</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#404D5B]">L&amp;D Goals</span>
          </div>
          <p className="text-sm text-[#404D5B] mt-2">{mustReset ? 'Set a new password to continue' : 'Sign in to continue'}</p>
        </div>

        <div className="card p-6">
          {!mustReset ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#404D5B] mb-1">Email</label>
                <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={field} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#404D5B] mb-1">Password</label>
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 text-sm font-semibold text-white rounded-md" style={{ backgroundColor: loading ? '#305F8E' : '#0E4774' }}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#404D5B] mb-1">New password</label>
                <input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={field} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#404D5B] mb-1">Confirm new password</label>
                <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={field} required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 text-sm font-semibold text-white rounded-md" style={{ backgroundColor: loading ? '#305F8E' : '#0E4774' }}>
                {loading ? 'Saving…' : 'Set password & continue'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
