'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/RelationshipGraph.tsx
// Interactive force-directed graph: how all guests connect to the couple.
// Pure React + requestAnimationFrame — no external D3 dependency.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VibeSkin } from '@/lib/vibe-engine';
import type { GraphNode, GraphEdge } from '@/app/api/relationship-graph/route';

export interface RelationshipGraphProps {
  siteId: string;
  coupleNames: [string, string];
  vibeSkin: VibeSkin;
}

// ── Force simulation ─────────────────────────────────────────

interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function runForceSimulation(
  simNodes: SimNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations = 120,
): SimNode[] {
  const nodes = simNodes.map(n => ({ ...n }));
  const nodeMap = new Map<string, SimNode>(nodes.map(n => [n.id, n]));

  const REPULSION = 3200;
  const LINK_STRENGTH = 0.18;
  const GRAVITY = 0.025;
  const DAMPING = 0.82;

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion (charge force) between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (a.fx !== undefined && a.fy !== undefined && b.fx !== undefined && b.fy !== undefined) continue;
        const dx = b.x - a.x || 0.01;
        const dy = b.y - a.y || 0.01;
        const dist2 = dx * dx + dy * dy + 1;
        const force = REPULSION / dist2;
        const fx = force * dx;
        const fy = force * dy;
        if (a.fx === undefined) { a.vx -= fx; a.vy -= fy; }
        if (b.fx === undefined) { b.vx += fx; b.vy += fy; }
      }
    }

    // Attraction along edges (link force)
    for (const edge of edges) {
      const source = nodeMap.get(edge.from);
      const target = nodeMap.get(edge.to);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const ideal = 120 + (3 - edge.strength) * 30; // closer for stronger edges
      const delta = (dist - ideal) / dist;
      const fx = dx * delta * LINK_STRENGTH;
      const fy = dy * delta * LINK_STRENGTH;
      if (source.fx === undefined) { source.vx += fx; source.vy += fy; }
      if (target.fx === undefined) { target.vx -= fx; target.vy -= fy; }
    }

    // Center gravity
    const cx = width / 2;
    const cy = height / 2;
    for (const n of nodes) {
      if (n.fx !== undefined) continue;
      n.vx += (cx - n.x) * GRAVITY;
      n.vy += (cy - n.y) * GRAVITY;
    }

    // Integrate
    for (const n of nodes) {
      if (n.fx !== undefined && n.fy !== undefined) {
        n.x = n.fx;
        n.y = n.fy;
        n.vx = 0;
        n.vy = 0;
        continue;
      }
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x = clamp(n.x + n.vx, 30, width - 30);
      n.y = clamp(n.y + n.vy, 30, height - 30);
    }
  }

  return nodes;
}

// ── Colours & sizes ──────────────────────────────────────────

const RELATIONSHIP_COLORS: Record<string, string> = {
  family: '#D6C6A8',
  college: '#A3B18A',
  work: '#8BA4B5',
  childhood: '#C4A882',
  neighbors: '#B5A99A',
  other: '#9A9488',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  family: 'Family',
  college: 'College',
  work: 'Work',
  childhood: 'Childhood',
  neighbors: 'Neighbors',
  other: 'Other',
};

