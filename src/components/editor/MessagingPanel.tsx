'use client';

// Pearloom / editor/MessagingPanel.tsx
// Compose and send messages to guests.

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send } from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import type { StoryManifest } from '@/types';

interface MessagingPanelProps {
  manifest: StoryManifest | null | undefined;
  siteId: string;
  subdomain: string;
}

export function MessagingPanel({ manifest, siteId, subdomain }: MessagingPanelProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/messaging/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, subdomain, subject, body }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ sent: 0, failed: 1 });
    } finally {
      setSending(false);
    }
  }

  return (
    <SidebarSection title="Message Guests" icon={Mail}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{
            display: 'block', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(154,148,136,0.8)', marginBottom: 6,
          }}>
            Subject
          </label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="A message from us"
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.06)',
              background: '#F4F4F5',
              color: '#18181B', fontSize: '0.8rem',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block', fontSize: '0.75rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(154,148,136,0.8)', marginBottom: 6,
          }}>
            Message
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={6}
            placeholder="Write your message here…"
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.06)',
              background: '#F4F4F5',
              color: '#18181B', fontSize: '0.8rem',
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {result && (
          <div style={{
            padding: '8px 10px', borderRadius: 10,
            background: result.failed === 0
              ? '#F4F4F5' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${result.failed === 0
              ? '#E4E4E7' : 'rgba(248,113,113,0.3)'}`,
            fontSize: '0.8rem',
            color: result.failed === 0 ? '#71717A' : '#f87171',
          }}>
            {result.failed === 0
              ? `Sent to ${result.sent} guest${result.sent !== 1 ? 's' : ''}`
              : `Sent: ${result.sent} · Failed: ${result.failed}`}
          </div>
        )}

        <motion.button
          onClick={handleSend}
          disabled={sending || !subject.trim() || !body.trim()}
          whileHover={{ backgroundColor: 'rgba(24,24,27,0.12)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.13 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px', borderRadius: 12,
            border: '1px solid #E4E4E7',
            background: '#F4F4F5', color: '#71717A',
            cursor: sending ? 'not-allowed' : 'pointer',
            fontSize: '0.8rem', fontWeight: 700,
            opacity: (sending || !subject.trim() || !body.trim()) ? 0.5 : 1,
          }}
        >
          <Send size={14} />
          {sending ? 'Sending…' : 'Send Message'}
        </motion.button>
      </div>
    </SidebarSection>
  );
}
