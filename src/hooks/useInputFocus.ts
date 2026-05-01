import { useCallback } from 'react';

export function useInputFocus() {
  const onFocus = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--pl-olive, #5C6B3F)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(163,177,138,0.15)';
    e.currentTarget.style.outline = 'none';
  }, []);

  const onBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)';
    e.currentTarget.style.boxShadow = 'none';
  }, []);

  return { onFocus, onBlur };
}
