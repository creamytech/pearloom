// ─────────────────────────────────────────────────────────────
// Pearloom / lib/email-invitations/index.ts
// Beautiful HTML email invitations with open/click tracking,
// automated reminders, and personalized content.
//
// Uses Resend for delivery, custom HTML templates that match
// the site's theme, and tracking pixels for analytics.
// ─────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  /** HTML body with {{ variable }} placeholders */
  bodyTemplate: string;
  preview: string;
  occasion: string[];
}

export interface EmailSendRequest {
  siteId: string;
  templateId: string;
  recipients: Array<{
    email: string;
    name: string;
    guestId: string;
    personalNote?: string;
  }>;
  /** Couple's names */
  coupleNames: [string, string];
  /** Event date */
  eventDate?: string;
  /** Site URL */
  siteUrl: string;
  /** RSVP URL */
  rsvpUrl: string;
}

export interface EmailTrackingEvent {
  guestId: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced';
  timestamp: number;
  metadata?: Record<string, string>;
}

// ── Email Templates ──────────────────────────────────────────

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'save-the-date',
    name: 'Save the Date',
    subject: 'Save the Date — {{ couple_name }}',
    occasion: ['wedding', 'engagement'],
    preview: 'Elegant save-the-date with photo',
    bodyTemplate: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(43,30,20,0.06)">
  <tr><td style="padding:40px 32px;text-align:center">
    <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#6B665F;margin:0 0 16px">Save the Date</p>
    <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:400;font-style:italic;color:#3D3530;margin:0 0 8px">{{ couple_name }}</h1>
    <div style="width:40px;height:1px;background:#C4A96A;margin:16px auto"></div>
    <p style="font-size:18px;color:#3D3530;margin:16px 0 0;font-style:italic">{{ event_date }}</p>
    <p style="font-size:14px;color:#6B665F;margin:8px 0 24px">{{ venue }}</p>
    {{ personal_note }}
    <a href="{{ rsvp_url }}" style="display:inline-block;padding:14px 32px;background:#6E8C5C;color:#fff;border-radius:100px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">RSVP Now</a>
    <p style="font-size:12px;color:#6B665F;margin:24px 0 0">View our site at <a href="{{ site_url }}" style="color:#A3B18A">{{ site_url }}</a></p>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#FAF7F2;text-align:center">
    <p style="font-size:10px;color:#6B665F;margin:0">Made with Pearloom</p>
  </td></tr>
