'use client';

// ─────────────────────────────────────────────────────────────
// CanvasInspector — right rail for the canvas designer.
//
// Shows controls scoped to the currently selected element:
//   • Text — font/size/weight/italic/color/align/letterpress
//   • Photo — shape/filter/zoom/offset
//   • Shape — fill/stroke
//   • Background — paper colour + Pear-paint URL
// Plus a "+ Add" tray (text / photo / line / shape) and a
// stacking layer list.
// ─────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { Icon } from '../../motifs';
import {
  CANVAS_HEIGHT, CANVAS_WIDTH, isBackground, isPhoto, isShape, isText, newId,
  type CanvasElement, type CanvasScene, type PhotoFilter,
} from '@/lib/invite-canvas/types';

interface Props {
  scene: CanvasScene;
  setScene: (next: CanvasScene) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  /** Optional library of photos already on the manifest. */
  libraryPhotos?: string[];
  /** Optional Pear-paint background URL — can be set as bg image. */
  pearPaintUrl?: string | null;
}

const FONT_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Fraunces · serif',         value: 'Fraunces, Georgia, serif' },
  { label: 'Cormorant · romantic',     value: '"Cormorant Garamond", Georgia, serif' },
  { label: 'Allura · script',          value: '"Allura", "Caveat", cursive' },
  { label: 'Caveat · handwritten',     value: '"Caveat", cursive' },
  { label: 'Inter · sans-serif',       value: 'Inter, system-ui, sans-serif' },
  { label: 'Space Grotesk · modern',   value: '"Space Grotesk", Inter, sans-serif' },
];

const FILTER_OPTIONS: Array<{ v: PhotoFilter; l: string }> = [
  { v: 'none', l: 'None' },
  { v: 'sepia', l: 'Sepia' },
  { v: 'film', l: 'Film' },
  { v: 'dreamy', l: 'Dreamy' },
  { v: 'mono', l: 'B&W' },
  { v: 'vintage', l: 'Vintage' },
  { v: 'noir', l: 'Noir' },
  { v: 'sunwash', l: 'Sunwash' },
];

