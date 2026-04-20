'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/site/PackingListBlock.tsx
//
// Bring-this-list for destination trips — bachelor/ette weekend,
// destination weddings, reunions. Host curates the items; each
// guest can check items off locally (localStorage per site slug).
// No server state — intentional MVP scope.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, type CSSProperties } from 'react';
import { Check } from 'lucide-react';

export interface PackingItem {
  label: string;
  category?: string;
  note?: string;
  /** If true, shows a "required" dot next to the label. */
  required?: boolean;
}

interface PackingListBlockProps {
  title?: string;
  subtitle?: string;
  /** Storage key suffix — usually the site slug so state stays per-site. */
  storageKey?: string;
  items: PackingItem[];
  accent?: string;
  foreground?: string;
  muted?: string;
  headingFont?: string;
  bodyFont?: string;
  style?: CSSProperties;
}

export function PackingListBlock({
  title = 'What to pack',
  subtitle,
  storageKey = 'default',
  items,
  accent = 'var(--pl-olive)',
  foreground = 'var(--pl-ink)',
  muted = 'var(--pl-muted)',
  headingFont = 'var(--pl-font-display, Georgia, serif)',
  bodyFont = 'var(--pl-font-body, system-ui, sans-serif)',
  style,
}: PackingListBlockProps) {
  const storeKey = `pearloom:packing:${storageKey}`;
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(storeKey);
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore — localStorage may be unavailable */
    }
  }, [storeKey]);

  const toggle = (label: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(storeKey, JSON.stringify([...next]));
        } catch { /* ignore */ }
      }
      return next;
    });
  };

  // Group by category — items without a category go under "Essentials".
  const groups = new Map<string, PackingItem[]>();
  for (const item of items) {
    if (!item.label.trim()) continue;
    const cat = item.category?.trim() || 'Essentials';
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(item);
  }

  return (
    <section
      style={{
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
        color: foreground,
        fontFamily: bodyFont,
        ...style,
      }}
      data-pe-section="packingList"
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2
            className="pl-display"
            style={{
              margin: 0,
              fontFamily: headingFont,
              fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
              color: foreground,
              fontStyle: 'italic',
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: '10px auto 0', maxWidth: '52ch', color: muted, fontSize: '0.96rem', lineHeight: 1.55 }}>
              {subtitle}
            </p>
          )}
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {Array.from(groups.entries()).map(([cat, catItems]) => (
            <div
              key={cat}
              style={{
                border: '1px solid var(--pl-divider)',
                borderRadius: 'var(--pl-radius-lg)',
                background: 'var(--pl-cream-card)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--pl-divider-soft)',
                  background: `color-mix(in oklab, ${accent} 7%, transparent)`,
                  fontFamily: 'var(--pl-font-mono, ui-monospace)',
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: accent,
                }}
              >
                {cat}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {catItems.map((item, i) => {
                  const on = checked.has(item.label);
                  return (
                    <li
                      key={`${item.label}-${i}`}
                      style={{
                        padding: '12px 20px',
                        borderTop: i > 0 ? '1px solid var(--pl-divider-soft)' : undefined,
                      }}
                    >
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 14,
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            flexShrink: 0,
                            width: 20,
                            height: 20,
                            borderRadius: 'var(--pl-radius-xs)',
                            border: `1.5px solid ${on ? accent : 'var(--pl-divider)'}`,
                            background: on ? accent : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 2,
                            transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
                          }}
                        >
                          {on && <Check size={13} color="var(--pl-cream)" strokeWidth={3} />}
                        </span>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(item.label)}
                          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                          aria-label={item.label}
                        />
                        <span style={{ flex: 1 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 10,
                              color: foreground,
                              fontSize: '0.98rem',
                              fontWeight: 500,
                              textDecoration: on ? 'line-through' : 'none',
                              textDecorationColor: muted,
                              transition: 'text-decoration-color var(--pl-dur-fast)',
                            }}
                          >
                            {item.label}
                            {item.required && (
                              <span
                                aria-label="required"
                                title="Don\u2019t forget this one."
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: 'var(--pl-plum)',
                                }}
                              />
                            )}
                          </span>
                          {item.note && (
                            <span style={{ display: 'block', marginTop: 2, fontSize: '0.82rem', color: muted, lineHeight: 1.5 }}>
                              {item.note}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
