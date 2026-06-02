'use client';

/* ========================================================================
   PEARLOOM — KEEPSAKES (Memory hub)

   Editorial port of ClaudeDesign/pages/memory-redesign.jsx. Mounts the
   shared PLChrome (sidebar + atmosphere + tabs + head + paper cards)
   around the existing data flow: ThankYouGenerator, AnniversaryPreview,
   TwoTapThanks, and any occasion-specific keepsake tools the registry
   serves up.
   ======================================================================== */

import Link from 'next/link';
import { ThankYouGenerator } from '../dash/ThankYouGenerator';
import { AnniversaryPreview } from '../dash/AnniversaryPreview';
import { TwoTapThanks } from '../dash/TwoTapThanks';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { getEventType } from '@/lib/event-os/event-types';
import { getKeepsakeTools } from '@/lib/event-os/dashboard-presets';
import { Icon, Pear } from '../motifs';
import { PLChrome, PLHead, PLTabs, PLCard } from '../dash/PLChrome';

function KeepsakeCard({
  title,
  body,
  actionLabel,
  actionHref,
  tone,
}: {
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
  tone: 'sage' | 'peach' | 'lavender' | 'cream';
}) {
  const bg =
    tone === 'peach'
      ? 'var(--peach-bg)'
      : tone === 'sage'
        ? 'var(--sage-tint)'
        : tone === 'lavender'
          ? 'var(--lavender-bg)'
          : 'var(--cream-2)';
  return (
    <PLCard
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: 180,
      }}
    >
      <div style={{ background: bg, borderRadius: 12, padding: 12, fontSize: 12, color: 'var(--ink-soft)' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--ink)',
            marginBottom: 6,
          }}
        >
          {title}
        </div>
        {body}
      </div>
      <Link href={actionHref} className="btn btn-outline btn-sm" style={{ marginTop: 'auto' }}>
        <Icon name="sparkles" size={12} /> {actionLabel}
      </Link>
    </PLCard>
  );
}

export function KeepsakesPage() {
  const { site } = useSelectedSite();
  const occasion = site?.occasion ?? null;
  const preset = getEventType(occasion as never)?.rsvpPreset ?? 'wedding';

  const showThanks = ['wedding', 'shower', 'bachelor', 'reunion', 'milestone', 'casual', 'cultural'].includes(preset);
  const showAnniversary = ['wedding', 'cultural'].includes(preset) || occasion === 'anniversary';

  const tools = getKeepsakeTools(occasion);

  const subtitle =
    preset === 'memorial'
      ? 'In-memoriam cards, donation letters, and anniversary remembrances — drafted with care.'
      : preset === 'bachelor'
        ? "Thank-yous from the groom and a clean settle-up — close the weekend out right."
        : preset === 'shower'
          ? 'Thank-yous and a keepsake card of the advice guests left.'
          : preset === 'reunion'
            ? 'Thank-yous, the yearbook export, and a head start on next year.'
            : 'Thank-you notes, anniversary nudges, and every after-the-day kindness — drafted by Pear.';

  return (
    <PLChrome active="memory" maxWidth={1080}>
      <PLTabs tabs={[{ label: 'Keepsakes' }, { label: 'Book', href: '/dashboard/memory-book' }]} active={0} />
      <PLHead
        align="center"
        pre="After the celebration"
        title="Keepsakes,"
        italic="drafted by Pear."
        sub={subtitle}
      />

      {/* Two-tap thanks editorial intro card — peach-tinted */}
      <PLCard tone="peach" style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--peach-ink)',
            marginBottom: 4,
          }}
        >
          Two-tap thanks
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            fontWeight: 600,
            margin: '0 0 10px',
            color: 'var(--ink)',
          }}
        >
          Drafted from <span style={{ fontStyle: 'italic' }}>what they did</span>.
        </h2>
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            padding: '11px 13px',
            borderRadius: 11,
            background: 'var(--card, var(--cream-2))',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--lavender-bg)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Pear size={16} tone="sage" shadow={false} />
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
            Tap a guest → see what they did (memory, song, attendance) → tap Draft → Pear writes a note
            grounded in their specific contribution. Copy and send. Next.
          </span>
        </div>
      </PLCard>

      {/* Headline two-tap composer (real data wiring kept intact) */}
      <div style={{ marginBottom: 22 }}>
        <TwoTapThanks />
      </div>

      <div
        className="pl8-keepsakes-grid pl8-dash-stagger"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {showThanks && <ThankYouGenerator />}
        {showAnniversary && <AnniversaryPreview />}
        {tools
          .filter((t) => !['thanks', 'anniversary-nudge'].includes(t.id))
          .map((t) => (
            <KeepsakeCard
              key={t.id}
              title={t.title}
              body={t.body}
              actionLabel={t.actionLabel}
              actionHref={t.actionHref}
              tone={t.tone}
            />
          ))}
      </div>
    </PLChrome>
  );
}
