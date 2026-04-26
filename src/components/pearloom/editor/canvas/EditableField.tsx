'use client';

// ──────────────────────────────────────────────────────────────
// EditableField — the ONE pattern for any inline-editable text on
// the canvas. Wraps:
//   1. HoverToolbar — the AI Rewrite chip that pops on hover
//   2. EditableText — the in-place click-to-edit primitive
//
// Use this instead of EditableText directly so every text field
// gets both behaviours consistently. The user complaint
// "inline editing is inconsistent" comes from some fields having
// the rewrite chip and others not — this collapses both into a
// single pattern.
//
// Usage:
//   <EditableField
//     value={item.answer}
//     onSave={patchAnswer}
//     context="FAQ answer"
//     multiline
//     placeholder="Write the answer…"
//   />
// ──────────────────────────────────────────────────────────────

import type { CSSProperties, ReactNode } from 'react';
import { EditableText } from './EditableText';
import { HoverToolbar } from './HoverToolbar';

interface EditableFieldProps {
  value: string;
  onSave: (next: string) => void;
  /** Short tag used by the AI rewrite chip ("hero tagline",
   *  "FAQ answer", "chapter 2 description"). Pear includes this
   *  in its rewrite prompt for context. */
  context: string;
  /** Tag rendered. Default 'p'. */
  as?: 'p' | 'div' | 'span' | 'h1' | 'h2' | 'h3' | 'h4';
  multiline?: boolean;
  maxLength?: number;
  placeholder?: string;
  ariaLabel?: string;
  style?: CSSProperties;
  className?: string;
  /** When false, skips the HoverToolbar (just renders EditableText).
   *  Useful for short fields where the rewrite chip would be noisy. */
  rewrite?: boolean;
}

export function EditableField({
  value, onSave, context,
  as = 'p', multiline = false, maxLength,
  placeholder, ariaLabel, style, className,
  rewrite = true,
}: EditableFieldProps): ReactNode {
  const editable = (
    <EditableText
      as={as}
      value={value}
      onSave={onSave}
      placeholder={placeholder}
      ariaLabel={ariaLabel ?? context}
      multiline={multiline}
      maxLength={maxLength}
      style={style}
      className={className}
    />
  );

  if (!rewrite) return editable;

  return (
    <HoverToolbar context={context} value={value} onResult={onSave}>
      {editable}
    </HoverToolbar>
  );
}
