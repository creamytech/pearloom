'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/CoordinatorPanel.tsx
// Coordinator Access — token-based invite system for wedding planners
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Mail, Copy, Check, Trash2, Clock, UserCheck, ChevronDown } from 'lucide-react';

interface Invite {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

interface CoordinatorPanelProps {
  siteId: string;
  subdomain: string;
}

const ROLE_DESCRIPTIONS = {
  coordinator: 'Can edit site content, manage RSVPs, update seating',
  viewer: 'Can view site analytics and RSVP list',
};

export function CoordinatorPanel({ siteId, subdomain }: CoordinatorPanelProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'coordinator' | 'viewer'>('coordinator');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invite?siteId=${encodeURIComponent(siteId)}`);
      if (res.ok) {
        const data = await res.json();
        setInvites(data.invites || []);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to send invite');
      } else {
        setSuccessMsg(`Invite sent to ${email.trim()}`);
        setEmail('');
        await loadInvites();
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await fetch(`/api/invite?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      setInvites((prev) => prev.filter((inv) => inv.id !== id));
    } catch {
      // silently ignore
    }
  };

  const copyInviteLink = async (token: string, id: string) => {
    const url = `https://pearloom.com/invite?token=${token}`;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatExpiry = (expiresAt: string) => {
    try {
      const d = new Date(expiresAt);
      const now = new Date();
      const diff = d.getTime() - now.getTime();
      if (diff < 0) return 'Expired';
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return 'Expires today';
      if (days === 1) return 'Expires tomorrow';
      return `Expires in ${days}d`;
    } catch {
      return '';
    }
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '0.65rem 0.875rem',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.625rem',
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.875rem',
    fontFamily: 'var(--eg-font-body, Georgia, serif)',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1rem',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.4rem' }}>
          <Users size={15} color="rgba(163,177,138,0.9)" />
          <h2 style={{
            margin: 0, fontSize: '0.95rem', fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            fontFamily: 'var(--eg-font-heading, Georgia, serif)',
          }}>
            Coordinator Access
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
          Invite your wedding planner or coordinator to view or manage your site
        </p>
      </div>

      {/* Invite Form */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1rem',
        padding: '1.5rem',
      }}>
        <span style={{
          display: 'block', marginBottom: '1rem',
          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'rgba(163,177,138,0.7)',
        }}>
          Send Invite
        </span>

        <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="email"
            placeholder="coordinator@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.5)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          />

          {/* Role selector */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setRoleOpen((o) => !o)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.65rem 0.875rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.625rem',
                color: 'rgba(255,255,255,0.9)',
                fontSize: '0.875rem',
                fontFamily: 'var(--eg-font-body, Georgia, serif)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span>{role === 'coordinator' ? 'Coordinator' : 'View Only'}</span>
              <ChevronDown size={14} color="rgba(255,255,255,0.4)" style={{ transform: roleOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            <AnimatePresence>
              {roleOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: '#2A2520', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '0.625rem', zIndex: 50, overflow: 'hidden',
                  }}
                >
                  {(['coordinator', 'viewer'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setRole(r); setRoleOpen(false); }}
                      style={{
                        width: '100%', display: 'block', textAlign: 'left',
                        padding: '0.75rem 0.875rem',
                        background: role === r ? 'rgba(163,177,138,0.1)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        fontFamily: 'var(--eg-font-body, Georgia, serif)',
                        transition: 'background 0.15s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(163,177,138,0.08)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = role === r ? 'rgba(163,177,138,0.1)' : 'transparent'; }}
                    >
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginBottom: '0.2rem' }}>
                        {r === 'coordinator' ? 'Coordinator' : 'View Only'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
                        {ROLE_DESCRIPTIONS[r]}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Role description hint */}
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>
            {ROLE_DESCRIPTIONS[role]}
          </p>

          <motion.button
            type="submit"
            disabled={sending || !email.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              padding: '0.7rem 1.25rem', borderRadius: '0.625rem', border: 'none',
              background: sending || !email.trim()
                ? 'rgba(163,177,138,0.3)'
                : 'linear-gradient(135deg, #A3B18A 0%, #8a9d72 100%)',
              color: '#F5F1E8', cursor: sending || !email.trim() ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem', fontWeight: 700,
              fontFamily: 'var(--eg-font-body, Georgia, serif)',
              transition: 'background 0.2s',
            }}
          >
            <Mail size={14} />
            {sending ? 'Sending...' : 'Send Invite'}
          </motion.button>
        </form>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: '#f87171' }}
            >
              {error}
            </motion.p>
          )}
          {successMsg && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ margin: '0.75rem 0 0', fontSize: '0.78rem', color: '#86efac' }}
            >
              {successMsg}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Active Invites */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '1rem',
        padding: '1.5rem',
      }}>
        <span style={{
          display: 'block', marginBottom: '1rem',
          fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'rgba(163,177,138,0.7)',
        }}>
          Active Invites
        </span>

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>
            Loading...
          </div>
        ) : invites.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '1.5rem 1rem',
            color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', lineHeight: 1.5,
          }}>
            No invites sent yet.<br />Invite your coordinator above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <AnimatePresence>
              {invites.map((invite) => {
                const isAccepted = !!invite.acceptedAt;
                const isExpired = !isAccepted && new Date(invite.expiresAt) < new Date();
                return (
                  <motion.div
                    key={invite.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '0.75rem',
                    }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: isAccepted
                        ? 'rgba(134,239,172,0.12)'
                        : isExpired
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(163,177,138,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isAccepted
                        ? <UserCheck size={14} color="#86efac" />
                        : <Clock size={14} color={isExpired ? 'rgba(255,255,255,0.25)' : 'rgba(163,177,138,0.8)'} />
                      }
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.82rem', fontWeight: 600,
                        color: isExpired ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {invite.email}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                          color: invite.role === 'coordinator' ? 'rgba(163,177,138,0.8)' : 'rgba(109,89,122,0.8)',
                        }}>
                          {invite.role === 'coordinator' ? 'Coordinator' : 'View Only'}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }}>·</span>
                        <span style={{
                          fontSize: '0.65rem',
                          color: isAccepted ? '#86efac' : isExpired ? '#f87171' : 'rgba(255,255,255,0.35)',
                        }}>
                          {isAccepted ? 'Accepted' : isExpired ? 'Expired' : formatExpiry(invite.expiresAt)}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                      {!isAccepted && !isExpired && (
                        <button
                          onClick={() => copyInviteLink(invite.token, invite.id)}
                          title="Copy invite link"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '28px', height: '28px', borderRadius: '0.4rem',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            cursor: 'pointer', transition: 'background 0.15s',
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                        >
                          {copiedId === invite.id
                            ? <Check size={12} color="#86efac" />
                            : <Copy size={12} color="rgba(255,255,255,0.45)" />
                          }
                        </button>
                      )}
                      <button
                        onClick={() => handleRevoke(invite.id)}
                        title="Revoke invite"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '28px', height: '28px', borderRadius: '0.4rem',
                          background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)',
                          cursor: 'pointer', transition: 'background 0.15s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.06)'; }}
                      >
                        <Trash2 size={12} color="rgba(248,113,113,0.7)" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
