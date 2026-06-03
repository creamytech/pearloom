'use client';

/* ========================================================================
   EditorDialBar — LITERAL port of:
   - ClaudeDesign/shared/tweaks-panel.jsx (control primitives + .twk-* CSS)
   - ClaudeDesign/pages/editor-redesign.jsx (the bottom-of-canvas dial row)

   The prototype's TweaksPanel was a fixed floating panel; production
   surfaces the same controls as a bottom dial bar that runs the width
   of the canvas. The control classNames (twk-panel, twk-hd, twk-x,
   twk-body, twk-row, twk-row-h, twk-lbl, twk-val, twk-sect, twk-field,
   twk-slider, twk-seg, twk-seg-thumb, twk-toggle, twk-num, twk-btn,
   twk-swatch) are copied verbatim from the prototype.
   ====================================================================== */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../motifs';
import { lookDefaultsFor, getEventType } from '@/lib/event-os/event-types';
import { EDITIONS } from '@/lib/site-editions/editions';
import { resolveEdition } from '@/lib/site-editions/resolve';
import { paletteFromFile } from '@/lib/look-engine/palette-from-photo';
import { generateLookFromStory, type SuggestedLook } from '@/lib/look-engine/generate-from-story';

type Density = NonNullable<StoryManifest['density']>;
type VoiceOverride = NonNullable<StoryManifest['voiceOverride']>;
type EditionId = NonNullable<StoryManifest['edition']>;
type TextureId = NonNullable<StoryManifest['texture']>;
type KitId = NonNullable<StoryManifest['kitId']>;
type SiteLayoutId = NonNullable<StoryManifest['siteLayout']>;

interface SavedLook {
  edition?: EditionId;
  texture?: TextureId;
  density: Density;
  textureIntensity: number;
  voiceOverride?: VoiceOverride;
  kitId?: KitId;
  siteLayout?: SiteLayoutId;
}

const LOOKS_KEY = 'pl-looks';
const MAX_LOOKS = 6;

const KIT_LABEL: Record<KitId, string> = {
  classic: 'Classic', ticket: 'Ticket', plate: 'Plate', scrapbook: 'Scrapbook',
  index: 'Index', minimal: 'Minimal', arch: 'Arch', stamp: 'Stamp', deco: 'Deco',
};
const LAYOUT_LABEL: Record<SiteLayoutId, string> = {
  stacked: 'Stacked', boxed: 'Boxed', split: 'Split',
  magazine: 'Magazine', zine: 'Zine', storybook: 'Storybook',
  gallery: 'Gallery', postcard: 'Postcard',
};

/* ── Inline .twk-* stylesheet — LITERAL from tweaks-panel.jsx L43–134.
   Original was a fixed panel; we keep the control classes verbatim
   so the segmented thumb/range thumb/toggle pill all match. */
const __TWEAKS_STYLE = `
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;width:100%;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}
`;

/* ── TweakRow — LITERAL port (tweaks-panel.jsx L259). */
function TweakRow({ label, value, children, inline = false }: {
  label: string; value?: string | null; children: React.ReactNode; inline?: boolean;
}) {
  return (
    <div className={inline ? 'twk-row twk-row-h' : 'twk-row'}>
      <div className="twk-lbl">
        <span>{label}</span>
        {value != null && <span className="twk-val">{value}</span>}
      </div>
      {children}
    </div>
  );
}

/* ── TweakSlider — LITERAL port (tweaks-panel.jsx L273). */
function TweakSlider({ label, value, min = 0, max = 100, step = 1, unit = '', onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <TweakRow label={label} value={`${value}${unit}`}>
      <input type="range" className="twk-slider" min={min} max={max} step={step}
             value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </TweakRow>
  );
}

/* ── TweakToggle — LITERAL port (tweaks-panel.jsx L282). */
function TweakToggle({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="twk-row twk-row-h">
      <div className="twk-lbl"><span>{label}</span></div>
      <button type="button" className="twk-toggle" data-on={value ? '1' : '0'}
              role="switch" aria-checked={!!value}
              onClick={() => onChange(!value)}><i /></button>
    </div>
  );
}

