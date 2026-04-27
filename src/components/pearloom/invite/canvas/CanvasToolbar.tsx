'use client';

// Floating toolbar above the selected element. Pinned ABOVE the
// canvas (not the element itself) so it doesn't rotate or scale
// with the selection. Always within container bounds.

import { Icon } from '../../motifs';
import {
  deleteElement, duplicateElement, moveLayer, type CanvasScene,
} from '@/lib/invite-canvas/types';

interface Props {
  scene: CanvasScene;
  setScene: (next: CanvasScene) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

export function CanvasToolbar({ scene, setScene, selectedId, setSelectedId }: Props) {
  const selected = scene.elements.find((e) => e.id === selectedId);
  if (!selected || selected.type === 'background') return null;

  const buttons: Array<{ icon: string; label: string; onClick: () => void }> = [
    {
      icon: 'arrow-up',
      label: 'Forward',
      onClick: () => setScene(moveLayer(scene, selected.id, 1)),
    },
    {
      icon: 'arrow-down',
      label: 'Back',
      onClick: () => setScene(moveLayer(scene, selected.id, -1)),
    },
    {
      icon: 'sparkles',
      label: 'Duplicate',
      onClick: () => {
        const { scene: next, newId } = duplicateElement(scene, selected.id);
        setScene(next);
        if (newId) setSelectedId(newId);
      },
    },
    {
      icon: 'close',
      label: 'Delete',
      onClick: () => {
        setScene(deleteElement(scene, selected.id));
        setSelectedId(null);
      },
    },
  ];

  return (
    <div
      role="toolbar"
      aria-label="Element actions"
      style={{
        display: 'inline-flex',
        gap: 4,
        padding: 4,
        background: 'rgba(14,13,11,0.92)',
        borderRadius: 999,
        boxShadow: '0 12px 32px rgba(14,13,11,0.32)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {buttons.map((b) => (
        <button
          key={b.label}
          type="button"
          onClick={b.onClick}
          aria-label={b.label}
          title={b.label}
          style={{
            width: 34, height: 34, borderRadius: 999,
            border: 'none', background: 'transparent',
            color: 'rgba(243,233,212,0.92)',
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            transition: 'background 180ms ease, transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(243,233,212,0.12)';
            e.currentTarget.style.transform = 'scale(1.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.transform = '';
          }}
        >
          <Icon name={b.icon} size={14} color="currentColor" />
        </button>
      ))}
    </div>
  );
}
