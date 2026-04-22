'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/design/WizardV3.tsx
// Orchestrator that composes the existing 13 sub-steps inside
// the new 6-phase shell (WizardShellV2). The shell provides the
// topbar, the 6-knot progress thread, the breadcrumb chip row,
// the right Pear sidebar, and the bottom voice strip. Each
// existing sub-step renders embedded (Scene + StepHead suppress
// their own chrome via context).
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PD } from '../../marketing/design/DesignAtoms';
import { SceneEmbedProvider } from './WizardShell';
import {
  WizardTopbar,
  ProgressThread6,
  BreadcrumbChips,
  WizardBody,
  PearSidebar,
  VoiceStrip,
  type BreadcrumbChip,
} from './WizardShellV2';
import { BreathMoment } from './WizardHelper';
import { STEPS, PHASES, EVENTS, type StepKey, type PhaseKey } from './wizardSpec';
import type { StoryManifest } from '@/types';
import type { WizardAnswers, PhotoEntry } from './wizardAnswers';
import { VoiceFirst } from './VoiceFirst';
import { StepCategory, StepOccasion, StepNames } from './Steps1to3';
import { StepDate, StepVenue, StepDetails } from './Steps4to6';
import { StepPhotos, StepPhotoReview } from './Steps7to8';
import { StepVibe, StepLayout, StepSong } from './Steps9to11';
import { StepReady, StepGenerating } from './Steps12to13';

const STORAGE_KEY = 'pearloom:wizard-v3';

function visibleSteps(answers: WizardAnswers) {
  const ev = EVENTS.find((e) => e.k === answers.occasion);
  const needsDetails = !!(ev?.days || ev?.memory || ev?.school);
  const hasPhotos = (answers.photos?.length ?? 0) > 0;
  return STEPS.filter((s) => {
    if (s.k === 'details' && !needsDetails) return false;
    if (s.k === 'photoreview' && !hasPhotos) return false;
    return true;
  });
}

// Which phase the current sub-step belongs to.
function phaseOf(k: StepKey): PhaseKey {
  return STEPS.find((s) => s.k === k)?.phase ?? 'occasion';
}

// Tip + sidebar copy per phase.
const PHASE_COPY: Record<
  PhaseKey,
  { why: string; tip?: string }
> = {
  occasion: {
    why:
      'The basics shape the whole thing — what you’re celebrating, who it’s for, and when it is. Everything Pear drafts cascades from here.',
    tip: 'Not locked on a date? Season or year works. Pear will keep the tone right either way.',
  },
  vibe: {
    why:
      'Your vibe shapes the entire experience — from colors and fonts to layout and little details.',
    tip: 'Think about how you want your guests to feel when they visit your site — calm, excited, inspired?',
  },
  layout: {
    why:
      'Layout is how the story reads. Pick a shape that fits how many moments you want to show.',
    tip: 'If you’re unsure, let Pear decide — it picks the layout after the chapters are written.',
  },
  details: {
    why:
      'Photos and captions anchor Pear’s writing. Twelve good photos beats a hundred blurry ones.',
    tip: 'You can add photos from your computer or pull straight from Google Photos.',
  },
  polish: {
    why:
      'One last look before Pear presses the whole site. You can still change anything after it’s woven.',
  },
  publish: {
    why: 'Pear is weaving the site now. Hang on — it’s worth it.',
  },
};

