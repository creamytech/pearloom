// ─────────────────────────────────────────────────────────────
// Pearloom / app/api/invite/route.ts
// Coordinator invite management: create, list, delete
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSiteInvite, getSiteInvites, deleteSiteInvite } from '@/lib/db';
import { Resend } from 'resend';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// POST — create invite
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateCheck = checkRateLimit(`invite:${session.user.email}`, { max: 10, windowMs: 60 * 60 * 1000 });
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  const resendKey = process.env.RESEND_API_KEY;

  try {
    const { siteId, email, role } = await req.json() as {
      siteId: string;
      email: string;
      role: 'coordinator' | 'viewer';
    };

    if (!siteId || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields: siteId, email, role' }, { status: 400 });
    }

    if (!['coordinator', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be coordinator or viewer.' }, { status: 400 });
    }

    const { token } = await createSiteInvite({
      siteId,
      email,
      role,
      invitedBy: session.user.email,
    });

    const acceptUrl = `https://pearloom.com/invite?token=${token}`;
    const inviterName = session.user.name || session.user.email;
    const roleLabel = role === 'coordinator' ? 'coordinator' : 'viewer';

    // Send invite email via Resend
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        const html = `
<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #2B2B2B;">
  <h1 style="font-size: 28px; font-weight: 400; font-style: italic; color: #2B2B2B; margin: 0 0 16px;">You're invited to help plan a wedding</h1>
  <p style="font-size: 16px; line-height: 1.7; color: #5A5450;">${inviterName} has invited you as a ${roleLabel} for their Pearloom wedding site.</p>
  <div style="margin: 32px 0; text-align: center;">
    <a href="${acceptUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #A3B18A, #6D597A); color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">Accept Invitation</a>
  </div>
  <p style="font-size: 12px; color: #9A9488;">This invite expires in 7 days.</p>
</div>
`;
        await resend.emails.send({
          from: 'Pearloom <noreply@pearloom.com>',
          to: email,
          subject: `${inviterName} invited you to their Pearloom wedding site`,
          html,
        });
      } catch (emailErr) {
        console.warn('[invite] Email send failed (non-fatal):', emailErr);
      }
    }

    return NextResponse.json({ success: true, token, acceptUrl });
  } catch (err) {
    console.error('[invite POST] Error:', err);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

// GET — list invites for a site
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const siteId = searchParams.get('siteId');

  if (!siteId) {
    return NextResponse.json({ error: 'Missing siteId query param' }, { status: 400 });
  }

  try {
    const invites = await getSiteInvites(siteId);
    return NextResponse.json({ invites });
  } catch (err) {
    console.error('[invite GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

// DELETE — revoke invite
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id query param' }, { status: 400 });
  }

  try {
    await deleteSiteInvite(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[invite DELETE] Error:', err);
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 });
  }
}
