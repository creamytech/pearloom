'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / editor/CustomCSSEditor.tsx
// Per-block custom CSS editor for power users.
// Scoped CSS that only applies to the specific block.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PageBlock } from '@/types';

interface CustomCSSEditorProps {
  block: PageBlock;
  onChange: (css: string) => void;
}

export function CustomCSSEditor({ block, onChange }: CustomCSSEditorProps) {
  const currentCSS = (block.config?._customCSS as string) || '';
  const [value, setValue] = useState(currentCSS);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateCSS = (css: string): boolean => {
    // Basic safety checks — no @import, no url() to external resources, no expression()
    const forbidden = ['@import', 'expression(', 'javascript:', 'url(http'];
    for (const pattern of forbidden) {
      if (css.toLowerCase().includes(pattern)) {
        setError(`Forbidden pattern: ${pattern}`);
        return false;
      }
    }
    setError(null);
    return true;
  };

  const handleApply = () => {
    if (!validateCSS(value)) return;
    onChange(value);
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        marginBottom: '12px',
      }}>
        <Code size={14} color="#18181B" />
        <span style={{
          fontSize: '0.65rem', fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          color: '#18181B',
        }}>
          Custom CSS
        </span>
        <span style={{
          fontSize: '0.55rem', fontWeight: 600,
          color: '#71717A',
          padding: '2px 6px', borderRadius: '4px',
          background: 'rgba(255,255,255,0.2)',
        }}>
          Advanced
        </span>
      </div>

      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`.block {\n  /* Your custom CSS here */\n  border: 2px solid gold;\n  padding: 2rem;\n}`}
        spellCheck={false}
        className="pl-focus-glow"
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '12px',
          borderRadius: 'var(--pl-radius-sm)',
          border: error ? '1.5px solid var(--pl-warning)' : '1.5px solid rgba(255,255,255,0.25)',
          background: 'rgba(255,255,255,0.2)',
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: '0.78rem',
          lineHeight: 1.6,
          color: '#18181B',
          resize: 'vertical',
          tabSize: 2,
        }}
      />

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginTop: '6px', color: 'var(--pl-warning)',
          fontSize: '0.72rem', fontWeight: 600,
        }}>
          <AlertTriangle size={12} /> {error}
        </div>
      )}

      <div style={{
        display: 'flex', gap: '8px', marginTop: '10px',
      }}>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={handleApply}
          icon={applied ? <Check size={12} /> : <Code size={12} />}
        >
          {applied ? 'Applied' : 'Apply CSS'}
        </Button>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setValue(''); onChange(''); }}
          >
            Clear
          </Button>
        )}
      </div>

      <p style={{
        fontSize: '0.62rem', color: '#71717A',
        marginTop: '8px', lineHeight: 1.4,
      }}>
        CSS is scoped to this block. Use <code style={{ fontSize: '0.58rem', background: 'rgba(255,255,255,0.2)', padding: '1px 4px', borderRadius: '3px' }}>.block</code> to target the wrapper.
      </p>
    </div>
  );
}
