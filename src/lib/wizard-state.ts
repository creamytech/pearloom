import { useReducer, useEffect, useCallback, useRef } from 'react';
import type { GooglePhotoMetadata, StoryManifest, PhotoCluster } from '@/types';

// ── Types ──────────────────────────────────────────────────────

export type WizardStep =
  | 'dashboard'
  | 'pear-crafts'
  | 'photos'
  | 'upload'
  | 'clusters'
  | 'vibe'
  | 'generating'
  | 'edit'
  | 'guests';

export interface VibeFormData {
  names: [string, string];
  vibeString: string;
  occasion: string;
  subdomain?: string;
  eventDate?: string;
  ceremonyVenue?: string;
  ceremonyAddress?: string;
  ceremonyTime?: string;
  receptionVenue?: string;
  receptionAddress?: string;
  receptionTime?: string;
  dresscode?: string;
  officiant?: string;
  celebrationVenue?: string;
  celebrationTime?: string;
  guestNotes?: string;
  inspirationUrls?: string[];
  layoutFormat?: string;
  rsvpDeadline?: string;
  cashFundUrl?: string;
  eventVenue?: string;
}

export interface WizardState {
  step: WizardStep;
  photos: GooglePhotoMetadata[];
  clusters: PhotoCluster[];
  vibeData: VibeFormData | null;
  manifest: StoryManifest | null;
  coupleNames: [string, string];
  subdomain: string;
  error: string | null;
  generationStep: number;
}

export type WizardAction =
  | { type: 'NAVIGATE'; step: WizardStep }
  | { type: 'SET_PHOTOS'; photos: GooglePhotoMetadata[] }
  | { type: 'SET_CLUSTERS'; clusters: PhotoCluster[] }
  | { type: 'SET_VIBE'; data: VibeFormData }
  | { type: 'SET_MANIFEST'; manifest: StoryManifest; subdomain: string }
  | { type: 'SET_COUPLE_NAMES'; names: [string, string] }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_GENERATION_STEP'; step: number }
  | { type: 'RESET' }
  | { type: 'RESTORE_DRAFT'; draft: WizardDraft }
  | { type: 'EDIT_SITE'; manifest: StoryManifest; subdomain: string; names: [string, string] }
  | { type: 'PATCH_VIBE_ART'; heroArtUrl?: string; ambientArtUrl?: string; artStripUrl?: string };

export interface WizardDraft {
  savedAt: number;
  coupleNames: [string, string];
  vibeString: string;
  step: WizardStep;
}

// ── Reducer ────────────────────────────────────────────────────

const STORAGE_KEY = 'pearloom_wizard_draft';

function initialState(): WizardState {
  return {
    step: 'dashboard',
    photos: [],
    clusters: [],
    vibeData: null,
    manifest: null,
    coupleNames: ['', ''],
    subdomain: '',
    error: null,
    generationStep: 0,
  };
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, step: action.step, error: null };

    case 'SET_PHOTOS':
      return { ...state, photos: action.photos };

    case 'SET_CLUSTERS':
      return { ...state, clusters: action.clusters };

    case 'SET_VIBE':
      return {
        ...state,
        vibeData: action.data,
        coupleNames: action.data.names,
        step: 'generating',
        generationStep: 0,
        error: null,
      };

    case 'SET_MANIFEST': {
      // Clear wizard draft on generation success
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      try { localStorage.removeItem('pearloom_draft_manifest'); } catch {}
      return {
        ...state,
        manifest: action.manifest,
        subdomain: action.subdomain,
        step: 'edit',
        generationStep: 7,
      };
    }

    case 'SET_COUPLE_NAMES':
      return { ...state, coupleNames: action.names };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        step: action.error ? 'vibe' : state.step,
      };

    case 'SET_GENERATION_STEP':
      return { ...state, generationStep: action.step };

    case 'RESET':
      return initialState();

    case 'RESTORE_DRAFT':
      return {
        ...state,
        coupleNames: action.draft.coupleNames,
        vibeData: state.vibeData
          ? { ...state.vibeData, names: action.draft.coupleNames, vibeString: action.draft.vibeString }
          : null,
        step: action.draft.step || 'vibe',
      };

    case 'EDIT_SITE':
      return {
        ...state,
        manifest: action.manifest,
        subdomain: action.subdomain,
        coupleNames: action.names,
        step: 'edit',
        generationStep: 0,
      };

    case 'PATCH_VIBE_ART':
      if (!state.manifest?.vibeSkin) return state;
      return {
        ...state,
        manifest: {
          ...state.manifest,
          vibeSkin: {
            ...state.manifest.vibeSkin,
            ...(action.heroArtUrl ? { heroArtDataUrl: action.heroArtUrl } : {}),
            ...(action.ambientArtUrl ? { ambientArtDataUrl: action.ambientArtUrl } : {}),
            ...(action.artStripUrl ? { artStripDataUrl: action.artStripUrl } : {}),
          },
        },
      };

    default:
      return state;
  }
}

// ── Hook ───────────────────────────────────────────────────────

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, undefined, initialState);
  const draftRef = useRef<WizardDraft | null>(null);

  // Load draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const draft: WizardDraft = JSON.parse(raw);
      if (draft?.savedAt && Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
        draftRef.current = draft;
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }, []);

  // Auto-save draft during active wizard steps
  useEffect(() => {
    if (state.step === 'vibe' || state.step === 'photos' || state.step === 'clusters' || state.step === 'upload') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          savedAt: Date.now(),
          coupleNames: state.coupleNames,
          vibeString: state.vibeData?.vibeString || '',
          step: state.step,
        }));
      } catch {}
    }
  }, [state.coupleNames, state.vibeData?.vibeString, state.step]);

  const getDraft = useCallback(() => draftRef.current, []);
  const clearDraft = useCallback(() => {
    draftRef.current = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { state, dispatch, getDraft, clearDraft };
}

// ── Slug generator ─────────────────────────────────────────────

export function generateSlug(names: [string, string]): string {
  const n1 = names[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'us';
  const n2 = names[1].toLowerCase().replace(/[^a-z0-9]/g, '') || 'together';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${n1}-and-${n2}-${suffix}`;
}
