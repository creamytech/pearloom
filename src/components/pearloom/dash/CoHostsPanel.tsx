'use client';

/* ========================================================================
   CoHostsPanel — host UI for inviting + managing collaborators on a site.
   Reads/writes /api/sites/co-host. Three roles supported by the API:
     editor       — can edit content, can't publish
     guest-manager — can manage RSVPs + comms, can't edit content
     viewer       — read-only
   ======================================================================== */

import { useEffect, useState } from 'react';
import { Icon } from '../motifs';

type Role = 'editor' | 'guest-manager' | 'viewer';

interface Collaborator {
  id: string;
  email: string;
  role: Role;
  status: 'invited' | 'accepted';
  invited_at: string;
}

const ROLE_OPTIONS: Array<{ value: Role; label: string; help: string }> = [
  { value: 'editor', label: 'Editor', help: 'Can edit any block, can\'t publish.' },
  { value: 'guest-manager', label: 'Guest manager', help: 'Sees RSVPs + can message guests.' },
  { value: 'viewer', label: 'Viewer', help: 'Read-only — links + drafts only.' },
];

export function CoHostsPanel({ siteId, siteDomain }: { siteId: string; siteDomain: string }) {
  const [collabs, setCollabs] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch(`/api/sites/co-host?siteId=${encodeURIComponent(siteId)}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as { collaborators?: Collaborator[] };
      setCollabs(data.collaborators ?? []);
    } catch {}
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [siteId]);

  async function invite() {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    setPendingLink(null);
    try {
      const res = await fetch('/api/sites/co-host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, email: email.trim().toLowerCase(), role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `Invite failed (${res.status})`);
      }
      const data = (await res.json()) as { invite?: { token: string }; url?: string };
      const url =
        data.url ??
        (typeof window !== 'undefined' && data.invite?.token
          ? `${window.location.origin}/co-host/accept?token=${data.invite.token}`
          : null);
      if (url) setPendingLink(url);
      setEmail('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!window.confirm('Revoke this collaborator?')) return;
    try {
      const res = await fetch(`/api/sites/co-host?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) await refresh();
    } catch {}
  }

  return (
    <div
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--peach-ink)',
          marginBottom: 10,
        }}
      >
        Collaborators · {siteDomain}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@somewhere.com"
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: 'var(--cream-2)',
            fontSize: 14,
            color: 'var(--ink)',
            fontFamily: 'inherit',
          }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: 'var(--cream-2)',
            fontSize: 14,
            color: 'var(--ink)',
          }}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button type="button" className="btn btn-primary btn-sm" onClick={invite} disabled={busy || !email.trim()}>
          {busy ? 'Sending…' : 'Invite'}
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 8, lineHeight: 1.5 }}>
        {ROLE_OPTIONS.find((o) => o.value === role)?.help}
      </div>
      {error && <div style={{ fontSize: 12, color: '#7A2D2D', marginBottom: 8 }}>{error}</div>}
      {pendingLink && (
        <div style={{ fontSize: 12, padding: 10, background: 'var(--sage-tint)', borderRadius: 8, marginBottom: 12, wordBreak: 'break-all' }}>
          Invite link (copy + send): <a href={pendingLink} style={{ color: 'var(--sage-deep)' }}>{pendingLink}</a>
        </div>
      )}

      {collabs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {collabs.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: 'var(--cream-2)',
                borderRadius: 10,
                gap: 10,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>
                  {c.role} · {c.status}
                </div>
              </div>
              <button
                type="button"
                onClick={() => revoke(c.id)}
                aria-label="Revoke"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--line)',
                  color: 'var(--ink-soft)',
                  padding: '4px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                <Icon name="close" size={11} /> Revoke
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
