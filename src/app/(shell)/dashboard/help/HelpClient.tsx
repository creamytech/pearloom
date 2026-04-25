'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/help/HelpClient.tsx
// V8-styled help centre — cream paper, sage accents, Fraunces
// display. Matches the rest of the dashboard + editor.
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { Icon, Pear, Sparkle } from '@/components/pearloom/motifs';

interface FaqEntry {
  q: string;
  a: string;
  tags: string[];
}

const FAQ: FaqEntry[] = [
  { q: 'How do I create my first site?', a: 'From the dashboard, click "New Site" and answer a few questions about your occasion, names, and date. Pear drafts a site in about twenty seconds; you can edit every block after.', tags: ['start', 'site'] },
  { q: 'Can I change the theme after the site is generated?', a: 'Yes. Open the editor and use the Theme panel. Swap fonts, palettes, and the decor library without regenerating. Your words and photos are preserved.', tags: ['theme', 'editor'] },
  { q: 'How do I invite guests to RSVP?', a: 'Open your site in the editor and keep the RSVP block visible. Publish, then share the public URL. Guest responses show up in Dashboard → Guests with meal preferences and plus-ones.', tags: ['rsvp', 'guests'] },
  { q: 'What does the Director do?', a: 'The Director is your AI event planner — budgets, venues, vendors, timelines, and a checklist in one conversation. Open Dashboard → Director and choose a site to get started.', tags: ['director', 'ai'] },
  { q: 'How do photo uploads work?', a: 'Guests upload via the Photo Wall block on your site. You can curate everything in Dashboard → Gallery — hide, star, or download originals. Storage scales with your plan.', tags: ['photos', 'gallery'] },
  { q: 'Can guests leave voice toasts?', a: 'Yes. Add the Guestbook block with voice enabled. Toasts appear in Dashboard → Day-of for you to approve, reject, or feature on the day.', tags: ['guests', 'day-of'] },
  { q: 'How do I publish and share my site?', a: 'In the editor, hit Publish. Your site goes live at pearloom.com/{occasion}/{yourname} (e.g. /wedding/alex-and-jamie) instantly. Attach a custom domain from Dashboard → Profile → Domains.', tags: ['publish', 'domain'] },
  { q: 'What happens after the event?', a: 'Your site stays online forever on every plan, including the free tier. Guests can keep leaving memories, and you can download everything as a keepsake film or zip.', tags: ['after', 'keepsake'] },
  { q: 'Can I collaborate with a partner or planner?', a: 'Yes. Open Dashboard → Profile → Collaborators and invite them by email. Everyone you invite can edit the site and run day-of ops with you.', tags: ['team', 'collab'] },
  { q: 'How do I cancel or change my plan?', a: "Dashboard → Profile → Billing. You keep everything you've created on any tier — no lock-in.", tags: ['billing'] },
];

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['⌘', 'K'], label: 'Open Pear command bar' },
  { keys: ['⌘', 'S'], label: 'Save manifest in editor' },
  { keys: ['⌘', 'Z'], label: 'Undo' },
  { keys: ['⌘', '⇧', 'Z'], label: 'Redo' },
  { keys: ['⌘', '.'], label: 'Toggle block library drawer' },
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

  return (
    <DashLayout
      active="help"
      title="Help & docs"
      subtitle="Shortcuts, recipes, and answers — the way Pear explains them."
    >
      <div className="pl8" style={{ padding: '0 32px 56px', maxWidth: 980, margin: '0 auto', position: 'relative' }}>
        {/* Editorial masthead */}
        <header
          style={{
            position: 'relative',
            marginBottom: 36,
            paddingBottom: 28,
            borderBottom: '1px solid var(--line-soft)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink)',
              marginBottom: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Sparkle size={12} /> The help centre
          </div>
          <h1
            className="display"
            style={{ fontSize: 'clamp(40px, 6vw, 60px)', margin: 0, lineHeight: 1.05, color: 'var(--ink)' }}
          >
            Answers, <span className="display-italic">at a glance.</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-soft)', marginTop: 10, maxWidth: 560, lineHeight: 1.6 }}>
            Real host questions, answered the way Pear would. Search by keyword or skim the list.
          </p>

          <div
            style={{
              position: 'relative',
              marginTop: 20,
              maxWidth: 480,
            }}
          >
            <Icon
              name="search"
              size={15}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)' }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: rsvp, domain, theme, photos…"
              style={{
                width: '100%',
                padding: '12px 16px 12px 38px',
                borderRadius: 12,
                border: '1px solid var(--line)',
                background: 'var(--card)',
                fontSize: 14,
                color: 'var(--ink)',
                outline: 'none',
              }}
            />
          </div>
        </header>

        {/* Two-column on desktop, stacked on mobile */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 280px',
            gap: 40,
            alignItems: 'flex-start',
          }}
          className="pl8-help-grid"
        >
          {/* FAQ accordion */}
          <div>
            <div
              style={{
                fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--sage-deep)',
                marginBottom: 14,
              }}
            >
              Frequently asked
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
                        <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--pl-font-display, Georgia, serif)' }}>
                          {f.q}
                        </span>
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
                        <div
                          style={{
                            padding: '0 20px 18px',
                            fontSize: 14,
                            color: 'var(--ink-soft)',
                            lineHeight: 1.65,
                          }}
                        >
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
                  fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontSize: 13,
                      color: 'var(--ink-soft)',
                    }}
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
                            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
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

            <div
              style={{
                background: 'var(--sage-tint)',
                border: '1px solid var(--sage-deep)',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                gap: 12,
              }}
            >
              <Pear size={36} tone="sage" sparkle />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sage-deep)', marginBottom: 4 }}>
                  Still stuck?
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 10 }}>
                  Real humans, quick replies. We answer inside a day.
                </div>
                <a
                  href="mailto:hello@pearloom.com"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: 'var(--ink)',
                    color: 'var(--cream)',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <Icon name="mail" size={13} /> hello@pearloom.com
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

      <style jsx>{`
        @media (max-width: 900px) {
          .pl8-help-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </DashLayout>
  );
}