/* ── TweakRadio — LITERAL port (tweaks-panel.jsx L293). */
function TweakRadio<T extends string>({ label, value, options, onChange }: {
  label: string; value: T;
  options: ReadonlyArray<{ value: T; label: string } | T>;
  onChange: (v: T) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const opts = options.map((o: any) => (typeof o === 'object' ? o : { value: o, label: o }));
  const idx = Math.max(0, opts.findIndex((o: any) => o.value === value));
  const n = opts.length;

  const valueRef = useRef(value);
  valueRef.current = value;

  const segAt = (clientX: number): T => {
    const r = trackRef.current!.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor(((clientX - r.left - 2) / inner) * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = (ev: PointerEvent) => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <TweakRow label={label}>
      <div ref={trackRef} role="radiogroup" onPointerDown={onPointerDown}
           className={dragging ? 'twk-seg dragging' : 'twk-seg'}>
        <div className="twk-seg-thumb"
             style={{ left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
                      width: `calc((100% - 4px) / ${n})` }} />
        {opts.map((o: any) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value}>
            {o.label}
          </button>
        ))}
      </div>
    </TweakRow>
  );
}

/* ── TweakButton — LITERAL port (tweaks-panel.jsx L414). */
function TweakButton({ label, onClick, secondary = false }: {
  label: string; onClick: () => void; secondary?: boolean;
}) {
  return (
    <button type="button" className={secondary ? 'twk-btn secondary' : 'twk-btn'}
            onClick={onClick}>{label}</button>
  );
}

/* Identity chip — opens an existing picker. Reuses the .twk-btn
   secondary look so the chip row matches the rest of the panel. */
