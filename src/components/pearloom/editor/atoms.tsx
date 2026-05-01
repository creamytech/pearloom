'use client';

/* ========================================================================
   PEARLOOM EDITOR — v8 form atoms
   Shared form primitives used by every block panel:
     Field, TextInput, TextArea, DateInput, TimeInput, Select,
     ColorSwatchRow, Toggle, NumberInput, PhotoSlot, ListRow, etc.
   ======================================================================== */

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import dynamic from 'next/dynamic';
import { Icon } from '../motifs';
import { CustomSelect } from './v8-forms';

/* ---------- PanelGroup ----------
 *  Opt-in wrapper that gives nested PanelSections positional
 *  awareness. Inside a PanelGroup, the FIRST PanelSection defaults
 *  to open and the rest default to closed — collapsed-by-default
 *  reduces the "wall of fields" overwhelm without forcing every
 *  panel author to mark sections individually.
 *
 *  Outside a PanelGroup, PanelSection keeps its legacy
 *  default-everything-open behaviour for backwards compatibility.
 */
interface PanelGroupContextValue {
  /** Registers a section and returns its 1-indexed position. */
  register: () => number;
}
const PanelGroupContext = createContext<PanelGroupContextValue | null>(null);

export function PanelGroup({ children }: { children: ReactNode }) {
  const counter = useRef(0);
  const value = useMemo<PanelGroupContextValue>(
    () => ({ register: () => (counter.current += 1) }),
    [],
  );
  return <PanelGroupContext.Provider value={value}>{children}</PanelGroupContext.Provider>;
}

/* ---------- PanelSearch ----------
 *  Wraps a tree of PanelSections with a live filter input. When the
 *  user types, every PanelSection inside the provider checks its
 *  label + hint against the query and hides itself if neither
 *  matches. The Theme tab is the main beneficiary — 12 sections
 *  long, previously required scrolling to find anything.
 *
 *  Sections with no label always render (decorative groupings, the
 *  search itself). Auto-expands matching collapsed sections so the
 *  field the user typed for is visible at a glance.
 */
interface PanelSearchContextValue {
  query: string;
}
const PanelSearchContext = createContext<PanelSearchContextValue>({ query: '' });

export function PanelSearch({
  placeholder = 'Search palette, fonts, decor…',
  children,
}: {
  placeholder?: string;
  children: ReactNode;
}) {
  const [query, setQuery] = useState('');
  return (
    <PanelSearchContext.Provider value={{ query }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: 'var(--cream)',
          padding: '0 0 16px',
          marginBottom: 4,
        }}
      >
        <div style={{ position: 'relative' }}>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-muted)',
              display: 'inline-flex',
              pointerEvents: 'none',
            }}
          >
            <Icon name="search" size={14} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl8-input"
            style={{
              ...sharedInputStyle,
              paddingLeft: 36,
              fontSize: 13,
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 22,
                height: 22,
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-muted)',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                borderRadius: 999,
              }}
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </div>
      </div>
      {children}
    </PanelSearchContext.Provider>
  );
}

function panelSectionMatches(query: string, label?: string, hint?: string): boolean {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return Boolean((label && label.toLowerCase().includes(q)) || (hint && hint.toLowerCase().includes(q)));
}

/* ---------- Section heading inside a panel ----------
 *  Collapsible so users can scan the Inspector by section headers
 *  and expand only what they need. The first section in any panel
 *  defaults to open (defaultOpen=true on the first instance via
 *  prop). Set `collapsible={false}` for sections that should never
 *  collapse (e.g. the always-visible style picker at the top).
 *  Open/closed state is local to each panel mount — switching blocks
 *  resets to defaults so users always start in a known place.
 *  Persists through re-renders via useState. */
