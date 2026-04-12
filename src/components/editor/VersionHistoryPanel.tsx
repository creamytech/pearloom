'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/VersionHistoryPanel.tsx
// Version history — save/restore snapshots with timestamps.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Save, RotateCcw, Trash2, ChevronRight } from 'lucide-react';
import { saveSnapshot, loadSnapshots, restoreSnapshot, deleteSnapshot, type VersionSnapshot } from '@/lib/block-engine/block-actions';
import { Button } from '@/components/ui/button';
import type { StoryManifest } from '@/types';

interface VersionHistoryPanelProps {
  manifest: StoryManifest;
  onRestore: (manifest: StoryManifest) => void;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function VersionHistoryPanel({ manifest, onRestore }: VersionHistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
  const [saveLabel, setSaveLabel] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  const handleSave = () => {
    const label = saveLabel.trim() || `Snapshot ${new Date().toLocaleTimeString()}`;
    saveSnapshot(manifest, label);
    setSnapshots(loadSnapshots());
    setSaveLabel('');
    setShowSave(false);
  };

  const handleRestore = (id: string) => {
    const restored = restoreSnapshot(id);
    if (restored) {
      onRestore(restored);
      setConfirmRestore(null);
    }
  };

  const handleDelete = (id: string) => {
    deleteSnapshot(id);
    setSnapshots(loadSnapshots());
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={14} color="#18181B" />
          <span style={{
            fontSize: '0.7rem', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: '#18181B',
          }}>
            Version History
          </span>
        </div>
        <Button
          variant="secondary"
          size="xs"
          icon={<Save size={11} />}
          onClick={() => setShowSave(!showSave)}
        >
          Save
        </Button>
      </div>

      {/* Save form */}
      <AnimatePresence>
        {showSave && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', marginBottom: '12px' }}
          >
            <div style={{
              display: 'flex', gap: '8px', padding: '12px',
              borderRadius: '10px', background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}>
              <input
                type="text"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                placeholder="Snapshot label (optional)"
                className="pl-focus-glow"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: '6px',
                  border: '1.5px solid rgba(255,255,255,0.25)', fontSize: '0.82rem',
                  background: 'white', color: '#18181B',
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              />
              <Button variant="primary" size="xs" onClick={handleSave}>
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snapshot list */}
      {snapshots.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '24px 12px',
          color: '#71717A', fontSize: '0.82rem',
        }}>
          <Clock size={20} style={{ opacity: 0.3, marginBottom: '8px' }} />
          <p>No snapshots saved yet.</p>
          <p style={{ fontSize: '0.72rem', marginTop: '4px' }}>
            Save a snapshot to preserve this version of your site.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {snapshots.map((snap) => (
            <motion.div
              key={snap.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.25)',
                background: confirmRestore === snap.id ? 'rgba(24,24,27,0.04)' : 'white',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <p style={{
                    fontSize: '0.82rem', fontWeight: 600,
                    color: '#18181B', margin: 0,
                  }}>
                    {snap.label}
                  </p>
                  <p style={{
                    fontSize: '0.68rem', color: '#71717A',
                    margin: '2px 0 0',
                  }}>
                    {timeAgo(snap.timestamp)}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {confirmRestore === snap.id ? (
                    <>
                      <Button variant="primary" size="xs" onClick={() => handleRestore(snap.id)}>
                        Confirm
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => setConfirmRestore(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmRestore(snap.id)}
                        title="Restore this version"
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.25)', background: 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#18181B',
                        }}
                      >
                        <RotateCcw size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(snap.id)}
                        title="Delete snapshot"
                        style={{
                          width: '28px', height: '28px', borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.25)', background: 'transparent',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#71717A',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
