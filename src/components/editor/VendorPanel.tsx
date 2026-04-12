'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/VendorPanel.tsx
// Vendor Management Hub — track vendors, budget, and generate
// a day-of timeline using Gemini Flash.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { CustomSelect } from '@/components/ui/custom-select';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Plus, Trash2, Pencil, Check, X, Wand2,
  DollarSign, Clock, Mail, Phone,
} from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import { useEditor } from '@/lib/editor-state';

// ── Types ──────────────────────────────────────────────────────

type VendorCategory =
  | 'venue' | 'catering' | 'photography' | 'videography'
  | 'flowers' | 'music' | 'hair_makeup' | 'cake' | 'transport' | 'other';

type VendorStatus = 'considering' | 'booked' | 'paid' | 'cancelled';

interface Vendor {
  id: string;
  site_id: string;
  name: string;
  category: VendorCategory;
  contact_email?: string;
  phone?: string;
  status: VendorStatus;
  amount_cents?: number;
  notes?: string;
  created_at: string;
}

interface TimelineItem {
  time: string;
  description: string;
  vendor?: string;
}

// ── Constants ──────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: VendorCategory; label: string; icon: string }[] = [
  { value: 'venue',        label: 'Venue',         icon: 'V' },
  { value: 'catering',     label: 'Catering',      icon: 'C' },
  { value: 'photography',  label: 'Photography',   icon: 'P' },
  { value: 'videography',  label: 'Videography',   icon: 'Vi' },
  { value: 'flowers',      label: 'Flowers',       icon: 'F' },
  { value: 'music',        label: 'Music',         icon: 'M' },
  { value: 'hair_makeup',  label: 'Hair & Makeup', icon: 'HM' },
  { value: 'cake',         label: 'Cake',          icon: 'Ck' },
  { value: 'transport',    label: 'Transport',     icon: 'T' },
  { value: 'other',        label: 'Other',         icon: '+'  },
];

const STATUS_OPTIONS: { value: VendorStatus; label: string; color: string; bg: string }[] = [
  { value: 'considering', label: 'Considering', color: 'rgba(255,255,255,0.45)', bg: 'rgba(0,0,0,0.05)' },
  { value: 'booked',      label: 'Booked',      color: '#71717A',               bg: '#F4F4F5' },
  { value: 'paid',        label: 'Paid',        color: '#6bcb77',               bg: 'rgba(107,203,119,0.12)' },
  { value: 'cancelled',   label: 'Cancelled',   color: '#f87171',               bg: 'rgba(248,113,113,0.12)' },
];

function getCategoryIcon(category: VendorCategory): string {
  return CATEGORY_OPTIONS.find(c => c.value === category)?.icon || '✦';
}

function getStatusMeta(status: VendorStatus) {
  return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
}

function formatCents(cents?: number): string {
  if (!cents) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents / 100);
}

// ── Blank form ─────────────────────────────────────────────────

function blankForm() {
  return {
    name: '',
    category: 'other' as VendorCategory,
    contactEmail: '',
    phone: '',
    status: 'considering' as VendorStatus,
    amountCents: '',
    notes: '',
  };
}

// ── Status Badge ───────────────────────────────────────────────

function StatusBadge({ status }: { status: VendorStatus }) {
  const meta = getStatusMeta(status);
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: meta.color, background: meta.bg,
      padding: '2px 6px', borderRadius: '8px',
      border: `1px solid ${meta.color}30`,
      whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

// ── Input helpers ──────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#F4F4F5', border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: '6px', color: '#fff', fontSize: '0.75rem',
  padding: '6px 10px', outline: 'none',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer', appearance: 'none',
};

// ── VendorPanel ────────────────────────────────────────────────

