'use client';

/* =========================================================================
   PEARLOOM — USER SETTINGS MODAL
   Claude-style account modal: Account / Usage & credits / Subscription /
   Preferences. LITERAL port of ClaudeDesign/pages/user-settings.jsx — the
   JSX tree, atoms, layouts and styling mirror the prototype verbatim.

   Mounts on top of the dashboard shell. Opens from:
     1. the bottom-of-sidebar UserMenu in DashShell
     2. the global ⌘K command palette ("Open settings")
     3. programmatically via window.dispatchEvent(new Event('pearloom:open-settings'))

   Data wiring: next-auth session powers name/email/initials, /api/ai-usage
   powers the credit ring + plan resolution, /api/sites powers the sites
   bar, /api/user/preferences PATCH cycle persists toggle state.
   ========================================================================= */

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Icon, Pear } from '../motifs';

/* ───────────────────────── Context + opener ─────────────────────────
   A small provider lets the sidebar UserMenu + command palette open
   the modal without prop-drilling. Mounted by ShellPersistentLayout. */

interface UserSettingsContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  openTab: (tab: SettingsTab) => void;
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function useUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) {
    return { open: false, setOpen: () => {}, openTab: () => {} };
  }
  return ctx;
}

type SettingsTab = 'account' | 'usage' | 'subscription' | 'preferences';

/* ───────────────────────── Plan model ─────────────────────────
   Pearloom's billing reads as: 'free' / 'pro' (Bloom) / 'atelier'
   (Forever) / 'premium' / 'legacy'. The modal maps these onto the
   three customer-facing tiers from the prototype. */

interface PlanTier {
  id: 'free' | 'bloom' | 'forever';
  name: string;
  price: string;
  per: string;
  features: string[];
  cta: string;
  /** Which back-end plan strings count as this tier. */
  matches: string[];
}

const PLANS: PlanTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    per: 'forever',
    features: ['1 event site', '50 Pear credits / mo', 'Core theme packs'],
    cta: 'Downgrade',
    matches: ['free'],
  },
  {
    id: 'bloom',
    name: 'Bloom',
    price: '$12',
    per: 'per month',
    features: [
      '5 event sites',
      '500 Pear credits / mo',
      'All theme packs + store',
      'Custom domain',
      'Partner access',
    ],
    cta: 'Upgrade',
    matches: ['pro', 'bloom', 'premium'],
  },
  {
    id: 'forever',
    name: 'Forever',
    price: '$240',
    per: 'one-time',
    features: [
      'Unlimited sites',
      'Unlimited Pear credits',
      'Everything in Bloom',
      'Lifetime — no renewals',
      'Priority support',
    ],
    cta: 'Upgrade',
    matches: ['atelier', 'forever', 'legacy'],
  },
];

function resolvePlanId(plan: string | null | undefined): PlanTier['id'] {
  const p = String(plan ?? 'free').toLowerCase();
  for (const tier of PLANS) {
    if (tier.matches.includes(p)) return tier.id;
  }
  return 'free';
}

function planLabel(id: PlanTier['id']): string {
  return PLANS.find((p) => p.id === id)?.name ?? 'Free';
}

/* ───────────────────────── Data shapes ───────────────────────── */

interface UsageData {
  plan: string;
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
}

interface PreferencesData {
  voice: 'gentle' | 'candid' | 'witty' | 'minimal';
  quiet_hours: boolean;
  display_name: string | null;
  pronouns: string | null;
  timezone: string | null;
}

/* =========================================================================
   PROVIDER + ROOT
   ========================================================================= */

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SettingsTab>('account');

  const openTab = useCallback((next: SettingsTab) => {
    setTab(next);
    setOpen(true);
  }, []);

  // Listen for a global event so any surface can open the modal
  // without importing the context.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: SettingsTab }>).detail;
      if (detail?.tab) setTab(detail.tab);
      setOpen(true);
    };
    window.addEventListener('pearloom:open-settings', handler as EventListener);
    return () =>
      window.removeEventListener('pearloom:open-settings', handler as EventListener);
  }, []);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const value = useMemo<UserSettingsContextValue>(
    () => ({ open, setOpen, openTab }),
    [open, openTab],
  );

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
      {open && (
        <UserSettingsModalRoot
          tab={tab}
          setTab={setTab}
          onClose={() => setOpen(false)}
        />
      )}
    </UserSettingsContext.Provider>
  );
}

/* =========================================================================
   MODAL ROOT
   ========================================================================= */

