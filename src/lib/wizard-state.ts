import { useReducer } from 'react';
import type { StoryManifest } from '@/types';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard-state.ts
// Minimal reducer for the dashboard shell. WizardV2 (the category
// → occasion → names → … → generating flow under the 'pear-crafts'
// step key) is the single create-site entry point.
// ─────────────────────────────────────────────────────────────

export type WizardStep = 'dashboard' | 'pear-crafts' | 'edit';

export interface WizardState {
  step: WizardStep;
  manifest: StoryManifest | null;
  coupleNames: [string, string];
  subdomain: string;
}

export type WizardAction =
  | { type: 'NAVIGATE'; step: WizardStep }
  | { type: 'SET_MANIFEST'; manifest: StoryManifest; subdomain: string }
  | { type: 'SET_COUPLE_NAMES'; names: [string, string] }
  | { type: 'RESET' }
  | { type: 'EDIT_SITE'; manifest: StoryManifest; subdomain: string; names: [string, string] };

function initialState(): WizardState {
  return {
    step: 'dashboard',
    manifest: null,
    coupleNames: ['', ''],
    subdomain: '',
  };
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, step: action.step };

    case 'SET_MANIFEST':
      return {
        ...state,
        manifest: action.manifest,
        subdomain: action.subdomain,
        step: 'edit',
      };

    case 'SET_COUPLE_NAMES':
      return { ...state, coupleNames: action.names };

    case 'RESET':
      return initialState();

    case 'EDIT_SITE':
      return {
        ...state,
        manifest: action.manifest,
        subdomain: action.subdomain,
        coupleNames: action.names,
        step: 'edit',
      };

    default:
      return state;
  }
}

export function useWizardState() {
  const [state, dispatch] = useReducer(wizardReducer, undefined, initialState);
  return { state, dispatch };
}

export function generateSlug(names: [string, string]): string {
  const n1 = names[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'us';
  const n2 = names[1].toLowerCase().replace(/[^a-z0-9]/g, '') || 'together';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${n1}-and-${n2}-${suffix}`;
}
