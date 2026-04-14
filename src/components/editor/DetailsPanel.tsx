'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor } from '@/lib/editor-state';
import { DatePicker } from '@/components/ui/date-picker';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, ChevronDown, Sparkles, MapPin, Check, UtensilsCrossed, Link, Loader2 } from 'lucide-react';
import { LocationPinIcon } from '@/components/icons/PearloomIcons';
import { Field, lbl, inp } from './editor-utils';
import { panelText, panelWeight, panelTracking, panelLineHeight } from './panel';
import type { StoryManifest, FaqItem, TravelInfo, HotelBlock, MealOption } from '@/types';
import { VenueSearch } from '@/components/venue/VenueSearch';
import type { VenuePartial } from '@/components/venue/VenueSearch';
import { SeatingCanvas } from '@/components/seating/SeatingCanvas';
import { HotelFinderPanel } from './HotelFinderPanel';
import { RsvpInsights } from '@/components/rsvp-insights';

// ── Confirm-on-click delete button ───────────────────────────
// First click shows "Sure?", reverts after 3s without second click
function ConfirmDeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleClick = () => {
    if (confirming) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setConfirming(false);
      onConfirm();
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
    }
  };

  return (
    <button
      onClick={handleClick}
      style={{
        background: confirming ? '#ef4444' : 'none',
        border: 'none',
        cursor: 'pointer',
        color: confirming ? '#fff' : '#71717A',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: confirming ? '3px 8px' : '3px',
        borderRadius: '6px',
        fontSize: panelText.hint,
        fontWeight: confirming ? panelWeight.bold : panelWeight.medium,
        fontFamily: 'inherit',
        lineHeight: panelLineHeight.tight,
        transition: 'all 0.15s',
      }}
      onMouseOver={e => { if (!confirming) (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
      onMouseOut={e => { if (!confirming) (e.currentTarget as HTMLElement).style.color = '#71717A'; }}
    >
      {confirming ? 'Sure?' : <Trash2 size={11} />}
    </button>
  );
}

export function DetailsPanel({ manifest, onChange, subdomain }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void; subdomain?: string }) {
  const { state } = useEditor();
  const [detailsTab, setDetailsTab] = useState<'logistics' | 'guests' | 'settings'>('logistics');
  const logistics = manifest.logistics || {};
  const occasion = manifest.occasion || 'wedding';
  const isEvent = occasion === 'wedding' || occasion === 'engagement';
  // Auto-open the first section that has no data yet
  const getDefaultSection = (): string => {
    const hasEvents = (manifest.events?.length ?? 0) > 0;
    const hasRegistry = (manifest.registry?.entries?.length ?? 0) > 0 || !!manifest.registry?.cashFundUrl;
    if (!hasEvents) return 'theday';
    if (!hasRegistry) return 'registry';
    return 'couple';
  };
  const [openSection, setOpenSection] = useState<string | null>(getDefaultSection);

  // Auto-open section from contextual click + scroll-to + highlight
  useEffect(() => {
    if (state.contextSection && state.activeTab === 'details') {
      setOpenSection(state.contextSection);
      // Scroll the section into view and apply highlight pulse
      requestAnimationFrame(() => {
        const el = document.getElementById(`pe-panel-section-${state.contextSection}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('pe-panel-field-highlight');
          setTimeout(() => el.classList.remove('pe-panel-field-highlight'), 1600);
        }
      });
    }
  }, [state.contextSection, state.activeTab]);

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

  // ── AI FAQ generation ──
  const [aiFaqLoading, setAiFaqLoading] = useState(false);
  const [aiFaqError, setAiFaqError] = useState<string | null>(null);
  const generateSmartFaqs = useCallback(async () => {
    setAiFaqError(null);
    setAiFaqLoading(true);
    try {
      const res = await fetch('/api/ai-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate FAQs');
      }
      const data = await res.json();
      if (data.faqs && Array.isArray(data.faqs)) {
        const newFaqs: FaqItem[] = data.faqs.map(
          (faq: { id?: string; question: string; answer: string }, i: number) => ({
            id: faq.id || `faq-${Date.now()}-${i}`,
            question: faq.question,
            answer: faq.answer,
            order: faqs.length + i,
          })
        );
        onChange({ ...manifest, faqs: [...faqs, ...newFaqs] });
      }
    } catch (err) {
      setAiFaqError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setAiFaqLoading(false);
    }
  }, [manifest, faqs, onChange]);

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

  // ── Registry URL Import ──
  const [registryUrl, setRegistryUrl] = useState('');
  const [registryImportLoading, setRegistryImportLoading] = useState(false);
  const [registryImportResult, setRegistryImportResult] = useState<{ name: string; url: string; note: string; platform: string } | null>(null);
  const [registryImportError, setRegistryImportError] = useState('');

  const handleRegistryImport = async () => {
    if (!registryUrl.trim()) return;
    setRegistryImportLoading(true);
    setRegistryImportError('');
    setRegistryImportResult(null);
    try {
      const res = await fetch('/api/ai-registry-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: registryUrl.trim(), occasion: manifest.occasion, vibe: manifest.vibeString }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Import failed');
      }
      const data = await res.json();
      setRegistryImportResult(data.entry);
    } catch (err) {
      setRegistryImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setRegistryImportLoading(false);
    }
  };

  const handleAddImportedRegistry = () => {
    if (!registryImportResult) return;
    updRegistry({
      entries: [...entries, {
        name: registryImportResult.name,
        url: registryImportResult.url,
        note: registryImportResult.note,
      }],
    });
    setRegistryImportResult(null);
    setRegistryUrl('');
  };

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

  // ── Hotel finder panel state ──
  const [showHotelFinder, setShowHotelFinder] = useState(false);

  // ── Meal option helpers ──
  const mealOptions = manifest.mealOptions || [];
  const addMealOption = () => {
    const newMeal: MealOption = { id: `meal-${Date.now()}`, name: '', dietaryTags: [] };
    onChange({ ...manifest, mealOptions: [...mealOptions, newMeal] });
  };
  const updMealOption = (i: number, data: Partial<MealOption>) =>
    onChange({ ...manifest, mealOptions: mealOptions.map((m, idx) => idx === i ? { ...m, ...data } : m) });
  const delMealOption = (i: number) =>
    onChange({ ...manifest, mealOptions: mealOptions.filter((_, idx) => idx !== i) });

  // ── AI Meal generation ──
  const [aiMealLoading, setAiMealLoading] = useState(false);
  const [aiMealError, setAiMealError] = useState<string | null>(null);
  const [aiMealPreviews, setAiMealPreviews] = useState<Array<{ name: string; description?: string; dietaryTags: string[] }>>([]);

  const generateMenu = useCallback(async () => {
    setAiMealLoading(true);
    setAiMealError(null);
    setAiMealPreviews([]);
    try {
      const res = await fetch('/api/ai-meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generateMenu: true,
          occasion: manifest.occasion || 'wedding',
          vibe: manifest.vibeString || '',
          guestCount: undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate menu');
      }
      const data = await res.json();
      if (data.meals && Array.isArray(data.meals)) {
        setAiMealPreviews(data.meals);
      }
    } catch (err) {
      setAiMealError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setAiMealLoading(false);
    }
  }, [manifest.occasion, manifest.vibeString]);

  const acceptMealPreview = useCallback((meal: { name: string; description?: string; dietaryTags: string[] }) => {
    const validTags = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher'] as const;
    const newMeal: MealOption = {
      id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: meal.name,
      description: meal.description,
      dietaryTags: (meal.dietaryTags || []).filter((t): t is MealOption['dietaryTags'][number] =>
        validTags.includes(t as typeof validTags[number])
      ),
    };
    onChange({ ...manifest, mealOptions: [...(manifest.mealOptions || []), newMeal] });
    setAiMealPreviews(prev => prev.filter(m => m.name !== meal.name));
  }, [manifest, onChange]);

  const rejectMealPreview = useCallback((name: string) => {
    setAiMealPreviews(prev => prev.filter(m => m.name !== name));
  }, []);

  // ── Section completion checks ──
  type SectionId = 'couple' | 'theday' | 'registry' | 'rsvp' | 'travel' | 'faq' | 'vibe' | 'seating' | 'seo' | 'protection';
  const sectionFilled: Record<SectionId, boolean> = {
    couple: !!(logistics.dresscode || logistics.notes),
    theday: !!(logistics.date || logistics.venue || (manifest.events?.length ?? 0) > 0),
    registry: (manifest.registry?.entries?.length ?? 0) > 0 || !!manifest.registry?.cashFundUrl,
    rsvp: !!logistics.rsvpDeadline || (manifest.mealOptions?.length ?? 0) > 0,
    travel: (manifest.travelInfo?.airports?.length ?? 0) > 0 || (manifest.travelInfo?.hotels?.length ?? 0) > 0,
    faq: (manifest.faqs?.length ?? 0) > 0,
    vibe: !!manifest.vibeString,
    seating: false, // Seating is advanced, not required
    seo: !!(manifest.seoTitle || manifest.seoDescription),
    protection: !!(manifest.sitePassword || manifest.comingSoon?.enabled),
  };
  const filledCount = Object.values(sectionFilled).filter(Boolean).length;
  const totalSections = Object.keys(sectionFilled).length;

  const Section = ({ id, label, children }: { id: SectionId; label: string; children: React.ReactNode }) => {
    const isOpen = openSection === id;
    const isFilled = sectionFilled[id];
    return (
      <div
        id={`pe-panel-section-${id}`}
        style={{
          borderRadius: '10px', marginBottom: '4px',
          background: isOpen ? '#FAFAFA' : 'transparent',
          border: isOpen ? '1px solid #E4E4E7' : '1px solid transparent',
          transition: 'all 0.15s',
          position: 'relative', zIndex: isOpen ? 10 : 1,
        }}
      >
        <button
          onClick={() => setOpenSection(isOpen ? null : id)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px', background: 'none', border: 'none', cursor: 'pointer',
            color: isOpen ? '#3F3F46' : '#71717A',
            borderRadius: '10px',
          }}
        >
          <span style={{
            fontSize: panelText.heading,
            fontWeight: panelWeight.bold,
            letterSpacing: panelTracking.wider,
            textTransform: 'uppercase',
            fontFamily: 'inherit',
            lineHeight: panelLineHeight.tight,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            {isFilled && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#18181B', flexShrink: 0,
              }}>
                <Check size={9} color="#fff" strokeWidth={3} />
              </span>
            )}
            {label}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: '#71717A', display: 'flex' }}
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
              <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Sub-heading divider used inside long sections (e.g. Site Features)
  const sectionHead = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <span style={{
        fontSize: panelText.label,
        fontWeight: panelWeight.bold,
        letterSpacing: panelTracking.wider,
        textTransform: 'uppercase',
        color: '#71717A',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        lineHeight: panelLineHeight.tight,
      }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: '#E4E4E7' }} />
    </div>
  );

  // FIX #4: Auto-save feedback indicator
  const [showSaved, setShowSaved] = useState(false);
  const savedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevManifestRef = React.useRef(manifest);
  useEffect(() => {
    if (prevManifestRef.current !== manifest && prevManifestRef.current !== null) {
      setShowSaved(true);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setShowSaved(false), 2000);
    }
    prevManifestRef.current = manifest;
    return () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); };
  }, [manifest]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingBottom: '24px' }}>
      {/* Progress indicator */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 10px', marginBottom: '4px',
        borderRadius: '10px',
        background: '#FAFAFA',
        border: '1px solid #E4E4E7',
      }}>
        <div style={{
          flex: 1, height: '4px', borderRadius: '8px',
          background: '#E4E4E7', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '8px',
            background: '#18181B',
            width: `${Math.round((filledCount / totalSections) * 100)}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <span style={{
          fontSize: panelText.hint,
          fontWeight: panelWeight.bold,
          color: '#71717A',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          lineHeight: panelLineHeight.tight,
        }}>
          {filledCount} of {totalSections} sections filled
        </span>
      </div>
      {/* FIX #4: Auto-save indicator */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '6px 12px', margin: '0 12px 4px',
              borderRadius: '100px',
              background: '#F4F4F5',
              border: '1px solid #E4E4E7',
              fontSize: panelText.hint,
              fontWeight: panelWeight.semibold,
              fontFamily: 'inherit',
              color: '#18181B',
              lineHeight: panelLineHeight.tight,
            }}
          >
            <Check size={10} /> Changes saved
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Sub-tab switcher: Logistics / Guests / Settings ── */}
      <div style={{
        display: 'flex', gap: '6px',
        padding: '0 8px 10px',
        borderBottom: '1px solid #E4E4E7',
        marginBottom: '8px',
      }}>
        {(['logistics', 'guests', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setDetailsTab(tab)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: '8px',
              border: detailsTab === tab ? '1px solid #18181B' : '1px solid #E4E4E7',
              background: detailsTab === tab ? '#18181B' : '#FFFFFF',
              color: detailsTab === tab ? '#FFFFFF' : '#71717A',
              fontSize: panelText.chip,
              fontWeight: panelWeight.semibold,
              fontFamily: 'inherit',
              cursor: 'pointer',
              lineHeight: panelLineHeight.tight,
              transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'logistics' ? 'Logistics' : tab === 'guests' ? 'Guests' : 'Settings'}
          </button>
        ))}
      </div>

      {/* ═══ Logistics tier ═══ */}
      {detailsTab === 'logistics' && <>
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
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: '#F4F4F5',
              border: '1px solid #E4E4E7',
              borderRadius: '10px',
              padding: '12px',
            }}>
              <LocationPinIcon size={14} color="#18181B" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: panelText.itemTitle,
                  fontWeight: panelWeight.bold,
                  color: '#18181B',
                  fontFamily: 'inherit',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  lineHeight: panelLineHeight.tight,
                }}>{logistics.venue}</div>
                {logistics.venueAddress && (
                  <div style={{
                    fontSize: panelText.body,
                    color: '#3F3F46',
                    fontFamily: 'inherit',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginTop: '3px',
                    lineHeight: panelLineHeight.tight,
                  }}>{logistics.venueAddress}</div>
                )}
              </div>
              <button
                onClick={() => upd({ venue: '', venueAddress: '', venuePlaceId: '' })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717A', padding: '2px', flexShrink: 0, display: 'flex' }}
                onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = '#71717A'; }}
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
          <span style={{
            fontSize: panelText.body,
            color: '#18181B',
            fontWeight: panelWeight.semibold,
            fontFamily: 'inherit',
            lineHeight: panelLineHeight.snug,
          }}>Registry enabled</span>
          <button
            onClick={() => updRegistry({ enabled: !manifest.registry?.enabled })}
            style={{
              width: '36px', height: '20px', borderRadius: '8px', flexShrink: 0,
              background: manifest.registry?.enabled !== false ? '#18181B' : '#E4E4E7',
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
        {/* ── Smart Registry Import ── */}
        <div style={{
          background: '#FAFAFA',
          borderRadius: '10px',
          padding: '12px',
          border: '1px solid #E4E4E7',
          marginTop: '4px',
        }}>
          <label style={{ ...lbl, marginBottom: '6px' }}>
            <Link size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Paste Registry URL
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              value={registryUrl}
              onChange={e => setRegistryUrl(e.target.value)}
              placeholder="https://www.zola.com/registry/..."
              style={{ ...inp, flex: 1, fontSize: 'max(16px, 0.8rem)', fontFamily: 'inherit' }}
              onKeyDown={e => { if (e.key === 'Enter') handleRegistryImport(); }}
            />
            <button
              onClick={handleRegistryImport}
              disabled={registryImportLoading || !registryUrl.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '0 12px',
                borderRadius: '8px',
                border: 'none',
                background: registryUrl.trim() ? '#18181B' : '#E4E4E7',
                color: registryUrl.trim() ? '#fff' : '#71717A',
                cursor: registryUrl.trim() && !registryImportLoading ? 'pointer' : 'default',
                fontSize: panelText.body,
                fontWeight: panelWeight.bold,
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
                transition: 'background 0.15s',
                flexShrink: 0,
                opacity: registryImportLoading ? 0.7 : 1,
              }}
            >
              {registryImportLoading ? <Loader2 size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Import'}
            </button>
          </div>
          {registryImportError && (
            <p style={{
              fontSize: panelText.hint,
              color: '#f87171',
              margin: '6px 0 0',
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.snug,
            }}>{registryImportError}</p>
          )}
          {registryImportResult && (
            <div style={{
              marginTop: '8px',
              background: '#F4F4F5',
              border: '1px solid #E4E4E7',
              borderRadius: '10px',
              padding: '12px',
            }}>
              <div style={{
                fontSize: panelText.itemTitle,
                fontWeight: panelWeight.bold,
                color: '#18181B',
                fontFamily: 'inherit',
                marginBottom: '3px',
                lineHeight: panelLineHeight.tight,
              }}>
                {registryImportResult.name}
              </div>
              <div style={{
                fontSize: panelText.hint,
                color: '#71717A',
                fontFamily: 'inherit',
                marginBottom: '3px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                lineHeight: panelLineHeight.tight,
              }}>
                {registryImportResult.url}
              </div>
              <div style={{
                fontSize: panelText.body,
                color: '#3F3F46',
                fontFamily: 'inherit',
                marginBottom: '10px',
                lineHeight: panelLineHeight.snug,
              }}>
                {registryImportResult.note}
              </div>
              <button
                onClick={handleAddImportedRegistry}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#18181B',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: panelText.body,
                  fontWeight: panelWeight.bold,
                  fontFamily: 'inherit',
                  lineHeight: panelLineHeight.tight,
                }}
              >
                <Plus size={10} /> Add to Registry
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
          <label style={{ ...lbl, margin: 0 }}>Registry Links ({entries.length})</label>
          <button onClick={addEntry} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '5px 10px', borderRadius: '8px',
            border: '1px solid #E4E4E7',
            background: '#F4F4F5', color: '#18181B',
            cursor: 'pointer',
            fontSize: panelText.body,
            fontWeight: panelWeight.bold,
            fontFamily: 'inherit',
            lineHeight: panelLineHeight.tight,
          }}>
            <Plus size={10} /> Add Registry
          </button>
        </div>
        {entries.map((entry, i) => (
          <div key={i} style={{
            background: '#FAFAFA',
            border: '1px solid #E4E4E7',
            borderRadius: '10px', padding: '12px',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: panelText.itemTitle,
                fontWeight: panelWeight.bold,
                color: '#18181B',
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
              }}>Registry {i + 1}</span>
              <ConfirmDeleteButton onConfirm={() => delEntry(i)} />
            </div>
            <Field label="Store Name" value={entry.name} onChange={v => updEntry(i, { name: v })} placeholder="Williams Sonoma" />
            <Field label="Registry URL" value={entry.url} onChange={v => updEntry(i, { url: v })} placeholder="https://..." />
            <Field label="Note (optional)" value={entry.note || ''} onChange={v => updEntry(i, { note: v })} placeholder="Our kitchen wishlist" />
          </div>
        ))}
        {entries.length === 0 && (
          <p style={{
            fontSize: panelText.body,
            color: '#71717A',
            fontFamily: 'inherit',
            textAlign: 'center',
            padding: '8px 0',
            margin: 0,
            lineHeight: panelLineHeight.snug,
          }}>No registries yet</p>
        )}
      </Section>
      </>}

      {/* ═══ Guests tier ═══ */}
      {detailsTab === 'guests' && <>
      <Section id="rsvp" label="RSVP">
        <div>
          <DatePicker
            label="RSVP Deadline"
            value={logistics.rsvpDeadline || ''}
            onChange={(d) => upd({ rsvpDeadline: d })}
          />
        </div>

        {/* ── Meal Options ── */}
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ ...lbl, margin: 0 }}>Meal Options ({mealOptions.length})</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={generateMenu}
                disabled={aiMealLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '8px', border: '1px solid #E4E4E7',
                  background: aiMealLoading ? '#FAFAFA' : '#F4F4F5',
                  color: '#18181B', cursor: aiMealLoading ? 'wait' : 'pointer',
                  fontSize: panelText.body,
                  fontWeight: panelWeight.bold,
                  fontFamily: 'inherit',
                  lineHeight: panelLineHeight.tight,
                  opacity: aiMealLoading ? 0.6 : 1,
                  transition: 'background 0.18s',
                }}
                onMouseOver={e => { if (!aiMealLoading) (e.currentTarget as HTMLElement).style.background = '#E4E4E7'; }}
                onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = aiMealLoading ? '#FAFAFA' : '#F4F4F5'; }}
              >
                <Sparkles size={10} />
                {aiMealLoading ? 'Generating...' : 'Generate Menu with AI'}
              </button>
              <button onClick={addMealOption} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 10px', borderRadius: '8px',
                border: '1px solid #E4E4E7',
                background: '#F4F4F5', color: '#18181B',
                cursor: 'pointer',
                fontSize: panelText.body,
                fontWeight: panelWeight.bold,
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
              }}>
                <Plus size={10} /> Add Meal
              </button>
            </div>
          </div>
          {aiMealError && (
            <p style={{
              fontSize: panelText.body,
              color: '#f87171',
              fontFamily: 'inherit',
              margin: '0 0 8px',
              lineHeight: panelLineHeight.snug,
            }}>
              {aiMealError}
            </p>
          )}

          {/* AI-generated meal previews — accept/reject before adding */}
          {aiMealPreviews.length > 0 && (
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{
                fontSize: panelText.label,
                fontWeight: panelWeight.bold,
                color: '#3F3F46',
                letterSpacing: panelTracking.wider,
                textTransform: 'uppercase',
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
              }}>
                AI Suggestions
              </span>
              {aiMealPreviews.map((meal, i) => (
                <div key={i} style={{
                  background: '#FAFAFA',
                  border: '1px dashed #E4E4E7',
                  borderRadius: '10px', padding: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: panelText.itemTitle,
                        fontWeight: panelWeight.bold,
                        color: '#18181B',
                        fontFamily: 'inherit',
                        marginBottom: '3px',
                        lineHeight: panelLineHeight.tight,
                      }}>
                        {meal.name}
                      </div>
                      {meal.description && (
                        <p style={{
                          fontSize: panelText.body,
                          color: '#3F3F46',
                          fontFamily: 'inherit',
                          lineHeight: panelLineHeight.snug,
                          margin: '0 0 6px',
                        }}>
                          {meal.description}
                        </p>
                      )}
                      {meal.dietaryTags?.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {meal.dietaryTags.map((tag, j) => (
                            <span key={j} style={{
                              padding: '2px 8px', borderRadius: '100px',
                              fontSize: panelText.chip,
                              fontWeight: panelWeight.semibold,
                              fontFamily: 'inherit',
                              background: '#F4F4F5',
                              color: '#3F3F46',
                              lineHeight: panelLineHeight.tight,
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        onClick={() => acceptMealPreview(meal)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '3px',
                          padding: '4px 8px', borderRadius: '6px', border: 'none',
                          background: '#18181B', color: '#fff',
                          fontSize: panelText.chip,
                          fontWeight: panelWeight.bold,
                          fontFamily: 'inherit',
                          lineHeight: panelLineHeight.tight,
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={10} /> Add
                      </button>
                      <button
                        onClick={() => rejectMealPreview(meal.name)}
                        style={{
                          display: 'flex', alignItems: 'center', padding: '4px 6px',
                          borderRadius: '6px', border: 'none',
                          background: 'rgba(248,113,113,0.1)', color: '#e87a7a',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Loading skeleton for meal generation */}
          {aiMealLoading && (
            <div style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  borderRadius: '12px', padding: '12px',
                  background: '#F4F4F5', border: '1px solid rgba(24,24,27,0.06)',
                  animation: 'pl-meal-pulse 1.5s ease-in-out infinite',
                  animationDelay: `${i * 0.12}s`,
                }}>
                  <div style={{ width: '60%', height: '14px', borderRadius: '6px', background: 'rgba(0,0,0,0.06)', marginBottom: '6px' }} />
                  <div style={{ width: '85%', height: '10px', borderRadius: '12px', background: 'rgba(0,0,0,0.04)' }} />
                </div>
              ))}
              <style>{`@keyframes pl-meal-pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
            </div>
          )}

          {/* Existing meal option cards */}
          {mealOptions.map((meal, i) => (
            <div key={meal.id} style={{
              background: '#FAFAFA',
              border: '1px solid #E4E4E7',
              borderRadius: '10px', padding: '12px',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: panelText.itemTitle,
                  fontWeight: panelWeight.bold,
                  color: '#18181B',
                  fontFamily: 'inherit',
                  lineHeight: panelLineHeight.tight,
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}>
                  <UtensilsCrossed size={12} />
                  Meal {i + 1}
                </span>
                <ConfirmDeleteButton onConfirm={() => delMealOption(i)} />
              </div>
              <Field label="Meal Name" value={meal.name} onChange={v => updMealOption(i, { name: v })} placeholder="Herb-Crusted Chicken" />
              <Field label="Description" value={meal.description || ''} onChange={v => updMealOption(i, { description: v })} placeholder="A tender chicken breast with golden herb crust..." rows={2} />
              <div>
                <label style={lbl}>Dietary Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher'] as const).map(tag => {
                    const active = meal.dietaryTags?.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => {
                          const tags = active
                            ? (meal.dietaryTags || []).filter(t => t !== tag)
                            : [...(meal.dietaryTags || []), tag];
                          updMealOption(i, { dietaryTags: tags });
                        }}
                        style={{
                          padding: '4px 10px', borderRadius: '100px',
                          fontSize: panelText.chip,
                          fontWeight: active ? panelWeight.bold : panelWeight.semibold,
                          fontFamily: 'inherit',
                          lineHeight: panelLineHeight.tight,
                          border: active ? '2px solid #18181B' : '1px solid #E4E4E7',
                          background: active ? '#F4F4F5' : '#FFFFFF',
                          color: active ? '#18181B' : '#71717A',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          {mealOptions.length === 0 && aiMealPreviews.length === 0 && !aiMealLoading && (
            <p style={{
              fontSize: panelText.body,
              color: '#71717A',
              fontFamily: 'inherit',
              textAlign: 'center',
              padding: '8px 0',
              margin: 0,
              lineHeight: panelLineHeight.snug,
            }}>
              No meal options yet — add them manually or generate with AI
            </p>
          )}
        </div>

        {/* ── RSVP Intelligence Dashboard ── */}
        {manifest.rsvps && manifest.rsvps.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{
                fontSize: panelText.label,
                fontWeight: panelWeight.bold,
                letterSpacing: panelTracking.wider,
                textTransform: 'uppercase',
                color: '#71717A',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                lineHeight: panelLineHeight.tight,
              }}>Attendance Insights</span>
              <div style={{ flex: 1, height: '1px', background: '#E4E4E7' }} />
            </div>
            <RsvpInsights
              rsvps={manifest.rsvps}
              totalInvited={manifest.rsvps.length}
              events={manifest.events || []}
              coupleNames={manifest.chapters?.[0]?.title}
              eventDate={logistics.date}
              occasion={occasion}
            />
          </div>
        )}
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
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setShowHotelFinder(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '5px 10px',
                borderRadius: '8px', border: '1px solid #E4E4E7',
                background: '#F4F4F5', color: '#18181B',
                cursor: 'pointer',
                fontSize: panelText.body,
                fontWeight: panelWeight.bold,
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
                transition: 'background 0.18s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#E4E4E7'; }}
              onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = '#F4F4F5'; }}
            >
              <MapPin size={10} /> Find Hotels Near Venue
            </button>
            <button onClick={addHotel} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px', borderRadius: '8px',
              border: '1px solid #E4E4E7',
              background: '#F4F4F5', color: '#18181B',
              cursor: 'pointer',
              fontSize: panelText.body,
              fontWeight: panelWeight.bold,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
            }}>
              <Plus size={10} /> Add Hotel
            </button>
          </div>
        </div>
        {(travel.hotels || []).map((hotel, i) => (
          <div key={i} style={{
            background: '#FAFAFA',
            border: '1px solid #E4E4E7',
            borderRadius: '10px', padding: '12px',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: panelText.itemTitle,
                fontWeight: panelWeight.bold,
                color: '#18181B',
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
              }}>Hotel {i + 1}</span>
              <ConfirmDeleteButton onConfirm={() => delHotel(i)} />
            </div>
            <Field label="Hotel Name" value={hotel.name} onChange={v => updHotel(i, { name: v })} placeholder="Marriott Newport" />
            <Field label="Address" value={hotel.address} onChange={v => updHotel(i, { address: v })} placeholder="123 Main St" />
            <Field label="Booking URL" value={hotel.bookingUrl || ''} onChange={v => updHotel(i, { bookingUrl: v })} placeholder="https://marriott.com/..." />
            <Field label="Group Rate" value={hotel.groupRate || ''} onChange={v => updHotel(i, { groupRate: v })} placeholder="$189/night" />
            <Field label="Notes" value={hotel.notes || ''} onChange={v => updHotel(i, { notes: v })} placeholder="Mention the wedding block…" />
          </div>
        ))}
        {/* FIX #5: Empty state for hotels */}
        {(travel.hotels || []).length === 0 && (
          <p style={{
            fontSize: panelText.body,
            color: '#71717A',
            fontFamily: 'inherit',
            textAlign: 'center',
            padding: '8px 0',
            margin: 0,
            lineHeight: panelLineHeight.snug,
          }}>
            No hotels yet — add manually or find nearby hotels
          </p>
        )}
      </Section>

      <Section id="faq" label="FAQ">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
          {/* FIX #14: AI FAQ button with more prominent styling for discoverability */}
          <button
            onClick={generateSmartFaqs}
            disabled={aiFaqLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px',
              borderRadius: '8px',
              border: '1px solid #E4E4E7',
              background: aiFaqLoading ? '#FAFAFA' : '#F4F4F5',
              color: '#18181B', cursor: aiFaqLoading ? 'wait' : 'pointer',
              fontSize: panelText.body,
              fontWeight: panelWeight.bold,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
              opacity: aiFaqLoading ? 0.6 : 1,
              transition: 'all 0.18s',
            }}
            onMouseOver={e => { if (!aiFaqLoading) (e.currentTarget as HTMLElement).style.background = '#E4E4E7'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = aiFaqLoading ? '#FAFAFA' : '#F4F4F5'; }}
          >
            <Sparkles size={11} />
            {aiFaqLoading ? 'Pear is thinking...' : 'Ask Pear to write FAQs'}
          </button>
          <button onClick={addFaq} style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '5px 10px', borderRadius: '8px',
            border: '1px solid #E4E4E7',
            background: '#F4F4F5', color: '#18181B',
            cursor: 'pointer',
            fontSize: panelText.body,
            fontWeight: panelWeight.bold,
            fontFamily: 'inherit',
            lineHeight: panelLineHeight.tight,
          }}>
            <Plus size={10} /> Add Question
          </button>
        </div>
        {aiFaqError && (
          <p style={{
            fontSize: panelText.body,
            color: '#f87171',
            fontFamily: 'inherit',
            margin: '4px 0 0',
            lineHeight: panelLineHeight.snug,
          }}>
            {aiFaqError}
          </p>
        )}
        {faqs.map(faq => (
          <div key={faq.id} style={{
            background: '#FAFAFA',
            border: '1px solid #E4E4E7',
            borderRadius: '10px', padding: '12px',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ConfirmDeleteButton onConfirm={() => delFaq(faq.id)} />
            </div>
            <Field label="Question" value={faq.question} onChange={v => updFaq(faq.id, { question: v })} placeholder="Is the venue wheelchair accessible?" />
            <Field label="Answer" value={faq.answer} onChange={v => updFaq(faq.id, { answer: v })} rows={2} placeholder="Yes, the venue has full accessibility…" />
          </div>
        ))}
        {faqs.length === 0 && (
          <p style={{
            fontSize: panelText.body,
            color: '#71717A',
            fontFamily: 'inherit',
            textAlign: 'center',
            padding: '12px 0',
            margin: 0,
            lineHeight: panelLineHeight.snug,
          }}>No FAQs yet — add common guest questions</p>
        )}
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
            onFocus={e => { e.currentTarget.style.borderColor = '#71717A'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E4E4E7'; }}
          />
          <div style={{
            fontSize: panelText.hint,
            color: '#71717A',
            fontFamily: 'inherit',
            marginTop: '6px',
            lineHeight: panelLineHeight.normal,
          }}>
            Used by the AI when rewriting chapters and generating art.
          </div>
        </div>

        {/* ── Site Features ── */}
        <div style={{ marginTop: '0.5rem' }}>
          {/* Guestbook toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E4E4E7' }}>
            <div>
              <div style={{
                fontSize: panelText.body,
                fontWeight: panelWeight.semibold,
                color: '#18181B',
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
              }}>Guest Wishes Wall</div>
              <div style={{
                fontSize: panelText.hint,
                color: '#71717A',
                fontFamily: 'inherit',
                marginTop: '3px',
                lineHeight: panelLineHeight.snug,
              }}>Let guests leave messages on your site</div>
            </div>
            <button
              onClick={() => onChange({
                ...manifest,
                features: { ...manifest.features, guestbook: !(manifest.features?.guestbook ?? true) }
              })}
              style={{
                width: '40px', height: '22px', borderRadius: '10px',
                background: (manifest.features?.guestbook ?? true) ? '#18181B' : '#E4E4E7',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E4E4E7' }}>
            <div>
              <div style={{
                fontSize: panelText.body,
                fontWeight: panelWeight.semibold,
                color: '#18181B',
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
              }}>Live Updates Feed</div>
              <div style={{
                fontSize: panelText.hint,
                color: '#71717A',
                fontFamily: 'inherit',
                marginTop: '3px',
                lineHeight: panelLineHeight.snug,
              }}>Enable live updates feed for day-of announcements</div>
            </div>
            <button
              onClick={() => onChange({
                ...manifest,
                features: { ...manifest.features, liveUpdates: !(manifest.features?.liveUpdates ?? true) }
              })}
              style={{
                width: '40px', height: '22px', borderRadius: '10px',
                background: (manifest.features?.liveUpdates ?? true) ? '#18181B' : '#E4E4E7',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
            <div>
              <div style={{
                fontSize: panelText.body,
                fontWeight: panelWeight.semibold,
                color: '#18181B',
                fontFamily: 'inherit',
                lineHeight: panelLineHeight.tight,
              }}>Guest Photo Wall</div>
              <div style={{
                fontSize: panelText.hint,
                color: '#71717A',
                fontFamily: 'inherit',
                marginTop: '3px',
                lineHeight: panelLineHeight.snug,
              }}>Let guests upload photos from the celebration</div>
            </div>
            <button
              onClick={() => onChange({
                ...manifest,
                features: { ...manifest.features, photoWall: !(manifest.features?.photoWall ?? false) }
              })}
              style={{
                width: '40px', height: '22px', borderRadius: '10px',
                background: (manifest.features?.photoWall ?? false) ? '#18181B' : '#E4E4E7',
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
          <div style={{
            fontSize: panelText.hint,
            color: '#71717A',
            fontFamily: 'inherit',
            marginBottom: '10px',
            lineHeight: panelLineHeight.normal,
          }}>
            Drag guests to tables. Add constraints like &quot;keep together&quot; or &quot;near the exit&quot;.
          </div>
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #E4E4E7' }}>
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
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid #E4E4E7',
              background: '#F4F4F5',
              color: '#18181B',
              cursor: 'pointer',
              fontSize: panelText.body,
              fontWeight: panelWeight.bold,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
              transition: 'background 0.18s',
            }}
            onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = '#E4E4E7'; }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = '#F4F4F5'; }}
          >
            Export Program
          </button>
        </div>
      )}
      </>}

      {/* ═══ Settings tier ═══ */}
      {detailsTab === 'settings' && <>
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
            <span style={{
              fontSize: panelText.body,
              color: '#18181B',
              fontWeight: panelWeight.semibold,
              fontFamily: 'inherit',
              lineHeight: panelLineHeight.tight,
            }}>Coming Soon Mode</span>
            <input
              type="checkbox"
              checked={manifest.comingSoon?.enabled || false}
              onChange={e => onChange({ ...manifest, comingSoon: { ...(manifest.comingSoon || {}), enabled: e.target.checked } })}
              style={{ width: '18px', height: '18px', accentColor: '#18181B' }}
            />
          </label>
          <p style={{
            fontSize: panelText.hint,
            color: '#71717A',
            fontFamily: 'inherit',
            margin: 0,
            lineHeight: panelLineHeight.normal,
          }}>
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
            <p style={{
              fontSize: panelText.hint,
              color: '#18181B',
              fontFamily: 'inherit',
              margin: 0,
              lineHeight: panelLineHeight.snug,
            }}>
              ✦ Visitors will need to enter this password to view your site
            </p>
          )}
        </div>
      </Section>

      </>}

      {/* Hotel Finder overlay */}
      {showHotelFinder && (
        <HotelFinderPanel
          manifest={manifest}
          onChange={onChange}
          onClose={() => setShowHotelFinder(false)}
        />
      )}
    </div>
  );
}
