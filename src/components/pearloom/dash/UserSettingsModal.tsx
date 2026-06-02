'use client';

/* =========================================================================
   PEARLOOM — USER SETTINGS MODAL
   A Claude-style account popover: profile, usage credits, subscription,
   preferences. Literal port of ClaudeDesign/pages/user-settings.jsx.
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
import { signOut, useSession } from 'next-auth/react';
import { Icon, Pear } from '../motifs';

type SettingsTab = 'account' | 'usage' | 'subscription' | 'preferences';

interface UserSettingsContextValue {
  open: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  openTab: (tab: SettingsTab) => void;
  setOpen: (next: boolean) => void;
}

const UserSettingsContext = createContext<UserSettingsContextValue | null>(null);

export function useUserSettings(): UserSettingsContextValue {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) {
    return {
      open: false,
      openSettings: () => {},
      closeSettings: () => {},
      openTab: () => {},
      setOpen: () => {},
    };
  }
  return ctx;
}

export function UserSettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SettingsTab>('account');
  const openSettings = useCallback(() => setOpen(true), []);
  const closeSettings = useCallback(() => setOpen(false), []);
  const openTab = useCallback((next: SettingsTab) => {
    setTab(next);
    setOpen(true);
  }, []);
  const value = useMemo<UserSettingsContextValue>(
    () => ({ open, openSettings, closeSettings, openTab, setOpen }),
    [open, openSettings, closeSettings, openTab],
  );
  return (
    <UserSettingsContext.Provider value={value}>
      {children}
      {open && (
        <UserSettingsModal
          open={open}
          onClose={closeSettings}
          tab={tab}
          setTab={setTab}
        />
      )}
    </UserSettingsContext.Provider>
  );
}

/* ---------- live data wiring ---------- */

interface UsageData {
  plan: string;
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
}

interface PreferencesData {
  voice?: string;
  quiet_hours?: boolean;
  display_name?: string | null;
  pronouns?: string | null;
  timezone?: string | null;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function planNameFor(plan: string | undefined | null): string {
  const p = String(plan ?? 'free').toLowerCase();
  if (['atelier', 'forever', 'legacy'].includes(p)) return 'Forever';
  if (['pro', 'bloom', 'premium'].includes(p)) return 'Bloom';
  return 'Free';
}

/* ---------- small UI atoms ---------- */
function UsRow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid var(--line-soft)', ...style }}>{children}</div>;
}
function UsToggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} style={{ width: 40, height: 23, borderRadius: 999, background: on ? 'var(--sage-deep)' : 'var(--cream-3)', position: 'relative', flexShrink: 0, transition: 'background 160ms ease', cursor: 'pointer' } as CSSProperties}>
      <span style={{ position: 'absolute', top: 2.5, left: on ? 19.5 : 2.5, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 160ms cubic-bezier(0.16,1,0.3,1)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}/>
    </button>
  );
}
function UsField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{value}</div>
    </div>
  );
}

/* ---------- tabs ---------- */
function AccountTab({ user }: { user: { name: string; email: string; initials: string; joined: string; partner: { name: string; initials: string } } }) {
  return (
    <div>
      <SettingsHead title="Account" sub="Your profile and how we reach you."/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 0 18px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage-deep), var(--sage))', color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 700 }}>{user.initials}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600 }}>{user.name}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>{user.joined}</div>
        </div>
        <button className="btn btn-outline btn-sm"><Icon name="image" size={12}/> Change photo</button>
      </div>
      <UsRow><UsField label="Full name" value={user.name}/><button className="btn btn-outline btn-sm">Edit</button></UsRow>
      <UsRow><UsField label="Email" value={user.email}/><button className="btn btn-outline btn-sm">Edit</button></UsRow>
      <UsRow><UsField label="Password" value="••••••••••"/><button className="btn btn-outline btn-sm">Change</button></UsRow>
      <UsRow style={{ borderBottom: 'none' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--lavender-2)', color: '#3D4A1F', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700 }}>{user.partner.initials}</div>
        <UsField label="Partner access" value={`${user.partner.name} can edit this site`}/>
        <button className="btn btn-outline btn-sm">Manage</button>
      </UsRow>
    </div>
  );
}

