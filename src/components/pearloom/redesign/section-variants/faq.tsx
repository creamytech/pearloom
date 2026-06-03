'use client';
/* eslint-disable no-restricted-syntax */

import React from 'react';
import type { FaqVariantCtx } from './types';
import { VariantSectionHead } from './_section-head';

const PLACEHOLDER = 'A short, friendly answer goes here.';

function SectionHead({ ctx }: { ctx: FaqVariantCtx }) {
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

function answerFor(ctx: FaqVariantCtx, i: number): string {
  const qa = ctx.C.qa?.[i];
  return qa?.a && qa.a.trim().length > 0 ? qa.a : PLACEHOLDER;
}

export function FaqTwocol({ ctx }: { ctx: FaqVariantCtx }) {
  const { C } = ctx;
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
        {C.questions.map((q, i) => (
          <div key={i} className="pl8-faq-row">
            <div
              style={{
                fontFamily: 'var(--t-display)',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'var(--t-accent-ink, var(--t-ink))',
                marginBottom: 4,
              }}
            >
              {q}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.5 }}>
              {answerFor(ctx, i)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FaqNumbered({ ctx }: { ctx: FaqVariantCtx }) {
  const { C } = ctx;
  return (
    <div>
      <SectionHead ctx={ctx} />
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {C.questions.map((q, i) => (
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
              <div
                style={{
                  fontFamily: 'var(--t-display)',
                  fontSize: 13.5,
                  color: 'var(--t-ink)',
                  marginBottom: 4,
                }}
              >
                {q}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', lineHeight: 1.5 }}>
                {answerFor(ctx, i)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FaqCards({ ctx }: { ctx: FaqVariantCtx }) {
  const { C } = ctx;
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
        {C.questions.map((q, i) => (
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
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: 'var(--t-ink)',
                marginBottom: 6,
              }}
            >
              {q}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', lineHeight: 1.5 }}>
              {answerFor(ctx, i)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
