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

  /* Captions live in manifest.galleryCaptions — an index-keyed
     sidecar record (see the StoryManifest field doc for why index
     keying). Removal below reindexes it so captions stay attached
     to the right photo. */
  const captions: Record<string, string> = ((manifest as unknown as { galleryCaptions?: Record<string, string> }).galleryCaptions) ?? {};

  const setPhotos = (next: string[], nextCaptions?: Record<string, string>) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    galleryImages: next,
    ...(nextCaptions ? { galleryCaptions: nextCaptions } : {}),
  } as unknown as StoryManifest);

  const setCaption = (i: number, v: string) => {
    const next = { ...captions };
    if (v) next[String(i)] = v;
    else delete next[String(i)];
    onChange({
      ...(manifest as unknown as Record<string, unknown>),
      galleryCaptions: next,
    } as unknown as StoryManifest);
  };

  const setPhoto = (i: number, url: string) => {
    const next = photos.slice();
    let nextCaptions: Record<string, string> | undefined;
    if (url) {
      next[i] = url;
    } else {
      next.splice(i, 1);
      /* Shift caption keys above the removed index down by one so
         each caption stays with its photo. */
      nextCaptions = {};
      for (const [k, v] of Object.entries(captions)) {
        const ki = Number(k);
        if (!Number.isInteger(ki) || ki === i) continue;
        nextCaptions[String(ki > i ? ki - 1 : ki)] = v;
      }
    }
    /* Drop trailing empties so the array stays compact. */
    while (next.length > 0 && !next[next.length - 1]) next.pop();
    setPhotos(next, nextCaptions);
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
          <FGroup label="Photos" hint="Nothing yet. Begin with one — a favorite shot of the two of you, a venue, your dog.">
            <PhotoUploadSlot
              url=""
              onChange={addPhoto}
              aspectRatio="3/2"
              size="md"
              pool={photoPool}
              hint="Drag a photo in, or click to browse your device. Any image up to 12 MB, one at a time — we'll line them up on the canvas."
            />
            {photoPool.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Tip: tap the “Pick from gallery” chip above to reuse a photo you've already uploaded elsewhere.
              </div>
            )}
          </FGroup>
        ) : (
          <FGroup label={`Photos · ${photos.length}`} hint="Drag photos in, or click any slot to pick from your device. Captions show under each photo on the site.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {Array.from({ length: renderCount }).map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <PhotoUploadSlot
                    url={photos[i] ?? ''}
                    onChange={(url) => setPhoto(i, url)}
                    aspectRatio="1/1"
                    size="sm"
                    pool={photoPool}
                  />
                  {/* Caption input — only for filled slots. */}
                  {photos[i] && (
                    <FInput
                      value={captions[String(i)] ?? ''}
                      onChange={(v) => setCaption(i, v)}
                      placeholder="Caption"
                    />
                  )}
                </div>
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
          sub="Guests can add photos via your QR poster's upload page; off closes it"
          def={guestUploads}
          onChange={setGuestUploads}
        />
        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Gallery" />
      </div>
    </SectionPanelShell>
  );
}

export default GalleryPanel;
