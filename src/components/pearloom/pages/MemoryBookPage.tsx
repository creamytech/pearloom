'use client';

// Memory Book — printable keepsake. Aggregates every chapter,
// memory response, whisper, revealed time-capsule note, and
// accepted playlist song into a long-form letterpress-ready layout.
// The "Print / save as PDF" button opens the browser print dialog
// which the user can save to PDF (native on every OS).

import { useEffect, useState } from 'react';
import { DashLayout } from '../dash/DashShell';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { Icon } from '../motifs';

type Chapter = { id?: string; title: string; subtitle?: string; description: string };
type Memory = { guest_name: string; prompt: string; response: string };
type Whisper = { guest_name: string; body: string };
type Capsule = { guest_name: string; body: string; reveal_years: number; reveal_on: string };
type Song = { guest_name: string; song_title: string; artist?: string | null; spotify_url?: string | null };

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
}

function fmtDate(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
  const subtitle = data?.site ? `${data.site.occasion ?? 'Celebration'}${data.site.venue ? ` · ${data.site.venue}` : ''}` : '';

  return (
    <DashLayout
      active="bridge"
      title="Memory book"
      subtitle="Everything you and your guests wrote, one printable keepsake. Save as PDF or send to a letterpress printer."
    >
      <div style={{ padding: '0 clamp(20px, 4vw, 40px) 32px', maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 22 }} className="pl8-no-print">
          <button type="button" className="btn btn-primary" onClick={print}>
            <Icon name="sparkles" size={14} /> Print or save as PDF
          </button>
        </div>

        {loading ? (
          <div style={{ color: 'var(--ink-soft)' }}>Threading…</div>
        ) : !data ? (
          <div style={{ color: 'var(--ink-soft)' }}>Pick a site first.</div>
        ) : (
          <article
            className="pl8-memory-book"
            style={{
              background: 'var(--cream)',
              padding: '60px 56px',
              borderRadius: 4,
              boxShadow: '0 4px 16px rgba(61,74,31,0.08)',
              fontFamily: 'var(--font-body)',
              color: 'var(--ink)',
              lineHeight: 1.65,
            }}
          >
            <header style={{ textAlign: 'center', marginBottom: 64, borderBottom: '1px solid var(--line-soft)', paddingBottom: 40 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--peach-ink)', marginBottom: 14 }}>
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
                    margin: '0 auto 24px',
                    display: 'block',
                    border: '2px solid var(--peach-2)',
                  }}
                />
              )}
              <h1 className="display" style={{ fontSize: 56, margin: '0 0 10px', letterSpacing: '-0.02em' }}>
                {names || 'Our celebration'}
              </h1>
              <div style={{ fontSize: 14, color: 'var(--ink-soft)' }}>
                {subtitle}
                {data.site.date ? ` · ${fmtDate(data.site.date)}` : ''}
              </div>
            </header>

            {data.chapters.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <h2 className="display" style={{ fontSize: 32, margin: '0 0 20px' }}>The story so far</h2>
                {data.chapters.map((c, i) => (
                  <div key={c.id ?? i} style={{ marginBottom: 32, breakInside: 'avoid' }}>
                    <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 4 }}>
                      Chapter {i + 1}
                    </div>
                    <h3 className="display" style={{ fontSize: 22, margin: '0 0 6px' }}>{c.title}</h3>
                    {c.subtitle && <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 6 }}>{c.subtitle}</div>}
                    <p style={{ fontSize: 15, margin: 0 }}>{c.description}</p>
                  </div>
                ))}
              </section>
            )}

            {Array.isArray(data.chapterPhotos) && data.chapterPhotos.length > 0 && (
              <section style={{ marginBottom: 48, breakInside: 'avoid' }}>
                <h2 className="display" style={{ fontSize: 32, margin: '0 0 20px' }}>Along the way</h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 10,
                  }}
                >
                  {data.chapterPhotos.slice(0, 9).map((p, i) => (
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
                          aspectRatio: '4/5',
                          objectFit: 'cover',
                          borderRadius: 4,
                        }}
                      />
                      {p.caption && (
                        <figcaption
                          style={{
                            fontSize: 10,
                            color: 'var(--ink-muted)',
                            textAlign: 'center',
                            marginTop: 4,
                            fontStyle: 'italic',
                          }}
                        >
                          {p.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {data.memories.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <h2 className="display" style={{ fontSize: 32, margin: '0 0 20px' }}>Memories our people gave us</h2>
                {data.memories.map((m, i) => (
                  <div key={i} style={{ marginBottom: 22, breakInside: 'avoid' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.guest_name}</div>
                    <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ink-soft)', marginBottom: 6 }}>{m.prompt}</div>
                    <p style={{ fontSize: 15, margin: 0 }}>{m.response}</p>
                  </div>
                ))}
              </section>
            )}

            {data.whispers.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <h2 className="display" style={{ fontSize: 32, margin: '0 0 20px' }}>Whispers</h2>
                {data.whispers.map((w, i) => (
                  <div key={i} style={{ marginBottom: 18, breakInside: 'avoid', borderLeft: '2px solid var(--peach-2)', paddingLeft: 16 }}>
                    <p style={{ fontSize: 15, margin: '0 0 6px', fontStyle: 'italic' }}>&ldquo;{w.body}&rdquo;</p>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>— {w.guest_name}</div>
                  </div>
                ))}
              </section>
            )}

            {data.capsule.length > 0 && (
              <section style={{ marginBottom: 48 }}>
                <h2 className="display" style={{ fontSize: 32, margin: '0 0 20px' }}>From the capsule</h2>
                {data.capsule.map((c, i) => (
                  <div key={i} style={{ marginBottom: 20, breakInside: 'avoid' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>
                      {c.guest_name} · Year {c.reveal_years} · opened {fmtDate(c.reveal_on)}
                    </div>
                    <p style={{ fontSize: 15, margin: 0 }}>{c.body}</p>
                  </div>
                ))}
              </section>
            )}

            {data.songs.length > 0 && (
              <section style={{ marginBottom: 24, breakInside: 'avoid' }}>
                <h2 className="display" style={{ fontSize: 32, margin: '0 0 20px' }}>The playlist</h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, columnCount: 2, columnGap: 40 }}>
                  {data.songs.map((s, i) => (
                    <li key={i} style={{ marginBottom: 6, fontSize: 14, breakInside: 'avoid' }}>
                      <strong>{s.song_title}</strong>
                      {s.artist ? ` — ${s.artist}` : ''}
                      <span style={{ color: 'var(--ink-muted)' }}> · {s.guest_name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </article>
        )}
      </div>
    </DashLayout>
  );
}
