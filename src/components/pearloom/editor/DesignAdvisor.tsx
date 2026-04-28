'use client';

// ─────────────────────────────────────────────────────────────
// DesignAdvisor (a.k.a. Pear Companion) — slide-in side panel
// where Pear reads the host's manifest and helps in plain
// language. Replaces the older "review-only" advisor with:
//
//   • Warmer header — breathing Pear avatar + Fraunces italic
//     greeting that flexes with what's on the site so far.
//   • Quick-action chips — "Review the site", "What's missing?",
//     "Polish my hero" — each fires a focused critique via the
//     existing /api/pear-critique with a framing nudge so Pear
//     knows what kind of pass to make.
//   • Suggestion cards with a "Take me there" jump that fires
//     `pearloom:design-jump` to the right panel block.
//   • Conversation flow — past suggestions stay in the panel as
//     small chips so the host can revisit Pear's earlier passes.
//
// Future iterations: real chat input + streaming, proactive
// nudges that surface without the host clicking, edit-on-accept.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from 'react';
import type { StoryManifest } from '@/types';
import { AISuggestButton, useAICall } from './ai';
import { Icon, Pear } from '../motifs';

type SuggestionCategory = 'palette' | 'typography' | 'content' | 'layout' | 'voice' | 'accessibility';
type SuggestionSeverity = 'info' | 'nice-to-have' | 'should-fix';

interface Suggestion {
  id: string;
  category: SuggestionCategory;
  severity: SuggestionSeverity;
  title: string;
  body: string;
  /** When set, "Take me there" jumps the editor to this section. */
  targetTab?: ApiCritique['tab'];
}

interface ApiCritique {
  id: string;
  level: 'warning' | 'suggestion';
  title: string;
  description: string;
  tab: 'details' | 'events' | 'story' | 'registry' | 'travel' | 'faq' | 'chapters';
}

const TAB_TO_CATEGORY: Record<ApiCritique['tab'], SuggestionCategory> = {
  details: 'content',
  events: 'content',
  story: 'voice',
  registry: 'content',
  travel: 'content',
  faq: 'content',
  chapters: 'voice',
};

// API tab → editor BlockKey. The pearloom:design-jump event
// expects a BlockKey from the editor's BLOCKS list. The story
// API tab maps to the editor's 'story' block.
const TAB_TO_BLOCK: Record<ApiCritique['tab'], string> = {
  details: 'details',
  events: 'schedule',
  story: 'story',
  registry: 'registry',
  travel: 'travel',
  faq: 'faq',
  chapters: 'story',
};

function adaptApiToLocal(api: ApiCritique): Suggestion {
  return {
    id: api.id,
    category: TAB_TO_CATEGORY[api.tab] ?? 'content',
    severity: api.level === 'warning' ? 'should-fix' : 'nice-to-have',
    title: api.title,
    body: api.description,
    targetTab: api.tab,
  };
}

type QuickActionKey = 'review' | 'missing' | 'polish-hero';

const QUICK_ACTIONS: Array<{ key: QuickActionKey; label: string; icon: string; helpful: string }> = [
  { key: 'review',      label: 'Review the site',  icon: 'sparkles', helpful: "I'll read every section + flag what's worth sharpening." },
  { key: 'missing',     label: "What's missing?",  icon: 'search',   helpful: "I'll scan for gaps — missing dates, dressed code, host info." },
  { key: 'polish-hero', label: 'Polish my hero',   icon: 'pencil',   helpful: 'A focused pass on the hero copy + names + tagline.' },
];

