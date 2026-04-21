'use client';

// Marketplace — vendors curated by Pear.

import { useState } from 'react';
import { Bloom, Sparkle, Swirl, Worm } from '@/components/brand/groove';
import { Pear, PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, btnInk, btnGhost, btnMini, btnMiniGhost } from './DashShell';

type Pattern = 'bloom' | 'grid' | 'wave' | 'bars' | 'spiral' | 'star' | 'blob' | 'circle';

interface Vendor {
  n: string;
  cat: string;
  loc: string;
  stars: number;
  work: number;
  color: string;
  pattern: Pattern;
  tag: string;
  price: string;
  bio: string;
}

const VENDORS: Vendor[] = [
  { n: 'Floribunda',       cat: 'Florist',     loc: 'Boise',         stars: 4.9, work: 92,  color: PD.olive, pattern: 'bloom',  tag: "Pear's pick",       price: '$$$',  bio: 'Garden-style arrangements. Specializes in wildflower and foraged.' },
  { n: 'Halide Studios',   cat: 'Photography', loc: 'Meridian',      stars: 4.8, work: 141, color: PD.plum,  pattern: 'grid',   tag: 'Booked Sep 6',      price: '$$$$', bio: 'Editorial documentary. Medium format for the ceremony.' },
  { n: 'Linwood Tents',    cat: 'Rentals',     loc: 'Nampa',         stars: 4.6, work: 64,  color: PD.gold,  pattern: 'wave',   tag: 'Waiting on you',    price: '$$',   bio: 'Sailcloth and sperry tents. Often booked 6 mo out.' },
  { n: 'Sumac Catering',   cat: 'Catering',    loc: 'Boise',         stars: 4.9, work: 77,  color: PD.terra, pattern: 'bars',   tag: 'Tasted Jul 12',     price: '$$$',  bio: 'Middle-eastern forward. Cocktail & plated menus.' },
  { n: 'Mari Hair+Makeup', cat: 'Beauty',      loc: 'Eagle',         stars: 5.0, work: 210, color: PD.rose,  pattern: 'spiral', tag: 'Booked Sep 6',      price: '$$',   bio: 'Bridal glam + natural. Travels to venue.' },
  { n: 'DJ Harriet',       cat: 'Music',       loc: 'Boise',         stars: 4.7, work: 88,  color: PD.plum,  pattern: 'star',   tag: 'Booked Sep 6',      price: '$$',   bio: 'Soul, disco, classical crossover. Reads a room.' },
  { n: 'Hollow Barn',      cat: 'Venue',       loc: 'Garden Valley', stars: 4.9, work: 55,  color: PD.olive, pattern: 'blob',   tag: 'Your venue',        price: '$$$$', bio: 'Working farm, 160 capacity. Sunset facing.' },
  { n: 'Luis Bar Co.',     cat: 'Bar',         loc: 'Boise',         stars: 4.8, work: 62,  color: PD.gold,  pattern: 'circle', tag: 'Booked Sep 6',      price: '$$',   bio: 'Pre-Prohibition cocktails. Can do non-alc flights.' },
];

function PatternArt({ pattern, color }: { pattern: Pattern; color: string }) {
  return (
    <div style={{ opacity: 0.85 }}>
      {pattern === 'bloom' && <Bloom size={90} color={PD.paper} centerColor={color} speed={10} />}
      {pattern === 'wave' && <Worm width={180} height={60} color={PD.paper} strokeWidth={4} segments={3} />}
      {pattern === 'spiral' && <Swirl size={90} color={PD.paper} strokeWidth={3} />}
      {pattern === 'star' && <Sparkle size={60} color={PD.paper} />}
      {pattern === 'blob' && (
        <div
          style={{
            width: 100,
            height: 100,
            background: PD.paper,
            borderRadius: '62% 38% 54% 46% / 49% 58% 42% 51%',
            animation: 'pl-blob-morph 14s ease-in-out infinite',
          }}
        />
      )}
      {pattern === 'grid' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, width: 120 }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: '1',
                background: PD.paper,
                borderRadius: 4,
                opacity: 0.4 + (i % 4) * 0.15,
              }}
            />
          ))}
        </div>
      )}
      {pattern === 'bars' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
          {[0.6, 1, 0.5, 0.8, 0.4, 0.9].map((h, i) => (
            <div
              key={i}
              style={{ width: 10, height: `${h * 100}%`, background: PD.paper, borderRadius: 4 }}
            />
          ))}
        </div>
      )}
      {pattern === 'circle' && (
        <div style={{ width: 80, height: 80, borderRadius: 999, background: PD.paper }} />
      )}
    </div>
  );
}

