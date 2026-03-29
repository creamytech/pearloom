'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/SiteSharePanel.tsx
// Premium share panel — link copy, QR, share options, password gate.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy, Check, Download, QrCode, ExternalLink, Globe,
  Mail, MessageCircle, Eye, EyeOff, Lock, Key,
} from 'lucide-react';

interface SiteSharePanelProps {
  siteUrl: string;
  siteId: string;
  siteName?: string;
  siteDescription?: string;
  /** Whether the site has a password gate enabled */
  passwordProtected?: boolean;
  /** The current site password, if protected */
  password?: string;
  onChangePassword?: () => void;
}

export function SiteSharePanel({
  siteUrl,
  siteId,
  siteName,
  siteDescription,
  passwordProtected = false,
  password,
  onChangePassword,
}: SiteSharePanelProps) {
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!siteUrl) return;
    fetch(`/api/qr?url=${encodeURIComponent(siteUrl)}`)
      .then((r) => r.text())
      .then((svg) => setQrSvg(svg))
      .catch(() => {});
  }, [siteUrl]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(siteUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadQr = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteId}-qr-code.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareWhatsApp = () => {
    const msg = `You're invited! View our wedding site: ${siteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareEmail = () => {
    const subject = siteName ? `You're invited — ${siteName}` : "You're invited!";
    const body = `View our wedding website:\n${siteUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const shareInstagram = () => {
    // Instagram doesn't allow direct share; copy link with context
    copyLink();
  };

  const pillBtn = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    primary = false
  ) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.6rem 1.1rem', borderRadius: '100px',
        background: primary ? 'var(--eg-fg)' : 'rgba(0,0,0,0.04)',
        color: primary ? '#fff' : 'var(--eg-fg)',
        border: primary ? 'none' : '1px solid rgba(0,0,0,0.08)',
        cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
        fontFamily: 'var(--eg-font-body)',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
      }}
      onMouseOver={(e) => {
        if (primary) {
          e.currentTarget.style.opacity = '0.88';
        } else {
          e.currentTarget.style.background = 'rgba(0,0,0,0.07)';
        }
      }}
      onMouseOut={(e) => {
        if (primary) {
          e.currentTarget.style.opacity = '1';
        } else {
          e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
        }
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
    >
      {/* ── URL display ── */}
      <div style={{
        background: '#fff',
        borderRadius: '1.25rem',
        border: '1px solid rgba(0,0,0,0.06)',
        padding: '1.5rem',
        boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <Globe size={13} color="var(--eg-accent)" />
          <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-accent)' }}>
            Your Wedding Site
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: 'rgba(0,0,0,0.025)', borderRadius: '0.75rem',
          padding: '0.875rem 1rem',
          border: '1px solid rgba(0,0,0,0.06)',
          marginBottom: '1.25rem',
        }}>
          <code style={{
            flex: 1, fontSize: '0.875rem', color: 'var(--eg-fg)',
            fontFamily: 'ui-monospace, monospace',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {siteUrl}
          </code>
          <AnimatePresence mode="wait">
            <motion.button
              key={copied ? 'copied' : 'copy'}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={copyLink}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.45rem 0.85rem', borderRadius: '0.5rem',
                background: copied ? 'rgba(34,197,94,0.1)' : 'var(--eg-fg)',
                color: copied ? '#16a34a' : '#fff',
                border: copied ? '1px solid rgba(34,197,94,0.2)' : 'none',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                fontFamily: 'var(--eg-font-body)',
                transition: 'all 0.2s', flexShrink: 0,
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </motion.button>
          </AnimatePresence>
        </div>

        {/* Share pill buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {pillBtn('Copy Link', <Copy size={14} />, copyLink, true)}
          {pillBtn('WhatsApp', <MessageCircle size={14} />, shareWhatsApp)}
          {pillBtn('Instagram Story', <Copy size={14} />, shareInstagram)}
          {pillBtn('Email', <Mail size={14} />, shareEmail)}
          <a
            href={siteUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.1rem', borderRadius: '100px',
              background: 'rgba(163,177,138,0.08)',
              color: 'var(--eg-accent)',
              border: '1px solid rgba(163,177,138,0.2)',
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
              fontFamily: 'var(--eg-font-body)', textDecoration: 'none',
              transition: 'background 0.2s', whiteSpace: 'nowrap',
            }}
            onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(163,177,138,0.14)'; }}
            onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(163,177,138,0.08)'; }}
          >
            <ExternalLink size={14} />
            Preview Site
          </a>
        </div>
      </div>

      {/* ── QR Code + Social preview row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* QR Code */}
        <div style={{
          background: '#fff', borderRadius: '1.25rem',
          border: '1px solid rgba(0,0,0,0.06)',
          padding: '1.25rem', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
        }}>
          <div style={{
            width: '120px', height: '120px', borderRadius: '0.75rem',
            overflow: 'hidden', background: 'rgba(0,0,0,0.02)',
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {qrSvg ? (
              <div
                dangerouslySetInnerHTML={{ __html: qrSvg }}
                style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            ) : (
              <QrCode size={40} color="rgba(0,0,0,0.12)" />
            )}
          </div>
          <button
            onClick={downloadQr}
            disabled={!qrSvg}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.45rem 0.85rem', borderRadius: '0.5rem',
              border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
              cursor: qrSvg ? 'pointer' : 'not-allowed',
              fontSize: '0.72rem', fontWeight: 600, opacity: qrSvg ? 1 : 0.4,
              color: 'var(--eg-fg)', fontFamily: 'var(--eg-font-body)',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => { if (qrSvg) e.currentTarget.style.background = '#f5f5f5'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Download size={12} />
            Download QR
          </button>
        </div>

        {/* Social preview mock */}
        <div style={{
          background: '#fff', borderRadius: '1.25rem',
          border: '1px solid rgba(0,0,0,0.06)',
          padding: '1.25rem', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          flex: 1,
        }}>
          <span style={{
            display: 'block', marginBottom: '0.85rem',
            fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--eg-muted)',
          }}>
            Link Preview
          </span>
          {/* Mock iMessage / WhatsApp card */}
          <div style={{
            border: '1px solid rgba(0,0,0,0.08)', borderRadius: '0.75rem',
            overflow: 'hidden', background: 'rgba(0,0,0,0.02)',
          }}>
            <div style={{
              height: '80px', background: 'linear-gradient(135deg, var(--eg-accent-light), var(--eg-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Globe size={28} color="rgba(255,255,255,0.6)" />
            </div>
            <div style={{ padding: '0.75rem 0.875rem' }}>
              <div style={{
                fontSize: '0.8rem', fontWeight: 700, color: 'var(--eg-fg)',
                marginBottom: '0.2rem',
                fontFamily: 'var(--eg-font-heading)',
              }}>
                {siteName || 'Our Wedding Website'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--eg-muted)', marginBottom: '0.35rem', lineHeight: 1.4 }}>
                {siteDescription || 'Join us to celebrate our special day.'}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(0,0,0,0.3)' }}>
                pearloom.com
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Password gate section ── */}
      {passwordProtected && (
        <div style={{
          background: '#fff', borderRadius: '1.25rem',
          border: '1px solid rgba(0,0,0,0.06)',
          padding: '1.5rem', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Lock size={14} color="var(--eg-muted)" />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--eg-muted)' }}>
              Password Protection
            </span>
          </div>
          {password && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.7rem 1rem', borderRadius: '0.75rem',
                border: '1.5px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)',
              }}>
                <Key size={14} color="var(--eg-muted)" />
                <code style={{ flex: 1, fontSize: '0.875rem', fontFamily: 'ui-monospace, monospace', color: 'var(--eg-fg)', letterSpacing: '0.08em' }}>
                  {showPassword ? password : '••••••••'}
                </code>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--eg-muted)', display: 'flex', padding: '2px' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}
          {onChangePassword && (
            <button
              onClick={onChangePassword}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.1rem', borderRadius: '0.6rem',
                border: '1px solid rgba(0,0,0,0.1)', background: 'transparent',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                color: 'var(--eg-fg)', fontFamily: 'var(--eg-font-body)',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Key size={13} />
              Change password
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
