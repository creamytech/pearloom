'use client';

// ─────────────────────────────────────────────────────────────
// NotificationPrefsTab — Settings → Notifications.
//
// One row per category with a three-way email control
// (Instantly / Daily note / Off), and a Push section: enable
// this device (service-worker + PushManager subscription via
// /api/notifications/push), then per-category push chips.
//
// Reads /api/notifications/prefs on open; every change writes
// back immediately (optimistic — the grid never blocks on the
// network).
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { Icon } from '../motifs';

type EmailMode = 'instant' | 'digest' | 'off';
interface CategoryMeta { id: string; label: string; desc: string }
interface CategoryPref { emailMode: EmailMode; pushEnabled: boolean }

const EMAIL_MODES: Array<{ id: EmailMode; label: string }> = [
  { id: 'instant', label: 'Instantly' },
  { id: 'digest',  label: 'Daily note' },
  { id: 'off',     label: 'Off' },
];

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotificationPrefsTab() {
  const [categories, setCategories] = useState<CategoryMeta[]>([]);
  const [prefs, setPrefs] = useState<Record<string, CategoryPref>>({});
  const [loaded, setLoaded] = useState(false);
  const [pushState, setPushState] = useState<'unsupported' | 'unconfigured' | 'off' | 'pending' | 'on'>('off');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/notifications/prefs', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json() as { categories?: CategoryMeta[]; prefs?: Record<string, CategoryPref> | null };
        if (cancelled) return;
        setCategories(data.categories ?? []);
        if (data.prefs) setPrefs(data.prefs);
        setLoaded(true);
      } catch { /* grid stays in loading state */ }

      // Push capability probe.
      try {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
          if (!cancelled) setPushState('unsupported');
          return;
        }
        const keyRes = await fetch('/api/notifications/push');
        const { vapidPublicKey } = await keyRes.json() as { vapidPublicKey?: string | null };
        if (!vapidPublicKey) {
          if (!cancelled) setPushState('unconfigured');
          return;
        }
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        const sub = await reg?.pushManager.getSubscription();
        if (!cancelled) setPushState(sub ? 'on' : 'off');
      } catch {
        if (!cancelled) setPushState('off');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function save(category: string, patch: Partial<{ emailMode: EmailMode; pushEnabled: boolean }>) {
    setPrefs((p) => ({
      ...p,
      [category]: { ...(p[category] ?? { emailMode: 'digest', pushEnabled: false }), ...patch },
    }));
    void fetch('/api/notifications/prefs', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, ...patch }),
    }).catch(() => { /* optimistic — re-syncs on next open */ });
  }

  async function enablePush() {
    try {
      setPushState('pending');
      const keyRes = await fetch('/api/notifications/push');
      const { vapidPublicKey } = await keyRes.json() as { vapidPublicKey?: string | null };
      if (!vapidPublicKey) { setPushState('unconfigured'); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });
      const res = await fetch('/api/notifications/push', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setPushState(res.ok ? 'on' : 'off');
    } catch {
      setPushState('off'); // permission denied or subscribe failed
    }
  }

  async function disablePush() {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/notifications/push', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe();
      }
    } finally {
      setPushState('off');
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, margin: 0 }}>Notifications</h2>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
          The bell catches everything. Choose what reaches your inbox — instantly, in the daily note, or not at all.
        </div>
      </div>

      {!loaded ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 13 }}>Threading…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {categories.map((c) => {
            const pref = prefs[c.id] ?? { emailMode: 'digest' as EmailMode, pushEnabled: false };
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '13px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ flex: 1, minWidth: 170 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{c.desc}</div>
                </div>
                <div style={{ display: 'flex', gap: 3, padding: 3, background: 'var(--cream-2)', borderRadius: 999, flexShrink: 0 }}>
                  {EMAIL_MODES.map((m) => {
                    const on = pref.emailMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => save(c.id, { emailMode: m.id })}
                        style={{
                          padding: '5px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                          background: on ? 'var(--ink)' : 'transparent',
                          color: on ? 'var(--cream)' : 'var(--ink-soft)',
                          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Push ─────────────────────────────────────────── */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 8 }}>
              Push notifications
            </div>
            {pushState === 'unsupported' && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>This browser doesn&rsquo;t support push notifications.</div>
            )}
            {pushState === 'unconfigured' && (
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Push isn&rsquo;t configured on this deployment yet.</div>
            )}
            {(pushState === 'off' || pushState === 'pending') && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => void enablePush()}
                disabled={pushState === 'pending'}
              >
                <Icon name="bell" size={12} /> {pushState === 'pending' ? 'Asking the browser…' : 'Enable push on this device'}
              </button>
            )}
            {pushState === 'on' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--sage-deep)', fontWeight: 600 }}>✓ Push is on for this device</span>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => void disablePush()}>Turn off</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {categories.map((c) => {
                    const on = (prefs[c.id] ?? { pushEnabled: false }).pushEnabled;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => save(c.id, { pushEnabled: !on })}
                        style={{
                          padding: '5px 12px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                          background: on ? 'var(--sage-tint)' : 'transparent',
                          color: on ? 'var(--sage-deep)' : 'var(--ink-soft)',
                          border: on ? '1px solid var(--sage-deep)' : '1px solid var(--line)',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
