// ─────────────────────────────────────────────────────────────
// PageEnter — the app-feel entrance for standalone surfaces.
//
// Wraps a route segment's children in the brand entrance motion
// (pl-enter-up: 12px rise + fade, 450ms spring-out) so arriving
// on a page feels composed rather than painted. Mounted via
// per-segment template.tsx files (store, login, wizard, admin) —
// deliberately NOT at the root and NOT inside (shell): a root
// template would remount the persistent dashboard chrome on
// every tab switch, and the dashboard's no-fade tab behavior is
// an explicit product decision (see (shell)/loading.tsx).
//
// pl-enter-up's reduced-motion handling lives in globals.css.
// ─────────────────────────────────────────────────────────────

export function PageEnter({ children }: { children: React.ReactNode }) {
  return <div className="pl-enter">{children}</div>;
}
