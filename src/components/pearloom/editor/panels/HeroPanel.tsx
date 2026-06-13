'use client';

/* eslint-disable no-restricted-syntax */
/* LITERAL PORT of ClaudeDesign/pages/section-fields.jsx HeroEditor —
   now with a working cover-photo control (drag-drop, file picker,
   gallery-picker fallback, preview, remove). Uploads through
   /api/photos/upload (same endpoint the wizard uses) and writes
   manifest.coverPhoto + manifest.coverPhotoAlt. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { FGroup, FInput, FSuggest, FToggleStandalone, SectionPanelShell } from './_section-atoms';
import { heroLeadSuggestions, smartContext } from './_suggestions';
import { FDate, FSelect } from './_form-atoms';
import { PearInlineRewrite } from '../../redesign/PearAssist';
import { PhotoUploadSlot, collectPhotoPool } from './_photo-upload';
import { SECTION_LINK_TARGETS, SPECIAL_LINK_TARGETS, resolveLinkLabel } from './_link-targets';
import { useVoicePack } from './_voice-pack';

interface CoverPhotoFieldProps {
  url: string;
  onChange: (next: string) => void;
  pool: string[];
  hint: string;
}

function CoverPhotoField({ url, onChange, pool, hint }: CoverPhotoFieldProps) {
  return (
    <FGroup
      label="Cover photo"
      hint={hint}
      /* Quiet attention signal when no cover photo is set — a
         small peach dot + "needed" in the label row. Not an
         alarm; just the one thing the hero genuinely wants. */
      action={!url ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--peach-ink)' }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--peach-ink)', flexShrink: 0 }} />
          needed
        </span>
      ) : undefined}
    >
      <PhotoUploadSlot url={url} onChange={onChange} aspectRatio="16/9" size="md" pool={pool} />
    </FGroup>
  );
}

/* ─── CtaLinkEditor — destination + label + optional custom URL ─ */

interface CtaLinkEditorProps {
  /** Destination value — '#story', 'https://...', '' (no link),
   *  or '' meaning "use the default". */
  href: string;
  /** Label override — empty falls back to the destination's
   *  default human name ("RSVP", "Our story"). */
  label: string;
  /** Default destination when href is blank — varies per CTA. */
  defaultHref: string;
  /** Setter for href. Pass '' to clear. */
  onHrefChange: (next: string) => void;
  /** Setter for label override. */
  onLabelChange: (next: string) => void;
}

function CtaLinkEditor({ href, label, defaultHref, onHrefChange, onLabelChange }: CtaLinkEditorProps) {
  /* Resolve the selector's "value" from the raw href. External
     URLs collapse to 'custom'; an empty saved href means we're on
     the default destination. */
  const resolvedHref = href || defaultHref;
  const isExternal = /^https?:\/\//.test(resolvedHref);
  const selectorValue = isExternal
    ? 'custom'
    : resolvedHref === '' ? 'none' : resolvedHref;

  /* Default label = resolved destination's name. Falls through
     to the resolveLinkLabel catalog when the user hasn't typed
     an override yet. */
  const defaultLabel = resolveLinkLabel(resolvedHref);
  const placeholder = defaultLabel || 'Button label';

  const handleSelectorChange = (next: string) => {
    if (next === 'custom') {
      /* Switching INTO custom — keep any existing URL the host
         had, otherwise seed with empty so the URL input shows up
         clearly empty. */
      onHrefChange(isExternal ? resolvedHref : '');
      return;
    }
    if (next === 'none') {
      onHrefChange('none-link');
      return;
    }
    onHrefChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FSelect
        value={selectorValue}
        onChange={handleSelectorChange}
        options={[...SECTION_LINK_TARGETS, ...SPECIAL_LINK_TARGETS]}
        icon="arrow-right"
      />
      {selectorValue === 'custom' && (
        <FInput
          value={isExternal ? resolvedHref : ''}
          onChange={onHrefChange}
          type="url"
          icon="link"
          placeholder="https://your-link.com"
        />
      )}
      <FInput
        value={label}
        onChange={onLabelChange}
        placeholder={placeholder}
      />
    </div>
  );
}


