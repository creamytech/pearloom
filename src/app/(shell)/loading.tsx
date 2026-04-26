// ──────────────────────────────────────────────────────────────
// Shared loading.tsx for every (shell)/* route.
//
// Renders inside the persistent shell (sidebar stays mounted) for
// the brief gap between Link click and SSR ready. No opacity dim
// on the wrapper — the user explicitly didn't want the whole shell
// to read as fading. Just paper-toned skeleton blocks at full
// opacity so the eye sees "content swapping" not "page fading."
// ──────────────────────────────────────────────────────────────

export default function ShellLoading() {
  return (
    <div
      style={{
        minHeight: '60vh',
        padding: 'clamp(20px, 4vw, 40px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
      aria-busy="true"
      aria-live="polite"
    >
      {/* Title placeholder */}
      <div
        style={{
          width: '38%',
          height: 32,
          borderRadius: 8,
          background: 'var(--cream-2, #F0E8D4)',
        }}
      />
      <div
        style={{
          width: '60%',
          height: 14,
          borderRadius: 6,
          background: 'var(--cream-2, #F0E8D4)',
        }}
      />

      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              height: 156,
              borderRadius: 14,
              background: 'var(--cream-2, #F0E8D4)',
              border: '1px solid var(--card-ring, rgba(61,74,31,0.10))',
            }}
          />
        ))}
      </div>

      <span style={{ position: 'absolute', left: -9999, top: -9999 }}>
        Threading…
      </span>
    </div>
  );
}
