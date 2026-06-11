'use client';

/* ========================================================================
   FooterBouquet — the editorial closing flourish that sits above the
   site footer. Pulled from manifest.decorLibrary.footerBouquet. Empty
   in published mode; in edit mode shows an "+ closing flourish"
   affordance that drops the user into the Decor Library so they can
   generate one.

   Also renders a "Share this celebration" chip row above the bouquet
   so guests can pass the site URL along (copy / Messages / Email /
   native Web Share). The whole footer block is themed per-Edition
   via CSS vars (--pl-footer-bg, --pl-footer-ink) so the existing
   palette tokens drive everything below.
   ======================================================================== */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { useEditorCanvas } from '../editor/canvas/EditorCanvasContext';
import { focusDecorLibrary } from './focusDecorLibrary';
import { DecorEditOverlay } from '../editor/canvas/DecorEditOverlay';
import { Icon } from '../motifs';
import { resolveEdition } from '@/lib/site-editions/resolve';
import type { EditionId } from '@/lib/site-editions/types';
import { getEventType } from '@/lib/event-os/event-types';

interface Props {
  url?: string;
  manifest?: StoryManifest;
}

// ── Per-Edition footer palette ──────────────────────────────────────
// Cream-on-deep-ink for most Editions; cream-deep-on-ink for the
// scrapbook Postcard Box (it likes the warmer paper feel). These
// pipe down through --pl-footer-bg / --pl-footer-ink CSS vars so
// the existing SiteFooter inherits them automatically.
const EDITION_PALETTE: Record<EditionId, { bg: string; ink: string }> = {
  'almanac':       { bg: '#3D4A1F', ink: '#F5EFE2' }, // deep olive + cream
  'cinema':        { bg: '#0E0D0B', ink: '#F1EBDC' }, // midnight + cream
  'postcard-box':  { bg: '#EBE3D2', ink: '#0E0D0B' }, // cream-deep + ink
  'linen-folder':  { bg: '#1B2A3A', ink: '#F0E9DA' }, // navy + linen
  'quiet':         { bg: '#0E0D0B', ink: '#F5EFE2' }, // ink + cream
  'coastal':       { bg: '#103B45', ink: '#F0EDE3' }, // deep teal + cream
};

