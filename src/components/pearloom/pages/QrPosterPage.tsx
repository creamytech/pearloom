'use client';

// QrPosterPage — single printable poster of the site's URL as a
// big QR code. Print as A4 portrait and prop it on the welcome
// table so guests scan-to-open the site without typing a link.
//
// Different from PassportCardsPage: that's per-guest invite
// cards. This is a single tabletop poster with the site URL.

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { DashLayout } from '../dash/DashShell';
import { PageIntro, HintChip } from '../dash/QuietDash';
import { Icon } from '../motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { parseLocalDate } from '@/lib/date-utils';
import { buildSiteUrl, formatSiteDisplayUrl } from '@/lib/site-urls';
import { getEventType } from '@/lib/event-os/event-types';
import { QR_THEMES, suggestThemesForOccasion, type QrThemeId } from '@/lib/qr-engine/themes';
import { startDecorJob, completeDecorJob } from '@/lib/decor-bus';
import { DecorGenerationToast } from '../editor/DecorGenerationToast';
import { PearThinking } from '../pear-thinking';

// ── Async poster polling ─────────────────────────────────
// /api/qr/poster now schedules the painter via Next's after()
// and returns a jobId. We poll until the row flips to complete.
async function pollQrPosterJob(jobId: string): Promise<{ url: string | null; qrDark: string | null; qrLight: string | null }> {
  const startedAt = Date.now();
  const ceilingMs = 240_000;
  const intervalMs = 2_000;
  let consecutiveErrors = 0;
  while (Date.now() - startedAt < ceilingMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    let res: Response;
    try {
      res = await fetch(`/api/qr/poster/${encodeURIComponent(jobId)}`, { cache: 'no-store' });
    } catch {
      consecutiveErrors += 1;
      if (consecutiveErrors >= 3) throw new Error('Lost connection to Pear. Try again.');
      continue;
    }
    consecutiveErrors = 0;
    if (!res.ok) {
      if (res.status === 404) throw new Error('Pear lost the canvas. Try again.');
      continue;
    }
    const data = (await res.json()) as { status?: string; url?: string; qrDark?: string; qrLight?: string; error?: string };
    if (data.status === 'complete' && data.url) {
      return { url: data.url, qrDark: data.qrDark ?? null, qrLight: data.qrLight ?? null };
    }
    if (data.status === 'failed') {
      throw new Error(data.error ?? 'Pear couldn\'t finish that one.');
    }
  }
  throw new Error('Pear is still painting — check back in a minute or try again.');
}

// The tabletop hint names the site — derive it from the occasion so
// a memorial poster never reads "our wedding site".
function siteHintFor(occasion?: string | null): string {
  if (getEventType(occasion)?.voice === 'solemn') return 'the memorial site';
  if (occasion === 'wedding') return 'our wedding site';
  return 'our celebration site';
}

function copyPresetsFor(siteHint: string): Array<{ id: string; label: string; kicker: string; hint: string }> {
  return [
    { id: 'tabletop', label: 'Welcome table', kicker: 'Scan to open', hint: siteHint },
    { id: 'rsvp', label: 'RSVP reminder', kicker: 'Scan to RSVP', hint: 'kindly reply by the deadline inside' },
    { id: 'photos', label: 'Live photo wall', kicker: 'Scan to share photos', hint: 'add yours to the wall' },
    { id: 'menu', label: 'Dinner menu', kicker: 'Scan to see the menu', hint: 'allergens + dietary tags inside' },
  ];
}

