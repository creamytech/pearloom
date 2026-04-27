'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
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
      alert(err instanceof Error ? err.message : 'Merge failed.');
    } finally {
      setMerging(null);
    }
  }

  return (
    <DashLayout
      active="event"
      title="Pear's review"
      subtitle="Duplicates, VIPs, stale RSVPs, missing addresses — caught before they bite. Pear runs the pass; you decide what to apply."
    >
      <div style={{ padding: 'clamp(20px, 3vw, 32px)', maxWidth: 1100, margin: '0 auto' }}>

        {data && data.guestCount > 0 && (
          <div className="pl8-dash-stagger" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 10,
            marginBottom: 24,
          }}>
            <Stat label="Guests" value={data.guestCount} />
            <Stat label="Attending" value={data.attendingCount} tone="#3D4A1F" />
            <Stat label="Pending" value={data.pendingCount} tone="#5C4F2E" />
            <Stat label="Declined" value={data.declinedCount} tone="#7A2D2D" />
          </div>
        )}

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

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="pl8-card-lift" style={{
      padding: '14px 16px',
      background: 'var(--cream-2)',
      borderRadius: 12,
      border: '1px solid var(--line-soft)',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: tone ?? 'var(--peach-ink, #C6703D)' }}>
        {label}
      </div>
      <div className="display pl8-stat-rise" style={{ fontSize: 28, color: 'var(--ink)', marginTop: 4 }}>
        {value}
      </div>
    </div>
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
      <div style={{ flex: 1, minWidth: 0 }}>
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
            <Link
              href={`/dashboard/rsvp?site=${encodeURIComponent(siteSlug)}&filter=missing-address`}
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
