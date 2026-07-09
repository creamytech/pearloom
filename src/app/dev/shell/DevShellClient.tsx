'use client';

// Mounts the real DashLayout (sidebar + utility bar + topbar +
// atmosphere) around the /dev/dashboard cockpit fixtures. The data
// hooks inside the shell fail closed without a session — the CHROME
// is what this harness exists to show.
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { DevDashboardClient } from '../dashboard/DevDashboardClient';

export function DevShellClient() {
  return (
    <DashLayout
      active="home"
      eyebrow="Good morning, Mira"
      title="You're building something beautiful."
      subtitle="Oct 1, 2026 · Lark Hill Farm. Everything Pear is holding for you, and the few things that want a moment this week."
    >
      <DevDashboardClient />
    </DashLayout>
  );
}
