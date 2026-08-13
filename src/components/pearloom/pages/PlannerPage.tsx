'use client';

// ─────────────────────────────────────────────────────────────
// PlannerPage (`/dashboard/planner`) — the professional's view.
//
// A planner running fifteen weddings a year is worth fifteen
// individually-acquired couples, and arrives already trusted by the
// client. The merged synthesis ranks them the #2 distribution
// channel and the last remaining item that changes acquisition
// MATH rather than funnel polish.
//
// v1 is deliberately a VIEW, not a new system: a planner is already
// a co-host (`editor`) on their clients' sites, so this reframes
// data that exists rather than inventing a parallel structure. No
// new table, no new permission model, nothing to revoke — if a
// client removes them as co-host, the row simply leaves the book.
//
// The two things a planner cannot get today:
//   1. A client book ordered by what needs attention, instead of a
//      flat list of sites that happens to include other people's.
//   2. Their proven SHAPE carried to the next client — structure
//      and look only, never a previous couple's content
//      (lib/planner/reusable-structure enforces that).
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PageIntro } from '@/components/pearloom/dash/QuietDash';
import { Panel, EmptyShell, btnMini, btnMiniGhost } from '@/components/marketing/design/dash/DashShell';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '@/components/marketing/design/DesignAtoms';
import { useUserSites, siteDisplayName } from '@/components/marketing/design/dash/hooks';
import { buildClientBook, type BookEntry, type BookSite } from '@/lib/planner/client-book';
import {
  extractReusableStructure,
  structureSummary,
} from '@/lib/planner/reusable-structure';

/** Today as yyyy-mm-dd. Computed once outside render (React
 *  Compiler purity — no clock reads while rendering). */
function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PlannerPage() {
  const { sites, loading } = useUserSites();
  const [today] = useState(todayIso);
  const [shapeFrom, setShapeFrom] = useState<string | null>(null);

  const book = useMemo(() => {
    const rows: BookSite[] = (sites ?? []).map((s) => ({
      id: s.id,
      domain: s.domain,
      occasion: s.occasion ?? null,
      published: s.published,
      coHostRole: s.coHostRole,
      eventDate: s.eventDate ?? null,
      title: siteDisplayName(s),
    }));
    return buildClientBook(rows, today);
  }, [sites, today]);

  const shapeSource = useMemo(() => {
    if (!shapeFrom) return null;
    const site = (sites ?? []).find((s) => s.domain === shapeFrom);
    if (!site) return null;
    return extractReusableStructure(
      (site.manifest ?? {}) as Record<string, unknown>,
      `${site.domain} shape`,
    );
  }, [shapeFrom, sites]);

  return (
    <DashLayout>
      <PageIntro
        eyebrow="For planners"
        title={<>Your client book</>}
      />

      {loading && <p style={{ opacity: 0.6 }}>One moment…</p>}

      {!loading && book.counts.clients === 0 && (
        <EmptyShell
          inline
          message="No client events yet — when a couple adds you as a co-host on their site, it appears here, with what needs attention first."
          cta={{ label: 'Back to sites', href: '/dashboard' }}
        />
      )}

      {!loading && book.counts.clients > 0 && (
        <>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', margin: '0 0 18px' }}>
            <Stat label="Clients" value={book.counts.clients} />
            <Stat label="Within a month" value={book.counts.soon} />
            <Stat label="Still drafts" value={book.counts.unpublished} />
          </div>

          <Panel bg={PD.paperCard} style={{ padding: 20, marginBottom: 18 }}>
            <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 12 }}>
              CLIENTS
            </div>
            {book.clients.map((entry) => (
              <ClientRow key={entry.site.domain} entry={entry} />
            ))}
          </Panel>
        </>
      )}

      {!loading && book.mine.length > 0 && (
        <Panel bg={PD.paperCard} style={{ padding: 20 }}>
          <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 6 }}>
            YOUR OWN SITES
          </div>
          <p style={{ fontSize: 12.5, opacity: 0.7, margin: '0 0 12px', lineHeight: 1.5 }}>
            Build a shape once and carry it to the next client. A shape takes
            the sections, the order and the look — never a previous
            couple&rsquo;s names, words, photos or guests.
          </p>
          {book.mine.map((entry) => (
            <div
              key={entry.site.domain}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid rgba(31,36,24,0.08)',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontWeight: 500 }}>{entry.site.title}</span>
              <button
                type="button"
                onClick={() => setShapeFrom(
                  shapeFrom === entry.site.domain ? null : entry.site.domain,
                )}
                className="pl8-btnfx"
                style={{ ...btnMini, cursor: 'pointer' }}
              >
                {shapeFrom === entry.site.domain ? 'Hide shape' : 'Use as a shape'}
              </button>
            </div>
          ))}

          {shapeSource && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 12,
                background: 'rgba(31,36,24,0.04)',
              }}
            >
              <p style={{ margin: '0 0 8px', fontSize: 13.5, lineHeight: 1.55 }}>
                {structureSummary(shapeSource)}
              </p>
              <p style={{ margin: '0 0 10px', fontSize: 12, opacity: 0.65 }}>
                {shapeSource.dropped.length} field
                {shapeSource.dropped.length === 1 ? '' : 's'} stay behind, including
                everything a guest could be identified by.
              </p>
              <Link
                href={`/wizard/new?shape=${encodeURIComponent(shapeFrom ?? '')}`}
                style={{ ...btnMiniGhost, textDecoration: 'none' }}
              >
                Start a client from this shape →
              </Link>
            </div>
          )}
        </Panel>
      )}
    </DashLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ ...DISPLAY_STYLE, fontSize: 26, fontWeight: 500, lineHeight: 1 }}>{value}</div>
      <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function ClientRow({ entry }: { entry: BookEntry }) {
  const { site, attention, daysUntil } = entry;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        padding: '11px 0',
        borderBottom: '1px solid rgba(31,36,24,0.08)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500 }}>{site.title}</div>
        <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
          {site.occasion ? site.occasion.replace(/-/g, ' ') : entry.noun}
          {daysUntil != null && daysUntil >= 0 && ` · ${daysUntil === 0 ? 'today' : `${daysUntil} days`}`}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {attention && (
          <span style={{ fontSize: 12, color: PD.terra, fontWeight: 600 }}>{attention}</span>
        )}
        <Link href={`/editor/${site.domain}`} style={{ ...btnMiniGhost, textDecoration: 'none' }}>
          Open
        </Link>
      </div>
    </div>
  );
}
