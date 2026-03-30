'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Image, ExternalLink } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Stories', icon: LayoutDashboard },
  { href: '/dashboard/rsvps', label: 'Guests', icon: Users },
  { href: '/dashboard/gallery', label: 'Gallery', icon: Image },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-black/5 bg-white/50 min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-1">
        {NAV_ITEMS.map((item, i) => {
          const isActive = pathname === item.href;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative' }}
            >
              {isActive && (
                <motion.span
                  layoutId="dash-sidebar-active"
                  style={{
                    position: 'absolute', inset: 0,
                    borderRadius: '8px',
                    background: 'var(--eg-accent-light)',
                    zIndex: 0,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative z-10
                  ${isActive
                    ? 'text-[var(--eg-accent)] font-medium'
                    : 'text-[var(--eg-muted)] hover:text-[var(--eg-fg)]'
                  }`}
              >
                <motion.span
                  animate={{ scale: isActive ? 1 : 0.92 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  style={{ display: 'flex' }}
                >
                  <item.icon size={16} />
                </motion.span>
                {item.label}
              </Link>
            </motion.div>
          );
        })}

        <div className="pt-4 mt-4 border-t border-black/5">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--eg-muted)] hover:text-[var(--eg-fg)] hover:bg-black/[0.03] transition-all"
          >
            <ExternalLink size={16} />
            View Live Site
          </Link>
        </div>
      </nav>
    </aside>
  );
}
