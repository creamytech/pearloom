// ─────────────────────────────────────────────────────────────
// Wallet passes — what they say, and what they refuse to do.
//
// Two failure modes drive this file:
//
//   1. A PASS LEAKS. It sits on a lock screen and gets handed to a
//      doorman. Anything about another guest, about money, or
//      about the host's account has no business on it.
//
//   2. A PASS IS TASTELESS. Wallet formats are built for concerts,
//      and their vocabulary — admits, ticket, doors — would be
//      grotesque on a funeral. The platform's STYLE name can stay
//      "eventTicket"; the words a mourner reads cannot.
//
// Apple signing is genuinely blocked on a certificate, so the
// tests there pin the REFUSAL: no certificate must mean no pass,
// never an unsigned one iOS will reject in front of a guest.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { buildPassContent, formatPassDate } from './pass-content';
import {
  buildPkPass, buildPassJson, buildPassManifest,
  PassNotConfiguredError, UNCONFIGURED_SIGNER,
} from './pkpass';
import { googleSaveUrl, buildGoogleObject, type GoogleWalletConfig } from './google-pass';

const SITE = 'https://pearloom.com/wedding/emma-james';

const WEDDING = {
  occasion: 'wedding',
  title: 'Emma & James',
  date: '2027-09-12',
  time: '4:00 PM',
  venue: 'The Old Mill',
  venueAddress: '14 Mill Lane, Hudson NY',
  dressCode: 'Garden formal',
};

const GUEST = { name: 'Aunt Prue', token: 'tok-abc-123' };

describe('the pass says what a guest needs', () => {
  const c = buildPassContent(WEDDING, GUEST, SITE);

  it('leads with the celebration and names the bearer', () => {
    expect(c.primary.value).toBe('Emma & James');
    expect(c.auxiliary.find((f) => f.key === 'bearer')?.value).toBe('Aunt Prue');
  });

  it('carries the when, the where and the dress code', () => {
    const when = c.secondary.find((f) => f.key === 'when')?.value ?? '';
    expect(when).toContain('12 September 2027');
    expect(when).toContain('4:00 PM');
    expect(c.secondary.find((f) => f.key === 'where')?.value).toBe('The Old Mill');
    expect(c.auxiliary.find((f) => f.key === 'dress')?.value).toBe('Garden formal');
  });

  it('barcodes the guest’s OWN passport, not the public site', () => {
    expect(c.barcodeMessage).toBe(`${SITE}/g/tok-abc-123`);
  });

  it('omits what the host hasn’t filled in, rather than saying TBD', () => {
    const sparse = buildPassContent({ occasion: 'wedding', title: 'Emma & James' }, GUEST, SITE);
    expect(sparse.secondary).toHaveLength(0);
    expect(JSON.stringify(sparse)).not.toMatch(/TBD|TBC|unknown/i);
  });
});

describe('a pass is not a roster', () => {
  const c = buildPassContent(
    {
      ...WEDDING,
      // Everything below is deliberately offered and must be ignored:
      // the builder takes an allowlisted shape, so extra keys can't
      // ride along even when a caller passes a whole manifest.
      ...({
        guests: [{ name: 'Someone Else', email: 'else@x.test' }],
        registryFunds: { venmo: '@emma' },
        budget: { total: 48000 },
        creator_email: 'host@x.test',
      } as Record<string, unknown>),
    },
    GUEST,
    SITE,
  );
  const serialized = JSON.stringify(c);

  it('names no other guest', () => {
    expect(serialized).not.toMatch(/Someone Else|else@/);
  });

  it('carries no money', () => {
    expect(serialized).not.toMatch(/venmo|48000/i);
  });

  it('carries no host account email', () => {
    expect(serialized).not.toMatch(/host@x\.test/);
  });
});

describe('a memorial is not a ticket', () => {
  const c = buildPassContent(
    { occasion: 'memorial', title: 'Remembering Ada Doyle', date: '2027-03-04', time: '11:00 AM', venue: 'St Mary’s', dressCode: 'Dark colours' },
    GUEST,
    SITE,
  );

  it('knows it is solemn', () => {
    expect(c.solemn).toBe(true);
  });

  it('never says "admits" — the bearer is not being admitted to a show', () => {
    expect(c.vocabulary.bearerLabel).toBe('This pass belongs to');
    expect(JSON.stringify(c)).not.toMatch(/admit/i);
  });

  it('calls it a service, not a celebration', () => {
    expect(c.vocabulary.eventLabel).toBe('Service');
    expect(JSON.stringify(c)).not.toMatch(/celebration/i);
  });

  it('drops the dress-code prompt', () => {
    // "What to wear" is not a detail anyone needs prompting on here.
    expect(c.auxiliary.find((f) => f.key === 'dress')).toBeUndefined();
  });

  it('still gives the when and where — the useful part', () => {
    expect(c.secondary.find((f) => f.key === 'when')?.value).toContain('4 March 2027');
    expect(c.secondary.find((f) => f.key === 'where')?.value).toBe('St Mary’s');
  });
});

