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
          background: 'var(--pl-chrome-bg)',
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
              color: 'var(--pl-chrome-text-muted)',
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
                color: 'var(--pl-chrome-text-muted)',
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
  const bodyId = useId();
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
        borderBottom: '1px solid var(--pl-chrome-border)',
        transition: 'gap var(--pl-dur-fast) var(--pl-ease-out), margin-bottom var(--pl-dur-fast) var(--pl-ease-out), padding-bottom var(--pl-dur-fast) var(--pl-ease-out)',
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
                'aria-controls': bodyId,
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
            color: 'var(--pl-chrome-text)',
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
                  color: 'var(--pl-chrome-text)',
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
                  color: 'var(--pl-chrome-text-muted)',
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
                color: 'var(--pl-chrome-text-muted)',
                background: expanded ? 'var(--cream-2, #F5EFE2)' : 'transparent',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform var(--pl-dur-fast) var(--pl-ease-out), background var(--pl-dur-fast) var(--pl-ease-out)',
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
        <div id={bodyId} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
      // pl8-smart-actions: class hook for the CSS rule (in
      // pearloom.css) that applies a right-edge mask fade only
      // when 4+ chips render. Inline styles can't use :has,
      // so the fade lives in CSS.
      className="pl8-smart-actions"
      style={{
        position: 'relative',
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        marginBottom: 18,
        paddingBottom: 4,
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
            color: a.primary ? undefined : 'var(--pl-chrome-text)',
            border: a.primary ? undefined : '1px solid var(--pl-chrome-border)',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            cursor: a.disabled ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            opacity: a.disabled ? 0.4 : 1,
            transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
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
  const contentId = useId();
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
        aria-controls={contentId}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          alignSelf: 'flex-start',
          padding: '4px 8px 4px 4px',
          background: 'transparent',
          border: 'none',
          color: 'var(--pl-chrome-text-muted)',
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
            transition: 'transform var(--pl-dur-fast) var(--pl-ease-out)',
            color: 'var(--pl-chrome-text-muted)',
            fontSize: 10,
          }}
        >
          ▸
        </span>
        {label}
      </button>
      {open && (
        <div id={contentId} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ---------- PanelHeaderTag ----------
 *  Visual port from the section-fields prototype: every per-section
 *  rail editor opens with a small italic-Fraunces "Section" eyebrow,
 *  the section name set in display type, an optional one-line hint,
 *  and a hairline divider. Gives every panel the same warm editorial
 *  header without forcing each panel to reimplement the chrome.
 *
 *  Mount once at the top of a panel body (above PanelSmartActions
 *  + PanelTabs). The rest of the panel stays untouched. */
export function PanelHeaderTag({
  label,
  hint,
  eyebrow = 'Section',
}: {
  label: string;
  hint?: string;
  eyebrow?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        paddingBottom: 14,
        marginBottom: 16,
        borderBottom: '1px solid var(--pl-chrome-border)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
          fontStyle: 'italic',
          fontSize: 12,
          color: 'var(--peach-ink, #C6703D)',
          letterSpacing: '0.04em',
          lineHeight: 1,
        }}
      >
        {eyebrow}
      </span>
      <h2
        style={{
          margin: 0,
          fontFamily: 'var(--font-display, "Fraunces", Georgia, serif)',
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: 'var(--pl-chrome-text)',
          lineHeight: 1.15,
        }}
      >
        {label}
      </h2>
      {hint && (
        <p
          style={{
            margin: 0,
            fontSize: 12.5,
            color: 'var(--pl-chrome-text-muted)',
            lineHeight: 1.5,
            fontFamily: 'var(--font-ui)',
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/* ---------- FieldCard ----------
 *  Warm paper-card wrapper for a single field. Visual port from the
 *  section-fields prototype where each field reads as a small lifted
 *  card on a cream background rather than a bare label+input on the
 *  panel surface. Use sparingly — best for "list of distinct things"
 *  blocks (event-detail cards, timeline rows, registry stores) where
 *  every row is conceptually its own object. Plain Field is still
 *  the right answer inside dense PanelSections. */
export function FieldCard({
  children,
  style,
  emphasis = false,
}: {
  children: ReactNode;
  style?: CSSProperties;
  /** When true, applies a subtle peach hairline on the leading edge
   *  to mark the card as the "primary" row (e.g. the venue card in
   *  a hotel-block list). */
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '12px 14px',
        background: 'var(--pl-chrome-surface, #FBF7EE)',
        border: '1px solid var(--pl-chrome-border)',
        borderRadius: 12,
        boxShadow: '0 1px 0 rgba(40,28,12,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        ...style,
      }}
    >
      {emphasis && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 12,
            bottom: 12,
            width: 2,
            background: 'var(--peach-ink, #C6703D)',
            borderRadius: 999,
          }}
        />
      )}
      {children}
    </div>
  );
}

/* ---------- Field wrapper (label + help text + error slot) ---------- */
export function Field({
  label,
  help,
  error,
  children,
  htmlFor,
  right,
}: {
  label: string;
  help?: string;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
  right?: ReactNode;
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
            color: 'var(--pl-chrome-text)',
            letterSpacing: '-0.005em',
            fontFamily: 'var(--font-ui)',
          }}
        >
          {label}
        </span>
        {right}
      </div>
      {children}
      {help && !error && (
        <span style={{ fontSize: 12, color: 'var(--pl-chrome-text-muted)', lineHeight: 1.45 }}>{help}</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--plum-ink, #7A2D2D)', lineHeight: 1.45 }}>{error}</span>
      )}
    </label>
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
          border: '1px solid var(--pl-chrome-border)',
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
                background: on ? 'var(--pl-chrome-text)' : 'transparent',
                color: on ? 'var(--pl-chrome-bg)' : 'var(--pl-chrome-text-soft)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
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

// Single source of truth for input chrome. Every text/textarea/select
// in the editor inherits this so they share padding (12×14), radius
// (10), font (13.5px Geist), border weight (1.5px). Hover/focus is
// handled in pearloom.css under .pl8-input.
const sharedInputStyle: CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'var(--paper)',
  border: '1.5px solid var(--pl-chrome-border)',
  borderRadius: 10,
  fontSize: 13.5,
  lineHeight: 1.4,
  color: 'var(--pl-chrome-text)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), box-shadow var(--pl-dur-fast) var(--pl-ease-out), background var(--pl-dur-fast) var(--pl-ease-out)',
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
        border: '1px solid var(--pl-chrome-border)',
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
              background: on ? 'var(--pl-chrome-text)' : 'transparent',
              color: on ? 'var(--pl-chrome-bg)' : 'var(--pl-chrome-text-soft)',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
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
        border: '1.5px solid var(--pl-chrome-border)',
        borderRadius: 10,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        textAlign: 'left',
        transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), background var(--pl-dur-fast) var(--pl-ease-out)',
      }}
    >
      <span
        style={{
          width: 36,
          height: 22,
          borderRadius: 999,
          background: on ? 'var(--sage-deep, #5C6B3F)' : 'var(--pl-chrome-border)',
          position: 'relative',
          flexShrink: 0,
          transition: 'background var(--pl-dur-fast) var(--pl-ease-spring)',
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
            transition: 'left var(--pl-dur-fast) var(--pl-ease-spring)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.22)',
          }}
        />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-chrome-text)' }}>{label}</div>
        {help && <div style={{ fontSize: 12, color: 'var(--pl-chrome-text-muted)', marginTop: 2, lineHeight: 1.4 }}>{help}</div>}
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
          border: `1.5px dashed ${src ? 'transparent' : 'var(--pl-chrome-border)'}`,
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
              color: 'var(--pl-chrome-text-muted)',
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
              color: 'var(--pl-chrome-bg)',
              fontSize: 12,
              fontWeight: 600,
              transition: 'opacity var(--pl-dur-fast) var(--pl-ease-out)',
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
              <Icon name="image" size={14} color="var(--pl-chrome-bg)" /> Replace
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
            color: 'var(--pl-chrome-text-soft)',
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
              color: 'var(--plum-ink, #7A2D2D)',
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
        background: 'var(--pl-chrome-surface)',
        border: '1px solid var(--pl-chrome-border)',
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
            color: 'var(--pl-chrome-text-muted)',
            cursor: 'grab',
            marginTop: 6,
          }}
          aria-label="Drag to reorder"
        >
          <Icon name="drag" size={14} />
        </div>
      )}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--pl-chrome-text-muted)' }}>
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
            style={{ ...iconButtonStyle, color: 'var(--plum-ink, #7A2D2D)', borderColor: 'rgba(122,45,45,0.20)' }}
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
  border: '1px solid var(--pl-chrome-border)',
  borderRadius: 7,
  cursor: 'pointer',
  color: 'inherit',
  transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
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
        border: '1.5px dashed var(--pl-chrome-border)',
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
      <div style={{ fontSize: 13, color: 'var(--pl-chrome-text-soft)', lineHeight: 1.55, maxWidth: 320 }}>{body}</div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

