'use client';

 
/* LITERAL PORT of handoff/pages/editor-redesign.jsx L56-135 EditorTopbar. */

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Icon, Pear } from '../motifs';
import { PlAvatar, useUserAvatar } from '../avatars';
import type { EditorMode } from './EditorRedesign';
import type { SaveState } from './bridge';
import type { StoryManifest } from '@/types';
import { PublishChecklist } from './PublishChecklist';
import { nextStepFor } from '@/lib/next-step';

interface Props {
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  savedAt: string;
  saveState?: SaveState;
  onPublish: () => void;
  onOpenSettings: () => void;
  displayNames: string;
  /** Manifest passed through to PublishChecklist so the pill can
   *  audit missing fields. Optional — if omitted the checklist
   *  pill is hidden. */
  manifest?: StoryManifest;
  /** Phone-width chrome: mode pills hidden (the device-frame
   *  toggle is meaningless when the viewport IS a phone; Preview
   *  + Publish live in the MobileBottomBar), save dot kept
   *  inline, everything else (Share / Theme / Decor / Settings)
   *  tucked into an ellipsis menu so the bar fits 390px. Desktop
   *  layout is untouched when false. */
  compact?: boolean;
  /** Owner-only Publish — co-hosts can edit but not press. */
  canPublish?: boolean;
  /** Realtime presence — other people with this editor open now. */
  peers?: Array<{ key: string; name: string; email: string; color: string; avatar?: string | null; section?: string | null }>;
  /** Undo/redo — bridge.undo/redo, surfaced as compact icon
   *  buttons on phones (Cmd+Z has no key there). Desktop keeps
   *  the keyboard-only path. */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function EditorTopbar({ mode, setMode, savedAt, saveState = 'saved', onPublish, onOpenSettings, displayNames, manifest, compact = false, canPublish = true, peers = [], onUndo, onRedo, canUndo = false, canRedo = false }: Props) {
  const { data: session } = useSession();
  /* Profile pic was rendering initials from `displayNames` (the
     COUPLE'S names), so the avatar text changed on every keystroke
     while editing names. Switched to the authenticated USER's
     image / name / email — the modal already shows the correct
     user info, so the pill should match. Falls back to the
     prototype gradient pill with email-derived initials when
     user.image isn't set. */
  const sessionUser = session?.user;
  const userImage = sessionUser?.image ?? null;
  const userLabel = sessionUser?.name || sessionUser?.email || 'Account';
  const userInitials = avatarInitials(sessionUser?.name, sessionUser?.email);
  /* The orchard mark — same shared cache the dashboard topbar and
     settings read (mark → photo → initials). The editor previously
     skipped the chain, so a host with a mark saw a different face
     here than everywhere else. */
  const { avatarId } = useUserAvatar();
  const saveLabel = saveState === 'saving' ? 'Saving…'
    : saveState === 'unsaved' ? 'Saving…'
    : saveState === 'error' ? 'Save failed'
    : `Saved ${savedAt}`;
  const saveDot = saveState === 'error' ? 'var(--peach-ink)'
    : saveState === 'saved' ? 'var(--sage)'
    : 'var(--peach-ink)';
  const saveActive = saveState === 'saving' || saveState === 'unsaved';
  /* Compact: hide the "Saved 12:30" text while idle — the dot
     carries the state, the title attr keeps the detail. The label
     comes back the moment a save is in flight or failed. */
  const showSaveLabel = !compact || saveActive || saveState === 'error';

  /* Ellipsis overflow menu (compact only). */
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuWrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  /* Share — opens the Share workspace (link + QR + share kit +
     co-host invites) in the property rail via the same design-jump
     event PublishChecklist uses. The old behavior shared
     window.location.href through the native share sheet — which in
     the editor is the EDITOR url, not the published site, and it
     buried the co-host flow entirely. */
  function shareSite() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block: 'share' } }));
  }
  function inviteCohost() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block: 'cohost' } }));
  }
  function openThemeRail() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:open-theme-rail'));
  }
  function openDecorLibrary() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:open-decor-library'));
  }

  /* Day-of window for the compact overflow menu — the desktop
     GoLiveBadge pill doesn't fit at 390px, which left the day-of
     broadcast feature with no phone entry point during the exact
     week it matters. Same once-per-mount clock sample as the badge
     (React Compiler: no clock reads in render). */
  const [todayMs] = useState(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  });
  const dayOf = compact && manifest ? dayOfWindowFor(manifest, todayMs) : null;

  /* Golden thread — the ONE next-best-action, recomputed from the
     live manifest prop on every change. Desktop only: the compact
     bar is already at capacity at 390px. The topbar has no guest
     counts, so the ladder naturally stops at the manifest rungs
     (cover → date → gallery → story → publish). */
  const nextStep = useMemo(() => (manifest ? nextStepFor(manifest) : null), [manifest]);
  function followThread() {
    if (!nextStep) return;
    if (nextStep.target === 'publish') {
      /* Open the publish flow exactly the way the Publish button does. */
      onPublish();
      return;
    }
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block: nextStep.target } }));
  }

  return (
    <header
      style={{
        gridArea: 'top',
        background: 'var(--cream)',
        borderBottom: '1px solid var(--line-soft)',
        padding: compact ? '0 10px' : '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 8 : 16,
        height: 56,
        position: 'relative',
        zIndex: 5,
      }}
    >
      {/* Left zone — back to dashboard. Prototype L70-76. Compact
          drops the word + the 232px reservation. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: compact ? 0 : 232 }}>
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--ink-soft)', textDecoration: 'none' }}
        >
          <Icon name="chev-left" size={14} />
          <Pear size={20} tone="sage" shadow={false} />
          {!compact && 'Dashboard'}
        </Link>
      </div>

      {/* Center zone — Edit / Preview / Mobile pill. Prototype L79-106.
          Hidden in compact: the device-frame toggle is meaningless
          when the viewport IS a phone, and Preview lives in the
          bottom bar (its exit is the floating pill). Compact shows
          the site's display names instead — a mono-eyebrow so the
          host always knows which site they're editing. */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        {compact && (
          <span
            title={displayNames}
            style={{
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--ink-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {displayNames}
          </span>
        )}
        {!compact && (
        <div
          style={{
            display: 'flex', gap: 2, padding: 3,
            background: 'var(--card)', borderRadius: 999,
            border: '1px solid var(--line-soft)',
          }}
        >
          {([
            { id: 'edit', label: 'Edit', icon: 'brush' },
            { id: 'preview', label: 'Preview', icon: 'eye' },
            { id: 'mobile', label: 'Mobile', icon: 'phone' },
          ] as const).map((m) => {
            const on = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className="pl-rd-mode-pill"
                aria-label={m.label}
                title={m.label}
                style={{
                  padding: '6px 14px', borderRadius: 999,
                  fontSize: 12.5, fontWeight: 600,
                  background: on ? 'var(--ink)' : 'transparent',
                  color: on ? 'var(--cream)' : 'var(--ink-soft)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  border: 0, cursor: 'pointer',
                }}
              >
                <Icon name={m.icon} size={12} color={on ? 'var(--cream)' : 'var(--ink-soft)'} />
                {m.label}
              </button>
            );
          })}
        </div>
        )}
      </div>

      {/* Golden thread chip — quiet pill between the mode pill and
          the right cluster. Names the one next-best-action; tap
          jumps to its panel (or opens the publish flow). Vanishes
          when the ladder is fully threaded. Desktop only. */}
      {!compact && nextStep && (
        <button
          type="button"
          onClick={followThread}
          title={nextStep.hint}
          aria-label={`Next step: ${nextStep.label}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '4px 11px',
            borderRadius: 999,
            background: 'var(--cream-2)',
            border: '1px solid var(--line-soft)',
            color: 'var(--ink-soft)',
            fontSize: 11.5, fontWeight: 600,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'background var(--pl-dur-quick), border-color var(--pl-dur-quick), color var(--pl-dur-quick)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--card)';
            e.currentTarget.style.color = 'var(--ink)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--cream-2)';
            e.currentTarget.style.color = 'var(--ink-soft)';
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--gold, #C19A4B)',
              flexShrink: 0,
            }}
          />
          {nextStep.label}
        </button>
      )}

      {/* Right zone — save state · | · Share · Theme · Decor · Publish · | · avatar.
          Prototype L108-132. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 10 }}>
        {/* Realtime presence — one initial-dot per collaborator
            currently in this editor. Live manifest sync means
            their edits re-weave the canvas as they type. */}
        <button
          type="button"
          onClick={inviteCohost}
          title="Invite a co-host to edit with you"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: compact ? '5px 7px' : '5px 11px', borderRadius: 999,
            background: 'transparent', border: '1px solid var(--line)',
            color: 'var(--ink-soft)', fontSize: 11.5, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Icon name="users" size={13} />
          {!compact && (peers.length > 0 ? 'Invite' : 'Invite a co-host')}
        </button>
        {peers.length > 0 && (
          <div
            aria-label={`Editing together: ${peers.map((p) => p.name).join(', ')}`}
            title={`Editing together: ${peers.map((p) => p.name).join(', ')} — changes sync live`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '3px 9px 3px 7px', borderRadius: 999,
              background: 'var(--sage-tint, rgba(122,138,79,0.12))',
              border: '1px solid rgba(92,107,63,0.22)',
            }}
          >
            {/* live pulse */}
            <span aria-hidden style={{ position: 'relative', width: 7, height: 7, flexShrink: 0 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--sage-deep, #5C6B3F)' }} />
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--sage-deep, #5C6B3F)', animation: 'pl-collab-pulse 1.8s ease-out infinite' }} />
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
              {peers.slice(0, 4).map((p, i) => (
                <span
                  key={p.key}
                  title={p.name + (p.section ? ` · editing ${p.section}` : '')}
                  style={{
                    width: 24, height: 24, borderRadius: '50%',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    background: p.avatar ? 'var(--cream-2, #F5EFE2)' : p.color,
                    color: 'var(--cream, #F5EFE2)',
                    fontSize: 10.5, fontWeight: 700,
                    border: '2px solid var(--card, #FBF7EE)',
                    marginLeft: i === 0 ? 0 : -7,
                  }}
                >
                  {p.avatar
                    ? <PlAvatar id={p.avatar} size={20} />
                    : (p.name || p.email).charAt(0).toUpperCase()}
                </span>
              ))}
            </span>
            {!compact && (
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--sage-deep, #5C6B3F)' }}>
                {peers.length === 1
                  ? `${(peers[0].name || '').split(' ')[0] || 'A co-host'} is editing`
                  : `${peers.length} editing`}
              </span>
            )}
            <style>{`@keyframes pl-collab-pulse{0%{transform:scale(1);opacity:0.55}70%{transform:scale(2.6);opacity:0}100%{opacity:0}}`}</style>
          </div>
        )}
        <div
          aria-live="polite"
          title={saveState === 'error' ? 'Last save attempt failed — next edit will retry.' : `Last saved at ${savedAt}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: saveActive ? '3px 9px' : '3px 0',
            borderRadius: 999,
            background: saveActive ? 'var(--peach-bg)' : 'transparent',
            border: saveActive ? '1px solid rgba(198,112,61,0.18)' : '1px solid transparent',
            fontSize: 11.5,
            color: saveActive ? 'var(--peach-ink)' : 'var(--ink-muted)',
            fontWeight: saveActive ? 600 : 500,
            transition: 'background var(--pl-dur-base) var(--pl-ease-emphasis), padding var(--pl-dur-base), color var(--pl-dur-base)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: saveDot,
              animation: saveActive ? 'pl-dot-pulse 1.4s ease-in-out infinite' : 'none',
              boxShadow: saveActive ? '0 0 0 3px rgba(198,112,61,0.16)' : 'none',
            }}
          />
          {showSaveLabel && saveLabel}
        </div>
        {compact ? (
          <>
            {/* Undo / Redo — Cmd+Z has no key on a phone. Small
                visuals; the .pl-hit44 expander (pearloom.css) grows
                the tap targets to ≥44px on coarse pointers. */}
            {onUndo && onRedo && mode !== 'preview' && (
              <>
                <CompactHistoryButton icon="undo" label="Undo" enabled={canUndo} onClick={onUndo} />
                <CompactHistoryButton icon="redo" label="Redo" enabled={canRedo} onClick={onRedo} />
              </>
            )}
            {/* Compact right zone — ellipsis menu. Publish moved to
                the bottom bar (thumb range beats a tiny top-right
                button); Share / Theme / Decor / Find anything /
                Settings overflow into the menu. GoLiveBadge +
                PublishChecklist pills don't fit at 390px. */}
            <div style={{ position: 'relative' }} ref={menuWrapRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="More actions"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: menuOpen ? 'var(--cream-3)' : 'var(--card)',
                  border: '1px solid var(--line-soft)',
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                }}
              >
                <Icon name="more" size={14} color="var(--ink-soft)" />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="pl8-pop-in"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    zIndex: 'var(--z-dropdown)',
                    minWidth: 180,
                    padding: 4,
                    background: 'var(--card)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    boxShadow: '0 14px 38px rgba(40,28,12,0.16), 0 4px 12px rgba(40,28,12,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <MenuRow icon="share" label="Share" onClick={() => { setMenuOpen(false); shareSite(); }} />
                  <MenuRow icon="palette" label="Theme" onClick={() => { setMenuOpen(false); openThemeRail(); }} />
                  <MenuRow icon="sparkles" label="Decor" onClick={() => { setMenuOpen(false); openDecorLibrary(); }} />
                  {/* Day-of go-live — appears only inside the ±7-day
                      window, same rule as the desktop badge. */}
                  {dayOf && (
                    <MenuRow
                      icon="calendar-check"
                      label={dayOf.isLive ? 'Go live — day-of' : `Day-of · ${dayOf.daysOut}d`}
                      onClick={() => {
                        setMenuOpen(false);
                        try { window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block: 'dayof' } })); } catch { /* noop */ }
                      }}
                    />
                  )}
                  {/* Command palette — desktop finds it via the ⌘K
                      chip; on phones this row is the entry point. */}
                  <MenuRow
                    icon="search"
                    label="Find anything…"
                    onClick={() => {
                      setMenuOpen(false);
                      try { window.dispatchEvent(new CustomEvent('pearloom:command-palette-open')); } catch { /* noop */ }
                    }}
                  />
                  <div style={{ height: 1, background: 'var(--line-soft)', margin: '4px 6px' }} />
                  <MenuRow icon="settings" label={userLabel} onClick={() => { setMenuOpen(false); onOpenSettings(); }} />
                </div>
              )}
            </div>
          </>
        ) : (
          <>
        <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }} />
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={shareSite}
          aria-label="Open the Share panel — link, QR, share kit, co-hosts"
          title="Share — link, QR, share kit, co-host invites"
        >
          <Icon name="share" size={12} /> Share
        </button>
        {/* Theme + Decor quick-access shortcuts — surfacing
            the two most-touched look surfaces near the top so
            hosts don't have to dig through the rail. Theme
            dispatches design-jump with block:'theme' (custom —
            EditorRedesign listens by treating active=null +
            tab='theme'); Decor opens the global drawer. */}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={openThemeRail}
          title="Open theme panel"
        >
          <Icon name="palette" size={12} /> Theme
        </button>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={openDecorLibrary}
          title="Open decor library — motifs, dividers, patterns, monogram"
        >
          <Icon name="sparkles" size={12} /> Decor
        </button>
        {/* Command-palette discoverability — the palette has shipped
            for months behind an unmarked Cmd+K. A visible chip is
            the only way new hosts find it. */}
        <button
          type="button"
          onClick={() => {
            try { window.dispatchEvent(new CustomEvent('pearloom:command-palette-open')); } catch { /* noop */ }
          }}
          title="Jump to any section, theme, or tool"
          aria-label="Open command palette (Cmd+K)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 9px',
            borderRadius: 8,
            border: '1px solid var(--line-soft)',
            background: 'transparent',
            color: 'var(--ink-muted)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <Icon name="search" size={11} />
          <kbd style={{ fontFamily: 'inherit', fontSize: 10.5, letterSpacing: '0.02em' }}>⌘K</kbd>
        </button>
        {manifest && <GoLiveBadge manifest={manifest} />}
        {manifest && canPublish && <PublishChecklist manifest={manifest} />}
        {canPublish && (
          <button type="button" className="btn btn-primary btn-sm pl-pearl-accent" onClick={onPublish}>
            Publish
            <Icon name="arrow-up" size={12} color="var(--cream)" />
          </button>
        )}
        <div style={{ width: 1, height: 18, background: 'var(--line-soft)' }} />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Account settings"
          title={userLabel}
          style={{
            width: 30, height: 30, borderRadius: 999,
            padding: 0,
            background: !avatarId && userImage
              ? `var(--cream-2) center / cover no-repeat url("${userImage.replace(/"/g, '%22')}")`
              : avatarId
                ? 'transparent'
                : 'linear-gradient(135deg, var(--lavender-2), var(--peach-2))',
            border: '1px solid var(--line)',
            cursor: 'pointer',
            color: 'var(--ink)', fontSize: 11, fontWeight: 700,
            display: 'grid', placeItems: 'center',
            overflow: 'hidden',
          }}
        >
          {/* mark → sign-in photo (background) → initials. */}
          {avatarId ? (
            <PlAvatar id={avatarId} size={28} />
          ) : !userImage ? (
            <span>{userInitials}</span>
          ) : null}
        </button>
          </>
        )}
      </div>
    </header>
  );
}