function buildChips(a: WizardAnswers): BreadcrumbChip[] {
  const ev = EVENTS.find((e) => e.k === a.occasion);
  const names =
    a.nameA && a.nameB ? `${a.nameA} & ${a.nameB}` : a.nameA ?? '';
  const when =
    a.dateMode === 'specific' && a.date
      ? new Date(a.date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : a.dateMode === 'season'
      ? a.dateSeason ?? ''
      : a.dateMode === 'year' && a.dateYear
      ? String(a.dateYear)
      : a.dateMode === 'tba'
      ? 'TBA'
      : '';
  return [
    { label: 'Occasion', value: ev?.l ?? '' },
    { label: 'Names', value: names },
    { label: 'Date', value: when },
    { label: 'Location', value: a.venue ?? '' },
    { label: 'Vibe', value: a.vibeName ?? '' },
    { label: 'Layout', value: a.storyLayoutPreference && a.storyLayoutPreference !== 'auto' ? a.storyLayoutPreference : '' },
    { label: 'Details', value: a.photos?.length ? `${a.photos.length} photos` : '' },
    { label: 'Music', value: a.songMeta?.title ?? '' },
  ];
}

function toGooglePhotoMeta(p: PhotoEntry) {
  return {
    id: p.id,
    filename: p.filename,
    mimeType: p.mimeType,
    creationTime: p.creationTime,
    width: p.width,
    height: p.height,
    baseUrl: p.baseUrl,
    description: p.description,
  };
}

function buildRequestBody(a: WizardAnswers): string {
  const names: [string, string] = [a.nameA ?? '', a.nameB ?? ''];
  const photoNotesById: Record<string, { note?: string; location?: string; date?: string }> = {};
  (a.photos ?? []).forEach((p) => {
    if (!p.id) return;
    if (p.note || p.location || p.date) {
      photoNotesById[p.id] = {
        note: p.note || undefined,
        location: p.location || undefined,
        date: p.date || undefined,
      };
    }
  });
  const eventDate =
    a.dateMode === 'specific' && a.date ? a.date : undefined;
  return JSON.stringify({
    photos: (a.photos ?? []).map(toGooglePhotoMeta),
    vibeString: `${a.occasion ?? ''} ${a.vibe ?? ''} ${a.venue ?? ''}`.trim(),
    vibeName: a.vibeName || a.vibe || undefined,
    category: a.category,
    names,
    occasion: a.occasion,
    eventDate,
    dateMode: a.dateMode,
    dateSeason: a.dateSeason,
    guestCount: a.guestCount,
    hostRole: a.hostRole,
    factSheet:
      a.factSheet && Object.values(a.factSheet).some((v) => (v ?? '').toString().trim().length > 0)
        ? a.factSheet
        : undefined,
    songMeta: a.songMeta?.title ? a.songMeta : undefined,
    visibility: a.visibility,
    tonePolicy: a.tonePolicy,
    eventVenue: a.venue,
    celebrationVenue: a.venue,
    layoutFormat: 'cascade',
    storyLayout: a.storyLayout,
    storyLayoutPreference: a.storyLayoutPreference ?? 'auto',
    selectedPaletteColors: a.palette?.colors,
    photoNotes: Object.keys(photoNotesById).length > 0 ? photoNotesById : undefined,
    songUrl: a.songUrl?.trim() || undefined,
    eventDetails:
      a.eventDetails && Object.keys(a.eventDetails).length > 0 ? a.eventDetails : undefined,
    optInAILogo: !!a.optInAILogo,
  });
}

// ──────────────────────────────────────────────────────────────
export interface WizardV3Props {
  onComplete: (m: StoryManifest, names: [string, string], subdomain: string) => void;
  onBack: () => void;
}

export function WizardV3({ onComplete, onBack }: WizardV3Props) {
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [current, setCurrent] = useState<StepKey>('category');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [showBreath, setShowBreath] = useState(false);
  const [progress, setProgress] = useState(0);
  const [genMessage, setGenMessage] = useState<string | undefined>();
  const [genDone, setGenDone] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{
    manifest: StoryManifest;
    subdomain: string;
  } | null>(null);

  // Load persisted answers
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { answers: WizardAnswers; step: StepKey };
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.step) setCurrent(parsed.step);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, step: current }));
    } catch {
      /* ignore */
    }
  }, [answers, current]);

  const visible = useMemo(() => visibleSteps(answers), [answers]);
  const currentPhase = phaseOf(current);
  const chips = useMemo(() => buildChips(answers), [answers]);

  const set = useCallback((patch: Partial<WizardAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...patch }));
  }, []);

  const currentIdx = visible.findIndex((s) => s.k === current);

  const completedPhases = useMemo(() => {
    const done = new Set<PhaseKey>();
    // Everything before the current phase is done.
    for (const p of PHASES) {
      if (p.k === currentPhase) break;
      done.add(p.k);
    }
    return done;
  }, [currentPhase]);

  const goTo = useCallback(
    (k: StepKey) => {
      if (visible.some((s) => s.k === k)) setCurrent(k);
    },
    [visible],
  );

  const jumpToPhase = useCallback(
    (k: PhaseKey) => {
      const first = visible.find((s) => s.phase === k);
      if (first) setCurrent(first.k);
    },
    [visible],
  );

  const next = useCallback(() => {
    const idx = visible.findIndex((s) => s.k === current);
    const nxt = visible[idx + 1];
    if (!nxt) return;
    if (current === 'photoreview' && nxt.k === 'vibe') {
      setShowBreath(true);
      return;
    }
    setCurrent(nxt.k);
  }, [current, visible]);

  const back = useCallback(() => {
    const idx = visible.findIndex((s) => s.k === current);
    const prev = visible[idx - 1];
    if (prev) setCurrent(prev.k);
  }, [current, visible]);

  const skip = useCallback(() => next(), [next]);

  const onVoiceParsed = useCallback(
    (patch: Partial<WizardAnswers>) => {
      set(patch);
      setVoiceOpen(false);
      const firstMissing: StepKey = !patch.category
        ? 'category'
        : !patch.occasion
        ? 'occasion'
        : !patch.nameA
        ? 'names'
        : !patch.date && !patch.dateMode
        ? 'date'
        : !patch.venue
        ? 'venue'
        : 'photos';
      setCurrent(firstMissing);
    },
    [set],
  );

  // Generation runner
  const runGeneration = useCallback(async () => {
    setProgress(0);
    setGenDone(false);
    setGenError(null);
    setCompleted(null);
    const body = buildRequestBody(answers);
    try {
      let res: Response;
      try {
        res = await fetch('/api/generate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        if (!res.ok) throw new Error('stream unavailable');
      } catch {
        res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }
      if (res.headers.get('content-type')?.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let manifest: StoryManifest | null = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.startsWith('data:') ? line.slice(5).trim() : line.trim();
            if (!trimmed) continue;
            try {
              const event = JSON.parse(trimmed);
              if (event.type === 'progress') {
                const pass = event.pass ?? 0;
                setProgress(Math.min(0.98, (pass + 1) / 8));
                if (event.message) setGenMessage(event.message);
              }
              if (event.type === 'complete') {
                manifest = event.manifest;
                setProgress(1);
              }
              if (event.type === 'error') throw new Error(event.message || 'Generation failed');
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
        if (manifest) {
          const n1 = (answers.nameA || 'celebration').toLowerCase().replace(/[^a-z0-9]/g, '');
          const n2 = (answers.nameB || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const suffix = Math.random().toString(36).slice(2, 6);
          const subdomain = n2 ? `${n1}-and-${n2}-${suffix}` : `${n1}-${suffix}`;
          setCompleted({ manifest, subdomain });
          setGenDone(true);
          return;
        }
      }
      const data = await res.json();
      if (!data.manifest) throw new Error('No manifest returned');
      const n1 = (answers.nameA || 'celebration').toLowerCase().replace(/[^a-z0-9]/g, '');
      const n2 = (answers.nameB || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const suffix = Math.random().toString(36).slice(2, 6);
      const subdomain = n2 ? `${n1}-and-${n2}-${suffix}` : `${n1}-${suffix}`;
      setProgress(1);
      setCompleted({ manifest: data.manifest, subdomain });
      setGenDone(true);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed');
    }
  }, [answers]);

  useEffect(() => {
    if (current !== 'generating') return;
    runGeneration();
  }, [current, runGeneration]);

  const handleCurtainDone = useCallback(() => {
    if (!completed) return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    onComplete(completed.manifest, [answers.nameA ?? '', answers.nameB ?? ''], completed.subdomain);
  }, [completed, onComplete, answers.nameA, answers.nameB]);

  // ── Step body ─────────────────────────────────────────────
  const shared = { answers, set, next, back, skip, goTo };
  let body: React.ReactNode;
  switch (current) {
    case 'category':
      body = <StepCategory {...shared} onVoice={() => setVoiceOpen(true)} />;
      break;
    case 'occasion':
      body = <StepOccasion {...shared} />;
      break;
    case 'names':
      body = <StepNames {...shared} />;
      break;
    case 'date':
      body = <StepDate {...shared} />;
      break;
    case 'venue':
      body = <StepVenue {...shared} />;
      break;
    case 'details':
      body = <StepDetails {...shared} />;
      break;
    case 'photos':
      body = <StepPhotos {...shared} />;
      break;
    case 'photoreview':
      body = <StepPhotoReview {...shared} />;
      break;
    case 'vibe':
      body = <StepVibe {...shared} />;
      break;
    case 'layout':
      body = <StepLayout {...shared} />;
      break;
    case 'song':
      body = <StepSong {...shared} />;
      break;
    case 'ready':
      body = <StepReady {...shared} />;
      break;
    case 'generating':
      body = null;
      break;
  }

  // Generating is full-screen (curtain reveal) — bypass the new shell.
  if (current === 'generating') {
    return (
      <StepGenerating
        progress={progress}
        message={genError ?? genMessage}
        done={genDone && !genError}
        onDone={handleCurtainDone}
      />
    );
  }

  const title =
    answers.nameA && answers.nameB
      ? `The ${answers.nameA} & ${answers.nameB} Celebration`
      : answers.nameA
      ? `${answers.nameA}'s site`
      : 'Your new site';

  const phaseCopy = PHASE_COPY[currentPhase];

  return (
    <div style={{ background: PD.paper, minHeight: '100vh' }}>
      <WizardTopbar
        title={title}
        draft
        onBackHome={onBack}
        onSave={() => {
          /* autosave is already on — affordance is a visual cue */
        }}
        onPreview={() => {
          /* preview is available after first weave */
        }}
      />
      <ProgressThread6
        current={currentPhase}
        completed={completedPhases}
        onJump={jumpToPhase}
      />
      <BreadcrumbChips chips={chips} onEditAll={() => jumpToPhase('occasion')} />

      <WizardBody
        main={
          <>
            <SceneEmbedProvider>
              <div
                style={{
                  background: '#FFFEF7',
                  borderRadius: 22,
                  padding: 'clamp(26px, 3vw, 36px)',
                  border: '1px solid rgba(31,36,24,0.06)',
                  boxShadow: '0 20px 50px rgba(31,36,24,0.04)',
                }}
              >
                {body}
              </div>
            </SceneEmbedProvider>
            <VoiceStrip onVoice={() => setVoiceOpen(true)} />
          </>
        }
        sidebar={
          <PearSidebar
            why={phaseCopy.why}
            tip={phaseCopy.tip}
            progress={(currentIdx + 1) / Math.max(visible.length, 1)}
            progressText={`${currentIdx + 1} of ${visible.length} complete`}
          />
        }
      />

      {voiceOpen && (
        <VoiceFirst onParsed={onVoiceParsed} onCancel={() => setVoiceOpen(false)} />
      )}

      {showBreath && (
        <BreathMoment
          title={
            <>
              The facts are in.{' '}
              <span style={{ fontStyle: 'italic', color: PD.olive }}>Now the feeling.</span>
            </>
          }
          subtitle="Take a breath. The next part is about mood and color — your gut answer is almost always right."
          onContinue={() => {
            setShowBreath(false);
            setCurrent('vibe');
          }}
        />
      )}
    </div>
  );
}
