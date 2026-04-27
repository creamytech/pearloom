// ─────────────────────────────────────────────────────────────
// Pearloom / api/invite/video — 9:16 MP4 export scaffold
//
// Stitches the invite SVG + envelope-open motion into a short
// 9:16 MP4 suitable for Instagram / WhatsApp. Implementation
// note: this endpoint currently returns `{ pending: true }` —
// the client-side ffmpeg.wasm path is the intended render
// surface since it keeps the video pipeline off the server and
// respects the user's data by not round-tripping the source.
//
// TODO: wire up the ffmpeg.wasm client call (see
// `src/components/editor/InviteVideoExport.tsx` stub) or add a
// Cloudflare Worker that does the compositing with a server
// ffmpeg. The route stays here so the client can hit a stable
// URL either way.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });

  // We intentionally don't touch the body yet — the real render
  // path runs client-side today. This route exists so the UI has
  // a stable URL to POST to when the server path ships.
  void req;

  return NextResponse.json(
    {
      ok: true,
      pending: true,
      message:
        'Video export runs client-side via ffmpeg.wasm. If you hit this endpoint, call the InviteVideoExport component instead.',
    },
    { status: 202 },
  );
}
