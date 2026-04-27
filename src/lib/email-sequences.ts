// ─────────────────────────────────────────────────────────────
// Pearloom / lib/email-sequences.ts
// Email sequence system — template definitions, scheduling
// logic, and cron-based batch sending via Resend.
//
// Templates: RSVP Confirmation, RSVP Reminder, Event Reminder,
//            Post-Wedding Thank You
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ── Types ────────────────────────────────────────────────────

export type EmailType =
  | 'rsvp_confirmation'
  | 'rsvp_reminder'
  | 'event_reminder'
  | 'post_wedding_thank_you';

export interface EmailThemeColors {
  background: string;    // page bg (replaces #F5F1E8)
  foreground: string;    // text color (replaces #2B2B2B)
  accent: string;        // button/link color (replaces #5C6B3F)
  accentLight: string;   // light accent for borders
  card: string;          // card bg (replaces #FFFFFF)
  muted: string;         // secondary text
  headingFont: string;   // heading font name
  bodyFont: string;      // body font name
}

const DEFAULT_THEME: EmailThemeColors = {
  background: '#F5F1E8',
  foreground: '#2B2B2B',
  accent: '#5C6B3F',
  accentLight: '#EEE8DC',
  card: '#FFFFFF',
  muted: '#9A9488',
  headingFont: 'Playfair Display',
  bodyFont: 'Inter',
};

/**
 * Parse a hex color to relative luminance (0 = black, 1 = white).
 * Used to detect dark backgrounds and swap colors for email readability.
 */
function hexLuminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length < 6) return 0.5; // can't parse short/invalid — assume mid
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Ensure theme colors are email-safe. If the background is dark
 * (luminance < 0.2), swap to a light scheme so emails remain readable
 * across all email clients.
 */
function emailSafeTheme(theme: EmailThemeColors): EmailThemeColors {
  const bgLum = hexLuminance(theme.background);
  if (bgLum < 0.2) {
    // Dark background — swap: use card as page bg, foreground stays dark
    return {
      ...theme,
      background: theme.card,      // light card becomes page bg
      card: '#FFFFFF',             // card stays white
      foreground: theme.foreground.toLowerCase() === '#ffffff' || hexLuminance(theme.foreground) > 0.8
        ? '#2B2B2B'                // if foreground was light (for dark bg), reset to dark
        : theme.foreground,
      // Keep accent, accentLight, muted, fonts as-is
    };
  }
  return theme;
}

export interface EmailContext {
  guestName?: string;
  coupleNames?: string;
  eventDate?: string;
  venueName?: string;
  siteUrl?: string;
  rsvpUrl?: string;
  rsvpDeadline?: string;
  guestbookUrl?: string;
  galleryUrl?: string;
  rsvpStatus?: string;
  daysUntilEvent?: number;
  daysUntilDeadline?: number;
  personalNote?: string;
  themeColors?: EmailThemeColors;
}

export interface ScheduledEmail {
  id?: string;
  site_id: string;
  email_type: EmailType;
  recipient_email: string;
  recipient_name?: string;
  context: EmailContext;
  send_at: string;
  sent_at?: string | null;
  status: 'pending' | 'sent' | 'failed';
  error?: string | null;
  created_at?: string;
}

// ── Supabase helper ─────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

