// ─────────────────────────────────────────────────────────────
// /dev/editor — dev-only harness for the redesign editor shell.
//
// Mounts EditorRedesign against the frozen REFERENCE_MANIFEST
// fixture so the mobile chrome (bottom bar + sheets), the
// one-Pear entry pill, and the desktop three-column grid can be
// exercised without auth or a database. Autosave will POST to
// /api/sites and fail (no session / no DB) — the bridge's retry
// + saveState machinery absorbs that ("Save failed" pill, no
// thrown UI error), which is itself part of what this route
// verifies.
//
// Hard-gated out of production with notFound(), same as
// /dev/theme-pack/[id].
// ─────────────────────────────────────────────────────────────

import { notFound } from 'next/navigation';
import DevEditorClient from './DevEditorClient';

export const dynamic = 'force-dynamic';

export default function DevEditorPage() {
  // Hard gate — never serve in production. The folder name (`dev`)
  // wouldn't keep it out of a deployed bundle on its own.
  if (process.env.NODE_ENV === 'production') notFound();

  return <DevEditorClient />;
}