export function CanvasInspector({
  scene, setScene, selectedId, setSelectedId, libraryPhotos, pearPaintUrl,
}: Props) {
  const selected = scene.elements.find((e) => e.id === selectedId) ?? null;
  const photoUploadRef = useRef<HTMLInputElement | null>(null);

  function patch(id: string, p: Partial<CanvasElement>) {
    setScene({
      ...scene,
      elements: scene.elements.map((e) => e.id === id ? ({ ...e, ...p } as CanvasElement) : e),
    });
  }

  function addText() {
    const next: CanvasElement = {
      id: newId('text'),
      type: 'text',
      x: CANVAS_WIDTH / 2 - 200, y: CANVAS_HEIGHT / 2 - 40,
      w: 400, h: 80,
      z: Math.max(...scene.elements.map((e) => e.z)) + 1,
      text: 'Edit me',
      fontFamily: 'Fraunces, Georgia, serif',
      fontSize: 48,
      fontWeight: 500,
      italic: false,
      textAlign: 'center',
      color: '#0E0D0B',
      tracking: 0,
      lineHeight: 1.05,
    };
    setScene({ ...scene, elements: [...scene.elements, next] });
    setSelectedId(next.id);
  }

  function addPhoto(src: string) {
    const next: CanvasElement = {
      id: newId('photo'),
      type: 'photo',
      x: 200, y: 300, w: 600, h: 600,
      z: Math.max(...scene.elements.map((e) => e.z)) + 1,
      src,
      shape: 'rounded',
      cornerRadius: 12,
      filter: 'none',
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    };
    setScene({ ...scene, elements: [...scene.elements, next] });
    setSelectedId(next.id);
  }

  function addLine() {
    const next: CanvasElement = {
      id: newId('line'),
      type: 'shape',
      x: 280, y: CANVAS_HEIGHT / 2,
      w: 440, h: 1.4,
      z: Math.max(...scene.elements.map((e) => e.z)) + 1,
      shape: 'line',
      orientation: 'horizontal',
      fill: '#C6703D',
    };
    setScene({ ...scene, elements: [...scene.elements, next] });
    setSelectedId(next.id);
  }

  function addRect() {
    const next: CanvasElement = {
      id: newId('rect'),
      type: 'shape',
      x: 360, y: 600, w: 280, h: 280,
      z: Math.max(...scene.elements.map((e) => e.z)) + 1,
      shape: 'rect',
      fill: '#EDE0C5',
      cornerRadius: 8,
    };
    setScene({ ...scene, elements: [...scene.elements, next] });
    setSelectedId(next.id);
  }

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    if (file.size > 12 * 1024 * 1024) return;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error('read failed'));
      r.onload = () => resolve(String(r.result || ''));
      r.readAsDataURL(file);
    });
    addPhoto(dataUrl);
  }

  const orderedReversed = [...scene.elements].sort((a, b) => b.z - a.z);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Add tray ── */}
      <Section title="Add">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
          <ToolBtn icon="type"     label="Text"  onClick={addText} />
          <ToolBtn icon="image"    label="Photo" onClick={() => photoUploadRef.current?.click()} />
          <ToolBtn icon="layout"   label="Rect"  onClick={addRect} />
          <ToolBtn icon="section"  label="Line"  onClick={addLine} />
        </div>
        <input
          ref={photoUploadRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { void onUpload(e.target.files); e.target.value = ''; }}
        />
        {libraryPhotos && libraryPhotos.length > 0 && (
          <>
            <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 10, marginBottom: 6 }}>
              From your site
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {libraryPhotos.slice(0, 8).map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => addPhoto(url)}
                  style={{
                    padding: 0,
                    aspectRatio: '1 / 1',
                    border: '1px solid var(--line)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    background: 'var(--cream-2)',
                    cursor: 'pointer',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ── Selected element controls ── */}
      {selected ? (
        <Section title="Element">
          {isText(selected) && <TextControls el={selected} patch={(p) => patch(selected.id, p)} />}
          {isPhoto(selected) && <PhotoControls el={selected} patch={(p) => patch(selected.id, p)} />}
          {isShape(selected) && <ShapeControls el={selected} patch={(p) => patch(selected.id, p)} />}
          {isBackground(selected) && (
            <BackgroundControls el={selected} patch={(p) => patch(selected.id, p)} pearPaintUrl={pearPaintUrl ?? null} />
          )}
        </Section>
      ) : (
        <div style={{
          padding: '14px 14px',
          background: 'var(--cream-2)',
          border: '1px dashed var(--line)',
          borderRadius: 10,
          fontSize: 12.5,
          color: 'var(--ink-soft)',
          lineHeight: 1.5,
        }}>
          Click an element on the canvas to edit it. Double-click text to retype. Drag corners to resize. Hold Shift while dragging a corner to lock the aspect ratio.
        </div>
      )}

      {/* ── Layer list ── */}
      <Section title="Layers">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {orderedReversed.map((el) => (
            <button
              key={el.id}
              type="button"
              onClick={() => setSelectedId(el.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 7,
                border: el.id === selectedId ? '1.5px solid var(--ink)' : '1.5px solid transparent',
                background: el.id === selectedId ? 'var(--cream-2)' : 'var(--card)',
                color: 'var(--ink)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-ui)',
                fontSize: 12,
              }}
            >
              <Icon
                name={el.type === 'text' ? 'type' : el.type === 'photo' ? 'image' : el.type === 'background' ? 'layout' : 'section'}
                size={12}
              />
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {labelFor(el)}
              </span>
              {el.locked && <Icon name="lock" size={11} color="var(--ink-muted)" />}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function labelFor(el: CanvasElement): string {
  if (isText(el)) return `“${(el.text || ' ').slice(0, 28)}${el.text.length > 28 ? '…' : ''}”`;
  if (isPhoto(el)) return 'Photo';
  if (isShape(el)) return el.shape === 'line' ? 'Line' : el.shape === 'ellipse' ? 'Ellipse' : 'Rectangle';
  if (isBackground(el)) return 'Background';
  return 'Element';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ToolBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pl8-card-lift"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 10,
        border: '1.5px solid var(--line)',
        background: 'var(--card)',
        color: 'var(--ink)',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        justifyContent: 'flex-start',
      }}
    >
      <Icon name={icon} size={13} /> {label}
    </button>
  );
}

// ── Type-specific control panels ──

function TextControls({ el, patch }: { el: import('@/lib/invite-canvas/types').TextElement; patch: (p: Partial<CanvasElement>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Field label="Content">
        <textarea
          value={el.text}
          onChange={(e) => patch({ text: e.target.value })}
          rows={2}
          style={inputStyle}
        />
      </Field>
      <Field label="Font">
        <select
          value={el.fontFamily}
          onChange={(e) => patch({ fontFamily: e.target.value })}
          style={inputStyle}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Size">
          <input
            type="number"
            value={el.fontSize}
            onChange={(e) => patch({ fontSize: Math.max(10, parseInt(e.target.value, 10) || 10) })}
            style={inputStyle}
            min={10}
            max={300}
          />
        </Field>
        <Field label="Weight">
          <select value={el.fontWeight} onChange={(e) => patch({ fontWeight: parseInt(e.target.value, 10) })} style={inputStyle}>
            <option value={300}>Light</option>
            <option value={400}>Regular</option>
            <option value={500}>Medium</option>
            <option value={600}>Semibold</option>
            <option value={700}>Bold</option>
          </select>
        </Field>
      </div>
      <Field label="Align">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {(['left', 'center', 'right'] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => patch({ textAlign: a })}
              style={{
                padding: '8px 0',
                borderRadius: 7,
                background: el.textAlign === a ? 'var(--ink)' : 'var(--card)',
                color: el.textAlign === a ? 'var(--cream)' : 'var(--ink)',
                border: '1.5px solid var(--line)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                textTransform: 'capitalize',
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Italic">
          <Toggle on={!!el.italic} onChange={(v) => patch({ italic: v })} />
        </Field>
        <Field label="Letterpress">
          <Toggle on={!!el.letterpress} onChange={(v) => patch({ letterpress: v })} />
        </Field>
      </div>
      <Field label="Color">
        <ColorRow value={el.color} onChange={(c) => patch({ color: c })} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Tracking">
          <input
            type="number"
            step={0.01}
            value={el.tracking ?? 0}
            onChange={(e) => patch({ tracking: parseFloat(e.target.value) || 0 })}
            style={inputStyle}
          />
        </Field>
        <Field label="Line height">
          <input
            type="number"
            step={0.05}
            value={el.lineHeight ?? 1.05}
            onChange={(e) => patch({ lineHeight: parseFloat(e.target.value) || 1 })}
            style={inputStyle}
          />
        </Field>
      </div>
    </div>
  );
}

function PhotoControls({ el, patch }: { el: import('@/lib/invite-canvas/types').PhotoElement; patch: (p: Partial<CanvasElement>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Field label="Shape">
        <select value={el.shape} onChange={(e) => patch({ shape: e.target.value as 'rect' | 'rounded' | 'circle' | 'arch' | 'polaroid' })} style={inputStyle}>
          <option value="rect">Rectangle</option>
          <option value="rounded">Rounded</option>
          <option value="circle">Circle</option>
          <option value="arch">Arch</option>
          <option value="polaroid">Polaroid</option>
        </select>
      </Field>
      <Field label="Filter">
        <select value={el.filter ?? 'none'} onChange={(e) => patch({ filter: e.target.value as PhotoFilter })} style={inputStyle}>
          {FILTER_OPTIONS.map((o) => (<option key={o.v} value={o.v}>{o.l}</option>))}
        </select>
      </Field>
      <Field label="Zoom">
        <Slider value={el.zoom ?? 1} min={1} max={2.5} step={0.05} onChange={(v) => patch({ zoom: v })} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label="Pan X">
          <Slider value={el.offsetX ?? 0} min={-0.5} max={0.5} step={0.02} onChange={(v) => patch({ offsetX: v })} />
        </Field>
        <Field label="Pan Y">
          <Slider value={el.offsetY ?? 0} min={-0.5} max={0.5} step={0.02} onChange={(v) => patch({ offsetY: v })} />
        </Field>
      </div>
    </div>
  );
}

function ShapeControls({ el, patch }: { el: import('@/lib/invite-canvas/types').ShapeElement; patch: (p: Partial<CanvasElement>) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Field label="Fill">
        <ColorRow value={el.fill ?? '#0E0D0B'} onChange={(c) => patch({ fill: c })} />
      </Field>
      {el.shape !== 'line' && (
        <Field label="Corner radius">
          <input
            type="number"
            value={el.cornerRadius ?? 0}
            onChange={(e) => patch({ cornerRadius: parseInt(e.target.value, 10) || 0 })}
            style={inputStyle}
          />
        </Field>
      )}
    </div>
  );
}

function BackgroundControls({
  el, patch, pearPaintUrl,
}: {
  el: import('@/lib/invite-canvas/types').BackgroundElement;
  patch: (p: Partial<CanvasElement>) => void;
  pearPaintUrl: string | null;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Field label="Paper">
        <ColorRow value={el.color} onChange={(c) => patch({ color: c })} />
      </Field>
      <Field label="Painted backdrop">
        {pearPaintUrl ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, background: 'var(--cream-2)', borderRadius: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pearPaintUrl} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }} />
            <button
              type="button"
              onClick={() => patch({ imageUrl: el.imageUrl ? undefined : pearPaintUrl })}
              style={{
                flex: 1, padding: '8px 12px',
                background: el.imageUrl ? 'var(--ink)' : 'var(--card)',
                color: el.imageUrl ? 'var(--cream)' : 'var(--ink)',
                border: '1.5px solid var(--line)',
                borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              {el.imageUrl ? 'Remove backdrop' : 'Use Pear paint as backdrop'}
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', padding: '8px 10px', background: 'var(--cream-2)', borderRadius: 8 }}>
            Generate a Pear-painted backdrop from the AI tab to use it here.
          </div>
        )}
      </Field>
    </div>
  );
}

// ── Tiny shared form primitives ──

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      {children}
    </label>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        padding: '8px 12px',
        borderRadius: 7,
        background: on ? 'var(--ink)' : 'var(--card)',
        color: on ? 'var(--cream)' : 'var(--ink)',
        border: '1.5px solid var(--line)',
        fontSize: 11.5,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
      }}
    >
      {on ? 'On' : 'Off'}
    </button>
  );
}

function ColorRow({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <span style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 8px',
      background: 'var(--card)',
      border: '1.5px solid var(--line)',
      borderRadius: 9,
    }}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 26, height: 26, padding: 0, border: 'none', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...inputStyle,
          padding: '6px 0',
          border: 'none',
          background: 'transparent',
          fontFamily: 'var(--pl-font-mono, ui-monospace, monospace)',
          fontSize: 11,
          letterSpacing: '0.04em',
        }}
      />
    </span>
  );
}

function Slider({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (next: number) => void }) {
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      style={{ width: '100%', accentColor: 'var(--peach-ink, #C6703D)' }}
    />
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: 'var(--paper)',
  border: '1.5px solid var(--line)',
  borderRadius: 8,
  fontSize: 12.5,
  color: 'var(--ink)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
  boxSizing: 'border-box',
};
