'use client';

/* ========================================================================
   PEARLOOM — MEMORY BOOK LANDING (the sidebar "Memory book" → /dashboard/keepsakes)

   Editorial port of the design-handoff dashboard "Memory" screen
   (ScreensMore.jsx · Memory): the keepsake weaving itself — a book
   hero with real cover + counts, a woven reel of the photos and notes
   guests have left, a "What's inside" chapter rail, and the anniversary
   rebroadcast card. Every figure and photo is REAL memory-book data
   (via /api/memory-book); nothing stock, honest empty states.

   The existing keepsake wiring — TwoTapThanks, ThankYouGenerator,
   AnniversaryPreview, and the occasion keepsake tools — is kept, folded
   into a "Keepsakes, drafted by Pear" section beneath the book.
   ======================================================================== */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ThankYouGenerator } from '../dash/ThankYouGenerator';
import { AnniversaryPreview } from '../dash/AnniversaryPreview';
import { TwoTapThanks } from '../dash/TwoTapThanks';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { getEventType } from '@/lib/event-os/event-types';
import { getKeepsakeTools, getRememberHeadline } from '@/lib/event-os/dashboard-presets';
import { crestTint } from '../dash/DashShell';
import { Icon, PearloomGlyph } from '../motifs';
import { Pearl } from '@/components/brand/Pearl';
import { PLChrome, PLCard } from '../dash/PLChrome';
import { PageIntro, RailCard } from '../dash/QuietDash';
import { COVER_FOCUS } from '@/lib/cover-crop';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

/* ── memory-book payload (subset we render) ─────────────────────── */
interface MemoryPayload {
  site: {
    domain: string;
    names?: string[];
    occasion?: string;
    date?: string | null;
    venue?: string | null;
    coverPhoto?: string | null;
    heroSlideshow?: string[];
  };
  chapters: Array<{ title: string; description?: string }>;
  chapterPhotos?: Array<{ url: string; caption: string }>;
  memories: Array<{ guest_name: string; response: string }>;
  whispers: Array<{ guest_name: string; body: string }>;
  capsule: Array<{ guest_name: string; body: string }>;
  songs: Array<{ song_title: string }>;
  tributes?: Array<{ guest_name: string; body: string }>;
  guestbook?: Array<{ guest_name: string; message: string }>;
  voiceToasts?: Array<{ guest_name: string }>;
}

type ReelItem =
  | { type: 'photo'; url: string; who: string }
  | { type: 'note'; text: string; who: string };

function monthYear(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

/* ── The book mockup — real cover, or an occasion-tinted paper tile
   (crestTint), never stock. ──────────────────────────────────────── */
function BookMock({
  coverPhoto,
  names,
  occasion,
  stamp,
}: {
  coverPhoto?: string | null;
  names: string;
  occasion?: string;
  stamp: string;
}) {
  const tint = crestTint(occasion);
  const letter = (names || 'P').trim().charAt(0).toUpperCase() || 'P';
  return (
    <div
      style={{
        width: 172,
        height: 210,
        borderRadius: '4px 10px 10px 4px',
        background: 'var(--card)',
        boxShadow: 'var(--shadow-lg, 0 18px 48px -20px rgba(40,28,12,0.4))',
        borderLeft: '6px solid var(--pl-gold, #C19A4B)',
        overflow: 'hidden',
        transform: 'rotate(-4deg)',
      }}
    >
      <div style={{ height: '62%', position: 'relative', background: tint.bg }}>
        {coverPhoto ? (

          <img
            src={coverPhoto}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: COVER_FOCUS, filter: 'saturate(1.05) sepia(0.05)' }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <span style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 500, fontSize: 40, color: tint.fg }}>{letter}</span>
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px', textAlign: 'center' }}>
        <div style={{ fontFamily: MONO, fontSize: 7.5, letterSpacing: '0.2em', color: 'var(--ink-muted)' }}>
          {stamp || 'A KEEPSAKE'}
        </div>
        <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 18, color: 'var(--ink)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {names || 'Our celebration'}
        </div>
      </div>
    </div>
  );
}

