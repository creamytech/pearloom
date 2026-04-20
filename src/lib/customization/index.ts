// ─────────────────────────────────────────────────────────────
// Pearloom / lib/customization/index.ts
// Complete customization system — borders, backgrounds, frames,
// monograms, transitions, countdown styles, text effects, music.
//
// Every option generates real CSS/SVG that renders on published sites.
// ─────────────────────────────────────────────────────────────

// ── 1. CARD BORDER STYLES ────────────────────────────────────

export interface CardBorderStyle {
  id: string;
  name: string;
  css: Record<string, string>;
  preview: string;
}

export const CARD_BORDERS: CardBorderStyle[] = [
  { id: 'none', name: 'None', css: { border: 'none' }, preview: 'No border' },
  { id: 'thin-line', name: 'Thin Line', css: { border: '1px solid rgba(0,0,0,0.08)', borderRadius: 'var(--pl-radius-xl)' }, preview: 'Subtle single line' },
  { id: 'double-classic', name: 'Double Classic', css: { border: '3px double rgba(0,0,0,0.15)', borderRadius: 'var(--pl-radius-md)' }, preview: 'Classic double border' },
  { id: 'gold-ornamental', name: 'Gold Ornamental', css: { border: '2px solid #C4A96A', borderRadius: 'var(--pl-radius-lg)', boxShadow: 'inset 0 0 0 4px rgba(196,169,106,0.1)' }, preview: 'Antique gold frame' },
  { id: 'botanical-vine', name: 'Botanical Vine', css: { border: '2px solid #5C6B3F', borderRadius: 'var(--pl-radius-2xl)', boxShadow: 'inset 0 0 0 3px rgba(163,177,138,0.08)' }, preview: 'Soft botanical frame' },
  { id: 'art-deco', name: 'Art Deco', css: { border: '2px solid #111', borderRadius: '0', boxShadow: 'inset 0 0 0 7px rgba(0,0,0,0.04)' }, preview: 'Geometric art deco' },
  { id: 'scalloped', name: 'Scalloped Edge', css: { border: '2px solid rgba(0,0,0,0.1)', borderRadius: 'var(--pl-radius-2xl)' }, preview: 'Soft scalloped corners' },
  { id: 'watercolor-wash', name: 'Watercolor Wash', css: { border: 'none', borderRadius: 'var(--pl-radius-2xl)', boxShadow: '0 0 0 2px rgba(163,177,138,0.15), 0 0 40px rgba(163,177,138,0.06)' }, preview: 'Soft watercolor glow' },
  { id: 'minimal-corners', name: 'Minimal Corners', css: { border: 'none', borderRadius: '0' }, preview: 'Corner accents only' },
  { id: 'shadow-lifted', name: 'Shadow Lifted', css: { border: 'none', borderRadius: 'var(--pl-radius-xl)', boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }, preview: 'Floating shadow card' },
];

// ── 2. SECTION BACKGROUNDS ───────────────────────────────────

export const SECTION_BACKGROUNDS = [
  { id: 'none', name: 'None', css: 'transparent', preview: 'No background' },
  { id: 'linen', name: 'Linen', css: '#FAF7F2', preview: 'Warm linen' },
  { id: 'watercolor-blush', name: 'Watercolor Blush', css: 'radial-gradient(ellipse at 30% 50%, rgba(212,130,154,0.08) 0%, transparent 60%)', preview: 'Soft pink wash' },
  { id: 'watercolor-sage', name: 'Watercolor Sage', css: 'radial-gradient(ellipse at 20% 60%, rgba(163,177,138,0.1) 0%, transparent 60%)', preview: 'Botanical green wash' },
  { id: 'kraft-paper', name: 'Kraft Paper', css: '#D2C4A8', preview: 'Natural kraft' },
  { id: 'gradient-warm', name: 'Warm Gradient', css: 'linear-gradient(180deg, #FAF7F2 0%, #F0EBE0 100%)', preview: 'Cream to sand' },
  { id: 'gradient-cool', name: 'Cool Gradient', css: 'linear-gradient(180deg, #F0F3FA 0%, #DCE6F5 100%)', preview: 'Ice blue fade' },
  { id: 'dots-subtle', name: 'Subtle Dots', css: 'radial-gradient(circle, rgba(0,0,0,0.03) 1px, transparent 1px)', preview: 'Polka dot pattern' },
];

// ── 3. PHOTO FRAME STYLES ────────────────────────────────────

