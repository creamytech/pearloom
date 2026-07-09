'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/help/HelpClient.tsx
// Help centre — editorial port of the design-handoff "Help" screen
// (ScreensShop.jsx · Help): a fixed deep-olive hero with a "just ask"
// search, a grid of help topics that filter the questions, then the
// FAQ accordion + shortcuts + a warm "ask a person" card. All the
// existing wiring (search filter, HELP_FAQ accordion, shortcuts,
// contact) is kept; only the surface is restyled to the zip.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { Icon, PearloomGlyph } from '@/components/pearloom/motifs';
import { HELP_FAQ } from '@/lib/help-faq';

const MONO = 'var(--pl-font-mono, ui-monospace, monospace)';
const DISPLAY = 'var(--font-display, "Fraunces", Georgia, serif)';

// Fixed deep-olive hero surface (dark in both themes; its interior
// cream/gold is intentionally literal, matching the cockpit banner).
const HERO_BG = 'linear-gradient(150deg, #37421F 0%, #2A331A 46%, #1E2513 100%)';
const HERO_GOLD = '#DDB768';
const HERO_CREAM = '#F7F2E6';

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['⌘', 'K'], label: 'Open Pear command bar' },
  { keys: ['⌘', 'S'], label: 'Save manifest in editor' },
  { keys: ['⌘', 'Z'], label: 'Undo' },
  { keys: ['⌘', '⇧', 'Z'], label: 'Redo' },
  { keys: ['⌘', '.'], label: 'Toggle block library drawer' },
  { keys: ['Esc'], label: 'Close overlays / drawers' },
];

// Help topics — each is a real filter over the FAQ (tapping one sets
// the search query below); nothing is a dead link.
const TOPICS: Array<{ i: string; t: string; d: string; q: string }> = [
  { i: 'users', t: 'Guests & RSVPs', d: 'Lists, nudges, dietary notes', q: 'rsvp' },
  { i: 'layout', t: 'Your site & editor', d: 'Blocks, themes, domains', q: 'editor' },
  { i: 'globe', t: 'Publishing & domains', d: 'Go live, custom URLs', q: 'domain' },
  { i: 'image', t: 'Photos & gallery', d: 'Uploads, curation, keepsakes', q: 'photos' },
  { i: 'heart-icon', t: 'After the event', d: 'The keepsake film & memories', q: 'keepsake' },
  { i: 'sparkles', t: 'Plans & billing', d: 'Tiers, credits, invoices', q: 'billing' },
];

