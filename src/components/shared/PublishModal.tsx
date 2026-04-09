'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Globe, ArrowRight, Check, Copy, ExternalLink, Mail, MessageCircle } from 'lucide-react';
import { Modal, Button, Input } from '@/components/ui';
import type { StoryManifest } from '@/types';

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(url); } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className={`px-4 py-3 border-l border-l-[var(--pl-gold)] border-0 flex-shrink-0 cursor-pointer text-[0.75rem] font-bold tracking-[0.06em] uppercase whitespace-nowrap transition-all duration-200 ${
        copied
          ? 'bg-[var(--pl-olive-mist)] text-[var(--pl-olive)]'
          : 'bg-transparent text-[var(--pl-muted)] hover:text-[var(--pl-ink)]'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      onClick={async () => {
        try { await navigator.clipboard.writeText(url); } catch {}
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-[var(--pl-radius-md)] font-semibold text-[1rem] transition-all duration-200 cursor-pointer border-0 ${
        copied
          ? 'bg-[var(--pl-olive)] text-white shadow-[0_8px_30px_rgba(163,177,138,0.4)]'
          : 'bg-[var(--pl-cream)] text-[var(--pl-ink)] border border-[var(--pl-divider)] hover:bg-[var(--pl-olive-mist)]'
      }`}
    >
      {copied ? <><Check size={16} /> Link Copied!</> : <><Copy size={16} /> Copy Link</>}
    </motion.button>
  );
}

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  manifest: StoryManifest | null;
  coupleNames: [string, string];
  initialSubdomain: string;
  onSubdomainChange?: (subdomain: string) => void;
  /** Called after successful publish — receives the live URL */
  onPublished?: (url: string) => void;
}