describe('dates', () => {
  it('formats a full human date without reading the clock', () => {
    expect(formatPassDate('2027-09-12')).toBe('Sunday, 12 September 2027');
  });

  it('returns nothing for junk rather than "Invalid Date"', () => {
    for (const bad of ['', null, undefined, 'someday', '2027-13-45']) {
      expect(formatPassDate(bad as string)).not.toMatch(/invalid/i);
    }
    expect(formatPassDate('someday')).toBe('');
  });
});

describe('Apple: no certificate means NO PASS', () => {
  const content = buildPassContent(WEDDING, GUEST, SITE);
  const identity = {
    passTypeIdentifier: 'pass.com.pearloom.celebration',
    teamIdentifier: 'TEAM123',
    serialNumber: 'tok-abc-123',
  };
  const icon = { name: 'icon.png', data: Buffer.from([0x89, 0x50, 0x4E, 0x47]) };

  it('refuses rather than emitting an unsigned archive', async () => {
    // An unsigned .pkpass isn't a degraded pass — it's a file iOS
    // rejects with a meaningless error, in front of a guest.
    await expect(buildPkPass({ content, identity, images: [icon] }))
      .rejects.toBeInstanceOf(PassNotConfiguredError);
  });

  it('names the missing credential in the error', async () => {
    await expect(UNCONFIGURED_SIGNER.sign(Buffer.from('x')))
      .rejects.toThrow(/Pass Type ID certificate/i);
  });

  it('builds a complete, signed archive as soon as a signer exists', async () => {
    const signer = { async sign() { return Buffer.from('PKCS7-DER-BYTES'); } };
    const zip = await buildPkPass({ content, identity, images: [icon], signer });
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);           // a real zip
    const text = zip.toString('latin1');
    for (const name of ['pass.json', 'manifest.json', 'signature', 'icon.png']) {
      expect(text, `missing ${name}`).toContain(name);
    }
  });

  it('insists on icon.png, which iOS requires', async () => {
    const signer = { async sign() { return Buffer.from('x'); } };
    await expect(buildPkPass({ content, identity, images: [], signer }))
      .rejects.toThrow(/icon\.png/);
  });

  it('digests every payload file into the manifest', () => {
    const entries = [
      { name: 'pass.json', data: Buffer.from('{}') },
      { name: 'icon.png', data: Buffer.from([1, 2, 3]) },
    ];
    const manifest = JSON.parse(buildPassManifest(entries).toString('utf8'));
    expect(Object.keys(manifest).sort()).toEqual(['icon.png', 'pass.json']);
    // SHA-1 hex, as Apple specifies.
    for (const digest of Object.values(manifest)) {
      expect(digest).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it('gives each guest a STABLE serial so re-issuing updates one pass', () => {
    const a = buildPassJson(content, identity);
    const b = buildPassJson(content, identity);
    expect(a.serialNumber).toBe(b.serialNumber);
    expect(a.serialNumber).toBe('tok-abc-123');
  });
});

describe('Google: complete, because RS256 needs no ceremony', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const config: GoogleWalletConfig = {
    issuerEmail: 'pass@pearloom.iam.gserviceaccount.com',
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    issuerId: '3388000000000000000',
    classId: '3388000000000000000.pearloom_celebration',
  };
  const content = buildPassContent(WEDDING, GUEST, SITE);

  it('mints a real save URL with three JWT parts', () => {
    const url = googleSaveUrl(content, 'guest_tok', config, 0);
    expect(url).toMatch(/^https:\/\/pay\.google\.com\/gp\/v\/save\//);
    expect(url!.split('/save/')[1].split('.')).toHaveLength(3);
  });

  it('signs a payload that decodes back to this guest', () => {
    const url = googleSaveUrl(content, 'guest_tok', config, 0)!;
    const [, body] = url.split('/save/')[1].split('.');
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    expect(decoded.iss).toBe(config.issuerEmail);
    expect(decoded.typ).toBe('savetowallet');
    const obj = decoded.payload.eventTicketObjects[0];
    expect(obj.ticketHolderName).toBe('Aunt Prue');
    expect(obj.barcode.value).toBe(`${SITE}/g/tok-abc-123`);
  });

  it('is STABLE for the same guest — one link, not a new one per render', () => {
    expect(googleSaveUrl(content, 'guest_tok', config, 0))
      .toBe(googleSaveUrl(content, 'guest_tok', config, 0));
  });

  it('returns null with no config, instead of a broken button', () => {
    expect(googleSaveUrl(content, 'guest_tok', null)).toBeNull();
  });

  it('returns null on a malformed key rather than throwing at a guest', () => {
    expect(googleSaveUrl(content, 'guest_tok', { ...config, privateKey: 'not a key' })).toBeNull();
  });

  it('carries no other guest into the Google object either', () => {
    const obj = JSON.stringify(buildGoogleObject(content, config, 'guest_tok'));
    expect(obj).not.toMatch(/Someone Else|venmo|host@/);
  });
});