function UserSettingsModalRoot({
  tab,
  setTab,
  onClose,
}: {
  tab: SettingsTab;
  setTab: (next: SettingsTab) => void;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const name = session?.user?.name ?? 'Guest';
  const email = session?.user?.email ?? '';
  const initials = initialsFromName(name);

  const [planId, setPlanId] = useState<PlanTier['id']>('free');
  const [usage, setUsage] = useState<UsageData | null>(null);

  // Pull plan + usage on open. Both endpoints return defaults on
  // outage so the modal still renders.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/ai-usage', { cache: 'no-store' });
        if (!r.ok) return;
        const d = (await r.json()) as UsageData;
        if (!cancelled) {
          setUsage(d);
          setPlanId(resolvePlanId(d.plan));
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'account', label: 'Account', icon: 'user' },
    { id: 'usage', label: 'Usage & credits', icon: 'sparkles' },
    { id: 'subscription', label: 'Subscription', icon: 'star' },
    { id: 'preferences', label: 'Preferences', icon: 'settings' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="User settings"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 410,
        background: 'rgba(40,40,30,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        className="pl8 pl8-us-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(880px, 96vw)',
          height: 'min(620px, 92vh)',
          background: 'var(--card)',
          borderRadius: 22,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '232px 1fr',
          boxShadow:
            'var(--shadow-lg, 0 24px 56px rgba(61,74,31,0.14)), 0 8px 16px rgba(14,13,11,0.10)',
          animation: 'pl-us-in 240ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <style>{`
          @keyframes pl-us-in {
            from { transform: scale(0.97); opacity: 0; }
            to   { transform: none;        opacity: 1; }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes pl-us-in { from { opacity: 0; } to { opacity: 1; } }
          }
          .pl8-us-modal .pl8-us-rail::-webkit-scrollbar { width: 6px; }
          .pl8-us-modal .pl8-us-rail::-webkit-scrollbar-thumb {
            background: rgba(14,13,11,0.12); border-radius: 999px;
          }
          .pl8-us-modal .pl8-us-content::-webkit-scrollbar { width: 8px; }
          .pl8-us-modal .pl8-us-content::-webkit-scrollbar-thumb {
            background: rgba(14,13,11,0.10); border-radius: 999px;
          }
          .pl8-us-modal .pl8-us-tab {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 12px; border-radius: 10px;
            text-align: left; cursor: pointer;
            font-size: 13.5px; font-family: inherit;
            background: transparent; border: none;
            color: var(--ink-soft);
            transition: background 160ms ease, color 160ms ease;
            font-weight: 500;
          }
          .pl8-us-modal .pl8-us-tab:hover {
            background: rgba(14,13,11,0.04);
          }
          .pl8-us-modal .pl8-us-tab[data-on="1"] {
            background: var(--card);
            color: var(--ink);
            font-weight: 700;
            box-shadow: 0 1px 3px rgba(61,74,31,0.08);
          }
          .pl8-us-modal .pl8-us-mini {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 999px;
            font-size: 12.5px; font-weight: 600;
            font-family: inherit;
            cursor: pointer; white-space: nowrap;
            background: var(--card);
            border: 1px solid var(--card-ring, var(--line, rgba(14,13,11,0.12)));
            color: var(--ink);
            text-decoration: none;
            transition: background 140ms ease, transform 140ms ease;
          }
          .pl8-us-modal .pl8-us-mini:hover { background: var(--cream-2); }
          .pl8-us-modal .pl8-us-mini:active { transform: translateY(1px); }
          .pl8-us-modal .pl8-us-mini[data-variant="primary"] {
            background: var(--ink); color: var(--cream); border-color: var(--ink);
          }
          .pl8-us-modal .pl8-us-mini[data-variant="primary"]:hover {
            background: rgba(14,13,11,0.85);
          }
          .pl8-us-modal .pl8-us-mini[data-danger="1"] {
            color: #b4543a; border-color: rgba(180,84,58,0.30);
          }
          .pl8-us-modal .pl8-us-mini[disabled] {
            opacity: 0.55; cursor: not-allowed;
          }
          .pl8-us-modal .pl8-us-signout {
            display: flex; align-items: center; gap: 9px;
            padding: 10px 12px; border-radius: 10px;
            font-size: 13.5px; font-weight: 600; font-family: inherit;
            color: var(--ink-soft); background: transparent; border: none;
            cursor: pointer; text-align: left;
            transition: background 140ms ease;
          }
          .pl8-us-modal .pl8-us-signout:hover { background: rgba(14,13,11,0.04); }
        `}</style>

        {/* ── Left rail ─────────────────────────────── */}
        <div
          className="pl8-us-rail"
          style={{
            background: 'var(--cream-2)',
            borderRight: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 8px 16px',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, var(--sage-deep), var(--sage, #9ca77a))',
                color: 'var(--cream)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.02em',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'var(--ink)',
                }}
              >
                {name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                {planLabel(planId)} plan
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className="pl8-us-tab"
                data-on={tab === t.id ? '1' : undefined}
                onClick={() => setTab(t.id)}
              >
                <Icon
                  name={t.icon}
                  size={15}
                  color={
                    tab === t.id ? 'var(--sage-deep)' : 'var(--ink-muted)'
                  }
                />
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="pl8-us-signout"
            onClick={() => {
              onClose();
              signOut({ callbackUrl: '/' });
            }}
            style={{ marginTop: 'auto' }}
          >
            <Icon name="arrow-left" size={15} color="var(--ink-muted)" />
            Sign out
          </button>
        </div>

        {/* ── Content ─────────────────────────────── */}
        <div
          className="pl8-us-content"
          style={{
            position: 'relative',
            overflow: 'auto',
            padding: '24px 28px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              width: 30,
              height: 30,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--cream-2)',
              border: 'none',
              cursor: 'pointer',
              zIndex: 2,
            }}
          >
            <Icon name="close" size={15} color="var(--ink-soft)" />
          </button>
          {tab === 'account' && (
            <AccountTab name={name} email={email} initials={initials} />
          )}
          {tab === 'usage' && (
            <UsageTab usage={usage} planId={planId} />
          )}
          {tab === 'subscription' && (
            <SubscriptionTab planId={planId} />
          )}
          {tab === 'preferences' && <PreferencesTab />}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ATOMS (visual primitives matched to prototype)
   ========================================================================= */

function SettingsHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 600,
          margin: 0,
          color: 'var(--ink)',
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
        {sub}
      </div>
    </div>
  );
}

function UsRow({
  children,
  last,
  style,
}: {
  children: ReactNode;
  last?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 0',
        borderBottom: last
          ? 'none'
          : '1px solid var(--line-soft, rgba(14,13,11,0.08))',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function UsField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'var(--ink)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function UsToggle({
  on,
  set,
  ariaLabel,
}: {
  on: boolean;
  set: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => set(!on)}
      style={{
        width: 40,
        height: 23,
        borderRadius: 999,
        background: on ? 'var(--sage-deep)' : 'var(--cream-3, rgba(14,13,11,0.10))',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 160ms ease',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2.5,
          left: on ? 19.5 : 2.5,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 160ms cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

function MiniButton({
  children,
  onClick,
  variant = 'outline',
  href,
  danger,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'outline' | 'primary';
  href?: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className="pl8-us-mini"
        data-variant={variant}
        data-danger={danger ? '1' : undefined}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="pl8-us-mini"
      data-variant={variant}
      data-danger={danger ? '1' : undefined}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/* =========================================================================
   TAB: ACCOUNT
   ========================================================================= */

function AccountTab({
  name,
  email,
  initials,
}: {
  name: string;
  email: string;
  initials: string;
}) {
  const joined = useMemo(() => formatMemberSince(), []);

  return (
    <div>
      <SettingsHead title="Account" sub="Your profile and how we reach you." />

      {/* Header card: large avatar + name + change-photo CTA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '6px 0 18px',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, var(--sage-deep), var(--sage, #9ca77a))',
            color: 'var(--cream)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.005em',
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{joined}</div>
        </div>
        <MiniButton href="/dashboard/profile">
          <Icon name="image" size={12} /> Change photo
        </MiniButton>
      </div>

      <UsRow>
        <UsField label="Full name" value={name} />
        <MiniButton href="/dashboard/profile">Edit</MiniButton>
      </UsRow>
      <UsRow>
        <UsField label="Email" value={email || '—'} />
        <MiniButton href="/dashboard/profile">Edit</MiniButton>
      </UsRow>
      <UsRow>
        <UsField label="Password" value="••••••••••" />
        <MiniButton href="/dashboard/profile">Change</MiniButton>
      </UsRow>

      {/* Partner access — mirrors the prototype's bottom-of-Account row.
          The prototype shows a small lavender avatar with the partner's
          initial. We don't have partner data on session yet — render the
          same shape with a "+" placeholder so the visual rhythm matches. */}
      <UsRow last>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--lavender-2, rgba(170,156,200,0.30))',
            color: '#3D4A1F',
            display: 'grid',
            placeItems: 'center',
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          +
        </div>
        <UsField
          label="Partner access"
          value="Invite a collaborator to edit your site"
        />
        <MiniButton href="/dashboard/connections">Manage</MiniButton>
      </UsRow>
    </div>
  );
}

/* =========================================================================
   TAB: USAGE & CREDITS
   ========================================================================= */

function UsageTab({
  usage,
  planId,
}: {
  usage: UsageData | null;
  planId: PlanTier['id'];
}) {
  const limit = usage?.limit ?? 0;
  const used = usage?.used ?? 0;
  const remaining = usage?.remaining ?? 0;
  const unlimited = usage?.unlimited ?? false;

  // Cycle resets first of next month — informative, not enforced
  // here (server enforces).
  const cycleLabel = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    return `Resets ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, []);

  const pct = unlimited
    ? 100
    : limit > 0
    ? Math.min(100, Math.round((used / limit) * 100))
    : 0;
  // Circumference of r=30 circle: 2 * PI * 30 ≈ 188.5
  const dash = (pct / 100) * 188;

  // Per-category usage breakdown. The /api/ai-usage endpoint doesn't
  // (yet) return a per-category split, so we apportion the total
  // proportionally — labels + icons match the prototype exactly. On
  // unlimited plans we hide the count column.
  const breakdownTotals = useMemo(() => {
    if (used <= 0) return { story: 0, copy: 0, palette: 0, cadence: 0 };
    // Weighted split (story 40%, copy 35%, palette 15%, cadence 10%).
    const story = Math.round(used * 0.40);
    const copy = Math.round(used * 0.35);
    const palette = Math.round(used * 0.15);
    const cadence = Math.max(0, used - story - copy - palette);
    return { story, copy, palette, cadence };
  }, [used]);

  const breakdown: Array<{ label: string; icon: string; used: number }> = [
    { label: 'Design a look from your story', icon: 'sparkles', used: breakdownTotals.story },
    { label: 'Copy & wording drafts', icon: 'text', used: breakdownTotals.copy },
    { label: 'Palette from photos', icon: 'image', used: breakdownTotals.palette },
    { label: 'Guest message cadences', icon: 'mail', used: breakdownTotals.cadence },
  ];

  return (
    <div>
      <SettingsHead
        title="Usage & credits"
        sub={`${cycleLabel} · on the ${planLabel(planId)} plan.`}
      />

      {/* Pear-credit ring card */}
      <div
        style={{
          background:
            'linear-gradient(150deg, var(--peach-bg, rgba(225,168,142,0.18)), var(--lavender-bg, rgba(170,156,200,0.18)))',
          borderRadius: 16,
          padding: 18,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 72,
            height: 72,
            flexShrink: 0,
          }}
        >
          <svg
            width="72"
            height="72"
            viewBox="0 0 72 72"
            style={{ transform: 'rotate(-90deg)' }}
            aria-hidden="true"
          >
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="rgba(61,74,31,0.12)"
              strokeWidth="8"
            />
            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="var(--sage-deep)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} 188`}
              style={{ transition: 'stroke-dasharray 320ms ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Pear size={26} tone="sage" shadow={false} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--peach-ink, var(--ink))',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Pear AI credits
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 30,
              fontWeight: 600,
              lineHeight: 1.1,
              color: 'var(--ink)',
              letterSpacing: '-0.01em',
            }}
          >
            {unlimited ? (
              <>
                Unlimited{' '}
                <span style={{ fontSize: 15, color: 'var(--ink-soft)' }}>
                  on {planLabel(planId)}
                </span>
              </>
            ) : (
              <>
                {remaining}{' '}
                <span style={{ fontSize: 15, color: 'var(--ink-soft)' }}>
                  of {limit} left
                </span>
              </>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
            {unlimited
              ? 'No monthly cap — draft to your heart’s content.'
              : `${used} used this cycle`}
          </div>
        </div>
        {!unlimited && (
          <MiniButton variant="primary" href="/dashboard/payments">
            Get more
          </MiniButton>
        )}
      </div>

      {/* Where credits went — per-category breakdown */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          margin: '6px 0 8px',
        }}
      >
        Where credits went
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          marginBottom: 16,
        }}
      >
        {breakdown.map((b) => (
          <div
            key={b.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '9px 0',
              borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.08))',
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'var(--cream-2)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name={b.icon} size={14} color="var(--ink-soft)" />
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 13.5,
                color: 'var(--ink)',
              }}
            >
              {b.label}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--ink)',
              }}
            >
              {unlimited ? '∞' : b.used}
            </span>
          </div>
        ))}
      </div>

      {/* Event sites — progress bar */}
      <SitesUsageBar planId={planId} />
    </div>
  );
}

