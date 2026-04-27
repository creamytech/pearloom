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
import { useSelectedSite, useUserSites, siteDisplayName, type SiteSummary } from '@/components/marketing/design/dash/hooks';
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

export function DashCommandPalette() {
  const router = useRouter();
  const { sites, selectSite, site: selectedSite } = useSelectedSite();
  const { sites: allSites } = useUserSites();
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
    // Sub-tabs across every section.
    for (const [sectionId, section] of Object.entries(DASH_SECTIONS)) {
      for (const tab of section.tabs) {
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
  }, [allSites, sites, selectedSite, selectSite]);

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

  // Keep activeIdx within bounds when filtered changes.
  useEffect(() => {
    if (activeIdx >= filtered.length) setActiveIdx(Math.max(0, filtered.length - 1));
  }, [filtered, activeIdx]);

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
          background: 'var(--card, #FBF7EE)',
          border: '1px solid var(--card-ring, #D8CFB8)',
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
                const item = filtered[activeIdx];
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
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: 6 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '24px 18px', fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center' }}>
              Nothing matches “{query}”. Try a different word.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const active = idx === activeIdx;
              const inner = (
                <div
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
                    {item.kind === 'site' ? 'Switch' : 'Go'}
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
