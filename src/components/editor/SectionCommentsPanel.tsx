'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/SectionCommentsPanel.tsx
//
// Floating section-anchored comment thread. Opens beside the
// currently selected block. Owner + co-editors + guest-managers
// + viewers can all post; the owner can delete any message.
//
// Uses Supabase Realtime postgres_changes so every collaborator
// sees new messages within ~200 ms.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Check, Send } from 'lucide-react';
import { assignCollabColor, getInitials } from '@/lib/realtime-collab';

interface Comment {
  id: string;
  site_id: string;
  section_id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  resolved: boolean;
  created_at: string;
}

interface Props {
  siteId: string;
  sectionId: string;
  sectionLabel?: string;
  currentUserEmail: string;
  onClose: () => void;
}

export function SectionCommentsPanel({
  siteId,
  sectionId,
  sectionLabel,
  currentUserEmail,
  onClose,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 30);
  }, []);

  // Initial fetch.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/comments?siteId=${encodeURIComponent(siteId)}&sectionId=${encodeURIComponent(sectionId)}`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((data: { comments: Comment[] }) => {
        if (cancelled) return;
        setComments(data.comments || []);
        setLoading(false);
        scrollToEnd();
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [siteId, sectionId, scrollToEnd]);

  // Realtime subscribe to INSERT / UPDATE / DELETE for this site/section.
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    if (!url || !key) return;
    const supabase = createClient(url, key);
    const channel = supabase
      .channel(`comments:${siteId}:${sectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'section_comments',
          filter: `site_id=eq.${siteId}`,
        },
        (payload) => {
          const row = (payload.new || payload.old) as Comment | null;
          if (!row || row.section_id !== sectionId) return;
          setComments((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((c) => c.id !== row.id);
            }
            if (payload.eventType === 'INSERT') {
              if (prev.some((c) => c.id === row.id)) return prev;
              return [...prev, row as Comment];
            }
            // UPDATE
            return prev.map((c) => (c.id === row.id ? (row as Comment) : c));
          });
          scrollToEnd();
        },
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [siteId, sectionId, scrollToEnd]);

  const post = async () => {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, sectionId, body: draft.trim() }),
      });
      if (res.ok) {
        setDraft('');
      }
    } finally {
      setSending(false);
    }
  };

  const toggleResolved = async (c: Comment) => {
    await fetch('/api/comments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, resolved: !c.resolved }),
    });
  };

  const remove = async (c: Comment) => {
    await fetch('/api/comments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id }),
    });
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'fixed',
        top: 'clamp(16px, 4vh, 48px)',
        right: 'clamp(16px, 3vw, 32px)',
        bottom: 'clamp(16px, 4vh, 48px)',
        width: 'min(380px, calc(100vw - 32px))',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--pl-cream-card, #FBF7EE)',
        border: '1px solid color-mix(in oklab, var(--pl-gold, #C19A4B) 35%, transparent)',
        borderRadius: 'var(--pl-radius-sm)',
        boxShadow: '0 18px 48px rgba(40,28,12,0.14), 0 4px 12px rgba(40,28,12,0.08)',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderBottom: '1px solid color-mix(in oklab, var(--pl-gold, #C19A4B) 22%, transparent)',
          background: 'var(--pl-cream, #F5EFE2)',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.56rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              fontWeight: 700,
            }}
          >
            Comments
          </div>
          <div
            style={{
              fontFamily: 'var(--pl-font-heading)',
              fontStyle: 'italic',
              fontSize: '0.98rem',
              color: 'var(--ink)',
              marginTop: 2,
            }}
          >
            {sectionLabel || sectionId}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close comments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            background: 'transparent',
            border: 'none',
            color: 'var(--ink-soft)',
            cursor: 'pointer',
            borderRadius: 'var(--pl-radius-sm)',
          }}
        >
          <X size={14} />
        </button>
      </header>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {loading ? (
          <p
            style={{
              color: 'var(--ink-muted)',
              fontSize: '0.85rem',
              textAlign: 'center',
              paddingTop: 40,
            }}
          >
            Loading…
          </p>
        ) : comments.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              paddingTop: 40,
              color: 'var(--ink-muted)',
              fontSize: '0.9rem',
              textAlign: 'center',
            }}
          >
            <MessageSquare size={22} strokeWidth={1.4} />
            <p style={{ margin: 0, fontFamily: 'var(--pl-font-heading)', fontStyle: 'italic' }}>
              No comments here yet.
            </p>
            <p style={{ margin: 0, fontSize: '0.78rem' }}>
              Start a thread. Everyone on the site will see it live.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {comments.map((c) => {
              const isMine = c.author_email === currentUserEmail;
              const color = assignCollabColor(c.author_email);
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: c.resolved ? 0.5 : 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: color,
                      color: '#0E0D0B',
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(c.author_name || c.author_email)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 8,
                        marginBottom: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--ink)',
                        }}
                      >
                        {c.author_name || c.author_email}
                      </span>
                      <span
                        style={{
                          fontFamily: 'var(--pl-font-mono)',
                          fontSize: '0.54rem',
                          letterSpacing: '0.16em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-muted)',
                        }}
                      >
                        {relativeTime(c.created_at)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                        color: 'var(--ink-soft)',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        textDecoration: c.resolved ? 'line-through' : 'none',
                      }}
                    >
                      {c.body}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        marginTop: 4,
                        fontFamily: 'var(--pl-font-mono)',
                        fontSize: '0.58rem',
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-muted)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleResolved(c)}
                        style={inlineActionStyle}
                      >
                        <Check size={9} strokeWidth={2.4} />
                        {c.resolved ? 'Reopen' : 'Resolve'}
                      </button>
                      {isMine && (
                        <button
                          type="button"
                          onClick={() => remove(c)}
                          style={inlineActionStyle}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        <div ref={endRef} />
      </div>

      {/* Compose */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid color-mix(in oklab, var(--pl-gold, #C19A4B) 22%, transparent)',
          background: 'var(--pl-cream, #F5EFE2)',
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              post();
            }
          }}
          placeholder="Add a comment…"
          rows={2}
          style={{
            width: '100%',
            resize: 'none',
            background: 'var(--card)',
            color: 'var(--ink)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--pl-radius-xs)',
            padding: '8px 10px',
            fontFamily: 'inherit',
            fontSize: '0.88rem',
            lineHeight: 1.45,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.54rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
            }}
          >
            ⌘ + Enter to send
          </span>
          <button
            type="button"
            onClick={post}
            disabled={sending || !draft.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: draft.trim() ? 'var(--ink)' : 'var(--line)',
              color: draft.trim() ? 'var(--cream)' : 'var(--ink-muted)',
              border: 'none',
              borderRadius: 'var(--pl-radius-full)',
              fontFamily: 'var(--pl-font-mono)',
              fontSize: '0.6rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontWeight: 700,
              cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
            }}
          >
            <Send size={11} />
            {sending ? 'Sending' : 'Post'}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

const inlineActionStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  background: 'transparent',
  border: 'none',
  color: 'var(--ink-muted)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  letterSpacing: 'inherit',
  textTransform: 'inherit',
  padding: 0,
};

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}
