// ─────────────────────────────────────────────────────────────
// Pearloom / lib/pear/editor-voice.ts
//
// Voice DNA → Pear's rewrite calls. The host trains Pear once at
// /dashboard/voice (manifest.voiceDNA); before this module only
// the cadence drafter read it. Now the editor registers the open
// site's voice here (EditorRedesign effect) and every
// /api/rewrite-text + /api/inline-rewrite call site attaches
// `voiceProfile: editorVoiceProfile()` so polished copy sounds
// like the host, not Pear.
//
// Module-level store on purpose — the editor mounts one site at a
// time, and the rewrite calls fire from deep leaf components
// (PearInlineRewrite mounts in six panels) that don't receive the
// manifest. Same module-cache pattern as avatars' useUserAvatar.
// Cleared on editor unmount so dashboard surfaces never reuse a
// stale site's voice.
// ─────────────────────────────────────────────────────────────

import type { StoryManifest } from '@/types';

/** The subset of voiceDNA the rewrite routes consume — mirrors
 *  /api/rewrite-text's voiceProfile body param. */
export interface VoiceProfile {
  tone?: string;
  formality?: number;
  phrases?: string[];
  avoidList?: string[];
}

export function voiceProfileFrom(manifest: Pick<StoryManifest, 'voiceDNA'> | null | undefined): VoiceProfile | undefined {
  const dna = manifest?.voiceDNA;
  if (!dna) return undefined;
  return {
    tone: dna.tone,
    formality: dna.formality,
    phrases: dna.phrases,
    avoidList: dna.avoidList,
  };
}

let current: VoiceProfile | undefined;

/** Editor-mount registration. Pass null to clear (unmount). */
export function setEditorVoiceProfile(manifest: Pick<StoryManifest, 'voiceDNA'> | null | undefined): void {
  current = voiceProfileFrom(manifest);
}

/** The open site's voice, or undefined when the host never
 *  captured one (callers just omit the body field then). */
export function editorVoiceProfile(): VoiceProfile | undefined {
  return current;
}
