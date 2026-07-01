'use client';

 
/* =========================================================================
   PEARLOOM — USER SETTINGS MODAL (LITERAL PORT)
   Direct port of ClaudeDesign/pages/user-settings.jsx. Every className +
   inline style object is verbatim from the prototype; only data accessors
   (next-auth session, /api/ai-usage, /api/user/preferences) and the
   UserSettingsProvider/context block needed by callers are added.
   ========================================================================= */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Icon, Pear } from '../motifs';
import { NotificationPrefsTab } from './NotificationPrefsTab';
import { usePlan } from './usePlan';
import { useMobileViewport } from '../redesign/use-mobile-viewport';
import { useTheme } from '@/components/shell/ThemeProvider';
import { useUserSites, resolveStickySite } from '@/components/marketing/design/dash/hooks';
import { PlAvatar, PL_AVATARS, useUserAvatar } from '../avatars';

/* ─── Context (existing consumer API — DashShell + DashCommandPalette
       call useUserSettings().openTab(<id>)) ─────────────────────────────── */

type SettingsTab = 'account' | 'usage' | 'subscription' | 'notifications' | 'preferences';

interface UserSettingsContextValue {
  open: boolean;
  openSettings: (tab?: SettingsTab) => void;
  openTab: (tab: SettingsTab) => void;
  closeSettings: () => void;
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function useUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) {
    return {
      open: false,
      openSettings: () => {},
      openTab: () => {},
      closeSettings: () => {},
    };
  }
  return ctx;
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SettingsTab>('account');
  const openSettings = useCallback((t?: SettingsTab) => {
    if (t) setTab(t);
    setOpen(true);
  }, []);
  const openTab = useCallback((t: SettingsTab) => {
    setTab(t);
    setOpen(true);
  }, []);
  const closeSettings = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ tab?: SettingsTab }>).detail;
      if (detail?.tab) setTab(detail.tab);
      setOpen(true);
    };
    window.addEventListener('pearloom:open-settings', onOpen);
    return () => window.removeEventListener('pearloom:open-settings', onOpen);
  }, []);
  const value = useMemo<UserSettingsContextValue>(
    () => ({ open, openSettings, openTab, closeSettings }),
    [open, openSettings, openTab, closeSettings],
  );
  return (
    <UserSettingsContext.Provider value={value}>
      {children}
      <UserSettingsModal open={open} onClose={closeSettings} tab={tab} setTab={setTab} />
    </UserSettingsContext.Provider>
  );
}

/* ─── Live data shape (prototype's PL_USER / PL_USAGE / PL_PLANS,
       wired to production endpoints) ────────────────────────────────── */

interface UsageData {
  cycle: string;
  pear: { used: number; total: number; label: string };
  breakdown: { label: string; used: number; icon: string }[];
  sites: { used: number; total: number };
}

const DEFAULT_USAGE: UsageData = {
  cycle: 'Resets monthly',
  pear: { used: 0, total: 500, label: 'Pear AI credits' },
  breakdown: [
    { label: 'Design a look from your story', used: 0, icon: 'sparkles' },
    { label: 'Copy & wording drafts', used: 0, icon: 'text' },
    { label: 'Palette from photos', used: 0, icon: 'image' },
    { label: 'Guest message cadences', used: 0, icon: 'mail' },
  ],
  sites: { used: 0, total: 5 },
};

interface PlanShape {
  id: string;
  name: string;
  price: string;
  per: string;
  features: string[];
  cta: string;
  current?: boolean;
}

/** Canonical tier catalog — names, prices, and limits mirror the
 *  pricing page (DesignPricing) + PLAN_LIMITS. The previous list
 *  showed an invented 'Bloom $12/mo' tier that never existed. */
