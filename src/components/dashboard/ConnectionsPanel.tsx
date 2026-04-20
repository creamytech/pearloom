'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/ConnectionsPanel.tsx
// Lets a host cluster their sites into "celebrations" — groups
// of sibling sites that belong to the same real-world life
// event (a wedding weekend with bachelor party + rehearsal +
// ceremony + brunch, each a separate Pearloom site).
//
// Host picks a name for the celebration, then toggles which of
// their sites belong to it. Sites with the same celebration.id
// render sibling links on their public pages via
// <LinkedEventsStrip />.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Link2, Unlink, RefreshCw } from 'lucide-react';
import { formatSiteDisplayUrl, normalizeOccasion } from '@/lib/site-urls';

interface DashSite {
  domain: string;
  manifest: {
    celebration?: { id?: string; name?: string };
    occasion?: string;
    names?: [string, string];
  } | null;
  names?: [string, string] | null;
}

interface Celebration {
  id: string;
  name: string;
  siteDomains: string[];
}

interface Props {
  sites: DashSite[];
  /** Reload the parent's site list after an update. */
  onChanged?: () => void;
}

function groupByCelebration(sites: DashSite[]): {
  celebrations: Celebration[];
  unassigned: DashSite[];
} {
  const map = new Map<string, Celebration>();
  const unassigned: DashSite[] = [];
  for (const s of sites) {
    const c = s.manifest?.celebration;
    if (c?.id && c?.name) {
      const existing = map.get(c.id);
      if (existing) {
        existing.siteDomains.push(s.domain);
      } else {
        map.set(c.id, { id: c.id, name: c.name, siteDomains: [s.domain] });
      }
    } else {
      unassigned.push(s);
    }
  }
  return { celebrations: Array.from(map.values()), unassigned };
}

async function patchCelebration(
  siteId: string,
  celebration: { id: string; name: string } | null,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/celebrations', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId, celebration }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.error ?? `Request failed (${res.status})` };
  }
  return { ok: true };
}

