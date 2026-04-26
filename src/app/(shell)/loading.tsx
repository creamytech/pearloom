// ──────────────────────────────────────────────────────────────
// Shared loading.tsx for every (shell)/* route.
//
// Next.js shows this between the moment a Link is clicked and the
// new server-rendered page is ready. Without it, there's a brief
// blank frame that reads as a flash — the very thing we're trying
// to kill on tab switches.
//
// Paper-toned, no spinner. The content's only job is to occupy
// the space at the right rough height so the swap feels like one
// smooth fade in, not "blank → content."
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
        opacity: 0.55,
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

      {/* Card grid placeholder */}
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
