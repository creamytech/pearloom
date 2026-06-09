'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / pearloom/store/ThemeStore.tsx
//
// Main Theme Store client surface. Composes:
//   • Sticky header with brand + search + owned count + cart pill
//   • Editorial hero ("A look for every once-in-a-lifetime day.")
//     with a featured pack preview
//   • Sticky filter bar: collection chips (All / Free / Bestsellers
//     / New / 11 collections / My themes) + sort dropdown
//   • Pack grid (`auto-fill, minmax(290px, 1fr)`)
//   • <QuickLookModal>, <CartDrawer>, toast pill
//
// Local state:
//   - search query, active collection chip, sort key, modal target,
//     cart-open flag, toast message
//   - ownership comes from useEntitlements() (server)
//   - cart comes from useCart() (CartProvider, localStorage-backed)
//
// "Apply" handler writes `{ id, themeRef, kit }` to the legacy
// `pl-applied-pack` localStorage key and navigates to /editor —
// the editor reads that key on mount to stamp the look.
// ─────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { COLLECTIONS, PACKS, getPackById, type Pack } from '@/lib/theme-store/packs';
import { StoreFonts } from '@/lib/theme-store/fonts';
import { Icon, Pear } from '../motifs';
import { useIsMobile } from '../redesign/use-nav-hooks';
import { PackCard } from './PackCard';
import { PackPreview } from './PackPreview';
import { QuickLookModal } from './QuickLookModal';
import { CartDrawer } from './CartDrawer';
import { CartProvider, useCart } from './CartProvider';
import { useEntitlements } from './useEntitlements';
import { collectionName, priceLabel } from './utils';

type SortKey = 'featured' | 'rating' | 'new' | 'price-lo' | 'price-hi';
type ChipId =
  | 'all'
  | 'free'
  | 'best'
  | 'new'
  | 'owned'
  | (typeof COLLECTIONS)[number]['id'];

const SORTS: ReadonlyArray<{ id: SortKey; label: string }> = [
  { id: 'featured', label: 'Featured' },
  { id: 'rating', label: 'Top rated' },
  { id: 'new', label: 'Newest' },
  { id: 'price-lo', label: 'Price: low to high' },
  { id: 'price-hi', label: 'Price: high to low' },
];

interface FeaturedHeroProps {
  pack: Pack;
  onOpen: (pack: Pack) => void;
}