export default function HelpClient() {
  const [query, setQuery] = useState('');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HELP_FAQ;
    return HELP_FAQ.filter(
      (f) =>
        f.q.toLowerCase().includes(q) ||
        f.a.toLowerCase().includes(q) ||
        f.tags.some((t) => t.includes(q)),
    );
  }, [query]);

  return (
    <DashLayout
      active="help"
      title="Help & docs"
      subtitle="Shortcuts, recipes, and answers, the way Pear explains them."
    >
      <div className="pl8" style={{ padding: '0 clamp(20px, 4vw, 40px) 40px', maxWidth: 980, margin: '0 auto', position: 'relative' }}>
        {/* ── The ask-Pear hero — dark olive, centered search ─────── */}
        <div
          style={{
            borderRadius: 18,
            overflow: 'hidden',
            background: HERO_BG,
            color: HERO_CREAM,
            marginBottom: 20,
            boxShadow: 'var(--shadow-md, 0 18px 48px -24px rgba(20,24,12,0.55))',
          }}
        >
          <div style={{ padding: 'clamp(28px, 4vw, 44px)', textAlign: 'center' }}>
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.22em', color: HERO_GOLD, marginBottom: 12 }}>
              THE HELP CENTRE
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(26px, 3.6vw, 38px)', fontWeight: 500, lineHeight: 1.05 }}>
              How can Pear <span style={{ fontStyle: 'italic', color: HERO_GOLD }}>help?</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(247,242,230,0.1)',
                border: '1px solid rgba(247,242,230,0.2)',
                borderRadius: 999,
                padding: '11px 18px',
                maxWidth: 460,
                margin: '18px auto 0',
              }}
            >
              <Icon name="search" size={16} color={HERO_GOLD} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search help, or just ask…"
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 14,
                  color: HERO_CREAM,
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Topic cards — tap to filter the questions below ───────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: 14,
            marginBottom: 24,
          }}
        >
          {TOPICS.map((t) => {
            const on = query.trim().toLowerCase() === t.q;
            return (
              <button
                key={t.t}
                type="button"
                onClick={() => setQuery(on ? '' : t.q)}
                className="lift"
                style={{
                  textAlign: 'left',
                  padding: 20,
                  borderRadius: 16,
                  background: 'var(--card)',
                  border: `1px solid ${on ? 'var(--ink)' : 'var(--line-soft)'}`,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    display: 'grid',
                    placeItems: 'center',
                    background: on ? 'var(--ink)' : 'var(--cream-3)',
                    color: on ? 'var(--cream)' : 'var(--sage-deep)',
                    marginBottom: 12,
                  }}
                >
                  <Icon name={t.i} size={18} color={on ? 'var(--cream)' : 'var(--sage-deep)'} />
                </span>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{t.t}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 3 }}>{t.d}</div>
              </button>
            );
          })}
        </div>

        {/* ── FAQ accordion + shortcuts / contact rail ──────────────── */}
        <div
          style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: 40, alignItems: 'flex-start' }}
          className="pl8-help-grid"
        >
          <div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--sage-deep)',
                marginBottom: 14,
              }}
            >
              {query.trim() ? `Answers for “${query.trim()}”` : 'Frequently asked'}
            </div>
            {visible.length === 0 ? (
              <div style={{ padding: 24, color: 'var(--ink-soft)', fontSize: 14, background: 'var(--cream-2)', borderRadius: 14 }}>
                No match. Try a different keyword, or{' '}
                <a href="mailto:hello@pearloom.com" style={{ color: 'var(--peach-ink)' }}>
                  email us
                </a>
                .
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visible.map((f, i) => {
                  const open = openIdx === i;
                  return (
                    <div
                      key={f.q}
                      style={{
                        background: 'var(--card)',
                        border: '1px solid var(--line-soft)',
                        borderRadius: 14,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenIdx(open ? null : i)}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          background: 'transparent',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          cursor: 'pointer',
                          color: 'var(--ink)',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontSize: 15, fontWeight: 600, fontFamily: DISPLAY }}>{f.q}</span>
                        <Icon
                          name="chev-down"
                          size={16}
                          style={{
                            flexShrink: 0,
                            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                            color: 'var(--ink-soft)',
                          }}
                        />
                      </button>
                      {open && (
                        <div style={{ padding: '0 20px 18px', fontSize: 14, color: 'var(--ink-soft)', lineHeight: 1.65 }}>
                          {f.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Shortcuts + contact */}
          <aside style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                background: 'var(--cream-2)',
                border: '1px solid var(--line-soft)',
                borderRadius: 16,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: 'var(--sage-deep)',
                  marginBottom: 12,
                }}
              >
                Keyboard shortcuts
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SHORTCUTS.map((s) => (
                  <div
                    key={s.label}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13, color: 'var(--ink-soft)' }}
                  >
                    <span>{s.label}</span>
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      {s.keys.map((k, i) => (
                        <kbd
                          key={i}
                          style={{
                            padding: '3px 8px',
                            minWidth: 22,
                            textAlign: 'center',
                            borderRadius: 6,
                            background: 'var(--card)',
                            border: '1px solid var(--line)',
                            fontSize: 11,
                            fontFamily: MONO,
                            color: 'var(--ink)',
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ask a person — the zip's warm support card. */}
            <div
              style={{
                background: 'var(--lavender-bg)',
                border: '1px solid var(--line-soft)',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                gap: 12,
              }}
            >
              <PearloomGlyph size={30} color="var(--lavender-ink)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontSize: 17, color: 'var(--ink)', marginBottom: 3 }}>
                  Still stuck? Ask a person.
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 12 }}>
                  Real humans, warm and quick, usually within a day.
                </div>
                <a
                  href="mailto:hello@pearloom.com"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 999,
                    background: 'var(--ink)',
                    color: 'var(--cream)',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <Icon name="mail" size={13} color="var(--cream)" /> Message support
                </a>
              </div>
            </div>

            <Link
              href="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--ink-soft)',
                textDecoration: 'none',
                padding: '6px 2px',
              }}
            >
              <Icon name="arrow-left" size={13} /> Back to dashboard
            </Link>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        @media (max-width: 900px) {
          .pl8-help-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashLayout>
  );
}
