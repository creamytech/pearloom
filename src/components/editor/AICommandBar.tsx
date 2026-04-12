'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/AICommandBar.tsx
// Inline AI command bar — floating pill that expands into a
// contextual AI assistant. Notion AI / Linear-style UX.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowUp, Check, Loader2, X, Crown } from 'lucide-react';
import { PearIcon } from '@/components/icons/PearloomIcons';
import { useEditor } from '@/lib/editor-state';
import type { StoryManifest, Chapter } from '@/types';

// ── Quick action definitions ──────────────────────────────────

interface QuickAction {
  label: string;
  prompt: string;
  handler: 'ai-chat' | 'ai-faq' | 'section-picker';
}

function getDefaultQuickActions(occasion?: string): QuickAction[] {
  const occ = occasion || 'wedding';
  const eventPrompt = occ === 'birthday'
    ? 'Set up my birthday party details — the main celebration and any other activities. Ask me for details you need.'
    : occ === 'anniversary'
      ? 'Set up my anniversary celebration — dinner, party, or gathering. Ask me for the details you need.'
      : occ === 'engagement'
        ? 'Set up my engagement party schedule. Ask me for venue and date if you need them.'
        : 'Set up my event schedule — ceremony, cocktail hour, and reception. Use the venue and date if I have them, or ask me for the details.';
  const reviewPrompt = occ === 'birthday'
    ? 'Review my birthday site like a party planner. What\'s working? What could be better?'
    : occ === 'anniversary'
      ? 'Review my anniversary site. What\'s working? What could be better?'
      : 'Review my site like a wedding planner. What\'s working? What could be better?';

  return [
    { label: 'Pear, help me start',  prompt: 'Look at my site and tell me what\'s missing or needs attention. Give me a prioritized to-do list and offer to do the first one.', handler: 'ai-chat' },
    { label: 'Make it beautiful',    prompt: 'Redesign my site to look stunning — change colors, fonts, and tagline to create a magazine-worthy look.', handler: 'ai-chat' },
    { label: 'Write my content',     prompt: 'Write all the text content my site needs — tagline, welcome message, closing line. Make it personal using the names and details you know.', handler: 'ai-chat' },
    { label: 'Set up events',        prompt: eventPrompt, handler: 'ai-chat' },
    { label: 'Ask Pear for FAQs',    prompt: 'Write 5-7 FAQs guests would actually ask. Use real details from my site. If info is missing, ask me first.', handler: 'ai-chat' },
    { label: 'Suggest improvements', prompt: reviewPrompt, handler: 'ai-chat' },
    // Guest communications
    { label: 'Write a save-the-date message', prompt: 'Write a save-the-date message for our guests using our names and wedding date. Make it warm, personal, and ready to copy. Use the \'message\' action — just give me the text.', handler: 'ai-chat' },
    { label: 'Write a rehearsal dinner invite', prompt: 'Write a rehearsal dinner invitation for our guests. Include a warm, personal tone. Use the \'message\' action — just give me the full invite text to copy.', handler: 'ai-chat' },
    { label: 'Write a day-of welcome note', prompt: 'Write a day-of welcome note for guests arriving at our wedding. Make it heartfelt and set the tone for the celebration. Use the \'message\' action — just give me the full text to copy.', handler: 'ai-chat' },
  ];
}

