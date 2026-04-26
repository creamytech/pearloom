'use client';

// Connections — real celebration + sibling-sites view.
// Each "celebration" is a set of sibling Pearloom sites
// (e.g. the couple's wedding + the MOH's bridal shower +
// the best man's bachelor weekend, all sharing one umbrella).
// Users link sites to a celebration here; the graph shows which
// sites belong to which celebration, with PATCH /api/celebrations
// to add/remove sites from a group.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Bloom, Sparkle } from '@/components/brand/groove';
import { Pear, PD, DISPLAY_STYLE, MONO_STYLE } from '../DesignAtoms';
import { Panel, SectionTitle, EmptyShell, btnInk, btnGhost, btnMini, btnMiniGhost } from './DashShell';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { siteDisplayName, useUserSites, type SiteSummary } from './hooks';

interface CelebrationRef {
  id: string;
  name: string;
}

interface ManifestWithCelebration {
  celebration?: CelebrationRef;
}

function celebrationFromSite(site: SiteSummary): CelebrationRef | null {
  const m = site.manifest as ManifestWithCelebration | undefined;
  return m?.celebration?.id && m.celebration.name
    ? { id: m.celebration.id, name: m.celebration.name }
    : null;
}

function occasionColor(o?: string): string {
  switch (o) {
    case 'wedding':
    case 'engagement':
    case 'anniversary':
    case 'vow-renewal':
      return PD.terra;
    case 'memorial':
    case 'funeral':
      return PD.plum;
    case 'birthday':
    case 'milestone-birthday':
    case 'sweet-sixteen':
      return PD.butter;
    case 'bachelor-party':
    case 'bachelorette-party':
    case 'bridal-shower':
      return PD.gold;
    case 'reunion':
    case 'housewarming':
      return PD.olive;
    default:
      return PD.stone;
  }
}

