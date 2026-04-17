'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/VersionHistoryPanel.tsx
// Save/restore snapshots with timestamps. Rewritten in the
// editorial chrome: Fraunces italic labels, mono uppercase meta,
// gold hairline rules, cream surfaces via --pl-chrome-* tokens.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Save, RotateCcw, Trash2 } from 'lucide-react';
import {
  saveSnapshot,
  loadSnapshots,
  restoreSnapshot,
  deleteSnapshot,
  type VersionSnapshot,
} from '@/lib/block-engine/block-actions';
import type { StoryManifest } from '@/types';
import {
  PanelRoot,
  PanelSection,
  PanelInput,
  PanelEmptyState,
  panelFont,
  panelText,
  panelTracking,
  panelWeight,
  panelLineHeight,
} from './panel';

interface VersionHistoryPanelProps {
  manifest: StoryManifest;
  onRestore: (manifest: StoryManifest) => void;
  /** Site identifier so snapshots are scoped per-site instead of globally. */
  siteId?: string;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function formatTimestamp(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  }) + ' · ' + d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Lightweight diff: which top-level manifest areas changed between
// a snapshot and the current draft. No deep structural diff — just
// 'this area moved' chips so the user can see what the snapshot
// will actually rewind.
function diffAreas(snap: StoryManifest, current: StoryManifest): string[] {
  const changed: string[] = [];
  const areas: Array<[string, unknown, unknown]> = [
    ['Names',    snap.names,                current.names],
    ['Chapters', snap.chapters?.length,     current.chapters?.length],
    ['Sections', snap.blocks?.length,       current.blocks?.length],
    ['Events',   snap.events?.length,       current.events?.length],
    ['Design',   snap.vibeSkin?.palette,    current.vibeSkin?.palette],
    ['Poetry',   snap.poetry?.heroTagline,  current.poetry?.heroTagline],
    ['Logistics',snap.logistics?.venue,     current.logistics?.venue],
    ['Registry', snap.registry?.entries?.length, current.registry?.entries?.length],
    ['FAQs',     snap.faqs?.length,         current.faqs?.length],
  ];
  for (const [label, a, b] of areas) {
    if (JSON.stringify(a) !== JSON.stringify(b)) changed.push(label);
  }
  return changed;
}

const pillBase: React.CSSProperties = {
  fontFamily: panelFont.mono,
  fontSize: panelText.meta,
  fontWeight: panelWeight.bold,
  letterSpacing: panelTracking.widest,
  textTransform: 'uppercase',
  padding: '6px 12px',
  borderRadius: '99px',
  cursor: 'pointer',
  transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  lineHeight: 1,
};

const pillFilled: React.CSSProperties = {
  ...pillBase,
  background: 'var(--pl-chrome-accent)',
  color: 'var(--pl-chrome-accent-ink)',
  border: '1px solid var(--pl-chrome-accent)',
};

const pillOutline: React.CSSProperties = {
  ...pillBase,
  background: 'transparent',
  color: 'var(--pl-chrome-text-soft)',
  border: '1px solid var(--pl-chrome-border)',
};

const iconButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: '1px solid var(--pl-chrome-border)',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--pl-chrome-text-muted)',
  transition: 'all 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
};

