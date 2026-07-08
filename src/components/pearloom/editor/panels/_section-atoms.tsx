'use client';

/* eslint-disable no-restricted-syntax */
/* =========================================================================
   PEARLOOM — SECTION EDITOR PRIMITIVES (literal port of section-fields.jsx)
   Shared atoms used by HeroPanel / StoryPanel / DetailsPanel / SchedulePanel
   / TravelPanel / RegistryPanel / GalleryPanel / RsvpPanel / FaqPanel.
   Every className + inline style here is verbatim from the prototype.
   ========================================================================= */

import { useState, type ReactNode, type CSSProperties } from 'react';
import { Icon, Pear } from '../../motifs';

export function FGroup({
  label,
  hint,
  children,
  action,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{label}</label>
        {action}
      </div>
      {children}
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

export function FInput({
  value,
  onChange,
  placeholder,
  icon,
  type = 'text',
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  icon?: string;
  type?: 'text' | 'email' | 'url' | 'tel' | 'number';
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      {icon && (
        <Icon
          name={icon}
          size={13}
          color={focused ? 'var(--peach-ink)' : 'var(--ink-muted)'}
          style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            transition: 'color 140ms',
          }}
        />
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: icon ? '10px 12px 10px 32px' : '10px 12px',
          borderRadius: 10,
          border: focused ? '1px solid var(--peach-ink)' : '1px solid var(--line)',
          background: 'var(--cream-2)',
          fontSize: 13,
          color: 'var(--ink)',
          outline: 'none',
          transition: 'border-color 140ms, box-shadow 140ms',
          boxShadow: focused ? '0 0 0 3px rgba(198,112,61,0.12)' : 'none',
        }}
      />
    </div>
  );
}

export function FToggle({ label, sub, on, set }: { label: string; sub?: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 11, background: 'var(--cream-2)', border: '1px solid var(--line-soft)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      {/* .pl-hit44 grows the 38×22 pill's TAP target to ≥44px on
          coarse pointers (pearloom.css) — visuals unchanged. */}
      <button onClick={() => set(!on)} className="pl-hit44" role="switch" aria-checked={on} aria-label={label} style={{ width: 38, height: 22, borderRadius: 999, background: on ? 'var(--sage-deep)' : 'var(--cream-3)', position: 'relative', flexShrink: 0, transition: 'background 160ms ease', cursor: 'pointer', border: 'none' }}>
        <span style={{ position: 'absolute', top: 2.5, left: on ? 18.5 : 2.5, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: 'left 160ms cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  );
}

export function Stars({ r, size = 11 }: { r: number; size?: number }) {
  const full = Math.round(r);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={size} color={i <= full ? 'var(--gold)' : 'var(--cream-3)'} />)}
    </span>
  );
}

export function AddCard({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lift"
      style={{ width: '100%', padding: '11px 13px', borderRadius: 11, border: '1.5px dashed var(--line)', background: 'transparent', color: 'var(--ink-soft)', fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, cursor: 'pointer' }}
    >
      <Icon name="plus" size={13} color="var(--ink-soft)" /> {label}
    </button>
  );
}

export function PearChip({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, background: 'var(--peach-bg)', border: '1px solid rgba(198,112,61,0.22)', fontSize: 11.5, fontWeight: 600, color: 'var(--peach-ink)', cursor: 'pointer' }}
    >
      <Pear size={13} tone="sage" shadow={false} /> {children}
    </button>
  );
}

export function FToggleStandalone({ label, sub, def = false, onChange }: { label: string; sub?: string; def?: boolean; onChange?: (next: boolean) => void }) {
  const [on, set] = useState(!!def);
  if (onChange) {
    /* Controlled: defer to parent. */
    return <FToggle label={label} sub={sub} on={def} set={onChange} />;
  }
  return <FToggle label={label} sub={sub} on={on} set={set} />;
}

/* Outer wrapper used by every panel — pl8 className lets the prototype's
   .lift / .btn / .btn-outline / .btn-primary / .btn-sm classes resolve
   (those are scoped under .pl8 in src/app/pearloom.css). */