/* CompactHistoryButton — one Undo / Redo icon button in the compact
   topbar. 30px visual (matches the ellipsis button); the .pl-hit44
   expander grows the tap target to ≥44px on coarse pointers. */
function CompactHistoryButton({ icon, label, enabled, onClick }: {
  icon: 'undo' | 'redo';
  label: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="pl-hit44"
      onClick={onClick}
      disabled={!enabled}
      aria-label={label}
      title={label}
      style={{
        width: 30,
        height: 30,
        padding: 0,
        borderRadius: 8,
        background: 'var(--card)',
        border: '1px solid var(--line-soft)',
        display: 'grid',
        placeItems: 'center',
        cursor: enabled ? 'pointer' : 'default',
        opacity: enabled ? 1 : 0.35,
        flexShrink: 0,
      }}
    >
      <Icon name={icon} size={13} color="var(--ink-soft)" />
    </button>
  );
}

/* MenuRow — one row in the compact overflow menu. Mirrors the
   OptionRow shape used by PropertyRail's section-options popover. */
function MenuRow({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '9px 10px',
        background: 'transparent', border: 'none',
        cursor: 'pointer',
        fontSize: 12.5,
        color: 'var(--ink)',
        textAlign: 'left',
        borderRadius: 6,
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--cream-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon name={icon} size={12} color="var(--ink-soft)" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  );
}