function VendorTile({ v }: { v: Vendor }) {
  return (
    <Panel bg={PD.paperCard} style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }}>
      <div
        style={{
          height: 140,
          background: v.color,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PatternArt pattern={v.pattern} color={v.color} />
        <div
          style={{
            ...MONO_STYLE,
            position: 'absolute',
            top: 10,
            left: 10,
            fontSize: 9,
            color: PD.paper,
            background: 'rgba(31,36,24,0.4)',
            padding: '3px 8px',
            borderRadius: 999,
          }}
        >
          {v.cat.toUpperCase()}
        </div>
        {v.tag === "Pear's pick" && (
          <div
            style={{
              ...MONO_STYLE,
              position: 'absolute',
              top: 10,
              right: 10,
              fontSize: 9,
              color: PD.ink,
              background: PD.butter,
              padding: '3px 8px',
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ✦ {v.tag.toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ padding: '16px 18px 18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 4,
          }}
        >
          <div style={{ ...DISPLAY_STYLE, fontSize: 19, fontWeight: 400, letterSpacing: '-0.015em', lineHeight: 1.1 }}>
            {v.n}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: PD.olive }}>★ {v.stars}</div>
        </div>
        <div style={{ fontSize: 12, color: '#6A6A56', marginBottom: 10 }}>
          {v.loc} · {v.price} · {v.work} events
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: PD.inkSoft,
            lineHeight: 1.5,
            minHeight: 36,
            fontFamily: 'var(--pl-font-body)',
          }}
        >
          {v.bio}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          <button style={{ ...btnMini, background: PD.ink, color: PD.paper, flex: 1 }}>View work</button>
          <button style={btnMiniGhost}>Save</button>
        </div>
      </div>
    </Panel>
  );
}

export function DashMarketplace() {
  const cats = ['All', 'Venue', 'Florist', 'Photography', 'Catering', 'Music', 'Beauty', 'Rentals', 'Bar'];
  const [cat, setCat] = useState('All');
  const filtered = cat === 'All' ? VENDORS : VENDORS.filter((v) => v.cat === cat);

  return (
    <DashShell>
      <Topbar
        subtitle="MARKETPLACE · BOISE + 60MI"
        title={
          <span>
            Vendors Pear{' '}
            <span style={{ fontStyle: 'italic', color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              trusts
            </span>
            .
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnGhost}>List your business</button>
            <button style={btnInk}>✦ Pear, find me a...</button>
          </div>
        }
      >
        Only vendors who&rsquo;ve done three or more Pearloom events. Real reviews, real photos, real prices.
        No sponsored placement.
      </Topbar>

      <main style={{ padding: '20px 40px 60px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                borderRadius: 999,
                background: cat === c ? PD.ink : 'transparent',
                color: cat === c ? PD.paper : PD.ink,
                border: `1px solid ${cat === c ? PD.ink : 'rgba(31,36,24,0.15)'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 18,
          }}
        >
          {filtered.map((v, i) => (
            <VendorTile key={i} v={v} />
          ))}
        </div>

        <Panel
          bg={PD.ink}
          style={{
            padding: 30,
            marginTop: 30,
            color: PD.paper,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            position: 'relative',
            overflow: 'hidden',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'absolute', top: -40, right: -20, opacity: 0.4 }} aria-hidden>
            <Bloom size={180} color={PD.butter} centerColor={PD.terra} speed={12} />
          </div>
          <div style={{ position: 'relative' }}>
            <Pear size={64} color={PD.pear} stem={PD.paper} leaf={PD.butter} animated />
          </div>
          <div style={{ flex: 1, position: 'relative', minWidth: 260 }}>
            <div style={{ ...MONO_STYLE, fontSize: 10, color: PD.butter, marginBottom: 6 }}>
              ASK PEAR DIRECTLY
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 26,
                lineHeight: 1.2,
                fontWeight: 400,
                fontStyle: 'italic',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              &ldquo;Tell me what you need and I&rsquo;ll short-list three by morning.&rdquo;
            </div>
          </div>
          <button
            style={{
              ...btnInk,
              background: PD.paper,
              color: PD.ink,
              padding: '14px 24px',
              fontSize: 14,
              position: 'relative',
            }}
          >
            Start a brief →
          </button>
        </Panel>
      </main>
    </DashShell>
  );
}
