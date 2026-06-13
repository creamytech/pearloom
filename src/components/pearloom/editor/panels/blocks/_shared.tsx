'use client';

/* eslint-disable no-restricted-syntax */
/* Shared atoms for the Event-OS block panels (panels/blocks/*).

   These panels mount through the redesign PropertyRail's
   renderSectionEditor dispatch — one per Event-OS canvas section
   (itinerary / costSplitter / activityVote / toastSignup /
   adviceWall / program / livestream / obituary / packingList /
   honorList). Where the Memorial workspace or Weekend planner tool
   already owns the data (manifest.memorial.* / manifest.bachelor.*),
   the block panel is a THIN editor over the SAME field plus a
   ToolPointerCard linking to the richer tool. */

import type { ReactNode } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../../motifs';

export interface BlockPanelProps {
  manifest: StoryManifest;
  onChange: (next: StoryManifest) => void;
}

/** Stable-enough row id for host-authored list items. */
export function mkId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export function readOccasion(manifest: StoryManifest): string | undefined {
  return (manifest as unknown as { occasion?: string }).occasion;
}

/* Occasion lists mirror isToolPanelApplicable in
   redesign/EditorRedesign.tsx — duplicated here (instead of
   imported) so the shared editor/panels tree never pulls the
   redesign shell into its module graph. */
export function isMemorialOccasion(occasion?: string): boolean {
  return occasion === 'memorial' || occasion === 'funeral';
}
export function isBachelorOccasion(occasion?: string): boolean {
  return occasion === 'bachelor-party' || occasion === 'bachelorette-party'
      || occasion === 'bridal-shower' || occasion === 'reunion'
      || occasion === 'sip-and-see';
}

/** Soft card pointing the host at the tool panel that co-owns this
 *  section's data. Clicking fires pearloom:design-jump (the same
 *  event PublishChecklist uses) so the PropertyRail flips panels. */
export function ToolPointerCard({ toolId, label, body }: { toolId: string; label: string; body: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block: toolId } }));
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10,
        background: 'var(--lavender-bg, var(--cream-2))',
        border: '1px solid var(--line-soft)',
        cursor: 'pointer', textAlign: 'left', width: '100%',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <Icon name="arrow-ur" size={13} color="var(--lavender-ink, var(--ink-soft))" />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{label}</span>
        <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-muted)', marginTop: 1, lineHeight: 1.4 }}>{body}</span>
      </span>
    </button>
  );
}

/** Textarea matching the panel input language (mirrors the inline
 *  textareas in MemorialPanel). */
export function FTextArea({
  value, onChange, placeholder, rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      style={{
        width: '100%', padding: 10, borderRadius: 10,
        border: '1px solid var(--line)', background: 'var(--cream-2)',
        fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)',
        outline: 'none', resize: 'vertical', lineHeight: 1.6,
      }}
    />
  );
}

/** Small inline remove (×) button used beside list rows. */
export function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: 24, height: 24, borderRadius: 6, flexShrink: 0,
        display: 'grid', placeItems: 'center',
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: 'var(--ink-muted)',
      }}
    >
      <Icon name="close" size={12} />
    </button>
  );
}

/** Card-ish wrapper for one list row with stacked fields. */
export function RowCard({ children }: { children: ReactNode }) {
  return (
    <div style={{
      padding: 10, borderRadius: 11,
      background: 'var(--card)', border: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {children}
    </div>
  );
}