function FeaturedHero({ pack, onOpen }: FeaturedHeroProps) {
  // Below ~720px the side-by-side hero crushes the featured pack
  // preview into a sliver — stack instead (text above, preview
  // below) and give the preview real height. SSR-safe matchMedia
  // hook; first paint is desktop, flips on mount.
  const isNarrow = useIsMobile(720);
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: isNarrow ? '22px 16px 8px' : '34px 26px 8px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isNarrow ? '1fr' : '1fr 1fr',
          gap: isNarrow ? 22 : 34,
          alignItems: isNarrow ? 'stretch' : 'center',
          background: 'var(--pl-cream-card, #FBF7EE)',
          borderRadius: 24,
          padding: isNarrow ? 20 : 30,
          border: '1px solid var(--pl-divider-soft, #E5DCC4)',
          overflow: 'hidden',
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--lavender-ink, #6B5A8C)',
            }}
          >
            The Theme Store
          </div>
          <h1
            style={{
              fontFamily: 'var(--pl-font-display, "Fraunces"), Georgia, serif',
              // clamp() keeps desktop at 46 while letting 390px
              // viewports breathe — "once-in-a-lifetime" overflowed.
              fontSize: 'clamp(32px, 9vw, 46px)',
              fontWeight: 600,
              lineHeight: 1.02,
              margin: '8px 0 12px',
              letterSpacing: '-0.02em',
            }}
          >
            A look for every
            <br />
            <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink, #6B5A8C)' }}>
              once-in-a-lifetime
            </span>{' '}
            day.
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'var(--pl-ink-soft, #3A332C)',
              lineHeight: 1.6,
              maxWidth: 440,
            }}
          >
            {PACKS.length} designer theme packs — each a full kit of palette, real material texture,
            type, motifs and matching components. One tap to own, one tap to dress your site.
          </p>
          <div style={{ display: 'flex', gap: 22, marginTop: 20, flexWrap: 'wrap' }}>
            {[
              { n: PACKS.length, l: 'theme packs' },
              { n: COLLECTIONS.length, l: 'collections' },
              { n: 8, l: 'component kits' },
            ].map((it) => (
              <div key={it.l}>
                <div
                  style={{
                    fontFamily: 'var(--pl-font-display, "Fraunces"), Georgia, serif',
                    fontSize: 26,
                    fontWeight: 700,
                  }}
                >
                  {it.n}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--pl-muted, #6F6557)' }}>{it.l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Not a <button>: PackPreview's `rich` mode renders decorative
            inner <button>s (RSVP / Our story), and nesting buttons is
            invalid HTML — it triggered a hydration error. div+role keeps
            the click + keyboard affordance without the nesting. */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => onOpen(pack)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpen(pack);
            }
          }}
          className="pl-store-featured-card"
          style={{
            cursor: 'pointer',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid var(--pl-divider-soft, #E5DCC4)',
            position: 'relative',
            padding: 0,
            background: 'transparent',
            textAlign: 'left',
          }}
          aria-label={`Open ${pack.name} quick look`}
        >
          <PackPreview pack={pack} height={isNarrow ? 360 : 300} rich />
          <span
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              padding: '3px 9px',
              borderRadius: 999,
              background: '#231F33',
              color: '#E5D6A8',
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            ✦ Featured · Signature
          </span>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '26px 16px 14px',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.55))',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              color: '#fff',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--pl-font-display, "Fraunces"), Georgia, serif',
                  fontWeight: 600,
                  fontSize: 18,
                }}
              >
                {pack.name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11.5 }}>Tap to preview</div>
            </div>
            <span
              style={{
                fontFamily: 'var(--pl-font-display, "Fraunces"), Georgia, serif',
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              {priceLabel(pack.priceCents)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

interface ToastState {
  message: string;
  id: number;
}

/**
 * Minimal shape returned by GET /api/sites. We only need the
 * subdomain (URL slug) + a display name for the site-picker
 * prompt — full manifest hydration happens when the editor opens.
 */
interface OwnedSiteRow {
  subdomain: string;
  displayName: string;
}

function StoreInner() {
  const router = useRouter();
  const { addToCart, hasItem, itemIds } = useCart();
  const { owned } = useEntitlements();

  const [q, setQ] = useState('');
  const [chip, setChip] = useState<ChipId>('all');
  const [sort, setSort] = useState<SortKey>('featured');
  const [look, setLook] = useState<Pack | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  // Local ownership shadow — the entitlements API is read-only at
  // this phase, so when a host taps "Get free" we add the id to a
  // local set so the card flips to "Apply" without a round-trip.
  const [implicitFree, setImplicitFree] = useState<ReadonlySet<string>>(() => new Set());
  // Site-picker prompt state — used when the host taps Apply on
  // the standalone store and we don't yet know which of their
  // sites to apply the pack to.
  const [sitePicker, setSitePicker] = useState<{
    pack: Pack;
    sites: OwnedSiteRow[];
    loading: boolean;
  } | null>(null);

  // Owned set combines server entitlements + free unlocks claimed
  // in this session.
  const ownedSet = useMemo(() => {
    const s = new Set<string>(owned);
    for (const id of implicitFree) s.add(id);
    return s;
  }, [owned, implicitFree]);

  // Auto-dismiss the toast after 2.6s — matches prototype timing.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Filter + sort the catalog in one memo.
  const filtered = useMemo(() => {
    let list = PACKS.slice();
    const ql = q.trim().toLowerCase();
    if (ql) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(ql) ||
          p.tags.some((t) => t.includes(ql)) ||
          collectionName(p.collection).toLowerCase().includes(ql),
      );
    }
    if (chip === 'free') list = list.filter((p) => p.priceCents === 0);
    else if (chip === 'best') list = list.filter((p) => p.badges.best);
    else if (chip === 'new') list = list.filter((p) => p.badges.new);
    else if (chip === 'owned') list = list.filter((p) => ownedSet.has(p.id));
    else if (chip !== 'all') list = list.filter((p) => p.collection === chip);

    const sorted = list.slice();
    if (sort === 'price-lo') sorted.sort((a, b) => a.priceCents - b.priceCents);
    else if (sort === 'price-hi') sorted.sort((a, b) => b.priceCents - a.priceCents);
    else if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sort === 'new')
      sorted.sort((a, b) => (b.badges.new ? 1 : 0) - (a.badges.new ? 1 : 0));
    else
      sorted.sort(
        (a, b) => (b.badges.best ? 1 : 0) - (a.badges.best ? 1 : 0) || b.rating - a.rating,
      );
    return sorted;
  }, [q, chip, sort, ownedSet]);

  const featured = useMemo(
    () => getPackById('midnight-velvet') ?? PACKS[0],
    [],
  );

  // The chip set — All / Free / Bestsellers / New / 11 collections / My themes
  const chips: ReadonlyArray<{ id: ChipId; label: string }> = useMemo(
    () => [
      { id: 'all', label: 'All' },
      { id: 'free', label: 'Free' },
      { id: 'best', label: '★ Bestsellers' },
      { id: 'new', label: 'New' },
      ...COLLECTIONS.map((c) => ({ id: c.id, label: c.name })),
      { id: 'owned', label: 'My themes' },
    ],
    [],
  );

  // Use a monotonic counter via ref instead of Date.now() — the
  // lint rule react-hooks/purity flags Date.now in render-path code
  // because two simultaneous toasts within the same tick would
  // collide on id. A ref-backed counter is deterministic + unique.
  const toastIdRef = useRef(0);
  const fire = (message: string) => {
    toastIdRef.current += 1;
    setToast({ message, id: toastIdRef.current });
  };

  const handleAdd = (p: Pack) => {
    addToCart(p);
    fire(`${p.name} added to cart`);
  };

  const handleGetFree = (p: Pack) => {
    setImplicitFree((prev) => {
      const next = new Set(prev);
      next.add(p.id);
      return next;
    });
    fire(`${p.name} added to your themes`);
  };

  /**
   * Stash the pack payload that the editor's mount hook reads. The
   * editor's first paint picks this up and stamps the look onto
   * the active manifest via applyPackToManifest().
   *
   * Returns false silently if storage is unavailable so the caller
   * can decide whether to abort the redirect.
   */
  const stashPackForEditor = (p: Pack): boolean => {
    try {
      window.localStorage.setItem(
        'pl-applied-pack',
        JSON.stringify({ id: p.id, vars: p.themeRef, kit: p.kit }),
      );
      return true;
    } catch {
      // localStorage may throw on quota / privacy mode — ignore.
      return false;
    }
  };

  /**
   * Apply path on the standalone /store page. Three cases:
   *
   *   1. Host owns exactly one site → stash + redirect straight to
   *      that site's editor.
   *   2. Host owns multiple sites → open the "Pick a site" prompt
   *      so they can choose which one to dress with this pack.
   *   3. Host owns zero sites (or the API errors) → fall back to
   *      the legacy `/editor` redirect so they at least land on a
   *      surface that knows what to do next (dashboard prompts a
   *      site creation).
   */
  const handleApply = async (p: Pack) => {
    fire(`Looking up your sites…`);
    let sites: OwnedSiteRow[] = [];
    try {
      const res = await fetch('/api/sites', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const json = (await res.json()) as {
          sites?: Array<{
            subdomain?: string;
            ai_manifest?: { names?: [string?, string?] } | null;
          }>;
        };
        sites = (json.sites ?? [])
          .filter((row): row is { subdomain: string; ai_manifest?: { names?: [string?, string?] } | null } => typeof row.subdomain === 'string' && row.subdomain.length > 0)
          .map((row) => {
            const names = row.ai_manifest?.names ?? [];
            const a = (names[0] ?? '').trim();
            const b = (names[1] ?? '').trim();
            const displayName =
              a && b ? `${a} & ${b}` : a || b || row.subdomain;
            return { subdomain: row.subdomain, displayName };
          });
      }
    } catch {
      // Network or auth failure — fall through to the legacy redirect.
    }

    if (sites.length === 0) {
      // Either the host has no sites, or the API is unreachable.
      // Stash and bounce to /editor; the editor will route them
      // appropriately (typically to the dashboard).
      stashPackForEditor(p);
      fire(`Applying ${p.name}…`);
      setTimeout(() => router.push('/editor'), 600);
      return;
    }

    if (sites.length === 1) {
      // Common case — one site, no prompt needed.
      stashPackForEditor(p);
      fire(`Applying ${p.name} to ${sites[0]!.displayName}…`);
      setTimeout(() => router.push(`/editor/${sites[0]!.subdomain}`), 600);
      return;
    }

    // Multiple sites — let the host pick.
    setSitePicker({ pack: p, sites, loading: false });
  };

  /**
   * Called from the site-picker prompt when the host clicks a site
   * tile. Stashes the pack and redirects to that site's editor.
   */
  const applyToSite = (subdomain: string) => {
    if (!sitePicker) return;
    stashPackForEditor(sitePicker.pack);
    const name = sitePicker.sites.find((s) => s.subdomain === subdomain)?.displayName ?? subdomain;
    fire(`Applying ${sitePicker.pack.name} to ${name}…`);
    setSitePicker(null);
    setTimeout(() => router.push(`/editor/${subdomain}`), 600);
  };

  const handleOpen = (p: Pack) => setLook(p);

  return (
    <div
      className="pl-store-root"
      style={{
        minHeight: '100vh',
        background: 'var(--pl-cream, #F5EFE2)',
        color: 'var(--pl-ink, #0E0D0B)',
        position: 'relative',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(245,239,226,0.86)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--pl-divider-soft, #E5DCC4)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '12px 26px',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <Pear size={26} tone="sage" shadow={false} />
            <span
              style={{
                fontFamily: 'var(--pl-font-display, "Fraunces"), Georgia, serif',
                fontWeight: 700,
                fontSize: 19,
              }}
            >
              Pearloom
            </span>
          </Link>
          <span
            style={{
              fontSize: 12.5,
              color: 'var(--pl-muted, #6F6557)',
              borderLeft: '1px solid var(--pl-divider, #D8CFB8)',
              paddingLeft: 18,
            }}
          >
            Theme Store
          </span>
          <div style={{ flex: 1, maxWidth: 440, marginInline: 'auto', position: 'relative', minWidth: 200 }}>
            <span
              style={{
                position: 'absolute',
                left: 13,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--pl-muted, #6F6557)',
                display: 'inline-flex',
              }}
              aria-hidden="true"
            >
              <Icon name="search" size={15} color="var(--pl-muted, #6F6557)" />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search packs, colors, vibes…"
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: 999,
                border: '1px solid var(--pl-divider, #D8CFB8)',
                background: 'var(--pl-cream-card, #FBF7EE)',
                fontSize: 13,
                outline: 'none',
                color: 'var(--pl-ink, #0E0D0B)',
              }}
              aria-label="Search packs"
            />
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              color: 'var(--pl-ink-soft, #3A332C)',
            }}
          >
            <Icon name="check" size={13} color="var(--sage-deep, #6d7d3f)" /> {ownedSet.size} owned
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 16px',
              borderRadius: 999,
              background: 'var(--pl-ink, #0E0D0B)',
              color: 'var(--pl-cream, #F5EFE2)',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'transform 180ms ease',
            }}
            aria-label={`Open cart with ${itemIds.length} items`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="20" r="1.4" />
              <circle cx="18" cy="20" r="1.4" />
              <path d="M3 4h2l2.5 12.5a2 2 0 002 1.5h8.5a2 2 0 002-1.6L21 8H6" />
            </svg>
            Cart
            {itemIds.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -5,
                  right: -5,
                  minWidth: 19,
                  height: 19,
                  padding: '0 5px',
                  borderRadius: 999,
                  background: 'var(--peach-2, #EAB286)',
                  color: '#5A2E12',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {itemIds.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* HERO */}
      <FeaturedHero pack={featured} onOpen={handleOpen} />

      {/* FILTER BAR */}
      <div
        style={{
          position: 'sticky',
          top: 57,
          zIndex: 30,
          background: 'var(--pl-cream, #F5EFE2)',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '14px 26px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 2,
              minWidth: 0,
              // Phone polish — the strip already scrolls instead of
              // wrapping; snap each chip to the leading edge so a
              // flick lands cleanly, and keep iOS momentum.
              scrollSnapType: 'x proximity',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {chips.map((c) => {
              const on = chip === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setChip(c.id)}
                  style={{
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    scrollSnapAlign: 'start',
                    padding: '7px 14px',
                    borderRadius: 999,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: on ? 'var(--pl-ink, #0E0D0B)' : 'var(--pl-divider, #D8CFB8)',
                    background: on ? 'var(--pl-ink, #0E0D0B)' : 'var(--pl-cream-card, #FBF7EE)',
                    color: on ? 'var(--pl-cream, #F5EFE2)' : 'var(--pl-ink-soft, #3A332C)',
                    cursor: 'pointer',
                    transition: 'background 180ms ease, color 180ms ease',
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid var(--pl-divider, #D8CFB8)',
              background: 'var(--pl-cream-card, #FBF7EE)',
              fontSize: 12.5,
              color: 'var(--pl-ink, #0E0D0B)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
            aria-label="Sort packs"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* GRID */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '6px 26px 60px' }}>
        <div
          style={{
            fontSize: 12.5,
            color: 'var(--pl-muted, #6F6557)',
            margin: '4px 2px 14px',
          }}
        >
          {filtered.length} {filtered.length === 1 ? 'pack' : 'packs'}
          {chip !== 'all' && chip !== 'owned'
            ? ` in ${chips.find((c) => c.id === chip)?.label ?? ''}`
            : ''}
        </div>
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'var(--pl-muted, #6F6557)',
            }}
          >
            <Pear size={44} tone="sage" shadow={false} />
            <div style={{ marginTop: 12, fontSize: 14 }}>
              Nothing yet. Begin a thread — try another search.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
              gap: 20,
            }}
          >
            {filtered.map((p, i) => (
              <PackCard
                key={p.id}
                pack={p}
                idx={i}
                owned={ownedSet.has(p.id)}
                inCart={hasItem(p.id)}
                onOpen={handleOpen}
                onAdd={handleAdd}
                onGetFree={handleGetFree}
                onApply={handleApply}
              />
            ))}
          </div>
        )}
      </main>

      {/* QuickLook + Cart overlays */}
      <QuickLookModal
        pack={look}
        ownedIds={ownedSet}
        onClose={() => setLook(null)}
        onApply={handleApply}
        onGetFree={(p) => {
          handleGetFree(p);
          setLook(null);
        }}
      />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Site-picker prompt — opens when the host taps Apply but
          owns more than one site. Pure inline overlay so we don't
          take a dep on the editor's Dialog primitive. */}
      {sitePicker && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pick a site to apply this pack to"
          onClick={() => setSitePicker(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 95,
            background: 'rgba(14,13,11,0.55)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(520px, 100%)',
              background: 'var(--pl-cream-card, #FBF7EE)',
              borderRadius: 18,
              border: '1px solid var(--pl-divider, #D8CFB8)',
              boxShadow: '0 24px 60px rgba(14,13,11,0.30)',
              padding: 26,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--lavender-ink, #6B5A8C)',
                marginBottom: 8,
              }}
            >
              Pick a site
            </div>
            <h2
              style={{
                fontFamily: 'var(--pl-font-display, "Fraunces"), Georgia, serif',
                fontSize: 24,
                fontWeight: 600,
                lineHeight: 1.15,
                margin: '0 0 6px',
              }}
            >
              Where should{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--lavender-ink, #6B5A8C)' }}>
                {sitePicker.pack.name}
              </span>{' '}
              go?
            </h2>
            <p
              style={{
                fontSize: 13,
                color: 'var(--pl-ink-soft, #3A332C)',
                lineHeight: 1.55,
                margin: '0 0 18px',
              }}
            >
              You have {sitePicker.sites.length} sites — pick the one to dress with this pack. You can change again later.
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 320,
                overflowY: 'auto',
              }}
            >
              {sitePicker.sites.map((s) => (
                <button
                  key={s.subdomain}
                  type="button"
                  onClick={() => applyToSite(s.subdomain)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '13px 16px',
                    borderRadius: 12,
                    border: '1px solid var(--pl-divider, #D8CFB8)',
                    background: 'var(--pl-cream, #F5EFE2)',
                    color: 'var(--pl-ink, #0E0D0B)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontFamily: 'var(--pl-font-display, "Fraunces"), Georgia, serif',
                        fontSize: 16,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.displayName}
                    </span>
                    <span
                      style={{
                        fontSize: 11.5,
                        color: 'var(--pl-muted, #6F6557)',
                        marginTop: 1,
                      }}
                    >
                      /{s.subdomain}
                    </span>
                  </span>
                  <Icon name="arrow-right" size={14} color="var(--pl-ink, #0E0D0B)" />
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setSitePicker(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 999,
                  background: 'transparent',
                  color: 'var(--pl-ink-soft, #3A332C)',
                  border: '1px solid var(--pl-divider, #D8CFB8)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 90,
            maxWidth: 'calc(100vw - 32px)',
            background: 'var(--pl-ink, #0E0D0B)',
            color: 'var(--pl-cream, #F5EFE2)',
            padding: '12px 20px',
            borderRadius: 999,
            fontSize: 13.5,
            fontWeight: 600,
            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Pear size={20} tone="cream" shadow={false} /> {toast.message}
        </div>
      )}
    </div>
  );
}

/**
 * Top-level export — wraps the inner store in <CartProvider> so
 * the page mount doesn't have to know about it. The provider is
 * idempotent: nesting it under an existing provider higher in
 * the tree is fine (`useCart()` would still resolve to the
 * nearest one).
 */
export function ThemeStore() {
  return (
    <CartProvider>
      <StoreFonts />
      <StoreInner />
    </CartProvider>
  );
}
