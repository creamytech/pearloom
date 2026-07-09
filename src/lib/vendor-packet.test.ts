import { describe, it, expect } from 'vitest';
import {
  shapeVendorPacket,
  googleMapsUrl,
  parseClockMinutes,
  isPlausiblePacketToken,
  type PacketVendorRow,
  type PacketSiteRow,
} from './vendor-packet';

const vendor: PacketVendorRow = {
  name: 'Marigold & Co.',
  category: 'Florist',
  arrival_time: '2:30 PM',
  site_id: 'site-uuid',
};

const site: PacketSiteRow = {
  site_config: {
    names: ['Emma', 'James'],
    occasion: 'wedding',
    creator_email: 'host@example.com',
  },
  ai_manifest: {
    logistics: {
      date: '2026-09-12',
      venue: 'The Orchard House',
      venueAddress: '14 Pear Lane, Sonoma, CA',
      venueLat: 38.29,
      venueLng: -122.46,
    },
    dayOfContact: { name: 'Sam Reyes', phone: '(555) 010-1234' },
    events: [
      { name: 'Reception', time: '6:00 PM', venue: 'The Barn' },
      { name: 'Ceremony', time: '4:00 PM', venue: 'The Orchard House' },
      { name: 'Brunch', time: '10:00 AM', day: 2 },
    ],
  },
};

describe('shapeVendorPacket', () => {
  it('shapes the full packet and sorts the run of show by day then time', () => {
    const p = shapeVendorPacket(vendor, site);
    expect(p.event).toEqual({ name: 'Emma & James', date: '2026-09-12', occasion: 'wedding' });
    expect(p.vendor).toEqual({ name: 'Marigold & Co.', category: 'Florist', arrivalTime: '2:30 PM' });
    expect(p.venue.address).toBe('14 Pear Lane, Sonoma, CA');
    expect(p.contact).toEqual({ name: 'Sam Reyes', phone: '(555) 010-1234' });
    expect(p.schedule.map((e) => e.name)).toEqual(['Ceremony', 'Reception', 'Brunch']);
  });

  it('never leaks the host account email — no field of the packet carries it', () => {
    const p = shapeVendorPacket(vendor, site);
    expect(JSON.stringify(p)).not.toContain('host@example.com');
  });

  it('omits the contact card unless the host authored BOTH a name and a phone', () => {
    const noPhone: PacketSiteRow = {
      ...site,
      ai_manifest: { ...(site.ai_manifest as object), dayOfContact: { name: 'Sam' } },
    };
    expect(shapeVendorPacket(vendor, noPhone).contact).toBeNull();
    const none: PacketSiteRow = { site_config: site.site_config, ai_manifest: {} };
    expect(shapeVendorPacket(vendor, none).contact).toBeNull();
  });

  it('shows one name for solo occasions', () => {
    const solo: PacketSiteRow = {
      site_config: { names: ['Marisol', ''], occasion: 'quinceanera' },
      ai_manifest: {},
    };
    expect(shapeVendorPacket(vendor, solo).event.name).toBe('Marisol');
  });

  it('fails soft on an empty site row', () => {
    const p = shapeVendorPacket(
      { ...vendor, arrival_time: null },
      { site_config: null, ai_manifest: null },
    );
    expect(p.event.name).toBe('The celebration');
    expect(p.event.date).toBeNull();
    expect(p.vendor.arrivalTime).toBeNull();
    expect(p.schedule).toEqual([]);
  });
});

describe('googleMapsUrl', () => {
  it('prefers coordinates over the address', () => {
    const p = shapeVendorPacket(vendor, site);
    expect(googleMapsUrl(p.venue)).toBe('https://www.google.com/maps/search/?api=1&query=38.29,-122.46');
  });
  it('falls back to the encoded name + address, and null when there is nothing', () => {
    expect(googleMapsUrl({ name: 'The Barn', address: '1 Way', lat: null, lng: null })).toBe(
      'https://www.google.com/maps/search/?api=1&query=The%20Barn%2C%201%20Way',
    );
    expect(googleMapsUrl({ name: null, address: null, lat: null, lng: null })).toBeNull();
  });
});

describe('parseClockMinutes', () => {
  it('accepts 12h and 24h clocks', () => {
    expect(parseClockMinutes('4:00 PM')).toBe(960);
    expect(parseClockMinutes('16:00')).toBe(960);
    expect(parseClockMinutes('12:15 AM')).toBe(15);
    expect(parseClockMinutes('early-ish')).toBeNull();
    expect(parseClockMinutes(null)).toBeNull();
  });
});

describe('isPlausiblePacketToken', () => {
  it('accepts base64url tokens and rejects garbage', () => {
    expect(isPlausiblePacketToken('Ab3_-xYz01234567890abcde')).toBe(true);
    expect(isPlausiblePacketToken('short')).toBe(false);
    expect(isPlausiblePacketToken('has spaces not a token!!')).toBe(false);
  });
});