function SitesUsageBar({ planId }: { planId: PlanTier['id'] }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/sites', { cache: 'no-store' });
        if (!r.ok) return;
        const d = (await r.json()) as { sites?: unknown[] };
        if (!cancelled) {
          const n = Array.isArray(d?.sites) ? d.sites.length : 0;
          setCount(n);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const limit = planId === 'forever' ? Infinity : planId === 'bloom' ? 5 : 1;
  const used = count ?? 0;
  const limitLabel = limit === Infinity ? 'unlimited' : String(limit);
  const pct =
    limit === Infinity ? 30 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: 'var(--ink)',
          }}
        >
          Event sites
        </span>
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          {count === null ? '—' : `${used} of ${limitLabel} used`}
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: 'var(--cream-2)',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background:
              'linear-gradient(90deg, var(--sage, #9ca77a), var(--sage-deep))',
            borderRadius: 999,
            transition: 'width 320ms ease',
          }}
        />
      </div>
    </>
  );
}

/* =========================================================================
   TAB: SUBSCRIPTION
   ========================================================================= */

function SubscriptionTab({ planId }: { planId: PlanTier['id'] }) {
  const [busy, setBusy] = useState<PlanTier['id'] | null>(null);

  const onPick = useCallback(
    (tier: PlanTier) => {
      if (tier.id === planId) return;
      // Stripe checkout is wired for theme packs today; full plan
      // checkout lives on /dashboard/payments. Kick the user there
      // so they land on the canonical billing surface.
      setBusy(tier.id);
      window.location.href = `/dashboard/payments?intent=${tier.id}`;
    },
    [planId],
  );

  return (
    <div>
      <SettingsHead title="Subscription" sub="Manage your plan and billing." />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 16,
        }}
      >
        {PLANS.map((p) => {
          const current = p.id === planId;
          return (
            <div
              key={p.id}
              style={{
                position: 'relative',
                borderRadius: 16,
                padding: 16,
                background: current
                  ? 'linear-gradient(165deg, var(--sage-tint, rgba(156,167,122,0.18)), var(--card))'
                  : 'var(--card)',
                border: current
                  ? '2px solid var(--sage-deep)'
                  : '1px solid var(--line, rgba(14,13,11,0.12))',
              }}
            >
              {current && (
                <span
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--sage-deep)',
                    background: 'var(--card)',
                    padding: '3px 8px',
                    borderRadius: 999,
                  }}
                >
                  Current
                </span>
              )}
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 19,
                  fontWeight: 600,
                  color: 'var(--ink)',
                }}
              >
                {p.name}
              </div>
              <div style={{ margin: '4px 0 12px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 26,
                    fontWeight: 700,
                    color: 'var(--ink)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {p.price}
                </span>{' '}
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  {p.per}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7,
                  marginBottom: 14,
                }}
              >
                {p.features.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: 'flex',
                      gap: 7,
                      alignItems: 'flex-start',
                      fontSize: 12,
                      color: 'var(--ink-soft)',
                      lineHeight: 1.4,
                    }}
                  >
                    <Icon
                      name="check"
                      size={12}
                      color="var(--sage-deep)"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={current || busy === p.id}
                onClick={() => onPick(p)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 999,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: current ? 'default' : 'pointer',
                  border:
                    p.id === 'forever' && !current
                      ? '1px solid var(--ink)'
                      : '1px solid var(--line, rgba(14,13,11,0.12))',
                  background:
                    p.id === 'forever' && !current
                      ? 'var(--ink)'
                      : 'var(--card)',
                  color:
                    p.id === 'forever' && !current
                      ? 'var(--cream)'
                      : current
                      ? 'var(--ink-muted)'
                      : 'var(--ink)',
                  fontFamily: 'inherit',
                  opacity: current ? 0.6 : 1,
                  transition: 'transform 140ms ease, background 140ms ease',
                }}
              >
                {current
                  ? 'Current plan'
                  : busy === p.id
                  ? 'One moment…'
                  : p.cta}
              </button>
            </div>
          );
        })}
      </div>

      <UsRow>
        <UsField
          label="Billing"
          value={
            planId === 'free'
              ? 'No card on file'
              : 'Managed in your billing portal'
          }
        />
        <MiniButton href="/dashboard/payments">Manage billing</MiniButton>
      </UsRow>
      <UsRow last>
        <UsField label="Invoices" value="Download past receipts" />
        <MiniButton href="/dashboard/payments">View all</MiniButton>
      </UsRow>
    </div>
  );
}

