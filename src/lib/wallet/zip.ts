// ─────────────────────────────────────────────────────────────
// Pearloom / lib/wallet/zip.ts
//
// A minimal, deterministic ZIP writer.
//
// A `.pkpass` is a ZIP archive, and this repo has no zip
// dependency. Rather than add one for a handful of small files,
// this writes the format directly — store-only (no compression),
// which is explicitly allowed and keeps the implementation small
// enough to read in one sitting.
//
// DETERMINISTIC ON PURPOSE: no timestamps from the clock, no
// ordering surprises. The same files in the same order produce a
// byte-identical archive, so a pass can be diffed, cached and
// tested. (It also keeps React Compiler's no-clock-reads rule
// irrelevant here, and means a pass regenerated for the same guest
// doesn't churn.)
//
// Scope: store-only, no ZIP64, no encryption, no directory
// entries. Passes are a few KB of JSON and PNGs — far inside every
// limit that would require more.
// ─────────────────────────────────────────────────────────────

export interface ZipEntry {
  /** Path inside the archive, e.g. "pass.json". */
  name: string;
  data: Buffer;
}

/** CRC-32 (IEEE 802.3), the checksum ZIP requires per entry. */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

export function crc32(buf: Buffer): number {
  let c = 0 ^ -1;
  for (let i = 0; i < buf.length; i += 1) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xFF];
  }
  return (c ^ -1) >>> 0;
}

// A fixed DOS timestamp — 1980-01-01 00:00:00, the epoch of the
// format itself. Using the real clock would make archives
// non-reproducible for no benefit; nothing reads a pass's file
// mtimes.
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

function localHeader(entry: ZipEntry, crc: number): Buffer {
  const name = Buffer.from(entry.name, 'utf8');
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0);     // local file header signature
  head.writeUInt16LE(20, 4);             // version needed (2.0)
  head.writeUInt16LE(0, 6);              // flags
  head.writeUInt16LE(0, 8);              // method: 0 = stored
  head.writeUInt16LE(DOS_TIME, 10);
  head.writeUInt16LE(DOS_DATE, 12);
  head.writeUInt32LE(crc, 14);
  head.writeUInt32LE(entry.data.length, 18);   // compressed size
  head.writeUInt32LE(entry.data.length, 22);   // uncompressed size
  head.writeUInt16LE(name.length, 26);
  head.writeUInt16LE(0, 28);             // extra field length
  return Buffer.concat([head, name]);
}

function centralHeader(entry: ZipEntry, crc: number, offset: number): Buffer {
  const name = Buffer.from(entry.name, 'utf8');
  const head = Buffer.alloc(46);
  head.writeUInt32LE(0x02014b50, 0);     // central directory signature
  head.writeUInt16LE(20, 4);             // version made by
  head.writeUInt16LE(20, 6);             // version needed
  head.writeUInt16LE(0, 8);              // flags
  head.writeUInt16LE(0, 10);             // method: stored
  head.writeUInt16LE(DOS_TIME, 12);
  head.writeUInt16LE(DOS_DATE, 14);
  head.writeUInt32LE(crc, 16);
  head.writeUInt32LE(entry.data.length, 20);
  head.writeUInt32LE(entry.data.length, 24);
  head.writeUInt16LE(name.length, 28);
  head.writeUInt16LE(0, 30);             // extra
  head.writeUInt16LE(0, 32);             // comment
  head.writeUInt16LE(0, 34);             // disk number
  head.writeUInt16LE(0, 36);             // internal attrs
  head.writeUInt32LE(0, 38);             // external attrs
  head.writeUInt32LE(offset, 42);        // offset of local header
  return Buffer.concat([head, name]);
}

/**
 * Build a ZIP archive from entries, in the order given.
 *
 * Throws on a duplicate name — a `.pkpass` with two `pass.json`
 * entries would be accepted by some readers and rejected by
 * others, which is the worst kind of bug to ship to a phone.
 */
export function makeZip(entries: readonly ZipEntry[]): Buffer {
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.name)) throw new Error(`Duplicate zip entry: ${e.name}`);
    seen.add(e.name);
  }

  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const crc = crc32(entry.data);
    const local = localHeader(entry, crc);
    parts.push(local, entry.data);
    central.push(centralHeader(entry, crc, offset));
    offset += local.length + entry.data.length;
  }

  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);      // end of central directory
  end.writeUInt16LE(0, 4);               // disk number
  end.writeUInt16LE(0, 6);               // disk with central dir
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);              // comment length

  return Buffer.concat([...parts, centralBuf, end]);
}
