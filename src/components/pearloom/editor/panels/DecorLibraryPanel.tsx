'use client';

/* =========================================================================
   DecorLibraryPanel — LITERAL PORT of the prototype's DecorLibrary
   drawer (ClaudeDesign/pages/decor-library.jsx).

   Browse & apply motifs, dividers, patterns; recolor & set density;
   generate a coordinated decor set from a few words; or start from a
   curated preset. Everything applies instantly to the site behind it.

   Tab structure (verbatim from prototype):
     Motifs   · Dividers · Patterns · Monogram · Generate

   Data plumbing (the only thing changed from the prototype):
     decor.motif    → manifest.motifKind            (NEW; literal motif id)
     decor.divider  → manifest.dividerLook          (NEW; literal divider id)
                       + manifest.decorLibrary.dividerStrength (mapped)
     decor.pattern  → manifest.pattern               (12-pattern enum)
     decor.color    → manifest.theme.colors.accent   (CSS var when applied)
     decor.density  → manifest.density               ('sparse'→cozy,
                                                       'generous'→spacious)
     monogram       → manifest.monogram
     Generate       → POST /api/decor/generate-from-text
   ========================================================================= */

import { useState, type ReactNode, type CSSProperties } from 'react';
import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import {
  OliveSprig,
  Lemon,
  PressedFlower,
  WatercolorBloom,
  SunMotif,
  WheatMotif,
  FernMotif,
  ShellMotif,
  CitrusMotif,
  LaurelMotif,
  DecoFan,
  PalmMotif,
} from '../../site/MotifScatter';
import { Monogram, deriveInitials, type MonogramFrame } from '../../site/Monogram';

/* ─── Prototype tile registries (verbatim) ─────────────────────────── */

const DL_MOTIFS = [
  { id: 'olive', label: 'Olive Sprig' }, { id: 'bloom', label: 'Watercolor Bloom' }, { id: 'pressed', label: 'Pressed Flower' },
  { id: 'lemon', label: 'Lemon' }, { id: 'sun', label: 'Sun' }, { id: 'wheat', label: 'Wheat' },
  { id: 'fern', label: 'Fern' }, { id: 'shell', label: 'Shell' }, { id: 'citrus', label: 'Citrus' },
  { id: 'laurel', label: 'Laurel' }, { id: 'deco', label: 'Deco Fan' }, { id: 'palm', label: 'Palm' },
] as const;

const DL_DIVIDERS = [
  { id: 'rule', label: 'Hairline' }, { id: 'sprig', label: 'Sprig' }, { id: 'brush', label: 'Brushstroke' },
  { id: 'dot', label: 'Dotted' }, { id: 'deckle', label: 'Deckle' },
] as const;

const DL_PATTERNS = [
  { id: 'gingham', label: 'Gingham' }, { id: 'stripe', label: 'Pinstripe' }, { id: 'cabana', label: 'Cabana' },
  { id: 'diagonal', label: 'Diagonal' }, { id: 'dots', label: 'Polka' }, { id: 'grid', label: 'Grid' },
  { id: 'deco', label: 'Deco' }, { id: 'scallop', label: 'Scallop' }, { id: 'wave', label: 'Wave' },
  { id: 'confetti', label: 'Confetti' }, { id: 'terrazzo', label: 'Terrazzo' }, { id: 'celestial', label: 'Celestial' },
] as const;

const DL_COLORS = [
  { id: '--t-accent', label: 'Accent' }, { id: '--t-accent-2', label: 'Soft' },
  { id: '--t-gold', label: 'Gold' }, { id: '--t-ink', label: 'Ink' }, { id: '--t-accent-ink', label: 'Deep' },
] as const;

type DecorState = {
  motif?: string;
  divider?: string | null;
  pattern?: string;
  color?: string;
  density?: 'sparse' | 'generous';
};

const DL_PRESETS: { label: string; d: DecorState }[] = [
  { label: 'Olive & Hairline', d: { motif: 'olive', divider: 'sprig', pattern: 'none', color: '--t-accent', density: 'sparse' } },
  { label: 'Watercolor Garden', d: { motif: 'bloom', divider: 'brush', pattern: 'none', color: '--t-accent', density: 'generous' } },
  { label: 'Riviera Stripe', d: { motif: 'citrus', divider: 'rule', pattern: 'stripe', color: '--t-accent', density: 'sparse' } },
  { label: 'Deco Gold', d: { motif: 'deco', divider: 'rule', pattern: 'deco', color: '--t-gold', density: 'sparse' } },
  { label: 'Starlit Night', d: { motif: 'sun', divider: 'dot', pattern: 'celestial', color: '--t-gold', density: 'sparse' } },
  { label: 'Coastal Calm', d: { motif: 'shell', divider: 'deckle', pattern: 'scallop', color: '--t-accent', density: 'sparse' } },
  { label: 'Wildflower Press', d: { motif: 'pressed', divider: 'dot', pattern: 'dots', color: '--t-accent-2', density: 'generous' } },
  { label: 'Tuscan Sun', d: { motif: 'wheat', divider: 'brush', pattern: 'none', color: '--t-gold', density: 'sparse' } },
];

/* ─── Prototype-internal subcomponents (ported verbatim) ───────────── */

