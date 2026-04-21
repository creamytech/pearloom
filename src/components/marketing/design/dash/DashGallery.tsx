'use client';

// The Reel — gallery of event media, playful masonry + live feed

import { useEffect, useState, type CSSProperties } from 'react';
import { Sparkle, Swirl, Worm } from '@/components/brand/groove';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, btnInk } from './DashShell';

type ShapeKind = 'circle' | 'blob' | 'wave' | 'bars' | 'diamond' | 'spiral' | 'star' | 'grid';
const shapes: ShapeKind[] = ['circle', 'blob', 'wave', 'bars', 'diamond', 'spiral', 'star', 'grid'];
const palettes: Array<[string, string]> = [
  [PD.pear, PD.oliveDeep],
  [PD.butter, PD.gold],
  [PD.rose, PD.plum],
  [PD.olive, PD.butter],
  [PD.terra, PD.paperDeep],
  [PD.stone, PD.oliveDeep],
  [PD.plum, PD.rose],
  [PD.gold, PD.ink],
];

function Thumbnail({ idx, h, label }: { idx: number; h: number; label?: string }) {
  const [bg, fg] = palettes[idx % palettes.length];
  const shape = shapes[idx % shapes.length];
  return (
    <div
      style={{
        height: h,
        background: bg,
        borderRadius: 14,
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 180ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {shape === 'circle' && (
          <div style={{ width: h * 0.5, height: h * 0.5, borderRadius: 999, background: fg, opacity: 0.85 }} />
        )}
        {shape === 'blob' && (
          <div
            style={{
              width: h * 0.6,
              height: h * 0.6,
              background: fg,
              borderRadius: '62% 38% 54% 46% / 49% 58% 42% 51%',
              animation: 'pl-blob-morph 14s ease-in-out infinite',
            }}
          />
        )}
        {shape === 'wave' && <Worm width={h * 1.2} height={h * 0.4} color={fg} strokeWidth={5} segments={3} animated={false} />}
        {shape === 'bars' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: h * 0.5 }}>
            {[0.5, 0.8, 0.4, 1, 0.6, 0.7].map((v, j) => (
              <div key={j} style={{ width: 8, height: `${v * 100}%`, background: fg, borderRadius: 4 }} />
            ))}
          </div>
        )}
        {shape === 'diamond' && (
          <div style={{ width: h * 0.5, height: h * 0.5, background: fg, transform: 'rotate(45deg)' }} />
        )}
        {shape === 'spiral' && <Swirl size={h * 0.7} color={fg} strokeWidth={3} />}
        {shape === 'star' && <Sparkle size={h * 0.5} color={fg} animated={false} />}
        {shape === 'grid' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: 4,
              width: h * 0.5,
              height: h * 0.5,
            }}
          >
            {Array.from({ length: 9 }).map((_, j) => (
              <div
                key={j}
                style={{ background: fg, borderRadius: 3, opacity: 0.4 + (j % 3) * 0.25 }}
              />
            ))}
          </div>
        )}
      </div>
      {label && (
        <div
          style={{
            ...MONO_STYLE,
            position: 'absolute',
            bottom: 10,
            left: 12,
            fontSize: 9,
            color: PD.paper,
            opacity: 0.85,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}

const heights = [220, 300, 180, 260, 210, 340, 240, 190, 280, 230, 200, 320, 260, 190, 310, 230];
const labels = [
  'REHEARSAL', 'CEREMONY', 'RINGS', 'LAUGH · DAD', 'THE KISS', 'RECESSIONAL',
  'BLOOMS', 'TABLESCAPES', 'FIRST DANCE', 'TOAST · MARCUS', 'CAKE', 'SEND-OFF',
  'MORNING AFTER', 'LIGHTS', 'LETTERS', 'GRANDMA',
];

type View = 'masonry' | 'strip' | 'slideshow';

export function DashGallery() {
  const [view, setView] = useState<View>('masonry');
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => p + 1), 3500);
    return () => clearInterval(t);
  }, []);

  const columns = 4;
  const cols: Array<Array<{ h: number; label: string; idx: number }>> = Array.from({ length: columns }, () => []);
  heights.forEach((h, i) => cols[i % columns].push({ h, label: labels[i], idx: i }));

  return (
    <DashShell>
      <Topbar
        subtitle="THE REEL · 142 PIECES"
        title={
          <span>
            Everything,{' '}
            <span style={{ fontStyle: 'italic', color: PD.plum, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              unfolding
            </span>
            .
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                background: PD.paper3,
                borderRadius: 999,
                padding: 3,
                border: '1px solid rgba(31,36,24,0.1)',
              }}
            >
              {(['masonry', 'strip', 'slideshow'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    borderRadius: 999,
                    background: view === v ? PD.ink : 'transparent',
                    color: view === v ? PD.paper : PD.ink,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textTransform: 'capitalize',
                    fontWeight: 500,
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
            <button style={btnInk}>✦ Share the reel</button>
          </div>
        }
      >
        Guests and vendors are contributing in real time. Drag to reorder, double-tap a piece to feature it
        on the site.
      </Topbar>

      {/* Live pulse bar */}
      <div style={{ padding: '0 40px 14px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '10px 16px',
            background: PD.ink,
            color: PD.paper,
            borderRadius: 999,
            fontSize: 12.5,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          <LiveDot />
          <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden' }} key={pulse}>
            <span style={{ opacity: 0.85 }}>Halide uploaded 4 new frames · 7s ago</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ opacity: 0.85 }}>Grandma Lorraine was just tagged in 3 photos</span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span style={{ opacity: 0.85 }}>DJ Harriet added the send-off playlist</span>
          </div>
          <span style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.6 }}>AUTO-UPDATING</span>
        </div>
      </div>

      <main style={{ padding: '0 40px 60px' }}>
        {/* FEATURED */}
        <div
          className="pd-gallery-featured"
          style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14, marginBottom: 20 }}
        >
          <Thumbnail idx={0} h={380} label="FEATURED · FIRST DANCE" />
          <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 14 }}>
            <Thumbnail idx={3} h={183} label="CEREMONY · AISLE" />
            <Thumbnail idx={5} h={183} label="TOAST · MARCUS" />
          </div>
        </div>

        {view === 'masonry' && (
          <div
            className="pd-gallery-masonry"
            style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 14 }}
          >
            {cols.map((col, ci) => (
              <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {col.map((c, i) => (
                  <Thumbnail key={i} idx={c.idx + 4} h={c.h} label={c.label} />
                ))}
              </div>
            ))}
          </div>
        )}

        {view === 'strip' && (
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 20 }}>
            {heights.map((h, i) => (
              <div key={i} style={{ flexShrink: 0, width: 240 }}>
                <Thumbnail idx={i} h={240} label={labels[i]} />
              </div>
            ))}
          </div>
        )}

        {view === 'slideshow' && (
          <Panel bg={PD.ink} style={{ padding: 0, overflow: 'hidden', border: 'none' }}>
            <div style={{ height: 520 }}>
              <Thumbnail idx={4} h={520} label="FEATURED · SEND-OFF" />
            </div>
            <div
              style={{
                padding: '14px 20px',
                color: PD.paper,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <button
                style={{
                  background: PD.paper,
                  color: PD.ink,
                  border: 'none',
                  borderRadius: 999,
                  width: 42,
                  height: 42,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                ▶
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>The send-off</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>From Halide · 8:34 pm</div>
              </div>
              <div style={{ ...MONO_STYLE, fontSize: 10, opacity: 0.55 }}>4 OF 142</div>
            </div>
          </Panel>
        )}
      </main>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.pd-gallery-featured) {
            grid-template-columns: 1fr !important;
          }
          :global(.pd-gallery-masonry) {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </DashShell>
  );
}

function LiveDot() {
  const style: CSSProperties = {
    ...MONO_STYLE,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    color: PD.terra,
  };
  return (
    <span style={style}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: PD.terra,
          animation: 'pl-bloom-breathe 1.6s ease-in-out infinite',
        }}
      />
      LIVE
    </span>
  );
}
