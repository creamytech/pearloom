'use client';

// ─────────────────────────────────────────────────────────────
// EventPageClient — fetches site + RSVP stats, mounts EventHQ
// inside the v8 DashLayout so every dashboard page shares chrome.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EventHQ, type EventHQSite } from '@/components/dashboard/EventHQ';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { buildSiteUrl } from '@/lib/site-urls';

interface EventPageClientProps {
  siteId: string;
}

function title(names?: [string, string] | null, occasion?: string) {
  const label = (occasion ?? 'Event').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const [a, b] = names ?? [];
  if (a && b) return `${a} & ${b} — ${label}`;
  if (a) return `${a} — ${label}`;
  return label;
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
    <DashLayout
      active="sites"
      title={site ? title(site.names, site.occasion) : 'Event HQ'}
      subtitle="Everything about this site — at a glance, in one place."
    >
      <div style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
        {loading ? (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-soft)' }}>Threading…</div>
        ) : site ? (
          <EventHQ
            site={site}
            onEdit={() => router.push(`/editor/${site.domain}`)}
            onShare={() => {
              if (typeof navigator !== 'undefined' && site.domain) {
                navigator.clipboard
                  .writeText(buildSiteUrl(site.domain, '', undefined, site.occasion))
                  .catch(() => {});
              }
            }}
          />
        ) : (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-soft)' }}>Site not found.</div>
        )}
      </div>
    </DashLayout>
  );
}