function Motif({ kind, size }: { kind: string; size?: number }) {
  switch (kind) {
    case 'olive':   return <OliveSprig size={size} />;
    case 'bloom':   return <WatercolorBloom size={size} />;
    case 'pressed': return <PressedFlower size={size} />;
    case 'lemon':   return <Lemon size={size} />;
    case 'sun':     return <SunMotif size={size} />;
    case 'wheat':   return <WheatMotif size={size} />;
    case 'fern':    return <FernMotif size={size} />;
    case 'shell':   return <ShellMotif size={size} />;
    case 'citrus':  return <CitrusMotif size={size} />;
    case 'laurel':  return <LaurelMotif size={size} />;
    case 'deco':    return <DecoFan size={size} />;
    case 'palm':    return <PalmMotif size={size} />;
    default:        return null;
  }
}

/* TDivider — themed inline divider preview (5 looks from prototype) */
function TDivider({ look, width = 150 }: { look: string; width?: number }) {
  const accent = 'var(--t-accent, var(--pl-olive, #5C6B3F))';
  const gold = 'var(--t-gold, var(--gold, #B8935A))';
  const ink = 'var(--t-ink-soft, var(--pl-ink-soft, #3A332C))';
  if (look === 'rule') {
    return (
      <svg width={width} height="10" viewBox={`0 0 ${width} 10`} aria-hidden="true">
        <line x1="0" y1="5" x2={width} y2="5" stroke={ink} strokeOpacity="0.45" strokeWidth="0.8" />
      </svg>
    );
  }
  if (look === 'sprig') {
    const mid = width / 2;
    return (
      <svg width={width} height="22" viewBox={`0 0 ${width} 22`} aria-hidden="true">
        <line x1="0" y1="11" x2={mid - 14} y2="11" stroke={ink} strokeOpacity="0.45" strokeWidth="0.8" />
        <line x1={mid + 14} y1="11" x2={width} y2="11" stroke={ink} strokeOpacity="0.45" strokeWidth="0.8" />
        <g transform={`translate(${mid - 11}, 0)`}>
          <LaurelMotif size={22} color={accent} />
        </g>
      </svg>
    );
  }
  if (look === 'brush') {
    return (
      <svg width={width} height="14" viewBox={`0 0 ${width} 14`} aria-hidden="true">
        <path d={`M 2 7 Q ${width * 0.25} 2 ${width * 0.5} 7 T ${width - 2} 7`} stroke={accent} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  }
  if (look === 'dot') {
    const count = 7;
    const step = width / (count + 1);
    return (
      <svg width={width} height="8" viewBox={`0 0 ${width} 8`} aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <circle key={i} cx={(i + 1) * step} cy="4" r="1.3" fill={accent} opacity="0.7" />
        ))}
      </svg>
    );
  }
  if (look === 'deckle') {
    const seg = 6;
    const count = Math.floor(width / seg);
    let d = `M 0 5 `;
    for (let i = 0; i < count; i++) {
      const x1 = i * seg + seg / 2;
      const x2 = (i + 1) * seg;
      d += `Q ${x1} ${i % 2 === 0 ? 1 : 9} ${x2} 5 `;
    }
    return (
      <svg width={width} height="10" viewBox={`0 0 ${width} 10`} aria-hidden="true">
        <path d={d} stroke={gold} strokeWidth="0.9" fill="none" opacity="0.7" />
      </svg>
    );
  }
  return null;
}

