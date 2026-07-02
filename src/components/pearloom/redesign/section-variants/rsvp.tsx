'use client';
 

import type { CSSProperties, ReactNode } from 'react';
import type { RsvpVariantCtx } from './types';
import { InlineEdit } from '../InlineEdit';

/* Edit-context extension — parity with the default plate variant
   (ThemedSite's RsvpBlock passes all of these):
   - onOpenRsvp carries the editable guard + routes through the
     shared requestRsvp bus, so the canvas never pops the guest
     modal and variants can't drift on a raw event dispatch.
   - socialProof mounts the same "X going" pile the plate shows,
     themed by each variant to its own surface (ring = the surface
     the avatars sit on, ink = the text colour beside them).
   - coverPhoto dresses the split variant's mat with the host's
     real photo instead of a hardcoded gradient. */
export interface RsvpVariantCtxExtended extends RsvpVariantCtx {
  onOpenRsvp?: () => void;
  socialProof?: (ring: string, ink: string) => ReactNode;
  coverPhoto?: string;
}

/* Legacy fallback only — kept so a variant mounted without the
   extended ctx still opens the RSVP flow on published sites. */
function openRsvpFallback() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('pl-open-rsvp'));
}

/* Editable eyebrow/title with the variant's custom styling. */
function EditableEyebrow({ value, onEdit, editable, style }: { value: string; onEdit?: (v: string) => void; editable: boolean; style: CSSProperties }) {
  return (
    <InlineEdit
      as="div"
      value={value}
      onChange={onEdit}
      editable={editable && !!onEdit}
      placeholder="RSVP"
      style={style}
    />
  );
}
function EditableTitle({ value, onEdit, editable, style }: { value: string; onEdit?: (v: string) => void; editable: boolean; style: CSSProperties }) {
  return (
    <InlineEdit
      as="h2"
      value={value}
      onChange={onEdit}
      editable={editable && !!onEdit}
      placeholder="Will you join us?"
      style={style}
    />
  );
}

export function RsvpSplit({ ctx }: { ctx: RsvpVariantCtxExtended }) {
  const { pad, C, cta, editable, onEditEyebrow, onEditTitle } = ctx;
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
          /* The host's cover photo when set; otherwise a mat mixed
             from the site's own accent tokens (the old hardcoded
             lavender gradient ignored the palette entirely). */
          background: ctx.coverPhoto
            ? `var(--t-section) center / cover no-repeat url("${ctx.coverPhoto.replace(/"/g, '%22')}")`
            : 'linear-gradient(135deg, var(--t-accent-bg, var(--t-section)) 0%, color-mix(in oklab, var(--t-accent) 65%, var(--t-accent-bg, var(--t-section))) 100%)',
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
        <EditableEyebrow
          value={C.eyebrow}
          onEdit={onEditEyebrow}
          editable={editable}
          style={{
            fontFamily: 'var(--t-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--t-ink-muted)',
          }}
        />
        <EditableTitle
          value={C.title}
          onEdit={onEditTitle}
          editable={editable}
          style={{
            fontFamily: 'var(--t-display)',
            fontStyle: 'italic',
            fontSize: 36,
            lineHeight: 1.05,
            margin: 0,
            color: 'var(--t-accent-ink, var(--t-ink))',
          }}
        />
        <p style={{ margin: 0, color: 'var(--t-ink-soft)', fontFamily: 'var(--t-body)' }}>
          {C.body}
        </p>
        <div>
          <button
            type="button"
            onClick={ctx.onOpenRsvp ?? openRsvpFallback}
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
        {ctx.socialProof && (
          <div style={{ display: 'flex' }}>
            {ctx.socialProof('var(--t-card)', 'var(--t-ink)')}
          </div>
        )}
      </div>
    </div>
  );
}

export function RsvpBanner({ ctx }: { ctx: RsvpVariantCtxExtended }) {
  const { pad, C, cta, theme, editable, onEditEyebrow, onEditTitle } = ctx;
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
      <div style={{ display: 'grid', gap: 6, flex: 1, minWidth: 280 }}>
        <EditableEyebrow
          value={C.eyebrow}
          onEdit={onEditEyebrow}
          editable={editable}
          style={{
            fontFamily: 'var(--t-mono)',
            fontSize: 11,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: softInk,
          }}
        />
        <EditableTitle
          value={C.title}
          onEdit={onEditTitle}
          editable={editable}
          style={{
            fontFamily: 'var(--t-display)',
            fontSize: 26,
            lineHeight: 1.1,
            margin: 0,
            color: ink,
          }}
        />
        {C.body && (
          <p style={{ margin: 0, fontSize: 13, color: softInk, fontFamily: 'var(--t-body)', maxWidth: 480 }}>
            {C.body}
          </p>
        )}
        {ctx.socialProof && (
          <div style={{ display: 'flex', marginTop: 4 }}>
            {ctx.socialProof(bg, ink)}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={ctx.onOpenRsvp ?? openRsvpFallback}
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

export function RsvpMinimal({ ctx }: { ctx: RsvpVariantCtxExtended }) {
  const { pad, C, cta, editable, onEditEyebrow, onEditTitle } = ctx;
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
      <EditableEyebrow
        value={C.eyebrow}
        onEdit={onEditEyebrow}
        editable={editable}
        style={{
          fontFamily: 'var(--t-mono)',
          fontSize: 11,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--t-ink-muted)',
        }}
      />
      <EditableTitle
        value={C.title}
        onEdit={onEditTitle}
        editable={editable}
        style={{
          fontFamily: 'var(--t-display)',
          fontSize: 28,
          lineHeight: 1.1,
          margin: 0,
          color: 'var(--t-ink)',
        }}
      />
      {C.body ? (
        <p style={{ margin: 0, color: 'var(--t-ink-soft)', fontFamily: 'var(--t-body)', maxWidth: 460 }}>
          {C.body}
        </p>
      ) : null}
      <button
        type="button"
        onClick={ctx.onOpenRsvp ?? openRsvpFallback}
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
      {ctx.socialProof?.('var(--t-section)', 'var(--t-ink)')}
    </div>
  );
}
