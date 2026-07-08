'use client';

/* ========================================================================
   PEARLOOM — MEMORY BOOK (printable keepsake)

   Editorial port matching ClaudeDesign/pages/memory-redesign.jsx feel:
   paper-textured background, chaptered layout, hairline gold rules
   between chapters, photo + guest text pairings, and a clear
   "Print / save as PDF" + "Order printed book" CTA pair.

   Aggregates every chapter, memory response, whisper, revealed
   time-capsule note, accepted playlist song, tribute submission and
   guestbook signature into a long-form letterpress-ready layout.
   Mounted under PLChrome — sibling to KeepsakesPage under the Memory
   nav node so the two pages feel like halves of the same artifact.
   ======================================================================== */

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { Icon } from '../motifs';
import { PLChrome } from '../dash/PLChrome';
import { PageIntro } from '../dash/QuietDash';
import { getRememberHeadline, occasionLabel } from '@/lib/event-os/dashboard-presets';

type Chapter = { id?: string; title: string; subtitle?: string; description: string };
type Memory = { guest_name: string; prompt: string; response: string };
type Whisper = { guest_name: string; body: string };
type Capsule = { guest_name: string; body: string; reveal_years: number; reveal_on: string };
type Song = { guest_name: string; song_title: string; artist?: string | null; spotify_url?: string | null };
type Tribute = { guest_name: string; body: string; block_id?: string };
type GuestbookEntry = { guest_name: string; message: string };
type VoiceToast = { guest_name: string; duration_seconds?: number | null; created_at?: string | null };

interface Payload {
  site: {
    domain: string;
    names?: string[];
    occasion?: string;
    date?: string | null;
    venue?: string | null;
    coverPhoto?: string | null;
    heroSlideshow?: string[];
  };
  chapters: Chapter[];
  chapterPhotos?: Array<{ url: string; caption: string }>;
  memories: Memory[];
  whispers: Whisper[];
  capsule: Capsule[];
  songs: Song[];
  tributes?: Tribute[];
  guestbook?: GuestbookEntry[];
  voiceToasts?: VoiceToast[];
}

