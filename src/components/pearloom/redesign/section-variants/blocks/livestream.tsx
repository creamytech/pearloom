'use client';
 
/* Livestream section — for the ones far away.

   Data: manifest.livestream  (written by the redesign's
   LivestreamPanel at editor/panels/blocks/LivestreamPanel.tsx)
     { url?, title?, note?, startsAt?, buttonLabel? }
   Legacy fallback: manifest.blocks[] entry of type 'livestream'
   with config { url, title, subtitle, startsAt, buttonLabel }
   (wizard-seeded memorial sites; the orphaned legacy panel at
   editor/panels/LivestreamPanel.tsx wrote that path).

   Variants (layouts.ts): card (implemented) | cinema. */

import { VariantSectionHead } from '../_section-head';
import { BlockFrame, BlockEmpty, BlockChip, blockCopy, type BlockSectionProps } from './_shared';

export interface LivestreamData {
  url?: string;
  title?: string;
  note?: string;
  startsAt?: string;
  buttonLabel?: string;
}

export function readLivestream(manifest: BlockSectionProps['manifest']): LivestreamData {
  const loose = manifest as unknown as {
    livestream?: LivestreamData;
    blocks?: Array<{ type?: string; config?: LivestreamData & { subtitle?: string } }>;
  };
  if (loose.livestream && Object.keys(loose.livestream).length > 0) return loose.livestream;
  const legacy = (loose.blocks ?? []).find((b) => b?.type === 'livestream')?.config;
  if (!legacy) return {};
  return {
    url: legacy.url,
    title: legacy.title,
    note: legacy.note ?? legacy.subtitle,
    startsAt: legacy.startsAt,
    buttonLabel: legacy.buttonLabel,
  };
}

export function LivestreamSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  void variant; /* card | cinema — design agents dispatch here. */
  const data = readLivestream(manifest);
  const url = data.url?.trim() ?? '';
  const empty = !url;
  if (empty && !editable) return null;

  return (
    <BlockFrame pad={pad} background="var(--t-section)">
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'livestreamEyebrow', 'From afar')}
        title={blockCopy(manifest, 'livestreamTitle', data.title?.trim() || 'Join us from anywhere')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('livestreamEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('livestreamTitle', v) : undefined}
      />
      {empty ? (
        <BlockEmpty hint="Paste the stream link (Zoom, YouTube, Vimeo…) in the Livestream panel." />
      ) : (
        <div
          style={{
            maxWidth: 520,
            margin: '0 auto',
            background: 'var(--t-card)',
            border: '1px solid var(--t-line)',
            borderRadius: 'var(--t-radius-lg, 14px)',
            padding: '28px 26px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {data.startsAt?.trim() && <BlockChip>{data.startsAt}</BlockChip>}
          {data.note?.trim() && (
            <div style={{ fontSize: 13.5, color: 'var(--t-ink-soft)', lineHeight: 1.6, maxWidth: 400 }}>
              {data.note}
            </div>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              padding: '12px 22px',
              borderRadius: 999,
              background: 'var(--t-accent)',
              color: 'var(--t-accent-ink, var(--t-paper))',
              fontSize: 13.5,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 0, height: 0,
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '8px solid currentColor',
              }}
            />
            {data.buttonLabel?.trim() || 'Join the livestream'}
          </a>
        </div>
      )}
    </BlockFrame>
  );
}
