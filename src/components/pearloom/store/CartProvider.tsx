'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/CartProvider.tsx
//
// Theme-Store cart context. The cart is a flat list of pack ids
// (one of each pack — a pack is a digital good, you don't buy
// two copies). State is persisted to localStorage so refreshes,
// route changes and "checkout" round-trips don't drop the cart.
//
// Shape parity with the prototype's `pl-store-cart` localStorage
// key — array of pack id strings. We bump the key namespace to
// 'pearloom:theme-store:cart' so a future prototype-vs-prod
// coexistence doesn't share state.
//
// Empty/invalid ids are filtered against the pack catalog on
// read so a renamed/retired pack never leaves the cart drawer
// in a broken state (and we don't crash on `getPackById(...)`
// returning undefined).
// ─────────────────────────────────────────────────────────────

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getPackById, type Pack } from '@/lib/theme-store/packs';

const STORAGE_KEY = 'pearloom:theme-store:cart';

interface CartContextValue {
  /** Stable list of pack ids currently in the cart. */
  itemIds: readonly string[];
  /**
   * Resolved Pack objects for the cart. Filtered against the
   * catalog — unknown ids (renamed/retired packs) drop out
   * silently so the drawer never renders a "ghost" row.
   */
  items: readonly Pack[];
  /** Whether `id` is in the cart. */
  hasItem: (id: string) => boolean;
  /** Cart subtotal in **cents**, summed from resolved packs. */
  subtotalCents: number;
  /** Idempotent — adding the same pack twice is a no-op. */
  addToCart: (pack: Pack) => void;
  /** No-op if `id` isn't in the cart. */
  removeFromCart: (id: string) => void;
  /** Empty the cart. */
  clearCart: () => void;
  /** Hydration flag — false until first localStorage read completes. */
  hydrated: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

function readInitialIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive: only keep string entries.
    return parsed.filter((x): x is string => typeof x === 'string');
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // SSR-safe lazy init. On the server `typeof window === 'undefined'`,
  // so the initializer returns []. On the client (first render after
  // hydration) it reads localStorage in the same render that mounts —
  // avoiding the empty-then-populated cascade.
  const [itemIds, setItemIds] = useState<string[]>(() => readInitialIds());

  // `hydrated` is a public flag for consumers that want to defer UI
  // until the cart is known (e.g. don't flash an empty drawer on
  // first paint). We expose it through context but track the
  // first-render skip via a ref so the persistence effect doesn't
  // depend on setState-in-effect.
  const hydrated = typeof window !== 'undefined';
  const firstWriteSkipped = useRef(false);

  // Persist on every change, but skip the initial render so we
  // don't blow away a populated localStorage with the same value
  // we just read out of it.
  useEffect(() => {
    if (!firstWriteSkipped.current) {
      firstWriteSkipped.current = true;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itemIds));
    } catch {
      // localStorage can throw on quota / privacy-mode. The cart
      // still works for this session — silent failure is OK.
    }
  }, [itemIds]);

  // Cross-tab sync — if the user adds a pack in another tab, the
  // current tab's drawer picks it up via the `storage` event.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setItemIds(readInitialIds());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const items = useMemo<Pack[]>(() => {
    const out: Pack[] = [];
    for (const id of itemIds) {
      const pack = getPackById(id);
      if (pack) out.push(pack);
    }
    return out;
  }, [itemIds]);

  const subtotalCents = useMemo(
    () => items.reduce((sum, p) => sum + p.priceCents, 0),
    [items],
  );

  const hasItem = useCallback((id: string) => itemIds.includes(id), [itemIds]);

  const addToCart = useCallback((pack: Pack) => {
    setItemIds((prev) => (prev.includes(pack.id) ? prev : [...prev, pack.id]));
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setItemIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItemIds([]);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      itemIds,
      items,
      hasItem,
      subtotalCents,
      addToCart,
      removeFromCart,
      clearCart,
      hydrated,
    }),
    [itemIds, items, hasItem, subtotalCents, addToCart, removeFromCart, clearCart, hydrated],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * Hook for consumers — throws if used outside a CartProvider so
 * misuse fails loudly in dev instead of silently no-ops'ing
 * (`addToCart` would otherwise be a function-shaped null).
 */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return ctx;
}

/** Storage key — exported for tests / debug tooling only. */
export const CART_STORAGE_KEY = STORAGE_KEY;
