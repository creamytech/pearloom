// ─────────────────────────────────────────────────────────────
// Pearloom / lib/sms.ts — Twilio text messages.
//
// One function, no SDK: sendSms() POSTs to Twilio's REST API
// with basic auth (the SDK would be our only use of it; a fetch
// keeps the dependency tree clean). Powers the automated invite
// paths — guest text-invites and co-host keys. The manual paths
// (the host's own Messages app via sms: links) keep working with
// zero configuration; Twilio just upgrades them to "Pearloom
// sends it for you".
//
// Env (set in Vercel):
//   TWILIO_ACCOUNT_SID            ACxxxxxxxx…
//   TWILIO_AUTH_TOKEN             your auth token
//   TWILIO_FROM_NUMBER            +15551234567   (an SMS-capable
//                                 Twilio number)  — OR —
//   TWILIO_MESSAGING_SERVICE_SID  MGxxxxxxxx…    (preferred for
//                                 scale: pools numbers, handles
//                                 sticky sender + opt-outs)
//
// Compliance posture: every send is HOST-INITIATED (a person
// texting their own guests about their own event — invitation
// traffic, not marketing), volume is rate-limited per host, and
// US numbers get Twilio's built-in STOP handling. Keep it that
// way: never add a cron that texts guests unprompted.
// ─────────────────────────────────────────────────────────────

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID),
  );
}

/** Loose input → E.164-ish. US 10-digit numbers get +1; anything
 *  already starting with + passes through digits-only. Returns
 *  null when the number can't plausibly be dialed. */
export function normalizePhone(raw: string): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;        // bare US number
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return `+${digits}`; // international without the plus — best effort
}

export interface SmsResult {
  ok: boolean;
  /** Twilio message SID on success. */
  sid?: string;
  error?: string;
}

export async function sendSms({ to, body }: { to: string; body: string }): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || (!from && !service)) {
    return { ok: false, error: 'SMS not configured' };
  }
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, error: 'Invalid phone number' };

  const params = new URLSearchParams();
  params.set('To', phone);
  params.set('Body', body.slice(0, 1500)); // Twilio hard-caps at 1600
  if (service) params.set('MessagingServiceSid', service);
  else if (from) params.set('From', from);

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      },
    );
    const data = await res.json().catch(() => ({})) as { sid?: string; message?: string };
    if (!res.ok) {
      console.error('[sms] Twilio error:', res.status, data.message);
      return { ok: false, error: data.message || `Twilio ${res.status}` };
    }
    return { ok: true, sid: data.sid };
  } catch (err) {
    console.error('[sms] send failed:', err);
    return { ok: false, error: 'SMS send failed' };
  }
}
