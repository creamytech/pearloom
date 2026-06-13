'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/CartDrawer.tsx
//
// Right-edge slide-in cart for the Theme Store. Mirrors the
// prototype's CartDrawer (store.jsx ~line 198): tiny pack
// thumbnails, name + collection, price, remove ×, subtotal,
// checkout CTA. Tier badges replace the prototype's blank
// "collection" subtitle since we have richer pack metadata.
//
// Closes on:
//   - backdrop click
//   - × button in the header
//   - Escape key (focus-trap inside the drawer)
//
// "Checkout" POSTs the cart to /api/store/checkout (which is
// the next phase's responsibility — for now we surface the
// response and clear the cart on success).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, Pear } from '../motifs';
import { useCart } from './CartProvider';
import { PackPreview } from './PackPreview';
import { collectionName, priceLabel, tierLabel } from './utils';
import type { Pack, Tier } from '@/lib/theme-store/packs';

interface CartDrawerProps {
  /** Open/closed — driven by the parent storefront. */
  open: boolean;
  onClose: () => void;
  /**
   * Optional override — the parent can swap in a richer checkout
   * flow (e.g. the in-editor "Apply to my site" path). Defaults
   * to posting the cart to /api/store/checkout.
   */
  onCheckout?: (items: readonly Pack[]) => void | Promise<void>;
}

// Tier badge palette — keyed off Pack.tier. Same color story
// as the QuickLook modal so a pack reads the same in the
// drawer and the centered modal.
const TIER_BADGE: Record<Tier, { bg: string; fg: string }> = {
  free: { bg: '#E0DDC9', fg: '#363F22' },
  premium: { bg: '#E8DEEE', fg: '#4A3F5C' },
  signature: { bg: '#231F33', fg: '#E5D6A8' },
};

function TierBadge({ tier }: { tier: Tier }) {
  const t = TIER_BADGE[tier];
  return (
    <span
      style={{
        padding: '2px 7px',
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        display: 'inline-block',
      }}
    >
      {tierLabel(tier)}
    </span>
  );
}

