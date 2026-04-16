'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/BlockConfigEditor.tsx
// Auto-generated prop editor for any block type.
// Reads the block schema and renders the appropriate form
// controls (text, textarea, toggle, select, color, list, etc.)
// Users edit block config here — every change updates the block.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Settings2, Link as LinkIcon, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { BLOCK_SCHEMAS, type PropSchema } from '@/lib/block-engine/schema';
import { hasBindings } from '@/lib/block-engine/bindings';
import { Switch } from '@/components/ui/switch';
import { ColorPicker } from '@/components/ui/color-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { CustomSelect } from '@/components/ui/custom-select';
import type { PageBlock } from '@/types';

// ── Shared styles ────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--pl-radius-sm)',
  border: '1px solid var(--pl-chrome-border)',
  background: 'var(--pl-chrome-surface)',
  fontSize: '0.8rem',
  fontFamily: 'var(--pl-font-body)',
  color: 'var(--pl-chrome-text)',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--pl-chrome-text-muted)',
  marginBottom: '6px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
};

// ── Single scalar prop control ───────────────────────────────

function ScalarControl({
  schema,
  value,
  onChange,
}: {
  schema: PropSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const strValue = typeof value === 'string' ? value : '';
  const numValue = typeof value === 'number' ? value : 0;
  const boolValue = typeof value === 'boolean' ? value : false;

  if (schema.type === 'text') {
    return (
      <input
        type="text"
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.placeholder}
        style={inputStyle}
        className="pl-focus-glow"
      />
    );
  }
  if (schema.type === 'textarea') {
    return (
      <textarea
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.placeholder}
        rows={3}
        style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
        className="pl-focus-glow"
      />
    );
  }
  if (schema.type === 'number') {
    return (
      <input
        type="number"
        value={numValue}
        min={schema.min}
        max={schema.max}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        style={{ ...inputStyle, width: '120px' }}
        className="pl-focus-glow"
      />
    );
  }
  if (schema.type === 'boolean') {
    return <Switch checked={boolValue} onChange={(checked) => onChange(checked)} />;
  }
  if (schema.type === 'url') {
    return (
      <input
        type="url"
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.placeholder}
        style={inputStyle}
        className="pl-focus-glow"
      />
    );
  }
  if (schema.type === 'date') {
    return <DatePicker value={strValue} onChange={(date) => onChange(date)} placeholder={schema.placeholder} />;
  }
  if (schema.type === 'color') {
    return <ColorPicker value={strValue || '#71717A'} onChange={(color) => onChange(color)} />;
  }
  if (schema.type === 'image') {
    return (
      <input
        type="url"
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.placeholder || 'Image URL'}
        style={inputStyle}
        className="pl-focus-glow"
      />
    );
  }
  if (schema.type === 'select' && schema.options) {
    return (
      <CustomSelect
        value={strValue || (schema.defaultValue as string) || ''}
        onChange={(val) => onChange(val)}
        options={schema.options}
      />
    );
  }
  if (schema.type === 'binding') {
    return (
      <input
        type="text"
        value={strValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={schema.bindingHint || '{{ variable.path }}'}
        style={{ ...inputStyle, fontFamily: 'monospace' }}
        className="pl-focus-glow"
      />
    );
  }
  return null;
}

// ── List prop control ────────────────────────────────────────

