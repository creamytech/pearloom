// ─────────────────────────────────────────────────────────────
// user-media — server-side helper to persist any AI-generated or
// uploaded asset into the user's media library so it shows up in
// the Asset Library tab in the editor.
//
// Used by every endpoint that produces a permanent asset URL:
//   • /api/photos/upload         — uploaded photos
//   • /api/photos/stylize        — gpt-image-2 stylised photos
//   • /api/decor/library         — divider / stamps / confetti / bouquet
//   • /api/decor/sticker         — AI stickers
//   • /api/decor/ai-accent       — section accents
//
// Persistence is non-fatal: the calling endpoint returns success
// even if Supabase is unreachable. The asset URL still works —
// users just won't see it in the library tab until they re-run.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

export interface UserMediaInsert {
  owner_email: string;
  url: string;
  filename?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  mime_type?: string | null;
  /** Source tag — used by the asset library to group / filter.
   *  Keep these short and stable: 'ai-decor:divider', 'ai-decor:sticker',
   *  'ai-stylize', 'upload', 'google-photos'. */
  source: string;
  /** When the asset was generated for a specific site, store its slug
   *  so the library can later filter "this site's assets only". */
  source_site_id?: string | null;
}

/**
 * Persist one or more rows into public.user_media. Silently no-ops
 * if Supabase env vars are missing, or if the insert fails — the
 * calling API endpoint should not error just because the library
 * couldn't save.
 */
export async function persistUserMedia(rows: UserMediaInsert[]): Promise<void> {
  if (rows.length === 0) return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    const db = createClient(url, key);
    await db.from('user_media').insert(rows);
  } catch (err) {
    console.warn('[user-media] persist failed (non-fatal):', err);
  }
}
