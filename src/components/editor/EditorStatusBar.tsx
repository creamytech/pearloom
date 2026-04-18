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
      background: 'var(--pl-cream)',
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

      {/* Save state — four distinct states (idle = up-to-date,
          saving = in-flight, saved = just-saved, error = failed).
          Previously collapsed saving+error into "Unsaved"; now
          each state has its own label + dot colour so users can
          tell "I'm being saved" from "my save broke". */}
      {(() => {
        const saveDot =
          saveState === 'error' ? 'var(--pl-plum)' :
          saveState === 'saving' ? 'var(--pl-gold)' :
          saveState === 'saved' ? '#71717A' :
          '#71717A';
        const saveLabel =
          saveState === 'error' ? 'Save failed' :
          saveState === 'saving' ? 'Saving…' :
          saveState === 'saved' ? 'Saved' :
          'Up to date';
        const saveLabelColor =
          saveState === 'error' ? 'var(--pl-plum)' :
          saveState === 'saving' ? 'var(--pl-gold)' :
          '#18181B';
        return (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            role={saveState === 'error' ? 'alert' : undefined}
          >
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              flexShrink: 0,
              background: saveDot,
              boxShadow: `0 0 6px ${saveState === 'error' ? 'rgba(122,45,45,0.6)' : saveState === 'saving' ? 'rgba(196,169,106,0.55)' : 'rgba(24,24,27,0.55)'}`,
              transition: 'background 0.3s, box-shadow 0.3s',
              animation: saveState === 'saving' ? 'pl-dot-pulse 1.2s ease-in-out infinite' : undefined,
            }} />
            <span style={{ color: saveLabelColor, transition: 'color 0.3s' }}>
              {saveLabel}
            </span>
          </div>
        );
      })()}
    </div>
  );
}
