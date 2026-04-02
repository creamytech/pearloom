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
  blocks:      'AI Blocks',
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

  const dim = 'rgba(214,198,168,0.3)';
  const sep = <span style={{ color: dim, opacity: 0.4 }}>·</span>;

  return (
    <div style={{
      height: '28px', flexShrink: 0,
      display: 'flex', alignItems: 'center',
      padding: '0 14px', gap: '10px',
      background: 'rgba(11,8,6,0.99)',
      borderTop: '1px solid rgba(255,255,255,0.045)',
      fontSize: '0.65rem', fontWeight: 600,
      color: dim, letterSpacing: '0.03em',
      userSelect: 'none',
    }}>
      {/* Panel label */}
      <span style={{ color: 'rgba(214,198,168,0.5)', fontWeight: 700 }}>
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

      {/* Save state */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          flexShrink: 0,
          background: saveState === 'saved' ? '#A3B18A' : '#E8B86D',
          boxShadow: saveState === 'saved'
            ? '0 0 6px rgba(163,177,138,0.55)'
            : '0 0 6px rgba(232,184,109,0.55)',
          transition: 'background 0.3s, box-shadow 0.3s',
        }} />
        <span style={{
          color: saveState === 'saved'
            ? 'rgba(163,177,138,0.55)'
            : 'rgba(232,184,109,0.6)',
          transition: 'color 0.3s',
        }}>
          {saveState === 'saved' ? 'Saved' : 'Unsaved'}
        </span>
      </div>
    </div>
  );
}
