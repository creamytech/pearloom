'use client';

// Real data hooks for the Day-of dashboard.

import { useEffect, useRef, useState } from 'react';

export interface Announcement {
  id: string;
  body: string;
  kind: string | null;
  sent_at: string | null;
  scheduled_for: string | null;
  author_email: string | null;
  created_at?: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  contact_email?: string | null;
  phone?: string | null;
  status: string | null;
  notes: string | null;
}

export interface Toast {
  id: string;
  guest_name?: string | null;
  audio_url?: string | null;
  transcript?: string | null;
  duration_seconds?: number | null;
  status?: string;
  created_at?: string;
}

export function useAnnouncements(siteId?: string | null) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(0);

  const refresh = () => {
    if (!siteId) return;
    const id = ++ref.current;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/announcements?siteId=${encodeURIComponent(siteId)}`,
          { cache: 'no-store' },
        );
        if (ref.current !== id) return;
        if (!res.ok) {
          setItems([]);
        } else {
          const data = await res.json();
          setItems(Array.isArray(data.announcements) ? data.announcements : []);
        }
      } catch {
        if (ref.current === id) setItems([]);
      } finally {
        if (ref.current === id) setLoading(false);
      }
    })();
  };

  useEffect(refresh, [siteId]);

  return { items, loading, refresh };
}

export function useVendors(subdomain?: string | null) {
  const [items, setItems] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(0);

  useEffect(() => {
    if (!subdomain) {
      setItems([]);
      setLoading(false);
      return;
    }
    const id = ++ref.current;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/vendors?subdomain=${encodeURIComponent(subdomain)}`,
          { cache: 'no-store' },
        );
        if (ref.current !== id) return;
        if (!res.ok) {
          setItems([]);
        } else {
          const data = await res.json();
          setItems(Array.isArray(data.vendors) ? data.vendors : []);
        }
      } catch {
        if (ref.current === id) setItems([]);
      } finally {
        if (ref.current === id) setLoading(false);
      }
    })();
  }, [subdomain]);

  return { items, loading };
}

export function useToasts(siteId?: string | null) {
  const [items, setItems] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(0);

  const refresh = () => {
    if (!siteId) return;
    const id = ++ref.current;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/toasts?siteId=${encodeURIComponent(siteId)}`,
          { cache: 'no-store' },
        );
        if (ref.current !== id) return;
        if (!res.ok) {
          setItems([]);
        } else {
          const data = await res.json();
          setItems(Array.isArray(data.toasts) ? data.toasts : []);
        }
      } catch {
        if (ref.current === id) setItems([]);
      } finally {
        if (ref.current === id) setLoading(false);
      }
    })();
  };

  useEffect(refresh, [siteId]);

  return { items, loading, refresh };
}

// Coordinator checklist — localStorage per site until a real API lands.
export interface ChecklistItem {
  id: string;
  label: string;
  group?: string;
  done: boolean;
}
const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'done'>[] = [
  { id: 'vendor-arrivals', label: 'Confirm vendor arrivals' },
  { id: 'ceremony-setup', label: 'Verify ceremony setup' },
  { id: 'sound-check', label: 'Sound check' },
  { id: 'livestream-test', label: 'Livestream test' },
  { id: 'guestbook-signage', label: 'Guestbook & signage' },
  { id: 'seating-in-place', label: 'Seating chart in place' },
  { id: 'emergency-kit', label: 'Emergency kit ready' },
];

export function useChecklist(siteId?: string | null) {
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    if (!siteId) {
      setItems(DEFAULT_CHECKLIST.map((i) => ({ ...i, done: false })));
      return;
    }
    const key = `pearloom:checklist:${siteId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as ChecklistItem[];
        if (Array.isArray(parsed)) {
          // Merge in any new defaults that weren't saved before
          const present = new Set(parsed.map((i) => i.id));
          const extras = DEFAULT_CHECKLIST
            .filter((d) => !present.has(d.id))
            .map((d) => ({ ...d, done: false }));
          setItems([...parsed, ...extras]);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setItems(DEFAULT_CHECKLIST.map((i) => ({ ...i, done: false })));
  }, [siteId]);

  const toggle = (id: string) => {
    if (!siteId) return;
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
      try {
        localStorage.setItem(`pearloom:checklist:${siteId}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const progress = items.length ? items.filter((i) => i.done).length / items.length : 0;

  return { items, toggle, progress };
}
