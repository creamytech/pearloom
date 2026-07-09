'use client';

// ─────────────────────────────────────────────────────────────
// DashCommandPalette — Cmd+K (Ctrl+K on Windows) opens a
// dashboard-wide quick switcher. Lists every nav destination,
// sub-tab, and the user's sites; fuzzy-matches as the host
// types; Enter executes; Esc closes.
//
// Mounted once globally inside ShellPersistentLayout so every
// (shell) route gets it. Stay-on-Cmd+K is a power-user
// affordance that turns the dashboard from "click through
// menus" into "type and go."
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { DASH_SECTIONS, DASH_NAV_GROUPS } from './DashShell';
import { useUserSettings } from './UserSettingsModal';
import { useSelectedSite, useUserSites, siteDisplayName, type SiteSummary } from '@/components/marketing/design/dash/hooks';
import { isDashSurfaceApplicable } from '@/lib/event-os/dashboard-applicability';
import { Icon } from '../motifs';
import { toggleAskPear } from './DashAskPear';

interface CmdItem {
  id: string;
  kind: 'nav' | 'site' | 'action';
  /** Mono-caps section eyebrow the row renders under. Items are
   *  pushed group-contiguously; the renderer draws a header at
   *  every group change. */
  group: string;
  label: string;
  hint?: string;
  icon?: string;
  href?: string;
  /** The currently-selected site (gold pearl marker). */
  current?: boolean;
  onSelect?: () => void;
}

const TOP_LEVEL_DESTINATIONS: Array<{ id: string; label: string; icon: string; href: string }> = [
  { id: 'nav-home',     label: 'Home',     icon: 'home',       href: '/dashboard' },
  { id: 'nav-site',     label: 'Site',     icon: 'layout',     href: '/dashboard/event' },
  { id: 'nav-guests',   label: 'Guests',   icon: 'users',      href: '/dashboard/rsvp' },
  { id: 'nav-day',      label: 'Day',      icon: 'clock',      href: '/dashboard/day-of' },
  { id: 'nav-studio',   label: 'Studio',   icon: 'sparkles',   href: '/dashboard/invite' },
  { id: 'nav-memory',   label: 'Memory',   icon: 'heart-icon', href: '/dashboard/keepsakes' },
  { id: 'nav-settings', label: 'Settings', icon: 'settings',   href: '/dashboard/profile' },
];

/** THE QUIET SHELF — routes no sidebar item or sub-nav tab
 *  carries. ⌘K and the More-tools grid read this one list; the
 *  contextual doors (NeedsYouNow → Pear's review, the Studio Tone
 *  rail → Pear's voice) are the in-flow paths. `gate` keys into
 *  dashboard-applicability so occasion-shaped tools hide for
 *  events they don't fit.
 *
 *  The rule (ATELIER DR.3): a route lives here ONLY if the nav
 *  doesn't carry it — the palette indexes the sidebar + sub-nav
 *  directly (DASH_NAV_GROUPS / DASH_SECTIONS below), so anything
 *  double-listed shows twice in ⌘K. Analytics / Help / Music /
 *  Passport cards / QR poster left this list when the sidebar
 *  picked them up; Guest threads left when the Guests sub-nav
 *  gained its Threads tab. */
export const DEPROMOTED_DESTINATIONS: Array<{
  id: string;
  label: string;
  hint: string;
  icon: string;
  href: string;
  gate?: string;
}> = [
  { id: 'tool-cadence',    label: 'Send timeline',    hint: 'Save-the-dates & reminders', icon: 'bell',    href: '/dashboard/cadence', gate: 'cadence' },
  { id: 'tool-director',   label: 'The Director',     hint: 'Pear plans with you',       icon: 'sparkles', href: '/dashboard/director', gate: 'director' },
  { id: 'tool-review',     label: "Pear's review",    hint: 'Duplicates, VIPs, gaps',    icon: 'check',    href: '/dashboard/guest-review' },
  { id: 'tool-voice',      label: "Pear's voice",     hint: 'Train Pear on your tone',   icon: 'mic',      href: '/dashboard/voice' },
];

