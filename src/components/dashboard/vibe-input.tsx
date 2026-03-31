'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/dashboard/vibe-input.tsx
// Rich "Story DNA" Wizard — captures the couple's full aesthetic
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Map, Palette, Globe, Info, ChevronDown } from 'lucide-react';
import {
  ElegantHeartIcon, MountainIcon, StarburstIcon, CoffeeCupIcon,
  SuitcaseIcon, PawIcon, MusicNoteIcon, LoomThreadIcon,
  WeddingRingsIcon, ChampagneIcon, GiftIcon, EnvelopeIcon,
} from '@/components/icons/PearloomIcons';
import { PearBackground } from '@/components/icons/PearShapes';

// Small tooltip component for Phase 2 field hints
function Tooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '0.35rem', cursor: 'pointer', verticalAlign: 'middle' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
      aria-label={text}
    >
      <Info size={13} style={{ color: 'var(--eg-muted)', flexShrink: 0 }} />
      {visible && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--eg-bg, #fff)', border: '1px solid var(--eg-gold, #DAA520)',
          borderRadius: '0.5rem', padding: '0.45rem 0.7rem', fontSize: '0.78rem',
          color: 'var(--eg-fg)', maxWidth: '240px', whiteSpace: 'normal' as 'normal',
          lineHeight: 1.4, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 50, pointerEvents: 'none',
          textTransform: 'none' as 'none', letterSpacing: 'normal', fontWeight: 400,
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

// ── Collapsible accordion for Phase 2 details ──────────────────
function AccordionSection({ title, icon, children, defaultOpen = true }: {
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{
      background: '#fff',
      borderRadius: '14px 14px 32px 32px',
      border: '1px solid rgba(0,0,0,0.06)',
      boxShadow: '0 2px 16px rgba(0,0,0,0.05), 0 8px 24px rgba(163,177,138,0.08)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Pear watermark — ghost silhouette at bottom-right */}
      <div style={{ position: 'absolute', bottom: -24, right: -16, pointerEvents: 'none', zIndex: 0 }} aria-hidden="true">
        <PearBackground color="var(--eg-accent, #A3B18A)" opacity={0.055} size={110} />
      </div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', gap: '0.75rem',
          textAlign: 'left' as const, position: 'relative', zIndex: 1,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: 'var(--eg-accent)' }}>
          {icon && <span style={{ fontSize: '1rem' }}>{icon}</span>}
          {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{ display: 'flex', flexShrink: 0, color: 'var(--eg-muted, #9A9488)' }}
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden', position: 'relative', zIndex: 1 }}
          >
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DetailsData {
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  ceremonyTime?: string;
  receptionVenue?: string;
  receptionAddress?: string;
  receptionTime?: string;
  dresscode?: string;
  officiant?: string;
  celebrationVenue?: string;
  celebrationTime?: string;
  guestNotes?: string;
  // Anniversary
  anniversaryYears?: string;
  anniversaryMilestone?: string;
  originalDate?: string;
  coupleEvolution?: string;
  // Birthday
  birthdayAge?: string;
  isSurprise?: boolean;
  birthdayPassions?: string;
  birthdayTribute?: string;
  // Engagement
  proposalStory?: string;
  proposalDate?: string;
  weddingTimeline?: string;
  ringDetails?: string;
}

interface VibeInputProps {
  onSubmit: (data: {
    names: [string, string];
    vibeString: string;
    occasion: string;
    subdomain?: string;
    eventDate?: string;
    ceremonyVenue?: string;
    ceremonyAddress?: string;
    ceremonyTime?: string;
    receptionVenue?: string;
    receptionAddress?: string;
    receptionTime?: string;
    dresscode?: string;
    officiant?: string;
    celebrationVenue?: string;
    celebrationTime?: string;
    guestNotes?: string;
    inspirationUrls?: string[];
    layoutFormat?: string;
  }) => void;
  initialNames?: [string, string];
  initialVibe?: string;
}

function isMilestoneBirthday(age: string | number): boolean {
  return [18, 21, 30, 40, 50, 60, 70, 80].includes(Number(age));
}

function slugFromNames(n1: string, n2: string): string {
  const s1 = n1.toLowerCase().replace(/[^a-z0-9]/g, '') || 'us';
  const s2 = n2.toLowerCase().replace(/[^a-z0-9]/g, '') || 'together';
  return `${s1}-and-${s2}`;
}

const VIBE_MOODS = [
  {
    id: 'romantic', label: 'Classic Romance', icon: ElegantHeartIcon, desc: 'Timeless, elegant, deeply emotional',
    cardBg: 'linear-gradient(145deg, #FFF5F7 0%, #FFE0EA 100%)',
    activeBg: 'linear-gradient(145deg, #FFDDE6 0%, #FFC2D1 100%)',
    activeBorder: '#DB7093',
    iconColor: '#C75B7A',
    iconBg: 'rgba(219,112,147,0.14)',
    activeIconBg: 'rgba(255,255,255,0.6)',
    orb: 'rgba(219,112,147,0.18)',
  },
  {
    id: 'adventurous', label: 'Adventurous', icon: MountainIcon, desc: 'Wild, exploring the world together',
    cardBg: 'linear-gradient(145deg, #F0F7EC 0%, #DCF0CC 100%)',
    activeBg: 'linear-gradient(145deg, #D4EEC2 0%, #BFDFAA 100%)',
    activeBorder: '#5A8F3E',
    iconColor: '#3D6E2A',
    iconBg: 'rgba(90,143,62,0.14)',
    activeIconBg: 'rgba(255,255,255,0.6)',
    orb: 'rgba(90,143,62,0.18)',
  },
  {
    id: 'playful', label: 'Playful & Fun', icon: StarburstIcon, desc: 'Laughter, color, and vibrant energy',
    cardBg: 'linear-gradient(145deg, #FFF8EE 0%, #FFE5BC 100%)',
    activeBg: 'linear-gradient(145deg, #FFE0A0 0%, #FFCC70 100%)',
    activeBorder: '#D4931A',
    iconColor: '#B87C10',
    iconBg: 'rgba(212,147,26,0.14)',
    activeIconBg: 'rgba(255,255,255,0.6)',
    orb: 'rgba(255,180,50,0.18)',
  },
  {
    id: 'cozy', label: 'Cozy & Intimate', icon: CoffeeCupIcon, desc: 'Quiet mornings, warmth, and comfort',
    cardBg: 'linear-gradient(145deg, #FBF5EE 0%, #F0DEC8 100%)',
    activeBg: 'linear-gradient(145deg, #EACFAA 0%, #D4B080 100%)',
    activeBorder: '#8B5A2B',
    iconColor: '#6B3E18',
    iconBg: 'rgba(139,90,43,0.14)',
    activeIconBg: 'rgba(255,255,255,0.6)',
    orb: 'rgba(139,90,43,0.15)',
  },
  {
    id: 'wanderlust', label: 'Wanderlust', icon: SuitcaseIcon, desc: 'Travel-driven, worldly, cultured',
    cardBg: 'linear-gradient(145deg, #EEF3FF 0%, #D8E4FF 100%)',
    activeBg: 'linear-gradient(145deg, #C2D4FF 0%, #A8BEF0 100%)',
    activeBorder: '#3D5ECC',
    iconColor: '#2B4AB8',
    iconBg: 'rgba(65,105,225,0.14)',
    activeIconBg: 'rgba(255,255,255,0.6)',
    orb: 'rgba(65,105,225,0.16)',
  },
  {
    id: 'pets', label: 'Our Little Zoo', icon: PawIcon, desc: 'The fur babies are the stars',
    cardBg: 'linear-gradient(145deg, #FFF7F0 0%, #FFE4CC 100%)',
    activeBg: 'linear-gradient(145deg, #FFD4A8 0%, #FFBC78 100%)',
    activeBorder: '#C06820',
    iconColor: '#A05010',
    iconBg: 'rgba(210,105,30,0.14)',
    activeIconBg: 'rgba(255,255,255,0.6)',
    orb: 'rgba(210,105,30,0.18)',
  },
];

const OCCASIONS = [
  { id: 'wedding',     label: 'Wedding / Save the Date', desc: 'A formal RSVP or details site',               icon: WeddingRingsIcon },
  { id: 'anniversary', label: 'Anniversary',             desc: 'A celebration of years together',             icon: ChampagneIcon    },
  { id: 'engagement',  label: 'Engagement',              desc: 'Sharing the big news',                        icon: ElegantHeartIcon },
  { id: 'birthday',    label: 'Birthday Gift',           desc: 'A beautiful site as a gift — for anyone you love', icon: GiftIcon    },
  { id: 'story',       label: 'Just Because',            desc: 'Documenting our love story',                  icon: EnvelopeIcon     },
];

const COLOR_PALETTES = [
  { id: 'warm-earth',    name: 'Warm Earth',       colors: ['#8B4513', '#D2691E', '#DEB887', '#FAEBD7', '#2F1B14'] },
  { id: 'ocean-breeze',  name: 'Ocean Breeze',      colors: ['#1B4965', '#5FA8D3', '#BEE9E8', '#CAE9FF', '#0B2545'] },
  { id: 'golden-hour',   name: 'Golden Hour',       colors: ['#B8860B', '#DAA520', '#FFD700', '#FFF8DC', '#1A1A1A'] },
  { id: 'sage-garden',   name: 'Sage & Garden',     colors: ['#556B2F', '#8FBC8F', '#F5F5DC', '#FAFAF5', '#2D3B2D'] },
  { id: 'blush-rose',    name: 'Blush & Rose',      colors: ['#8B3A62', '#DB7093', '#FFB6C1', '#FFF0F5', '#4A1728'] },
  { id: 'midnight',      name: 'Midnight Elegant',  colors: ['#191970', '#4169E1', '#B0C4DE', '#F0F0FF', '#0A0A2E'] },
  { id: 'terracotta',    name: 'Terracotta',        colors: ['#A0522D', '#CD853F', '#F4A460', '#FFEFD5', '#3B1F0B'] },
  { id: 'festival',      name: 'Festival & Bold',   colors: ['#E84393', '#F8C000', '#F5841F', '#FFF5F8', '#2A2690'] },
  { id: 'dark-romance',  name: 'Dark Romance',      colors: ['#6A0F2A', '#A83050', '#D4A0A0', '#F8F0F2', '#1A0408'] },
  { id: 'celestial',     name: 'Celestial Night',   colors: ['#0D1B2A', '#1B3A6B', '#C8A0E8', '#F0EAFF', '#E8D8FF'] },
  { id: 'modern-luxe',   name: 'Modern Luxe',       colors: ['#1A1A1A', '#B8962A', '#DFC870', '#F5F2ED', '#0A0A0A'] },
  { id: 'custom',        name: 'Let AI decide',     colors: ['#888', '#aaa', '#ccc', '#eee', '#333'] },
];

const PLACES = [
  { id: 'beach', label: 'Beach / Coast', vibe: 'coastal, sandy, sun-kissed' },
  { id: 'mountains', label: 'Mountains', vibe: 'alpine, crisp, panoramic views' },
  { id: 'city', label: 'City / Urban', vibe: 'skyline, nightlife, rooftop drinks' },
  { id: 'countryside', label: 'Countryside', vibe: 'rolling fields, golden light, rustic' },
  { id: 'tropical', label: 'Tropical', vibe: 'lush, warm, paradise' },
  { id: 'europe', label: 'European', vibe: 'cobblestone, cafés, old-world charm' },
  { id: 'desert', label: 'Desert', vibe: 'vast, terracotta, sunset tones' },
  { id: 'home', label: 'Home Sweet Home', vibe: 'domestic bliss, couch cuddles, kitchen dances' },
];

const TIMELINE_FORMATS = [
  {
    id: 'cascade',
    name: 'Cascade',
    tagline: 'Classic editorial scroll',
    desc: 'Elegant vertical chapters with alternating image/text layouts. Timeless and beautiful.',
    preview: 'cascade',
  },
  {
    id: 'filmstrip',
    name: 'Film Strip',
    tagline: 'Cinematic horizontal reel',
    desc: 'A scrolling 35mm film reel. Each memory becomes a frame in your personal movie.',
    preview: 'filmstrip',
  },
  {
    id: 'scrapbook',
    name: 'Scrapbook',
    tagline: 'Polaroids & handwritten notes',
    desc: 'Photos pinned at random angles on a textured board. Tactile, warm, nostalgic.',
    preview: 'scrapbook',
  },
  {
    id: 'magazine',
    name: 'Magazine',
    tagline: 'Editorial spreads',
    desc: 'Full-bleed cover shots with bold typography. Like a fashion magazine, but yours.',
    preview: 'magazine',
  },
  {
    id: 'chapters',
    name: 'Chapters',
    tagline: 'A book coming to life',
    desc: 'Accordion-style chapters with dramatic reveals. Unfolds like the pages of your story.',
    preview: 'chapters',
  },
  {
    id: 'starmap',
    name: 'Star Map',
    tagline: 'Your story in the cosmos',
    desc: 'Chapters float as named stars on a night sky, connected by constellation lines.',
    preview: 'starmap',
  },
];

const DRESSCODE_OPTIONS = [
  'Black Tie',
  'Black Tie Optional',
  'Cocktail Attire',
  'Garden Party',
  'Semi-Formal',
  'Casual Chic',
];

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '1.25rem', borderRadius: '1rem',
  border: '2px solid var(--eg-divider, #E6DFD2)', background: '#ffffff',
  fontSize: '1.1rem', fontFamily: 'var(--eg-font-body)', color: 'var(--eg-fg)',
  outline: 'none', transition: 'border-color 0.25s, box-shadow 0.25s, transform 0.2s',
  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
};

const getFocusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = 'var(--eg-accent)';
  e.target.style.boxShadow = '0 0 0 4px rgba(163,177,138,0.15), 0 4px 16px rgba(0,0,0,0.04)';
  e.target.style.transform = 'translateY(-1px)';
};

const getBlurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = 'var(--eg-divider, #E6DFD2)';
  e.target.style.boxShadow = '0 2px 10px rgba(0,0,0,0.02)';
  e.target.style.transform = 'none';
};

const btnPrimaryStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
  padding: '1rem 2.25rem', borderRadius: '100px',
  background: 'linear-gradient(135deg, var(--eg-accent, #A3B18A) 0%, var(--eg-accent-hover, #8FA876) 100%)',
  color: '#fff', border: 'none',
  fontSize: '0.95rem', fontWeight: 600, fontFamily: 'var(--eg-font-body)',
  cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.16,1,0.3,1)',
  boxShadow: '0 8px 28px rgba(163,177,138,0.35)',
  letterSpacing: '0.01em',
};

function FormatMiniPreview({ id }: { id: string }) {
  const base: React.CSSProperties = {
    width: '100%', height: '52px', borderRadius: '6px',
    background: 'rgba(0,0,0,0.06)', overflow: 'hidden',
    marginBottom: '8px', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '4px',
  };

  if (id === 'cascade') return (
    <div style={base}>
      {[0,1,2].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: i%2===0?'row':'row-reverse', gap:'3px', position:'absolute', top: `${i*14+4}px`, left:'4px', right:'4px' }}>
          <div style={{ width:'18px', height:'10px', background:'rgba(163,177,138,0.5)', borderRadius:'2px', flexShrink:0 }} />
          <div style={{ flex:1, height:'10px', background:'rgba(0,0,0,0.08)', borderRadius:'2px' }} />
        </div>
      ))}
    </div>
  );

  if (id === 'filmstrip') return (
    <div style={{ ...base, background:'#1a1713', gap:'2px', padding:'4px' }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ width:'14px', flex:'none', height:'44px', background:'rgba(255,255,255,0.1)', borderRadius:'2px', border:'1px solid rgba(255,255,255,0.15)' }} />
      ))}
    </div>
  );

  if (id === 'scrapbook') return (
    <div style={{ ...base }}>
      {[{r:-6,x:8,y:4},{r:4,x:28,y:6},{r:-3,x:16,y:12}].map((p,i) => (
        <div key={i} style={{ position:'absolute', width:'20px', height:'24px', background:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.15)', transform:`rotate(${p.r}deg)`, left:`${p.x}%`, top:`${p.y}px`, borderRadius:'1px' }}>
          <div style={{ width:'100%', height:'14px', background:'rgba(163,177,138,0.3)', marginBottom:'2px' }} />
        </div>
      ))}
    </div>
  );

  if (id === 'magazine') return (
    <div style={{ ...base }}>
      <div style={{ width:'45%', height:'100%', background:'rgba(163,177,138,0.35)', flexShrink:0 }} />
      <div style={{ flex:1, padding:'4px 6px', display:'flex', flexDirection:'column', gap:'3px' }}>
        <div style={{ height:'6px', background:'rgba(0,0,0,0.15)', borderRadius:'2px', width:'80%' }} />
        <div style={{ height:'4px', background:'rgba(0,0,0,0.08)', borderRadius:'2px' }} />
        <div style={{ height:'4px', background:'rgba(0,0,0,0.08)', borderRadius:'2px', width:'60%' }} />
      </div>
    </div>
  );

  if (id === 'chapters') return (
    <div style={{ ...base, flexDirection:'column', gap:'3px', padding:'4px 6px', alignItems:'stretch', justifyContent:'center' }}>
      {[100,60,80].map((w,i) => (
        <div key={i} style={{ height:'8px', background: i===0?'rgba(163,177,138,0.6)':'rgba(0,0,0,0.08)', borderRadius:'3px', width:`${w}%`, transition:'width 0.3s' }} />
      ))}
    </div>
  );

  if (id === 'starmap') return (
    <div style={{ ...base, background:'#0a0e1a' }}>
      {[[20,40],[50,20],[75,35],[35,60],[60,55]].map(([x,y],i) => (
        <div key={i} style={{ position:'absolute', width:'3px', height:'3px', borderRadius:'50%', background:'rgba(200,220,255,0.8)', left:`${x}%`, top:`${y}%` }} />
      ))}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} viewBox="0 0 100 52">
        <line x1="20" y1="40" x2="50" y2="20" stroke="rgba(200,220,255,0.2)" strokeWidth="0.5" />
        <line x1="50" y1="20" x2="75" y2="35" stroke="rgba(200,220,255,0.2)" strokeWidth="0.5" />
      </svg>
    </div>
  );

  return <div style={base} />;
}

