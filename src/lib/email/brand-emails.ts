// ─────────────────────────────────────────────────────────────
// Pearloom / lib/email/brand-emails.ts
//
// The branded email catalog. One visual language for every
// lifecycle email the product sends — welcome, co-host invites,
// coordinator invites, RSVP nudges, day-of broadcasts, memory
// prompts, anniversary notes, and the host's RSVP notifications.
//
// Built on the same shell the suite-themed emails use
// (emailLayout / button from lib/email-sequences), so:
//   • Guest-facing emails accept an optional EmailThemeColors
//     derived from the couple's site (emailThemeFromSuite) and
//     wear the site's palette + faces.
//   • Product emails (welcome, invites) wear BRAND_EMAIL_THEME —
//     cream paper, ink, olive voice, gold punctuation, Fraunces
//     display. BRAND.md §4–5 in email-safe form.
//
// Voice (BRAND.md §7): woven, not built. Threading, not loading.
// Never "AI-powered". Buttons are verb-first.
// ─────────────────────────────────────────────────────────────

import { emailLayout, button, type EmailThemeColors } from '@/lib/email-sequences';

/** Pearloom's own paper — for product emails with no site context.
 *  Mirrors the light-mode tokens in CLAUDE-DESIGN.md §2. */
export const BRAND_EMAIL_THEME: EmailThemeColors = {
  background: '#F5EFE2', // --pl-cream
  foreground: '#0E0D0B', // --pl-ink
  accent: '#5C6B3F',     // --pl-olive
  accentLight: '#E5DCC4',// --pl-divider-soft
  card: '#FBF7EE',       // --pl-cream-card
  muted: '#6F6557',      // --pl-muted
  headingFont: 'Fraunces',
  bodyFont: 'Inter',
};

const GOLD = '#B8935A'; // --pl-gold — punctuation only, 1px rules + glyphs

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function heads(t: EmailThemeColors): string {
  return `'${t.headingFont}',Georgia,serif`;
}
function bodys(t: EmailThemeColors): string {
  return `'${t.bodyFont}',Georgia,'Times New Roman',serif`;
}

/* ── Content atoms ──────────────────────────────────────────── */

/** Mono-caps editorial label with a leading gold dot. */
function eyebrow(text: string, t: EmailThemeColors): string {
  return `<p style="margin:0 0 14px;font-family:${bodys(t)};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${t.muted}">
    <span style="color:${GOLD}">&#9679;</span>&nbsp;&nbsp;${esc(text)}
  </p>`;
}

/** Display heading — Fraunces (or the pack's display face). */
function heading(text: string, t: EmailThemeColors): string {
  return `<h1 style="margin:0 0 18px;font-family:${heads(t)};font-size:30px;line-height:1.18;font-weight:500;color:${t.foreground}">${text}</h1>`;
}

function para(text: string, t: EmailThemeColors): string {
  return `<p style="margin:0 0 16px;font-family:${bodys(t)};font-size:15px;line-height:1.65;color:${t.foreground}">${text}</p>`;
}

function fine(text: string, t: EmailThemeColors): string {
  return `<p style="margin:18px 0 0;font-family:${bodys(t)};font-size:12px;line-height:1.6;color:${t.muted}">${text}</p>`;
}

/** 48px gold hairline — the thread. */
function goldRule(): string {
  return `<div style="width:48px;height:1px;background-color:${GOLD};margin:22px 0"></div>`;
}

/** Pulled note — italic display copy behind a gold left hairline.
 *  For quoting the host's own words (nudge body, broadcast,
 *  memory prompt) so the product chrome never competes with them. */
function pull(text: string, t: EmailThemeColors): string {
  return `<div style="margin:0 0 20px;padding:14px 18px;border-left:2px solid ${GOLD};background-color:${t.accentLight}40">
    <p style="margin:0;font-family:${heads(t)};font-style:italic;font-size:17px;line-height:1.55;color:${t.foreground}">${text}</p>
  </div>`;
}

