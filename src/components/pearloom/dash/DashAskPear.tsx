'use client';

// ─────────────────────────────────────────────────────────────
// DashAskPear — the dashboard's help desk. One quiet "Ask Pear"
// entry in the dashboard chrome (DashUtilityBar on desktop,
// DashMobileBar on phones) opens a small floating glass sheet
// where Pear answers BOTH product how-to questions ("how do I
// add a section?") and live questions about the host's own
// event ("who hasn't replied?").
//
// Streams from /api/pear-chat with mode='host' + the selected
// site's slug — the same route the editor's Pear pill and the
// published-site concierge use. The host-mode system prompt
// carries the /dashboard/help FAQ (src/lib/help-faq.ts) so
// product answers are grounded, and live activity stats so
// "what should I do next?" gets real numbers.
//
// Glass is the material of floating chrome (BRAND §9) — the
// sheet wears .pl-glass-surface-heavy over the paper. It's a
// small floating sheet, not a modal: body scroll stays free;
// the thread contains its own overscroll. Esc closes.
//
// Open state is a module-level store (useSyncExternalStore,
// same pattern as useDashDrawer — React Compiler-safe) so the
// two triggers and the sheet share it without a provider.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import type { StoryManifest } from '@/types';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { pearErrorMessage } from '../redesign/PearAssist';
import { PearThinking } from '../pear-thinking';
import { Pear } from '../motifs';

/* ─── Module-level open store ───────────────────────────────── */

let isOpen = false;
const subs = new Set<() => void>();
function notify() {
  subs.forEach((fn) => fn());
}
function subscribe(cb: () => void): () => void {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}
const getSnapshot = () => isOpen;
const getServerSnapshot = () => false;

export function setAskPearOpen(open: boolean) {
  if (isOpen === open) return;
  isOpen = open;
  notify();
}
export function toggleAskPear() {
  setAskPearOpen(!isOpen);
}
export function useAskPearOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ─── Trigger — mounted in DashUtilityBar + DashMobileBar ───── */

export function AskPearTrigger({ variant = 'labeled' }: { variant?: 'labeled' | 'icon' }) {
  const open = useAskPearOpen();
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleAskPear}
        aria-label="Ask Pear"
        aria-expanded={open}
        title="Ask Pear"
        style={{
          width: 38,
          height: 38,
          borderRadius: 999,
          border: `1px solid ${open ? 'var(--peach-ink, #C6703D)' : 'var(--line)'}`,
          background: open ? 'var(--peach-bg, #FBE8D6)' : 'var(--card)',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <Pear size={18} tone="peach" shadow={false} />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={toggleAskPear}
      aria-label="Ask Pear"
      aria-expanded={open}
      title="Ask Pear"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 12px',
        borderRadius: 999,
        border: `1px solid ${open ? 'var(--peach-ink, #C6703D)' : 'var(--line)'}`,
        background: open ? 'var(--peach-bg, #FBE8D6)' : 'var(--card)',
        color: open ? 'var(--peach-ink, #C6703D)' : 'var(--ink-soft)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui, inherit)',
        fontSize: 12.5,
        fontWeight: 600,
        flexShrink: 0,
        transition: 'border-color 160ms ease, background 160ms ease',
      }}
    >
      <Pear size={16} tone="peach" shadow={false} />
      <span className="pl8-askpear-trigger-label">Ask Pear</span>
      <style jsx>{`
        @media (max-width: 1180px) {
          .pl8-askpear-trigger-label {
            display: none;
          }
        }
      `}</style>
    </button>
  );
}

/* ─── The sheet ─────────────────────────────────────────────── */

interface Message {
  id: string;
  role: 'user' | 'pear';
  content: string;
}

const STARTER_PROMPTS = [
  'What should I do next?',
  'How do I add a section?',
  "Who hasn't replied?",
];

/** Host-mode replies may end with a fenced `pearloom:patch` /
 *  `pearloom:followups` envelope. The dashboard can't apply
 *  patches, so we show the prose only — cut at the first fence
 *  (envelopes always come at the END per the system prompt). */
function visibleContent(raw: string): { text: string; hadPatch: boolean } {
  const idx = raw.indexOf('```');
  if (idx === -1) return { text: raw, hadPatch: false };
  return {
    text: raw.slice(0, idx).trimEnd(),
    hadPatch: raw.slice(idx).includes('pearloom:patch'),
  };
}

