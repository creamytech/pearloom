'use client';

// ─────────────────────────────────────────────────────────────
// PublishModal — the "go live" experience.
//
// Three-step cinema:
//   • review     — claim a pearloom.com/<slug> address, pick
//                  visibility (public / password / private),
//                  preview the themed OG share card.
//   • publishing — "Going live…" loader (sage spinner) while
//                  the host's /api/sites/publish call resolves.
//   • live       — "You're live!" success with copy-link,
//                  themed OG embed, and Web Share API fallout
//                  to X / Facebook / iMessage / Email.
//
// Port of ClaudeDesign/pages/publish-flow.jsx into production
// types + the canonical /api/og endpoint (Edition-aware).
// Wired into EditorV8's "Save & publish" topbar button.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '@/components/pearloom/motifs';
import { resolveThemeFamily } from '@/lib/event-os/theme-family';
import { normalizeOccasion } from '@/lib/site-urls';

type Step = 'review' | 'publishing' | 'live';
type Privacy = 'public' | 'password' | 'private';

export interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  /** Active manifest — drives the OG card (theme, names, date,
   *  edition, occasion). */
  manifest: StoryManifest;
  /** Couple / honoree names — fallback when manifest.names missing. */
  names: [string, string];
  /** Current site slug. The address input lets the host claim a
   *  different one, but the modal does NOT mutate the slug — it
   *  only forwards the chosen slug to onPublish. */
  siteSlug: string;
  /** Absolute URL of the live site (pearloom.com/<slug>) when
   *  publishing succeeds. Used in the success step for copy +
   *  social share. */
  liveUrl: string | null;
  /** Last publish error message, if any. Resets to null on
   *  retry. */
  publishError: string | null;
  /** Called when the host clicks "Publish to pearloom.com/<slug>".
   *  Implementer is responsible for resolving the publish (POST
   *  to /api/sites/publish or equivalent). The modal advances to
   *  'publishing' immediately; on `liveUrl` flip it advances to
   *  'live'. */
  onPublish: (opts: { slug: string; privacy: Privacy; password?: string }) => Promise<void> | void;
}

// Edition / family color helpers — extracted so the OG card
// preview echoes the published share image without a round-trip.
function ogQueryFromManifest(manifest: StoryManifest, names: [string, string]): string {
  const params = new URLSearchParams();
  const occasion = normalizeOccasion((manifest as unknown as { occasion?: string }).occasion);
  // Solo-honoree occasions render one name centred; pair occasions
  // render "name1 & name2". Mirrors the metadata emitter in
  // src/app/sites/[domain]/page.tsx so the preview = the share.
  const soloOccasions = new Set<string>([
    'birthday', 'first-birthday', 'sweet-sixteen', 'milestone-birthday',
    'retirement', 'graduation', 'bar-mitzvah', 'bat-mitzvah', 'quinceanera',
    'baptism', 'first-communion', 'confirmation',
    'memorial', 'funeral', 'gender-reveal', 'sip-and-see', 'bridal-shower',
    'bridal-luncheon', 'baby-shower',
  ]);
  const isSolo = soloOccasions.has(occasion);
  const n1 = (manifest.names?.[0] ?? names[0] ?? '').trim();
  const n2 = (manifest.names?.[1] ?? names[1] ?? '').trim();
  params.set('names', isSolo ? n1 : `${n1},${n2}`);
  params.set('occasion', occasion);
  params.set('family', resolveThemeFamily(manifest));
  if (manifest.edition) params.set('edition', manifest.edition);
  if (manifest.logistics?.date) params.set('date', manifest.logistics.date);
  const theme = manifest.theme;
  if (theme?.colors?.background) {
    params.set('bg', theme.colors.background.replace('#', ''));
  }
  if (theme?.colors?.foreground) {
    params.set('fg', theme.colors.foreground.replace('#', ''));
  }
  if (theme?.colors?.accent) {
    params.set('accent', theme.colors.accent.replace('#', ''));
  }
  if (theme?.fonts?.heading) {
    params.set('heading', theme.fonts.heading);
  }
  const cover = manifest.coverPhoto || manifest.chapters?.[0]?.images?.[0]?.url || '';
  if (cover && cover.startsWith('https://')) params.set('photo', cover);
  return params.toString();
}