export function DashConnections() {
  const { sites, loading, refresh } = useUserSites();
  const [focusCelebId, setFocusCelebId] = useState<string | 'unlinked'>('unlinked');
  const [newCelebName, setNewCelebName] = useState('');
  const [linkOpen, setLinkOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Group sites by celebration id.
  const grouped = useMemo(() => {
    const byCeleb: Record<string, { celebration: CelebrationRef; sites: SiteSummary[] }> = {};
    const unlinked: SiteSummary[] = [];
    for (const s of sites ?? []) {
      const c = celebrationFromSite(s);
      if (c) {
        if (!byCeleb[c.id]) byCeleb[c.id] = { celebration: c, sites: [] };
        byCeleb[c.id].sites.push(s);
      } else {
        unlinked.push(s);
      }
    }
    return { byCeleb, unlinked };
  }, [sites]);

  // Auto-select first celebration if current focus is empty.
  useEffect(() => {
    if (focusCelebId === 'unlinked') {
      const keys = Object.keys(grouped.byCeleb);
      if (keys.length > 0) setFocusCelebId(keys[0]);
    }
  }, [grouped, focusCelebId]);

  const celebrations = Object.values(grouped.byCeleb);
  const focusCeleb =
    focusCelebId !== 'unlinked'
      ? grouped.byCeleb[focusCelebId]
      : null;

  async function link(siteId: string, celebration: CelebrationRef | null) {
    setSaving(siteId);
    try {
      const r = await fetch('/api/celebrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, celebration }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        console.error('[celebrations PATCH]', err);
      }
      await refresh();
    } finally {
      setSaving(null);
      setLinkOpen(null);
    }
  }

  async function createCelebration(siteId: string) {
    const name = newCelebName.trim();
    if (!name) return;
    await link(siteId, { id: '', name });
    setNewCelebName('');
  }

  if (!loading && (!sites || sites.length === 0)) {
    return (
      <DashLayout active="connections" title="Connections" subtitle="Create two sites first and you can weave them together here.">
        <EmptyShell message="Create two sites first and you can weave them together here." />
      </DashLayout>
    );
  }

  return (
    <DashLayout
      active="connections"
      title={
        <span>
          One weekend,{' '}
          <i style={{ color: PD.plum, fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1' }}>
            many threads.
          </i>
        </span>
      }
      subtitle="Pearloom celebrations group sibling sites together. A wedding weekend with a rehearsal dinner + brunch. A memorial with a family directory. A reunion split across three days. Each site still has its own host, its own guests, its own voice — but they link into one story."
      actions={
        <Link href="/wizard/new" style={{ ...btnInk, textDecoration: 'none' }}>
          ✦ New site
        </Link>
      }
    >

      <main
        className="pd-connections-main"
        style={{
          padding: '20px 40px 60px',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 20,
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT — celebrations graph */}
        <Panel bg={PD.paperCard} style={{ padding: 0, overflow: 'hidden', minHeight: 520 }}>
          <div
            style={{
              padding: '16px 22px',
              borderBottom: '1px solid rgba(31,36,24,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55 }}>YOUR CELEBRATIONS</div>
              <div style={{ ...DISPLAY_STYLE, fontSize: 18, marginTop: 3, fontWeight: 500 }}>
                {celebrations.length} linked · {grouped.unlinked.length} standalone
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {celebrations.map((c) => (
                <button
                  key={c.celebration.id}
                  onClick={() => setFocusCelebId(c.celebration.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 999,
                    background: focusCelebId === c.celebration.id ? PD.ink : 'transparent',
                    color: focusCelebId === c.celebration.id ? PD.paper : PD.ink,
                    border: `1px solid ${focusCelebId === c.celebration.id ? PD.ink : 'rgba(31,36,24,0.18)'}`,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  {c.celebration.name} · {c.sites.length}
                </button>
              ))}
              {grouped.unlinked.length > 0 && (
                <button
                  onClick={() => setFocusCelebId('unlinked')}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 999,
                    background: focusCelebId === 'unlinked' ? PD.ink : 'transparent',
                    color: focusCelebId === 'unlinked' ? PD.paper : PD.ink,
                    border: `1px solid ${focusCelebId === 'unlinked' ? PD.ink : 'rgba(31,36,24,0.18)'}`,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  Standalone · {grouped.unlinked.length}
                </button>
              )}
            </div>
          </div>

          {/* Graph view */}
          <div
            style={{
              position: 'relative',
              padding: 40,
              minHeight: 440,
              background: `linear-gradient(180deg, ${PD.paperCard} 0%, ${PD.paper3} 100%)`,
            }}
          >
            {focusCeleb ? (
              <CelebrationGraph
                celebration={focusCeleb.celebration}
                sites={focusCeleb.sites}
                onUnlink={(siteId) => void link(siteId, null)}
                saving={saving}
              />
            ) : grouped.unlinked.length > 0 ? (
              <StandaloneList
                sites={grouped.unlinked}
                linkOpen={linkOpen}
                setLinkOpen={setLinkOpen}
                celebrations={celebrations.map((c) => c.celebration)}
                onLink={(siteId, c) => void link(siteId, c)}
                newCelebName={newCelebName}
                setNewCelebName={setNewCelebName}
                onCreateCelebration={(siteId) => void createCelebration(siteId)}
                saving={saving}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div style={{ ...DISPLAY_STYLE, fontSize: 22, fontStyle: 'italic', color: PD.olive, marginBottom: 10 }}>
                  Nothing standalone.
                </div>
                <div style={{ fontSize: 13.5, color: PD.inkSoft }}>
                  Every site is linked to a celebration.
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* RIGHT — celebration details + promise */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 72 }}>
          <Panel bg={PD.paper2} style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, right: -60, opacity: 0.28, pointerEvents: 'none' }} aria-hidden>
              <Bloom size={130} color={PD.terra} centerColor={PD.plum} speed={12} />
            </div>
            <div style={{ ...MONO_STYLE, fontSize: 9, color: PD.terra, marginBottom: 10, position: 'relative' }}>
              {focusCeleb ? 'CELEBRATION' : 'STANDALONE'}
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 28,
                lineHeight: 1.08,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                position: 'relative',
              }}
            >
              {focusCeleb?.celebration.name ?? 'Sites not yet linked'}
            </div>
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 14,
                fontStyle: 'italic',
                color: PD.terra,
                marginTop: 8,
                position: 'relative',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              {focusCeleb
                ? `${focusCeleb.sites.length} thread${focusCeleb.sites.length === 1 ? '' : 's'}`
                : `${grouped.unlinked.length} site${grouped.unlinked.length === 1 ? '' : 's'} waiting`}
            </div>

            {focusCeleb && (
              <div style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid rgba(31,36,24,0.1)' }}>
                <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 10 }}>SITES IN THIS CELEBRATION</div>
                {focusCeleb.sites.map((s) => (
                  <Link
                    key={s.id}
                    href={`/editor/${s.domain}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 0',
                      textDecoration: 'none',
                      color: PD.ink,
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 99,
                        background: occasionColor(s.occasion),
                      }}
                    />
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{siteDisplayName(s)}</div>
                    <span style={{ fontSize: 11, opacity: 0.55, textTransform: 'capitalize' }}>
                      {s.occasion?.replace(/-/g, ' ') ?? 'event'}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            bg={PD.ink}
            style={{
              padding: 22,
              color: PD.paper,
              border: 'none',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Sparkle size={24} color={PD.butter} />
            <div
              style={{
                ...DISPLAY_STYLE,
                fontSize: 20,
                lineHeight: 1.3,
                fontStyle: 'italic',
                fontWeight: 400,
                margin: '12px 0 14px',
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              &ldquo;A wedding today is a memorial in forty years. Start the weave now.&rdquo;
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: PD.stone,
                lineHeight: 1.5,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              When you host another celebration later, Pear carries the photos, songs, and stories
              forward. The weave never ends.
            </div>
          </Panel>
        </div>
      </main>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.pd-connections-main) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div aria-hidden style={{ display: 'none' }}>
        <button style={btnMiniGhost}>x</button>
        <button style={btnMini}>x</button>
        <button style={btnGhost}>x</button>
      </div>
    </DashLayout>
  );
}

// ── Celebration graph ─────────────────────────────────────────

function CelebrationGraph({
  celebration,
  sites,
  onUnlink,
  saving,
}: {
  celebration: CelebrationRef;
  sites: SiteSummary[];
  onUnlink: (siteId: string) => void;
  saving: string | null;
}) {
  // Nodes on a circle around the celebration label.
  const radius = Math.min(180, 60 + sites.length * 14);
  const containerSize = 440;
  const cx = containerSize / 2;
  const cy = containerSize / 2;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: containerSize,
        height: containerSize,
        margin: '0 auto',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${containerSize} ${containerSize}`}
        style={{ position: 'absolute', inset: 0 }}
      >
        {sites.map((s, i) => {
          const angle = (i / sites.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          return (
            <path
              key={s.id}
              d={`M ${cx} ${cy} Q ${(cx + x) / 2 + (i % 3) - 1} ${(cy + y) / 2} ${x} ${y}`}
              stroke={occasionColor(s.occasion)}
              strokeWidth="2"
              fill="none"
              strokeOpacity="0.5"
              strokeDasharray="4 6"
              style={{ animation: `pl-thread-dash ${20 + i * 4}s linear infinite` }}
            />
          );
        })}
      </svg>

      {/* Center — celebration label + pear */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          padding: '22px 30px',
          background: PD.paperCard,
          borderRadius: 999,
          border: `2px solid ${PD.ink}`,
          zIndex: 2,
          boxShadow: '0 12px 30px -12px rgba(31,36,24,0.3)',
          minWidth: 180,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Pear size={26} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} animated />
          <div
            style={{
              ...DISPLAY_STYLE,
              fontStyle: 'italic',
              fontSize: 18,
              fontWeight: 500,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {celebration.name}
          </div>
        </div>
      </div>

      {/* Site nodes */}
      {sites.map((s, i) => {
        const angle = (i / sites.length) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const color = occasionColor(s.occasion);
        const isSaving = saving === s.id;
        return (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              zIndex: 3,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                maxWidth: 160,
                textAlign: 'center',
                opacity: isSaving ? 0.5 : 1,
              }}
            >
              <button
                disabled={isSaving}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 999,
                  background: color,
                  border: `3px solid ${PD.paperCard}`,
                  boxShadow: '0 4px 10px -2px rgba(31,36,24,0.25)',
                  color: PD.paper,
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontStyle: 'italic',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: isSaving ? 'wait' : 'pointer',
                  padding: 0,
                }}
                title={siteDisplayName(s)}
              >
                {(siteDisplayName(s)[0] || 'P').toUpperCase()}
              </button>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: PD.ink,
                  background: PD.paperCard,
                  padding: '3px 8px',
                  borderRadius: 8,
                }}
              >
                {siteDisplayName(s)}
              </div>
              <button
                disabled={isSaving}
                onClick={() => onUnlink(s.id)}
                style={{
                  fontSize: 10,
                  padding: '3px 8px',
                  borderRadius: 999,
                  background: 'transparent',
                  border: `1px solid rgba(31,36,24,0.18)`,
                  color: PD.inkSoft,
                  cursor: isSaving ? 'wait' : 'pointer',
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                Unlink
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Standalone list ───────────────────────────────────────────

function StandaloneList({
  sites,
  linkOpen,
  setLinkOpen,
  celebrations,
  onLink,
  newCelebName,
  setNewCelebName,
  onCreateCelebration,
  saving,
}: {
  sites: SiteSummary[];
  linkOpen: string | null;
  setLinkOpen: (id: string | null) => void;
  celebrations: CelebrationRef[];
  onLink: (siteId: string, c: CelebrationRef) => void;
  newCelebName: string;
  setNewCelebName: (v: string) => void;
  onCreateCelebration: (siteId: string) => void;
  saving: string | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 520, margin: '0 auto' }}>
      <div
        style={{
          ...MONO_STYLE,
          fontSize: 10,
          opacity: 0.55,
          marginBottom: 6,
          textAlign: 'center',
        }}
      >
        {sites.length} SITE{sites.length === 1 ? '' : 'S'} STANDALONE
      </div>
      {sites.map((s) => {
        const open = linkOpen === s.id;
        const busy = saving === s.id;
        return (
          <div
            key={s.id}
            style={{
              background: PD.paperCard,
              borderRadius: 14,
              padding: '14px 16px',
              border: '1px solid rgba(31,36,24,0.1)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: occasionColor(s.occasion),
                  color: PD.paper,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontFamily: '"Fraunces", Georgia, serif',
                  fontStyle: 'italic',
                  fontWeight: 600,
                }}
              >
                {(siteDisplayName(s)[0] || 'P').toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{siteDisplayName(s)}</div>
                <div style={{ fontSize: 11, color: '#6A6A56', textTransform: 'capitalize' }}>
                  {s.occasion?.replace(/-/g, ' ') ?? 'event'} · {s.domain}
                </div>
              </div>
              <button
                disabled={busy}
                onClick={() => setLinkOpen(open ? null : s.id)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  borderRadius: 999,
                  background: open ? PD.ink : 'transparent',
                  color: open ? PD.paper : PD.ink,
                  border: `1px solid ${open ? PD.ink : 'rgba(31,36,24,0.18)'}`,
                  cursor: busy ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: 500,
                }}
              >
                {busy ? 'Linking…' : open ? 'Close' : 'Link →'}
              </button>
            </div>
            {open && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(31,36,24,0.08)' }}>
                {celebrations.length > 0 && (
                  <>
                    <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 6 }}>
                      ADD TO EXISTING
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                      {celebrations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => onLink(s.id, c)}
                          style={{
                            padding: '6px 12px',
                            fontSize: 12,
                            borderRadius: 999,
                            background: PD.paper3,
                            border: '1px solid rgba(31,36,24,0.12)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            color: PD.ink,
                          }}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ ...MONO_STYLE, fontSize: 9, opacity: 0.55, marginBottom: 6 }}>
                  OR START A NEW CELEBRATION
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onCreateCelebration(s.id);
                  }}
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                  }}
                >
                  <input
                    value={newCelebName}
                    onChange={(e) => setNewCelebName(e.target.value)}
                    placeholder={(() => {
                      const [a, b] = s.names ?? [];
                      const who = a && b ? `${a}–${b}` : a ?? 'Our';
                      const o = s.occasion;
                      if (o === 'memorial' || o === 'funeral') return `e.g. ${who || 'Smith family'} — in memoriam`;
                      if (o === 'wedding' || o === 'engagement') return `e.g. ${who} wedding weekend`;
                      if (o === 'reunion') return `e.g. ${who || 'Smith family'} reunion 2026`;
                      if (o === 'baby-shower' || o === 'gender-reveal' || o === 'sip-and-see') return `e.g. Baby ${a ?? 'Jamie'}`;
                      if (o === 'graduation') return `e.g. ${a ?? 'Jamie'} grad 2026`;
                      if (o === 'retirement') return `e.g. ${a ?? 'Jamie'} retires`;
                      return `e.g. ${who || 'Our'} weekend`;
                    })()}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: PD.paper,
                      border: '1px solid rgba(31,36,24,0.14)',
                      borderRadius: 8,
                      fontFamily: 'inherit',
                      fontSize: 13,
                      outline: 'none',
                      color: PD.ink,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newCelebName.trim()}
                    style={{
                      background: PD.ink,
                      color: PD.paper,
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12,
                      cursor: 'pointer',
                      opacity: newCelebName.trim() ? 1 : 0.4,
                      fontFamily: 'inherit',
                    }}
                  >
                    Create
                  </button>
                </form>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Keep imports referenced
const _cs: CSSProperties = {};
void _cs;