function nodeRadius(node: GraphNode): number {
  if (node.id === 'partner1' || node.id === 'partner2') return 28;
  if (node.side === 'both') return 16;
  return 10;
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// ── Skeleton loading ──────────────────────────────────────────

function SkeletonGraph({ width, height }: { width: number; height: number }) {
  const circles = [
    { cx: width * 0.38, cy: height * 0.5, r: 28 },
    { cx: width * 0.62, cy: height * 0.5, r: 28 },
    { cx: width * 0.2, cy: height * 0.3, r: 10 },
    { cx: width * 0.15, cy: height * 0.55, r: 10 },
    { cx: width * 0.25, cy: height * 0.72, r: 10 },
    { cx: width * 0.8, cy: height * 0.28, r: 10 },
    { cx: width * 0.85, cy: height * 0.58, r: 10 },
    { cx: width * 0.75, cy: height * 0.75, r: 10 },
    { cx: width * 0.5, cy: height * 0.15, r: 16 },
  ];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:.35} 50%{opacity:.7} }
        .skel { animation: pulse 1.6s ease-in-out infinite; }
      `}</style>
      {circles.map((c, i) => (
        <circle
          key={i}
          className="skel"
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          fill="#D6C6A8"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────

export function RelationshipGraph({ siteId, coupleNames, vibeSkin }: RelationshipGraphProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [simPositions, setSimPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [dragState, setDragState] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [svgSize, setSvgSize] = useState({ width: 800, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Measure container
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || 800;
        const h = Math.min(600, Math.round(w * 0.8));
        setSvgSize({ width: w, height: h });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/relationship-graph?siteId=${encodeURIComponent(siteId)}`);
      const json = await res.json();
      setNodes(json.nodes || []);
      setEdges(json.edges || []);
    } catch (e) {
      console.error('[RelationshipGraph] fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Run simulation whenever nodes/edges/size change
  useEffect(() => {
    if (!nodes.length || !svgSize.width) return;

    const { width, height } = svgSize;

    // Initial positions: scatter, fix partners
    const initSim: SimNode[] = nodes.map(n => {
      const isP1 = n.id === 'partner1';
      const isP2 = n.id === 'partner2';
      const angle = Math.random() * Math.PI * 2;
      const radius = 120 + Math.random() * 160;
      return {
        id: n.id,
        x: isP1 ? width * 0.38 : isP2 ? width * 0.62 : width / 2 + Math.cos(angle) * radius,
        y: isP1 ? height * 0.5 : isP2 ? height * 0.5 : height / 2 + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fx: isP1 ? width * 0.38 : isP2 ? width * 0.62 : undefined,
        fy: isP1 ? height * 0.5 : isP2 ? height * 0.5 : undefined,
      };
    });

    const final = runForceSimulation(initSim, edges, width, height);
    const map = new Map<string, { x: number; y: number }>();
    for (const n of final) map.set(n.id, { x: n.x, y: n.y });
    setSimPositions(map);
  }, [nodes, edges, svgSize]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    if (nodeId === 'partner1' || nodeId === 'partner2') return;
    e.preventDefault();
    const pos = simPositions.get(nodeId);
    if (!pos) return;
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    setDragState({
      id: nodeId,
      offsetX: e.clientX - svgRect.left - pos.x,
      offsetY: e.clientY - svgRect.top - pos.y,
    });
  }, [simPositions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = clamp(e.clientX - svgRect.left - dragState.offsetX, 20, svgSize.width - 20);
    const y = clamp(e.clientY - svgRect.top - dragState.offsetY, 20, svgSize.height - 20);
    setSimPositions(prev => {
      const next = new Map(prev);
      next.set(dragState.id, { x, y });
      return next;
    });
  }, [dragState, svgSize]);

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  const palette = vibeSkin.palette;
  const headingFont = vibeSkin.fonts.heading;

  // Curved bezier path from source to target
  function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 - 30;
    return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
  }

  const { width, height } = svgSize;

  return (
    <section
      style={{
        background: palette.subtle,
        padding: '5rem 1.5rem 4rem',
        fontFamily: vibeSkin.fonts.body,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: palette.muted, marginBottom: '0.5rem' }}>
          your circle
        </p>
        <h2
          style={{
            fontFamily: headingFont,
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 400,
            fontStyle: 'italic',
            color: palette.ink,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Your Circle of Love
        </h2>
        <p style={{ color: palette.muted, marginTop: '0.6rem', fontSize: '0.95rem' }}>
          Every person who shapes{' '}
          <span style={{ color: palette.accent }}>{coupleNames[0]}</span>
          {' & '}
          <span style={{ color: palette.accent }}>{coupleNames[1]}</span>
          {'\'s story'}
        </p>
      </div>

      {/* Graph canvas */}
      <div
        ref={containerRef}
        style={{ position: 'relative', maxWidth: '900px', margin: '0 auto', userSelect: 'none' }}
      >
        {loading || simPositions.size === 0 ? (
          <SkeletonGraph width={width} height={height} />
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={{ display: 'block', cursor: dragState ? 'grabbing' : 'default', overflow: 'visible' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Edges */}
            {edges.map((edge, i) => {
              const src = simPositions.get(edge.from);
              const tgt = simPositions.get(edge.to);
              if (!src || !tgt) return null;
              return (
                <path
                  key={i}
                  d={bezierPath(src.x, src.y, tgt.x, tgt.y)}
                  fill="none"
                  stroke="rgba(163,177,138,0.25)"
                  strokeWidth={edge.strength}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map(node => {
              const pos = simPositions.get(node.id);
              if (!pos) return null;
              const isPartner = node.id === 'partner1' || node.id === 'partner2';
              const r = nodeRadius(node);
              const hovered = hoveredId === node.id;
              const displayR = hovered ? r * 1.3 : r;
              const fill = isPartner ? palette.accent : RELATIONSHIP_COLORS[node.relationshipType] ?? '#9A9488';
              const stroke = isPartner ? palette.highlight : palette.card;
              const label = isPartner
                ? (node.id === 'partner1' ? coupleNames[0] : coupleNames[1])
                : truncate(node.name, 12);

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x},${pos.y})`}
                  style={{ cursor: isPartner ? 'default' : 'grab' }}
                  onMouseEnter={(e) => {
                    setHoveredId(node.id);
                    const svgRect = svgRef.current?.getBoundingClientRect();
                    if (svgRect) {
                      setTooltip({
                        node,
                        x: e.clientX - svgRect.left,
                        y: e.clientY - svgRect.top,
                      });
                    }
                  }}
                  onMouseLeave={() => {
                    setHoveredId(null);
                    setTooltip(null);
                  }}
                  onMouseDown={(e) => handleMouseDown(e, node.id)}
                >
                  {/* Glow ring on hover */}
                  {hovered && (
                    <circle
                      r={displayR + 5}
                      fill="none"
                      stroke={fill}
                      strokeWidth={2}
                      opacity={0.4}
                    />
                  )}
                  <circle
                    r={displayR}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isPartner ? 3 : 1.5}
                    style={{ transition: 'r 0.15s ease' }}
                  />
                  {/* Partner label inside */}
                  {isPartner && (
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily={headingFont}
                      fontStyle="italic"
                      fontSize={11}
                      fill={palette.card}
                      style={{ pointerEvents: 'none' }}
                    >
                      {label}
                    </text>
                  )}
                  {/* Guest label below */}
                  {!isPartner && (
                    <text
                      y={displayR + 13}
                      textAnchor="middle"
                      fontFamily={vibeSkin.fonts.body}
                      fontSize={11}
                      fill={palette.muted}
                      style={{ pointerEvents: 'none' }}
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(tooltip.x + 12, width - 200),
              top: Math.max(tooltip.y - 80, 8),
              background: palette.card,
              border: `1px solid ${palette.accent2}`,
              borderRadius: vibeSkin.cornerStyle,
              padding: '0.75rem 1rem',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              pointerEvents: 'none',
              zIndex: 10,
              minWidth: '160px',
              maxWidth: '220px',
            }}
          >
            <p style={{ margin: 0, fontFamily: headingFont, fontStyle: 'italic', fontSize: '0.95rem', color: palette.ink, fontWeight: 600 }}>
              {tooltip.node.id === 'partner1' ? coupleNames[0] : tooltip.node.id === 'partner2' ? coupleNames[1] : tooltip.node.name}
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: palette.accent, fontWeight: 500 }}>
              {tooltip.node.relationshipLabel}
            </p>
            {tooltip.node.memorySnippet && (
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: palette.muted, fontStyle: 'italic', lineHeight: 1.4 }}>
                &ldquo;{tooltip.node.memorySnippet}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '0.75rem 1.25rem',
          margin: '2rem auto 0',
          maxWidth: '600px',
        }}
      >
        {Object.entries(RELATIONSHIP_LABELS).map(([type, label]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: RELATIONSHIP_COLORS[type],
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '0.78rem', color: palette.muted, fontFamily: vibeSkin.fonts.body }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
        {showInput ? (
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            {/* Lazy import to avoid circular dep */}
            <RelationshipGraphInputInline
              siteId={siteId}
              coupleNames={coupleNames}
              vibeSkin={vibeSkin}
              onAdded={() => { fetchData(); setShowInput(false); }}
              onCancel={() => setShowInput(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowInput(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.7rem 1.6rem',
              background: palette.accent,
              color: '#fff',
              border: 'none',
              borderRadius: vibeSkin.cornerStyle,
              fontFamily: vibeSkin.fonts.body,
              fontSize: '0.9rem',
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            Add yourself to our story &rarr;
          </button>
        )}
      </div>
    </section>
  );
}

// ── Inline input (imported here to keep the CTA in-graph) ─────

import { RelationshipGraphInput } from './RelationshipGraphInput';

function RelationshipGraphInputInline({
  siteId,
  coupleNames,
  vibeSkin,
  onAdded,
  onCancel,
}: {
  siteId: string;
  coupleNames: [string, string];
  vibeSkin: VibeSkin;
  onAdded: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onCancel}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'none',
          border: 'none',
          fontSize: '1.1rem',
          cursor: 'pointer',
          color: vibeSkin.palette.muted,
          zIndex: 1,
        }}
      >
        ✕
      </button>
      <RelationshipGraphInput siteId={siteId} coupleNames={coupleNames} onAdded={onAdded} />
    </div>
  );
}