// ── Print-size presets (Suite Phase 5) ───────────────────
// The AI route paints one fixed portrait artwork (1024×1536, no
// size param — see /api/qr/poster); sizing is purely client-side:
// the poster surface's aspect / padding / type scale / QR pixel
// size and the @page rule all follow the preset. The themed
// background `cover`-crops into whichever aspect is picked.
type PosterSizeId = 'a4' | 'tent57' | 'sticker3';
interface PosterSizePreset {
  id: PosterSizeId;
  label: string;
  /** CSS aspect-ratio of the on-screen poster surface. */
  aspect: string;
  /** @page size for printing. */
  page: string;
  /** Screen max-width of the preview surface. */
  maxWidth: number;
  /** Poster padding. */
  pad: string;
  /** QR pixel size — classic mode / themed-overlay mode. */
  qr: number;
  qrThemed: number;
  /** Display headline clamp. */
  headlineSize: string;
  /** Page margin when printing. */
  printPad: string;
  /** Compact: sticker drops the big header + hint, keeps kicker + URL. */
  compact: boolean;
}
const POSTER_SIZES: PosterSizePreset[] = [
  {
    id: 'a4', label: 'Welcome sign A4',
    aspect: '1 / 1.414', page: 'A4 portrait', maxWidth: 720,
    pad: 'clamp(32px, 9vw, 64px) clamp(22px, 8vw, 56px) clamp(22px, 8vw, 56px)', qr: 320, qrThemed: 280,
    headlineSize: 'clamp(34px, 4.6vw, 52px)', printPad: '14mm', compact: false,
  },
  {
    id: 'tent57', label: 'Table tent 5×7',
    aspect: '5 / 7', page: '5in 7in', maxWidth: 520,
    pad: 'clamp(26px, 7vw, 44px) clamp(20px, 6vw, 38px) clamp(20px, 6vw, 38px)', qr: 250, qrThemed: 220,
    headlineSize: 'clamp(26px, 3.4vw, 38px)', printPad: '9mm', compact: false,
  },
  {
    id: 'sticker3', label: 'Sticker 3×3',
    aspect: '1 / 1', page: '3in 3in', maxWidth: 380,
    pad: '28px 24px 24px', qr: 220, qrThemed: 210,
    headlineSize: 'clamp(20px, 2.6vw, 28px)', printPad: '4mm', compact: true,
  },
];