// ── Shared HTML layout ──────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emailLayout(content: string, themeColors?: EmailThemeColors): string {
  const t = emailSafeTheme(themeColors || DEFAULT_THEME);
  const headingStack = `'${t.headingFont}',Georgia,serif`;
  const bodyStack = `'${t.bodyFont}',Georgia,'Times New Roman',serif`;

  // Inject Google Fonts so Apple Mail / Outlook (Mac) and webmail clients
  // render the couple's chosen fonts. Web-safe fallbacks above keep
  // Gmail / Outlook (Win) — which strip <link>s — looking sane.
  const fontFamilies = [t.headingFont, t.bodyFont]
    .filter((f, i, a) => a.indexOf(f) === i)
    .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;600;700`)
    .join('&');
  const fontHref = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pearloom</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontHref}" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:${t.background};font-family:${bodyStack};-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${t.background};padding:40px 16px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background-color:${t.card};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(43,30,20,0.07)">
          ${content}
        </table>
        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;margin-top:16px">
          <tr>
            <td style="text-align:center;padding:8px 0">
              <p style="font-size:11px;color:${t.muted};margin:0;font-family:${bodyStack}">
                Sent with love by <a href="https://pearloom.com" style="color:${t.accent};text-decoration:none;font-weight:600">Pearloom</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, href: string, themeColors?: EmailThemeColors): string {
  const t = themeColors || DEFAULT_THEME;
  const bodyStack = `'${t.bodyFont}',Georgia,serif`;
  return `<a href="${esc(href)}" style="display:inline-block;padding:14px 36px;background-color:${t.accent};color:#FFFFFF;border-radius:100px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:${bodyStack};mso-padding-alt:14px 36px">${esc(text)}</a>`;
}

function divider(themeColors?: EmailThemeColors): string {
  const t = themeColors || DEFAULT_THEME;
  return `<div style="width:48px;height:1px;background-color:${t.accentLight};margin:20px auto"></div>`;
}

// ── Email Templates ─────────────────────────────────────────

function rsvpConfirmationTemplate(ctx: EmailContext): { subject: string; html: string } {
  const guestName = ctx.guestName || 'Friend';
  const coupleNames = ctx.coupleNames || 'the happy couple';
  const isAttending = ctx.rsvpStatus === 'attending';
  const isDeclined = ctx.rsvpStatus === 'declined';
  const t = emailSafeTheme(ctx.themeColors || DEFAULT_THEME);
  const headingStack = `'${t.headingFont}',Georgia,serif`;
  const bodyStack = `'${t.bodyFont}',Georgia,serif`;

  const subject = isAttending
    ? `Thank you for your RSVP! We can't wait to celebrate with you`
    : isDeclined
      ? `Thank you for letting us know — you'll be missed`
      : `Thank you for your RSVP!`;

  const heroMessage = isAttending
    ? `We're thrilled you'll be joining us!`
    : isDeclined
      ? `We'll miss you, but we understand.`
      : `Thank you for responding.`;

  const bodyMessage = isAttending
    ? `Dear ${esc(guestName)},<br><br>Your RSVP for <strong>${esc(coupleNames)}</strong>'s celebration has been received. We are so excited to share this special day with you.`
    : isDeclined
      ? `Dear ${esc(guestName)},<br><br>Thank you for letting us know. While we'll miss having you there, we appreciate you taking the time to respond. You'll be in our hearts on the big day.`
      : `Dear ${esc(guestName)},<br><br>We've received your response for <strong>${esc(coupleNames)}</strong>'s celebration. Thank you for letting us know.`;

  const eventDetails = (ctx.eventDate || ctx.venueName)
    ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${t.accentLight};border-radius:12px;margin:24px 0">
        <tr><td style="padding:20px 24px;text-align:center">
          ${ctx.eventDate ? `<p style="font-size:15px;color:${t.foreground};margin:0 0 4px;font-weight:600">${esc(ctx.eventDate)}</p>` : ''}
          ${ctx.venueName ? `<p style="font-size:13px;color:${t.muted};margin:0">${esc(ctx.venueName)}</p>` : ''}
        </td></tr>
      </table>`
    : '';

  const html = emailLayout(`
    <tr><td style="padding:48px 36px 12px;text-align:center">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${t.accent};margin:0 0 16px;font-family:${bodyStack}">RSVP Confirmed</p>
      <h1 style="font-family:${headingStack};font-size:28px;font-weight:400;font-style:italic;color:${t.foreground};margin:0 0 8px;line-height:1.3">${heroMessage}</h1>
      ${divider(t)}
    </td></tr>
    <tr><td style="padding:8px 36px 36px;text-align:center">
      <p style="font-size:14px;color:${t.foreground};line-height:1.7;margin:0 0 16px">${bodyMessage}</p>
      ${eventDetails}
      ${ctx.siteUrl ? `<p style="margin:24px 0 0">${button('View Wedding Site', ctx.siteUrl, t)}</p>` : ''}
    </td></tr>
  `, t);

  return { subject, html };
}

function rsvpReminderTemplate(ctx: EmailContext): { subject: string; html: string } {
  const guestName = ctx.guestName || 'Friend';
  const coupleNames = ctx.coupleNames || 'the couple';
  const daysLeft = ctx.daysUntilDeadline;
  const urgency = daysLeft !== undefined && daysLeft <= 3 ? 'last-chance' : 'gentle';
  const t = emailSafeTheme(ctx.themeColors || DEFAULT_THEME);
  const headingStack = `'${t.headingFont}',Georgia,serif`;

  const subject = urgency === 'last-chance'
    ? `Only ${daysLeft} day${daysLeft === 1 ? '' : 's'} left to RSVP — ${coupleNames}'s celebration`
    : `Friendly reminder — ${coupleNames} would love to hear from you`;

  const headline = urgency === 'last-chance'
    ? `Time is running out`
    : `Don't forget to RSVP`;

  const message = urgency === 'last-chance'
    ? `Dear ${esc(guestName)},<br><br>The RSVP deadline for <strong>${esc(coupleNames)}</strong>'s celebration is just <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'} away</strong>. We'd love to know if you can make it — please take a moment to respond.`
    : `Dear ${esc(guestName)},<br><br>We noticed you haven't had a chance to respond yet. <strong>${esc(coupleNames)}</strong> would love to know if you can join their celebration${ctx.eventDate ? ` on <strong>${esc(ctx.eventDate)}</strong>` : ''}.`;

  const html = emailLayout(`
    <tr><td style="padding:48px 36px 12px;text-align:center">
      <p style="font-size:28px;margin:0 0 12px;line-height:1">&#9825;</p>
      <h1 style="font-family:${headingStack};font-size:26px;font-weight:400;font-style:italic;color:${t.foreground};margin:0 0 8px;line-height:1.3">${headline}</h1>
      ${divider(t)}
    </td></tr>
    <tr><td style="padding:8px 36px 16px;text-align:center">
      <p style="font-size:14px;color:${t.foreground};line-height:1.7;margin:0">${message}</p>
    </td></tr>
    ${ctx.eventDate || ctx.venueName ? `
    <tr><td style="padding:0 36px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${t.accentLight};border-radius:12px">
        <tr><td style="padding:20px 24px;text-align:center">
          ${ctx.eventDate ? `<p style="font-size:15px;color:${t.foreground};margin:0 0 4px;font-weight:600">${esc(ctx.eventDate)}</p>` : ''}
          ${ctx.venueName ? `<p style="font-size:13px;color:${t.muted};margin:0">${esc(ctx.venueName)}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>` : ''}
    <tr><td style="padding:8px 36px 40px;text-align:center">
      ${ctx.rsvpUrl ? button('RSVP Now', ctx.rsvpUrl, t) : ''}
      ${ctx.rsvpDeadline ? `<p style="font-size:12px;color:${t.muted};margin:20px 0 0">Please respond by ${esc(ctx.rsvpDeadline)}</p>` : ''}
    </td></tr>
  `, t);

  return { subject, html };
}

function eventReminderTemplate(ctx: EmailContext): { subject: string; html: string } {
  const guestName = ctx.guestName || 'Friend';
  const coupleNames = ctx.coupleNames || 'the couple';
  const daysUntil = ctx.daysUntilEvent;
  const isTomorrow = daysUntil === 1;
  const t = emailSafeTheme(ctx.themeColors || DEFAULT_THEME);
  const headingStack = `'${t.headingFont}',Georgia,serif`;
  const bodyStack = `'${t.bodyFont}',Georgia,serif`;

  const subject = isTomorrow
    ? `Tomorrow is the day! See you at ${coupleNames}'s celebration`
    : `${coupleNames}'s celebration is ${daysUntil} days away!`;

  const headline = isTomorrow
    ? `See you tomorrow!`
    : `${daysUntil} days to go`;

  const message = isTomorrow
    ? `Dear ${esc(guestName)},<br><br>The moment is almost here! We can't wait to see you <strong>tomorrow</strong> at <strong>${esc(coupleNames)}</strong>'s celebration. Here's a quick reminder of the details:`
    : `Dear ${esc(guestName)},<br><br>Just a quick note to let you know that <strong>${esc(coupleNames)}</strong>'s special day is only <strong>${daysUntil} days away</strong>. We're counting down and can't wait to celebrate together!`;

  const html = emailLayout(`
    <tr><td style="padding:48px 36px 12px;text-align:center">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${t.accent};margin:0 0 16px;font-family:${bodyStack}">${isTomorrow ? 'TOMORROW' : 'COMING SOON'}</p>
      <h1 style="font-family:${headingStack};font-size:28px;font-weight:400;font-style:italic;color:${t.foreground};margin:0 0 8px;line-height:1.3">${headline}</h1>
      ${divider(t)}
    </td></tr>
    <tr><td style="padding:8px 36px 16px;text-align:center">
      <p style="font-size:14px;color:${t.foreground};line-height:1.7;margin:0">${message}</p>
    </td></tr>
    ${ctx.eventDate || ctx.venueName ? `
    <tr><td style="padding:0 36px 16px">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${t.accentLight};border-radius:12px">
        <tr><td style="padding:24px;text-align:center">
          <p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${t.muted};margin:0 0 8px">Event Details</p>
          ${ctx.eventDate ? `<p style="font-size:17px;color:${t.foreground};margin:0 0 6px;font-weight:600;font-family:${headingStack}">${esc(ctx.eventDate)}</p>` : ''}
          ${ctx.venueName ? `<p style="font-size:14px;color:${t.muted};margin:0">${esc(ctx.venueName)}</p>` : ''}
        </td></tr>
      </table>
    </td></tr>` : ''}
    <tr><td style="padding:8px 36px 40px;text-align:center">
      ${ctx.siteUrl ? button('View Full Details', ctx.siteUrl, t) : ''}
      <p style="font-size:13px;color:${t.foreground};font-style:italic;margin:24px 0 0;line-height:1.6">We're so grateful to have you as part of this celebration.<br>With love, <strong>${esc(coupleNames)}</strong></p>
    </td></tr>
  `, t);

  return { subject, html };
}

