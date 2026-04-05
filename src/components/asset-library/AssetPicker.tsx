'use client';

import React, { useState } from 'react';
import * as Dividers from './SvgDividers';
import * as Illustrations from './SvgIllustrations';
import * as Accents from './SvgAccents';

type AssetCategory = 'dividers' | 'illustrations' | 'accents';

interface AssetPickerProps {
  onSelect: (asset: { id: string; type: AssetCategory; name: string }) => void;
  onAddSticker?: (asset: { id: string; type: AssetCategory; name: string }) => void;
  selectedId?: string;
}

const TAB_LABELS: { key: AssetCategory; label: string }[] = [
  { key: 'dividers', label: 'Dividers' },
  { key: 'illustrations', label: 'Illustrations' },
  { key: 'accents', label: 'Accents' },
];

export function AssetPicker({ onSelect, onAddSticker, selectedId }: AssetPickerProps) {
  const [activeCategory, setActiveCategory] = useState<AssetCategory>('illustrations');
  const [addedId, setAddedId] = useState<string | null>(null);

  const containerStyle: React.CSSProperties = {
    background: '#1E1B16',
    color: 'var(--pl-ink)',
    fontFamily: 'inherit',
    borderRadius: '8px',
    overflow: 'hidden',
    width: '100%',
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid rgba(0,0,0,0.07)',
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    background: 'none',
    border: 'none',
    borderBottom: active ? '2px solid #A3B18A' : '2px solid transparent',
    color: active ? '#A3B18A' : 'var(--pl-ink-soft)',
    fontSize: '0.75rem',
    letterSpacing: '0.04em',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  });

  const scrollAreaStyle: React.CSSProperties = {
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '12px',
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  };

  const listStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  };

  const cellStyle = (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px 4px',
    border: isSelected ? '2px solid #A3B18A' : '2px solid rgba(0,0,0,0.06)',
    borderRadius: '6px',
    cursor: 'pointer',
    background: isSelected ? 'rgba(163,177,138,0.08)' : 'transparent',
    transition: 'border-color 0.15s, background 0.15s',
  });

  const dividerRowStyle = (isSelected: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px',
    border: isSelected ? '2px solid #A3B18A' : '2px solid rgba(0,0,0,0.06)',
    borderRadius: '6px',
    cursor: 'pointer',
    background: isSelected ? 'rgba(163,177,138,0.08)' : 'transparent',
    transition: 'border-color 0.15s, background 0.15s',
  });

  const labelStyle: React.CSSProperties = {
    fontSize: '0.6rem',
    color: 'var(--pl-ink-soft)',
    textAlign: 'center',
    lineHeight: 1.2,
    wordBreak: 'break-word',
    maxWidth: '100%',
  };

  const dividerLabelStyle: React.CSSProperties = {
    fontSize: '0.6rem',
    color: 'var(--pl-ink-soft)',
    whiteSpace: 'nowrap',
    minWidth: '80px',
  };

  function renderIllustrations() {
    return (
      <div style={gridStyle}>
        {Object.entries(Illustrations).map(([name, Component]) => {
          if (name === 'IllustrationProps') return null;
          const Comp = Component as React.ComponentType<{ size?: number; color?: string }>;
          const isSelected = selectedId === name;
          return (
            <div
              key={name}
              style={{ ...cellStyle(isSelected), position: 'relative' }}
              onClick={() => {
                const asset = { id: name, type: 'illustrations' as AssetCategory, name };
                onSelect(asset);
                if (onAddSticker) {
                  onAddSticker(asset);
                  setAddedId(name);
                  setTimeout(() => setAddedId(null), 2000);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect({ id: name, type: 'illustrations', name })}
            >
              {addedId === name && (
                <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '0.55rem', background: '#A3B18A', color: '#1E1B16', padding: '2px 5px', borderRadius: '4px' }}>Added!</span>
              )}
              <Comp size={32} color="var(--pl-ink)" />
              <span style={labelStyle}>{name.replace('Illustration', '')}</span>
            </div>
          );
        })}
      </div>
    );
  }

  function renderAccents() {
    return (
      <div style={gridStyle}>
        {Object.entries(Accents).map(([name, Component]) => {
          if (name === 'AccentProps') return null;
          const Comp = Component as React.ComponentType<{ size?: number; color?: string }>;
          const isSelected = selectedId === name;
          return (
            <div
              key={name}
              style={{ ...cellStyle(isSelected), position: 'relative' }}
              onClick={() => {
                const asset = { id: name, type: 'accents' as AssetCategory, name };
                onSelect(asset);
                if (onAddSticker) {
                  onAddSticker(asset);
                  setAddedId(name);
                  setTimeout(() => setAddedId(null), 2000);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect({ id: name, type: 'accents', name })}
            >
              {addedId === name && (
                <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '0.55rem', background: '#A3B18A', color: '#1E1B16', padding: '2px 5px', borderRadius: '4px' }}>Added!</span>
              )}
              <Comp size={32} color="var(--pl-ink)" />
              <span style={labelStyle}>{name.replace('Accent', '')}</span>
            </div>
          );
        })}
      </div>
    );
  }

  function renderDividers() {
    return (
      <div style={listStyle}>
        {Object.entries(Dividers).map(([name, Component]) => {
          if (name === 'DividerProps') return null;
          const Comp = Component as React.ComponentType<{ width?: string | number; height?: number; color?: string }>;
          const isSelected = selectedId === name;
          return (
            <div
              key={name}
              style={{ ...dividerRowStyle(isSelected), position: 'relative' }}
              onClick={() => {
                const asset = { id: name, type: 'dividers' as AssetCategory, name };
                onSelect(asset);
                if (onAddSticker) {
                  onAddSticker(asset);
                  setAddedId(name);
                  setTimeout(() => setAddedId(null), 2000);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect({ id: name, type: 'dividers', name })}
            >
              {addedId === name && (
                <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '0.55rem', background: '#A3B18A', color: '#1E1B16', padding: '2px 5px', borderRadius: '4px' }}>Added!</span>
              )}
              <div style={{ flex: 1, height: '32px', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                <Comp width="100%" height={32} color="var(--pl-ink)" />
              </div>
              <span style={dividerLabelStyle}>{name.replace('Divider', '')}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={tabBarStyle}>
        {TAB_LABELS.map(({ key, label }) => (
          <button
            key={key}
            style={tabStyle(activeCategory === key)}
            onClick={() => setActiveCategory(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {onAddSticker && (
        <p style={{ fontSize: '0.7rem', color: 'rgba(163,177,138,0.7)', margin: '8px 12px 0', lineHeight: 1.4 }}>
          Click to add sticker &bull; Drag to position
        </p>
      )}
      <div style={scrollAreaStyle}>
        {activeCategory === 'illustrations' && renderIllustrations()}
        {activeCategory === 'accents' && renderAccents()}
        {activeCategory === 'dividers' && renderDividers()}
      </div>
    </div>
  );
}
