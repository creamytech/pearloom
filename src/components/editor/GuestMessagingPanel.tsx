'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/GuestMessagingPanel.tsx
// Full guest messaging panel: compose, filter by segment,
// send, and view previously sent messages.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, Clock, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { useEditor } from '@/lib/editor-state';

// ── Types ────────────────────────────────────────────────────

type RecipientFilter = 'all' | 'attending' | 'declined' | 'pending';

interface GuestMessage {
  id: string;
  siteId: string;
  subject: string;
  body: string;
  recipientFilter: RecipientFilter;
  sentAt: string;
}

// ── Filter pills ─────────────────────────────────────────────

const FILTERS: Array<{ value: RecipientFilter; label: string }> = [
  { value: 'all', label: 'All Guests' },
  { value: 'attending', label: 'Attending' },
  { value: 'declined', label: 'Declined' },
  { value: 'pending', label: 'Pending' },
];

// ── Styles (organic glass + olive accents) ───────────────────

const glassCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.5)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: '1rem',
  border: '1px solid rgba(255,255,255,0.35)',
  boxShadow: '0 4px 24px rgba(62,52,42,0.06), 0 1px 4px rgba(62,52,42,0.04)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(154,148,136,0.8)',
  marginBottom: '0.5rem',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'rgba(163,177,138,0.06)',
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: '0.75rem',
  color: 'var(--pl-ink, #2B2B2B)',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  lineHeight: 1.6,
  transition: 'border-color 0.15s ease',
};

// ── Component ────────────────────────────────────────────────

