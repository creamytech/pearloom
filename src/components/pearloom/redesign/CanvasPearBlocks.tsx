'use client';

// ─────────────────────────────────────────────────────────────
// CanvasPearBlocks — the v2 editor's "Pear can populate this →
// rich, ready-to-place cards" modal (handoff-v2 site-editor/
// editor.jsx PearBlocks). Opened from a section's Content tab; Pear
// returns VISUAL suggestion cards — not just text — and each "Add"
// drops a real record into the manifest.
//
// HONESTY: the zip mocks the data (fake hotels, canned story). We do
// NOT. FAQ + Travel call the real AI routes (/api/ai-faq, /api/ai-
// hotels) grounded in the host's own manifest; Details offers Pear's
// curated, occasion-appropriate starting points (clearly suggestions
// the host accepts + edits), the same shape the zip hard-codes. No
// fabricated facts are ever written.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { Pear } from '../motifs';
import { dressCodeSuggestions } from '../editor/panels/_suggestions';
import type { OccasionKey } from '../editor/panels/_suggestions';

export type PicksKind = 'faq' | 'travel' | 'details' | 'schedule' | 'registry' | 'gallery';

const META: Record<PicksKind, { title: string; sub: string }> = {
  faq: { title: 'The questions guests ask', sub: 'Answered in your voice, from your details — keep the ones that fit.' },
  travel: { title: 'Stays near your venue', sub: 'Pear pulled these for your guests — tap Add and they drop into Travel as cards.' },
  details: { title: 'The details guests need', sub: 'Dress code, kids, gifts — common starting points for your celebration.' },
  schedule: { title: 'Your day, in moments', sub: 'A timeline Pear shaped for your celebration — Add the moments that fit.' },
  registry: { title: 'A few registry ideas', sub: 'Funds and shops that suit your celebration — Add what fits, then drop in your links.' },
  gallery: { title: 'Captions for your photos', sub: 'Pear writes a quiet line for each of your photos — Add the ones you like.' },
};

interface FaqItem { kind: 'faq'; id?: string; question: string; answer: string; category?: string }
interface HotelItem { kind: 'travel'; name: string; address?: string; distance?: string; priceTier?: string; description?: string; groupRateTip?: string; bookingUrl?: string; amenities?: string[] }
interface DetailItem { kind: 'details'; label: string; value: string }
interface ScheduleItem { kind: 'schedule'; name: string; time?: string; venue?: string; type?: string }
interface RegistryItem { kind: 'registry'; label: string; description?: string; regKind: 'fund' | 'registry' | 'link'; url?: string }
interface GalleryItem { kind: 'gallery'; index: number; photoUrl: string; caption: string }
type PickItem = FaqItem | HotelItem | DetailItem | ScheduleItem | RegistryItem | GalleryItem;

const PRICE_TIER_TO_LEVEL: Record<string, string> = { budget: '$', mid: '$$', luxury: '$$$' };

/* The schedule drafter stores `time` as an ISO datetime (or a bare
   HH:mm) which the renderer formats; the card shows the friendly form. */