export function PublishModal({
  open,
  onClose,
  manifest,
  coupleNames,
  initialSubdomain,
  onSubdomainChange,
  onPublished,
}: PublishModalProps) {
  // Auto-suggest a name from couple names
  const suggestedName = useMemo(() => {
    if (initialSubdomain) return initialSubdomain;
    const [a, b] = coupleNames;
    if (a?.trim() && b?.trim()) {
      return `${a.trim().toLowerCase()}-and-${b.trim().toLowerCase()}`.replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
    }
    if (a?.trim()) return a.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    return '';
  }, [coupleNames, initialSubdomain]);

  const [subdomain, setSubdomain] = useState(suggestedName || initialSubdomain);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleSubdomainChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(clean);
    onSubdomainChange?.(clean);
  };

  const handlePublish = async () => {
    const target = subdomain.trim();
    if (!target) return setError('Please enter a site name.');
    if (!manifest) return setError('No manifest to publish. Please generate a site first.');
    setError(null);
    setIsPublishing(true);

    try {
      const res = await fetch('/api/sites/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain: target, manifest, names: coupleNames }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish');

      setPublishedUrl(data.url);
      onPublished?.(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    setPublishedUrl(null);
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} showClose={!publishedUrl}>
      {publishedUrl ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center gap-5 relative overflow-hidden text-center">
          {/* Celebration rings */}
          <div className="relative mb-1">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.6, opacity: 0.6 }}
                animate={{ scale: 1 + i * 0.45, opacity: 0 }}
                transition={{ duration: 1.8, delay: i * 0.25, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-[var(--pl-olive)] pointer-events-none"
              />
            ))}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="w-20 h-20 rounded-full flex items-center justify-center text-white relative z-[1] bg-[var(--pl-olive)] shadow-[0_12px_40px_rgba(163,177,138,0.45)]"
            >
              <Check size={28} strokeWidth={2.5} />
            </motion.div>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[2.25rem] font-normal tracking-tight leading-tight font-heading"
          >
            Your Story is Live
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-[var(--pl-muted)] text-[0.95rem]"
          >
            Share this link with your guests
          </motion.p>

          {/* URL display — large and prominent */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full rounded-[var(--pl-radius-md)] overflow-hidden bg-[var(--pl-cream)] border border-[var(--pl-gold)] p-4"
          >
            <Globe size={18} className="mx-auto mb-2 text-[var(--pl-olive)]" />
            <div className="text-[1.15rem] text-[var(--pl-ink)] font-bold tracking-tight break-all leading-snug">
              {publishedUrl.replace(/^https?:\/\//, '')}
            </div>
          </motion.div>

          {/* Copy Link — big primary action */}
          <CopyLinkButton url={publishedUrl} />

          {/* View Your Site */}
          <motion.a
            href={publishedUrl}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-[var(--pl-radius-md)] text-white no-underline font-semibold text-[1rem] bg-[var(--pl-olive)] shadow-[0_8px_30px_rgba(163,177,138,0.4)] hover:bg-[var(--pl-olive-hover)] transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ExternalLink size={16} /> View Your Site
          </motion.a>

          {/* Share options */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="flex gap-3 w-full"
          >
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Check out our wedding site: ${publishedUrl}`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[var(--pl-radius-md)] no-underline font-medium text-[0.85rem] text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/5 transition-colors"
            >
              <MessageCircle size={15} /> WhatsApp
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent('Our Wedding Site')}&body=${encodeURIComponent(`We are so excited to share our wedding site with you: ${publishedUrl}`)}`}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[var(--pl-radius-md)] no-underline font-medium text-[0.85rem] text-[var(--pl-ink)] border border-[var(--pl-divider)] hover:bg-[var(--pl-cream)] transition-colors"
            >
              <Mail size={15} /> Email
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="flex gap-3 w-full"
          >
            <a
              href={`/rsvps?domain=${subdomain}`}
              className="flex-1 flex items-center justify-center py-3.5 rounded-[var(--pl-radius-md)] no-underline font-medium text-[0.9rem] text-[var(--pl-ink)] border border-[var(--pl-divider)] hover:bg-[var(--pl-cream)] transition-colors"
            >
              Manage RSVPs
            </a>
            <button
              onClick={handleClose}
              className="flex-1 bg-transparent cursor-pointer font-medium text-[0.9rem] text-[var(--pl-muted)] rounded-[var(--pl-radius-md)] border border-[var(--pl-divider)] hover:bg-[var(--pl-cream)] hover:text-[var(--pl-ink)] transition-colors"
            >
              Done
            </button>
          </motion.div>
        </div>
      ) : (
        /* ── URL input state ── */
        <>
          <h2 className="text-[2rem] mb-2 font-heading font-normal">
            Choose Your Site Name
          </h2>
          <p className="text-[var(--pl-muted)] mb-1">
            We&apos;ve pre-filled a unique site name — customize it below.
          </p>
          <p className="text-[var(--pl-muted)] text-[0.78rem] mb-1 opacity-70">
            Your site will be live at <strong>yourname.pearloom.com</strong>
          </p>
          <p className="text-[var(--pl-muted)] text-[0.78rem] mb-8 opacity-70">
            You can upgrade to a full custom domain later.
          </p>

          {error && (
            <div className="text-red-600 bg-red-50 p-3 rounded-lg mb-6 text-[0.9rem]">
              {error}
            </div>
          )}

          {/* Publish readiness warnings */}
          {manifest && (() => {
            const warnings: string[] = [];
            const hasDate = !!(manifest.events?.[0]?.date || manifest.logistics?.date);
            const hasPhotos = (manifest.chapters?.some(c => (c.images?.length ?? 0) > 0)) || !!manifest.coverPhoto;
            const hasNames = !!(coupleNames?.[0]?.trim());
            if (!hasNames) warnings.push('No names set — your hero will be empty');
            if (!hasDate) warnings.push('No event date — countdown timer won\'t work');
            if (!hasPhotos) warnings.push('No photos — your site will use placeholder art');
            if (!manifest.events?.length) warnings.push('No events added — schedule section will be hidden');
            return warnings.length > 0 ? (
              <div className="mb-5 p-3 rounded-lg text-[0.78rem] leading-relaxed"
                style={{ background: 'rgba(196,169,106,0.1)', border: '1px solid rgba(196,169,106,0.2)', color: 'var(--pl-ink-soft)' }}>
                <div className="font-bold text-[0.65rem] uppercase tracking-[0.08em] text-[var(--pl-gold)] mb-1.5">Before you publish</div>
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-1.5 mt-1">
                    <span className="text-[var(--pl-gold)] shrink-0 mt-0.5">•</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            ) : null;
          })()}

          <Input
            value={subdomain}
            onChange={(e) => handleSubdomainChange(e.target.value)}
            placeholder="ben-and-shauna"
            disabled={isPublishing}
            suffix=".pearloom.com"
          />

          <div className="flex gap-4 mt-8">
            <Button variant="secondary" size="lg" onClick={handleClose} disabled={isPublishing} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="accent"
              size="lg"
              onClick={handlePublish}
              disabled={isPublishing || !subdomain}
              loading={isPublishing}
              icon={!isPublishing ? <Globe size={16} /> : undefined}
              className="flex-[2]"
            >
              Publish Site
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
