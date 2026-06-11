'use client';

// ─────────────────────────────────────────────────────────────
// Studio rails:
//   - StudioTopbar: brand · stationery type tabs · view toggle · Send
//   - DraftsRail (left): Pear's 3 drafts + asset palette + send history
//   - RemixRail (right): Design / Copy / Pear tabs
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PALETTES, FONT_PAIRS, LAYOUTS, MOTIFS, COPY_TONES,
  type StationeryType, type CardView, type StudioContent, type StudioDraft, type AssetEntry,
} from './studio-constants';
import type { StudioState, SetStudioField } from './useStudioState';
import { Pear, Stamp, Squiggle, Icon } from '../motifs';
import { AssetGlyph } from './StudioAssetGlyph';
import { PearThinking } from '../pear-thinking';

interface RailProps {
  state: StudioState;
  setField: SetStudioField;
  content: StudioContent;
  nameA: string;
  nameB: string;
  /** Action callbacks owned by the parent app. */
  onPickDraft: (draft: StudioDraft) => void;
  onAskPearForDraft?: () => Promise<void>;
  onAskPearForAsset?: (kind: AssetEntry['kind']) => Promise<void>;
  /** Opens the Suite Phase 3 proof sheet overlay ("Pear pressed
   *  six proofs"). Sync — the overlay owns its own fetch. */
  onOpenProofSheet?: () => void;
  onRewriteField?: (fieldId: string, hint: string) => Promise<void>;
  onMatchSiteTheme?: () => Promise<void>;
  /** Pear suggests a complementary motif + palette pair. Sync,
   *  no API — see suggestPair() in StudioApp. */
  onSuggestPair?: () => void;
  onSavingNudge?: string | null;
  /** AI generation status — surfaces as a "Pear is drafting…"
   *  banner near the rail header. */
  aiBusy?: boolean;
  /** Send-history live counts. */
  sendStats?: { sent?: number; ready?: number; total?: number };
  /** Which inspector tab the RemixRail opens on. The mobile
   *  bottom bar's Design / Words buttons mount the rail inside a
   *  bottom sheet keyed on this, so each button lands on its tab
   *  (Pear stays reachable via the in-rail tab strip). Desktop
   *  never passes it — default stays 'design'. */
  initialTab?: 'design' | 'copy' | 'pear';
}

interface TopbarProps {
  state: StudioState;
  setField: SetStudioField;
  nameA: string;
  nameB: string;
  dateShort: string;
  savedAt?: number | null;
  saving?: boolean;
  saveError?: boolean;
  onRetrySave?: () => Promise<void> | void;
  /** Phone-sized viewport — collapses the three-cluster bar to
   *  back + title + Send on top, with the stationery-type tabs
   *  in a scrollable second row. The view toggle and Export
   *  collapse (the canvas pager pill flips sides; Print / PDF
   *  stays reachable via See pair → Print). */
  compact?: boolean;
}

const TYPE_TABS: Array<{ id: StationeryType; label: string; icon: string; sub: string }> = [
  { id: 'std',    label: 'Save the date', icon: 'calendar-check', sub: 'Send 6–9 months out' },
  { id: 'invite', label: 'Invitation',    icon: 'mail',           sub: 'Send 8 weeks out' },
  { id: 'thanks', label: 'Thank-you',     icon: 'heart-icon',     sub: 'Send the day after' },
];

/** Pear's read-on-this — short character note per layout. */
const LAYOUT_CHARACTER: Record<string, string> = {
  classic: 'balanced and gallant',
  asym:    'editorial and unbothered',
  photo:   'personal and present',
  script:  'intimate and handwritten',
  minimal: 'spare and modern',
};

/** Pear's read-on-this — neighbourhood per palette. */
const PALETTE_NEIGHBOURHOOD: Record<string, string> = {
  lavender: 'editorial-classic',
  sage:     'botanical-garden',
  peach:    'Mediterranean-warm',
  cream:    'heritage-letterpress',
  twilight: 'evening-editorial',
  rose:     'tender-romantic',
};

