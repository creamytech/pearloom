'use client';

/* eslint-disable no-restricted-syntax --
   This panel is the redesign editor's Pear pane and deliberately
   binds the redesign prototype tokens (--card / --ink / --cream /
   --line), not --pl-chrome-*, so it matches the shell it mounts
   inside (same convention as every file under pearloom/redesign/). */

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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { StoryManifest } from '@/types';
import { AISuggestButton, useAICall } from './ai';
import { Icon, Pear } from '../motifs';
import {
  extractFollowups,
  extractPatch,
  isActionEnvelope,
  stripPatchFromText,
  type PearPatchEnvelope,
} from './pear/patch';
import { PatchProposalCard } from './pear/PatchProposalCard';
import { PearActionCard } from './pear/PearActionCard';
import { pearPromptFor } from './panels/pear-passes';
import { PearThinking } from '../pear-thinking';
import { pearErrorMessage } from '../redesign/PearAssist';

// Minimal Web Speech API typing — TS doesn't ship a built-in
// declaration. Only the subset we use is modelled.
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string }; length: number }>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start: () => void;
  stop: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'pear';
  content: string;
  /** When Pear's response includes a pearloom:patch block, this
   *  is the parsed envelope. The PatchProposalCard renders + applies
   *  it directly; this field stays around so re-renders don't lose
   *  the proposal. Set to undefined after the host dismisses. */
  patch?: PearPatchEnvelope | null;
  /** Becomes true after the host clicks Apply. Keeps the card
   *  visible as confirmation but disables further taps. */
  patchApplied?: boolean;
  /** Becomes true when the host dismisses the proposal without
   *  applying. The card is removed; the prose stays. */
  patchDismissed?: boolean;
  /** Up to 3 short suggested follow-ups Pear emitted after the
   *  prose. Rendered as chips below the bubble; clicking sends
   *  the follow-up text as the next prompt. */
  followups?: string[];
}

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
  // Stays aligned with VALID_TABS in /api/pear-critique. Adding a
  // tab here without adding it server-side (or vice versa) means
  // suggestions silently drop or land on the wrong block.
  tab: 'hero' | 'details' | 'events' | 'story' | 'registry' | 'travel' | 'gallery' | 'rsvp' | 'faq' | 'chapters';
}

const TAB_TO_CATEGORY: Record<ApiCritique['tab'], SuggestionCategory> = {
  hero: 'voice',
  details: 'content',
  events: 'content',
  story: 'voice',
  registry: 'content',
  travel: 'content',
  gallery: 'content',
  rsvp: 'content',
  faq: 'content',
  chapters: 'voice',
};

