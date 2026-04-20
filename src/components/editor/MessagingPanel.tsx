'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/MessagingPanel.tsx
// Compose and send messages to guests. Migrated to the panel/
// token system so subject/body fields share chrome with every
// other editor input.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send } from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import {
  PanelField,
  PanelInput,
  PanelTextarea,
  SaveIndicator,
  type SaveState,
} from './panel';
import type { StoryManifest } from '@/types';

interface MessagingPanelProps {
  manifest: StoryManifest | null | undefined;
  siteId: string;
  subdomain: string;
}

export function MessagingPanel({ siteId, subdomain }: MessagingPanelProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [state, setState] = useState<SaveState>('idle');
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  const ready = subject.trim() && body.trim();

  async function handleSend() {
    if (!ready) return;
    setState('saving');
    setResult(null);
    try {
      const res = await fetch(`/api/messaging/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, subdomain, subject, body }),
      });
      const data = await res.json();
      setResult(data);
      setState(data.failed === 0 ? 'saved' : 'error');
    } catch {
      setResult({ sent: 0, failed: 1 });
      setState('error');
    }
  }

  return (
    <SidebarSection title="Message Guests" icon={Mail}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PanelField label="Subject">
          <PanelInput
            value={subject}
            onChange={setSubject}
            placeholder="A message from us"
          />
        </PanelField>

        <PanelField label="Message">
          <PanelTextarea
            value={body}
            onChange={setBody}
            rows={6}
            placeholder="Write your message here\u2026"
          />
        </PanelField>

        {result && (
          <div
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--pl-radius-lg)',
              background: result.failed === 0 ? '#F4F4F5' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${result.failed === 0 ? '#E4E4E7' : 'rgba(248,113,113,0.3)'}`,
              fontSize: '0.75rem',
              color: result.failed === 0 ? '#3F3F46' : '#B91C1C',
            }}
          >
            {result.failed === 0
              ? `Sent to ${result.sent} guest${result.sent !== 1 ? 's' : ''}`
              : `Sent: ${result.sent} \u00B7 Failed: ${result.failed}`}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <motion.button
            type="button"
            onClick={handleSend}
            disabled={state === 'saving' || !ready}
            whileHover={state !== 'saving' && ready ? { backgroundColor: '#09090B' } : undefined}
            whileTap={state !== 'saving' && ready ? { scale: 0.97 } : undefined}
            transition={{ duration: 0.13 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '10px 14px',
              borderRadius: 'var(--pl-radius-lg)',
              border: '1px solid #18181B',
              background: ready ? '#18181B' : '#F4F4F5',
              color: ready ? '#fff' : '#A1A1AA',
              cursor: state === 'saving' || !ready ? 'not-allowed' : 'pointer',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              opacity: !ready ? 0.7 : 1,
            }}
          >
            <Send size={12} />
            {state === 'saving' ? 'Sending\u2026' : 'Send Message'}
          </motion.button>
          <SaveIndicator state={state} errorLabel="Send failed" />
        </div>
      </div>
    </SidebarSection>
  );
}