const SECTION_QUICK_ACTIONS: Record<string, QuickAction[]> = {
  hero: [
    { label: 'Rewrite my tagline', prompt: 'Rewrite my hero tagline to be more personal and memorable. Use the couple names and wedding date if available.', handler: 'ai-chat' },
    { label: 'Change hero style', prompt: 'Change my hero section style — try a different layout, typography treatment, or visual approach that feels fresh.', handler: 'ai-chat' },
    { label: 'Add a cover photo', prompt: 'Help me set up a beautiful cover photo for my hero section with the right sizing and positioning.', handler: 'ai-chat' },
  ],
  events: [
    { label: 'Add more events', prompt: 'Add more events to my wedding schedule — suggest common events I might be missing like a welcome dinner or after-party.', handler: 'ai-chat' },
    { label: 'Change dress code', prompt: 'Update the dress code for my events. Suggest appropriate dress codes based on the venue and vibe.', handler: 'ai-chat' },
    { label: 'Write event descriptions', prompt: 'Write engaging descriptions for each of my wedding events that give guests helpful details and set the right tone.', handler: 'ai-chat' },
  ],
  story: [
    { label: 'Improve chapter descriptions', prompt: 'Improve my story chapter descriptions — make them more vivid, personal, and engaging while keeping the same tone.', handler: 'ai-chat' },
    { label: 'Add a new chapter', prompt: 'Add a new chapter to our love story. Suggest a meaningful milestone we might want to include.', handler: 'ai-chat' },
    { label: 'Make stories more emotional', prompt: 'Rewrite our story chapters to be more emotional and heartfelt — add sensory details and personal touches.', handler: 'ai-chat' },
    { label: 'Get photo tips', prompt: 'Look at my story chapters and suggest how to improve the photo layout. Are there too many photos in one chapter? Should I reorder them? Are any chapters missing photos? Give specific, actionable advice. Use the \'message\' action.', handler: 'ai-chat' },
  ],
  design: [
    { label: 'Change color palette', prompt: 'Change my site color palette to something fresh and cohesive. Suggest a palette that matches the wedding vibe.', handler: 'ai-chat' },
    { label: 'Try different fonts', prompt: 'Try different font pairings for my site. Suggest elegant heading and body font combinations.', handler: 'ai-chat' },
    { label: 'Make it more elegant', prompt: 'Make my site design more elegant — refine the typography, spacing, and color choices to feel more polished and sophisticated.', handler: 'ai-chat' },
  ],
  communications: [
    { label: 'Write a save-the-date message', prompt: 'Write a save-the-date message for our guests using our names and wedding date. Make it warm, personal, and ready to copy. Use the \'message\' action — just give me the text.', handler: 'ai-chat' as const },
    { label: 'Write a rehearsal dinner invite', prompt: 'Write a rehearsal dinner invitation for our guests. Include a warm, personal tone. Use the \'message\' action — just give me the full invite text to copy.', handler: 'ai-chat' as const },
    { label: 'Write a day-of welcome note', prompt: 'Write a day-of welcome note for guests arriving at our wedding. Make it heartfelt and set the tone for the celebration. Use the \'message\' action — just give me the full text to copy.', handler: 'ai-chat' as const },
    { label: 'Write a thank-you note', prompt: 'Write a heartfelt thank-you note for guests who attended our wedding. Use the \'message\' action — just give me the full text to copy.', handler: 'ai-chat' as const },
  ],
};

/** Return context-aware quick actions based on the active section/tab */
function getContextualActions(manifest: StoryManifest, activeSection: string | null): QuickAction[] {
  const defaults = getDefaultQuickActions(manifest.occasion);
  if (!activeSection) return defaults;

  const normalized = activeSection.toLowerCase();

  if (normalized === 'hero') return SECTION_QUICK_ACTIONS.hero;
  if (normalized === 'events' || normalized === 'event' || normalized === 'schedule') return SECTION_QUICK_ACTIONS.events;
  if (normalized === 'story' || normalized === 'chapter') return SECTION_QUICK_ACTIONS.story;
  if (normalized === 'design' || normalized === 'theme' || normalized === 'navigation' || normalized === 'nav') return SECTION_QUICK_ACTIONS.design;
  if (normalized === 'communications' || normalized === 'messaging' || normalized === 'invites' || normalized === 'messages') return SECTION_QUICK_ACTIONS.communications;

  return defaults;
}

// ── Colour tokens ─────────────────────────────────────────────

const OLIVE = '#18181B';

// ── Status type ───────────────────────────────────────────────

type BarStatus = 'idle' | 'loading' | 'success' | 'error' | 'reply';

// ── Main Component ────────────────────────────────────────────