function prettyTime(raw?: string): string {
  if (!raw) return '';
  const m = raw.match(/T(\d{2}):(\d{2})/) || raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return raw; // already human ("4:30 pm")
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

export function CanvasPearBlocks({
  kind,
  manifest,
  onAdd,
  onClose,
}: {
  kind: PicksKind | null;
  manifest: StoryManifest;
  /** Append the chosen suggestion to the manifest (bridge.editField). */
  onAdd: (patch: (m: StoryManifest) => StoryManifest) => void;
  onClose: () => void;
}) {
  const open = kind != null;
  const [render, setRender] = useState(open);
  const [vis, setVis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<PickItem[]>([]);
  const [added, setAdded] = useState<Record<number, boolean>>({});
  const [nonce, setNonce] = useState(0);

  // Enter / exit transition (matches the photo drawer's .26s).
  useEffect(() => {
    if (open) {
      setRender(true);
      const t = setTimeout(() => setVis(true), 20);
      return () => clearTimeout(t);
    }
    setVis(false);
    const t = setTimeout(() => setRender(false), 240);
    return () => clearTimeout(t);
  }, [open]);

  // Fetch / derive the suggestions whenever the modal opens, the kind
  // changes, or Regenerate bumps the nonce.
  useEffect(() => {
    if (!open || !kind) return;
    let cancelled = false;
    setAdded({});
    setErr(null);
    setItems([]);
    setLoading(true);
    (async () => {
      try {
        const next = await fetchSuggestions(kind, manifest);
        if (!cancelled) setItems(next);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Pear had trouble drafting that — try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // manifest is intentionally read fresh per open, not a dep — a
    // keystroke shouldn't re-fire the AI mid-review.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, nonce]);

  if (!render || !kind) return null;
  const meta = META[kind];

  const addItem = (i: number, item: PickItem) => {
    onAdd((m) => applyPick(m, item));
    setAdded((a) => ({ ...a, [i]: true }));
  };

  return (
    <div
      className="pl8"
      onClick={onClose}
      data-pl-skip
      style={{
        position: 'fixed', inset: 0, zIndex: 320, display: 'grid', placeItems: 'center', padding: 24,
        background: 'rgba(20,14,8,0.5)', WebkitBackdropFilter: 'blur(3px)', backdropFilter: 'blur(3px)',
        opacity: vis ? 1 : 0, transition: 'opacity .24s ease', pointerEvents: vis ? 'auto' : 'none',
        fontFamily: 'var(--font-ui, system-ui, sans-serif)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, maxHeight: '86vh', display: 'flex', flexDirection: 'column',
          background: 'var(--cream, #FBF7EE)', borderRadius: 16, border: '1px solid var(--line, #E2D9C3)',
          overflow: 'hidden', boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)',
          transform: vis ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.98)',
          transition: 'transform .26s cubic-bezier(.22,.61,.36,1)',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
          <Pear size={26} tone="sage" sparkle shadow={false} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="display" style={{ fontSize: 19, color: 'var(--ink)', lineHeight: 1.1 }}>{meta.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 3, lineHeight: 1.4 }}>{meta.sub}</div>
          </div>
          <button type="button" onClick={onClose} title="Close" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink-muted)', cursor: 'pointer', flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '34px 0', color: 'var(--ink-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <Pear size={30} tone="sage" sparkle shadow={false} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Pear is drafting from your details…</div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 5 }}>
                {[0, 1, 2].map((d) => (
                  <span key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--peach-ink, #8C6E3D)', animation: `pl-dot-pulse 1.4s ${d * 0.18}s ease-in-out infinite` }} />
                ))}
              </div>
            </div>
          )}

          {!loading && err && (
            <div style={{ padding: 16, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line-soft, #ECE4D2)', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              {err}
            </div>
          )}

          {!loading && !err && items.length === 0 && (
            <div style={{ padding: 16, borderRadius: 12, background: 'var(--card)', border: '1px solid var(--line-soft, #ECE4D2)', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
              Pear couldn’t find suggestions this time — try Regenerate, or add your own in the panel.
            </div>
          )}

          {!loading && !err && items.map((item, i) => (
            <PickCard key={i} item={item} added={!!added[i]} onAdd={() => addItem(i, item)} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => { if (!loading) setNonce((n) => n + 1); }}
            disabled={loading}
            style={{ fontSize: 12, color: 'var(--olive, #5C6B3F)', fontWeight: 600, background: 'transparent', border: 'none', cursor: loading ? 'wait' : 'pointer' }}
          >
            ↺ Regenerate
          </button>
          <button type="button" onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--olive, #5C6B3F)', color: 'var(--cream, #FBF7EE)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>Done</button>
        </div>
      </div>
    </div>
  );
}

function PickCard({ item, added, onAdd }: { item: PickItem; added: boolean; onAdd: () => void }) {
  const addBtn = (
    <button
      type="button"
      onClick={onAdd}
      style={{
        padding: '7px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0,
        border: '1px solid ' + (added ? 'var(--olive, #5C6B3F)' : 'var(--line, #E2D9C3)'),
        background: added ? 'var(--olive, #5C6B3F)' : 'transparent',
        color: added ? 'var(--cream, #FBF7EE)' : 'var(--olive, #5C6B3F)',
      }}
    >
      {added ? 'Added ✓' : '+ Add'}
    </button>
  );
  const base: CSSProperties = {
    borderRadius: 13, padding: 13, background: 'var(--card, #FFFDF7)',
    border: '1px solid ' + (added ? 'var(--olive, #5C6B3F)' : 'var(--line, #E2D9C3)'),
  };

  if (item.kind === 'faq') {
    return (
      <div style={base}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.35 }}>{item.question}</div>
          {addBtn}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.5, marginTop: 6 }}>{item.answer}</div>
      </div>
    );
  }

  if (item.kind === 'travel') {
    const tier = item.priceTier ? (PRICE_TIER_TO_LEVEL[item.priceTier] ?? '') : '';
    return (
      <div style={base}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
          <div className="display" style={{ fontSize: 16, color: 'var(--ink)' }}>{item.name}</div>
          {tier && <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-muted)' }}>{tier}</div>}
        </div>
        {(item.distance || item.address) && (
          <div style={{ fontSize: 11, color: 'var(--ink-muted)', margin: '2px 0 6px' }}>{[item.distance, item.address].filter(Boolean).join(' · ')}</div>
        )}
        {item.description && <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginBottom: 8 }}>{item.description}</div>}
        {item.amenities && item.amenities.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 9 }}>
            {item.amenities.slice(0, 5).map((a) => (
              <span key={a} style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--olive, #5C6B3F)', background: 'var(--cream-2, #F5EFE2)', padding: '2px 7px', borderRadius: 999 }}>{a}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{addBtn}</div>
      </div>
    );
  }

  if (item.kind === 'schedule') {
    return (
      <div style={{ ...base, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div className="display" style={{ fontSize: 15, color: 'var(--ink)' }}>
            {item.time ? `${prettyTime(item.time)} · ` : ''}{item.name}
          </div>
          {item.venue && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 1 }}>{item.venue}</div>}
        </div>
        {addBtn}
      </div>
    );
  }

  if (item.kind === 'registry') {
    const badge = item.regKind === 'fund' ? 'Fund' : item.regKind === 'registry' ? 'Registry' : 'Link';
    return (
      <div style={base}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--olive, #5C6B3F)', background: 'var(--cream-2, #F5EFE2)', padding: '2px 7px', borderRadius: 999 }}>{badge}</span>
            </div>
            <div className="display" style={{ fontSize: 16, color: 'var(--ink)', marginTop: 4 }}>{item.label}</div>
            {item.description && <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45, marginTop: 3 }}>{item.description}</div>}
          </div>
          {addBtn}
        </div>
      </div>
    );
  }

  if (item.kind === 'gallery') {
    return (
      <div style={{ ...base, display: 'flex', gap: 11, alignItems: 'center' }}>
        <img src={item.photoUrl} alt="" style={{ width: 56, height: 56, borderRadius: 9, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line, #E2D9C3)' }} />
        <div className="display" style={{ flex: 1, minWidth: 0, fontStyle: 'italic', fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.35 }}>{item.caption}</div>
        {addBtn}
      </div>
    );
  }

  // details
  return (
    <div style={{ ...base, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{item.label}</div>
        <div className="display" style={{ fontSize: 16, color: 'var(--ink)', marginTop: 2 }}>{item.value}</div>
      </div>
      {addBtn}
    </div>
  );
}

// ── Fetch / derive ──────────────────────────────────────────────

async function fetchSuggestions(kind: PicksKind, manifest: StoryManifest): Promise<PickItem[]> {
  const loose = manifest as unknown as Record<string, unknown>;
  if (kind === 'faq') {
    const r = await fetch('/api/ai-faq', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ manifest }),
    });
    if (!r.ok) throw new Error(await errorOf(r, 'Pear couldn’t draft the FAQ — try again.'));
    const d = await r.json();
    const faqs = Array.isArray(d?.faqs) ? d.faqs : [];
    return faqs
      .filter((f: { question?: string }) => !!f?.question)
      .map((f: { id?: string; question: string; answer?: string; category?: string }): FaqItem => ({
        kind: 'faq', id: f.id, question: f.question, answer: f.answer ?? '', category: f.category,
      }));
  }

  if (kind === 'travel') {
    const logistics = (loose.logistics ?? {}) as Record<string, unknown>;
    const venueAddress = typeof logistics.venueAddress === 'string' ? logistics.venueAddress : undefined;
    const venueCity = typeof logistics.venue === 'string' ? logistics.venue : undefined;
    const eventDate = typeof logistics.date === 'string' ? logistics.date : (typeof loose.eventDate === 'string' ? loose.eventDate : undefined);
    if (!venueAddress && !venueCity) {
      throw new Error('Add your venue in the Hero section first — then Pear can suggest stays near it.');
    }
    const r = await fetch('/api/ai-hotels', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ venueAddress, venueCity, eventDate }),
    });
    if (!r.ok) throw new Error(await errorOf(r, 'Pear couldn’t find stays — try again.'));
    const d = await r.json();
    const hotels = Array.isArray(d?.hotels) ? d.hotels : [];
    return hotels
      .filter((h: { name?: string }) => !!h?.name)
      .map((h: { name: string; address?: string; distance?: string; priceTier?: string; description?: string; groupRateTip?: string; bookingUrl?: string; amenities?: string[] }): HotelItem => ({
        kind: 'travel', name: h.name, address: h.address, distance: h.distance, priceTier: h.priceTier,
        description: h.description, groupRateTip: h.groupRateTip, bookingUrl: h.bookingUrl,
        amenities: Array.isArray(h.amenities) ? h.amenities : undefined,
      }));
  }

  if (kind === 'schedule') {
    // auto-draft returns the manifest with an occasion-appropriate
    // timeline drafted (template-based, honest); we surface each
    // moment as a card to Add individually.
    const r = await fetch('/api/auto-draft', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ manifest, section: 'schedule' }),
    });
    if (!r.ok) throw new Error(await errorOf(r, 'Pear couldn’t draft the timeline — try again.'));
    const d = await r.json();
    const events = Array.isArray((d?.manifest as { events?: unknown[] })?.events) ? (d.manifest.events as Array<Record<string, unknown>>) : [];
    if (events.length === 0) throw new Error('Pear needs your occasion + date set first — then it can shape a timeline.');
    return events
      .filter((ev) => typeof ev?.name === 'string')
      .map((ev): ScheduleItem => ({
        kind: 'schedule',
        name: String(ev.name),
        time: typeof ev.time === 'string' ? ev.time : undefined,
        venue: typeof ev.venue === 'string' ? ev.venue : undefined,
        type: typeof ev.type === 'string' ? ev.type : undefined,
      }));
  }

  if (kind === 'registry') {
    const names = Array.isArray(loose.names) ? (loose.names as string[]) : undefined;
    const occ = typeof loose.occasion === 'string' ? loose.occasion : undefined;
    const r = await fetch('/api/draft-registry', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names, occasion: occ }),
    });
    if (!r.ok) throw new Error(await errorOf(r, 'Pear couldn’t draft registry ideas — try again.'));
    const d = await r.json();
    const items = Array.isArray(d?.items) ? d.items : [];
    return items
      .filter((it: { label?: string }) => !!it?.label)
      .map((it: { label: string; description?: string; kind?: string; url?: string }): RegistryItem => ({
        kind: 'registry',
        label: it.label,
        description: it.description,
        regKind: (it.kind === 'fund' || it.kind === 'link' || it.kind === 'registry') ? it.kind : 'link',
        url: it.url || undefined,
      }));
  }

  if (kind === 'gallery') {
    const photos = Array.isArray(loose.galleryImages) ? (loose.galleryImages as string[]).filter(Boolean) : [];
    if (photos.length === 0) throw new Error('Add photos to your gallery first — then Pear can caption them.');
    const slice = photos.slice(0, 6);
    const results = await Promise.all(slice.map(async (photoUrl, index): Promise<GalleryItem | null> => {
      try {
        const r = await fetch('/api/pear-caption', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photoUrl }),
        });
        if (!r.ok) return null;
        const d = await r.json();
        const caption = typeof d?.caption === 'string' ? d.caption : '';
        return caption ? { kind: 'gallery', index, photoUrl, caption } : null;
      } catch { return null; }
    }));
    const items = results.filter((x): x is GalleryItem => x != null);
    if (items.length === 0) throw new Error('Pear couldn’t caption those — try again.');
    return items;
  }

  // details — Pear's curated, occasion-appropriate starting points
  // (the same non-AI defaults the zip hard-codes, surfaced as
  // suggestions the host accepts + edits).
  const occasion = (typeof loose.occasion === 'string' ? loose.occasion : 'wedding') as OccasionKey;
  const dress = dressCodeSuggestions(occasion).options[0] ?? 'Dress to celebrate';
  const cards: Array<[string, string]> = [
    ['Dress code', dress],
    ['Kids', 'Adults & kids both welcome'],
    ['Gifts', 'Your presence is the only gift we need'],
    ['Parking', 'On-site parking available'],
  ];
  return cards.map(([label, value]): DetailItem => ({ kind: 'details', label, value }));
}

