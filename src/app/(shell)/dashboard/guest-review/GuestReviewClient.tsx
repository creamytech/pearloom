'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro, StatStrip, type StatStripItem } from '@/components/pearloom/dash/QuietDash';
import { DashEmpty } from '@/components/pearloom/dash/DashEmpty';
import { DashSkeleton } from '@/components/pearloom/dash/DashSkeleton';
import { Icon } from '@/components/pearloom/motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import type { GuestInsight } from '@/app/api/guests/intelligence/route';

interface IntelligencePayload {
  guestCount: number;
  pendingCount: number;
  attendingCount: number;
  declinedCount: number;
  insights: GuestInsight[];
}

const SEVERITY_TONE: Record<GuestInsight['severity'], { bg: string; fg: string; border: string; label: string }> = {
  info:      { bg: 'rgba(92,107,63,0.08)',  fg: '#3D4A1F', border: 'rgba(92,107,63,0.18)',  label: 'Heads up' },
  attention: { bg: 'rgba(184,147,90,0.12)', fg: '#5C4F2E', border: 'rgba(184,147,90,0.28)', label: 'Worth a look' },
  urgent:    { bg: 'rgba(122,45,45,0.12)',  fg: '#7A2D2D', border: 'rgba(122,45,45,0.28)',  label: 'Action soon' },
};

const KIND_ICONS: Record<GuestInsight['kind'], string> = {
  'duplicate': 'users',
  'vip': 'sparkles',
  'plus-one-mismatch': 'mail',
  'stale-rsvp': 'clock',
  'address-gap': 'pin',
};

export function GuestReviewClient({ siteSlug: urlSiteSlug }: { siteSlug: string | null }) {
  const { site } = useSelectedSite();
  const siteSlug = urlSiteSlug ?? site?.domain ?? '';
  const [data, setData] = useState<IntelligencePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [merging, setMerging] = useState<string | null>(null);
  // Merge failures surface inline (same banner as the load error) —
  // never a window.alert — and leave the loaded list on screen.
  const [mergeError, setMergeError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!siteSlug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/guests/intelligence?siteId=${encodeURIComponent(siteSlug)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not load review.');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, [siteSlug]);

  useEffect(() => { void reload(); }, [reload]);

  async function mergeDuplicates(insight: GuestInsight) {
    if (insight.kind !== 'duplicate' || insight.guestIds.length < 2) return;
    setMerging(insight.guestIds[0]);
    setMergeError(null);
    try {
      const res = await fetch('/api/guests/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: siteSlug,
          primaryId: insight.guestIds[0],
          mergeIds: insight.guestIds.slice(1),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Merge failed.');
      }
      await reload();
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : 'Merge failed.');
    } finally {
      setMerging(null);
    }
  }

  // Quiet StatStrip (plan rule 3) — replaces the 4-tile stat grid;
  // zero-value stats collapse into one muted trailing chip.
  const statItems: StatStripItem[] = [
    { label: 'Guests', value: data?.guestCount ?? 0 },
    { label: 'Attending', value: data?.attendingCount ?? 0, tone: 'sage' },
    { label: 'Pending', value: data?.pendingCount ?? 0, tone: 'peach' },
    { label: 'Declined', value: data?.declinedCount ?? 0 },
  ];

  return (
    <DashLayout active="guests" hideTopbar>
      {/* Quiet header (plan rule 1): one line; the "duplicates,
          VIPs, stale RSVPs" explainer is gone — the insight cards
          and the empty state say it where it matters. */}
      <div style={{ padding: '16px var(--pl-dash-pad) 0', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto' }}>
        <PageIntro
          eyebrow="Guests"
          title="Pear's review."
          meta={data && data.guestCount > 0 ? <StatStrip items={statItems} /> : undefined}
          style={{ marginBottom: 14 }}
        />
      </div>
      <div style={{ padding: '0 var(--pl-dash-pad) 32px', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto' }}>

        {loading ? (
          <>
            <DashSkeleton kind="stat-row" />
            <DashSkeleton kind="list" count={4} label="Reviewing your list" />
          </>
        ) : error ? (
          <div style={{ padding: 14, background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', borderRadius: 12 }}>{error}</div>
        ) : !data || data.insights.length === 0 ? (
          <DashEmpty
            size="page"
            eyebrow="Pear's review"
            title="Nothing to flag"
            body={data && data.guestCount > 0
              ? "Your guest list looks clean. Pear will run again whenever you import new rows."
              : "Add guests first and Pear will start reviewing automatically."}
            actions={[{ label: 'Open the guest list', href: '/dashboard/rsvp' }]}
          />
        ) : (
          <div className="pl8-dash-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mergeError && (
              <div role="alert" style={{ padding: 14, background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', borderRadius: 12 }}>
                {mergeError}
              </div>
            )}
            {data.insights.map((insight, i) => (
              <InsightCard
                key={`${insight.kind}-${i}`}
                insight={insight}
                siteSlug={siteSlug}
                merging={merging}
                onMerge={() => void mergeDuplicates(insight)}
              />
            ))}
          </div>
        )}
      </div>
    </DashLayout>
  );
}

function InsightCard({
  insight,
  siteSlug,
  merging,
  onMerge,
}: {
  insight: GuestInsight;
  siteSlug: string;
  merging: string | null;
  onMerge: () => void;
}) {
  const tone = SEVERITY_TONE[insight.severity];
  return (
    <div
      className="pl8-card-lift"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        /* Phones: the action pill drops to its own line instead of
           crushing the title + detail into a sliver column. */
        flexWrap: 'wrap',
      }}
    >
      <div style={{
        width: 38, height: 38, flexShrink: 0,
        background: 'rgba(255,255,255,0.6)',
        borderRadius: 999,
        display: 'grid', placeItems: 'center',
        color: tone.fg,
      }}>
        <Icon name={KIND_ICONS[insight.kind]} size={16} color={tone.fg} />
      </div>
      <div style={{ flex: 1, minWidth: 'min(180px, 100%)' }}>
        <div style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: tone.fg, marginBottom: 6,
        }}>
          {tone.label}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
          {insight.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
          {insight.detail}
        </div>
      </div>
      {insight.action && (
        <div style={{ flexShrink: 0 }}>
          {insight.action.kind === 'merge' && (
            <button
              type="button"
              onClick={onMerge}
              disabled={!!merging}
              style={actionBtn(tone.fg)}
            >
              {merging ? 'Merging…' : insight.action.label}
            </button>
          )}
          {insight.action.kind === 'resend' && (
            <Link
              href={`/dashboard/cadence?site=${encodeURIComponent(siteSlug)}`}
              style={{ ...actionBtn(tone.fg), textDecoration: 'none' }}
            >
              {insight.action.label}
            </Link>
          )}
          {insight.action.kind === 'collect-address' && (
            /* Plain roster link — DashGuests reads no `filter` query
               param (its filter union is all/rsvp/stale/dupes), so
               the old `&filter=missing-address` was a dead param
               promising a jump that never happened. Add the param
               back only alongside a real missing-address filter. */
            <Link
              href={`/dashboard/rsvp?site=${encodeURIComponent(siteSlug)}`}
              style={{ ...actionBtn(tone.fg), textDecoration: 'none' }}
            >
              {insight.action.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function actionBtn(fg: string): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 999,
    background: '#0E0D0B',
    color: '#F1EBDC',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    border: 'none',
    fontFamily: 'var(--font-ui)',
    textDecoration: 'none',
  };
  void fg;
}