function UsageTab({ usage, planName }: { usage: UsageData | null; planName: string }) {
  const total = usage?.limit ?? 500;
  const used = usage?.used ?? 0;
  const cycle = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    return `Resets ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }, []);
  const pearPct = total > 0 ? Math.round((used / total) * 100) : 0;
  const sitesUsed = 3;
  const sitesTotal = 5;
  const sitePct = Math.round((sitesUsed / sitesTotal) * 100);
  const breakdown = [
    { label: 'Design a look from your story', used: Math.round(used * 0.4), icon: 'sparkles' },
    { label: 'Copy & wording drafts', used: Math.round(used * 0.35), icon: 'text' },
    { label: 'Palette from photos', used: Math.round(used * 0.15), icon: 'image' },
    { label: 'Guest message cadences', used: Math.max(0, used - Math.round(used * 0.4) - Math.round(used * 0.35) - Math.round(used * 0.15)), icon: 'mail' },
  ];
  return (
    <div>
      <SettingsHead title="Usage & credits" sub={cycle + ` · on the ${planName} plan.`}/>
      {/* Pear credits ring + bar */}
      <div style={{ background: 'linear-gradient(150deg, var(--peach-bg), var(--lavender-bg))', borderRadius: 16, padding: 18, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(61,74,31,0.12)" strokeWidth="8"/>
            <circle cx="36" cy="36" r="30" fill="none" stroke="var(--sage-deep)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(pearPct / 100) * 188} 188`}/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><Pear size={26} tone="sage" shadow={false}/></div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--peach-ink)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Pear AI credits</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 600, lineHeight: 1.1 }}>{Math.max(0, total - used)} <span style={{ fontSize: 15, color: 'var(--ink-soft)' }}>of {total} left</span></div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{used} used this cycle</div>
        </div>
        <button className="btn btn-primary btn-sm">Get more</button>
      </div>
      {/* breakdown */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', margin: '6px 0 8px' }}>Where credits went</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
        {breakdown.map(b => (
          <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--cream-2)', display: 'grid', placeItems: 'center' }}><Icon name={b.icon} size={14} color="var(--ink-soft)"/></span>
            <span style={{ flex: 1, fontSize: 13.5 }}>{b.label}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{b.used}</span>
          </div>
        ))}
      </div>
      {/* sites */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>Event sites</span>
        <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{sitesUsed} of {sitesTotal} used</span>
      </div>
      <div style={{ height: 8, background: 'var(--cream-2)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ width: `${sitePct}%`, height: '100%', background: 'linear-gradient(90deg, var(--sage), var(--sage-deep))', borderRadius: 999 }}/>
      </div>
    </div>
  );
}

function SubscriptionTab({ planName }: { planName: string }) {
  const plans = [
    { id: 'free', name: 'Free', price: '$0', per: 'forever', features: ['1 event site', '50 Pear credits / mo', 'Core theme packs'], cta: 'Downgrade' },
    { id: 'bloom', name: 'Bloom', price: '$12', per: 'per month', features: ['5 event sites', '500 Pear credits / mo', 'All theme packs + store', 'Custom domain', 'Partner access'], cta: 'Current plan' },
    { id: 'forever', name: 'Forever', price: '$240', per: 'one-time', features: ['Unlimited sites', 'Unlimited Pear credits', 'Everything in Bloom', 'Lifetime — no renewals', 'Priority support'], cta: 'Upgrade' },
  ];
  return (
    <div>
      <SettingsHead title="Subscription" sub="Manage your plan and billing."/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {plans.map(p => {
          const current = p.name === planName;
          return (
            <div key={p.id} style={{ position: 'relative', borderRadius: 16, padding: 16, background: current ? 'linear-gradient(165deg, var(--sage-tint), var(--card))' : 'var(--card)', border: current ? '2px solid var(--sage-deep)' : '1px solid var(--line)' }}>
              {current && <span style={{ position: 'absolute', top: 12, right: 12, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sage-deep)', background: 'var(--card)', padding: '3px 8px', borderRadius: 999 }}>Current</span>}
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 600 }}>{p.name}</div>
              <div style={{ margin: '4px 0 12px' }}><span style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700 }}>{p.price}</span> <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{p.per}</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: 'var(--ink-soft)' }}>
                    <Icon name="check" size={12} color="var(--sage-deep)" style={{ flexShrink: 0, marginTop: 2 }}/> {f}
                  </div>
                ))}
              </div>
              <button className={`btn ${current ? 'btn-outline' : p.id === 'forever' ? 'btn-primary' : 'btn-outline'} btn-sm`} disabled={current} style={{ width: '100%', justifyContent: 'center', opacity: current ? 0.6 : 1 }}>{current ? 'Current plan' : p.cta}</button>
            </div>
          );
        })}
      </div>
      <UsRow><UsField label="Billing" value="Visa ending 4242 · renews May 1, 2025"/><button className="btn btn-outline btn-sm">Manage billing</button></UsRow>
      <UsRow style={{ borderBottom: 'none' }}><UsField label="Invoices" value="Download past receipts"/><button className="btn btn-outline btn-sm">View all</button></UsRow>
    </div>
  );
}

