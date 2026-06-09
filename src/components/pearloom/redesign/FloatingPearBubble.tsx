'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L982-1062. */

import { useState } from 'react';
import { Icon, Pear } from '../motifs';
import { PearThinking } from '../pear-thinking';
import { pearErrorMessage } from './PearAssist';
import type { SectionId } from './EditorRedesign';
import type { StoryManifest } from '@/types';

interface Props {
  active: SectionId;
  /** Optional — when set, "Yes, try it" calls into /api/pear-critique
   *  with the current section + manifest context. The route returns
   *  navigation suggestions (not a manifest patch); the first
   *  suggestion is surfaced as a "Jump to <tab>" CTA via onJumpTab. */
  manifest?: StoryManifest;
  /** Required by /api/pear-critique's schema. Used to summarise the
   *  manifest in the critique prompt. */
  names?: [string, string];
  onApplyPatch?: (m: StoryManifest) => void;
  onJumpTab?: (tab: string, hint: string) => void;
  onAskMore?: (text: string) => void;
}

interface Suggestion {
  id: string;
  level: 'critical' | 'warning' | 'tip';
  title: string;
  description: string;
  tab: string;
}

const NUDGES: Record<string, string> = {
  hero:    'Your tagline is doing a lot of work. Want me to try 3 alternatives?',
  rsvp:    "You haven't set a reminder cadence yet. I drafted one — want to review?",
  gallery: '38 photos! I can pick the 12 strongest for the homepage strip.',
  default: 'I noticed your schedule has gaps — want me to rebalance the timeline?',
};

export function FloatingPearBubble({ active, manifest, names, onJumpTab, onAskMore }: Props) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  /* When tryIt returns a suggestion, surface it as a follow-up
     card with a "Jump to <tab>" CTA instead of silently applying
     a non-existent patch. */
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  if (dismissed) return null;

  const nudge = active ? NUDGES[active] ?? NUDGES.default : NUDGES.default;

  async function tryIt() {
    if (!manifest) return;
    setBusy(true); setErr(null);
    try {
      /* /api/pear-critique requires { manifest, coupleNames } per
         the route's request schema (route.ts:323). Without
         coupleNames the call 400's. */
      const res = await fetch('/api/pear-critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest,
          coupleNames: names ?? ['Couple', ''],
          intent: active ? `polish-${active}` : 'review',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[pear-bubble] critique failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'Pear couldn’t think that one through — try again?');
      }
      const data = await res.json() as { suggestions?: Suggestion[] };
      const first = data.suggestions?.[0];
      if (first) {
        setSuggestion(first);
      } else {
        setErr('Pear had nothing to add right now.');
      }
    } catch (e) {
      console.error('[pear-bubble] critique error:', e);
      setErr(pearErrorMessage(e, 'Pear couldn’t think that one through — try again?'));
    } finally {
      setBusy(false);
    }
  }

  function jumpToSuggestion() {
    if (!suggestion) return;
    if (onJumpTab) onJumpTab(suggestion.tab, suggestion.description);
    /* Also emit a window event the editor shell listens for, so
       consumers without the prop wired still react. */
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pearloom:jump-to-tab', {
        detail: { tab: suggestion.tab, hint: suggestion.description },
      }));
    }
    setDismissed(true);
  }

  function send() {
    if (!draft.trim() || !onAskMore) return;
    onAskMore(draft.trim());
    setDraft('');
    setDismissed(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pl-rd-pop-in"
        style={{
          position: 'absolute',
          bottom: 24, right: 24,
          padding: '10px 14px 10px 10px',
          borderRadius: 999,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex', alignItems: 'center', gap: 10,
          zIndex: 20,
          cursor: 'pointer',
        }}
      >
        <Pear size={28} tone="sage" sparkle shadow={false} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
          Pear has a thought
        </span>
        <span
          style={{
            width: 7, height: 7,
            background: 'var(--peach-ink)',
            borderRadius: '50%',
            animation: 'pl-dot-pulse 1.4s ease-in-out infinite',
          }}
        />
      </button>
    );
  }

  return (
    <div
      className="pl-rd-pop-in"
      style={{
        position: 'absolute',
        bottom: 24, right: 24,
        width: 320,
        background: 'var(--card)',
        border: '1px solid var(--line)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 14px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Pear size={22} tone="sage" sparkle shadow={false} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Pear</span>
          <span
            style={{
              fontSize: 10.5,
              color: 'var(--ink-muted)',
              padding: '1px 6px',
              borderRadius: 999,
              background: 'var(--cream-2)',
            }}
          >
            watching
          </span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Minimise"
            style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="minus" size={13} color="var(--ink-soft)" />
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <Icon name="close" size={13} color="var(--ink-soft)" />
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 14px' }}>
        {suggestion ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
              {suggestion.title}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 10 }}>
              {suggestion.description}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button
                type="button"
                onClick={jumpToSuggestion}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
              >
                Jump to {suggestion.tab}
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="btn btn-outline btn-sm"
                style={{ fontSize: 12 }}
              >
                Dismiss
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45, marginBottom: 10 }}>
              {nudge}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button
                type="button"
                onClick={tryIt}
                disabled={busy || !manifest}
                className="btn btn-primary btn-sm"
                style={{ flex: 1, justifyContent: 'center', fontSize: 12, opacity: busy ? 0.7 : 1 }}
              >
                {busy ? (
                  <PearThinking
                    active
                    size="sm"
                    label="Pear is thinking"
                    color="currentColor"
                    style={{ padding: 0 }}
                  />
                ) : 'Yes, try it'}
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                className="btn btn-outline btn-sm"
                style={{ fontSize: 12 }}
              >
                Not now
              </button>
            </div>
          </>
        )}
        {err && (
          <div style={{ padding: '6px 10px', borderRadius: 7, background: 'var(--pl-chrome-danger-soft, rgba(122,45,45,0.08))', fontSize: 11, color: 'var(--pl-chrome-danger, #7A2D2D)', marginBottom: 8 }}>
            {err}
          </div>
        )}
        <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 10 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            placeholder="Or ask something else…"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 999,
              border: '1px solid var(--line)',
              background: 'var(--cream-2)',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
