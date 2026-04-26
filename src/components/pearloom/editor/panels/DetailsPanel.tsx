'use client';

import type { StoryManifest } from '@/types';
import { Field, PanelGroup, PanelSection, PanelSmartActions, SelectInput, TextArea, type PanelSmartAction } from '../atoms';
import { TimePicker } from '../v8-forms';

const DRESS_CODES = [
  { value: '', label: 'Not specified' },
  { value: 'Casual', label: 'Casual' },
  { value: 'Garden party', label: 'Garden party' },
  { value: 'Cocktail', label: 'Cocktail' },
  { value: 'Black tie', label: 'Black tie' },
  { value: 'Black tie optional', label: 'Black tie optional' },
  { value: 'Beach formal', label: 'Beach formal' },
  { value: 'Dressy', label: 'Dressy' },
  { value: 'Festive', label: 'Festive' },
];

export function DetailsPanel({
  manifest,
  onChange,
}: {
  manifest: StoryManifest;
  onChange: (m: StoryManifest) => void;
}) {
  const logistics = manifest.logistics ?? {};

  const smartActions: PanelSmartAction[] = [
    {
      label: 'Set dress code',
      icon: 'shirt',
      onClick: () => {
        const el = document.querySelector('[data-pl-details-dresscode]') as HTMLElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      },
      primary: true,
    },
    {
      label: 'Add parking notes',
      icon: 'pin',
      onClick: () => {
        const el = document.querySelector('[data-pl-details-parking] textarea') as HTMLTextAreaElement | null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => el.focus(), 240);
        }
      },
    },
  ];

  return (
    <PanelGroup>
      <PanelSmartActions actions={smartActions} />
      <PanelSection label="The ceremony" hint="Guests see these three cards in the Details strip.">
        <Field label="Ceremony start" help="Displays as the first card. Pulls from the hero time by default.">
          <TimePicker
            value={logistics.time ?? ''}
            onChange={(v) =>
              onChange({ ...manifest, logistics: { ...logistics, time: v || undefined } })
            }
            ariaLabel="Ceremony start time"
          />
        </Field>

        <Field label="Dress code">
          <div data-pl-details-dresscode>
            <SelectInput
              value={logistics.dresscode ?? ''}
              onChange={(v) =>
                onChange({ ...manifest, logistics: { ...logistics, dresscode: v || undefined } })
              }
              options={DRESS_CODES}
              placeholder="Select a dress code"
            />
          </div>
        </Field>

        <Field label="Dress-code notes" help="A warm, specific line — 'Block heels — it's grass.'">
          <TextArea
            value={logistics.notes ?? ''}
            onChange={(e) =>
              onChange({ ...manifest, logistics: { ...logistics, notes: e.target.value || undefined } })
            }
            rows={3}
            placeholder="Soft colors. Block heels — it's grass."
          />
        </Field>
      </PanelSection>

      <PanelSection label="Parking + arrival" hint="Optional but appreciated — helps guests land smoothly.">
        <Field label="Parking & arrival notes">
          <div data-pl-details-parking>
            <TextArea
              value={(manifest as unknown as { details?: { parking?: string } }).details?.parking ?? ''}
              onChange={(e) =>
                onChange({
                  ...manifest,
                  details: {
                    ...((manifest as unknown as { details?: Record<string, unknown> }).details ?? {}),
                    parking: e.target.value || undefined,
                  },
                } as unknown as StoryManifest)
              }
              rows={3}
              placeholder="Complimentary valet. Self-parking garage one block east (entrance on Market)."
            />
          </div>
        </Field>

        <Field label="Accessibility notes">
          <TextArea
            value={(manifest as unknown as { details?: { accessibility?: string } }).details?.accessibility ?? ''}
            onChange={(e) =>
              onChange({
                ...manifest,
                details: {
                  ...((manifest as unknown as { details?: Record<string, unknown> }).details ?? {}),
                  accessibility: e.target.value || undefined,
                },
              } as unknown as StoryManifest)
            }
            rows={2}
            placeholder="Step-free access from the east entrance. Accessible restrooms on ground level."
          />
        </Field>
      </PanelSection>
    </PanelGroup>
  );
}
