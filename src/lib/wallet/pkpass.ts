// ─────────────────────────────────────────────────────────────
// Pearloom / lib/wallet/pkpass.ts — Apple Wallet.
//
// A .pkpass is: pass.json + your images + a manifest.json of SHA-1
// digests + a detached PKCS#7 signature over that manifest, all
// zipped. Everything here is buildable today EXCEPT the signature,
// which needs the Apple Pass Type ID certificate — an owner action
// that no amount of code can substitute for.
//
// So signing is an INJECTED interface. The default implementation
// refuses, and `buildPkPass` throws `PassNotConfiguredError` rather
// than emitting an unsigned archive. That matters: an unsigned
// .pkpass isn't a degraded pass, it's a file iOS rejects with a
// meaningless error, and a guest would blame the invitation. Fail
// closed and say why — the same posture Phase 0 forced on the film
// webhook.
//
// When the certificate exists, implement `PassSigner` (openssl
// smime -sign -binary -outform DER, or node-forge) and pass it in.
// Nothing else in this file changes.
// ─────────────────────────────────────────────────────────────

import { createHash } from 'node:crypto';
import { makeZip, type ZipEntry } from './zip';
import type { PassContent } from './pass-content';

export class PassNotConfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PassNotConfiguredError';
  }
}

/** Produces a detached PKCS#7 (DER) signature over manifest.json. */
export interface PassSigner {
  sign(manifest: Buffer): Promise<Buffer>;
}

/** The signer used when no certificate is configured. It refuses. */
export const UNCONFIGURED_SIGNER: PassSigner = {
  async sign(): Promise<Buffer> {
    throw new PassNotConfiguredError(
      'Apple Wallet passes need the Pass Type ID certificate '
      + '(APPLE_PASS_CERT / APPLE_PASS_KEY). No pass was produced.',
    );
  },
};

export interface PkPassIdentity {
  /** pass.apple.com identifier, e.g. "pass.com.pearloom.celebration". */
  passTypeIdentifier: string;
  /** Apple Developer team id. */
  teamIdentifier: string;
  /** Stable per-guest serial — the same guest must get the same one,
   *  so re-issuing UPDATES their pass instead of adding a second. */
  serialNumber: string;
  /** Hex colours for the pass face. */
  backgroundColor?: string;
  foregroundColor?: string;
  labelColor?: string;
}

/** pass.json, as Apple expects it. Pure — exported for tests. */
export function buildPassJson(content: PassContent, identity: PkPassIdentity): Record<string, unknown> {
  const field = (f: { key: string; label: string; value: string }) => ({
    key: f.key, label: f.label, value: f.value,
  });
  return {
    formatVersion: 1,
    passTypeIdentifier: identity.passTypeIdentifier,
    teamIdentifier: identity.teamIdentifier,
    serialNumber: identity.serialNumber,
    organizationName: content.organizationName,
    description: content.primary.value,
    ...(identity.backgroundColor ? { backgroundColor: identity.backgroundColor } : {}),
    ...(identity.foregroundColor ? { foregroundColor: identity.foregroundColor } : {}),
    ...(identity.labelColor ? { labelColor: identity.labelColor } : {}),
    // eventTicket is the closest Apple style to what this is — but
    // the WORDS come from pass-content, which knows a memorial is
    // not a ticket. Apple's style name is structural, not copy.
    eventTicket: {
      primaryFields: [field(content.primary)],
      secondaryFields: content.secondary.map(field),
      auxiliaryFields: content.auxiliary.map(field),
      backFields: content.back.map(field),
    },
    barcodes: [{
      format: 'PKBarcodeFormatQR',
      message: content.barcodeMessage,
      messageEncoding: 'iso-8859-1',
      altText: content.barcodeAltText,
    }],
  };
}

/** manifest.json — SHA-1 of every file in the archive. */
export function buildPassManifest(entries: readonly ZipEntry[]): Buffer {
  const manifest: Record<string, string> = {};
  for (const e of entries) {
    manifest[e.name] = createHash('sha1').update(e.data).digest('hex');
  }
  return Buffer.from(JSON.stringify(manifest), 'utf8');
}

export interface PkPassInput {
  content: PassContent;
  identity: PkPassIdentity;
  /** icon.png / logo.png etc. Apple REQUIRES icon.png. */
  images: ZipEntry[];
  signer?: PassSigner;
}

/**
 * Build a signed .pkpass.
 *
 * Throws PassNotConfiguredError when no real signer is available —
 * never returns an unsigned archive.
 */
export async function buildPkPass(input: PkPassInput): Promise<Buffer> {
  const signer = input.signer ?? UNCONFIGURED_SIGNER;

  if (!input.images.some((i) => i.name === 'icon.png')) {
    throw new Error('A .pkpass must contain icon.png — iOS rejects passes without one.');
  }

  const passJson: ZipEntry = {
    name: 'pass.json',
    data: Buffer.from(JSON.stringify(buildPassJson(input.content, input.identity)), 'utf8'),
  };
  const payload: ZipEntry[] = [passJson, ...input.images];
  const manifest: ZipEntry = { name: 'manifest.json', data: buildPassManifest(payload) };

  // Signing last, and only over the manifest — the manifest's
  // digests are what bind the signature to the payload.
  const signature = await signer.sign(manifest.data);

  return makeZip([...payload, manifest, { name: 'signature', data: signature }]);
}

/** Is Apple Wallet configured for this deployment? */
export function isApplePassConfigured(): boolean {
  return Boolean(
    process.env.APPLE_PASS_CERT
    && process.env.APPLE_PASS_KEY
    && process.env.APPLE_PASS_TYPE_ID
    && process.env.APPLE_TEAM_ID,
  );
}