</table>
<img src="{{ tracking_pixel }}" width="1" height="1" style="display:none" />
</body></html>`,
  },
  {
    id: 'formal-invitation',
    name: 'Formal Invitation',
    subject: 'You\'re Invited — {{ couple_name }}',
    occasion: ['wedding', 'engagement', 'anniversary'],
    preview: 'Classic formal invitation',
    bodyTemplate: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(43,30,20,0.06)">
  <tr><td style="padding:48px 32px;text-align:center;border:2px solid #E0D8CA;border-radius:16px;margin:8px">
    <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#A3B18A;margin:0 0 20px">You're Cordially Invited</p>
    <h1 style="font-family:Georgia,serif;font-size:36px;font-weight:400;font-style:italic;color:#3D3530;margin:0 0 4px">{{ couple_name }}</h1>
    <p style="font-size:14px;color:#6B665F;margin:0 0 16px">request the pleasure of your company</p>
    <div style="width:60px;height:1px;background:#C4A96A;margin:16px auto"></div>
    <p style="font-size:16px;color:#3D3530;margin:16px 0 4px">{{ event_date }}</p>
    <p style="font-size:14px;color:#6B665F;margin:0 0 4px">{{ event_time }}</p>
    <p style="font-size:14px;color:#6B665F;margin:0 0 24px">{{ venue }}</p>
    {{ personal_note }}
    <a href="{{ rsvp_url }}" style="display:inline-block;padding:14px 32px;background:#6E8C5C;color:#fff;border-radius:100px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Respond</a>
    <p style="font-size:11px;color:#6B665F;margin:24px 0 0">Kindly respond by {{ rsvp_deadline }}</p>
  </td></tr>
</table>
<img src="{{ tracking_pixel }}" width="1" height="1" style="display:none" />
</body></html>`,
  },
  {
    id: 'rsvp-reminder',
    name: 'RSVP Reminder',
    subject: 'Friendly Reminder — {{ couple_name }}\'s Celebration',
    occasion: ['wedding', 'birthday', 'anniversary', 'engagement'],
    preview: 'Gentle reminder to RSVP',
    bodyTemplate: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(43,30,20,0.06)">
  <tr><td style="padding:40px 32px;text-align:center">
    <p style="font-size:24px;margin:0 0 16px">♡</p>
    <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:400;font-style:italic;color:#3D3530;margin:0 0 12px">Don't Forget to RSVP</h1>
    <p style="font-size:14px;color:#6B665F;line-height:1.6;margin:0 0 24px">Hi {{ guest_name }},<br><br>We noticed you haven't responded yet. We'd love to know if you can make it to {{ couple_name }}'s celebration on {{ event_date }}.</p>
    <a href="{{ rsvp_url }}" style="display:inline-block;padding:14px 32px;background:#6E8C5C;color:#fff;border-radius:100px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">RSVP Now</a>
    <p style="font-size:12px;color:#6B665F;margin:20px 0 0">RSVP deadline: {{ rsvp_deadline }}</p>
  </td></tr>
</table>
<img src="{{ tracking_pixel }}" width="1" height="1" style="display:none" />
</body></html>`,
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    subject: 'Thank You — {{ couple_name }}',
    occasion: ['wedding', 'birthday', 'anniversary', 'engagement'],
    preview: 'Post-event thank you note',
    bodyTemplate: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(43,30,20,0.06)">
  <tr><td style="padding:40px 32px;text-align:center">
    <p style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#A3B18A;margin:0 0 16px">Thank You</p>
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;font-style:italic;color:#3D3530;margin:0 0 16px">From the bottom of our hearts</h1>
    <p style="font-size:14px;color:#6B665F;line-height:1.7;margin:0 0 24px">Dear {{ guest_name }},<br><br>{{ thank_you_message }}<br><br>Revisit the memories and photos from our celebration:</p>
    <a href="{{ site_url }}" style="display:inline-block;padding:14px 32px;background:#6E8C5C;color:#fff;border-radius:100px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">View Memories</a>
    <p style="font-size:14px;color:#3D3530;font-style:italic;margin:24px 0 0">With love,<br>{{ couple_name }}</p>
  </td></tr>
</table>
</body></html>`,
  },
  {
    id: 'birthday-invite',
    name: 'Birthday Invitation',
    subject: 'You\'re Invited to {{ host_name }}\'s Birthday!',
    occasion: ['birthday'],
    preview: 'Fun birthday party invite',
    bodyTemplate: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:Georgia,serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 20px rgba(43,30,20,0.06)">
  <tr><td style="padding:48px 32px;text-align:center">
    <p style="font-size:40px;margin:0 0 8px">✦</p>
    <h1 style="font-family:Georgia,serif;font-size:28px;font-weight:400;font-style:italic;color:#2A1A1A;margin:0 0 8px">You're Invited!</h1>
    <p style="font-size:16px;color:#6B665F;margin:0 0 20px">{{ host_name }} is celebrating — and you're on the list.</p>
    <div style="background:#FFF8F0;border-radius:12px;padding:20px;margin:0 0 24px">
      <p style="font-size:14px;color:#3D3530;margin:0 0 4px"><strong>{{ event_date }}</strong></p>
      <p style="font-size:14px;color:#6B665F;margin:0">{{ venue }}</p>
    </div>
    {{ personal_note }}
    <a href="{{ rsvp_url }}" style="display:inline-block;padding:14px 32px;background:#FF6B8A;color:#fff;border-radius:100px;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Count Me In</a>
  </td></tr>
</table>
<img src="{{ tracking_pixel }}" width="1" height="1" style="display:none" />
</body></html>`,
  },
];

// ── Email Sending ────────────────────────────────────────────

/**
 * Send invitations to a list of guests.
 */
export async function sendInvitations(request: EmailSendRequest): Promise<{
  sent: number;
  failed: number;
  errors: string[];
}> {
  try {
    const res = await fetch('/api/rsvp-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      return { sent: 0, failed: request.recipients.length, errors: ['API request failed'] };
    }

    const data = await res.json();
    return {
      sent: data.sent || 0,
      failed: data.failed || 0,
      errors: data.errors || [],
    };
  } catch (err) {
    return {
      sent: 0,
      failed: request.recipients.length,
      errors: [err instanceof Error ? err.message : 'Unknown error'],
    };
  }
}

/**
 * Schedule automated RSVP reminders.
 */
export async function scheduleReminders(
  siteId: string,
  reminderDays: number[], // days before deadline to send reminders
): Promise<boolean> {
  try {
    const res = await fetch('/api/rsvp-reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, reminderDays }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get email tracking analytics for a site.
 */
export async function getEmailAnalytics(siteId: string): Promise<{
  totalSent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
} | null> {
  try {
    const res = await fetch(`/api/analytics/email?siteId=${siteId}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