export function PanelSection({
  label,
  hint,
  action,
  children,
  style,
  collapsible = true,
  defaultOpen,
}: {
  label?: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  collapsible?: boolean;
  /** When omitted, uses PanelGroup context (1st section open) if
   *  available; otherwise defaults to open. Pass `true` / `false`
   *  to override the smart default. */
  defaultOpen?: boolean;
}) {
  const groupCtx = useContext(PanelGroupContext);
  const searchCtx = useContext(PanelSearchContext);
  // useState lazy init runs groupCtx.register() once on first
  // mount (registering this section's position) and stores the
  // number in state. Render itself stays pure (react-hooks/refs).
  const [position] = useState(() => groupCtx ? groupCtx.register() : 0);
  const initialOpen =
    defaultOpen !== undefined
      ? defaultOpen
      : groupCtx
        ? position === 1
        : true;
  const [open, setOpen] = useState(initialOpen);
  // When a search query is active, hide non-matching sections AND
  // force-expand matching ones so the field the user typed for is
  // visible immediately. When the query clears, sections snap back
  // to their user-controlled open/closed state.
  const matches = panelSectionMatches(searchCtx.query, label, hint);
  if (!matches) return null;
  const expanded = !collapsible || open || Boolean(searchCtx.query.trim());

  // Header is a button when collapsible so keyboard + screen-reader
  // users can toggle. Otherwise it's a passive div.
  const Header = collapsible ? 'button' : 'div';
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        // Less crammed: sections breathe whether collapsed or open.
        // Closed sections still get a soft hairline so the inspector
        // reads as a list of stacked headings, not a single column
        // of dashes-and-uppercase noise.
        gap: expanded ? 16 : 0,
        marginBottom: expanded ? 24 : 6,
        paddingBottom: expanded ? 20 : 12,
        borderBottom: '1px solid var(--line-soft)',
        transition: 'gap 200ms ease, margin-bottom 200ms ease, padding-bottom 200ms ease',
        ...style,
      }}
    >
      {(label || action) && (
        <Header
          {...(collapsible
            ? {
                type: 'button',
                onClick: () => setOpen((o) => !o),
                'aria-expanded': expanded,
              }
            : {})}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            background: 'transparent',
            border: 'none',
            padding: '6px 0 0',
            textAlign: 'left',
            cursor: collapsible ? 'pointer' : 'default',
            color: 'var(--ink)',
            font: 'inherit',
            width: '100%',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            {label && (
              <h3
                style={{
                  margin: 0,
                  // Fraunces display heading, sentence case — reads
                  // as editorial chapter heads rather than a SaaS
                  // panel of all-caps tracked labels.
                  fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
                  fontSize: 17,
                  fontWeight: 500,
                  letterSpacing: '-0.005em',
                  color: 'var(--ink)',
                  lineHeight: 1.2,
                }}
              >
                {label}
              </h3>
            )}
            {hint && expanded && (
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--ink-muted)',
                  marginTop: 4,
                  fontWeight: 400,
                  letterSpacing: 0,
                  textTransform: 'none',
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {hint}
              </div>
            )}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
          {collapsible && (
            <span
              aria-hidden
              style={{
                display: 'inline-flex',
                width: 26,
                height: 26,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink-muted)',
                background: expanded ? 'var(--cream-2, #F5EFE2)' : 'transparent',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), background 160ms ease',
                flexShrink: 0,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          )}
        </Header>
      )}
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
      )}
    </section>
  );
}

/* ---------- PanelSmartActions ----------
 *  A horizontal scrolling row of 2-4 quick-action chips that sit at
 *  the top of an inspector panel body. The primary affordance gets
 *  the pearl accent; the rest are ghost.
 *
 *  Use this to surface the most-likely thing the user wants to do
 *  *next* on the panel they just landed on — without making them
 *  scan every collapsible section first. */
export interface PanelSmartAction {
  label: string;
  icon?: string;
  onClick: () => void;
  primary?: boolean;
  /** Disabled state — chip stays visible but ghosted. */
  disabled?: boolean;
}

export function PanelSmartActions({ actions }: { actions: PanelSmartAction[] }) {
  if (actions.length === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="Quick actions"
      style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        marginBottom: 18,
        paddingBottom: 4,
        // Firefox + WebKit hide scrollbars except when interacting,
        // so the row stays clean visually.
        scrollbarWidth: 'thin',
      }}
    >
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={a.onClick}
          disabled={a.disabled}
          className={a.primary ? 'pl-pearl-accent' : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 999,
            background: a.primary ? undefined : 'var(--cream-2)',
            color: a.primary ? undefined : 'var(--ink)',
            border: a.primary ? undefined : '1px solid var(--line-soft)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: a.disabled ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            opacity: a.disabled ? 0.4 : 1,
            transition: 'background 160ms ease, color 160ms ease, border-color 160ms ease',
          }}
        >
          {a.icon && <Icon name={a.icon} size={12} />}
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- PanelDisclosure ---------- *
 *
 * Inline "Advanced" / "More" collapsible block used inside a
 * PanelSection. Different from PanelSection itself: it doesn't
 * draw a divider, doesn't have its own search semantics, and
 * defaults to closed. Use to hide power-user fields that bloat
 * the panel when they're not in use.
 *
 * Usage:
 *   <PanelDisclosure label="Advanced">
 *     <Field>…</Field>
 *     <Field>…</Field>
 *   </PanelDisclosure>
 */
