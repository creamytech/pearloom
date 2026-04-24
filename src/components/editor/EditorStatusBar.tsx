'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/EditorStatusBar.tsx
//
// 28px bottom status strip. Shows current panel, active chapter
// position, total word count, zoom level, and save state dot.
// ─────────────────────────────────────────────────────────────

import { useEditor, type EditorTab } from '@/lib/editor-state';

const TAB_LABEL: Partial<Record<EditorTab, string>> = {
  story:       'Story',
  canvas:      'Sections',
  events:      'Events',
  design:      'Design',
  details:     'Details',
  pages:       'Pages',
  blocks:      'Pear',
  voice:       'Voice',
  messaging:   'Messages',
  analytics:   'Analytics',
  guests:      'Guests',
  seating:     'Seating',
  translate:   'Translations',
  invite:      'Invitations',
  savethedate: 'Save the Date',
};

export function EditorStatusBar() {
  const { state, manifest } = useEditor();
  const { saveState, chapters, activeId, activeTab, previewZoom } = state;

  const activeChapter = chapters.find(c => c.id === activeId);
  const chapterIdx    = activeChapter ? chapters.indexOf(activeChapter) + 1 : null;

  const wordCount = chapters.reduce((sum, ch) => {
    const words = ch.description?.trim().split(/\s+/).filter(Boolean).length || 0;
    const titleWords = ch.title?.trim().split(/\s+/).filter(Boolean).length || 0;
    return sum + words + titleWords;
  }, 0);

  const sep = <span style={{ color: 'rgba(255,255,255,0.25)' }}>·</span>;

  return (
    <div style={{
      height: '28px', flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: '10px',
      background: 'var(--cream)',
      borderTop: '1px solid rgba(255,255,255,0.25)',
      fontSize: '0.65rem', fontWeight: 600,
      color: '#71717A', letterSpacing: '0.03em',
      userSelect: 'none',
    }}>
      {/* Panel label */}
      <span style={{ color: '#3F3F46', fontWeight: 700 }}>
        {TAB_LABEL[activeTab] ?? activeTab}
      </span>

      {activeChapter && (
        <>
          {sep}
          <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeChapter.title || 'Untitled'}
          </span>
          {sep}
          <span>{chapterIdx} of {chapters.length}</span>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Word count */}
      <span>{wordCount.toLocaleString()} words</span>

      {sep}

      {/* Zoom */}
      <span>{Math.round(previewZoom * 100)}%</span>

      {sep}

      {/* Save state — binary (saved | unsaved) per the editor-state
          SaveState type. The pulsing gold dot on unsaved reads as
          "in motion" so users understand an autosave is queued,
          not that their work is at risk. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          flexShrink: 0,
          background: saveState === 'saved' ? '#71717A' : 'var(--gold)',
          boxShadow: saveState === 'saved'
            ? '0 0 6px rgba(24,24,27,0.55)'
            : '0 0 6px rgba(196,169,106,0.55)',
          transition: 'background 0.3s, box-shadow 0.3s',
          animation: saveState === 'saved' ? undefined : 'pl-dot-pulse 1.2s ease-in-out infinite',
        }} />
        <span style={{
          color: saveState === 'saved' ? '#18181B' : 'var(--gold)',
          transition: 'color 0.3s',
        }}>
          {saveState === 'saved' ? 'Saved' : 'Saving…'}
        </span>
      </div>
    </div>
  );
}
