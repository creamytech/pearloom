'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Image, ExternalLink } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/rsvps', label: 'Guests', icon: Users },
  { href: '/dashboard/gallery', label: 'Gallery', icon: Image },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-[var(--pl-divider)] bg-[var(--pl-cream)] min-h-[calc(100vh-4rem)]">
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-heading italic text-lg text-[var(--pl-ink-soft)]">The Atelier</h2>
        <p className="text-[0.65rem] uppercase tracking-[0.12em] text-[var(--pl-muted)] font-bold mt-0.5">Curating your digital presence</p>
      </div>
      <nav className="px-3 pb-4 space-y-1">
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
                  className="absolute inset-0 rounded-lg bg-[var(--pl-olive-mist)] z-0"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative z-10 ${
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
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--pl-muted)] hover:text-[var(--pl-ink)] hover:bg-black/[0.03] transition-all"
          >
            <ExternalLink size={16} />
            View Live Site
          </Link>
        </div>
      </nav>
    </aside>
  );
}
