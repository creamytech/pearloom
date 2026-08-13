// ─────────────────────────────────────────────────────────────
// Pearloom / scripts/rename-assets.ts
// One-off batch rename of extracted crops to semantic names.
// Run AFTER `npm run assets:extract`. Idempotent — if the target
// file already exists it's skipped.
// ─────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';

interface Rename {
  from: string;
  to: string;
}

// Each rename is { numbered crop → semantic name }. When a crop is
// a known-compound (merged extraction), we prefix with `merged_`.
const RENAMES: Record<string, Rename[]> = {
  wizard: [
    { from: 'wizard-01.png', to: 'pear-note-card.png' },
    { from: 'wizard-02.png', to: 'merged_helper-and-still.png' },
    { from: 'wizard-03.png', to: 'vibe-pill-warm.png' },
    { from: 'wizard-04.png', to: 'vibe-pill-botanical.png' },
    { from: 'wizard-05.png', to: 'vibe-pill-romantic.png' },
    { from: 'wizard-06.png', to: 'palette-sunwashed.png' },
    { from: 'wizard-07.png', to: 'palette-sage.png' },
    { from: 'wizard-08.png', to: 'palette-blush.png' },
    { from: 'wizard-09.png', to: 'palette-garden.png' },
    { from: 'wizard-10.png', to: 'btn-continue-google.png' },
    { from: 'wizard-11.png', to: 'layout-story-led.png' },
    { from: 'wizard-12.png', to: 'btn-sign-in.png' },
    { from: 'wizard-13.png', to: 'btn-save-draft.png' },
    { from: 'wizard-14.png', to: 'flower-cosmos-bunch.png' },
    { from: 'wizard-15.png', to: 'flower-lavender-cosmos.png' },
    { from: 'wizard-16.png', to: 'pearloom-card-front.png' },
    { from: 'wizard-17.png', to: 'pearloom-cards-stack.png' },
    { from: 'wizard-18.png', to: 'lavender-card.png' },
  ],
  editor: [
    { from: 'editor-01.png', to: 'nav-dashboard-icon.png' },
    { from: 'editor-02.png', to: 'progress-bar-olive-full.png' },
    { from: 'editor-03.png', to: 'btn-publish-site.png' },
    { from: 'editor-04.png', to: 'progress-bar-lavender.png' },
    { from: 'editor-05.png', to: 'btn-save-changes.png' },
    { from: 'editor-06.png', to: 'chip-primary.png' },
    { from: 'editor-07.png', to: 'chip-event.png' },
    { from: 'editor-08.png', to: 'chip-registry.png' },
    { from: 'editor-09.png', to: 'chip-live.png' },
    { from: 'editor-10.png', to: 'swatch-olive.png' },
    { from: 'editor-11.png', to: 'swatch-lavender.png' },
    { from: 'editor-12.png', to: 'swatch-lavender-light.png' },
    // editor-13 to editor-18 are swatches (left as numbered — we
    // read palette values in CSS, these are primarily reference).
    { from: 'editor-19.png', to: 'swatch-tan.png' },
    { from: 'editor-20.png', to: 'btn-mic-purple.png' },
    { from: 'editor-21.png', to: 'video-preview-ceremony.png' },
    { from: 'editor-22.png', to: 'flower-daisy.png' },
    { from: 'editor-23.png', to: 'pear-photo.png' },
    { from: 'editor-24.png', to: 'coffee-mug.png' },
    { from: 'editor-25.png', to: 'vase-linen-still.png' },
    { from: 'editor-26.png', to: 'merged_story-icons-row.png' },
  ],
  timeline: [
    // timeline-01 is the big first-meeting card; the rest are photo
    // strips / pills / small flower accents. Leave numbered for now
    // and address in a future pass when we build the timeline UI.
  ],
  remember: [
    { from: 'remember-01.png', to: 'video-player-couple.png' },
    { from: 'remember-02.png', to: 'thankyou-tag.png' },
    { from: 'remember-03.png', to: 'time-capsule-bottle.png' },
    { from: 'remember-04.png', to: 'avatar-round-mom.png' },
    { from: 'remember-05.png', to: 'polaroid-couple-walk.png' },
    { from: 'remember-06.png', to: 'table-card-arrangement.png' },
    { from: 'remember-07.png', to: 'pear-thankyou-still.png' },
    { from: 'remember-08.png', to: 'reception-photos-cover.png' },
    { from: 'remember-09.png', to: 'flower-purple-daisies.png' },
    { from: 'remember-10.png', to: 'pear-outline-sad.png' },
    { from: 'remember-11.png', to: 'flower-lavender-stem.png' },
    { from: 'remember-12.png', to: 'flower-babysbreath-daisy.png' },
    { from: 'remember-13.png', to: 'flower-lavender-daisies.png' },
    { from: 'remember-14.png', to: 'forever-story-card.png' },
    { from: 'remember-15.png', to: 'keepsake-archive-badge.png' },
    { from: 'remember-16.png', to: 'btn-share-keepsake.png' },
    { from: 'remember-17.png', to: 'avatars-loved-ones.png' },
  ],
  branding: [
    // branding is one big blob + a thread rule; needs manual slicing.
  ],
};

function run() {
  const root = path.join(process.cwd(), 'public', 'assets', 'v2');
  let renamed = 0;
  let skipped = 0;
  for (const [dir, renames] of Object.entries(RENAMES)) {
    const dirPath = path.join(root, dir);
    if (!fs.existsSync(dirPath)) {
      console.log(`[skip] ${dir}/ missing`);
      continue;
    }
    for (const r of renames) {
      const src = path.join(dirPath, r.from);
      const dst = path.join(dirPath, r.to);
      if (!fs.existsSync(src)) {
        console.log(`[skip] ${dir}/${r.from} not found`);
        skipped++;
        continue;
      }
      if (fs.existsSync(dst)) {
        console.log(`[skip] ${dir}/${r.to} already exists`);
        skipped++;
        continue;
      }
      fs.renameSync(src, dst);
      renamed++;
    }
  }
  console.log(`\n✓ renamed ${renamed}, skipped ${skipped}`);
}

run();