export function SectionPanelShell({ children }: { children: ReactNode }) {
  return (
    <div className="pl8" style={{ padding: 14 } as CSSProperties}>
      {children}
    </div>
  );
}

/* useCopyOverride — small helper so every section panel can wire
   an eyebrow / label override field in two lines:

     const [eyebrow, setEyebrow] = useCopyOverride(manifest, onChange, 'storyEyebrow');

   Writes through manifest.copy.<key>; empty string clears the key
   so the default voice copy re-takes the slot on the canvas. */
export function useCopyOverride<M>(
  manifest: M,
  onChange: (next: M) => void,
  key: string,
): [string, (v: string) => void] {
  /* manifest doesn't declare `copy` in its typed shape — it's a
     loose overrides bag we add at the renderer's read site. The
     cast preserves all existing fields while exposing copy[]. */
  const loose = manifest as unknown as Record<string, unknown>;
  const copy = (loose.copy as Record<string, string> | undefined) ?? {};
  const value = copy[key] ?? '';
  const setValue = (v: string) => {
    const next = { ...copy };
    if (v.trim()) next[key] = v;
    else delete next[key];
    onChange({ ...loose, copy: next } as unknown as M);
  };
  return [value, setValue];
}

/* FSuggest — free-text input + chip row of curated options below.
   Tapping a chip writes that string to the input (one-tap fill);
   typing still works for anything the chips don't cover. The chip
   that matches the current value gets a "selected" treatment so the
   host can see which canned answer they picked.

   Used across DetailsPanel / SchedulePanel / RegistryPanel / FaqPanel
   / RsvpPanel for fields that have a small set of obvious common
   values (dress code, schedule event names, store names, FAQ
   prompts, meal options). Occasion-aware option sets live in
   _suggestions.ts. */
