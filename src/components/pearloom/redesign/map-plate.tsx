'use client';

/* ─── The map plate — real streets in the site's tints ───────────
   The map section's default face (2026-07-09, owner: "the google
   maps visual isn't very pretty and not in theme", then "make it
   an actual map"). Instead of a Google iframe, the venue gets a
   PLATE — and the plate is ACCURATE: <RealMapPlate> fetches the
   venue's actual roads / water / parks from OpenStreetMap
   (/api/map/geometry) and presses them in the site's own --t-*
   tints, north-up, with an honest scale bar. Data © OpenStreetMap
   contributors — the section caption credits them.

   <MapPlateArt> is the DRAWN fallback — an abstract street grid
   seeded from the address — shown while the real geometry threads
   in and kept whenever it can't (offline, Overpass down, a venue
   in the open countryside). Both wear the same chrome (frame,
   pearl, compass) so the upgrade reads as the map coming into
   focus, not a swap. The caption downgrades honestly ("not to
   scale") whenever the drawn plate is what's showing.

   DETERMINISTIC: the drawn art is a pure function of the address
   (FNV hash → mulberry32), so the same venue always presses the
   same plate — across renders, sessions, and the press sheet. No
   Math.random / Date.now (React Compiler render rules). */

import { useEffect, useMemo, useState } from 'react';
import { PLATE_H, PLATE_W, type PlateGeometryData } from '@/lib/map-geometry';

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Drawing space — shared with the geometry shaper so real streets
   land exactly on this canvas. */
const W = PLATE_W;
const H = PLATE_H;
const CX = W / 2;
/* The real geometry projects the venue to the exact center, so the
   pearl sits there on both plates. */
const CY = H / 2;

interface PlateGeometry {
  hStreets: Array<{ y1: number; y2: number; w: number; o: number }>;
  vStreets: Array<{ x1: number; x2: number; w: number; o: number }>;
  avenues: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  river: string;
  park: { cx: number; cy: number; rx: number; ry: number; trees: Array<{ x: number; y: number }> };
  blocks: Array<{ x: number; y: number; w: number; h: number }>;
  route: string;
  routeFrom: { x: number; y: number };
}

