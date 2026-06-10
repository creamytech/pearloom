'use client';
/* eslint-disable no-restricted-syntax */

/* ============================================================
   NAV MOBILE — 4 drawer variants (Round F).

   Each variant takes the same NavProps shape as the desktop
   nav variants and self-contains its open/close state. They
   share a sticky collapsed top bar (Pear glyph + ellipsed
   headline + hamburger) and differ only in how the panel
   reveals (full-screen overlay / right-edge drawer / bottom
   sheet / floating expanding pill).

   Wired by ThemedSite at sub-md viewport; desktop variants
   handle the rest. ThemedSite integration not in this file.
   ============================================================ */

import React, { useEffect, useState } from 'react';
import { Pear } from '../../motifs';
import { Monogram, deriveInitials } from '../../site/Monogram';

export interface NavItem {
  id: string;
  label: string;
}

export interface NavProps {
  headline: string;
  navItems: NavItem[];
  cta: string;
  onNavClick: (id: string) => void;
  onCtaClick: () => void;
  activeId?: string;
  /** Host's Decor-Library monogram, when set. Replaces the Pear
   *  glyph in the mobile nav header. `solo` marks a single-honoree
   *  site so the headline-derived fallback crests one initial. */
  monogram?: { initials?: string; frame?: import('../../site/Monogram').MonogramFrame; solo?: boolean };
}

/* ---------- shared bits ---------- */

function Hamburger({ onClick, label = 'Open menu' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: 22,
        height: 16,
        padding: 0,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <span style={{ display: 'block', width: '100%', height: 2, background: 'var(--t-ink)', borderRadius: 1 }} />
      <span style={{ display: 'block', width: '100%', height: 2, background: 'var(--t-ink)', borderRadius: 1 }} />
      <span style={{ display: 'block', width: '100%', height: 2, background: 'var(--t-ink)', borderRadius: 1 }} />
    </button>
  );
}

function CloseX({ onClick, label = 'Close menu' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: '1px solid var(--t-line-soft)',
        borderRadius: 999,
        cursor: 'pointer',
        color: 'var(--t-ink)',
        fontSize: 16,
        lineHeight: 1,
        padding: 0,
      }}
    >
      ×
    </button>
  );
}

function TopBar({
  headline,
  open,
  setOpen,
  monogram,
}: {
  headline: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  monogram?: NavProps['monogram'];
}) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--t-paper)',
        padding: '12px 18px',
        borderBottom: '1px solid var(--t-line-soft)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {(() => {
        const typed = monogram?.initials?.trim();
        const hasFrame = monogram?.frame && monogram.frame !== 'none';
        if (typed || hasFrame) {
          let initials = typed;
          if (!initials) {
            /* Solo honoree: one initial, never a phantom '& B'. */
            const { initA, initB } = deriveInitials(headline ?? '', { solo: monogram?.solo });
            initials = initB ? `${initA || 'A'} & ${initB}` : (initA || 'A');
          }
          return (
            <Monogram
              initials={initials}
              frame={(monogram?.frame ?? 'none')}
              size={30}
              withCard={false}
              ariaHidden
            />
          );
        }
        return <Pear size={24} tone="sage" shadow={false} />;
      })()}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: 'center',
          fontFamily: 'var(--t-display)',
          fontSize: 13,
          color: 'var(--t-ink)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          padding: '0 4px',
        }}
      >
        {headline}
      </div>
      <Hamburger onClick={() => setOpen(!open)} label={open ? 'Close menu' : 'Open menu'} />
    </div>
  );
}

/* Esc-to-close hook. */
function useEscClose(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);
}

/* Small fade-in keyframe used by the overlay variant. Inlined
   so this file has no global-CSS dependencies. */
const FADE_KEYFRAMES = `@keyframes pl-navmob-fade { from { opacity: 0 } to { opacity: 1 } }`;
const SLIDE_KEYFRAMES = `@keyframes pl-navmob-slide-x { from { transform: translateX(100%) } to { transform: translateX(0) } }`;
const RISE_KEYFRAMES = `@keyframes pl-navmob-slide-y { from { transform: translateY(100%) } to { transform: translateY(0) } }`;
const POP_KEYFRAMES = `@keyframes pl-navmob-pop { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }`;

/* ============================================================
   (a) NavMobileOverlay — full-screen overlay fade-in.
   ============================================================ */

