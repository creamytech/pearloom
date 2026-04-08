'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Shield, Lock, Globe, Zap } from 'lucide-react';
import { colors as C, text, sectionPadding, layout } from '@/lib/design-tokens';

const INTEGRATIONS = [
  'Google Photos', 'Stripe', 'Spotify', 'Google Maps', 'YouTube', 'Vimeo',
];

const TRUST_ITEMS = [
  { icon: Shield, label: 'GDPR Compliant', desc: 'Your data stays yours. Export or delete anytime.' },
  { icon: Lock,   label: 'Bank-Grade Security', desc: 'SSL encryption, CSP headers, and rate limiting on every request.' },
  { icon: Globe,  label: 'Global CDN', desc: 'Lightning-fast load times for guests anywhere in the world.' },
  { icon: Zap,    label: '99.9% Uptime', desc: 'Your site stays live when it matters most — on the big day.' },
];

export function TrustSignals() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      ref={ref}
      style={{
        padding: `${sectionPadding.y} ${sectionPadding.x}`,
        background: C.cream,
        borderTop: `1px solid ${C.divider}`,
      }}
    >
      <div style={{ maxWidth: layout.maxWidth, margin: '0 auto' }}>
        {/* Integrations strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p
            className="text-[0.62rem] font-bold uppercase tracking-[0.16em] mb-6"
            style={{ color: C.muted }}
          >
            Works with the tools you already use
          </p>
          <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap">
            {INTEGRATIONS.map((name) => (
              <span
                key={name}
                className="text-[0.82rem] font-semibold tracking-wide"
                style={{ color: C.muted, opacity: 0.6 }}
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Trust grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {TRUST_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className={`pl-enter pl-enter-d${i + 1} rounded-[16px] p-5 text-center flex flex-col items-center`}
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: 'var(--pl-olive-mist)' }}
                >
                  <Icon size={18} style={{ color: C.olive }} />
                </div>
                <div
                  className="font-semibold mb-1"
                  style={{ fontSize: text.md, color: C.ink }}
                >
                  {item.label}
                </div>
                <div
                  className="leading-snug"
                  style={{ fontSize: text.sm, color: C.muted }}
                >
                  {item.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