export function AICommandBar() {
  const { state, dispatch, manifest, actions } = useEditor();
  const [expanded, setExpanded] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [status, setStatus] = useState<BarStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [pearReply, setPearReply] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'pear'; text: string; action?: string; data?: Record<string, unknown> | null; ts: number }>>([]);
  const [pearRemaining, setPearRemaining] = useState<number | null>(null); // null = unknown / unlimited
  const [pearPlan, setPearPlan] = useState<string>('free');
  const [limitReached, setLimitReached] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidePanelInputRef = useRef<HTMLInputElement>(null);

  // ── Desktop detection (>= 768px) ─────────────────────────

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Expand / collapse ─────────────────────────────────────

  const open = useCallback(() => {
    setExpanded(true);
    setStatus('idle');
    setInputVal('');
    setErrorMsg('');
    setTimeout(() => {
      inputRef.current?.focus();
      sidePanelInputRef.current?.focus();
    }, 80);
  }, []);

  const close = useCallback(() => {
    abortRef.current?.abort();
    setExpanded(false);
    setInputVal('');
    setStatus('idle');
    setErrorMsg('');
    setPearReply('');
    setMessages([]);
  }, []);

  // ── Notify canvas when desktop side panel opens/closes ────

  useEffect(() => {
    const panelOpen = expanded && isDesktop;
    window.dispatchEvent(new CustomEvent('pear-panel-toggle', { detail: { open: panelOpen } }));
    return () => {
      // Ensure panel reports closed on unmount
      window.dispatchEvent(new CustomEvent('pear-panel-toggle', { detail: { open: false } }));
    };
  }, [expanded, isDesktop]);

  // ── Keyboard shortcut: "/" opens, ESC closes ──────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // "/" opens the bar when not inside an editable element
      if (
        e.key === '/' &&
        !expanded &&
        !(e.target as HTMLElement).closest('input, textarea, [contenteditable], select')
      ) {
        e.preventDefault();
        open();
        return;
      }
      // ESC closes
      if (e.key === 'Escape' && expanded) {
        close();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [expanded, open, close]);

  // ── Auto-scroll messages ──────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // ── Intro message on first open ──────────────────────────
  useEffect(() => {
    if (expanded && messages.length === 0) {
      setMessages([{ role: 'pear', text: "Hey! I'm Pear. What can I help with today?", ts: Date.now() }]);
    }
  }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listen for pear-command events from empty state buttons ──

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setExpanded(true);
      setInputVal(e.detail.prompt);
      setStatus('idle');
      setErrorMsg('');
      setTimeout(() => inputRef.current?.focus(), 80);
    };
    window.addEventListener('pear-command', handler as EventListener);
    return () => window.removeEventListener('pear-command', handler as EventListener);
  }, []);

  // ── Clean up on unmount ───────────────────────────────────

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // ── Apply AI response to manifest ─────────────────────────

  const applyAIResponse = useCallback((data: { action: string; data: Record<string, unknown> | null; reply: string }) => {
    const { action, data: actionData } = data;
    if (!actionData && action !== 'message') return;

    switch (action) {
      case 'update_chapter': {
        if (!actionData?.id) break;
        const id = actionData.id as string;
        // Validate the chapter actually exists
        const chapterExists = manifest.chapters?.some(c => c.id === id);
        if (!chapterExists) {
          console.warn('[Pear] Tried to update non-existent chapter:', id);
          break;
        }
        const { id: _id, ...updates } = actionData;
        actions.updateChapter(id, updates as Partial<Chapter>);
        break;
      }

      case 'add_chapter': {
        // Pear wants to add a new chapter — create blank then update it
        actions.addChapter();
        // The new chapter will be the last one after addChapter
        setTimeout(() => {
          const chapters = manifest.chapters || [];
          const newChapter = chapters[chapters.length - 1];
          if (newChapter && actionData) {
            const updates: Partial<Chapter> = {};
            if (actionData.title) updates.title = actionData.title as string;
            if (actionData.subtitle) updates.subtitle = actionData.subtitle as string;
            if (actionData.description) updates.description = actionData.description as string;
            if (actionData.mood) updates.mood = actionData.mood as string;
            actions.updateChapter(newChapter.id, updates);
          }
        }, 100);
        break;
      }

      case 'update_manifest': {
        if (!actionData?.path) break;
        const parts = (actionData.path as string).split('.');
        if (parts.length === 2) {
          const [topKey, subKey] = parts;
          const existing = (manifest as unknown as Record<string, unknown>)[topKey] as Record<string, unknown> | undefined;
          actions.handleChatManifestUpdate({ [topKey]: { ...(existing || {}), [subKey]: actionData.value } } as Partial<StoryManifest>);
        } else if (parts.length === 1) {
          actions.handleChatManifestUpdate({ [parts[0]]: actionData.value } as Partial<StoryManifest>);
        }
        break;
      }

      case 'update_theme': {
        const themeUpdate: Record<string, unknown> = {};
        if (actionData?.colors) {
          themeUpdate.theme = {
            ...(manifest.theme || {}),
            colors: { ...(manifest.theme?.colors || {}), ...(actionData.colors as Record<string, string>) },
          };
        }
        if (actionData?.fonts) {
          themeUpdate.theme = {
            ...((themeUpdate.theme as Record<string, unknown>) || manifest.theme || {}),
            fonts: { ...(manifest.theme?.fonts || {}), ...(actionData.fonts as Record<string, string>) },
          };
        }
        if (Object.keys(themeUpdate).length > 0) {
          actions.handleChatManifestUpdate(themeUpdate as Partial<StoryManifest>);
        }
        break;
      }

      case 'update_blocks': {
        const blocks = [...(manifest.blocks || [])];
        // Remove blocks
        if (Array.isArray(actionData?.remove)) {
          const removeIds = new Set(actionData.remove as string[]);
          const filtered = blocks.filter(b => !removeIds.has(b.id));
          actions.handleChatManifestUpdate({ blocks: filtered } as Partial<StoryManifest>);
        }
        // Add blocks
        if (Array.isArray(actionData?.add)) {
          const newBlocks = (actionData.add as Array<{ type: string; config?: Record<string, unknown> }>).map((b, i) => ({
            id: `ai-${b.type}-${Date.now()}-${i}`,
            type: b.type as import('@/types').BlockType,
            order: blocks.length + i,
            visible: true,
            config: b.config,
          }));
          actions.handleChatManifestUpdate({ blocks: [...blocks, ...newBlocks] } as Partial<StoryManifest>);
        }
        // Update block configs
        if (Array.isArray(actionData?.update)) {
          const updates = actionData.update as Array<{ id: string; config: Record<string, unknown> }>;
          const updated = blocks.map(b => {
            const u = updates.find(u2 => u2.id === b.id);
            return u ? { ...b, config: { ...b.config, ...u.config } } : b;
          });
          actions.handleChatManifestUpdate({ blocks: updated } as Partial<StoryManifest>);
        }
        break;
      }

      case 'update_events': {
        if (Array.isArray(actionData?.events)) {
          // Normalize dates to YYYY-MM-DD — Pear might send "June 15, 2025" etc.
          const normalizeDate = (d: string): string => {
            if (!d) return '';
            // Already ISO format
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
            // Try parsing natural language date
            const parsed = new Date(d);
            if (!isNaN(parsed.getTime())) {
              return parsed.toISOString().slice(0, 10);
            }
            return d;
          };
          const newEvents = (actionData.events as Array<Record<string, unknown>>).map((e, i) => ({
            id: `ai-event-${Date.now()}-${i}`,
            name: (e.name as string) || 'Event',
            type: (e.type as string) || 'other',
            date: normalizeDate((e.date as string) || ''),
            time: (e.time as string) || '',
            venue: (e.venue as string) || '',
            address: (e.address as string) || '',
            dressCode: (e.dressCode as string) || '',
            description: (e.description as string) || '',
          }));
          const existing = manifest.events || [];
          actions.handleChatManifestUpdate({ events: [...existing, ...newEvents] } as Partial<StoryManifest>);
        }
        break;
      }

      case 'update_faqs': {
        if (Array.isArray(actionData?.faqs)) {
          const newFaqs = (actionData.faqs as Array<{ question: string; answer: string }>).map((f, i) => ({
            id: `ai-faq-${Date.now()}-${i}`,
            question: f.question,
            answer: f.answer,
            order: (manifest.faqs?.length || 0) + i,
          }));
          const existing = manifest.faqs || [];
          actions.handleChatManifestUpdate({ faqs: [...existing, ...newFaqs] } as Partial<StoryManifest>);
        }
        break;
      }

      case 'update_registry': {
        const reg = manifest.registry || { enabled: true };
        const updates: Partial<StoryManifest['registry']> = { ...reg };
        if (Array.isArray(actionData?.entries)) {
          updates.entries = [...(reg.entries || []), ...(actionData.entries as Array<{ name: string; url: string; note?: string }>)];
        }
        if (actionData?.message) updates.message = actionData.message as string;
        if (actionData?.cashFundUrl) updates.cashFundUrl = actionData.cashFundUrl as string;
        if (actionData?.cashFundMessage) updates.cashFundMessage = actionData.cashFundMessage as string;
        actions.handleChatManifestUpdate({ registry: updates } as Partial<StoryManifest>);
        break;
      }

      case 'message':
      default:
        // No data changes, just the reply
        break;
    }
  }, [manifest, actions]);

  // ── Submit handler ────────────────────────────────────────

  const submit = useCallback(async (command: string, handler: QuickAction['handler'] = 'ai-chat') => {
    const trimmed = command.trim();
    if (!trimmed && handler !== 'ai-faq' && handler !== 'section-picker') return;

    // Section picker: open the canvas tab to add a section
    if (handler === 'section-picker') {
      dispatch({ type: 'SET_ACTIVE_TAB', tab: 'canvas' });
      close();
      return;
    }

    // Add user message to conversation
    setMessages(prev => [...prev, { role: 'user', text: trimmed, ts: Date.now() }]);
    setStatus('loading');
    setErrorMsg('');
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Helper: update usage tracking from any AI response
    const trackUsage = (data: Record<string, unknown>, res: globalThis.Response) => {
      // Check X-Pear-Remaining header
      const headerRemaining = res.headers.get('X-Pear-Remaining');
      if (headerRemaining === 'unlimited') {
        setPearPlan(typeof data.plan === 'string' ? data.plan : 'pro');
        setPearRemaining(null);
        return;
      }
      if (typeof data.remaining === 'number') {
        setPearRemaining(data.remaining);
        setPearPlan(typeof data.plan === 'string' ? data.plan : 'free');
      }
    };

    try {
      if (handler === 'ai-faq') {
        // Generate FAQs
        const res = await fetch('/api/ai-faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manifest }),
          signal: controller.signal,
        });
        // Handle 429 limit_reached
        if (res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error === 'limit_reached') {
            setPearRemaining(0);
            setLimitReached(true);
            setPearPlan('free');
            setStatus('idle');
            setInputVal('');
            return;
          }
          throw new Error('HTTP 429');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        trackUsage(data, res);
        if (data.faqs) {
          const existing = manifest.faqs || [];
          actions.handleChatManifestUpdate({ faqs: [...existing, ...data.faqs] });
          const faqReply = `Added ${data.faqs.length} FAQs to your site! You can edit them in the FAQ section. — Pear`;
          setPearReply(faqReply);
          setMessages(prev => [...prev, { role: 'pear', text: faqReply, action: 'update_faqs', ts: Date.now() }]);
          setInputVal('');
          setStatus('reply');
        } else {
          setStatus('success');
          successTimerRef.current = setTimeout(() => { close(); }, 1500);
        }
      } else {
        // AI chat command
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            manifest,
            activeChapterId: state.activeId,
          }),
          signal: controller.signal,
        });
        // Handle 429 limit_reached
        if (res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          if (errData.error === 'limit_reached') {
            setPearRemaining(0);
            setLimitReached(true);
            setPearPlan('free');
            setStatus('idle');
            setInputVal('');
            return;
          }
          throw new Error('HTTP 429');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        trackUsage(data, res);
        const reply = data.reply || data.message || '';
        applyAIResponse(data);

        // Always show Pear's reply if there is one
        if (reply) {
          setPearReply(reply);
          setMessages(prev => [...prev, { role: 'pear', text: reply, action: data.action, data: data.data, ts: Date.now() }]);
          setInputVal('');
          setStatus('reply');
        } else {
          // No reply text — show brief success and close
          setStatus('success');
          successTimerRef.current = setTimeout(() => { close(); }, 1500);
        }
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setStatus('error');
      const msg = (e as Error).message || '';
      if (msg.includes('401')) {
        setErrorMsg('Please sign in to use AI features.');
      } else if (msg.includes('500')) {
        setErrorMsg('Pear needs an API key to work.');
      } else if (msg.includes('429')) {
        setErrorMsg('Too many requests. Wait a moment and try again.');
      } else {
        setErrorMsg('Pear couldn\'t connect. Try again.');
      }
      setTimeout(() => {
        setStatus('idle');
        setErrorMsg('');
      }, 4000);
    }
  }, [manifest, state.activeId, actions, dispatch, close, applyAIResponse]);

  // ── Handle quick action click ─────────────────────────────

  const handleQuickAction = useCallback((action: QuickAction) => {
    if (action.handler === 'section-picker' || action.handler === 'ai-faq') {
      submit(action.prompt, action.handler);
    } else {
      submit(action.prompt, action.handler);
    }
  }, [submit]);

  // ── Handle form submit ────────────────────────────────────

  const handleSubmit = useCallback(() => {
    if (inputVal.trim()) {
      submit(inputVal);
    }
  }, [inputVal, submit]);

  // ── Determine active section for contextual actions ────────

  const activeSection = useMemo(() => {
    // First check if a block is selected — its type is the best signal
    if (state.activeId && manifest.blocks) {
      const selectedBlock = manifest.blocks.find(b => b.id === state.activeId);
      if (selectedBlock) return selectedBlock.type;
    }
    // Fall back to contextSection from editor state
    if (state.contextSection) return state.contextSection;
    // Fall back to activeTab if it maps to a section
    if (state.activeTab === 'story') return 'story';
    if (state.activeTab === 'events') return 'events';
    if (state.activeTab === 'design') return 'design';
    return null;
  }, [state.activeId, state.contextSection, state.activeTab, manifest.blocks]);

  const quickActions = useMemo(() => getContextualActions(manifest, activeSection), [manifest, activeSection]);

  // ── Determine mobile ──────────────────────────────────────

  const isMobile = state.isMobile;

  // ── Render ────────────────────────────────────────────────

  // Desktop side panel shown when expanded on >= 768px
  const showSidePanel = expanded && isDesktop;

  return (
    <>
      {/* ── Desktop Side Panel ──────────────────────────────── */}
      <AnimatePresence>
        {showSidePanel && (
          <motion.div
            key="side-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            style={{
              position: 'fixed',
              top: 52,
              right: 0,
              width: 380,
              height: 'calc(100vh - 52px)',
              zIndex: 150,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '16px 0 0 16px',
              background: 'rgba(250,247,242,0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(24,24,27,0.08)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            } as React.CSSProperties}
          >
            {/* ── Header ────────────────────────────────────── */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px 12px',
              borderBottom: '1px solid #F4F4F5',
              background: 'rgba(255,255,255,0.08)',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PearIcon size={20} color={OLIVE} />
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  
                  color: '#18181B',
                }}>Pear</span>
                {/* Usage counter */}
                {pearRemaining !== null && pearPlan === 'free' ? (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: pearRemaining <= 3 ? '#b45309' : '#71717A',
                    background: pearRemaining <= 3 ? 'rgba(180,83,9,0.08)' : 'rgba(0,0,0,0.04)',
                    padding: '2px 8px',
                    borderRadius: 100,
                    fontFamily: 'var(--pl-font-body)',
                  }}>
                    {15 - pearRemaining}/15
                  </span>
                ) : pearPlan !== 'free' ? (
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: OLIVE,
                    background: 'rgba(24,24,27,0.06)',
                    padding: '2px 8px',
                    borderRadius: 100,
                    fontFamily: 'var(--pl-font-body)',
                  }}>
                    {'\u221E'}
                  </span>
                ) : null}
              </div>
              <motion.button
                onClick={close}
                title="Close panel"
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                whileTap={{ scale: 0.88 }}
                style={{
                  width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 8, border: 'none',
                  background: 'transparent',
                  color: '#71717A',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </motion.button>
            </div>

            {/* ── Messages area ─────────────────────────────── */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              padding: '16px 16px 8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            } as React.CSSProperties}>
              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 8,
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                }}>
                  {msg.role === 'pear' && (
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(24,24,27,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <PearIcon size={14} color={OLIVE} />
                    </div>
                  )}
                  <div style={{
                    maxWidth: '85%', padding: '8px 10px', borderRadius: 16,
                    fontSize: '0.8rem', lineHeight: 1.55, whiteSpace: 'pre-wrap',
                    background: msg.role === 'user' ? '#F4F4F5' : 'rgba(255,255,255,0.7)',
                    color: 'var(--pl-ink-soft, #3D3530)',
                    border: msg.role === 'pear' ? '1px solid rgba(24,24,27,0.06)' : 'none',
                  }}>
                    {msg.text}
                    {/* Visual change preview — theme colors */}
                    {msg.action === 'update_theme' && msg.data && typeof msg.data === 'object' && 'colors' in msg.data && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        {Object.values((msg.data as { colors: Record<string, string> }).colors).slice(0, 6).map((c: string, ci: number) => (
                          <div key={ci} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
                        ))}
                      </div>
                    )}
                    {/* Visual change preview — events */}
                    {msg.action === 'update_events' && msg.data && typeof msg.data === 'object' && 'events' in msg.data && (
                      <div style={{ marginTop: 6, fontSize: '0.65rem', color: '#71717A' }}>
                        {((msg.data as { events: Array<{ name: string }> }).events).map((e, ei) => (
                          <div key={ei}>• {e.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {status === 'loading' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(24,24,27,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <PearIcon size={14} color={OLIVE} />
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 16, background: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', color: '#71717A' }}>
                    <span style={{ animation: 'pulse 1.5s infinite' }}>Pear is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick actions (above input) ───────────────── */}
            {status === 'idle' && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                padding: '10px 16px',
                borderTop: '1px solid rgba(24,24,27,0.04)',
                flexShrink: 0,
                width: '100%',
                boxSizing: 'border-box',
              } as React.CSSProperties}>
                {quickActions.map(action => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 100,
                      background: 'rgba(24,24,27,0.06)',
                      border: '1px solid rgba(24,24,27,0.08)',
                      color: OLIVE,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
                      cursor: 'pointer',
                      outline: 'none',
                      whiteSpace: 'nowrap',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.target as HTMLElement).style.background = 'rgba(24,24,27,0.08)';
                      (e.target as HTMLElement).style.borderColor = '#E4E4E7';
                    }}
                    onMouseLeave={e => {
                      (e.target as HTMLElement).style.background = 'rgba(24,24,27,0.06)';
                      (e.target as HTMLElement).style.borderColor = 'rgba(24,24,27,0.08)';
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            {/* ── Low messages warning ──────────────────────── */}
            {!limitReached && pearRemaining !== null && pearRemaining <= 3 && pearRemaining > 0 && pearPlan === 'free' && (
              <div style={{
                padding: '6px 16px',
                fontSize: '0.65rem',
                color: '#b45309',
                background: 'rgba(180,83,9,0.05)',
                borderTop: '1px solid rgba(180,83,9,0.1)',
                textAlign: 'center',
                flexShrink: 0,
                fontFamily: 'var(--pl-font-body)',
              }}>
                {pearRemaining} message{pearRemaining === 1 ? '' : 's'} left this month
              </div>
            )}

            {/* ── Limit reached upgrade prompt ─────────────────── */}
            {limitReached ? (
              <div style={{
                padding: '20px 16px',
                borderTop: '1px solid #F4F4F5',
                background: 'rgba(255,255,255,0.06)',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                textAlign: 'center',
              }}>
                {/* Pear avatar + message */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  width: '100%',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(24,24,27,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <PearIcon size={20} color={OLIVE} />
                  </div>
                  <div style={{
                    padding: '8px 10px', borderRadius: 16,
                    background: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(24,24,27,0.06)',
                    fontSize: '0.8rem', lineHeight: 1.55,
                    color: '#3F3F46',
                    fontFamily: 'var(--pl-font-body)',
                    textAlign: 'left',
                  }}>
                    I&apos;ve loved helping you build your site! Upgrade to Pro to keep our conversation going. — Pear
                  </div>
                </div>

                {/* Glass card */}
                <div style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 16,
                  background: '#FFFFFF',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(24,24,27,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 10,
                } as React.CSSProperties}>
                  <p style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#18181B',
                    fontFamily: 'inherit',
                    
                    margin: 0,
                  }}>
                    You&apos;ve used all 15 free Pear messages this month
                  </p>
                  <button
                    onClick={() => { window.location.href = '/dashboard?upgrade=true'; }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '10px 24px', borderRadius: 100,
                      background: OLIVE, color: 'white',
                      border: 'none', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 700,
                      fontFamily: 'var(--pl-font-body)',
                      letterSpacing: '0.02em',
                      boxShadow: '0 4px 16px #E4E4E7',
                    }}
                  >
                    <Crown size={14} />
                    Upgrade to Pro
                  </button>
                  <button
                    onClick={() => { /* dismiss — just let them read history */ }}
                    style={{
                      background: 'none', border: 'none',
                      cursor: 'pointer', fontSize: '0.65rem',
                      color: '#71717A',
                      fontFamily: 'var(--pl-font-body)',
                      textDecoration: 'underline',
                      textDecorationColor: 'rgba(0,0,0,0.15)',
                      textUnderlineOffset: '2px',
                    }}
                  >
                    Or wait until next month
                  </button>
                </div>
              </div>
            ) : (
            /* ── Input bar (fixed at bottom) ───────────────── */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px 14px',
              borderTop: '1px solid #F4F4F5',
              background: 'rgba(255,255,255,0.06)',
              flexShrink: 0,
            }}>
              {/* Status icon */}
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <AnimatePresence mode="wait">
                  {status === 'success' ? (
                    <motion.div
                      key="sp-check"
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Check size={16} color={OLIVE} strokeWidth={2.5} />
                    </motion.div>
                  ) : status === 'loading' ? (
                    <motion.div
                      key="sp-loader"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader2 size={16} color={OLIVE} />
                    </motion.div>
                  ) : (
                    <motion.div key="sp-sparkles">
                      <Sparkles size={16} color={OLIVE} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input
                ref={sidePanelInputRef}
                value={status === 'success' ? 'Pear applied your changes!' : status === 'error' ? errorMsg : inputVal}
                onChange={e => { setInputVal(e.target.value); if (status === 'reply') setStatus('idle'); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (status === 'reply') setPearReply('');
                    handleSubmit();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                  }
                }}
                disabled={status === 'loading' || status === 'success'}
                placeholder={status === 'loading' ? 'Pear is thinking...' : status === 'reply' ? 'Reply to Pear...' : 'Ask Pear anything...'}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: status === 'success'
                    ? OLIVE
                    : status === 'error'
                      ? '#b91c1c'
                      : 'var(--pl-ink, #2B1E14)',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
                  fontWeight: status === 'success' ? 600 : 400,
                  caretColor: OLIVE,
                  minWidth: 0,
                }}
              />

              {/* Send button */}
              {status === 'idle' && inputVal.trim() && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  onClick={handleSubmit}
                  style={{
                    width: 28, height: 28,
                    borderRadius: '50%',
                    background: OLIVE,
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    outline: 'none',
                    flexShrink: 0,
                  }}
                >
                  <ArrowUp size={14} color="white" strokeWidth={2.5} />
                </motion.button>
              )}
            </div>
            )}

            {/* Loading shimmer overlay */}
            <AnimatePresence>
              {status === 'loading' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 10,
                    borderRadius: '16px 0 0 16px',
                    overflow: 'hidden',
                    pointerEvents: 'none',
                  }}
                >
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(24,24,27,0.04) 50%, transparent 100%)',
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Pill / Expanded Bar (mobile + collapsed desktop) ── */}
      {!showSidePanel && (
        <div
          style={{
            position: 'fixed',
            bottom: isMobile ? 80 : 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
            width: isMobile ? 'calc(100% - 32px)' : 'auto',
            maxWidth: isMobile ? 'calc(100% - 32px)' : '520px',
          }}
        >
          <AnimatePresence mode="wait">
            {!expanded ? (
              /* ── Collapsed Pill ────────────────────────────────── */
              <motion.button
                key="pill"
                initial={{ opacity: 0, y: 12, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                onClick={open}
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid #E4E4E7`,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: 'var(--pl-ink-soft, #3D3530)',
                  whiteSpace: 'nowrap',
                  outline: 'none',
                } as React.CSSProperties}
              >
                <motion.span
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <Sparkles size={15} color={OLIVE} />
                </motion.span>
                <PearIcon size={15} color={OLIVE} style={{ marginRight: '-4px' }} className={status === 'loading' ? 'pl-pear-breathe' : undefined} />
                Ask Pear anything...
                <kbd style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '0.6rem',
                  background: 'rgba(0,0,0,0.04)',
                  color: 'var(--pl-muted, #9e9a96)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  fontFamily: 'inherit',
                  marginLeft: '4px',
                }}>/</kbd>
              </motion.button>
            ) : (
              /* ── Expanded Command Bar (mobile only) ───────────── */
              <motion.div
                key="bar"
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  pointerEvents: 'auto',
                  width: isMobile ? '100%' : '480px',
                  borderRadius: '24px',
                  background: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid #E4E4E7',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  position: 'relative',
                } as React.CSSProperties}
              >
                {/* Loading shimmer overlay */}
                <AnimatePresence>
                  {status === 'loading' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 10,
                        borderRadius: '24px',
                        overflow: 'hidden',
                        pointerEvents: 'none',
                      }}
                    >
                      <motion.div
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(90deg, transparent 0%, #F4F4F5 50%, transparent 100%)',
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Conversation thread */}
                {messages.length > 0 && (
                  <div style={{
                    maxHeight: '280px', overflowY: 'auto', padding: '12px 16px 4px',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    borderBottom: '1px solid #F4F4F5',
                  }}>
                    {messages.map((msg, i) => (
                      <div key={i} style={{
                        display: 'flex', gap: '8px',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                        alignItems: 'flex-start',
                      }}>
                        {msg.role === 'pear' && (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(24,24,27,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                            <PearIcon size={13} color={OLIVE} />
                          </div>
                        )}
                        <div style={{
                          maxWidth: '80%', padding: '8px 12px', borderRadius: '8px',
                          fontSize: '0.8rem', lineHeight: 1.5, whiteSpace: 'pre-wrap',
                          background: msg.role === 'user' ? '#F4F4F5' : 'rgba(250,247,242,0.8)',
                          color: 'var(--pl-ink-soft, #3D3530)',
                          border: msg.role === 'pear' ? '1px solid rgba(24,24,27,0.06)' : 'none',
                        }}>
                          {msg.text}
                          {/* Visual change preview */}
                          {msg.action === 'update_theme' && msg.data && typeof msg.data === 'object' && 'colors' in msg.data && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                              {Object.values((msg.data as { colors: Record<string, string> }).colors).slice(0, 6).map((c: string, ci: number) => (
                                <div key={ci} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
                              ))}
                            </div>
                          )}
                          {msg.action === 'update_events' && msg.data && typeof msg.data === 'object' && 'events' in msg.data && (
                            <div style={{ marginTop: 6, fontSize: '0.65rem', color: '#71717A' }}>
                              {((msg.data as { events: Array<{ name: string }> }).events).map((e, ei) => (
                                <div key={ei}>• {e.name}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {status === 'loading' && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(24,24,27,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <PearIcon size={13} color={OLIVE} />
                        </div>
                        <div style={{ padding: '8px 12px', borderRadius: 14, background: 'rgba(250,247,242,0.8)', fontSize: '0.8rem', color: '#71717A' }}>
                          <span style={{ animation: 'pulse 1.5s infinite' }}>Pear is thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Input row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                }}>
                  {/* Status icon */}
                  <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <AnimatePresence mode="wait">
                      {status === 'success' ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <Check size={16} color={OLIVE} strokeWidth={2.5} />
                        </motion.div>
                      ) : status === 'loading' ? (
                        <motion.div
                          key="loader"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <Loader2 size={16} color={OLIVE} />
                        </motion.div>
                      ) : (
                        <motion.div key="sparkles">
                          <Sparkles size={16} color={OLIVE} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Input field */}
                  <input
                    ref={inputRef}
                    value={status === 'success' ? 'Pear applied your changes!' : status === 'error' ? errorMsg : inputVal}
                    onChange={e => { setInputVal(e.target.value); if (status === 'reply') setStatus('idle'); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (status === 'reply') setPearReply('');
                        handleSubmit();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        close();
                      }
                    }}
                    disabled={status === 'loading' || status === 'success'}
                    placeholder={status === 'loading' ? 'Pear is thinking...' : status === 'reply' ? 'Reply to Pear...' : 'Ask Pear anything...'}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: status === 'success'
                        ? OLIVE
                        : status === 'error'
                          ? '#b91c1c'
                          : 'var(--pl-ink, #2B1E14)',
                      fontSize: '0.8rem',
                      fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
                      fontWeight: status === 'success' ? 600 : 400,
                      caretColor: OLIVE,
                      minWidth: 0,
                    }}
                  />

                  {/* Submit / close buttons */}
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
                    {status === 'idle' && inputVal.trim() && (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        onClick={handleSubmit}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: OLIVE,
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <ArrowUp size={14} color="white" strokeWidth={2.5} />
                      </motion.button>
                    )}
                    <button
                      onClick={close}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.04)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        outline: 'none',
                      }}
                    >
                      <X size={13} color="var(--pl-muted, #9e9a96)" />
                    </button>
                  </div>
                </div>

                {/* Quick action chips */}
                {status === 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      padding: '0 16px 14px',
                    }}
                  >
                    {quickActions.map(action => (
                      <button
                        key={action.label}
                        onClick={() => handleQuickAction(action)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '8px',
                          background: 'rgba(24,24,27,0.06)',
                          border: '1px solid rgba(24,24,27,0.08)',
                          color: OLIVE,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                          fontFamily: 'var(--pl-font-body, Lora, Georgia, serif)',
                          cursor: 'pointer',
                          outline: 'none',
                          whiteSpace: 'nowrap',
                          transition: 'background 0.15s, border-color 0.15s',
                        }}
                        onMouseEnter={e => {
                          (e.target as HTMLElement).style.background = 'rgba(24,24,27,0.08)';
                          (e.target as HTMLElement).style.borderColor = '#E4E4E7';
                        }}
                        onMouseLeave={e => {
                          (e.target as HTMLElement).style.background = 'rgba(24,24,27,0.06)';
                          (e.target as HTMLElement).style.borderColor = 'rgba(24,24,27,0.08)';
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
