/* ─── map-geometry — real streets for the map plate ──────────────
   Shapes raw OpenStreetMap (Overpass) output into the map plate's
   800×460 viewBox: an equirectangular projection around the venue,
   road-class buckets, polyline simplification, and a point budget
   so a dense downtown can't ship a megabyte of streets.

   Pure functions only — the network lives in /api/map/geometry;
   this module is unit-tested on fixtures. Coordinates come back
   rounded to one decimal (sub-pixel at plate scale, ~60% smaller
   payloads). */

/** The plate's drawing space (must match map-plate.tsx). */
export const PLATE_W = 800;
export const PLATE_H = 460;

/** Ground footprint of the plate around the venue, in meters. The
 *  ratio mirrors the viewBox so a meter is a meter on both axes. */
export const FOOT_W_M = 1600;
export const FOOT_H_M = FOOT_W_M * (PLATE_H / PLATE_W); // 920

const M_PER_DEG_LAT = 111320;

export interface PlateRoad {
  /** major = motorway/trunk/primary · mid = secondary/tertiary ·
   *  minor = residential and friends. Stroke width picks off this. */
  cls: 'major' | 'mid' | 'minor';
  pts: number[][];
}

export interface PlateGeometryData {
  roads: PlateRoad[];
  /** Waterway centerlines (rivers, canals, streams). */
  water: number[][][];
  /** Closed water areas (lakes, wide rivers mapped as polygons). */
  waterAreas: number[][][];
  /** Parks and gardens (closed polygons). */
  parks: number[][][];
}

/** Overpass bbox around a center: [south, west, north, east]. A
 *  touch of overscan keeps edge streets from stopping at the frame. */
export function bboxAround(lat: number, lng: number, overscan = 1.15): [number, number, number, number] {
  const halfH = (FOOT_H_M / 2) * overscan;
  const halfW = (FOOT_W_M / 2) * overscan;
  const dLat = halfH / M_PER_DEG_LAT;
  const dLng = halfW / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng];
}

const MAJOR = new Set(['motorway', 'trunk', 'primary', 'motorway_link', 'trunk_link', 'primary_link']);
const MID = new Set(['secondary', 'tertiary', 'secondary_link', 'tertiary_link']);
const MINOR = new Set(['residential', 'unclassified', 'living_street', 'pedestrian']);

export function roadClassFor(highway: string | undefined): PlateRoad['cls'] | null {
  if (!highway) return null;
  if (MAJOR.has(highway)) return 'major';
  if (MID.has(highway)) return 'mid';
  if (MINOR.has(highway)) return 'minor';
  return null;
}

interface OverpassElement {
  type?: string;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
}

/** Keep a vertex when it moved ≥ minDist plate-units from the last
 *  kept one; endpoints always survive so ways stay connected. */
function simplify(pts: number[][], minDist = 2.5): number[][] {
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const last = out[out.length - 1];
    const dx = pts[i][0] - last[0];
    const dy = pts[i][1] - last[1];
    if (dx * dx + dy * dy >= minDist * minDist) out.push(pts[i]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Total projected points across all shapes — the payload governor. */
const POINT_BUDGET = 5000;
/** Anything fully outside this margin around the viewBox is dropped. */
const CLIP_MARGIN = 60;

/** Project + simplify raw Overpass JSON into plate geometry. */
export function shapeOverpass(
  raw: unknown,
  centerLat: number,
  centerLng: number,
): PlateGeometryData {
  const geo: PlateGeometryData = { roads: [], water: [], waterAreas: [], parks: [] };
  const elements = (raw as { elements?: OverpassElement[] } | null)?.elements;
  if (!Array.isArray(elements)) return geo;

  const mPerDegLng = M_PER_DEG_LAT * Math.cos((centerLat * Math.PI) / 180);
  const project = (lat: number, lon: number): number[] => [
    round1(((lon - centerLng) * mPerDegLng / FOOT_W_M + 0.5) * PLATE_W),
    round1((0.5 - (lat - centerLat) * M_PER_DEG_LAT / FOOT_H_M) * PLATE_H),
  ];
  const inView = (pts: number[][]) => pts.some(
    ([x, y]) => x > -CLIP_MARGIN && x < PLATE_W + CLIP_MARGIN && y > -CLIP_MARGIN && y < PLATE_H + CLIP_MARGIN,
  );

  /* Roads first, majors before minors, so the budget trims noise
     from the bottom of the visual hierarchy. */
  const buckets: Record<PlateRoad['cls'], number[][][]> = { major: [], mid: [], minor: [] };
  for (const el of elements) {
    if (!el.geometry || el.geometry.length < 2) continue;
    const tags = el.tags ?? {};
    const pts = simplify(el.geometry.map((g) => project(g.lat, g.lon)));
    if (pts.length < 2 || !inView(pts)) continue;

    const cls = roadClassFor(tags.highway);
    if (cls) { buckets[cls].push(pts); continue; }
    if (tags.waterway === 'river' || tags.waterway === 'canal' || tags.waterway === 'stream') {
      geo.water.push(pts);
      continue;
    }
    if (tags.natural === 'water' || tags.water) {
      geo.waterAreas.push(pts);
      continue;
    }
    if (tags.leisure === 'park' || tags.leisure === 'garden' || tags.landuse === 'village_green') {
      geo.parks.push(pts);
    }
  }

  let budget = POINT_BUDGET
    - geo.water.reduce((n, w) => n + w.length, 0)
    - geo.waterAreas.reduce((n, w) => n + w.length, 0)
    - geo.parks.reduce((n, w) => n + w.length, 0);
  for (const cls of ['major', 'mid', 'minor'] as const) {
    for (const pts of buckets[cls]) {
      if (budget - pts.length < 0) break;
      budget -= pts.length;
      geo.roads.push({ cls, pts });
    }
  }
  return geo;
}

/** The Overpass QL body for a venue — roads, water, parks. */
export function overpassQuery(lat: number, lng: number): string {
  const [s, w, n, e] = bboxAround(lat, lng);
  const bbox = `${s.toFixed(6)},${w.toFixed(6)},${n.toFixed(6)},${e.toFixed(6)}`;
  return [
    '[out:json][timeout:12];(',
    `way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|living_street|pedestrian|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](${bbox});`,
    `way["waterway"~"^(river|canal|stream)$"](${bbox});`,
    `way["natural"="water"](${bbox});`,
    `way["leisure"~"^(park|garden)$"](${bbox});`,
    ');out geom;',
  ].join('');
}
