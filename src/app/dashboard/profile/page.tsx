'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/profile/page.tsx
// Account settings — editorial aesthetic, shared shell primitives.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
  Mail,
  Shield,
  Trash2,
  Download,
  LogOut,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PageCard } from '@/components/shell';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { downloadFile } from '@/lib/guest-services';

export default function ProfilePage() {
  const { data: session } = useSession();
  const [displayName, setDisplayName] = useState(session?.user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  const handleSaveName = async () => {
    setSaving(true);
    try {
      await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: displayName }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* noop */
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/sites');
      if (!res.ok) return;
      const data = await res.json();
      const exportData = {
        account: {
          email: session?.user?.email,
          name: displayName,
          exportedAt: new Date().toISOString(),
        },
        sites: data.sites || [],
      };
      downloadFile(
        JSON.stringify(exportData, null, 2),
        'pearloom-data-export.json',
        'application/json'
      );
    } catch {
      /* noop */
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await fetch('/api/auth/delete-account', { method: 'DELETE' });
      signOut({ callbackUrl: '/' });
    } catch {
      /* noop */
    }
  };

  const initial = (session?.user?.name || session?.user?.email || 'U')
    .charAt(0)
    .toUpperCase();

  return (
    <DashboardShell eyebrow="Account" contentMaxWidth={720}>
            {/* Editorial header */}
            <div
              style={{
                marginBottom: 32,
                paddingBottom: 24,
                borderBottom: '1px solid var(--pl-divider)',
              }}
            >
              <div className="pl-overline" style={{ marginBottom: 14 }}>
                Account · Preferences
              </div>
              <h1
                className="pl-display"
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)',
                  color: 'var(--pl-ink)',
                  lineHeight: 1.05,
                }}
              >
                Your{' '}
                <em
                  style={{
                    fontStyle: 'italic',
                    color: 'var(--pl-olive)',
                    fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
                  }}
                >
                  workspace
                </em>
                .
              </h1>
              <p
                style={{
                  margin: '10px 0 0',
                  color: 'var(--pl-muted)',
                  fontSize: '0.95rem',
                  lineHeight: 1.55,
                  maxWidth: '52ch',
                }}
              >
                Profile, plan, notifications, and the quiet controls for your data.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Profile */}
              <PageCard
                eyebrow="Profile"
                title={
                  <span
                    style={{
                      fontFamily: 'var(--pl-font-display)',
                      fontWeight: 500,
                      fontSize: '1.1rem',
                      color: 'var(--pl-ink)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Who you are
                  </span>
                }
                accent="olive"
              >
                {/* Editorial signature plate — gold-hairline framed monogram */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 18,
                  padding: '16px 18px',
                  marginBottom: 22,
                  background: 'var(--pl-cream-deep)',
                  borderRadius: 10,
                  border: '1px solid rgba(14,13,11,0.08)',
                  overflow: 'hidden',
                }}>
                  <span style={{
                    position: 'absolute', top: 0, left: '14px', right: '14px',
                    height: 1, background: 'rgba(184,147,90,0.50)',
                  }} />
                  <div style={{
                    position: 'relative',
                    width: 56, height: 56,
                    borderRadius: '50%',
                    background: 'var(--pl-cream-card)',
                    color: 'var(--pl-ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--pl-font-display)',
                    fontStyle: 'italic',
                    fontSize: '1.7rem',
                    fontWeight: 400,
                    lineHeight: 1,
                    border: '1px solid rgba(184,147,90,0.55)',
                    boxShadow: '0 0 0 4px rgba(184,147,90,0.10)',
                    flexShrink: 0,
                  }}>
                    {initial}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{
                      display: 'block',
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.48rem', fontWeight: 700,
                      letterSpacing: '0.28em', textTransform: 'uppercase',
                      color: 'var(--pl-olive)',
                      marginBottom: 4,
                    }}>
                      Author · signed in
                    </span>
                    <span style={{
                      display: 'block',
                      fontFamily: 'var(--pl-font-display)',
                      fontStyle: 'italic',
                      fontWeight: 400,
                      fontSize: '1.35rem',
                      lineHeight: 1.05,
                      color: 'var(--pl-ink)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {session?.user?.name || 'Untitled author'}
                    </span>
                    <span style={{
                      display: 'block',
                      marginTop: 3,
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.66rem',
                      letterSpacing: '0.06em',
                      color: 'rgba(14,13,11,0.55)',
                    }}>
                      {session?.user?.email}
                    </span>
                  </div>
                </div>

                <label
                  className="pl-overline"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  Display name
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 'var(--pl-radius-sm)',
                      border: '1px solid var(--pl-divider)',
                      background: 'var(--pl-cream)',
                      color: 'var(--pl-ink)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveName}
                    loading={saving}
                    icon={saved ? <Check size={12} /> : undefined}
                  >
                    {saved ? 'Saved' : 'Save'}
                  </Button>
                </div>

                <label
                  className="pl-overline"
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  Email
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 12px',
                    borderRadius: 'var(--pl-radius-sm)',
                    background: 'var(--pl-cream-deep)',
                    border: '1px solid var(--pl-divider-soft)',
                    fontSize: '0.88rem',
                    color: 'var(--pl-ink-soft)',
                  }}
                >
                  <Mail size={14} style={{ color: 'var(--pl-muted)' }} />
                  <span>{session?.user?.email}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.66rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: 'var(--pl-muted)',
                    }}
                  >
                    via Google
                  </span>
                </div>
              </PageCard>

              {/* Plan & Billing */}
              <PageCard
                eyebrow="Plan · Billing"
                title={
                  <span
                    style={{
                      fontFamily: 'var(--pl-font-display)',
                      fontWeight: 500,
                      fontSize: '1.1rem',
                      color: 'var(--pl-ink)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Journal plan
                  </span>
                }
                accent="gold"
              >
                {/* Subscription ledger specimen */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 20,
                  marginBottom: 20,
                  padding: '18px 20px',
                  background: 'var(--pl-cream-deep)',
                  border: '1px solid rgba(184,147,90,0.30)',
                  borderRadius: 10,
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <span style={{
                    position: 'absolute', top: 0, left: '16px', right: '16px',
                    height: 1, background: 'rgba(184,147,90,0.55)',
                  }} />
                  <div>
                    <span style={{
                      display: 'block',
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.48rem', fontWeight: 700,
                      letterSpacing: '0.28em', textTransform: 'uppercase',
                      color: 'var(--pl-gold)',
                      marginBottom: 8,
                    }}>
                      Current plan
                    </span>
                    <span style={{
                      display: 'block',
                      fontFamily: 'var(--pl-font-display)',
                      fontStyle: 'italic',
                      fontWeight: 400,
                      fontSize: '1.8rem',
                      lineHeight: 1,
                      color: 'var(--pl-ink)',
                      marginBottom: 10,
                    }}>
                      Reader
                    </span>
                    <p style={{
                      margin: 0,
                      fontFamily: 'var(--pl-font-body)',
                      fontSize: '0.8rem',
                      lineHeight: 1.55,
                      color: 'var(--pl-ink-soft)',
                      maxWidth: 360,
                    }}>
                      Free forever — unlimited sites with the core chapter set. Atelier unlocks every block, every guest, and the full event OS.
                    </p>
                  </div>
                  <div style={{
                    alignSelf: 'flex-start',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '10px 14px',
                    borderLeft: '1px dashed rgba(184,147,90,0.45)',
                    minWidth: 92,
                  }}>
                    <span style={{
                      fontFamily: 'var(--pl-font-mono)',
                      fontSize: '0.46rem', fontWeight: 700,
                      letterSpacing: '0.28em', textTransform: 'uppercase',
                      color: 'rgba(14,13,11,0.50)',
                    }}>
                      Price
                    </span>
                    <span style={{
                      fontFamily: 'var(--pl-font-display)',
                      fontStyle: 'italic',
                      fontWeight: 400,
                      fontSize: '1.6rem',
                      lineHeight: 1,
                      color: 'var(--pl-olive)',
                    }}>
                      Free
                    </span>
                  </div>
                </div>

                <Button
                  variant="accent"
                  size="md"
                  icon={<ExternalLink size={13} />}
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/billing/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ planId: 'atelier' }),
                      });
                      const data = await res.json();
                      if (data.url) window.location.href = data.url;
                      else alert(data.error || 'Could not start checkout');
                    } catch {
                      alert('Network error — please try again');
                    }
                  }}
                  className="w-full"
                >
                  Upgrade to Atelier — $19
                </Button>
              </PageCard>

              {/* Notifications */}
              <PageCard
                eyebrow="Notifications"
                title={
                  <span
                    style={{
                      fontFamily: 'var(--pl-font-display)',
                      fontWeight: 500,
                      fontSize: '1.1rem',
                      color: 'var(--pl-ink)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    What lands in your inbox
                  </span>
                }
                accent="plum"
              >
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  <Switch
                    checked={emailNotifications}
                    onChange={setEmailNotifications}
                    label="RSVP & guest activity"
                  />
                  <Switch
                    checked={marketingEmails}
                    onChange={setMarketingEmails}
                    label="Product updates & tips"
                  />
                </div>
              </PageCard>

              {/* Data */}
              <PageCard
                eyebrow="Your data"
                title={
                  <span
                    style={{
                      fontFamily: 'var(--pl-font-display)',
                      fontWeight: 500,
                      fontSize: '1.1rem',
                      color: 'var(--pl-ink)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Export everything
                  </span>
                }
              >
                <p
                  style={{
                    margin: '0 0 16px',
                    color: 'var(--pl-ink-soft)',
                    fontSize: '0.88rem',
                    lineHeight: 1.55,
                  }}
                >
                  Download your sites, guest lists, and account information as a
                  JSON bundle you can keep forever.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportData}
                  icon={<Download size={12} />}
                >
                  Export all data (JSON)
                </Button>
              </PageCard>

              {/* Danger zone */}
              <PageCard
                eyebrow="Danger zone"
                title={
                  <span
                    style={{
                      fontFamily: 'var(--pl-font-display)',
                      fontWeight: 500,
                      fontSize: '1.1rem',
                      color: 'var(--pl-plum)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Delete account
                  </span>
                }
                style={{
                  borderColor:
                    'color-mix(in oklab, var(--pl-plum) 35%, var(--pl-divider))',
                }}
              >
                {showDeleteConfirm ? (
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: 'var(--pl-ink)',
                      }}
                    >
                      Are you absolutely sure?
                    </p>
                    <p
                      style={{
                        margin: '6px 0 16px',
                        fontSize: '0.82rem',
                        color: 'var(--pl-muted)',
                        lineHeight: 1.55,
                      }}
                    >
                      This permanently deletes your account, all sites, guest
                      data, and photos. This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleDeleteAccount}
                        icon={<Trash2 size={12} />}
                      >
                        Yes, delete everything
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.88rem',
                          color: 'var(--pl-ink-soft)',
                        }}
                      >
                        Permanently remove your account and all celebrations.
                      </p>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: '0.78rem',
                          color: 'var(--pl-muted)',
                        }}
                      >
                        There is no undo.
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{ color: 'var(--pl-plum)' }}
                      icon={<Shield size={12} />}
                    >
                      Delete account
                    </Button>
                  </div>
                )}
              </PageCard>

              {/* Sign out */}
              <div style={{ paddingTop: 8, paddingBottom: 24 }}>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  icon={<LogOut size={14} />}
                >
                  Sign out
                </Button>
              </div>
            </div>
    </DashboardShell>
  );
}
