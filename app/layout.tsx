import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import { seedDatabase } from '@/lib/seed';
import { getSession } from '@/lib/session';

seedDatabase().catch(console.error);

export const metadata: Metadata = {
  title: 'Fusion WBS Tracker',
  description: 'Work Breakdown Structure tracker for Fusion Health L&D',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F4EFEF]">
        {user && <Nav user={{ name: user.name, role: user.role }} />}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