function planList(plan: 'free' | 'pro' | 'premium'): PlanShape[] {
  return [
    { id: 'journal', name: 'Journal', price: '$0',   per: 'forever',  features: ['One site, yours to keep', 'The full drafting by Pear', 'Unlimited RSVPs'], cta: plan === 'free' ? 'Current plan' : 'Included', current: plan === 'free' },
    { id: 'atelier', name: 'Atelier', price: '$19',  per: 'once',     features: ['Everything in Journal', 'Every block, template & theme pack', 'The Director (day-of room)'], cta: plan === 'pro' ? 'Current plan' : 'Upgrade', current: plan === 'pro' },
    { id: 'legacy',  name: 'Legacy',  price: '$129', per: 'lifetime', features: ['Everything in Atelier', 'Up to ten sites, forever', 'Co-hosts + the signature theme shelf'], cta: plan === 'premium' ? 'Current plan' : 'Upgrade', current: plan === 'premium' },
  ];
}

/* ─── UI atoms (verbatim from prototype) ─────────────────────────────── */

function UsRow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  // flexWrap — on phone widths the trailing button drops onto its own
  // line instead of crushing the label into a one-word-per-line column.
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 0', borderBottom: '1px solid var(--line-soft)', ...style }}>{children}</div>;
}
function UsToggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} style={{ width: 40, height: 23, borderRadius: 999, background: on ? 'var(--sage-deep)' : 'var(--cream-3)', position: 'relative', flexShrink: 0, transition: 'background 160ms ease', cursor: 'pointer', border: 'none' }}>
      <span style={{ position: 'absolute', top: 2.5, left: on ? 19.5 : 2.5, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 160ms cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  );
}
function UsField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

function SettingsHead({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: 0 }}>{title}</h2>
      <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

/* ─── Tabs (verbatim from prototype, with live data wiring) ──────────── */

function AccountTab({ user }: { user: { name: string; email: string; initials: string; joined: string; image?: string | null } }) {
  /* Display name persists to /api/user/preferences (display_name) —
     the same field DashSettings (/dashboard/profile) edits, so the
     two surfaces can never disagree. The old tab rendered dead
     Edit / Change password / Change photo buttons with no wiring;
     identity fields (email, photo) come from the sign-in provider
     and are labeled as such instead of pretending to be editable. */
  const [prefName, setPrefName] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  /* Partner-access target — the sticky-selected site whose Share
     panel hosts the co-host invite flow. */
  const { sites } = useUserSites();
  const shareSite = resolveStickySite(sites);
  /* The orchard mark — shared cache, so the topbar + sidebar
     update the moment a tile is tapped. */
  const { avatarId, setAvatarId } = useUserAvatar();
  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/preferences', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        /* GET returns the prefs row flat — the old `.preferences.`
           path never matched, so saved names didn't load back. */
        const row = d as { display_name?: string | null; preferences?: { display_name?: string | null } } | null;
        const n = row?.display_name ?? row?.preferences?.display_name;
        if (!cancelled && typeof n === 'string' && n.trim()) setPrefName(n);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const effectiveName = prefName ?? user.name;
  function saveName() {
    const v = draft.trim();
    setPrefName(v || null);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    void fetch('/api/user/preferences', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: v || null }),
    }).catch(() => { /* optimistic — re-syncs on next open */ });
  }
  return (
    <div>
      <SettingsHead title="Account" sub="Your profile and how we reach you." />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 0 18px', flexWrap: 'wrap' }}>
        {avatarId ? (
          <PlAvatar id={avatarId} size={64} />
        ) : user.image ? (
          <img src={user.image} alt={effectiveName} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage-deep), var(--sage))', color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 700 }}>{user.initials}</div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{effectiveName}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{user.joined}</div>
        </div>
      </div>

      {/* Your mark — the orchard avatars. Picked by id, rendered
          everywhere the account shows a face (topbar, sidebar,
          this modal). "No mark" falls back to photo / initials. */}
      <div style={{ padding: '2px 0 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>
          Your mark
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {PL_AVATARS.map((a) => {
            const on = avatarId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAvatarId(on ? null : a.id)}
                aria-pressed={on}
                title={a.label}
                style={{
                  width: 48, height: 48, padding: 0,
                  borderRadius: 14,
                  border: on ? '2px solid var(--sage-deep, #3D4A1F)' : '2px solid transparent',
                  background: 'transparent',
                  cursor: 'pointer',
                  boxShadow: on ? '0 0 0 2px var(--card), 0 4px 10px rgba(61,74,31,0.16)' : 'none',
                  transition: 'transform var(--pl-dur-fast, 180ms) var(--pl-ease-spring, ease), box-shadow var(--pl-dur-fast, 180ms) var(--pl-ease-out, ease)',
                  transform: on ? 'translateY(-1px)' : 'none',
                }}
              >
                <PlAvatar id={a.id} size={44} round={false} />
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 8 }}>
          {avatarId
            ? 'Tap your mark again to go back to your photo or initials.'
            : 'Pick a mark, or stay with your sign-in photo.'}
        </div>
      </div>
      <UsRow>
        {editing ? (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 3 }}>Display name</div>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false); }}
                style={{ width: '100%', maxWidth: 280, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--cream-2)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={saveName}>Save</button>
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <>
            <UsField label="Display name" value={<>{effectiveName}{saved && <span style={{ marginLeft: 8, fontSize: 11.5, color: 'var(--sage-deep)', fontWeight: 600 }}>✓ Saved</span>}</>} />
            <button className="btn btn-outline btn-sm" onClick={() => { setDraft(effectiveName); setEditing(true); }}>Edit</button>
          </>
        )}
      </UsRow>
      <UsRow>
        <UsField label="Email" value={user.email} />
        <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>Managed by your sign-in provider</span>
      </UsRow>
      <UsRow style={{ borderBottom: 'none' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--lavender-2)', color: '#3D4A1F', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>+</div>
        <UsField label="Partner access" value="Invite a co-host to edit your site" />
        {/* Co-host invites live in the editor's Share panel (the
            flow that mints /api/co-host/invite magic links). The
            old target — /dashboard/connections — links SITES into
            celebrations and has nothing to do with people. */}
        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            if (typeof window === 'undefined') return;
            window.location.assign(shareSite ? `/editor/${shareSite.domain}?jump=share` : '/dashboard/event');
          }}
        >
          {shareSite ? 'Invite' : 'Manage'}
        </button>
      </UsRow>
    </div>
  );
}