function ListControl({
  schema,
  value,
  onChange,
}: {
  schema: PropSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const items: Array<Record<string, unknown>> = Array.isArray(value)
    ? (value as Array<Record<string, unknown>>)
    : [];
  const shape = schema.itemShape ?? {};
  const defaults = schema.itemDefaults ?? {};
  const itemLabel = schema.itemLabel ?? 'Item';

  const update = (next: Array<Record<string, unknown>>) => onChange(next);

  const updateItem = (index: number, key: string, val: unknown) => {
    const next = items.map((it, i) => (i === index ? { ...it, [key]: val } : it));
    update(next);
  };

  const removeItem = (index: number) => {
    update(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const addItem = () => update([...items, { ...defaults }]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.length === 0 && (
        <div
          style={{
            padding: '14px 12px',
            border: '1px dashed var(--pl-chrome-border)',
            borderRadius: 10,
            background: 'var(--pl-chrome-surface-2)',
            color: 'var(--pl-chrome-text-muted)',
            fontSize: '0.78rem',
            textAlign: 'center',
          }}
        >
          No {itemLabel.toLowerCase()}s yet.
        </div>
      )}
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            padding: 12,
            border: '1px solid var(--pl-chrome-border)',
            borderRadius: 12,
            background: 'var(--pl-chrome-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--pl-chrome-text-muted)',
              }}
            >
              {itemLabel} {index + 1}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <IconBtn
                label="Move up"
                disabled={index === 0}
                onClick={() => moveItem(index, -1)}
                icon={<ChevronUp size={13} />}
              />
              <IconBtn
                label="Move down"
                disabled={index === items.length - 1}
                onClick={() => moveItem(index, 1)}
                icon={<ChevronDown size={13} />}
              />
              <IconBtn
                label="Remove"
                onClick={() => removeItem(index)}
                icon={<Trash2 size={13} />}
                danger
              />
            </div>
          </div>
          {Object.entries(shape).map(([key, propSchema]) => (
            <div key={key}>
              <div style={{ ...labelStyle, marginBottom: 4 }}>{propSchema.label}</div>
              <ScalarControl
                schema={propSchema}
                value={item[key] ?? propSchema.defaultValue}
                onChange={(val) => updateItem(index, key, val)}
              />
              {propSchema.description && (
                <p
                  style={{
                    fontSize: '0.62rem',
                    color: 'var(--pl-chrome-text-muted)',
                    marginTop: 3,
                    lineHeight: 1.4,
                  }}
                >
                  {propSchema.description}
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '9px 12px',
          borderRadius: 10,
          border: '1px dashed var(--pl-chrome-border)',
          background: 'transparent',
          color: 'var(--pl-chrome-text)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background var(--pl-dur-fast) var(--pl-ease-out), border-color var(--pl-dur-fast) var(--pl-ease-out)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--pl-chrome-accent-soft)';
          e.currentTarget.style.borderColor = 'var(--pl-chrome-accent)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'var(--pl-chrome-border)';
        }}
      >
        <Plus size={13} /> Add {itemLabel.toLowerCase()}
      </button>
    </div>
  );
}

function IconBtn({
  label,
  icon,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 24,
        height: 24,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid var(--pl-chrome-border)',
        background: 'var(--pl-chrome-surface-2)',
        color: danger ? 'var(--pl-chrome-danger)' : 'var(--pl-chrome-text-muted)',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'background var(--pl-dur-fast) var(--pl-ease-out), color var(--pl-dur-fast) var(--pl-ease-out)',
      }}
    >
      {icon}
    </button>
  );
}

// ── Single prop row (label + control + helpers) ─────────────

function PropControl({
  schema,
  value,
  onChange,
}: {
  name: string;
  schema: PropSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const isBinding = typeof value === 'string' && hasBindings(value);

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={labelStyle}>
        {schema.label}
        {schema.bindingHint && (
          <button
            onClick={() => onChange(schema.bindingHint)}
            title={`Use binding: ${schema.bindingHint}`}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isBinding ? 'var(--pl-chrome-accent)' : 'var(--pl-chrome-text-faint)',
              display: 'flex',
              alignItems: 'center',
              padding: '1px 4px',
              borderRadius: '4px',
              fontSize: '0.55rem',
            }}
          >
            <LinkIcon size={10} />
          </button>
        )}
      </div>

      {schema.type === 'list' ? (
        <ListControl schema={schema} value={value} onChange={onChange} />
      ) : (
        <ScalarControl schema={schema} value={value} onChange={onChange} />
      )}

      {schema.description && schema.type !== 'list' && (
        <p
          style={{
            fontSize: '0.65rem',
            color: 'var(--pl-chrome-text-muted)',
            marginTop: '4px',
            lineHeight: 1.4,
          }}
        >
          {schema.description}
        </p>
      )}

      {isBinding && (
        <p
          style={{
            fontSize: '0.6rem',
            color: 'var(--pl-chrome-accent)',
            marginTop: '3px',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
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

  const groups = useMemo(() => {
    if (!schema) return {} as Record<string, Array<[string, PropSchema]>>;
    const grouped: Record<string, Array<[string, PropSchema]>> = {};
    for (const [key, prop] of Object.entries(schema.props)) {
      const group = prop.group || 'General';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push([key, prop]);
    }
    return grouped;
  }, [schema]);

  if (!schema) {
    return (
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: 'var(--pl-chrome-text-muted)',
          fontSize: '0.8rem',
        }}
      >
        <Settings2 size={24} style={{ opacity: 0.3, marginBottom: '8px' }} />
        <p>No editable properties for this block type.</p>
      </div>
    );
  }

  const handlePropChange = (propName: string, value: unknown) => {
    const updated = { ...config, [propName]: value };
    onChange(updated);
  };

  const groupCount = Object.keys(groups).length;

  return (
    <div style={{ padding: '16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--pl-chrome-border)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'var(--pl-chrome-surface-2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings2 size={16} style={{ color: 'var(--pl-chrome-text)' }} />
        </div>
        <div>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              color: 'var(--pl-chrome-text)',
              margin: 0,
            }}
          >
            {schema.label}
          </h3>
          <p
            style={{
              fontSize: '0.65rem',
              color: 'var(--pl-chrome-text-muted)',
              margin: 0,
            }}
          >
            {schema.description}
          </p>
        </div>
      </div>

      {Object.entries(groups).map(([groupName, props]) => (
        <div
          key={groupName}
          style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '12px',
            background: groupCount > 1 ? 'var(--pl-chrome-surface-2)' : 'transparent',
            border: groupCount > 1 ? '1px solid var(--pl-chrome-border)' : 'none',
          }}
        >
          {groupCount > 1 && (
            <h4
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--pl-chrome-text-muted)',
                marginBottom: '16px',
                paddingBottom: '8px',
                borderBottom: '1px solid var(--pl-chrome-border)',
              }}
            >
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
