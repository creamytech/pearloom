// ─────────────────────────────────────────────────────────────
// Pearloom / lib/sms/channel.ts
//
// The concierge speaks on more than one channel.
//
// Review #3's point stands: international and culturally diverse
// celebrations — quinceañeras, South Asian weddings, anywhere
// outside the US — run on WhatsApp, not SMS. The synthesis (§2.5)
// resolved it as a SEQUENCE rather than a choice, and this is the
// second half: Twilio is already the vendor, and its WhatsApp
// webhook is the same shape with `whatsapp:` prefixed onto From
// and To.
//
// So the decision layer doesn't change at all. What changes is
// address handling — and one compliance fact worth stating plainly,
// because it's the difference between "blocked on approval" and
// "works today":
//
//   A REPLY TO AN INBOUND MESSAGE NEEDS NO TEMPLATE. WhatsApp
//   requires pre-approved templates only to OPEN a conversation.
//   Inside the 24-hour window a guest's own message opens, free-form
//   replies are allowed. The concierge is reactive by construction —
//   it only ever answers — so it operates fully on WhatsApp before
//   any template is approved. Template approval gates OUTBOUND
//   campaigns (invitations, nudges), not this.
//
// Pure: parsing and formatting only.
// ─────────────────────────────────────────────────────────────

export type MessageChannel = 'sms' | 'whatsapp';

export interface ChannelAddress {
  channel: MessageChannel;
  /** The bare number, prefix stripped — what guest lookup uses. */
  phone: string;
}

const WHATSAPP_PREFIX = 'whatsapp:';

/**
 * Split a Twilio address into its channel and its number.
 *
 * Guest rows store bare numbers, so the prefix must come off before
 * any lookup — otherwise a WhatsApp guest is a stranger to us and
 * gets told nothing, which is the correct behaviour applied to the
 * wrong fact.
 */
export function parseChannelAddress(raw: string | null | undefined): ChannelAddress | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  if (value.toLowerCase().startsWith(WHATSAPP_PREFIX)) {
    const phone = value.slice(WHATSAPP_PREFIX.length).trim();
    return phone ? { channel: 'whatsapp', phone } : null;
  }
  return { channel: 'sms', phone: value };
}

/**
 * Put an address back on the wire for a given channel.
 *
 * Replies MUST go back the way they came: answering a WhatsApp
 * message over SMS would bill the guest, arrive from an unfamiliar
 * number, and in many countries simply fail.
 */
export function formatChannelAddress(address: ChannelAddress): string {
  return address.channel === 'whatsapp'
    ? `${WHATSAPP_PREFIX}${address.phone}`
    : address.phone;
}

/**
 * Is this channel configured for the deployment?
 *
 * WhatsApp needs its own Twilio sender; the SMS credentials alone
 * don't grant it. Unset means we simply never see WhatsApp traffic,
 * which is fine — but the reply path should never assume it exists.
 */
export function isChannelConfigured(channel: MessageChannel): boolean {
  if (channel === 'whatsapp') return Boolean(process.env.TWILIO_WHATSAPP_FROM);
  return Boolean(process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID);
}

/** Human name for the channel, for logs and host-facing copy. */
export function channelLabel(channel: MessageChannel): string {
  return channel === 'whatsapp' ? 'WhatsApp' : 'text message';
}
