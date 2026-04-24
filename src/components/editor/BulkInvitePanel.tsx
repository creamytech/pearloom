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
import { Mail, Send, Check, Eye, EyeOff } from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import {
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';
import type { Guest, StoryManifest } from '@/types';

interface BulkInvitePanelProps {
  manifest: StoryManifest;
  siteId: string;
  subdomain: string;
}

export function BulkInvitePanel({ manifest, siteId, subdomain }: BulkInvitePanelProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const coupleNames = (manifest as unknown as { names?: string[] }).names ?? [];
  const coupleDisplay = coupleNames.filter(Boolean).join(' & ') || 'The Couple';

  useEffect(() => {
    if (!siteId) return;
    setLoadError(null);
    fetch(`/api/guests?siteId=${encodeURIComponent(siteId)}`)
      .then(async r => {
        if (!r.ok) throw new Error(`Failed to load guests (${r.status})`);
        return r.json();
      })
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
      .catch(err => {
        setLoadError(err instanceof Error ? err.message : 'Couldn\u2019t load your guest list.');
      })
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
      const eventSummaries = (manifest.events ?? []).map(e => ({
        name: e.name,
        date: e.date,
        time: e.time,
        venue: e.venue,
        address: e.address,
      }));
      const res = await fetch('/api/invite/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          subdomain,
          coupleNames,
          message,
          occasion: manifest.occasion,
          events: eventSummaries,
          rsvpDeadline: manifest.logistics?.rsvpDeadline,
          guests: selectedGuests.map(g => ({ id: g.id, name: g.name, email: g.email! })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult({ sent: data.sent, failed: data.failed });
      } else {
        setResult({ sent: 0, failed: selectedGuests.length });
      }
    } catch {
      setResult({ sent: 0, failed: selectedGuests.length });
    } finally {
      setSending(false);
    }
  }, [selectedGuests, siteId, subdomain, coupleNames, message, manifest.occasion, manifest.events, manifest.logistics?.rsvpDeadline]);

  // Listen for the Save-the-Date panel's "send as save-the-date" hand-off.
  // The event carries { variant, message? } — we pre-fill the message and
  // open the preview so the user just needs to hit Send.
  useEffect(() => {
    function onSendSaveTheDate(e: Event) {
      const detail = (e as CustomEvent).detail as { message?: string } | undefined;
      if (detail?.message) setMessage(detail.message);
      setPreviewOpen(true);
    }
    window.addEventListener('pearloom:send-save-the-date', onSendSaveTheDate);
    return () => window.removeEventListener('pearloom:send-save-the-date', onSendSaveTheDate);
  }, []);

  if (loading) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#71717A',
        fontSize: panelText.body,
        fontFamily: 'inherit',
        lineHeight: panelLineHeight.snug,
      }}>
        Loading guests…
      </div>
    );
  }

  const canSend = !sending && selectedGuests.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: panelText.label,
        fontWeight: panelWeight.bold,
        letterSpacing: panelTracking.wider,
        textTransform: 'uppercase',
        color: '#71717A',
        fontFamily: 'inherit',
        lineHeight: panelLineHeight.tight,
      }}>
        <Mail size={12} /> Send Invitations
      </div>

      {loadError ? (
        <div style={{
          padding: '14px',
          borderRadius: 'var(--pl-radius-lg)',
          background: 'color-mix(in oklab, #7A2D2D 10%, transparent)',
          border: '1px solid color-mix(in oklab, #7A2D2D 35%, transparent)',
          fontSize: panelText.body,
          fontWeight: panelWeight.semibold,
          color: '#7A2D2D',
          fontFamily: 'inherit',
          lineHeight: panelLineHeight.snug,
        }}>
          {loadError}
        </div>
      ) : guestsWithEmail.length === 0 ? (
        <div style={{
          padding: '14px',
          borderRadius: 'var(--pl-radius-lg)',
          background: 'var(--cream-2)',
          border: '1px solid var(--line)',
          fontSize: panelText.body,
          fontWeight: panelWeight.semibold,
          color: 'var(--ink-soft)',
          fontFamily: 'inherit',
          lineHeight: panelLineHeight.snug,
        }}>
          No guests with email addresses yet. Add guests with emails in the Guest List tab.
        </div>
      ) : (
        <>
          {/* Guest selector */}
          <SidebarSection title={`Recipients (${selectedGuests.length} selected)`} defaultOpen>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                onClick={toggleAll}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 0',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: panelText.hint,
                  fontWeight: panelWeight.semibold,
                  color: '#3F3F46',
                  fontFamily: 'inherit',
                  lineHeight: panelLineHeight.tight,
                  textAlign: 'left',
                }}
              >
                {selected.size === guestsWithEmail.length ? (
                  <Check size={12} color="#18181B" />
                ) : (
                  <div style={{
                    width: '12px', height: '12px', borderRadius: 'var(--pl-radius-xs)',
                    border: '1px solid #A1A1AA',
                  }} />
                )}
                {selected.size === guestsWithEmail.length ? 'Deselect all' : 'Select all'}
              </button>
              <div style={{
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
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
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px',
                        borderRadius: 'var(--pl-radius-md)',
                        background: isSelected ? '#F4F4F5' : '#FFFFFF',
                        border: `1px solid ${isSelected ? '#A1A1AA' : '#E4E4E7'}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all var(--pl-dur-instant)',
                      }}
                    >
                      <div style={{
                        width: '16px', height: '16px', borderRadius: 'var(--pl-radius-xs)', flexShrink: 0,
                        border: `1px solid ${isSelected ? '#18181B' : '#A1A1AA'}`,
                        background: isSelected ? '#18181B' : '#FFFFFF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSelected && <Check size={10} color="#FFFFFF" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: panelText.body,
                          fontWeight: panelWeight.semibold,
                          color: '#18181B',
                          fontFamily: 'inherit',
                          lineHeight: panelLineHeight.tight,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {guest.name}
                        </div>
                        <div style={{
                          fontSize: panelText.hint,
                          color: '#71717A',
                          fontFamily: 'inherit',
                          lineHeight: panelLineHeight.tight,
                          marginTop: '2px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
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
            <div style={{
              fontSize: panelText.label,
              fontWeight: panelWeight.bold,
              letterSpacing: panelTracking.wider,
              textTransform: 'uppercase',
              color: '#71717A',
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
              marginBottom: '6px',
            }}>
              Personal Message (optional)
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="We are delighted to invite you to celebrate our special day…"
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--pl-radius-md)',
                border: '1px solid #E4E4E7',
                background: '#FFFFFF',
                color: '#18181B',
                fontSize: 'max(16px, 0.8rem)',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.normal,
                minHeight: '72px',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#18181B'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.12)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E4E4E7'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Email preview toggle */}
          <button
            onClick={() => setPreviewOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: panelText.hint,
              fontWeight: panelWeight.semibold,
              color: '#3F3F46',
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
              padding: 0,
            }}
          >
            {previewOpen ? <EyeOff size={12} /> : <Eye size={12} />}
            {previewOpen ? 'Hide preview' : 'Preview email'}
          </button>

          <AnimatePresence>
            {previewOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  borderRadius: 'var(--pl-radius-lg)',
                  overflow: 'hidden',
                  border: '1px solid #E4E4E7',
                  background: '#FAFAFA',
                }}
              >
                <div style={{ padding: '16px', fontFamily: 'Georgia, serif', color: '#3F3F46' }}>
                  <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 400, letterSpacing: '-0.01em', color: '#18181B' }}>
                      {coupleDisplay}
                    </div>
                    <div style={{
                      fontSize: panelText.meta,
                      letterSpacing: panelTracking.widest,
                      textTransform: 'uppercase',
                      color: '#8A7A4A',
                      marginTop: '4px',
                      fontWeight: panelWeight.bold,
                    }}>
                      Request the pleasure of your company
                    </div>
                  </div>
                  <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#444', margin: '0 0 8px' }}>Dear Guest,</p>
                  <p style={{ fontSize: '0.78rem', lineHeight: 1.6, color: '#444', margin: '0 0 14px' }}>
                    {message.trim() || 'We are delighted to invite you to celebrate our special day. Please visit our website for details and to RSVP.'}
                  </p>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '8px 20px',
                      background: '#18181B',
                      color: '#FFFFFF',
                      borderRadius: 'var(--pl-radius-sm)',
                      fontSize: panelText.chip,
                      fontWeight: panelWeight.bold,
                      letterSpacing: panelTracking.wider,
                      fontFamily: 'inherit',
                    }}>
                      RSVP NOW →
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result banner */}
          {result && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 'var(--pl-radius-lg)',
              background: result.failed === 0 ? '#F4F4F5' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${result.failed === 0 ? '#E4E4E7' : 'rgba(239,68,68,0.25)'}`,
              fontSize: panelText.body,
              fontWeight: panelWeight.semibold,
              color: result.failed === 0 ? '#3F3F46' : '#b34747',
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.snug,
            }}>
              {result.failed === 0
                ? `${result.sent} invitation${result.sent !== 1 ? 's' : ''} sent successfully`
                : `${result.sent} sent, ${result.failed} failed`}
            </div>
          )}

          {/* Send button */}
          <motion.button
            onClick={handleSend}
            disabled={!canSend}
            whileHover={canSend ? { y: -1 } : {}}
            whileTap={canSend ? { scale: 0.98 } : {}}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '10px 12px',
              borderRadius: 'var(--pl-radius-md)',
              border: 'none',
              background: canSend ? '#18181B' : '#E4E4E7',
              color: canSend ? '#FFFFFF' : '#71717A',
              cursor: canSend ? 'pointer' : 'default',
              fontSize: panelText.body,
              fontWeight: panelWeight.bold,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
              transition: 'all var(--pl-dur-instant)',
            }}
          >
            <Send size={13} />
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
