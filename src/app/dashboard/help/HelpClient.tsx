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
  ArrowLeft,
  Search,
  Sparkles,
  Mail,
  Keyboard,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { PageCard, ThemeToggle } from '@/components/shell';

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

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pl-cream)',
      }}
    >
      {/* Editorial top bar */}
      <header
        style={{
          height: 60,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 clamp(16px, 4vw, 32px)',
          borderBottom: '1px solid var(--pl-divider)',
          background: 'color-mix(in oklab, var(--pl-cream) 88%, transparent)',
          backdropFilter: 'saturate(140%) blur(14px)',
          WebkitBackdropFilter: 'saturate(140%) blur(14px)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link
            href="/dashboard"
            style={{
              fontFamily: 'var(--pl-font-display)',
              fontSize: '1.05rem',
              color: 'var(--pl-ink)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Pearloom
          </Link>
          <span
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.62rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--pl-muted)',
            }}
          >
            Help · Docs
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />
          <Link
            href="/dashboard"
            style={{
              fontSize: '0.78rem',
              color: 'var(--pl-muted)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ArrowLeft size={12} /> Back
          </Link>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>
        <main style={{ flex: 1, overflow: 'auto' }}>
          <div
            style={{
              maxWidth: 980,
              margin: '0 auto',
              padding: 'clamp(24px, 4vh, 56px) clamp(16px, 4vw, 40px)',
            }}
          >
            {/* Editorial hero */}
            <div
              style={{
                marginBottom: 36,
                paddingBottom: 28,
                borderBottom: '1px solid var(--pl-divider)',
              }}
            >
              <div
                className="pl-overline"
                style={{ marginBottom: 14, display: 'inline-flex', gap: 12 }}
              >
                <span
                  style={{
                    width: 18,
                    height: 1,
                    background: 'var(--pl-gold)',
                    alignSelf: 'center',
                  }}
                />
                Pearloom · Help
              </div>
              <h1
                className="pl-display"
                style={{
                  margin: 0,
                  fontSize: 'clamp(2rem, 4.2vw, 3.2rem)',
                  color: 'var(--pl-ink)',
                  lineHeight: 1.02,
                  letterSpacing: '-0.02em',
                  maxWidth: '18ch',
                }}
              >
                Answers, gently{' '}
                <em
                  style={{
                    color: 'var(--pl-olive)',
                    fontStyle: 'italic',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  indexed.
                </em>
              </h1>
              <p
                style={{
                  margin: '14px 0 0',
                  maxWidth: '56ch',
                  color: 'var(--pl-ink-soft)',
                  fontSize: 'clamp(0.96rem, 1.2vw, 1.06rem)',
                  lineHeight: 1.6,
                }}
              >
                Host-facing docs — not the public FAQ. For anything a search
                can&apos;t solve, our team answers every email inside a day.
              </p>

              {/* Search */}
              <div style={{ marginTop: 28, maxWidth: 480 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '12px 16px',
                    background: 'var(--pl-cream-card)',
                    border: '1px solid var(--pl-divider)',
                    borderRadius: 'var(--pl-radius-full)',
                    boxShadow: 'var(--pl-shadow-sm)',
                  }}
                >
                  <Search size={15} color="var(--pl-muted)" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search help…"
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      outline: 'none',
                      fontSize: '0.92rem',
                      fontFamily: 'var(--pl-font-body)',
                      color: 'var(--pl-ink)',
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Quick actions row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 14,
                marginBottom: 36,
              }}
            >
              <QuickTile
                href="/dashboard/director"
                icon={<Sparkles size={16} />}
                eyebrow="AI · Director"
                title="Ask the planner"
                description="Budgets, vendors, timelines."
                accent="olive"
              />
              <QuickTile
                href="mailto:help@pearloom.com"
                icon={<Mail size={16} />}
                eyebrow="Email · &lt; 1 day"
                title="Write the team"
                description="help@pearloom.com"
                accent="gold"
              />
              <QuickTile
                href="#shortcuts"
                icon={<Keyboard size={16} />}
                eyebrow="Editor"
                title="Keyboard shortcuts"
                description="Jump faster."
                accent="plum"
              />
            </div>

            {/* FAQ */}
            <div id="faq" style={{ marginBottom: 48 }}>
              <div
                className="pl-overline"
                style={{ marginBottom: 14, fontSize: '0.62rem' }}
              >
                Common questions
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {visible.length === 0 ? (
                  <div
                    style={{
                      padding: 32,
                      textAlign: 'center',
                      color: 'var(--pl-muted)',
                      fontSize: '0.92rem',
                      fontStyle: 'italic',
                      fontFamily: 'var(--pl-font-display)',
                      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                      border: '1px dashed var(--pl-divider)',
                      borderRadius: 'var(--pl-radius-lg)',
                    }}
                  >
                    Nothing matches &ldquo;{query}&rdquo;. Try emailing us instead.
                  </div>
                ) : (
                  visible.map((f, i) => (
                    <FaqRow
                      key={f.q}
                      entry={f}
                      open={openIdx === i}
                      onToggle={() => setOpenIdx(openIdx === i ? null : i)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Shortcuts */}
            <div id="shortcuts" style={{ marginBottom: 48 }}>
              <PageCard
                eyebrow="Editor shortcuts"
                title="Keys that save the day"
                padding="md"
                accent="plum"
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 12,
                  }}
                >
                  {SHORTCUTS.map((s) => (
                    <div
                      key={s.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        background: 'var(--pl-cream-deep)',
                        borderRadius: 'var(--pl-radius-md)',
                        fontSize: '0.88rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          gap: 4,
                          flexShrink: 0,
                        }}
                      >
                        {s.keys.map((k) => (
                          <kbd
                            key={k}
                            style={{
                              padding: '3px 8px',
                              fontFamily: 'var(--pl-font-mono)',
                              fontSize: '0.74rem',
                              background: 'var(--pl-cream-card)',
                              border: '1px solid var(--pl-divider)',
                              borderRadius: 6,
                              color: 'var(--pl-ink)',
                              minWidth: 20,
                              textAlign: 'center',
                            }}
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                      <span style={{ color: 'var(--pl-ink-soft)' }}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </PageCard>
            </div>

            {/* Still stuck */}
            <PageCard
              variant="inset"
              padding="lg"
              style={{ textAlign: 'center' }}
            >
              <div style={{ maxWidth: 460, margin: '0 auto' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--pl-olive-mist)',
                    color: 'var(--pl-olive)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}
                >
                  <MessageCircle size={20} />
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--pl-font-display)',
                    fontSize: '1.4rem',
                    margin: 0,
                    color: 'var(--pl-ink)',
                    fontStyle: 'italic',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  Still stuck?
                </h3>
                <p
                  style={{
                    margin: '8px 0 18px',
                    color: 'var(--pl-ink-soft)',
                    fontSize: '0.94rem',
                    lineHeight: 1.55,
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
                    gap: 8,
                    padding: '10px 20px',
                    background: 'var(--pl-ink)',
                    color: 'var(--pl-cream)',
                    borderRadius: 'var(--pl-radius-full)',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  <Mail size={14} />
                  help@pearloom.com
                </a>
              </div>
            </PageCard>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Subcomponents ──────────────────────────────────────────

function QuickTile({
  href,
  icon,
  eyebrow,
  title,
  description,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  accent: 'olive' | 'gold' | 'plum';
}) {
  const accentColor =
    accent === 'olive'
      ? 'var(--pl-olive)'
      : accent === 'gold'
        ? 'var(--pl-gold)'
        : 'var(--pl-plum)';
  const tint =
    accent === 'olive'
      ? 'var(--pl-olive-mist)'
      : accent === 'gold'
        ? 'color-mix(in oklab, var(--pl-gold) 12%, transparent)'
        : 'color-mix(in oklab, var(--pl-plum) 10%, transparent)';
  return (
    <Link
      href={href}
      style={{
        position: 'relative',
        display: 'block',
        padding: 18,
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 'var(--pl-radius-lg)',
        textDecoration: 'none',
        transition:
          'transform var(--pl-dur-fast) var(--pl-ease-spring), box-shadow var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--pl-shadow-md)';
        e.currentTarget.style.borderColor = accentColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--pl-divider)';
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: accentColor,
        }}
      />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: tint,
          color: accentColor,
          marginBottom: 12,
        }}
      >
        {icon}
      </span>
      <div
        className="pl-overline"
        style={{ marginBottom: 4, fontSize: '0.58rem' }}
      >
        {eyebrow}
      </div>
      <div
        style={{
          fontFamily: 'var(--pl-font-display)',
          fontSize: '1.05rem',
          color: 'var(--pl-ink)',
          letterSpacing: '-0.01em',
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: '0.82rem', color: 'var(--pl-muted)' }}>
        {description}
      </div>
    </Link>
  );
}

function FaqRow({
  entry,
  open,
  onToggle,
}: {
  entry: FaqEntry;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 'var(--pl-radius-lg)',
        overflow: 'hidden',
        transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out)',
        borderColor: open ? 'var(--pl-olive)' : 'var(--pl-divider)',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          padding: '16px 20px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          color: 'var(--pl-ink)',
          fontFamily: 'inherit',
          fontSize: '0.98rem',
          fontWeight: 500,
          letterSpacing: '-0.005em',
        }}
      >
        <span>{entry.q}</span>
        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            color: 'var(--pl-muted)',
            transition: 'transform var(--pl-dur-fast) var(--pl-ease-out)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {open && (
        <div
          style={{
            padding: '0 20px 18px',
            color: 'var(--pl-ink-soft)',
            fontSize: '0.92rem',
            lineHeight: 1.6,
            maxWidth: '64ch',
          }}
        >
          {entry.a}
        </div>
      )}
    </div>
  );
}
