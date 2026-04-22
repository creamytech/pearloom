'use client';

// ─────────────────────────────────────────────────────────────
// Day-of dashboard V2. Mounted from /dashboard/day-of inside
// DashShell. All data is real (manifest events + announcements +
// vendors + toasts + coordinator checklist).
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { PD } from '../design/DesignAtoms';
import {
  DayOfTabs,
  DayOfHeaderStrip,
  RunOfShow,
  DayOfHero,
  Announcements,
} from './DayOfSections';
import {
  VendorContacts,
  LivestreamControl,
  VoiceToasts,
  CoordinatorChecklist,
  GuestComms,
} from './DayOfSide';
import { useSelectedSite } from '../design/dash/hooks';
import {
  useAnnouncements,
  useVendors,
  useToasts,
  useChecklist,
} from './DayOfHooks';
import type { WeddingEvent, StoryManifest } from '@/types';

export function DayOfV2() {
  const { data: session } = useSession();
  const { site } = useSelectedSite();
  const announcements = useAnnouncements(site?.id);
  const vendors = useVendors(site?.domain);
  const toasts = useToasts(site?.id);
  const checklist = useChecklist(site?.id);

  const firstName = (session?.user?.name || session?.user?.email || 'there').split(/[\s@]/)[0];

  const manifest = site?.manifest as StoryManifest | null | undefined;
  const events: WeddingEvent[] = useMemo(() => {
    return Array.isArray(manifest?.events) ? manifest!.events : [];
  }, [manifest]);

  const dateLabel = useMemo(() => {
    const iso = manifest?.logistics?.date;
    if (!iso) {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  }, [manifest]);

  return (
    <div
      style={{
        background: PD.paper,
        minHeight: '100%',
      }}
    >
      {/* Tabs */}
      <div
        style={{
          borderBottom: '1px solid rgba(31,36,24,0.06)',
          marginBottom: 22,
          padding: '0 clamp(16px, 4vw, 32px)',
        }}
      >
        <DayOfTabs active="day-of" />
      </div>

      {/* Header strip */}
      <DayOfHeaderStrip
        dateLabel={dateLabel}
        progress={checklist.progress}
        onView={() => {}}
      />

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 20,
          padding: '0 clamp(16px, 4vw, 32px) 22px',
        }}
        className="pl-dayof-grid"
      >
        {/* Left col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <RunOfShow events={events} />
          <LivestreamControl subdomain={site?.domain} />
        </div>

        {/* Middle col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <DayOfHero firstName={firstName} />
          <Announcements
            siteId={site?.id}
            items={announcements.items}
            loading={announcements.loading}
            onRefresh={announcements.refresh}
          />
          <VoiceToasts
            siteId={site?.id}
            items={toasts.items}
            loading={toasts.loading}
            onRefresh={toasts.refresh}
          />
        </div>

        {/* Right col */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <VendorContacts
            subdomain={site?.domain}
            items={vendors.items}
            loading={vendors.loading}
          />
          <CoordinatorChecklist
            items={checklist.items}
            toggle={checklist.toggle}
            progress={checklist.progress}
          />
          <GuestComms />
        </div>
      </div>

      {/* Footer strip */}
      <div
        style={{
          margin: '22px clamp(16px, 4vw, 32px) 40px',
          padding: '16px 22px',
          background: '#E8DFE9',
          borderRadius: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontFamily: '"Fraunces", Georgia, serif', fontSize: 17, fontStyle: 'italic', color: PD.ink, marginBottom: 2 }}>
            Every detail. Every moment.{' '}
            <span style={{ color: PD.olive }}>Beautifully orchestrated.</span>
          </div>
          <div style={{ fontSize: 12, color: PD.inkSoft }}>
            Need backup? Your day-of guide is always here.
          </div>
        </div>
        <a
          href="/dashboard/help"
          style={{
            background: '#6E5BA8',
            color: '#FFFEF7',
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          ☎ Call now
        </a>
      </div>

      <style jsx>{`
        @media (max-width: 1200px) {
          :global(.pl-dayof-grid) {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
          }
        }
        @media (max-width: 820px) {
          :global(.pl-dayof-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