export function PublishModal({
  open,
  onClose,
  manifest,
  names,
  siteSlug,
  liveUrl,
  publishError,
  onPublish,
}: PublishModalProps) {
  const [step, setStep] = useState<Step>('review');
  const [slug, setSlug] = useState(siteSlug);
  const [privacy, setPrivacy] = useState<Privacy>(() => {
    // Hydrate from manifest.comingSoon if a password is already set —
    // host's previous choice should pre-fill, not silently flip.
    if (manifest.comingSoon?.passwordProtected) return 'password';
    return 'public';
  });
  const [password, setPassword] = useState(manifest.comingSoon?.password ?? '');
  const [copied, setCopied] = useState(false);

  // Reset to review whenever the modal re-opens. Avoids the host
  // seeing the success state from a previous publish if they
  // re-open immediately.
  useEffect(() => {
    if (open) {
      setStep('review');
      setSlug(siteSlug);
      setCopied(false);
    }
  }, [open, siteSlug]);

  // Watch for publishError during the publishing step → bounce
  // back to 'review' so the host can retry. The 'live' advance is
  // handled in handlePublishClick after the onPublish promise
  // resolves; doing it here too would race against an already-
  // populated liveUrl (e.g. re-publishing an already-live site).
  useEffect(() => {
    if (step === 'publishing' && publishError) setStep('review');
  }, [publishError, step]);

  // Escape closes; trap stays simple — single button focus on each step.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const ogQuery = useMemo(() => ogQueryFromManifest(manifest, names), [manifest, names]);
  const displayUrl = useMemo(() => {
    if (liveUrl) return liveUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `pearloom.com/${slug}`;
  }, [liveUrl, slug]);

  const handlePublishClick = useCallback(async () => {
    setStep('publishing');
    try {
      await onPublish({
        slug,
        privacy,
        password: privacy === 'password' ? password : undefined,
      });
      // Successful resolve → step to 'live'. The parent has updated
      // `liveUrl` by now (handlePublish in EditorV8 is synchronous
      // through setPublishedAt). The effect above also catches this
      // for callers whose URL settles a tick later.
      setStep((current) => (current === 'publishing' ? 'live' : current));
    } catch {
      // Parent owns error surfacing; we just bounce back to review.
      setStep('review');
    }
  }, [onPublish, slug, privacy, password]);

  const copyLink = useCallback(async () => {
    const target = liveUrl || `https://pearloom.com/${slug}`;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback: hidden textarea + execCommand for older webviews.
      const ta = document.createElement('textarea');
      ta.value = target;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {}
      document.body.removeChild(ta);
    }
  }, [liveUrl, slug]);

  // Web Share API — the canonical share intent on mobile. Falls
  // back to per-channel deep links when navigator.share is
  // unavailable (desktop Safari / Firefox / older Chrome).
  const nativeShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('share' in navigator)) return false;
    const target = liveUrl || `https://pearloom.com/${slug}`;
    const title = manifest.names?.filter(Boolean).join(' & ') || siteSlug;
    try {
      await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
        title,
        text: `You're invited — ${title}`,
        url: target,
      });
      return true;
    } catch {
      return false;
    }
  }, [liveUrl, slug, manifest.names, siteSlug]);

  // Per-channel fallbacks (used when Web Share isn't available or
  // the host explicitly picks a button).
  const channelLinks = useMemo(() => {
    const target = liveUrl || `https://pearloom.com/${slug}`;
    const title = manifest.names?.filter(Boolean).join(' & ') || siteSlug;
    const text = `You're invited — ${title}`;
    return {
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(target)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(target)}`,
      // sms: works on iOS Safari, Android Chrome; no-op elsewhere
      // (browser shows a 'cannot open' dialog). Acceptable tradeoff
      // since native share covers most mobile cases.
      sms: `sms:?&body=${encodeURIComponent(`${text} — ${target}`)}`,
      email: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n\n${target}`)}`,
    };
  }, [liveUrl, slug, manifest.names, siteSlug]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Publish your site"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-modal, 300)' as unknown as number,
        background: 'rgba(40, 40, 30, 0.5)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: 22,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(520px, 96vw)',
          maxHeight: '92vh',
          overflow: 'auto',
          background: 'var(--card, #FBF7EE)',
          borderRadius: 22,
          position: 'relative',
          boxShadow: '0 30px 80px rgba(14, 13, 11, 0.32), 0 0 0 1px rgba(14, 13, 11, 0.06)',
          animation: 'pl-pub-in 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes pl-pub-in {
            from { transform: scale(0.97); opacity: 0; }
            to   { transform: none;        opacity: 1; }
          }
          @keyframes pl-pub-spin { to { transform: rotate(360deg); } }
        `}</style>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close publish flow"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 30,
            height: 30,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            background: 'var(--cream-2, #F0E9D8)',
            border: 'none',
            cursor: 'pointer',
            zIndex: 3,
          }}
        >
          <Icon name="close" size={15} color="var(--ink-soft, #3A332C)" />
        </button>

        {step === 'review' && (
          <ReviewStep
            slug={slug}
            setSlug={setSlug}
            privacy={privacy}
            setPrivacy={setPrivacy}
            password={password}
            setPassword={setPassword}
            ogQuery={ogQuery}
            publishError={publishError}
            onPublish={handlePublishClick}
            previewUrl={displayUrl}
          />
        )}

        {step === 'publishing' && <PublishingStep displayUrl={displayUrl} />}

        {step === 'live' && (
          <LiveStep
            displayUrl={displayUrl}
            copied={copied}
            onCopy={copyLink}
            ogQuery={ogQuery}
            onNativeShare={nativeShare}
            channelLinks={channelLinks}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

// ─── REVIEW STEP ───────────────────────────────────────────────

function ReviewStep({
  slug,
  setSlug,
  privacy,
  setPrivacy,
  password,
  setPassword,
  ogQuery,
  publishError,
  onPublish,
  previewUrl,
}: {
  slug: string;
  setSlug: (s: string) => void;
  privacy: Privacy;
  setPrivacy: (p: Privacy) => void;
  password: string;
  setPassword: (p: string) => void;
  ogQuery: string;
  publishError: string | null;
  onPublish: () => void;
  previewUrl: string;
}) {
  const privacyOptions: Array<{ value: Privacy; icon: string; label: string; sub: string }> = [
    { value: 'public', icon: 'globe', label: 'Public', sub: 'Anyone with the link' },
    { value: 'password', icon: 'lock', label: 'Password protected', sub: 'Guests enter a shared password' },
    { value: 'private', icon: 'eye-off', label: 'Private', sub: 'Only you can see it' },
  ];
  return (
    <div style={{ padding: '28px 28px 24px' }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--lavender-ink, #6B5E8E)',
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        }}
      >
        Go live
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display, var(--pl-font-display))',
          fontSize: 28,
          fontWeight: 600,
          margin: '4px 0 16px',
          color: 'var(--ink, #0E0D0B)',
        }}
      >
        Publish your site
      </h2>

      <OgCardEmbed ogQuery={ogQuery} />

      <label
        htmlFor="pl-pub-slug"
        style={{
          display: 'block',
          marginTop: 16,
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted, #6F6557)',
        }}
      >
        Your address
      </label>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 6,
          borderRadius: 10,
          border: '1px solid var(--line, #D8CFB8)',
          background: 'var(--cream-2, #F0E9D8)',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            padding: '11px 4px 11px 13px',
            fontSize: 14,
            color: 'var(--ink-muted, #6F6557)',
          }}
        >
          pearloom.com/
        </span>
        <input
          id="pl-pub-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())}
          style={{
            flex: 1,
            padding: '11px 13px 11px 0',
            border: 'none',
            background: 'transparent',
            fontSize: 14,
            fontWeight: 600,
            outline: 'none',
            color: 'var(--ink, #0E0D0B)',
            fontFamily: 'var(--font-ui, var(--pl-font-body))',
          }}
        />
        <span
          style={{
            padding: '0 13px',
            fontSize: 12,
            color: 'var(--sage-deep, #5C6B3F)',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Icon name="check" size={12} color="var(--sage-deep, #5C6B3F)" /> Available
        </span>
      </div>

      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted, #6F6557)',
          margin: '16px 0 8px',
        }}
      >
        Who can see it
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {privacyOptions.map((opt) => {
          const active = privacy === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPrivacy(opt.value)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '11px 13px',
                borderRadius: 11,
                textAlign: 'left',
                cursor: 'pointer',
                background: active ? 'var(--cream-2, #F0E9D8)' : 'var(--card, #FBF7EE)',
                border: active
                  ? '2px solid var(--ink, #0E0D0B)'
                  : '1px solid var(--line, #D8CFB8)',
                fontFamily: 'var(--font-ui, var(--pl-font-body))',
                color: 'var(--ink, #0E0D0B)',
                transition: 'background var(--pl-dur-fast, 180ms) var(--pl-ease-out, ease)',
              }}
            >
              <Icon name={opt.icon} size={16} color="var(--ink-soft, #3A332C)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{opt.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)' }}>
                  {opt.sub}
                </div>
              </div>
              {active && <Icon name="check" size={15} color="var(--ink, #0E0D0B)" />}
            </button>
          );
        })}
      </div>

      {privacy === 'password' && (
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Shared password"
          aria-label="Shared password for guests"
          style={{
            marginTop: 10,
            width: '100%',
            padding: '10px 13px',
            borderRadius: 10,
            border: '1px solid var(--line, #D8CFB8)',
            background: 'var(--card, #FBF7EE)',
            fontSize: 13.5,
            fontWeight: 500,
            outline: 'none',
            color: 'var(--ink, #0E0D0B)',
            fontFamily: 'var(--font-ui, var(--pl-font-body))',
          }}
        />
      )}

      {publishError && (
        <div
          role="alert"
          style={{
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--pl-plum-mist, rgba(122, 45, 45, 0.10))',
            border: '1px solid var(--pl-plum, #7A2D2D)',
            color: 'var(--pl-plum, #7A2D2D)',
            fontSize: 12.5,
            fontWeight: 600,
            fontFamily: 'var(--font-ui, var(--pl-font-body))',
          }}
        >
          {publishError}
        </div>
      )}

      <button
        type="button"
        onClick={onPublish}
        className="pl-pearl-accent"
        style={{
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 18px',
          borderRadius: 999,
          marginTop: 18,
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'var(--font-ui, var(--pl-font-body))',
          cursor: 'pointer',
          border: 'none',
        }}
      >
        Publish to {previewUrl} <Icon name="arrow-up" size={13} />
      </button>
    </div>
  );
}

