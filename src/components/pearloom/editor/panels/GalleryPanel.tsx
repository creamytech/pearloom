'use client';

/* eslint-disable no-restricted-syntax */
/* GalleryPanel — host-editable photo gallery + Guest uploads toggle.

   Round X: replaced the tone-cycling palette UI with a real photo
   upload grid. Each slot is a PhotoUploadSlot (drag-drop +
   click-to-pick + remove) writing to manifest.galleryImages[].
   When the host has any photos, the canvas renders THEM instead
   of the gradient placeholders. */

import type { StoryManifest } from '@/types';
import { Icon } from '../../motifs';
import { FGroup, FInput, FToggleStandalone, SectionPanelShell, SectionVisibilityFooter, useCopyOverride, useSectionHidden } from './_section-atoms';
import { moveIndexKeyed, moveItem, ReorderHandle } from './_reorder';
import { PhotoUploadSlot, collectPhotoPool } from './_photo-upload';

export function GalleryPanel({ manifest, onChange }: { manifest: StoryManifest; onChange: (m: StoryManifest) => void }) {
  const [isHidden, setHidden] = useSectionHidden(manifest, onChange, 'gallery');
  const photos: string[] = ((manifest as unknown as { galleryImages?: string[] }).galleryImages) ?? [];
  /* ONE guest-photos toggle (2026-07-02) — the panel used to carry
     two: "Guest photo uploads" (guestUploads — the QR poster's
     upload page) and "Invite guest photos" (galleryUploads — the
     'Share your photos' link under the gallery), a pair nobody
     could tell apart. Merged: one switch writes BOTH fields; it
     reads OFF when a legacy manifest turned either off. */
  const looseUp = manifest as unknown as { guestUploads?: boolean; galleryUploads?: boolean };
  const guestUploads = (looseUp.guestUploads ?? true) && (looseUp.galleryUploads !== false);
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

  /* Multi-file drop / pick — one write for the whole batch so undo
     treats "added 12 photos" as one step. */
  const addPhotos = (urls: string[]) => {
    const next = urls.filter(Boolean);
    if (next.length === 0) return;
    setPhotos([...photos, ...next]);
  };

  /* Reorder — the grid reads left-to-right, so ▲ = earlier, ▼ =
     later. Captions are index-keyed, so they move WITH the photo
     (moveIndexKeyed remaps the sidecar in the same write). */
  const movePhoto = (from: number, to: number) => {
    const next = moveItem(photos, from, to);
    if (next === photos) return;
    setPhotos(next, moveIndexKeyed(captions, from, to));
  };

  const setGuestUploads = (v: boolean) => onChange({
    ...(manifest as unknown as Record<string, unknown>),
    /* One decision, both surfaces — the QR poster's upload page
       AND the 'Share your photos' link under the gallery. */
    guestUploads: v,
    galleryUploads: v,
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
        {/* ── Zip GalleryEditor layout (section-fields.jsx L272-285):
              a "Photos · N" group (3-col thumbnail grid + dashed add
              tile) followed by the "Guest photo uploads" toggle. The
              eyebrow override, the second guest-photo invite, and the
              visibility footer are production-only — tucked under
              "More" below so the default view is 1:1 with the zip. */}
        {photos.length === 0 ? (
          /* Empty state — instead of 6 visually-broken empty slots,
             one big inviting drop zone. Same drag-drop / click
             affordance, but communicates that the section starts
             EMPTY by design. */
          <FGroup label="Photos" hint="Nothing yet. Begin with one — a favorite shot of the two of you, a venue, your dog.">
            <PhotoUploadSlot
              url=""
              onChange={addPhoto}
              onAddMany={addPhotos}
              multiple
              aspectRatio="3/2"
              size="md"
              pool={photoPool}
              hint="Drag photos in, or click to browse — pick a whole batch at once, up to 12 MB each. We'll line them up on the canvas."
            />
            {photoPool.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Tip: tap the “Pick from gallery” chip above to reuse a photo you've already uploaded elsewhere.
              </div>
            )}
          </FGroup>
        ) : (
          <FGroup label={`Photos · ${photos.length}`} hint="Drag photos in — several at once works — or click any slot to pick from your device. Captions show under each photo on the site.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {Array.from({ length: renderCount }).map((_, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <PhotoUploadSlot
                    url={photos[i] ?? ''}
                    onChange={(url) => setPhoto(i, url)}
                    /* Empty slots accept a batch; filled slots stay
                       single-swap so a multi-pick can't clobber a
                       photo the host meant to keep. */
                    onAddMany={photos[i] ? undefined : addPhotos}
                    multiple={!photos[i]}
                    aspectRatio="1/1"
                    size="sm"
                    pool={photoPool}
                  />
                  {/* Caption + order — only for filled slots. The
                      grid reads left-to-right; ▲ moves the photo
                      earlier, ▼ later, caption riding along. */}
                  {photos[i] && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ReorderHandle
                        index={i}
                        count={photos.length}
                        label={captions[String(i)] || `photo ${i + 1}`}
                        onMove={movePhoto}
                      />
                      <FInput
                        value={captions[String(i)] ?? ''}
                        onChange={(v) => setCaption(i, v)}
                        placeholder="Caption"
                      />
                    </div>
                  )}
                </div>
              ))}
              {photos.length >= renderCount && (
                <PhotoUploadSlot
                  key="add-more"
                  url=""
                  onChange={addPhoto}
                  onAddMany={addPhotos}
                  multiple
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
          sub={guestUploads
            ? "On — a 'Share your photos' link under the gallery, plus your QR poster's upload page"
            : 'Off — no share link on the site and the upload page is closed'}
          def={guestUploads}
          onChange={setGuestUploads}
        />

        <details className="pl-panel-more">
          <summary
            style={{
              cursor: 'pointer', listStyle: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase', color: 'var(--ink-muted)',
            }}
          >
            <Icon name="chev-down" size={12} /> More — eyebrow
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }}>
            <FGroup label="Eyebrow" hint="The tiny ALL-CAPS line above the section title.">
              <FInput value={galleryEyebrow} onChange={setGalleryEyebrow} placeholder="Gallery" />
            </FGroup>
          </div>
        </details>

        {/* Outside the More disclosure — the other seven section
            panels keep the hide-this-section affordance always
            visible; burying it here made Gallery the odd one out. */}
        <SectionVisibilityFooter isHidden={isHidden} setHidden={setHidden} sectionLabel="Gallery" />
      </div>
    </SectionPanelShell>
  );
}

export default GalleryPanel;