export function FSuggest({
  value,
  onChange,
  placeholder,
  icon,
  options,
  hint,
  onPick,
  /** When true, chip click APPENDS the option to the input as a
   *  new comma-separated entry instead of replacing the whole
   *  input — useful for fields where the host is building a list
   *  in one text box (e.g. amenities). Default false. */
  append = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: string;
  options: readonly string[];
  hint?: string;
  append?: boolean;
  /** Fires when the host PICKS a suggestion (chip or dropdown) —
   *  not while typing. Lets panels chain autofill (e.g. picking
   *  "Ceremony" pre-fills a typical time). */
  onPick?: (opt: string) => void;
}) {
  /* Show the suggestion chips ONLY when the input is empty (or
     when the field is in append-mode, where every chip adds a new
     entry instead of replacing). Once the host has typed or picked
     a value, hide the chips so the panel reads quieter. */
  const isEmpty = value.trim().length === 0;
  const showChips = options.length > 0 && (append || isEmpty);

  /* ── Type-ahead combobox ─────────────────────────────────────
     As the host TYPES, matching options drop down under the input
     (the chips above only ever showed on an empty field). Arrow
     keys walk the list, Enter picks, Esc dismisses. Skipped in
     append mode — the chips stay the affordance there. */
  const [focused, setFocused] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const q = value.trim().toLowerCase();
  const matches = !append && focused && q.length >= 1
    ? options.filter((o) => {
        const lo = o.toLowerCase();
        return lo !== q && lo.includes(q);
      }).slice(0, 6)
    : [];
  const pick = (opt: string) => {
    onChange(opt);
    onPick?.(opt);
    setCursor(-1);
  };
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 7, position: 'relative' }}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        const next = e.relatedTarget as Node | null;
        if (!next || !e.currentTarget.contains(next)) { setFocused(false); setCursor(-1); }
      }}
      onKeyDown={(e) => {
        if (matches.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (c + 1) % matches.length); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (c <= 0 ? matches.length - 1 : c - 1)); }
        else if (e.key === 'Enter' && cursor >= 0) { e.preventDefault(); pick(matches[cursor]); }
        else if (e.key === 'Escape') { setFocused(false); setCursor(-1); }
      }}
    >
      <div style={{ position: 'relative' }}>
        <FInput value={value} onChange={(v) => { onChange(v); setCursor(-1); }} placeholder={placeholder} icon={icon} />
      {matches.length > 0 && (
        <div
          role="listbox"
          aria-label="Suggestions"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            zIndex: 'var(--z-dropdown, 50)' as unknown as number,
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 10, boxShadow: '0 14px 38px rgba(40,28,12,0.16), 0 4px 12px rgba(40,28,12,0.08)',
            padding: 4, display: 'flex', flexDirection: 'column',
          }}
        >
          {matches.map((opt, i) => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={i === cursor}
              onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
              onMouseEnter={() => setCursor(i)}
              style={{
                textAlign: 'left', padding: '7px 10px', borderRadius: 7,
                background: i === cursor ? 'var(--cream-2)' : 'transparent',
                border: 'none', fontSize: 12.5, color: 'var(--ink)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      </div>
      {showChips && (
        <>
          {hint && (
            <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', lineHeight: 1.4 }}>{hint}</div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  if (append) {
                    const trimmed = value.trim();
                    if (!trimmed) { onChange(opt); return; }
                    /* Don't double-add if the option is already there */
                    const already = trimmed
                      .split(/[,·]/)
                      .map((s) => s.trim().toLowerCase())
                      .includes(opt.toLowerCase());
                    if (already) return;
                    onChange(`${trimmed}, ${opt}`);
                  } else {
                    onChange(opt);
                    onPick?.(opt);
                  }
                }}
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'var(--cream-2)',
                  color: 'var(--ink-soft)',
                  border: '1px solid var(--line)',
                  cursor: 'pointer',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* useSectionHidden — read/write the manifest.hiddenSections array
   for a single section. Renderer reads the same array to skip the
   section on the canvas. Returns [isHidden, setHidden]. */
export function useSectionHidden<M>(
  manifest: M,
  onChange: (next: M) => void,
  section: string,
): [boolean, (next: boolean) => void] {
  const loose = manifest as unknown as Record<string, unknown>;
  const hidden = (Array.isArray(loose.hiddenSections) ? loose.hiddenSections : []) as string[];
  const isHidden = hidden.includes(section);
  const setHidden = (next: boolean) => {
    const list = next
      ? Array.from(new Set([...hidden, section]))
      : hidden.filter((s) => s !== section);
    onChange({ ...loose, hiddenSections: list } as unknown as M);
  };
  return [isHidden, setHidden];
}

/* SectionVisibilityFooter — drop this at the bottom of any section
   panel for a "Hide this on the published site" affordance. Tucks
   into a soft footer below the FGroups so it's findable but never
   competes with the content fields. */
export function SectionVisibilityFooter({
  isHidden, setHidden, sectionLabel,
}: {
  isHidden: boolean;
  setHidden: (next: boolean) => void;
  sectionLabel: string;
}) {
  return (
    <div
      style={{
        marginTop: 4,
        paddingTop: 12,
        borderTop: '1px dashed var(--line-soft)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: isHidden ? 'var(--ink-muted)' : 'var(--ink)' }}>
          {isHidden ? `${sectionLabel} is hidden` : 'Show on the published site'}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 1, lineHeight: 1.4 }}>
          {isHidden
            ? 'Guests won’t see this section. Toggle on to bring it back.'
            : 'Turn off to remove this section from the live site. You can always toggle it back.'}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setHidden(!isHidden)}
        aria-pressed={!isHidden}
        className="pl-hit44"
        style={{
          width: 38, height: 22, borderRadius: 999,
          background: !isHidden ? 'var(--sage-deep)' : 'var(--cream-3)',
          position: 'relative', flexShrink: 0,
          transition: 'background 160ms ease', cursor: 'pointer', border: 'none',
        }}
      >
        <span style={{
          position: 'absolute', top: 2.5,
          left: !isHidden ? 18.5 : 2.5,
          width: 17, height: 17, borderRadius: '50%',
          background: '#fff',
          transition: 'left 160ms cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}
