// ─────────────────────────────────────────────────────────────
// Pearloom / lib/admin.ts
//
// House-admin allowlist. Admins can grant plans + theme packs
// to any user from /admin (the "comp" desk — free subscriptions
// for friends, refunds-as-grants, press accounts, etc.).
//
// The allowlist is env-driven so production can rotate it
// without a deploy: PEARLOOM_ADMIN_EMAILS is a comma-separated
// list. The founder account is the built-in default so a
// missing env var never locks the house out of its own desk.
//
// Server-side only — never import from a client component
// (the check must not ship to the browser; the /admin page
// gates in a server component and every /api/admin route
// re-checks the session).
// ─────────────────────────────────────────────────────────────

const DEFAULT_ADMINS = ['benjaminscott18@gmail.com'];

function allowlist(): Set<string> {
  const fromEnv = (process.env.PEARLOOM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ADMINS, ...fromEnv]);
}

/** Is this email a Pearloom house admin? */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return allowlist().has(email.trim().toLowerCase());
}
