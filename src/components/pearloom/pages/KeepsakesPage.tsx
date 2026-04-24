'use client';

import Link from 'next/link';
import { DashLayout } from '../dash/DashShell';
import { ThankYouGenerator } from '../dash/ThankYouGenerator';
import { AnniversaryPreview } from '../dash/AnniversaryPreview';
import { TwoTapThanks } from '../dash/TwoTapThanks';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { getEventType } from '@/lib/event-os/event-types';
import { getKeepsakeTools } from '@/lib/event-os/dashboard-presets';
import { Icon } from '../motifs';

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
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 18,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: 180,
      }}
    >
      <div style={{ background: bg, borderRadius: 12, padding: 12, fontSize: 12, color: 'var(--ink-soft)' }}>
        <div className="display" style={{ fontSize: 20, color: 'var(--ink)', marginBottom: 6 }}>
          {title}
        </div>
        {body}
      </div>
      <Link href={actionHref} className="btn btn-outline btn-sm" style={{ marginTop: 'auto' }}>
        <Icon name="sparkles" size={12} /> {actionLabel}
      </Link>
    </div>
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
            : 'Thank-you notes, anniversary nudges, and every other after-the-day kindness — drafted by Pear.';

  return (
    <DashLayout active="keepsakes" title="Keepsakes" subtitle={subtitle}>
      <div style={{ padding: '0 32px 40px', maxWidth: 1160 }}>
        {/* Two-Tap Thanks lives full-width above the grid; it's the
            headline "write 150 notes on a plane" feature. */}
        <div style={{ marginBottom: 22 }}>
          <TwoTapThanks />
        </div>
        <div className="pl8-keepsakes-grid">
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
      </div>
    </DashLayout>
  );
}
