'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/ChapterActions.tsx
// Compact action toolbar for chapter cards in the editor.
// Shows completion dots, AI Rewrite button, and Sort Photos button.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { Loader2, Sparkles, ArrowUpDown } from 'lucide-react';
import type { Chapter } from '@/types';

// ── Types ──────────────────────────────────────────────────────
type Tone = 'polish' | 'poetic' | 'playful' | 'intimate';

interface ChapterActionsProps {
  chapter: Chapter;
  voiceSamples?: string[];
  onUpdate: (updated: Partial<Chapter>) => void;
  isRewriting?: boolean;
}

// ── Tone options ───────────────────────────────────────────────
const TONE_OPTS: Array<{ value: Tone; label: string; desc: string }> = [
  { value: 'polish',  label: 'Polish',   desc: 'Elevate & refine'     },
  { value: 'poetic',  label: 'Poetic',   desc: 'Lyrical, imagery-rich' },
  { value: 'playful', label: 'Playful',  desc: 'Lighter, warmer wit'   },
  { value: 'intimate',label: 'Intimate', desc: 'Raw & personal'        },
];

// ── Completion Dot ─────────────────────────────────────────────
function CompletionDot({
  filled,
  tooltip,
}: {
  filled: boolean;
  tooltip: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        title={tooltip}
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: filled ? '#4ade80' : 'rgba(255,255,255,0.15)',
          border: filled ? 'none' : '1px solid rgba(255,255,255,0.2)',
          transition: 'background 0.2s',
          cursor: 'default',
          flexShrink: 0,
        }}
      />
      {hover && (
        <div
          style={{
            position: 'absolute',
            bottom: '130%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20,18,15,0.97)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: '0.6rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            padding: '3px 6px',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 100,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function ChapterActions({
  chapter,
  voiceSamples,
  onUpdate,
  isRewriting = false,
}: ChapterActionsProps) {
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [localRewriting, setLocalRewriting] = useState(false);
  const [sortingPhotos, setSortingPhotos] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const rewriting = isRewriting || localRewriting;

  // Completion signals
  const hasPhotos      = (chapter.images?.length ?? 0) > 0;
  const hasTitle       = !!chapter.hasCustomTitle || (!!chapter.title && chapter.title !== 'New Chapter');
  const hasDescription = !!chapter.hasCustomDescription || (!!chapter.description && chapter.description !== 'Write your story here…');

  // Close tone menu on outside click
  useEffect(() => {
    if (!showToneMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowToneMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showToneMenu]);

  const handleRewrite = async (tone: Tone) => {
    setShowToneMenu(false);
    setLocalRewriting(true);
    try {
      const res = await fetch('/api/rewrite-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter, voiceSamples, tone }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.title || data.description) {
          onUpdate({
            title: data.title || chapter.title,
            subtitle: data.subtitle || chapter.subtitle,
            description: data.description || chapter.description,
            hasCustomTitle: true,
            hasCustomDescription: true,
          });
        }
      }
    } catch (e) {
      console.error('[ChapterActions] rewrite failed:', e);
    } finally {
      setLocalRewriting(false);
    }
  };

  const handleSortPhotos = async () => {
    if (!chapter.images?.length) return;
    setSortingPhotos(true);
    try {
      const res = await fetch('/api/sort-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId: chapter.id, images: chapter.images }),
      });
      if (res.ok) {
        const { sortedIds } = await res.json();
        if (sortedIds?.length) {
          const idxMap = new Map<string, number>(
            sortedIds.map((id: string, i: number) => [id, i])
          );
          const sorted = [...chapter.images].sort(
            (a, b) => (idxMap.get(a.id) ?? 999) - (idxMap.get(b.id) ?? 999)
          );
          onUpdate({ images: sorted });
        }
      }
    } catch (e) {
      console.error('[ChapterActions] sort photos failed:', e);
    } finally {
      setSortingPhotos(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        height: '36px',
        padding: '0 2px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Completion dots */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          marginRight: '2px',
        }}
      >
        <CompletionDot filled={hasPhotos}      tooltip={hasPhotos      ? 'Photos added'         : 'No photos yet'}         />
        <CompletionDot filled={hasTitle}       tooltip={hasTitle       ? 'Title customised'     : 'Title not customised'}  />
        <CompletionDot filled={hasDescription} tooltip={hasDescription ? 'Description written'  : 'Description missing'}   />
      </div>

      {/* Rewrite button + tone dropdown */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          disabled={rewriting}
          onClick={() => !rewriting && setShowToneMenu(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '5px',
            border: '1px solid rgba(184,146,106,0.3)',
            background: rewriting ? 'rgba(255,255,255,0.04)' : 'rgba(184,146,106,0.1)',
            color: rewriting ? 'rgba(255,255,255,0.3)' : '#b8926a',
            fontSize: '0.65rem',
            fontWeight: 700,
            cursor: rewriting ? 'not-allowed' : 'pointer',
            letterSpacing: '0.03em',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            height: '26px',
          }}
          onMouseOver={e => { if (!rewriting) (e.currentTarget as HTMLElement).style.background = 'rgba(184,146,106,0.2)'; }}
          onMouseOut={e => { if (!rewriting) (e.currentTarget as HTMLElement).style.background = 'rgba(184,146,106,0.1)'; }}
        >
          {rewriting
            ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
            : <Sparkles size={10} />}
          {rewriting ? 'Rewriting…' : 'Rewrite ✨'}
        </button>

        {/* Tone dropdown */}
        {showToneMenu && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              background: 'rgba(22,20,17,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '4px',
              minWidth: '148px',
              zIndex: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {TONE_OPTS.map(({ value, label, desc }) => (
              <button
                key={value}
                onClick={() => handleRewrite(value)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(184,146,106,0.12)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b8926a' }}>{label}</span>
                <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>{desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort Photos button — only shown when there are photos */}
      {(chapter.images?.length ?? 0) > 1 && (
        <button
          disabled={sortingPhotos}
          onClick={handleSortPhotos}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '5px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: sortingPhotos ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
            color: sortingPhotos ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)',
            fontSize: '0.65rem',
            fontWeight: 700,
            cursor: sortingPhotos ? 'not-allowed' : 'pointer',
            letterSpacing: '0.03em',
            transition: 'all 0.15s',
            whiteSpace: 'nowrap',
            height: '26px',
          }}
          onMouseOver={e => { if (!sortingPhotos) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}}
          onMouseOut={e => { if (!sortingPhotos) { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; }}}
        >
          {sortingPhotos
            ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
            : <ArrowUpDown size={10} />}
          {sortingPhotos ? 'Sorting…' : 'Sort Photos'}
        </button>
      )}
    </div>
  );
}
