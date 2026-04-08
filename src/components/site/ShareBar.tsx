'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareBarProps {
  url: string;
  title: string;
  accent: string;
  bgColor: string;
}

export function ShareBar({ url, title, accent, bgColor }: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback: select text
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* ignore */ }
    }
  };

  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(`${title} 💕`)}&url=${encodeURIComponent(url)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;

  const btnBase: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '6px 14px', borderRadius: '100px',
    fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em',
    cursor: 'pointer', textDecoration: 'none',
    border: `1px solid ${accent}40`,
    background: `${accent}12`,
    color: accent,
    transition: 'opacity 0.15s',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '1.25rem' }}
    >
      <motion.a href={twitterUrl} target="_blank" rel="noopener noreferrer" style={btnBase} aria-label="Share on X / Twitter"
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
        Share on X
      </motion.a>
      <motion.a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={btnBase} aria-label="Share on WhatsApp"
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
        Share on WhatsApp
      </motion.a>
      <motion.button
        onClick={handleCopy}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        style={{ ...btnBase, background: copied ? `${accent}25` : btnBase.background as string }}
        aria-label="Copy link"
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={copied ? 'copied' : 'copy'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
          >
            {copied ? 'Copied! ✓' : 'Copy Link'}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </motion.div>
  );
}
