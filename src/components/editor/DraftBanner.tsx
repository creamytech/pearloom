'use client';

interface DraftBannerProps {
  onRestore: () => void;
  onDismiss: () => void;
}

export function DraftBanner({ onRestore, onDismiss }: DraftBannerProps) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      background: 'var(--pl-gold, #D6C6A8)', color: '#18181B',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '0.75rem', padding: '0.6rem 1rem',
      fontSize: '0.8rem', fontWeight: 600,
    }}>
      <span>Unsaved draft recovered</span>
      <span style={{ opacity: 0.4 }}>—</span>
      <button
        onClick={onRestore}
        style={{
          background: '#18181B', color: '#fff', border: 'none', borderRadius: 'var(--pl-radius-xs)',
          padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
        }}
      >
        restore draft
      </button>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#18181B', fontSize: '0.75rem', fontWeight: 600, opacity: 0.6, padding: '3px 6px',
        }}
      >
        dismiss
      </button>
    </div>
  );
}
