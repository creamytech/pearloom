'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Image, Settings, Store, Plus, HelpCircle, ChevronRight, Sparkles } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/director', label: 'Director', icon: Sparkles },
  { href: '/dashboard/gallery', label: 'Gallery', icon: Image },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
  { href: '/dashboard/profile', label: 'Settings', icon: Settings },
];

interface DashboardSidebarProps {
  onNewSite?: () => void;
}

export function DashboardSidebar({ onNewSite }: DashboardSidebarProps = {}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      className="shrink-0 min-h-0 h-full flex flex-col border-r border-[#E4E4E7] bg-white transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{ width: expanded ? 200 : 56 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo mark */}
      <div className="h-12 flex items-center px-4 border-b border-[#E4E4E7] shrink-0">
        <div className="w-6 h-6 rounded-md bg-[#18181B] flex items-center justify-center shrink-0">
          <span className="text-white text-[0.6rem] font-bold leading-none">P</span>
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="ml-3 text-sm font-semibold text-[#18181B] whitespace-nowrap overflow-hidden"
            >
              Pearloom
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md min-h-[36px] text-[0.82rem] transition-colors no-underline relative ${
                expanded ? 'px-3' : 'justify-center px-0'
              } ${
                isActive
                  ? 'bg-[#F4F4F5] text-[#18181B] font-medium'
                  : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[#18181B]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon size={16} className="shrink-0" />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        <div className="pt-2 mt-2 border-t border-[#E4E4E7]">
          <Link
            href="/faq"
            className={`flex items-center gap-3 rounded-md min-h-[36px] text-[0.82rem] text-[#A1A1AA] hover:text-[#71717A] transition-colors no-underline ${
              expanded ? 'px-3' : 'justify-center px-0'
            }`}
          >
            <HelpCircle size={16} className="shrink-0" />
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  Help
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </nav>

      {/* New site CTA */}
      <div className="px-2 pb-3">
        {onNewSite ? (
          <button
            onClick={onNewSite}
            className={`flex items-center justify-center gap-2 w-full min-h-[36px] rounded-md bg-[#18181B] text-white text-[0.75rem] font-semibold border-none cursor-pointer hover:bg-[#27272A] transition-colors ${
              expanded ? 'px-3' : 'px-0'
            }`}
          >
            <Plus size={14} className="shrink-0" />
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  New Site
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ) : (
          <Link
            href="/dashboard"
            className={`flex items-center justify-center gap-2 w-full min-h-[36px] rounded-md bg-[#18181B] text-white text-[0.75rem] font-semibold no-underline hover:bg-[#27272A] transition-colors ${
              expanded ? 'px-3' : 'px-0'
            }`}
          >
            <Plus size={14} className="shrink-0" />
            <AnimatePresence>
              {expanded && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  New Site
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        )}
      </div>
    </aside>
  );
}
