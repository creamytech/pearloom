'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Pearloom / components/asset-library/SvgDividers.tsx
// 30+ hand-crafted SVG divider / separator components
// Each accepts: width?, height?, color?, opacity?
// ─────────────────────────────────────────────────────────────────────────────

export interface DividerProps {
  width?: string | number;
  height?: number;
  color?: string;
  opacity?: number;
}

// ── WAVE DIVIDERS ─────────────────────────────────────────────────────────────

/** Gentle single-crest wave — classic, romantic */
export function WaveGentleDivider({ width = '100%', height = 60, color = '#A3B18A', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 60" preserveAspectRatio="none" fill="none">
      <path d="M0,30 C200,0 400,60 600,30 C800,0 1000,60 1200,30 L1200,60 L0,60 Z" fill={color} opacity={opacity} />
    </svg>
  );
}

/** Deep wave — dramatic crests with more height variation */
export function WaveDeepDivider({ width = '100%', height = 80, color = '#C9B99A', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 80" preserveAspectRatio="none" fill="none">
      <path d="M0,40 C150,5 300,75 450,40 C600,5 750,75 900,40 C1050,5 1150,70 1200,40 L1200,80 L0,80 Z" fill={color} opacity={opacity} />
      <path d="M0,50 C150,20 300,80 450,50 C600,20 750,80 900,50 C1050,20 1150,78 1200,50 L1200,80 L0,80 Z" fill={color} opacity={opacity * 0.4} />
    </svg>
  );
}

/** Double wave — two offset wave bands */
export function WaveDoubleDivider({ width = '100%', height = 70, color = '#8B9D77', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 70" preserveAspectRatio="none" fill="none">
      <path d="M0,20 C200,0 400,40 600,20 C800,0 1000,40 1200,20 L1200,35 C1000,55 800,15 600,35 C400,55 200,15 0,35 Z" fill={color} opacity={opacity} />
      <path d="M0,45 C200,25 400,65 600,45 C800,25 1000,65 1200,45 L1200,70 L0,70 Z" fill={color} opacity={opacity * 0.6} />
    </svg>
  );
}

/** Asymmetric wave — rolling, organic feel */
export function WaveAsymmetricDivider({ width = '100%', height = 70, color = '#B5A99A', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 70" preserveAspectRatio="none" fill="none">
      <path d="M0,35 C100,10 250,60 500,25 C700,0 850,70 1100,30 C1150,22 1180,28 1200,35 L1200,70 L0,70 Z" fill={color} opacity={opacity} />
    </svg>
  );
}

// ── FLORAL DIVIDERS ───────────────────────────────────────────────────────────

/** Rose vine border — roses connected by a winding stem */
export function FloralRoseVineDivider({ width = '100%', height = 80, color = '#C97B84', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 80" preserveAspectRatio="xMidYMid meet" fill="none">
      {/* Main vine */}
      <path d="M0,40 C100,30 150,50 200,40 C250,30 300,50 400,40 C500,30 550,50 600,40 C650,30 700,50 800,40 C900,30 950,50 1000,40 C1050,30 1100,50 1200,40" stroke={color} strokeWidth="2" opacity={opacity} />
      {/* Rose 1 */}
      <circle cx="200" cy="40" r="10" fill={color} opacity={opacity} />
      <path d="M195,35 Q200,25 205,35 Q210,30 205,40 Q200,50 195,40 Q190,45 195,35Z" fill={color} opacity={opacity * 0.7} />
      {/* Rose 2 */}
      <circle cx="600" cy="40" r="10" fill={color} opacity={opacity} />
      <path d="M595,35 Q600,25 605,35 Q610,30 605,40 Q600,50 595,40 Q590,45 595,35Z" fill={color} opacity={opacity * 0.7} />
      {/* Rose 3 */}
      <circle cx="1000" cy="40" r="10" fill={color} opacity={opacity} />
      <path d="M995,35 Q1000,25 1005,35 Q1010,30 1005,40 Q1000,50 995,40 Q990,45 995,35Z" fill={color} opacity={opacity * 0.7} />
      {/* Leaves */}
      <ellipse cx="150" cy="33" rx="12" ry="6" fill={color} opacity={opacity * 0.5} transform="rotate(-20,150,33)" />
      <ellipse cx="250" cy="47" rx="12" ry="6" fill={color} opacity={opacity * 0.5} transform="rotate(20,250,47)" />
      <ellipse cx="550" cy="33" rx="12" ry="6" fill={color} opacity={opacity * 0.5} transform="rotate(-20,550,33)" />
      <ellipse cx="650" cy="47" rx="12" ry="6" fill={color} opacity={opacity * 0.5} transform="rotate(20,650,47)" />
      <ellipse cx="950" cy="33" rx="12" ry="6" fill={color} opacity={opacity * 0.5} transform="rotate(-20,950,33)" />
      <ellipse cx="1050" cy="47" rx="12" ry="6" fill={color} opacity={opacity * 0.5} transform="rotate(20,1050,47)" />
    </svg>
  );
}

