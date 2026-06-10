'use client';

/* eslint-disable no-restricted-syntax */
/* MemorialPanel — memorial-specific authoring surface. Reuses the
   "tool" slot in the editor rail (mounts as block='memorial'),
   visible only when manifest.occasion is 'memorial' or 'funeral'.

   Three groups:
     - Obituary: long-form remembrance (dates + body)
     - Service program: ordered list of ceremony moments
     - Tribute wall: prompt for guest submissions + moderation

   Writes:
     manifest.memorial = {
       obituary: { dates, body },
       program: [{ order, name, detail }],
       tributePrompt,
       tributeWallOpen,
     } */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { AddCard, FGroup, FInput, FToggleStandalone, SectionPanelShell } from './_section-atoms';
import { PearInlineRewrite } from '../../redesign/PearAssist';

interface MemorialProgramRow {
  id: string;
  name: string;
  detail?: string;
}

interface MemorialData {
  obituary?: {
    dates?: string;     // "1942 — 2026" or "Born March 12, 1942"
    body?: string;
  };
  program?: MemorialProgramRow[];
  tributePrompt?: string;
  tributeWallOpen?: boolean;
}

const DEFAULT_PROGRAM: MemorialProgramRow[] = [
  { id: 'p-welcome',   name: 'Welcome',          detail: '' },
  { id: 'p-reading',   name: 'Reading',          detail: '' },
  { id: 'p-eulogy',    name: 'Eulogy',           detail: '' },
  { id: 'p-music',     name: 'Musical tribute',  detail: '' },
  { id: 'p-recessional', name: 'Recessional',    detail: '' },
];

export function MemorialPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const loose = manifest as unknown as { memorial?: MemorialData };
  const data: MemorialData = loose.memorial ?? {};
  const obituary = data.obituary ?? {};
  const program = (data.program && data.program.length > 0) ? data.program : DEFAULT_PROGRAM;
  const tributePrompt = data.tributePrompt ?? 'Share a memory, a story, or a moment that captures who they were.';
  const tributeWallOpen = data.tributeWallOpen ?? true;

  const patch = (next: Partial<MemorialData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    memorial: { ...data, ...next },
  } as unknown as StoryManifest);

  const patchObit = (next: Partial<typeof obituary>) => patch({ obituary: { ...obituary, ...next } });

  const writeProgram = (next: MemorialProgramRow[]) => patch({ program: next });
  const patchProgramRow = (i: number, p: Partial<MemorialProgramRow>) =>
    writeProgram(program.map((row, idx) => idx === i ? { ...row, ...p } : row));
  const removeProgramRow = (i: number) => writeProgram(program.filter((_, idx) => idx !== i));
  const addProgramRow = () => writeProgram([
    ...program,
    { id: `p-${Date.now().toString(36)}`, name: 'New moment', detail: '' },
  ]);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header explanation */}
        <div style={{ padding: 12, borderRadius: 10, background: 'var(--cream-2)', border: '1px solid var(--line-soft)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Memorial workspace
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
            The site’s default Story / Schedule sections are replaced for memorial occasions. Write the obituary, build the order of service, and invite tributes from guests.
          </div>
        </div>

        {/* Obituary */}
        <FGroup label="Obituary" hint="Dates and a short remembrance — what they leave behind.">
          <FInput
            value={obituary.dates ?? ''}
            onChange={(v) => patchObit({ dates: v })}
            placeholder="March 12, 1942 — April 8, 2026"
            icon="calendar"
          />
          <div style={{ height: 8 }} />
          <textarea
            value={obituary.body ?? ''}
            onChange={(e) => patchObit({ body: e.target.value })}
            rows={6}
            placeholder="A short remembrance. Family details, what they loved, what they leave behind."
            style={{
              width: '100%', padding: 10, borderRadius: 10,
              border: '1px solid var(--line)', background: 'var(--cream-2)',
              fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-ui)',
              outline: 'none', resize: 'vertical', lineHeight: 1.6,
            }}
          />
          {(obituary.body ?? '').trim().length >= 30 && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                fxSection="obituary"
                value={obituary.body ?? ''}
                onCommit={(v) => patchObit({ body: v })}
                context="obituary remembrance"
              />
            </div>
          )}
        </FGroup>

        {/* Service program */}
        <FGroup label={`Order of service · ${program.length} moments`} hint="Drag in the order guests will experience the service.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {program.map((row, i) => (
              <div key={row.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 10, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)' }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'var(--lavender-bg)',
                  color: 'var(--lavender-ink)',
                  display: 'grid', placeItems: 'center', flexShrink: 0, marginTop: 4,
                  fontSize: 11, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <FInput
                    value={row.name}
                    onChange={(v) => patchProgramRow(i, { name: v })}
                    placeholder="Eulogy"
                  />
                  <FInput
                    value={row.detail ?? ''}
                    onChange={(v) => patchProgramRow(i, { detail: v })}
                    placeholder="Delivered by their eldest grandchild"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeProgramRow(i)}
                  aria-label={`Remove ${row.name}`}
                  style={{ width: 24, height: 24, borderRadius: 6, display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', marginTop: 8 }}
                >
                  <Icon name="close" size={12} />
                </button>
              </div>
            ))}
            <AddCard label="Add a moment" onClick={addProgramRow} />
          </div>
        </FGroup>

        {/* Tribute wall */}
        <FGroup label="Tribute wall" hint="A space for guests to submit stories and memories. You moderate before they appear.">
          <FToggleStandalone
            label="Accept tributes from guests"
            sub={tributeWallOpen ? 'Submissions appear after you approve them' : 'Currently closed — no new tributes can be submitted'}
            def={tributeWallOpen}
            onChange={(v) => patch({ tributeWallOpen: v })}
          />
          {tributeWallOpen && (
            <>
              <div style={{ height: 8 }} />
              <textarea
                value={tributePrompt}
                onChange={(e) => patch({ tributePrompt: e.target.value })}
                rows={2}
                placeholder="Share a memory, a story, or a moment that captures who they were."
                style={{
                  width: '100%', padding: 10, borderRadius: 10,
                  border: '1px solid var(--line)', background: 'var(--cream-2)',
                  fontSize: 12.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)',
                  outline: 'none', resize: 'vertical', lineHeight: 1.5,
                }}
              />
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="user" size={11} color="var(--ink-muted)" />
                Moderate incoming tributes from the Guests panel.
              </div>
            </>
          )}
        </FGroup>
      </div>
    </SectionPanelShell>
  );
}

export default MemorialPanel;
