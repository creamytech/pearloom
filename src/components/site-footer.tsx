'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site-footer.tsx
// ─────────────────────────────────────────────────────────────

import { Heart } from 'lucide-react';

interface SiteFooterProps {
  names: [string, string];
}

export function SiteFooter({ names }: SiteFooterProps) {
  return (
    <footer className="py-12 text-center border-t border-black/5">
      <p className="text-sm text-[var(--eg-muted)] flex items-center justify-center gap-2">
        Made with <Heart size={14} className="text-[var(--eg-accent)] fill-[var(--eg-accent)]" /> by {names[0]} & {names[1]}
      </p>
      <p className="text-xs text-[var(--eg-muted)]/50 mt-2">
        Powered by <span className="font-medium" style={{ fontFamily: 'var(--eg-font-heading)' }}>Pearloom</span>
      </p>
    </footer>
  );
}