function postWeddingThankYouTemplate(ctx: EmailContext): { subject: string; html: string } {
  const guestName = ctx.guestName || 'Friend';
  const coupleNames = ctx.coupleNames || 'the newlyweds';
  const t = emailSafeTheme(ctx.themeColors || DEFAULT_THEME);
  const headingStack = `'${t.headingFont}',Georgia,serif`;
  const bodyStack = `'${t.bodyFont}',Georgia,serif`;

  const subject = `Thank you for celebrating with us — ${coupleNames}`;

  const html = emailLayout(`
    <tr><td style="padding:48px 36px 12px;text-align:center">
      <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${t.accent};margin:0 0 16px;font-family:${bodyStack}">Thank You</p>
      <h1 style="font-family:${headingStack};font-size:28px;font-weight:400;font-style:italic;color:${t.foreground};margin:0 0 8px;line-height:1.3">From the bottom of our hearts</h1>
      ${divider(t)}
    </td></tr>
    <tr><td style="padding:8px 36px 16px;text-align:center">
      <p style="font-size:14px;color:${t.foreground};line-height:1.7;margin:0">
        Dear ${esc(guestName)},<br><br>
        Words can't fully express how much it meant to have you at our celebration. Your presence, your warmth, and your love made the day truly unforgettable.<br><br>
        ${ctx.personalNote ? `${esc(ctx.personalNote)}<br><br>` : ''}
        We'd love for you to relive the memories with us:
      </p>
    </td></tr>
    <tr><td style="padding:0 36px 8px">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${t.accentLight};border-radius:12px">
        <tr><td style="padding:24px;text-align:center">
          ${ctx.galleryUrl ? `
          <a href="${esc(ctx.galleryUrl)}" style="display:block;text-decoration:none;margin-bottom:${ctx.guestbookUrl ? '16px' : '0'}">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding:12px 16px;background-color:${t.card};border-radius:8px;text-align:left">
                  <p style="font-size:13px;font-weight:700;color:${t.foreground};margin:0 0 2px">Photo Gallery</p>
                  <p style="font-size:12px;color:${t.muted};margin:0">Browse and download photos from the celebration</p>
                </td>
                <td style="width:40px;text-align:center;color:${t.accent};font-size:18px">&#8250;</td>
              </tr>
            </table>
          </a>` : ''}
          ${ctx.guestbookUrl ? `
          <a href="${esc(ctx.guestbookUrl)}" style="display:block;text-decoration:none">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="padding:12px 16px;background-color:${t.card};border-radius:8px;text-align:left">
                  <p style="font-size:13px;font-weight:700;color:${t.foreground};margin:0 0 2px">Guestbook</p>
                  <p style="font-size:12px;color:${t.muted};margin:0">Leave a note or read messages from fellow guests</p>
                </td>
                <td style="width:40px;text-align:center;color:${t.accent};font-size:18px">&#8250;</td>
              </tr>
            </table>
          </a>` : ''}
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 36px 44px;text-align:center">
      ${ctx.siteUrl ? button('Visit Our Site', ctx.siteUrl, t) : ''}
      <p style="font-size:14px;color:${t.foreground};font-style:italic;margin:28px 0 0;line-height:1.6;font-family:${headingStack}">
        With all our love,<br><strong>${esc(coupleNames)}</strong>
      </p>
    </td></tr>
  `, t);

  return { subject, html };
}