function buildPlate(seedKey: string): PlateGeometry {
  const rnd = mulberry32(hashSeed(seedKey || 'the venue'));
  const jitter = (amt: number) => (rnd() - 0.5) * 2 * amt;

  /* Streets — a hand-ruled grid: edge-to-edge hairlines whose ends
     drift a few px so nothing reads machine-drawn. */
  const hStreets: PlateGeometry['hStreets'] = [];
  for (let y = 64; y < H - 40; y += 46 + rnd() * 18) {
    hStreets.push({ y1: y + jitter(5), y2: y + jitter(5), w: rnd() > 0.78 ? 1.9 : 1.1, o: 0.55 + rnd() * 0.4 });
  }
  const vStreets: PlateGeometry['vStreets'] = [];
  for (let x = 70; x < W - 50; x += 58 + rnd() * 24) {
    vStreets.push({ x1: x + jitter(5), x2: x + jitter(5), w: rnd() > 0.78 ? 1.9 : 1.1, o: 0.55 + rnd() * 0.4 });
  }

  /* Two avenues cutting the grid on a diagonal — every real town
     has one; it breaks the graph-paper feel. */
  const avenues: PlateGeometry['avenues'] = [
    { x1: -20, y1: 90 + rnd() * 120, x2: W + 20, y2: 240 + rnd() * 160 },
    { x1: 120 + rnd() * 200, y1: -20, x2: 420 + rnd() * 300, y2: H + 20 },
  ];

  /* The river — a lazy bezier band through a seeded corner. */
  const riverTop = rnd() > 0.5;
  const ry0 = riverTop ? 40 + rnd() * 70 : H - 110 + rnd() * 60;
  const ry1 = riverTop ? 90 + rnd() * 80 : H - 60 - rnd() * 80;
  const river = `M -20 ${ry0} C ${W * 0.25} ${ry0 + jitter(70)}, ${W * 0.55} ${ry1 + jitter(70)}, ${W + 20} ${ry1}`;

  /* The park — a soft green in a quadrant away from the pin. */
  const parkLeft = rnd() > 0.5;
  const park = {
    cx: parkLeft ? 130 + rnd() * 90 : W - 220 + rnd() * 90,
    cy: riverTop ? H - 140 + rnd() * 50 : 110 + rnd() * 60,
    rx: 62 + rnd() * 26,
    ry: 40 + rnd() * 18,
    trees: [] as Array<{ x: number; y: number }>,
  };
  for (let i = 0; i < 4; i++) {
    park.trees.push({ x: park.cx + jitter(park.rx * 0.6), y: park.cy + jitter(park.ry * 0.55) });
  }

  /* Town blocks near the pin — quiet ink rectangles. */
  const blocks: PlateGeometry['blocks'] = [];
  for (let i = 0; i < 12; i++) {
    const bx = CX + jitter(280);
    const by = CY + jitter(150);
    if (Math.abs(bx - CX) < 42 && Math.abs(by - CY) < 42) continue; // keep the clearing clear
    blocks.push({ x: bx, y: by, w: 16 + rnd() * 26, h: 10 + rnd() * 16 });
  }

  /* The route — the two-strand thread walking in from an edge to
     the pearl (the brand's atom, woven into the map). */
  const fromLeft = rnd() > 0.5;
  const routeFrom = { x: fromLeft ? -6 : W + 6, y: H - 60 - rnd() * 120 };
  const route = `M ${routeFrom.x} ${routeFrom.y} Q ${CX + (fromLeft ? -160 : 160)} ${CY + 130 + jitter(40)}, ${CX} ${CY + 10}`;

  return { hStreets, vStreets, avenues, river, park, blocks, route, routeFrom };
}

/** The plate, drawn. Colors ride the site's --t-* bag with chrome
 *  fallbacks so the same component previews correctly in thumbs. */
export function MapPlateArt({ seedKey, style }: { seedKey: string; style?: React.CSSProperties }) {
  const g = useMemo(() => buildPlate(seedKey), [seedKey]);
  const line = 'var(--t-line, rgba(61,74,31,0.18))';
  const soft = 'var(--t-line-soft, rgba(61,74,31,0.09))';
  const accent = 'var(--t-accent, #5C6B3F)';
  const accentBg = 'var(--t-accent-bg, rgba(92,107,63,0.12))';
  const gold = 'var(--t-gold, var(--t-accent, #C19A4B))';
  const ink = 'var(--t-ink-soft, #55503F)';
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A drawn map plate marking the venue"
      style={{ display: 'block', width: '100%', height: '100%', background: 'var(--t-card, transparent)', ...style }}
    >
      {/* the river under everything */}
      <path d={g.river} fill="none" stroke={accent} strokeWidth={20} opacity={0.18} strokeLinecap="round" />
      <path d={g.river} fill="none" stroke={accent} strokeWidth={1} opacity={0.38} strokeDasharray="1 7" strokeLinecap="round" />

      {/* the park */}
      <ellipse cx={g.park.cx} cy={g.park.cy} rx={g.park.rx} ry={g.park.ry} fill={accentBg} opacity={0.7} />
      {g.park.trees.map((t, i) => (
        <circle key={i} cx={t.x} cy={t.y} r={2.4} fill={accent} opacity={0.5} />
      ))}

      {/* the street grid — soft ink, not the hairline token, so the
          drawing survives the paper grain on every theme. */}
      {g.hStreets.map((s, i) => (
        <line key={`h${i}`} x1={-10} y1={s.y1} x2={W + 10} y2={s.y2} stroke={ink} strokeWidth={s.w} opacity={s.o * 0.34} />
      ))}
      {g.vStreets.map((s, i) => (
        <line key={`v${i}`} x1={s.x1} y1={-10} x2={s.x2} y2={H + 10} stroke={ink} strokeWidth={s.w} opacity={s.o * 0.34} />
      ))}
      {g.avenues.map((a, i) => (
        <line key={`a${i}`} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={ink} strokeWidth={2.4} opacity={0.34} />
      ))}

      {/* town blocks */}
      {g.blocks.map((b, i) => (
        <rect key={`b${i}`} x={b.x} y={b.y} width={b.w} height={b.h} rx={1.5} fill={ink} opacity={0.16} />
      ))}

      {/* the clearing, then the route thread — two strands, olive
          over gold — walking in to the pearl */}
      <circle cx={CX} cy={CY} r={44} fill="var(--t-card, #FBF7EE)" opacity={0.72} />
      <path d={g.route} fill="none" stroke={accent} strokeWidth={1.5} strokeDasharray="1 6" strokeLinecap="round" opacity={0.75} />
      <path d={g.route} fill="none" stroke={gold} strokeWidth={1} strokeDasharray="1 9" strokeLinecap="round" opacity={0.7} transform="translate(0 4)" />
      <circle cx={g.routeFrom.x < 0 ? 4 : W - 4} cy={g.routeFrom.y} r={3} fill={accent} opacity={0.5} />

      <PlateChrome ink={ink} gold={gold} line={line} soft={soft} clearing={false} />
    </svg>
  );
}