/** Key→value row for detail summaries. */
function kvRow(label: string, value: string, t: EmailThemeColors): string {
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid ${t.accentLight};font-family:${bodys(t)};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${t.muted};vertical-align:top;width:140px">${esc(label)}</td>
    <td style="padding:9px 0 9px 16px;border-bottom:1px solid ${t.accentLight};font-family:${bodys(t)};font-size:14px;line-height:1.5;color:${t.foreground}">${value}</td>
  </tr>`;
}

/** The standard inner frame: padded card cell with a wordmark
 *  strip up top. Every builder pipes its body through this. */
function frame(body: string, t: EmailThemeColors): string {
  return `<tr><td style="padding:36px 40px 34px">
    <p style="margin:0 0 26px;font-family:${heads(t)};font-style:italic;font-size:15px;color:${t.accent}">Pearloom</p>
    ${body}
  </td></tr>`;
}

function ctaBlock(label: string, href: string, t: EmailThemeColors): string {
  return `<div style="margin:26px 0 4px">${button(label, href, t)}</div>`;
}

/* ── 1 · Welcome — first sign-in ────────────────────────────── */

export function buildWelcomeEmail(opts: { name?: string | null; dashboardUrl: string }): { subject: string; html: string } {
  const t = BRAND_EMAIL_THEME;
  const first = (opts.name ?? '').trim().split(/\s+/)[0] || '';
  const hello = first ? `${esc(first)} — welcome` : 'Welcome';
  const html = emailLayout(frame(`
    ${eyebrow('Welcome to the craft house', t)}
    ${heading(`${hello} to Pearloom.`, t)}
    ${para('You now have a loom of your own. Weddings, milestones, memorials, reunions — every site here is a single, made object: drafted with you, hand-edited by you, pressed when it&rsquo;s ready.', t)}
    ${goldRule()}
    ${para(`A few threads to pull first:`, t)}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 6px">
      ${kvRow('Weave', 'Answer a few questions and a first draft of your site sets itself in front of you.', t)}
      ${kvRow('Edit', 'Click any line on the canvas and write over it — the type is yours.', t)}
      ${kvRow('Share', 'One link, a QR for the paper goods, and co-hosts when you want company.', t)}
    </table>
    ${ctaBlock('Begin a thread', opts.dashboardUrl, t)}
    ${fine('You&rsquo;re receiving this once, because an account was just created with this address. If that wasn&rsquo;t you, reply and we&rsquo;ll unpick it.', t)}
  `, t), t);
  return { subject: 'Welcome to Pearloom — the loom is yours', html };
}

/* ── 2 · Co-host invite — Share panel ───────────────────────── */

const COHOST_ROLE_COPY: Record<string, { label: string; line: string }> = {
  'editor': {
    label: 'Co-editor',
    line: 'You&rsquo;ll be able to edit everything on the site alongside them — words, photos, the look. Publishing stays with the owner.',
  },
  'guest-manager': {
    label: 'Guest manager',
    line: 'You&rsquo;ll be able to manage the guest list and RSVPs — the site design stays in the owner&rsquo;s hands.',
  },
  'viewer': {
    label: 'Viewer',
    line: 'You&rsquo;ll be able to look around the site as it takes shape — no edit access, just a front-row seat.',
  },
};

export function buildCoHostInviteEmail(opts: {
  coupleDisplay: string;
  role: string;
  acceptUrl: string;
  invitedBy?: string | null;
}): { subject: string; html: string } {
  const t = BRAND_EMAIL_THEME;
  const role = COHOST_ROLE_COPY[opts.role] ?? COHOST_ROLE_COPY.editor;
  const couple = esc(opts.coupleDisplay);
  const html = emailLayout(frame(`
    ${eyebrow('You&rsquo;re invited to co-host', t)}
    ${heading(`${couple} would like your hands on the loom.`, t)}
    ${para(`${opts.invitedBy ? esc(opts.invitedBy) : 'They'} invited you to help with their Pearloom site as a <strong>${role.label}</strong>.`, t)}
    ${para(role.line, t)}
    ${ctaBlock('Accept the invite', opts.acceptUrl, t)}
    ${fine(`This invite expires in 14 days. If you weren&rsquo;t expecting it, you can safely ignore this email — nothing happens without the click.`, t)}
  `, t), t);
  return { subject: `${opts.coupleDisplay} invited you to co-host`, html };
}

/* ── 3 · Coordinator / viewer invite — dashboard ────────────── */

export function buildCoordinatorInviteEmail(opts: {
  inviterName: string;
  roleLabel: string;
  acceptUrl: string;
}): { subject: string; html: string } {
  const t = BRAND_EMAIL_THEME;
  const html = emailLayout(frame(`
    ${eyebrow('A seat at the planning table', t)}
    ${heading('You&rsquo;re invited to help with a celebration.', t)}
    ${para(`${esc(opts.inviterName)} invited you as a <strong>${esc(opts.roleLabel)}</strong> on their Pearloom site — the workspace where the day comes together.`, t)}
    ${ctaBlock('Accept the invitation', opts.acceptUrl, t)}
    ${fine('This invite expires in 7 days. If you weren&rsquo;t expecting it, you can safely ignore this email.', t)}
  `, t), t);
  return { subject: `${opts.inviterName} invited you to their Pearloom site`, html };
}

/* ── 4 · RSVP nudge — host-drafted reminder ─────────────────── */

export function buildNudgeEmail(opts: {
  couple: string;
  bodyText: string;
  ctaUrl: string;
  recipientName?: string | null;
  theme?: EmailThemeColors;
}): { html: string } {
  const t = opts.theme ?? BRAND_EMAIL_THEME;
  const greeting = opts.recipientName ? `${esc(opts.recipientName.split(/\s+/)[0])} —` : 'Hello —';
  /* The host's words are the email — chrome stays quiet. */
  const bodyHtml = esc(opts.bodyText).replace(/\n{2,}/g, '</p><p style="margin:14px 0 0">').replace(/\n/g, '<br>');
  const html = emailLayout(frame(`
    ${eyebrow(`A note from ${opts.couple}`, t)}
    ${heading(greeting, t)}
    ${pull(bodyHtml, t)}
    ${ctaBlock('Reply on the site', opts.ctaUrl, t)}
    ${fine('Your reply takes under a minute — and it helps them set the table.', t)}
  `, t), t);
  return { html };
}

/* ── 5 · Day-of broadcast — live update ─────────────────────── */

export function buildBroadcastEmail(opts: {
  couple: string;
  message: string;
  ctaUrl: string;
  recipientName?: string | null;
  theme?: EmailThemeColors;
}): { html: string } {
  const t = opts.theme ?? BRAND_EMAIL_THEME;
  const html = emailLayout(frame(`
    ${eyebrow(`Live from ${opts.couple}&rsquo;s day`, t)}
    ${heading('A quick update.', t)}
    ${pull(esc(opts.message).replace(/\n/g, '<br>'), t)}
    ${ctaBlock('Open the site', opts.ctaUrl, t)}
    ${fine('Sent because the hosts posted a day-of update for everyone attending.', t)}
  `, t), t);
  return { html };
}

/* ── 6 · Memory prompt — Pear asks a guest for a story ──────── */

export function buildMemoryPromptEmail(opts: {
  guestFirstName: string;
  names: string;
  prompt: string;
  passportUrl: string;
  theme?: EmailThemeColors;
}): { html: string } {
  const t = opts.theme ?? BRAND_EMAIL_THEME;
  const html = emailLayout(frame(`
    ${eyebrow(`For ${opts.names}`, t)}
    ${heading(`${esc(opts.guestFirstName)}, lend a memory.`, t)}
    ${para(`${esc(opts.names)} are weaving the story of their day, and one thread belongs to you. Here&rsquo;s the prompt waiting with your name on it:`, t)}
    ${pull(esc(opts.prompt), t)}
    ${ctaBlock('Write it down', opts.passportUrl, t)}
    ${fine('A few sentences is plenty — it lands in their keepsake book exactly as you write it.', t)}
  `, t), t);
  return { html };
}

/* ── 7 · Anniversary — “today, N years ago” ─────────────────── */

export function buildAnniversaryEmail(opts: {
  couple: string;
  yearsAgo: number;
  recapUrl: string;
  unsubUrl: string;
  theme?: EmailThemeColors;
}): { subject: string; html: string } {
  const t = opts.theme ?? BRAND_EMAIL_THEME;
  const yearWord = opts.yearsAgo === 1 ? 'one year' : `${opts.yearsAgo} years`;
  const html = emailLayout(frame(`
    ${eyebrow('From the archive', t)}
    ${heading(`Today, ${yearWord} ago.`, t)}
    ${para(`${esc(opts.couple)} — your day is in our records as one of the warmer ones we&rsquo;ve held. The site, the photos, the words your people left: all of it is still set in type, exactly where you left it.`, t)}
    ${goldRule()}
    ${para('Leaf back through it. The guestbook reads differently with a little distance.', t)}
    ${ctaBlock('Revisit your day', opts.recapUrl, t)}
    ${fine(`Sent once a year on your anniversary. <a href="${esc(opts.unsubUrl)}" style="color:${t.muted}">Stop these</a> any time.`, t)}
  `, t), t);
  return { subject: `Today, ${yearWord} ago — ${opts.couple}`, html };
}

/* ── 8 · Host notification — a guest replied ────────────────── */

export function buildHostRsvpNotificationEmail(opts: {
  guestName: string;
  attending: boolean;
  siteLabel: string;
  rows: Array<{ label: string; value: string }>;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const t = BRAND_EMAIL_THEME;
  const verb = opts.attending ? 'is woven in' : 'sends regrets';
  const html = emailLayout(frame(`
    ${eyebrow(`RSVP · ${opts.siteLabel}`, t)}
    ${heading(`${esc(opts.guestName)} ${verb}.`, t)}
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:6px 0 4px">
      ${opts.rows.map((r) => kvRow(r.label, esc(r.value), t)).join('')}
    </table>
    ${ctaBlock('Open the guest list', opts.dashboardUrl, t)}
  `, t), t);
  return {
    subject: opts.attending
      ? `${opts.guestName} is coming — ${opts.siteLabel}`
      : `${opts.guestName} can’t make it — ${opts.siteLabel}`,
    html,
  };
}