export function DesignAdvisor({
  manifest,
  names,
  open,
  onClose,
}: {
  manifest: StoryManifest;
  names: [string, string];
  open: boolean;
  onClose: () => void;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeAction, setActiveAction] = useState<QuickActionKey>('review');

  // Reset suggestions when the panel closes so reopening starts
  // with a fresh slate.
  useEffect(() => {
    if (!open) setSuggestions([]);
  }, [open]);

  // Greeting flexes with the manifest. If the host has barely
  // started, Pear nudges them to fill in basics. If the site is
  // far along, Pear offers polish. Generated once per panel open.
  const greeting = useMemo(() => {
    if (!open) return '';
    const fields = [
      manifest.logistics?.date,
      manifest.logistics?.venue,
      (manifest.chapters ?? []).length > 0,
      (manifest.events ?? []).length > 0,
      (manifest.faqs ?? []).length > 0,
    ];
    const filled = fields.filter(Boolean).length;
    if (filled <= 1) return "Just getting started — let's build the bones first. Date, venue, the basics. I can help with copy as you go.";
    if (filled <= 3) return "Coming together. I can spot what's still missing or polish what's already there — your pick.";
    return "Looking lovely so far. I can help refine the voice, polish the chapters, or suggest the small things hosts forget.";
  }, [manifest, open]);

  const { state, error, run } = useAICall(async () => {
    const res = await fetch('/api/pear-critique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manifest,
        coupleNames: names,
        intent: activeAction,
      }),
    });
    if (!res.ok) throw new Error(`Pear couldn't read the site (${res.status})`);
    const data = (await res.json()) as { suggestions?: Array<ApiCritique | Suggestion> };
    const raw = data.suggestions ?? [];
    if (!raw.length) throw new Error('No suggestions');
    const list: Suggestion[] = raw.map((item) => {
      if ('severity' in item && 'body' in item) return item as Suggestion;
      return adaptApiToLocal(item as ApiCritique);
    });
    setSuggestions(list);
    return list;
  });

  function jumpToTab(tab: ApiCritique['tab']) {
    if (typeof window === 'undefined') return;
    const block = TAB_TO_BLOCK[tab];
    if (!block) return;
    window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block } }));
    // Closing the panel here is intentional — once the host taps
    // "Take me there" they want to see the section, not sit on
    // Pear's panel obscuring it.
    onClose();
  }

  function runAction(action: QuickActionKey) {
    setActiveAction(action);
    setSuggestions([]);
    void run();
  }

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Pear, your design advisor"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.32)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9998,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'pl-pear-fade 200ms ease-out',
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(460px, 100vw)',
          height: '100%',
          background: 'var(--cream)',
          borderLeft: '1px solid var(--line-soft)',
          boxShadow: '-24px 0 60px rgba(14,13,11,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'pl-pear-slide 300ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Header — breathing Pear avatar + Fraunces italic greeting. */}
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            padding: '20px 22px 18px',
            borderBottom: '1px solid var(--line-soft)',
            background: 'var(--cream)',
            position: 'sticky',
            top: 0,
            zIndex: 2,
          }}
        >
          <div
            aria-hidden
            style={{
              flexShrink: 0,
              animation: 'pl-pear-breathe 4s ease-in-out infinite',
              transformOrigin: 'center bottom',
            }}
          >
            <Pear size={42} tone="sage" sparkle shadow={false} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.18em',
                color: 'var(--peach-ink)',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-ui)',
              }}
            >
              Pear
            </div>
            <p
              style={{
                margin: '2px 0 0',
                fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                fontStyle: 'italic',
                fontSize: 16,
                lineHeight: 1.4,
                color: 'var(--ink)',
                letterSpacing: '-0.005em',
              }}
            >
              {greeting}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 28,
              height: 28,
              display: 'grid',
              placeItems: 'center',
              background: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 999,
              cursor: 'pointer',
              color: 'var(--ink)',
              flexShrink: 0,
            }}
          >
            <Icon name="close" size={12} />
          </button>
        </header>

        {/* Quick-action chip rail. Each chip is one focused pass. */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            padding: '14px 22px 16px',
            borderBottom: '1px solid var(--line-soft)',
            background: 'var(--cream-2)',
          }}
        >
          {QUICK_ACTIONS.map((a) => {
            const on = activeAction === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => runAction(a.key)}
                disabled={state === 'running'}
                title={a.helpful}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 12px',
                  borderRadius: 999,
                  background: on ? 'var(--ink)' : 'var(--card)',
                  color: on ? 'var(--cream)' : 'var(--ink)',
                  border: on ? '1px solid var(--ink)' : '1px solid var(--line-soft)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: state === 'running' ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-ui)',
                  transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
                }}
              >
                <Icon name={a.icon} size={11} />
                {a.label}
              </button>
            );
          })}
        </div>

        {/* Body — review affordance + suggestion stream. */}
        <div style={{ padding: '18px 22px 28px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
          <AISuggestButton
            label={suggestions.length ? 'Review again' : 'Ask Pear'}
            runningLabel="Pear is reading…"
            state={state}
            onClick={() => void run()}
            error={error ?? undefined}
          />

          {state === 'idle' && suggestions.length === 0 && (
            <div
              style={{
                padding: '20px 18px',
                background: 'var(--card)',
                border: '1px dashed var(--line)',
                borderRadius: 14,
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: 'var(--ink-soft)',
                  lineHeight: 1.5,
                }}
              >
                Pick one of the chips above, or just press “Ask Pear” — I'll do a full review.
              </p>
            </div>
          )}

          {suggestions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {suggestions.map((s) => (
                <article
                  key={s.id}
                  style={{
                    padding: 16,
                    background: 'var(--card)',
                    border: '1px solid var(--card-ring)',
                    borderRadius: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 999,
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        background:
                          s.severity === 'should-fix'
                            ? 'rgba(122,45,45,0.10)'
                            : s.severity === 'nice-to-have'
                              ? 'var(--peach-bg, rgba(198,112,61,0.10))'
                              : 'var(--cream-2)',
                        color:
                          s.severity === 'should-fix'
                            ? '#7A2D2D'
                            : s.severity === 'nice-to-have'
                              ? 'var(--peach-ink, #C6703D)'
                              : 'var(--ink-soft)',
                      }}
                    >
                      {s.severity === 'should-fix' ? 'Worth fixing' : s.severity === 'nice-to-have' ? 'A nudge' : 'Note'}
                    </span>
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-muted)',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {s.category}
                    </span>
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                      fontWeight: 500,
                      fontSize: 16,
                      letterSpacing: '-0.005em',
                      color: 'var(--ink)',
                      lineHeight: 1.3,
                    }}
                  >
                    {s.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: 'var(--ink-soft)',
                      lineHeight: 1.55,
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {s.body}
                  </p>
                  {s.targetTab && (
                    <button
                      type="button"
                      onClick={() => jumpToTab(s.targetTab!)}
                      style={{
                        alignSelf: 'flex-start',
                        marginTop: 4,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 999,
                        background: 'transparent',
                        border: '1px solid var(--peach-ink, #C6703D)',
                        color: 'var(--peach-ink, #C6703D)',
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: 'var(--font-ui)',
                        transition: 'background 160ms ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--peach-bg, rgba(198,112,61,0.08))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      Take me there
                      <Icon name="arrow-right" size={11} />
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <style jsx global>{`
          @keyframes pl-pear-fade {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes pl-pear-slide {
            from { transform: translateX(20px); opacity: 0; }
            to   { transform: translateX(0); opacity: 1; }
          }
          @keyframes pl-pear-breathe {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.04); }
          }
          @media (prefers-reduced-motion: reduce) {
            [aria-label="Pear, your design advisor"] aside { animation: none; }
            [aria-label="Pear, your design advisor"] { animation: none; }
            .pl-pear-breathe { animation: none !important; }
          }
        `}</style>
      </aside>
    </div>
  );
}
