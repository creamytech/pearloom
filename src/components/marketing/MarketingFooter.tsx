'use client';

import { useState } from 'react';
import { layout } from '@/lib/design-tokens';
import { PearIcon } from '@/components/icons/PearloomIcons';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Marketplace', href: '/marketplace' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Partners',
    links: [
      { label: 'Partner Program', href: '/partners' },
      { label: 'For Photographers', href: '/partners' },
      { label: 'For Planners', href: '/partners' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
];

function SocialIcon({ type }: { type: 'twitter' | 'instagram' }) {
  const props = {
    width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.5,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
  if (type === 'twitter') {
    return <svg {...props}><path d="M4 4l6.5 8L4 20h2l5.3-6.5L15 20h5l-6.8-8.5L19.5 4h-2l-5 6.2L9 4H4z" /></svg>;
  }
  return <svg {...props}><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="18" cy="6" r="1.2" fill="currentColor" stroke="none" /></svg>;
}

type SubscribeStatus = 'idle' | 'submitting' | 'success' | 'error';

export function MarketingFooter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubscribeStatus>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === 'submitting') return;
    setStatus('submitting');
    setMessage('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'marketing_footer' }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        alreadySubscribed?: boolean;
      };
      if (!res.ok || !data.ok) {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Try again.');
        return;
      }
      setStatus('success');
      setMessage(data.alreadySubscribed ? 'You\u2019re already on the list.' : 'You\u2019re on the list.');
      setEmail('');
    } catch {
      setStatus('error');
      setMessage('Couldn\u2019t reach the server. Try again.');
    }
  };

  return (
    <footer
      className="border-t py-[clamp(3rem,5vw,5rem)] px-6 pb-10"
      style={{
        background: 'var(--pl-cream-deep)',
        borderColor: 'var(--pl-divider)',
        color: 'var(--pl-ink-soft)',
      }}
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        {/* Top row */}
        <div className="flex flex-col md:flex-row gap-10 mb-12">
          {/* Brand column */}
          <div className="md:w-[260px] flex-shrink-0">
            <div className="flex items-center gap-2.5 mb-4">
              <PearIcon size={28} color="var(--pl-olive)" />
              <span
                className="font-heading text-[1.35rem] font-bold italic tracking-[0.03em]"
                style={{ color: 'var(--pl-ink)' }}
              >
                Pearloom
              </span>
            </div>
            <p
              className="text-[0.88rem] leading-relaxed mb-6"
              style={{ color: 'var(--pl-ink-soft)' }}
            >
              Preserving the ephemeral through the precision of the future. The digital atelier for your life&rsquo;s work.
            </p>

            {/* Newsletter */}
            <div>
              <p
                className="text-[0.66rem] font-bold tracking-[0.16em] uppercase mb-3"
                style={{ color: 'var(--pl-muted)' }}
              >
                Stay in the loop
              </p>
              <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
                <div className="flex gap-0">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'submitting' || status === 'success'}
                    placeholder="your@email.com"
                    aria-label="Email address for newsletter"
                    aria-invalid={status === 'error' ? true : undefined}
                    className="flex-1 min-w-0 px-3 py-2 rounded-l-[var(--pl-radius-sm)] outline-none text-[max(16px,0.86rem)] disabled:opacity-70"
                    style={{
                      background: 'var(--pl-cream-card)',
                      color: 'var(--pl-ink)',
                      border: '1px solid var(--pl-divider)',
                      borderRight: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={status === 'submitting' || status === 'success'}
                    className="px-4 py-2 rounded-r-[var(--pl-radius-sm)] font-semibold tracking-widest uppercase cursor-pointer text-[0.62rem] border-0 transition-colors duration-150 disabled:cursor-default"
                    style={{
                      background: 'var(--pl-olive)',
                      color: 'var(--pl-cream)',
                    }}
                    onMouseEnter={(e) => {
                      if (status !== 'submitting' && status !== 'success') {
                        e.currentTarget.style.background = 'var(--pl-olive-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--pl-olive)';
                    }}
                  >
                    {status === 'submitting' ? '…' : status === 'success' ? '✓' : 'Join'}
                  </button>
                </div>
                {message && (
                  <p
                    role={status === 'error' ? 'alert' : 'status'}
                    className="text-[0.7rem]"
                    style={{
                      color: status === 'error' ? 'var(--pl-plum)' : 'var(--pl-olive)',
                    }}
                  >
                    {message}
                  </p>
                )}
              </form>
            </div>
          </div>

          {/* Link columns */}
          <div className="flex-1 grid grid-cols-3 gap-4 sm:gap-6">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <div
                  className="text-[0.66rem] font-bold tracking-[0.18em] uppercase mb-3"
                  style={{ color: 'var(--pl-ink)' }}
                >
                  {col.title}
                </div>
                <div className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-[0.88rem] no-underline hover:underline transition-colors duration-150"
                      style={{ color: 'var(--pl-ink-soft)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--pl-olive)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--pl-ink-soft)';
                      }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          className="h-px mb-5"
          style={{ background: 'var(--pl-divider)' }}
        />

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p
            className="text-[0.7rem] tracking-[0.04em]"
            style={{ color: 'var(--pl-muted)' }}
          >
            &copy; 2026 Pearloom &middot; Crafted with love &amp; intelligence
          </p>

          <div className="flex items-center gap-4">
            <div
              className="flex items-center gap-2.5"
              style={{ color: 'var(--pl-ink-soft)' }}
            >
              <a href="https://x.com/pearloom" target="_blank" rel="noopener noreferrer" aria-label="Follow on X" className="hover:opacity-80 transition-opacity">
                <SocialIcon type="twitter" />
              </a>
              <a href="https://instagram.com/pearloom" target="_blank" rel="noopener noreferrer" aria-label="Follow on Instagram" className="hover:opacity-80 transition-opacity">
                <SocialIcon type="instagram" />
              </a>
            </div>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1.5 text-[0.7rem] tracking-[0.06em] cursor-pointer bg-transparent border-0 hover:opacity-80 transition-opacity"
              style={{ color: 'var(--pl-ink-soft)' }}
              aria-label="Back to top"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 15l-6-6-6 6" />
              </svg>
              <span className="uppercase font-semibold hidden sm:inline">Top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