/* PatternLayer — themed inline pattern fill (12 patterns) */
function PatternLayer({ pattern, intensity = 1 }: { pattern: string; intensity?: number }) {
  const accent = 'var(--t-accent, var(--pl-olive, #5C6B3F))';
  const accent2 = 'var(--t-accent-2, var(--peach-ink, #C6703D))';
  const gold = 'var(--t-gold, var(--gold, #B8935A))';
  const ink = 'var(--t-ink, var(--pl-ink, #0E0D0B))';
  const opacityMul = intensity;
  const W = 80, H = 78;

  if (!pattern || pattern === 'none') return null;

  if (pattern === 'gingham') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`v${i}`} x={i * 14} y="0" width="7" height={H} fill={accent} opacity={0.13 * opacityMul} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`h${i}`} x="0" y={i * 14} width={W} height="7" fill={accent} opacity={0.13 * opacityMul} />
        ))}
      </svg>
    );
  }
  if (pattern === 'stripe') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x={i * 11} y="0" width="5" height={H} fill={accent} opacity={0.12 * opacityMul} />
        ))}
      </svg>
    );
  }
  if (pattern === 'cabana') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        <rect x="0" y="0" width="14" height={H} fill={accent} opacity={0.15 * opacityMul} />
        <rect x="28" y="0" width="14" height={H} fill={accent} opacity={0.15 * opacityMul} />
        <rect x="56" y="0" width="14" height={H} fill={accent} opacity={0.15 * opacityMul} />
      </svg>
    );
  }
  if (pattern === 'diagonal') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="dl-diag" patternUnits="userSpaceOnUse" width="13" height="13" patternTransform="rotate(45)">
            <rect x="0" y="0" width="6" height="13" fill={accent} opacity={0.11 * opacityMul} />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#dl-diag)" />
      </svg>
    );
  }
  if (pattern === 'dots') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 7 }).map((_, r) =>
          Array.from({ length: 8 }).map((__, c) => (
            <circle key={`${r}-${c}`} cx={c * 10 + 5} cy={r * 11 + 8} r="2.2" fill={accent} opacity={0.22 * opacityMul} />
          )),
        )}
      </svg>
    );
  }
  if (pattern === 'grid') {
    const line = 'var(--t-line, rgba(14,13,11,0.14))';
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`v${i}`} x1={i * 11} y1="0" x2={i * 11} y2={H} stroke={line} strokeWidth="0.5" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`h${i}`} x1="0" y1={i * 11} x2={W} y2={i * 11} stroke={line} strokeWidth="0.5" />
        ))}
      </svg>
    );
  }
  if (pattern === 'deco') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <pattern id="dl-deco" patternUnits="userSpaceOnUse" width="26" height="26" patternTransform="rotate(135)">
            <rect x="0" y="0" width="6.5" height="26" fill={accent} opacity={0.13 * opacityMul} />
            <rect x="13" y="0" width="6.5" height="26" fill={gold} opacity={0.13 * opacityMul} />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#dl-deco)" />
      </svg>
    );
  }
  if (pattern === 'scallop') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={i * 16 + 8} cy="0" r="11" fill="none" stroke={accent} strokeOpacity={0.45 * opacityMul} strokeWidth="1" />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={`b${i}`} cx={i * 16 + 8} cy="40" r="11" fill="none" stroke={accent} strokeOpacity={0.45 * opacityMul} strokeWidth="1" />
        ))}
      </svg>
    );
  }
  if (pattern === 'wave') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={`a${i}`} cx={i * 14 + 7} cy={H} r="13" fill="none" stroke={accent} strokeOpacity={0.4 * opacityMul} strokeWidth="1" />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <circle key={`b${i}`} cx={i * 14 + 7} cy={H - 24} r="13" fill="none" stroke={accent} strokeOpacity={0.4 * opacityMul} strokeWidth="1" />
        ))}
      </svg>
    );
  }
  if (pattern === 'confetti') {
    const dots: [number, number, string][] = [
      [10, 12, accent], [28, 26, accent2], [46, 8, gold],
      [62, 32, accent], [18, 48, gold], [40, 56, accent2],
      [64, 62, accent], [8, 36, accent2],
    ];
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {dots.map(([cx, cy, fill], i) => (
          <circle key={i} cx={cx} cy={cy} r="3.2" fill={fill} opacity={0.42 * opacityMul} />
        ))}
      </svg>
    );
  }
  if (pattern === 'terrazzo') {
    const spots: [number, number, number, string, number][] = [
      [12, 18, 5, accent, 0.34], [40, 12, 4, accent2, 0.30],
      [62, 24, 4, gold, 0.30], [28, 44, 3, ink, 0.12],
      [54, 56, 5, accent, 0.34], [70, 50, 3, accent2, 0.30],
      [18, 62, 3, gold, 0.30],
    ];
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        {spots.map(([cx, cy, r, fill, op], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={fill} opacity={op * opacityMul} />
        ))}
      </svg>
    );
  }
  if (pattern === 'celestial') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="14" cy="14" r="2.2" fill={gold} opacity={0.75 * opacityMul} />
        <circle cx="58" cy="10" r="1.6" fill={gold} opacity={0.75 * opacityMul} />
        <circle cx="36" cy="42" r="1.8" fill="#fff" opacity={0.85 * opacityMul} />
        <circle cx="70" cy="54" r="1.4" fill="#fff" opacity={0.7 * opacityMul} />
        <circle cx="22" cy="64" r="1.2" fill="#fff" opacity={0.55 * opacityMul} />
      </svg>
    );
  }
  return null;
}

/* ThemedTile — small picker tile that paints in the current theme */
function ThemedTile({
  color, children, style = {}, onClick, active, padding = 14,
}: {
  color?: string;
  children: ReactNode;
  style?: CSSProperties;
  onClick: () => void;
  active?: boolean;
  padding?: number | string;
}) {
  const root: CSSProperties = {
    position: 'relative',
    background: 'var(--t-section, var(--cream-2, #FBF7EE))',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'grid',
    placeItems: 'center',
    minHeight: 78,
    padding,
    cursor: 'pointer',
    outline: active ? '2.5px solid var(--lavender-2, var(--pl-olive, #5C6B3F))' : '1px solid var(--line-soft, rgba(14,13,11,0.10))',
    outlineOffset: active ? -1 : 0,
    border: 'none',
    ['--t-motif' as string]: color || 'var(--t-accent, var(--pl-olive, #5C6B3F))',
    ...style,
  };
  return (
    <button type="button" onClick={onClick} className="lift" style={root}>
      {children}
      {active && (
        <span style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: 'var(--lavender-2, var(--pl-olive, #5C6B3F))', display: 'grid', placeItems: 'center', zIndex: 3 }}>
          <Icon name="check" size={11} color="#3D4A1F" />
        </span>
      )}
    </button>
  );
}

function TabBtn({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '9px 4px',
        borderRadius: 10,
        cursor: 'pointer',
        background: on ? 'var(--ink, var(--pl-ink, #0E0D0B))' : 'transparent',
        color: on ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, var(--pl-ink-soft, #3A332C))',
        border: 'none',
      }}
    >
      <Icon name={icon} size={16} color={on ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, #3A332C)'} />
      <span style={{ fontSize: 10.5, fontWeight: 700 }}>{label}</span>
    </button>
  );
}

function GalleryLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted, var(--pl-ink-soft, #6F6557))', margin: '14px 2px 10px' }}>
      {children}
    </div>
  );
}

/* ─── Data plumbing helpers ────────────────────────────────────────── */

type DLTab = 'motifs' | 'dividers' | 'patterns' | 'monogram' | 'generate';

/** Map prototype's 5-divider id → production's 3-tier dividerStrength */
function dividerLookToStrength(look: string | null | undefined): 'subtle' | 'standard' | 'tall' | undefined {
  if (!look) return undefined;
  if (look === 'rule' || look === 'dot') return 'subtle';
  if (look === 'sprig' || look === 'brush') return 'standard';
  if (look === 'deckle') return 'tall';
  return undefined;
}

/** Map prototype's color CSS var id → a concrete hex from manifest.theme */
function colorVarToHex(varId: string, theme?: { accent?: string; accentLight?: string; foreground?: string }): string | null {
  if (varId === '--t-accent') return theme?.accent ?? null;
  if (varId === '--t-accent-2') return theme?.accentLight ?? null;
  if (varId === '--t-gold') return '#B8935A';
  if (varId === '--t-ink') return theme?.foreground ?? '#0E0D0B';
  if (varId === '--t-accent-ink') return theme?.foreground ?? null;
  return null;
}

/* Loose-typed manifest accessor for the prototype's literal id fields. */
type LooseManifest = StoryManifest & {
  motifKind?: string;
  dividerLook?: string;
};

