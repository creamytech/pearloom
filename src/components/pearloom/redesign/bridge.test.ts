import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorRedesignBridge } from './bridge';
import type { StoryManifest } from '@/types';

/* ─────────────────────────────────────────────────────────────
   Editor autosave bridge — the persistence contract.

   Covers: debounced coalescing (one POST per burst, latest value),
   transient-failure retry, permanent-failure error state, the
   flush-on-unmount data-loss fix (client-side nav away from the
   editor), and the beforeunload beacon.
   ───────────────────────────────────────────────────────────── */

type LooseManifest = StoryManifest & Record<string, unknown>;
const manifest = (over: Record<string, unknown> = {}): StoryManifest =>
  ({ names: ['Ada', 'Bea'], chapters: [], ...over }) as unknown as LooseManifest;

const props = () => ({
  initialManifest: manifest(),
  initialNames: ['Ada', 'Bea'] as [string, string],
  siteSlug: 'test-site',
});

let fetchMock: ReturnType<typeof vi.fn>;

const okResponse = () =>
  Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') });
const failResponse = (status: number) =>
  Promise.resolve({ ok: false, status, text: () => Promise.resolve('boom') });

const lastPostBody = () => {
  const calls = fetchMock.mock.calls.filter((c) => c[0] === '/api/sites');
  const last = calls[calls.length - 1];
  return JSON.parse((last[1] as { body: string }).body) as {
    subdomain: string;
    manifest: Record<string, unknown>;
    names: [string, string];
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn(() => okResponse());
  vi.stubGlobal('fetch', fetchMock);
  Object.defineProperty(navigator, 'sendBeacon', {
    value: vi.fn(() => true),
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('editor bridge autosave', () => {
  it('coalesces a burst of edits into exactly one POST carrying the latest value', async () => {
    const { result } = renderHook(() => useEditorRedesignBridge(props()));

    act(() => { result.current.editField((m) => ({ ...m, tagline: 'one' } as unknown as StoryManifest)); });
    act(() => { result.current.editField((m) => ({ ...m, tagline: 'two' } as unknown as StoryManifest)); });

    // Nothing yet — the 2s debounce hasn't elapsed.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.saveState).toBe('unsaved');

    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = lastPostBody();
    expect(body.subdomain).toBe('test-site');
    expect(body.manifest.tagline).toBe('two');
    expect(result.current.saveState).toBe('saved');
  });

  it('retries a transient 500 and settles saved once the retry succeeds', async () => {
    fetchMock.mockImplementationOnce(() => failResponse(500));
    const { result } = renderHook(() => useEditorRedesignBridge(props()));

    act(() => { result.current.editField((m) => ({ ...m, x: 1 } as unknown as StoryManifest)); });

    // First POST fails → back to 'unsaved' with a retry armed (not 'error').
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.saveState).toBe('unsaved');

    // Backoff for retry #1 is 2000ms.
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.saveState).toBe('saved');
  });

  it('surfaces a permanent 4xx as error without retrying', async () => {
    fetchMock.mockImplementation(() => failResponse(400));
    const { result } = renderHook(() => useEditorRedesignBridge(props()));

    act(() => { result.current.editField((m) => ({ ...m, x: 2 } as unknown as StoryManifest)); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.saveState).toBe('error');
  });

  it('flushes a pending edit on unmount (client-side navigation away)', async () => {
    const { result, unmount } = renderHook(() => useEditorRedesignBridge(props()));

    act(() => { result.current.editField((m) => ({ ...m, farewell: 'kept' } as unknown as StoryManifest)); });
    // Debounce still pending — no POST yet.
    expect(fetchMock).not.toHaveBeenCalled();

    unmount();

    // The unmount flush must fire one POST with the last edit so it
    // isn't lost when the editor tears down mid-debounce.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(lastPostBody().manifest.farewell).toBe('kept');
  });

  it('does not flush on unmount when everything is already saved', async () => {
    const { result, unmount } = renderHook(() => useEditorRedesignBridge(props()));

    act(() => { result.current.editField((m) => ({ ...m, x: 3 } as unknown as StoryManifest)); });
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.saveState).toBe('saved');

    unmount();
    // No extra POST — the save already landed.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fires a sendBeacon flush on beforeunload while unsaved', () => {
    const { result } = renderHook(() => useEditorRedesignBridge(props()));
    act(() => { result.current.editField((m) => ({ ...m, x: 4 } as unknown as StoryManifest)); });

    act(() => {
      const evt = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(evt);
    });

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });
});