export function StudioTopbar({ state, setField, nameA, nameB, dateShort, savedAt, saving, saveError, onRetrySave, compact }: TopbarProps) {
  // savedAt is null until the host's first edit lands. Until
  // then the manifest as loaded IS persisted, so "Unsaved" was
  // misleading — show no label on a clean session.
  // Tick every 5s so the relative-time label ("Saved 12s ago")
  // doesn't freeze. Stops ticking once we cross an hour or
  // when there's no savedAt to format.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    const fresh = Date.now() - savedAt < 3_600_000;
    if (!fresh) return;
    const id = setInterval(() => setTick((t) => t + 1), 5_000);
    return () => clearInterval(id);
  }, [savedAt]);

  // saveError wins over savedAt — host shouldn't see "Saved 12s
  // ago" if their last flush actually 500'd. The unsaved label
  // also colours plum so it reads as a problem instead of a
  // neutral status.
  const savedLabel = saving
    ? 'Saving…'
    : saveError
      ? 'Save failed'
      : savedAt
        ? formatRelative(savedAt)
        : null;
  const savedLabelColor = saveError ? 'var(--plum-ink, #7A2D2D)' : 'var(--ink-muted)';

  // ── Phone topbar — two rows. Row 1 keeps the affordances that
  // matter (back · who/when/saved · Send); row 2 is the
  // stationery-type switch, horizontally scrollable so all three
  // full labels survive a 320px viewport.
  if (compact) {
    return (
      <header aria-label="Studio toolbar" style={{
        gridArea: 'top',
        display: 'flex', flexDirection: 'column',
        borderBottom: '1px solid var(--line-soft)',
        background: 'var(--cream)',
        position: 'relative', zIndex: 5,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', height: 54, flexShrink: 0 }}>
          <Link href="/dashboard/event" aria-label="Back to dashboard" style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--ink-soft)', textDecoration: 'none', flexShrink: 0 }}>
            <Icon name="chev-left" size={14} />
          </Link>
          <Pear size={24} tone="sage" shadow={false} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Studio · {nameA} & {nameB}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {dateShort}
              {savedLabel && (
                <>
                  {' · '}
                  <span style={{ color: savedLabelColor, fontWeight: saveError ? 600 : 400 }}>{savedLabel}</span>
                  {saveError && onRetrySave && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        onClick={() => void onRetrySave()}
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          color: 'var(--peach-ink, #C6703D)', fontWeight: 600,
                          cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
                          textDecoration: 'underline',
                        }}
                      >
                        Try again
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setField('showSend', true)}
            style={{
              padding: '8px 14px', fontSize: 12, fontWeight: 700,
              color: 'var(--cream)', background: 'var(--ink)',
              border: 'none', borderRadius: 999, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            <Icon name="send" size={12} color="var(--cream)" />
            Send
          </button>
        </div>
        <div className="pl-studio-scroll" style={{ display: 'flex', alignItems: 'center', padding: '0 12px 10px', overflowX: 'auto' }}>
          <div style={{
            display: 'flex', gap: 4, padding: 4, margin: '0 auto',
            background: 'var(--card)', borderRadius: 999,
            border: '1px solid var(--line-soft)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            {TYPE_TABS.map(tp => {
              const on = state.type === tp.id;
              return (
                <button key={tp.id}
                  type="button"
                  onClick={() => setField('type', tp.id)}
                  aria-pressed={on}
                  title={tp.sub}
                  style={{
                    padding: '6px 12px', borderRadius: 999,
                    fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                    background: on ? 'var(--ink)' : 'transparent',
                    color: on ? 'var(--cream)' : 'var(--ink)',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    cursor: 'pointer', border: 'none',
                    fontFamily: 'inherit',
                  }}>
                  <Icon name={tp.icon} size={12} color={on ? 'var(--cream)' : 'currentColor'} />
                  {tp.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header aria-label="Studio toolbar" style={{
      gridArea: 'top',
      display: 'grid',
      gridTemplateColumns: '296px 1fr auto',
      alignItems: 'center', gap: 16,
      padding: '0 16px 0 0',
      borderBottom: '1px solid var(--line-soft)',
      background: 'var(--cream)',
      position: 'relative', zIndex: 5,
    }}>
      {/* Left: brand cluster */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderRight: '1px solid var(--line-soft)', height: '100%' }}>
        <Link href="/dashboard/event" aria-label="Back to dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--ink-soft)', textDecoration: 'none' }}>
          <Icon name="chev-left" size={13} />
        </Link>
        <Pear size={26} tone="sage" shadow={false} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Studio · {nameA} & {nameB}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>
            {dateShort}
            {savedLabel && (
              <>
                {' · '}
                <span style={{ color: savedLabelColor, fontWeight: saveError ? 600 : 400 }}>
                  {savedLabel}
                </span>
                {saveError && onRetrySave && (
                  <>
                    {' · '}
                    <button
                      type="button"
                      onClick={() => void onRetrySave()}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        color: 'var(--peach-ink, #C6703D)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        textDecoration: 'underline',
                      }}
                    >
                      Try again
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Middle: stationery type tabs */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'var(--card)', borderRadius: 999,
          border: '1px solid var(--line-soft)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {TYPE_TABS.map(tp => {
            const on = state.type === tp.id;
            return (
              <button key={tp.id}
                type="button"
                onClick={() => setField('type', tp.id)}
                aria-pressed={on}
                title={tp.sub}
                style={{
                  padding: '8px 16px', borderRadius: 999,
                  fontSize: 13, fontWeight: 600,
                  background: on ? 'var(--ink)' : 'transparent',
                  color: on ? 'var(--cream)' : 'var(--ink)',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', border: 'none',
                  transition: 'all 200ms ease',
                  fontFamily: 'inherit',
                }}>
                <Icon name={tp.icon} size={13} color={on ? 'var(--cream)' : 'currentColor'} />
                {tp.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: view toggle + send */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          display: 'flex', gap: 2, padding: 3,
          background: 'var(--card)', borderRadius: 999,
          border: '1px solid var(--line-soft)',
        }}>
          {([
            { id: 'front',    label: 'Front',    icon: 'page' },
            { id: 'back',     label: 'Back',     icon: 'layout' },
            { id: 'envelope', label: 'Envelope', icon: 'mail' },
          ] as Array<{ id: CardView; label: string; icon: string }>).map(v => {
            const on = state.view === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setField('view', v.id)}
                aria-pressed={on}
                style={{
                padding: '6px 12px', borderRadius: 999,
                fontSize: 12, fontWeight: 600,
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <Icon name={v.icon} size={11} color={on ? 'var(--cream)' : 'var(--ink-soft)'} />
                {v.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            padding: '7px 12px',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--ink)',
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 999,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'inherit',
          }}
        >
          <Icon name="download" size={12} /> Export
        </button>
        <button
          type="button"
          onClick={() => setField('showSend', true)}
          style={{
            padding: '8px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--cream)',
            background: 'var(--ink)',
            border: 'none',
            borderRadius: 999,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'inherit',
          }}
        >
          <Icon name="send" size={12} color="var(--cream)" />
          Send
        </button>
      </div>
    </header>
  );
}

function formatRelative(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 5_000) return 'Saved just now';
  if (delta < 60_000) return `Saved ${Math.round(delta / 1000)}s ago`;
  if (delta < 3_600_000) return `Saved ${Math.round(delta / 60_000)}m ago`;
  return 'Saved earlier';
}

export function DraftsRail({ state, setField, content, nameA, nameB, onPickDraft, onAskPearForDraft, onAskPearForAsset, onOpenProofSheet, sendStats, aiBusy }: RailProps) {
  const drafts = content.drafts;
  return (
    <aside aria-label="Pear's drafts" style={{
      gridArea: 'left',
      background: 'var(--cream-2)',
      borderRight: '1px solid var(--line-soft)',
      padding: '16px 14px',
      display: 'flex', flexDirection: 'column', gap: 14,
      overflow: 'auto',
    }}>
      {onOpenProofSheet && (
        <button
          type="button"
          onClick={onOpenProofSheet}
          style={{
            padding: '10px 12px', borderRadius: 12,
            background: 'linear-gradient(135deg, var(--peach-bg, #FBE8D6), var(--lavender-bg, #E8E0F0))',
            border: '1px solid var(--line-soft)',
            display: 'flex', alignItems: 'center', gap: 10,
            textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <Pear size={22} tone="peach" shadow={false} sparkle />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>See the proof sheet</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>Pear presses whole designs in your site&apos;s look</div>
          </div>
          <Icon name="arrow-right" size={12} color="var(--ink-muted)" />
        </button>
      )}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Pear size={20} tone="sage" shadow={false} sparkle />
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Pear&apos;s drafts</div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.45 }}>
          Three directions, all editable. Click one to make it the canvas.
        </div>
        {aiBusy && (
          <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--peach-bg)', color: 'var(--peach-ink)', borderRadius: 8, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Pear size={12} tone="peach" shadow={false} sparkle /> Pear is drafting…
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {drafts.map((d) => {
          const on = state.draft === d.id;
          return (
            <button key={d.id}
              type="button"
              onClick={() => onPickDraft(d)}
              aria-pressed={on}
              aria-label={`${d.name}${on ? ', currently picked' : ''} — ${d.tone}`}
              style={{
                textAlign: 'left',
                padding: 0, borderRadius: 14,
                background: 'transparent',
                border: on ? '2px solid var(--ink)' : '2px solid transparent',
                transition: 'all 220ms ease',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
              <DraftThumb draft={d} active={on} nameA={nameA} nameB={nameB} />
              <div style={{
                padding: '8px 10px',
                background: on ? 'var(--ink)' : 'transparent',
                color: on ? 'var(--cream)' : 'var(--ink)',
                borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{d.name}</div>
                  <div style={{ fontSize: 10.5, opacity: on ? 0.75 : 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.tone}</div>
                </div>
                {on && <Icon name="check" size={13} color="var(--cream)" />}
              </div>
            </button>
          );
        })}
        {onAskPearForDraft && (
          <button
            type="button"
            onClick={() => void onAskPearForDraft()}
            disabled={aiBusy}
            aria-busy={aiBusy}
            style={{
              padding: '10px 12px', borderRadius: 12,
              fontSize: 12, fontWeight: 600,
              color: 'var(--ink-soft)',
              border: '1.5px dashed var(--line)',
              background: 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: aiBusy ? 'wait' : 'pointer',
              opacity: aiBusy ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            <Pear size={14} tone="sage" shadow={false} sparkle={aiBusy} />
            {aiBusy ? (
              <PearThinking active label="drafting" size="sm" hideAvatar />
            ) : (
              'Draft another direction'
            )}
          </button>
        )}
      </div>

      <AssetPalette state={state} setField={setField} onAskPearForAsset={onAskPearForAsset} aiBusy={aiBusy} />

      <div style={{
        marginTop: 'auto', padding: 12,
        background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 12,
      }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: 6 }}>This send</div>
        <div style={{ fontSize: 12, color: 'var(--ink)', marginBottom: 2 }}>
          {sendStats?.sent != null
            ? `${sendStats.sent} sent · ${sendStats.total ?? 0} guests`
            : `${sendStats?.total ?? 0} guests on the list`}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>
          {state.type === 'std' && 'Save-the-date · 6–9 months ahead'}
          {state.type === 'invite' && 'Invitation · ~8 weeks before'}
          {state.type === 'thanks' && 'Thank-you · day after'}
        </div>
      </div>
    </aside>
  );
}

type StampTone = 'lavender' | 'peach' | 'sage' | 'cream';
function stampToneFor(accent: string): StampTone {
  if (accent === 'peach' || accent === 'sage' || accent === 'cream' || accent === 'lavender') return accent;
  // 'twilight' / 'rose' fall back to lavender's mid-tone since the
  // <Stamp> primitive only ships 4 tone presets.
  return 'lavender';
}

function DraftThumb({ draft, active, nameA, nameB }: { draft: StudioDraft; active: boolean; nameA: string; nameB: string }) {
  const palette = PALETTES.find(p => p.id === draft.accent) ?? PALETTES[0];
  const isPhoto = draft.layout === 'photo';
  return (
    <div style={{
      aspectRatio: '4 / 3', borderRadius: '12px 12px 0 0',
      background: palette.paper, position: 'relative', overflow: 'hidden',
      borderBottom: '1px solid ' + (active ? 'var(--ink)' : 'var(--line-soft)'),
    }}>
      {isPhoto ? (
        <div style={{ position: 'absolute', inset: 6, background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent2})`, borderRadius: 4 }} />
      ) : (
        <>
          <div style={{
            position: 'absolute', top: '36%', left: 0, right: 0, textAlign: 'center',
            fontFamily: draft.id === 'modern' ? "'Inter', sans-serif" : "'Fraunces', serif",
            fontStyle: draft.id === 'garden' || draft.id === 'editorial' ? 'italic' : 'normal',
            fontSize: 13, fontWeight: 600, color: palette.ink, lineHeight: 1.05, letterSpacing: '-0.02em',
            padding: '0 8px',
          }}>
            {nameA} & {nameB}
          </div>
          {draft.motif === 'stamp' && (
            <div style={{ position: 'absolute', top: 6, right: 6, transform: 'rotate(8deg)' }}>
              <Stamp size={28} tone={stampToneFor(draft.accent)} text="SAVE THE DATE" icon="heart" rotation={0} />
            </div>
          )}
          {draft.motif === 'leaves' && (
            <svg viewBox="0 0 60 30" width={50} height={25} style={{ position: 'absolute', bottom: 4, left: 4, opacity: 0.7 }}>
              <path d="M5 25 Q 20 5 35 20 Q 45 28 55 22" stroke={palette.accent} strokeWidth="1" fill="none" />
              <ellipse cx="14" cy="16" rx="3" ry="1.5" fill={palette.accent} transform="rotate(-30 14 16)" />
              <ellipse cx="28" cy="12" rx="3" ry="1.5" fill={palette.accent} transform="rotate(20 28 12)" />
            </svg>
          )}
          {draft.motif === 'tape' && (
            <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%) rotate(-3deg)', width: 30, height: 9, background: 'rgba(234,178,134,0.5)' }} />
          )}
          {draft.motif === 'monogram' && (
            <div style={{ position: 'absolute', top: 6, left: 6, fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 16, color: palette.accent, fontWeight: 600 }}>
              S&amp;S
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssetPalette({ state, setField, onAskPearForAsset, aiBusy }: { state: StudioState; setField: SetStudioField; onAskPearForAsset?: (kind: AssetEntry['kind']) => Promise<void>; aiBusy?: boolean }) {
  // Tracks which asset kind the host most recently asked Pear to
  // paint. Combined with aiBusy at render time to flip the matching
  // pill to "Painting…". When aiBusy goes false, the kind is stale
  // but the busy display only fires on (aiBusy && paintingKind === kind),
  // so no reset effect is needed.
  const [paintingKind, setPaintingKind] = useState<AssetEntry['kind'] | null>(null);
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>Drag onto card</div>
        <button
          type="button"
          onClick={() => setField('showAssets', !state.showAssets)}
          aria-label={state.showAssets ? 'Collapse asset palette' : 'Expand asset palette'}
          aria-expanded={state.showAssets}
          style={{ fontSize: 10.5, color: 'var(--ink-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Icon name={state.showAssets ? 'chev-up' : 'chev-down'} size={12} />
        </button>
      </div>
      {state.showAssets && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
            padding: 10, background: 'var(--card)', border: '1px solid var(--line-soft)', borderRadius: 10,
          }}>
            {state.assets.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  // Use this asset as the active motif. AI URLs flow through customMotifUrl.
                  if (a.url) {
                    setField('customMotifUrl', a.url);
                    setField('motif', 'stamp');
                  } else if (a.kind === 'wax') {
                    setField('motif', 'wax');
                    setField('customMotifUrl', null);
                  } else if (a.kind === 'leaf' || a.kind === 'leaf2') {
                    setField('motif', 'leaves');
                    setField('customMotifUrl', null);
                  } else if (a.kind === 'tape') {
                    setField('motif', 'tape');
                    setField('customMotifUrl', null);
                  } else if (a.kind === 'doodle') {
                    setField('motif', 'doodle');
                    setField('customMotifUrl', null);
                  } else if (a.kind === 'mono') {
                    setField('motif', 'monogram');
                    setField('customMotifUrl', null);
                  } else {
                    setField('motif', 'stamp');
                    setField('customMotifUrl', null);
                  }
                }}
                style={{
                  aspectRatio: '1', display: 'grid', placeItems: 'center',
                  background: 'var(--cream)', borderRadius: 8,
                  cursor: 'pointer', border: '1px solid var(--line-soft)',
                  padding: 4, transition: 'transform 160ms ease',
                }}
                title={a.kind}
                aria-label={`Use ${a.kind} asset`}
              >
                <AssetGlyph asset={a} />
              </button>
            ))}
          </div>
          {onAskPearForAsset && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(['stamp', 'wax', 'leaf', 'doodle'] as AssetEntry['kind'][]).map(kind => {
                const busy = !!aiBusy && paintingKind === kind;
                const otherBusy = !!aiBusy && !busy;
                return (
                <button
                  key={kind}
                  type="button"
                  disabled={busy || otherBusy}
                  aria-busy={busy}
                  onClick={() => {
                    setPaintingKind(kind);
                    void onAskPearForAsset(kind);
                  }}
                  style={{
                    padding: '4px 10px', borderRadius: 999,
                    background: 'var(--peach-bg)', color: 'var(--peach-ink)',
                    fontSize: 11, fontWeight: 600,
                    border: '1px dashed var(--peach-ink)',
                    cursor: busy || otherBusy ? 'not-allowed' : 'pointer',
                    opacity: otherBusy ? 0.4 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  {busy ? `Painting ${kind}…` : `✦ Pear · ${kind}`}
                </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RemixRail({ state, setField, content, nameA, nameB, onRewriteField, onMatchSiteTheme, onSuggestPair, initialTab }: RailProps) {
  const [tab, setTab] = useState<'design' | 'copy' | 'pear'>(initialTab ?? 'design');
  return (
    <aside aria-label="Inspector" style={{
      gridArea: 'right',
      background: 'var(--cream)',
      borderLeft: '1px solid var(--line-soft)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div role="group" aria-label="Studio inspector" style={{
        display: 'flex', padding: '12px 12px 0', gap: 4,
        borderBottom: '1px solid var(--line-soft)',
      }}>
        {([
          { id: 'design', label: 'Design', icon: 'palette' },
          { id: 'copy',   label: 'Copy',   icon: 'text' },
          { id: 'pear',   label: 'Pear',   icon: 'sparkles' },
        ] as const).map(x => {
          const on = tab === x.id;
          return (
            <button
              key={x.id}
              type="button"
              aria-pressed={on}
              onClick={() => setTab(x.id)}
              style={{
              flex: 1, padding: '10px 4px',
              fontSize: 12, fontWeight: 600,
              color: on ? 'var(--ink)' : 'var(--ink-muted)',
              borderBottom: on ? '2px solid var(--ink)' : '2px solid transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginBottom: -1,
              background: 'transparent', borderTop: 0, borderLeft: 0, borderRight: 0,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Icon name={x.icon} size={12} color="currentColor" />
              {x.label}
            </button>
          );
        })}
      </div>

      <div className="pl-studio-scroll" style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 22 }}>
        {tab === 'design' && <DesignTab state={state} setField={setField} />}
        {tab === 'copy' && <CopyTab content={content} state={state} setField={setField} onRewriteField={onRewriteField} />}
        {tab === 'pear' && <PearTab state={state} content={content} nameA={nameA} nameB={nameB} onMatchSiteTheme={onMatchSiteTheme} onSuggestPair={onSuggestPair} />}
      </div>
    </aside>
  );
}

function RailGroup({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function DesignTab({ state, setField }: { state: StudioState; setField: SetStudioField }) {
  return (
    <>
      <RailGroup label="Palette" sub={PALETTES.find(p => p.id === state.palette)?.sub}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {PALETTES.map(p => {
            const on = state.palette === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setField('palette', p.id)}
                aria-pressed={on}
                title={p.name}
                style={{
                padding: 4, borderRadius: 10,
                border: on ? '2px solid var(--ink)' : '2px solid transparent',
                background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ borderRadius: 6, overflow: 'hidden', display: 'flex', height: 36 }}>
                  <div style={{ flex: 2, background: p.paper }} />
                  <div style={{ flex: 1, background: p.accent }} />
                  <div style={{ flex: 1, background: p.accent2 }} />
                </div>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--ink)', marginTop: 4, textAlign: 'center' }}>{p.name}</div>
              </button>
            );
          })}
        </div>
      </RailGroup>

      <RailGroup label="Layout">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {LAYOUTS.map(l => {
            const on = state.layout === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setField('layout', l.id)}
                aria-pressed={on}
                style={{
                padding: 8, borderRadius: 8,
                background: on ? 'var(--ink)' : 'var(--card)',
                color: on ? 'var(--cream)' : 'var(--ink)',
                border: '1px solid ' + (on ? 'var(--ink)' : 'var(--line-soft)'),
                textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 700 }}>{l.name}</div>
                <div style={{ fontSize: 10, opacity: on ? 0.75 : 0.6 }}>{l.sub}</div>
              </button>
            );
          })}
        </div>
      </RailGroup>

      <RailGroup label="Typography" sub={FONT_PAIRS.find(f => f.id === state.fontPair)?.sub}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {FONT_PAIRS.map(f => {
            const on = state.fontPair === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setField('fontPair', f.id)}
                aria-pressed={on}
                style={{
                padding: '10px 12px', borderRadius: 8,
                background: on ? 'var(--ink)' : 'var(--card)',
                color: on ? 'var(--cream)' : 'var(--ink)',
                border: '1px solid ' + (on ? 'var(--ink)' : 'var(--line-soft)'),
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                textAlign: 'left',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div>
                  <div style={{
                    fontFamily: f.display, fontStyle: f.italic ? 'italic' : 'normal',
                    fontWeight: f.weight, fontSize: 18, lineHeight: 1, letterSpacing: '-0.02em',
                  }}>Aa Bb</div>
                  <div style={{ fontSize: 10, opacity: on ? 0.7 : 0.55, marginTop: 4 }}>{f.name}</div>
                </div>
                {on && <Icon name="check" size={13} color="var(--cream)" />}
              </button>
            );
          })}
        </div>
      </RailGroup>

      <RailGroup label="Motif">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {MOTIFS.map(m => {
            const on = state.motif === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => { setField('motif', m.id); setField('customMotifUrl', null); }}
                aria-pressed={on}
                style={{
                padding: 4, borderRadius: 8, aspectRatio: '1',
                background: on ? 'var(--ink)' : 'var(--card)',
                color: on ? 'var(--cream)' : 'var(--ink-soft)',
                border: '1px solid ' + (on ? 'var(--ink)' : 'var(--line-soft)'),
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <MiniMotif id={m.id} on={on} />
                <div style={{ fontSize: 9, fontWeight: 600 }}>{m.name}</div>
              </button>
            );
          })}
        </div>
      </RailGroup>
    </>
  );
}

function MiniMotif({ id, on }: { id: string; on: boolean }) {
  const c = on ? 'var(--cream)' : 'var(--ink)';
  if (id === 'stamp') return <Stamp size={20} tone="lavender" text="" icon="heart" rotation={-6} />;
  if (id === 'leaves') return (
    <svg viewBox="0 0 30 30" width={20} height={20}>
      <path d="M5 25 Q 15 5 25 18" stroke={c} strokeWidth="1" fill="none" />
      <ellipse cx="11" cy="16" rx="3" ry="1.4" fill={c} transform="rotate(-30 11 16)" />
      <ellipse cx="20" cy="14" rx="3" ry="1.4" fill={c} transform="rotate(20 20 14)" />
    </svg>
  );
  if (id === 'tape') return <div style={{ width: 22, height: 8, background: 'var(--peach)', opacity: 0.7, transform: 'rotate(-6deg)' }} />;
  if (id === 'monogram') return <div style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: 16, color: c, fontWeight: 700, lineHeight: 1 }}>S&amp;S</div>;
  if (id === 'wax') return <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#C97A6E' }} />;
  if (id === 'doodle') return <Squiggle width={22} height={10} variant={1} stroke={c} />;
  return <div style={{ width: 18, height: 18, border: '1.5px solid ' + c }} />;
}

function CopyTab({ content, state, setField, onRewriteField }: { content: StudioContent; state: StudioState; setField: SetStudioField; onRewriteField?: (id: string, hint: string) => Promise<void> }) {
  const [openField, setOpenField] = useState<string | null>(null);
  // Tracks which (fieldId, hint) is in flight so the matching pill
  // shows "Threading…" while the request lands. Reset to null on
  // resolve so the user can immediately try another hint.
  const [rewritingKey, setRewritingKey] = useState<string | null>(null);
  type EditableId = 'eyebrow' | 'line2' | 'line4' | 'cta';
  const fields: Array<{ id: string; label: string; value: string; locked?: boolean; sub?: string }> = [
    { id: 'eyebrow',  label: 'Eyebrow',    value: content.eyebrow },
    { id: 'headline', label: 'Headline',   value: content.headline, locked: true, sub: 'Pulled from your event' },
    { id: 'line2',    label: 'Body line',  value: content.line2 },
    { id: 'line3',    label: 'Date / time', value: content.line3, locked: true, sub: 'Edits on the site flow here' },
    { id: 'line4',    label: 'Place',      value: content.line4 },
    { id: 'cta',      label: 'Footer line', value: content.cta },
  ];
  function saveOverride(id: EditableId, next: string) {
    const trimmed = next.trim();
    const prev = state.copyOverrides[state.type] ?? {};
    const nextSlice: typeof prev = { ...prev };
    if (trimmed) nextSlice[id] = trimmed;
    else delete nextSlice[id];
    const nextMap = { ...state.copyOverrides, [state.type]: nextSlice };
    setField('copyOverrides', nextMap);
  }
  return (
    <>
      <RailGroup label="Tone" sub="Pear rewrites every line">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          {COPY_TONES.map(c => {
            const on = state.tone === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setField('tone', c.id)}
                aria-pressed={on}
                style={{
                padding: 10, borderRadius: 8, textAlign: 'left',
                background: on ? 'var(--ink)' : 'var(--card)',
                color: on ? 'var(--cream)' : 'var(--ink)',
                border: '1px solid ' + (on ? 'var(--ink)' : 'var(--line-soft)'),
                display: 'flex', flexDirection: 'column', gap: 2,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{c.label}</div>
                <div style={{ fontSize: 10, opacity: on ? 0.75 : 0.6, fontStyle: 'italic' }}>{c.sub}</div>
              </button>
            );
          })}
        </div>
      </RailGroup>

      <RailGroup label="Fields">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {fields.map(f => (
            <div key={f.id} style={{
              padding: '10px 12px', borderRadius: 8,
              background: 'var(--card)', border: '1px solid var(--line-soft)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>{f.label}</div>
                {f.locked ? (
                  <Icon name="link" size={11} color="var(--ink-muted)" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setOpenField(openField === f.id ? null : f.id)}
                    aria-expanded={openField === f.id}
                    aria-label={`Rewrite ${f.label} with Pear`}
                    style={{
                      fontSize: 10, color: 'var(--peach-ink)', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <Pear size={10} tone="sage" shadow={false} />
                    Rewrite
                  </button>
                )}
              </div>
              {f.locked ? (
                <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', lineHeight: 1.4 }}>
                  {f.value || <span style={{ fontStyle: 'italic' }}>empty</span>}
                </div>
              ) : (
                <EditableLine
                  key={`${f.id}:${state.type}:${f.value}`}
                  initial={f.value}
                  label={f.label}
                  onSave={(next) => saveOverride(f.id as EditableId, next)}
                />
              )}
              {f.sub && <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginTop: 4 }}>{f.sub}</div>}

              {openField === f.id && !f.locked && onRewriteField && (
                <div className="pl-studio-nudge-in" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line-soft)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    'A different angle on the same idea',
                    'Trim it to half the length',
                    'Make it sound spoken-aloud',
                  ].map(hint => {
                    const key = `${f.id}::${hint}`;
                    const busy = rewritingKey === key;
                    const otherBusy = rewritingKey !== null && !busy;
                    return (
                      <button key={hint}
                        type="button"
                        disabled={busy || otherBusy}
                        aria-busy={busy}
                        onClick={() => {
                          setRewritingKey(key);
                          void onRewriteField(f.id, hint).finally(() => setRewritingKey(null));
                        }}
                        style={{
                          padding: '6px 10px', borderRadius: 6,
                          background: 'var(--peach-bg)', color: 'var(--peach-ink)',
                          fontSize: 11, fontWeight: 500, textAlign: 'left',
                          border: '1px solid transparent',
                          cursor: busy || otherBusy ? 'not-allowed' : 'pointer',
                          opacity: otherBusy ? 0.4 : 1,
                          fontFamily: 'inherit',
                        }}>
                        {busy ? 'Threading…' : hint}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </RailGroup>
    </>
  );
}

/** Inline auto-resizing textarea — the click target IS the
 *  editor; no edit/save dance. Persists on blur (and on Enter
 *  unless Shift is held). The caller remounts the component
 *  with a fresh `key` whenever the underlying value changes
 *  externally (e.g. AI rewrite, type swap), so we don't have
 *  to thread a controlled value through. */
function EditableLine({ initial, onSave, label }: { initial: string; onSave: (next: string) => void; label?: string }) {
  const [draft, setDraft] = useState(initial);
  return (
    <textarea
      value={draft}
      aria-label={label}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== initial) onSave(draft); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
        if (e.key === 'Escape') {
          setDraft(initial);
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      rows={1}
      style={{
        width: '100%',
        fontSize: 12.5,
        color: 'var(--ink)',
        lineHeight: 1.4,
        background: 'transparent',
        border: 'none',
        resize: 'none',
        outline: 'none',
        padding: 0,
        margin: 0,
        fontFamily: 'inherit',
        // Auto-grow: rows={1} + min-height for a single line, but
        // letting the browser expand if the content wraps.
        minHeight: '1.4em',
        overflow: 'hidden',
      }}
      onInput={(e) => {
        const t = e.currentTarget;
        t.style.height = 'auto';
        t.style.height = `${t.scrollHeight}px`;
      }}
    />
  );
}

function PearTab({ state, content, nameA, nameB, onMatchSiteTheme, onSuggestPair }: { state: StudioState; content: StudioContent; nameA: string; nameB: string; onMatchSiteTheme?: () => Promise<void>; onSuggestPair?: () => void }) {
  return (
    <>
      <div style={{
        padding: 14, background: 'linear-gradient(135deg, var(--peach-bg, #FBE8D6), var(--lavender-bg, #E8E0F0))',
        borderRadius: 12, border: '1px solid var(--line-soft)',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pear size={32} tone="sage" sparkle />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Pear&apos;s read on this</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-soft)' }}>Looking at your {content.eyebrow.toLowerCase()}</div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.5 }}>
          The <strong>{state.layout}</strong> layout reads {LAYOUT_CHARACTER[state.layout] ?? 'warm and confident'}. With{' '}
          <strong>{PALETTES.find(p => p.id === state.palette)?.name ?? 'this'}</strong> and the{' '}
          <strong>{content.stamp.toLowerCase()}</strong> stamp, this lands in the {PALETTE_NEIGHBOURHOOD[state.palette] ?? 'editorial-classic'} neighbourhood for {nameA} & {nameB}.
        </div>
      </div>

      <RailGroup label="Pear can do this">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { l: 'Match this card to your site theme',  i: 'palette',  tone: 'lavender', onPress: onMatchSiteTheme },
            { l: 'Suggest a stamp + accent that pair',   i: 'sparkles', tone: 'peach',    onPress: onSuggestPair },
            { l: 'Translate every word to the venue’s language', i: 'globe', tone: 'lavender' },
          ].map(s => (
            <button key={s.l}
              type="button"
              onClick={() => void s.onPress?.()}
              disabled={!s.onPress}
              style={{
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--card)', border: '1px solid var(--line-soft)',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
                transition: 'all 200ms ease',
                opacity: s.onPress ? 1 : 0.55,
                cursor: s.onPress ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: s.tone === 'peach' ? 'var(--peach-bg)' : 'var(--lavender-bg, #E8E0F0)',
                color: s.tone === 'peach' ? 'var(--peach-ink)' : 'var(--lavender-ink, #6B5784)',
                display: 'grid', placeItems: 'center',
              }}>
                <Icon name={s.i} size={14} color="currentColor" />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.35, flex: 1 }}>{s.l}</div>
              <Icon name="arrow-right" size={12} color="var(--ink-muted)" />
            </button>
          ))}
        </div>
      </RailGroup>
    </>
  );
}
