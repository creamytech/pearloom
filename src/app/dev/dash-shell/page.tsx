// Dev-only visual harness for the dashboard shell (sidebar + topbar).
// Mounts the REAL ShellPersistentLayout so the v2 grouped nav, thread
// hover-rail, and animated sidebar icons can be screenshot-verified.
// Hidden in production. Session/site/plan hooks fall back to their
// empty/guest states without auth, which is fine for chrome QA.

import { notFound } from 'next/navigation';
import { AuthProvider } from '@/components/auth-provider';
import { ShellPersistentLayout } from '@/components/pearloom/dash/ShellPersistentLayout';

export const dynamic = 'force-dynamic';

export default function DevDashShell() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AuthProvider>
      <ShellPersistentLayout>
        <div style={{ padding: '40px clamp(20px,4vw,40px)', maxWidth: 1240, margin: '0 auto' }}>
          <h1 className="pl-heading" style={{ fontSize: 32, margin: 0 }}>Shell harness</h1>
          <p style={{ color: 'var(--ink-soft)', marginTop: 8 }}>
            Hover the sidebar nav to see the thread-rail draw in and each glyph thread in its own way.
          </p>
        </div>
      </ShellPersistentLayout>
    </AuthProvider>
  );
}