export function VendorPanel() {
  const { state, manifest, coupleNames } = useEditor();
  const subdomain = state.subdomain;

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState(blankForm());
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<Record<string, string>>({});
  const [emailLoading, setEmailLoading] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[] | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  // ── Fetch vendors ──────────────────────────────────────────
  const fetchVendors = async () => {
    if (!subdomain) return;
    try {
      const res = await fetch(`/api/vendors?subdomain=${encodeURIComponent(subdomain)}`);
      if (res.ok) {
        const { vendors: data } = await res.json();
        setVendors(data || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, [subdomain]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add vendor ─────────────────────────────────────────────
  const handleAdd = async () => {
    if (!formData.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain,
          name: formData.name,
          category: formData.category,
          contactEmail: formData.contactEmail || undefined,
          phone: formData.phone || undefined,
          status: formData.status,
          amountCents: formData.amountCents ? Math.round(parseFloat(formData.amountCents) * 100) : undefined,
          notes: formData.notes || undefined,
        }),
      });
      if (res.ok) {
        const { vendor } = await res.json();
        setVendors(prev => [...prev, vendor]);
        setFormData(blankForm());
        setShowForm(false);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  // ── Delete vendor ──────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/vendors?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setVendors(prev => prev.filter(v => v.id !== id));
    } catch { /* silent */ }
  };

  // ── Edit vendor ────────────────────────────────────────────
  const startEdit = (v: Vendor) => {
    setEditingId(v.id);
    setEditData({
      name: v.name,
      category: v.category,
      contactEmail: v.contact_email || '',
      phone: v.phone || '',
      status: v.status,
      amountCents: v.amount_cents ? String(v.amount_cents / 100) : '',
      notes: v.notes || '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name: editData.name,
          category: editData.category,
          contactEmail: editData.contactEmail || undefined,
          phone: editData.phone || undefined,
          status: editData.status,
          amountCents: editData.amountCents ? Math.round(parseFloat(editData.amountCents) * 100) : undefined,
          notes: editData.notes || undefined,
        }),
      });
      if (res.ok) {
        const { vendor } = await res.json();
        setVendors(prev => prev.map(v => v.id === editingId ? vendor : v));
        setEditingId(null);
      }
    } catch { /* silent */ }
    setSaving(false);
  };

  // ── Draft email ────────────────────────────────────────────
  const draftEmail = async (vendor: Vendor) => {
    if (emailDraft[vendor.id]) {
      setExpandedEmail(expandedEmail === vendor.id ? null : vendor.id);
      return;
    }
    setEmailLoading(vendor.id);
    setExpandedEmail(vendor.id);
    try {
      const coupleNames = manifest.vibeString
        ? manifest.vibeString.slice(0, 40)
        : 'The couple';

      // Use a simple inline prompt to Gemini via the ai-blocks endpoint
      const res = await fetch('/api/ai-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockType: 'email',
          prompt: `Write a polite, professional email from a couple to their wedding vendor.
Vendor name: ${vendor.name}
Category: ${vendor.category.replace(/_/g, ' ')}
Status: ${vendor.status}
Couple: ${coupleNames}

Write a short 3-4 sentence email suitable for initial outreach or a status check. Be warm and concise. Return plain text only, no subject line.`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const draft = data?.result || data?.content || 'Unable to generate draft. Please write your message manually.';
        setEmailDraft(prev => ({ ...prev, [vendor.id]: String(draft) }));
      } else {
        setEmailDraft(prev => ({ ...prev, [vendor.id]: 'Unable to generate draft at this time.' }));
      }
    } catch {
      setEmailDraft(prev => ({ ...prev, [vendor.id]: 'Unable to generate draft at this time.' }));
    }
    setEmailLoading(null);
  };

  // ── Generate timeline ──────────────────────────────────────
  const generateTimeline = async () => {
    setTimelineLoading(true);
    setTimelineError(null);
    try {
      const eventDate = manifest.logistics?.date || manifest.events?.[0]?.date || '';

      const res = await fetch('/api/vendors/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendors, eventDate, coupleNames }),
      });
      if (res.ok) {
        const { timeline: items } = await res.json();
        setTimeline(items || []);
      } else {
        setTimelineError('Failed to generate timeline. Please try again.');
      }
    } catch {
      setTimelineError('Failed to generate timeline. Please try again.');
    }
    setTimelineLoading(false);
  };

  // ── Budget stats ───────────────────────────────────────────
  const totalCents = vendors.reduce((sum, v) => sum + (v.amount_cents || 0), 0);
  const paidCents = vendors
    .filter(v => v.status === 'paid')
    .reduce((sum, v) => sum + (v.amount_cents || 0), 0);
  const remainingCents = totalCents - paidCents;

  // ── Render ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#71717A', fontSize: '0.8rem' }}>
        Loading vendors…
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: '#71717A',
        }}>
          <Briefcase size={11} /> Vendors
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: showForm ? 'rgba(248,113,113,0.12)' : '#F4F4F5',
            border: `1px solid ${showForm ? 'rgba(248,113,113,0.3)' : '#E4E4E7'}`,
            borderRadius: '6px', color: showForm ? '#f87171' : '#71717A',
            fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', cursor: 'pointer',
          }}
        >
          {showForm ? <><X size={11} /> Cancel</> : <><Plus size={11} /> Add</>}
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', padding: '0 16px' }}
          >
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '8px',
              padding: '12px', borderRadius: '8px',
              background: 'rgba(24,24,27,0.04)', border: '1px solid rgba(0,0,0,0.06)',
            }}>
              <input
                style={inputStyle} placeholder="Vendor name *"
                value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <select
                  style={selectStyle}
                  value={formData.category}
                  onChange={e => setFormData(p => ({ ...p, category: e.target.value as VendorCategory }))}
                >
                  {CATEGORY_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                  ))}
                </select>
                <select
                  style={selectStyle}
                  value={formData.status}
                  onChange={e => setFormData(p => ({ ...p, status: e.target.value as VendorStatus }))}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <input
                style={inputStyle} placeholder="Contact email"
                type="email" value={formData.contactEmail}
                onChange={e => setFormData(p => ({ ...p, contactEmail: e.target.value }))}
              />
              <input
                style={inputStyle} placeholder="Amount (e.g. 2500)"
                type="number" value={formData.amountCents}
                onChange={e => setFormData(p => ({ ...p, amountCents: e.target.value }))}
              />
              <textarea
                style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                placeholder="Notes"
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              />
              <button
                onClick={handleAdd}
                disabled={saving || !formData.name.trim()}
                style={{
                  background: 'rgba(24,24,27,0.08)', border: '1px solid #E4E4E7',
                  borderRadius: '6px', color: '#71717A', fontSize: '0.75rem',
                  fontWeight: 700, padding: '8px', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving || !formData.name.trim() ? 0.5 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save Vendor'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget strip */}
      {totalCents > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '6px', padding: '0 16px',
        }}>
          {[
            { label: 'Total Budget', value: formatCents(totalCents), color: '#71717A' },
            { label: 'Paid', value: formatCents(paidCents), color: '#6bcb77' },
            { label: 'Remaining', value: formatCents(remainingCents), color: '#71717A' },
          ].map(s => (
            <div key={s.label} style={{
              padding: '8px 10px', borderRadius: '8px',
              background: `${s.color}0d`, border: `1px solid ${s.color}22`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.6rem', color: '#71717A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>
                {s.label}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vendor list */}
      <SidebarSection title={`Vendors (${vendors.length})`} defaultOpen>
        {vendors.length === 0 ? (
          <div style={{
            padding: '12px', borderRadius: '8px',
            background: 'rgba(24,24,27,0.03)', border: '1px solid rgba(0,0,0,0.06)',
            fontSize: '0.65rem', color: '#71717A', textAlign: 'center',
          }}>
            No vendors yet. Click + Add to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {vendors.map(v => (
              <div key={v.id}>
                {/* Vendor row */}
                {editingId === v.id ? (
                  // Edit inline form
                  <div style={{
                    padding: '10px', borderRadius: '8px',
                    background: '#F4F4F5', border: '1px solid rgba(24,24,27,0.12)',
                    display: 'flex', flexDirection: 'column', gap: '6px',
                  }}>
                    <input style={inputStyle} value={editData.name} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <select style={selectStyle} value={editData.category} onChange={e => setEditData(p => ({ ...p, category: e.target.value as VendorCategory }))}>
                        {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                      </select>
                      <select style={selectStyle} value={editData.status} onChange={e => setEditData(p => ({ ...p, status: e.target.value as VendorStatus }))}>
                        {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <input style={inputStyle} value={editData.contactEmail} onChange={e => setEditData(p => ({ ...p, contactEmail: e.target.value }))} placeholder="Contact email" type="email" />
                    <input style={inputStyle} value={editData.amountCents} onChange={e => setEditData(p => ({ ...p, amountCents: e.target.value }))} placeholder="Amount" type="number" />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={saveEdit} disabled={saving} style={{ flex: 1, background: 'rgba(24,24,27,0.08)', border: '1px solid #E4E4E7', borderRadius: '6px', color: '#71717A', fontSize: '0.65rem', fontWeight: 700, padding: '6px', cursor: 'pointer' }}>
                        <Check size={11} style={{ display: 'inline', marginRight: '4px' }} />Save
                      </button>
                      <button onClick={() => setEditingId(null)} style={{ flex: 1, background: '#F4F4F5', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '6px', color: 'rgba(255,255,255,0.45)', fontSize: '0.65rem', padding: '6px', cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '8px 10px', borderRadius: '8px',
                    background: 'rgba(24,24,27,0.04)', border: '1px solid rgba(0,0,0,0.06)',
                    display: 'flex', flexDirection: 'column', gap: '5px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{getCategoryIcon(v.category)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <StatusBadge status={v.status} />
                          {v.amount_cents ? (
                            <span style={{ fontSize: '0.65rem', color: '#3F3F46', fontWeight: 600 }}>
                              {formatCents(v.amount_cents)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button
                          onClick={() => draftEmail(v)}
                          title="Draft email"
                          style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F4F5', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '6px', cursor: 'pointer', color: '#3F3F46' }}
                        >
                          <Mail size={12} />
                        </button>
                        <button
                          onClick={() => startEdit(v)}
                          title="Edit"
                          style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F4F5', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '6px', cursor: 'pointer', color: '#3F3F46' }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          title="Delete"
                          style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', cursor: 'pointer', color: '#f87171' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Draft email expandable */}
                    <AnimatePresence>
                      {expandedEmail === v.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ marginTop: '6px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}>
                            {emailLoading === v.id ? (
                              <div style={{ fontSize: '0.7rem', color: '#71717A', textAlign: 'center', padding: '6px' }}>
                                Drafting email…
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: '0.65rem', color: '#71717A', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700 }}>
                                  Draft email
                                </div>
                                <textarea
                                  readOnly
                                  value={emailDraft[v.id] || ''}
                                  style={{
                                    ...inputStyle, minHeight: '80px', resize: 'vertical',
                                    fontSize: '0.65rem', lineHeight: 1.6,
                                    color: '#18181B',
                                  }}
                                  onClick={e => (e.target as HTMLTextAreaElement).select()}
                                />
                                <div style={{ fontSize: '0.6rem', color: '#71717A', marginTop: '3px' }}>
                                  Click to select all, then copy
                                </div>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SidebarSection>

      {/* Generate timeline */}
      <SidebarSection title="Day-of Timeline" defaultOpen>
        <button
          onClick={generateTimeline}
          disabled={timelineLoading}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
            background: timelineLoading ? 'rgba(24,24,27,0.05)' : '#F4F4F5',
            border: '1px solid #E4E4E7', borderRadius: '8px',
            color: '#71717A', fontSize: '0.75rem', fontWeight: 700,
            padding: '9px', cursor: timelineLoading ? 'not-allowed' : 'pointer',
            opacity: timelineLoading ? 0.7 : 1,
          }}
        >
          <Wand2 size={13} />
          {timelineLoading ? 'Generating…' : '✦ Generate day-of timeline'}
        </button>

        {timelineError && (
          <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: '6px', padding: '6px 8px', background: 'rgba(248,113,113,0.08)', borderRadius: '6px' }}>
            {timelineError}
          </div>
        )}

        {timeline && timeline.length > 0 && (
          <div style={{ marginTop: '12px', position: 'relative' }}>
            {/* Vertical line */}
            <div style={{
              position: 'absolute', left: '20px', top: '8px', bottom: '8px',
              width: '1px', background: 'rgba(24,24,27,0.1)',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {timeline.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.25 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', paddingBottom: '12px' }}
                >
                  {/* Time badge */}
                  <div style={{
                    flexShrink: 0, width: '40px',
                    background: 'rgba(24,24,27,0.08)', border: '1px solid #E4E4E7',
                    borderRadius: '6px', padding: '3px 4px', textAlign: 'center',
                    fontSize: '0.6rem', fontWeight: 800, color: '#71717A', lineHeight: 1.2,
                    position: 'relative', zIndex: 1,
                  }}>
                    {item.time}
                  </div>
                  {/* Description */}
                  <div style={{ paddingTop: '2px' }}>
                    <div style={{ fontSize: '0.74rem', color: '#18181B', lineHeight: 1.4 }}>
                      {item.description}
                    </div>
                    {item.vendor && (
                      <div style={{ fontSize: '0.6rem', color: '#71717A', marginTop: '2px',  }}>
                        {item.vendor}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </SidebarSection>
    </div>
  );
}
