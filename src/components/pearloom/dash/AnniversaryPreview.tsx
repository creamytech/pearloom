'use client';

import { useEffect, useMemo, useState } from 'react';
import { AIHint, AISuggestButton, useAICall } from '../editor/ai';
import { Heart, Icon, Sparkle } from '../motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';

type GeneratedChapter = {
  title: string;
  subtitle: string;
  description: string;
  mood?: string;
};

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function nextAnniversary(iso?: string | null): { date: Date; years: number } | null {
  if (!iso) return null;
  const wedding = new Date(iso);
  if (Number.isNaN(wedding.getTime())) return null;
  const today = new Date();
  const year = today.getFullYear();
  const thisYear = new Date(year, wedding.getMonth(), wedding.getDate());
  const target = thisYear < today ? new Date(year + 1, wedding.getMonth(), wedding.getDate()) : thisYear;
  const years = target.getFullYear() - wedding.getFullYear();
  return { date: target, years };
}

export function AnniversaryPreview() {
  const { site } = useSelectedSite();
  const [chapter, setChapter] = useState<GeneratedChapter | null>(null);
  const [applied, setApplied] = useState(false);

  const weddingIso = site?.eventDate ?? null;
  const anniversary = useMemo(() => nextAnniversary(weddingIso), [weddingIso]);

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
  }, []);

  const { state, error, run } = useAICall(async () => {
    if (!site?.domain) throw new Error('Pick a site first');
    const res = await fetch('/api/anniversary/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subdomain: site.domain, force: true }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `Pear couldn't draft (${res.status})`);
    }
    const data = (await res.json()) as {
      chapter?: GeneratedChapter;
      success?: boolean;
      skipped?: boolean;
      reason?: string;
    };
    if (data.skipped) {
      throw new Error(data.reason ?? 'Skipped — add an event date first.');
    }
    if (!data.chapter) throw new Error('Empty response');
    setChapter(data.chapter);
    setApplied(Boolean(data.success));
    return data.chapter;
  });

  const countdown = useMemo(() => {
    if (!anniversary || now === null) return null;
    const diff = anniversary.date.getTime() - now;
    const days = Math.max(0, Math.ceil(diff / 86_400_000));
    return days;
  }, [anniversary, now]);

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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Heart size={22} color="var(--peach-ink)" />
        <div style={{ flex: 1 }}>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)' }}>Anniversary nudges</div>
          <h3 className="display" style={{ margin: 0, fontSize: 26 }}>
            A chapter on <span className="display-italic">the day.</span>
          </h3>
        </div>
      </div>

      {anniversary ? (
        <div
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            padding: 14,
            borderRadius: 14,
            background: 'var(--peach-bg)',
            border: '1px solid var(--peach-2)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'var(--peach-2)',
              color: 'var(--ink)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div className="display" style={{ fontSize: 22, lineHeight: 1, fontWeight: 600 }}>
                {anniversary.date.getDate()}
              </div>
              <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8 }}>
                {anniversary.date.toLocaleDateString('en-US', { month: 'short' })}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              Your {ordinal(anniversary.years)} anniversary
            </div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
              {countdown === null
                ? anniversary.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : countdown === 0
                  ? 'Today'
                  : `${countdown} days away — ${anniversary.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`}
            </div>
          </div>
        </div>
      ) : (
        <AIHint>Set your event date in the site editor to see your next anniversary here.</AIHint>
      )}

      <AIHint>
        Pear drafts a new chapter each year on the anniversary, looking back and forward. Preview it now — it'll be saved to the site so you can polish before the day.
      </AIHint>

      <AISuggestButton
        label={chapter ? 'Draft another' : 'Preview this year'}
        runningLabel="Drafting a chapter…"
        state={state}
        onClick={() => void run()}
        error={error ?? undefined}
      />

      {chapter && (
        <div
          style={{
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            borderRadius: 14,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkle size={12} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: 'var(--peach-ink)',
                textTransform: 'uppercase',
              }}
            >
              {applied ? 'Saved to your site' : 'Draft'}
            </span>
          </div>
          <div className="display" style={{ fontSize: 22, margin: 0 }}>
            {chapter.title}
          </div>
          {chapter.subtitle && (
            <div style={{ fontSize: 13, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
              {chapter.subtitle}
            </div>
          )}
          <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
            {chapter.description}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(
                    `${chapter.title}\n${chapter.subtitle ?? ''}\n\n${chapter.description}`
                  ).catch(() => {});
                }
              }}
            >
              <Icon name="copy" size={12} /> Copy
            </button>
            {site?.domain && (
              <a
                href={`/editor?site=${encodeURIComponent(site.domain)}`}
                className="btn btn-outline btn-sm"
              >
                <Icon name="brush" size={12} /> Polish in editor
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
