'use client';

/* Menu section — dinner, course by course.

   Data: manifest.menuSection  (typed in src/types.ts)
     { intro?, courses: [{ id, name, items: [{ id, name,
       description?, tags? }] }] }
   `tags` are dietary chips (Vegetarian / Vegan / GF / Nut-free /
   Spicy). MenuPanel (editor/panels/blocks/MenuPanel.tsx) is the
   editor over the same field.

   Variants (layouts.ts):
     card   — one centered menu card: course names as small-caps
              mono eyebrows flanked by gold hairlines, dishes in
              display type with quiet descriptions.
     twocol — the same language, one card per course in a
              responsive two-column grid.

   Editor-only demo: empty + editable renders a neutral two-course
   sample under a "Sample menu" chip so the host sees the shape.
   Empty + published returns null — guests never see scaffolding
   (the honesty rule: `editable` is the ONLY gate for demo copy). */

import type { CSSProperties, ReactNode } from 'react';
import { VariantSectionHead } from '../_section-head';
import { BlockFrame, blockCopy, type BlockSectionProps } from './_shared';

export interface MenuDishData { id?: string; name?: string; description?: string; tags?: string[] }
export interface MenuCourseData { id?: string; name?: string; items?: MenuDishData[] }
export interface MenuSectionData { intro?: string; courses?: MenuCourseData[] }

export function readMenu(manifest: BlockSectionProps['manifest']): MenuSectionData {
  const data = (manifest as unknown as { menuSection?: MenuSectionData }).menuSection;
  return data && typeof data === 'object' ? data : {};
}

const MONO = 'var(--t-mono, ui-monospace, SFMono-Regular, Menlo, monospace)';

/* Neutral demo courses — editor canvas only (see gate below). */
const DEMO_COURSES: MenuCourseData[] = [
  {
    id: 'demo-1',
    name: 'To begin',
    items: [
      { id: 'demo-1a', name: 'Garden greens', description: 'Shaved fennel, citrus, toasted seeds', tags: ['Vegan', 'GF'] },
      { id: 'demo-1b', name: 'Warm sourdough', description: 'Cultured butter, flaked salt', tags: ['Vegetarian'] },
    ],
  },
  {
    id: 'demo-2',
    name: 'The main',
    items: [
      { id: 'demo-2a', name: 'Roast chicken', description: 'Spring vegetables, pan jus', tags: ['GF'] },
      { id: 'demo-2b', name: 'Wild mushroom risotto', description: 'Parmesan, thyme', tags: ['Vegetarian'] },
    ],
  },
];

/** Courses with at least one named dish (or a name of their own),
 *  dishes trimmed to the named ones. */
function presentableCourses(data: MenuSectionData): MenuCourseData[] {
  const courses = Array.isArray(data.courses) ? data.courses : [];
  return courses
    .map((c) => ({ ...c, items: (c.items ?? []).filter((d) => (d.name ?? '').trim()) }))
    .filter((c) => (c.name ?? '').trim() || (c.items ?? []).length > 0);
}

/* ─── section ─────────────────────────────────────────────────── */

export function MenuSection({ manifest, pad, editable, variant, onEditCopy }: BlockSectionProps) {
  const data = readMenu(manifest);
  const real = presentableCourses(data);
  const intro = (data.intro ?? '').trim();
  const empty = real.length === 0 && !intro;
  if (empty && !editable) return null;

  /* `editable` is the ONLY gate for the demo (honesty rule). */
  const demo = empty && editable;
  const courses = demo ? DEMO_COURSES : real;

  return (
    <BlockFrame pad={pad}>
      <VariantSectionHead
        eyebrow={blockCopy(manifest, 'menuEyebrow', 'From the kitchen')}
        title={blockCopy(manifest, 'menuTitle', 'The menu')}
        editable={editable}
        onEditEyebrow={onEditCopy ? (v) => onEditCopy('menuEyebrow', v) : undefined}
        onEditTitle={onEditCopy ? (v) => onEditCopy('menuTitle', v) : undefined}
      />
      {demo && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <span
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              border: '1px dashed var(--t-line)',
              background: 'var(--t-card)',
              fontFamily: MONO,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--t-ink-muted)',
            }}
          >
            Sample menu — yours begins in the Menu panel
          </span>
        </div>
      )}
      {intro && !demo && (
        <p
          style={{
            maxWidth: 480,
            margin: '0 auto 26px',
            textAlign: 'center',
            fontStyle: 'italic',
            fontSize: 14.5,
            lineHeight: 1.65,
            color: 'var(--t-ink-soft)',
          }}
        >
          {intro}
        </p>
      )}
      {variant === 'twocol' ? (
        <MenuTwoCol courses={courses} />
      ) : variant === 'bill-of-fare' ? (
        <MenuBillOfFare courses={courses} />
      ) : (
        <MenuCard courses={courses} />
      )}
    </BlockFrame>
  );
}