/* ─── PlateChrome — the letterpress dressing both plates share ───
   The pearl pin, compass, scale bar, and double frame. The REAL
   plate labels its scale (an honest 200 m) and opens a paper
   clearing under the pearl so it reads over dense streets; the
   drawn plate keeps a decorative unlabeled bar. */
function PlateChrome({
  ink, gold, line, soft, scaleLabel, clearing = true,
}: {
  ink: string; gold: string; line: string; soft: string;
  scaleLabel?: string;
  clearing?: boolean;
}) {
  return (
    <>
      {clearing && <circle cx={CX} cy={CY} r={40} fill="var(--t-card, #FBF7EE)" opacity={0.66} />}

      {/* the pin — dotted ring, hairline ring, the gold pearl */}
      <circle cx={CX} cy={CY} r={26} fill="none" stroke={ink} strokeWidth={1} opacity={0.35} />
      <circle cx={CX} cy={CY} r={16} fill="none" stroke={gold} strokeWidth={1.4} strokeDasharray="2 4" strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={6.5} fill={gold} />

      {/* compass rose — top right (both plates draw north-up) */}
      <g transform={`translate(${W - 64} 58)`} opacity={0.75}>
        <circle r={19} fill="none" stroke={line} strokeWidth={1} />
        <path d="M 0 -13 L 3.5 4 L 0 1.5 L -3.5 4 Z" fill={ink} opacity={0.55} />
        <text y={-24} textAnchor="middle" fontSize={10} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill={ink} opacity={0.7} letterSpacing="0.1em">N</text>
      </g>

      {/* scale bar — bottom left; labeled when the map is real */}
      <g transform={`translate(44 ${H - 34})`} opacity={0.65}>
        <line x1={0} y1={0} x2={scaleLabel ? 100 : 88} y2={0} stroke={ink} strokeWidth={1} />
        {(scaleLabel ? [0, 50, 100] : [0, 44, 88]).map((x) => (
          <line key={x} x1={x} y1={-3.5} x2={x} y2={3.5} stroke={ink} strokeWidth={1} />
        ))}
        {scaleLabel && (
          <text x={50} y={-8} textAnchor="middle" fontSize={9.5} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill={ink} opacity={0.85} letterSpacing="0.08em">{scaleLabel}</text>
        )}
      </g>

      {/* the double frame — a letterpress plate, not a screenshot */}
      <rect x={9} y={9} width={W - 18} height={H - 18} fill="none" stroke={line} strokeWidth={1.2} />
      <rect x={17} y={17} width={W - 34} height={H - 34} fill="none" stroke={soft} strokeWidth={1} />
    </>
  );
}