async function errorOf(r: Response, fallback: string): Promise<string> {
  try {
    const j = await r.json();
    return (j as { error?: string })?.error || fallback;
  } catch {
    return fallback;
  }
}

// ── Add → manifest ──────────────────────────────────────────────

function applyPick(m: StoryManifest, item: PickItem): StoryManifest {
  const loose = m as unknown as Record<string, unknown>;
  if (item.kind === 'faq') {
    const faqs = Array.isArray(loose.faqs) ? [...(loose.faqs as unknown[])] : [];
    faqs.push({ id: item.id || `faq-${Date.now()}`, question: item.question, answer: item.answer, order: faqs.length });
    return { ...loose, faqs } as unknown as StoryManifest;
  }
  if (item.kind === 'travel') {
    const ti = (loose.travelInfo ?? {}) as Record<string, unknown>;
    const hotels = Array.isArray(ti.hotels) ? [...(ti.hotels as unknown[])] : [];
    hotels.push({
      id: `h-${Date.now()}`,
      name: item.name,
      address: item.address ?? '',
      bookingUrl: item.bookingUrl,
      groupRate: item.groupRateTip,
      distance: item.distance,
      priceLevel: item.priceTier ? PRICE_TIER_TO_LEVEL[item.priceTier] : undefined,
      description: item.description,
      amenities: item.amenities && item.amenities.length ? item.amenities.join(' · ') : undefined,
    });
    return { ...loose, travelInfo: { ...ti, hotels } } as unknown as StoryManifest;
  }
  if (item.kind === 'schedule') {
    const events = Array.isArray(loose.events) ? [...(loose.events as unknown[])] : [];
    events.push({
      id: `e-${Date.now()}-${events.length}`,
      name: item.name,
      type: item.type ?? 'other',
      date: '',
      time: item.time ?? '',
      venue: item.venue ?? '',
      address: '',
    });
    return { ...loose, events } as unknown as StoryManifest;
  }
  if (item.kind === 'registry') {
    const stores = Array.isArray(loose.registryStores) ? [...(loose.registryStores as unknown[])] : [];
    stores.push({ name: item.label, url: item.url, note: item.description });
    return { ...loose, registryStores: stores } as unknown as StoryManifest;
  }
  if (item.kind === 'gallery') {
    const captions = (loose.galleryCaptions && typeof loose.galleryCaptions === 'object')
      ? { ...(loose.galleryCaptions as Record<string, string>) }
      : {};
    captions[String(item.index)] = item.caption;
    return { ...loose, galleryCaptions: captions } as unknown as StoryManifest;
  }
  // details — append [label, value] tuple (capped at 3 like DetailsPanel)
  const cards = Array.isArray(loose.detailsCards) ? [...(loose.detailsCards as unknown[])] : [];
  if (cards.length < 3) cards.push([item.label, item.value]);
  return { ...loose, detailsCards: cards } as unknown as StoryManifest;
}
