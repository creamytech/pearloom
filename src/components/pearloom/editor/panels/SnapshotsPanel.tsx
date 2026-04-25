'use client';

/* ========================================================================
   SnapshotsPanel — visible timeline of the last 10 manifest snapshots.
   Each entry shows when it was captured + a one-line label.
   "Restore" replaces the working manifest with the snapshot's payload
   while keeping the snapshot list intact (so the host can scrub forward
   again). "Save snapshot now" captures the current state on demand.

   Lives inside the Theme panel today; could be its own panel later.
   ======================================================================== */

import type { StoryManifest } from '@/types';
import { Field, PanelSection, TextInput } from '../atoms';
import { Icon } from '../../motifs';
import {
  captureSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  MAX_SNAPSHOTS,
  type Snapshot,
} from '@/lib/snapshots';
import { useState } from 'react';

export function SnapshotsPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const snapshots = ((manifest as unknown as { snapshots?: Snapshot[] }).snapshots ?? []);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [label, setLabel] = useState('');

  function captureNow() {
    onChange(captureSnapshot(manifest, label.trim() || undefined));
    setLabel('');
  }

  function onRestore(id: string) {
    if (confirmRestoreId !== id) {
      setConfirmRestoreId(id);
      return;
    }
    // Capture current state first so the restore is itself reversible.
    const safe = captureSnapshot(manifest, 'Before restore');
    onChange(restoreSnapshot(safe, id));
    setConfirmRestoreId(null);
  }

  function onDelete(id: string) {
    onChange(deleteSnapshot(manifest, id));
    if (confirmRestoreId === id) setConfirmRestoreId(null);
  }

  return (
    <PanelSection
      label="Snapshots"
      hint={`The last ${MAX_SNAPSHOTS} versions of your site, ready to roll back to. Auto-saved on every publish.`}
    >
      {/* Save snapshot now */}
      <Field label="Save snapshot now">
        <div style={{ display: 'flex', gap: 6 }}>
          <TextInput
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="(optional) name this version"
          />
          <button
            type="button"
            onClick={captureNow}
            className="btn btn-primary btn-sm"
            style={{ flexShrink: 0, justifyContent: 'center' }}
          >
            <Icon name="download" size={12} /> Save
          </button>
        </div>
      </Field>

      {/* Timeline */}
      {snapshots.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            border: '1px dashed var(--line)',
            borderRadius: 12,
            textAlign: 'center',
            fontSize: 12.5,
            color: 'var(--ink-muted)',
            lineHeight: 1.5,
          }}
        >
          No snapshots yet. They&apos;ll appear here automatically on publish, or save one now to bookmark this version.
        </div>
      ) : (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {snapshots.map((snap, i) => {
            const date = new Date(snap.createdAt);
            const ageLabel = relativeTime(date);
            const confirming = confirmRestoreId === snap.id;
            return (
              <div
                key={snap.id}
                style={{
                  position: 'relative',
                  padding: 12,
                  borderRadius: 10,
                  background: i === 0 ? 'var(--cream-2)' : 'var(--card)',
                  border: i === 0 ? '1.5px solid var(--peach-ink, #C6703D)' : '1px solid var(--line)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--ink)',
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {snap.label}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                    {ageLabel}
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', fontFamily: 'ui-monospace, monospace' }}>
                  {date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => onRestore(snap.id)}
                    style={{
                      flex: 1,
                      padding: '5px 8px',
                      borderRadius: 6,
                      background: confirming ? 'var(--peach-ink, #C6703D)' : 'var(--card)',
                      color: confirming ? 'var(--cream)' : 'var(--ink)',
                      border: confirming ? 'none' : '1px solid var(--line)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {confirming ? 'Click again to confirm' : 'Restore'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(snap.id)}
                    title="Delete snapshot"
                    style={{
                      width: 28,
                      padding: '5px 0',
                      borderRadius: 6,
                      background: 'transparent',
                      color: '#7A2D2D',
                      border: '1px solid var(--line)',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    ×
                  </button>
                </div>
                {i === 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -8,
                      right: 8,
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.16em',
                      padding: '2px 6px',
                      background: 'var(--peach-ink)',
                      color: 'var(--cream)',
                      borderRadius: 4,
                      textTransform: 'uppercase',
                    }}
                  >
                    Latest
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </PanelSection>
  );
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
