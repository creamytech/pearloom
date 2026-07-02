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
import { Icon } from '../motifs';
import { PLChrome, PLHead, PLCard } from '../dash/PLChrome';

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
  // Anniversary nudges frame a wedding anniversary — only weddings
  // and anniversary sites get the preview card.
  const showAnniversary = preset === 'wedding' || occasion === 'anniversary';

  const tools = getKeepsakeTools(occasion);

  const subtitle =
    preset === 'memorial'
      ? 'An in-memoriam card and a book of what guests shared — drafted with care.'
      : preset === 'bachelor'
        ? 'Thank-yous from the guest of honor and a clean settle-up — close the weekend out right.'
        : preset === 'shower'
          ? 'Thank-yous and a keepsake card of the advice guests left.'
          : preset === 'reunion'
            ? 'Thank-yous, a printable photo book, and a head start on next year.'
            // Anniversary nudges only fit a wedding; everything else
            // (birthday, graduation, retirement, cultural, casual…)
            // gets a neutral after-the-day line.
            : occasion === 'wedding'
              ? 'Thank-you notes, anniversary nudges, and every after-the-day kindness — drafted by Pear.'
              : 'Thank-you notes and every after-the-day kindness — drafted by Pear.';

  return (
    <PLChrome active="memory" maxWidth={1080}>
      <PLHead
        align="center"
        pre="After the celebration"
        title="Keepsakes,"
        italic="drafted by Pear."
        sub={subtitle}
      />

      {/* Headline two-tap composer — renders its own intro header,
          so no editorial card above it. Follows the same gate as
          ThankYouGenerator: thank-you blasts don't fit a memorial. */}
      {showThanks && (
        <div style={{ marginBottom: 22 }}>
          <TwoTapThanks />
        </div>
      )}

      <div
        className="pl8-keepsakes-grid pl8-dash-stagger"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
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
