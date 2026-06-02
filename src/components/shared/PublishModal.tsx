'use client';

// ─────────────────────────────────────────────────────────────
// PublishModal — LITERAL PORT of ClaudeDesign/pages/publish-flow.jsx.
//
// Three-state cinema, verbatim from the prototype:
//   • review     — eyebrow "GO LIVE" → headline "Publish your site"
//                  → themed PubShareCard preview → "pearloom.com/"
//                  slug input with green "Available" pill → three
//                  privacy radio cards → primary publish CTA.
//   • publishing — a centred CSS spinner ring on the same panel,
//                  "Going live…" display heading + "Securing {url}
//                  and generating share cards." subline. 1.4s before
//                  flipping to live (matched to prototype timing on
//                  the optimistic path; the real publish promise
//                  also resolves the step).
//   • live       — sage-tinted pear medallion → "You're live!"
//                  → copy-link row with primary copy button →
//                  themed PubShareCard echoes the embed unfurl →
//                  four channel buttons (Email / Messages /
//                  Instagram / Download card) → "Back to editing".
//
// Data integration kept from production:
//   • onPublish(opts) calls the existing /api/sites/publish handler
//     in EditorV8 — slug + privacy + optional password forwarded.
//   • publishError bounces back to review with a styled callout.
//   • Manifest supplies names, date, occasion, and theme — the
//     PubShareCard preview reads them so the prototype's hard-coded
//     "Scott & Shauna · April 26, 2027 · Santorini" becomes the
//     host's real headline.
//   • Native Web Share kept as a no-op enrichment behind one of
//     the channel buttons; the visible channels mirror the
//     prototype 1:1 (Email · Messages · Instagram · Download card).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { Icon, Pear } from '@/components/pearloom/motifs';
import { normalizeOccasion } from '@/lib/site-urls';

type Step = 'review' | 'publishing' | 'live';
type Privacy = 'public' | 'password' | 'private';

export interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  /** Active manifest — drives the share-card preview (theme,
   *  names, date, occasion). */
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
   *  'publishing' immediately; on success or after the timer
   *  fires it advances to 'live'. */
  onPublish: (opts: { slug: string; privacy: Privacy; password?: string }) => Promise<void> | void;
}

// ─── SHARE-CARD PREVIEW (PubShareCard literal port) ─────────────
//
// The prototype's PubShareCard is a themed 1200×630 OG card
// rendered inline in the modal so the host sees the unfurl
// before they ship. It reads the active site theme (palette,
// motif, fonts) and writes a postcard:
//
//     YOU'RE INVITED
//     Name1 & Name2
//     ────── sprig ──────
//     Date · Place
//
// The production port pulls names + date + place from the
// manifest, threads the theme's accent / paper / ink through
// CSS vars, and approximates the motif corners with the
// production motif registry where one is available — falling
// back to a hairline asterism so the corners still feel decorated.