export function VibeInput({ onSubmit, initialNames }: VibeInputProps) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [step, setStep] = useState(1);
  // 'main' = steps 1-8 of the original wizard, 'details' = optional details sub-step
  const [wizardPhase, setWizardPhase] = useState<'main' | 'details'>('main');
  const [detailsData, setDetailsData] = useState<DetailsData>({});
  const [inspirationUrls, setInspirationUrls] = useState<string[]>([]);
  const [inspoKeywords, setInspoKeywords] = useState<string[]>([]);
  const [inspoKeywordInput, setInspoKeywordInput] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const subdomainDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [occasion, setOccasion] = useState<string>('');
  const [showValidation, setShowValidation] = useState(false);
  const isEvent = occasion === 'wedding' || occasion === 'engagement';
  const isBirthday = occasion === 'birthday';
  // Step 4 = Timeline Format (new), Step 5 = Inspiration, Step 6 = Color Palette, Steps 7-10 shifted +1
  // If inspiration URLs provided, Step 6 (color) is auto-skipped → AI decides colors
  const totalSteps = isEvent ? 10 : 9;

  // Step 1: Names
  const [name1, setName1] = useState(initialNames?.[0] ?? '');
  const [name2, setName2] = useState(initialNames?.[1] ?? '');
  // Step 2: Occasion (already declared above)
  // Step 3: Mood
  const [mood, setMood] = useState<string>('');
  // Step 4: Timeline Format
  const [layoutFormat, setLayoutFormat] = useState<string>('cascade');
  // Step 3: Color Palette
  const [palette, setPalette] = useState<string>('');
  // Step 4: Favorite places
  const [favPlaces, setFavPlaces] = useState<string[]>([]);
  const [customPlace, setCustomPlace] = useState('');
  // Step 5: Your Story
  const [meetCute, setMeetCute] = useState('');
  const [relationship, setRelationship] = useState('');
  // Step 7: Special details
  const [petsDetails, setPetsDetails] = useState('');
  const [musicSong, setMusicSong] = useState('');
  // Step 8: Event Details (Conditional)
  const [eventDate, setEventDate] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [rsvpDeadline, setRsvpDeadline] = useState('');
  const [cashFundUrl, setCashFundUrl] = useState('');

  // For birthday only name1 (the birthday person) is required; name2 is optional gift-giver
  const canProceedStep1 = isBirthday ? !!name1.trim() : !!(name1.trim() && name2.trim());
  const canProceedStep2 = occasion !== '';
  const canProceedStep3 = mood !== '';
  // Step 4 = Timeline Format (always has default — can change or skip)
  // Step 5 = Inspiration (always optional — can skip)
  const canProceedStep6 = palette !== '';     // Step 6 = Color Palette
  const canProceedStep7 = favPlaces.length > 0; // Step 7 = Places
  const canProceedStep8 = meetCute.trim() !== ''; // Step 8 = Story

  const hasInspirationUrls = inspirationUrls.some(u => u.trim().match(/^https?:\/\/.+/));
  const hasInspoInput = inspoKeywords.length > 0 || hasInspirationUrls;

  const INSPO_SUGGESTIONS = [
    { label: 'NYC Energy', emoji: '🗽' },
    { label: 'Knicks', emoji: '🏀' },
    { label: 'Lakers', emoji: '💜' },
    { label: 'Coco (Pixar)', emoji: '🌼' },
    { label: 'Moana', emoji: '🌊' },
    { label: 'La La Land', emoji: '🎷' },
    { label: 'Paris Café', emoji: '🥐' },
    { label: 'Tuscany', emoji: '🍷' },
    { label: 'Tokyo Neon', emoji: '🏮' },
    { label: 'Santorini', emoji: '🌅' },
    { label: 'Art Deco', emoji: '✦' },
    { label: 'Cottagecore', emoji: '🌿' },
    { label: 'Dark Academia', emoji: '📚' },
    { label: 'Coastal', emoji: '🐚' },
    { label: 'Tropical', emoji: '🌺' },
    { label: 'Golden Hour', emoji: '🌇' },
    { label: 'Boho', emoji: '🪬' },
    { label: 'Minimal', emoji: '◻' },
  ];

  // Ambient orb color for background — shifts with mood/palette selection
  const ambientOrb = useMemo(() => {
    if (step === 3 && mood) {
      return VIBE_MOODS.find(m => m.id === mood)?.orb ?? 'rgba(163,177,138,0.12)';
    }
    if (step === 6 && palette && palette !== 'custom') {
      const sel = COLOR_PALETTES.find(p => p.id === palette);
      if (sel) {
        const hex = sel.colors[0].replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r},${g},${b},0.14)`;
      }
    }
    return 'rgba(163,177,138,0.1)';
  }, [step, mood, palette]);

  const canProceedCurrentStep = () => {
    if (step === 1) return !!canProceedStep2;
    if (step === 2) return !!canProceedStep1;
    if (step === 3) return !!canProceedStep3;
    if (step === 4) return true; // timeline format — always has a default
    if (step === 5) return true; // inspiration is optional
    if (step === 6) return !!canProceedStep6;
    if (step === 7) return !!canProceedStep7;
    if (step === 8) return !!canProceedStep8;
    return true;
  };

  const handleNext = () => {
    if (!canProceedCurrentStep()) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    // If inspiration provided (keywords or images), skip color palette — AI uses the vibes
    if (step === 5 && hasInspoInput) {
      setPalette('custom');
      setStep(7);
      return;
    }
    if (step < totalSteps) setStep(step + 1);
  };
  const handleBack = () => {
    setShowValidation(false);
    // If at places (step 7) and we skipped color via inspiration/keywords, go back to step 5
    if (step === 7 && hasInspoInput) {
      setStep(5);
      return;
    }
    if (step > 1) setStep(step - 1);
  };

  const togglePlace = (id: string) => {
    setFavPlaces(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const buildVibeString = () => {
    const selectedMoodLabel = VIBE_MOODS.find(m => m.id === mood)?.label || '';
    const selectedOccasionLabel = OCCASIONS.find(o => o.id === occasion)?.label || '';
    const selectedPalette = COLOR_PALETTES.find(p => p.id === palette);
    const paletteInfo = selectedPalette && palette !== 'custom'
      ? `MANDATORY COLOR PALETTE — the couple chose "${selectedPalette.name}". You MUST use these exact hex colors as the basis for the design: ${selectedPalette.colors.join(', ')}. Do NOT substitute muted or desaturated alternatives. These colors are required.`
      : 'Let the AI choose colors that match the overall vibe.';

    const placeVibes = favPlaces.map(id => {
      const p = PLACES.find(pl => pl.id === id);
      return p ? p.vibe : id;
    });
    // Merge chip selections + custom place into one unified place line (avoid double-counting)
    const allPlaces = [...placeVibes];
    if (customPlace.trim()) allPlaces.push(customPlace.trim());
    const placeString = allPlaces.length > 0
      ? `Place aesthetics and settings: ${allPlaces.join('; ')}.`
      : '';

    // Occasion-specific context
    let occasionContext = '';
    if (occasion === 'anniversary') {
      if (detailsData.anniversaryYears) {
        occasionContext += `\nANNIVERSARY: ${detailsData.anniversaryYears} years together${detailsData.anniversaryMilestone ? `, celebrating their ${detailsData.anniversaryMilestone} anniversary` : ''}. Original date: ${detailsData.originalDate || 'cherished'}.`;
      }
      if (detailsData.coupleEvolution) occasionContext += `\nHOW THEY'VE GROWN: ${detailsData.coupleEvolution}`;
      if (detailsData.celebrationVenue) occasionContext += `\nCELEBRATION VENUE: ${detailsData.celebrationVenue}.`;
      if (detailsData.celebrationTime) occasionContext += ` Time: ${detailsData.celebrationTime}.`;
      if (detailsData.guestNotes) occasionContext += `\nNOTES FOR GUESTS: ${detailsData.guestNotes}`;
    }
    if (occasion === 'birthday') {
      if (detailsData.birthdayAge) {
        occasionContext += `\nBIRTHDAY: ${detailsData.birthdayAge}th birthday${isMilestoneBirthday(detailsData.birthdayAge) ? ' — MILESTONE YEAR' : ''}${detailsData.isSurprise ? ' — SECRET SURPRISE PARTY' : ''}.`;
      }
      if (detailsData.birthdayPassions) occasionContext += `\nTHEY LOVE: ${detailsData.birthdayPassions}`;
      if (detailsData.birthdayTribute) occasionContext += `\nWHO THEY ARE: ${detailsData.birthdayTribute}`;
      // Party logistics — inject so memory engine sees the event details
      if (detailsData.celebrationVenue) occasionContext += `\nPARTY VENUE: ${detailsData.celebrationVenue}.`;
      if (detailsData.celebrationTime) occasionContext += ` Party time: ${detailsData.celebrationTime}.`;
      if (detailsData.guestNotes) occasionContext += `\nNOTES FOR GUESTS: ${detailsData.guestNotes}`;
    }
    if (occasion === 'engagement') {
      if (detailsData.proposalStory) occasionContext += `\nTHE PROPOSAL: ${detailsData.proposalStory}`;
      if (detailsData.proposalDate) occasionContext += `\nPROPOSED ON: ${detailsData.proposalDate}`;
      if (detailsData.ringDetails) occasionContext += `\nTHE RING: ${detailsData.ringDetails}`;
      if (detailsData.weddingTimeline) occasionContext += `\nWEDDING TIMELINE: ${detailsData.weddingTimeline}`;
    }

    const birthdayCreator = name2.trim() ? `Created as a gift by ${name2.trim()}.` : '';

    const keywordDirective = inspoKeywords.length > 0
      ? `AESTHETIC REFERENCES (treat these as strong visual and cultural cues for color palette, motifs, and art direction): ${inspoKeywords.join(', ')}. For example, if "Knicks" → orange and blue with NYC energy; if "Coco" → marigolds, papel picado, warm golds and purples; if "Art Deco" → gold geometry, black, cream; if "Coastal" → sea glass greens, sandy neutrals. Translate each reference into its visual DNA.`
      : '';

    return [
      `Occasion / Project Type: This site is for a ${selectedOccasionLabel}.`,
      isBirthday
        ? `This is a BIRTHDAY TRIBUTE SITE celebrating ${name1.trim()}. Write entirely about them in a warm, celebratory tone. ${birthdayCreator}`
        : '',
      `Core Vibe: ${selectedMoodLabel}.`,
      paletteInfo,
      placeString,
      isBirthday
        ? `What makes ${name1.trim()} special: ${meetCute}.`
        : `How they met: ${meetCute}.`,
      relationship
        ? isBirthday
          ? `More about ${name1.trim()}: ${relationship}.`
          : `What makes their relationship special: ${relationship}.`
        : '',
      petsDetails ? `Important details (${isBirthday ? `${name1.trim()}'s interests/personality` : 'pets/inside jokes'}): ${petsDetails}.` : '',
      musicSong ? (isBirthday ? `${name1.trim()}'s musical taste: ${musicSong}.` : `"Their song" or musical vibe: ${musicSong}.`) : '',
      isEvent && eventDate ? `CRITICAL LOGISTICS: The event takes place on ${eventDate} at ${eventVenue || 'a beautiful venue'}. The RSVP deadline is ${rsvpDeadline || 'soon'}. Include a beautiful formal request for RSVP.` : (!isEvent && eventDate ? `Date: ${eventDate}.` : ''),
      cashFundUrl ? `REGISTRY: They have a cash fund or registry setup at ${cashFundUrl}. Note this somewhere near the bottom of the story.` : '',
      occasionContext.trim(),
      keywordDirective,
      'The generated site must feel deeply personal and emotionally resonant to the occasion.',
      'Make the colors, typography, and narrative flow from these exact feelings and aesthetics.',
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  };

  // Called from the final step — instead of generating immediately, show details sub-step
  const handleSubmit = () => {
    setWizardPhase('details');
  };

  // Called when the user clicks "Build my site" or "Skip all" from the details phase
  const handleFinalSubmit = (skipDetails = false) => {
    const synthesizedVibe = buildVibeString();
    const details = skipDetails ? {} : detailsData;
    const n1 = name1.trim();
    const n2 = name2.trim();
    const autoSlug = isBirthday
      ? `${n1.toLowerCase().replace(/[^a-z0-9]/g, '') || 'birthday'}-birthday`
      : slugFromNames(n1, n2);
    const finalSlug = subdomain.trim() || autoSlug;
    const validUrls = inspirationUrls.filter(u => u.trim().match(/^https?:\/\/.+/));
    onSubmit({
      names: [n1, n2],
      vibeString: synthesizedVibe,
      occasion,
      subdomain: finalSlug,
      eventDate: eventDate || undefined,
      inspirationUrls: validUrls.length > 0 ? validUrls : undefined,
      layoutFormat: layoutFormat || 'cascade',
      ...details,
    });
  };

  // Debounced subdomain availability check
  useEffect(() => {
    if (subdomainDebounceRef.current) clearTimeout(subdomainDebounceRef.current);
    const clean = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 60);
    if (!clean) { setSubdomainStatus('idle'); return; }
    if (clean.length < 2) { setSubdomainStatus('error'); return; }
    setSubdomainStatus('checking');
    subdomainDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sites/check-subdomain?slug=${encodeURIComponent(clean)}`);
        const data = await res.json();
        setSubdomainStatus(data.available ? 'available' : 'taken');
      } catch {
        setSubdomainStatus('idle');
      }
    }, 500);
    return () => {
      if (subdomainDebounceRef.current) clearTimeout(subdomainDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdomain]);

  const setDetail = (key: keyof DetailsData, value: string) => {
    setDetailsData(prev => ({ ...prev, [key]: value || undefined }));
  };

  const toggleDresscode = (code: string) => {
    setDetailsData(prev => ({ ...prev, dresscode: prev.dresscode === code ? undefined : code }));
  };

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 30 : -30, opacity: 0, filter: 'blur(4px)' }),
    center: { x: 0, opacity: 1, filter: 'blur(0px)' },
    exit: (direction: number) => ({ x: direction < 0 ? 30 : -30, opacity: 0, filter: 'blur(4px)' }),
  };

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.75rem 1.25rem', borderRadius: '2rem',
    border: `2px solid ${active ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)'}`,
    background: active ? 'var(--eg-accent-light)' : '#fff',
    fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    transform: active ? 'translateY(-1px)' : 'none',
    boxShadow: active ? '0 4px 12px rgba(163,177,138,0.15)' : 'none',
    color: 'var(--eg-fg)',
  });

  if (wizardPhase === 'details') {
    const detailInputStyle: React.CSSProperties = {
      width: '100%',
      padding: '0.85rem 1rem',
      border: '1px solid rgba(0,0,0,0.12)',
      borderRadius: '0.75rem',
      background: '#fff',
      fontSize: 'max(16px, 0.9rem)',
      fontFamily: 'var(--eg-font-body)',
      color: 'var(--eg-fg)',
      outline: 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
      boxSizing: 'border-box',
    };

    const pillStyle = (active: boolean): React.CSSProperties => ({
      padding: '0.55rem 1.15rem',
      borderRadius: '100px',
      border: `1.5px solid ${active ? 'var(--eg-accent)' : 'rgba(0,0,0,0.12)'}`,
      background: active ? '#556B2F' : '#FAF7F2',
      color: active ? '#fff' : 'var(--eg-fg)',
      fontSize: '0.88rem',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      whiteSpace: 'nowrap' as const,
    });

    const fieldLabel: React.CSSProperties = {
      display: 'block',
      fontSize: '0.82rem',
      fontWeight: 600,
      color: 'var(--eg-muted)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      marginBottom: '0.45rem',
    };

    const sectionHeading: React.CSSProperties = {
      fontSize: '0.78rem',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: 'var(--eg-accent)',
      marginBottom: '1rem',
    };

    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Phase indicator + nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <button
            onClick={() => setWizardPhase('main')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--eg-muted)', fontWeight: 500 }}>Step 2 of 2</span>
          <button
            onClick={() => handleFinalSubmit(true)}
            style={{ fontSize: '0.88rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: '2px' }}
          >
            Skip — add later
          </button>
        </div>

        <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '0.5rem' }}>
          A few more details
        </h2>
        <p style={{ color: 'var(--eg-muted)', fontSize: '1rem', marginBottom: '2.5rem' }}>
          All optional. Fill in what you know and leave the rest blank.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* ── WEDDING ── */}
          {occasion === 'wedding' && (
            <>
              <AccordionSection title="Ceremony" icon="💒" defaultOpen={true}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>Venue name<Tooltip text="Used to create your events page and guest directions" /></label>
                    <input
                      type="text"
                      placeholder="St. Mary's Church"
                      value={detailsData.ceremonyVenue ?? ''}
                      onChange={e => setDetail('ceremonyVenue', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Address / city</label>
                    <input
                      type="text"
                      placeholder="123 Main St, Napa, CA"
                      value={detailsData.ceremonyAddress ?? ''}
                      onChange={e => setDetail('ceremonyAddress', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Start time</label>
                    <input
                      type="text"
                      placeholder="4:00 PM"
                      value={detailsData.ceremonyTime ?? ''}
                      onChange={e => setDetail('ceremonyTime', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection title="Reception & Style" icon="🥂" defaultOpen={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>Venue name<Tooltip text="Used to create your events page and guest directions" /></label>
                    <input
                      type="text"
                      placeholder="The Vineyard Estate"
                      value={detailsData.receptionVenue ?? ''}
                      onChange={e => setDetail('receptionVenue', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Address / city</label>
                    <input
                      type="text"
                      placeholder="456 Vineyard Rd, Sonoma, CA"
                      value={detailsData.receptionAddress ?? ''}
                      onChange={e => setDetail('receptionAddress', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Start time</label>
                    <input
                      type="text"
                      placeholder="6:00 PM"
                      value={detailsData.receptionTime ?? ''}
                      onChange={e => setDetail('receptionTime', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Dress Code<Tooltip text="Displayed on your events page for guests" /> <span style={{ fontWeight: 400, fontSize: '0.75rem', textTransform: 'none', letterSpacing: 0, color: 'var(--eg-muted)' }}>(tap to select, tap again to clear)</span></label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.25rem' }}>
                      {DRESSCODE_OPTIONS.map(code => (
                        <button key={code} onClick={() => toggleDresscode(code)} style={pillStyle(detailsData.dresscode === code)}>
                          {code}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={fieldLabel}>Officiant name <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      type="text"
                      placeholder="Father Michael"
                      value={detailsData.officiant ?? ''}
                      onChange={e => setDetail('officiant', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </AccordionSection>
            </>
          )}

          {/* ── ANNIVERSARY ── */}
          {occasion === 'anniversary' && (
            <>
              <AccordionSection title="Your milestone" icon="🥂" defaultOpen={true}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>How many years together? <Tooltip text="Helps us set the right tone for your milestone" /></label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      placeholder="e.g. 10"
                      value={detailsData.anniversaryYears ?? ''}
                      onChange={e => setDetail('anniversaryYears', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                    {detailsData.anniversaryYears && [5, 10, 15, 20, 25, 30, 40, 50].includes(Number(detailsData.anniversaryYears)) && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--eg-accent)', marginTop: '0.4rem', fontWeight: 600 }}>
                        ✨ Milestone anniversary!
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={fieldLabel}>Milestone year? <Tooltip text="Helps us create a fitting visual identity" /></label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {['1st', '5th', '10th', '15th', '20th', '25th', '30th', '40th', '50th', 'Just celebrating'].map(m => (
                        <button
                          key={m}
                          onClick={() => setDetailsData(prev => ({ ...prev, anniversaryMilestone: prev.anniversaryMilestone === m ? undefined : m }))}
                          style={pillStyle(detailsData.anniversaryMilestone === m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={fieldLabel}>Original wedding / anniversary date <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      type="date"
                      value={detailsData.originalDate ?? ''}
                      onChange={e => setDetail('originalDate', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>What&apos;s something that has changed about you as a couple? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea
                      placeholder="e.g. We moved countries, had kids, survived hard times together..."
                      value={detailsData.coupleEvolution ?? ''}
                      onChange={e => setDetail('coupleEvolution', e.target.value.slice(0, 300))}
                      maxLength={300}
                      style={{ ...detailInputStyle, minHeight: '90px', resize: 'none', lineHeight: 1.5 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', marginTop: '0.3rem', textAlign: 'right' }}>{(detailsData.coupleEvolution ?? '').length}/300</p>
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection title="Celebration details" icon="📍" defaultOpen={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>Celebration venue <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      type="text"
                      placeholder="The Grand Hotel Rooftop"
                      value={detailsData.celebrationVenue ?? ''}
                      onChange={e => setDetail('celebrationVenue', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Any notes for guests <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea
                      placeholder="Parking is available on the street. Attire is cocktail casual."
                      value={detailsData.guestNotes ?? ''}
                      onChange={e => setDetail('guestNotes', e.target.value.slice(0, 200))}
                      maxLength={200}
                      style={{ ...detailInputStyle, minHeight: '90px', resize: 'none', lineHeight: 1.5 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', marginTop: '0.3rem', textAlign: 'right' }}>{(detailsData.guestNotes ?? '').length}/200</p>
                  </div>
                </div>
              </AccordionSection>
            </>
          )}

          {/* ── BIRTHDAY ── */}
          {occasion === 'birthday' && (
            <>
              <AccordionSection title="About them" icon="🎂" defaultOpen={true}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>How old are they turning? <Tooltip text="Age shapes the tone and narrative of the whole site" /></label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      placeholder="e.g. 30"
                      value={detailsData.birthdayAge ?? ''}
                      onChange={e => setDetail('birthdayAge', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                    {detailsData.birthdayAge && isMilestoneBirthday(detailsData.birthdayAge) && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--eg-accent)', marginTop: '0.4rem', fontWeight: 600 }}>
                        ✨ Milestone birthday!
                      </p>
                    )}
                  </div>
                  <div>
                    <label style={fieldLabel}>Is this a surprise?</label>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={() => setDetailsData(prev => ({ ...prev, isSurprise: true }))}
                        style={pillStyle(detailsData.isSurprise === true)}
                      >
                        🤫 Yes, keep it secret
                      </button>
                      <button
                        onClick={() => setDetailsData(prev => ({ ...prev, isSurprise: false }))}
                        style={pillStyle(detailsData.isSurprise === false)}
                      >
                        🎉 They know!
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={fieldLabel}>What are 3 things they absolutely love? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. hiking, jazz music, her dog Bruno..."
                      value={detailsData.birthdayPassions ?? ''}
                      onChange={e => setDetail('birthdayPassions', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>What do you want guests to know about them? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea
                      placeholder="A tribute sentence or two about who this person is..."
                      value={detailsData.birthdayTribute ?? ''}
                      onChange={e => setDetail('birthdayTribute', e.target.value.slice(0, 300))}
                      maxLength={300}
                      style={{ ...detailInputStyle, minHeight: '90px', resize: 'none', lineHeight: 1.5 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', marginTop: '0.3rem', textAlign: 'right' }}>{(detailsData.birthdayTribute ?? '').length}/300</p>
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection title="Event details" icon="📍" defaultOpen={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>Venue / location <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      type="text"
                      placeholder="The Rooftop Garden"
                      value={detailsData.celebrationVenue ?? ''}
                      onChange={e => setDetail('celebrationVenue', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Start time <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      type="text"
                      placeholder="7:00 PM"
                      value={detailsData.celebrationTime ?? ''}
                      onChange={e => setDetail('celebrationTime', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Notes for guests <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea
                      placeholder="Dress to impress. Valet parking available."
                      value={detailsData.guestNotes ?? ''}
                      onChange={e => setDetail('guestNotes', e.target.value.slice(0, 200))}
                      maxLength={200}
                      style={{ ...detailInputStyle, minHeight: '90px', resize: 'none', lineHeight: 1.5 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', marginTop: '0.3rem', textAlign: 'right' }}>{(detailsData.guestNotes ?? '').length}/200</p>
                  </div>
                </div>
              </AccordionSection>
            </>
          )}

          {/* ── ENGAGEMENT ── */}
          {occasion === 'engagement' && (
            <>
              <AccordionSection title="The proposal" icon="💍" defaultOpen={true}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>Tell us about the proposal 💍 <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <textarea
                      placeholder="Where were you? How did it happen? What was said?..."
                      value={detailsData.proposalStory ?? ''}
                      onChange={e => setDetail('proposalStory', e.target.value.slice(0, 500))}
                      maxLength={500}
                      style={{ ...detailInputStyle, minHeight: '110px', resize: 'none', lineHeight: 1.5 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <p style={{ fontSize: '0.78rem', color: 'var(--eg-muted)', marginTop: '0.3rem', textAlign: 'right' }}>{(detailsData.proposalStory ?? '').length}/500</p>
                  </div>
                  <div>
                    <label style={fieldLabel}>When did it happen? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      type="date"
                      value={detailsData.proposalDate ?? ''}
                      onChange={e => setDetail('proposalDate', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Ring details <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      type="text"
                      placeholder="e.g. vintage oval sapphire, her grandmother's ring..."
                      value={detailsData.ringDetails ?? ''}
                      onChange={e => setDetail('ringDetails', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection title="Looking ahead" icon="✨" defaultOpen={false}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={fieldLabel}>Wedding timeline <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <select
                      value={detailsData.weddingTimeline ?? ''}
                      onChange={e => setDetail('weddingTimeline', e.target.value)}
                      style={{ ...detailInputStyle, appearance: 'auto' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    >
                      <option value="">Not decided yet</option>
                      <option value="3months">Within 3 months</option>
                      <option value="6months">3–6 months away</option>
                      <option value="1year">About a year away</option>
                      <option value="2years">1–2 years away</option>
                      <option value="longengagement">Long engagement</option>
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabel}>Celebration venue <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      type="text"
                      placeholder="Lola's Wine Bar"
                      value={detailsData.celebrationVenue ?? ''}
                      onChange={e => setDetail('celebrationVenue', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <div>
                    <label style={fieldLabel}>Start time <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                    <input
                      type="text"
                      placeholder="7:30 PM"
                      value={detailsData.celebrationTime ?? ''}
                      onChange={e => setDetail('celebrationTime', e.target.value)}
                      style={detailInputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--eg-accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.12)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(0,0,0,0.12)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </AccordionSection>
            </>
          )}

          {/* ── STORY / JUST BECAUSE ── */}
          {occasion === 'story' && (
            <div style={{ background: '#fff', borderRadius: '14px 14px 32px 32px', padding: '2rem', border: '1px solid rgba(0,0,0,0.06)', textAlign: 'center', color: 'var(--eg-muted)', lineHeight: 1.6, position: 'relative', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.05), 0 8px 24px rgba(163,177,138,0.08)' }}>
              No extra details needed. We&apos;ll build entirely from your photos and vibe — just hit &ldquo;Build my site&rdquo; below.
            </div>
          )}
        </div>

        {/* ── AESTHETIC VIBES SUMMARY ── */}
        {hasInspoInput && (
          <div style={{ background: 'rgba(163,177,138,0.08)', borderRadius: '14px 14px 32px 32px', padding: '1rem 1.25rem', border: '1px solid rgba(163,177,138,0.2)', marginTop: '2rem', boxShadow: '0 4px 20px rgba(163,177,138,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: inspoKeywords.length > 0 ? '0.6rem' : 0 }}>
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>✨</span>
              <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--eg-accent)', margin: 0 }}>
                Aesthetic vibes locked in — AI will match these references
              </p>
            </div>
            {inspoKeywords.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', paddingLeft: '2rem' }}>
                {inspoKeywords.map(kw => (
                  <span key={kw} style={{ padding: '0.2rem 0.65rem', borderRadius: '100px', background: 'var(--eg-accent)', color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>{kw}</span>
                ))}
                {hasInspirationUrls && (
                  <span style={{ padding: '0.2rem 0.65rem', borderRadius: '100px', background: 'rgba(0,0,0,0.07)', color: 'var(--eg-muted)', fontSize: '0.78rem' }}>
                    +{inspirationUrls.filter(u => u.trim().match(/^https?:\/\/.+/)).length} image{inspirationUrls.filter(u => u.trim().match(/^https?:\/\/.+/)).length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* URL slug picker */}
        <div style={{ background: '#fff', borderRadius: '14px 14px 32px 32px', padding: '1.5rem', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 16px rgba(0,0,0,0.05), 0 8px 24px rgba(163,177,138,0.08)', marginTop: '2rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: -24, right: -16, pointerEvents: 'none', zIndex: 0 }} aria-hidden="true">
            <PearBackground color="var(--eg-accent, #A3B18A)" opacity={0.055} size={110} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={sectionHeading}><Globe size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4rem' }} />Your Site URL<Tooltip text="This becomes your site URL: yourname.pearloom.com" /></p>
          <p style={{ fontSize: '0.85rem', color: 'var(--eg-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
            This is where your site will live. You can always change it later.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid rgba(0,0,0,0.1)', borderRadius: '0.75rem', overflow: 'hidden', transition: 'border-color 0.2s', background: '#FAFAF8' }}
            onFocus={() => {}} onBlur={() => {}}>
            <input
              value={subdomain}
              onChange={e => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="ben-and-shauna"
              style={{ flex: 1, padding: '0.85rem 1rem', fontSize: 'max(16px, 0.9rem)', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--eg-font-body)', color: 'var(--eg-fg)' }}
              onFocus={e => { (e.target.parentElement as HTMLElement).style.borderColor = 'var(--eg-accent)'; }}
              onBlur={e => { (e.target.parentElement as HTMLElement).style.borderColor = 'rgba(0,0,0,0.1)'; }}
            />
            <div style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.03)', color: 'var(--eg-muted)', fontWeight: 500, borderLeft: '1px solid rgba(0,0,0,0.08)', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
              .pearloom.com
            </div>
          </div>
          {subdomain && (
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-accent)', marginTop: '0.5rem', fontWeight: 500 }}>
              {subdomain}.pearloom.com
            </p>
          )}
          {/* Availability status */}
          {subdomainStatus === 'checking' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid var(--eg-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Checking availability...
            </p>
          )}
          {subdomainStatus === 'available' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-accent)', marginTop: '0.5rem', fontWeight: 600 }}>
              ✓ Available
            </p>
          )}
          {subdomainStatus === 'taken' && (
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-plum, #7C3D73)', marginTop: '0.5rem', fontWeight: 600 }}>
              ✗ Already taken — try a different URL
            </p>
          )}
          {subdomainStatus === 'error' && subdomain.length > 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', marginTop: '0.5rem' }}>
              Enter at least 2 characters
            </p>
          )}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Build my site button */}
        <div style={{ marginTop: '2.5rem' }}>
          <button
            onClick={() => handleFinalSubmit(false)}
            disabled={subdomainStatus === 'taken' || subdomainStatus === 'checking'}
            style={{
              ...btnPrimaryStyle,
              width: '100%',
              justifyContent: 'center',
              background: (subdomainStatus === 'taken' || subdomainStatus === 'checking')
                ? 'rgba(0,0,0,0.12)'
                : 'linear-gradient(135deg, #A3B18A, #8FA876)',
              boxShadow: (subdomainStatus === 'taken' || subdomainStatus === 'checking') ? 'none' : '0 12px 36px rgba(163,177,138,0.4)',
              fontSize: '1rem',
              padding: '1.1rem 2rem',
              cursor: (subdomainStatus === 'taken' || subdomainStatus === 'checking') ? 'not-allowed' : 'pointer',
              color: (subdomainStatus === 'taken' || subdomainStatus === 'checking') ? 'var(--eg-muted)' : '#fff',
            }}
          >
            Build my site <LoomThreadIcon size={18} />
          </button>
          {subdomainStatus === 'taken' && (
            <p style={{ color: '#b91c1c', fontSize: '0.78rem', textAlign: 'center', marginTop: '0.5rem' }}>
              This URL is taken — please choose a different name above.
            </p>
          )}
          {subdomainStatus === 'checking' && (
            <p style={{ color: 'rgba(0,0,0,0.45)', fontSize: '0.78rem', textAlign: 'center', marginTop: '0.5rem' }}>
              Checking availability…
            </p>
          )}
        </div>
      </div>
    );
  }

  const STEP_NAMES: Record<number, string> = {
    1: 'Occasion',
    2: 'Names',
    3: 'Vibe',
    4: 'Layout',
    5: 'Aesthetic',
    6: 'Color Palette',
    7: 'Places',
    8: 'Your Story',
    9: 'Final Details',
    10: 'Event Details',
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', paddingBottom: '2rem', position: 'relative' }}>
      {/* ── Ambient orb — shifts with current selection ── */}
      <motion.div
        animate={{ background: `radial-gradient(ellipse 700px 500px at 50% -80px, ${ambientOrb}, transparent 70%)` }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '500px',
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      {/* ── Single unified progress system ── */}
      <div style={{ marginBottom: '2.5rem' }}>
        {/* Step label row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <motion.span
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase' as const, color: 'var(--eg-accent)',
            }}
          >
            {STEP_NAMES[step] || `Step ${step}`}
          </motion.span>
          <span style={{ fontSize: '0.72rem', color: 'var(--eg-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
            {step} <span style={{ opacity: 0.5 }}>/ {totalSteps + 1}</span>
          </span>
        </div>
        {/* Progress bar */}
        <div style={{ height: '3px', background: 'var(--eg-divider)', borderRadius: 100, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${Math.round((step / (totalSteps + 1)) * 100)}%` }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, var(--eg-accent) 0%, var(--eg-accent-hover) 100%)',
              borderRadius: 100,
              boxShadow: '0 0 8px rgba(163,177,138,0.5)',
            }}
          />
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
      <AnimatePresence mode="wait" custom={1}>
        {/* ── STEP 2: Names ── */}
        {step === 2 && (
          <motion.div key="s1" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {occasion === 'birthday'
                ? 'Who is this for?'
                : (occasion === 'wedding' || occasion === 'engagement' || occasion === 'anniversary')
                  ? 'What are your names?'
                  : 'Tell us your names'}
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              {isBirthday
                ? 'Start with the birthday star — this site is their gift.'
                : "Let's start with the most important part."}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>
                  {occasion === 'birthday'
                    ? 'Who are we celebrating?'
                    : (occasion === 'wedding' || occasion === 'engagement' || occasion === 'anniversary')
                      ? 'Partner 1'
                      : 'Your name'}
                </label>
                <input
                  type="text"
                  placeholder={isBirthday ? 'e.g. Emma' : 'e.g. Ben'}
                  value={name1}
                  onChange={e => {
                    setName1(e.target.value);
                    if (isBirthday) {
                      const slug = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') || 'birthday';
                      setSubdomain(`${slug}-birthday`);
                    } else {
                      setSubdomain(slugFromNames(e.target.value, name2));
                    }
                  }}
                  style={{ ...inputStyle, fontSize: '1.25rem', ...(showValidation && !name1.trim() ? { borderColor: 'var(--eg-plum, #6D597A)' } : {}) }}
                  onFocus={getFocusStyle} onBlur={getBlurStyle} autoFocus
                />
                {showValidation && !name1.trim() && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--eg-plum, #6D597A)', marginTop: '0.35rem' }}>This field is required</p>
                )}
              </div>

              {isBirthday ? (
                /* Birthday: gift-giver name — optional */
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>
                    Created as a gift by <span style={{ fontWeight: 400, color: 'var(--eg-muted)', opacity: 0.7 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={name2}
                    onChange={e => setName2(e.target.value)}
                    style={{ ...inputStyle, fontSize: '1.25rem' }}
                    onFocus={getFocusStyle} onBlur={getBlurStyle}
                  />
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="shimmer-text" style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', color: 'var(--eg-accent)' }}>&</span>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>
                      {(occasion === 'wedding' || occasion === 'engagement' || occasion === 'anniversary') ? 'Partner 2' : "Partner's name"}
                    </label>
                    <input type="text" placeholder="e.g. Shauna" value={name2} onChange={e => { setName2(e.target.value); setSubdomain(slugFromNames(name1, e.target.value)); }} style={{ ...inputStyle, fontSize: '1.25rem', ...(showValidation && !name2.trim() ? { borderColor: 'var(--eg-plum, #6D597A)' } : {}) }} onFocus={getFocusStyle} onBlur={getBlurStyle} />
                    {showValidation && !name2.trim() && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--eg-plum, #6D597A)', marginTop: '0.35rem' }}>This field is required</p>
                    )}
                  </div>
                </>
              )}
            </div>
            {name1.trim() && (
              <p style={{ fontSize: '0.85rem', color: 'var(--eg-muted)', marginTop: '1rem' }}>
                Your site URL: <span style={{ fontWeight: 600 }}>
                  {isBirthday
                    ? `${name1.toLowerCase().replace(/[^a-z0-9]/g, '') || 'birthday'}-birthday.pearloom.com`
                    : `${slugFromNames(name1, name2)}.pearloom.com`}
                </span>
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ ...btnPrimaryStyle, background: 'transparent', color: 'var(--eg-muted)', boxShadow: 'none' }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} style={{ ...btnPrimaryStyle, opacity: canProceedStep1 ? 1 : 0.5 }}>
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1: OCCASION ── */}
        {step === 1 && (
          <motion.div key="s2" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              What are you celebrating?
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              The occasion completely changes how we structure your site.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {OCCASIONS.map(occ => {
                const active = occasion === occ.id;
                return (
                  <motion.button
                    key={occ.id}
                    onClick={() => setOccasion(occ.id)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1.1rem',
                      padding: '1.1rem 1.5rem', borderRadius: '12px 12px 24px 24px', textAlign: 'left',
                      border: `2px solid ${active ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)'}`,
                      background: active ? 'var(--eg-accent-light)' : '#fff',
                      cursor: 'pointer', transition: 'background 0.2s, border-color 0.2s',
                      boxShadow: active ? '0 8px 24px rgba(163,177,138,0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                    }}
                  >
                    <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '10px', background: active ? 'rgba(255,255,255,0.7)' : 'rgba(163,177,138,0.1)' }}>
                      <occ.icon size={20} color={active ? 'var(--eg-accent)' : 'var(--eg-muted)'} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--eg-fg)' }}>{occ.label}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--eg-muted)', marginTop: '0.15rem' }}>{occ.desc}</div>
                    </div>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${active ? 'var(--eg-accent)' : 'rgba(0,0,0,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {active && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--eg-accent)' }} />}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Date picker — shown for all occasions except "story" */}
            {occasion !== '' && occasion !== 'story' && (
              <div style={{ marginTop: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>
                  {occasion === 'wedding' ? 'Wedding Date' :
                   occasion === 'anniversary' ? 'Anniversary Date' :
                   occasion === 'birthday' ? `${name1.trim() ? `${name1.trim()}'s` : 'Their'} Birthday` :
                   occasion === 'engagement' ? 'Engagement Date' :
                   'When is the big day?'}
                  {' '}<span style={{ color: 'var(--eg-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  style={{
                    ...inputStyle,
                    fontSize: 'max(16px, 0.9rem)',
                    boxSizing: 'border-box',
                  }}
                  onFocus={getFocusStyle}
                  onBlur={getBlurStyle}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '3rem' }}>
              <button onClick={handleNext} disabled={!canProceedStep2} style={{ ...btnPrimaryStyle, opacity: canProceedStep2 ? 1 : 0.5, pointerEvents: canProceedStep2 ? 'auto' : 'none' }}>
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: MOOD ── */}
        {step === 3 && (
          <motion.div key="s2" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {isBirthday
                ? `What's ${name1.trim() ? `${name1.trim()}'s` : 'their'} vibe?`
                : "What's your relationship vibe?"}
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              {isBirthday
                ? 'Pick the personality that fits them best — it shapes everything.'
                : 'This shapes the entire tone — colors, fonts, and narrative voice.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1rem' }}>
              {VIBE_MOODS.map(m => {
                const active = mood === m.id;
                return (
                  <motion.button
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    whileHover={{ y: -3, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1rem',
                      padding: '1.5rem', borderRadius: '14px 14px 28px 28px', textAlign: 'left',
                      border: `2px solid ${active ? m.activeBorder : 'rgba(0,0,0,0.0)'}`,
                      background: active ? m.activeBg : m.cardBg,
                      cursor: 'pointer',
                      transition: 'background 0.35s ease, border-color 0.25s ease',
                      boxShadow: active ? `0 8px 28px ${m.orb}` : '0 2px 12px rgba(0,0,0,0.04)',
                      position: 'relative', overflow: 'hidden',
                    }}
                  >
                    {/* Glow spot */}
                    {active && (
                      <div style={{
                        position: 'absolute', top: '-40px', right: '-40px',
                        width: '120px', height: '120px', borderRadius: '50%',
                        background: `radial-gradient(circle, ${m.orb.replace('0.', '0.5,').replace(')', ',transparent)')}`,
                        filter: 'blur(20px)', pointerEvents: 'none',
                      }} />
                    )}
                    <div style={{
                      width: '3rem', height: '3rem', borderRadius: '0.875rem',
                      background: active ? m.activeIconBg : m.iconBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: m.iconColor, flexShrink: 0,
                      boxShadow: active ? `0 4px 12px ${m.iconBg}` : 'none',
                      transition: 'all 0.25s ease',
                    }}>
                      <m.icon size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.3rem' }}>{m.label}</h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} disabled={!canProceedStep3} style={{ ...btnPrimaryStyle, opacity: canProceedStep3 ? 1 : 0.5, pointerEvents: canProceedStep3 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: TIMELINE FORMAT (new) ── */}
        {step === 4 && (
          <motion.div key="s4-format" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              How should your story look?
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
              Choose the format for your timeline — the visual structure of your memories.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {TIMELINE_FORMATS.map(fmt => {
                const active = layoutFormat === fmt.id;
                return (
                  <motion.button
                    key={fmt.id}
                    onClick={() => setLayoutFormat(fmt.id)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1.25rem',
                      padding: '1rem 1.25rem', borderRadius: '12px 12px 24px 24px', textAlign: 'left',
                      border: `2px solid ${active ? 'var(--eg-accent)' : 'rgba(0,0,0,0.06)'}`,
                      background: active ? 'var(--eg-accent-light)' : '#fff',
                      cursor: 'pointer',
                      transition: 'background 0.2s, border-color 0.2s',
                      boxShadow: active ? '0 8px 24px rgba(163,177,138,0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                    }}
                  >
                    {/* Mini visual preview */}
                    <div style={{
                      width: '72px', height: '50px', borderRadius: '0.5rem',
                      background: active ? 'rgba(163,177,138,0.15)' : 'rgba(0,0,0,0.04)',
                      border: `1px solid ${active ? 'rgba(163,177,138,0.3)' : 'rgba(0,0,0,0.07)'}`,
                      flexShrink: 0, overflow: 'hidden', position: 'relative',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      padding: '5px',
                    }}>
                      {fmt.preview === 'cascade' && (
                        <>
                          <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                            <div style={{ width: '28px', height: '14px', borderRadius: '2px', background: active ? '#A3B18A' : 'var(--eg-divider, #E6DFD2)', flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                              <div style={{ height: '2px', borderRadius: 1, background: active ? '#8FA876' : '#bbb' }} />
                              <div style={{ height: '2px', borderRadius: 1, background: active ? '#8FA876' : '#bbb', width: '70%' }} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', justifyContent: 'center' }}>
                              <div style={{ height: '2px', borderRadius: 1, background: active ? '#8FA876' : '#bbb' }} />
                              <div style={{ height: '2px', borderRadius: 1, background: active ? '#8FA876' : '#bbb', width: '60%' }} />
                            </div>
                            <div style={{ width: '28px', height: '14px', borderRadius: '2px', background: active ? '#A3B18A' : 'var(--eg-divider, #E6DFD2)', flexShrink: 0 }} />
                          </div>
                        </>
                      )}
                      {fmt.preview === 'filmstrip' && (
                        <>
                          <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                            {[...Array(6)].map((_, i) => <div key={i} style={{ width: '7px', height: '3px', borderRadius: '1px', background: active ? 'rgba(163,177,138,0.5)' : 'rgba(0,0,0,0.15)' }} />)}
                          </div>
                          <div style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                            {[...Array(3)].map((_, i) => <div key={i} style={{ width: '18px', height: '22px', borderRadius: '1px', background: active ? `rgba(163,177,138,${0.5 + i * 0.15})` : `rgba(0,0,0,${0.1 + i * 0.05})` }} />)}
                          </div>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {[...Array(6)].map((_, i) => <div key={i} style={{ width: '7px', height: '3px', borderRadius: '1px', background: active ? 'rgba(163,177,138,0.5)' : 'rgba(0,0,0,0.15)' }} />)}
                          </div>
                        </>
                      )}
                      {fmt.preview === 'scrapbook' && (
                        <>
                          <div style={{ position: 'absolute', left: '6px', top: '5px', width: '28px', height: '32px', background: active ? '#C4D4A8' : '#ddd', borderRadius: '1px', transform: 'rotate(-5deg)', boxShadow: '1px 2px 4px rgba(0,0,0,0.15)' }}>
                            <div style={{ width: '100%', height: '22px', background: active ? '#A3B18A' : 'var(--eg-divider, #E6DFD2)', borderRadius: '1px 1px 0 0' }} />
                          </div>
                          <div style={{ position: 'absolute', right: '6px', top: '8px', width: '26px', height: '30px', background: active ? '#D6C6A8' : '#e8e8e8', borderRadius: '1px', transform: 'rotate(4deg)', boxShadow: '1px 2px 4px rgba(0,0,0,0.12)' }}>
                            <div style={{ width: '100%', height: '20px', background: active ? '#C4B490' : '#d0d0d0', borderRadius: '1px 1px 0 0' }} />
                          </div>
                        </>
                      )}
                      {fmt.preview === 'magazine' && (
                        <>
                          <div style={{ display: 'flex', gap: '4px', height: '40px' }}>
                            <div style={{ width: '36px', height: '100%', background: active ? '#A3B18A' : 'var(--eg-divider, #E6DFD2)', borderRadius: '2px' }} />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', justifyContent: 'center' }}>
                              <div style={{ height: '4px', borderRadius: 1, background: active ? '#1a1713' : '#bbb' }} />
                              <div style={{ height: '2px', borderRadius: 1, background: active ? '#8FA876' : '#ccc' }} />
                              <div style={{ height: '2px', borderRadius: 1, background: active ? '#8FA876' : 'var(--eg-divider, #E6DFD2)', width: '80%' }} />
                              <div style={{ height: '2px', borderRadius: 1, background: active ? '#8FA876' : 'var(--eg-divider, #E6DFD2)', width: '60%' }} />
                            </div>
                          </div>
                        </>
                      )}
                      {fmt.preview === 'chapters' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '2px' }}>
                          {[{ w: '100%', open: true }, { w: '80%', open: false }, { w: '70%', open: false }].map((c, i) => (
                            <div key={i} style={{ width: c.w, height: c.open ? '14px' : '8px', borderRadius: '2px', background: c.open ? (active ? '#A3B18A' : '#bbb') : (active ? 'rgba(163,177,138,0.35)' : 'rgba(0,0,0,0.07)'), transition: 'all 0.2s' }} />
                          ))}
                        </div>
                      )}
                      {fmt.preview === 'starmap' && (
                        <div style={{ position: 'absolute', inset: 0, background: active ? '#0D1B2A' : '#1a1a2e', borderRadius: '0.4rem' }}>
                          {[[10, 8], [35, 14], [55, 28], [20, 35], [48, 40]].map(([x, y], i) => (
                            <div key={i} style={{ position: 'absolute', left: `${x}px`, top: `${y}px`, width: i % 2 === 0 ? '3px' : '2px', height: i % 2 === 0 ? '3px' : '2px', borderRadius: '50%', background: active ? '#C8A0E8' : '#888' }} />
                          ))}
                          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                            <line x1="12" y1="9" x2="37" y2="15" stroke={active ? 'rgba(200,160,232,0.4)' : 'rgba(255,255,255,0.15)'} strokeWidth="0.5" />
                            <line x1="37" y1="15" x2="57" y2="29" stroke={active ? 'rgba(200,160,232,0.4)' : 'rgba(255,255,255,0.15)'} strokeWidth="0.5" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <FormatMiniPreview id={fmt.id} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--eg-fg)' }}>{fmt.name}</span>
                        {active && (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--eg-accent)', background: 'rgba(163,177,138,0.18)', padding: '0.15rem 0.45rem', borderRadius: '100px' }}>Selected</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--eg-accent)', fontWeight: 600, marginTop: '0.1rem', letterSpacing: '0.02em' }}>{fmt.tagline}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--eg-muted)', marginTop: '0.2rem', lineHeight: 1.4 }}>{fmt.desc}</div>
                    </div>

                    {/* Radio */}
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${active ? 'var(--eg-accent)' : 'rgba(0,0,0,0.18)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {active && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--eg-accent)' }} />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} style={{ ...btnPrimaryStyle }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 5: VISUAL INSPIRATION ── */}
        {step === 5 && (
          <motion.div key="s5-inspo" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.75rem' }}>✨</span>
              <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem' }}>Aesthetic Vibes</h2>
            </div>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '2rem' }}>
              Tell the AI what to channel — sports teams, films, cities, artists, anything with a visual world.
            </p>

            {/* ── Keyword tag input ── */}
            <div style={{ marginBottom: '1.5rem' }}>
              {/* Existing tags */}
              {inspoKeywords.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {inspoKeywords.map(kw => (
                    <span key={kw} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.35rem 0.85rem', borderRadius: '100px',
                      background: 'var(--eg-accent)', color: '#fff',
                      fontSize: '0.88rem', fontWeight: 600,
                    }}>
                      {kw}
                      <button
                        type="button"
                        onClick={() => setInspoKeywords(prev => prev.filter(k => k !== kw))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 0, lineHeight: 1, fontSize: '1rem' }}
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
              {/* Type + add */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={inspoKeywordInput}
                  placeholder="e.g. Knicks, Coco, Art Deco, Paris..."
                  onChange={e => setInspoKeywordInput(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && inspoKeywordInput.trim()) {
                      e.preventDefault();
                      const val = inspoKeywordInput.trim().replace(/,$/, '');
                      if (val && !inspoKeywords.includes(val)) setInspoKeywords(prev => [...prev, val]);
                      setInspoKeywordInput('');
                    }
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                  onFocus={getFocusStyle}
                  onBlur={e => {
                    getBlurStyle(e);
                    // Also commit on blur if there's text
                    if (inspoKeywordInput.trim()) {
                      const val = inspoKeywordInput.trim();
                      if (!inspoKeywords.includes(val)) setInspoKeywords(prev => [...prev, val]);
                      setInspoKeywordInput('');
                    }
                  }}
                />
                {inspoKeywordInput.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      const val = inspoKeywordInput.trim();
                      if (!inspoKeywords.includes(val)) setInspoKeywords(prev => [...prev, val]);
                      setInspoKeywordInput('');
                    }}
                    style={{ ...btnPrimaryStyle, padding: '0.65rem 1.25rem', fontSize: '0.875rem' }}
                  >Add</button>
                )}
              </div>
            </div>

            {/* ── Quick-pick suggestions ── */}
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--eg-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>Quick picks</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {INSPO_SUGGESTIONS.filter(s => !inspoKeywords.includes(s.label)).map(s => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setInspoKeywords(prev => [...prev, s.label])}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0.35rem 0.85rem', borderRadius: '100px',
                      background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)',
                      color: 'var(--eg-fg)', fontSize: '0.84rem', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(163,177,138,0.15)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--eg-accent)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.08)'; }}
                  >
                    <span>{s.emoji}</span> {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Image URL section (secondary) ── */}
            <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', paddingTop: '1.5rem', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--eg-muted)', marginBottom: '0.5rem' }}>
                Or paste direct image URLs <span style={{ fontWeight: 400 }}>(Pinterest, Imgur — ends in .jpg/.png)</span>
              </p>
              {hasInspirationUrls && (
                <p style={{ color: 'var(--eg-accent)', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  ✓ AI will extract your palette from these images — colour step skipped.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {(inspirationUrls.length === 0 ? [''] : inspirationUrls).map((url, idx) => {
                  const isDirectImage = /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
                  const isKnownCdn = /(?:^|\.)(?:i\.imgur\.com|cdn\.discordapp\.com|images\.unsplash\.com|imagedelivery\.net|cloudinary\.com|res\.cloudinary\.com|live\.staticflickr\.com)(?:\/|$)/i.test(url);
                  const isValid = /^https?:\/\/.+/.test(url.trim());
                  const warnNotDirectImage = isValid && !isDirectImage && !isKnownCdn;
                  return (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isDirectImage && isValid && (
                          <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(214,198,168,0.2)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="inspiration preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                        <input
                          type="url"
                          value={url}
                          placeholder="https://i.pinimg.com/..."
                          onChange={e => {
                            const next = [...(inspirationUrls.length === 0 ? [''] : inspirationUrls)];
                            next[idx] = e.target.value;
                            setInspirationUrls(next.filter((u, i) => i === 0 || u.trim()));
                          }}
                          style={{ ...inputStyle, flex: 1, fontSize: '0.85rem', borderColor: url.trim() && !isValid ? '#ef4444' : 'rgba(0,0,0,0.12)' }}
                          onFocus={getFocusStyle}
                          onBlur={getBlurStyle}
                        />
                        {idx > 0 && (
                          <button type="button" onClick={() => setInspirationUrls(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--eg-muted)', padding: '0.25rem', flexShrink: 0 }}>✕</button>
                        )}
                      </div>
                      {warnNotDirectImage && (
                        <p style={{ fontSize: '0.76rem', color: '#f59e0b', margin: 0, paddingLeft: '0.25rem' }}>
                          ⚠ Paste a direct image URL (ending in .jpg / .png) for best results
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {inspirationUrls.length < 4 && (
                <button type="button" onClick={() => setInspirationUrls(prev => [...(prev.length === 0 ? [''] : prev), ''])} style={{ background: 'none', border: '1px dashed rgba(163,177,138,0.45)', borderRadius: '0.5rem', padding: '0.4rem 0.9rem', color: 'var(--eg-accent)', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600 }}>
                  + Add image URL
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} style={{ ...btnPrimaryStyle }}>
                {hasInspoInput ? 'Use my vibes →' : 'Skip'} <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 6: COLOR PALETTE (was step 5, skipped when inspiration URLs provided) ── */}
        {step === 6 && (
          <motion.div key="s6-palette" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Palette size={28} color="var(--eg-accent)" />
              <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem' }}>Color Inspiration</h2>
            </div>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '3rem' }}>
              Pick a palette that feels like your relationship. The AI will use this as a starting point.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '0.875rem' }}>
              {COLOR_PALETTES.map(p => {
                const active = palette === p.id;
                const isCustom = p.id === 'custom';
                return (
                  <motion.button
                    key={p.id}
                    onClick={() => setPalette(p.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    style={{
                      padding: 0, borderRadius: '12px 12px 24px 24px', textAlign: 'left',
                      border: `2px solid ${active ? 'var(--eg-fg)' : 'rgba(0,0,0,0.06)'}`,
                      background: '#fff',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      boxShadow: active ? '0 8px 28px rgba(0,0,0,0.14)' : '0 2px 10px rgba(0,0,0,0.03)',
                      transition: 'border-color 0.2s, box-shadow 0.25s',
                    }}
                  >
                    {/* Gradient strip */}
                    <div style={{
                      height: '52px',
                      background: isCustom
                        ? 'linear-gradient(90deg, #A3B18A, #D6C6A8, #6D597A, #1a1713, #8FA876)'
                        : `linear-gradient(90deg, ${p.colors.join(', ')})`,
                      position: 'relative',
                    }}>
                      {active && (
                        <div style={{
                          position: 'absolute', top: '50%', right: '0.75rem',
                          transform: 'translateY(-50%)',
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: 'rgba(255,255,255,0.9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem',
                        }}>✓</div>
                      )}
                    </div>
                    <div style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--eg-fg)', flex: 1 }}>{p.name}</span>
                        {/* Mini swatches */}
                        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                          {(isCustom ? p.colors.slice(0, 3) : p.colors.slice(0, 4)).map((c, i) => (
                            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
                          ))}
                        </div>
                      </div>
                      {/* Color swatches row */}
                      <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
                        {p.colors?.map((color: string, i: number) => (
                          <div
                            key={i}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              background: color,
                              border: '1px solid rgba(0,0,0,0.08)',
                              flexShrink: 0,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} disabled={!canProceedStep6} style={{ ...btnPrimaryStyle, opacity: canProceedStep6 ? 1 : 0.5, pointerEvents: canProceedStep6 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 7: FAVORITE PLACES (was step 6) ── */}
        {step === 7 && (
          <motion.div key="s7-places" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <Globe size={28} color="var(--eg-accent)" />
              <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem' }}>
                {isBirthday ? 'Their World' : 'Your Favorite Places'}
              </h2>
            </div>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
              {isBirthday
                ? `What's ${name1.trim() || 'their'} aesthetic world? Pick the settings that feel like them.`
                : 'What places capture your vibe as a couple? These shape the visual world of your site.'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem' }}>
              {PLACES.map(p => (
                <button key={p.id} onClick={() => togglePlace(p.id)} style={chipStyle(favPlaces.includes(p.id))}>{p.label}</button>
              ))}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.5rem' }}>
                {isBirthday
                  ? `Or name a place that means something to ${name1.trim() || 'them'}:`
                  : "Or name a specific place that's meaningful to you both:"}
              </label>
              <input type="text" placeholder={isBirthday ? 'e.g. their favourite café, the family cabin...' : 'e.g. Santorini, our back porch, that NYC rooftop...'} value={customPlace} onChange={e => setCustomPlace(e.target.value)} style={inputStyle} onFocus={getFocusStyle} onBlur={getBlurStyle} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} disabled={!canProceedStep7} style={{ ...btnPrimaryStyle, opacity: canProceedStep7 ? 1 : 0.5, pointerEvents: canProceedStep7 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 8: YOUR STORY (was step 7) ── */}
        {step === 8 && (
          <motion.div key="s8-story" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              {isBirthday
                ? `Tell us about ${name1.trim() || 'them'}`
                : 'Tell Us Your Story'}
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
              The more you share, the more personal and beautiful your site will be.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>
                  {isBirthday
                    ? `What makes ${name1.trim() || 'this person'} so special? *`
                    : 'How did you meet? *'}
                </label>
                <textarea
                  value={meetCute}
                  onChange={e => setMeetCute(e.target.value)}
                  placeholder={isBirthday
                    ? `e.g. Emma has the biggest laugh in any room. She's been my best friend since we were 12 and she never stops surprising me...`
                    : "We matched on Hinge and had our first date at a little Italian place..."}
                  style={{ ...inputStyle, minHeight: '140px', resize: 'none', lineHeight: 1.6, ...(showValidation && !meetCute.trim() ? { borderColor: 'var(--eg-plum, #6D597A)' } : {}) }}
                  onFocus={getFocusStyle} onBlur={getBlurStyle} autoFocus
                />
                {showValidation && !meetCute.trim() && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--eg-plum, #6D597A)', marginTop: '0.35rem' }}>This field is required</p>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>
                  {isBirthday
                    ? `What do you want everyone to know about ${name1.trim() || 'them'}?`
                    : 'What makes your relationship special?'}{' '}
                  <span style={{ color: 'var(--eg-muted)', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  value={relationship}
                  onChange={e => setRelationship(e.target.value)}
                  placeholder={isBirthday
                    ? `e.g. She's the kind of person who remembers every small detail, always shows up first, and makes everyone around her feel seen...`
                    : "We balance each other perfectly — she's spontaneous and I'm the planner..."}
                  style={{ ...inputStyle, minHeight: '100px', resize: 'none', lineHeight: 1.6 }}
                  onFocus={getFocusStyle} onBlur={getBlurStyle}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleNext} disabled={!canProceedStep8} style={{ ...btnPrimaryStyle, opacity: canProceedStep8 ? 1 : 0.5, pointerEvents: canProceedStep8 ? 'auto' : 'none' }}>Continue <ArrowRight size={18} /></button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 9: SPECIAL DETAILS (was step 8) ── */}
        {step === 9 && (
          <motion.div key="s9-special" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <div style={{
                width: '5rem', height: '6.4rem',
                borderRadius: '42% 42% 52% 52% / 30% 30% 52% 52%',
                background: 'linear-gradient(160deg, rgba(163,177,138,0.15), rgba(163,177,138,0.08))',
                border: '1.5px solid rgba(163,177,138,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
                boxShadow: '0 8px 24px rgba(163,177,138,0.15)',
              }}>
                <LoomThreadIcon size={28} color="var(--eg-accent)" />
              </div>
              <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.75rem' }}>Final Magic Touches</h2>
              <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', maxWidth: '420px', margin: '0 auto' }}>
                {isBirthday
                  ? `The details that make ${name1.trim() || 'this person'} uniquely them.`
                  : 'These optional details add warmth and personality.'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>
                  <PawIcon size={16} color="var(--eg-accent)" />
                  {isBirthday
                    ? `${name1.trim() ? `${name1.trim()}'s` : 'Their'} pets, passions, or quirks`
                    : 'Pets, inside jokes, or special traditions'}
                </label>
                <textarea value={petsDetails} onChange={e => setPetsDetails(e.target.value)} placeholder={isBirthday ? `e.g. Has a golden retriever called Biscuit, obsessed with Formula 1, makes the best pasta...` : "We have two cats named Peaches and Poppy..."} style={{ ...inputStyle, minHeight: '100px', resize: 'none', lineHeight: 1.6 }} onFocus={getFocusStyle} onBlur={getBlurStyle} autoFocus />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--eg-fg)', marginBottom: '0.5rem' }}>
                  <MusicNoteIcon size={16} color="var(--eg-accent)" />
                  {isBirthday
                    ? `${name1.trim() ? `${name1.trim()}'s` : 'Their'} favourite song or musical taste`
                    : 'Your song or musical vibe'}
                </label>
                <input type="text" value={musicSong} onChange={e => setMusicSong(e.target.value)} placeholder={isBirthday ? `e.g. "Dancing in the Moonlight" — always on in the car...` : `"At Last" by Etta James, or indie folk, or lo-fi jazz...`} style={inputStyle} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              {isEvent ? (
                <button onClick={handleNext} style={{ ...btnPrimaryStyle }}>Continue <ArrowRight size={18} /></button>
              ) : (
                <button onClick={handleSubmit} style={{ ...btnPrimaryStyle, boxShadow: '0 12px 36px rgba(163,177,138,0.45)' }}>Generate My Site <LoomThreadIcon size={18} /></button>
              )}
            </div>
          </motion.div>
        )}

        {/* ── STEP 10: EVENT DETAILS (Conditional, was step 9) ── */}
        {step === 10 && isEvent && (
          <motion.div key="s10-event" custom={1} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>Event Details</h2>
              <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem' }}>
                Since this is a {OCCASIONS.find(o => o.id === occasion)?.label}, let&apos;s add the logistics so guests can RSVP and find you.
              </p>
              {eventDate && (
                <p style={{ fontSize: '0.88rem', color: 'var(--eg-accent)', fontWeight: 600, marginTop: '0.75rem' }}>
                  ✓ Date set: {/^\d{4}-\d{2}-\d{2}$/.test(eventDate) ? new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : eventDate}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>Where is the venue?</label>
                <input type="text" placeholder="e.g. The Glasshouse, NYC" value={eventVenue} onChange={e => setEventVenue(e.target.value)} style={inputStyle} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>RSVP Deadline</label>
                <input type="text" placeholder="e.g. September 1st" value={rsvpDeadline} onChange={e => setRsvpDeadline(e.target.value)} style={inputStyle} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: 'var(--eg-muted)', marginBottom: '0.75rem' }}>Registry or Cash Fund URL <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <input type="url" placeholder="e.g. venmo.com/shauna-scott" value={cashFundUrl} onChange={e => setCashFundUrl(e.target.value)} style={inputStyle} onFocus={getFocusStyle} onBlur={getBlurStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem' }}>
              <button onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--eg-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}><ArrowLeft size={18} /> Back</button>
              <button onClick={handleSubmit} style={{ ...btnPrimaryStyle, boxShadow: '0 12px 36px rgba(163,177,138,0.45)' }}>Generate My Site <LoomThreadIcon size={18} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
