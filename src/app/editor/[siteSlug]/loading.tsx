// ─────────────────────────────────────────────────────────────
// /editor/[siteSlug] loading state — a paper skeleton of the
// editor's three-pane shell (left section rail, canvas card,
// right property rail) so the route paints instantly while the
// editor bundle + site manifest stream in. Shimmer keyframe
// mirrors /store/loading.tsx. Under 768px it collapses to the
// mobile editor shape: canvas bone + bottom bar bone.
// ─────────────────────────────────────────────────────────────

const bone: React.CSSProperties = {
  background:
    'linear-gradient(90deg, var(--pl-cream-deep, #EBE3D2) 25%, var(--pl-cream-card, #FBF7EE) 50%, var(--pl-cream-deep, #EBE3D2) 75%)',
  backgroundSize: '400% 100%',
  animation: 'pl-skeleton-wave 1.6s ease-in-out infinite',
  borderRadius: 'var(--pl-radius-md, 8px)',
};

function RailBones({ rows }: { rows: number }) {
  return (
    <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
      <div style={{ ...bone, height: 28, width: '60%' }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ ...bone, height: 44 }} />
      ))}
    </div>
  );
}

export default function EditorLoading() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--pl-cream, #F5EFE2)',
        padding: '20px clamp(14px, 2.5vw, 28px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
      aria-busy="true"
    >
      <style>{`@keyframes pl-skeleton-wave { 0% { background-position: 100% 0 } 100% { background-position: 0 0 } }
        .pl-ed-skel-grid { display: grid; grid-template-columns: 220px minmax(0, 1fr) 280px; gap: 20px; flex: 1; min-height: 0; }
        .pl-ed-skel-bottombar { display: none; }
        @media (max-width: 768px) {
          .pl-ed-skel-grid { grid-template-columns: minmax(0, 1fr); }
          .pl-ed-skel-rail { display: none; }
          .pl-ed-skel-bottombar { display: block; }
        }
        @media (prefers-reduced-motion: reduce) { [aria-busy] * { animation: none !important } }`}</style>

      <div
        style={{
          fontFamily: 'var(--pl-font-mono, monospace)',
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--pl-muted, #6F6557)',
        }}
      >
        Threading the loom…
      </div>

      <div className="pl-ed-skel-grid">
        {/* Left rail — section list bones */}
        <div className="pl-ed-skel-rail">
          <RailBones rows={7} />
        </div>

        {/* Canvas — one big paper card bone with a hero + text bones */}
        <div
          style={{
            background: 'var(--pl-cream-card, #FBF7EE)',
            border: '1px solid var(--pl-divider, #D8CFB8)',
            borderRadius: 'var(--pl-radius-xl, 16px)',
            boxShadow: 'var(--pl-shadow-md, 0 4px 16px rgba(40,28,12,0.08))',
            padding: 'clamp(20px, 4vw, 48px)',
            display: 'grid',
            gap: 16,
            alignContent: 'start',
            minHeight: 480,
          }}
        >
          <div style={{ ...bone, height: 12, width: 120, margin: '0 auto' }} />
          <div style={{ ...bone, height: 56, width: 'min(420px, 80%)', margin: '0 auto' }} />
          <div style={{ ...bone, height: 14, width: 'min(280px, 60%)', margin: '0 auto' }} />
          <div style={{ ...bone, height: 220, borderRadius: 'var(--pl-radius-lg, 12px)', marginTop: 12 }} />
          <div style={{ ...bone, height: 14, width: '85%' }} />
          <div style={{ ...bone, height: 14, width: '70%' }} />
        </div>

        {/* Right rail — property panel bones */}
        <div className="pl-ed-skel-rail">
          <RailBones rows={5} />
        </div>
      </div>

      {/* Mobile bottom bar bone — stands in for the editor's
          bottom toolbar on a single-column viewport */}
      <div className="pl-ed-skel-bottombar">
        <div style={{ ...bone, height: 52, borderRadius: 'var(--pl-radius-full, 100px)' }} />
      </div>
    </main>
  );
}
