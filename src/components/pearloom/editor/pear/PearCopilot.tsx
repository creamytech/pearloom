'use client';

// ─────────────────────────────────────────────────────────────
// PearCopilot — always-on editor assistant.
//
// Reads the live manifest, ranks what to do next, and exposes
// one-tap actions. Collapses to a floating pill in the corner;
// expands to a panel with:
//   • Site completeness % bar
//   • Top 3–5 smart suggestions with Apply buttons
//   • Free-form chat that can also execute actions
//
// Replaces the old AICommandBar + DesignAdvisor shortcuts.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { analyzeSite, describeSite, type Suggestion, type SiteAnalysis } from '@/lib/editor-intelligence/analyze';
import { runPearAction, type PearActionContext } from './actions';
import { Icon, Pear, Sparkle } from '../../motifs';

interface ChatMessage {
  role: 'user' | 'assistant' | 'pear';
  text: string;
  action?: { label: string; result: string };
}

export function PearCopilot({
  manifest,
  names,
  siteSlug,
  onPatchManifest,
  onJumpBlock,
  onOpenPanel,
  onOpenPreview,
  onPublish,
}: {
  manifest: StoryManifest;
  names?: [string, string];
  siteSlug: string;
  onPatchManifest: (next: StoryManifest) => void;
  onJumpBlock: (key: string) => void;
  onOpenPanel?: (panel: string) => void;
  onOpenPreview?: () => void;
  onPublish?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const analysis: SiteAnalysis = useMemo(() => analyzeSite(manifest, names), [manifest, names]);
  const ctx: PearActionContext = useMemo(
    () => ({ manifest, names, siteSlug, onPatchManifest, onJumpBlock, onOpenPanel, onOpenPreview, onPublish }),
    [manifest, names, siteSlug, onPatchManifest, onJumpBlock, onOpenPanel, onOpenPreview, onPublish],
  );

  // Auto-dismiss toasts after 2.5s.
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chat]);

  const runSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      setWorking(suggestion.id);
      const result = await runPearAction(suggestion.action, ctx);
      setWorking(null);
      setToast(result.ok ? result.message ?? 'Done' : result.error);
    },
    [ctx],
  );

  const sendChat = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setChat((c) => [...c, { role: 'user', text }]);

    const description = describeSite(analysis, manifest, names);
    try {
      const r = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          manifest,
          names,
          siteState: description,
          analysis: { completeness: analysis.completeness, flags: analysis.flags },
        }),
      });
      if (!r.ok) {
        setChat((c) => [...c, { role: 'pear', text: "I couldn't reach that one — try again in a sec." }]);
        return;
      }
      const data = (await r.json()) as {
        reply?: string;
        copilotAction?: { kind: string; data?: Record<string, unknown>; label?: string } | null;
        action?: { kind: string; data?: Record<string, unknown>; label?: string } | null;
      };
      const reply = (data.reply ?? '').trim() || 'Done.';
      setChat((c) => [...c, { role: 'pear', text: reply }]);

      // Prefer the new copilotAction envelope; fall back to legacy action.
      const serverAction = data.copilotAction ?? data.action ?? null;
      if (serverAction && typeof serverAction === 'object' && serverAction.kind) {
        const actionShape = toSuggestionAction(serverAction);
        if (actionShape) {
          const result = await runPearAction(actionShape, ctx);
          setChat((c) => [
            ...c,
            {
              role: 'pear',
              text: result.ok ? (result.message ?? 'Applied.') : `Couldn't apply: ${result.error}`,
              action: { label: serverAction.label ?? 'applied', result: result.ok ? 'ok' : 'error' },
            },
          ]);
        }
      }
    } catch {
      setChat((c) => [...c, { role: 'pear', text: 'Something went wrong — sorry.' }]);
    }
  }, [input, manifest, names, analysis, ctx]);

  // Collapsed pill
  if (!open) {
    const critical = analysis.suggestions.filter((s) => s.severity === 'critical').length;
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 22,
          right: 22,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px 10px 12px',
          borderRadius: 999,
          background: 'var(--ink)',
          color: 'var(--cream)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 12px 30px rgba(14,13,11,0.28)',
          zIndex: 999,
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 600,
        }}
        aria-label="Open Pear"
      >
        <Pear size={22} tone="cream" sparkle shadow={false} />
        <span>{analysis.completeness === 100 ? 'Pear' : `${analysis.completeness}% · Pear`}</span>
        {critical > 0 && (
          <span
            style={{
              background: 'var(--peach-2)',
              color: 'var(--ink)',
              borderRadius: 999,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {critical}
          </span>
        )}
      </button>
    );
  }

  // Expanded panel
  return (
    <aside
      style={{
        position: 'fixed',
        bottom: 22,
        right: 22,
        width: 'min(400px, 92vw)',
        height: 'min(640px, 86vh)',
        background: 'var(--cream)',
        borderRadius: 20,
        boxShadow: '0 30px 80px rgba(14,13,11,0.28)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 999,
        border: '1px solid var(--line-soft)',
      }}
    >
      <header
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--line-soft)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--cream)',
        }}
      >
        <Pear size={28} tone="sage" sparkle shadow={false} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Pear</div>
          <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>
            {analysis.completeness}% complete · {analysis.suggestions.length} suggestion{analysis.suggestions.length === 1 ? '' : 's'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'transparent',
            border: '1px solid var(--line)',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            color: 'var(--ink)',
          }}
        >
          <Icon name="close" size={12} />
        </button>
      </header>

      <div
        style={{
          padding: '10px 16px 0',
          borderBottom: '1px solid var(--line-soft)',
        }}
      >
        <div style={{ height: 8, background: 'var(--cream-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
          <div
            style={{
              width: `${analysis.completeness}%`,
              height: '100%',
              background: analysis.completeness === 100 ? 'var(--sage-deep)' : 'var(--peach-2)',
              transition: 'width 400ms',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 10, flexWrap: 'wrap' }}>
          <Flag label="Hero" on={analysis.flags.hasCoverPhoto} />
          <Flag label="Story" on={analysis.flags.hasStoryChapters} />
          <Flag label="Venue" on={analysis.flags.hasVenue} />
          <Flag label="Date" on={analysis.flags.hasDate} />
          <Flag label="RSVP" on={analysis.flags.hasRsvp} />
          <Flag label="FAQs" on={analysis.flags.hasFaqs} />
          <Flag label="Registry" on={analysis.flags.hasRegistry} />
        </div>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--peach-ink)', textTransform: 'uppercase' }}>
          Next moves
        </div>

        {analysis.suggestions.length === 0 && chat.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: 'center',
              color: 'var(--ink-soft)',
              fontSize: 13,
              background: 'var(--card)',
              borderRadius: 12,
              border: '1px dashed var(--line)',
            }}
          >
            <Sparkle size={14} />
            <div style={{ marginTop: 6 }}>Your site is in good shape. Ask me anything below.</div>
          </div>
        )}

        {analysis.suggestions.slice(0, 5).map((s) => (
          <SuggestionCard key={s.id} suggestion={s} working={working === s.id} onRun={() => runSuggestion(s)} />
        ))}

        {chat.length > 0 && (
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ink-muted)', textTransform: 'uppercase', marginTop: 8 }}>
            Chat
          </div>
        )}
        {chat.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '86%',
              padding: '8px 12px',
              borderRadius: 14,
              background: m.role === 'user' ? 'var(--ink)' : 'var(--card)',
              color: m.role === 'user' ? 'var(--cream)' : 'var(--ink)',
              fontSize: 13,
              lineHeight: 1.5,
              border: m.role === 'user' ? 'none' : '1px solid var(--line-soft)',
            }}
          >
            {m.text}
            {m.action && (
              <div
                style={{
                  fontSize: 10,
                  marginTop: 4,
                  color: m.action.result === 'ok' ? 'var(--sage-deep)' : '#7A2D2D',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {m.action.label}
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--line-soft)',
          display: 'flex',
          gap: 6,
          background: 'var(--cream)',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void sendChat();
            }
          }}
          placeholder="Ask Pear…"
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'var(--card)',
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={() => void sendChat()}
          disabled={!input.trim()}
          style={{
            padding: '0 16px',
            borderRadius: 999,
            background: input.trim() ? 'var(--ink)' : 'var(--cream-2)',
            color: input.trim() ? 'var(--cream)' : 'var(--ink-muted)',
            border: 0,
            fontWeight: 600,
            fontSize: 12,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-ui)',
          }}
        >
          Ask
        </button>
      </div>

      {toast && (
        <div
          style={{
            position: 'absolute',
            bottom: 70,
            left: 16,
            right: 16,
            padding: '8px 12px',
            background: 'var(--ink)',
            color: 'var(--cream)',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 500,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {toast}
        </div>
      )}
    </aside>
  );
}

