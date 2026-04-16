'use client';

// -----------------------------------------------------------------
// Pearloom / components/dashboard/ReferralPanel.tsx
// Referral program UI — share link, stats, and reward claiming.
// Glass card styling matching Pearloom's design system.
// -----------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Gift,
  Users,
  Globe,
  Award,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';

interface ReferralStats {
  code: string;
  totalReferred: number;
  totalConverted: number;
  rewardsEarned: number;
  pendingRewards: number;
}

interface PremiumTemplate {
  id: string;
  name: string;
  price: number;
}

export function ReferralPanel() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedTemplate, setClaimedTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [premiumTemplates, setPremiumTemplates] = useState<PremiumTemplate[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/referral');
      if (!res.ok) throw new Error('Failed to fetch referral stats');
      const data: ReferralStats = await res.json();
      setStats(data);
    } catch {
      setError('Could not load referral info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Fetch premium templates when claim modal opens
  useEffect(() => {
    if (!showClaimModal) return;
    // We use the marketplace API to get templates, but for now we
    // fetch the template list from the purchase endpoint's catalogue.
    // In practice these would come from a dedicated API; for now we
    // hardcode the premium template IDs visible in the marketplace.
    import('@/lib/templates/wedding-templates').then(({ SITE_TEMPLATES }) => {
      const premium = SITE_TEMPLATES
        .filter((t) => (t.price ?? 0) > 0)
        .map((t) => ({ id: t.id, name: t.name, price: t.price ?? 0 }));
      setPremiumTemplates(premium);
    });
  }, [showClaimModal]);

  const referralLink = stats?.code
    ? `https://pearloom.com/?ref=${stats.code}`
    : '';

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const claimReward = async (templateId: string) => {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch('/api/referral/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to claim reward');
        return;
      }
      setClaimedTemplate(data.templateName || templateId);
      setShowClaimModal(false);
      // Refresh stats
      await fetchStats();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  // --- Shared styles ---

  const glassCard: React.CSSProperties = {
    background: 'rgba(255,255,255,0.45)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.5)',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(43,30,20,0.06)',
  };

  const sectionLabel = (text: string) => (
    <div
      style={{
        fontSize: '0.6rem',
        fontWeight: 800,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--pl-muted)',
        marginBottom: '1rem',
      }}
    >
      {text}
    </div>
  );

  const statBox = (
    icon: React.ReactNode,
    value: number,
    label: string,
  ) => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '1rem 0.5rem',
        background: 'rgba(255,255,255,0.35)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.4)',
      }}
    >
      <div style={{ color: 'var(--pl-olive)', marginBottom: '0.15rem' }}>
        {icon}
      </div>
      <div
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--pl-ink)',
          fontFamily: 'var(--pl-font-heading)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: '0.68rem',
          color: 'var(--pl-muted)',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        {label}
      </div>
    </div>
  );

  // --- Loading state ---

  if (loading) {
    return (
      <div style={glassCard}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            color: 'var(--pl-muted)',
            fontSize: '0.85rem',
          }}
        >
          Loading referral program...
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={glassCard}>
        <div
          style={{
            textAlign: 'center',
            padding: '1rem',
            color: 'var(--pl-muted)',
            fontSize: '0.85rem',
          }}
        >
          {error || 'Unable to load referral program.'}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* --- Header card with referral link --- */}
      <div style={glassCard}>
        {sectionLabel('Referral Program')}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'rgba(163,177,138,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Gift size={20} color="var(--pl-olive)" />
          </div>
          <div>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: 'var(--pl-font-heading)',
                fontStyle: 'italic',
                color: 'var(--pl-ink)',
                margin: 0,
              }}
            >
              Share the love, earn rewards
            </h3>
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--pl-muted)',
                margin: '0.2rem 0 0 0',
                lineHeight: 1.4,
              }}
            >
              Invite friends to Pearloom. When they create a site, you get a
              free premium template.
            </p>
          </div>
        </div>

        {/* Referral link */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'rgba(255,255,255,0.35)',
            borderRadius: '12px',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '0.7rem 0.9rem',
            border: '1px solid rgba(255,255,255,0.4)',
          }}
        >
          <code
            style={{
              flex: 1,
              fontSize: '0.8rem',
              color: 'var(--pl-ink)',
              fontFamily: 'ui-monospace, monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {referralLink}
          </code>
          <AnimatePresence mode="popLayout">
            <motion.button
              key={copied ? 'ok' : 'copy'}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={copyLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.8rem',
                borderRadius: '0.4rem',
                flexShrink: 0,
                background: copied
                  ? 'color-mix(in oklab, var(--pl-olive) 14%, transparent)'
                  : 'var(--pl-olive)',
                color: copied ? 'var(--pl-olive)' : 'var(--pl-cream)',
                border: copied
                  ? '1px solid color-mix(in oklab, var(--pl-olive) 28%, transparent)'
                  : 'none',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
                fontFamily: 'var(--pl-font-body)',
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </motion.button>
          </AnimatePresence>
        </div>
      </div>

      {/* --- Stats --- */}
      <div style={glassCard}>
        {sectionLabel('Your Referral Stats')}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {statBox(
            <Users size={18} />,
            stats.totalReferred,
            'Friends referred',
          )}
          {statBox(
            <Globe size={18} />,
            stats.totalConverted,
            'Created sites',
          )}
          {statBox(
            <Award size={18} />,
            stats.rewardsEarned,
            'Rewards earned',
          )}
        </div>

        {/* Progress description */}
        <p
          style={{
            fontSize: '0.78rem',
            color: 'var(--pl-muted)',
            margin: '1rem 0 0 0',
            lineHeight: 1.5,
            textAlign: 'center',
          }}
        >
          {stats.totalReferred === 0
            ? 'Share your link to start earning free premium templates!'
            : `${stats.totalReferred} friend${stats.totalReferred !== 1 ? 's' : ''} referred, ${stats.totalConverted} created site${stats.totalConverted !== 1 ? 's' : ''}, ${stats.rewardsEarned} reward${stats.rewardsEarned !== 1 ? 's' : ''} earned`}
        </p>
      </div>

      {/* --- Claim reward button (when pending rewards available) --- */}
      {stats.pendingRewards > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={glassCard}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '14px',
                background:
                  'linear-gradient(135deg, rgba(163,177,138,0.25), rgba(163,177,138,0.1))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} color="var(--pl-olive)" />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: 'var(--pl-ink)',
                  fontFamily: 'var(--pl-font-heading)',
                  fontStyle: 'italic',
                }}
              >
                {stats.pendingRewards} reward{stats.pendingRewards !== 1 ? 's' : ''} available!
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--pl-muted)',
                  marginTop: '0.15rem',
                }}
              >
                Choose a premium template to claim for free
              </div>
            </div>
            <motion.button
              onClick={() => setShowClaimModal(true)}
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.6rem 1.2rem',
                borderRadius: '12px',
                background: 'var(--pl-olive)',
                color: 'var(--pl-cream)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                fontFamily: 'var(--pl-font-body)',
                whiteSpace: 'nowrap',
              }}
            >
              Claim Free Template
              <ChevronRight size={14} />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* --- Success toast --- */}
      <AnimatePresence>
        {claimedTemplate && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              ...glassCard,
              background: 'rgba(163,177,138,0.12)',
              border: '1px solid rgba(163,177,138,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <Check
              size={18}
              color="var(--pl-olive)"
              style={{ flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--pl-ink)',
                }}
              >
                Template claimed!
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--pl-muted)',
                  marginTop: '0.1rem',
                }}
              >
                &ldquo;{claimedTemplate}&rdquo; has been added to your account.
              </div>
            </div>
            <button
              onClick={() => setClaimedTemplate(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--pl-muted)',
                padding: '0.25rem',
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Error toast --- */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              ...glassCard,
              background: 'rgba(220,38,38,0.06)',
              border: '1px solid rgba(220,38,38,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                flex: 1,
                fontSize: '0.8rem',
                color: 'var(--pl-ink)',
              }}
            >
              {error}
            </div>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--pl-muted)',
                padding: '0.25rem',
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Claim modal (template picker) --- */}
      <AnimatePresence>
        {showClaimModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(43,30,20,0.4)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              padding: '1rem',
            }}
            onClick={() => !claiming && setShowClaimModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--pl-cream-card)',
                borderRadius: '20px',
                padding: '1.75rem',
                maxWidth: '480px',
                width: '100%',
                maxHeight: '70vh',
                overflow: 'auto',
                boxShadow: '0 20px 60px rgba(43,30,20,0.2)',
              }}
            >
              {/* Modal header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      fontFamily: 'var(--pl-font-heading)',
                      fontStyle: 'italic',
                      color: 'var(--pl-ink)',
                      margin: 0,
                    }}
                  >
                    Choose a Premium Template
                  </h3>
                  <p
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--pl-muted)',
                      margin: '0.25rem 0 0 0',
                    }}
                  >
                    Pick any premium template as your referral reward
                  </p>
                </div>
                <button
                  onClick={() => setShowClaimModal(false)}
                  disabled={claiming}
                  style={{
                    background: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.6)',
                    borderRadius: '10px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: claiming ? 'not-allowed' : 'pointer',
                    color: 'var(--pl-muted)',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Template list */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {premiumTemplates.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '2rem',
                      color: 'var(--pl-muted)',
                      fontSize: '0.85rem',
                    }}
                  >
                    Loading templates...
                  </div>
                ) : (
                  premiumTemplates.map((tmpl) => (
                    <motion.button
                      key={tmpl.id}
                      onClick={() => claimReward(tmpl.id)}
                      disabled={claiming}
                      whileHover={claiming ? {} : { scale: 1.01, y: -1 }}
                      whileTap={claiming ? {} : { scale: 0.99 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.9rem 1rem',
                        borderRadius: '14px',
                        background: 'rgba(255,255,255,0.5)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255,255,255,0.5)',
                        cursor: claiming ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        opacity: claiming ? 0.6 : 1,
                        transition: 'opacity 0.15s',
                      } as React.CSSProperties}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background:
                            'linear-gradient(135deg, rgba(163,177,138,0.2), rgba(163,177,138,0.08))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Sparkles size={16} color="var(--pl-olive)" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: 'var(--pl-ink)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {tmpl.name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--pl-muted)',
                            marginTop: '0.1rem',
                          }}
                        >
                          Normally ${(tmpl.price / 100).toFixed(2)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--pl-olive)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        FREE
                      </div>
                      <ChevronRight
                        size={14}
                        color="var(--pl-muted)"
                        style={{ flexShrink: 0 }}
                      />
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
