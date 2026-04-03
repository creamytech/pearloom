'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/ThankYouPanel.tsx
// AI Thank-You Notes Generator panel for the editor sidebar.
// Generates personalized notes for each guest via Gemini.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus, X, Copy, Check, Download, Loader } from 'lucide-react';
import { SidebarSection } from './EditorSidebar';
import { useEditor } from '@/lib/editor-state';
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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleToggleEdit = () => {
    if (editing) {
      onNoteChange(draft);
    }
    setEditing(e => !e);
  };

  return (
    <div style={{
      borderRadius: '10px',
      border: '1px solid rgba(163,177,138,0.18)',
      background: 'rgba(163,177,138,0.05)',
      overflow: 'hidden',
    }}>
      {/* Card header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.03)',
      }}>
        <span style={{
          fontSize: '0.78rem', fontWeight: 700,
          color: '#D6C6A8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {note.guestName}
        </span>
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={handleToggleEdit}
            style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
              borderRadius: '5px', border: '1px solid rgba(255,255,255,0.12)',
              background: editing ? 'rgba(163,177,138,0.18)' : 'transparent',
              color: editing ? '#A3B18A' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
            }}
          >
            {editing ? 'Save' : 'Edit'}
          </button>
          <button
            onClick={handleCopy}
            title="Copy to clipboard"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '24px', height: '24px', borderRadius: '5px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: copied ? 'rgba(163,177,138,0.18)' : 'transparent',
              color: copied ? '#A3B18A' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
          </button>
        </div>
      </div>
      {/* Card body */}
      <div style={{ padding: '10px 12px' }}>
        {editing ? (
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            style={{
              width: '100%', minHeight: '90px', resize: 'vertical',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', padding: '7px', color: 'rgba(255,255,255,0.85)',
              fontSize: '0.75rem', lineHeight: 1.6, fontFamily: 'inherit', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <p style={{
            margin: 0, fontSize: '0.75rem', lineHeight: 1.65,
            color: 'rgba(255,255,255,0.7)',
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
      .catch(() => {});
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '4px 0' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(214,198,168,0.5)',
        padding: '0 16px',
      }}>
        <Heart size={11} /> Thank-You Notes
      </div>

      {/* Instruction */}
      <p style={{
        margin: '0 16px', fontSize: '0.75rem', lineHeight: 1.55,
        color: 'rgba(255,255,255,0.45)',
      }}>
        Generate personalized thank-you notes for every guest. Add a gift or relationship hint for more specific notes.
      </p>

      {/* ── Guest list section ── */}
      <SidebarSection title="Guest List" defaultOpen>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: 'flex', flexDirection: 'column', gap: '4px',
                padding: '8px 10px', borderRadius: '9px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
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
                  color: 'rgba(255,255,255,0.25)', padding: '2px',
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
                  background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', fontWeight: 600,
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
                  background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem',
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
                  background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem',
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
              padding: '7px', borderRadius: '8px',
              border: '1px dashed rgba(255,255,255,0.12)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.38)', cursor: 'pointer', fontSize: '0.73rem',
            }}
          >
            <Plus size={12} /> Add guest
          </button>
        </div>
      </SidebarSection>

      {/* ── Generate button ── */}
      <div style={{ padding: '0 16px' }}>
        <motion.button
          onClick={handleGenerate}
          disabled={!canGenerate}
          whileHover={canGenerate ? { scale: 1.02 } : {}}
          whileTap={canGenerate ? { scale: 0.97 } : {}}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '11px', borderRadius: '10px',
            border: '1px solid rgba(163,177,138,0.3)',
            background: canGenerate
              ? 'linear-gradient(135deg, rgba(163,177,138,0.18) 0%, rgba(143,200,122,0.12) 100%)'
              : 'rgba(255,255,255,0.04)',
            color: canGenerate ? '#A3B18A' : 'rgba(255,255,255,0.2)',
            cursor: canGenerate ? 'pointer' : 'default',
            fontSize: '0.78rem', fontWeight: 700,
            transition: 'all 0.15s',
          }}
        >
          {loading ? (
            <>
              <Loader size={13} style={{ animation: 'pl-spin 0.8s linear infinite' }} />
              {progressMsg}
            </>
          ) : (
            <>
              <Heart size={13} />
              {`✦ Generate notes for all ${validEntries.length} guest${validEntries.length !== 1 ? 's' : ''}`}
            </>
          )}
        </motion.button>

        {error && (
          <p style={{
            margin: '6px 0 0', fontSize: '0.72rem', color: '#f87171',
            textAlign: 'center',
          }}>
            {error}
          </p>
        )}
      </div>

      {/* ── Results section ── */}
      {notes.length > 0 && (
        <SidebarSection title={`Generated Notes (${notes.length})`} defaultOpen>
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
            whileHover={{ scale: 1.02, borderColor: 'rgba(214,198,168,0.3)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop: '10px', width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              padding: '10px', borderRadius: '9px',
              border: '1px solid rgba(214,198,168,0.15)',
              background: 'rgba(214,198,168,0.05)',
              color: '#D6C6A8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
            }}
          >
            <Download size={12} /> Export all as text
          </motion.button>
        </SidebarSection>
      )}

      <style>{`@keyframes pl-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