/* Pull initials from name (preferred) or email. Email-based initial
   is single-letter, name-based is up to two. */
function avatarInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  if (email) return (email.trim()[0] ?? '?').toUpperCase();
  return '?';
}

/* ─── GoLiveBadge ─────────────────────────────────────────────
   Surfaces the Day-of broadcast feature in the topbar so hosts
   actually find it. Three states based on manifest.logistics.date:
     - Event day (±1): red pulsing dot + "Go live"
     - 1-7 days out:   peach pill "Day-of · 3d"
     - >7 days out / >1 day after: hidden entirely
   Clicking jumps to the dayof tool panel via the existing
   pearloom:design-jump event. */

/* Shared ±7-day window math — the desktop badge and the compact
   overflow-menu row must agree on when day-of surfaces. */
function dayOfWindowFor(
  manifest: StoryManifest,
  todayMs: number,
): { isLive: boolean; daysOut: number } | null {
  const dateStr = manifest.logistics?.date ?? '';
  if (!dateStr.trim()) return null;
  const ms = Date.parse(dateStr);
  if (Number.isNaN(ms)) return null;
  const eventDay = new Date(ms);
  eventDay.setHours(0, 0, 0, 0);
  const daysOut = Math.round((eventDay.getTime() - todayMs) / (1000 * 60 * 60 * 24));
  if (daysOut > 7 || daysOut < -1) return null;
  return { isLive: daysOut <= 0 && daysOut >= -1, daysOut };
}