/* ─── shared course composition ───────────────────────────────── */

function CourseHead({ name }: { name: string }) {
  const rule: CSSProperties = { flex: 1, height: 1, background: 'var(--t-gold)', opacity: 0.55, minWidth: 18 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <span aria-hidden style={rule} />
      <span
        style={{
          fontFamily: MONO,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: 'var(--t-accent-ink)',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      <span aria-hidden style={rule} />
    </div>
  );
}

function DishRow({ dish }: { dish: MenuDishData }) {
  const tags = (dish.tags ?? []).map((t) => t.trim()).filter(Boolean);
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontFamily: 'var(--t-display)',
          fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
          fontSize: 17.5,
          lineHeight: 1.3,
          color: 'var(--t-ink)',
        }}
      >
        {dish.name}
      </div>
      {dish.description?.trim() && (
        <div style={{ marginTop: 3, fontSize: 12.5, fontStyle: 'italic', lineHeight: 1.55, color: 'var(--t-ink-soft)' }}>
          {dish.description}
        </div>
      )}
      {tags.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                padding: '2px 8px',
                borderRadius: 999,
                border: '1px solid var(--t-line)',
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--t-ink-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CourseBlock({ course }: { course: MenuCourseData }) {
  return (
    <div>
      {(course.name ?? '').trim() && <CourseHead name={course.name!} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {(course.items ?? []).map((dish, i) => (
          <DishRow key={dish.id ?? i} dish={dish} />
        ))}
      </div>
    </div>
  );
}

function courseCard(children: ReactNode, key?: string) {
  return (
    <div
      key={key}
      style={{
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        borderRadius: 'var(--t-radius-lg, 14px)',
        padding: 'clamp(22px, 4vw, 36px) clamp(18px, 4vw, 34px)',
      }}
    >
      {children}
    </div>
  );
}

/* ─── card — one centered menu card ───────────────────────────── */

function MenuCard({ courses }: { courses: MenuCourseData[] }) {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      {courseCard(
        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          {courses.map((course, i) => (
            <CourseBlock key={course.id ?? i} course={course} />
          ))}
        </div>,
      )}
    </div>
  );
}

/* ─── bill-of-fare — one tall prix-fixe sheet (2026-07-02) ──────
   The third menu idea (card + twocol shared one CourseBlock and
   read as one idea): a narrow printed sheet with a double hairline
   frame, courses opened by roman numerals in gold, a pearl dot
   between courses. Reads as the menu card at the place setting. */

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

function MenuBillOfFare({ courses }: { courses: MenuCourseData[] }) {
  return (
    <div
      style={{
        maxWidth: 420,
        margin: '0 auto',
        background: 'var(--t-paper)',
        border: '1px solid var(--t-line)',
        padding: 'clamp(26px, 5vw, 44px) clamp(20px, 4vw, 36px)',
        position: 'relative',
      }}
    >
      {/* Inner hairline — the double rule of a printed bill. */}
      <div aria-hidden style={{ position: 'absolute', inset: 6, border: '1px solid var(--t-line-soft)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 26 }}>
        {courses.map((course, i) => (
          <div key={course.id ?? i}>
            {i > 0 && (
              <div aria-hidden style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--t-gold)' }} />
              </div>
            )}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.3em',
                  color: 'var(--t-gold)',
                  marginBottom: 4,
                }}
              >
                {ROMAN[i] ?? String(i + 1)}
              </div>
              {(course.name ?? '').trim() && (
                <div
                  style={{
                    fontFamily: 'var(--t-display)',
                    fontStyle: 'italic',
                    fontWeight: 'var(--t-display-wght)' as CSSProperties['fontWeight'],
                    fontSize: 19,
                    color: 'var(--t-ink)',
                  }}
                >
                  {course.name}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(course.items ?? []).map((dish, di) => (
                <DishRow key={dish.id ?? di} dish={dish} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── twocol — one card per course ────────────────────────────── */

function MenuTwoCol({ courses }: { courses: MenuCourseData[] }) {
  return (
    <div
      style={{
        maxWidth: 760,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 14,
        alignItems: 'start',
      }}
    >
      {courses.map((course, i) => (
        <div key={course.id ?? i}>
          {courseCard(<CourseBlock course={course} />)}
        </div>
      ))}
    </div>
  );
}