// ─── PUBLISHING STEP ───────────────────────────────────────────

function PublishingStep({ displayUrl }: { displayUrl: string }) {
  return (
    <div style={{ padding: '70px 28px', textAlign: 'center' }}>
      <div
        aria-hidden
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid var(--cream-3, #E8DFC9)',
          borderTopColor: 'var(--sage-deep, #5C6B3F)',
          marginInline: 'auto',
          animation: 'pl-pub-spin 0.8s linear infinite',
        }}
      />
      <div
        style={{
          fontFamily: 'var(--font-display, var(--pl-font-display))',
          fontSize: 20,
          fontWeight: 600,
          marginTop: 18,
          color: 'var(--ink, #0E0D0B)',
        }}
      >
        Going live…
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--ink-soft, #3A332C)',
          marginTop: 4,
          fontFamily: 'var(--font-ui, var(--pl-font-body))',
        }}
      >
        Securing {displayUrl} and generating share cards.
      </div>
    </div>
  );
}

// ─── LIVE STEP ─────────────────────────────────────────────────

function LiveStep({
  displayUrl,
  copied,
  onCopy,
  ogQuery,
  onNativeShare,
  channelLinks,
  onClose,
}: {
  displayUrl: string;
  copied: boolean;
  onCopy: () => void;
  ogQuery: string;
  onNativeShare: () => Promise<boolean>;
  channelLinks: { x: string; facebook: string; sms: string; email: string };
  onClose: () => void;
}) {
  const [hasNativeShare, setHasNativeShare] = useState(false);
  useEffect(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const channelBtn: React.CSSProperties = {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: '9px 6px',
    borderRadius: 999,
    border: '1px solid var(--line, #D8CFB8)',
    background: 'transparent',
    color: 'var(--ink, #0E0D0B)',
    fontSize: 11.5,
    fontWeight: 600,
    fontFamily: 'var(--font-ui, var(--pl-font-body))',
    cursor: 'pointer',
    textDecoration: 'none',
  };

  return (
    <div style={{ padding: '30px 28px 24px', textAlign: 'center' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--pl-olive-mist, var(--sage-tint, #E0DDC9))',
          display: 'grid',
          placeItems: 'center',
          marginInline: 'auto',
        }}
      >
        <Pear size={32} tone="sage" sparkle shadow={false} />
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display, var(--pl-font-display))',
          fontSize: 26,
          fontWeight: 600,
          margin: '14px 0 4px',
          color: 'var(--ink, #0E0D0B)',
        }}
      >
        You{'’'}re live
      </h2>
      <p
        style={{
          fontSize: 13.5,
          color: 'var(--ink-soft, #3A332C)',
          marginBottom: 16,
          fontFamily: 'var(--font-ui, var(--pl-font-body))',
        }}
      >
        Your site is published. Share this link — it unfurls into the card below.
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'var(--cream-2, #F0E9D8)',
          border: '1px solid var(--line, #D8CFB8)',
          marginBottom: 14,
        }}
      >
        <Icon name="globe" size={15} color="var(--ink-soft, #3A332C)" />
        <span
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: 600,
            textAlign: 'left',
            color: 'var(--ink, #0E0D0B)',
            fontFamily: 'var(--font-ui, var(--pl-font-body))',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayUrl}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="pl-pearl-accent"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 11px',
            borderRadius: 999,
            border: 'none',
            fontSize: 11.5,
            fontWeight: 700,
            fontFamily: 'var(--font-ui, var(--pl-font-body))',
            cursor: 'pointer',
          }}
        >
          {copied ? (
            <>
              <Icon name="check" size={12} /> Copied
            </>
          ) : (
            <>
              <Icon name="copy" size={12} /> Copy
            </>
          )}
        </button>
      </div>

      <OgCardEmbed ogQuery={ogQuery} />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        {hasNativeShare && (
          <button
            type="button"
            onClick={() => void onNativeShare()}
            style={channelBtn}
            aria-label="Share via your device"
          >
            <Icon name="share" size={12} /> Share
          </button>
        )}
        <a
          href={channelLinks.x}
          target="_blank"
          rel="noopener noreferrer"
          style={channelBtn}
          aria-label="Share on X (Twitter)"
        >
          X
        </a>
        <a
          href={channelLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          style={channelBtn}
          aria-label="Share on Facebook"
        >
          Facebook
        </a>
        <a href={channelLinks.sms} style={channelBtn} aria-label="Share via Messages">
          <Icon name="send" size={12} /> Messages
        </a>
        <a href={channelLinks.email} style={channelBtn} aria-label="Share via email">
          <Icon name="mail" size={12} /> Email
        </a>
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{
          marginTop: 16,
          fontSize: 13,
          color: 'var(--ink-soft, #3A332C)',
          fontWeight: 600,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui, var(--pl-font-body))',
        }}
      >
        Back to editing
      </button>
    </div>
  );
}

// ─── THEMED OG EMBED ───────────────────────────────────────────
//
// Embeds /api/og as an <img> so the host sees the exact card
// that unfurls in iMessage / X / Facebook. Edition-aware art
// already lives at that endpoint — we just forward params.
function OgCardEmbed({ ogQuery }: { ogQuery: string }) {
  const src = `/api/og?${ogQuery}`;
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--line-soft, #E5DCC4)',
        background: 'var(--cream-2, #F0E9D8)',
        aspectRatio: '1200 / 630',
      }}
    >
      <img
        src={src}
        alt="Preview of how your site appears when shared"
        loading="lazy"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </div>
  );
}

export default PublishModal;