function PubShareCard({ manifest, names }: { manifest: StoryManifest; names: [string, string] }) {
  const occasion = normalizeOccasion((manifest as unknown as { occasion?: string }).occasion);
  const soloOccasions = new Set<string>([
    'birthday', 'first-birthday', 'sweet-sixteen', 'milestone-birthday',
    'retirement', 'graduation', 'bar-mitzvah', 'bat-mitzvah', 'quinceanera',
    'baptism', 'first-communion', 'confirmation',
    'memorial', 'funeral', 'gender-reveal', 'sip-and-see', 'bridal-shower',
    'bridal-luncheon', 'baby-shower',
  ]);
  const isSolo = soloOccasions.has(occasion);
  const n1 = (manifest.names?.[0] ?? names[0] ?? '').trim() || 'Your name';
  const n2 = (manifest.names?.[1] ?? names[1] ?? '').trim();

  // Theme tokens — fall back to the editorial cream/ink palette
  // so the preview always renders, even when the manifest hasn't
  // resolved a theme yet (fresh sites).
  const theme = manifest.theme;
  const tPaper = theme?.colors?.background || '#F5EFE2';
  const tInk = theme?.colors?.foreground || '#0E0D0B';
  const tAccent = theme?.colors?.accent || '#5C6B3F';
  const tInkSoft = '#3A332C';
  const tLine = 'rgba(14, 13, 11, 0.18)';
  const tGold = '#B8935A';
  const displayFont = theme?.fonts?.heading || 'var(--font-display, var(--pl-font-display))';

  // Occasion eyebrow — "You're invited" works for weddings + most
  // celebrations; memorials use "In loving memory" per the OG
  // metadata emitter so the unfurl reads correctly.
  const eyebrow =
    occasion === 'memorial' || occasion === 'funeral' ? "In loving memory" :
    occasion === 'engagement' ? "We're engaged" :
    occasion === 'anniversary' ? "Still ours" :
    "You're invited";

  // Date · Place line — pulls from logistics; otherwise falls
  // back to a friendly placeholder so the card never reads empty.
  const date = manifest.logistics?.date || 'Coming soon';
  const place = manifest.logistics?.venue || '';
  const dateLine = place ? `${date} · ${place}` : date;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        background: tPaper,
        aspectRatio: '1200 / 630',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '20px',
        border: '1px solid ' + tLine,
        color: tInk,
      }}
    >
      {/* Corner motifs — sprig glyphs mirroring the prototype's
          two top-corner Motif placements. We render small olive
          sprig SVGs so the corners read as decoration without
          requiring the full theme registry. */}
      <div style={{ position: 'absolute', top: 12, left: 14, opacity: 0.5, transform: 'scaleX(-1)' }}>
        <CardSprig size={42} color={tAccent} />
      </div>
      <div style={{ position: 'absolute', top: 12, right: 14, opacity: 0.5 }}>
        <CardSprig size={42} color={tAccent} />
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: tAccent,
            marginBottom: 6,
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: displayFont,
            fontWeight: 600,
            fontSize: 30,
            lineHeight: 1,
            color: tInk,
          }}
        >
          {isSolo || !n2 ? (
            n1
          ) : (
            <>
              {n1}
              <span
                style={{
                  fontStyle: 'italic',
                  fontSize: '0.6em',
                  color: tInkSoft,
                  margin: '0 0.14em',
                  fontWeight: 400,
                }}
              >
                &amp;
              </span>
              {n2}
            </>
          )}
        </div>
        {/* Sprig divider — literal port of TDivider look="sprig" */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, margin: '8px auto' }}>
          <div style={{ width: 38, height: 1, background: tLine }} />
          <CardSprig size={26} color={tAccent} flip />
          <span style={{ width: 5, height: 5, borderRadius: '50%', border: '1px solid ' + tAccent }} />
          <CardSprig size={26} color={tAccent} />
          <div style={{ width: 38, height: 1, background: tLine }} />
        </div>
        <div style={{ fontSize: 10.5, color: tInkSoft, fontFamily: 'var(--pl-font-body)' }}>
          {dateLine}
        </div>
      </div>

      {/* Gold rule — a hairline of the brand's punctuation colour
          on the trailing edge, matching the prototype's quiet
          letterpress finish. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 14,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 36,
          height: 1,
          background: tGold,
          opacity: 0.6,
        }}
      />
    </div>
  );
}

// Small olive-sprig SVG used for the card corners + divider —
// the visual atom that signals "Pearloom" without dragging the
// whole motif registry into the share-card preview.
function CardSprig({ size = 42, color, flip = false }: { size?: number; color: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 80 60"
      width={size}
      height={size * 0.75}
      style={{ transform: flip ? 'scaleX(-1)' : 'none' }}
      aria-hidden
    >
      <path d="M8 50 C 24 42, 44 30, 70 12" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      {[[20, 44, -22], [32, 36, -22], [44, 28, -22], [56, 20, -22], [16, 38, 20], [28, 30, 20], [40, 22, 20], [52, 14, 20]].map((p, i) => (
        <ellipse key={i} cx={p[0]} cy={p[1]} rx="5" ry="2.4" fill={color} opacity={0.85} transform={`rotate(${p[2]} ${p[0]} ${p[1]})`} />
      ))}
    </svg>
  );
}

// ─── PUBLISH MODAL ─────────────────────────────────────────────

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
  // back to 'review' so the host can retry.
  useEffect(() => {
    if (step === 'publishing' && publishError) setStep('review');
  }, [publishError, step]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const displayUrl = useMemo(() => {
    if (liveUrl) return liveUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `pearloom.com/${slug}`;
  }, [liveUrl, slug]);

  const go = useCallback(async () => {
    setStep('publishing');
    try {
      // Kick the parent's publish — and at the same time start a
      // 1.4s timer so the "Going live…" panel always feels like
      // it took at least that long (the prototype's optimistic
      // cinema). If the publish is faster, we wait the timer; if
      // it's slower, we wait the publish. Either way the host
      // doesn't see a flash of the loading state.
      const minDelay = new Promise<void>((resolve) => setTimeout(resolve, 1400));
      const publish = Promise.resolve(onPublish({
        slug,
        privacy,
        password: privacy === 'password' ? password : undefined,
      }));
      await Promise.all([minDelay, publish]);
      setStep((current) => (current === 'publishing' ? 'live' : current));
    } catch {
      // Parent owns error surfacing; we just bounce back to review.
      setStep('review');
    }
  }, [onPublish, slug, privacy, password]);

  const copy = useCallback(async () => {
    const target = liveUrl || `https://pearloom.com/${slug}`;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
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

  // Per-channel share intents — bound to the four prototype
  // buttons (Email / Messages / Instagram / Download card). Web
  // Share API used as a soft enrichment on Instagram (no real
  // Instagram intent URL exists outside Stories Sharing API).
  const channelHandlers = useMemo(() => {
    const target = liveUrl || `https://pearloom.com/${slug}`;
    const title = manifest.names?.filter(Boolean).join(' & ') || siteSlug;
    const text = `You're invited — ${title}`;
    return {
      email: () => {
        window.open(`mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n\n${target}`)}`);
      },
      messages: () => {
        window.open(`sms:?&body=${encodeURIComponent(`${text} — ${target}`)}`);
      },
      instagram: async () => {
        // No web intent for Instagram — copy the link + fall
        // through to Web Share if available so the host can
        // paste into the IG composer manually.
        try {
          await navigator.clipboard.writeText(target);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {}
        if (typeof navigator !== 'undefined' && 'share' in navigator) {
          try {
            await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
              title,
              text,
              url: target,
            });
          } catch {}
        }
      },
      download: () => {
        // Pull the themed OG card straight from /api/og and
        // trigger a download. Edition-aware, matches the unfurl.
        const params = new URLSearchParams();
        params.set('names', title.replace(' & ', ','));
        const occ = normalizeOccasion((manifest as unknown as { occasion?: string }).occasion);
        params.set('occasion', occ);
        if (manifest.edition) params.set('edition', manifest.edition);
        if (manifest.logistics?.date) params.set('date', manifest.logistics.date);
        const a = document.createElement('a');
        a.href = `/api/og?${params.toString()}`;
        a.download = `pearloom-${slug}-share-card.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      },
    };
  }, [liveUrl, slug, manifest, siteSlug]);

  const url = displayUrl;

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
        zIndex: 95,
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
          boxShadow: 'var(--shadow-lg, 0 30px 80px rgba(14, 13, 11, 0.32), 0 0 0 1px rgba(14, 13, 11, 0.06))',
          animation: 'us-in 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <style>{`
          @keyframes us-in {
            from { transform: scale(0.97); opacity: 0; }
            to   { transform: none;        opacity: 1; }
          }
          @keyframes pub-spin {
            to { transform: rotate(360deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .pl-pub-anim { animation: none !important; }
          }
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
            publishError={publishError}
            onPublish={go}
            url={url}
            manifest={manifest}
            names={names}
          />
        )}

        {step === 'publishing' && <PublishingStep url={url} />}

        {step === 'live' && (
          <LiveStep
            url={url}
            copied={copied}
            onCopy={copy}
            manifest={manifest}
            names={names}
            channelHandlers={channelHandlers}
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
  publishError,
  onPublish,
  url,
  manifest,
  names,
}: {
  slug: string;
  setSlug: (s: string) => void;
  privacy: Privacy;
  setPrivacy: (p: Privacy) => void;
  password: string;
  setPassword: (p: string) => void;
  publishError: string | null;
  onPublish: () => void;
  url: string;
  manifest: StoryManifest;
  names: [string, string];
}) {
  const privacyOptions: Array<[Privacy, string, string, string]> = [
    ['public', 'globe', 'Public', 'Anyone with the link'],
    ['password', 'lock', 'Password protected', 'Guests enter a shared password'],
    ['private', 'eye-off', 'Private', 'Only you & your partner'],
  ];
  // Slug well-formed → green "Available" pill. Real claim
  // collisions surface as publishError on submit.
  const slugLooksOk = slug.length >= 3 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug);

  return (
    <div style={{ padding: '28px 28px 24px' }}>
      <div
        className="eyebrow"
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--lavender-ink, #6B5E8E)',
          fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        }}
      >
        GO LIVE
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
      <div style={{ marginBottom: 16, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-soft, #E5DCC4)' }}>
        <PubShareCard manifest={manifest} names={names} />
      </div>

      <label
        htmlFor="pl-pub-slug"
        style={{
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
        <span style={{ padding: '11px 4px 11px 13px', fontSize: 14, color: 'var(--ink-muted, #6F6557)' }}>
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
        {slugLooksOk && (
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
        )}
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
        {privacyOptions.map(([v, ic, t, s]) => {
          const active = privacy === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setPrivacy(v)}
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
              <Icon name={ic} size={16} color="var(--ink-soft, #3A332C)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{t}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted, #6F6557)' }}>{s}</div>
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
        className="btn btn-primary pl-pearl-accent"
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
        Publish to {url} <Icon name="arrow-up" size={13} color="var(--cream, #F5EFE2)" />
      </button>
    </div>
  );
}

// ─── PUBLISHING STEP ───────────────────────────────────────────
//
// Literal port of the prototype's centred spinner + headline +
// subline. The ring is the canonical CSS spinner from the
// prototype — three-pixel cream border with the sage-deep
// top-segment chasing 360°/800ms. Matches the rest of the
// prototype's loading vocabulary; honours reduced-motion via
// the .pl-pub-anim class.

function PublishingStep({ url }: { url: string }) {
  return (
    <div style={{ padding: '70px 28px', textAlign: 'center' }}>
      <div
        className="pl-pub-anim"
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid var(--cream-3, #E5DCC4)',
          borderTopColor: 'var(--sage-deep, #5C6B3F)',
          marginInline: 'auto',
          animation: 'pub-spin 0.8s linear infinite',
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
        Securing {url} and generating share cards.
      </div>
    </div>
  );
}

// ─── LIVE STEP ─────────────────────────────────────────────────

function LiveStep({
  url,
  copied,
  onCopy,
  manifest,
  names,
  channelHandlers,
  onClose,
}: {
  url: string;
  copied: boolean;
  onCopy: () => void;
  manifest: StoryManifest;
  names: [string, string];
  channelHandlers: {
    email: () => void;
    messages: () => void;
    instagram: () => void | Promise<void>;
    download: () => void;
  };
  onClose: () => void;
}) {
  const channels: Array<[string, () => void | Promise<void>]> = [
    ['Email', channelHandlers.email],
    ['Messages', channelHandlers.messages],
    ['Instagram', channelHandlers.instagram],
    ['Download card', channelHandlers.download],
  ];
  return (
    <div style={{ padding: '30px 28px 24px', textAlign: 'center' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'var(--sage-tint, var(--pl-olive-mist, #E0DDC9))',
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
        You{'’'}re live! <span aria-hidden>🎉</span>
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
          {url}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="btn btn-primary btn-sm pl-pearl-accent"
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
              <Icon name="check" size={12} color="var(--cream, #F5EFE2)" /> Copied
            </>
          ) : (
            <>
              <Icon name="copy" size={12} color="var(--cream, #F5EFE2)" /> Copy
            </>
          )}
        </button>
      </div>

      <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line-soft, #E5DCC4)', marginBottom: 14 }}>
        <PubShareCard manifest={manifest} names={names} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {channels.map(([label, handler]) => (
          <button
            key={label}
            type="button"
            onClick={() => void handler()}
            className="btn btn-outline btn-sm"
            style={{
              flex: 1,
              justifyContent: 'center',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '9px 6px',
              borderRadius: 999,
              border: '1px solid var(--line, #D8CFB8)',
              background: 'transparent',
              color: 'var(--ink, #0E0D0B)',
              fontSize: 11.5,
              fontWeight: 600,
              fontFamily: 'var(--font-ui, var(--pl-font-body))',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
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

export default PublishModal;
