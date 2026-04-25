'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon, Pear, Sparkle } from '../motifs';

interface Vendor {
  id: string;
  slug: string;
  name: string;
  category: string;
  region?: string | null;
  palettes?: string[];
  vibes?: string[];
  description?: string | null;
  hero_image_url?: string | null;
  website_url?: string | null;
  booking_url?: string | null;
  price_band?: string | null;
  rating?: number | null;
  review_count?: number | null;
  featured?: boolean;
}

const CATEGORIES = ['photographer', 'florist', 'caterer', 'dj', 'planner', 'venue', 'baker', 'rentals'];

export function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<{ category?: string; q?: string }>({});

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.q) params.set('q', filters.q);
    fetch(`/api/vendors/directory?${params.toString()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { vendors: [] }))
      .then((data: { vendors?: Vendor[] }) => setVendors(data.vendors ?? []))
      .catch(() => setVendors([]))
      .finally(() => setLoading(false));
  }, [filters]);

  const grouped = useMemo(() => {
    const map = new Map<string, Vendor[]>();
    for (const v of vendors) {
      if (!map.has(v.category)) map.set(v.category, []);
      map.get(v.category)!.push(v);
    }
    return map;
  }, [vendors]);

  return (
    <div className="pl8" style={{ minHeight: '100vh', background: 'var(--paper, #F5EFE2)' }}>
      <header style={{ padding: 'clamp(40px, 7vw, 80px) clamp(20px, 5vw, 56px) 28px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <Link href="/" style={{ fontFamily: 'var(--pl-font-display, Georgia, serif)', fontSize: 22, fontWeight: 600, textDecoration: 'none', color: 'var(--ink)' }}>
            <Pear size={22} tone="sage" /> Pearloom
          </Link>
          <Link href="/dashboard" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Dashboard →</Link>
        </div>
        <div
          style={{
            fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--peach-ink)',
            marginBottom: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Sparkle size={11} /> Curated · matched to your palette
        </div>
        <h1 className="display" style={{ fontSize: 'clamp(40px, 7vw, 72px)', margin: 0, lineHeight: 1.04 }}>
          The people who'll <span className="display-italic">make it real.</span>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink-soft)', maxWidth: 620, marginTop: 12, lineHeight: 1.55 }}>
          Florists, photographers, DJs, planners — every vendor here was chosen for craft. Filter by what fits your day.
        </p>

        {/* Filters */}
        <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setFilters((f) => ({ ...f, category: undefined }))}
            style={pill(!filters.category)}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setFilters((f) => ({ ...f, category: c }))} style={pill(filters.category === c)}>
              {c[0]?.toUpperCase() + c.slice(1)}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <input
              type="text"
              value={filters.q ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
              placeholder="Search vendors…"
              style={{
                padding: '8px 14px 8px 36px',
                borderRadius: 999,
                border: '1px solid var(--line)',
                background: 'var(--card)',
                fontSize: 13,
                width: 240,
              }}
            />
            <Icon name="search" size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
          </div>
        </div>
      </header>

      <main style={{ padding: '0 clamp(20px, 5vw, 56px) 80px', maxWidth: 1240, margin: '0 auto' }}>
        {loading && (
          <div style={{ padding: 80, textAlign: 'center', color: 'var(--ink-muted)' }}>
            Pear is gathering the directory…
          </div>
        )}
        {!loading && vendors.length === 0 && (
          <div
            style={{
              padding: 60,
              textAlign: 'center',
              background: 'var(--cream-2)',
              borderRadius: 18,
              color: 'var(--ink-soft)',
              fontSize: 15,
            }}
          >
            No vendors found yet — the directory is filling up. Check back soon.
          </div>
        )}
        {!loading && vendors.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
            {Array.from(grouped.entries()).map(([cat, items]) => (
              <section key={cat}>
                <h2
                  className="display"
                  style={{ fontSize: 28, margin: '0 0 14px', textTransform: 'capitalize', color: 'var(--ink)' }}
                >
                  {cat}s
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                  {items.map((v) => (
                    <VendorCard key={v.id} v={v} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function pill(active: boolean): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 999,
    border: active ? '1.5px solid var(--ink)' : '1px solid var(--line)',
    background: active ? 'var(--ink)' : 'var(--card)',
    color: active ? 'var(--cream)' : 'var(--ink)',
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    textTransform: 'capitalize',
  };
}

function VendorCard({ v }: { v: Vendor }) {
  return (
    <a
      href={v.booking_url || v.website_url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 14,
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 220ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(61,74,31,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div
        style={{
          aspectRatio: '4/3',
          background: v.hero_image_url
            ? `url(${v.hero_image_url}) center/cover`
            : `linear-gradient(135deg, var(--peach-bg), var(--sage-tint))`,
        }}
      />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{v.name}</div>
          {v.price_band && <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{v.price_band}</div>}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>
          {[v.region, v.category].filter(Boolean).join(' · ')}
        </div>
        {v.description && (
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8, lineHeight: 1.5 }}>
            {v.description.slice(0, 140)}{v.description.length > 140 ? '…' : ''}
          </div>
        )}
        {(v.rating || v.review_count) && (
          <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--ink-muted)' }}>
            {v.rating ? `★ ${v.rating}` : null}
            {v.review_count ? ` · ${v.review_count} reviews` : null}
          </div>
        )}
      </div>
    </a>
  );
}
