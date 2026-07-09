import React from 'react';

export interface FieldProps {
  /** Mono-uppercase label above the control. Use plain words. */
  label?: string;
  /** Helper text below the control. */
  hint?: string;
  /** Controlled value. */
  value?: string;
  defaultValue?: string;
  /** (value, event) => void */
  onChange?: (value: string, event: React.ChangeEvent) => void;
  placeholder?: string;
  /** Input type (text, email, password…). Ignored when multiline. */
  type?: string;
  /** Render a <textarea> instead of <input>. */
  multiline?: boolean;
  /** Textarea rows when multiline. Default 3. */
  rows?: number;
  disabled?: boolean;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** A labelled text input / textarea — warm paper, olive focus ring. */
export function Field(props: FieldProps): JSX.Element;
