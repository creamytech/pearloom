import type { Metadata } from 'next';
import { SessionProvider } from '@/components/session-provider';
import { DashboardSidebar } from '@/components/dashboard/sidebar';

export const metadata: Metadata = {
  title: 'Pearloom — Dashboard',
  description: 'Manage your Pearloom site.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-[var(--eg-bg)]">
        <header className="border-b border-black/5 px-6 py-4 flex items-center justify-between bg-white/80 backdrop-blur-sm sticky top-0 z-30">
          <a href="/" className="text-lg font-semibold tracking-tight" style={{ fontFamily: 'var(--eg-font-heading)' }}>
            Pearloom
          </a>
          <nav className="flex items-center gap-4 text-sm text-[var(--eg-muted)]">
            <span className="px-3 py-1 rounded-full bg-[var(--eg-accent-light)] text-[var(--eg-accent)] text-xs font-medium">
              Dashboard
            </span>
          </nav>
        </header>
        <div className="flex">
          <DashboardSidebar />
          <main className="flex-1 p-8 max-w-5xl">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