export function VersionHistoryPanel({ manifest, onRestore, siteId }: VersionHistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
  const [saveLabel, setSaveLabel] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  useEffect(() => {
    setSnapshots(loadSnapshots(siteId));
  }, [siteId]);

  const handleSave = () => {
    const label = saveLabel.trim() || `Snapshot ${new Date().toLocaleTimeString()}`;
    saveSnapshot(manifest, label, siteId);
    setSnapshots(loadSnapshots(siteId));
    setSaveLabel('');
    setShowSave(false);
  };

  const handleRestore = (id: string) => {
    const restored = restoreSnapshot(id, siteId);
    if (restored) {
      onRestore(restored);
      setConfirmRestore(null);
    }
  };

  const handleDelete = (id: string) => {
    deleteSnapshot(id, siteId);
    setSnapshots(loadSnapshots(siteId));
  };

  return (
    <PanelRoot>
      <PanelSection
        title="Saved versions"
        eyebrow="Time machine"
        icon={Clock}
        badge={snapshots.length || undefined}
        hint="Save a version any time. You can roll back here whenever you change your mind."
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '-4px',
          }}
        >
          <button
            type="button"
            onClick={() => setShowSave((v) => !v)}
            style={showSave ? pillOutline : pillFilled}
          >
            <Save size={10} strokeWidth={2} />
            {showSave ? 'Cancel' : 'Save this version'}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showSave && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background:
                    'color-mix(in srgb, var(--pl-chrome-accent) 4%, var(--pl-chrome-bg))',
                  border: '1px dashed color-mix(in srgb, var(--pl-chrome-accent) 28%, transparent)',
                }}
              >
                <span
                  style={{
                    fontFamily: panelFont.mono,
                    fontSize: panelText.meta,
                    fontWeight: panelWeight.bold,
                    letterSpacing: panelTracking.widest,
                    textTransform: 'uppercase',
                    color: 'var(--pl-chrome-text-faint)',
                  }}
                >
                  Label
                </span>
                <PanelInput
                  value={saveLabel}
                  onChange={setSaveLabel}
                  placeholder="e.g. before redesign"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={handleSave} style={pillFilled}>
                    Save version
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {snapshots.length === 0 ? (
          <PanelEmptyState
            icon={<Clock size={18} strokeWidth={1.5} />}
            title="No saved versions yet"
            description="Save a version to lock in your current site. You can roll back here whenever you change your mind."
            action={{ label: 'Save first version', onClick: () => setShowSave(true) }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {snapshots.map((snap, idx) => {
              const isConfirming = confirmRestore === snap.id;
              return (
                <motion.div
                  key={snap.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--pl-chrome-border)',
                    background: isConfirming
                      ? 'color-mix(in srgb, var(--pl-chrome-accent) 8%, var(--pl-chrome-surface))'
                      : 'var(--pl-chrome-surface)',
                    transition: 'background 0.18s cubic-bezier(0.22, 1, 0.36, 1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: panelFont.mono,
                            fontSize: panelText.meta,
                            fontWeight: panelWeight.bold,
                            letterSpacing: panelTracking.widest,
                            textTransform: 'uppercase',
                            color: 'var(--pl-chrome-accent)',
                          }}
                        >
                          {String(snapshots.length - idx).padStart(2, '0')}
                        </span>
                        <span
                          style={{
                            fontFamily: panelFont.mono,
                            fontSize: panelText.meta,
                            letterSpacing: panelTracking.wider,
                            textTransform: 'uppercase',
                            color: 'var(--pl-chrome-text-faint)',
                          }}
                        >
                          {timeAgo(snap.timestamp)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: panelFont.display,
                          fontStyle: 'italic',
                          fontSize: panelText.itemTitle,
                          fontWeight: panelWeight.regular,
                          lineHeight: panelLineHeight.tight,
                          color: 'var(--pl-chrome-text)',
                          margin: 0,
                          letterSpacing: '-0.01em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {snap.label}
                      </p>
                      <p
                        style={{
                          fontFamily: panelFont.body,
                          fontSize: panelText.hint,
                          color: 'var(--pl-chrome-text-muted)',
                          margin: '3px 0 0',
                        }}
                      >
                        {formatTimestamp(snap.timestamp)}
                      </p>
                      {(() => {
                        const changed = diffAreas(snap.manifest as StoryManifest, manifest);
                        if (changed.length === 0) return null;
                        return (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 4,
                              marginTop: 8,
                            }}
                          >
                            {changed.slice(0, 6).map((label) => (
                              <span
                                key={label}
                                style={{
                                  fontFamily: panelFont.mono,
                                  fontSize: panelText.meta,
                                  letterSpacing: panelTracking.wider,
                                  textTransform: 'uppercase',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: 'color-mix(in srgb, var(--pl-chrome-accent) 12%, transparent)',
                                  color: 'var(--pl-chrome-accent)',
                                  border: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 28%, transparent)',
                                }}
                              >
                                {label}
                              </span>
                            ))}
                            {changed.length > 6 && (
                              <span
                                style={{
                                  fontFamily: panelFont.mono,
                                  fontSize: panelText.meta,
                                  letterSpacing: panelTracking.wider,
                                  textTransform: 'uppercase',
                                  color: 'var(--pl-chrome-text-muted)',
                                  padding: '2px 6px',
                                }}
                              >
                                +{changed.length - 6}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {!isConfirming && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setConfirmRestore(snap.id)}
                          title="Restore this version"
                          aria-label="Restore this version"
                          style={{ ...iconButtonStyle, color: 'var(--pl-chrome-accent)' }}
                        >
                          <RotateCcw size={12} strokeWidth={1.75} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(snap.id)}
                          title="Delete snapshot"
                          aria-label="Delete snapshot"
                          style={iconButtonStyle}
                        >
                          <Trash2 size={12} strokeWidth={1.75} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isConfirming && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid color-mix(in srgb, var(--pl-chrome-accent) 22%, transparent)',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: panelFont.body,
                          fontSize: panelText.hint,
                          fontStyle: 'italic',
                          color: 'var(--pl-chrome-text-muted)',
                        }}
                      >
                        Replace current draft with this snapshot?
                      </span>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleRestore(snap.id)}
                          style={pillFilled}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRestore(null)}
                          style={pillOutline}
                        >
                          Keep
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </PanelSection>
    </PanelRoot>
  );
}
