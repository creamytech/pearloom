'use client';

import React, { useState } from 'react';
import { DatePicker } from '@/components/ui/date-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, ChevronDown } from 'lucide-react';
import { LocationPinIcon } from '@/components/icons/PearloomIcons';
import { Field, lbl, inp } from './editor-utils';
import type { StoryManifest, FaqItem, TravelInfo, HotelBlock } from '@/types';
import { VenueSearch } from '@/components/venue/VenueSearch';
import type { VenuePartial } from '@/components/venue/VenueSearch';
import { SeatingCanvas } from '@/components/seating/SeatingCanvas';

export function DetailsPanel({ manifest, onChange, subdomain }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void; subdomain?: string }) {
  const logistics = manifest.logistics || {};
  const occasion = manifest.occasion || 'wedding';
  const isEvent = occasion === 'wedding' || occasion === 'engagement';
  const [openSection, setOpenSection] = useState<string | null>('couple');

  const upd = (data: Partial<typeof logistics>) =>
    onChange({ ...manifest, logistics: { ...logistics, ...data } });

  // ── FAQ helpers ──
  const faqs = manifest.faqs || [];
  const addFaq = () => {
    const newFaq: FaqItem = { id: `faq-${Date.now()}`, question: '', answer: '', order: faqs.length };
    onChange({ ...manifest, faqs: [...faqs, newFaq] });
  };
  const updFaq = (id: string, data: Partial<FaqItem>) =>
    onChange({ ...manifest, faqs: faqs.map(f => f.id === id ? { ...f, ...data } : f) });
  const delFaq = (id: string) =>
    onChange({ ...manifest, faqs: faqs.filter(f => f.id !== id) });

  // ── Registry helpers ──
  const entries = manifest.registry?.entries || [];
  const updRegistry = (patch: Partial<NonNullable<StoryManifest['registry']>>) =>
    onChange({ ...manifest, registry: { ...(manifest.registry || { enabled: true }), ...patch } });
  const addEntry = () =>
    updRegistry({ entries: [...entries, { name: '', url: '', note: '' }] });
  const updEntry = (i: number, data: { name?: string; url?: string; note?: string }) =>
    updRegistry({ entries: entries.map((e, idx) => idx === i ? { ...e, ...data } : e) });
  const delEntry = (i: number) =>
    updRegistry({ entries: entries.filter((_, idx) => idx !== i) });

  // ── Travel helpers ──
  const travel = manifest.travelInfo || { airports: [], hotels: [] };
  const updTravel = (patch: Partial<TravelInfo>) =>
    onChange({ ...manifest, travelInfo: { ...travel, ...patch } });
  const addHotel = () =>
    updTravel({ hotels: [...(travel.hotels || []), { name: '', address: '', bookingUrl: '', groupRate: '', notes: '' }] });
  const updHotel = (i: number, data: Partial<HotelBlock>) =>
    updTravel({ hotels: (travel.hotels || []).map((h, idx) => idx === i ? { ...h, ...data } : h) });
  const delHotel = (i: number) =>
    updTravel({ hotels: (travel.hotels || []).filter((_, idx) => idx !== i) });

  type SectionId = 'couple' | 'theday' | 'registry' | 'rsvp' | 'travel' | 'faq' | 'vibe' | 'seating' | 'seo' | 'protection';
  const Section = ({ id, label, children }: { id: SectionId; label: string; children: React.ReactNode }) => {
    const isOpen = openSection === id;
    return (
      <div style={{
        borderRadius: '14px', marginBottom: '4px',
        background: isOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
        border: isOpen ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
        transition: 'all 0.15s',
        position: 'relative', zIndex: isOpen ? 10 : 1,
      }}>
        <button
          onClick={() => setOpenSection(isOpen ? null : id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer',
            color: isOpen ? 'var(--pl-olive-deep)' : 'var(--pl-ink-soft)',
            borderRadius: '14px',
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em' }}>
            {label}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: 'var(--pl-muted)', display: 'flex' }}
          >
            <ChevronDown size={13} />
          </motion.div>
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key={id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Section heading divider style
  const sectionHead = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <span style={{ fontSize: '0.82rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--pl-muted, #9A9488)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.3)' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <Section id="couple" label={occasion === 'birthday' ? 'Honoree' : occasion === 'anniversary' ? 'Couple' : 'Couple'}>
        {occasion !== 'birthday' && (
          <Field label="Dress Code" value={logistics.dresscode || ''} onChange={v => upd({ dresscode: v })} placeholder="Black Tie Optional" />
        )}
        <Field
          label={occasion === 'birthday' ? 'Host Notes' : 'Couple Notes'}
          value={logistics.notes || ''}
          onChange={v => upd({ notes: v })}
          placeholder="Additional notes for guests..."
        />
      </Section>

      <Section id="theday" label={occasion === 'birthday' ? 'The Party' : occasion === 'anniversary' ? 'The Celebration' : 'The Day'}>
        <div>
          <DatePicker
            label={occasion === 'birthday' ? 'Party Date' : occasion === 'anniversary' ? 'Anniversary Date' : 'Wedding Date'}
            value={logistics.date || ''}
            onChange={(d) => upd({ date: d })}
          />
        </div>
        <Field
          label={occasion === 'birthday' ? 'Party Time' : 'Ceremony Time'}
          value={logistics.time || ''}
          onChange={v => upd({ time: v })}
          placeholder="5:00 PM"
        />
        {/* Venue search — populates name + address from Google Places */}
        <div>
          <label style={lbl}>Venue</label>
          {logistics.venue ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(163,177,138,0.1)', border: '1px solid rgba(163,177,138,0.3)', borderRadius: '8px', padding: '10px 12px' }}>
              <LocationPinIcon size={13} color="var(--pl-olive, #A3B18A)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{logistics.venue}</div>
                {logistics.venueAddress && <div style={{ fontSize: '0.75rem', color: 'var(--pl-ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{logistics.venueAddress}</div>}
              </div>
              <button
                onClick={() => upd({ venue: '', venueAddress: '', venuePlaceId: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', padding: '2px', flexShrink: 0, display: 'flex' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <VenueSearch
              placeholder="Search for a venue..."
              onSelect={(venue: VenuePartial) => upd({ venue: venue.name || '', venueAddress: venue.address || '', venuePlaceId: venue.placeId || '' })}
              onAddManually={() => upd({ venue: 'My Venue' })}
              darkMode
            />
          )}
        </div>
      </Section>

      <Section id="registry" label="Registry">
        {/* Registry enabled toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--pl-ink)', fontWeight: 600 }}>Registry enabled</span>
          <button
            onClick={() => updRegistry({ enabled: !manifest.registry?.enabled })}
            style={{
              width: '36px', height: '20px', borderRadius: '100px', flexShrink: 0,
              background: manifest.registry?.enabled !== false ? 'var(--pl-olive, #A3B18A)' : 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: '2px', left: manifest.registry?.enabled !== false ? '18px' : '2px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s', display: 'block',
            }} />
          </button>
        </div>
        <Field label="Cash Fund URL" value={manifest.registry?.cashFundUrl || ''} onChange={v => updRegistry({ cashFundUrl: v })} placeholder="https://hitchd.com/..." />
        <Field label="Cash Fund Message" value={manifest.registry?.cashFundMessage || ''} onChange={v => updRegistry({ cashFundMessage: v })} placeholder="We are saving for our honeymoon!" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
          <label style={{ ...lbl, margin: 0 }}>Registry Links ({entries.length})</label>
          <button onClick={addEntry} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '5px', border: 'none', background: 'rgba(163,177,138,0.18)', color: 'var(--pl-olive, #A3B18A)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
            <Plus size={10} /> Add Registry
          </button>
        </div>
        {entries.map((entry, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--pl-olive, #A3B18A)' }}>Registry {i + 1}</span>
              <button onClick={() => delEntry(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', padding: '2px' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}>
                <Trash2 size={11} />
              </button>
            </div>
            <Field label="Store Name" value={entry.name} onChange={v => updEntry(i, { name: v })} placeholder="Williams Sonoma" />
            <Field label="Registry URL" value={entry.url} onChange={v => updEntry(i, { url: v })} placeholder="https://..." />
            <Field label="Note (optional)" value={entry.note || ''} onChange={v => updEntry(i, { note: v })} placeholder="Our kitchen wishlist" />
          </div>
        ))}
        {entries.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--pl-muted)', textAlign: 'center', padding: '0.5rem 0' }}>No registries yet</p>}
      </Section>

      <Section id="rsvp" label="RSVP">
        <div>
          <DatePicker
            label="RSVP Deadline"
            value={logistics.rsvpDeadline || ''}
            onChange={(d) => upd({ rsvpDeadline: d })}
          />
        </div>
      </Section>

      <Section id="travel" label="Travel & Hotels">
        <div>
          <label style={lbl}>Airports (one per line)</label>
          <textarea
            value={(travel.airports || []).join('\n')}
            onChange={e => updTravel({ airports: e.target.value.split('\n').filter(Boolean) })}
            rows={2} placeholder="JFK, LGA, EWR"
            style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }}
          />
        </div>
        <div>
          <label style={lbl}>Parking / Directions</label>
          <textarea value={travel.parkingInfo || ''} onChange={e => updTravel({ parkingInfo: e.target.value })} rows={2}
            placeholder="Valet parking available at the venue…" style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
        </div>
        <div>
          <label style={lbl}>Directions</label>
          <textarea value={travel.directions || ''} onChange={e => updTravel({ directions: e.target.value })} rows={2}
            placeholder="Take exit 14B off I-95…" style={{ ...inp, resize: 'vertical', lineHeight: 1.5 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <label style={{ ...lbl, margin: 0 }}>Hotels ({(travel.hotels || []).length})</label>
          <button onClick={addHotel} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '5px', border: 'none', background: 'rgba(163,177,138,0.18)', color: 'var(--pl-olive, #A3B18A)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
            <Plus size={10} /> Add Hotel
          </button>
        </div>
        {(travel.hotels || []).map((hotel, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--pl-olive, #A3B18A)' }}>Hotel {i + 1}</span>
              <button onClick={() => delHotel(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', padding: '2px' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}>
                <Trash2 size={11} />
              </button>
            </div>
            <Field label="Hotel Name" value={hotel.name} onChange={v => updHotel(i, { name: v })} placeholder="Marriott Newport" />
            <Field label="Address" value={hotel.address} onChange={v => updHotel(i, { address: v })} placeholder="123 Main St" />
            <Field label="Booking URL" value={hotel.bookingUrl || ''} onChange={v => updHotel(i, { bookingUrl: v })} placeholder="https://marriott.com/..." />
            <Field label="Group Rate" value={hotel.groupRate || ''} onChange={v => updHotel(i, { groupRate: v })} placeholder="$189/night" />
            <Field label="Notes" value={hotel.notes || ''} onChange={v => updHotel(i, { notes: v })} placeholder="Mention the wedding block…" />
          </div>
        ))}
      </Section>

      <Section id="faq" label="FAQ">
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={addFaq} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '5px', border: 'none', background: 'rgba(163,177,138,0.18)', color: 'var(--pl-olive, #A3B18A)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>
            <Plus size={10} /> Add Question
          </button>
        </div>
        {faqs.map(faq => (
          <div key={faq.id} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', border: '1px solid rgba(255,255,255,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => delFaq(faq.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-muted)', display: 'flex', padding: '2px' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = 'var(--pl-muted)'; }}>
                <Trash2 size={11} />
              </button>
            </div>
            <Field label="Question" value={faq.question} onChange={v => updFaq(faq.id, { question: v })} placeholder="Is the venue wheelchair accessible?" />
            <Field label="Answer" value={faq.answer} onChange={v => updFaq(faq.id, { answer: v })} rows={2} placeholder="Yes, the venue has full accessibility…" />
          </div>
        ))}
        {faqs.length === 0 && <p style={{ fontSize: '0.82rem', color: 'var(--pl-muted)', textAlign: 'center', padding: '1rem 0' }}>No FAQs yet — add common guest questions</p>}
      </Section>

      <Section id="vibe" label="Site Vibe">
        <div>
          <label style={lbl}>Vibe String</label>
          <textarea
            value={manifest.vibeString || ''}
            onChange={e => onChange({ ...manifest, vibeString: e.target.value })}
            rows={3}
            placeholder="intimate, golden hour, wildflower meadow..."
            style={{ ...inp, resize: 'vertical', lineHeight: 1.65 }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(163,177,138,0.6)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
          />
          <div style={{ fontSize: '0.82rem', color: 'var(--pl-muted)', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Used by the AI when rewriting chapters and generating art.
          </div>
        </div>

        {/* ── Site Features ── */}
        <div style={{ marginTop: '0.5rem' }}>
          {/* Guestbook toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Guest Wishes Wall</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '2px' }}>Let guests leave messages on your site</div>
            </div>
            <button
              onClick={() => onChange({
                ...manifest,
                features: { ...manifest.features, guestbook: !(manifest.features?.guestbook ?? true) }
              })}
              style={{
                width: '40px', height: '22px', borderRadius: '11px',
                background: (manifest.features?.guestbook ?? true) ? 'var(--pl-olive, #A3B18A)' : 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: '3px',
                left: (manifest.features?.guestbook ?? true) ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                display: 'block',
              }} />
            </button>
          </div>

          {/* Live Updates toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Live Updates Feed</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '2px' }}>Enable live updates feed for day-of announcements</div>
            </div>
            <button
              onClick={() => onChange({
                ...manifest,
                features: { ...manifest.features, liveUpdates: !(manifest.features?.liveUpdates ?? true) }
              })}
              style={{
                width: '40px', height: '22px', borderRadius: '11px',
                background: (manifest.features?.liveUpdates ?? true) ? 'var(--pl-olive, #A3B18A)' : 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: '3px',
                left: (manifest.features?.liveUpdates ?? true) ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                display: 'block',
              }} />
            </button>
          </div>

          {/* Photo Wall toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Guest Photo Wall</div>
              <div style={{ fontSize: '0.72rem', opacity: 0.5, marginTop: '2px' }}>Let guests upload photos from the celebration</div>
            </div>
            <button
              onClick={() => onChange({
                ...manifest,
                features: { ...manifest.features, photoWall: !(manifest.features?.photoWall ?? false) }
              })}
              style={{
                width: '40px', height: '22px', borderRadius: '11px',
                background: (manifest.features?.photoWall ?? false) ? 'var(--pl-olive, #A3B18A)' : 'rgba(255,255,255,0.2)',
                border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: '3px',
                left: (manifest.features?.photoWall ?? false) ? '21px' : '3px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#fff', transition: 'left 0.2s',
                display: 'block',
              }} />
            </button>
          </div>
        </div>
      </Section>

      {/* Seating chart — weddings + engagements only */}
      {isEvent && (
        <Section id="seating" label="Seating Chart">
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', lineHeight: 1.5 }}>
            Drag guests to tables. Add constraints like &quot;keep together&quot; or &quot;near the exit&quot;.
          </div>
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
            <SeatingCanvas siteId={subdomain || manifest.coupleId || 'draft'} />
          </div>
        </Section>
      )}

      {/* Export Program — shown when there are events or a wedding date */}
      {(manifest.events && manifest.events.length > 0 || manifest.logistics?.date) && subdomain && (
        <div style={{ padding: '12px 4px 4px' }}>
          {sectionHead('Export')}
          <button
            onClick={() => window.open(`/api/export-program?subdomain=${encodeURIComponent(subdomain)}`, '_blank')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(163,177,138,0.35)',
              background: 'rgba(163,177,138,0.1)',
              color: 'var(--pl-olive, #A3B18A)',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              transition: 'background 0.18s',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.2)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(163,177,138,0.1)'; }}
          >
            Export Program
          </button>
        </div>
      )}
      {/* ── SEO & Sharing ── */}
      <Section id="seo" label="SEO & Sharing">
        <Field
          label="Page Title"
          value={manifest.seoTitle || ''}
          onChange={v => onChange({ ...manifest, seoTitle: v })}
          placeholder={`${manifest.chapters?.[0]?.title || 'Our Celebration'} — Pearloom`}
        />
        <Field
          label="Meta Description"
          value={manifest.seoDescription || ''}
          onChange={v => onChange({ ...manifest, seoDescription: v })}
          placeholder="A celebration site crafted with love..."
        />
        <Field
          label="OG Image URL"
          value={manifest.ogImage || ''}
          onChange={v => onChange({ ...manifest, ogImage: v })}
          placeholder="https://... (shown when shared on social)"
        />
      </Section>

      {/* ── Site Protection ── */}
      <Section id="protection" label="Access & Protection">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--pl-ink-soft)' }}>Coming Soon Mode</span>
            <input
              type="checkbox"
              checked={manifest.comingSoon?.enabled || false}
              onChange={e => onChange({ ...manifest, comingSoon: { ...(manifest.comingSoon || {}), enabled: e.target.checked } })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--pl-olive)' }}
            />
          </label>
          <p style={{ fontSize: '0.7rem', color: 'var(--pl-muted)', margin: 0, lineHeight: 1.5 }}>
            Shows a teaser page to visitors instead of the full site.
          </p>
          {manifest.comingSoon?.enabled && (
            <Field
              label="Coming Soon Message"
              value={manifest.comingSoon?.message || ''}
              onChange={v => onChange({ ...manifest, comingSoon: { ...(manifest.comingSoon || {}), enabled: true, message: v } })}
              placeholder="Our site is coming soon..."
            />
          )}

          <Field
            label="Site Password (optional)"
            value={manifest.sitePassword || ''}
            onChange={v => onChange({ ...manifest, sitePassword: v })}
            placeholder="Leave blank for public access"
          />
          {manifest.sitePassword && (
            <p style={{ fontSize: '0.68rem', color: 'var(--pl-olive)', margin: 0 }}>
              ✦ Visitors will need to enter this password to view your site
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
