// ─────────────────────────────────────────────────────────────
// Pearloom / lib/assets.ts
// Semantic asset registry. After extracting + renaming the sheets
// (see scripts/extract-assets.ts + scripts/rename-assets.ts), each
// entry resolves to a real PNG in public/assets/v2/.
// ─────────────────────────────────────────────────────────────

const BASE = '/assets/v2';

// Wizard-adjacent (sheet 6)
export const WIZARD = {
  pearNoteCard: `${BASE}/wizard/pear-note-card.png`,
  helperAndStill: `${BASE}/wizard/merged_helper-and-still.png`,
  vibeWarm: `${BASE}/wizard/vibe-pill-warm.png`,
  vibeBotanical: `${BASE}/wizard/vibe-pill-botanical.png`,
  vibeRomantic: `${BASE}/wizard/vibe-pill-romantic.png`,
  paletteGarden: `${BASE}/wizard/palette-garden.png`,
  paletteSunwashed: `${BASE}/wizard/palette-sunwashed.png`,
  paletteSage: `${BASE}/wizard/palette-sage.png`,
  paletteBlush: `${BASE}/wizard/palette-blush.png`,
  btnContinueGoogle: `${BASE}/wizard/btn-continue-google.png`,
  btnSignIn: `${BASE}/wizard/btn-sign-in.png`,
  btnSaveDraft: `${BASE}/wizard/btn-save-draft.png`,
  layoutStoryLed: `${BASE}/wizard/layout-story-led.png`,
  flowerCosmosBunch: `${BASE}/wizard/flower-cosmos-bunch.png`,
  flowerLavenderCosmos: `${BASE}/wizard/flower-lavender-cosmos.png`,
  pearloomCardFront: `${BASE}/wizard/pearloom-card-front.png`,
  pearloomCardsStack: `${BASE}/wizard/pearloom-cards-stack.png`,
  lavenderCard: `${BASE}/wizard/lavender-card.png`,
} as const;

// Editor-adjacent (sheet 7)
export const EDITOR = {
  navDashboardIcon: `${BASE}/editor/nav-dashboard-icon.png`,
  progressBarOlive: `${BASE}/editor/progress-bar-olive-full.png`,
  progressBarLavender: `${BASE}/editor/progress-bar-lavender.png`,
  btnPublishSite: `${BASE}/editor/btn-publish-site.png`,
  btnSaveChanges: `${BASE}/editor/btn-save-changes.png`,
  btnMicPurple: `${BASE}/editor/btn-mic-purple.png`,
  chipPrimary: `${BASE}/editor/chip-primary.png`,
  chipEvent: `${BASE}/editor/chip-event.png`,
  chipRegistry: `${BASE}/editor/chip-registry.png`,
  chipLive: `${BASE}/editor/chip-live.png`,
  swatchOlive: `${BASE}/editor/swatch-olive.png`,
  swatchLavender: `${BASE}/editor/swatch-lavender.png`,
  swatchLavenderLight: `${BASE}/editor/swatch-lavender-light.png`,
  swatchTan: `${BASE}/editor/swatch-tan.png`,
  videoPreviewCeremony: `${BASE}/editor/video-preview-ceremony.png`,
  flowerDaisy: `${BASE}/editor/flower-daisy.png`,
  pearPhoto: `${BASE}/editor/pear-photo.png`,
  coffeeMug: `${BASE}/editor/coffee-mug.png`,
  vaseLinenStill: `${BASE}/editor/vase-linen-still.png`,
  storyIconsRow: `${BASE}/editor/merged_story-icons-row.png`,
} as const;

// Remember-adjacent (sheet 9)
export const REMEMBER = {
  videoPlayerCouple: `${BASE}/remember/video-player-couple.png`,
  thankyouTag: `${BASE}/remember/thankyou-tag.png`,
  timeCapsuleBottle: `${BASE}/remember/time-capsule-bottle.png`,
  avatarMom: `${BASE}/remember/avatar-round-mom.png`,
  polaroidCoupleWalk: `${BASE}/remember/polaroid-couple-walk.png`,
  tableCardArrangement: `${BASE}/remember/table-card-arrangement.png`,
  pearThankyouStill: `${BASE}/remember/pear-thankyou-still.png`,
  receptionPhotosCover: `${BASE}/remember/reception-photos-cover.png`,
  flowerPurpleDaisies: `${BASE}/remember/flower-purple-daisies.png`,
  pearOutlineSad: `${BASE}/remember/pear-outline-sad.png`,
  flowerLavenderStem: `${BASE}/remember/flower-lavender-stem.png`,
  flowerBabysbreathDaisy: `${BASE}/remember/flower-babysbreath-daisy.png`,
  flowerLavenderDaisies: `${BASE}/remember/flower-lavender-daisies.png`,
  foreverStoryCard: `${BASE}/remember/forever-story-card.png`,
  keepsakeArchiveBadge: `${BASE}/remember/keepsake-archive-badge.png`,
  btnShareKeepsake: `${BASE}/remember/btn-share-keepsake.png`,
  avatarsLovedOnes: `${BASE}/remember/avatars-loved-ones.png`,
} as const;

// Timeline + branding: still raw-numbered. Add entries as we
// manually inventory them.
export const TIMELINE_RAW = (n: number) =>
  `${BASE}/timeline/timeline-${String(n).padStart(2, '0')}.png`;
export const BRANDING_RAW = (n: number) =>
  `${BASE}/branding/branding-${String(n).padStart(2, '0')}.png`;

// Kept for backwards compat with earlier v2 components that used the
// nested V2_ASSETS registry. Resolves to the new flat maps above.
export const V2_ASSETS = {
  wizard: WIZARD,
  editor: EDITOR,
  remember: REMEMBER,
} as const;
