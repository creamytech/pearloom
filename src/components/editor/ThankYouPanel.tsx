'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/ThankYouPanel.tsx
// AI Thank-You Notes Generator panel for the editor sidebar.
// Generates personalized notes for each guest via Gemini.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Feather, Plus, X, Copy, Check, Download, Loader } from 'lucide-react';
import {
  PanelRoot,
  PanelSection,
  panelText,
  panelWeight,
  panelTracking,
  panelLineHeight,
} from './panel';
import { useEditor } from '@/lib/editor-state';
import { writeClipboardText } from '@/lib/clipboard';
import type { Guest } from '@/types';

// ── Types ──────────────────────────────────────────────────────
interface GuestEntry {
  id: string;
  name: string;
  gift: string;
  relationship: string;
}

interface GeneratedNote {
  guestName: string;
  note: string;
}

// ── Helper ─────────────────────────────────────────────────────
function makeId() {
  return `entry-${Math.random().toString(36).slice(2, 9)}`;
}

// ── NoteCard ───────────────────────────────────────────────────
function NoteCard({ note, onNoteChange }: { note: GeneratedNote; onNoteChange: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.note);
  const [copied, setCopied] = useState<'ok' | 'fail' | null>(null);

  const handleCopy = async () => {
    const ok = await writeClipboardText(draft);
    setCopied(ok ? 'ok' : 'fail');
    setTimeout(() => setCopied(null), 1800);
  };

  const handleToggleEdit = () => {
    if (editing) {
      onNoteChange(draft);
    }
    setEditing(e => !e);
  };

  return (
    <div style={{
      borderRadius: 'var(--pl-radius-lg)',
      border: '1px solid #E4E4E7',
      background: '#FAFAFA',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid #E4E4E7',
        background: '#FFFFFF',
      }}>
        <span style={{
          fontSize: panelText.body,
          fontWeight: panelWeight.bold,
          color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {note.guestName}
        </span>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={handleToggleEdit}
            style={{
              fontSize: panelText.hint,
              fontWeight: panelWeight.bold,
              padding: '2px 7px',
              borderRadius: 'var(--pl-radius-sm)',
              border: '1px solid #E4E4E7',
              background: editing ? '#F4F4F5' : 'transparent',
              color: '#3F3F46',
              cursor: 'pointer',
            }}
          >
            {editing ? 'Save' : 'Edit'}
          </button>
          <button
            onClick={handleCopy}
            title={copied === 'fail' ? 'Copy failed — select manually' : 'Copy to clipboard'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '24px', height: '24px', borderRadius: 'var(--pl-radius-sm)',
              border: copied === 'fail'
                ? '1px solid color-mix(in oklab, #7A2D2D 50%, transparent)'
                : '1px solid var(--line)',
              background: copied === 'ok'
                ? 'color-mix(in oklab, var(--sage-deep) 12%, transparent)'
                : copied === 'fail'
                  ? 'color-mix(in oklab, #7A2D2D 10%, transparent)'
                  : 'transparent',
              color: copied === 'fail' ? '#7A2D2D' : 'var(--ink-soft)',
              cursor: 'pointer',
            }}
          >
            {copied === 'ok' ? <Check size={11} /> : <Copy size={11} />}
          </button>
        </div>
      </div>
      {/* Card body */}
      <div style={{ padding: '8px 10px' }}>
        {editing ? (
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            style={{
              width: '100%', minHeight: '90px', resize: 'vertical',
              background: '#FFFFFF', border: '1px solid #E4E4E7',
              borderRadius: 'var(--pl-radius-sm)', padding: '7px', color: '#18181B',
              fontSize: 'max(16px, 0.8rem)',
              lineHeight: panelLineHeight.snug,
              fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = '#18181B'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(24,24,27,0.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E4E4E7'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        ) : (
          <p style={{
            margin: 0,
            fontSize: panelText.body,
            lineHeight: panelLineHeight.snug,
            color: '#18181B',
          }}>
            {draft}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────
export function ThankYouPanel() {
  const { manifest, coupleNames, state } = useEditor();
  const siteId = state.subdomain;

  const [entries, setEntries] = useState<GuestEntry[]>([
    { id: makeId(), name: '', gift: '', relationship: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<GeneratedNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState('');

  // ── Pre-populate from fetched guests ─────────────────────────
  useEffect(() => {
    if (!siteId) return;
    fetch(`/api/guests?siteId=${encodeURIComponent(siteId)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { guests?: Guest[] } | null) => {
        const guests = data?.guests;
        if (guests && guests.length > 0) {
          setEntries(guests.map(g => ({
            id: makeId(),
            name: g.name,
            gift: '',
            relationship: '',
          })));
        }
      })
      .catch(err => {
        setError(err instanceof Error
          ? `Couldn\u2019t pre-fill guests (${err.message}). You can still add them by hand below.`
          : 'Couldn\u2019t pre-fill guests. You can still add them by hand below.');
      });
  }, [siteId]);

  // ── Animated progress messages ───────────────────────────────
  useEffect(() => {
    if (!loading) return;
    const msgs = [
      'Reading guest list…',
      'Crafting heartfelt notes…',
      'Adding personal touches…',
      'Almost there…',
    ];
    let i = 0;
    setProgressMsg(msgs[0]);
    const interval = setInterval(() => {
      i = (i + 1) % msgs.length;
      setProgressMsg(msgs[i]);
    }, 1800);
    return () => clearInterval(interval);
  }, [loading]);

  // ── Entry mutations ───────────────────────────────────────────
  const addEntry = () => setEntries(prev => [
    ...prev,
    { id: makeId(), name: '', gift: '', relationship: '' },
  ]);

  const removeEntry = (id: string) =>
    setEntries(prev => prev.filter(e => e.id !== id));

  const updateEntry = (id: string, field: keyof GuestEntry, value: string) =>
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));

  const updateNote = useCallback((guestName: string, text: string) => {
    setNotes(prev => prev.map(n => n.guestName === guestName ? { ...n, note: text } : n));
  }, []);

  // ── Generate ──────────────────────────────────────────────────
  const validEntries = entries.filter(e => e.name.trim());
  const canGenerate = validEntries.length > 0 && !loading;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setNotes([]);

    const voiceSample = manifest.chapters[0]?.description || '';
    const occasion = manifest.occasion || 'wedding';

    try {
      const res = await fetch('/api/thank-you/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guests: validEntries.map(e => ({
            name: e.name.trim(),
            gift: e.gift.trim() || undefined,
            relationship: e.relationship.trim() || undefined,
          })),
          coupleNames,
          voiceSample,
          occasion,
        }),
      });
      const data = await res.json() as { notes?: GeneratedNote[]; error?: string };
      if (!res.ok || data.error) {
        setError(data.error || 'Generation failed. Please try again.');
      } else {
        setNotes(data.notes || []);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────
  const handleExport = () => {
    const text = notes
      .map(n => `To: ${n.guestName}\n\n${n.note}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thank-you-notes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <PanelRoot>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '2px 20px 0',
        fontSize: panelText.label,
        fontWeight: panelWeight.heavy,
        letterSpacing: panelTracking.wider,
        textTransform: 'uppercase',
        color: '#71717A',
      }}>
        <Feather size={11} /> Thank-You Notes
      </div>

      {/* Instruction */}
      <p style={{
        margin: 0,
        padding: '4px 20px 2px',
        fontSize: panelText.body,
        lineHeight: panelLineHeight.snug,
        color: '#3F3F46',
      }}>
        Generate personalized thank-you notes for every guest. Add a gift or relationship hint for more specific notes.
      </p>

      {/* ── Guest list section ── */}
      <PanelSection title="Guest List" icon={Feather} defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'flex', flexDirection: 'column', gap: '6px',
                padding: '8px 10px', borderRadius: 'var(--pl-radius-md)',
                border: '1px solid #E4E4E7',
                background: '#FAFAFA',
                position: 'relative',
              }}
            >
              {/* Remove button */}
              <button
                onClick={() => removeEntry(entry.id)}
                title="Remove guest"
                style={{
                  position: 'absolute', top: '6px', right: '6px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#71717A', padding: '2px',
                  display: 'flex', alignItems: 'center',
                }}
              >
                <X size={11} />
              </button>

              {/* Name */}
              <input
                type="text"
                placeholder="Guest name *"
                value={entry.name}
                onChange={e => updateEntry(entry.id, 'name', e.target.value)}
                style={{
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid #E4E4E7',
                  color: '#18181B',
                  fontSize: 'max(16px, 0.8rem)',
                  fontWeight: panelWeight.semibold,
                  padding: '2px 0', outline: 'none', width: 'calc(100% - 20px)',
                  fontFamily: 'inherit',
                }}
              />

              {/* Gift */}
              <input
                type="text"
                placeholder="Gift (optional)"
                value={entry.gift}
                onChange={e => updateEntry(entry.id, 'gift', e.target.value)}
                style={{
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid #E4E4E7',
                  color: '#3F3F46',
                  fontSize: 'max(16px, 0.8rem)',
                  padding: '2px 0', outline: 'none', width: '100%',
                  fontFamily: 'inherit',
                }}
              />

              {/* Relationship */}
              <input
                type="text"
                placeholder="Relationship (optional)"
                value={entry.relationship}
                onChange={e => updateEntry(entry.id, 'relationship', e.target.value)}
                style={{
                  background: 'transparent', border: 'none',
                  borderBottom: '1px solid #E4E4E7',
                  color: '#3F3F46',
                  fontSize: 'max(16px, 0.8rem)',
                  padding: '2px 0', outline: 'none', width: '100%',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          ))}

          {/* Add guest button */}
          <button
            onClick={addEntry}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '7px', borderRadius: 'var(--pl-radius-md)',
              border: '1.5px dashed #E4E4E7',
              background: 'transparent',
              color: '#71717A', cursor: 'pointer',
              fontSize: panelText.hint,
              fontWeight: panelWeight.semibold,
            }}
          >
            <Plus size={12} /> Add guest
          </button>
        </div>

        {/* Generate button */}
        <motion.button
          onClick={handleGenerate}
          disabled={!canGenerate}
          whileHover={canGenerate ? { scale: 1.01 } : {}}
          whileTap={canGenerate ? { scale: 0.98 } : {}}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '11px', borderRadius: 'var(--pl-radius-lg)',
            border: 'none',
            background: canGenerate ? '#18181B' : '#F4F4F5',
            color: canGenerate ? '#FFFFFF' : '#71717A',
            cursor: canGenerate ? 'pointer' : 'default',
            fontSize: panelText.body,
            fontWeight: panelWeight.bold,
            transition: 'all var(--pl-dur-instant)',
          }}
        >
          {loading ? (
            <>
              <Loader size={13} style={{ animation: 'pl-spin 0.8s linear infinite' }} />
              {progressMsg}
            </>
          ) : (
            <>
              <Feather size={13} />
              {`✦ Generate notes for all ${validEntries.length} guest${validEntries.length !== 1 ? 's' : ''}`}
            </>
          )}
        </motion.button>

        {error && (
          <p style={{
            margin: 0,
            fontSize: panelText.hint,
            color: '#b34747',
            textAlign: 'center',
          }}>
            {error}
          </p>
        )}
      </PanelSection>

      {/* ── Results section ── */}
      {notes.length > 0 && (
        <PanelSection title={`Generated Notes (${notes.length})`} icon={Check} defaultOpen>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notes.map(note => (
              <NoteCard
                key={note.guestName}
                note={note}
                onNoteChange={(text) => updateNote(note.guestName, text)}
              />
            ))}
          </div>

          {/* Export button */}
          <motion.button
            onClick={handleExport}
            whileHover={{ scale: 1.01, borderColor: '#18181B' }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              padding: '10px', borderRadius: 'var(--pl-radius-md)',
              border: '1px solid #E4E4E7',
              background: '#FAFAFA',
              color: '#71717A', cursor: 'pointer',
              fontSize: panelText.body,
              fontWeight: panelWeight.bold,
            }}
          >
            <Download size={12} /> Export all as text
          </motion.button>
        </PanelSection>
      )}

      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
    </PanelRoot>
  );
}
