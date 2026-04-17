// ─────────────────────────────────────────────────────────────
// Pearloom / lib/use-site-role.ts
//
// Resolve the current viewer's role on the site being edited.
// Returns a capability bag so the editor can gate individual
// actions ('canPublish', 'canEditContent', 'canManageGuests',
// 'canManageBilling') without checking role strings inline.
//
// Owner           → everything
// Co-editor       → edit content, manage guests; no publish/billing
// Guest manager   → manage guests/seating only; no edit/publish
// Viewer          → read + comment only
// Null (no match) → fall back to owner (pre-login drafts)
// ─────────────────────────────────────────────────────────────

'use client';

import { useEffect, useState } from 'react';

export type SiteRole = 'owner' | 'editor' | 'guest-manager' | 'viewer' | null;

export interface SiteCapabilities {
  role: SiteRole;
  loading: boolean;
  canPublish: boolean;
  canEditContent: boolean;
  canManageGuests: boolean;
  canManageBilling: boolean;
  canDeleteSite: boolean;
  canInviteCoHosts: boolean;
}

const NO_ROLE: Omit<SiteCapabilities, 'loading'> = {
  role: null,
  canPublish: false,
  canEditContent: false,
  canManageGuests: false,
  canManageBilling: false,
  canDeleteSite: false,
  canInviteCoHosts: false,
};

function capsFor(role: SiteRole): Omit<SiteCapabilities, 'loading'> {
  switch (role) {
    case 'owner':
      return {
        role,
        canPublish: true,
        canEditContent: true,
        canManageGuests: true,
        canManageBilling: true,
        canDeleteSite: true,
        canInviteCoHosts: true,
      };
    case 'editor':
      return {
        role,
        canPublish: false,
        canEditContent: true,
        canManageGuests: true,
        canManageBilling: false,
        canDeleteSite: false,
        canInviteCoHosts: false,
      };
    case 'guest-manager':
      return {
        role,
        canPublish: false,
        canEditContent: false,
        canManageGuests: true,
        canManageBilling: false,
        canDeleteSite: false,
        canInviteCoHosts: false,
      };
    case 'viewer':
      return {
        role,
        canPublish: false,
        canEditContent: false,
        canManageGuests: false,
        canManageBilling: false,
        canDeleteSite: false,
        canInviteCoHosts: false,
      };
    default:
      return NO_ROLE;
  }
}

/**
 * Fetch & cache the viewer's role for the site identified by
 * subdomain (preferred) or siteId. Assumes owner until proven
 * otherwise so the editor isn't over-restrictive during the
 * initial fetch.
 */
export function useSiteRole(opts: { subdomain?: string; siteId?: string }): SiteCapabilities {
  const [role, setRole] = useState<SiteRole>('owner'); // optimistic
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = opts.subdomain || opts.siteId;
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams();
    if (opts.subdomain) params.set('subdomain', opts.subdomain);
    if (opts.siteId) params.set('siteId', opts.siteId);
    fetch(`/api/sites/co-host/me?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : { role: null }))
      .then((data: { role: SiteRole }) => {
        if (cancelled) return;
        // Treat null (not logged in / no record) as owner — pre-login
        // drafts have no cohost rows. Publish flow still gates on
        // server-side auth separately.
        setRole(data.role ?? 'owner');
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [opts.subdomain, opts.siteId]);

  return { ...capsFor(role), loading };
}
