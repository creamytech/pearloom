'use client';

/* eslint-disable no-restricted-syntax */
/* MenuPanel — Content tab for the Menu section.
   Editor over manifest.menuSection (typed in src/types.ts):
     { intro?, courses: [{ id, name, items: [{ id, name,
       description?, tags? }] }] }
   Courses hold dishes; per-dish dietary chips toggle membership in
   `tags`. Never seeds demo rows — the canvas shows its own sample
   (editor-only) until the host adds a real course. */

import type { StoryManifest } from '@/types';
import { AddCard, FGroup, FInput, SectionPanelShell, SectionVisibilityFooter, useSectionHidden } from '../_section-atoms';
import { moveItem, ReorderHandle } from '../_reorder';
import { PearInlineRewrite } from '../../../redesign/PearAssist';
import { FTextArea, mkId, RemoveButton, RowCard, type BlockPanelProps } from './_shared';

const DIETARY_TAGS = ['Vegetarian', 'Vegan', 'GF', 'Nut-free', 'Spicy'] as const;

interface MenuDish { id: string; name: string; description?: string; tags?: string[] }
interface MenuCourse { id: string; name: string; items: MenuDish[] }
interface MenuData { intro?: string; courses?: MenuCourse[] }

export function MenuPanel({ manifest, onChange }: BlockPanelProps) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'menu');
  const loose = manifest as unknown as { menuSection?: MenuData };
  const data: MenuData = loose.menuSection ?? {};
  const courses = Array.isArray(data.courses) ? data.courses : [];

  const write = (patch: Partial<MenuData>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    menuSection: { courses, ...data, ...patch },
  } as unknown as StoryManifest);

  const patchCourse = (ci: number, p: Partial<MenuCourse>) =>
    write({ courses: courses.map((c, i) => (i === ci ? { ...c, ...p } : c)) });

  const patchDish = (ci: number, di: number, p: Partial<MenuDish>) =>
    patchCourse(ci, { items: courses[ci].items.map((d, i) => (i === di ? { ...d, ...p } : d)) });

  const toggleTag = (ci: number, di: number, tag: string) => {
    const tags = courses[ci].items[di].tags ?? [];
    patchDish(ci, di, {
      tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
    });
  };

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="A line above the menu" hint="Optional, one welcoming sentence.">
          <FTextArea
            value={data.intro ?? ''}
            onChange={(v) => write({ intro: v })}
            rows={2}
            placeholder="Dinner is served family-style under the oaks."
          />
          {(data.intro ?? '').trim().length >= 2 && (
            <div style={{ marginTop: 7 }}>
              <PearInlineRewrite
                fxSection="menu"
                value={data.intro ?? ''}
                onCommit={(v) => write({ intro: v })}
                context="menu intro line, one welcoming sentence above the courses"
              />
            </div>
          )}
        </FGroup>

        <FGroup
          label={`Courses · ${courses.length}`}
          hint="Each course holds its dishes. Dietary chips show as tiny tags beside the dish."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {courses.map((course, ci) => (
              <RowCard key={course.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Menus are a sequence — courses reorder. */}
                  <ReorderHandle
                    index={ci}
                    count={courses.length}
                    label={course.name || 'course'}
                    onMove={(from, to) => write({ courses: moveItem(courses, from, to) })}
                  />
                  <FInput
                    value={course.name}
                    onChange={(v) => patchCourse(ci, { name: v })}
                    placeholder="To begin"
                  />
                  <RemoveButton
                    label="Remove course"
                    onClick={() => write({ courses: courses.filter((_, i) => i !== ci) })}
                  />
                </div>
                {course.items.map((dish, di) => (
                  <div
                    key={dish.id}
                    style={{
                      display: 'flex', flexDirection: 'column', gap: 6,
                      paddingLeft: 10, borderLeft: '2px solid var(--line-soft)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FInput
                        value={dish.name}
                        onChange={(v) => patchDish(ci, di, { name: v })}
                        placeholder="Roast chicken with spring vegetables"
                      />
                      <RemoveButton
                        label="Remove dish"
                        onClick={() => patchCourse(ci, { items: course.items.filter((_, i) => i !== di) })}
                      />
                    </div>
                    <FInput
                      value={dish.description ?? ''}
                      onChange={(v) => patchDish(ci, di, { description: v })}
                      placeholder="A quiet description (optional)"
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {DIETARY_TAGS.map((tag) => {
                        const on = (dish.tags ?? []).includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(ci, di, tag)}
                            aria-pressed={on}
                            style={{
                              padding: '4px 9px',
                              borderRadius: 999,
                              border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                              background: on ? 'var(--ink)' : 'var(--cream-2)',
                              color: on ? 'var(--card)' : 'var(--ink-soft)',
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <AddCard
                  label={course.items.length === 0 ? 'Add the first dish' : 'Add a dish'}
                  onClick={() => patchCourse(ci, { items: [...course.items, { id: mkId('md'), name: '' }] })}
                />
              </RowCard>
            ))}
            <AddCard
              label={courses.length === 0 ? 'Add the first course' : 'Add a course'}
              onClick={() => write({ courses: [...courses, { id: mkId('mc'), name: '', items: [{ id: mkId('md'), name: '' }] }] })}
            />
          </div>
        </FGroup>

        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Menu" />
      </div>
    </SectionPanelShell>
  );
}

export default MenuPanel;
