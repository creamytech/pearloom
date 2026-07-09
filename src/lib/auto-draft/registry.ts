// ─────────────────────────────────────────────────────────────
// Registry auto-drafter — fills sensible category buckets the
// host can replace with real links. Per-occasion (wedding gets
// home goods, baby shower gets baby essentials, etc.).
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';
import type { Drafter } from './types';

interface RegistryBucket {
  label: string;
  url: string;
  description?: string;
}

function bucketsForOccasion(occasion: string): RegistryBucket[] {
  switch (occasion) {
    case 'wedding':
    case 'vow-renewal':
      return [
        { label: 'Home essentials', url: '', description: 'Cookware, linens, the everyday things.' },
        { label: 'A honeymoon fund', url: '', description: 'A contribution toward our first trip together.' },
        { label: 'Your favourite charity', url: '', description: 'Give in our name if that\'s your style.' },
      ];
    case 'anniversary':
      return [
        { label: 'A donation in our name', url: '', description: 'A cause we\'d be honoured to support.' },
        { label: 'A bottle for our cellar', url: '', description: 'We\'ll open it together.' },
      ];
    case 'baby-shower':
    case 'sip-and-see':
      return [
        { label: 'The basics', url: '', description: 'Diapers, wipes, sleep sacks, the things we\'ll go through.' },
        { label: 'Books', url: '', description: 'Help us build a library.' },
        { label: 'College fund', url: '', description: 'A small start on the long road.' },
      ];
    case 'bridal-shower':
      return [
        { label: 'Home essentials', url: '', description: 'Linked from the wedding registry.' },
        { label: 'A note for the bride', url: '', description: 'Skip a gift, write a piece of advice instead.' },
      ];
    case 'housewarming':
      return [
        { label: 'Things for the new place', url: '', description: 'Kitchen, garden, the slow-build of a home.' },
      ];
    case 'retirement':
      return [
        { label: 'A bottle for the cellar', url: '', description: 'Something to open in a quiet moment.' },
        { label: 'A donation to a cause', url: '', description: 'Their favourite charity, in their name.' },
      ];
    case 'milestone-birthday':
      return [
        { label: 'Their favourite charity', url: '', description: 'A donation in their name.' },
        { label: 'Experiences over things', url: '', description: 'A class, a dinner, a trip, link below.' },
      ];
    case 'memorial':
    case 'funeral':
      return [
        { label: 'In lieu of flowers', url: '', description: 'A donation to a cause they cared about.' },
      ];
    default:
      return [];
  }
}

export const draftRegistry: Drafter = (ctx, existing) => {
  const reg = existing.registry as { entries?: Array<{ name?: string }> } | undefined;
  if (reg && reg.entries && reg.entries.length > 0) return null;
  const buckets = bucketsForOccasion(ctx.occasion);
  if (buckets.length === 0) return null;
  const existingReg = (existing.registry as Record<string, unknown>) ?? {};
  return {
    registry: {
      enabled: true,
      ...existingReg,
      entries: buckets.map((b, i) => ({
        id: `pear-${i}`,
        name: b.label,
        url: b.url,
        description: b.description,
      })),
    } as StoryManifest['registry'],
  };
};