export function HeroPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const v = useVoicePack(manifest);
  /* Solo-honoree mode — when on, the second name slot hides and
     the canvas suppresses the '&' glyph. Stored under
     manifest.subject.kind ('couple' | 'solo'). */
  const subject = ((manifest as unknown as { subject?: { kind?: 'couple' | 'solo' } }).subject) ?? { kind: 'couple' as const };
  const isSolo = subject.kind === 'solo';
  const setSolo = (next: boolean) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    subject: { ...subject, kind: next ? 'solo' : 'couple' },
  } as unknown as StoryManifest);

  const [n1, n2] = manifest.names ?? ['', ''];
  /* Read tagline from manifest.tagline (canonical) with fallback to
     the legacy poetry.heroTagline path so existing sites don't lose
     their saved tagline. Write to manifest.tagline only. */
  const tagline = ((manifest as unknown as { tagline?: string }).tagline)
    ?? ((manifest as unknown as { poetry?: { heroTagline?: string } }).poetry?.heroTagline)
    ?? '';
  const date = manifest.logistics?.date ?? '';
  const venue = manifest.logistics?.venue ?? '';
  const coverPhoto = ((manifest as unknown as { coverPhoto?: string }).coverPhoto) ?? '';

  const setTagline = (v: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    tagline: v,
  } as unknown as StoryManifest);
  const setA = (v: string) => onChange({ ...manifest, names: [v, n2] });
  const setB = (v: string) => onChange({ ...manifest, names: [n1, v] });
  const setDate = (v: string) => onChange({ ...manifest, logistics: { ...(manifest.logistics ?? {}), date: v } });
  const setVenue = (v: string) => onChange({ ...manifest, logistics: { ...(manifest.logistics ?? {}), venue: v } });
  const setCoverPhoto = (v: string) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    coverPhoto: v || undefined,
  } as unknown as StoryManifest);

  /* manifest.copy.<key> overrides — visible labels the host can
     customize. Each falls through to the voice-defaulted value in
     ThemedSite's buildCopy when blank. */
  const copy: Record<string, string> = ((manifest as unknown as { copy?: Record<string, string> }).copy) ?? {};
  const setCopy = (key: string, value: string) => {
    const next = { ...copy };
    if (value.trim()) next[key] = value;
    else delete next[key];
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      copy: next,
    } as unknown as StoryManifest);
  };
  const heroLead = copy.heroLead ?? '';
  /* Milestone counter — surfaces above the names when set. Stored
     as { kind, value } so the renderer can format it differently
     per kind ("Turning 40" vs "10 years" vs "Class of 1995"). */
  const milestone = ((manifest as unknown as { milestone?: { kind?: string; value?: string } }).milestone) ?? {};
  const setMilestone = (next: { kind?: string; value?: string }) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    milestone: { ...milestone, ...next },
  } as unknown as StoryManifest);
  const heroCta = copy.heroCta ?? '';
  const heroCtaHref = copy.heroCtaHref ?? '';
  const heroCtaSecondary = copy.heroCtaSecondary ?? '';
  const heroCtaSecondaryHref = copy.heroCtaSecondaryHref ?? '';
  /* Pool every photo already uploaded across the site (cover +
     gallery + per-chapter) so the cover-photo slot can offer a
     "swap from gallery" pick. */
  const photoPool = collectPhotoPool(manifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FGroup label="Lead / eyebrow" hint="The tiny ALL-CAPS line above the names.">
          {(() => {
            const sug = heroLeadSuggestions(smartContext(manifest));
            return (
              <FSuggest
                value={heroLead}
                onChange={(v) => setCopy('heroLead', v)}
                placeholder={v.hero.leadPlaceholder}
                options={sug.options}
                hint={sug.hint}
              />
            );
          })()}
        </FGroup>
        <FGroup label="Tagline" hint={tagline.trim().length >= 2 ? undefined : 'Type a line, then Pear can rewrite it in different tones.'}>
          <FInput value={tagline} onChange={setTagline} placeholder={v.hero.taglinePlaceholder} />
          {tagline.trim().length >= 2 && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                value={tagline}
                onCommit={setTagline}
                context="hero tagline"
              />
            </div>
          )}
        </FGroup>
        <FGroup label={v.hero.subjectGroupLabel} hint={v.hero.subjectHint}>
          {isSolo ? (
            <FInput value={n1} onChange={setA} placeholder={v.hero.nameAPlaceholder} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr', gap: 6, alignItems: 'center' }}>
              <FInput value={n1} onChange={setA} placeholder={v.hero.nameAPlaceholder} />
              <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--ink-soft)' }}>&amp;</div>
              <FInput value={n2} onChange={setB} placeholder={v.hero.nameBPlaceholder} />
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <FToggleStandalone
              label="Single honoree"
              sub={isSolo ? 'One name shown above the date' : 'Two names with a “&” between them'}
              def={isSolo}
              onChange={setSolo}
            />
          </div>
        </FGroup>
        <FGroup label="Date & venue">
          <FDate value={date} onChange={setDate} placeholder="Pick the day" />
          <div style={{ height: 8 }} />
          <FInput value={venue} onChange={setVenue} icon="pin" placeholder="Where the gathering happens" />
        </FGroup>
        <MilestoneDisclosure milestone={milestone} setMilestone={setMilestone} />
        <CoverPhotoField url={coverPhoto} onChange={setCoverPhoto} pool={photoPool} hint={v.hero.coverGroupHint} />
        <FGroup label="Primary button" hint="The first CTA — pick where it goes, then optionally rename it.">
          <CtaLinkEditor
            href={heroCtaHref}
            label={heroCta}
            defaultHref="#rsvp"
            onHrefChange={(v) => setCopy('heroCtaHref', v)}
            onLabelChange={(v) => setCopy('heroCta', v)}
          />
        </FGroup>
        <FGroup label="Secondary button" hint="Optional — the smaller outline button next to the primary.">
          <CtaLinkEditor
            href={heroCtaSecondaryHref}
            label={heroCtaSecondary}
            defaultHref="#story"
            onHrefChange={(v) => setCopy('heroCtaSecondaryHref', v)}
            onLabelChange={(v) => setCopy('heroCtaSecondary', v)}
          />
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default HeroPanel;

/* ─── MilestoneDisclosure ─────────────────────────────────────
   Collapsed by default — appears as a single "Add a milestone"
   button. Tapping reveals the FSelect + value input. The host
   never sees the full milestone UI unless they want it.
   "Remove" returns the panel to the compact state. */

function MilestoneDisclosure({
  milestone, setMilestone,
}: {
  milestone: { kind?: string; value?: string };
  setMilestone: (next: { kind?: string; value?: string }) => void;
}) {
  const hasMilestone = !!(milestone.kind && milestone.kind !== 'none');
  if (!hasMilestone) {
    return (
      <FGroup label="Milestone" hint="Optional — a small marker above the name(s) like “Turning 40” or “Class of '95”.">
        <button
          type="button"
          onClick={() => setMilestone({ kind: 'turning', value: '' })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '8px 14px', borderRadius: 999,
            background: 'transparent',
            border: '1.5px dashed var(--line)',
            fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)',
            cursor: 'pointer',
            alignSelf: 'flex-start',
            transition: 'border-color 140ms, color 140ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--peach-ink)'; e.currentTarget.style.color = 'var(--peach-ink)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
        >
          <Icon name="plus" size={12} />
          Add a milestone
        </button>
      </FGroup>
    );
  }
  return (
    <FGroup
      label="Milestone"
      hint="Pick the kind, then fill in the value. Appears as a pill above the names on the canvas."
      action={
        <button
          type="button"
          onClick={() => setMilestone({ kind: '', value: '' })}
          style={{
            fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          Remove
        </button>
      }
    >
      <FSelect
        value={milestone.kind ?? 'turning'}
        onChange={(v) => setMilestone({ kind: v, value: milestone.value })}
        options={[
          { value: 'turning',    label: 'Turning N',             hint: 'e.g. Turning 40' },
          { value: 'years',      label: 'N years',               hint: 'e.g. 10 years together' },
          { value: 'class-of',   label: "Class of '95",          hint: 'Graduation / reunion' },
          { value: 'in-memory',  label: 'In loving memory',      hint: 'Memorial dates' },
          { value: 'custom',     label: 'Custom phrase…',        hint: 'Your own wording' },
        ]}
        icon="sparkles"
      />
      <div style={{ marginTop: 6 }}>
        <FInput
          value={milestone.value ?? ''}
          onChange={(v) => setMilestone({ value: v })}
          placeholder={
            milestone.kind === 'turning'   ? '40'
            : milestone.kind === 'years'   ? '10'
            : milestone.kind === 'class-of'? '1995'
            : milestone.kind === 'in-memory' ? '1942 — 2026'
            : 'Your milestone phrase'
          }
        />
      </div>
    </FGroup>
  );
}
