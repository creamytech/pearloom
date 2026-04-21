'use client';

// Marketplace — real templates + color themes + block presets
// from the existing catalogues, ownership from /api/marketplace/owned.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SITE_TEMPLATES } from '@/lib/templates/wedding-templates';
import { COLOR_THEMES } from '@/lib/templates/color-themes';
import { BLOCK_TEMPLATES } from '@/lib/block-engine/templates';
import { Bloom } from '@/components/brand/groove';
import { Pear, PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { DashShell, Topbar, Panel, btnInk, btnGhost, btnMini, btnMiniGhost } from './DashShell';

type TabId = 'templates' | 'themes' | 'blocks';

export function DashMarketplace() {
  const [tab, setTab] = useState<TabId>('templates');
  const [search, setSearch] = useState('');
  const [occasion, setOccasion] = useState<string>('all');
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/marketplace/owned', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { ownedItems: [] }))
      .then((data: { ownedItems?: string[] }) => {
        if (!cancelled) setOwned(new Set(data.ownedItems ?? []));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const occasions = useMemo(() => {
    const set = new Set<string>(['all']);
    SITE_TEMPLATES.forEach((t) => t.occasions.forEach((o) => set.add(o)));
    COLOR_THEMES.forEach((t) => t.occasions.forEach((o) => set.add(o)));
    return Array.from(set);
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = search.toLowerCase();
    return SITE_TEMPLATES.filter(
      (t) =>
        (occasion === 'all' || t.occasions.includes(occasion)) &&
        (!q ||
          t.name.toLowerCase().includes(q) ||
          t.tagline.toLowerCase().includes(q) ||
          t.tags.some((x) => x.toLowerCase().includes(q))),
    ).sort((a, b) => b.popularity - a.popularity);
  }, [search, occasion]);

  const filteredThemes = useMemo(() => {
    const q = search.toLowerCase();
    return COLOR_THEMES.filter(
      (t) =>
        (occasion === 'all' || t.occasions.includes(occasion)) &&
        (!q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
    );
  }, [search, occasion]);

  const filteredBlocks = useMemo(() => {
    const q = search.toLowerCase();
    return BLOCK_TEMPLATES.filter(
      (b) =>
        !q ||
        b.name.toLowerCase().includes(q) ||
        (b.description?.toLowerCase().includes(q) ?? false),
    );
  }, [search]);

  return (
    <DashShell>
      <Topbar
        subtitle="MARKETPLACE"
        title={
          <span>
            The{' '}
            <i style={{ color: PD.olive, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
              starting points
            </i>
            .
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: PD.paper3,
                borderRadius: 999,
                padding: '8px 14px',
                border: '1px solid rgba(31,36,24,0.1)',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  opacity: 0.5,
                  fontFamily: '"Fraunces", Georgia, serif',
                }}
              >
                ✦
              </span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates, themes…"
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  color: PD.ink,
                  width: 220,
                }}
              />
            </div>
          </div>
        }
      >
        Hand-crafted templates, color palettes, and block presets. Every one of them is included
        on every plan — browse and apply to any of your sites.
      </Topbar>

      <main style={{ padding: '20px 40px 60px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {([
            { k: 'templates', l: `Templates · ${SITE_TEMPLATES.length}` },
            { k: 'themes', l: `Color themes · ${COLOR_THEMES.length}` },
            { k: 'blocks', l: `Block presets · ${BLOCK_TEMPLATES.length}` },
          ] as const).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                padding: '8px 18px',
                fontSize: 13,
                borderRadius: 999,
                background: tab === t.k ? PD.ink : 'transparent',
                color: tab === t.k ? PD.paper : PD.ink,
                border: `1px solid ${tab === t.k ? PD.ink : 'rgba(31,36,24,0.15)'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* Occasion filter (only for templates + themes) */}
        {tab !== 'blocks' && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              marginBottom: 24,
              flexWrap: 'wrap',
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {occasions.map((o) => (
              <button
                key={o}
                onClick={() => setOccasion(o)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 999,
                  background: occasion === o ? PD.paper2 : 'transparent',
                  color: PD.ink,
                  border: `1px solid ${occasion === o ? 'rgba(31,36,24,0.25)' : 'rgba(31,36,24,0.12)'}`,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                  textTransform: o === 'all' ? 'none' : 'capitalize',
                  whiteSpace: 'nowrap',
                }}
              >
                {o === 'all' ? 'All occasions' : o.replace(/-/g, ' ')}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        {tab === 'templates' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 18,
            }}
          >
            {filteredTemplates.map((t) => {
              const isOwned = owned.has(t.id);
              return (
                <Panel key={t.id} bg={PD.paperCard} style={{ padding: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: 160,
                      background: t.previewGradient,
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        ...DISPLAY_STYLE,
                        fontSize: 20,
                        fontStyle: 'italic',
                        color: t.theme.colors.foreground,
                        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                      }}
                    >
                      {t.name}
                    </div>
                    {t.featured && (
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
                        }}
                      >
                        ✦ FEATURED
                      </div>
                    )}
                    {isOwned && (
                      <div
                        style={{
                          ...MONO_STYLE,
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          fontSize: 9,
                          color: PD.paper,
                          background: PD.olive,
                          padding: '3px 8px',
                          borderRadius: 999,
                        }}
                      >
                        OWNED
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '16px 18px' }}>
                    <div
                      style={{
                        fontSize: 12.5,
                        fontFamily: 'var(--pl-font-body)',
                        color: PD.inkSoft,
                        lineHeight: 1.5,
                        minHeight: 56,
                      }}
                    >
                      {t.tagline}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '12px 0 14px' }}>
                      {t.occasions.slice(0, 3).map((o) => (
                        <span
                          key={o}
                          style={{
                            ...MONO_STYLE,
                            fontSize: 9,
                            padding: '3px 8px',
                            background: PD.paper3,
                            borderRadius: 999,
                            textTransform: 'uppercase',
                            color: PD.inkSoft,
                          }}
                        >
                          {o.replace(/-/g, ' ')}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Link
                        href={`/wizard/new?template=${t.id}`}
                        style={{
                          ...btnMini,
                          background: PD.ink,
                          color: PD.paper,
                          flex: 1,
                          textDecoration: 'none',
                          textAlign: 'center',
                        }}
                      >
                        {isOwned ? 'Apply' : 'Use template'}
                      </Link>
                      <button style={btnMiniGhost}>Preview</button>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}

        {tab === 'themes' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {filteredThemes.map((theme) => (
              <Panel key={theme.id} bg={PD.paperCard} style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    height: 120,
                    background: theme.previewGradient,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 12,
                      display: 'flex',
                      gap: 4,
                    }}
                  >
                    {[theme.colors.accent, theme.colors.accentLight, theme.colors.muted].map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 999,
                          background: c,
                          border: `2px solid ${theme.colors.background}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ ...DISPLAY_STYLE, fontSize: 17, fontWeight: 500 }}>{theme.name}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: PD.inkSoft,
                      marginTop: 4,
                      fontFamily: 'var(--pl-font-body)',
                      lineHeight: 1.4,
                    }}
                  >
                    {theme.description}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button style={{ ...btnMini, background: PD.ink, color: PD.paper, flex: 1 }}>
                      Apply to a site
                    </button>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        )}

        {tab === 'blocks' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            {filteredBlocks.map((b) => (
              <Panel key={b.id} bg={PD.paper} style={{ padding: 16 }}>
                <div
                  style={{
                    ...MONO_STYLE,
                    fontSize: 9,
                    opacity: 0.6,
                    marginBottom: 4,
                  }}
                >
                  {b.category?.toUpperCase() ?? 'BLOCK'}
                </div>
                <div style={{ ...DISPLAY_STYLE, fontSize: 16, fontWeight: 500 }}>{b.name}</div>
                {b.description && (
                  <div
                    style={{
                      fontSize: 12,
                      color: PD.inkSoft,
                      marginTop: 4,
                      lineHeight: 1.5,
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    {b.description}
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <button style={{ ...btnMini, background: PD.ink, color: PD.paper }}>Copy preset</button>
                </div>
              </Panel>
            ))}
          </div>
        )}

        {/* Pear CTA */}
        <Panel
          bg={PD.ink}
          style={{
            padding: 30,
            marginTop: 40,
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
              &ldquo;Tell me the vibe and I&rsquo;ll short-list three templates in ten seconds.&rdquo;
            </div>
          </div>
          <Link
            href="/dashboard/director"
            style={{
              ...btnInk,
              background: PD.paper,
              color: PD.ink,
              padding: '14px 24px',
              fontSize: 14,
              position: 'relative',
              textDecoration: 'none',
            }}
          >
            Start with Pear →
          </Link>
        </Panel>

        {loading && null}
        {owned.size > 0 && tab === 'templates' && (
          <div
            style={{
              marginTop: 24,
              fontSize: 12,
              color: PD.inkSoft,
              textAlign: 'center',
              fontFamily: 'var(--pl-font-body)',
            }}
          >
            <span style={{ fontWeight: 500 }}>{owned.size}</span> owned already.
          </div>
        )}
      </main>
      <div aria-hidden style={{ display: 'none' }}>
        <button style={btnGhost}>x</button>
      </div>
    </DashShell>
  );
}