/* ---------- PearChip ----------
 *  Peach pill with a pear glyph — the prototype's "PearChip" from
 *  ClaudeDesign/pages/section-fields.jsx. Used as the right-side
 *  action on field labels ("3 styles", "Draft for me", "Build from
 *  notes", "Auto-arrange", "Suggest from data"). It's a button you
 *  can click to fire an action; the visual treatment cues the
 *  reader "this is a Pear-flavored offer, not a generic button".
 *
 *  Production AISuggestButton is the inline AI affordance with
 *  state + spinner. PearChip is the tighter sister used inline
 *  with a label — same brand voice, leaner footprint.
 */
export function PearChip({
  label,
  onClick,
  disabled,
  title,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 11px',
        borderRadius: 999,
        background: 'var(--peach-bg, rgba(198,112,61,0.10))',
        border: '1px solid rgba(198,112,61,0.22)',
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--peach-ink, #C6703D)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-ui)',
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = 'var(--peach-bg-strong, rgba(198,112,61,0.18))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--peach-bg, rgba(198,112,61,0.10))';
      }}
    >
      {/* Small pear glyph — matches the prototype's <Pear/> on
          PearChip. Renders as a 13px sage-tinted teardrop so the
          chip reads "Pear is offering this" at a glance. */}
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 11,
          height: 13,
          background: 'var(--sage-deep, #5C6B3F)',
          borderRadius: '60% 60% 50% 50% / 70% 70% 30% 30%',
          flexShrink: 0,
        }}
      />
      {label}
    </button>
  );
}

