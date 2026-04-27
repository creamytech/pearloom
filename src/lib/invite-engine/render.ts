// ─────────────────────────────────────────────────────────────
// Pearloom / lib/invite-engine/render.ts
//
// Thin wrapper around the image-router that:
//   1. Normalises the prompt context into an InviteContext
//   2. Calls the right prompt builder
//   3. Uploads the resulting bytes to R2
//   4. Returns the public URL + provider metadata
//
// One helper per surface: archetype hero, stamp, seal,
// postmark, couple avatar, scene. Every helper returns the
// same `{ url, base64?, mimeType, provider, key }` shape so
// call sites can store or stream the result.
// ─────────────────────────────────────────────────────────────

import { generateImage } from '@/lib/memory-engine/image-router';
import type { GeminiImageInput } from '@/lib/memory-engine/gemini-client';
import { uploadToR2, getR2Url } from '@/lib/r2';
import type { InviteArchetype } from './archetypes';
import {
  buildArchetypePrompt,
  buildStampPrompt,
  buildSealPrompt,
  buildPostmarkPrompt,
  buildAvatarPrompt,
  buildScenePrompt,
  buildEnvelopeBackPrompt,
  type InviteContext,
  type PaletteHex,
} from './designer-prompts';
import type { ImageSize } from '@/lib/memory-engine/openai-image';

export interface RenderResult {
  url: string;
  mimeType: string;
  key: string;
  /** Which provider produced this image. Useful when metering. */
  provider: 'openai' | 'gemini';
}

function keyFor(siteSlug: string, surface: string, ext: string): string {
  return `invites/${siteSlug}/${surface}-${Date.now().toString(36)}.${ext}`;
}

async function persist(opts: {
  base64: string;
  mimeType: string;
  siteSlug: string;
  surface: string;
}): Promise<RenderResult> {
  const ext = opts.mimeType.includes('jpeg') || opts.mimeType.includes('jpg') ? 'jpg'
    : opts.mimeType.includes('webp') ? 'webp' : 'png';
  const key = keyFor(opts.siteSlug, opts.surface, ext);
  const buf = Buffer.from(opts.base64, 'base64');
  await uploadToR2(key, buf, opts.mimeType);
  return {
    url: getR2Url(key),
    mimeType: opts.mimeType,
    key,
    provider: 'openai', // router doesn't return provenance today; we assume OpenAI for now
  };
}

// ── Archetype hero render ───────────────────────────────────

export async function renderArchetype(opts: {
  archetype: InviteArchetype;
  ctx: InviteContext;
  portrait?: GeminiImageInput;
  /** Additional reference images (e.g. host's inspiration mood
   *  board). Concatenated with the portrait when calling the
   *  edits endpoint. */
  extraInputImages?: GeminiImageInput[];
  siteSlug: string;
  size?: ImageSize;
}): Promise<RenderResult | null> {
  const prompt = buildArchetypePrompt(opts.archetype, {
    ...opts.ctx,
    hasPortrait: Boolean(opts.portrait),
  });
  const inputImages = [opts.portrait, ...(opts.extraInputImages ?? [])].filter(Boolean) as GeminiImageInput[];
  const result = await generateImage({
    prompt,
    inputImage: opts.portrait,
    inputImages: inputImages.length > 1 ? inputImages : undefined,
    purpose: 'invite',
    quality: 'high',
    size: opts.size ?? opts.archetype.size,
    moderation: 'low',
  });
  if (!result) return null;
  return persist({
    base64: result.base64,
    mimeType: result.mimeType,
    siteSlug: opts.siteSlug,
    surface: `archetype-${opts.archetype.id}`,
  });
}

// ── Postage stamp / wax seal / postmark ─────────────────────

