'use client';
/* eslint-disable no-restricted-syntax */

import type { RsvpVariantCtx } from './types';

function openRsvp() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('pl-open-rsvp'));
}

export function RsvpSplit({ ctx }: { ctx: RsvpVariantCtx }) {
  const { pad, C, cta } = ctx;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          background: 'linear-gradient(135deg, #c8b6e8 0%, #9b88c9 100%)',
          minHeight: 240,
        }}
      />
      <div
        style={{
          padding: `${52 * pad}px 44px`,
          display: 'grid',
          alignContent: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--t-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--t-ink-muted)',
          }}
        >
          {C.eyebrow}
        </div>
        <h2
          style={{
            fontFamily: 'var(--t-display)',
            fontStyle: 'italic',
            fontSize: 36,
            lineHeight: 1.05,
            margin: 0,
            color: 'var(--t-accent-ink, var(--t-ink))',
          }}
        >
          {C.title}
        </h2>
        <p style={{ margin: 0, color: 'var(--t-ink-soft)', fontFamily: 'var(--t-body)' }}>
          {C.body}
        </p>
        <div>
          <button
            type="button"
            onClick={openRsvp}
            style={{
              background: 'var(--t-accent)',
              color: 'var(--t-accent-ink)',
              padding: '13px 26px',
              borderRadius: 999,
              border: 'none',
              fontFamily: 'var(--t-body)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cta}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RsvpBanner({ ctx }: { ctx: RsvpVariantCtx }) {
  const { pad, C, cta, theme } = ctx;
  const foil = !!theme?.foil;
  const bg = foil ? 'var(--t-foil)' : 'var(--t-section-deep)';
  const ink = foil ? '#1a1410' : 'var(--t-ink)';
  const softInk = foil ? 'rgba(26,20,16,0.7)' : 'var(--t-ink-muted)';
  return (
    <div
      style={{
        background: bg,
        padding: `${28 * pad}px 40px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        flexWrap: 'wrap',
        borderRadius: 'var(--t-radius)',
        border: foil ? 'none' : '1px solid var(--t-line)',
      }}
    >
      <div style={{ display: 'grid', gap: 6 }}>
        <div
          style={{
            fontFamily: 'var(--t-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: softInk,
          }}
        >
          {C.eyebrow}
        </div>
        <div
          style={{
            fontFamily: 'var(--t-display)',
            fontSize: 26,
            lineHeight: 1.1,
            color: ink,
          }}
        >
          {C.title}
        </div>
      </div>
      <button
        type="button"
        onClick={openRsvp}
        style={{
          background: foil ? '#1a1410' : 'var(--t-accent)',
          color: foil ? '#f5efe2' : 'var(--t-accent-ink)',
          padding: '12px 24px',
          borderRadius: 999,
          border: 'none',
          fontFamily: 'var(--t-body)',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {cta}
      </button>
    </div>
  );
}

export function RsvpMinimal({ ctx }: { ctx: RsvpVariantCtx }) {
  const { pad, C, cta } = ctx;
  return (
    <div
      style={{
        background: 'var(--t-section)',
        padding: `${56 * pad}px 40px`,
        textAlign: 'center',
        display: 'grid',
        gap: 14,
        justifyItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--t-mono)',
          fontSize: 11,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--t-ink-muted)',
        }}
      >
        {C.eyebrow}
      </div>
      <h2
        style={{
          fontFamily: 'var(--t-display)',
          fontSize: 28,
          lineHeight: 1.1,
          margin: 0,
          color: 'var(--t-ink)',
        }}
      >
        {C.title}
      </h2>
      {C.body ? (
        <p style={{ margin: 0, color: 'var(--t-ink-soft)', fontFamily: 'var(--t-body)', maxWidth: 460 }}>
          {C.body}
        </p>
      ) : null}
      <button
        type="button"
        onClick={openRsvp}
        style={{
          background: 'var(--t-accent)',
          color: 'var(--t-accent-ink)',
          padding: '10px 22px',
          borderRadius: 999,
          border: 'none',
          fontFamily: 'var(--t-body)',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {cta}
      </button>
    </div>
  );
}