/* ---------- IconTileRow ----------
 *  The prototype's recurring row pattern (Schedule moments, Details
 *  custom cards, Registry stores): a 32×32 tone-tinted icon tile +
 *  title + sub-label + optional right-side meta chip. Used as a
 *  visual primitive when the row doesn't need full inline editing
 *  (e.g. summary view, hover affordances) — for editable rows the
 *  SortableRowCard is the right container.
 *
 *  Tone tokens map to the prototype's --peach-2 / --sage-2 /
 *  --lavender-2 / --warm-2 / --cream-2 fills.
 */
export type IconTileTone = 'peach' | 'sage' | 'lavender' | 'warm' | 'cream';

const TONE_BG: Record<IconTileTone, string> = {
  peach: 'var(--peach-2, rgba(198,112,61,0.18))',
  sage: 'var(--sage-2, rgba(92,107,63,0.18))',
  lavender: 'var(--lavender-2, rgba(143,124,178,0.18))',
  warm: 'var(--warm-2, rgba(184,147,90,0.18))',
  cream: 'var(--cream-3, #E5DCC4)',
};

export function IconTileRow({
  icon = 'star',
  tone = 'sage',
  title,
  sub,
  right,
  onClick,
  dragHandle,
}: {
  icon?: string;
  tone?: IconTileTone;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  onClick?: () => void;
  dragHandle?: boolean;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        borderRadius: 11,
        background: 'var(--pl-chrome-surface)',
        border: '1px solid var(--pl-chrome-border)',
        width: '100%',
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        color: 'var(--pl-chrome-text)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {dragHandle && <Icon name="drag" size={14} color="var(--pl-chrome-text-muted)" />}
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: TONE_BG[tone],
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={14} color="#3D4A1F" />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'inherit' }}>{title}</div>
        {sub && (
          <div style={{ fontSize: 11.5, color: 'var(--pl-chrome-text-muted)' }}>{sub}</div>
        )}
      </div>
      {right}
    </Tag>
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
        border: '1.5px dashed var(--pl-chrome-border)',
        borderRadius: 10,
        color: 'var(--pl-chrome-text-soft)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'center',
        width: '100%',
        transition: 'border-color var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out), background var(--pl-dur-fast) var(--pl-ease-out)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)';
        e.currentTarget.style.color = 'var(--peach-ink, #C6703D)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
        e.currentTarget.style.color = 'var(--pl-chrome-text-soft)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = 'var(--peach-ink, #C6703D)';
        e.currentTarget.style.color = 'var(--peach-ink, #C6703D)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
        e.currentTarget.style.color = 'var(--pl-chrome-text-soft)';
      }}
    >
      <Icon name="plus" size={13} /> {label}
    </button>
  );
}
