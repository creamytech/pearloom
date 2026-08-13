'use client';

// ─────────────────────────────────────────────────────────────
// DashSurfaceGate — for dashboard pages that only apply to certain
// event types (registry, seating, music, weekend builder). When the
// currently-selected site's occasion doesn't use the surface, we
// don't render the page (and don't fetch its data) — we show a calm
// "select a {type} event site to continue" notice with one-tap
// switches to the host's sites that DO use it.
//
// Wrapped at the route level so the heavy page component only mounts
// when applicable (no conditional-hooks worries).
// ─────────────────────────────────────────────────────────────

import { DashLayout } from './DashShell';
import { useSelectedSite, siteDisplayName } from '@/components/marketing/design/dash/hooks';
import { isDashSurfaceApplicable, type DashSurfaceId } from '@/lib/event-os/dashboard-applicability';
import { occasionLabel } from '@/lib/event-os/dashboard-presets';
import { Icon } from '../motifs';
import Link from 'next/link';

export function DashSurfaceGate({
  surface,
  active,
  title,
  children,
}: {
  surface: DashSurfaceId;
  /** Sidebar highlight id — match the page's own DashLayout active. */
  active: string;
  /** Human page name, e.g. "Seating", "Registry". */
  title: string;
  children: React.ReactNode;
}) {
  const { site, sites, selectSite } = useSelectedSite();

  // No site selected, or this site's occasion uses the surface →
  // render the real page as-is.
  if (!site || isDashSurfaceApplicable(surface, site.occasion)) {
    return <>{children}</>;
  }

  const lower = title.toLowerCase();
  const applicable = (sites ?? []).filter((s) => s.id !== site.id && isDashSurfaceApplicable(surface, s.occasion));
  const occ = site.occasion ? occasionLabel(site.occasion) : 'event';

  return (
    <DashLayout active={active} title={title} subtitle={`This page is for events that use ${lower}.`}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px clamp(20px,4vw,40px) 60px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--peach-bg, #FBE8D6)', color: 'var(--peach-ink, #C6703D)',
            marginBottom: 18,
          }}
          aria-hidden
        >
          <Icon name="layout" size={22} />
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
            fontStyle: 'italic', fontSize: 26, fontWeight: 600, margin: '0 0 10px',
            color: 'var(--ink, #0E0D0B)',
          }}
        >
          Select a site that uses {lower}.
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink-soft, #3A332C)', margin: '0 0 22px' }}>
          <strong style={{ fontWeight: 700 }}>{siteDisplayName(site)}</strong> is a {occ.toLowerCase()},
          which doesn&rsquo;t use {lower}. Pick one of your events that does to continue.
        </p>

        {applicable.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left' }}>
            {applicable.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSite(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 14px', borderRadius: 12,
                  background: 'var(--card, var(--cream-2, #F5EFE2))',
                  border: '1px solid var(--line, rgba(14,13,11,0.12))',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--ink, #0E0D0B)' }}>
                    {siteDisplayName(s)}
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)' }}>
                    {s.occasion ? occasionLabel(s.occasion) : 'Event'}
                  </span>
                </span>
                <Icon name="arrow-right" size={14} color="var(--ink-soft)" />
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ink-muted, #6F6557)' }}>
            None of your sites use {lower} yet.{' '}
            <Link href="/wizard/new" style={{ color: 'var(--sage-deep, #5C6B3F)', fontWeight: 600 }}>
              Start a new one →
            </Link>
          </div>
        )}
      </div>
    </DashLayout>
  );
}

export default DashSurfaceGate;
