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
        {/* WATERCOLOR — wet card edge. Scale tuned DOWN to 2.5
            because feDisplacementMap displaces every descendant
            including the card's text content. Anything higher
            than 3 makes "Arrive & settle" look wobbly. Lower
            frequency (0.014) so the wobble is long-wavelength
            and reads as organic shape, not jitter. */}
        <filter id="wc-card-edge" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.014"
            numOctaves="2"
            seed="2"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2.5"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* WATERCOLOR — brush-lettered headlines. Scale 0.8 so
            display type gets a tiny brush wobble at letter edges
            without becoming unreadable. */}
        <filter id="wc-text-edge" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.08"
            numOctaves="2"
            seed="5"
            result="textNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="textNoise"
            scale="0.8"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* LETTERPRESS — pressed type. Tiny displacement scale 0.4
            simulating ink absorbed into paper fibers at letter
            edges. Smaller than watercolor because the press is
            crisp, not wet. */}
        <filter id="lp-text-press" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.7"
            numOctaves="2"
            seed="3"
            result="pressNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="pressNoise"
            scale="0.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