/* ─── RealPlateSvg — actual geography, Pearloom linework ─────────
   Draws the shaped OSM geometry (roads by class, waterways, water
   bodies, parks) in the site's tints. North-up, venue centered,
   1 unit = 2 m (the shaper's 1600 m footprint over 800 units) —
   which makes the labeled 100-unit scale bar an honest 200 m. */
export function RealPlateSvg({ geo, style }: { geo: PlateGeometryData; style?: React.CSSProperties }) {
  const line = 'var(--t-line, rgba(61,74,31,0.18))';
  const soft = 'var(--t-line-soft, rgba(61,74,31,0.09))';
  const accent = 'var(--t-accent, #5C6B3F)';
  const accentBg = 'var(--t-accent-bg, rgba(92,107,63,0.12))';
  const gold = 'var(--t-gold, var(--t-accent, #C19A4B))';
  const ink = 'var(--t-ink-soft, #55503F)';
  const toPoints = (pts: number[][]) => pts.map(([x, y]) => `${x},${y}`).join(' ');
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="A map of the streets around the venue, drawn in the site's colors"
      style={{ display: 'block', width: '100%', height: '100%', background: 'var(--t-card, transparent)', ...style }}
    >
      {/* water bodies under everything */}
      {geo.waterAreas.map((pts, i) => (
        <polygon key={`wa${i}`} points={toPoints(pts)} fill={accent} opacity={0.16} />
      ))}
      {geo.water.map((pts, i) => (
        <polyline key={`w${i}`} points={toPoints(pts)} fill="none" stroke={accent} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={0.25} />
      ))}

      {/* parks */}
      {geo.parks.map((pts, i) => (
        <polygon key={`p${i}`} points={toPoints(pts)} fill={accentBg} opacity={0.7} />
      ))}

      {/* the streets — real ones, in soft ink by class */}
      {geo.roads.map((r, i) => (
        <polyline
          key={`r${i}`}
          points={toPoints(r.pts)}
          fill="none"
          stroke={ink}
          strokeWidth={r.cls === 'major' ? 3 : r.cls === 'mid' ? 1.9 : 1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={r.cls === 'major' ? 0.5 : r.cls === 'mid' ? 0.42 : 0.3}
        />
      ))}

      <PlateChrome ink={ink} gold={gold} line={line} soft={soft} scaleLabel="200 m" />
    </svg>
  );
}

/* ─── RealMapPlate — the plate that upgrades itself ──────────────
   Renders the drawn plate immediately, asks /api/map/geometry for
   the venue's real streets, and swaps them in when they land. The
   two share PlateChrome, so the upgrade reads as the map coming
   into focus. `onModeChange` tells the section caption which story
   to tell (pass a stable setter — it's an effect dependency). */
export function RealMapPlate({
  seedKey, lat, lng, address, onModeChange, style,
}: {
  seedKey: string;
  lat?: number;
  lng?: number;
  /** Geocode fallback when the manifest never cached coords. */
  address?: string;
  onModeChange?: (mode: 'drawn' | 'real') => void;
  style?: React.CSSProperties;
}) {
  const [geo, setGeo] = useState<PlateGeometryData | null>(null);
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (typeof lat === 'number' && typeof lng === 'number') {
      params.set('lat', String(lat));
      params.set('lng', String(lng));
    } else if (address && address.trim().length > 3) {
      params.set('q', address.trim());
    } else {
      return;
    }
    fetch(`/api/map/geometry?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; geometry?: PlateGeometryData } | null) => {
        if (cancelled || !d?.ok || !d.geometry) return;
        setGeo(d.geometry);
        onModeChange?.('real');
      })
      .catch(() => { /* the drawn plate carries it */ });
    return () => { cancelled = true; };
  }, [lat, lng, address, onModeChange]);

  return geo
    ? <RealPlateSvg geo={geo} style={style} />
    : <MapPlateArt seedKey={seedKey} style={style} />;
}

export default MapPlateArt;