export function NavMobileOverlay(props: NavProps) {
  const { headline, navItems, cta, onNavClick, onCtaClick, activeId, monogram } = props;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useEscClose(open, close);

  return (
    <>
      <style>{FADE_KEYFRAMES}</style>
      <TopBar headline={headline} open={open} setOpen={setOpen} monogram={monogram} />
      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--t-paper)',
            zIndex: 100,
            animation: 'pl-navmob-fade 220ms ease-out forwards',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'center',
            padding: '40px 20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', justifyContent: 'flex-end', position: 'absolute', top: 16, right: 16 }}
          >
            <CloseX onClick={close} />
          </div>
          <nav
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 18,
              flex: 1,
              justifyContent: 'center',
            }}
          >
            {navItems.map((item) => {
              const active = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavClick(item.id);
                    close();
                  }}
                  style={{
                    textAlign: 'center',
                    fontSize: 28,
                    fontFamily: 'var(--t-display)',
                    color: active ? 'var(--t-accent-ink)' : 'var(--t-ink)',
                    borderBottom: active ? '2px solid var(--t-accent-ink)' : '2px solid transparent',
                    paddingBottom: 4,
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCtaClick();
              close();
            }}
            style={{
              margin: '0 20px',
              padding: '14px 22px',
              background: 'var(--t-accent)',
              color: 'var(--t-accent-ink)',
              border: 'none',
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: 'var(--t-body)',
              cursor: 'pointer',
            }}
          >
            {cta}
          </button>
        </div>
      )}
    </>
  );
}

/* ============================================================
   (b) NavMobileSlideIn — right-edge drawer.
   ============================================================ */

