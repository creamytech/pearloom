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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DASH_SECTIONS } from './DashShell';
import { useUserSettings } from './UserSettingsModal';
import { useSelectedSite, useUserSites, siteDisplayName, type SiteSummary } from '@/components/marketing/design/dash/hooks';
import { isDashSurfaceApplicable } from '@/lib/event-os/dashboard-applicability';
import { Icon } from '../motifs';

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

/** The routes de-promoted from the sidebar in the 22→10 nav trim.
 *  They were always meant to live here in ⌘K — this list is the
 *  discovery surface. `gate` keys into dashboard-applicability so
 *  occasion-shaped tools hide for events they don't fit. */
const DEPROMOTED_DESTINATIONS: Array<{
  id: string;
  label: string;
  hint: string;
  icon: string;
  href: string;
  gate?: string;
}> = [
  { id: 'tool-analytics',  label: 'Analytics',        hint: 'Visits & sections',         icon: 'eye',      href: '/dashboard/analytics' },
  { id: 'tool-bridge',     label: 'The bridge',       hint: 'Every guest thread',        icon: 'users',    href: '/dashboard/bridge' },
  { id: 'tool-cadence',    label: 'Send timeline',    hint: 'Save-the-dates & reminders', icon: 'bell',    href: '/dashboard/cadence' },
  { id: 'tool-director',   label: 'The Director',     hint: 'Pear plans with you',       icon: 'sparkles', href: '/dashboard/director' },
  { id: 'tool-gallery',    label: 'The Reel',         hint: 'Every photo, all sites',    icon: 'image',    href: '/dashboard/gallery' },
  { id: 'tool-review',     label: "Pear's review",    hint: 'Duplicates, VIPs, gaps',    icon: 'check',    href: '/dashboard/guest-review' },
  { id: 'tool-help',       label: 'Help & docs',      hint: 'Shortcuts & answers',       icon: 'heart-icon', href: '/dashboard/help' },
  { id: 'tool-music',      label: 'Music',            hint: 'Guest song requests',       icon: 'music',    href: '/dashboard/music', gate: 'music' },
  { id: 'tool-passport',   label: 'Passport cards',   hint: 'Printable guest QR cards',  icon: 'gift',     href: '/dashboard/passport-cards' },
  { id: 'tool-payments',   label: 'Gifts & payments', hint: 'Stripe feed',               icon: 'gift',     href: '/dashboard/payments' },
  { id: 'tool-print',      label: 'Print orders',     hint: 'Pearloom Print tracking',   icon: 'mail',     href: '/dashboard/print' },
  { id: 'tool-qr',         label: 'QR poster',        hint: 'Welcome-table scan sign',   icon: 'image',    href: '/dashboard/qr-poster' },
  { id: 'tool-voice',      label: "Pear's voice",     hint: 'Train Pear on your tone',   icon: 'mic',      href: '/dashboard/voice' },
  { id: 'tool-weekend',    label: 'Weekend builder',  hint: 'Linked multi-event sites',  icon: 'calendar', href: '/dashboard/weekend', gate: 'weekend' },
];

export function DashCommandPalette() {
  const router = useRouter();
  const { sites, selectSite, site: selectedSite } = useSelectedSite();
  const { sites: allSites } = useUserSites();
  const { openTab: openSettingsTab } = useUserSettings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  // Global Cmd+K / Ctrl+K hotkey.
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
    // The de-promoted tools — ⌘K is their only discovery surface,
    // so the trimmed sidebar doesn't orphan them. Occasion-gated.
    for (const d of DEPROMOTED_DESTINATIONS) {
      if (d.gate && !isDashSurfaceApplicable(d.gate, selectedSite?.occasion)) continue;
      items.push({ id: d.id, kind: 'nav', label: d.label, hint: d.hint, icon: d.icon, href: d.href });
    }
    // Settings modal entries — opens the in-shell modal rather
    // than routing to a page. Mirrors the four tabs.
    items.push({
      id: 'action-settings-account',
      kind: 'action',
      label: 'Open settings',
      hint: 'Account',
      icon: 'user',
      onSelect: () => {
        openSettingsTab('account');
        setOpen(false);
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
    items.push({
      id: 'action-settings-preferences',
      kind: 'action',
      label: 'Preferences',
      hint: 'Theme, voice, quiet hours',
      icon: 'settings',
      onSelect: () => {
        openSettingsTab('preferences');
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

  if (!open) return null;

  return (
    <div
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
        padding: 'clamp(48px, 8vh, 120px) 16px 16px',
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
        <div role="listbox" aria-label="Command results" style={{ maxHeight: 420, overflowY: 'auto', padding: 6 }}>
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
                    borderRadius: 10,
                    background: active ? 'var(--cream-2, #FBF7EE)' : 'transparent',
                    border: active ? '1.5px solid var(--ink, #0E0D0B)' : '1.5px solid transparent',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    color: 'var(--ink)',
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
