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
  label: string;
  hint?: string;
  icon?: string;
  href?: string;
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

  // Build the full item list. Memoised so search filtering is fast.
  const allItems = useMemo<CmdItem[]>(() => {
    const items: CmdItem[] = [];
    // Top-level destinations.
    for (const d of TOP_LEVEL_DESTINATIONS) {
      items.push({ id: d.id, kind: 'nav', label: d.label, icon: d.icon, href: d.href });
    }
    // Sub-tabs across every section — occasion-gated so e.g. a
    // bachelor-party host doesn't see Registry in the switcher.
    for (const [sectionId, section] of Object.entries(DASH_SECTIONS)) {
      for (const tab of section.tabs) {
        if (!isDashSurfaceApplicable(tab.id, selectedSite?.occasion)) continue;
        items.push({
          id: `tab-${sectionId}-${tab.id}`,
          kind: 'nav',
          label: `${section.label} · ${tab.label}`,
          hint: tab.label,
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
          label: group.label ? `${group.label} · ${item.label}` : item.label,
          hint: item.label,
          icon: item.icon,
          href: item.href,
        });
      }
    }
    // The quiet shelf — ⌘K + More tools are its only discovery
    // surfaces, so the trimmed nav doesn't orphan it. Occasion-gated.
    for (const d of DEPROMOTED_DESTINATIONS) {
      if (d.gate && !isDashSurfaceApplicable(d.gate, selectedSite?.occasion)) continue;
      items.push({ id: d.id, kind: 'nav', label: d.label, hint: d.hint, icon: d.icon, href: d.href });
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
      label: 'Subscription & billing',
      hint: 'Manage your plan',
      icon: 'star',
      onSelect: () => {
        openSettingsTab('subscription');
        setOpen(false);
      },
    });
    // Site switcher entries.
    const list = (allSites ?? sites ?? []) as SiteSummary[];
    for (const s of list) {
      const label = siteDisplayName(s);
      const isCurrent = selectedSite?.id === s.id;
      items.push({
        id: `site-${s.id}`,
        kind: 'site',
        label: `Switch to ${label}${isCurrent ? ' (current)' : ''}`,
        hint: s.occasion ?? '',
        icon: 'check',
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
      const hay = `${it.label} ${it.hint ?? ''}`.toLowerCase();
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
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(14,13,11,0.42)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 400, // above modal-tier; this is the highest UI surface
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        // Top-aligned with a safe margin; 12px gutters keep the
        // sheet ≥ calc(100vw - 24px) wide on phones.
        padding: 'clamp(32px, 8vh, 120px) 12px 16px',
        animation: 'pl8-dash-page-enter 280ms cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        style={{
          width: 'min(640px, 100%)',
          background: 'var(--pl-glass)',
        backgroundImage: 'var(--pl-glass-sheen)',
          backdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          WebkitBackdropFilter: 'var(--pl-glass-blur, blur(18px) saturate(1.4))',
          border: '1px solid var(--pl-glass-border)',
          borderRadius: 16,
          boxShadow: '0 32px 64px rgba(14,13,11,0.32), 0 8px 16px rgba(14,13,11,0.16)',
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
            placeholder="Jump to a tab, switch sites, or run a command…"
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
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.18em',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
          }}>
            Esc
          </span>
        </div>
        {/* dvh clamp keeps the footer + a few rows on short phone
            viewports (keyboard up) instead of overflowing. */}
        <div role="listbox" aria-label="Command results" style={{ maxHeight: 'min(420px, 62dvh)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 6 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 18px', fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center' }}>
              Nothing matches “{query}”. Try a different word.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const active = idx === safeActiveIdx;
              const inner = (
                <div
                  role="option"
                  aria-selected={active}
                  aria-current={active ? 'true' : undefined}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => onPick(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    minHeight: 44, // touch-sized rows
                    boxSizing: 'border-box',
                    borderRadius: 10,
                    background: active ? 'var(--cream-2, #FBF7EE)' : 'transparent',
                    border: active ? '1.5px solid var(--ink, #0E0D0B)' : '1.5px solid transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    color: 'var(--ink)',
                    // Keyboard navigation glides between rows instead
                    // of snapping (arrow keys move `active` fast).
                    transition: 'background var(--pl-dur-subtle, 120ms) var(--pl-ease-out, ease), border-color var(--pl-dur-subtle, 120ms) var(--pl-ease-out, ease)',
                  }}
                >
                  <Icon name={item.icon ?? 'sparkles'} size={14} color="var(--peach-ink, #C6703D)" />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                  }}>
                    {item.kind === 'site' ? 'Switch' : item.kind === 'action' ? 'Open' : 'Go'}
                  </span>
                </div>
              );
              return item.href && !item.onSelect ? (
                <Link key={item.id} href={item.href} prefetch onClick={() => setOpen(false)} style={{ textDecoration: 'none', display: 'block' }}>
                  {inner}
                </Link>
              ) : (
                <div key={item.id}>{inner}</div>
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
