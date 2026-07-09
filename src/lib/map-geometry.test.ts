import { describe, expect, it } from 'vitest';
import {
  bboxAround, overpassQuery, roadClassFor, shapeOverpass,
  FOOT_H_M, FOOT_W_M, PLATE_H, PLATE_W,
} from './map-geometry';

const LAT = 26.122; // Fort Lauderdale-ish
const LNG = -80.137;

function el(tags: Record<string, string>, coords: Array<[number, number]>) {
  return { type: 'way', tags, geometry: coords.map(([lat, lon]) => ({ lat, lon })) };
}

describe('bboxAround', () => {
  it('spans the plate footprint (plus overscan) around the center', () => {
    const [s, w, n, e] = bboxAround(LAT, LNG);
    expect(s).toBeLessThan(LAT);
    expect(n).toBeGreaterThan(LAT);
    expect(w).toBeLessThan(LNG);
    expect(e).toBeGreaterThan(LNG);
    // Height in meters ≈ footprint * overscan.
    const heightM = (n - s) * 111320;
    expect(heightM).toBeGreaterThan(FOOT_H_M);
    expect(heightM).toBeLessThan(FOOT_H_M * 1.4);
    const widthM = (e - w) * 111320 * Math.cos((LAT * Math.PI) / 180);
    expect(widthM).toBeGreaterThan(FOOT_W_M);
    expect(widthM).toBeLessThan(FOOT_W_M * 1.4);
  });
});

describe('roadClassFor', () => {
  it('buckets highways by visual weight and rejects noise', () => {
    expect(roadClassFor('primary')).toBe('major');
    expect(roadClassFor('trunk_link')).toBe('major');
    expect(roadClassFor('tertiary')).toBe('mid');
    expect(roadClassFor('residential')).toBe('minor');
    expect(roadClassFor('footway')).toBeNull();
    expect(roadClassFor('service')).toBeNull();
    expect(roadClassFor(undefined)).toBeNull();
  });
});

describe('shapeOverpass', () => {
  it('projects the center onto the middle of the plate', () => {
    const geo = shapeOverpass(
      { elements: [el({ highway: 'primary' }, [[LAT, LNG], [LAT, LNG + 0.002]])] },
      LAT, LNG,
    );
    expect(geo.roads).toHaveLength(1);
    const [x, y] = geo.roads[0].pts[0];
    expect(x).toBeCloseTo(PLATE_W / 2, 0);
    expect(y).toBeCloseTo(PLATE_H / 2, 0);
  });

  it('projects north as up and east as right', () => {
    const north = shapeOverpass(
      { elements: [el({ highway: 'primary' }, [[LAT, LNG], [LAT + 0.002, LNG]])] },
      LAT, LNG,
    ).roads[0].pts;
    expect(north[1][1]).toBeLessThan(north[0][1]); // smaller y = up
    const east = shapeOverpass(
      { elements: [el({ highway: 'primary' }, [[LAT, LNG], [LAT, LNG + 0.002]])] },
      LAT, LNG,
    ).roads[0].pts;
    expect(east[1][0]).toBeGreaterThan(east[0][0]);
  });

  it('sorts water, water areas, and parks into their own buckets', () => {
    const geo = shapeOverpass({
      elements: [
        el({ waterway: 'river' }, [[LAT, LNG - 0.003], [LAT, LNG + 0.003]]),
        el({ natural: 'water' }, [[LAT + 0.001, LNG], [LAT + 0.001, LNG + 0.001], [LAT + 0.0015, LNG]]),
        el({ leisure: 'park' }, [[LAT - 0.001, LNG], [LAT - 0.001, LNG + 0.001], [LAT - 0.0015, LNG]]),
      ],
    }, LAT, LNG);
    expect(geo.water).toHaveLength(1);
    expect(geo.waterAreas).toHaveLength(1);
    expect(geo.parks).toHaveLength(1);
    expect(geo.roads).toHaveLength(0);
  });

  it('drops ways entirely outside the plate (plus margin)', () => {
    const farLat = LAT + 0.1; // ~11 km north — nowhere near the plate
    const geo = shapeOverpass(
      { elements: [el({ highway: 'primary' }, [[farLat, LNG], [farLat + 0.001, LNG]])] },
      LAT, LNG,
    );
    expect(geo.roads).toHaveLength(0);
  });

  it('simplifies dense vertices but always keeps endpoints', () => {
    // 50 vertices along ~90m — most are sub-threshold at plate scale.
    const coords: Array<[number, number]> = [];
    for (let i = 0; i < 50; i++) coords.push([LAT, LNG + i * 0.000018]);
    const geo = shapeOverpass({ elements: [el({ highway: 'residential' }, coords)] }, LAT, LNG);
    const pts = geo.roads[0].pts;
    expect(pts.length).toBeLessThan(20);
    expect(pts[0]).toEqual(geo.roads[0].pts[0]);
    // Last projected vertex survives verbatim.
    const lastX = pts[pts.length - 1][0];
    expect(lastX).toBeGreaterThan(pts[0][0]);
  });

  it('survives malformed input', () => {
    expect(shapeOverpass(null, LAT, LNG).roads).toEqual([]);
    expect(shapeOverpass({}, LAT, LNG).roads).toEqual([]);
    expect(shapeOverpass({ elements: [{ type: 'way' }] }, LAT, LNG).roads).toEqual([]);
  });

  it('enforces the point budget, majors first', () => {
    const elements = [] as ReturnType<typeof el>[];
    // 400 minor ways × 30 pts ≫ budget; one major way must survive.
    for (let i = 0; i < 400; i++) {
      const coords: Array<[number, number]> = [];
      for (let j = 0; j < 30; j++) coords.push([LAT + (i % 20) * 0.0003, LNG - 0.006 + j * 0.0004]);
      elements.push(el({ highway: 'residential' }, coords));
    }
    elements.push(el({ highway: 'primary' }, [[LAT, LNG - 0.006], [LAT, LNG + 0.006]]));
    const geo = shapeOverpass({ elements }, LAT, LNG);
    const total = geo.roads.reduce((n, r) => n + r.pts.length, 0);
    expect(total).toBeLessThanOrEqual(5000);
    expect(geo.roads.some((r) => r.cls === 'major')).toBe(true);
  });
});

describe('overpassQuery', () => {
  it('is a single-line QL body with the bbox inlined', () => {
    const q = overpassQuery(LAT, LNG);
    expect(q).toContain('[out:json]');
    expect(q).toContain('out geom;');
    expect(q).toContain('highway');
    expect(q).toContain('waterway');
    expect(q).not.toContain('\n');
  });
});
