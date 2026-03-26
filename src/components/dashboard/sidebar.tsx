'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Image, Settings, ExternalLink } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Generate', icon: LayoutDashboard },
  { href: '/dashboard/rsvps', label: 'RSVPs', icon: Users },
  { href: '/dashboard/gallery', label: 'Gallery', icon: Image },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-black/5 bg-white/50 min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                ${isActive
                  ? 'bg-[var(--eg-accent-light)] text-[var(--eg-accent)] font-medium'
                  : 'text-[var(--eg-muted)] hover:text-[var(--eg-fg)] hover:bg-black/[0.03]'
                }`}
            >
              <item.icon size={16} />
              {item.label}
            </Link>
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
