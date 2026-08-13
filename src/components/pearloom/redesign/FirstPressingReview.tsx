'use client';

/* FirstPressingReview — the once-per-site "review your draft" nudge
   (FIRST-PRESSING-PLAN §5, Wave 3).

   After the First Pressing reveal lands the host in the editor, a
   quiet bottom-center strip invites them to read Pear's draft and
   make it theirs — with a "Show me what Pear wrote" action that jumps
   to the first drafted section. Shows ONLY when manifest.draftedByPear
   is non-empty, exactly once per site (localStorage), never while the
   reveal is still playing. Dismissible; never nags.

   Chrome mirrors UndoToast (glass, bottom-center) — floating chrome,
   so glass is correct per BRAND §9. */

import { useEffect, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Pear, Icon } from '../motifs';

const SHOWN_KEY = (slug: string) => `pl-fp-reviewed:${slug}`;

/* First drafted section to jump to, by a sensible priority (the
   story is the star of the draft), mapping draftedByPear field-paths
   back to the editor's SectionId. */
function firstDraftedSection(drafted: Record<string, boolean>): string | null {
  const paths = Object.keys(drafted).filter((p) => drafted[p]);
  const match = (pred: (p: string) => boolean) => paths.some(pred);
  if (match((p) => p.startsWith('storySection.'))) return 'story';
  if (match((p) => p === 'poetry.heroTagline' || p === 'tagline')) return 'hero';
  if (match((p) => p.startsWith('events.'))) return 'schedule';
  if (match((p) => p.startsWith('detailsCards.'))) return 'details';
  if (match((p) => p.startsWith('faqs.'))) return 'faq';
  if (match((p) => p === 'registryIntro')) return 'registry';
  return null;
}

export function FirstPressingReview({
  manifest,
  siteSlug,
  suppressed = false,
}: {
  manifest: StoryManifest;
  siteSlug: string;
  /** True while the First Pressing reveal is still playing — hold
   *  the nudge until the curtain has parted. */
  suppressed?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  const drafted = (manifest as unknown as { draftedByPear?: Record<string, boolean> }).draftedByPear;
  const hasDrafts = !!drafted && Object.keys(drafted).some((k) => drafted[k]);

  /* Decide to show — deferred so the read + setState never runs
     synchronously in render/effect (React Compiler), and so the
     strip settles just after the reveal. Shown-once via localStorage. */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (suppressed || !hasDrafts || !siteSlug) return;
    let done = false;
    const t = setTimeout(() => {
      if (done) return;
      try {
        if (window.localStorage.getItem(SHOWN_KEY(siteSlug))) return;
      } catch {
        /* private mode — fall through and show once this session */
      }
      setVisible(true);
    }, 700);
    return () => { done = true; clearTimeout(t); };
  }, [suppressed, hasDrafts, siteSlug]);

  const dismiss = () => {
    setVisible(false);
    try { window.localStorage.setItem(SHOWN_KEY(siteSlug), '1'); } catch { /* ok */ }
  };

  const showMe = () => {
    const section = drafted ? firstDraftedSection(drafted) : null;
    if (section && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block: section } }));
    }
    dismiss();
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
        transform: 'translateX(-50%)',
        zIndex: 298,
        maxWidth: 'min(460px, calc(100vw - 32px))',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 10px 11px 15px',
        borderRadius: 12,
        background: 'var(--pl-glass)',
        backgroundImage: 'var(--pl-glass-sheen)',
        backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
        WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
        border: '1px solid var(--pl-glass-border)',
        color: 'var(--pl-chrome-text, var(--ink, #0E0D0B))',
        boxShadow: 'var(--pl-glass-shadow-lg)',
        fontSize: 12.5,
        lineHeight: 1.45,
        animation: 'pl-rd-undo-in 260ms var(--pl-ease-emphasis, cubic-bezier(0.16, 1, 0.3, 1))',
      }}
    >
      <Pear size={16} tone="sage" shadow={false} />
      <span style={{ flex: 1, minWidth: 0 }}>
        Pear drafted a first version from what you told me. Read it through and make it yours.
      </span>
      <button
        type="button"
        onClick={showMe}
        style={{
          flexShrink: 0,
          padding: '6px 12px',
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--pl-chrome-accent, var(--sage-deep, #5C6B3F))',
          fontSize: 12.5,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Show me what Pear wrote
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          width: 26,
          height: 26,
          borderRadius: 7,
          display: 'grid',
          placeItems: 'center',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
        }}
      >
        <Icon name="close" size={13} color="var(--pl-chrome-text-soft, var(--ink-soft, #6B6355))" />
      </button>
    </div>
  );
}

export default FirstPressingReview;