export function DashCommandPalette() {
  const router = useRouter();
  const { sites, selectSite, site: selectedSite } = useSelectedSite();
  const { sites: allSites } = useUserSites();
  const { openTab: openSettingsTab } = useUserSettings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  // Trap Tab inside the palette while open; restore focus to the
  // trigger (topbar search button / whatever had focus) on close.
  // The search input keeps first focus via autoFocus.
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Global Cmd+K / Ctrl+K hotkey + the topbar search button
  // (dispatches `pl-open-command`).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setActiveIdx(0);
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    }
    function onOpenEvent() {
      setOpen(true);
      setQuery('');
      setActiveIdx(0);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('pl-open-command', onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pl-open-command', onOpenEvent);
    };
  }, [open]);

  // Build the full item list, group-contiguously (the renderer draws
  // a mono eyebrow at every group boundary). Memoised so search
  // filtering is fast.
  const allItems = useMemo<CmdItem[]>(() => {
    const items: CmdItem[] = [];
    // Top-level destinations.
    for (const d of TOP_LEVEL_DESTINATIONS) {
      items.push({ id: d.id, kind: 'nav', group: 'Go to', label: d.label, icon: d.icon, href: d.href });
    }
    // Sub-tabs across every section — occasion-gated so e.g. a
    // bachelor-party host doesn't see Registry in the switcher.
    // Clean label + the section as a quiet hint (was "Site · My
    // sites", which read as duplicate noise in a flat list).
    for (const [sectionId, section] of Object.entries(DASH_SECTIONS)) {
      for (const tab of section.tabs) {
        if (!isDashSurfaceApplicable(tab.id, selectedSite?.occasion)) continue;
        items.push({
          id: `tab-${sectionId}-${tab.id}`,
          kind: 'nav',
          group: 'This event',
          label: tab.label,
          hint: section.label,
          icon: 'sparkles',
          href: tab.href,
        });
      }
    }
    // Sidebar destinations the two lists above don't already
    // carry (Budget, Circle, Music, the Keepsakes trio…) — the
    // palette must find everything the sidebar can reach. Deduped
    // by href so the section anchors don't triple-list.
    const seenHrefs = new Set(items.map((it) => it.href).filter(Boolean));
    for (const group of DASH_NAV_GROUPS) {
      for (const item of group.items) {
        if (seenHrefs.has(item.href)) continue;
        seenHrefs.add(item.href);
        items.push({
          id: `side-${group.id}-${item.id}`,
          kind: 'nav',
          group: 'This event',
          label: item.label,
          hint: group.label || undefined,
          icon: item.icon,
          href: item.href,
        });
      }
    }
    // The quiet shelf — ⌘K + More tools are its only discovery
    // surfaces, so the trimmed nav doesn't orphan it. Occasion-gated.
    for (const d of DEPROMOTED_DESTINATIONS) {
      if (d.gate && !isDashSurfaceApplicable(d.gate, selectedSite?.occasion)) continue;
      items.push({ id: d.id, kind: 'nav', group: 'Tools', label: d.label, hint: d.hint, icon: d.icon, href: d.href });
    }
    // "Settings" always routes to the settings PAGE (one word, one
    // destination — the nav-settings entry above covers it). The
    // modal keeps only its clearly-named quick views: billing and
    // usage.
    /* Ask Pear's help-desk sheet — on phones the palette is the ONE
       pear door (the mobile bar's duplicate circle was cut in the
       2026-07-08 nav rework), so the sheet lives one row inside. */
    items.push({
      id: 'action-ask-pear',
      kind: 'action',
      group: 'Pear & account',
      label: 'Ask Pear a question',
      hint: 'The help desk, advice on your event',
      icon: 'sparkles',
      onSelect: () => {
        setOpen(false);
        toggleAskPear();
      },
    });
    items.push({
      id: 'action-settings-usage',
      kind: 'action',
      group: 'Pear & account',
      label: 'Usage & credits',
      hint: 'Pear AI credits',
      icon: 'sparkles',
      onSelect: () => {
        openSettingsTab('usage');
        setOpen(false);
      },
    });
    items.push({
      id: 'action-settings-subscription',
      kind: 'action',
      group: 'Pear & account',
      label: 'Subscription & billing',
      hint: 'Manage your plan',
      icon: 'star',
      onSelect: () => {
        openSettingsTab('subscription');
        setOpen(false);
      },
    });
    // Site switcher entries — the group header says "switch";
    // the row carries the site's own name.
    const list = (allSites ?? sites ?? []) as SiteSummary[];
    for (const s of list) {
      const label = siteDisplayName(s);
      const isCurrent = selectedSite?.id === s.id;
      items.push({
        id: `site-${s.id}`,
        kind: 'site',
        group: 'Switch site',
        label,
        hint: s.occasion ?? '',
        icon: 'layout',
        current: isCurrent,
        onSelect: () => {
          selectSite(s.id);
          setOpen(false);
        },
      });
    }
    return items;
  }, [allSites, sites, selectedSite, selectSite, openSettingsTab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter((it) => {
      const hay = `${it.label} ${it.hint ?? ''} ${it.group}`.toLowerCase();
      // Loose fuzzy: every token in q must appear (in order) somewhere.
      let lastIdx = -1;
      for (const tok of q.split(/\s+/)) {
        const idx = hay.indexOf(tok, lastIdx + 1);
        if (idx === -1) return false;
        lastIdx = idx;
      }
      return true;
    }).slice(0, 50);
  }, [allItems, query]);

  // Clamp activeIdx at read time instead of mirroring it via
  // an effect (was a setState-in-effect cascade). Storing a
  // clamped value would diverge from the user's intent if
  // filtered shrinks-and-grows; reading clamped is correct
  // and pure.
  const safeActiveIdx = Math.min(activeIdx, Math.max(0, filtered.length - 1));

  const onArrow = useCallback((direction: 1 | -1) => {
    setActiveIdx((i) => {
      const n = filtered.length;
      if (n === 0) return 0;
      return (i + direction + n) % n;
    });
  }, [filtered.length]);

  const onPick = useCallback((item: CmdItem) => {
    if (item.onSelect) item.onSelect();
    else if (item.href) {
      router.push(item.href);
      setOpen(false);
    }
  }, [router]);

  useFocusTrap(open, dialogRef);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="pl-modal-veil"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,16,8,0.42)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 400, // above modal-tier; this is the highest UI surface
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        // Top-aligned with a safe margin; 12px gutters keep the
        // sheet ≥ calc(100vw - 24px) wide on phones.
        padding: 'clamp(32px, 8vh, 120px) 12px 16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="pl-modal-card"
        style={{
          width: 'min(640px, 100%)',
          background: 'var(--pl-glass)',
          backgroundImage: 'var(--pl-glass-sheen)',
          backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          border: '1px solid var(--pl-glass-border)',
          borderRadius: 18,
          boxShadow: '0 40px 90px -20px rgba(20,16,8,0.45), 0 8px 20px rgba(20,16,8,0.14)',
          overflow: 'hidden',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
          }}
        >
          <Icon name="search" size={16} color="var(--ink-muted)" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); onArrow(1); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); onArrow(-1); }
              else if (e.key === 'Enter') {
                e.preventDefault();
                const item = filtered[safeActiveIdx];
                if (item) onPick(item);
              }
            }}
            placeholder="Jump to a page, switch sites, or ask Pear…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 16,
              color: 'var(--ink)',
              fontFamily: 'inherit',
            }}
          />
          <span
            style={{
              fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--gold-ink, #8A6A2E)',
              padding: '3px 7px',
              borderRadius: 5,
              background: 'rgba(193, 154, 75, 0.14)',
              border: '1px solid rgba(193, 154, 75, 0.28)',
            }}
          >
            Esc
          </span>
        </div>
        {/* dvh clamp keeps the footer + a few rows on short phone
            viewports (keyboard up) instead of overflowing. */}
        <div role="listbox" aria-label="Command results" style={{ maxHeight: 'min(440px, 62dvh)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 8px 8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 18px', fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center' }}>
              Nothing matches “{query}”. Try a different word.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const active = idx === safeActiveIdx;
              // Items arrive group-contiguously: a mono eyebrow marks
              // every boundary (the flat run of rows read as an
              // undesigned list).
              const groupStart = idx === 0 || filtered[idx - 1].group !== item.group;
              const inner = (
                <div
                  role="option"
                  aria-selected={active}
                  aria-current={active ? 'true' : undefined}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => onPick(item)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    padding: '10px 12px 10px 14px',
                    minHeight: 44, // touch-sized rows
                    boxSizing: 'border-box',
                    borderRadius: 10,
                    // Soft settle, not a hard ring — the previous
                    // 1.5px ink border read as a harsh outline.
                    background: active ? 'color-mix(in oklab, var(--pl-olive, #5C6B3F) 9%, var(--cream-2, #FBF7EE))' : 'transparent',
                    boxShadow: active ? 'inset 0 0 0 1px color-mix(in oklab, var(--pl-olive, #5C6B3F) 22%, transparent)' : 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    color: 'var(--ink)',
                    // Keyboard navigation glides between rows instead
                    // of snapping (arrow keys move `active` fast).
                    transition: 'background var(--pl-dur-subtle, 120ms) var(--pl-ease-out, ease), box-shadow var(--pl-dur-subtle, 120ms) var(--pl-ease-out, ease)',
                  }}
                >
                  {/* The thread rail — the two-strand hover language the
                      sidebar already speaks, drawn on the active row. */}
                  {active && (
                    <span
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 4,
                        top: 9,
                        bottom: 9,
                        width: 2,
                        borderRadius: 2,
                        background: 'linear-gradient(180deg, var(--pl-olive, #5C6B3F), var(--pl-gold, #C19A4B))',
                      }}
                    />
                  )}
                  <Icon name={item.icon ?? 'sparkles'} size={14} color={active ? 'var(--peach-ink, #C6703D)' : 'var(--ink-muted, #8A8275)'} />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                    {item.hint && (
                      <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--ink-muted)', marginLeft: 8 }}>
                        {item.hint}
                      </span>
                    )}
                  </span>
                  {/* The current site wears the gold pearl. */}
                  {item.current && (
                    <span
                      aria-label="Current site"
                      style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--pl-gold, #C19A4B)', boxShadow: '0 0 0 1.5px var(--cream, #FDFAF0)', flexShrink: 0 }}
                    />
                  )}
                  {/* One quiet return hint on the active row — the old
                      per-row GO/SWITCH/OPEN column was pure noise. */}
                  {active && (
                    <span
                      aria-hidden
                      style={{
                        fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                        fontSize: 10,
                        color: 'var(--gold-ink, #8A6A2E)',
                        padding: '2px 6px',
                        borderRadius: 5,
                        background: 'rgba(193, 154, 75, 0.14)',
                        border: '1px solid rgba(193, 154, 75, 0.28)',
                        flexShrink: 0,
                      }}
                    >
                      ↵
                    </span>
                  )}
                </div>
              );
              const row = item.href && !item.onSelect ? (
                <Link href={item.href} prefetch onClick={() => setOpen(false)} style={{ textDecoration: 'none', display: 'block' }}>
                  {inner}
                </Link>
              ) : (
                inner
              );
              return (
                <div key={item.id}>
                  {groupStart && (
                    <div
                      aria-hidden
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: idx === 0 ? '8px 14px 6px' : '16px 14px 6px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
                          fontSize: 9.5,
                          fontWeight: 600,
                          letterSpacing: '0.22em',
                          textTransform: 'uppercase',
                          color: 'var(--ink-muted, #8A8275)',
                          flexShrink: 0,
                        }}
                      >
                        {item.group}
                      </span>
                      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, color-mix(in oklab, var(--pl-gold, #C19A4B) 38%, transparent), transparent)' }} />
                    </div>
                  )}
                  {row}
                </div>
              );
            })
          )}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
            fontSize: 11,
            color: 'var(--ink-muted)',
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            letterSpacing: '0.04em',
          }}
        >
          <span>↑ ↓ navigate · ↵ go</span>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
