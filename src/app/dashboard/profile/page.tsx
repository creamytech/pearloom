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
      const res = await fetch('/api/sites');
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
    <div className="min-h-dvh flex flex-col bg-[#FAFAFA]">
      {/* Dashboard header */}
      <header className="h-12 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-[#E4E4E7] bg-white z-10">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2 no-underline hover:opacity-75 transition-opacity">
            <div className="w-6 h-6 rounded-md bg-[#18181B] flex items-center justify-center">
              <span className="text-white text-[0.6rem] font-bold leading-none">P</span>
            </div>
            <span className="text-[0.85rem] font-semibold text-[#18181B]">
              Pearloom
            </span>
          </Link>
          <span className="text-[#E4E4E7] mx-1">/</span>
          <span className="text-[0.75rem] text-[#71717A]">
            Settings
          </span>
        </div>
        <Link href="/dashboard" className="text-[0.72rem] text-[#71717A] no-underline flex items-center gap-1 hover:text-[#18181B] transition-colors">
          <ArrowLeft size={12} /> Back
        </Link>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>

        <main className="flex-1 overflow-auto p-4 md:p-8 max-w-[640px]">
          <h1 className="text-[1.3rem] font-semibold text-[#18181B] mb-6">
            Account Settings
          </h1>

        {/* ── Profile ── */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} className="text-[#71717A]" />
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-[#A1A1AA]">Profile</h2>
          </div>
          <div className="p-5 rounded-xl bg-white border border-[#E4E4E7]">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 rounded-lg bg-[#F4F4F5] flex items-center justify-center text-lg font-semibold text-[#18181B]">
                {(session?.user?.name || session?.user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[0.9rem] font-semibold text-[#18181B]">{session?.user?.name || 'User'}</p>
                <p className="text-[0.75rem] text-[#71717A]">{session?.user?.email}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-[#A1A1AA] mb-1.5">Display Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md border border-[#E4E4E7] bg-white text-[0.85rem] text-[#18181B] outline-none focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] transition-colors"
                />
                <Button variant="primary" size="sm" onClick={handleSaveName} loading={saving} icon={saved ? <Check size={12} /> : undefined}>
                  {saved ? 'Saved' : 'Save'}
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-[#A1A1AA] mb-1.5">Email</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[#F4F4F5] text-[0.85rem] text-[#71717A]">
                <Mail size={14} />
                {session?.user?.email}
                <span className="text-[0.62rem] ml-auto">via Google</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Plan & Billing ── */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-[#71717A]" />
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-[#A1A1AA]">Plan & Billing</h2>
          </div>
          <div className="p-5 rounded-xl bg-white border border-[#E4E4E7]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[0.9rem] font-semibold text-[#18181B]">Journal Plan</p>
                <p className="text-[0.75rem] text-[#71717A]">Free tier — unlimited sites</p>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-[#F4F4F5] text-[#18181B] text-[0.62rem] font-semibold uppercase tracking-[0.06em]">
                Free
              </span>
            </div>
            <Button variant="accent" size="md" className="w-full" icon={<ExternalLink size={13} />}
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
              }}>
              Upgrade to Atelier
            </Button>
          </div>
        </section>

        {/* ── Notifications ── */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={14} className="text-[#71717A]" />
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-[#A1A1AA]">Notifications</h2>
          </div>
          <div className="p-5 rounded-xl bg-white border border-[#E4E4E7] space-y-4">
            <Switch checked={emailNotifications} onChange={setEmailNotifications} label="RSVP & guest activity emails" />
            <Switch checked={marketingEmails} onChange={setMarketingEmails} label="Product updates & tips" />
          </div>
        </section>

        {/* ── Data ── */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Download size={14} className="text-[#71717A]" />
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-[#A1A1AA]">Your Data</h2>
          </div>
          <div className="p-5 rounded-xl bg-white border border-[#E4E4E7]">
            <p className="text-[0.82rem] text-[#71717A] mb-4">
              Download all your data including site configurations, guest lists, and photos.
            </p>
            <Button variant="secondary" size="sm" onClick={handleExportData} icon={<Download size={12} />}>
              Export All Data (JSON)
            </Button>
          </div>
        </section>

        {/* ── Danger Zone ── */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-[#DC2626]" />
            <h2 className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-[#DC2626]">Danger Zone</h2>
          </div>
          <div className="p-5 rounded-xl border border-red-200 bg-[#FEF2F2]">
            {showDeleteConfirm ? (
              <div>
                <p className="text-[0.88rem] font-semibold text-[#18181B] mb-2">Are you sure?</p>
                <p className="text-[0.78rem] text-[#71717A] mb-4">
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
                  <p className="text-[0.88rem] font-semibold text-[#18181B]">Delete Account</p>
                  <p className="text-[0.75rem] text-[#71717A]">Permanently delete your account and all data</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-[#DC2626]">
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
