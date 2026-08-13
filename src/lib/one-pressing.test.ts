// The merge flag's resolution order (C.5): URL beats storage beats
// deploy default beats off — and the server always sees off.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { onePressingEnabled, ONE_PRESSING_STORAGE_KEY } from '@/lib/one-pressing';

function setUrl(search: string) {
  Object.defineProperty(window, 'location', {
    value: new URL(`http://localhost:3001/wizard/new${search}`),
    writable: true,
  });
}

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllEnvs();
  setUrl('');
});

describe('onePressingEnabled', () => {
  it('defaults OFF — the classic wizard is the fallback', () => {
    setUrl('');
    expect(onePressingEnabled()).toBe(false);
  });

  it('?press=one turns it on for the visit; ?press=classic forces it off', () => {
    setUrl('?press=one');
    expect(onePressingEnabled()).toBe(true);
    setUrl('?press=classic');
    window.localStorage.setItem(ONE_PRESSING_STORAGE_KEY, '1');
    expect(onePressingEnabled()).toBe(false); // URL beats storage
  });

  it('the storage toggle persists a choice; the deploy env is the default beneath it', () => {
    setUrl('');
    window.localStorage.setItem(ONE_PRESSING_STORAGE_KEY, '1');
    expect(onePressingEnabled()).toBe(true);
    window.localStorage.setItem(ONE_PRESSING_STORAGE_KEY, '0');
    vi.stubEnv('NEXT_PUBLIC_ONE_PRESSING', '1');
    expect(onePressingEnabled()).toBe(false); // storage beats env
    window.localStorage.clear();
    expect(onePressingEnabled()).toBe(true); // env alone
  });
});