function Chip({ label, value, onClick, icon }: {
  label: string; value: string; onClick: () => void; icon?: string;
}) {
  return (
    <button type="button" onClick={onClick} className="twk-btn secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      {icon && <Icon name={icon} size={11} />}
      <span style={{ fontWeight: 500, opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
      <Icon name="chev-down" size={9} />
    </button>
  );
}

interface Props {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
  onOpenEvent: () => void;
  onOpenTheme: () => void;
  onOpenKit: () => void;
  onOpenLayout: () => void;
}

export function EditorDialBar({ manifest, onChange, onOpenEvent, onOpenTheme, onOpenKit, onOpenLayout }: Props) {
  const lookDefaults = lookDefaultsFor(manifest.occasion);
  const density: Density = manifest.density ?? lookDefaults.density;
  const intensity = manifest.textureIntensity ?? lookDefaults.textureIntensity;
  const voiceOverride = manifest.voiceOverride;
  const texture = manifest.texture ?? 'smooth';

  const occasion = manifest.occasion ?? 'wedding';
  const eventType = getEventType(occasion);
  const eventLabel = eventType?.label ?? 'Wedding';
  const editionId = manifest.edition ?? 'almanac';
  const activeEdition = EDITIONS.find((e) => e.id === editionId)
    ?? resolveEdition({ edition: editionId, occasion, voice: eventType?.voice ?? 'celebratory' });
  const themeLabel = activeEdition.label;
  const kitId: KitId = manifest.kitId ?? lookDefaults.kitId;
  const kitLabel = KIT_LABEL[kitId] ?? kitId;
  const siteLayout: SiteLayoutId = manifest.siteLayout ?? activeEdition.recommendedLayout ?? 'stacked';
  const layoutLabel = LAYOUT_LABEL[siteLayout] ?? siteLayout;

  const motifsOn = Boolean(manifest.motifs?.blob || manifest.motifs?.squiggle || manifest.motifs?.sparkle
    || manifest.motifs?.stamp || manifest.motifs?.heart || manifest.motifs?.polaroid);

  const [looks, setLooks] = useState<SavedLook[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOOKS_KEY);
      if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) setLooks(parsed.slice(0, MAX_LOOKS)); }
    } catch { /* fall through */ }
  }, []);
  function persistLooks(next: SavedLook[]) {
    setLooks(next);
    try { localStorage.setItem(LOOKS_KEY, JSON.stringify(next)); } catch { /* fall through */ }
  }
  function saveCurrent() {
    const snapshot: SavedLook = {
      edition: manifest.edition, texture: manifest.texture, density,
      textureIntensity: intensity, voiceOverride: manifest.voiceOverride,
      kitId: manifest.kitId, siteLayout: manifest.siteLayout,
    };
    persistLooks([...looks, snapshot].slice(-MAX_LOOKS));
  }
  function applyLook(lk: SavedLook) {
    onChange({ ...manifest, edition: lk.edition ?? manifest.edition,
      texture: lk.texture ?? manifest.texture, density: lk.density,
      textureIntensity: lk.textureIntensity, voiceOverride: lk.voiceOverride,
      kitId: lk.kitId ?? manifest.kitId, siteLayout: lk.siteLayout ?? manifest.siteLayout });
  }
  function removeLook(idx: number) { persistLooks(looks.filter((_, i) => i !== idx)); }

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [paletteBusy, setPaletteBusy] = useState(false);
  async function onPhotoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPaletteBusy(true);
    try {
      const palette = await paletteFromFile(file);
      if (!palette) return;
      const existingTheme = (manifest as any).theme ?? {};
      const existingColors = (existingTheme.colors ?? {}) as Record<string, string>;
      onChange({ ...manifest, theme: { ...existingTheme, colors: { ...existingColors,
        accent: palette.accent, accentLight: palette.accentLight } } } as any);
    } catch { /* fall through */ } finally {
      setPaletteBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const [storyText, setStoryText] = useState('');
  const [storyBusy, setStoryBusy] = useState(false);
  async function runGenerate() {
    const text = storyText.trim();
    if (!text) return;
    setStoryBusy(true);
    let look: SuggestedLook;
    try {
      const res = await fetch('/api/look/from-story', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (res.ok) { look = (await res.json()) as SuggestedLook; }
      else { look = generateLookFromStory(text); }
    } catch { look = generateLookFromStory(text); }
    onChange({ ...manifest, occasion: look.occasion, edition: look.edition,
      texture: look.texture, density: look.density,
      textureIntensity: look.textureIntensity, voiceOverride: look.voiceOverride } as StoryManifest);
    setStoryBusy(false);
    setStoryText('');
  }

  const SOMBER: ReadonlySet<string> = new Set(['memorial', 'funeral']);
  function shuffleLook() {
    if (SOMBER.has(occasion)) return;
    const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const editions: EditionId[] = ['almanac', 'cinema', 'postcard-box', 'linen-folder', 'quiet'];
    const textures: TextureId[] = ['smooth', 'watercolor', 'linen', 'letterpress', 'vellum', 'newsprint'];
    const kits: KitId[] = ['classic', 'ticket', 'plate', 'scrapbook', 'index', 'minimal'];
    const densities: Density[] = ['cozy', 'comfortable', 'spacious'];
    const intensitySteps = [0.6, 1, 1.3];
    const voices: VoiceOverride[] = ['classic', 'playful', 'poetic'];
    onChange({ ...manifest, edition: pick(editions), texture: pick(textures),
      kitId: pick(kits), density: pick(densities),
      textureIntensity: pick(intensitySteps), voiceOverride: pick(voices) } as StoryManifest);
  }

  function setDensity(v: Density) { onChange({ ...manifest, density: v }); }
  function setIntensity(v: number) { onChange({ ...manifest, textureIntensity: v }); }
  function setVoice(v: VoiceOverride | 'match') {
    const next = { ...manifest } as StoryManifest;
    if (v === 'match') delete (next as any).voiceOverride;
    else next.voiceOverride = v;
    onChange(next);
  }
  function toggleMotifs(on: boolean) {
    if (on) onChange({ ...manifest, motifs: { ...(manifest.motifs ?? {}), blob: manifest.motifs?.blob ?? 'sage' } });
    else onChange({ ...manifest, motifs: undefined });
  }

  const barStyle: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px',
    background: 'rgba(250,249,247,.78)', color: '#29261b',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)', backdropFilter: 'blur(24px) saturate(160%)',
    borderTop: '.5px solid rgba(255,255,255,.6)',
    boxShadow: '0 -1px 0 rgba(255,255,255,.5) inset',
    font: '11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif',
    overflowX: 'auto', flexWrap: 'nowrap', minHeight: 52, position: 'relative', zIndex: 4,
  };

  return (
    <>
      <style>{__TWEAKS_STYLE}</style>
      <footer aria-label="Fine-tune the look" style={barStyle}>
        <Chip label="Event" value={eventLabel} onClick={onOpenEvent} icon="sparkles" />
        <Chip label="Theme" value={themeLabel} onClick={onOpenTheme} icon="palette" />
        <Chip label="Kit" value={kitLabel} onClick={onOpenKit} icon="grid" />
        <Chip label="Layout" value={layoutLabel} onClick={onOpenLayout} icon="layout" />

        <span style={{ width: 1, height: 22, background: 'rgba(0,0,0,.08)', flexShrink: 0 }} aria-hidden />

        <div style={{ minWidth: 220 }}>
          <TweakRadio
            label="Voice"
            value={voiceOverride ?? 'match'}
            options={[
              { value: 'match', label: 'Match event' },
              { value: 'classic', label: 'Classic' },
              { value: 'playful', label: 'Playful' },
              { value: 'poetic', label: 'Poetic' },
            ]}
            onChange={(v) => setVoice(v as VoiceOverride | 'match')}
          />
        </div>

        <div style={{ minWidth: 180 }}>
          <TweakRadio
            label="Spacing"
            value={density}
            options={[
              { value: 'cozy', label: 'Cozy' },
              { value: 'comfortable', label: 'Comfy' },
              { value: 'spacious', label: 'Airy' },
            ]}
            onChange={(v) => setDensity(v as Density)}
          />
        </div>

        {texture !== 'smooth' && texture !== 'none' && (
          <div style={{ minWidth: 180 }}>
            <TweakSlider label="Grain" value={Number(intensity.toFixed(1))} min={0} max={1.5} step={0.1}
                         onChange={setIntensity} />
          </div>
        )}

        <div style={{ minWidth: 110 }}>
          <TweakToggle label="Motifs" value={motifsOn} onChange={toggleMotifs} />
        </div>

        <span style={{ width: 1, height: 22, background: 'rgba(0,0,0,.08)', flexShrink: 0 }} aria-hidden />

        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={paletteBusy}
                className="twk-btn secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                         opacity: paletteBusy ? 0.6 : 1, cursor: paletteBusy ? 'progress' : 'pointer' }}
                title="Pick a photo — Pear pulls a palette from it">
          <Icon name="image" size={11} />
          {paletteBusy ? 'Threading…' : 'Match my photos'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onPhotoPicked} style={{ display: 'none' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 2px 2px 10px', borderRadius: 999,
                      background: 'rgba(198,112,61,0.12)', border: '1px solid rgba(198,112,61,0.30)', minWidth: 220 }}>
          <Icon name="sparkles" size={11} color="var(--peach-ink, #C6703D)" />
          <input value={storyText} onChange={(e) => setStoryText(e.target.value)}
                 onKeyDown={(e) => { if (e.key === 'Enter' && !storyBusy) runGenerate(); }}
                 placeholder="Describe the day — Pear picks a look"
                 aria-label="Generate look from story"
                 style={{ flex: 1, border: 0, background: 'transparent', outline: 'none',
                          fontFamily: 'inherit', fontSize: 11.5, color: '#29261b',
                          padding: '4px 0', minWidth: 140 }} />
          <button type="button" onClick={runGenerate} disabled={storyBusy || !storyText.trim()}
                  aria-label="Generate"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                           width: 24, height: 24, borderRadius: 999, border: 0,
                           background: 'var(--peach-ink, #C6703D)', color: '#fff',
                           cursor: storyBusy || !storyText.trim() ? 'not-allowed' : 'pointer',
                           opacity: storyBusy || !storyText.trim() ? 0.5 : 1 }}>
            <Icon name="arrow-right" size={11} color="#fff" />
          </button>
        </div>

        <span style={{ width: 1, height: 22, background: 'rgba(0,0,0,.08)', flexShrink: 0 }} aria-hidden />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(41,38,27,.45)',
                         letterSpacing: '.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Looks
          </span>
          {looks.map((lk, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 2,
                                   padding: '2px 2px 2px 8px', borderRadius: 999,
                                   background: 'rgba(255,255,255,.6)',
                                   border: '.5px solid rgba(0,0,0,.1)',
                                   fontSize: 10.5, color: 'rgba(41,38,27,.72)' }}>
              <button type="button" onClick={() => applyLook(lk)}
                      title={`${lk.edition ?? 'edition'} · ${lk.texture ?? 'smooth'} · ${lk.density}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                               border: 0, background: 'transparent', cursor: 'pointer',
                               fontFamily: 'inherit', fontSize: 10.5, color: 'inherit', padding: 0 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: '50%',
                                           background: 'var(--sage-deep, #5C6B3F)',
                                           border: '1px solid rgba(0,0,0,0.08)' }} />
                {i + 1}
              </button>
              <button type="button" onClick={() => removeLook(i)} aria-label="Remove saved look"
                      style={{ width: 16, height: 16, display: 'grid', placeItems: 'center',
                               border: 0, background: 'transparent',
                               color: 'rgba(41,38,27,.45)', cursor: 'pointer',
                               fontSize: 11, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          {looks.length < MAX_LOOKS && (
            <TweakButton label="+ Save" onClick={saveCurrent} secondary />
          )}
        </div>

        <button type="button" onClick={shuffleLook}
                title="Shuffle the look" aria-label="Shuffle the look"
                className="twk-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                         marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
          <Icon name="sparkles" size={11} color="#fff" />
          Shuffle
        </button>
      </footer>
    </>
  );
}
