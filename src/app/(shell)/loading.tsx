// ──────────────────────────────────────────────────────────────
// Shared loading.tsx for every (shell)/* route.
//
// Renders inside the persistent shell (sidebar stays mounted) for
// the brief gap between Link click and SSR ready.
//
// Polish 2026-04-26: skeleton is now DELAY-SHOWN — invisible for
// the first 280ms, then fades in. Fast tab switches (<280ms) never
// flash the skeleton at all; the previous content stays painted
// until the new content arrives. Slow loads still get visual
// feedback so users know something's happening. Combined with the
// global TopProgressBar in ShellPersistentLayout, the experience
// reads as instant for routine tab clicks.
// ──────────────────────────────────────────────────────────────

export default function ShellLoading() {
  return (
    <div
      className="pl8-shell-loading"
      style={{
        minHeight: '60vh',
        padding: 'clamp(20px, 4vw, 40px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        // Hidden by default; the keyframe fades it in only if it's
        // still mounted past 280ms. No fade-out on the way out —
        // when the real content lands, loading.tsx is unmounted.
        opacity: 0,
        animation: 'pl8-shell-loading-fade-in 220ms cubic-bezier(0.22, 1, 0.36, 1) 280ms forwards',
      }}
      aria-busy="true"
      aria-live="polite"
    >
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
