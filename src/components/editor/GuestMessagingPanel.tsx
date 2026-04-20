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
import {
  PanelRoot,
  PanelSection,
  PanelChip,
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';

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

// ── Shared styles ────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: panelText.label,
  fontWeight: panelWeight.bold,
  letterSpacing: panelTracking.wider,
  textTransform: 'uppercase',
  color: '#71717A',
  fontFamily: 'inherit',
  lineHeight: panelLineHeight.tight,
  marginBottom: '6px',
};

const inputBase: React.CSSProperties = {
  width: '100%',
  background: '#FFFFFF',
  border: '1px solid #E4E4E7',
  borderRadius: '8px',
  color: '#18181B',
  padding: '10px 12px',
  fontSize: 'max(16px, 0.8rem)',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  lineHeight: panelLineHeight.normal,
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#18181B';
  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.12)';
};
const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.currentTarget.style.borderColor = '#E4E4E7';
  e.currentTarget.style.boxShadow = 'none';
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

  const canSend = !sending && !!subject.trim() && !!body.trim();

  // ── Render ─────────────────────────────────────────────────

  return (
    <PanelRoot>
      <PanelSection
        title="Guest Messages"
        icon={Mail}
        hint={coupleName ? `Send updates to guests who RSVP'd — from ${coupleName}.` : "Send updates to guests who have RSVP'd."}
        card={false}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Recipient filter */}
          <div>
            <div style={labelStyle}>Send to</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {FILTERS.map((f) => {
                const isActive = recipientFilter === f.value;
                return (
                  <PanelChip
                    key={f.value}
                    active={isActive}
                    onClick={() => setRecipientFilter(f.value)}
                    size="sm"
                    fullWidth={false}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {isActive && <Users size={11} />}
                      {f.label}
                    </span>
                  </PanelChip>
                );
              })}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label style={labelStyle}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="A message from us..."
              disabled={sending}
              style={inputBase}
              onFocus={inputFocus}
              onBlur={inputBlur}
            />
          </div>

          {/* Body */}
          <div>
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
              onFocus={inputFocus}
              onBlur={inputBlur}
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
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: sendResult.ok ? '#F4F4F5' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${sendResult.ok ? '#E4E4E7' : 'rgba(239,68,68,0.25)'}`,
                  fontSize: panelText.body,
                  fontWeight: panelWeight.semibold,
                  color: sendResult.ok ? '#3F3F46' : '#b34747',
                  fontFamily: 'inherit',
                  lineHeight: panelLineHeight.snug,
                }}
              >
                {sendResult.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Send button */}
          <motion.button
            onClick={handleSend}
            disabled={!canSend}
            whileHover={canSend ? { y: -1 } : {}}
            whileTap={canSend ? { scale: 0.98 } : {}}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: canSend ? '#18181B' : '#E4E4E7',
              color: canSend ? '#FFFFFF' : '#71717A',
              fontWeight: panelWeight.bold,
              fontSize: panelText.body,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
              cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all var(--pl-dur-instant)',
            }}
          >
            {sending ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'inline-block' }}
                >
                  <Clock size={13} />
                </motion.span>
                Sending...
              </>
            ) : (
              <>
                <Send size={13} />
                Send to {filterLabel(recipientFilter)}
              </>
            )}
          </motion.button>
        </div>
      </PanelSection>

      {/* Sent messages history */}
      <PanelSection
        title="Sent Messages"
        icon={Clock}
        badge={messages.length || undefined}
        card={false}
      >
        {loadingHistory && (
          <p style={{
            fontSize: panelText.hint,
            color: '#71717A',
            fontFamily: 'inherit',
            lineHeight: panelLineHeight.snug,
            margin: 0,
          }}>
            Loading...
          </p>
        )}

        {!loadingHistory && messages.length === 0 && (
          <div style={{
            padding: '20px 16px',
            borderRadius: '12px',
            border: '1.5px dashed #E4E4E7',
            background: '#FAFAFA',
            textAlign: 'center',
          }}>
            <Mail size={22} style={{ color: '#71717A', opacity: 0.5, marginBottom: '8px' }} />
            <div style={{
              fontSize: panelText.itemTitle,
              fontWeight: panelWeight.bold,
              color: '#18181B',
              fontFamily: 'inherit',
              marginBottom: '4px',
              lineHeight: panelLineHeight.tight,
            }}>
              No messages sent yet
            </div>
            <div style={{
              fontSize: panelText.hint,
              color: '#71717A',
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.snug,
            }}>
              Compose your first message above.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                    background: '#FFFFFF',
                    border: '1px solid #E4E4E7',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    transition: 'all var(--pl-dur-instant)',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: panelText.itemTitle,
                        fontWeight: panelWeight.semibold,
                        color: '#18181B',
                        fontFamily: 'inherit',
                        lineHeight: panelLineHeight.tight,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {msg.subject}
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '4px',
                        fontSize: panelText.hint,
                        color: '#71717A',
                        fontFamily: 'inherit',
                        lineHeight: panelLineHeight.tight,
                      }}>
                        <span>{formatDate(msg.sentAt)}</span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '100px',
                          background: '#F4F4F5',
                          color: '#18181B',
                          fontWeight: panelWeight.bold,
                          fontSize: panelText.chip,
                          letterSpacing: panelTracking.wide,
                        }}>
                          {filterLabel(msg.recipientFilter)}
                        </span>
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronUp size={13} style={{ color: '#71717A', flexShrink: 0, marginTop: '2px' }} />
                      : <ChevronDown size={13} style={{ color: '#71717A', flexShrink: 0, marginTop: '2px' }} />}
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{
                          marginTop: '10px',
                          paddingTop: '10px',
                          borderTop: '1px solid #E4E4E7',
                          fontSize: panelText.body,
                          lineHeight: panelLineHeight.normal,
                          color: '#18181B',
                          fontFamily: 'inherit',
                          whiteSpace: 'pre-wrap',
                        }}>
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

        <p style={{
          fontSize: panelText.meta,
          color: '#71717A',
          fontFamily: 'inherit',
          textAlign: 'center',
          margin: '10px 0 0',
          lineHeight: panelLineHeight.snug,
        }}>
          Messages are sent via email to guests who provided their address during RSVP.
        </p>
      </PanelSection>
    </PanelRoot>
  );
}
