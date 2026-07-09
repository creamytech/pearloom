// Dev-only visual harness for the shared mark/motif primitives —
// currently the Stamp postmark (redesigned 2026-07-09 from the
// solid pastel disc). Renders every tone on light + dark paper at
// the sizes the product actually uses. Not linked from the product.
import { DevMarksClient } from './DevMarksClient';

export const dynamic = 'force-static';

export default function DevMarksPage() {
  return <DevMarksClient />;
}