/* ── One keepsake tool (the occasion tools past thanks/anniversary) ─ */
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
    <PLCard style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 180 }}>
      <div style={{ background: bg, borderRadius: 12, padding: 12, fontSize: 12, color: 'var(--ink-soft)' }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
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
  const headline = getRememberHeadline(occasion);

  // Real memory-book aggregate — powers the hero counts + the woven
  // reel + the "What's inside" rail. Fails soft (auth/no-site → null →
  // honest empty state, never fabricated counts).
  const [data, setData] = useState<MemoryPayload | null>(null);
  // Reset the aggregate when the active site changes (render-time
  // adjustment, not a setState-in-effect) so a stale book never
  // lingers under a freshly-picked celebration.
  const siteId = site?.id ?? null;
  const [prevSiteId, setPrevSiteId] = useState(siteId);
  if (prevSiteId !== siteId) {
    setPrevSiteId(siteId);
    setData(null);
  }
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    fetch(`/api/memory-book?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d ?? null);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  // Hero identity — prefer the memory-book copy, fall back to the
  // selected-site summary so the book still names itself pre-auth.
  const names = (data?.site?.names ?? (site?.names ? site.names.filter(Boolean) : [])).join(' & ');
  const coverPhoto = data?.site?.coverPhoto ?? site?.coverPhoto ?? null;
  const stamp = monthYear(data?.site?.date ?? site?.eventDate ?? null);

  // Real counts.
  const photos = data?.chapterPhotos ?? [];
  const heroSlideshow = data?.site?.heroSlideshow ?? [];
  const notesRaw: ReelItem[] = [
    ...(data?.memories ?? []).map((m) => ({ type: 'note' as const, text: m.response, who: m.guest_name })),
    ...(data?.whispers ?? []).map((w) => ({ type: 'note' as const, text: w.body, who: w.guest_name })),
    ...(data?.tributes ?? []).map((t) => ({ type: 'note' as const, text: t.body, who: t.guest_name })),
    ...(data?.guestbook ?? []).map((g) => ({ type: 'note' as const, text: g.message, who: g.guest_name })),
  ].filter((n) => n.text && n.text.trim());

  const photoCount = photos.length + heroSlideshow.length + (coverPhoto ? 1 : 0);
  const noteCount = notesRaw.length;
  const signatureCount = (data?.guestbook?.length ?? 0) + (data?.voiceToasts?.length ?? 0);
  const chapters = data?.chapters ?? [];
  const bookEmpty = photos.length === 0 && noteCount === 0 && chapters.length === 0;

  const stats: Array<[number, string]> = [];
  if (photoCount > 0) stats.push([photoCount, photoCount === 1 ? 'photo' : 'photos']);
  if (noteCount > 0) stats.push([noteCount, noteCount === 1 ? 'note' : 'notes']);
  if (signatureCount > 0) stats.push([signatureCount, signatureCount === 1 ? 'signature' : 'signatures']);
  if ((data?.songs?.length ?? 0) > 0) stats.push([data!.songs.length, data!.songs.length === 1 ? 'song' : 'songs']);

  // Woven reel — interleave real photos + notes (roughly two photos
  // to a note, like the design's masonry). Capped so the landing
  // stays a teaser; "Open the book" is the full artifact.
  const reel: ReelItem[] = [];
  let pi = 0;
  let ni = 0;
  while ((pi < photos.length || ni < notesRaw.length) && reel.length < 15) {
    const wantNote = (reel.length % 3 === 2 || pi >= photos.length) && ni < notesRaw.length;
    if (wantNote) {
      reel.push(notesRaw[ni++]);
    } else if (pi < photos.length) {
      reel.push({ type: 'photo', url: photos[pi].url, who: photos[pi].caption || 'a guest' });
      pi++;
    } else if (ni < notesRaw.length) {
      reel.push(notesRaw[ni++]);
    }
  }
  const photoAspect = ['4 / 5', '1 / 1', '5 / 6', '4 / 5'];

  return (
    <PLChrome active="memory">
      <PageIntro
        eyebrow={headline.eyebrow}
        title={
          <>
            {headline.title} <span style={{ fontStyle: 'italic', color: 'var(--pl-gold)' }}>{headline.italic}</span>
          </>
        }
        actions={
          <>
            <Link href="/dashboard/memory-book" className="btn btn-pearl btn-sm" style={{ textDecoration: 'none' }}>
              Open the book <Pearl size={8} />
            </Link>
            <Link href="/dashboard/memory-book" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
              <Icon name="bookmark" size={13} /> Print at home
            </Link>
          </>
        }
      />

      {/* ── The memory-book hero — split card: story + counts on the
          left, the real book on the right. ──────────────────────── */}
      <PLCard
        noPadding
        style={{ overflow: 'hidden', marginBottom: 18 }}
      >
        <div className="pl8-mem-hero" style={{ display: 'grid', gridTemplateColumns: '1fr 340px' }}>
          <div style={{ padding: 'clamp(22px, 3vw, 32px)' }}>
            <div className="eyebrow" style={{ margin: 0, color: 'var(--peach-ink)' }}>The memory book</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 600, lineHeight: 1.1, color: 'var(--ink)', margin: '8px 0 10px' }}>
              A keepsake <span style={{ fontStyle: 'italic', color: 'var(--pl-gold)' }}>weaving itself</span>.
            </div>
            <p style={{ fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.55, maxWidth: 440, margin: '0 0 18px' }}>
              {headline.body} Every photo, signature, and note your guests leave threads into one book — it grows as more arrives.
            </p>
            {stats.length > 0 && (
              <div style={{ display: 'flex', gap: 26, marginBottom: 20, flexWrap: 'wrap' }}>
                {stats.map(([n, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: DISPLAY, fontSize: 28, color: 'var(--ink)', lineHeight: 1 }}>{n}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
            )}
            {bookEmpty && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginBottom: 18, fontStyle: 'italic', fontFamily: DISPLAY }}>
                Nothing woven in yet — as guests add photos and notes, they gather here.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/dashboard/memory-book" className="btn btn-pearl btn-sm" style={{ textDecoration: 'none' }}>
                Open the book <Pearl size={8} />
              </Link>
              <Link href="/dashboard/memory-book" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>
                Print at home
              </Link>
            </div>
          </div>
          <div
            className="pl8-mem-hero-art"
            style={{
              position: 'relative',
              minHeight: 240,
              background: 'linear-gradient(140deg, var(--lavender-bg), var(--cream-2))',
              display: 'grid',
              placeItems: 'center',
              borderLeft: '1px solid var(--line-soft)',
            }}
          >
            <BookMock coverPhoto={coverPhoto} names={names} occasion={occasion ?? undefined} stamp={stamp} />
          </div>
        </div>
      </PLCard>

      {/* ── Woven reel + what's-inside rail ─────────────────────────── */}
      <div
        className="pl8-mem-body"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 18, alignItems: 'flex-start' }}
      >
        <div>
          {reel.length > 0 ? (
            <div
              className="pl8-mem-reel"
              style={{ columnCount: 3, columnGap: 12 }}
            >
              {reel.map((item, i) =>
                item.type === 'photo' ? (
                  <div
                    key={`p${i}`}
                    style={{
                      breakInside: 'avoid',
                      marginBottom: 12,
                      borderRadius: 14,
                      overflow: 'hidden',
                      position: 'relative',
                      border: '1px solid var(--line)',
                      aspectRatio: photoAspect[i % photoAspect.length],
                    }}
                  >

                    <img
                      src={item.url}
                      alt=""
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: COVER_FOCUS, filter: 'saturate(1.04) sepia(0.05)' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 'auto 0 0 0',
                        padding: '16px 12px 9px',
                        background: 'linear-gradient(to top, rgba(24,24,27,0.66), transparent)',
                        color: 'var(--pl-cream, #F7F2E6)',
                        fontFamily: DISPLAY,
                        fontStyle: 'italic',
                        fontSize: 12.5,
                      }}
                    >
                      from {item.who}
                    </div>
                  </div>
                ) : (
                  <div
                    key={`n${i}`}
                    style={{
                      breakInside: 'avoid',
                      marginBottom: 12,
                      borderRadius: 14,
                      border: '1px solid var(--line)',
                      background: 'var(--cream-2)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <PearloomGlyph size={16} color="var(--pl-gold)" />
                    <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 16, lineHeight: 1.4, color: 'var(--ink)' }}>
                      {item.text.length > 180 ? `${item.text.slice(0, 180)}…` : item.text}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>— {item.who}</div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <PLCard style={{ textAlign: 'center', padding: '40px 24px' }}>
              <PearloomGlyph size={30} color="var(--pl-gold)" />
              <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 20, color: 'var(--ink)', margin: '12px 0 6px' }}>
                Nothing woven in yet.
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
                As guests leave photos, signatures, and notes on your site — and as you add story chapters in the
                editor — they gather here into the book.
              </div>
              {site?.domain && (
                <Link
                  href={`/editor/${encodeURIComponent(site.domain)}?focus=story`}
                  className="btn btn-outline btn-sm"
                  style={{ marginTop: 16 }}
                >
                  <Icon name="brush" size={12} /> Begin a chapter in the editor
                </Link>
              )}
            </PLCard>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 86 }}>
          <RailCard title="What's inside">
            {chapters.length > 0 ? (
              <div>
                {chapters.map((c, i) => (
                  <div
                    key={c.title + i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 0',
                      borderTop: i ? '1px solid var(--line-soft)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--ink)' }}>{c.title}</span>
                    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', color: 'var(--ink-muted)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.55 }}>
                No chapters yet. Add story chapters in the editor and they&rsquo;ll list here.
              </div>
            )}
          </RailCard>

          {showAnniversary && (
            <div
              style={{
                background: 'var(--peach-bg)',
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.16em', color: 'var(--peach-ink)', marginBottom: 8, textTransform: 'uppercase' }}>
                One year on
              </div>
              <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 16, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 12 }}>
                Pear rebroadcasts the whole day as a keepsake page on your anniversary.
              </div>
              <a href="#anniversary" className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                Preview this year
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Keepsakes, drafted by Pear — the kept wiring ────────────── */}
      <div style={{ marginTop: 30 }}>
        <div className="eyebrow" style={{ margin: '0 0 14px', color: 'var(--ink-muted)' }}>Keepsakes, drafted by Pear</div>

        {showThanks && (
          <div id="thanks" style={{ marginBottom: 18, scrollMarginTop: 90 }}>
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
          {showAnniversary && (
            <div id="anniversary" style={{ scrollMarginTop: 90 }}>
              <AnniversaryPreview />
            </div>
          )}
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

      <style jsx global>{`
        @media (max-width: 860px) {
          .pl8-mem-hero {
            grid-template-columns: 1fr !important;
          }
          .pl8-mem-hero-art {
            border-left: none !important;
            border-top: 1px solid var(--line-soft) !important;
            min-height: 200px !important;
          }
          .pl8-mem-body {
            grid-template-columns: 1fr !important;
          }
          .pl8-mem-reel {
            column-count: 2 !important;
          }
        }
        @media (max-width: 480px) {
          .pl8-mem-reel {
            column-count: 1 !important;
          }
        }
      `}</style>
    </PLChrome>
  );
}
