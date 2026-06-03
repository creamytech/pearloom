'use client';
/* eslint-disable no-restricted-syntax */
/* VariantSectionHead — shared head for every section variant. Matches
   ThemedSite's TSectionHead behaviour exactly:
     - Eyebrow as InlineEdit when editable + onEditEyebrow
     - Title + italic accent as ONE composite InlineEdit when editable
       (host edits "Where to stay" → canvas re-splits to "Where to <em>stay</em>")
     - Static <h2> with split title/italic when not editable

   The audit found 9 variant component groups had their own static
   SectionHead which silently dropped click-to-edit + parity with
   the default layout. This module is the single source for variants
   so they don't drift again. */

import type { CSSProperties } from 'react';
import { InlineEdit } from '../InlineEdit';

interface Props {
  eyebrow: string;
  title: string;
  italic?: string;
  /** When true + the corresponding onEdit* prop is passed, the
   *  field becomes click-to-edit. */
  editable?: boolean;
  onEditEyebrow?: (v: string) => void;
  /** Composite — fires when the host commits a single edited
   *  title string. Canvas re-splits on the next render. */
  onEditTitle?: (v: string) => void;
  eyebrowPlaceholder?: string;
  titlePlaceholder?: string;
  /** Override the bottom margin (default 26px to match TSectionHead). */
  marginBottom?: number;
  /** Override the title fontSize. Default 40. */
  titleSize?: number;
}

export function VariantSectionHead({
  eyebrow, title, italic,
  editable, onEditEyebrow, onEditTitle,
  eyebrowPlaceholder, titlePlaceholder,
  marginBottom = 26, titleSize = 40,
}: Props) {
  const fullTitle = [title, italic].filter(Boolean).join(' ');
  const h2Style: CSSProperties = {
    fontFamily: 'var(--t-display)',
    fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
    fontSize: titleSize,
    margin: 0,
    lineHeight: 1.0,
    letterSpacing: '-0.01em',
    color: 'var(--t-ink)',
  };
  return (
    <div style={{ textAlign: 'center', marginBottom }}>
      <InlineEdit
        as="div"
        value={eyebrow}
        onChange={onEditEyebrow}
        editable={!!editable && !!onEditEyebrow}
        placeholder={eyebrowPlaceholder ?? 'Section eyebrow'}
        style={{
          fontSize: 11.5, fontWeight: 700,
          letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase',
          color: 'var(--t-accent-ink)', marginBottom: 10,
        }}
      />
      {editable && onEditTitle ? (
        /* Composite edit — host sees title + italic as ONE editable
           string. On commit, splitHeading() in ThemedSite re-derives
           the accent word. Loses the live italic while typing, but
           re-applies on commit. Same UX as TSectionHead. */
        <InlineEdit
          as="h2"
          value={fullTitle}
          onChange={onEditTitle}
          editable={true}
          placeholder={titlePlaceholder ?? 'Section title'}
          style={h2Style}
        />
      ) : (
        <h2 style={h2Style}>
          {title}
          {italic && (
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}>
              {' '}{italic}
            </span>
          )}
        </h2>
      )}
    </div>
  );
}
