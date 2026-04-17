'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/help/HelpClient.tsx
// Editorial help centre for hosts already in the app. Mirrors the
// marketing aesthetic (Fraunces display, olive accents, cream),
// not the public demo FAQ.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  Mail,
  Keyboard,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

interface FaqEntry {
  q: string;
  a: string;
  tags: string[];
}

const FAQ: FaqEntry[] = [
  {
    q: 'How do I create my first site?',
    a: 'From the dashboard, click "New Site" (or "Let Pear handle it") and answer a few questions about your occasion, names, and date. Pear drafts a site in about twenty seconds; you can edit every block after.',
    tags: ['start', 'site'],
  },
  {
    q: 'Can I change the theme after the site is generated?',
    a: 'Yes. Open the editor, then Theme in the top bar. Swap fonts, palettes, and the vibe skin without regenerating. Your words and photos are preserved.',
    tags: ['theme', 'editor'],
  },
  {
    q: 'How do I invite guests to RSVP?',
    a: 'Open your site in the editor and add the RSVP block. Publish, then share the public URL. Guest responses show up in Dashboard → Guests · RSVP with meal preferences and plus-ones.',
    tags: ['rsvp', 'guests'],
  },
  {
    q: 'What does the Director do?',
    a: 'The Director is your AI event planner — budgets, venues, vendors, timelines, and a checklist in one conversation. Open Dashboard → Director and choose a site to get started.',
    tags: ['director', 'ai'],
  },
  {
    q: 'How do photo uploads work?',
    a: 'Guests upload via the Photo Wall block on your site. You can curate everything in Dashboard → Gallery — hide, star, or download originals. Storage scales with your plan.',
    tags: ['photos', 'gallery'],
  },
  {
    q: 'Can guests leave voice toasts?',
    a: 'Absolutely. Add the Guestbook block with voice enabled. Toasts appear in Dashboard → Day-of for you to approve, reject, or feature on the day.',
    tags: ['guests', 'day-of'],
  },
  {
    q: 'How do I publish and share my site?',
    a: 'In the editor, hit Publish. Your site goes live at yourname.pearloom.com instantly. Attach a custom domain from Dashboard → Profile → Domains.',
    tags: ['publish', 'domain'],
  },
  {
    q: 'What happens after the event?',
    a: 'Your site stays online forever on every plan, including the free tier. Guests can keep leaving memories, and you can download everything as a keepsake film or zip.',
    tags: ['after', 'keepsake'],
  },
  {
    q: 'Can I collaborate with a partner or planner?',
    a: 'Yes. Open Dashboard → Profile → Collaborators and invite them by email. Everyone you invite can edit the site and run day-of ops with you.',
    tags: ['team', 'collab'],
  },
  {
    q: 'How do I cancel or change my plan?',
    a: 'Dashboard → Profile → Billing. You keep everything you\u2019ve created on any tier — no lock-in.',
    tags: ['billing'],
  },
];

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['\u2318', 'K'], label: 'Open Pear command bar' },
  { keys: ['\u2318', 'S'], label: 'Save manifest in editor' },
  { keys: ['\u2318', 'Z'], label: 'Undo' },
  { keys: ['\u2318', '\u21E7', 'Z'], label: 'Redo' },
  { keys: ['\u2318', '.'], label: 'Toggle block library drawer' },
  { keys: ['Esc'], label: 'Close overlays / drawers' },
];