// ── Template registry ───────────────────────────────────────

const TEMPLATES: Record<EmailType, (ctx: EmailContext) => { subject: string; html: string }> = {
  rsvp_confirmation: rsvpConfirmationTemplate,
  rsvp_reminder: rsvpReminderTemplate,
  event_reminder: eventReminderTemplate,
  post_wedding_thank_you: postWeddingThankYouTemplate,
};

/**
 * Generate email content for a given type and context.
 */
export function generateEmail(type: EmailType, context: EmailContext): { subject: string; html: string } {
  const templateFn = TEMPLATES[type];
  if (!templateFn) throw new Error(`Unknown email type: ${type}`);
  return templateFn(context);
}

// ── Schedule an email ───────────────────────────────────────

/**
 * Schedule a single email for future delivery.
 * Inserts a row into the `scheduled_emails` Supabase table.
 */
export async function scheduleEmail(
  type: EmailType,
  recipientEmail: string,
  context: EmailContext,
  sendAt: Date | string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = getSupabase();
    const sendAtIso = typeof sendAt === 'string' ? sendAt : sendAt.toISOString();

    const { data, error } = await supabase
      .from('scheduled_emails')
      .insert({
        email_type: type,
        recipient_email: recipientEmail,
        recipient_name: context.guestName || null,
        site_id: null, // Caller can set this separately if needed
        context,
        send_at: sendAtIso,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[email-sequences] Schedule insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[email-sequences] Schedule error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Schedule an email tied to a specific site.
 */
export async function scheduleEmailForSite(
  type: EmailType,
  siteId: string,
  recipientEmail: string,
  context: EmailContext,
  sendAt: Date | string,
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = getSupabase();
    const sendAtIso = typeof sendAt === 'string' ? sendAt : sendAt.toISOString();

    const { data, error } = await supabase
      .from('scheduled_emails')
      .insert({
        email_type: type,
        recipient_email: recipientEmail,
        recipient_name: context.guestName || null,
        site_id: siteId,
        context,
        send_at: sendAtIso,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[email-sequences] Schedule insert error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('[email-sequences] Schedule error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ── Process scheduled emails (cron) ─────────────────────────

/**
 * Process all scheduled emails that are due for sending.
 * Called by the cron endpoint — fetches pending emails where
 * `send_at` has passed, sends via Resend, and marks as sent.
 *
 * Returns counts of sent / failed emails.
 */
export async function processScheduledEmails(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const result = { processed: 0, sent: 0, failed: 0, errors: [] as string[] };

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    result.errors.push('RESEND_API_KEY not configured');
    return result;
  }

  const resend = new Resend(resendKey);
  const fromEmail = process.env.EMAIL_FROM || 'noreply@pearloom.com';

  try {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    // Fetch up to 50 pending emails whose send_at has passed
    const { data: dueEmails, error: fetchError } = await supabase
      .from('scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', now)
      .order('send_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('[email-sequences] Fetch due emails error:', fetchError);
      result.errors.push(fetchError.message);
      return result;
    }

    if (!dueEmails || dueEmails.length === 0) {
      return result;
    }

    result.processed = dueEmails.length;

    for (const email of dueEmails) {
      try {
        const emailType = email.email_type as EmailType;
        const context = (email.context || {}) as EmailContext;
        const { subject, html } = generateEmail(emailType, context);

        await resend.emails.send({
          from: fromEmail,
          to: email.recipient_email,
          subject,
          html,
        });

        // Mark as sent
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        result.sent++;
      } catch (sendErr) {
        const errMsg = sendErr instanceof Error ? sendErr.message : 'Send failed';
        console.error(`[email-sequences] Send error for ${email.id}:`, sendErr);

        // Mark as failed
        await supabase
          .from('scheduled_emails')
          .update({
            status: 'failed',
            error: errMsg,
          })
          .eq('id', email.id);

        result.failed++;
        result.errors.push(`${email.id}: ${errMsg}`);
      }
    }

    return result;
  } catch (err) {
    console.error('[email-sequences] processScheduledEmails error:', err);
    result.errors.push(err instanceof Error ? err.message : 'Unknown error');
    return result;
  }
}

/**
 * Send a single email immediately via Resend (no scheduling).
 */
export async function sendEmailNow(
  type: EmailType,
  recipientEmail: string,
  context: EmailContext,
): Promise<{ success: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { success: false, error: 'RESEND_API_KEY not configured' };

  try {
    const resend = new Resend(resendKey);
    const fromEmail = process.env.EMAIL_FROM || 'noreply@pearloom.com';
    const { subject, html } = generateEmail(type, context);

    await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html,
    });

    return { success: true };
  } catch (err) {
    console.error('[email-sequences] sendEmailNow error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}
