'use client';

/* eslint-disable no-restricted-syntax */
/* GalleryPanel — host-editable photo gallery + Guest uploads toggle.

   Round X: replaced the tone-cycling palette UI with a real photo
   upload grid. Each slot is a PhotoUploadSlot (drag-drop +
   click-to-pick + remove) writing to manifest.galleryImages[].
   When the host has any photos, the canvas renders THEM instead
   of the gradient placeholders. */

import type { StoryManifest } from '@/types';
import { FGroup, FInput, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { PhotoUploadSlot, collectPhotoPool } from './_photo-upload';

export function GalleryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'gallery');
  const photos: string[] = ((manifest as unknown as { galleryImages?: string[] }).galleryImages) ?? [];
  const guestUploads = ((manifest as unknown as { guestUploads?: boolean }).guestUploads) ?? true;
  const [galleryEyebrow, setGalleryEyebrow] = useCopyOverride(manifest, onChange, 'galleryEyebrow');

  const setPhotos = (next: string[]) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    galleryImages: next,
  } as unknown as StoryManifest);

  const setPhoto = (i: number, url: string) => {
    const next = photos.slice();
    if (url) {
      next[i] = url;
    } else {
      next.splice(i, 1);
    }
    /* Drop trailing empties so the array stays compact. */
    while (next.length > 0 && !next[next.length - 1]) next.pop();
    setPhotos(next);
  };

  const addPhoto = (url: string) => {
    if (!url) return;
    setPhotos([...photos, url]);
  };

  const setGuestUploads = (v: boolean) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    guestUploads: v,
  } as unknown as StoryManifest);

  /* Render at least 6 slots (a 2×3 grid) so empty galleries still
     show the drop targets. When the host has more than 6, render
     all of them + one "Add another" slot at the end. */
  const minSlots = 6;
  const renderCount = Math.max(minSlots, photos.length);
  /* Pool of photos already uploaded elsewhere on the site (cover +
     chapter images) — lets each empty gallery slot pull a photo
     in from the rest of the site without re-uploading. */
  const photoPool = collectPhotoPool(manifest);

  return (
    <SectionPanelShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
          <FInput value={galleryEyebrow} onChange={setGalleryEyebrow} placeholder="Gallery" />
        </FGroup>
        {photos.length === 0 ? (
          /* Empty state — instead of 6 visually-broken empty slots,
             one big inviting drop zone. Same drag-drop / click
             affordance, but communicates that the section starts
             EMPTY by design. */
          <FGroup label="Photos" hint="A favorite shot of the two of you, a venue, your dog — anything you want guests to see.">
            <PhotoUploadSlot
              url=""
              onChange={addPhoto}
              aspectRatio="3/2"
              size="md"
              pool={photoPool}
              hint="Drop a photo here, or click to pick from your device. We'll line them up nicely on the canvas."
            />
            {photoPool.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Tip: tap the “Pick from gallery” chip above to reuse a photo you've already uploaded elsewhere.
              </div>
            )}
          </FGroup>
        ) : (
          <FGroup label={`Photos · ${photos.length}`} hint="Drag photos in, or click any slot to pick from your device.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {Array.from({ length: renderCount }).map((_, i) => (
                <PhotoUploadSlot
                  key={i}
                  url={photos[i] ?? ''}
                  onChange={(url) => setPhoto(i, url)}
                  aspectRatio="1/1"
                  size="sm"
                  pool={photoPool}
                />
              ))}
              {photos.length >= renderCount && (
                <PhotoUploadSlot
                  key="add-more"
                  url=""
                  onChange={addPhoto}
                  aspectRatio="1/1"
                  size="sm"
                  pool={photoPool}
                />
              )}
            </div>
          </FGroup>
        )}
        <FToggleStandalone
          label="Guest photo uploads"
          sub="Let guests add to a shared album"
          def={guestUploads}
          onChange={setGuestUploads}
        />
        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Gallery" />
      </div>
    </SectionPanelShell>
  );
}

export default GalleryPanel;