export function FooterBouquet({ url, manifest }: Props) {
  const { editMode, onEditField } = useEditorCanvas();

  // Resolve the active Edition. resolveEdition() never writes back
  // to the manifest — it just picks a definition based on explicit
  // pick / occasion / voice.
  const edition = useMemo(() => {
    const occasion = manifest?.occasion;
    const voice = occasion ? getEventType(occasion)?.voice : undefined;
    return resolveEdition({
      edition: manifest?.edition,
      occasion,
      voice,
    });
  }, [manifest?.edition, manifest?.occasion]);

  const palette = EDITION_PALETTE[edition.id] ?? EDITION_PALETTE['almanac'];

  // CSS vars set on the root so the existing SiteFooter below this
  // component (and the bouquet image's blend mode) read from the
  // same palette tokens.
  const rootStyle: CSSProperties = {
    ['--pl-footer-bg' as string]: palette.bg,
    ['--pl-footer-ink' as string]: palette.ink,
    color: palette.ink,
    background: palette.bg,
  };

  const bouquetNode = url ? (
    <div
      aria-hidden="true"
      style={{
        display: 'grid',
        placeItems: 'center',
        padding: '48px 24px 0',
      }}
    >
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        style={{
          width: 'clamp(180px, 42cqw, 320px)',
          height: 'auto',
          maxHeight: 'min(280px, 40vh)',
          aspectRatio: '2 / 3',
          objectFit: 'contain',
          // Blend + opacity adapt to theme via CSS vars set by
          // each Edition (Cinema = screen, paper Editions =
          // multiply). So the bouquet doesn't go invisible on
          // dark theatres or chalky on bright ones.
          mixBlendMode: 'var(--decor-blend, multiply)' as 'multiply',
          opacity: 'var(--decor-opacity, 0.92)' as unknown as number,
        }}
      />
    </div>
  ) : null;

  const bouquetWithEditChrome =
    bouquetNode && editMode ? (
      <DecorEditOverlay
        kind="bouquet"
        url={url!}
        visibilityKey="footer-bouquet"
        label="Closing flourish"
        onEditField={onEditField}
      >
        {bouquetNode}
      </DecorEditOverlay>
    ) : (
      bouquetNode
    );

  const generateAffordance = editMode && !url ? (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        padding: '36px 24px 12px',
      }}
    >
      <button
        type="button"
        onClick={focusDecorLibrary}
        data-pl-no-select=""
        title="Generate the AI closing flourish"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 18px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--peach-ink, #C6703D)',
          background: 'var(--peach-bg, rgba(198,112,61,0.06))',
          border: '1px dashed currentColor',
          borderRadius: 999,
          cursor: 'pointer',
          opacity: 0.78,
          transition: 'opacity var(--pl-dur-fast) var(--pl-ease-out), transform var(--pl-dur-fast) var(--pl-ease-out)',
          fontFamily: 'inherit',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.02)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.78'; e.currentTarget.style.transform = ''; }}
      >
        + Generate closing flourish
      </button>
    </div>
  ) : null;

  return (
    <div data-pl-footer-edition={edition.id} style={rootStyle}>
      <ShareCelebrationRow manifest={manifest} ink={palette.ink} />
      {bouquetWithEditChrome}
      {generateAffordance}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// ShareCelebrationRow — the chip row above the bouquet. Three always-
// on chips (Copy / Messages / Email) plus a fourth Web Share chip
// that's feature-detected at runtime so it only appears where
// navigator.share is implemented (iOS Safari, Android Chrome).
// ─────────────────────────────────────────────────────────────────────

interface ShareRowProps {
  manifest?: StoryManifest;
  ink: string;
}

function ShareCelebrationRow({ manifest, ink }: ShareRowProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // Feature-detect navigator.share once mounted — SSR would always
  // return false, and we don't want the chip to flash in/out on
  // hydration. The state flip is fine — chips ride a fade-in via
  // the data-attr and are part of an already-laid-out row.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanNativeShare(true);
    }
  }, []);

  // Pre-populate the share body. Prefers manifest.subject (a free-
  // form host headline if it ever exists), then "Name & Name —
  // Pearloom", finally a generic fallback so we never share an
  // empty string.
  const { shareText, shareTitle, shareUrl } = useMemo(() => {
    const url = (typeof window !== 'undefined') ? window.location.href : '';
    const m = manifest as unknown as { subject?: string; coupleNames?: [string, string] } | undefined;
    const subject = m?.subject;
    const tupleNames: [string, string] | undefined = m?.coupleNames ?? manifest?.names;
    const joined = tupleNames && tupleNames.filter(Boolean).length
      ? tupleNames.filter(Boolean).join(' & ')
      : '';
    const title = subject || (joined ? `${joined} — Pearloom` : 'Our celebration — Pearloom');
    const body = subject
      ? `${subject}\n\n${url}`
      : joined
        ? `We're celebrating! Here's our site for ${joined}: ${url}`
        : `We're celebrating! Here's our site: ${url}`;
    return { shareText: body, shareTitle: title, shareUrl: url };
  }, [manifest]);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl || (typeof window !== 'undefined' ? window.location.href : ''));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Silently swallow — host can always long-press the URL.
    }
  };

  const handleNativeShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      }
    } catch {
      // User cancelled or share failed — no-op.
    }
  };

  // Messages: prefer sms: on touch devices (iOS / Android), fall
  // back to a mailto: pre-fill for desktop where there's no SMS
  // app to hand off to.
  //
  // The SMS body is the URL ALONE — iMessage only renders the big
  // rich link card when the URL is the entire message; text + link
  // in one bubble collapses to a bare domain pill. The share card
  // (og:image) carries the names and photo, so nothing is lost.
  const messagesHref = useMemo(() => {
    if (typeof window === 'undefined') return '#';
    const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
    if (isTouch) {
      // iOS uses '&', Android uses '?' — '?' works on both.
      return `sms:?body=${encodeURIComponent(shareUrl || shareText)}`;
    }
    return `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText)}`;
  }, [shareText, shareTitle, shareUrl]);

  const emailHref = useMemo(() => {
    return `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText)}`;
  }, [shareText, shareTitle]);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 24px 0',
      }}
    >
      <div
        role="group"
        aria-label="Share this celebration"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.6,
            marginRight: 4,
            color: ink,
          }}
        >
          Share this celebration
        </span>

        <Chip
          ink={ink}
          onClick={handleCopy}
          icon={copied ? 'check' : 'link'}
          label={copied ? 'Copied' : 'Copy link'}
          ariaLabel="Copy site link to clipboard"
        />

        <Chip
          ink={ink}
          as="a"
          href={messagesHref}
          icon="send"
          label="Messages"
          ariaLabel="Share via Messages"
        />

        <Chip
          ink={ink}
          as="a"
          href={emailHref}
          icon="mail"
          label="Email"
          ariaLabel="Share via Email"
        />

        {canNativeShare ? (
          <Chip
            ink={ink}
            onClick={handleNativeShare}
            icon="share"
            label="Share"
            ariaLabel="Share via system share sheet"
          />
        ) : null}
      </div>
    </div>
  );
}

// ── Chip primitive (local to FooterBouquet) ─────────────────────────
// Small pill with icon + label. Renders <button> by default;
// switches to <a> when `as="a"` is passed (mailto / sms).
interface ChipProps {
  ink: string;
  icon: string;
  label: string;
  ariaLabel: string;
  as?: 'button' | 'a';
  href?: string;
  onClick?: () => void;
}

function Chip({ ink, icon, label, ariaLabel, as = 'button', href, onClick }: ChipProps) {
  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: ink,
    background: 'transparent',
    border: '1px solid currentColor',
    borderRadius: 999,
    cursor: 'pointer',
    opacity: 0.85,
    textDecoration: 'none',
    fontFamily: 'inherit',
    transition: 'opacity var(--pl-dur-fast) var(--pl-ease-out), transform var(--pl-dur-fast) var(--pl-ease-out)',
  };
  const handleEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.opacity = '1';
    e.currentTarget.style.transform = 'translateY(-1px)';
  };
  const handleLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.opacity = '0.85';
    e.currentTarget.style.transform = '';
  };
  const inner = (
    <>
      <Icon name={icon} size={14} color={ink} />
      <span>{label}</span>
    </>
  );
  if (as === 'a') {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        style={baseStyle}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {inner}
      </a>
    );
  }
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={baseStyle}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {inner}
    </button>
  );
}
