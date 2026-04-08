'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / dashboard/MobileBottomNav.tsx
// Bottom navigation bar for mobile: FEED | BUILD (+) | AISCOUT | PROFILE
// Matches Stitch "Botanical Collection" bottom nav pattern
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { LayoutGrid, Plus, Search, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

interface MobileBottomNavProps {
  activeTab: 'feed' | 'build' | 'aiscout' | 'profile';
  onTabChange: (tab: 'feed' | 'build' | 'aiscout' | 'profile') => void;
  onBuild?: () => void;
}

const TABS = [
  { id: 'feed' as const,    Icon: LayoutGrid, label: 'Feed',    href: '/dashboard' },
  { id: 'build' as const,   Icon: Plus,       label: 'Build',   primary: true, href: null },
  { id: 'aiscout' as const, Icon: Sparkles,   label: 'AI',      href: '/marketplace' },
  { id: 'profile' as const, Icon: User,       label: 'Profile', href: '/dashboard/profile' },
];

export function MobileBottomNav({ activeTab, onTabChange, onBuild }: MobileBottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom lg:hidden"
      style={{
        background: 'rgba(255,255,255,0.45)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 -4px 20px rgba(43,30,20,0.06)',
      } as React.CSSProperties}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        maxWidth: '400px', margin: '0 auto',
        padding: '6px 0 2px',
      }}>
        {TABS.map((tab) => {
          const Icon = tab.Icon;
          const isActive = activeTab === tab.id;
          const isPrimary = 'primary' in tab && tab.primary;

          return (
            <motion.button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'build' && onBuild) {
                  onBuild();
                } else if ('href' in tab && tab.href) {
                  window.location.href = tab.href;
                } else {
                  onTabChange(tab.id);
                }
              }}
              whileTap={{ scale: 0.88 }}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '3px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: isPrimary ? '0' : '8px 16px',
                position: 'relative',
              }}
            >
              {isPrimary ? (
                <div style={{
                  width: '48px', height: '48px',
                  borderRadius: '50%',
                  background: 'var(--pl-olive-deep)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white',
                  boxShadow: '0 4px 16px rgba(110,140,92,0.3)',
                  marginTop: '-14px',
                }}>
                  <Icon size={22} strokeWidth={2.5} />
                </div>
              ) : (
                <>
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    style={{
                      color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
                      transition: 'color 0.15s',
                    }}
                  />
                  <span style={{
                    fontSize: '0.55rem', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: isActive ? 'var(--pl-olive-deep)' : 'var(--pl-muted)',
                    transition: 'color 0.15s',
                  }}>
                    {tab.label}
                  </span>
                </>
              )}

              {/* Active dot indicator */}
              {isActive && !isPrimary && (
                <motion.div
                  layoutId="mobile-nav-dot"
                  style={{
                    position: 'absolute', bottom: '2px',
                    width: '4px', height: '4px', borderRadius: '50%',
                    background: 'var(--pl-olive-deep)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
