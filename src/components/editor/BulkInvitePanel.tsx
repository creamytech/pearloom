'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/BulkInvitePanel.tsx
//
// Compose + send RSVP invitation emails to the guest list.
// Shows email preview, allows custom message, then sends via
// POST /api/invite/bulk.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, Check, X, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import type { Guest, StoryManifest } from '@/types';

interface BulkInvitePanelProps {
  manifest: StoryManifest;
  siteId: string;
  subdomain: string;
}

export function BulkInvitePanel({ manifest, siteId, subdomain }: BulkInvitePanelProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const coupleNames = (manifest as unknown as { names?: string[] }).names ?? [];
  const coupleDisplay = coupleNames.filter(Boolean).join(' & ') || 'The Couple';

  useEffect(() => {
    if (!siteId) return;
    fetch(`/api/guests?siteId=${encodeURIComponent(siteId)}`)
      .then(r => r.ok ? r.json() : { guests: [] })
      .then(({ guests: data = [] }) => {
        setGuests(data);
        // Pre-select pending + attending guests with email
        const preSelect = new Set(
          (data as Guest[])
            .filter(g => g.email && (g.status === 'pending' || g.status === 'attending'))
            .map(g => g.id)
        );
        setSelected(preSelect);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId]);

  const guestsWithEmail = guests.filter(g => g.email);
  const selectedGuests = guestsWithEmail.filter(g => selected.has(g.id));

  const toggleAll = () => {
    if (selected.size === guestsWithEmail.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(guestsWithEmail.map(g => g.id)));
    }
  };

  const handleSend = useCallback(async () => {
    if (selectedGuests.length === 0) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/invite/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          subdomain,
          coupleNames,
          message,
          guests: selectedGuests.map(g => ({ name: g.name, email: g.email! })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ sent: data.sent, failed: data.failed });
      } else {
        const { error } = await res.json();
        setResult({ sent: 0, failed: selectedGuests.length });
      }
    } catch {
      setResult({ sent: 0, failed: selectedGuests.length });
    } finally {
      setSending(false);
    }
  }, [selectedGuests, siteId, subdomain, coupleNames, message]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--pl-muted)', fontSize: '0.8rem' }}>
        Loading guests…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--pl-muted)',
      }}>
        <Mail size={11} /> Send Invitations
      </div>

      {guestsWithEmail.length === 0 ? (
        <div style={{
          padding: '12px', borderRadius: '8px',
          background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)',
          fontSize: '0.75rem', color: 'var(--pl-ink-soft)',
        }}>
          No guests with email addresses yet. Add guests with emails in the Guest List tab.
        </div>
      ) : (
        <>
          {/* Guest selector */}
          <SidebarSection title={`Recipients (${selectedGuests.length} selected)`} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={toggleAll}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.7rem', color: 'var(--pl-ink-soft)', textAlign: 'left',
                }}
              >
                {selected.size === guestsWithEmail.length ? (
                  <Check size={11} color="#A3B18A" />
                ) : (
                  <div style={{ width: '11px', height: '11px', borderRadius: '3px', border: '1px solid var(--pl-muted)' }} />
                )}
                {selected.size === guestsWithEmail.length ? 'Deselect all' : 'Select all'}
              </button>
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {guestsWithEmail.map(guest => {
                  const isSelected = selected.has(guest.id);
                  return (
                    <button
                      key={guest.id}
                      onClick={() => setSelected(prev => {
                        const n = new Set(prev);
                        if (n.has(guest.id)) n.delete(guest.id); else n.add(guest.id);
                        return n;
                      })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 8px', borderRadius: '7px',
                        background: isSelected ? 'var(--pl-olive-8)' : 'var(--pl-olive-5)',
                        border: `1px solid ${isSelected ? 'var(--pl-olive-20)' : 'transparent'}`,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
                        border: `1px solid ${isSelected ? '#A3B18A' : 'var(--pl-muted)'}`,
                        background: isSelected ? '#A3B18A22' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <Check size={8} color="#A3B18A" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.73rem', fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {guest.name}
                        </div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--pl-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {guest.email}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </SidebarSection>

          {/* Message */}
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--pl-muted)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
              Personal Message (optional)
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="We are delighted to invite you to celebrate our special day…"
              rows={3}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: '8px',
                border: '1px solid rgba(0,0,0,0.06)',
                background: 'var(--pl-olive-5)',
                color: 'var(--pl-ink)', fontSize: '0.78rem',
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Email preview toggle */}
          <button
            onClick={() => setPreviewOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.7rem', color: 'var(--pl-muted)',
              padding: '0',
            }}
          >
            {previewOpen ? <EyeOff size={11} /> : <Eye size={11} />}
            {previewOpen ? 'Hide preview' : 'Preview email'}
          </button>

          <AnimatePresence>
            {previewOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  borderRadius: '9px', overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.05)',
                  background: '#FAF8F4',
                }}
              >
                <div style={{ padding: '16px', fontFamily: 'Georgia, serif', color: 'var(--pl-ink-soft)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 400, letterSpacing: '-0.01em' }}>{coupleDisplay}</div>
                    <div style={{ fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8A7A4A', marginTop: '3px' }}>Request the pleasure of your company</div>
                  </div>
                  <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#444', margin: '0 0 8px' }}>Dear Guest,</p>
                  <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#444', margin: '0 0 12px' }}>
                    {message.trim() || 'We are delighted to invite you to celebrate our special day. Please visit our website for details and to RSVP.'}
                  </p>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '8px 20px', background: '#A3B18A', color: '#fff', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em' }}>RSVP NOW →</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result banner */}
          {result && (
            <div style={{
              padding: '10px 12px', borderRadius: '8px',
              background: result.failed === 0 ? 'var(--pl-olive-10)' : 'rgba(248,81,73,0.1)',
              border: `1px solid ${result.failed === 0 ? 'var(--pl-olive-30)' : 'rgba(248,81,73,0.3)'}`,
              fontSize: '0.75rem',
              color: result.failed === 0 ? '#A3B18A' : '#f87171',
            }}>
              {result.failed === 0
                ? `${result.sent} invitation${result.sent !== 1 ? 's' : ''} sent successfully`
                : `${result.sent} sent, ${result.failed} failed`}
            </div>
          )}

          {/* Send button */}
          <motion.button
            onClick={handleSend}
            disabled={sending || selectedGuests.length === 0}
            whileHover={selectedGuests.length > 0 ? { scale: 1.02 } : {}}
            whileTap={selectedGuests.length > 0 ? { scale: 0.97 } : {}}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              padding: '11px', borderRadius: '10px', border: 'none',
              background: selectedGuests.length > 0 ? 'var(--pl-olive-20)' : 'var(--pl-olive-5)',
              color: selectedGuests.length > 0 ? '#A3B18A' : 'var(--pl-muted)',
              cursor: selectedGuests.length > 0 && !sending ? 'pointer' : 'default',
              fontSize: '0.82rem', fontWeight: 800,
            }}
          >
            <Send size={14} />
            {sending
              ? 'Sending…'
              : selectedGuests.length === 0
                ? 'Select recipients first'
                : `Send to ${selectedGuests.length} guest${selectedGuests.length !== 1 ? 's' : ''}`}
          </motion.button>
        </>
      )}
    </div>
  );
}
