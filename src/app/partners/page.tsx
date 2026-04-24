'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / app/partners/page.tsx
// Partner Portal — registration, dashboard, embed widget
// generator, referral tracking, commission tiers.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Check, Copy, ExternalLink,
  Users, DollarSign, BarChart2, Code, Camera, Music,
  Building, Flower, Utensils, Star, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PARTNER_TIERS, generateEmbedCode, type Partner } from '@/lib/distribution/partners';
import { PageShell } from '@/components/pearloom/PageShell';

type ViewMode = 'landing' | 'register' | 'dashboard';

const PARTNER_TYPES: Array<{ value: Partner['type']; label: string; icon: React.ReactNode }> = [
  { value: 'photographer', label: 'Photographer', icon: <Camera size={18} /> },
  { value: 'planner', label: 'Wedding Planner', icon: <Users size={18} /> },
  { value: 'venue', label: 'Venue', icon: <Building size={18} /> },
  { value: 'florist', label: 'Florist', icon: <Flower size={18} /> },
  { value: 'caterer', label: 'Caterer', icon: <Utensils size={18} /> },
  { value: 'dj', label: 'DJ / Music', icon: <Music size={18} /> },
  { value: 'videographer', label: 'Videographer', icon: <Camera size={18} /> },
];

export default function PartnersPage() {
  const [view, setView] = useState<ViewMode>('landing');
  const [selectedType, setSelectedType] = useState<Partner['type']>('photographer');
  const [formData, setFormData] = useState({ businessName: '', contactName: '', email: '', city: '', state: '', bio: '' });
  const [submitted, setSubmitted] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState<string | null>(null);

  const mockPartner: Partner = {
    id: 'demo', type: selectedType, businessName: formData.businessName || 'Your Business',
    contactName: formData.contactName || 'You', email: formData.email || '',
    location: { city: formData.city || 'Your City', state: formData.state || 'ST', country: 'US' },
    tier: 'basic', referralCode: 'DEMO2025', referralCount: 0, referralRevenue: 0,
    commissionRate: 10, profileComplete: false, verified: false, portfolioUrls: [],
    bio: formData.bio || '', specialties: [], rating: 0, ratingCount: 0,
    status: 'pending', createdAt: Date.now(), phone: '',
  };

  const handleCopyEmbed = (type: 'button' | 'banner' | 'card' | 'floating') => {
    const code = generateEmbedCode(mockPartner, type);
    navigator.clipboard.writeText(code);
    setCopiedEmbed(type);
    setTimeout(() => setCopiedEmbed(null), 2000);
  };

  const handleSubmit = async () => {
    // In production, this would call registerPartner()
    setSubmitted(true);
  };

  // ── Landing View ──
  if (view === 'landing') {
    return (
      <PageShell>
        <section className="max-w-[1080px] mx-auto px-4 md:px-8 py-16">
          {/* Hero */}
          <div className="text-center mb-16">
            <p className="text-[0.65rem] font-bold tracking-[0.14em] uppercase text-[var(--sage-deep)] mb-3">Partner Program</p>
            <h1 className="font-heading italic text-[clamp(2rem,5vw,3.5rem)] text-[var(--ink)] mb-4 leading-tight">
              Grow your business<br />with every celebration
            </h1>
            <p className="text-[1rem] text-[var(--ink-muted)] max-w-[520px] mx-auto mb-8 leading-relaxed">
              Earn commission on every client who creates a Pearloom site through your referral. Join photographers, planners, and venues already earning.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="primary" size="lg" onClick={() => setView('register')} icon={<ArrowRight size={15} />}>
                Apply Now
              </Button>
              <Button variant="secondary" size="lg" onClick={() => document.getElementById('tiers')?.scrollIntoView({ behavior: 'smooth' })}>
                See Plans
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-[600px] mx-auto mb-16">
            {[
              { value: '30%', label: 'Commission', sub: 'for Elite partners' },
              { value: '90s', label: 'Setup Time', sub: 'for your clients' },
              { value: '$0', label: 'To Join', sub: 'always free' },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-4 rounded-[20px] bg-white border border-[rgba(0,0,0,0.05)]">
                <div className="text-[1.8rem] font-heading font-semibold text-[var(--sage-deep)]">{stat.value}</div>
                <div className="text-[0.75rem] font-semibold text-[var(--ink)]">{stat.label}</div>
                <div className="text-[0.62rem] text-[var(--ink-muted)]">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Tiers */}
          <div id="tiers" className="mb-16">
            <h2 className="font-heading italic text-2xl text-[var(--ink)] text-center mb-8">Commission Tiers</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {Object.entries(PARTNER_TIERS).map(([key, tier], i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-[20px] p-6 border ${key === 'pro' ? 'border-[var(--sage-deep)] bg-[var(--sage-tint)]' : 'border-[rgba(0,0,0,0.06)] bg-white'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {key === 'elite' && <Shield size={16} className="text-[var(--gold)]" />}
                    {key === 'pro' && <Star size={16} className="text-[var(--sage-deep)]" />}
                    <h3 className="text-[0.88rem] font-bold uppercase tracking-[0.06em] text-[var(--ink)]">{tier.label}</h3>
                  </div>
                  <div className="text-[2.5rem] font-heading font-semibold text-[var(--sage-deep)] mb-1">
                    {tier.commissionRate}%
                  </div>
                  <p className="text-[0.72rem] text-[var(--ink-muted)] mb-4">commission per referral</p>
                  <p className="text-[0.75rem] text-[var(--ink-soft)] mb-3 font-semibold">Requirements:</p>
                  <p className="text-[0.75rem] text-[var(--ink-muted)] mb-4">{tier.requirements}</p>
                  <ul className="space-y-1.5">
                    {tier.benefits.map(b => (
                      <li key={b} className="flex items-center gap-2 text-[0.75rem] text-[var(--ink-soft)]">
                        <Check size={12} className="text-[var(--sage-deep)] shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center py-12 bg-[var(--cream-2)] rounded-[24px] px-8">
            <h2 className="font-heading italic text-2xl text-[var(--ink)] mb-3">Ready to grow together?</h2>
            <p className="text-[0.88rem] text-[var(--ink-muted)] mb-6 max-w-[400px] mx-auto">
              Join hundreds of wedding professionals already earning with Pearloom.
            </p>
            <Button variant="primary" size="lg" onClick={() => setView('register')} icon={<ArrowRight size={15} />}>
              Apply Now — It&rsquo;s Free
            </Button>
          </div>
        </section>
      </PageShell>
    );
  }

  // ── Registration View ──
  if (view === 'register') {
    return (
      <PageShell>
        <div className="max-w-[800px] mx-auto px-4 md:px-8 py-6">
          <button onClick={() => setView('landing')} className="flex items-center gap-2 bg-transparent border-none cursor-pointer text-[var(--ink-soft)]">
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <main className="max-w-[600px] mx-auto px-4 md:px-8 py-12">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[var(--sage-tint)] flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-[var(--sage-deep)]" />
              </div>
              <h2 className="font-heading italic text-2xl text-[var(--ink)] mb-2">Application Received</h2>
              <p className="text-[0.92rem] text-[var(--ink-muted)] mb-6">We&rsquo;ll review your application and get back to you within 48 hours.</p>
              <Button variant="primary" size="md" onClick={() => setView('dashboard')}>
                View Your Dashboard
              </Button>
            </motion.div>
          ) : (
            <>
              <h2 className="font-heading italic text-2xl text-[var(--ink)] mb-6">Apply as a Partner</h2>

              {/* Partner type */}
              <div className="mb-6">
                <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)] mb-3">
                  I am a...
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PARTNER_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => setSelectedType(pt.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-[14px] border-[1.5px] cursor-pointer transition-all ${
                        selectedType === pt.value
                          ? 'border-[var(--sage-deep)] bg-[var(--sage-tint)]'
                          : 'border-[var(--line)] bg-white hover:border-[var(--sage)]'
                      }`}
                    >
                      <span className={selectedType === pt.value ? 'text-[var(--sage-deep)]' : 'text-[var(--ink-muted)]'}>
                        {pt.icon}
                      </span>
                      <span className="text-[0.68rem] font-semibold text-[var(--ink)]">{pt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form fields */}
              {[
                { key: 'businessName', label: 'Business Name', placeholder: 'Your studio or company' },
                { key: 'contactName', label: 'Your Name', placeholder: 'Full name' },
                { key: 'email', label: 'Email', placeholder: 'you@business.com' },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className="mb-4">
                  <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)] mb-1.5">{label}</label>
                  <input
                    type={key === 'email' ? 'email' : 'text'}
                    value={(formData as Record<string, string>)[key] || ''}
                    onChange={(e) => setFormData(p => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 rounded-[var(--pl-radius-sm)] border-[1.5px] border-[var(--line)] bg-white text-[0.92rem] text-[var(--ink)] outline-none pl-focus-glow"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)] mb-1.5">City</label>
                  <input value={formData.city} onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))} placeholder="City" className="w-full px-4 py-3 rounded-[var(--pl-radius-sm)] border-[1.5px] border-[var(--line)] bg-white text-[0.92rem] outline-none pl-focus-glow" />
                </div>
                <div>
                  <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)] mb-1.5">State</label>
                  <input value={formData.state} onChange={(e) => setFormData(p => ({ ...p, state: e.target.value }))} placeholder="CA" className="w-full px-4 py-3 rounded-[var(--pl-radius-sm)] border-[1.5px] border-[var(--line)] bg-white text-[0.92rem] outline-none pl-focus-glow" />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)] mb-1.5">About Your Business</label>
                <textarea value={formData.bio} onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))} placeholder="Tell us about your work..." rows={3} className="w-full px-4 py-3 rounded-[var(--pl-radius-sm)] border-[1.5px] border-[var(--line)] bg-white text-[0.92rem] outline-none resize-vertical pl-focus-glow" />
              </div>

              <Button variant="primary" size="lg" className="w-full" onClick={handleSubmit} icon={<ArrowRight size={14} />}>
                Submit Application
              </Button>
            </>
          )}
        </main>
      </PageShell>
    );
  }

  // ── Dashboard View ──
  return (
    <PageShell>
      <main className="max-w-[1080px] mx-auto px-4 md:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: <Users size={18} />, value: '0', label: 'Referrals' },
            { icon: <DollarSign size={18} />, value: '$0', label: 'Earnings' },
            { icon: <BarChart2 size={18} />, value: '0', label: 'Clicks' },
            { icon: <Star size={18} />, value: '—', label: 'Rating' },
          ].map((stat) => (
            <div key={stat.label} className="p-4 rounded-[20px] bg-white border border-[rgba(0,0,0,0.05)]">
              <div className="text-[var(--sage-deep)] mb-2">{stat.icon}</div>
              <div className="text-[1.5rem] font-heading font-semibold text-[var(--ink)]">{stat.value}</div>
              <div className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-[var(--ink-muted)]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div className="p-5 rounded-[20px] bg-white border border-[rgba(0,0,0,0.05)] mb-8">
          <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)] mb-3">Your Referral Link</h3>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--cream)] border border-[var(--line)] text-[0.85rem] text-[var(--ink)] font-mono truncate">
              https://pearloom.com?ref={mockPartner.referralCode}
            </div>
            <Button variant="primary" size="sm" icon={copiedEmbed === 'link' ? <Check size={12} /> : <Copy size={12} />}
              onClick={() => { navigator.clipboard.writeText(`https://pearloom.com?ref=${mockPartner.referralCode}`); setCopiedEmbed('link'); setTimeout(() => setCopiedEmbed(null), 2000); }}>
              {copiedEmbed === 'link' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Embed widgets */}
        <div className="mb-8">
          <h3 className="font-heading italic text-xl text-[var(--ink)] mb-4">Embed Widgets</h3>
          <p className="text-[0.85rem] text-[var(--ink-muted)] mb-4">Add these to your website to start earning referral commissions.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['button', 'banner', 'card', 'floating'] as const).map((type) => (
              <div key={type} className="p-4 rounded-[20px] bg-white border border-[rgba(0,0,0,0.05)]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[0.82rem] font-semibold text-[var(--ink)] capitalize">{type} Widget</h4>
                  <Button variant="secondary" size="xs" icon={copiedEmbed === type ? <Check size={10} /> : <Code size={10} />}
                    onClick={() => handleCopyEmbed(type)}>
                    {copiedEmbed === type ? 'Copied!' : 'Copy Code'}
                  </Button>
                </div>
                {/* Preview */}
                <div className="p-3 rounded-lg bg-[var(--cream)] border border-[var(--line)] min-h-[60px] flex items-center justify-center">
                  <div dangerouslySetInnerHTML={{ __html: generateEmbedCode(mockPartner, type) }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier info */}
        <div className="p-5 rounded-[20px] bg-[var(--cream-2)] border border-[rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)]">Current Tier</h3>
              <p className="text-[1.2rem] font-heading font-semibold text-[var(--ink)]">Basic — {PARTNER_TIERS.basic.commissionRate}% Commission</p>
              <p className="text-[0.78rem] text-[var(--ink-muted)]">Upgrade to Pro: get 10+ referrals and 4.0+ rating</p>
            </div>
            <Button variant="accent" size="sm">Upgrade</Button>
          </div>
        </div>
      </main>
    </PageShell>
  );
}