function UsageTab({ usage, planLabel, onUpgrade }: { usage: UsageData; planLabel: string; onUpgrade: () => void }) {
  const pearPct = Math.round((usage.pear.used / usage.pear.total) * 100);
  const sitePct = Math.round((usage.sites.used / usage.sites.total) * 100);
  return (
    <div>
      <SettingsHead title="Usage & credits" sub={`${usage.cycle} · on the ${planLabel} plan.`} />
      <div style={{ background: 'linear-gradient(150deg, var(--peach-bg), var(--lavender-bg))', borderRadius: 16, padding: 18, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(61,74,31,0.12)" strokeWidth="8" />
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--sage-deep)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(pearPct / 100) * 188} 188`} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><Pear size={26} tone="sage" shadow={false} /></div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--peach-ink)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{usage.pear.label}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>{usage.pear.total - usage.pear.used} <span style={{ fontSize: 15, color: 'var(--ink-soft)' }}>of {usage.pear.total} left</span></div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{usage.pear.used} used this cycle</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onUpgrade}>Get more</button>
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '6px 0 8px' }}>Where credits went</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
        {usage.breakdown.map((b) => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center' }}><Icon name={b.icon} size={14} color="var(--ink-soft)" /></span>
            <span style={{ flex: 1, fontSize: 13.5 }}>{b.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{b.used}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Event sites</span>
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{usage.sites.used} of {usage.sites.total} used</span>
      </div>
      <div style={{ height: 8, background: 'var(--cream-2)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${sitePct}%`, height: '100%', background: 'linear-gradient(90deg, var(--sage), var(--sage-deep))', borderRadius: 999 }} />
      </div>
    </div>
  );
}