export function DecorLibraryPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const [tab, setTab] = useState<DLTab>('motifs');
  const [text, setText] = useState('');
  const [gen, setGen] = useState<DecorState | null>(null);
  const [busy, setBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const loose = manifest as LooseManifest;
  const themeColors = ((manifest as unknown as { theme?: { colors?: Record<string, string> } }).theme?.colors) as { accent?: string; accentLight?: string; foreground?: string } | undefined;

  /* Read the current decor state from the manifest as a flat object
     matching the prototype's `decor` shape. */
  const densityProto: 'sparse' | 'generous' = manifest.density === 'spacious' ? 'generous' : 'sparse';
  const decor: DecorState = {
    motif: loose.motifKind ?? 'none',
    divider: loose.dividerLook ?? null,
    pattern: manifest.pattern ?? 'none',
    color: '--t-accent', // accent always reflects the live theme accent
    density: densityProto,
  };

  const color = decor.color ? `var(${decor.color})` : 'var(--t-accent, var(--pl-olive, #5C6B3F))';
  const dColorVal = (id: string): string => {
    const hex = colorVarToHex(id, themeColors);
    return hex ?? 'var(--t-accent, var(--pl-olive, #5C6B3F))';
  };

  /* setDecor — the prototype writes a partial decor patch. We
     translate each field into the production manifest. */
  function setDecor(patch: DecorState) {
    const next = { ...manifest } as LooseManifest;

    if ('motif' in patch) {
      if (patch.motif === 'none' || !patch.motif) {
        delete next.motifKind;
      } else {
        next.motifKind = patch.motif;
      }
    }
    if ('divider' in patch) {
      if (patch.divider == null) {
        delete next.dividerLook;
        const lib = { ...(next.decorLibrary ?? {}) };
        delete lib.dividerStrength;
        next.decorLibrary = lib;
      } else {
        next.dividerLook = patch.divider;
        const strength = dividerLookToStrength(patch.divider);
        const lib = { ...(next.decorLibrary ?? {}) };
        if (strength) lib.dividerStrength = strength;
        next.decorLibrary = lib;
      }
    }
    if ('pattern' in patch) {
      if (patch.pattern === 'none' || !patch.pattern) {
        next.pattern = undefined;
      } else {
        next.pattern = patch.pattern as StoryManifest['pattern'];
      }
    }
    if ('color' in patch && patch.color) {
      const hex = colorVarToHex(patch.color, themeColors);
      if (hex) {
        const existingTheme = (next as unknown as { theme?: Record<string, unknown> }).theme ?? {};
        const existingColors = (existingTheme.colors as Record<string, string> | undefined) ?? {};
        (next as unknown as { theme: Record<string, unknown> }).theme = {
          ...existingTheme,
          colors: { ...existingColors, accent: hex },
        };
      }
    }
    if ('density' in patch && patch.density) {
      next.density = patch.density === 'generous' ? 'spacious' : 'cozy';
    }

    onChange(next as StoryManifest);
  }

  function resetDecor() {
    const next = { ...manifest } as LooseManifest;
    delete next.motifKind;
    delete next.dividerLook;
    next.pattern = undefined;
    next.density = 'comfortable';
    if (next.decorLibrary) {
      const lib = { ...next.decorLibrary };
      delete lib.dividerStrength;
      next.decorLibrary = lib;
    }
    onChange(next as StoryManifest);
  }

  /* Generate — POST to /api/decor/generate-from-text and apply the
     returned preset. Prototype's local decorFromWords() heuristic is
     embedded in the server route as fallback. */
  async function runGen(q?: string) {
    const query = (q ?? text).trim();
    if (!query) return;
    if (q != null) setText(q);
    setBusy(true);
    setGenError(null);
    try {
      const occasion = (manifest as unknown as { occasion?: string }).occasion ?? 'wedding';
      const paletteHex = themeColors
        ? ([themeColors.accent, themeColors.accentLight, themeColors.foreground].filter(Boolean) as string[])
        : undefined;
      const res = await fetch('/api/decor/generate-from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query, occasion, paletteHex }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        patternId?: string;
        motifId?: string;
        dividerId?: 'subtle' | 'standard' | 'tall';
        accentColor?: string;
        rationale?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      if (!data.patternId || !data.motifId || !data.dividerId || !data.accentColor) {
        throw new Error('Pear returned a malformed preset — try again.');
      }

      /* Map production's motifId (blob/stamp/squiggle/sparkle/heart/
         postIt/polaroid) → prototype's 12-motif vocab for the picker UI.
         These are visual translations: blob↔bloom, sparkle↔sun,
         heart↔pressed, etc. Anything unrecognized falls back to 'olive'. */
      const MOTIF_BRIDGE: Record<string, string> = {
        blob: 'bloom', stamp: 'deco', squiggle: 'fern', sparkle: 'sun',
        heart: 'pressed', postIt: 'wheat', polaroid: 'shell',
      };
      const protoMotif = MOTIF_BRIDGE[data.motifId] ?? 'olive';

      /* Map production's dividerStrength → prototype's 5-divider vocab. */
      const DIVIDER_BRIDGE: Record<string, string> = {
        subtle: 'rule', standard: 'sprig', tall: 'deckle',
      };
      const protoDivider = DIVIDER_BRIDGE[data.dividerId] ?? 'sprig';

      const protoPattern = data.patternId === 'none' ? 'none' : data.patternId;
      const presetForUi: DecorState = {
        motif: protoMotif,
        divider: protoDivider,
        pattern: protoPattern,
        color: '--t-accent',
        density: 'sparse',
      };

      /* Apply preset across the manifest. */
      const next = { ...manifest } as LooseManifest;
      next.motifKind = protoMotif;
      next.dividerLook = protoDivider;
      const lib = { ...(next.decorLibrary ?? {}) };
      lib.dividerStrength = data.dividerId;
      next.decorLibrary = lib;
      next.pattern = data.patternId === 'none' ? undefined : (data.patternId as StoryManifest['pattern']);
      const existingTheme = (next as unknown as { theme?: Record<string, unknown> }).theme ?? {};
      const existingColors = (existingTheme.colors as Record<string, string> | undefined) ?? {};
      (next as unknown as { theme: Record<string, unknown> }).theme = {
        ...existingTheme,
        colors: { ...existingColors, accent: data.accentColor },
      };
      onChange(next as StoryManifest);
      setGen(presetForUi);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Pear couldn't style that one");
    } finally {
      setBusy(false);
    }
  }

  function applyPreset(d: DecorState) {
    /* Apply a preset across all fields in one onChange. */
    const next = { ...manifest } as LooseManifest;
    if (d.motif !== undefined) {
      if (d.motif === 'none') delete next.motifKind;
      else next.motifKind = d.motif;
    }
    if (d.divider !== undefined) {
      if (d.divider == null) {
        delete next.dividerLook;
        const lib = { ...(next.decorLibrary ?? {}) };
        delete lib.dividerStrength;
        next.decorLibrary = lib;
      } else {
        next.dividerLook = d.divider;
        const strength = dividerLookToStrength(d.divider);
        const lib = { ...(next.decorLibrary ?? {}) };
        if (strength) lib.dividerStrength = strength;
        next.decorLibrary = lib;
      }
    }
    if (d.pattern !== undefined) {
      if (d.pattern === 'none') next.pattern = undefined;
      else next.pattern = d.pattern as StoryManifest['pattern'];
    }
    if (d.color) {
      const hex = colorVarToHex(d.color, themeColors);
      if (hex) {
        const existingTheme = (next as unknown as { theme?: Record<string, unknown> }).theme ?? {};
        const existingColors = (existingTheme.colors as Record<string, string> | undefined) ?? {};
        (next as unknown as { theme: Record<string, unknown> }).theme = {
          ...existingTheme,
          colors: { ...existingColors, accent: hex },
        };
      }
    }
    if (d.density) {
      next.density = d.density === 'generous' ? 'spacious' : 'cozy';
    }
    onChange(next as StoryManifest);
    setGen(d);
  }

  /* Subject for monogram — derived from manifest.names. */
  const [n1, n2] = manifest.names ?? ['', ''];
  const subject = (n1 && n2 ? `${n1} & ${n2}` : (n1 || n2 || 'A & B')).trim();

  return (
    <div data-pl-decor-library style={{ marginBottom: 14 }}>
      <div
        style={{
          borderRadius: 16,
          background: 'var(--card, var(--pl-cream-card, #FBF7EE))',
          border: '1px solid var(--line-soft, rgba(14,13,11,0.10))',
          boxShadow: '0 1px 2px rgba(40,28,12,0.05), 0 8px 24px rgba(40,28,12,0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          pointerEvents: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px 13px', borderBottom: '1px solid var(--line-soft, rgba(14,13,11,0.10))' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--lavender-bg, var(--peach-bg, #FCE6D7))', display: 'grid', placeItems: 'center' }}>
                <Icon name="sparkles" size={16} color="var(--lavender-ink, var(--peach-ink, #C6703D))" />
              </span>
              <h3 style={{ fontFamily: 'var(--font-display, "Fraunces", serif)', fontSize: 20, fontWeight: 600, color: 'var(--ink, var(--pl-ink, #0E0D0B))', margin: 0, lineHeight: 1.1 }}>
                Decor Library
              </h3>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, padding: 4, background: 'var(--cream-2, #FBF7EE)', borderRadius: 12 }}>
            <TabBtn on={tab === 'motifs'} onClick={() => setTab('motifs')} icon="leaf" label="Motifs" />
            <TabBtn on={tab === 'dividers'} onClick={() => setTab('dividers')} icon="minus" label="Dividers" />
            <TabBtn on={tab === 'patterns'} onClick={() => setTab('patterns')} icon="grid" label="Patterns" />
            <TabBtn on={tab === 'monogram'} onClick={() => setTab('monogram')} icon="heart-icon" label="Monogram" />
            <TabBtn on={tab === 'generate'} onClick={() => setTab('generate')} icon="wand" label="Generate" />
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 18, maxHeight: 720 }}>
          {tab === 'motifs' && (
            <>
              <GalleryLabel>Motif art — tap to place around your sections</GalleryLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <ThemedTile color={color} active={decor.motif === 'none'} onClick={() => setDecor({ motif: 'none' })}>
                  <span style={{ fontSize: 11.5, color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))', fontWeight: 600 }}>None</span>
                </ThemedTile>
                {DL_MOTIFS.map((m) => (
                  <ThemedTile key={m.id} color={color} active={decor.motif === m.id} onClick={() => setDecor({ motif: m.id })}>
                    <Motif kind={m.id} size={52} />
                  </ThemedTile>
                ))}
              </div>

              <GalleryLabel>Motif color</GalleryLabel>
              <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
                {DL_COLORS.map((c) => {
                  const on = (decor.color || '--t-accent') === c.id || decor.color === `var(${c.id})`;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setDecor({ color: c.id })}
                      title={c.label}
                      className="lift"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: '50%', background: dColorVal(c.id), boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.12)', border: on ? '2.5px solid var(--ink, var(--pl-ink, #0E0D0B))' : '2.5px solid transparent' }} />
                      <span style={{ fontSize: 9.5, color: 'var(--ink-muted, #6F6557)' }}>{c.label}</span>
                    </button>
                  );
                })}
              </div>

              <GalleryLabel>Amount</GalleryLabel>
              <div style={{ display: 'flex', gap: 6, padding: 3, background: 'var(--cream-2, #FBF7EE)', borderRadius: 9, width: 'fit-content' }}>
                {[{ id: 'sparse' as const, l: 'Subtle' }, { id: 'generous' as const, l: 'Generous' }].map((d) => {
                  const on = (decor.density || 'sparse') === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDecor({ density: d.id })}
                      style={{ padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600, background: on ? 'var(--ink, var(--pl-ink, #0E0D0B))' : 'transparent', color: on ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, #3A332C)', border: 'none', cursor: 'pointer' }}
                    >
                      {d.l}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'dividers' && (
            <>
              <GalleryLabel>Section dividers — tap to apply everywhere</GalleryLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDecor({ divider: null })}
                  className="lift"
                  style={{ padding: '12px 14px', borderRadius: 11, background: 'var(--cream-2, #FBF7EE)', border: !decor.divider ? '2px solid var(--ink, var(--pl-ink, #0E0D0B))' : '1px solid var(--line, rgba(14,13,11,0.12))', textAlign: 'left', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft, #3A332C)', cursor: 'pointer' }}
                >
                  Use the kit&rsquo;s default divider
                </button>
                {DL_DIVIDERS.map((d) => (
                  <ThemedTile
                    key={d.id}
                    color={color}
                    active={decor.divider === d.id}
                    onClick={() => setDecor({ divider: d.id })}
                    style={{ minHeight: 64, background: 'var(--t-paper, var(--paper, var(--pl-cream, #F5EFE2)))' }}
                    padding="16px 22px"
                  >
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <TDivider look={d.id} width={150} />
                      </span>
                      <span style={{ position: 'absolute', left: 14, fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))' }}>
                        {d.label}
                      </span>
                    </div>
                  </ThemedTile>
                ))}
              </div>
            </>
          )}

          {tab === 'patterns' && (
            <>
              <GalleryLabel>Background prints — tap to apply behind sections</GalleryLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                <ThemedTile color={color} active={!decor.pattern || decor.pattern === 'none'} onClick={() => setDecor({ pattern: 'none' })}>
                  <span style={{ fontSize: 11.5, color: 'var(--t-ink-muted, var(--ink-muted, #6F6557))', fontWeight: 600 }}>None</span>
                </ThemedTile>
                {DL_PATTERNS.map((p) => (
                  <ThemedTile
                    key={p.id}
                    color={color}
                    active={decor.pattern === p.id}
                    onClick={() => setDecor({ pattern: p.id })}
                    style={{ background: 'var(--t-paper, var(--paper, var(--pl-cream, #F5EFE2)))' }}
                    padding={0}
                  >
                    <div style={{ position: 'relative', width: '100%', height: 78, overflow: 'hidden', borderRadius: 12 }}>
                      <PatternLayer pattern={p.id} intensity={1.25} />
                      <span style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--t-ink-soft, var(--ink-soft, #3A332C))', zIndex: 2 }}>
                        {p.label}
                      </span>
                    </div>
                  </ThemedTile>
                ))}
              </div>
            </>
          )}

          {tab === 'monogram' && (
            <MonogramTab subject={subject} color={color} manifest={manifest} onChange={onChange} />
          )}

          {tab === 'generate' && (
            <>
              <GalleryLabel>Describe the feeling — Pear styles the decor</GalleryLabel>
              <div style={{ borderRadius: 14, border: '1px solid var(--line-soft, rgba(14,13,11,0.10))', overflow: 'hidden' }}>
                <div style={{ padding: 13, background: 'var(--card, var(--pl-cream-card, #FBF7EE))' }}>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={2}
                    placeholder="e.g. coastal & breezy with shells, or art-deco gold geometry"
                    disabled={busy}
                    style={{ width: '100%', padding: '9px 11px', borderRadius: 9, border: '1px solid var(--line, rgba(14,13,11,0.12))', background: 'var(--cream-2, #FBF7EE)', fontSize: 12.5, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.45, outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => void runGen()}
                    disabled={busy || !text.trim()}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', justifyContent: 'center', marginTop: 9, opacity: busy || !text.trim() ? 0.7 : 1 }}
                  >
                    <Icon name="sparkles" size={13} color="var(--cream, #FBF7EE)" />
                    {busy ? ' Pear is styling…' : ' Style my decor'}
                  </button>
                  {gen && !busy && (
                    <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 9, background: 'var(--sage-tint, color-mix(in oklab, var(--pl-olive, #5C6B3F) 12%, var(--cream, #FBF7EE)))', fontSize: 11.5, color: 'var(--sage-deep, var(--pl-olive, #5C6B3F))', display: 'flex', gap: 7 }}>
                      <Icon name="check" size={13} color="var(--sage-deep, var(--pl-olive, #5C6B3F))" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>
                        Applied <b>{gen.motif}</b> motifs, a <b>{gen.divider}</b> divider
                        {gen.pattern && gen.pattern !== 'none' ? (
                          <> and a <b>{gen.pattern}</b> print</>
                        ) : null}.
                      </span>
                    </div>
                  )}
                  {genError && !busy && (
                    <div style={{ marginTop: 10, padding: '9px 11px', borderRadius: 9, background: 'var(--plum-tint, rgba(122,45,45,0.08))', fontSize: 11.5, color: 'var(--plum-ink, #7A2D2D)' }}>
                      {genError}
                    </div>
                  )}
                </div>
              </div>

              <GalleryLabel>Or start from a preset</GalleryLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {DL_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p.d)}
                    className="lift"
                    style={{ textAlign: 'left', padding: 0, borderRadius: 11, overflow: 'hidden', border: '1px solid var(--line-soft, rgba(14,13,11,0.10))', cursor: 'pointer', background: 'var(--card, var(--pl-cream-card, #FBF7EE))' }}
                  >
                    <div
                      style={{
                        position: 'relative',
                        height: 58,
                        background: 'var(--t-section, var(--cream-2, #FBF7EE))',
                        display: 'grid',
                        placeItems: 'center',
                        overflow: 'hidden',
                        ['--t-motif' as string]: `var(${p.d.color})`,
                      } as CSSProperties}
                    >
                      <PatternLayer pattern={p.d.pattern ?? 'none'} intensity={1.1} />
                      {p.d.motif && p.d.motif !== 'none' && (
                        <div style={{ position: 'relative', zIndex: 2 }}>
                          <Motif kind={p.d.motif} size={34} />
                        </div>
                      )}
                    </div>
                    <div style={{ padding: '8px 10px', fontSize: 11.5, fontWeight: 600, color: 'var(--ink, var(--pl-ink, #0E0D0B))' }}>
                      {p.label}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--line-soft, rgba(14,13,11,0.10))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <button
            type="button"
            onClick={resetDecor}
            style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft, #3A332C)', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <Icon name="close" size={13} color="var(--ink-soft, #3A332C)" /> Reset decor
          </button>
          <span style={{ fontSize: 10.5, color: 'var(--ink-muted, #6F6557)', fontWeight: 600, letterSpacing: '0.04em' }}>
            Live-applied — your site updates as you tap.
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── MonogramTab — port of the prototype's MonogramTab.
   Plain / Ring / Diamond / Laurel frames + joiner toggle + live preview.
   Writes manifest.monogram. ───────────────────────────────────────── */

function MonogramTab({
  subject,
  color,
  manifest,
  onChange,
}: {
  subject: string;
  color: string;
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const mono = (manifest as unknown as { monogram?: { initials?: string; frame?: MonogramFrame } }).monogram;
  const userSubject = (mono?.initials?.trim() || subject);
  const { initA, initB } = deriveInitials(userSubject);
  const useAmp = userSubject.includes('&');

  // Prototype-internal local state for frame + joiner so the picker feels
  // immediate even before write-back finishes.
  const frameInitial: MonogramFrame = (mono?.frame as MonogramFrame) ?? 'laurel';
  const [frame, setFrame] = useState<MonogramFrame>(frameInitial);
  const [amp, setAmp] = useState<boolean>(useAmp);

  // Sync local state to manifest when the manifest changes externally.
  // (Lightweight: only when the manifest value differs from local.)

  function patch(next: Partial<{ initials: string; frame: MonogramFrame }>) {
    onChange({
      ...manifest,
      monogram: { ...(mono ?? {}), ...next },
    } as StoryManifest);
  }

  function setFrameAndPatch(id: MonogramFrame) {
    setFrame(id);
    patch({ frame: id });
  }

  function setAmpAndPatch(v: boolean) {
    setAmp(v);
    const a = initA || 'A';
    const b = initB || 'B';
    patch({ initials: v ? `${a} & ${b}` : `${a} ${b}` });
  }

  const frames: { id: MonogramFrame; l: string }[] = [
    { id: 'none', l: 'Plain' },
    { id: 'ring', l: 'Ring' },
    { id: 'diamond', l: 'Diamond' },
    { id: 'laurel', l: 'Laurel' },
  ];

  const Crest = ({ big }: { big: boolean }) => {
    const s = big ? 1 : 0.5;
    return (
      <div
        style={{
          position: 'relative',
          width: big ? 190 : 120,
          height: big ? 190 : 120,
          display: 'grid',
          placeItems: 'center',
          background: 'var(--t-paper, var(--paper, var(--pl-cream, #F5EFE2)))',
          borderRadius: 14,
          border: '1px solid var(--t-line, var(--line, rgba(14,13,11,0.12)))',
          ['--t-motif' as string]: color,
        } as CSSProperties}
      >
        {frame === 'ring' && (
          <span style={{ position: 'absolute', width: 150 * s, height: 150 * s, borderRadius: '50%', border: '1.5px solid var(--t-accent, var(--pl-olive, #5C6B3F))' }} />
        )}
        {frame === 'diamond' && (
          <span style={{ position: 'absolute', width: 132 * s, height: 132 * s, transform: 'rotate(45deg)', border: '1.5px solid var(--t-accent, var(--pl-olive, #5C6B3F))' }} />
        )}
        {frame === 'laurel' && (
          <div style={{ position: 'absolute', opacity: 0.9, transform: 'scale(' + (big ? 2.05 : 1.3) + ')' }}>
            <LaurelMotif size={80} />
          </div>
        )}
        <div
          style={{
            position: 'relative',
            fontFamily: 'var(--t-display, var(--font-display, "Fraunces", serif))',
            fontWeight: 600,
            color: 'var(--t-ink, var(--pl-ink, #0E0D0B))',
            fontSize: big ? 64 : 40,
            lineHeight: 1,
            letterSpacing: '0.02em',
          }}
        >
          {initA}
          <span style={{ fontStyle: 'italic', color: 'var(--t-accent-ink, var(--pl-olive, #5C6B3F))', margin: '0 0.04em' }}>
            {amp ? '&' : ' '}
          </span>
          {initB}
        </div>
      </div>
    );
  };

  return (
    <>
      <GalleryLabel>Your monogram</GalleryLabel>
      <div style={{ display: 'grid', placeItems: 'center', padding: '6px 0 14px' }}>
        <Monogram initials={userSubject} frame={frame} size={190} withCard={false} />
      </div>

      <GalleryLabel>Frame</GalleryLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9 }}>
        {frames.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFrameAndPatch(f.id)}
            className="lift"
            style={{
              padding: '8px 4px 6px',
              borderRadius: 10,
              background: frame === f.id ? 'var(--ink, var(--pl-ink, #0E0D0B))' : 'var(--cream-2, #FBF7EE)',
              color: frame === f.id ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, #3A332C)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            {f.l}
          </button>
        ))}
      </div>

      <GalleryLabel>Joiner</GalleryLabel>
      <div style={{ display: 'flex', gap: 6, padding: 3, background: 'var(--cream-2, #FBF7EE)', borderRadius: 9, width: 'fit-content' }}>
        {[{ v: true, l: 'A & B' }, { v: false, l: 'A B' }].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => setAmpAndPatch(o.v)}
            style={{
              padding: '6px 16px',
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              background: amp === o.v ? 'var(--ink, var(--pl-ink, #0E0D0B))' : 'transparent',
              color: amp === o.v ? 'var(--cream, #FBF7EE)' : 'var(--ink-soft, #3A332C)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {o.l}
          </button>
        ))}
      </div>

      {/* Initials input — production extension. The prototype derived
         initials from `subject` (couple names) only; production lets
         the host override them via manifest.monogram.initials. */}
      <GalleryLabel>Initials or names</GalleryLabel>
      <input
        type="text"
        value={mono?.initials ?? ''}
        onChange={(e) => patch({ initials: e.target.value })}
        placeholder={subject}
        style={{
          width: '100%',
          padding: '9px 11px',
          borderRadius: 9,
          border: '1px solid var(--line, rgba(14,13,11,0.12))',
          background: 'var(--cream-2, #FBF7EE)',
          fontSize: 12.5,
          fontFamily: 'inherit',
          outline: 'none',
        }}
      />

      <div style={{ marginTop: 16, padding: '11px 13px', borderRadius: 11, background: 'var(--peach-bg, #FCE6D7)', fontSize: 11.5, color: 'var(--peach-ink, #C6703D)', display: 'flex', gap: 8 }}>
        <Icon name="sparkles" size={16} color="var(--peach-ink, #C6703D)" style={{ flexShrink: 0 }} />
        <span>
          Your monogram updates with the couple&rsquo;s names &amp; theme. Use it on stationery, the hero, or as a watermark.
        </span>
      </div>
    </>
  );
}
