'use client';

// ─────────────────────────────────────────────────────────────
// EventPageClient — fetches site + RSVP stats, mounts EventHQ.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { EventHQ, type EventHQSite } from '@/components/dashboard/EventHQ';
import { ThemeToggle } from '@/components/shell';

interface EventPageClientProps {
  siteId: string;
}

export default function EventPageClient({ siteId }: EventPageClientProps) {
  const router = useRouter();
  const [site, setSite] = useState<EventHQSite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const [siteRes, statsRes] = await Promise.all([
          fetch(`/api/sites/${siteId}`).catch(() => null),
          fetch(`/api/rsvp-stats?siteId=${siteId}`).catch(() => null),
        ]);

        const siteData = siteRes?.ok ? await siteRes.json() : null;
        const statsData = statsRes?.ok ? await statsRes.json() : null;
        if (abort) return;

        const built: EventHQSite = {
          id: siteId,
          domain: siteData?.domain ?? siteData?.site?.domain ?? siteId,
          names: siteData?.names ?? siteData?.site?.names,
          occasion: siteData?.occasion ?? siteData?.site?.manifest?.occasion ?? 'Event',
          eventDate: siteData?.eventDate ?? siteData?.site?.manifest?.eventDate,
          rsvpStats: statsData
            ? {
                attending: statsData.attending ?? 0,
                declined: statsData.declined ?? 0,
                pending: statsData.pending ?? 0,
                total: statsData.total ?? 0,
              }
            : undefined,
          vendorCount: siteData?.vendorCount,
          galleryCount: siteData?.galleryCount,
        };
        setSite(built);
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [siteId]);

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pl-cream)',
      }}
    >
      <header
        style={{
          height: 60,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(16px, 4vw, 32px)',
          borderBottom: '1px solid var(--pl-divider)',
          background: 'color-mix(in oklab, var(--pl-cream) 88%, transparent)',
          backdropFilter: 'saturate(140%) blur(14px)',
          WebkitBackdropFilter: 'saturate(140%) blur(14px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link
            href="/dashboard"
            style={{
              fontFamily: 'var(--pl-font-display)',
              fontSize: '1.05rem',
              color: 'var(--pl-ink)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Pearloom
          </Link>
          <span
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.62rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--pl-muted)',
            }}
          >
            Event HQ
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />
          <Link
            href="/dashboard"
            style={{
              fontSize: '0.78rem',
              color: 'var(--pl-muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ArrowLeft size={12} /> Sites
          </Link>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        <main style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ padding: 'clamp(24px, 4vh, 48px) clamp(16px, 4vw, 40px)' }}>
            {loading ? (
              <div
                style={{
                  padding: 80,
                  textAlign: 'center',
                  color: 'var(--pl-muted)',
                  fontSize: '0.92rem',
                }}
              >
                Loading event…
              </div>
            ) : site ? (
              <EventHQ
                site={site}
                onEdit={() => router.push(`/editor/${site.domain}`)}
                onShare={() => {
                  if (typeof navigator !== 'undefined' && site.domain) {
                    navigator.clipboard.writeText(`https://${site.domain}.pearloom.com`).catch(() => {});
                  }
                }}
              />
            ) : (
              <div
                style={{
                  padding: 80,
                  textAlign: 'center',
                  color: 'var(--pl-muted)',
                  fontSize: '0.92rem',
                }}
              >
                Site not found.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