function SubscriptionTab({ plans }: { plans: PlanShape[] }) {
  return (
    <div>
      <SettingsHead title="Subscription" sub="Manage your plan and billing." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
        {plans.map((p) => (
          <div key={p.id} style={{ position: 'relative', borderRadius: 16, padding: 16, background: p.current ? 'linear-gradient(165deg, var(--sage-tint), var(--card))' : 'var(--card)', border: p.current ? '2px solid var(--sage-deep)' : '1px solid var(--line)' }}>
            {p.current && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sage-deep)', background: 'var(--card)', padding: '3px 8px', borderRadius: 999 }}>Current</span>}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>{p.name}</div>
            <div style={{ margin: '4px 0 12px' }}><span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700 }}>{p.price}</span> <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{p.per}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
              {p.features.map((f) => (
                <div key={f} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: 'var(--ink-soft)' }}>
                  <Icon name="check" size={12} color="var(--sage-deep)" style={{ flexShrink: 0, marginTop: 2 }} /> {f}
                </div>
              ))}
            </div>
            {p.current || p.cta === 'Included' ? (
              <button className="btn btn-outline btn-sm" disabled style={{ width: '100%', justifyContent: 'center', opacity: 0.6 }}>{p.cta}</button>
            ) : (
              /* Upgrades go through the pricing section's Stripe
                 checkout — there is no in-modal purchase flow, so
                 the CTA is a real link instead of a dead button. */
              <Link href="/#pricing" className={`btn ${p.id === 'legacy' ? 'btn-primary' : 'btn-outline'} btn-sm`} style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>{p.cta}</Link>
            )}
          </div>
        ))}
      </div>
      <UsRow style={{ borderBottom: 'none' }}>
        <UsField label="Billing" value="Purchases are one-time through Stripe — receipts arrive by email." />
        <Link href="/#pricing" className="btn btn-outline btn-sm" style={{ textDecoration: 'none' }}>See pricing</Link>
      </UsRow>
    </div>
  );
}

function PreferencesTab() {
  const [notif, setNotif] = useState(true);
  const [digest, setDigest] = useState(true);
  const [autosave, setAutosave] = useState(true);
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetch('/api/user/preferences', { method: 'GET', credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.preferences) {
          if (typeof data.preferences.email_notifications === 'boolean') setNotif(data.preferences.email_notifications);
          if (typeof data.preferences.weekly_digest === 'boolean') setDigest(data.preferences.weekly_digest);
          if (typeof data.preferences.autosave === 'boolean') setAutosave(data.preferences.autosave);
          if (typeof data.preferences.reduced_motion === 'boolean') setMotion(data.preferences.reduced_motion);
        }
      })
      .catch(() => {});
  }, []);
  const patch = (body: Record<string, boolean>) => {
    if (typeof window === 'undefined') return;
    fetch('/api/user/preferences', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
  };
  const { preference, setPreference } = useTheme();
  return (
    <div>
      <SettingsHead title="Preferences" sub="How Pearloom behaves for you." />
      {/* Appearance — light / dark / follow-system. The theme has
          been switchable since the boot script shipped, but nothing
          in settings ever exposed it. */}
      <UsRow>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Appearance</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Editorial paper or editorial midnight.</div>
        </div>
        <div style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--cream-2)', borderRadius: 999, flexShrink: 0 }}>
          {([['light', 'Light'], ['dark', 'Dark'], ['system', 'System']] as const).map(([id, label]) => {
            const on = preference === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => setPreference(id)}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                  background: on ? 'var(--ink)' : 'transparent',
                  color: on ? 'var(--cream)' : 'var(--ink-soft)',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </UsRow>
      <UsRow><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>Email notifications</div><div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>RSVPs, partner edits, and Pear nudges.</div></div><UsToggle on={notif} set={(v) => { setNotif(v); patch({ email_notifications: v }); }} /></UsRow>
      <UsRow><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>Weekly digest</div><div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>A Sunday summary of what changed.</div></div><UsToggle on={digest} set={(v) => { setDigest(v); patch({ weekly_digest: v }); }} /></UsRow>
      <UsRow><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>Autosave</div><div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Save edits as you go.</div></div><UsToggle on={autosave} set={(v) => { setAutosave(v); patch({ autosave: v }); }} /></UsRow>
      <UsRow><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>Reduced motion</div><div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Calm the scroll-reveal animations.</div></div><UsToggle on={motion} set={(v) => { setMotion(v); patch({ reduced_motion: v }); }} /></UsRow>
      <UsRow style={{ borderBottom: 'none' }}><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500, color: 'var(--pl-plum, #b4543a)' }}>Export or delete account</div><div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Both live in account settings, with a proper confirm step.</div></div><button className="btn btn-outline btn-sm" style={{ color: 'var(--pl-plum, #b4543a)', borderColor: 'color-mix(in oklab, var(--pl-plum, #b4543a) 30%, transparent)' }} onClick={() => { if (typeof window !== 'undefined') window.location.assign('/dashboard/profile'); }}>Open settings</button></UsRow>
    </div>
  );
}