export function DashAskPear() {
  const open = useAskPearOpen();
  const { site } = useSelectedSite();
  const [chat, setChat] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Esc closes. Window-level so it works wherever focus sits —
  // the sheet floats, it doesn't trap focus.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAskPearOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat, streaming]);

  async function send(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || streaming) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    const pearId = `p-${Date.now()}`;
    setChat((c) => [...c, userMsg, { id: pearId, role: 'pear', content: '' }]);
    setDraft('');
    setStreaming(true);
    setError(null);
    try {
      const manifest = (site?.manifest ?? {}) as StoryManifest;
      const coupleNames: [string, string] =
        site?.names && site.names[0]
          ? [site.names[0], site.names[1] ?? '']
          : ['The host', 'their people'];
      const r = await fetch('/api/pear-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest,
          coupleNames,
          prompt: trimmed,
          history: chat.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          mode: 'host',
          siteSlug: site?.domain,
        }),
      });
      if (!r.ok || !r.body) {
        const data = await r.json().catch(() => null);
        console.error('[DashAskPear] request failed:', r.status);
        throw new Error((data as { error?: string } | null)?.error ?? 'Pear couldn’t answer that one, try again in a moment.');
      }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const line = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          try {
            const ev = JSON.parse(line.slice(6)) as { delta?: string; done?: boolean; error?: string };
            if (ev.error) throw new Error(ev.error);
            if (ev.delta) {
              acc += ev.delta;
              setChat((c) => c.map((m) => (m.id === pearId ? { ...m, content: acc } : m)));
            }
          } catch {
            // ignore frame-parse errors
          }
        }
      }
    } catch (e) {
      console.error('[DashAskPear] failed:', e);
      setError(pearErrorMessage(e, 'Pear couldn’t answer that one, try again in a moment.'));
      setChat((c) => c.filter((m) => m.id !== pearId));
    } finally {
      setStreaming(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-label="Ask Pear"
      className="pl8 pl-glass-surface-heavy pl8-askpear-sheet"
      style={{
        position: 'fixed',
        bottom: 18,
        right: 18,
        zIndex: 85,
        width: 'min(380px, calc(100vw - 36px))',
        maxHeight: 'min(560px, 72vh)',
        borderRadius: 18,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-ui)',
        animation: 'pl8-askpear-rise 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 14px',
          borderBottom: '1px solid var(--line-soft)',
          flexShrink: 0,
        }}
      >
        <Pear size={22} tone="peach" sparkle />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--peach-ink, #C6703D)',
            }}
          >
            Ask Pear
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--ink)',
              fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
              fontStyle: 'italic',
              lineHeight: 1.2,
            }}
          >
            Your event, and how everything works.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAskPearOpen(false)}
          aria-label="Close"
          style={{
            width: 26,
            height: 26,
            padding: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-muted)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          ×
        </button>
      </div>

      {/* Thread */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 180,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          padding: '14px 14px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {chat.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Ask me anything, where your RSVPs stand, what to do next, or how a
              tool works. I&apos;ll keep it short.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {STARTER_PROMPTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 999,
                    background: 'var(--peach-bg, #FBE8D6)',
                    color: 'var(--peach-ink, #C6703D)',
                    border: '1px solid var(--peach-ink, #C6703D)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-ui, inherit)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.map((m) => {
            if (m.role === 'user') {
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: 'flex-end',
                    maxWidth: '90%',
                    padding: '8px 12px',
                    borderRadius: 12,
                    background: 'var(--peach-bg, #FBE8D6)',
                    border: '1px solid var(--line-soft)',
                    color: 'var(--ink)',
                    fontSize: 13,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.content}
                </div>
              );
            }
            const { text, hadPatch } = visibleContent(m.content);
            return (
              <div
                key={m.id}
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '90%',
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: 'var(--card)',
                  border: '1px solid var(--line-soft)',
                  color: 'var(--ink)',
                  fontSize: 13,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {text || <PearThinking active label="threading" size="sm" hideAvatar />}
                {hadPatch && !streaming && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11.5,
                      fontStyle: 'italic',
                      color: 'var(--ink-muted)',
                    }}
                  >
                    Pear drafted an edit, open your site in the editor to apply
                    changes like this.
                  </div>
                )}
              </div>
            );
          })
        )}
        {error && (
          <div
            role="alert"
            style={{
              alignSelf: 'flex-start',
              padding: '6px 12px',
              borderRadius: 10,
              background: 'var(--pl-chrome-danger-soft, rgba(122,45,45,0.08))',
              border: '1px solid var(--line-soft)',
              fontSize: 12,
              color: 'var(--pl-chrome-danger, #7A2D2D)',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderTop: '1px solid var(--line-soft)',
          flexShrink: 0,
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Pear…"
          disabled={streaming}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '8px 12px',
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 999,
            fontSize: 13,
            color: 'var(--ink)',
            outline: 'none',
            fontFamily: 'var(--font-ui, inherit)',
          }}
        />
        <button
          type="submit"
          disabled={streaming || !draft.trim()}
          aria-label="Send"
          style={{
            width: 32,
            height: 32,
            padding: 0,
            borderRadius: 999,
            background: 'var(--peach-ink, #C6703D)',
            color: 'var(--cream, #F5EFE2)',
            border: 'none',
            cursor: streaming ? 'wait' : 'pointer',
            opacity: streaming || !draft.trim() ? 0.5 : 1,
            display: 'grid',
            placeItems: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </form>
      <style jsx global>{`
        @keyframes pl8-askpear-rise {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .pl8-askpear-sheet {
            animation: none !important;
          }
        }
        @media (max-width: 640px) {
          /* Full-width bottom sheet on phones. */
          .pl8-askpear-sheet {
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            max-height: 76vh !important;
            border-radius: 18px 18px 0 0 !important;
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}
