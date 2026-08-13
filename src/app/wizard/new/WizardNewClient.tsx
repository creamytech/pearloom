'use client';

import { useEffect, useState } from 'react';
import { WizardV8 } from '@/components/pearloom/pages/WizardV8';
import { OnePressing } from '@/components/pearloom/pages/OnePressing';
import { onePressingEnabled } from '@/lib/one-pressing';

export function WizardNewClient() {
  /* The merge flag (C.5) resolves client-side only — the server
     always renders the classic wizard (the flag contract), and the
     flagged surface swaps in after mount. Post-mount resolution
     keeps hydration honest; the classic path stays byte-identical
     when the flag is off (the default). */
  const [merged, setMerged] = useState(false);
  useEffect(() => {
    // Deferred a tick — the compiler lint bans synchronous setState
    // in effects (cascading-render risk).
    const t = setTimeout(() => {
      if (onePressingEnabled()) setMerged(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  return merged ? <OnePressing /> : <WizardV8 />;
}
