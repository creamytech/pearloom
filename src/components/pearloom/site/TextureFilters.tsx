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

        {/* ─── Prototype texture filter set ─────────────────
            Direct port of the prototype's ThemeDefs filters
            (themed-site.jsx ~line 177). These are the building
            blocks the per-texture CSS layers in pearloom.css use
            to compose paper / cotton / velvet textures from
            multiple ::before/::after layers with mix-blend-mode.
            Each filter is a feTurbulence noise source piped
            through feColorMatrix to make grayscale + opaque
            alpha so the layer can be blended over the underlying
            paper. */}

        {/* t-grain — fine paper grain with dark specks. Used in
            paper / cotton / watercolor textures at low opacity
            with mix-blend-mode multiply. */}
        <filter id="t-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0" />
        </filter>

        {/* t-mottle — coarse mottle (large soft tonal blotches).
            Handmade-paper unevenness. Used in paper / cotton /
            velvet at soft-light blend. */}
        <filter id="t-mottle">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={2} seed={11} result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComponentTransfer in="g">
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
        </filter>

        {/* t-weave — fine directional weave tooth (tight thread-
            like grayscale). Used in linen / paper / cotton at
            soft-light blend. */}
        <filter id="t-weave">
          <feTurbulence type="fractalNoise" baseFrequency="0.5 0.85" numOctaves={2} seed={6} stitchTiles="stitch" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComponentTransfer in="g">
            <feFuncA type="linear" slope="0" intercept="1" />
          </feComponentTransfer>
        </filter>

        {/* t-watercolor — organic edge displacement for the
            WatercolorBloom decorative motif. Pushes the three
            radial-gradient blobs into painterly shapes. */}
        <filter id="t-watercolor" x="-30%" y="-30%" width="160%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.013 0.016" numOctaves={3} seed={8} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={34} xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
