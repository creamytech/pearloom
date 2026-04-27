import * as SecureStore from 'expo-secure-store';
import type { UserSite, SiteDetail, Guest, RsvpStats, Analytics } from './types';

const API_BASE = __DEV__ ? 'http://localhost:3000' : 'https://pearloom.com';

const TOKEN_KEY = 'pearloom_auth_token';

/**
 * Generic fetch wrapper that attaches the stored auth token to every request.
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ── Specific endpoints ──────────────────────────────────────────────────

export async function getSites(): Promise<UserSite[]> {
  return apiFetch<UserSite[]>('/api/sites');
}

export async function getSite(domain: string): Promise<SiteDetail> {
  return apiFetch<SiteDetail>(`/api/sites/${encodeURIComponent(domain)}`);
}

export async function getGuests(siteId: string): Promise<Guest[]> {
  return apiFetch<Guest[]>(`/api/sites/${siteId}/guests`);
}

export async function getRsvpStats(siteId: string): Promise<RsvpStats> {
  return apiFetch<RsvpStats>(`/api/sites/${siteId}/rsvp-stats`);
}

export async function getAnalytics(siteId: string): Promise<Analytics> {
  return apiFetch<Analytics>(`/api/sites/${siteId}/analytics`);
}

export async function uploadPhoto(file: {
  uri: string;
  type: string;
  name: string;
}): Promise<{ publicUrl: string }> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  const res = await fetch(`${API_BASE}/api/photos/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Let FormData set Content-Type with boundary
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Upload ${res.status}: ${body || res.statusText}`);
  }

  return res.json() as Promise<{ publicUrl: string }>;
}
