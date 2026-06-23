import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import { seedDatabase } from '@/lib/seed';

seedDatabase().catch(console.error);

export const metadata: Metadata = {
  title: 'Fusion WBS Tracker',
  description: 'Work Breakdown Structure tracker for Fusion Health L&D',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F4EFEF]">
        <Nav />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
