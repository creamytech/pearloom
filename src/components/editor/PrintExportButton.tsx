'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/editor/PrintExportButton.tsx
// Opens the print-optimised story book in a new tab.
// ─────────────────────────────────────────────────────────────

interface PrintExportButtonProps {
  siteId: string;
  style?: React.CSSProperties;
}

export function PrintExportButton({ siteId, style }: PrintExportButtonProps) {
  function handleExport() {
    const url = `/api/export-pdf?siteId=${encodeURIComponent(siteId)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.55rem 1.1rem',
        borderRadius: '8px',
        border: '1.5px solid #8A7A4A',
        background: 'transparent',
        color: '#C9B97A',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        cursor: 'pointer',
        transition: 'background 0.18s, color 0.18s, border-color 0.18s',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseOver={e => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.background = '#8A7A4A22';
        btn.style.borderColor = '#C9B97A';
      }}
      onMouseOut={e => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.style.background = 'transparent';
        btn.style.borderColor = '#8A7A4A';
      }}
      title="Export story as printable PDF"
    >
      <span aria-hidden="true">📄</span>
      Export Story Book
    </button>
  );
}