export function GuestMessagingPanel() {
  const { state, manifest } = useEditor();
  const siteId = state.subdomain;

  // Compose state
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; text: string } | null>(null);

  // History state
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Derive couple name for header
  const theme = manifest as unknown as {
    theme?: { personOneName?: string; personTwoName?: string };
  };
  const coupleName =
    theme?.theme?.personOneName && theme?.theme?.personTwoName
      ? `${theme.theme.personOneName} & ${theme.theme.personTwoName}`
      : null;

  // ── Fetch message history ──────────────────────────────────

  const fetchHistory = useCallback(async () => {
    if (!siteId) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/guest-messages?siteId=${encodeURIComponent(siteId)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages ?? []);
      }
    } catch {
      // Silently fail — history is non-critical
    } finally {
      setLoadingHistory(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ── Send message ───────────────────────────────────────────

  async function handleSend() {
    if (!subject.trim() || !body.trim() || sending) return;
    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/guest-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, subject, body, recipientFilter }),
      });

      if (res.ok) {
        setSendResult({ ok: true, text: 'Message sent successfully!' });
        setSubject('');
        setBody('');
        // Refresh history
        fetchHistory();
      } else {
        const data = await res.json();
        setSendResult({ ok: false, text: data.error || 'Failed to send.' });
      }
    } catch {
      setSendResult({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setSending(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────────

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function filterLabel(f: RecipientFilter): string {
    return FILTERS.find((x) => x.value === f)?.label ?? f;
  }

  // ── Render ─────────────────────────────────────────────────

  return (
    <div
      style={{
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        minHeight: '100%',
      }}
    >
      {/* Header */}
      <div>
        <h2
          style={{
            fontSize: '1.15rem',
            fontWeight: 500,
            fontStyle: 'italic',
            fontFamily: 'var(--pl-font-heading, "Playfair Display", serif)',
            color: 'var(--pl-ink, #2B2B2B)',
            margin: '0 0 4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Mail size={18} style={{ color: 'var(--pl-olive, #A3B18A)' }} />
          Guest Messages
        </h2>
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--pl-ink-soft, #9A9488)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Send updates to guests who have RSVP'd
          {coupleName && (
            <span style={{ fontStyle: 'italic' }}> — from {coupleName}</span>
          )}
        </p>
      </div>

      {/* Compose card */}
      <div style={{ ...glassCard, padding: '20px' }}>
        {/* Recipient filter pills */}
        <div style={{ marginBottom: '16px' }}>
          <div style={labelStyle}>Send to</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FILTERS.map((f) => {
              const isActive = recipientFilter === f.value;
              return (
                <motion.button
                  key={f.value}
                  onClick={() => setRecipientFilter(f.value)}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  style={{
                    padding: '0.375rem 0.875rem',
                    borderRadius: '100px',
                    border: isActive
                      ? '1px solid rgba(163,177,138,0.5)'
                      : '1px solid rgba(0,0,0,0.08)',
                    background: isActive
                      ? 'rgba(163,177,138,0.2)'
                      : 'rgba(255,255,255,0.6)',
                    color: isActive
                      ? 'var(--pl-olive, #A3B18A)'
                      : 'var(--pl-ink-soft, #9A9488)',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isActive && <Users size={11} />}
                  {f.label}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="A message from us..."
            disabled={sending}
            style={{
              ...inputBase,
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(163,177,138,0.4)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
            }}
          />
        </div>

        {/* Body */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Write a message to your ${recipientFilter === 'all' ? 'guests' : recipientFilter + ' guests'}...`}
            rows={6}
            disabled={sending}
            style={{
              ...inputBase,
              resize: 'vertical',
              minHeight: '120px',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'rgba(163,177,138,0.4)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
            }}
          />
        </div>

        {/* Result feedback */}
        <AnimatePresence>
          {sendResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              style={{
                marginBottom: '14px',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                background: sendResult.ok
                  ? 'rgba(163,177,138,0.12)'
                  : 'rgba(248,113,113,0.1)',
                border: `1px solid ${sendResult.ok ? 'rgba(163,177,138,0.3)' : 'rgba(248,113,113,0.3)'}`,
                fontSize: '0.82rem',
                color: sendResult.ok ? '#6B7F5B' : '#dc2626',
                fontWeight: 500,
              }}
            >
              {sendResult.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim()}
          whileHover={!sending && subject.trim() && body.trim() ? { scale: 1.01 } : {}}
          whileTap={!sending && subject.trim() && body.trim() ? { scale: 0.98 } : {}}
          transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          style={{
            width: '100%',
            padding: '0.875rem',
            borderRadius: '0.75rem',
            border: 'none',
            background:
              sending || !subject.trim() || !body.trim()
                ? 'rgba(163,177,138,0.15)'
                : 'linear-gradient(135deg, #A3B18A 0%, #8FA27A 100%)',
            color:
              sending || !subject.trim() || !body.trim()
                ? 'rgba(154,148,136,0.5)'
                : 'white',
            fontWeight: 700,
            fontSize: '0.88rem',
            letterSpacing: '0.02em',
            cursor:
              sending || !subject.trim() || !body.trim()
                ? 'not-allowed'
                : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow:
              sending || !subject.trim() || !body.trim()
                ? 'none'
                : '0 2px 12px rgba(163,177,138,0.25)',
            transition: 'all 0.2s ease',
          }}
        >
          {sending ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'inline-block' }}
              >
                <Clock size={14} />
              </motion.span>
              Sending...
            </>
          ) : (
            <>
              <Send size={14} />
              Send to {filterLabel(recipientFilter)}
            </>
          )}
        </motion.button>
      </div>

      {/* Sent messages history */}
      <div>
        <h3
          style={{
            fontSize: '0.95rem',
            fontWeight: 500,
            fontStyle: 'italic',
            fontFamily: 'var(--pl-font-heading, "Playfair Display", serif)',
            color: 'var(--pl-ink, #2B2B2B)',
            margin: '0 0 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Clock size={14} style={{ color: 'var(--pl-olive, #A3B18A)' }} />
          Sent Messages
        </h3>

        {loadingHistory && (
          <p
            style={{
              fontSize: '0.82rem',
              color: 'var(--pl-ink-soft, #9A9488)',
              fontStyle: 'italic',
            }}
          >
            Loading...
          </p>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div
            style={{
              ...glassCard,
              padding: '24px 20px',
              textAlign: 'center',
            }}
          >
            <Mail
              size={28}
              style={{
                color: 'rgba(163,177,138,0.4)',
                marginBottom: '8px',
              }}
            />
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--pl-ink-soft, #9A9488)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              No messages sent yet. Compose your first message above.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isExpanded = expandedId === msg.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    ...glassCard,
                    padding: '14px 16px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                >
                  {/* Message header row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: 'var(--pl-ink, #2B2B2B)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {msg.subject}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '4px',
                          fontSize: '0.72rem',
                          color: 'var(--pl-ink-soft, #9A9488)',
                        }}
                      >
                        <span>{formatDate(msg.sentAt)}</span>
                        <span
                          style={{
                            padding: '1px 8px',
                            borderRadius: '100px',
                            background: 'rgba(163,177,138,0.12)',
                            color: 'var(--pl-olive, #A3B18A)',
                            fontWeight: 600,
                            fontSize: '0.68rem',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {filterLabel(msg.recipientFilter)}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={14} style={{ color: 'var(--pl-ink-soft, #9A9488)', flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <ChevronDown size={14} style={{ color: 'var(--pl-ink-soft, #9A9488)', flexShrink: 0, marginTop: '2px' }} />
                    )}
                  </div>

                  {/* Expanded body */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div
                          style={{
                            marginTop: '12px',
                            paddingTop: '12px',
                            borderTop: '1px solid rgba(0,0,0,0.05)',
                            fontSize: '0.82rem',
                            lineHeight: 1.65,
                            color: 'var(--pl-ink, #2B2B2B)',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {msg.body}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer note */}
      <p
        style={{
          fontSize: '0.72rem',
          color: 'var(--pl-muted, #9A9488)',
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Messages are sent via email to guests who provided their address during RSVP.
      </p>
    </div>
  );
}