function GoLiveBadge({ manifest }: { manifest: StoryManifest }) {
  /* "Today" is sampled once per mount (lazy init) — reading the clock
     in render violates the React Compiler contract (the compiler may
     cache the render across time). Once-per-session staleness across
     a midnight boundary is fine for a ±7-day badge. */
  const [todayMs] = useState(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  });
  const win = dayOfWindowFor(manifest, todayMs);
  if (!win) return null;
  const { isLive, daysOut } = win;
  const label = isLive ? 'Go live' : `Day-of · ${daysOut}d`;

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new CustomEvent('pearloom:design-jump', { detail: { block: 'dayof' } }));
      }}
      title={isLive
        ? 'Compose live broadcasts for guests on the day of your event'
        : `${daysOut} day${daysOut === 1 ? '' : 's'} out — draft your day-of broadcasts now`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: isLive ? 'var(--pl-chrome-danger, #A14A2C)' : 'var(--peach-bg)',
        color: isLive ? 'var(--cream)' : 'var(--peach-ink)',
        border: isLive ? 'none' : '1px solid rgba(198,112,61,0.18)',
        fontSize: 11.5, fontWeight: 700,
        cursor: 'pointer',
        transition: 'transform var(--pl-dur-quick)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: isLive ? '#fff' : 'var(--peach-ink)',
        animation: isLive ? 'pl-dot-pulse 1.4s ease-in-out infinite' : 'none',
        boxShadow: isLive ? '0 0 0 3px rgba(255,255,255,0.22)' : 'none',
      }} />
      {label}
    </button>
  );
}
