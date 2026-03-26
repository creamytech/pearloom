'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/user-nav.tsx
// High-fidelity User Navigation Dropdown
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Settings, CreditCard, LayoutDashboard } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface UserNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserNav({ user }: UserNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '0.25rem', borderRadius: '2rem', transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }} className="hidden sm:flex">
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--eg-fg)', lineHeight: 1.2 }}>
            {user.name || 'Your Account'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--eg-muted)', lineHeight: 1.2 }}>
            {user.email}
          </span>
        </div>
        {user.image ? (
          <img
            src={user.image}
            alt="Profile"
            style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', border: '2px solid rgba(0,0,0,0.05)', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--eg-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} />
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
              width: '240px', background: '#ffffff', borderRadius: '1rem',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)', border: '1px solid rgba(0,0,0,0.05)',
              overflow: 'hidden', zIndex: 100,
            }}
          >
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--eg-fg)' }}>{user.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.email}</div>
            </div>

            <div style={{ padding: '0.5rem' }}>
              <button style={dropdownItemStyle}>
                <LayoutDashboard size={14} /> My Websites
              </button>
              <button style={dropdownItemStyle}>
                <Settings size={14} /> Profile Settings
              </button>
              <button style={dropdownItemStyle}>
                <CreditCard size={14} /> Billing & Plan
              </button>
            </div>

            <div style={{ padding: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <button
                onClick={() => signOut()}
                style={{ ...dropdownItemStyle, color: '#dc2626' }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const dropdownItemStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
  padding: '0.75rem 1rem', borderRadius: '0.5rem',
  background: 'transparent', border: 'none',
  fontSize: '0.85rem', fontWeight: 500, color: 'var(--eg-fg)',
  cursor: 'pointer', transition: 'all 0.15s ease',
  textAlign: 'left'
};