export function QrPosterPage() {
  const { site } = useSelectedSite();
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [presetId, setPresetId] = useState<string>('tabletop');
  const [posterSizeId, setPosterSizeId] = useState<PosterSizeId>('a4');
  const [headline, setHeadline] = useState<string>('');
  const [subhead, setSubhead] = useState<string>('');
  // Themed-mode state — when active, the AI poster fills the
  // whole printable area and the QR overlays at center.
  const [posterMode, setPosterMode] = useState<'classic' | 'themed'>('classic');
  const [themeId, setThemeId] = useState<QrThemeId>('floral-garden');
  const [themedPosterUrl, setThemedPosterUrl] = useState<string | null>(null);
  const [themedQrColors, setThemedQrColors] = useState<{ dark: string; light: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const occasion = site?.occasion;
  const suggestedThemes = useMemo(() => suggestThemesForOccasion(occasion), [occasion]);

  const siteHint = siteHintFor(occasion);
  const copyPresets = useMemo(() => copyPresetsFor(siteHintFor(occasion)), [occasion]);
  const preset = copyPresets.find((p) => p.id === presetId) ?? copyPresets[0];
  const sizePreset = POSTER_SIZES.find((s) => s.id === posterSizeId) ?? POSTER_SIZES[0];

  const targetUrl = useMemo(() => {
    if (!site?.domain) return '';
    const path = presetId === 'rsvp' ? '/rsvp' : presetId === 'photos' ? '/upload' : '';
    return buildSiteUrl(site.domain, path, undefined, site.occasion);
  }, [site?.domain, site?.occasion, presetId]);

  const displayHost = useMemo(() => {
    if (!site?.domain) return '';
    const path = presetId === 'rsvp' ? '/rsvp' : presetId === 'photos' ? '/upload' : '';
    return formatSiteDisplayUrl(site.domain, path, site.occasion);
  }, [site?.domain, site?.occasion, presetId]);

  useEffect(() => {
    if (!targetUrl) {
      setQrUrl(null);
      return;
    }
    let cancelled = false;
    // In themed mode, match QR module colours to the theme's
    // declared dark/light so the overlay reads as part of the
    // poster rather than an alien sticker. Classic mode keeps
    // ink + transparent for max paper-feel.
    const colors = posterMode === 'themed' && themedQrColors
      ? { dark: themedQrColors.dark, light: themedQrColors.light }
      : { dark: '#0E0D0B', light: '#00000000' };
    QRCode.toDataURL(targetUrl, {
      margin: 0,
      width: 1200,
      errorCorrectionLevel: 'H',
      color: colors,
    })
      .then((url) => {
        if (!cancelled) setQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [targetUrl, posterMode, themedQrColors]);

  async function generateThemed() {
    if (!site?.domain) return;
    setGenerating(true);
    setGenerationError(null);
    const jobId = startDecorJob('qr-poster', `Painting ${themeId.replace(/-/g, ' ')} poster`);
    try {
      const dateObj = parseLocalDate(site?.eventDate);
      const dateLabel = dateObj
        ? dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '';
      const namesStr = (site.names ?? []).filter(Boolean).join(' & ') || 'Our celebration';
      const kicker = (headline.trim() || preset?.kicker || 'Scan to open');
      const res = await fetch('/api/qr/poster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId,
          names: namesStr,
          dateLabel,
          kicker,
          siteSlug: site.domain,
        }),
      });
      // Defensive parse — gateway timeouts return plain text that
      // would crash JSON.parse with "Unexpected token A".
      const raw = await res.text();
      let data: { ok?: boolean; url?: string; jobId?: string; async?: boolean; qrDark?: string; qrLight?: string; error?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; }
      catch {
        if (res.status === 504 || /An error occurred/i.test(raw)) {
          throw new Error('Pear timed out before the painter finished. Try a different theme or run it again.');
        }
        throw new Error(`Painter responded with non-JSON (${res.status}). Try again in a minute.`);
      }
      if (!res.ok) throw new Error(data.error || `Render failed (${res.status})`);

      // Async path — kickoff returned a jobId. Poll until done.
      // QR posters use the same render_jobs table as invites.
      let finalUrl = data.url ?? null;
      let finalDark = data.qrDark ?? null;
      let finalLight = data.qrLight ?? null;
      if (data.async && data.jobId) {
        const polled = await pollQrPosterJob(data.jobId);
        finalUrl = polled.url;
        finalDark = polled.qrDark ?? finalDark;
        finalLight = polled.qrLight ?? finalLight;
      }
      if (!finalUrl) throw new Error('Pear returned no poster URL.');
      setThemedPosterUrl(finalUrl);
      setThemedQrColors({ dark: finalDark || '#0E0D0B', light: finalLight || '#FBF7EE' });
      completeDecorJob(jobId, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Render failed.';
      setGenerationError(msg);
      completeDecorJob(jobId, false, msg);
    } finally {
      setGenerating(false);
    }
  }

  const names = (site?.names ?? []).filter(Boolean).join(' & ') || 'Our celebration';
  const renderedDate = parseLocalDate(site?.eventDate);
  const dateLabel = renderedDate
    ? renderedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const finalKicker = headline.trim() || preset?.kicker || 'Scan to open';
  const finalHint = subhead.trim() || preset?.hint || siteHint;

  function print() {
    if (typeof window !== 'undefined') window.print();
  }

  return (
    <DashLayout active="qr-poster" hideTopbar>
      <div style={{ padding: '20px clamp(20px, 4vw, 40px) 32px', maxWidth: 1240, margin: '0 auto' }}>
        {/* Quiet header (DASHBOARD-LAYOUT-PLAN rule 1): one line +
            the print action; the pitch paragraph became a HintChip. */}
        <div className="pl8-no-print">
          <PageIntro
            eyebrow="Print"
            title="QR poster"
            actions={
              <button type="button" className="btn btn-primary" onClick={print} disabled={!qrUrl}>
                <Icon name="sparkles" size={14} /> Print / save as PDF
              </button>
            }
            meta={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                  {site?.domain ? <>Linking to <strong style={{ color: 'var(--ink)' }}>{displayHost}</strong></> : 'No site selected'}
                </span>
                <HintChip
                  storageKey="pl-hint-qr-poster"
                  hint="Guests scan the poster to open the site — no typing."
                  detail="A printable scan-to-site poster — drop it on the welcome table, the bar, or by the RSVP card so guests open the site without typing a link. Pick a size, a copy preset, and (optionally) let Pear paint a themed background."
                />
              </div>
            }
          />
        </div>

        {/* Poster leads; controls ride the right rail on desktop and
            stack BELOW the preview on phones (plan rules 2 + 7). */}
        <div
          className="pl8-qr-layout"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'start' }}
        >
        {/* Controls rail — hidden when printing. Placed AFTER the
            poster visually: column 2 on desktop, below it on phones
            (grid-row rules in the styled-jsx block). */}
        {/* Sticky (plan-2 §2 qr-poster): the ~620px control stack
            rides along the 1290px poster instead of leaving ~670px
            of dead rail. The phone stack (grid-row rules) is
            unaffected — sticky is inert in a single column. */}
        <div className="pl8-no-print pl8-qr-controls" style={{ display: 'grid', gap: 14, alignContent: 'start', minWidth: 0, position: 'sticky', top: 16 }}>
          {/* Mode toggle: classic editorial vs AI-themed */}
          <div style={{ display: 'flex', padding: 3, background: 'var(--cream-2)', borderRadius: 10, gap: 2, alignSelf: 'flex-start' }}>
            {(
              [
                { v: 'classic' as const, l: 'Classic editorial' },
                { v: 'themed' as const, l: 'AI themed' },
              ]
            ).map((o) => {
              const on = posterMode === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setPosterMode(o.v)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: on ? 'var(--ink)' : 'transparent',
                    color: on ? 'var(--cream)' : 'var(--ink)',
                    border: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {o.l}
                </button>
              );
            })}
          </div>

          {/* Print-size presets — pure client-side layout scaling;
              the @page rule below follows the pick. */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: 'var(--ink-muted)',
            }}>
              Size
            </span>
            {POSTER_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setPosterSizeId(s.id)}
                aria-pressed={s.id === posterSizeId}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1.5px solid ${s.id === posterSizeId ? 'var(--peach-ink)' : 'var(--line)'}`,
                  background: s.id === posterSizeId ? 'var(--peach-bg, #FCEAD6)' : 'var(--cream-2)',
                  color: s.id === posterSizeId ? 'var(--peach-ink)' : 'var(--ink-soft)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {copyPresets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                aria-pressed={p.id === presetId}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1.5px solid ${p.id === presetId ? 'var(--peach-ink)' : 'var(--line)'}`,
                  background: p.id === presetId ? 'var(--peach-bg, #FCEAD6)' : 'var(--cream-2)',
                  color: p.id === presetId ? 'var(--peach-ink)' : 'var(--ink-soft)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 10, maxWidth: 720 }}>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder={preset?.kicker ?? 'Scan to open'}
              style={poseInput}
            />
            <input
              type="text"
              value={subhead}
              onChange={(e) => setSubhead(e.target.value)}
              placeholder={preset?.hint ?? siteHint}
              style={poseInput}
            />
          </div>

          {/* AI theme picker + Paint button — only visible in themed mode */}
          {posterMode === 'themed' && (
            <div className="pl8-tab-enter" style={{
              padding: 16,
              background: 'var(--cream-2)',
              border: '1px solid var(--line-soft)',
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <div className="eyebrow" style={{ color: 'var(--peach-ink)' }}>
                Pick a world for Pear to paint
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 8 }}>
                {suggestedThemes.map((t) => {
                  const on = themeId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setThemeId(t.id)}
                      className="pl8-card-lift"
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: on ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
                        background: on ? 'var(--cream)' : 'var(--paper)',
                        color: 'var(--ink)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span aria-hidden style={{
                          width: 10, height: 10, borderRadius: 999,
                          background: on ? 'var(--peach-ink)' : 'transparent',
                          border: on ? 'none' : '1.5px solid var(--line)',
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{t.label}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 4, marginLeft: 18 }}>
                        {t.blurb}
                      </div>
                    </button>
                  );
                })}
                {suggestedThemes.length < QR_THEMES.length && (
                  <button
                    type="button"
                    onClick={() => {
                      // Cycle to a non-suggested theme so the host can browse all.
                      const remaining = QR_THEMES.filter((t) => !suggestedThemes.some((s) => s.id === t.id));
                      if (remaining[0]) setThemeId(remaining[0].id);
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1.5px dashed var(--line)',
                      background: 'transparent',
                      color: 'var(--ink-soft)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 12.5,
                      fontWeight: 600,
                    }}
                  >
                    + browse all themes
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => void generateThemed()}
                  disabled={generating || !site?.domain}
                  className="pl-pearl-accent"
                  style={{
                    padding: '10px 18px',
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: generating ? 'wait' : 'pointer',
                    border: 'none',
                    fontFamily: 'inherit',
                    opacity: generating ? 0.7 : 1,
                  }}
                >
                  {generating ? (
                    <PearThinking active label="painting" size="sm" hideAvatar />
                  ) : themedPosterUrl ? (
                    'Paint another'
                  ) : (
                    'Paint with Pear'
                  )}
                </button>
                {themedPosterUrl && !generating && (
                  <button
                    type="button"
                    onClick={() => { setThemedPosterUrl(null); setThemedQrColors(null); }}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 600,
                      background: 'transparent',
                      color: 'var(--ink-soft)',
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Clear background
                  </button>
                )}
                <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
                  Pear paints in ~30 seconds. The QR code overlays automatically.
                </span>
              </div>
              {generationError && (
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(122,45,45,0.08)',
                  color: '#7A2D2D',
                  borderRadius: 8,
                  fontSize: 12,
                }}>
                  {generationError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Poster — printable. In themed mode + when a themed poster
            URL is set, the AI painting fills the entire surface and
            the QR is composited at center. */}
        <div className="pl8-qr-main" style={{ minWidth: 0 }}>
        <div
          className="pl8-qr-poster"
          style={{
            background: posterMode === 'themed' && themedPosterUrl
              ? `#FFFFFF url(${themedPosterUrl}) center / cover no-repeat`
              : 'var(--paper, #F8F2E0)',
            border: posterMode === 'themed' && themedPosterUrl ? 'none' : '1px solid var(--line)',
            borderRadius: 6,
            padding: sizePreset.pad,
            margin: '0 auto',
            maxWidth: sizePreset.maxWidth,
            aspectRatio: sizePreset.aspect,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: posterMode === 'themed' && themedPosterUrl ? 'center' : 'space-between',
            boxShadow: '0 24px 60px rgba(61,74,31,0.10)',
            color: 'var(--ink, #18181B)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Classic-only editorial chrome — corner threads */}
          {!(posterMode === 'themed' && themedPosterUrl) && (
            <>
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  top: 24,
                  left: 24,
                  right: 24,
                  borderTop: '1.5px solid var(--peach-ink, #C6703D)',
                }}
              />
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  bottom: 24,
                  left: 24,
                  right: 24,
                  borderBottom: '1.5px solid var(--peach-ink, #C6703D)',
                }}
              />
            </>
          )}

          {/* Header — only visible in classic mode (themed mode already
              has names/date painted INTO the AI background). The
              sticker preset goes compact: kicker only, no big names
              block — the QR is the whole point at 3×3. */}
          {!(posterMode === 'themed' && themedPosterUrl) && (
            <div style={{ textAlign: 'center', maxWidth: '92%' }}>
              <div
                style={{
                  fontSize: sizePreset.compact ? 10 : 12,
                  fontWeight: 700,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'var(--peach-ink)',
                  marginBottom: sizePreset.compact ? 0 : 18,
                }}
              >
                {finalKicker}
              </div>
              {!sizePreset.compact && (
                <>
                  <div
                    className="display"
                    style={{ fontSize: sizePreset.headlineSize, lineHeight: 1.05, margin: 0, fontFamily: 'var(--font-display, Georgia, serif)' }}
                  >
                    {names}
                  </div>
                  {dateLabel && (
                    <div style={{ marginTop: 14, fontSize: 17, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
                      {dateLabel}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* QR — bordered card in classic mode; floating overlay
              centered in themed mode (it sits on the AI background's
              "blank centre area" the prompt reserved). */}
          <div
            style={{
              padding: posterMode === 'themed' && themedPosterUrl ? 0 : sizePreset.compact ? 12 : 22,
              background: posterMode === 'themed' && themedPosterUrl
                ? 'transparent'
                : 'var(--cream-2, #FBF7EE)',
              border: posterMode === 'themed' && themedPosterUrl
                ? 'none'
                : '1px solid var(--line)',
              borderRadius: 12,
            }}
          >
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR code linking to your site"
                style={{
                  // Cap at the preset size, but never wider than the
                  // poster surface — at 390px the A4 preview's inner
                  // width is smaller than the 320px QR, which used to
                  // clip the code off the paper.
                  width: posterMode === 'themed' && themedPosterUrl ? sizePreset.qrThemed : sizePreset.qr,
                  maxWidth: '100%',
                  height: 'auto',
                  aspectRatio: '1 / 1',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: sizePreset.qr,
                  maxWidth: '100%',
                  aspectRatio: '1 / 1',
                  background: 'var(--cream)',
                  border: '1px dashed var(--line)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 14,
                  color: 'var(--ink-muted)',
                }}
              >
                Threading QR…
              </div>
            )}
          </div>

          {/* Footer — classic only. Sticker keeps just the URL line. */}
          {!(posterMode === 'themed' && themedPosterUrl) && (
            <div style={{ textAlign: 'center', maxWidth: '92%' }}>
              {!sizePreset.compact && (
                <div style={{ fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>
                  {finalHint}
                </div>
              )}
              <div
                style={{
                  fontSize: sizePreset.compact ? 11 : 13,
                  fontFamily: 'var(--font-ui, ui-monospace, monospace)',
                  color: 'var(--ink-muted)',
                  letterSpacing: '0.04em',
                }}
              >
                {displayHost}
              </div>
            </div>
          )}
        </div>
        </div>
        </div>
      </div>
      {/* Painting toast — same bottom-right pill the InviteDesigner uses. */}
      <DecorGenerationToast />

      {/* Layout rules — poster column first (reading order), controls
          in the right rail on desktop, stacked below on phones. */}
      <style jsx global>{`
        .pl8-qr-main {
          grid-column: 1;
          grid-row: 1;
        }
        .pl8-qr-controls {
          grid-column: 2;
          grid-row: 1;
        }
        @media (max-width: 980px) {
          .pl8-qr-layout {
            grid-template-columns: 1fr !important;
          }
          .pl8-qr-main {
            grid-column: 1;
            grid-row: 1;
          }
          .pl8-qr-controls {
            grid-column: 1;
            grid-row: 2;
          }
        }
      `}</style>

      {/* Print rules — single page, no chrome */}
      <style jsx global>{`
        @media print {
          body { background: #fff !important; }
          .pl8-no-print { display: none !important; }
          .pl8-qr-poster {
            box-shadow: none !important;
            border: none !important;
            background: #FFF !important;
            border-radius: 0 !important;
            margin: 0 !important;
            max-width: none !important;
            width: 100vw !important;
            height: 100vh !important;
            aspect-ratio: auto !important;
            padding: ${sizePreset.printPad} !important;
            page-break-after: always;
          }
          .pl8-dashshell, .pl8-dashshell aside, .pl8-dashshell header { display: none !important; }
          .pl8-dashshell main { padding: 0 !important; }
          @page { margin: 0; size: ${sizePreset.page}; }
        }
      `}</style>
    </DashLayout>
  );
}

const poseInput: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--line)',
  background: 'var(--cream-2)',
  fontSize: 13,
  color: 'var(--ink)',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};
