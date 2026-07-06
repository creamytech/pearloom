// ─────────────────────────────────────────────────────────────
// Pearloom / app/unsubscribe/route.ts
//
// The one-click unsubscribe surface referenced by every guest-facing
// email's List-Unsubscribe header (src/lib/email/deliverability.ts).
// Before this route existed the header pointed at a 404 — failing the
// Gmail/Yahoo one-click rule + CAN-SPAM and hurting placement.
//
//   GET  /unsubscribe?u=<token>
//     → a small confirmation page. Reading the link does NOT opt the
//       recipient out (so a mail-client link prefetch / scanner can't
//       unsubscribe them by accident); it shows a "Confirm" button
//       that POSTs back here.
//
//   POST /unsubscribe?u=<token>   (RFC 8058 one-click)
//     Body `List-Unsubscribe=One-Click` — the mailbox provider posts
//     this with no human in the loop. Also handles the human form
//     submit (token in the form body). Either way it records the
//     opt-out and returns 200.
//
// The token IS the credential (signed HMAC, see lib/email/unsubscribe)
// so there is no session here — it identifies exactly whom to suppress.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUnsubToken } from '@/lib/email/unsubscribe';
import { recordOptOut } from '@/lib/email/suppression';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const head = user.length <= 2 ? user[0] ?? '' : `${user.slice(0, 2)}`;
  return `${head}${'•'.repeat(Math.max(1, user.length - head.length))}@${domain}`;
}

function page(title: string, body: string, extra = '', status = 200): NextResponse {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title} · Pearloom</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #FBF7EE; color: #0E0D0B; max-width: 520px; margin: 64px auto; padding: 0 24px; line-height: 1.55; }
  h1 { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-weight: 500; font-size: 34px; margin: 0 0 12px; }
  p { font-size: 15px; color: #3A332C; margin: 0 0 8px; }
  .rule { width: 40px; height: 1px; background: #B8935A; margin: 22px 0; }
  button { font: inherit; font-size: 14px; padding: 12px 22px; border-radius: 999px; border: 1px solid #0E0D0B; background: #0E0D0B; color: #FBF7EE; cursor: pointer; margin-top: 18px; }
  a { color: #C6703D; }
  .fine { font-size: 12.5px; color: #6F6557; margin-top: 22px; }
</style>
</head><body>
  <h1>${title}</h1>
  ${body}
  ${extra}
  <div class="rule"></div>
  <p class="fine">Pearloom · The operating system for the days that matter.</p>
</body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// ── GET — confirmation page (no side effect) ─────────────────
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('u');
  const target = verifyUnsubToken(token);
  if (!target) {
    return page(
      'This link looks off',
      `<p>We couldn't read this unsubscribe link. Please open it directly from the email so it comes through intact.</p>`,
      '',
      400,
    );
  }

  const scope = target.siteId
    ? 'these celebration emails'
    : 'emails from Pearloom';
  return page(
    'Unsubscribe',
    `<p>Stop sending ${scope} to <strong>${maskEmail(target.email)}</strong>?</p>
     <div class="rule"></div>
     <form method="POST" action="/unsubscribe">
       <input type="hidden" name="u" value="${token}"/>
       <button type="submit">Yes, unsubscribe me</button>
     </form>`,
  );
}

// ── POST — record the opt-out (RFC 8058 one-click + form submit) ──
export async function POST(req: NextRequest) {
  // Token can arrive on the query string (one-click posts to the
  // List-Unsubscribe URL, which carries ?u=) or in the form body
  // (the human confirmation form). Prefer the query string.
  let token = req.nextUrl.searchParams.get('u');
  let oneClick = false;
  try {
    const form = await req.formData();
    if (!token) {
      const t = form.get('u');
      if (typeof t === 'string') token = t;
    }
    // Gmail/Yahoo one-click posts `List-Unsubscribe=One-Click`.
    if (form.get('List-Unsubscribe') === 'One-Click') oneClick = true;
  } catch {
    /* no/invalid body — token may still be on the query string */
  }

  const target = verifyUnsubToken(token);
  if (!target) {
    if (oneClick) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    return page('This link looks off', `<p>We couldn't read this unsubscribe link.</p>`, '', 400);
  }

  const sb = getSupabase();
  if (sb) {
    // Scope the opt-out to the site when we know it (a guest saying
    // "stop" for one couple shouldn't unsubscribe them from another),
    // otherwise it's global. Channel is intentionally dropped so the
    // opt-out is total for that scope, not just one email kind.
    await recordOptOut(sb, { email: target.email, siteId: target.siteId ?? null, channel: null });
  }

  if (oneClick) {
    // Mail clients don't render a body — a bare 200 is the contract.
    return new NextResponse('Unsubscribed', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return page(
    'You’re unsubscribed',
    `<p>Done — we’ve stopped ${target.siteId ? 'those celebration emails' : 'emails from Pearloom'} to <strong>${maskEmail(target.email)}</strong>.</p>
     <p class="fine">Transactional notes you asked for (like an RSVP confirmation) may still reach you.</p>`,
  );
}
