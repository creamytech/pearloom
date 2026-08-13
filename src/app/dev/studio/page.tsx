// Dev-only visual harness for the stationery Studio — mounts the
// real StudioApp on a fixture manifest so the rails / card / theme
// packs can be previewed without an auth session or a database.
// Autosaves will fail quietly here (no DB) — the harness is for
// looking, not persisting. Not linked from the product.
import { DevStudioClient } from './DevStudioClient';

export const dynamic = 'force-static';

export default function DevStudioPage() {
  return <DevStudioClient />;
}