/** Daisy chain — cheerful daisies linked by a stem */
export function FloralDaisyChainDivider({ width = '100%', height = 70, color = '#D4AF6A', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 70" preserveAspectRatio="xMidYMid meet" fill="none">
      <line x1="0" y1="35" x2="1200" y2="35" stroke={color} strokeWidth="1.5" opacity={opacity * 0.5} />
      {[100, 300, 500, 700, 900, 1100].map((cx) => (
        <g key={cx}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <ellipse
              key={angle}
              cx={cx + 12 * Math.cos((angle * Math.PI) / 180)}
              cy={35 + 12 * Math.sin((angle * Math.PI) / 180)}
              rx="8"
              ry="4"
              fill={color}
              opacity={opacity * 0.8}
              transform={`rotate(${angle}, ${cx + 12 * Math.cos((angle * Math.PI) / 180)}, ${35 + 12 * Math.sin((angle * Math.PI) / 180)})`}
            />
          ))}
          <circle cx={cx} cy="35" r="6" fill={color} opacity={opacity} />
          <circle cx={cx} cy="35" r="3" fill="white" opacity={opacity * 0.6} />
        </g>
      ))}
    </svg>
  );
}

/** Leaf swag — cascading leaf garland */
export function FloralLeafSwagDivider({ width = '100%', height = 80, color = '#7A9E7E', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 80" preserveAspectRatio="xMidYMid meet" fill="none">
      {/* Swag rope */}
      <path d="M0,20 Q150,60 300,20 Q450,60 600,20 Q750,60 900,20 Q1050,60 1200,20" stroke={color} strokeWidth="1.5" opacity={opacity * 0.6} fill="none" />
      {/* Leaves at swag points */}
      {[0, 300, 600, 900, 1200].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="20" rx="14" ry="7" fill={color} opacity={opacity * 0.9} transform={`rotate(-30,${x},20)`} />
          <ellipse cx={x} cy="20" rx="14" ry="7" fill={color} opacity={opacity * 0.7} transform={`rotate(30,${x},20)`} />
          <ellipse cx={x} cy="20" rx="10" ry="5" fill={color} opacity={opacity * 0.5} transform={`rotate(-60,${x},20)`} />
          <ellipse cx={x} cy="20" rx="10" ry="5" fill={color} opacity={opacity * 0.5} transform={`rotate(60,${x},20)`} />
        </g>
      ))}
      {/* Hanging berries */}
      {[150, 450, 750, 1050].map((x) => (
        <g key={x}>
          <circle cx={x} cy="58" r="4" fill={color} opacity={opacity * 0.8} />
          <circle cx={x - 8} cy="62" r="3" fill={color} opacity={opacity * 0.6} />
          <circle cx={x + 8} cy="62" r="3" fill={color} opacity={opacity * 0.6} />
          <line x1={x} y1="50" x2={x} y2="54" stroke={color} strokeWidth="1" opacity={opacity * 0.5} />
        </g>
      ))}
    </svg>
  );
}

