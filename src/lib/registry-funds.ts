// ─────────────────────────────────────────────────────────────
// registry-funds — R2-lite cash funds WITHOUT touching money.
//
// Pearloom never processes gift funds. manifest.registryFunds
// holds the HOST'S OWN P2P handles (Venmo / PayPal.Me / Cash App
// / Zelle) plus an optional display goal; the site renders them
// as "Give directly" links and the honor ledger (gift_pledges)
// keeps a guest-shared running thread. This module is the single
// place handle strings are normalized + turned into hrefs so the
// editor panel and the renderer can't drift.
// ─────────────────────────────────────────────────────────────

export interface RegistryFunds {
  /** Venmo username — stored WITHOUT the @ prefix. */
  venmo?: string;
  /** PayPal.Me link — stored as typed; `paypalHref` enforces https. */
  paypal?: string;
  /** Cash App cashtag — stored WITHOUT the $ prefix. */
  cashapp?: string;
  /** Zelle email-or-phone. No web deep link exists — the site
   *  shows it with a copy-to-clipboard affordance instead. */
  zelle?: string;
  /** Optional display goal, in cents. Drives the pledge-driven
   *  progress bar ("as shared by guests"). */
  goalCents?: number;
}

/** Strip the @ prefix + whitespace from a Venmo username. */
export function cleanVenmo(v: string): string {
  return v.trim().replace(/^@+/, '').replace(/\s+/g, '');
}

/** Strip the $ prefix + whitespace from a Cash App cashtag. */
export function cleanCashtag(v: string): string {
  return v.trim().replace(/^\$+/, '').replace(/\s+/g, '');
}

/** Any guest-facing handle set? (goal alone renders nothing). */
export function hasFundHandles(f: RegistryFunds | undefined | null): boolean {
  if (!f) return false;
  return Boolean(
    (f.venmo && f.venmo.trim())
    || (f.paypal && f.paypal.trim())
    || (f.cashapp && f.cashapp.trim())
    || (f.zelle && f.zelle.trim()),
  );
}

export function venmoHref(username: string): string {
  return `https://venmo.com/u/${encodeURIComponent(cleanVenmo(username))}`;
}

export function cashappHref(cashtag: string): string {
  return `https://cash.app/$${encodeURIComponent(cleanCashtag(cashtag))}`;
}

/** Normalize a PayPal.Me value to an https URL. Accepts a full
 *  link, an http link (upgraded), or a bare "paypal.me/name" /
 *  "name" fragment. Returns null when it can't become a sane URL. */
export function paypalHref(value: string): string | null {
  let s = value.trim();
  if (!s) return null;
  s = s.replace(/^http:\/\//i, 'https://');
  if (!/^https:\/\//i.test(s)) {
    // Bare "paypal.me/name" or just "name".
    s = s.replace(/^\/+/, '');
    s = /^paypal\.me\//i.test(s) || /^www\.paypal\./i.test(s)
      ? `https://${s}`
      : `https://paypal.me/${s}`;
  }
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/** Dollars-and-cents formatter for the honor ledger — whole
 *  dollars stay whole ("$1,250"), fractional cents keep two
 *  places. */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(dollars) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
