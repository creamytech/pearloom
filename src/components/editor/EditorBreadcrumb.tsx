'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / EditorBreadcrumb.tsx — Contextual breadcrumb navigation
// Shows: Site > [Tab] > [Chapter name] when editing a chapter
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useEditor, type EditorTab } from '@/lib/editor-state';

const TAB_LABELS: Record<EditorTab, string> = {
  canvas: 'Sections', story: 'Story', events: 'Events',
  design: 'Design', details: 'Details', pages: 'Pages',
  blocks: 'AI Blocks', voice: 'Voice', messaging: 'Messaging',
  analytics: 'Analytics', guests: 'Guests', seating: 'Seating',
  translate: 'Translate', invite: 'Invite', savethedate: 'Save the Date',
};

export function EditorBreadcrumb() {
  const { state, dispatch, coupleNames, manifest } = useEditor();
  const { activeTab, activeId, chapters, isMobile } = state;

  if (isMobile) return null;

  const activeChapter = activeId ? chapters.find(c => c.id === activeId) : null;
  const siteName = manifest.occasion === 'birthday'
    ? `${coupleNames[0]}'s Birthday`
    : `${coupleNames[0]} & ${coupleNames[1]}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-1.5 text-[0.72rem] font-medium"
      style={{ color: 'rgba(255,255,255,0.35)' }}
    >
      <button
        onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: 'story' })}
        className="bg-transparent border-none cursor-pointer p-0 hover:text-white transition-colors"
        style={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
      >
        {siteName}
      </button>

      <ChevronRight size={10} style={{ opacity: 0.5 }} />

      <button
        onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', tab: activeTab })}
        className="bg-transparent border-none cursor-pointer p-0 hover:text-white transition-colors"
        style={{
          color: activeChapter ? 'inherit' : 'var(--eg-accent, #A3B18A)',
          fontSize: 'inherit',
          fontWeight: activeChapter ? 'inherit' : 700,
        }}
      >
        {TAB_LABELS[activeTab]}
      </button>

      {activeChapter && activeTab === 'story' && (
        <>
          <ChevronRight size={10} style={{ opacity: 0.5 }} />
          <span style={{ color: 'var(--eg-gold, #D6C6A8)', fontWeight: 600 }}>
            {activeChapter.title || 'Untitled'}
          </span>
        </>
      )}
    </motion.div>
  );
}