function SuggestionCard({
  suggestion,
  working,
  onRun,
}: {
  suggestion: Suggestion;
  working: boolean;
  onRun: () => void;
}) {
  const sev = suggestion.severity;
  const accent =
    sev === 'critical'
      ? '#7A2D2D'
      : sev === 'should-fix'
        ? 'var(--peach-ink)'
        : sev === 'nice-to-have'
          ? 'var(--sage-deep)'
          : 'var(--ink-soft)';
  const bg =
    sev === 'critical'
      ? 'rgba(198,86,61,0.06)'
      : sev === 'should-fix'
        ? 'var(--peach-bg)'
        : sev === 'nice-to-have'
          ? 'var(--sage-tint)'
          : 'var(--cream-2)';
  const actionLabel = buttonLabelFor(suggestion);
  return (
    <div
      style={{
        padding: 12,
        background: bg,
        border: `1px solid ${sev === 'critical' ? 'rgba(198,86,61,0.22)' : 'var(--line-soft)'}`,
        borderRadius: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'var(--cream)',
            display: 'grid',
            placeItems: 'center',
            color: accent,
          }}
        >
          <Icon name={suggestion.icon} size={12} />
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: accent,
          }}
        >
          {sev === 'critical' ? 'Do this' : sev === 'should-fix' ? 'Next' : sev === 'info' ? 'Heads up' : 'Polish'}
        </span>
      </div>
      <div className="display" style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
        {suggestion.title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5, marginBottom: 10 }}>
        {suggestion.body}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onRun}
          disabled={working}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            background: working ? 'var(--cream-2)' : 'var(--ink)',
            color: working ? 'var(--ink-muted)' : 'var(--cream)',
            border: 0,
            fontSize: 11,
            fontWeight: 600,
            cursor: working ? 'wait' : 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {working ? 'Working…' : actionLabel}
        </button>
        {suggestion.secondary && (
          <button
            type="button"
            onClick={async () => {
              if (!suggestion.secondary) return;
              // Secondary handled same path
              await Promise.resolve();
            }}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--ink-soft)',
              border: '1px solid var(--line)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            {suggestion.secondary.label}
          </button>
        )}
      </div>
    </div>
  );
}