// API tab → editor BlockKey. The pearloom:design-jump event
// expects a BlockKey from the editor's BLOCKS list. The story
// API tab maps to the editor's 'story' block.
const TAB_TO_BLOCK: Record<ApiCritique['tab'], string> = {
  hero: 'hero',
  details: 'details',
  events: 'schedule',
  story: 'story',
  registry: 'registry',
  travel: 'travel',
  gallery: 'gallery',
  rsvp: 'rsvp',
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

/* ── Proactive nudges — formerly FloatingPearBubble's opener ───
   The canvas pill used to carry these + its own critique fetch +
   inline suggestion UI; consolidated here (one-Pear, 2026-06-09)
   so the advisor opens with the same "Pear noticed…" thought the
   pill advertised. Keyed by the section the host is editing. */
const NUDGES: Record<string, string> = {
  hero:    'Your tagline is doing a lot of work. Want me to try 3 alternatives?',
  rsvp:    "You haven't set a reminder cadence yet. I drafted one — want to review?",
  gallery: '38 photos! I can pick the 12 strongest for the homepage strip.',
  default: 'I noticed your schedule has gaps — want me to rebalance the timeline?',
};

type QuickActionKey = 'review' | 'missing' | 'polish-hero';

const QUICK_ACTIONS: Array<{ key: QuickActionKey; label: string; icon: string; helpful: string }> = [
  { key: 'review',      label: 'Review the site',  icon: 'sparkles', helpful: "I'll read every section + flag what's worth sharpening." },
  { key: 'missing',     label: "What's missing?",  icon: 'search',   helpful: "I'll scan for gaps — missing dates, dressed code, host info." },
  { key: 'polish-hero', label: 'Polish my hero',   icon: 'pencil',   helpful: 'A focused pass on the hero copy + names + tagline.' },
];

// Slash-command shortcuts. Each one expands the draft into a
// focused prompt so Pear knows exactly what kind of pass to
// make. Names + paths follow the patch.ts convention so any
// resulting pearloom:patch block applies cleanly.
const SLASH_COMMANDS: Array<{ command: string; label: string; template: string }> = [
  { command: '/hero',        label: 'Polish hero tagline + welcome line',                 template: 'Rewrite my hero tagline + welcome line in a warmer, more specific voice that matches the rest of the site.' },
  { command: '/tagline',     label: 'Write a fresh hero tagline',                         template: 'Write me a fresh hero tagline — short, in our voice, no "celebrate with us" cliché.' },
  { command: '/closing',     label: 'Polish the closing line',                            template: 'Rewrite the closing line at the bottom of the site — heartfelt, brief, no filler.' },
  { command: '/faq',         label: 'Draft 5 FAQ items',                                  template: 'Draft 5 FAQ items guests would actually ask about my event. Reference the venue + occasion.' },
  { command: '/chapter',     label: 'Polish a specific chapter (chapter <n>)',            template: 'Polish chapter 0 — keep the bones, sharpen the voice, cut anything that reads as filler.' },
  { command: '/dresscode',   label: 'Suggest dress-code copy',                            template: 'Suggest dress-code copy — formal but warm, with one specific line about footwear or weather.' },
  { command: '/help',        label: 'List the slash commands',                            template: 'List the slash commands available in this chat.' },
];

/** Pre-loaded prompt the advisor should fire on next open. The
 *  per-field pear glyph + the PearSuggestionsStrip both dispatch
 *  pearloom:open-pear-for with a `pass` id; EditorV8 forwards that
 *  here as an intent. The unique `key` lets back-to-back invocations
 *  on the same pass still re-fire (each click bumps the key). */
export interface AdvisorIntent {
  /** Pass id from panels/pear-passes.ts — looked up to a prompt. */
  pass: string;
  /** Block context the chat handler binds to. */
  block?: string;
  /** Bumped per click so React's effect dep array fires every time. */
  key: number;
}

export function DesignAdvisor({
  manifest,
  names,
  open,
  onClose,
  onApplyPatch,
  siteSlug,
  currentBlock,
  selectedBlockIds,
  intent,
  inline = false,
}: {
  manifest: StoryManifest;
  names: [string, string];
  open: boolean;
  onClose: () => void;
  /** Apply Pear's manifest patch (optional). When omitted the
   *  "Apply" button is hidden. */
  onApplyPatch?: (next: StoryManifest) => void;
  /** Used to namespace conversation memory in localStorage so
   *  reopening Pear on the same site picks up where it left off. */
  siteSlug?: string;
  /** Section the host is currently editing — passed to the chat
   *  so Pear can answer "polish this" without the host having
   *  to specify what. */
  currentBlock?: string;
  /** Specific block ids the host has selected on canvas. */
  selectedBlockIds?: string[];
  /** Pre-load + auto-fire a specific pass when the advisor opens.
   *  Each new click should increment intent.key so the effect
   *  re-runs even if the same pass id arrives twice in a row. */
  intent?: AdvisorIntent | null;
  /** Mount as an inline pane (4th editor column) instead of a
   *  fixed-position modal with backdrop. Matches the prototype's
   *  Pear pane that sits flush with the inspector rail. */
  inline?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeAction, setActiveAction] = useState<QuickActionKey>('review');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const voiceRecRef = useRef<unknown>(null);

  // Web Speech API support detection. Only Chrome/Edge ship a
  // working implementation (Firefox + Safari are gappy). We
  // progressively render a mic button when the API is present.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    if (w.SpeechRecognition || w.webkitSpeechRecognition) {
      setVoiceSupported(true);
    }
  }, []);

  function startVoice() {
    if (typeof window === 'undefined' || listening) return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    let finalText = draft;
    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? '';
        if (r.isFinal) final += t; else interim += t;
      }
      if (final) finalText = (finalText ? finalText + ' ' : '') + final.trim();
      // Show running interim text in the textarea while dictating.
      setDraft((finalText + (interim ? ' ' + interim : '')).trimStart());
    };
    rec.onend = () => {
      setListening(false);
      setDraft(finalText.trim());
      voiceRecRef.current = null;
    };
    rec.onerror = () => {
      setListening(false);
      voiceRecRef.current = null;
    };
    setListening(true);
    rec.start();
    voiceRecRef.current = rec;
  }
  function stopVoice() {
    const rec = voiceRecRef.current as SpeechRecognitionLike | null;
    if (rec) rec.stop();
    setListening(false);
  }

  // Persist + rehydrate chat per-site so reopening Pear feels
  // like a continuing thread, not a fresh session each time.
  // Cap the history at 30 turns so localStorage doesn't bloat.
  const memoryKey = siteSlug ? `pearloom:pear-chat:${siteSlug}` : null;
  useEffect(() => {
    if (!memoryKey) return;
    try {
      const raw = window.localStorage.getItem(memoryKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed)) setChat(parsed.slice(-30));
      }
    } catch { /* ignore */ }
  }, [memoryKey]);
  useEffect(() => {
    if (!memoryKey) return;
    try {
      const trimmed = chat.slice(-30);
      window.localStorage.setItem(memoryKey, JSON.stringify(trimmed));
    } catch { /* ignore quota */ }
  }, [chat, memoryKey]);

  // Auto-scroll the chat to the bottom when a new message lands.
  useEffect(() => {
    if (!open) return;
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat, open]);

  // Reset suggestions when the panel closes; chat persists in
  // localStorage so it's not blown away.
  useEffect(() => {
    if (!open) {
      setSuggestions([]);
      setChatError(null);
    }
  }, [open]);

  const sendChat = useCallback(async (prompt: string) => {
    if (!prompt.trim() || streaming) return;
    setStreaming(true);
    setChatError(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now().toString(36)}`,
      role: 'user',
      content: prompt.trim(),
    };
    const pearId = `p-${Date.now().toString(36)}`;
    const pearStub: ChatMessage = { id: pearId, role: 'pear', content: '' };
    setChat((prev) => [...prev, userMsg, pearStub]);
    setDraft('');

    try {
      const res = await fetch('/api/pear-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest,
          coupleNames: names,
          prompt: userMsg.content,
          history: chat.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          context: {
            block: currentBlock,
            selectedIds: selectedBlockIds,
          },
          // Pass the site slug so the host-mode pear-chat handler
          // can pull live activity stats (RSVPs, photos, claims)
          // and bake them into Pear's context. Lets Pear say
          // things like "12 guests still haven't replied" instead
          // of giving generic suggestions.
          siteSlug,
        }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Pear couldn't reply (${res.status})`);
      }
      const reader = res.body.getReader();
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
              const display = stripPatchFromText(acc);
              setChat((prev) => prev.map((m) => (m.id === pearId ? { ...m, content: display } : m)));
            }
          } catch (e) {
            if (e instanceof Error && e.message) throw e;
          }
        }
      }
      // Final pass — extract patch + follow-ups envelope after
      // the stream ends so partial JSON during streaming doesn't
      // trip extraction.
      const finalEnvelope = extractPatch(acc);
      const finalFollowups = extractFollowups(acc);
      const finalDisplay = stripPatchFromText(acc);
      setChat((prev) => prev.map((m) => (
        m.id === pearId
          ? { ...m, content: finalDisplay, patch: finalEnvelope, followups: finalFollowups }
          : m
      )));
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Pear lost the thread');
      setChat((prev) => prev.filter((m) => m.id !== pearId));
    } finally {
      setStreaming(false);
    }
  }, [manifest, names, chat, streaming, currentBlock, selectedBlockIds, siteSlug]);

  // Intent auto-fire — when EditorV8 forwards a `pearloom:open-pear-for`
  // event with a `pass` id (from a per-field pear glyph or the
  // suggestions strip), look up the prompt template and submit it
  // automatically so the host doesn't see an empty advisor.
  // Re-fires every time intent.key changes — back-to-back clicks
  // on the same pass still queue a new run.
  const lastIntentKeyRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open || !intent || streaming) return;
    if (lastIntentKeyRef.current === intent.key) return;
    const prompt = pearPromptFor(intent.pass);
    if (!prompt) return;
    lastIntentKeyRef.current = intent.key;
    void sendChat(prompt);
  }, [open, intent, streaming, sendChat]);

  function applyChatPatch(messageId: string, nextManifest: StoryManifest) {
    if (!onApplyPatch) return;
    // Snapshot the manifest BEFORE applying so the toast's Undo
    // can restore it. The applyPatch callback runs through the
    // editor's manifest reducer (which has its own undo history),
    // but the toast undo gives the host an immediate, single-tap
    // path back without hunting for ⌘Z.
    const previous = manifest;
    onApplyPatch(nextManifest);
    setChat((prev) => prev.map((m) => (m.id === messageId ? { ...m, patchApplied: true } : m)));
    if (typeof window !== 'undefined') {
      const target = chat.find((m) => m.id === messageId);
      window.dispatchEvent(new CustomEvent('pearloom:patch-applied', {
        detail: {
          summary: target?.patch?.summary ?? 'Pear applied a change',
          // Pass the rollback through the event so the toast can
          // surface Undo without the toast component knowing about
          // the manifest at all.
          undo: () => onApplyPatch(previous),
        },
      }));
    }
  }
  function dismissChatPatch(messageId: string) {
    setChat((prev) => prev.map((m) => (m.id === messageId ? { ...m, patchDismissed: true } : m)));
  }

  function clearMemory() {
    setChat([]);
    if (memoryKey) {
      try { window.localStorage.removeItem(memoryKey); } catch { /* ignore */ }
    }
  }

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
    if (!raw.length) throw new Error('Your site looks complete to Pear — try asking it something specific in the chat.');
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
    if (!block) {
      // Belt-and-braces — the API route already validates against
      // VALID_TABS, but if the two go out of sync the event would
      // dispatch with `block: undefined` and the listener would
      // silently no-op. Bail loud instead.
      console.warn('[DesignAdvisor] No BlockKey mapping for tab:', tab);
      return;
    }
    // Close FIRST so the panel's exit animation runs in parallel
    // with the canvas scroll. Then defer the dispatch by one frame
    // so the editor's design-jump listener fires after the panel
    // has unmounted — without the rAF, the listener occasionally
    // got swallowed by re-renders during the close transition.
    onClose();
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block } }));
    });
  }

  function runAction(action: QuickActionKey) {
    setActiveAction(action);
    setSuggestions([]);
    void run();
  }

  if (!open) return null;

  // Inline mode = the prototype's 4th-column Pear pane. Mounts as a
  // flexbox sibling of the inspector (no backdrop), 320px wide, with
  // a hairline left border. Modal mode (default) keeps the original
  // backdrop + 460px right-anchored dialog for entry points outside
  // the editor shell (PearWelcome, design-advisor intent, etc).
  const advisorAside = (
      <aside
        role={inline ? 'complementary' : 'dialog'}
        aria-modal={inline ? undefined : 'true'}
        aria-label="Pear, your design advisor"
        onClick={inline ? undefined : (e) => e.stopPropagation()}
        style={{
          /* Inline fills its mount — the editor's 4th grid column
             is a fixed 320px (pixel-identical to the old literal
             320) and the mobile bottom sheet is full-bleed. */
          width: inline ? '100%' : 'min(460px, 100vw)',
          height: '100%',
          flexShrink: 0,
          background: 'var(--card)',
          borderLeft: '1px solid var(--line-soft)',
          boxShadow: inline ? 'none' : '-24px 0 60px rgba(14,13,11,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: inline ? undefined : 'pl-pear-slide 300ms cubic-bezier(0.22, 1, 0.36, 1)',
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
            aria-label="Close Pear advisor"
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
                  transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
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
          {/* Pear noticed… — the proactive opener that used to live
              in the canvas bubble. State resets per open because the
              whole advisor unmounts when closed. */}
          <PearNoticedCard
            manifest={manifest}
            names={names}
            currentBlock={currentBlock}
            onJump={(tab) => jumpToTab(tab)}
          />

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

          {/* Chat surface — free-text "ask Pear anything" with
              streaming response and edit-on-accept patches. */}
          {(chat.length > 0 || streaming) && (
            <div
              ref={chatScrollRef}
              role="log"
              aria-label="Pear chat history"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginTop: 4,
              }}
            >
              {chat.map((m) => (
                <ChatBubble
                  key={m.id}
                  message={m}
                  manifest={manifest}
                  canApply={!!onApplyPatch}
                  siteSlug={siteSlug}
                  onApply={(next) => applyChatPatch(m.id, next)}
                  onDismiss={() => dismissChatPatch(m.id)}
                  onPickFollowup={(text) => {
                    setDraft(text);
                    void sendChat(text);
                  }}
                />
              ))}
              {streaming && chat[chat.length - 1]?.role === 'pear' && chat[chat.length - 1].content === '' && (
                <PearTypingIndicator />
              )}
            </div>
          )}

          {chatError && (
            <div
              role="alert"
              style={{
                padding: '10px 12px',
                background: 'rgba(122,45,45,0.08)',
                border: '1px solid rgba(122,45,45,0.18)',
                borderRadius: 10,
                color: 'var(--plum-ink, #7A2D2D)',
                fontSize: 12.5,
                lineHeight: 1.45,
              }}
            >
              {chatError}
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
                            ? 'var(--plum-ink, #7A2D2D)'
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
                      aria-label={`Open the ${s.targetTab} panel`}
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
                        transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--peach-bg, rgba(198,112,61,0.08))'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      onFocus={(e) => { e.currentTarget.style.background = 'var(--peach-bg, rgba(198,112,61,0.08))'; }}
                      onBlur={(e) => { e.currentTarget.style.background = 'transparent'; }}
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

        {/* Chat input footer — fixed to the bottom so the host
            can keep typing while suggestions scroll. ⌘/Ctrl+Enter
            sends. */}
        <footer
          style={{
            padding: '12px 18px 16px',
            borderTop: '1px solid var(--line-soft)',
            background: 'var(--cream-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {chat.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.18em',
                  color: 'var(--ink-muted)',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Conversation · {chat.length}
              </div>
              <button
                type="button"
                onClick={clearMemory}
                style={{
                  fontSize: 10.5,
                  color: 'var(--ink-soft)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: 'var(--font-ui)',
                  padding: '2px 4px',
                }}
              >
                Clear
              </button>
            </div>
          )}
          {/* Slash-command picker — surfaces when the draft starts
              with "/". Each chip is a templated prompt the host
              can pick to skip the prose. Hidden otherwise so the
              chat doesn't feel like a CLI by default. */}
          {draft.startsWith('/') && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                padding: '4px 0',
              }}
            >
              {SLASH_COMMANDS
                .filter((c) => c.command.startsWith(draft.split(' ')[0]))
                .map((c) => (
                  <button
                    key={c.command}
                    type="button"
                    onClick={() => {
                      setDraft(c.template);
                      inputRef.current?.focus();
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: 'var(--card)',
                      border: '1px solid var(--peach-ink, #C6703D)',
                      color: 'var(--peach-ink, #C6703D)',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono, ui-monospace, monospace)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span style={{ fontWeight: 800 }}>{c.command}</span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 500, color: 'var(--ink-soft)', letterSpacing: 0 }}>
                      {c.label}
                    </span>
                  </button>
                ))}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              padding: '10px 12px',
              background: 'var(--card)',
              border: '1px solid var(--line-soft)',
              borderRadius: 14,
              transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), box-shadow var(--pl-dur-fast) var(--pl-ease-out)',
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !streaming) {
                  e.preventDefault();
                  void sendChat(draft);
                }
              }}
              placeholder={chat.length === 0 ? 'Ask Pear anything — try /faq, /hero, or "rewrite my tagline warmer"' : 'Reply to Pear…'}
              aria-label={chat.length === 0 ? 'Ask Pear anything' : 'Reply to Pear'}
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-ui)',
                fontSize: 13.5,
                color: 'var(--ink)',
                lineHeight: 1.5,
                minHeight: 22,
                maxHeight: 120,
              }}
            />
            {voiceSupported && (
              <button
                type="button"
                onClick={() => (listening ? stopVoice() : startVoice())}
                aria-label={listening ? 'Stop dictation' : 'Dictate to Pear'}
                title={listening ? 'Stop dictation' : 'Dictate to Pear'}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: listening ? 'var(--peach-ink, #C6703D)' : 'transparent',
                  color: listening ? '#FFFFFF' : 'var(--ink-muted)',
                  border: listening ? '1px solid var(--peach-ink, #C6703D)' : '1px solid var(--line-soft)',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
                  animation: listening ? 'pl-pear-mic-pulse 1.4s ease-in-out infinite' : 'none',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => void sendChat(draft)}
              disabled={!draft.trim() || streaming}
              aria-label="Send message"
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: draft.trim() && !streaming ? 'var(--peach-ink, #C6703D)' : 'var(--cream-2)',
                color: draft.trim() && !streaming ? '#FFFFFF' : 'var(--ink-muted)',
                border: 'none',
                cursor: draft.trim() && !streaming ? 'pointer' : 'not-allowed',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
              }}
            >
              {streaming ? (
                <span
                  aria-hidden
                  style={{
                    width: 12, height: 12,
                    borderRadius: '50%',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    animation: 'pl-pear-spin 700ms linear infinite',
                  }}
                />
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none" />
                </svg>
              )}
            </button>
          </div>
        </footer>

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
          @keyframes pl-pear-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes pl-pear-typing-dot {
            0%, 60%, 100% { opacity: 0.25; transform: translateY(0); }
            30%           { opacity: 1; transform: translateY(-2px); }
          }
          @keyframes pl-pear-mic-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(198, 112, 61, 0); }
            50%      { box-shadow: 0 0 0 6px rgba(198, 112, 61, 0.30); }
          }
          @media (prefers-reduced-motion: reduce) {
            [aria-label="Pear, your design advisor"] aside { animation: none; }
            [aria-label="Pear, your design advisor"] { animation: none; }
            .pl-pear-breathe { animation: none !important; }
            /* The other three keyframes (pear-spin loader, mic
               pulse, typing dot) are also looping animations — turn
               them off for hosts opting out of motion. The state
               difference is still readable: the loader's lavender
               arc, mic's peach halo, and typing dots' offset opacity
               all stay distinct without rotation/breathing. */
            [style*="pl-pear-spin"],
            [style*="pl-pear-mic-pulse"],
            [style*="pl-pear-typing-dot"] {
              animation: none !important;
            }
          }
        `}</style>
      </aside>
  );

  if (inline) return advisorAside;

  return (
    <div
      // Backdrop. role="presentation" makes it a non-semantic
      // click-to-close target — the dialog role belongs on the
      // inner <aside> where the actual content lives.
      role="presentation"
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
      {advisorAside}
    </div>
  );
}

function ChatBubble({
  message,
  manifest,
  canApply,
  siteSlug,
  onApply,
  onDismiss,
  onPickFollowup,
}: {
  message: ChatMessage;
  manifest: StoryManifest;
  canApply: boolean;
  /** Forwarded so PearActionCard can fan a single approval into
   *  real API calls (lookup pending guests + send the nudge). */
  siteSlug?: string;
  onApply: (next: StoryManifest) => void;
  onDismiss: () => void;
  onPickFollowup: (text: string) => void;
}) {
  const isUser = message.role === 'user';
  const showPatchCard = message.patch && !message.patchDismissed;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderRadius: 14,
          background: isUser ? 'var(--peach-bg, rgba(198,112,61,0.12))' : 'var(--card)',
          border: isUser ? '1px solid rgba(198,112,61,0.22)' : '1px solid var(--card-ring)',
          color: 'var(--ink)',
          fontSize: 13.5,
          lineHeight: 1.55,
          fontFamily: isUser ? 'var(--font-ui)' : 'var(--font-display, "Fraunces", Georgia, serif)',
          fontStyle: isUser ? 'normal' : 'italic',
          letterSpacing: isUser ? 0 : '-0.005em',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content || (
          <PearThinking active label="drafting" size="md" hideAvatar />
        )}
      </div>
      {showPatchCard && message.patch && (
        isActionEnvelope(message.patch) && message.patch.action ? (
          <PearActionCard
            envelope={message.patch as PearPatchEnvelope & { action: NonNullable<PearPatchEnvelope['action']> }}
            siteSlug={siteSlug}
            onDone={onDismiss}
            onDismiss={onDismiss}
          />
        ) : (
          <PatchProposalCard
            envelope={message.patch}
            manifest={manifest}
            applied={!!message.patchApplied}
            canApply={canApply}
            onApply={onApply}
            onDismiss={onDismiss}
          />
        )
      )}
      {/* Suggested follow-ups — Pear's "what next?" chip rail.
          Only on Pear bubbles, only when the model emitted a
          pearloom:followups block. Each chip becomes the next
          prompt on click. */}
      {message.role === 'pear' && message.followups && message.followups.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
          {message.followups.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onPickFollowup(f)}
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                background: 'transparent',
                border: '1px solid var(--peach-ink, #C6703D)',
                color: 'var(--peach-ink, #C6703D)',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                letterSpacing: '-0.005em',
                transition: 'background var(--pl-dur-fast) var(--pl-ease-out)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(198,112,61,0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onFocus={(e) => { e.currentTarget.style.background = 'rgba(198,112,61,0.08)'; }}
              onBlur={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── PearNoticedCard ─────────────────────────────────────────
   The advisor's proactive opener — ported wholesale from the old
   FloatingPearBubble expansion. Shows the section-aware nudge
   with "Yes, try it" (fires the same /api/pear-critique pass the
   bubble used); a returned suggestion surfaces with a
   "Jump to <tab>" CTA that reuses the advisor's jumpToTab
   (design-jump event + advisor close). Dismissable; remounts
   fresh each time the advisor opens. */

interface NudgeSuggestion {
  id: string;
  level: 'critical' | 'warning' | 'tip';
  title: string;
  description: string;
  tab: string;
}

function PearNoticedCard({
  manifest,
  names,
  currentBlock,
  onJump,
}: {
  manifest: StoryManifest;
  names: [string, string];
  currentBlock?: string;
  onJump: (tab: ApiCritique['tab']) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<NudgeSuggestion | null>(null);

  if (dismissed) return null;

  const nudge = (currentBlock && NUDGES[currentBlock]) || NUDGES.default;

  async function tryIt() {
    setBusy(true);
    setErr(null);
    try {
      /* /api/pear-critique requires { manifest, coupleNames } per
         the route's request schema — without coupleNames the call
         400's. Same payload the bubble sent. */
      const res = await fetch('/api/pear-critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest,
          coupleNames: names,
          intent: currentBlock ? `polish-${currentBlock}` : 'review',
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        console.error('[pear-noticed] critique failed:', res.status);
        throw new Error((j as { error?: string }).error ?? 'Pear couldn’t think that one through — try again?');
      }
      const data = await res.json() as { suggestions?: NudgeSuggestion[] };
      const first = data.suggestions?.[0];
      if (first) setSuggestion(first);
      else setErr('Pear had nothing to add right now.');
    } catch (e) {
      console.error('[pear-noticed] critique error:', e);
      setErr(pearErrorMessage(e, 'Pear couldn’t think that one through — try again?'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Pear noticed"
      style={{
        padding: 14,
        background: 'var(--peach-bg, rgba(198,112,61,0.10))',
        border: '1px solid rgba(198,112,61,0.20)',
        borderRadius: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--peach-ink, #C6703D)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        Pear noticed…
      </div>
      {suggestion ? (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
            {suggestion.title}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
            {suggestion.description}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => onJump(suggestion.tab as ApiCritique['tab'])}
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
          <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45 }}>
            {nudge}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={() => void tryIt()}
              disabled={busy}
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
        <div
          role="alert"
          style={{
            padding: '6px 10px',
            borderRadius: 7,
            background: 'rgba(122,45,45,0.08)',
            fontSize: 11,
            color: 'var(--plum-ink, #7A2D2D)',
          }}
        >
          {err}
        </div>
      )}
    </section>
  );
}

function PearTypingIndicator() {
  return (
    <div
      aria-label="Pear is thinking"
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: '8px 14px',
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 14,
        alignSelf: 'flex-start',
        marginTop: -8,
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--peach-ink, #C6703D)',
            animation: 'pl-pear-typing-dot 1.4s ease-in-out infinite',
            animationDelay: `${i * 160}ms`,
          }}
        />
      ))}
    </div>
  );
}
