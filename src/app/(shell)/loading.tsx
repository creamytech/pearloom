// ──────────────────────────────────────────────────────────────
// Shared loading.tsx for every (shell)/* route.
//
// The user explicitly does not want any fade transitions on tab
// switch — the dashboard should feel like one page with different
// content underneath. So this loading state is invisible: returns
// null. Next still uses it as a Suspense boundary fallback (which
// keeps streaming + error handling working), but it renders
// nothing so the previous tab's content stays painted while the
// new tab loads.
// ──────────────────────────────────────────────────────────────

export default function ShellLoading() {
  return null;
}
