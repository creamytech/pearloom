'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/day-of/page.tsx
//
// Event Ops hub — announcements composer + voice-toast moderation
// for a selected site. The two features below are the host-side
// counterparts to what guests see on /g/{token}.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { AnnouncementsPanel } from '@/components/dashboard/AnnouncementsPanel';
import { VoiceToastsPanel } from '@/components/dashboard/VoiceToastsPanel';
import { VendorBookingsPanel } from '@/components/dashboard/VendorBookingsPanel';

interface SiteSummary {
  id: string;
  domain: string;
  names?: [string, string];
}

export default function DayOfPage() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/sites');
        if (!r.ok) return;
        const data = await r.json();
        const list: SiteSummary[] = (data.sites ?? []).map((s: { id: string; domain: string; names?: [string, string] }) => ({
          id: s.id,
          domain: s.domain,
          names: s.names,
        }));
        setSites(list);
        if (list.length > 0) setSelected(list[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--pl-cream)]">
      <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-[var(--pl-divider)] bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-heading italic text-[1.05rem] font-semibold text-[var(--pl-ink-soft)] no-underline hover:opacity-75 transition-opacity">
            Pearloom
          </Link>
          <span className="hidden sm:block text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)]">
            Event Ops
          </span>
        </div>
        <Link href="/dashboard" className="text-[0.72rem] text-[var(--pl-muted)] no-underline flex items-center gap-1 hover:text-[var(--pl-ink)] transition-colors">
          <ArrowLeft size={12} /> Back
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        <main className="flex-1 overflow-auto">
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.25rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h1 className="font-heading italic" style={{
                fontSize: 'clamp(1.5rem, 3vw, 2.1rem)',
                color: 'var(--pl-ink)',
                margin: 0,
                marginBottom: '0.35rem',
              }}>
                Day-of coordination
              </h1>
              <p style={{ color: 'var(--pl-muted)', fontSize: '0.88rem', margin: 0 }}>
                Send announcements and review guest voice toasts — in one place.
              </p>
            </div>

            {loading ? (
              <div style={{ opacity: 0.6, fontSize: '0.9rem' }}>Loading sites…</div>
            ) : sites.length === 0 ? (
              <div style={{
                padding: '2rem',
                background: '#FFFFFF',
                border: '1px solid #EEE8DC',
                borderRadius: '0.75rem',
                textAlign: 'center',
              }}>
                <p style={{ margin: 0, marginBottom: '0.75rem' }}>No sites yet.</p>
                <Link href="/dashboard" style={{ color: 'var(--pl-olive)' }}>
                  Create one →
                </Link>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--pl-muted)',
                    marginBottom: '0.35rem',
                  }}>
                    Site
                  </label>
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      border: '1px solid var(--pl-divider)',
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      background: '#FFFFFF',
                      minWidth: 260,
                    }}
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.names?.join(' & ') || s.domain}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '1.25rem',
                  alignItems: 'start',
                }}>
                  <div style={{
                    background: 'var(--pl-cream)',
                    border: '1px solid var(--pl-divider)',
                    borderRadius: '0.85rem',
                  }}>
                    {selected && <AnnouncementsPanel siteId={selected} />}
                  </div>
                  <div style={{
                    background: 'var(--pl-cream)',
                    border: '1px solid var(--pl-divider)',
                    borderRadius: '0.85rem',
                  }}>
                    {selected && <VoiceToastsPanel siteId={selected} />}
                  </div>
                  <div style={{
                    background: 'var(--pl-cream)',
                    border: '1px solid var(--pl-divider)',
                    borderRadius: '0.85rem',
                  }}>
                    {selected && <VendorBookingsPanel siteId={selected} />}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
