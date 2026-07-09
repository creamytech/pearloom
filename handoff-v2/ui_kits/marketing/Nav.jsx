/* global React */
// Pearloom marketing — sticky pill nav. Glyph + wordmark, links,
// sign-in, and the "Begin a thread" pearl CTA. Recreated from the
// product's DesignNav.
(() => {
const { PearloomLogo, Button, Pearl } = window.PearloomDesignSystem_55118c;

const NAV_LINKS = ['The three acts', 'Occasions', 'The Director', 'Pricing', 'Journal'];

function Nav({ onStart }) {
  return (
    <nav style={{ position: 'sticky', top: 14, zIndex: 50, margin: '14px auto 0', maxWidth: 1180, padding: '0 24px' }}>
      <div
        className="pl-glass-surface"
        style={{
          borderRadius: 999,
          padding: '10px 14px 10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <PearloomLogo size={26} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, fontSize: 14, fontWeight: 500, fontFamily: 'var(--pl-font-body)' }}>
          {NAV_LINKS.map((l) => (
            <a key={l} href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--pl-ink)', opacity: 0.82, textDecoration: 'none', whiteSpace: 'nowrap' }}>{l}</a>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onStart} style={{ fontSize: 14, fontWeight: 500, opacity: 0.8, padding: '8px 10px', background: 'transparent', border: 'none', color: 'var(--pl-ink)', fontFamily: 'var(--pl-font-body)', cursor: 'pointer' }}>Sign in</button>
          <Button variant="pearl" size="sm" onClick={onStart}>Begin a thread <Pearl size={8} /></Button>
        </div>
      </div>
    </nav>
  );
}

window.Nav = Nav;
})();