function fmtToastDuration(s?: number | null) {
  if (!s || !Number.isFinite(s) || s <= 0) return '';
  const m = Math.floor(s / 60);
  const ss = Math.round(s % 60).toString().padStart(2, '0');
  return `${m}:${ss}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/* ─────────────────────────────────────────────────────────────────
   ChapterRule — hairline gold rule with a centered glyph. Used
   between chapters + before each major section. Matches the
   heirloom feel from the prototype. ───────────────────────────── */
function ChapterRule({ glyph = '✦' }: { glyph?: string }) {
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        margin: '40px 0',
      }}
    >
      <span
        style={{
          flex: 1,
          height: 1,
          background:
            'linear-gradient(90deg, transparent 0%, var(--gold, #D4A95D) 30%, var(--gold, #D4A95D) 70%, transparent 100%)',
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          color: 'var(--gold, #D4A95D)',
          letterSpacing: '0.2em',
        }}
      >
        {glyph}
      </span>
      <span
        style={{
          flex: 1,
          height: 1,
          background:
            'linear-gradient(90deg, transparent 0%, var(--gold, #D4A95D) 30%, var(--gold, #D4A95D) 70%, transparent 100%)',
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   SectionHead — kicker + display title + optional subtitle, with
   the prototype's centered editorial framing. ─────────────────── */
function SectionHead({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <header style={{ textAlign: 'center', marginBottom: 28, breakInside: 'avoid' }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--peach-ink)',
          marginBottom: 8,
        }}
      >
        {kicker}
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 30,
          fontWeight: 600,
          margin: 0,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
        }}
      >
        {title}
      </h2>
      {sub && (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 6, fontStyle: 'italic' }}>
          {sub}
        </div>
      )}
    </header>
  );
}

/* ─────────────────────────────────────────────────────────────────
   GuestEntry — a paired guest+text block. Used by memories,
   whispers, tributes, guestbook. Optional photo lays a 4/5 image
   next to the words. ──────────────────────────────────────────── */
function GuestEntry({
  guestName,
  body,
  prompt,
  photoUrl,
  italic = false,
  meta,
}: {
  guestName: string;
  body: string;
  prompt?: string;
  photoUrl?: string | null;
  italic?: boolean;
  meta?: string;
}) {
  const wordsStyle: CSSProperties = {
    fontSize: 15,
    lineHeight: 1.65,
    margin: 0,
    fontStyle: italic ? 'italic' : 'normal',
    color: 'var(--ink)',
  };
  const inner = (
    <>
      {prompt && (
        <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 6 }}>
          {prompt}
        </div>
      )}
      <p style={wordsStyle}>{italic ? `“${body}”` : body}</p>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 18,
            height: 1,
            background: 'var(--gold, #D4A95D)',
            opacity: 0.7,
          }}
        />
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.04em' }}>
          {guestName}
          {meta && <span style={{ fontWeight: 500, color: 'var(--ink-muted)' }}> · {meta}</span>}
        </div>
      </div>
    </>
  );

  if (photoUrl) {
    return (
      <div
        className="pl8-mb-entry"
        style={{
          display: 'grid',
          gridTemplateColumns: '160px minmax(0, 1fr)',
          gap: 22,
          alignItems: 'start',
          marginBottom: 28,
          breakInside: 'avoid',
        }}
      >
        <img
          src={photoUrl}
          alt={guestName}
          style={{
            width: '100%',
            aspectRatio: '4 / 5',
            objectFit: 'cover',
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(61,74,31,0.15)',
          }}
        />
        <div>{inner}</div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 24, breakInside: 'avoid' }}>{inner}</div>
  );
}

export function MemoryBookPage() {
  const { site } = useSelectedSite();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!site?.id) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/memory-book?siteId=${encodeURIComponent(site.id)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [site?.id]);

  function print() {
    if (typeof window !== 'undefined') window.print();
  }

  const names = data?.site?.names?.filter(Boolean).join(' & ') ?? '';
  // Human occasion label (not the raw hyphenated id) + venue.
  const subtitle = data?.site
    ? `${data.site.occasion ? occasionLabel(data.site.occasion) : 'Celebration'}${data.site.venue ? ` · ${data.site.venue}` : ''}`
    : '';
  // Occasion-aware headline — a memorial gets "A lasting keepsake",
  // a reunion "The yearbook", etc., instead of the wedding default.
  const headline = getRememberHeadline(data?.site?.occasion);

  // Pair photos with memories where available — first N memories get
  // photo accompaniment, rest run as text-only. Keeps the visual
  // rhythm without forcing a 1:1 image:entry match.
  const photos = data?.chapterPhotos ?? [];

  // Section counts for the print-aware "Edition" front-matter line.
  const counts = {
    chapters: data?.chapters?.length ?? 0,
    memories: data?.memories?.length ?? 0,
    whispers: data?.whispers?.length ?? 0,
    capsule: data?.capsule?.length ?? 0,
    tributes: data?.tributes?.length ?? 0,
    guestbook: data?.guestbook?.length ?? 0,
    songs: data?.songs?.length ?? 0,
    voices: data?.voiceToasts?.length ?? 0,
  };
  const totalEntries =
    counts.memories + counts.whispers + counts.capsule + counts.tributes + counts.guestbook;
  // Nothing to bind yet — show an occasion-aware empty state instead
  // of a blank "0 entries" book (it read wedding-shaped + bare for
  // birthdays, reunions, memorials with no collected memories yet).
  const bookEmpty =
    totalEntries === 0 &&
    counts.chapters === 0 &&
    (photos?.length ?? 0) === 0 &&
    counts.songs === 0 &&
    counts.voices === 0;
  const occLabel = data?.site?.occasion ? occasionLabel(data.site.occasion) : 'celebration';

  return (
    <PLChrome active="memory">
      {/* Quiet header (DASHBOARD-LAYOUT-PLAN rule 1): one line +
          the two actions. The book's own frontispiece + empty state
          carry the prose; the sub paragraph is gone. */}
      <div className="pl8-no-print">
        <PageIntro
          eyebrow="The memory book"
          title={
            <>
              {headline.title} <span className="display-italic">{headline.italic}</span>
            </>
          }
          actions={
            <>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={print}
              >
                <Icon name="sparkles" size={13} /> Print or save as PDF
              </button>
            </>
          }
        />
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: '60px 0' }}>
          Loading…
        </div>
      ) : !data ? (
        <div style={{ color: 'var(--ink-soft)', textAlign: 'center', padding: '60px 0' }}>
          <div style={{ marginBottom: 12 }}>Pick a site first.</div>
          <Link href="/dashboard/event" className="btn btn-outline btn-sm">
            Choose a celebration →
          </Link>
        </div>
      ) : (
        <article
          className="pl8-memory-book"
          style={{
            background: 'var(--cream-2, #FBF7EE)',
            backgroundImage:
              'radial-gradient(circle at 20% 18%, rgba(184, 147, 90, 0.04) 0%, transparent 60%), radial-gradient(circle at 78% 82%, rgba(92, 107, 63, 0.04) 0%, transparent 60%)',
            padding: 'clamp(32px, 8vw, 72px) clamp(18px, 7vw, 64px)',
            borderRadius: 6,
            border: '1px solid var(--line-soft)',
            boxShadow: '0 8px 32px rgba(61, 74, 31, 0.08), 0 1px 3px rgba(61, 74, 31, 0.05)',
            fontFamily: 'var(--font-body)',
            color: 'var(--ink)',
            lineHeight: 1.65,
            maxWidth: 840,
            margin: '0 auto',
          }}
        >
          {/* Frontispiece — cover */}
          <header
            style={{
              textAlign: 'center',
              padding: '20px 0 56px',
              borderBottom: '1px solid var(--line-soft)',
              marginBottom: 48,
              breakInside: 'avoid',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--peach-ink)',
                marginBottom: 22,
                fontWeight: 600,
              }}
            >
              The memory book
            </div>
            {data.site.coverPhoto && (
              <img
                src={data.site.coverPhoto}
                alt={names}
                style={{
                  width: 220,
                  height: 220,
                  objectFit: 'cover',
                  borderRadius: '50%',
                  margin: '0 auto 28px',
                  display: 'block',
                  border: '1px solid var(--gold, #D4A95D)',
                  boxShadow: '0 2px 8px rgba(61,74,31,0.12)',
                }}
              />
            )}
            <h1
              className="display"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 60,
                margin: '0 0 14px',
                letterSpacing: '-0.02em',
                fontWeight: 600,
                lineHeight: 1.05,
              }}
            >
              {names || 'Our celebration'}
            </h1>
            <div
              style={{
                fontSize: 13.5,
                color: 'var(--ink-soft)',
                fontStyle: 'italic',
                letterSpacing: '0.04em',
              }}
            >
              {subtitle}
              {data.site.date ? ` · ${fmtDate(data.site.date)}` : ''}
            </div>
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: 60,
                  height: 1,
                  background: 'var(--gold, #D4A95D)',
                  opacity: 0.6,
                }}
              />
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 11,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
              }}
            >
              {counts.chapters} chapter{counts.chapters === 1 ? '' : 's'} ·{' '}
              {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} ·{' '}
              {counts.songs} song{counts.songs === 1 ? '' : 's'}
            </div>
          </header>

          {/* Occasion-aware empty state — nothing collected yet. */}
          {bookEmpty && (
            <div style={{ textAlign: 'center', padding: '24px 0 8px', maxWidth: 520, margin: '0 auto' }}>
              <ChapterRule glyph="✦" />
              <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--ink-soft)', fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>
                Nothing woven in yet.
              </p>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--ink-muted)', marginTop: 8 }}>
                As guests leave notes, photos, and memories on your {occLabel.toLowerCase()} site —
                and as you add story chapters in the editor — they gather here into a printable
                keepsake.
              </p>
              {site?.domain && (
                <div className="pl8-no-print" style={{ marginTop: 16 }}>
                  <Link href={`/editor/${encodeURIComponent(site.domain)}?focus=story`} className="btn btn-outline btn-sm">
                    <Icon name="brush" size={12} /> Begin a chapter in the editor
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* The story so far — chapters with hairline rules between */}
          {data.chapters.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <SectionHead kicker="Part one" title="The story so far" />
              {data.chapters.map((c, i) => (
                <div key={c.id ?? i} style={{ marginBottom: 36, breakInside: 'avoid' }}>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'var(--peach-ink)',
                      marginBottom: 8,
                      fontWeight: 600,
                    }}
                  >
                    Chapter {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 26,
                      margin: '0 0 6px',
                      fontWeight: 600,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {c.title}
                  </h3>
                  {c.subtitle && (
                    <div
                      style={{
                        fontSize: 13.5,
                        fontStyle: 'italic',
                        color: 'var(--lavender-ink)',
                        marginBottom: 10,
                      }}
                    >
                      {c.subtitle}
                    </div>
                  )}
                  <p style={{ fontSize: 15.5, margin: 0, lineHeight: 1.7 }}>{c.description}</p>
                  {i < data.chapters.length - 1 && <ChapterRule />}
                </div>
              ))}
            </section>
          )}

          {/* Photo plate — full-width "Along the way" gallery */}
          {photos.length > 0 && (
            <>
              <ChapterRule glyph="¶" />
              <section style={{ marginBottom: 16, breakInside: 'avoid' }}>
                <SectionHead
                  kicker="Plate"
                  title="Along the way"
                  sub="Moments stitched between the chapters."
                />
                <div
                  className="pl8-mb-plate"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                  }}
                >
                  {photos.slice(0, 9).map((p, i) => (
                    <figure
                      key={i}
                      style={{
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        breakInside: 'avoid',
                      }}
                    >
                      <img
                        src={p.url}
                        alt={p.caption}
                        style={{
                          width: '100%',
                          aspectRatio: '4 / 5',
                          objectFit: 'cover',
                          borderRadius: 3,
                          boxShadow: '0 1px 3px rgba(61,74,31,0.12)',
                        }}
                      />
                      {p.caption && (
                        <figcaption
                          style={{
                            fontSize: 10.5,
                            color: 'var(--ink-muted)',
                            textAlign: 'center',
                            marginTop: 6,
                            fontStyle: 'italic',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {p.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Memories — paired with photos where available */}
          {data.memories.length > 0 && (
            <>
              <ChapterRule />
              <section style={{ marginBottom: 16 }}>
                <SectionHead
                  kicker="Part two"
                  title="Memories our people gave us"
                  sub="What they wrote, in their own words."
                />
                {data.memories.map((m, i) => (
                  <GuestEntry
                    key={i}
                    guestName={m.guest_name}
                    body={m.response}
                    prompt={m.prompt}
                    photoUrl={i < 3 ? photos[i]?.url ?? null : null}
                  />
                ))}
              </section>
            </>
          )}

          {/* Whispers — italic + lavender accent */}
          {data.whispers.length > 0 && (
            <>
              <ChapterRule />
              <section style={{ marginBottom: 16 }}>
                <SectionHead
                  kicker="Pull"
                  title="Whispers"
                  sub="Quiet notes left for you alone."
                />
                {data.whispers.map((w, i) => (
                  <GuestEntry key={i} guestName={w.guest_name} body={w.body} italic />
                ))}
              </section>
            </>
          )}

          {/* Capsule — opened with metadata */}
          {data.capsule.length > 0 && (
            <>
              <ChapterRule />
              <section style={{ marginBottom: 16 }}>
                <SectionHead
                  kicker="Sealed · opened"
                  title="From the capsule"
                  sub="Words written for a future version of you."
                />
                {data.capsule.map((c, i) => (
                  <GuestEntry
                    key={i}
                    guestName={c.guest_name}
                    body={c.body}
                    meta={`Year ${c.reveal_years} · opened ${fmtDate(c.reveal_on)}`}
                  />
                ))}
              </section>
            </>
          )}

          {/* Tribute wall */}
          {data.tributes && data.tributes.length > 0 && (
            <>
              <ChapterRule />
              <section style={{ marginBottom: 16 }}>
                <SectionHead kicker="Wall" title="The wall" sub="Everything pinned up that night." />
                {data.tributes.map((t, i) => (
                  <GuestEntry key={i} guestName={t.guest_name} body={t.body} italic />
                ))}
              </section>
            </>
          )}

          {/* Guestbook signatures */}
          {data.guestbook && data.guestbook.length > 0 && (
            <>
              <ChapterRule />
              <section style={{ marginBottom: 16 }}>
                <SectionHead kicker="Signatures" title="Guestbook" sub="Every name that came through." />
                {data.guestbook.map((g, i) => (
                  <GuestEntry key={i} guestName={g.guest_name} body={g.message} italic />
                ))}
              </section>
            </>
          )}

          {/* Voices — roll call of recorded voice toasts. Paper can't
              play audio; the recordings themselves live in the day-of
              room, so the book keeps the names and lengths. */}
          {data.voiceToasts && data.voiceToasts.length > 0 && (
            <>
              <ChapterRule />
              <section style={{ marginBottom: 16, breakInside: 'avoid' }}>
                <SectionHead
                  kicker="Voices"
                  title="In their own voices"
                  sub="Words recorded aloud — the audio lives on with your Pearloom celebration."
                />
                <ul
                  className="pl8-mb-cols"
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    columnCount: 2,
                    columnGap: 44,
                  }}
                >
                  {data.voiceToasts.map((v, i) => (
                    <li
                      key={i}
                      style={{
                        marginBottom: 8,
                        fontSize: 13.5,
                        breakInside: 'avoid',
                        paddingBottom: 6,
                        borderBottom: '1px dotted var(--line-soft)',
                      }}
                    >
                      <strong style={{ color: 'var(--ink)' }}>{v.guest_name}</strong>
                      {fmtToastDuration(v.duration_seconds) && (
                        <span style={{ color: 'var(--ink-soft)' }}>
                          {' '}— {fmtToastDuration(v.duration_seconds)}
                        </span>
                      )}
                      {v.created_at && (
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                          recorded {fmtDate(v.created_at)}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {/* Playlist — two-column at the end, slim type */}
          {data.songs.length > 0 && (
            <>
              <ChapterRule />
              <section style={{ marginBottom: 16, breakInside: 'avoid' }}>
                <SectionHead
                  kicker="Coda"
                  title="The playlist"
                  sub="Songs your guests asked for."
                />
                <ul
                  className="pl8-mb-cols"
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    columnCount: 2,
                    columnGap: 44,
                  }}
                >
                  {data.songs.map((s, i) => (
                    <li
                      key={i}
                      style={{
                        marginBottom: 8,
                        fontSize: 13.5,
                        breakInside: 'avoid',
                        paddingBottom: 6,
                        borderBottom: '1px dotted var(--line-soft)',
                      }}
                    >
                      <strong style={{ color: 'var(--ink)' }}>{s.song_title}</strong>
                      {s.artist ? (
                        <span style={{ color: 'var(--ink-soft)' }}> — {s.artist}</span>
                      ) : null}
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                        requested by {s.guest_name}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {/* Colophon — back-matter editorial signature */}
          <footer
            style={{
              marginTop: 56,
              paddingTop: 28,
              borderTop: '1px solid var(--line-soft)',
              textAlign: 'center',
              breakInside: 'avoid',
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: 'var(--ink-muted)',
                marginBottom: 8,
              }}
            >
              About this book
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 14,
                fontStyle: 'italic',
                color: 'var(--ink-soft)',
              }}
            >
              Woven by Pearloom · {new Date().getFullYear()}
            </div>
          </footer>
        </article>
      )}
      {/* Phone-width book: photo entries stack (image above the
          words), the photo plate drops to two-up, and the two-column
          voice/playlist lists run single-column. Print is unaffected
          — the paper box is wider than 640px. */}
      <style jsx global>{`
        @media (max-width: 640px) {
          .pl8-mb-entry {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
          .pl8-mb-entry > img {
            max-width: 200px;
          }
          .pl8-mb-plate {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .pl8-mb-cols {
            column-count: 1 !important;
          }
        }
      `}</style>
    </PLChrome>
  );
}
