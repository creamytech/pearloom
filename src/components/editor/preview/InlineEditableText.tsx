'use client';

import { useRef, useEffect, useCallback, createElement } from 'react';

export interface InlineEditableTextProps {
  value: string;
  onCommit: (newValue: string) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  tag?: 'h1' | 'h2' | 'p' | 'div' | 'span';
  style?: React.CSSProperties;
  className?: string;
  multiline?: boolean;
  /** Placeholder shown when value is empty */
  placeholder?: string;
}

export function InlineEditableText({
  value,
  onCommit,
  isEditing,
  onStartEdit,
  onCancelEdit,
  tag = 'div',
  style,
  className,
  multiline = false,
  placeholder,
}: InlineEditableTextProps) {
  const ref = useRef<HTMLElement>(null);
  const originalValue = useRef(value);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && ref.current) {
      originalValue.current = value;
      ref.current.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing, value]);

  const commit = useCallback(() => {
    const text = ref.current?.innerText?.trim() || '';
    onCommit(text || originalValue.current);
  }, [onCommit]);

  const cancel = useCallback(() => {
    if (ref.current) {
      ref.current.innerText = originalValue.current;
    }
    onCancelEdit();
  }, [onCancelEdit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
      return;
    }
    if (e.key === 'Enter') {
      if (multiline && e.shiftKey) return; // Allow Shift+Enter for newlines
      e.preventDefault();
      commit();
    }
  }, [commit, cancel, multiline]);

  const handleBlur = useCallback(() => {
    if (isEditing) commit();
  }, [isEditing, commit]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent parent onClick (chapter select)
    e.preventDefault();
    if (!isEditing) onStartEdit();
  }, [isEditing, onStartEdit]);

  const displayValue = value || placeholder || '';

  if (isEditing) {
    return createElement(tag, {
      ref,
      contentEditable: true,
      suppressContentEditableWarning: true,
      className,
      style: {
        ...style,
        cursor: 'text',
        outline: '2px solid var(--eg-plum, #6D597A)',
        outlineOffset: '2px',
        borderRadius: '4px',
        minWidth: '40px',
        minHeight: '1em',
      },
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      dangerouslySetInnerHTML: undefined,
      children: value,
    });
  }

  return createElement(tag, {
    className,
    style: {
      ...style,
      cursor: 'text',
      transition: 'outline-color 0.15s',
    },
    onDoubleClick: handleDoubleClick,
    title: 'Double-click to edit',
    children: displayValue,
  });
}
