// ─────────────────────────────────────────────────────────────
// TextureFilters — invisible SVG <defs> block that registers
// every filter referenced by `filter: url(#xxx)` declarations in
// pearloom.css's texture treatments.
//
// CSS `filter: url(#wet-edge)` only resolves when an actual
// <svg><filter id="wet-edge"> element exists in the DOM. Loading
// a filter via background-image: url(data:...) does NOT register
// the id. So this component mounts the filter defs once at the
// site root and the textures finally have hand-painted edges,
// inked headlines, and real wet bleed.
//
// All filters are zero-cost when no element references them.
// Positioned absolutely + opacity 0 + pointer-events: none so the
// <svg> wrapper takes zero layout space.
// ─────────────────────────────────────────────────────────────

export function TextureFilters() {
  return (
    <svg
      aria-hidden
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/* WATERCOLOR — wet card edge. Low-freq turbulence +
            displacement gives card outlines an organic wobble
            so they read as hand-painted shapes, not CSS
            rectangles. Scale 6 is the sweet spot — bigger and
            cards look melted. */}
        <filter id="wc-card-edge" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018"
            numOctaves="3"
            seed="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* WATERCOLOR — brush-lettered type. Tiny displacement
            scale 1.5 so letterforms get a tiny irregular outline
            that reads as a wet brush stroke instead of laser type. */}
        <filter id="wc-text-edge" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.06"
            numOctaves="2"
            seed="5"
            result="textNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="textNoise"
            scale="1.5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* LETTERPRESS — pressed type. Sharper displacement on
            edges, lower scale, simulating ink soaking into fibers
            at letter boundaries. */}
        <filter id="lp-text-press" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.5"
            numOctaves="2"
            seed="3"
            result="pressNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="pressNoise"
            scale="0.6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