export function ConnectionsPanel({ sites, onChanged }: Props) {
  const [pendingDomain, setPendingDomain] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { celebrations, unassigned } = useMemo(
    () => groupByCelebration(sites),
    [sites],
  );

  const createCelebration = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    if (sites.length === 0) return;
    // First site becomes the anchor for the new celebration.
    // Patch with empty id → server mints a fresh UUID.
    const first = sites[0];
    setPendingDomain(first.domain);
    setError(null);
    const result = await patchCelebration(first.domain, { id: '', name });
    setPendingDomain(null);
    if (!result.ok) {
      setError(result.error ?? 'Could not create celebration.');
      return;
    }
    setNewName('');
    onChanged?.();
  }, [newName, sites, onChanged]);

  const linkSite = useCallback(
    async (domain: string, celebration: Celebration) => {
      setPendingDomain(domain);
      setError(null);
      const result = await patchCelebration(domain, {
        id: celebration.id,
        name: celebration.name,
      });
      setPendingDomain(null);
      if (!result.ok) {
        setError(result.error ?? 'Could not link site.');
        return;
      }
      onChanged?.();
    },
    [onChanged],
  );

  const unlinkSite = useCallback(
    async (domain: string) => {
      setPendingDomain(domain);
      setError(null);
      const result = await patchCelebration(domain, null);
      setPendingDomain(null);
      if (!result.ok) {
        setError(result.error ?? 'Could not unlink site.');
        return;
      }
      onChanged?.();
    },
    [onChanged],
  );

  return (
    <section>
      <header style={{ marginBottom: 24 }}>
        <div
          className="pl-overline"
          style={{ color: 'var(--pl-olive)', marginBottom: 8 }}
        >
          Site connections
        </div>
        <h2
          className="pl-display"
          style={{
            margin: 0,
            fontStyle: 'italic',
            fontSize: 'clamp(1.6rem, 3vw, 2.2rem)',
            color: 'var(--pl-ink)',
          }}
        >
          Events woven together
        </h2>
        <p
          style={{
            margin: '6px 0 0',
            color: 'var(--pl-muted)',
            fontSize: '0.92rem',
            lineHeight: 1.55,
            maxWidth: '58ch',
          }}
        >
          Group sibling sites so the bachelor party, rehearsal dinner, and
          ceremony all link back to each other on the footer of every page.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 'var(--pl-radius-sm)',
            background: 'color-mix(in oklab, var(--pl-plum) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--pl-plum) 30%, transparent)',
            color: 'var(--pl-plum)',
            fontSize: '0.88rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Existing celebrations */}
      {celebrations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          {celebrations.map((c) => {
            const members = sites.filter((s) => s.manifest?.celebration?.id === c.id);
            const candidates = sites.filter(
              (s) => s.manifest?.celebration?.id !== c.id,
            );
            return (
              <article
                key={c.id}
                style={{
                  padding: '18px 20px',
                  borderRadius: 'var(--pl-radius-lg)',
                  background: 'var(--pl-cream-card)',
                  border: '1px solid var(--pl-divider)',
                }}
              >
                <header style={{ marginBottom: 12 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: 'var(--pl-font-display, Georgia, serif)',
                      fontStyle: 'italic',
                      fontSize: '1.2rem',
                      color: 'var(--pl-ink)',
                    }}
                  >
                    {c.name}
                  </h3>
                  <div
                    style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.6rem',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-muted)',
                      marginTop: 4,
                    }}
                  >
                    {members.length} {members.length === 1 ? 'site' : 'sites'}
                  </div>
                </header>

                {/* Members */}
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {members.map((s) => (
                    <li
                      key={s.domain}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 'var(--pl-radius-sm)',
                        background: 'color-mix(in oklab, var(--pl-olive) 6%, transparent)',
                      }}
                    >
                      <span style={{ fontSize: '0.88rem', color: 'var(--pl-ink)' }}>
                        {formatSiteDisplayUrl(s.domain, '', normalizeOccasion(s.manifest?.occasion))}
                      </span>
                      <button
                        onClick={() => { void unlinkSite(s.domain); }}
                        disabled={pendingDomain === s.domain}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--pl-radius-sm)',
                          border: '1px solid var(--pl-divider)',
                          background: 'transparent',
                          color: 'var(--pl-plum)',
                          fontSize: '0.72rem',
                          cursor: pendingDomain === s.domain ? 'wait' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Unlink size={11} />
                        Unlink
                      </button>
                    </li>
                  ))}
                </ul>

                {/* Add candidates */}
                {candidates.length > 0 && (
                  <details style={{ marginTop: 10 }}>
                    <summary
                      style={{
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        color: 'var(--pl-olive)',
                        padding: '6px 0',
                        userSelect: 'none',
                      }}
                    >
                      Link another site
                    </summary>
                    <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {candidates.map((s) => (
                        <li
                          key={s.domain}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 'var(--pl-radius-sm)',
                            border: '1px dashed var(--pl-divider)',
                          }}
                        >
                          <span style={{ fontSize: '0.86rem', color: 'var(--pl-ink-soft)' }}>
                            {formatSiteDisplayUrl(s.domain, '', normalizeOccasion(s.manifest?.occasion))}
                            {s.manifest?.celebration?.name && (
                              <span style={{ color: 'var(--pl-muted)', marginLeft: 8, fontSize: '0.72rem' }}>
                                (in {s.manifest.celebration.name})
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => { void linkSite(s.domain, c); }}
                            disabled={pendingDomain === s.domain}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--pl-radius-sm)',
                              border: '1px solid var(--pl-olive)',
                              background: 'color-mix(in oklab, var(--pl-olive) 10%, transparent)',
                              color: 'var(--pl-olive)',
                              fontSize: '0.72rem',
                              cursor: pendingDomain === s.domain ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 600,
                            }}
                          >
                            <Link2 size={11} />
                            Link here
                          </button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Create */}
      <div
        style={{
          padding: '18px 20px',
          borderRadius: 'var(--pl-radius-lg)',
          background: 'var(--pl-cream-card)',
          border: '1px dashed var(--pl-divider)',
          marginBottom: 24,
        }}
      >
        <div
          className="pl-overline"
          style={{ color: 'var(--pl-olive)', marginBottom: 8 }}
        >
          Begin a new celebration
        </div>
        <p
          style={{
            margin: '0 0 10px',
            color: 'var(--pl-muted)',
            fontSize: '0.86rem',
          }}
        >
          Name the weekend, weekend-of, or life event. Your first site joins it
          automatically; link the others below.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={"Emma & James's wedding weekend"}
            maxLength={80}
            style={{
              flex: 1,
              minWidth: 220,
              padding: '9px 12px',
              borderRadius: 'var(--pl-radius-sm)',
              border: '1px solid var(--pl-divider)',
              background: 'var(--pl-cream)',
              color: 'var(--pl-ink)',
              fontSize: '0.92rem',
              fontFamily: 'var(--pl-font-body)',
            }}
          />
          <button
            onClick={() => { void createCelebration(); }}
            disabled={!newName.trim() || pendingDomain !== null || sites.length === 0}
            style={{
              padding: '9px 16px',
              borderRadius: 'var(--pl-radius-full)',
              border: '1px solid var(--pl-ink)',
              background: 'var(--pl-ink)',
              color: 'var(--pl-cream)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor:
                !newName.trim() || pendingDomain !== null
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                !newName.trim() || pendingDomain !== null || sites.length === 0
                  ? 0.55
                  : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Plus size={13} />
            Create
          </button>
        </div>
      </div>

      {/* Unassigned sites — shown for visibility */}
      {unassigned.length > 0 && (
        <div>
          <div
            className="pl-overline"
            style={{ color: 'var(--pl-muted)', marginBottom: 8 }}
          >
            Standalone sites
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {unassigned.map((s) => (
              <li
                key={s.domain}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--pl-radius-sm)',
                  border: '1px solid var(--pl-divider-soft)',
                  background: 'transparent',
                  color: 'var(--pl-ink-soft)',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <RefreshCw size={11} color="var(--pl-muted)" />
                {formatSiteDisplayUrl(s.domain, '', normalizeOccasion(s.manifest?.occasion))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sites.length === 0 && (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: 'var(--pl-muted)',
            fontStyle: 'italic',
            border: '1px dashed var(--pl-divider)',
            borderRadius: 'var(--pl-radius-lg)',
            background: 'var(--pl-cream-card)',
          }}
        >
          No sites yet. Weave one first, then come back to link it.
        </div>
      )}
    </section>
  );
}
