// ─────────────────────────────────────────────────────────────
// Pearloom / lib/event-os/soft-empty.ts
//
// Supabase postgres error 42P01 (relation does not exist) shows
// up in dev/preview environments where the Event-OS tables have
// not been migrated. For read-only list endpoints, treat that as
// an empty list instead of a 500 — the host just hasn't created
// any announcements/toasts/bookings yet from the UI perspective.
// ─────────────────────────────────────────────────────────────

const SOFT_CODES = new Set([
  '42P01', // undefined_table
  '42703', // undefined_column
  'PGRST205', // PostgREST schema cache miss
]);

export function isSoftEmptyError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  if (e.code && SOFT_CODES.has(e.code)) return true;
  const msg = (e.message || '').toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('relation') && msg.includes('not') ||
    msg.includes('could not find the table')
  );
}