export async function renderStamp(opts: {
  ctx: InviteContext;
  motif?: string;
  siteSlug: string;
}): Promise<RenderResult | null> {
  const prompt = buildStampPrompt({ ...opts.ctx, hasPortrait: false, motif: opts.motif });
  const result = await generateImage({
    prompt,
    purpose: 'stamp',
    quality: 'high',
    size: '1024x1024',
    moderation: 'auto',
  });
  if (!result) return null;
  return persist({ base64: result.base64, mimeType: result.mimeType, siteSlug: opts.siteSlug, surface: 'stamp' });
}

export async function renderSeal(opts: {
  ctx: InviteContext;
  monogram?: string;
  siteSlug: string;
}): Promise<RenderResult | null> {
  const prompt = buildSealPrompt({ ...opts.ctx, hasPortrait: false, monogram: opts.monogram });
  const result = await generateImage({
    prompt,
    purpose: 'seal',
    quality: 'high',
    size: '1024x1024',
    moderation: 'auto',
  });
  if (!result) return null;
  return persist({ base64: result.base64, mimeType: result.mimeType, siteSlug: opts.siteSlug, surface: 'seal' });
}

export async function renderPostmark(opts: {
  ctx: InviteContext;
  siteSlug: string;
}): Promise<RenderResult | null> {
  const prompt = buildPostmarkPrompt({ ...opts.ctx, hasPortrait: false });
  const result = await generateImage({
    prompt,
    purpose: 'postmark',
    quality: 'medium',
    size: '1024x1024',
    moderation: 'auto',
  });
  if (!result) return null;
  return persist({ base64: result.base64, mimeType: result.mimeType, siteSlug: opts.siteSlug, surface: 'postmark' });
}

// ── Couple avatar + scene ────────────────────────────────────

export async function renderAvatar(opts: {
  illustrationPrompt: string;
  palette: PaletteHex;
  siteSlug: string;
  coupleId: string;
  portrait?: GeminiImageInput;
}): Promise<RenderResult | null> {
  const prompt = buildAvatarPrompt({ illustrationPrompt: opts.illustrationPrompt, palette: opts.palette });
  const result = await generateImage({
    prompt,
    inputImage: opts.portrait,
    purpose: 'avatar',
    quality: 'high',
    size: '1024x1024',
    moderation: 'low',
  });
  if (!result) return null;
  // Avatars live in a stable couples/ bucket so every surface
  // can reference the same URL forever.
  const key = `couples/${opts.coupleId}/avatar-${Date.now().toString(36)}.png`;
  const buf = Buffer.from(result.base64, 'base64');
  await uploadToR2(key, buf, result.mimeType);
  return { url: getR2Url(key), mimeType: result.mimeType, key, provider: 'openai' };
}

export async function renderScene(opts: {
  sceneDescription: string;
  palette: PaletteHex;
  siteSlug: string;
  avatar: GeminiImageInput;
  extraContext?: GeminiImageInput;
}): Promise<RenderResult | null> {
  const prompt = buildScenePrompt({ sceneDescription: opts.sceneDescription, palette: opts.palette });
  const inputImages = opts.extraContext ? [opts.avatar, opts.extraContext] : [opts.avatar];
  const result = await generateImage({
    prompt,
    inputImages,
    purpose: 'scene',
    quality: 'high',
    size: '1024x1024',
    moderation: 'low',
  });
  if (!result) return null;
  return persist({ base64: result.base64, mimeType: result.mimeType, siteSlug: opts.siteSlug, surface: 'scene' });
}

export async function renderEnvelopeBack(opts: {
  ctx: InviteContext;
  motif?: string;
  siteSlug: string;
}): Promise<RenderResult | null> {
  const prompt = buildEnvelopeBackPrompt({ ...opts.ctx, hasPortrait: false, motif: opts.motif });
  const result = await generateImage({
    prompt,
    purpose: 'invite',
    quality: 'high',
    size: '1024x1536',
    moderation: 'auto',
  });
  if (!result) return null;
  return persist({ base64: result.base64, mimeType: result.mimeType, siteSlug: opts.siteSlug, surface: 'envelope-back' });
}
