'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/day-of/page.tsx
//
// Event Ops hub — announcements composer, voice-toast moderation,
// and vendor bookings for a selected site. Wave C rewire: uses
// shared shell primitives (SiteSelector, PageCard) and design
// tokens instead of inline hex.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnnouncementsPanel } from '@/components/dashboard/AnnouncementsPanel';
import { VoiceToastsPanel } from '@/components/dashboard/VoiceToastsPanel';
import { VendorBookingsPanel } from '@/components/dashboard/VendorBookingsPanel';
import { PageCard, SiteSelector, EmptyState } from '@/components/shell';
import type { SiteOption } from '@/components/shell';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

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

  const siteOptions: SiteOption[] = sites.map((s) => ({
    id: s.id,
    label: s.names?.filter(Boolean).join(' & ') || s.domain,
    subdomain: s.domain,
  }));

  return (
    <DashboardShell eyebrow="Event ops">
            {/* Editorial header */}
            <div
              style={{
                marginBottom: 32,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                gap: 24,
                flexWrap: 'wrap',
                paddingBottom: 24,
                borderBottom: '1px solid var(--pl-divider)',
              }}
            >
              <div>
                <div className="pl-overline" style={{ marginBottom: 14 }}>
                  Day-of · Coordination
                </div>
                <h1
                  className="pl-display"
                  style={{
                    margin: 0,
                    fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)',
                    color: 'var(--pl-ink)',
                    lineHeight: 1.05,
                  }}
                >
                  Run the room.
                </h1>
                <p
                  style={{
                    margin: '8px 0 0',
                    color: 'var(--pl-muted)',
                    fontSize: '0.95rem',
                    lineHeight: 1.55,
                    maxWidth: '52ch',
                  }}
                >
                  Send announcements, moderate voice toasts, and track vendor bookings — one calm room.
                </p>
              </div>

              {sites.length > 0 && (
                <div style={{ minWidth: 240 }}>
                  <SiteSelector
                    options={siteOptions}
                    value={selected}
                    onChange={setSelected}
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div
                style={{
                  padding: 48,
                  textAlign: 'center',
                  color: 'var(--pl-muted)',
                  fontSize: '0.92rem',
                }}
              >
                Loading sites…
              </div>
            ) : sites.length === 0 ? (
              <EmptyState
                size="hero"
                eyebrow="No sites yet"
                title="Create one to start coordinating"
                description="The day-of room comes alive once you have a site with guests, vendors, and a date."
                actions={
                  <Link
                    href="/dashboard"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 18px',
                      background: 'var(--pl-ink)',
                      color: 'var(--pl-cream)',
                      borderRadius: 'var(--pl-radius-full)',
                      textDecoration: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                    }}
                  >
                    Create a site
                  </Link>
                }
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: 20,
                  alignItems: 'start',
                }}
              >
                <PageCard
                  title="Announcements"
                  eyebrow="Push to guests"
                  padding="none"
                  accent="olive"
                >
                  {selected && <AnnouncementsPanel siteId={selected} />}
                </PageCard>
                <PageCard
                  title="Voice toasts"
                  eyebrow="Moderate · Approve"
                  padding="none"
                  accent="gold"
                >
                  {selected && <VoiceToastsPanel siteId={selected} />}
                </PageCard>
                <PageCard
                  title="Vendor bookings"
                  eyebrow="Deposits · Timeline"
                  padding="none"
                  accent="plum"
                >
                  {selected && <VendorBookingsPanel siteId={selected} />}
                </PageCard>
              </div>
            )}
    </DashboardShell>
  );
}
