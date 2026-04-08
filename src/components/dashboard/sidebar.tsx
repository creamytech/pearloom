'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Image, Settings, Store, Sparkles, Plus, HelpCircle } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/gallery', label: 'Gallery', icon: Image },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/dashboard/profile', label: 'Settings', icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 min-h-0 h-full flex flex-col" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '16px', boxShadow: '0 4px 20px rgba(43,30,20,0.06)' } as React.CSSProperties}>
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-heading italic text-lg text-[var(--pl-ink-soft)]">The Atelier</h2>
        <p className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--pl-muted)] font-bold mt-0.5">Your creative studio</p>
      </div>
      <nav className="px-3 pb-4 space-y-1 flex-1">
        {NAV_ITEMS.map((item, i) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              {isActive && (
                <motion.span
                  layoutId="dash-sidebar-active"
                  className="absolute inset-0 rounded-[12px] z-0"
                  style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.4)' } as React.CSSProperties}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm transition-colors relative z-10 no-underline ${
                  isActive
                    ? 'text-[var(--pl-olive)] font-medium'
                    : 'text-[var(--pl-muted)] hover:text-[var(--pl-ink)]'
                }`}
              >
                <motion.span
                  animate={{ scale: isActive ? 1 : 0.92 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="flex"
                >
                  <item.icon size={16} />
                </motion.span>
                {item.label}
              </Link>
            </motion.div>
          );
        })}

        <div className="pt-4 mt-4 border-t border-[var(--pl-divider)]">
          <Link
            href="/faq"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-sm text-[var(--pl-muted)] hover:text-[var(--pl-ink)] transition-all no-underline"
            style={{ background: 'transparent' }}
          >
            <HelpCircle size={16} />
            Help & FAQ
          </Link>
        </div>
      </nav>

      {/* New site CTA */}
      <div className="px-3 pb-4">
        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[var(--pl-radius-md)] bg-[var(--pl-olive)] text-white text-[0.72rem] font-bold uppercase tracking-[0.06em] no-underline hover:bg-[var(--pl-olive-hover)] transition-colors shadow-sm"
        >
          <Plus size={14} />
          New Site
        </Link>
        <p className="text-[0.6rem] text-[var(--pl-muted)] text-center mt-2 leading-snug">
          AI-powered celebration sites
        </p>
      </div>
    </aside>
  );
}