export function PanelDisclosure({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: open ? 12 : 0,
        marginTop: 4,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          padding: '4px 8px 4px 4px',
          background: 'transparent',
          border: 'none',
          color: 'var(--ink-muted)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          lineHeight: 1.2,
        }}
      >
        <span
          aria-hidden
          style={{
            display: 'inline-block',
            width: 12,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
            color: 'var(--ink-muted)',
            fontSize: 10,
          }}
        >
          ▸
        </span>
        {label}
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------- Field wrapper (label + help text + error slot) ---------- *
 *  `pearAction` (optional) renders a small pear glyph next to the
 *  label. Click dispatches `pearloom:open-pear-for` carrying the
 *  block + pass id, so the advisor opens pre-scoped to that field's
 *  AI capability (rewrite tagline · suggest cover · translate, etc.).
 *
 *  Curate carefully — a glyph on every field reads as decoration and
 *  loses its meaning. Only set `pearAction` where Pear has a real
 *  pass that's worth a one-tap entry. */
export interface PearFieldAction {
  /** Block id this field belongs to (matches BlockKey contract). */
  block: string;
  /** Pass id the advisor should pre-load. Convention is verb-noun:
   *  'rewrite-tagline', 'suggest-cover', 'translate', etc. */
  pass: string;
  /** Optional human label to override the default tooltip. */
  label?: string;
}
export function Field({
  label,
  help,
  error,
  children,
  htmlFor,
  right,
  pearAction,
}: {
  label: string;
  help?: string;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
  right?: ReactNode;
  pearAction?: PearFieldAction;
}) {
  return (
    <label htmlFor={htmlFor} style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: htmlFor ? 'default' : 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink)',
            letterSpacing: '-0.005em',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {label}
          {pearAction && <PearFieldButton action={pearAction} />}
        </span>
        {right}
      </div>
      {children}
      {help && !error && (
        <span style={{ fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.45 }}>{help}</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: '#7A2D2D', lineHeight: 1.45 }}>{error}</span>
      )}
    </label>
  );
}

/* ---------- PearFieldButton ----------
 *  Small pear glyph next to a field label. Click fires the
 *  `pearloom:open-pear-for` event with the field's pass id; the
 *  advisor opens scoped to that pass on that block. Stops the
 *  click from toggling the wrapping <label> when the button is
 *  pressed (which would otherwise focus + click-through). */
export function PearFieldButton({ action }: { action: PearFieldAction }) {
  function fire(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('pearloom:open-pear-for', {
      detail: { block: action.block, pass: action.pass, intent: 'field' },
    }));
  }
  return (
    <button
      type="button"
      onClick={fire}
      title={action.label ?? 'Ask Pear about this'}
      aria-label={action.label ?? 'Ask Pear about this'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 18,
        height: 18,
        padding: 0,
        borderRadius: 999,
        border: 'none',
        background: 'transparent',
        color: 'var(--peach-ink, #C6703D)',
        cursor: 'pointer',
        opacity: 0.75,
        transition: 'opacity 140ms ease, background 140ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.background = 'var(--peach-bg, rgba(198,112,61,0.12))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.75';
        e.currentTarget.style.background = 'transparent';
      }}
      onFocus={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.background = 'var(--peach-bg, rgba(198,112,61,0.12))';
      }}
      onBlur={(e) => {
        e.currentTarget.style.opacity = '0.75';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 3.4c.6 0 1 .5 1 1.1v.4c2.6.4 4.5 2 4.5 4.4v.5c1.6.7 2.5 2 2.5 4 0 4-2.5 7.4-7 7.7H11c-4.5-.3-7-3.7-7-7.7 0-2 .9-3.3 2.5-4v-.5c0-2.4 1.9-4 4.5-4.4v-.4c0-.6.4-1.1 1-1.1z"/>
      </svg>
    </button>
  );
}

/* ---------- PanelTabs ----------
 *  Three-tab inspector strip — Content / Layout / Style. Tabs whose
 *  slot is omitted are hidden, so a panel can opt in incrementally
 *  (just `content` is fine; that's the default no-op shape).
 *
 *  Renders a sticky tab strip at the top of the panel body, then the
 *  selected slot below. The shell stays the same across panels —
 *  HeroPanel, DetailsPanel, etc. all surface the same three concepts:
 *
 *   • Content — what does it say? (tagline, names, dates, fields)
 *   • Layout  — where does it go? (variant picker, spacing, hide/show)
 *   • Style   — how does it look? (per-section background, palette)
 *
 *  Maps directly to how non-designers think about editing. The
 *  underlying field components are reused across tabs so authors
 *  just split their existing PanelSections into the three buckets. */