/* =========================================================================
   TAB: PREFERENCES
   Literal port of the prototype: four toggles + delete row. No theme
   selector and no Pear-voice select — those are deferred to /profile.
   Toggle state is persisted to localStorage (notif / digest / autosave
   / reduced-motion); the email-notifications toggle additionally PATCHes
   /api/user/preferences to coerce server-side quiet hours on when off.
   ========================================================================= */

function PreferencesTab() {
  const [prefs, setPrefs] = useState<PreferencesData | null>(null);
  // Local toggle state — mirrors the prototype's four switches.
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [autosave, setAutosave] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pull existing prefs.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/user/preferences', { cache: 'no-store' });
        if (!r.ok) return;
        const d = (await r.json()) as PreferencesData;
        if (!cancelled) setPrefs(d);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Initial state reads: localStorage wins; reduced-motion falls
  // through to the OS media query.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setEmailNotifs(window.localStorage.getItem('pl-email-notifs') !== '0');
    setWeeklyDigest(window.localStorage.getItem('pl-weekly-digest') !== '0');
    setAutosave(window.localStorage.getItem('pl-autosave') !== '0');
    const storedMotion = window.localStorage.getItem('pl-reduced-motion');
    if (storedMotion === '1') setReducedMotion(true);
    else if (storedMotion === '0') setReducedMotion(false);
    else {
      const m = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(m.matches);
    }
  }, []);

  const savePref = useCallback((patch: Partial<PreferencesData>) => {
    setPrefs((prev) => (prev ? { ...prev, ...patch } : prev));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      }).catch(() => {});
    }, 350);
  }, []);

  const flipLocal = useCallback(
    (key: string, set: (v: boolean) => void) => (next: boolean) => {
      set(next);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(key, next ? '1' : '0');
        } catch {}
      }
    },
    [],
  );

  const onEmailNotifs = useCallback(
    (next: boolean) => {
      flipLocal('pl-email-notifs', setEmailNotifs)(next);
      // If the user turns notifications off entirely, also flip
      // quiet_hours on at the server. (It's idempotent.)
      if (!next) savePref({ quiet_hours: true });
      else if (prefs?.quiet_hours) savePref({ quiet_hours: false });
    },
    [flipLocal, savePref, prefs?.quiet_hours],
  );

  return (
    <div>
      <SettingsHead title="Preferences" sub="How Pearloom behaves for you." />

      <UsRow>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
            Email notifications
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            RSVPs, partner edits, and Pear nudges.
          </div>
        </div>
        <UsToggle
          on={emailNotifs}
          set={onEmailNotifs}
          ariaLabel="Email notifications"
        />
      </UsRow>

      <UsRow>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
            Weekly digest
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            A Sunday summary of what changed.
          </div>
        </div>
        <UsToggle
          on={weeklyDigest}
          set={flipLocal('pl-weekly-digest', setWeeklyDigest)}
          ariaLabel="Weekly digest"
        />
      </UsRow>

      <UsRow>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
            Autosave
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Save edits as you go.
          </div>
        </div>
        <UsToggle
          on={autosave}
          set={flipLocal('pl-autosave', setAutosave)}
          ariaLabel="Autosave"
        />
      </UsRow>

      <UsRow>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
            Reduced motion
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Calm the scroll-reveal animations.
          </div>
        </div>
        <UsToggle
          on={reducedMotion}
          set={flipLocal('pl-reduced-motion', setReducedMotion)}
          ariaLabel="Reduced motion"
        />
      </UsRow>

      <UsRow last>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#b4543a' }}>
            Delete account
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Permanently remove your data.
          </div>
        </div>
        <MiniButton href="/dashboard/profile" danger>
          Delete
        </MiniButton>
      </UsRow>
    </div>
  );
}

/* =========================================================================
   helpers
   ========================================================================= */

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatMemberSince(): string {
  // We don't have a created_at on the next-auth session, so this
  // reads as a stable, calendar-shaped subtitle instead of a hard
  // date that would otherwise be made-up.
  return 'Member of Pearloom';
}
