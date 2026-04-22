'use client';

import { useRouter } from 'next/navigation';
import { WizardV3 } from '@/components/wizard/design/WizardV3';
import type { StoryManifest } from '@/types';

export function WizardNewClient() {
  const router = useRouter();

  return (
    <WizardV3
      onComplete={(manifest: StoryManifest, names: [string, string], subdomain: string) => {
        // Fire-and-forget site save — the editor will also save on first edit.
        fetch('/api/sites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subdomain, manifest, names }),
        }).catch(() => {
          /* non-fatal */
        });
        router.push(`/editor/${subdomain}`);
      }}
      onBack={() => router.push('/dashboard')}
    />
  );
}
