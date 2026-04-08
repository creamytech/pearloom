'use client';

interface DraftBannerProps {
  onRestore: () => void;
  onDismiss: () => void;
}

export function DraftBanner({ onRestore, onDismiss }: DraftBannerProps) {
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      background: 'var(--pl-gold, #D6C6A8)', color: 'var(--pl-ink)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '0.75rem', padding: '0.6rem 1rem',
      fontSize: 'var(--pl-text-md)', fontWeight: 600,
    }}>
      <span>Unsaved draft recovered</span>
      <span style={{ opacity: 0.4 }}>—</span>
      <button
        onClick={onRestore}
        style={{
          background: 'var(--pl-ink)', color: 'white', border: 'none', borderRadius: '4px',
          padding: '3px 10px', fontSize: 'var(--pl-text-base)', fontWeight: 700, cursor: 'pointer',
        }}
      >
        restore draft
      </button>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--pl-ink)', fontSize: 'var(--pl-text-base)', fontWeight: 600, opacity: 0.6, padding: '3px 6px',
        }}
      >
        dismiss
      </button>
    </div>
  );
}
