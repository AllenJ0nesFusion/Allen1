'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/gantt', label: 'Timeline' },
  { href: '/milestones', label: 'Milestones' },
  { href: '/burndown', label: 'Burndown' },
  { href: '/briefing', label: 'Briefing' },
];

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-40 w-full"
      style={{ backgroundColor: 'var(--fusion-navy)', borderBottom: '3px solid var(--fusion-orange)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <Link href="/dashboard" className="flex items-baseline gap-2 group">
          <span className="text-white font-bold text-xl tracking-tight">Fusion</span>
          <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-[0.14em] text-white/55">
            WBS Tracker
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150"
                style={{
                  color: active ? 'var(--fusion-navy)' : 'rgba(255,255,255,0.82)',
                  backgroundColor: active ? 'var(--fusion-orange)' : 'transparent',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.10)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white p-2"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <div className="space-y-1.5">
            <span className="block w-5 h-0.5 bg-white" />
            <span className="block w-5 h-0.5 bg-white" />
            <span className="block w-5 h-0.5 bg-white" />
          </div>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-4 pb-3 flex flex-col gap-1" style={{ backgroundColor: 'var(--fusion-navy)' }}>
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium"
                style={{
                  color: active ? 'var(--fusion-navy)' : 'rgba(255,255,255,0.82)',
                  backgroundColor: active ? 'var(--fusion-orange)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
