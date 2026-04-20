'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConnectionsPanel } from '@/components/dashboard/ConnectionsPanel';

interface DashSite {
  domain: string;
  manifest: {
    celebration?: { id?: string; name?: string };
    occasion?: string;
    names?: [string, string];
  } | null;
  names?: [string, string] | null;
}

export function ConnectionsClient() {
  const [sites, setSites] = useState<DashSite[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch('/api/sites', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      setSites((data.sites ?? []) as DashSite[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load sites.');
      setSites([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (sites === null) {
    return (
      <div
        style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--pl-muted)',
          fontStyle: 'italic',
        }}
      >
        Threading…
      </div>
    );
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 'var(--pl-radius-sm)',
            background: 'color-mix(in oklab, var(--pl-plum) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--pl-plum) 30%, transparent)',
            color: 'var(--pl-plum)',
            fontSize: '0.88rem',
          }}
        >
          {error}
        </div>
      )}
      <ConnectionsPanel sites={sites} onChanged={refresh} />
    </>
  );
}