export function NavMobileSlideIn(props: NavProps) {
  const { headline, navItems, cta, onNavClick, onCtaClick, activeId, monogram } = props;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useEscClose(open, close);

  return (
    <>
      <style>{SLIDE_KEYFRAMES}</style>
      <TopBar headline={headline} open={open} setOpen={setOpen} monogram={monogram} />
      {open && (
        <>
          <div
            onClick={close}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              zIndex: 100,
              animation: 'pl-navmob-fade 220ms ease-out forwards',
            }}
          />
          <aside
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: 280,
              height: '100%',
              background: 'var(--t-paper)',
              zIndex: 101,
              padding: 22,
              borderLeft: '1px solid var(--t-line)',
              animation: 'pl-navmob-slide-x 240ms cubic-bezier(0.22,1,0.36,1) forwards',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <CloseX onClick={close} />
            </div>
            <div
              style={{
                fontFamily: 'var(--t-display)',
                fontSize: 22,
                color: 'var(--t-ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {headline}
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 6 }}>
              {navItems.map((item) => {
                const active = activeId === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavClick(item.id);
                      close();
                    }}
                    style={{
                      fontSize: 15,
                      fontFamily: 'var(--t-body)',
                      color: active ? 'var(--t-accent-ink)' : 'var(--t-ink)',
                      borderBottom: active ? '2px solid var(--t-accent-ink)' : '2px solid transparent',
                      paddingBottom: 4,
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>
            <div
              aria-hidden
              style={{
                height: 1,
                background: 'var(--t-line-soft)',
                margin: '12px 0 6px',
              }}
            />
            <div style={{ marginTop: 'auto' }}>
              <button
                type="button"
                onClick={() => {
                  onCtaClick();
                  close();
                }}
                style={{
                  width: '100%',
                  padding: '12px 18px',
                  background: 'var(--t-accent)',
                  color: 'var(--t-accent-ink)',
                  border: 'none',
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--t-body)',
                  cursor: 'pointer',
                }}
              >
                {cta}
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}

/* ============================================================
   (c) NavMobileBottomSheet — slide up from bottom.
   ============================================================ */

export function NavMobileBottomSheet(props: NavProps) {
  const { headline, navItems, cta, onNavClick, onCtaClick, activeId, monogram } = props;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useEscClose(open, close);

  return (
    <>
      <style>{RISE_KEYFRAMES}</style>
      <TopBar headline={headline} open={open} setOpen={setOpen} monogram={monogram} />
      {open && (
        <>
          <div
            onClick={close}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 100,
              animation: 'pl-navmob-fade 220ms ease-out forwards',
            }}
          />
          <div
            role="dialog"
            aria-label="Site navigation"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '70vh',
              background: 'var(--t-paper)',
              zIndex: 101,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              padding: '22px 16px',
              animation: 'pl-navmob-slide-y 280ms cubic-bezier(0.22,1,0.36,1) forwards',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxSizing: 'border-box',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
              overflowY: 'auto',
            }}
          >
            <div
              aria-hidden
              style={{
                width: 36,
                height: 4,
                background: 'var(--t-line)',
                borderRadius: 999,
                margin: '0 auto 6px',
              }}
            />
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {navItems.map((item) => {
                const active = activeId === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onNavClick(item.id);
                      close();
                    }}
                    style={{
                      fontSize: 16,
                      fontFamily: 'var(--t-body)',
                      color: active ? 'var(--t-accent-ink)' : 'var(--t-ink)',
                      borderBottom: active ? '2px solid var(--t-accent-ink)' : '2px solid transparent',
                      paddingBottom: 4,
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </a>
                );
              })}
            </nav>
            <div
              aria-hidden
              style={{
                height: 1,
                background: 'var(--t-line-soft)',
                margin: '8px 0',
              }}
            />
            <button
              type="button"
              onClick={() => {
                onCtaClick();
                close();
              }}
              style={{
                width: '100%',
                padding: '12px 18px',
                background: 'var(--t-accent)',
                color: 'var(--t-accent-ink)',
                border: 'none',
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'var(--t-body)',
                cursor: 'pointer',
              }}
            >
              {cta}
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ============================================================
   (d) NavMobilePill — floating expandable pill.

   Collapsed: a single fixed-bottom-right accent pill ("Menu").
   Expanded: the pill becomes "RSVP →" and a vertical stack of
   pill-shaped section links appears above it, fading in
   staggered. Tapping a section pill fires onNavClick + closes.
   Tapping the expanded RSVP pill fires onCtaClick + closes.
   ============================================================ */

export function NavMobilePill(props: NavProps) {
  const { headline, navItems, cta, onNavClick, onCtaClick, activeId, monogram } = props;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  useEscClose(open, close);

  return (
    <>
      <style>{POP_KEYFRAMES}</style>
      <style>{FADE_KEYFRAMES}</style>
      <TopBar headline={headline} open={open} setOpen={setOpen} monogram={monogram} />
      {open && (
        <div
          onClick={close}
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            background: 'transparent',
            zIndex: 99,
          }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          bottom: 18,
          right: 18,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {open &&
          navItems.map((item, i) => {
            const active = activeId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavClick(item.id);
                  close();
                }}
                style={{
                  pointerEvents: 'auto',
                  padding: '10px 16px',
                  borderRadius: 999,
                  background: active ? 'var(--t-accent-bg)' : 'var(--t-card)',
                  color: active ? 'var(--t-accent-ink)' : 'var(--t-ink)',
                  border: `1px solid ${active ? 'var(--t-accent-ink)' : 'var(--t-line)'}`,
                  fontSize: 14,
                  fontFamily: 'var(--t-body)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
                  opacity: 0,
                  animation: `pl-navmob-pop 200ms ease-out ${i * 30}ms forwards`,
                }}
              >
                {item.label}
              </button>
            );
          })}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (open) {
              onCtaClick();
              close();
            } else {
              setOpen(true);
            }
          }}
          aria-label={open ? cta : 'Open menu'}
          style={{
            pointerEvents: 'auto',
            padding: '12px 18px',
            borderRadius: 999,
            background: 'var(--t-accent)',
            color: 'var(--t-accent-ink)',
            border: 'none',
            fontSize: 14,
            fontFamily: 'var(--t-body)',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {open ? (
            <>
              {cta} <span aria-hidden>→</span>
            </>
          ) : (
            <>
              <span
                aria-hidden
                style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  width: 14,
                  height: 10,
                }}
              >
                <span style={{ display: 'block', height: 2, background: 'var(--t-accent-ink)', borderRadius: 1 }} />
                <span style={{ display: 'block', height: 2, background: 'var(--t-accent-ink)', borderRadius: 1 }} />
                <span style={{ display: 'block', height: 2, background: 'var(--t-accent-ink)', borderRadius: 1 }} />
              </span>
              Menu
            </>
          )}
        </button>
      </div>
    </>
  );
}
