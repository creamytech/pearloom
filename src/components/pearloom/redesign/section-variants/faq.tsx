'use client';
/* eslint-disable no-restricted-syntax */

import React from 'react';
import type { FaqVariantCtx } from './types';

const PLACEHOLDER = 'A short, friendly answer goes here.';

function SectionHead({ ctx }: { ctx: FaqVariantCtx }) {
  const { C, pad } = ctx;
  return (
    <header style={{ textAlign: 'center', marginBottom: 28 * pad }}>
      <div
        style={{
          fontFamily: 'var(--t-mono)',
          fontSize: 10.5,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--t-ink-muted)',
          marginBottom: 10,
        }}
      >
        {C.eyebrow}
      </div>
      <h2
        style={{
          fontFamily: 'var(--t-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          lineHeight: 1.05,
          color: 'var(--t-ink)',
          margin: 0,
        }}
      >
        {C.title}
        {C.italic ? (
          <em
            style={{
              fontStyle: 'italic',
              color: 'var(--t-accent-ink, var(--t-ink))',
              marginLeft: 8,
            }}
          >
            {C.italic}
          </em>
        ) : null}
      </h2>
    </header>
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
          <div key={i}>
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