export function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const { items, removeFromCart, subtotalCents, clearCart } = useCart();
  const [checkoutState, setCheckoutState] = useState<'idle' | 'pending' | 'error'>('idle');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Close on Escape — only when open, only at this layer so a
  // nested QuickLook's Escape handler doesn't fight us.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Move focus to the close button on open so keyboard users
  // can dismiss with Enter / Space immediately. Reset error
  // state every time the drawer reopens.
  useEffect(() => {
    if (!open) return;
    setCheckoutState('idle');
    setCheckoutError(null);
    closeBtnRef.current?.focus();
  }, [open]);

  // Lock body scroll while the drawer is open — prevents the
  // page underneath from scrolling when the drawer reaches
  // its scroll-bottom.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleCheckout = useCallback(async () => {
    if (items.length === 0) return;
    setCheckoutState('pending');
    setCheckoutError(null);
    try {
      if (onCheckout) {
        await onCheckout(items);
      } else {
        // Default path — POST to the checkout route. The route is
        // implemented in the next phase; until then we expect a
        // 404/501 and surface the error.
        const res = await fetch('/api/store/checkout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ packIds: items.map((p) => p.id) }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Checkout failed (${res.status})`);
        }
        const json = (await res.json()) as { url?: string };
        if (json.url) {
          // Hand off to Stripe — Stripe returns to the store with
          // a session_id which the next phase resolves into
          // entitlements + clears the cart server-side.
          window.location.assign(json.url);
          return;
        }
        // Server completed inline (free-only cart, or test mode) —
        // clear locally and close.
        clearCart();
        onClose();
      }
      setCheckoutState('idle');
    } catch (err) {
      setCheckoutState('error');
      setCheckoutError(err instanceof Error ? err.message : 'Checkout failed');
    }
  }, [items, onCheckout, clearCart, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400 /* --z-toast tier; above modals, below max */,
        pointerEvents: open ? 'auto' : 'none',
      }}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(14,13,11,0.4)',
          opacity: open ? 1 : 0,
          transition: 'opacity var(--pl-dur-base, 280ms) var(--pl-ease-out, ease)',
        }}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(400px, 92vw)',
          background: 'var(--pl-cream-card, #FBF7EE)',
          color: 'var(--pl-ink, #0E0D0B)',
          boxShadow: '-12px 0 40px rgba(14,13,11,0.2)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform var(--pl-dur-base, 280ms) cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <header
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--pl-divider, #D8CFB8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--pl-font-display, Fraunces), serif',
              fontSize: 20,
              fontWeight: 600,
              margin: 0,
              color: 'var(--pl-ink, #0E0D0B)',
            }}
          >
            Your cart
            {items.length > 0 && (
              <span
                style={{
                  marginLeft: 10,
                  fontFamily: 'var(--pl-font-body, Geist), system-ui, sans-serif',
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: 'var(--pl-muted, #6F6557)',
                }}
              >
                {items.length} {items.length === 1 ? 'pack' : 'packs'}
              </span>
            )}
          </h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Close cart"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--pl-cream-deep, #EBE3D2)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--pl-ink-soft, #3A332C)',
            }}
          >
            <Icon name="close" size={15} />
          </button>
        </header>

        {/* Items */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                color: 'var(--pl-muted, #6F6557)',
                marginTop: 60,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Pear size={40} tone="sage" shadow={false} />
              <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                Nothing yet. Begin a thread —<br />
                browse the shelves and add a pack.
              </div>
            </div>
          ) : (
            items.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'center',
                  padding: 10,
                  borderRadius: 12,
                  background: 'var(--pl-cream-deep, #EBE3D2)',
                  border: '1px solid var(--pl-divider-soft, #E5DCC4)',
                }}
              >
                {/* Tiny live preview */}
                <div
                  style={{
                    width: 56,
                    height: 44,
                    borderRadius: 8,
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid var(--pl-divider, #D8CFB8)',
                  }}
                >
                  <PackPreview pack={p} height={44} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--pl-ink, #0E0D0B)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 3,
                    }}
                  >
                    <TierBadge tier={p.tier} />
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--pl-muted, #6F6557)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {collectionName(p.collection)}
                    </span>
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--pl-font-display, Fraunces), serif',
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--pl-ink, #0E0D0B)',
                  }}
                >
                  {priceLabel(p.priceCents)}
                </span>
                <button
                  onClick={() => removeFromCart(p.id)}
                  aria-label={`Remove ${p.name} from cart`}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--pl-muted, #6F6557)',
                  }}
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer — only when items present */}
        {items.length > 0 && (
          <footer
            style={{
              // Fixed-position drawer — keep the checkout CTA clear
              // of the iOS home indicator.
              padding: '18px 18px calc(18px + env(safe-area-inset-bottom, 0px))',
              borderTop: '1px solid var(--pl-divider, #D8CFB8)',
              background: 'var(--pl-cream, #F5EFE2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 12,
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--pl-ink-soft, #3A332C)' }}>Subtotal</span>
              <span
                style={{
                  fontFamily: 'var(--pl-font-display, Fraunces), serif',
                  fontWeight: 700,
                  fontSize: 22,
                  color: 'var(--pl-ink, #0E0D0B)',
                }}
              >
                {priceLabel(subtotalCents)}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkoutState === 'pending'}
              className="pl-pearl-accent"
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: 'var(--pl-radius-full, 100px)',
                fontWeight: 600,
                fontSize: 14,
                cursor: checkoutState === 'pending' ? 'progress' : 'pointer',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: checkoutState === 'pending' ? 0.7 : 1,
              }}
            >
              {checkoutState === 'pending' ? 'Threading…' : `Checkout · ${priceLabel(subtotalCents)}`}
            </button>
            {checkoutError && (
              <div
                role="alert"
                style={{
                  marginTop: 10,
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--pl-plum-mist, rgba(122,45,45,0.10))',
                  color: 'var(--pl-plum, #7A2D2D)',
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                {checkoutError}
              </div>
            )}
            <div
              style={{
                fontSize: 10.5,
                color: 'var(--pl-muted, #6F6557)',
                textAlign: 'center',
                marginTop: 10,
                lineHeight: 1.4,
              }}
            >
              Pearloom packs are yours forever. Apply any time from the editor.
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}
