'use client';
 

import React from 'react';
import type { CSSProperties } from 'react';
import type { FaqVariantCtx } from './types';
import { VariantSectionHead } from './_section-head';
import { InlineEdit } from '../InlineEdit';

const PLACEHOLDER = 'A short, friendly answer goes here.';

/* Edit-context extension — the canvas quick-wins tier threads
   per-row question/answer writers through the variant ctx. Kept
   as a local extension of FaqVariantCtx so the shared types module
   stays untouched. Indices align with manifest.faqs[] (ThemedSite's
   patchFaq seeds the demo questions on first touch). */
export interface FaqVariantCtxEditable extends FaqVariantCtx {
  onEditQuestion?: (idx: number, v: string) => void;
  onEditAnswer?: (idx: number, v: string) => void;
}

function SectionHead({ ctx }: { ctx: FaqVariantCtxEditable }) {
  return (
    <VariantSectionHead
      eyebrow={ctx.C.eyebrow}
      title={ctx.C.title}
      italic={ctx.C.italic}
      editable={ctx.editable}
      onEditEyebrow={ctx.onEditEyebrow}
      onEditTitle={ctx.onEditTitle}
      eyebrowPlaceholder={ctx.eyebrowPlaceholder}
      titlePlaceholder={ctx.titlePlaceholder}
      marginBottom={28 * ctx.pad}
    />
  );
}

/* Each row renders from the qa[] list when the host has authored
   FAQs (indices stay aligned with manifest.faqs so inline edits
   patch the right entry) and falls back to the bare demo questions
   otherwise. Published view skips question-less rows — matching
   the old questions.filter(Boolean) behaviour — while edit mode
   keeps them so the host can fill the question back in. */
function rowsFor(ctx: FaqVariantCtxEditable): Array<{ q: string; a?: string }> {
  return ctx.C.qa ?? ctx.C.questions.map((q) => ({ q, a: undefined }));
}

/** Question slot — InlineEdit in edit mode (stops click propagation
 *  itself, per the InlineEdit contract), plain text otherwise. */
function QuestionText({ ctx, i, value, style }: { ctx: FaqVariantCtxEditable; i: number; value: string; style: CSSProperties }) {
  if (ctx.editable && ctx.onEditQuestion) {
    return (
      <InlineEdit
        as="div"
        value={value}
        onChange={(v) => ctx.onEditQuestion?.(i, v)}
        editable
        placeholder="Write a question…"
        className="pl8-inline-ghost"
        style={style}
      />
    );
  }
  return <div style={style}>{value}</div>;
}

/** Answer slot — multiline InlineEdit in edit mode; published view
 *  keeps the legacy placeholder copy for unanswered rows. */
function AnswerText({ ctx, i, value, style }: { ctx: FaqVariantCtxEditable; i: number; value?: string; style: CSSProperties }) {
  if (ctx.editable && ctx.onEditAnswer) {
    return (
      <InlineEdit
        as="div"
        value={value && value.trim() ? value : ''}
        onChange={(v) => ctx.onEditAnswer?.(i, v)}
        editable
        multiline
        placeholder="Add an answer…"
        className="pl8-inline-ghost"
        style={style}
      />
    );
  }
  return <div style={style}>{value && value.trim() ? value : PLACEHOLDER}</div>;
}

export function FaqTwocol({ ctx }: { ctx: FaqVariantCtxEditable }) {
  return (
    <div>
      <SectionHead ctx={ctx} />
      <div
        style={{
          maxWidth: 820,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px 28px',
        }}
      >
        {rowsFor(ctx).map((item, i) => {
          if (!ctx.editable && !(item.q ?? '').trim()) return null;
          return (
            <div key={i} className="pl8-faq-row">
              <QuestionText
                ctx={ctx}
                i={i}
                value={item.q}
                style={{
                  fontFamily: 'var(--t-display)',
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: 'var(--t-accent-ink, var(--t-ink))',
                  marginBottom: 4,
                }}
              />
              <AnswerText
                ctx={ctx}
                i={i}
                value={item.a}
                style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.5 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FaqNumbered({ ctx }: { ctx: FaqVariantCtxEditable }) {
  return (
    <div>
      <SectionHead ctx={ctx} />
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {rowsFor(ctx).map((item, i) => {
          if (!ctx.editable && !(item.q ?? '').trim()) return null;
          return (
            <div
              key={i}
              className="pl8-faq-row"
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 18,
                padding: '16px 0',
                borderBottom: '1px solid var(--t-line-soft)',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--t-display)',
                  fontSize: 22,
                  color: 'var(--t-ink-muted)',
                  lineHeight: 1,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div>
                <QuestionText
                  ctx={ctx}
                  i={i}
                  value={item.q}
                  style={{
                    fontFamily: 'var(--t-display)',
                    fontSize: 13.5,
                    color: 'var(--t-ink)',
                    marginBottom: 4,
                  }}
                />
                <AnswerText
                  ctx={ctx}
                  i={i}
                  value={item.a}
                  style={{ fontSize: 12, color: 'var(--t-ink-soft)', lineHeight: 1.5 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FaqCards({ ctx }: { ctx: FaqVariantCtxEditable }) {
  return (
    <div>
      <SectionHead ctx={ctx} />
      <div
        style={{
          maxWidth: 820,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        {rowsFor(ctx).map((item, i) => {
          if (!ctx.editable && !(item.q ?? '').trim()) return null;
          return (
            <div
              key={i}
              className="pl8-faq-row"
              style={{
                background: 'var(--t-card)',
                padding: 16,
                borderRadius: 'var(--t-radius)',
                border: '1px solid var(--t-line)',
              }}
            >
              <QuestionText
                ctx={ctx}
                i={i}
                value={item.q}
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: 'var(--t-ink)',
                  marginBottom: 6,
                }}
              />
              <AnswerText
                ctx={ctx}
                i={i}
                value={item.a}
                style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.5 }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
