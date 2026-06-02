'use client';

/* =========================================================================
   PEARLOOM — USER SETTINGS MODAL
   Claude-style account modal: Account / Usage & credits / Subscription /
   Preferences. Mounts on top of the dashboard shell. Opens from:
     1. the bottom-of-sidebar UserMenu in DashShell
     2. the global ⌘K command palette ("Open settings")
     3. programmatically via window.dispatchEvent(new Event('pearloom:open-settings'))
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
    // Permissive fallback so callers outside the provider don't crash
    // — the call is a no-op until the provider mounts.
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
    cta: 'Upgrade to Bloom',
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
    cta: 'Upgrade to Forever',
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

/* ───────────────────────── Usage shape ───────────────────────── */

interface UsageData {
  plan: string;
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
}

/* ───────────────────────── Preferences shape ───────────────────────── */

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
  const initial = (name.trim()[0] ?? 'P').toUpperCase();

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
        `}</style>

        {/* ── Left rail ─────────────────────────────── */}
        <div
          className="pl8-us-rail"
          style={{
            background: 'var(--cream-2)',
            borderRight: '1px solid var(--line-soft)',
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
              }}
            >
              {initial}
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
            onClick={() => {
              onClose();
              signOut({ callbackUrl: '/' });
            }}
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '10px 12px',
              borderRadius: 10,
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--ink-soft)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(14,13,11,0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Icon name="arrow-left" size={15} color="var(--ink-muted)" /> Sign
            out
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
            <AccountTab name={name} email={email} initial={initial} />
          )}
          {tab === 'usage' && <UsageTab usage={usage} planId={planId} />}
          {tab === 'subscription' && <SubscriptionTab planId={planId} />}
          {tab === 'preferences' && <PreferencesTab />}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ATOMS
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

function UsRow({ children, last }: { children: ReactNode; last?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 0',
        borderBottom: last ? 'none' : '1px solid var(--line-soft)',
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
        background: on ? 'var(--sage-deep)' : 'var(--cream-3)',
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
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 12.5,
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border:
      variant === 'primary'
        ? '1px solid var(--ink)'
        : `1px solid ${danger ? 'rgba(180,84,58,0.3)' : 'var(--card-ring)'}`,
    background: variant === 'primary' ? 'var(--ink)' : 'var(--card)',
    color:
      variant === 'primary'
        ? 'var(--cream)'
        : danger
        ? '#b4543a'
        : 'var(--ink)',
    opacity: disabled ? 0.55 : 1,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };

  if (href) {
    return (
      <Link href={href} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={style}>
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
  initial,
}: {
  name: string;
  email: string;
  initial: string;
}) {
  const joined = useMemo(() => formatMemberSince(), []);

  return (
    <div>
      <SettingsHead title="Account" sub="Your profile and how we reach you." />
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
          }}
        >
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--ink)',
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
      <UsRow last>
        <UsField label="Password" value="Managed by your sign-in provider" />
        <MiniButton href="/dashboard/profile">Change</MiniButton>
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

  return (
    <div>
      <SettingsHead
        title="Usage & credits"
        sub={`${cycleLabel} · on the ${planLabel(planId)} plan.`}
      />

      <div
        style={{
          background:
            'linear-gradient(150deg, var(--peach-bg), var(--lavender-bg))',
          borderRadius: 16,
          padding: 18,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <div
          style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}
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
              color: 'var(--peach-ink)',
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
          <MiniButton variant="primary" href="/dashboard/help">
            Get more
          </MiniButton>
        )}
      </div>

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
        Where Pear helps
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          marginBottom: 16,
        }}
      >
        {[
          { label: 'Design a look from your story', icon: 'sparkles' },
          { label: 'Copy & wording drafts', icon: 'text' },
          { label: 'Palette from photos', icon: 'image' },
          { label: 'Guest message cadences', icon: 'mail' },
        ].map((b) => (
          <div
            key={b.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 11,
              padding: '9px 0',
              borderBottom: '1px solid var(--line-soft)',
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
              }}
            >
              <Icon name={b.icon} size={14} color="var(--ink-soft)" />
            </span>
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)' }}>
              {b.label}
            </span>
            <span
              style={{ fontSize: 12, color: 'var(--ink-muted)', fontWeight: 600 }}
            >
              {unlimited ? 'Unlimited' : 'Counts toward credits'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   TAB: SUBSCRIPTION
   ========================================================================= */

function SubscriptionTab({ planId }: { planId: PlanTier['id'] }) {
  const [busy, setBusy] = useState<PlanTier['id'] | null>(null);

  const onPick = useCallback(async (tier: PlanTier) => {
    if (tier.id === planId) return;
    // Stripe checkout is wired for theme packs today; full plan
    // checkout lives on /dashboard/payments. Kick the user there
    // so they land on the canonical billing surface.
    setBusy(tier.id);
    window.location.href = `/dashboard/payments?intent=${tier.id}`;
  }, [planId]);

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
                  ? 'linear-gradient(165deg, var(--sage-tint), var(--card))'
                  : 'var(--card)',
                border: current
                  ? '2px solid var(--sage-deep)'
                  : '1px solid var(--card-ring)',
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
                    }}
                  >
                    <Icon
                      name="check"
                      size={12}
                      color="var(--sage-deep)"
                      style={{ flexShrink: 0, marginTop: 2 }}
                    />{' '}
                    {f}
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
                  border: current
                    ? '1px solid var(--card-ring)'
                    : p.id === 'forever'
                    ? '1px solid var(--ink)'
                    : '1px solid var(--card-ring)',
                  background:
                    current
                      ? 'var(--card)'
                      : p.id === 'forever'
                      ? 'var(--ink)'
                      : 'var(--card)',
                  color:
                    current
                      ? 'var(--ink-muted)'
                      : p.id === 'forever'
                      ? 'var(--cream)'
                      : 'var(--ink)',
                  fontFamily: 'inherit',
                  opacity: current ? 0.6 : 1,
                }}
              >
                {current ? 'Current plan' : busy === p.id ? 'One moment…' : p.cta}
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
   ========================================================================= */

function PreferencesTab() {
  const [prefs, setPrefs] = useState<PreferencesData | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (window.localStorage.getItem('pl-site-theme') as
      | 'light'
      | 'dark'
      | null) ?? 'light';
  });
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

  // Initial reduced-motion check honours OS pref so the toggle
  // reflects what the user already sees.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('pl-reduced-motion');
    if (stored === '1') setReducedMotion(true);
    else if (stored === '0') setReducedMotion(false);
    else {
      const m = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(m.matches);
    }
  }, []);

  const savePref = useCallback(
    (patch: Partial<PreferencesData>) => {
      setPrefs((prev) => (prev ? { ...prev, ...patch } : prev));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        }).catch(() => {});
      }, 350);
    },
    [],
  );

  const flipTheme = useCallback((next: 'light' | 'dark') => {
    setTheme(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('pl-site-theme', next);
      } catch {}
      // The site renderer reads [data-pl-site-root][data-theme=...];
      // we set it on documentElement as a fallback so any consumer
      // can react.
      document.documentElement.setAttribute('data-theme', next);
    }
  }, []);

  const flipMotion = useCallback((next: boolean) => {
    setReducedMotion(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('pl-reduced-motion', next ? '1' : '0');
      } catch {}
    }
  }, []);

  // Default truthy toggles where the API row doesn't yet exist.
  const quietHours = prefs?.quiet_hours ?? true;

  return (
    <div>
      <SettingsHead title="Preferences" sub="How Pearloom behaves for you." />

      <UsRow>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
            Theme
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Light cream paper or editorial midnight.
          </div>
        </div>
        <div
          role="radiogroup"
          aria-label="Theme"
          style={{
            display: 'inline-flex',
            background: 'var(--cream-2)',
            borderRadius: 999,
            padding: 3,
          }}
        >
          {(['light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={theme === mode}
              onClick={() => flipTheme(mode)}
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                border: 'none',
                background: theme === mode ? 'var(--card)' : 'transparent',
                color:
                  theme === mode ? 'var(--ink)' : 'var(--ink-muted)',
                boxShadow:
                  theme === mode
                    ? '0 1px 3px rgba(14,13,11,0.10)'
                    : 'none',
                transition: 'background 160ms ease, color 160ms ease',
              }}
            >
              {mode === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </UsRow>

      <UsRow>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
            Quiet hours
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            Pause Pear nudges + emails between 9pm and 8am.
          </div>
        </div>
        <UsToggle
          on={quietHours}
          set={(next) => savePref({ quiet_hours: next })}
          ariaLabel="Quiet hours"
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
          set={flipMotion}
          ariaLabel="Reduced motion"
        />
      </UsRow>

      <UsRow>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
            Pear voice
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            How Pear writes back to you.
          </div>
        </div>
        <select
          value={prefs?.voice ?? 'gentle'}
          onChange={(e) =>
            savePref({ voice: e.target.value as PreferencesData['voice'] })
          }
          style={{
            padding: '6px 10px',
            borderRadius: 999,
            border: '1px solid var(--card-ring)',
            background: 'var(--card)',
            color: 'var(--ink)',
            fontSize: 13,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <option value="gentle">Gentle</option>
          <option value="candid">Candid</option>
          <option value="witty">Witty</option>
          <option value="minimal">Minimal</option>
        </select>
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

/* ───────────────────────── helpers ───────────────────────── */

function planLabel(id: PlanTier['id']): string {
  return PLANS.find((p) => p.id === id)?.name ?? 'Free';
}

function formatMemberSince(): string {
  // We don't have a created_at on the next-auth session, so this
  // reads as a stable, calendar-shaped subtitle instead of a hard
  // date that would otherwise be made-up.
  return 'Member of Pearloom';
}
