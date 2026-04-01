'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StoryManifest } from '@/types';

interface MessagingPanelProps {
  siteId: string;
  subdomain: string;
  manifest: StoryManifest;
}

type Segment = 'all' | 'attending' | 'pending' | 'declined';

interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
}

const SEGMENTS: Array<{ value: Segment; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'attending', label: 'Attending' },
  { value: 'pending', label: 'Pending' },
  { value: 'declined', label: 'Declined' },
];

const AI_DRAFTS: Record<Segment, string> = {
  all:
    "Hello everyone,\n\nWe're so excited to celebrate with you and wanted to share a quick update.\n\nWe'll be in touch soon with more details — stay tuned!\n\nWith love,",
  attending:
    "We're so excited to celebrate with you! Just a quick reminder about the upcoming day — we can't wait to see you there.\n\nIf you have any questions about logistics or need any details confirmed, please don't hesitate to reach out.\n\nWith love,",
  pending:
    "Hi there,\n\nWe noticed we haven't heard back from you yet and would love to know if you'll be able to join us!\n\nWe'd be so grateful if you could let us know your plans at your earliest convenience.\n\nWith love,",
  declined:
    "We completely understand and will miss you on our special day. We wanted to reach out personally to say how much your support means to us regardless.\n\nWe hope to celebrate with you another time soon!\n\nWith love,",
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.75rem',
  color: 'white',
  padding: '0.875rem 1rem',
  fontSize: '0.875rem',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  lineHeight: 1.6,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.45)',
  marginBottom: '0.5rem',
};

export function MessagingPanel({ siteId, manifest }: MessagingPanelProps) {
  const [segment, setSegment] = useState<Segment>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAIDraft() {
    setBody(AI_DRAFTS[segment]);
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      setError('Please fill in both subject and message.');
      return;
    }
    setSending(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, subject, body, segment }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send messages.');
      } else {
        setResult(data as SendResult);
        setSubject('');
        setBody('');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  // Derive couple name for preview
  const names = Array.isArray((manifest as unknown as Record<string, unknown>)?.coupleId)
    ? []
    : [];

  // Try to get names from manifest theme or coupleId context
  const themeNames = (manifest as unknown as { theme?: { personOneName?: string; personTwoName?: string } })?.theme;
  const coupleName = themeNames?.personOneName && themeNames?.personTwoName
    ? `${themeNames.personOneName} & ${themeNames.personTwoName}`
    : 'Your Guests';
  void names; // suppress unused warning

  return (
    <div
      style={{
        padding: '20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        minHeight: '100%',
      }}
    >
      {/* Title */}
      <div>
        <h2
          style={{
            fontSize: '1.1rem',
            fontWeight: 500,
            fontStyle: 'italic',
            fontFamily: 'var(--eg-font-heading, "Playfair Display", serif)',
            color: 'rgba(245,241,232,0.92)',
            margin: '0 0 6px',
          }}
        >
          Message Guests
        </h2>
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
          Send updates to your guest list
        </p>
      </div>

      {/* Segment selector */}
      <div>
        <div style={labelStyle}>Send to</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SEGMENTS.map((s) => {
            const isActive = segment === s.value;
            return (
              <motion.button
                key={s.value}
                onClick={() => setSegment(s.value)}
                whileTap={{ scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                style={{
                  padding: '0.4rem 0.875rem',
                  borderRadius: '100px',
                  border: isActive
                    ? '1px solid rgba(163,177,138,0.4)'
                    : '1px solid rgba(255,255,255,0.1)',
                  background: isActive
                    ? 'rgba(163,177,138,0.2)'
                    : 'rgba(255,255,255,0.05)',
                  color: isActive
                    ? 'var(--eg-accent, #A3B18A)'
                    : 'rgba(255,255,255,0.5)',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {s.label}
              </motion.button>
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
          placeholder="Your message subject..."
          style={inputStyle}
          disabled={sending}
        />
      </div>

      {/* Body */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Message</label>
          {/* AI Draft button */}
          <motion.button
            onClick={handleAIDraft}
            whileHover={{ opacity: 0.85 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            style={{
              background: 'rgba(163,177,138,0.12)',
              border: '1px solid rgba(163,177,138,0.25)',
              borderRadius: '100px',
              color: '#A3B18A',
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              padding: '0.3rem 0.7rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ✦ AI Draft
          </motion.button>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`Write a message to your ${segment === 'all' ? 'guests' : segment + ' guests'}...`}
          rows={6}
          style={{ ...inputStyle, resize: 'none' }}
          disabled={sending}
        />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            style={{
              background: 'rgba(248,113,113,0.12)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderRadius: '0.75rem',
              padding: '0.75rem 1rem',
              fontSize: '0.82rem',
              color: 'rgba(252,165,165,0.9)',
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success */}
      <AnimatePresence>
        {result && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            style={{
              background: 'rgba(163,177,138,0.12)',
              border: '1px solid rgba(163,177,138,0.3)',
              borderRadius: '0.75rem',
              padding: '0.875rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <motion.span
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.05 }}
              style={{ fontSize: '1.1rem', flexShrink: 0 }}
            >
              ✓
            </motion.span>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#A3B18A' }}>
                Sent to {result.sent} guest{result.sent !== 1 ? 's' : ''}
              </p>
              {(result.failed > 0 || result.skipped > 0) && (
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                  {result.failed > 0 && `${result.failed} failed`}
                  {result.failed > 0 && result.skipped > 0 && ' · '}
                  {result.skipped > 0 && `${result.skipped} skipped (no email)`}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send button */}
      <motion.button
        onClick={handleSend}
        disabled={sending}
        whileHover={!sending ? { opacity: 0.92, scale: 1.01 } : {}}
        whileTap={!sending ? { scale: 0.98 } : {}}
        transition={{ type: 'spring', stiffness: 380, damping: 22 }}
        style={{
          width: '100%',
          padding: '0.875rem 2rem',
          borderRadius: '0.75rem',
          border: 'none',
          background: sending
            ? 'rgba(255,255,255,0.08)'
            : 'linear-gradient(135deg, #A3B18A 0%, #7A917A 50%, #6D597A 100%)',
          color: sending ? 'rgba(255,255,255,0.35)' : 'white',
          fontWeight: 700,
          fontSize: '0.9rem',
          letterSpacing: '0.03em',
          cursor: sending ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {sending ? (
          <>
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{ display: 'inline-block', fontSize: '1rem' }}
            >
              ◌
            </motion.span>
            Sending…
          </>
        ) : (
          `Send to ${segment === 'all' ? 'All Guests' : segment.charAt(0).toUpperCase() + segment.slice(1) + ' Guests'}`
        )}
      </motion.button>

      {/* Footer note */}
      <p
        style={{
          fontSize: '0.72rem',
          color: 'rgba(255,255,255,0.25)',
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        Messages will be sent to guests who provided their email during RSVP
        {coupleName !== 'Your Guests' && (
          <> · From <em>{coupleName}</em></>
        )}
      </p>
    </div>
  );
}