function PreferencesTab() {
  const [notif, setNotif] = useState(true);
  const [digest, setDigest] = useState(true);
  const [autosave, setAutosave] = useState(true);
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/user/preferences', { cache: 'no-store' });
        if (!r.ok) return;
        const d = (await r.json()) as PreferencesData;
        if (cancelled) return;
        if (typeof d?.quiet_hours === 'boolean') setNotif(!d.quiet_hours);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);
  const patch = useCallback((body: Partial<PreferencesData>) => {
    void fetch('/api/user/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  }, []);
  return (
    <div>
      <SettingsHead title="Preferences" sub="How Pearloom behaves for you."/>
      <UsRow><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>Email notifications</div><div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>RSVPs, partner edits, and Pear nudges.</div></div><UsToggle on={notif} set={(v) => { setNotif(v); patch({ quiet_hours: !v }); }}/></UsRow>
      <UsRow><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>Weekly digest</div><div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>A Sunday summary of what changed.</div></div><UsToggle on={digest} set={setDigest}/></UsRow>
      <UsRow><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>Autosave</div><div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Save edits as you go.</div></div><UsToggle on={autosave} set={setAutosave}/></UsRow>
      <UsRow><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500 }}>Reduced motion</div><div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Calm the scroll-reveal animations.</div></div><UsToggle on={motion} set={setMotion}/></UsRow>
      <UsRow style={{ borderBottom: 'none' }}><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 500, color: '#b4543a' }}>Delete account</div><div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Permanently remove your data.</div></div><button className="btn btn-outline btn-sm" style={{ color: '#b4543a', borderColor: 'rgba(180,84,58,0.3)' }}>Delete</button></UsRow>
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

export function UserSettingsModal({ open, onClose, tab: tabProp, setTab: setTabProp }: { open: boolean; onClose: () => void; tab?: SettingsTab; setTab?: (next: SettingsTab) => void }) {
  const { data: session } = useSession();
  const [internalTab, setInternalTab] = useState<SettingsTab>('account');
  const tab = tabProp ?? internalTab;
  const setTab = setTabProp ?? setInternalTab;

  const name = session?.user?.name ?? 'Guest';
  const email = session?.user?.email ?? '';
  const initials = initialsFromName(name);

  const [usage, setUsage] = useState<UsageData | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch('/api/ai-usage', { cache: 'no-store' });
        if (!r.ok) return;
        const d = (await r.json()) as UsageData;
        if (!cancelled) setUsage(d);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [open]);

  const planName = planNameFor(usage?.plan);
  const user = {
    name,
    email,
    initials,
    joined: 'Member since March 2025',
    partner: { name: 'Shauna', initials: 'S' },
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'account', label: 'Account', icon: 'user' },
    { id: 'usage', label: 'Usage & credits', icon: 'sparkles' },
    { id: 'subscription', label: 'Subscription', icon: 'star' },
    { id: 'preferences', label: 'Preferences', icon: 'settings' },
  ];

  if (!open) return null;

  return (
    <div className="pl8" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(40,40,30,0.45)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 24 } as CSSProperties}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(880px, 96vw)', height: 'min(620px, 92vh)', background: 'var(--card)', borderRadius: 22, overflow: 'hidden', display: 'grid', gridTemplateColumns: '232px 1fr', boxShadow: 'var(--shadow-lg)', animation: 'us-in 240ms cubic-bezier(0.16,1,0.3,1)' }}>
        <style>{`@keyframes us-in{from{transform:scale(0.97);opacity:0}to{transform:none;opacity:1}}`}</style>
        {/* left rail */}
        <div style={{ background: 'var(--cream-2)', borderRight: '1px solid var(--line-soft)', padding: 16, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px 16px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--sage-deep), var(--sage))', color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 700 }}>{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{planName} plan</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tabs.map(t => {
              const on = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', background: on ? 'var(--card)' : 'transparent', color: on ? 'var(--ink)' : 'var(--ink-soft)', fontSize: 13.5, fontWeight: on ? 700 : 500, boxShadow: on ? '0 1px 3px rgba(61,74,31,0.08)' : 'none', border: 'none' } as CSSProperties}>
                  <Icon name={t.icon} size={15} color={on ? 'var(--sage-deep)' : 'var(--ink-muted)'}/> {t.label}
                </button>
              );
            })}
          </div>
          <button onClick={() => { onClose(); signOut({ callbackUrl: '/' }); }} style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, color: 'var(--ink-soft)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' } as CSSProperties}>
            <Icon name="arrow-left" size={15} color="var(--ink-muted)"/> Sign out
          </button>
        </div>
        {/* content */}
        <div style={{ position: 'relative', overflow: 'auto', padding: '24px 28px' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 18, right: 18, width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--cream-2)', zIndex: 2, border: 'none', cursor: 'pointer' } as CSSProperties}><Icon name="close" size={15} color="var(--ink-soft)"/></button>
          {tab === 'account' && <AccountTab user={user}/>}
          {tab === 'usage' && <UsageTab usage={usage} planName={planName}/>}
          {tab === 'subscription' && <SubscriptionTab planName={planName}/>}
          {tab === 'preferences' && <PreferencesTab/>}
        </div>
      </div>
    </div>
  );
}
