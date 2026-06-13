// ─────────────────────────────────────────────────────────────
// /store loading state — a paper skeleton of the storefront so
// the route paints instantly instead of holding a blank screen
// while the (force-dynamic) store streams in. Shapes mirror the
// real layout: header block, featured hero, then a pack grid.
// ─────────────────────────────────────────────────────────────

const bone: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--pl-cream-deep, #EBE3D2) 25%, var(--pl-cream-card, #FBF7EE) 50%, var(--pl-cream-deep, #EBE3D2) 75%)',
  backgroundSize: '400% 100%',
  animation: 'pl-skeleton-wave 1.6s ease-in-out infinite',
  borderRadius: 'var(--pl-radius-md, 8px)',
};

export default function StoreLoading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--pl-cream, #F5EFE2)',
        padding: '40px clamp(20px, 4vw, 48px)',
      }}
      aria-busy="true"
    >
      <style>{`@keyframes pl-skeleton-wave { 0% { background-position: 100% 0 } 100% { background-position: 0 0 } }
        @media (prefers-reduced-motion: reduce) { [aria-busy] * { animation: none !important } }`}</style>
      <div
        style={{
          fontFamily: 'var(--pl-font-mono, monospace)',
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--pl-muted, #6F6557)',
          marginBottom: 18,
        }}
      >
        Threading the shelves…
      </div>
      <div style={{ ...bone, width: 'min(420px, 60%)', height: 40, marginBottom: 12 }} />
      <div style={{ ...bone, width: 'min(560px, 80%)', height: 16, marginBottom: 32 }} />
      <div style={{ ...bone, width: '100%', maxWidth: 1280, height: 220, borderRadius: 'var(--pl-radius-xl, 16px)', margin: '0 auto 36px' }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 18,
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gap: 10 }}>
            <div style={{ ...bone, height: 150, borderRadius: 'var(--pl-radius-lg, 12px)' }} />
            <div style={{ ...bone, height: 14, width: '70%' }} />
            <div style={{ ...bone, height: 11, width: '45%' }} />
          </div>
        ))}
      </div>
    </main>
  );
}
