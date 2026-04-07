'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/BlockConfigEditor.tsx
// Auto-generated prop editor for any block type.
// Reads the block schema and renders the appropriate form
// controls (text, textarea, toggle, select, color, etc.)
// Users edit block config here — every change updates the block.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2, Sparkles, ChevronDown, Link as LinkIcon } from 'lucide-react';
import { BLOCK_SCHEMAS, type PropSchema, type BlockSchema } from '@/lib/block-engine/schema';
import { hasBindings } from '@/lib/block-engine/bindings';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { CustomSelect } from '@/components/ui/custom-select';
import type { PageBlock } from '@/types';

// ── Single prop control ──────────────────────────────────────

function PropControl({
  name,
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: PropSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const strValue = typeof value === 'string' ? value : '';
  const numValue = typeof value === 'number' ? value : 0;
  const boolValue = typeof value === 'boolean' ? value : false;
  const isBinding = typeof value === 'string' && hasBindings(value);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 'var(--pl-radius-sm)',
    border: '1px solid rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.35)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    fontSize: '0.88rem',
    fontFamily: 'var(--pl-font-body)',
    color: 'var(--pl-ink)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--pl-muted)',
    marginBottom: '6px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={labelStyle}>
        {schema.label}
        {schema.bindingHint && (
          <button
            onClick={() => onChange(schema.bindingHint)}
            title={`Use binding: ${schema.bindingHint}`}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: isBinding ? 'var(--pl-olive)' : 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center',
              padding: '1px 4px', borderRadius: '4px',
              fontSize: '0.55rem',
            }}
          >
            <LinkIcon size={10} />
          </button>
        )}
      </div>

      {schema.type === 'text' && (
        <input
          type="text"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={schema.placeholder}
          style={inputStyle}
          className="pl-focus-glow"
        />
      )}

      {schema.type === 'textarea' && (
        <textarea
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={schema.placeholder}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
          className="pl-focus-glow"
        />
      )}

      {schema.type === 'number' && (
        <input
          type="number"
          value={numValue}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
          style={{ ...inputStyle, width: '120px' }}
          className="pl-focus-glow"
        />
      )}

      {schema.type === 'boolean' && (
        <Switch
          checked={boolValue}
          onChange={(checked) => onChange(checked)}
        />
      )}

      {schema.type === 'url' && (
        <input
          type="url"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={schema.placeholder}
          style={inputStyle}
          className="pl-focus-glow"
        />
      )}

      {schema.type === 'date' && (
        <DatePicker
          value={strValue}
          onChange={(date) => onChange(date)}
          placeholder={schema.placeholder}
        />
      )}

      {schema.type === 'color' && (
        <ColorPicker
          value={strValue || '#A3B18A'}
          onChange={(color) => onChange(color)}
        />
      )}

      {schema.type === 'image' && (
        <input
          type="url"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={schema.placeholder || 'Image URL'}
          style={inputStyle}
          className="pl-focus-glow"
        />
      )}

      {schema.type === 'select' && schema.options && (
        <CustomSelect
          value={strValue || (schema.defaultValue as string) || ''}
          onChange={(val) => onChange(val)}
          options={schema.options}
        />
      )}

      {schema.type === 'binding' && (
        <input
          type="text"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={schema.bindingHint || '{{ variable.path }}'}
          style={{
            ...inputStyle,
            fontFamily: 'monospace',
            fontSize: '0.82rem',
            color: 'var(--pl-olive-deep)',
          }}
          className="pl-focus-glow"
        />
      )}

      {/* Description */}
      {schema.description && (
        <p style={{
          fontSize: '0.68rem', color: 'var(--pl-muted)',
          marginTop: '4px', lineHeight: 1.4,
        }}>
          {schema.description}
        </p>
      )}

      {/* Binding indicator */}
      {isBinding && (
        <p style={{
          fontSize: '0.62rem', color: 'var(--pl-olive)',
          marginTop: '3px', fontFamily: 'monospace',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          <LinkIcon size={9} /> Dynamic binding
        </p>
      )}
    </div>
  );
}

// ── Main BlockConfigEditor ───────────────────────────────────

interface BlockConfigEditorProps {
  block: PageBlock;
  onChange: (config: Record<string, unknown>) => void;
}

export function BlockConfigEditor({ block, onChange }: BlockConfigEditorProps) {
  const schema = BLOCK_SCHEMAS[block.type];
  const config = block.config || {};

  if (!schema) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: 'var(--pl-muted)',
        fontSize: '0.85rem',
      }}>
        <Settings2 size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
        <p>No editable properties for this block type.</p>
      </div>
    );
  }

  // Group props by their group field
  const groups = useMemo(() => {
    const grouped: Record<string, Array<[string, PropSchema]>> = {};
    for (const [key, prop] of Object.entries(schema.props)) {
      const group = prop.group || 'General';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push([key, prop]);
    }
    return grouped;
  }, [schema]);

  const handlePropChange = (propName: string, value: unknown) => {
    const updated = { ...config, [propName]: value };
    onChange(updated);
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Block type header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '20px', paddingBottom: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'var(--pl-olive-mist)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Settings2 size={16} color="var(--pl-olive-deep)" />
        </div>
        <div>
          <h3 style={{
            fontSize: '1rem', fontWeight: 600,
            fontFamily: 'var(--pl-font-heading)',
            color: 'var(--pl-ink)',
            margin: 0,
          }}>
            {schema.label}
          </h3>
          <p style={{
            fontSize: '0.68rem', color: 'var(--pl-muted)',
            margin: 0,
          }}>
            {schema.description}
          </p>
        </div>
      </div>

      {/* Grouped props */}
      {Object.entries(groups).map(([groupName, props]) => (
        <div key={groupName} style={{ marginBottom: '20px' }}>
          {Object.keys(groups).length > 1 && (
            <h4 style={{
              fontSize: '0.62rem', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'var(--pl-muted)',
              marginBottom: '12px',
              paddingBottom: '6px',
              borderBottom: '1px solid rgba(255,255,255,0.3)',
            }}>
              {groupName}
            </h4>
          )}
          {props.map(([key, prop]) => (
            <PropControl
              key={key}
              name={key}
              schema={prop}
              value={config[key] ?? prop.defaultValue}
              onChange={(val) => handlePropChange(key, val)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
