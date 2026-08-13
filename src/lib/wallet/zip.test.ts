// ─────────────────────────────────────────────────────────────
// The ZIP writer, checked against a REAL unzip.
//
// Hand-rolled binary formats are exactly the place where a
// self-consistent test proves nothing: my reader and my writer can
// agree perfectly and still produce an archive that iOS rejects.
// So the important test here shells out to the system `unzip` and
// makes it read what we wrote. If that binary is missing the test
// says so out loud rather than quietly passing on the weaker
// checks.
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeZip, crc32 } from './zip';

const FILES = [
  { name: 'pass.json', data: Buffer.from(JSON.stringify({ hello: 'world' }), 'utf8') },
  { name: 'manifest.json', data: Buffer.from('{"pass.json":"abc"}', 'utf8') },
  { name: 'icon.png', data: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3]) },
];

function hasUnzip(): boolean {
  try { execFileSync('unzip', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; }
}

describe('crc32', () => {
  it('matches the known IEEE checksum for "123456789"', () => {
    // The standard check value for CRC-32/ISO-HDLC.
    expect(crc32(Buffer.from('123456789', 'utf8'))).toBe(0xCBF43926);
  });

  it('is 0 for empty input', () => {
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });
});

describe('a real unzip can read what we wrote', () => {
  const available = hasUnzip();

  it('has an unzip binary to test against', () => {
    // Stated as its own assertion so a missing binary is a visible
    // failure, not a silently skipped guarantee.
    expect(available, 'system `unzip` not available — the archive was never independently verified').toBe(true);
  });

  it('extracts every entry byte-for-byte', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-zip-'));
    const archive = path.join(dir, 'test.pkpass');
    fs.writeFileSync(archive, makeZip(FILES));

    execFileSync('unzip', ['-qq', '-o', archive, '-d', path.join(dir, 'out')]);

    for (const f of FILES) {
      const got = fs.readFileSync(path.join(dir, 'out', f.name));
      expect(got.equals(f.data), `${f.name} round-tripped wrong`).toBe(true);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('passes unzip’s own integrity check', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-zip-'));
    const archive = path.join(dir, 'test.pkpass');
    fs.writeFileSync(archive, makeZip(FILES));
    // -t verifies each entry's CRC. A wrong checksum or a bad
    // central directory fails here.
    const out = execFileSync('unzip', ['-t', archive], { encoding: 'utf8' });
    expect(out).toMatch(/No errors detected/i);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('archive properties', () => {
  it('is deterministic — same input, byte-identical output', () => {
    // A pass regenerated for the same guest shouldn't churn, and a
    // clock-derived timestamp would make every archive unique.
    expect(makeZip(FILES).equals(makeZip(FILES))).toBe(true);
  });

  it('refuses duplicate entry names', () => {
    // Some readers take the first, some the last. A .pkpass with
    // two pass.json entries is the worst kind of bug to ship.
    expect(() => makeZip([FILES[0], FILES[0]])).toThrow(/duplicate/i);
  });

  it('handles an empty file and an empty archive', () => {
    const withEmpty = makeZip([{ name: 'empty.txt', data: Buffer.alloc(0) }]);
    expect(withEmpty.length).toBeGreaterThan(0);
    expect(makeZip([]).length).toBe(22);   // end-of-central-directory only
  });

  it('writes the local file header signature first', () => {
    expect(makeZip(FILES).readUInt32LE(0)).toBe(0x04034b50);
  });
});