export interface PanelTabsSlots {
  content?: ReactNode;
  layout?: ReactNode;
  style?: ReactNode;
}
const PANEL_TAB_LABELS: Record<keyof PanelTabsSlots, { label: string; icon: string }> = {
  content: { label: 'Content', icon: 'type' },
  layout:  { label: 'Layout',  icon: 'layout' },
  style:   { label: 'Style',   icon: 'palette' },
};
export function PanelTabs({
  slots,
  defaultTab = 'content',
}: {
  slots: PanelTabsSlots;
  defaultTab?: keyof PanelTabsSlots;
}) {
  const order: Array<keyof PanelTabsSlots> = ['content', 'layout', 'style'];
  const available = order.filter((k) => slots[k] != null);
  const initial = available.includes(defaultTab) ? defaultTab : available[0] ?? 'content';
  const [tab, setTab] = useState<keyof PanelTabsSlots>(initial);
  // Single-tab panels skip the strip — the redundant "Content" pill
  // is just chrome when there's nothing to switch to.
  if (available.length <= 1) {
    return <>{slots[available[0] ?? 'content']}</>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        role="tablist"
        aria-label="Panel sections"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${available.length}, 1fr)`,
          gap: 2,
          padding: 4,
          marginBottom: 16,
          background: 'var(--cream-2, #F5EFE2)',
          border: '1px solid var(--line-soft)',
          borderRadius: 10,
        }}
      >
        {available.map((k) => {
          const meta = PANEL_TAB_LABELS[k];
          const on = tab === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(k)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 8px',
                borderRadius: 7,
                border: 0,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                transition: 'background 160ms ease, color 160ms ease',
              }}
            >
              <Icon name={meta.icon} size={11} />
              {meta.label}
            </button>
          );
        })}
      </div>
      <div>{slots[tab]}</div>
    </div>
  );
}

/* ---------- PearSuggestionsStrip ----------
 *  Peach gradient card with up to 3 contextual one-tap actions —
 *  the "Pear can help" footer block from the redesign. Each action
 *  fires `pearloom:open-pear-for` with a pass id. Returns null when
 *  `suggestions` is empty so blocks without registered helpers stay
 *  uncluttered. The Inspector mounts this at the bottom of every
 *  section panel; suggestions come from `panels/pear-suggestions.ts`. */
export interface PearSuggestion {
  id: string;
  label: string;
  /** Pass id the advisor should pre-load when this is clicked. */
  pass: string;
}
export function PearSuggestionsStrip({
  block,
  suggestions,
}: {
  block: string;
  suggestions: PearSuggestion[];
}) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div
      style={{
        background: 'linear-gradient(165deg, var(--peach-bg, #FBE8D6) 0%, var(--lavender-bg, #E8E0F0) 100%)',
        border: '1px solid rgba(198,112,61,0.18)',
        borderRadius: 14,
        padding: 14,
        marginTop: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--peach-ink, #C6703D)',
          letterSpacing: '0.04em',
        }}
      >
        <PearGlyph size={14} />
        Pear can help
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {suggestions.slice(0, 3).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              if (typeof window === 'undefined') return;
              window.dispatchEvent(new CustomEvent('pearloom:open-pear-for', {
                detail: { block, pass: s.pass, intent: 'suggestion' },
              }));
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '8px 10px',
              borderRadius: 8,
              background: 'transparent',
              border: 'none',
              color: 'var(--ink)',
              fontSize: 12.5,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              textAlign: 'left',
              transition: 'background 140ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onFocus={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.45)'; }}
            onBlur={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span>{s.label}</span>
            <span aria-hidden style={{ color: 'var(--peach-ink, #C6703D)' }}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PearGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3.4c.6 0 1 .5 1 1.1v.4c2.6.4 4.5 2 4.5 4.4v.5c1.6.7 2.5 2 2.5 4 0 4-2.5 7.4-7 7.7H11c-4.5-.3-7-3.7-7-7.7 0-2 .9-3.3 2.5-4v-.5c0-2.4 1.9-4 4.5-4.4v-.4c0-.6.4-1.1 1-1.1z"/>
    </svg>
  );
}

// Single source of truth for input chrome. Every text/textarea/select
// in the editor inherits this so they share padding (12×14), radius
// (10), font (13.5px Geist), border weight (1.5px). Hover/focus is
// handled in pearloom.css under .pl8-input.
const sharedInputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'var(--paper)',
  border: '1.5px solid var(--line)',
  borderRadius: 10,
  fontSize: 13.5,
  lineHeight: 1.4,
  color: 'var(--ink)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 180ms ease, box-shadow 180ms ease, background 180ms ease',
};

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={`pl8-input ${props.className ?? ''}`.trim()}
        style={{ ...sharedInputStyle, ...props.style }}
      />
    );
  }
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea(props, ref) {
    return (
      <textarea
        ref={ref}
        {...props}
        className={`pl8-input ${props.className ?? ''}`.trim()}
        rows={props.rows ?? 4}
        style={{ ...sharedInputStyle, minHeight: 88, resize: 'vertical', ...props.style }}
      />
    );
  }
);

/**
 * SelectInput — thin wrapper that delegates to the v8 CustomSelect
 * popover instead of the native dropdown. The native variant looked
 * OS-default in the panel rail; CustomSelect renders the same option
 * list inside a paper-styled popover that matches everything else
 * in the editor. Same prop shape so consumers don't change.
 */
export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  id?: string;
}) {
  void id;
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      width="100%"
    />
  );
}

/* ---------- Toggle pill (2-state segmented) ---------- */
export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div
      style={{
        display: 'flex',
        padding: 4,
        background: 'var(--cream-2)',
        borderRadius: 10,
        gap: 2,
        border: '1px solid var(--line-soft)',
      }}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 7,
              border: 0,
              background: on ? 'var(--ink)' : 'transparent',
              color: on ? 'var(--cream)' : 'var(--ink-soft)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              transition: 'background 160ms ease, color 160ms ease',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Checkbox toggle ---------- */
// Calmer than the prior sage-tinted card. The on-state used to flood
// the whole row green which competed with the section header's peach
// accent and made the panel feel garish; now the card stays paper
// and only the switch carries the colour.
export function Toggle({
  on,
  onChange,
  label,
  help,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  help?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: '100%',
        padding: '12px 14px',
        background: 'var(--paper)',
        border: '1.5px solid var(--line)',
        borderRadius: 10,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        textAlign: 'left',
        transition: 'border-color 160ms ease, background 160ms ease',
      }}
    >
      <span
        style={{
          width: 36,
          height: 22,
          borderRadius: 999,
          background: on ? 'var(--sage-deep, #5C6B3F)' : 'var(--line)',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? 16 : 2,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
          }}
        />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        {help && <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2, lineHeight: 1.4 }}>{help}</div>}
      </div>
    </button>
  );
}

/* ---------- Photo slot ---------- */
// Lazy-loaded so the editor bundle doesn't ship the library UI
// on every page, and so we don't create a top-level circular
// import (PhotoPicker -> useGooglePhotosPicker -> ... -> atoms).
const LazyPhotoPicker = dynamic(
  () => import('./PhotoPicker').then((m) => ({ default: m.PhotoPicker })),
  { ssr: false },
);

export function PhotoSlot({
  src,
  onChange,
  label,
  aspect = '4/3',
  accept = 'image/*',
}: {
  src?: string;
  onChange: (dataUrl: string | undefined) => void;
  label?: string;
  aspect?: string;
  accept?: string;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Fire a one-off upload so the photo also lands in the library.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const dataUrl = reader.result;
      onChange(dataUrl); // instant preview
      // Best-effort upload to R2 + library; replace the slot with
      // the permanent URL when it comes back.
      void fetch('/api/photos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: [
            {
              id: `p-${Date.now()}`,
              filename: file.name,
              mimeType: file.type || 'image/jpeg',
              base64: dataUrl,
              capturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
            },
          ],
          source: 'editor',
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { photos?: Array<{ baseUrl: string }> } | null) => {
          const permanent = data?.photos?.[0]?.baseUrl;
          if (permanent) onChange(permanent);
        })
        .catch(() => {});
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input ref={inputRef} id={id} type="file" accept={accept} onChange={onFile} style={{ display: 'none' }} />
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: aspect,
          background: src ? `#e8e4d5 url(${src}) center/cover no-repeat` : 'var(--cream-2)',
          border: `1.5px dashed ${src ? 'transparent' : 'var(--line)'}`,
          borderRadius: 14,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
        }}
      >
        {!src && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              color: 'var(--ink-muted)',
            }}
          >
            <Icon name="image" size={22} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{label ?? 'Upload photo'}</span>
          </div>
        )}
        {src && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(61,74,31,0.45)',
              color: 'var(--cream)',
              fontSize: 12,
              fontWeight: 600,
              transition: 'opacity 180ms',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.opacity = '0';
            }}
            onFocus={(e) => {
              (e.currentTarget as HTMLDivElement).style.opacity = '1';
            }}
            onBlur={(e) => {
              (e.currentTarget as HTMLDivElement).style.opacity = '0';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="image" size={14} color="var(--cream)" /> Replace
            </div>
          </div>
        )}
      </button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          style={{
            fontSize: 11,
            color: 'var(--ink-soft)',
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'var(--font-ui)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Upload new
        </button>
        {src && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            style={{
              fontSize: 11,
              color: '#7A2D2D',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-ui)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            Remove
          </button>
        )}
      </div>
      <LazyPhotoPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(urls) => {
          const next = Array.isArray(urls) ? urls[0] : urls;
          if (next) onChange(next);
        }}
        title={label ?? 'Choose a photo'}
      />
    </div>
  );
}