export default function HelpClient() {
  const [query, setQuery] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ;
    return FAQ.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        f.tags.some((t) => t.includes(q)),
    );
  }, [query]);

  const year = new Date().getFullYear();

  return (
    <DashboardShell eyebrow="Help · Docs" contentMaxWidth={980}>
            {/* Editorial masthead */}
            <header
              style={{
                position: 'relative',
                marginBottom: 40,
                paddingBottom: 32,
                borderBottom: '1px solid var(--pl-divider)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background:
                    'linear-gradient(90deg, var(--pl-gold) 0%, rgba(184,147,90,0) 40%)',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 24,
                  flexWrap: 'wrap',
                  paddingTop: 18,
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-olive)',
                      marginBottom: 18,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 1,
                        background: 'var(--pl-gold)',
                      }}
                    />
                    Help · {year}
                  </div>
                  <h1
                    className="pl-display"
                    style={{
                      margin: 0,
                      fontSize: 'clamp(2.4rem, 5.2vw, 3.6rem)',
                      color: 'var(--pl-ink)',
                      lineHeight: 1.02,
                      letterSpacing: '-0.01em',
                      fontStyle: 'italic',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                    }}
                  >
                    How can we help?
                  </h1>
                  <p
                    style={{
                      margin: '18px 0 0',
                      maxWidth: '58ch',
                      color: 'var(--pl-ink-soft)',
                      fontSize: 'clamp(0.96rem, 1.2vw, 1.06rem)',
                      lineHeight: 1.6,
                    }}
                  >
                    Host-facing docs — not the public FAQ. For anything a search
                    can&apos;t solve, our team answers every email inside a day.
                  </p>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 0,
                    border: '1px solid var(--pl-divider)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    minWidth: 220,
                  }}
                >
                  <Dossier kicker="Entries" value={String(FAQ.length).padStart(2, '0')} />
                  <Dossier
                    kicker="Reply · sla"
                    value="< 1 day"
                    divider
                  />
                </div>
              </div>

              {/* Concordance search */}
              <div style={{ marginTop: 32, maxWidth: 540 }}>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.48rem',
                    fontWeight: 700,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-olive)',
                    marginBottom: 8,
                  }}
                >
                  Search · concordance
                </div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 18px',
                    background: 'var(--pl-cream-card)',
                    border: '1px solid var(--pl-divider)',
                    borderRadius: 2,
                    boxShadow: 'inset 0 -2px 0 rgba(184,147,90,0.22)',
                    transition: 'box-shadow 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  onFocusCapture={(e) => {
                    (e.currentTarget as HTMLLabelElement).style.boxShadow =
                      'inset 0 -2px 0 rgba(184,147,90,0.9)';
                  }}
                  onBlurCapture={(e) => {
                    (e.currentTarget as HTMLLabelElement).style.boxShadow =
                      'inset 0 -2px 0 rgba(184,147,90,0.22)';
                  }}
                >
                  <Search size={15} color="var(--pl-olive)" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Look up a question…"
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '0.98rem',
                      fontFamily: 'var(--pl-font-display)',
                      fontStyle: 'italic',
                      color: 'var(--pl-ink)',
                    }}
                  />
                  {query && (
                    <span
                      style={{
                        fontFamily: 'var(--pl-font-mono)',
                        fontSize: '0.5rem',
                        fontWeight: 700,
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'var(--pl-muted)',
                      }}
                    >
                      {visible.length} / {FAQ.length}
                    </span>
                  )}
                </label>
              </div>
            </header>

            {/* Three-column dossier: shortcuts to help surfaces */}
            <section
              style={{ marginBottom: 44 }}
              aria-label="Quick routes"
            >
              <div
                style={{
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.48rem',
                  fontWeight: 700,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-olive)',
                  marginBottom: 14,
                }}
              >
                Three ways to reach us
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 0,
                  border: '1px solid var(--pl-divider)',
                  borderTop: '2px solid var(--pl-gold)',
                  borderRadius: 2,
                  background: 'var(--pl-cream-card)',
                  overflow: 'hidden',
                }}
              >
                <QuickTile
                  index={1}
                  href="/dashboard/director"
                  icon={<Sparkles size={14} />}
                  eyebrow="AI · Director"
                  title="Ask the planner"
                  description="Budgets, vendors, timelines."
                  accent="olive"
                />
                <QuickTile
                  index={2}
                  href="mailto:help@pearloom.com"
                  icon={<Mail size={14} />}
                  eyebrow="Email · < 1 day"
                  title="Write the team"
                  description="help@pearloom.com"
                  accent="gold"
                  divider
                />
                <QuickTile
                  index={3}
                  href="#shortcuts"
                  icon={<Keyboard size={14} />}
                  eyebrow="Editor · keys"
                  title="Keyboard shortcuts"
                  description="Jump faster."
                  accent="plum"
                  divider
                />
              </div>
            </section>

            {/* FAQ ledger */}
            <section id="faq" style={{ marginBottom: 56 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--pl-divider)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.48rem',
                      fontWeight: 700,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-olive)',
                      marginBottom: 6,
                    }}
                  >
                    Chapter I · Entries
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: 'var(--pl-font-display)',
                      fontStyle: 'italic',
                      fontVariationSettings:
                        '"opsz" 144, "SOFT" 80, "WONK" 1',
                      fontSize: '1.7rem',
                      letterSpacing: '-0.01em',
                      color: 'var(--pl-ink)',
                    }}
                  >
                    Common questions
                  </h2>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.52rem',
                    fontWeight: 700,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-muted)',
                  }}
                >
                  № 01—{String(FAQ.length).padStart(2, '0')}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  borderTop: '1px solid var(--pl-divider)',
                }}
              >
                {visible.length === 0 ? (
                  <div
                    style={{
                      position: 'relative',
                      padding: '48px 24px',
                      textAlign: 'center',
                      border: '1px dashed rgba(184,147,90,0.45)',
                      borderTop: 'none',
                      background:
                        'repeating-linear-gradient(135deg, transparent 0, transparent 12px, rgba(184,147,90,0.04) 12px, rgba(184,147,90,0.04) 13px)',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-mono)',
                        fontSize: '0.5rem',
                        fontWeight: 700,
                        letterSpacing: '0.28em',
                        textTransform: 'uppercase',
                        color: 'var(--pl-gold)',
                        marginBottom: 10,
                      }}
                    >
                      № 00 · Null result
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--pl-font-display)',
                        fontStyle: 'italic',
                        fontVariationSettings:
                          '"opsz" 144, "SOFT" 80, "WONK" 1',
                        fontSize: '1.3rem',
                        color: 'var(--pl-ink)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Nothing matches &ldquo;{query}&rdquo;.
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: '0.9rem',
                        color: 'var(--pl-ink-soft)',
                      }}
                    >
                      Try emailing us — we answer every one.
                    </div>
                  </div>
                ) : (
                  visible.map((f, i) => (
                    <FaqRow
                      key={f.q}
                      index={i}
                      entry={f}
                      open={openIdx === i}
                      onToggle={() => setOpenIdx(openIdx === i ? null : i)}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Shortcuts ledger */}
            <section id="shortcuts" style={{ marginBottom: 56 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--pl-divider)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.48rem',
                      fontWeight: 700,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-olive)',
                      marginBottom: 6,
                    }}
                  >
                    Chapter II · Keyboard
                  </div>
                  <h2
                    style={{
                      margin: 0,
                      fontFamily: 'var(--pl-font-display)',
                      fontStyle: 'italic',
                      fontVariationSettings:
                        '"opsz" 144, "SOFT" 80, "WONK" 1',
                      fontSize: '1.7rem',
                      letterSpacing: '-0.01em',
                      color: 'var(--pl-ink)',
                    }}
                  >
                    Keys that save the day
                  </h2>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.52rem',
                    fontWeight: 700,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-muted)',
                  }}
                >
                  № {String(SHORTCUTS.length).padStart(2, '0')}
                </span>
              </div>
              <div
                style={{
                  border: '1px solid var(--pl-divider)',
                  borderTop: '2px solid var(--pl-gold)',
                  borderRadius: 2,
                  background: 'var(--pl-cream-card)',
                  overflow: 'hidden',
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr 1fr',
                    gap: 12,
                    padding: '10px 18px',
                    borderBottom: '1px solid var(--pl-divider)',
                    background: 'var(--pl-cream-deep)',
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.46rem',
                    fontWeight: 700,
                    letterSpacing: '0.28em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-muted)',
                  }}
                >
                  <span>№</span>
                  <span>Combination</span>
                  <span>Action</span>
                </div>
                {SHORTCUTS.map((s, i) => (
                  <div
                    key={s.label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '44px 1fr 1fr',
                      gap: 12,
                      alignItems: 'center',
                      padding: '14px 18px',
                      borderBottom:
                        i === SHORTCUTS.length - 1
                          ? 'none'
                          : '1px solid var(--pl-divider)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--pl-font-mono)',
                        fontSize: '0.54rem',
                        fontWeight: 700,
                        letterSpacing: '0.22em',
                        color: 'var(--pl-gold)',
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div style={{ display: 'inline-flex', gap: 5, flexWrap: 'wrap' }}>
                      {s.keys.map((k, ki) => (
                        <span key={`${k}-${ki}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <kbd
                            style={{
                              padding: '4px 9px',
                              fontFamily: 'var(--pl-font-mono)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: 'var(--pl-cream-deep)',
                              border: '1px solid var(--pl-divider)',
                              borderBottom: '2px solid var(--pl-divider)',
                              borderRadius: 3,
                              color: 'var(--pl-ink)',
                              minWidth: 22,
                              textAlign: 'center',
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
                            }}
                          >
                            {k}
                          </kbd>
                          {ki < s.keys.length - 1 && (
                            <span
                              style={{
                                fontFamily: 'var(--pl-font-mono)',
                                fontSize: '0.58rem',
                                color: 'var(--pl-muted)',
                              }}
                            >
                              +
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--pl-font-display)',
                        fontStyle: 'italic',
                        fontVariationSettings:
                          '"opsz" 144, "SOFT" 80, "WONK" 1',
                        fontSize: '0.98rem',
                        color: 'var(--pl-ink-soft)',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Colophon: still stuck */}
            <section
              style={{
                position: 'relative',
                padding: '44px 28px',
                border: '1px dashed rgba(184,147,90,0.5)',
                borderRadius: 2,
                textAlign: 'center',
                background:
                  'radial-gradient(ellipse at top, rgba(184,147,90,0.06), transparent 70%)',
              }}
            >
              {/* Corner folio marks */}
              <span
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 12,
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.46rem',
                  fontWeight: 700,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-gold)',
                }}
              >
                Still stuck
              </span>
              <span
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 12,
                  fontFamily: 'var(--pl-font-mono)',
                  fontSize: '0.46rem',
                  fontWeight: 700,
                  letterSpacing: '0.28em',
                  textTransform: 'uppercase',
                  color: 'var(--pl-gold)',
                }}
              >
                № 03
              </span>
              <div style={{ maxWidth: 520, margin: '0 auto' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    width: 60,
                    height: 60,
                    borderRadius: '50%',
                    background: 'var(--pl-cream-card)',
                    border: '1px solid rgba(184,147,90,0.5)',
                    boxShadow: '0 0 0 4px rgba(184,147,90,0.08)',
                    color: 'var(--pl-olive)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 18,
                  }}
                >
                  <MessageCircle size={22} />
                </span>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.48rem',
                    fontWeight: 700,
                    letterSpacing: '0.3em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-olive)',
                    marginBottom: 10,
                  }}
                >
                  A postscript
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontSize: '2rem',
                    margin: 0,
                    color: 'var(--pl-ink)',
                    fontStyle: 'italic',
                    fontVariationSettings:
                      '"opsz" 144, "SOFT" 80, "WONK" 1',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.05,
                  }}
                >
                  Still stuck?
                </h3>
                <p
                  style={{
                    margin: '12px auto 22px',
                    color: 'var(--pl-ink-soft)',
                    fontSize: '0.98rem',
                    lineHeight: 1.6,
                    maxWidth: '46ch',
                  }}
                >
                  We answer every email personally. Usually within a few hours —
                  always within a day.
                </p>
                <a
                  href="mailto:help@pearloom.com"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 22px',
                    background: 'var(--pl-ink)',
                    color: 'var(--pl-cream)',
                    borderRadius: 2,
                    textDecoration: 'none',
                    fontFamily: 'var(--pl-font-mono)',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    boxShadow: '0 0 0 3px rgba(184,147,90,0.18)',
                    transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform =
                      'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.transform =
                      'translateY(0)';
                  }}
                >
                  <Mail size={13} />
                  help@pearloom.com →
                </a>
              </div>
            </section>
    </DashboardShell>
  );
}

// ─── Subcomponents ──────────────────────────────────────────

function Dossier({
  kicker,
  value,
  divider,
}: {
  kicker: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderLeft: divider ? '1px solid var(--pl-divider)' : 'none',
        background: 'var(--pl-cream-card)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.46rem',
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--pl-muted)',
          marginBottom: 6,
        }}
      >
        {kicker}
      </div>
      <div
        style={{
          fontFamily: 'var(--pl-font-display)',
          fontStyle: 'italic',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          fontSize: '1.3rem',
          color: 'var(--pl-ink)',
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function QuickTile({
  index,
  href,
  icon,
  eyebrow,
  title,
  description,
  accent,
  divider,
}: {
  index: number;
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  accent: 'olive' | 'gold' | 'plum';
  divider?: boolean;
}) {
  const accentColor =
    accent === 'olive'
      ? 'var(--pl-olive)'
      : accent === 'gold'
        ? 'var(--pl-gold)'
        : 'var(--pl-plum)';
  return (
    <Link
      href={href}
      style={{
        position: 'relative',
        display: 'block',
        padding: '22px 20px 20px',
        background: 'var(--pl-cream-card)',
        borderLeft: divider ? '1px solid var(--pl-divider)' : 'none',
        textDecoration: 'none',
        transition:
          'background 240ms cubic-bezier(0.22, 1, 0.36, 1), transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background =
          'var(--pl-cream-deep)';
        const arrow = e.currentTarget.querySelector(
          '[data-arrow]',
        ) as HTMLSpanElement | null;
        if (arrow) arrow.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.background =
          'var(--pl-cream-card)';
        const arrow = e.currentTarget.querySelector(
          '[data-arrow]',
        ) as HTMLSpanElement | null;
        if (arrow) arrow.style.transform = 'translateX(0)';
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.5rem',
            fontWeight: 700,
            letterSpacing: '0.26em',
            color: 'var(--pl-gold)',
          }}
        >
          № {String(index).padStart(2, '0')}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 2,
            background: 'var(--pl-cream-deep)',
            border: `1px solid ${accentColor}`,
            color: accentColor,
          }}
        >
          {icon}
        </span>
      </div>
      <div
        style={{
          fontFamily: 'var(--pl-font-mono)',
          fontSize: '0.46rem',
          fontWeight: 700,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--pl-olive)',
          marginBottom: 8,
        }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontFamily: 'var(--pl-font-display)',
          fontStyle: 'italic',
          fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
          fontSize: '1.35rem',
          color: 'var(--pl-ink)',
          letterSpacing: '-0.01em',
          marginBottom: 6,
          lineHeight: 1.05,
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          fontSize: '0.82rem',
          color: 'var(--pl-ink-soft)',
        }}
      >
        <span>{description}</span>
        <span
          data-arrow
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.72rem',
            color: accentColor,
            transition: 'transform 240ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          →
        </span>
      </div>
    </Link>
  );
}

function FaqRow({
  entry,
  index,
  open,
  onToggle,
}: {
  entry: FaqEntry;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      style={{
        position: 'relative',
        background: open ? 'var(--pl-cream-card)' : 'transparent',
        borderBottom: '1px solid var(--pl-divider)',
        transition: 'background 240ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Gold vertical accent when open */}
      {open && (
        <span
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: 2,
            background: 'var(--pl-gold)',
          }}
        />
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '48px 1fr auto',
          alignItems: 'center',
          gap: 16,
          padding: '20px 22px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--pl-ink)',
          fontFamily: 'inherit',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--pl-font-mono)',
            fontSize: '0.54rem',
            fontWeight: 700,
            letterSpacing: '0.22em',
            color: open ? 'var(--pl-gold)' : 'var(--pl-muted)',
            transition: 'color 240ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <span
          style={{
            fontFamily: 'var(--pl-font-display)',
            fontStyle: 'italic',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            fontSize: '1.15rem',
            letterSpacing: '-0.005em',
            color: 'var(--pl-ink)',
            lineHeight: 1.3,
          }}
        >
          {entry.q}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid var(--pl-divider)',
            background: open ? 'var(--pl-ink)' : 'transparent',
            color: open ? 'var(--pl-cream)' : 'var(--pl-muted)',
            transition:
              'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), background 240ms, color 240ms',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        >
          <ChevronDown size={14} />
        </span>
      </button>
      {open && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr',
            gap: 16,
            padding: '0 22px 22px',
          }}
        >
          <span />
          <div>
            <p
              style={{
                margin: 0,
                color: 'var(--pl-ink-soft)',
                fontSize: '0.96rem',
                lineHeight: 1.65,
                maxWidth: '62ch',
              }}
            >
              {entry.a}
            </p>
            {entry.tags.length > 0 && (
              <div
                style={{
                  marginTop: 14,
                  display: 'inline-flex',
                  gap: 6,
                  flexWrap: 'wrap',
                }}
              >
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    style={{
                      padding: '4px 10px',
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.5rem',
                      fontWeight: 700,
                      letterSpacing: '0.22em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-olive)',
                      background: 'var(--pl-olive-mist)',
                      borderRadius: 2,
                    }}
                  >
                    # {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
