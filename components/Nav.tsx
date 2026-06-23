'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks' },
  { href: '/milestones', label: 'Milestones' },
  { href: '/burndown', label: 'Burndown' },
  { href: '/briefing', label: 'Briefing' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="w-full flex items-center justify-between px-6 py-3"
      style={{
        backgroundColor: '#0E4774',
        borderBottom: '4px solid #E8941A',
      }}
    >
      <span className="text-white font-bold text-xl tracking-wide">Fusion</span>
      <div className="flex gap-6">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors"
              style={{
                color: active ? '#E8941A' : '#ffffff',
                textDecoration: active ? 'underline' : 'none',
                textUnderlineOffset: '4px',
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