/** Flower garland — full mixed-flower border */
export function FloralGarlandDivider({ width = '100%', height = 80, color = '#C9906A', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 80" preserveAspectRatio="xMidYMid meet" fill="none">
      <path d="M0,40 C60,30 120,50 200,40 C280,30 340,50 440,40 C520,30 580,50 600,40 C620,30 680,50 760,40 C840,30 900,50 1000,40 C1080,30 1140,50 1200,40" stroke={color} strokeWidth="1.5" opacity={opacity * 0.5} fill="none" />
      {[100, 250, 400, 600, 800, 950, 1100].map((cx, i) => {
        const r = i % 2 === 0 ? 14 : 11;
        const petalCount = i % 3 === 0 ? 6 : 5;
        return (
          <g key={cx}>
            {Array.from({ length: petalCount }).map((_, p) => {
              const angle = (p * 360) / petalCount;
              return (
                <ellipse
                  key={p}
                  cx={cx + r * Math.cos((angle * Math.PI) / 180)}
                  cy={40 + r * Math.sin((angle * Math.PI) / 180)}
                  rx={r * 0.55}
                  ry={r * 0.3}
                  fill={color}
                  opacity={opacity * 0.7}
                  transform={`rotate(${angle},${cx + r * Math.cos((angle * Math.PI) / 180)},${40 + r * Math.sin((angle * Math.PI) / 180)})`}
                />
              );
            })}
            <circle cx={cx} cy="40" r={r * 0.35} fill={color} opacity={opacity} />
          </g>
        );
      })}
    </svg>
  );
}

// ── GEOMETRIC DIVIDERS ────────────────────────────────────────────────────────

/** Zigzag — crisp angular teeth */
export function GeometricZigzagDivider({ width = '100%', height = 40, color = '#6B7C93', opacity = 1 }: DividerProps) {
  const points = Array.from({ length: 61 }, (_, i) => `${i * 20},${i % 2 === 0 ? 0 : 40}`).join(' ');
  return (
    <svg width={width} height={height} viewBox="0 0 1200 40" preserveAspectRatio="none" fill="none">
      <polyline points={points} stroke={color} strokeWidth="2" opacity={opacity} fill="none" />
    </svg>
  );
}