export const PHOTO_FRAMES = [
  { id: 'none', name: 'None', containerCss: { borderRadius: 'var(--pl-radius-lg)', overflow: 'hidden' }, preview: 'Simple rounded' },
  { id: 'polaroid', name: 'Polaroid', containerCss: { background: '#fff', padding: '12px 12px 48px', borderRadius: 'var(--pl-radius-xs)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', transform: 'rotate(-1.5deg)' }, preview: 'Classic polaroid' },
  { id: 'arch', name: 'Arch', containerCss: { borderRadius: '200px 200px 12px 12px', overflow: 'hidden' }, preview: 'Architectural arch' },
  { id: 'circle', name: 'Circle', containerCss: { borderRadius: '50%', overflow: 'hidden', aspectRatio: '1/1' }, preview: 'Perfect circle' },
  { id: 'diamond', name: 'Diamond', containerCss: { transform: 'rotate(45deg)', overflow: 'hidden', borderRadius: 'var(--pl-radius-md)' }, preview: 'Diamond shape' },
  { id: 'torn-edge', name: 'Torn Edge', containerCss: { borderRadius: '0', clipPath: 'polygon(0 2%, 5% 0, 10% 3%, 15% 0, 20% 2%, 25% 0, 30% 3%, 35% 0, 40% 2%, 45% 0, 50% 3%, 55% 0, 60% 2%, 65% 0, 70% 3%, 75% 0, 80% 2%, 85% 0, 90% 3%, 95% 0, 100% 2%, 100% 98%, 95% 100%, 90% 97%, 85% 100%, 80% 98%, 75% 100%, 70% 97%, 65% 100%, 60% 98%, 55% 100%, 50% 97%, 45% 100%, 40% 98%, 35% 100%, 30% 97%, 25% 100%, 20% 98%, 15% 100%, 10% 97%, 5% 100%, 0 98%)' }, preview: 'Vintage torn paper' },
  { id: 'heavy-rounded', name: 'Heavy Rounded', containerCss: { borderRadius: '32px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }, preview: 'Extra rounded' },
];

// ── 4. MONOGRAM GENERATOR ────────────────────────────────────

export const MONOGRAM_STYLES = [
  { id: 'circle-serif', name: 'Circle Serif', preview: 'Classic circle with serif initials' },
  { id: 'square-minimal', name: 'Square Minimal', preview: 'Clean square frame' },
  { id: 'ornate-frame', name: 'Ornate Frame', preview: 'Double circle with italic' },
  { id: 'ampersand', name: 'Ampersand Stack', preview: 'Initials with & between' },
  { id: 'botanical-wreath', name: 'Botanical Wreath', preview: 'Leaf wreath border' },
];

export function generateMonogram(initials: string, style: string, color: string = '#C4A96A'): string {
  const c = initials.toUpperCase().slice(0, 3);
  if (style === 'circle-serif') return `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="55" fill="none" stroke="${color}" stroke-width="1.5"/><text x="60" y="68" text-anchor="middle" font-family="Playfair Display,serif" font-size="36" font-weight="600" fill="${color}">${c}</text></svg>`;
  if (style === 'square-minimal') return `<svg viewBox="0 0 120 120"><rect x="5" y="5" width="110" height="110" fill="none" stroke="${color}" stroke-width="1"/><text x="60" y="70" text-anchor="middle" font-family="DM Serif Display,serif" font-size="40" fill="${color}">${c}</text></svg>`;
  if (style === 'ornate-frame') return `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="${color}" stroke-width="1"/><circle cx="60" cy="60" r="45" fill="none" stroke="${color}" stroke-width="0.5"/><text x="60" y="68" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="34" font-style="italic" fill="${color}">${c}</text></svg>`;
  if (style === 'ampersand') return `<svg viewBox="0 0 120 120"><text x="60" y="45" text-anchor="middle" font-family="Playfair Display,serif" font-size="28" fill="${color}">${c[0]||''}</text><text x="60" y="75" text-anchor="middle" font-family="Playfair Display,serif" font-size="20" font-style="italic" fill="${color}">&amp;</text><text x="60" y="105" text-anchor="middle" font-family="Playfair Display,serif" font-size="28" fill="${color}">${c[1]||''}</text></svg>`;
  if (style === 'botanical-wreath') return `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" fill="none" stroke="${color}" stroke-width="0.8" stroke-dasharray="4 3"/><text x="60" y="68" text-anchor="middle" font-family="Cormorant Garamond,serif" font-size="30" font-style="italic" fill="${color}">${c}</text></svg>`;
  return `<svg viewBox="0 0 120 120"><text x="60" y="70" text-anchor="middle" font-family="serif" font-size="40" fill="${color}">${c}</text></svg>`;
}

// ── 5. SECTION TRANSITIONS ───────────────────────────────────

export const SECTION_TRANSITIONS = [
  { id: 'none', name: 'None', svgPath: '', height: 0, preview: 'No divider' },
  { id: 'wave', name: 'Gentle Wave', svgPath: 'M0,40 C200,80 400,0 600,40 C800,80 1000,0 1200,40 L1200,0 L0,0 Z', height: 60, preview: 'Smooth wave' },
  { id: 'diagonal', name: 'Diagonal Cut', svgPath: 'M0,60 L1200,0 L1200,0 L0,0 Z', height: 60, preview: 'Angled slice' },
  { id: 'torn', name: 'Torn Paper', svgPath: 'M0,20 L50,25 L100,18 L150,28 L200,15 L250,22 L300,30 L350,12 L400,24 L450,18 L500,28 L550,14 L600,22 L650,30 L700,16 L750,26 L800,20 L850,28 L900,14 L950,24 L1000,18 L1050,26 L1100,20 L1150,28 L1200,22 L1200,0 L0,0 Z', height: 40, preview: 'Rough tear edge' },
  { id: 'chevron', name: 'Chevron', svgPath: 'M0,0 L600,60 L1200,0 Z', height: 60, preview: 'Arrow point' },
  { id: 'curve', name: 'Smooth Curve', svgPath: 'M0,60 Q600,0 1200,60 L1200,0 L0,0 Z', height: 60, preview: 'Gentle arc' },
  { id: 'steps', name: 'Steps', svgPath: 'M0,50 L300,50 L300,25 L600,25 L600,50 L900,50 L900,25 L1200,25 L1200,0 L0,0 Z', height: 50, preview: 'Geometric steps' },
];

// ── 6. RSVP CUSTOM QUESTIONS ─────────────────────────────────

export const RSVP_QUESTION_PRESETS = [
  { id: 'song', question: 'What song gets you on the dance floor?', type: 'text' as const, required: false },
  { id: 'advice', question: 'Best marriage advice in one sentence?', type: 'text' as const, required: false },
  { id: 'memory', question: 'Favorite memory with the couple?', type: 'text' as const, required: false },
  { id: 'transport', question: 'Will you need shuttle transportation?', type: 'radio' as const, options: ['Yes', 'No'], required: false },
  { id: 'kids', question: 'Will you be bringing children?', type: 'radio' as const, options: ['Yes', 'No'], required: false },
  { id: 'allergy', question: 'Any food allergies we should know about?', type: 'text' as const, required: false },
  { id: 'accessibility', question: 'Any accessibility needs?', type: 'text' as const, required: false },
];

// ── 7. GUESTBOOK PROMPTS ─────────────────────────────────────

export const GUESTBOOK_PROMPTS = [
  { id: 'marriage-advice', text: 'Share your best marriage advice', occasion: 'wedding', icon: '♡' },
  { id: 'favorite-memory', text: 'What\'s your favorite memory with us?', occasion: 'wedding', icon: '✦' },
  { id: 'date-night', text: 'Suggest a date night idea', occasion: 'wedding', icon: '◆' },
  { id: 'future-wish', text: 'A wish for our future', occasion: 'wedding', icon: '☆' },
  { id: 'birthday-wish', text: 'Write a birthday wish', occasion: 'birthday', icon: '✦' },
  { id: 'birthday-memory', text: 'Share a favorite memory together', occasion: 'birthday', icon: '◆' },
  { id: 'anniversary-toast', text: 'Write a toast to the couple', occasion: 'anniversary', icon: '♡' },
];

// ── 8. COUNTDOWN STYLES ──────────────────────────────────────

export const COUNTDOWN_STYLES = [
  { id: 'cards', name: 'Classic Cards', numberCss: { background: 'rgba(255,255,255,0.8)', borderRadius: 'var(--pl-radius-xl)', padding: '1.5rem 1rem', minWidth: '80px', textAlign: 'center' as const, border: '1px solid rgba(0,0,0,0.06)' }, preview: 'Rounded number cards' },
  { id: 'minimal', name: 'Minimal Numbers', numberCss: { padding: '0.5rem', minWidth: '60px', textAlign: 'center' as const }, preview: 'Clean large numbers' },
  { id: 'flip-clock', name: 'Flip Clock', numberCss: { background: '#1a1a1a', color: '#fff', borderRadius: 'var(--pl-radius-md)', padding: '1rem 0.75rem', minWidth: '70px', textAlign: 'center' as const }, preview: 'Airport flip board' },
  { id: 'circular', name: 'Circular Progress', numberCss: { width: '80px', height: '80px', borderRadius: '50%', border: '3px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center' }, preview: 'Ring progress circles' },
];

// ── 9. TEXT ANIMATION EFFECTS ────────────────────────────────

export const TEXT_EFFECTS = [
  { id: 'none', name: 'None', className: '', preview: 'No animation' },
  { id: 'fade-in', name: 'Fade In', className: 'animate-fade-in', preview: 'Simple fade' },
  { id: 'slide-up', name: 'Slide Up', className: 'animate-slide-up', preview: 'Rise from below' },
  { id: 'blur-in', name: 'Blur In', className: 'animate-[pl-blur_1s_ease_forwards]', preview: 'Focus from blur' },
];

// ── 10. BACKGROUND MUSIC CONFIG ──────────────────────────────

export interface BackgroundMusicConfig {
  url: string;
  autoPlay: boolean;
  volume: number;
  showControls: boolean;
  position: 'bottom-left' | 'bottom-right' | 'top-right';
  consentMessage: string;
}

export const DEFAULT_MUSIC_CONFIG: BackgroundMusicConfig = {
  url: '',
  autoPlay: false,
  volume: 0.3,
  showControls: true,
  position: 'bottom-right',
  consentMessage: 'This site has background music. Would you like to play it?',
};