/* ---------- List row container (story chapters, schedule rows, etc.) ---------- */
export function ListRow({
  children,
  onMoveUp,
  onMoveDown,
  onDelete,
  dragHandle = true,
  style,
}: {
  children: ReactNode;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  dragHandle?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: dragHandle ? '24px 1fr auto' : '1fr auto',
        gap: 14,
        padding: 16,
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 12,
        alignItems: 'start',
        ...style,
      }}
    >
      {dragHandle && (
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            color: 'var(--ink-muted)',
            cursor: 'grab',
            marginTop: 6,
          }}
          aria-label="Drag to reorder"
        >
          <Icon name="drag" size={14} />
        </div>
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--ink-muted)' }}>
        {onMoveUp && (
          <button
            type="button"
            onClick={onMoveUp}
            aria-label="Move up"
            style={iconButtonStyle}
          >
            <Icon name="chev-up" size={13} />
          </button>
        )}
        {onMoveDown && (
          <button
            type="button"
            onClick={onMoveDown}
            aria-label="Move down"
            style={iconButtonStyle}
          >
            <Icon name="chev-down" size={13} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="Delete"
            style={{ ...iconButtonStyle, color: '#7A2D2D', borderColor: 'rgba(122,45,45,0.20)' }}
          >
            <Icon name="close" size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

const iconButtonStyle: CSSProperties = {
  width: 26,
  height: 26,
  display: 'grid',
  placeItems: 'center',
  background: 'transparent',
  border: '1px solid var(--line-soft)',
  borderRadius: 7,
  cursor: 'pointer',
  color: 'inherit',
  transition: 'background 160ms ease, border-color 160ms ease',
};

/* ---------- Color swatch row ---------- */
export function ColorSwatchRow({ colors, onSwap }: { colors: string[]; onSwap?: (idx: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {colors.map((c, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSwap?.(i)}
          aria-label={`Color swatch ${i + 1}: ${c}`}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: c,
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 2px 6px rgba(61,74,31,0.1)',
            cursor: onSwap ? 'pointer' : 'default',
          }}
        />
      ))}
    </div>
  );
}

/* ---------- Empty state ---------- */
export function EmptyBlockState({
  icon = 'sparkles',
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        padding: '32px 28px',
        background: 'var(--cream-2)',
        border: '1.5px dashed var(--line)',
        borderRadius: 14,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--lavender-bg)',
          color: 'var(--lavender-ink)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name={icon} size={22} />
      </div>
      <div className="display" style={{ fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.55, maxWidth: 320 }}>{body}</div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

/* ---------- Add-row button ---------- */
export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '12px 14px',
        background: 'transparent',
        border: '1.5px dashed var(--line)',
        borderRadius: 10,
        color: 'var(--ink-soft)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
        width: '100%',
        transition: 'border-color 160ms ease, color 160ms ease, background 160ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)';
        e.currentTarget.style.color = 'var(--peach-ink, #C6703D)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--line)';
        e.currentTarget.style.color = 'var(--ink-soft)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)';
        e.currentTarget.style.color = 'var(--peach-ink, #C6703D)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--line)';
        e.currentTarget.style.color = 'var(--ink-soft)';
      }}
    >
      <Icon name="plus" size={13} /> {label}
    </button>
  );
}
