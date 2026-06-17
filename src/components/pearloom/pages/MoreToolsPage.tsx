'use client';

// ─────────────────────────────────────────────────────────────
// MoreToolsPage — the discovery surface for every dashboard tool
// that lives outside the trimmed sidebar/sub-nav (previously ⌘K-
// only). Reads the same DEPROMOTED_DESTINATIONS list the command
// palette uses, so the two never drift. Occasion-gated tools hide
// for events they don't fit.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { DashLayout } from '../dash/DashShell';
import { PLHead } from '../dash/PLChrome';
import { Icon } from '../motifs';
import { DEPROMOTED_DESTINATIONS } from '../dash/DashCommandPalette';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { isDashSurfaceApplicable, type DashSurfaceId } from '@/lib/event-os/dashboard-applicability';

export function MoreToolsPage() {
  const { site } = useSelectedSite();
  const tools = DEPROMOTED_DESTINATIONS.filter(
    (t) => !t.gate || !site || isDashSurfaceApplicable(t.gate as DashSurfaceId, site.occasion),
  );

  return (
    <DashLayout active="tools" hideTopbar>
      <main style={{ padding: 'clamp(20px, 3vw, 32px) clamp(20px, 4vw, 40px) 60px', maxWidth: 1080, margin: '0 auto' }}>
        <PLHead
          pre="Everything"
          title="More"
          italic="tools."
          sub="Every Pearloom surface in one place — including the ones you usually reach with ⌘K."
          style={{ marginBottom: 28 }}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
          }}
        >
          {tools.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 13,
                padding: 18,
                borderRadius: 14,
                background: 'var(--card, #FBF7EE)',
                border: '1px solid var(--card-ring, rgba(14,13,11,0.08))',
                textDecoration: 'none',
                color: 'var(--ink, #0E0D0B)',
                transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), transform var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              <span
                aria-hidden
                style={{
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'var(--sage-tint, rgba(92,107,63,0.12))',
                }}
              >
                <Icon name={t.icon} size={17} color="var(--sage-deep, #5C6B3F)" />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{t.label}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-muted, #6F6557)', lineHeight: 1.4 }}>{t.hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </DashLayout>
  );
}

export default MoreToolsPage;
