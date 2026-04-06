'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/dashboard/profile/page.tsx
// Account settings — profile, plan, billing, data, deletion.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, User, Mail, CreditCard, Shield, Trash2,
  Download, LogOut, Check, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { exportManifestJSON, downloadFile } from '@/lib/guest-services';

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
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch('/api/site');
      if (!res.ok) return;
      const data = await res.json();
      const exportData = {
        account: { email: session?.user?.email, name: displayName, exportedAt: new Date().toISOString() },
        sites: data.sites || [],
      };
      downloadFile(JSON.stringify(exportData, null, 2), 'pearloom-data-export.json', 'application/json');
    } catch {}
  };

  const handleDeleteAccount = async () => {
    try {
      await fetch('/api/auth/delete-account', { method: 'DELETE' });
      signOut({ callbackUrl: '/' });
    } catch {}
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--pl-cream)]">
      {/* Dashboard header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-[var(--pl-divider)] bg-white/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-heading italic text-[1.05rem] font-semibold text-[var(--pl-ink-soft)] no-underline hover:opacity-75 transition-opacity">
            Pearloom
          </Link>
          <span className="hidden sm:block text-[0.6rem] font-bold tracking-[0.12em] uppercase text-[var(--pl-muted)]">
            Settings
          </span>
        </div>
        <Link href="/dashboard" className="text-[0.72rem] text-[var(--pl-muted)] no-underline flex items-center gap-1 hover:text-[var(--pl-ink)] transition-colors">
          <ArrowLeft size={12} /> Back to Dashboard
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        <main className="flex-1 overflow-auto p-4 md:p-8 max-w-[700px]">
          <h1 className="font-heading italic text-[clamp(1.4rem,3vw,2rem)] text-[var(--pl-ink)] mb-8">
            Account Settings
          </h1>

        {/* ── Profile ── */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} className="text-[var(--pl-olive)]" />
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)]">Profile</h2>
          </div>
          <div className="p-5 rounded-[var(--pl-radius-lg)] bg-white border border-[rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-[var(--pl-olive-mist)] flex items-center justify-center text-xl font-heading font-semibold text-[var(--pl-olive-deep)]">
                {(session?.user?.name || session?.user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[0.92rem] font-semibold text-[var(--pl-ink)]">{session?.user?.name || 'User'}</p>
                <p className="text-[0.75rem] text-[var(--pl-muted)]">{session?.user?.email}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)] mb-1.5">Display Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-[var(--pl-radius-sm)] border-[1.5px] border-[var(--pl-divider)] bg-white text-[0.88rem] text-[var(--pl-ink)] outline-none pl-focus-glow"
                />
                <Button variant="primary" size="sm" onClick={handleSaveName} loading={saving} icon={saved ? <Check size={12} /> : undefined}>
                  {saved ? 'Saved' : 'Save'}
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)] mb-1.5">Email</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--pl-radius-sm)] bg-[var(--pl-cream-deep)] text-[0.88rem] text-[var(--pl-muted)]">
                <Mail size={14} />
                {session?.user?.email}
                <span className="text-[0.62rem] ml-auto">via Google</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Plan & Billing ── */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={14} className="text-[var(--pl-olive)]" />
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)]">Plan & Billing</h2>
          </div>
          <div className="p-5 rounded-[var(--pl-radius-lg)] bg-white border border-[rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[0.92rem] font-semibold text-[var(--pl-ink)]">Journal Plan</p>
                <p className="text-[0.75rem] text-[var(--pl-muted)]">Free tier — unlimited sites</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-[var(--pl-olive-mist)] text-[var(--pl-olive-deep)] text-[0.62rem] font-bold uppercase tracking-[0.08em]">
                Free
              </span>
            </div>
            <Button variant="accent" size="md" className="w-full" icon={<ExternalLink size={13} />}
              onClick={() => window.open('/api/billing/checkout', '_blank')}>
              Upgrade to Atelier
            </Button>
          </div>
        </section>

        {/* ── Notifications ── */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={14} className="text-[var(--pl-olive)]" />
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)]">Notifications</h2>
          </div>
          <div className="p-5 rounded-[var(--pl-radius-lg)] bg-white border border-[rgba(0,0,0,0.05)] space-y-4">
            <Switch checked={emailNotifications} onChange={setEmailNotifications} label="RSVP & guest activity emails" />
            <Switch checked={marketingEmails} onChange={setMarketingEmails} label="Product updates & tips" />
          </div>
        </section>

        {/* ── Data ── */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Download size={14} className="text-[var(--pl-olive)]" />
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-muted)]">Your Data</h2>
          </div>
          <div className="p-5 rounded-[var(--pl-radius-lg)] bg-white border border-[rgba(0,0,0,0.05)]">
            <p className="text-[0.82rem] text-[var(--pl-muted)] mb-4">
              Download all your data including site configurations, guest lists, and photos.
            </p>
            <Button variant="secondary" size="sm" onClick={handleExportData} icon={<Download size={12} />}>
              Export All Data (JSON)
            </Button>
          </div>
        </section>

        {/* ── Danger Zone ── */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} className="text-[var(--pl-warning)]" />
            <h2 className="text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--pl-warning)]">Danger Zone</h2>
          </div>
          <div className="p-5 rounded-[var(--pl-radius-lg)] border border-[rgba(196,93,62,0.2)] bg-[rgba(196,93,62,0.03)]">
            {showDeleteConfirm ? (
              <div>
                <p className="text-[0.88rem] font-semibold text-[var(--pl-ink)] mb-2">Are you sure?</p>
                <p className="text-[0.78rem] text-[var(--pl-muted)] mb-4">
                  This will permanently delete your account, all sites, guest data, and photos. This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={handleDeleteAccount} icon={<Trash2 size={12} />}>
                    Yes, Delete Everything
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.88rem] font-semibold text-[var(--pl-ink)]">Delete Account</p>
                  <p className="text-[0.75rem] text-[var(--pl-muted)]">Permanently delete your account and all data</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-[var(--pl-warning)]">
                  Delete Account
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* Sign out */}
        <div className="pb-8">
          <Button variant="ghost" size="md" onClick={() => signOut({ callbackUrl: '/' })} icon={<LogOut size={14} />}>
            Sign Out
          </Button>
        </div>
        </main>
      </div>
    </div>
  );
}