/** Scallop — arched half-circles along the bottom */
export function GeometricScallopDivider({ width = '100%', height = 50, color = '#B89AB0', opacity = 1 }: DividerProps) {
  const arcs = Array.from({ length: 20 }, (_, i) => {
    const x1 = i * 60;
    const x2 = (i + 1) * 60;
    return `M${x1},0 Q${x1 + 30},50 ${x2},0`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox="0 0 1200 50" preserveAspectRatio="none" fill="none">
      <path d={arcs} stroke={color} strokeWidth="2" opacity={opacity} fill="none" />
    </svg>
  );
}

/** Arch row — repeated upward arches, filled */
export function GeometricArchRowDivider({ width = '100%', height = 50, color = '#9B8EA5', opacity = 1 }: DividerProps) {
  const arcs = Array.from({ length: 20 }, (_, i) => {
    const x1 = i * 60;
    const x2 = (i + 1) * 60;
    return `M${x1},50 Q${x1 + 30},5 ${x2},50`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox="0 0 1200 50" preserveAspectRatio="none" fill="none">
      <path d={arcs + ' Z'} stroke={color} strokeWidth="1.5" fill={color} opacity={opacity * 0.3} />
      <path d={arcs} stroke={color} strokeWidth="2" fill="none" opacity={opacity} />
    </svg>
  );
}

/** Diamond chain — repeated diamonds connected by a line */
export function GeometricDiamondChainDivider({ width = '100%', height = 40, color = '#C2A96B', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 40" preserveAspectRatio="xMidYMid meet" fill="none">
      <line x1="0" y1="20" x2="1200" y2="20" stroke={color} strokeWidth="1" opacity={opacity * 0.4} />
      {[60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140].map((cx) => (
        <polygon
          key={cx}
          points={`${cx},5 ${cx + 15},20 ${cx},35 ${cx - 15},20`}
          fill={color}
          opacity={opacity * 0.8}
        />
      ))}
      {[120, 240, 360, 480, 600, 720, 840, 960, 1080].map((cx) => (
        <polygon
          key={cx}
          points={`${cx},14 ${cx + 8},20 ${cx},26 ${cx - 8},20`}
          fill={color}
          opacity={opacity * 0.4}
        />
      ))}
    </svg>
  );
}

/** Chevron row — repeated pointing chevrons */
export function GeometricChevronDivider({ width = '100%', height = 40, color = '#7A8C9A', opacity = 1 }: DividerProps) {
  const chevrons = Array.from({ length: 30 }, (_, i) => {
    const x = i * 40;
    return `M${x},35 L${x + 20},5 L${x + 40},35`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox="0 0 1200 40" preserveAspectRatio="none" fill="none">
      <path d={chevrons} stroke={color} strokeWidth="2" opacity={opacity} fill="none" />
    </svg>
  );
}

// ── SCRIPT / CALLIGRAPHY DIVIDERS ─────────────────────────────────────────────

/** Cursive flourish — an elegant looping calligraphic swash */
export function ScriptFlourishDivider({ width = '100%', height = 80, color = '#8B7355', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 80" preserveAspectRatio="xMidYMid meet" fill="none">
      <path
        d="M20,60 C80,20 120,70 180,40 C220,20 240,10 280,40 C320,65 340,15 380,40 C420,60 440,20 480,35 C520,50 540,10 580,35 C600,45 620,10 660,35 C700,55 720,15 760,40 C800,60 820,20 860,35 C900,50 920,10 960,35 C1000,60 1020,15 1060,40 C1100,60 1140,20 1180,45"
        stroke={color}
        strokeWidth="2"
        opacity={opacity}
        strokeLinecap="round"
      />
      <path
        d="M20,60 C40,55 55,65 70,58 M1130,45 C1150,40 1165,50 1180,45"
        stroke={color}
        strokeWidth="1.5"
        opacity={opacity * 0.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Calligraphy swash — bold center ornament with thin extending tails */
export function ScriptSwashDivider({ width = '100%', height = 80, color = '#6B5A3E', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 80" preserveAspectRatio="xMidYMid meet" fill="none">
      {/* Left tail */}
      <path d="M0,40 C100,40 200,30 350,42 C420,46 460,36 490,40" stroke={color} strokeWidth="1.5" opacity={opacity * 0.7} strokeLinecap="round" />
      {/* Right tail */}
      <path d="M710,40 C740,44 780,34 850,38 C1000,50 1100,40 1200,40" stroke={color} strokeWidth="1.5" opacity={opacity * 0.7} strokeLinecap="round" />
      {/* Center ornament */}
      <path d="M490,40 C500,20 520,15 540,25 C560,35 570,15 590,20 C610,25 615,45 600,40 M600,40 C590,55 570,65 550,50 C535,40 510,60 500,50 C495,46 490,40 490,40Z" stroke={color} strokeWidth="2" opacity={opacity} />
      <circle cx="600" cy="40" r="4" fill={color} opacity={opacity} />
    </svg>
  );
}

// ── MINIMAL DIVIDERS ──────────────────────────────────────────────────────────

/** Dot row — evenly spaced filled circles */
export function MinimalDotRowDivider({ width = '100%', height = 20, color = '#9B8EA5', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 20" preserveAspectRatio="xMidYMid meet" fill="none">
      {Array.from({ length: 40 }, (_, i) => (
        <circle key={i} cx={15 + i * 30} cy="10" r={i % 5 === 0 ? 4 : 2} fill={color} opacity={opacity * (i % 5 === 0 ? 1 : 0.5)} />
      ))}
    </svg>
  );
}

/** Dash-dot — alternating dashes and dots */
export function MinimalDashDotDivider({ width = '100%', height = 20, color = '#8A9A8A', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 20" preserveAspectRatio="none" fill="none">
      <line x1="0" y1="10" x2="1200" y2="10" stroke={color} strokeWidth="1.5" strokeDasharray="20 8 4 8" opacity={opacity} />
    </svg>
  );
}

/** Double line with center ornament — clean editorial separator */
export function MinimalDoubleCenterDivider({ width = '100%', height = 40, color = '#B09060', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 40" preserveAspectRatio="xMidYMid meet" fill="none">
      <line x1="0" y1="15" x2="500" y2="15" stroke={color} strokeWidth="1" opacity={opacity} />
      <line x1="0" y1="25" x2="500" y2="25" stroke={color} strokeWidth="1" opacity={opacity * 0.5} />
      {/* Center diamond ornament */}
      <polygon points="600,5 615,20 600,35 585,20" fill={color} opacity={opacity} />
      <polygon points="600,9 611,20 600,31 589,20" fill="none" stroke={color} strokeWidth="1" opacity={opacity * 0.4} />
      <line x1="700" y1="15" x2="1200" y2="15" stroke={color} strokeWidth="1" opacity={opacity} />
      <line x1="700" y1="25" x2="1200" y2="25" stroke={color} strokeWidth="1" opacity={opacity * 0.5} />
    </svg>
  );
}

// ── NATURE DIVIDERS ───────────────────────────────────────────────────────────

/** Mountain silhouette — layered peaks */
export function NatureMountainDivider({ width = '100%', height = 80, color = '#5C6B73', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 80" preserveAspectRatio="none" fill="none">
      {/* Back range */}
      <path d="M0,80 L0,55 L100,20 L200,50 L320,10 L440,45 L560,15 L680,50 L800,8 L920,45 L1040,18 L1160,50 L1200,40 L1200,80 Z" fill={color} opacity={opacity * 0.3} />
      {/* Front range */}
      <path d="M0,80 L0,65 L80,35 L160,60 L260,25 L360,55 L460,30 L560,58 L660,22 L760,55 L860,30 L960,58 L1060,25 L1160,55 L1200,35 L1200,80 Z" fill={color} opacity={opacity * 0.6} />
      {/* Ground */}
      <path d="M0,80 L0,72 L1200,72 L1200,80 Z" fill={color} opacity={opacity * 0.8} />
    </svg>
  );
}

/** Rolling hills — gentle undulating landscape */
export function NatureHillsDivider({ width = '100%', height = 70, color = '#7A9E6A', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 70" preserveAspectRatio="none" fill="none">
      <path d="M0,70 L0,45 Q150,10 300,42 Q450,70 600,38 Q750,8 900,40 Q1050,68 1200,38 L1200,70 Z" fill={color} opacity={opacity * 0.5} />
      <path d="M0,70 L0,55 Q200,25 400,52 Q600,70 800,45 Q1000,22 1200,50 L1200,70 Z" fill={color} opacity={opacity * 0.8} />
    </svg>
  );
}

/** Tree line — bare silhouette trees */
export function NatureTreeLineDivider({ width = '100%', height = 80, color = '#4A5C4A', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 80" preserveAspectRatio="xMidYMid meet" fill="none">
      <line x1="0" y1="78" x2="1200" y2="78" stroke={color} strokeWidth="2" opacity={opacity * 0.6} />
      {[50, 130, 210, 320, 400, 490, 580, 660, 760, 850, 940, 1030, 1120].map((x, i) => {
        const h = 20 + (i % 3) * 15;
        const isConifer = i % 3 !== 1;
        return (
          <g key={x}>
            {isConifer ? (
              <>
                <polygon points={`${x},${78 - h} ${x - 12},${78 - h / 2} ${x + 12},${78 - h / 2}`} fill={color} opacity={opacity * 0.9} />
                <polygon points={`${x},${78 - h * 0.65} ${x - 15},${78 - h * 0.2} ${x + 15},${78 - h * 0.2}`} fill={color} opacity={opacity * 0.75} />
                <rect x={x - 3} y={78 - h * 0.2} width="6" height={h * 0.2} fill={color} opacity={opacity * 0.9} />
              </>
            ) : (
              <>
                <ellipse cx={x} cy={78 - h * 0.65} rx="18" ry={h * 0.5} fill={color} opacity={opacity * 0.75} />
                <rect x={x - 3} y={78 - h * 0.2} width="5" height={h * 0.3} fill={color} opacity={opacity * 0.9} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Cloud row — fluffy cloud silhouettes */
export function NatureCloudRowDivider({ width = '100%', height = 60, color = '#D0D8E4', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 60" preserveAspectRatio="xMidYMid meet" fill="none">
      {[80, 260, 460, 650, 840, 1060].map((cx, i) => {
        const scale = 0.8 + (i % 3) * 0.2;
        const cy = 35 - (i % 2) * 8;
        return (
          <g key={cx}>
            <ellipse cx={cx} cy={cy} rx={40 * scale} ry={18 * scale} fill={color} opacity={opacity} />
            <ellipse cx={cx - 20 * scale} cy={cy + 4} rx={22 * scale} ry={15 * scale} fill={color} opacity={opacity} />
            <ellipse cx={cx + 22 * scale} cy={cy + 5} rx={20 * scale} ry={13 * scale} fill={color} opacity={opacity} />
          </g>
        );
      })}
    </svg>
  );
}

// ── ORNATE DIVIDERS ───────────────────────────────────────────────────────────

/** Baroque scroll — center medallion with curling acanthus arms */
export function OrnateBaroqueScrollDivider({ width = '100%', height = 80, color = '#B89A5A', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 80" preserveAspectRatio="xMidYMid meet" fill="none">
      {/* Center medallion */}
      <circle cx="600" cy="40" r="22" stroke={color} strokeWidth="2" opacity={opacity} />
      <circle cx="600" cy="40" r="15" stroke={color} strokeWidth="1" opacity={opacity * 0.5} />
      <path d="M600,18 L603,28 L613,28 L605,34 L608,44 L600,38 L592,44 L595,34 L587,28 L597,28 Z" fill={color} opacity={opacity * 0.8} />
      {/* Left scrollwork */}
      <path d="M578,40 C540,40 520,20 500,30 C480,40 475,55 490,55 C505,55 510,45 500,43 M490,55 C475,58 460,48 455,38 C448,25 460,15 475,20 C485,25 482,35 472,33" stroke={color} strokeWidth="2" opacity={opacity} strokeLinecap="round" />
      <path d="M455,38 C420,40 380,30 340,38 C310,44 290,30 260,35 C230,40 220,55 240,52 M260,35 C240,25 210,28 200,40 C190,52 200,62 215,58" stroke={color} strokeWidth="1.5" opacity={opacity * 0.8} strokeLinecap="round" />
      <path d="M200,40 C160,40 120,32 80,40 C50,46 20,38 0,40" stroke={color} strokeWidth="1" opacity={opacity * 0.6} />
      {/* Right scrollwork (mirror) */}
      <path d="M622,40 C660,40 680,20 700,30 C720,40 725,55 710,55 C695,55 690,45 700,43 M710,55 C725,58 740,48 745,38 C752,25 740,15 725,20 C715,25 718,35 728,33" stroke={color} strokeWidth="2" opacity={opacity} strokeLinecap="round" />
      <path d="M745,38 C780,40 820,30 860,38 C890,44 910,30 940,35 C970,40 980,55 960,52 M940,35 C960,25 990,28 1000,40 C1010,52 1000,62 985,58" stroke={color} strokeWidth="1.5" opacity={opacity * 0.8} strokeLinecap="round" />
      <path d="M1000,40 C1040,40 1080,32 1120,40 C1150,46 1180,38 1200,40" stroke={color} strokeWidth="1" opacity={opacity * 0.6} />
    </svg>
  );
}

/** Lace-edge trim — intricate lace-like pattern */
export function OrnateLaceTrimDivider({ width = '100%', height = 60, color = '#D4C8BB', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 60" preserveAspectRatio="none" fill="none">
      {/* Top solid band */}
      <rect x="0" y="0" width="1200" height="8" fill={color} opacity={opacity} />
      {/* Lace arches */}
      {Array.from({ length: 24 }, (_, i) => {
        const x = i * 50;
        return (
          <g key={i}>
            <path d={`M${x},8 Q${x + 25},45 ${x + 50},8`} stroke={color} strokeWidth="1.5" fill="none" opacity={opacity} />
            <circle cx={x + 25} cy="48" r="4" fill={color} opacity={opacity * 0.8} />
            <circle cx={x + 12} cy="30" r="2.5" fill={color} opacity={opacity * 0.5} />
            <circle cx={x + 38} cy="30" r="2.5" fill={color} opacity={opacity * 0.5} />
          </g>
        );
      })}
    </svg>
  );
}

/** Pearl strand — string of pearls with clasps */
export function OrnatePearlStrandDivider({ width = '100%', height = 30, color = '#E8E0D5', opacity = 1 }: DividerProps) {
  return (
    <svg width={width} height={height} viewBox="0 0 1200 30" preserveAspectRatio="xMidYMid meet" fill="none">
      {/* String */}
      <path d="M20,15 Q600,10 1180,15" stroke={color} strokeWidth="0.75" opacity={opacity * 0.4} />
      {Array.from({ length: 58 }, (_, i) => {
        const cx = 20 + i * 20;
        const isLarge = i % 7 === 0;
        const r = isLarge ? 7 : 5;
        return (
          <g key={i}>
            <circle cx={cx} cy="15" r={r} fill={color} opacity={opacity} />
            {/* Pearl shimmer */}
            <ellipse cx={cx - r * 0.3} cy={15 - r * 0.3} rx={r * 0.3} ry={r * 0.2} fill="white" opacity={opacity * 0.5} />
          </g>
        );
      })}
      {/* Clasp */}
      <rect x="592" y="10" width="16" height="10" rx="3" fill={color} opacity={opacity} stroke={color} strokeWidth="0.5" />
    </svg>
  );
}

// ── EXPORT REGISTRY ────────────────────────────────────────────────────────────

export const ALL_DIVIDERS = [
  { id: 'wave-gentle',          name: 'Wave — Gentle',         component: WaveGentleDivider },
  { id: 'wave-deep',            name: 'Wave — Deep',           component: WaveDeepDivider },
  { id: 'wave-double',          name: 'Wave — Double',         component: WaveDoubleDivider },
  { id: 'wave-asymmetric',      name: 'Wave — Asymmetric',     component: WaveAsymmetricDivider },
  { id: 'floral-rose-vine',     name: 'Floral — Rose Vine',    component: FloralRoseVineDivider },
  { id: 'floral-daisy-chain',   name: 'Floral — Daisy Chain',  component: FloralDaisyChainDivider },
  { id: 'floral-leaf-swag',     name: 'Floral — Leaf Swag',    component: FloralLeafSwagDivider },
  { id: 'floral-garland',       name: 'Floral — Garland',      component: FloralGarlandDivider },
  { id: 'geo-zigzag',           name: 'Geo — Zigzag',          component: GeometricZigzagDivider },
  { id: 'geo-scallop',          name: 'Geo — Scallop',         component: GeometricScallopDivider },
  { id: 'geo-arch-row',         name: 'Geo — Arch Row',        component: GeometricArchRowDivider },
  { id: 'geo-diamond-chain',    name: 'Geo — Diamond Chain',   component: GeometricDiamondChainDivider },
  { id: 'geo-chevron',          name: 'Geo — Chevron',         component: GeometricChevronDivider },
  { id: 'script-flourish',      name: 'Script — Flourish',     component: ScriptFlourishDivider },
  { id: 'script-swash',         name: 'Script — Swash',        component: ScriptSwashDivider },
  { id: 'minimal-dot-row',      name: 'Minimal — Dot Row',     component: MinimalDotRowDivider },
  { id: 'minimal-dash-dot',     name: 'Minimal — Dash-Dot',    component: MinimalDashDotDivider },
  { id: 'minimal-double-center',name: 'Minimal — Double+Ornament', component: MinimalDoubleCenterDivider },
  { id: 'nature-mountain',      name: 'Nature — Mountain',     component: NatureMountainDivider },
  { id: 'nature-hills',         name: 'Nature — Hills',        component: NatureHillsDivider },
  { id: 'nature-tree-line',     name: 'Nature — Tree Line',    component: NatureTreeLineDivider },
  { id: 'nature-cloud-row',     name: 'Nature — Cloud Row',    component: NatureCloudRowDivider },
  { id: 'ornate-baroque-scroll',name: 'Ornate — Baroque Scroll', component: OrnateBaroqueScrollDivider },
  { id: 'ornate-lace-trim',     name: 'Ornate — Lace Trim',    component: OrnateLaceTrimDivider },
  { id: 'ornate-pearl-strand',  name: 'Ornate — Pearl Strand', component: OrnatePearlStrandDivider },
] as const;

export type DividerId = typeof ALL_DIVIDERS[number]['id'];
