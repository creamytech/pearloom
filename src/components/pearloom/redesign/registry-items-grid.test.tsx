// ─────────────────────────────────────────────────────────────
// RegistryItemsGrid — canvas honesty contract.
//
// Pins the fix for "the editor canvas kept showing MOCK items":
//   1. editable + a slug → the grid fetches the host's REAL items
//      (same public GET as published) and renders them, NOT demo.
//   2. editable + zero real items → demo furniture stands in
//      (honesty rule: demo gated by `editable`, empty state only).
//   3. pearloom:registry-items (the RegistryPanel's ping after
//      add / edit / delete) → the grid refetches, so panel writes
//      land on the canvas promptly; delete-to-zero brings the
//      demo cards back.
//   4. published (not editable) + zero items → renders nothing.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { RegistryItemsGrid } from './RegistryItemsGrid';

type FetchMock = ReturnType<typeof vi.fn>;

function mockItemsFetch(itemsRef: { current: Array<Record<string, unknown>> }): FetchMock {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/registry-items')) {
      return new Response(JSON.stringify({ items: itemsRef.current }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  });
}

const REAL_ITEM = {
  id: 'real-1', name: 'The copper kettle', description: 'For slow mornings.',
  price: 90, imageUrl: null, itemUrl: null, quantity: 1, quantityClaimed: 0,
  purchased: false, claimedByFirstName: null,
};

/* The grid's initial fetch is deferred by setTimeout(0); flush it
   inside act so state settles. */
async function flush() {
  await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
}

describe('RegistryItemsGrid canvas honesty', () => {
  const itemsRef: { current: Array<Record<string, unknown>> } = { current: [] };
  let fetchMock: FetchMock;

  beforeEach(() => {
    itemsRef.current = [];
    fetchMock = mockItemsFetch(itemsRef);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('editable with real items shows the HOST items, not demo', async () => {
    itemsRef.current = [REAL_ITEM];
    render(<RegistryItemsGrid siteSlug="my-site" editable />);
    await flush();
    expect(screen.getByText('The copper kettle')).toBeInTheDocument();
    expect(screen.queryByText('The dutch oven')).not.toBeInTheDocument();
    // It fetched via the same public GET the published grid uses.
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/api/registry-items?siteId=my-site');
  });

  it('editable with ZERO items falls back to demo furniture', async () => {
    render(<RegistryItemsGrid siteSlug="my-site" editable />);
    await flush();
    expect(screen.getByText('The dutch oven')).toBeInTheDocument();
  });

  it('pearloom:registry-items refetches — add lands on the canvas, delete brings demo back', async () => {
    render(<RegistryItemsGrid siteSlug="my-site" editable />);
    await flush();
    expect(screen.getByText('The dutch oven')).toBeInTheDocument();

    // Panel adds an item → ping → real item replaces demo.
    itemsRef.current = [REAL_ITEM];
    act(() => { window.dispatchEvent(new Event('pearloom:registry-items')); });
    await flush();
    expect(screen.getByText('The copper kettle')).toBeInTheDocument();
    expect(screen.queryByText('The dutch oven')).not.toBeInTheDocument();

    // Panel deletes the last item → ping → demo returns (editable only).
    itemsRef.current = [];
    act(() => { window.dispatchEvent(new Event('pearloom:registry-items')); });
    await flush();
    expect(screen.getByText('The dutch oven')).toBeInTheDocument();
  });

  it('published with zero items renders nothing — demo never leaks', async () => {
    const { container } = render(<RegistryItemsGrid siteSlug="my-site" />);
    await flush();
    expect(container.innerHTML).toBe('');
  });
});
