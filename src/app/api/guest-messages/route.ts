import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// ── Types ────────────────────────────────────────────────────

type RecipientFilter = 'all' | 'attending' | 'declined' | 'pending';

interface GuestMessage {
  id: string;
  siteId: string;
  subject: string;
  body: string;
  recipientFilter: RecipientFilter;
  sentAt: string;
  sentBy: string;
}

// ── In-memory store (swap for DB later) ─────────────────────

const messageStore: GuestMessage[] = [];

let nextId = 1;

function generateId(): string {
  return `gm_${Date.now()}_${nextId++}`;
}

// ── GET /api/guest-messages?siteId=xxx ──────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const siteId = req.nextUrl.searchParams.get('siteId');
  if (!siteId) {
    return NextResponse.json({ error: 'siteId query param is required' }, { status: 400 });
  }

  const messages = messageStore
    .filter((m) => m.siteId === siteId && m.sentBy === session.user!.email)
    .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

  return NextResponse.json({ messages });
}

// ── POST /api/guest-messages ────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: {
    siteId?: string;
    subject?: string;
    body?: string;
    recipientFilter?: RecipientFilter;
  };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { siteId, subject, body, recipientFilter } = payload;

  if (!siteId || !subject?.trim() || !body?.trim() || !recipientFilter) {
    return NextResponse.json(
      { error: 'siteId, subject, body, and recipientFilter are required' },
      { status: 400 },
    );
  }

  const validFilters: RecipientFilter[] = ['all', 'attending', 'declined', 'pending'];
  if (!validFilters.includes(recipientFilter)) {
    return NextResponse.json({ error: 'Invalid recipientFilter' }, { status: 400 });
  }

  const message: GuestMessage = {
    id: generateId(),
    siteId,
    subject: subject.trim(),
    body: body.trim(),
    recipientFilter,
    sentAt: new Date().toISOString(),
    sentBy: session.user.email,
  };

  messageStore.push(message);

  // Also fire the real email send via the existing messaging/send endpoint
  // so guests actually receive the message. We do this in the background
  // and don't block the response.
  try {
    const origin = req.nextUrl.origin;
    fetch(`${origin}/api/messaging/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: req.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        siteId,
        subject: subject.trim(),
        body: body.trim(),
        segment: recipientFilter,
      }),
    }).catch(() => {
      // Fire-and-forget — email delivery is best-effort here
    });
  } catch {
    // Swallow — the message is still recorded
  }

  return NextResponse.json({ message });
}