function buttonLabelFor(s: Suggestion): string {
  switch (s.action.kind) {
    case 'navigate':
      return 'Open';
    case 'add-block':
      return 'Add';
    case 'ai-command':
      return s.action.command.includes('rewrite') ? 'Rewrite' : s.action.command.includes('seed') ? 'Draft with Pear' : 'Do it';
    case 'open-panel':
      if (s.action.panel === 'publish') return 'Publish';
      return 'Open';
    case 'fill-field':
      return 'Apply';
    case 'external-link':
      return 'Open';
  }
}

function Flag({ label, on }: { label: string; on: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        borderRadius: 999,
        background: on ? 'var(--sage-tint)' : 'var(--cream-2)',
        color: on ? 'var(--sage-deep)' : 'var(--ink-muted)',
        fontSize: 10.5,
        fontWeight: 600,
        border: `1px solid ${on ? 'var(--sage-deep)' : 'var(--line)'}`,
      }}
    >
      {on ? '✓' : '·'} {label}
    </span>
  );
}

// ── Translate server AI action envelope to SuggestionAction ──

function toSuggestionAction(a: { kind: string; data?: Record<string, unknown> }): import('@/lib/editor-intelligence/analyze').SuggestionAction | null {
  switch (a.kind) {
    case 'navigate': {
      const blockKey = String(a.data?.blockKey ?? a.data?.key ?? '');
      if (!blockKey) return null;
      return { kind: 'navigate', blockKey };
    }
    case 'add-block':
    case 'add_block': {
      const blockType = String(a.data?.blockType ?? a.data?.type ?? '');
      if (!blockType) return null;
      return { kind: 'add-block', blockType, config: a.data?.config as Record<string, unknown> | undefined };
    }
    case 'fill-field':
    case 'update_manifest':
    case 'update-manifest': {
      const path = String(a.data?.path ?? '');
      if (!path) return null;
      return { kind: 'fill-field', path, value: a.data?.value };
    }
    case 'ai-command':
    case 'ai_command': {
      const cmd = String(a.data?.command ?? '');
      if (!cmd) return null;
      return { kind: 'ai-command', command: cmd, payload: a.data?.payload as Record<string, unknown> | undefined };
    }
    case 'open-panel':
    case 'open_panel': {
      const panel = String(a.data?.panel ?? '');
      if (!panel) return null;
      return { kind: 'open-panel', panel };
    }
    default:
      return null;
  }
}
