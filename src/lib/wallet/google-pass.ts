// ─────────────────────────────────────────────────────────────
// Pearloom / lib/wallet/google-pass.ts — Google Wallet.
//
// Unlike Apple, this one is COMPLETE. Google Wallet's save link is
// a JWT signed RS256 with a service-account key, and Node's crypto
// signs RS256 natively — so there's no certificate ceremony and no
// dependency to add. All it needs is the key in an env var.
//
// The same fail-closed rule applies: with no key configured,
// `googleSaveUrl` returns null and the caller offers nothing,
// rather than minting a link that lands the guest on a Google
// error page.
//
// The pass CONTENT comes from pass-content.ts, shared with Apple,
// so a guest can't be told two different stories by two phones.
// ─────────────────────────────────────────────────────────────

import { createSign } from 'node:crypto';
import type { PassContent } from './pass-content';

export interface GoogleWalletConfig {
  /** Service-account email — the JWT issuer. */
  issuerEmail: string;
  /** PEM private key for that service account. */
  privateKey: string;
  /** Numeric Google Wallet issuer id. */
  issuerId: string;
  /** Class suffix; one class per deployment is plenty. */
  classId: string;
}

function base64Url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Read the Google Wallet config from the environment, or null. */
export function googleWalletConfig(): GoogleWalletConfig | null {
  const issuerEmail = process.env.GOOGLE_WALLET_ISSUER_EMAIL;
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  // Newlines survive env vars badly; accept the escaped form too.
  const privateKey = (process.env.GOOGLE_WALLET_PRIVATE_KEY ?? '').replace(/\\n/g, '\n');
  if (!issuerEmail || !issuerId || !privateKey) return null;
  return {
    issuerEmail,
    issuerId,
    privateKey,
    classId: process.env.GOOGLE_WALLET_CLASS_ID || `${issuerId}.pearloom_celebration`,
  };
}

/** The EventTicketObject Google renders. Pure — exported for tests. */
export function buildGoogleObject(
  content: PassContent,
  config: GoogleWalletConfig,
  objectSuffix: string,
): Record<string, unknown> {
  const rows = [...content.secondary, ...content.auxiliary].map((f) => ({
    header: f.label,
    body: f.value,
  }));
  return {
    id: `${config.issuerId}.${objectSuffix}`,
    classId: config.classId,
    state: 'ACTIVE',
    // Google's own vocabulary for this type is "ticket"; the words
    // a guest READS all come from pass-content, which knows a
    // memorial is not one.
    eventName: { defaultValue: { language: 'en', value: content.primary.value } },
    ticketHolderName: content.auxiliary.find((f) => f.key === 'bearer')?.value ?? '',
    barcode: {
      type: 'QR_CODE',
      value: content.barcodeMessage,
      alternateText: content.barcodeAltText,
    },
    textModulesData: rows.map((r, i) => ({ id: `row${i}`, header: r.header, body: r.body })),
    linksModuleData: {
      uris: content.back
        .filter((f) => /^https?:\/\//.test(f.value))
        .map((f) => ({ uri: f.value, description: f.label })),
    },
  };
}

/**
 * A "Save to Google Wallet" URL for this guest, or null when the
 * deployment has no key. Never returns a link that can't work.
 */
export function googleSaveUrl(
  content: PassContent,
  objectSuffix: string,
  config: GoogleWalletConfig | null = googleWalletConfig(),
  issuedAtSeconds?: number,
): string | null {
  if (!config) return null;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload: Record<string, unknown> = {
    iss: config.issuerEmail,
    aud: 'google',
    typ: 'savetowallet',
    payload: { eventTicketObjects: [buildGoogleObject(content, config, objectSuffix)] },
    // Caller may pin `iat` so the URL is stable and testable; Google
    // does not require it, and an unstable one would make every
    // render of the same pass a different link.
    ...(issuedAtSeconds != null ? { iat: issuedAtSeconds } : {}),
  };

  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  try {
    const signature = createSign('RSA-SHA256').update(signingInput).sign(config.privateKey);
    return `https://pay.google.com/gp/v/save/${signingInput}.${base64Url(signature)}`;
  } catch {
    // A malformed key is a configuration error, not a guest-facing
    // one: offer nothing rather than a broken button.
    return null;
  }
}

export function isGoogleWalletConfigured(): boolean {
  return googleWalletConfig() !== null;
}