/* ─── Main modal (verbatim from prototype) ────────────────────────────── */

export function UserSettingsModal({
  open,
  onClose,
  tab: tabProp,
  setTab: setTabProp,
}: {
  open: boolean;
  onClose: () => void;
  tab?: SettingsTab;
  setTab?: (t: SettingsTab) => void;
}) {
  const [localTab, setLocalTab] = useState<SettingsTab>('account');
  const tab = tabProp ?? localTab;
  const setTab = setTabProp ?? setLocalTab;
  const { data: session } = useSession();
  const [usage, setUsage] = useState<UsageData>(DEFAULT_USAGE);
  /* Phone-sized viewport — the desktop 232px-rail grid crushed the
     content column to ~130px on phones (one-word-per-line wraps).
     Below 768px the rail becomes a horizontal tab strip on top and
     the content gets the full width. */
  const isPhone = useMobileViewport();
  const { avatarId } = useUserAvatar();
  /* Live plan — /api/store/entitlements via the shared usePlan hook
     (same source as the sidebar strip). The previous code hardcoded
     'Bloom plan' in the rail regardless of reality. */
  const planInfo = usePlan();

  const user = useMemo(() => {
    const name = session?.user?.name ?? 'Pearloom Host';
    const email = session?.user?.email ?? '';
    const initials = name.split(/\s+/).filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'P';
    return { name, email, initials, joined: 'Member of Pearloom', image: session?.user?.image ?? null };
  }, [session]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    fetch('/api/ai-usage', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const used = data.used ?? 0;
          const total = data.total ?? 500;
          setUsage({
            cycle: data.cycle ?? 'Resets monthly',
            pear: { used, total, label: 'Pear AI credits' },
            breakdown: [
              { label: 'Design a look from your story', used: Math.round(used * 0.4), icon: 'sparkles' },
              { label: 'Copy & wording drafts', used: Math.round(used * 0.35), icon: 'text' },
              { label: 'Palette from photos', used: Math.round(used * 0.15), icon: 'image' },
              { label: 'Guest message cadences', used: Math.max(0, used - Math.round(used * 0.9)), icon: 'mail' },
            ],
            sites: { used: data.sites_used ?? 0, total: data.sites_total ?? 5 },
          });
        }
      })
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'account', label: 'Account', icon: 'user' },
    { id: 'usage', label: 'Usage & credits', icon: 'sparkles' },
    { id: 'subscription', label: 'Subscription', icon: 'star' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'preferences', label: 'Preferences', icon: 'settings' },
  ];
  const plans = planList(planInfo.plan);

  return (
    // Backdrop fades with the panel (it used to snap on while the
    // panel scaled in). pl8-content-fade-in is the shared 320ms fade.
    <div className="pl8 pl8-content-fade-in" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(40,40,30,0.45)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: isPhone ? 12 : 24, boxSizing: 'border-box' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: isPhone ? 'calc(100vw - 24px)' : 'min(880px, 96vw)', maxWidth: '100%', height: isPhone ? 'min(700px, 92dvh)' : 'min(620px, 92vh)', background: 'var(--card)', borderRadius: 22, overflow: 'hidden', display: 'grid', gridTemplateColumns: isPhone ? '1fr' : '232px 1fr', gridTemplateRows: isPhone ? 'auto 1fr' : undefined, boxShadow: 'var(--shadow-lg)', animation: 'us-in 240ms cubic-bezier(0.16,1,0.3,1)' } as CSSProperties}>
        <style>{`@keyframes us-in{from{transform:scale(0.97);opacity:0}to{transform:none;opacity:1}}`}</style>
        {/* left rail — horizontal tab strip on phones */}
        {isPhone ? (
          <div style={{ background: 'var(--cream-2)', borderBottom: '1px solid var(--line-soft)', padding: '10px 10px', display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
            {avatarId ? <PlAvatar id={avatarId} size={30} style={{ marginRight: 2 }} /> : <div aria-hidden style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage-deep), var(--sage))', color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginRight: 2 }}>{user.initials}</div>}
            {tabs.map((t) => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0, cursor: 'pointer', background: on ? 'var(--card)' : 'transparent', color: on ? 'var(--ink)' : 'var(--ink-soft)', fontSize: 12.5, fontWeight: on ? 700 : 500, boxShadow: on ? '0 1px 3px rgba(61,74,31,0.08)' : 'none', border: 'none', fontFamily: 'inherit', transition: 'background var(--pl-dur-quick) var(--pl-ease-out), color var(--pl-dur-quick) var(--pl-ease-out), box-shadow var(--pl-dur-quick) var(--pl-ease-out)' }}>
                  <Icon name={t.icon} size={13} color={on ? 'var(--sage-deep)' : 'var(--ink-muted)'} /> {t.label}
                </button>
              );
            })}
            <button onClick={() => signOut({ callbackUrl: '/' })} aria-label="Sign out" title="Sign out" style={{ marginLeft: 'auto', flexShrink: 0, width: 32, height: 32, borderRadius: 999, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <Icon name="arrow-left" size={14} color="var(--ink-muted)" />
            </button>
          </div>
        ) : (
        <div style={{ background: 'var(--cream-2)', borderRight: '1px solid var(--line-soft)', padding: 16, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 16px' }}>
            {avatarId ? <PlAvatar id={avatarId} size={36} /> : <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage-deep), var(--sage))', color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700 }}>{user.initials}</div>}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{planInfo.label} plan</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tabs.map((t) => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', background: on ? 'var(--card)' : 'transparent', color: on ? 'var(--ink)' : 'var(--ink-soft)', fontSize: 13.5, fontWeight: on ? 700 : 500, boxShadow: on ? '0 1px 3px rgba(61,74,31,0.08)' : 'none', border: 'none', transition: 'background var(--pl-dur-quick) var(--pl-ease-out), color var(--pl-dur-quick) var(--pl-ease-out), box-shadow var(--pl-dur-quick) var(--pl-ease-out)' }}>
                  <Icon name={t.icon} size={15} color={on ? 'var(--sage-deep)' : 'var(--ink-muted)'} /> {t.label}
                </button>
              );
            })}
          </div>
          <button onClick={() => signOut({ callbackUrl: '/' })} style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: 'var(--ink-soft)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <Icon name="arrow-left" size={15} color="var(--ink-muted)" /> Sign out
          </button>
        </div>
        )}
        {/* content */}
        <div style={{ position: 'relative', overflow: 'auto', minHeight: 0, padding: isPhone ? '18px 16px 20px' : '24px 28px' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', zIndex: 2, border: 'none', cursor: 'pointer' }}><Icon name="close" size={15} color="var(--ink-soft)" /></button>
          {/* key={tab} + pl8-tab-enter: tab switches crossfade instead
              of hard-swapping. */}
          <div key={tab} className="pl8-tab-enter">
            {tab === 'account' && <AccountTab user={user} />}
            {tab === 'usage' && <UsageTab usage={usage} planLabel={planInfo.label} onUpgrade={() => setTab('subscription')} />}
            {tab === 'subscription' && <SubscriptionTab plans={plans} />}
            {tab === 'notifications' && <NotificationPrefsTab />}
            {tab === 'preferences' && <PreferencesTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserSettingsModal;
