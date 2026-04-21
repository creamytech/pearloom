'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / wizard/design/WizardV2.tsx
//
// The new wizard orchestrator. Pulls together the shell, helper,
// voice-first alt path, all 11 step components, and the generate
// handoff. Mount this from `/wizard-v2/page.tsx`.
//
// Answers persist to localStorage so the wizard survives reloads.
// Generation is opaque about implementation — the user sees
// "weaving" / "pressing" / "binding", never "Gemini" or "Claude".
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PD } from '../../marketing/design/DesignAtoms';
import {
  ProgressThread,
  ReturnPill,
  ContinuingStrip,
  fmtDate,
} from './WizardShell';
import { BreathMoment, PearHelper } from './WizardHelper';
import { STEPS, EVENTS, type StepKey } from './wizardSpec';
import type { WizardAnswers } from './wizardAnswers';
import { VoiceFirst } from './VoiceFirst';
import { StepCategory, StepOccasion, StepNames } from './Steps1to3';
import { StepDate, StepVenue, StepDetails } from './Steps4to6';
import { StepPhotos, StepPhotoReview } from './Steps7to8';
import { StepVibe, StepLayout, StepSong } from './Steps9to11';
import { StepReady, StepGenerating } from './Steps12to13';

const STORAGE_KEY = 'pearloom:wizard-v2';
const THEME_KEY = 'pearloom:wizard-v2-dark';

// ── Step visibility rules ─────────────────────────────────────
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

// ── Chip extraction for the continuing strip ──────────────────
function chipsFor(answers: WizardAnswers): Array<{ k: StepKey; l: string; v: string }> {
  const out: Array<{ k: StepKey; l: string; v: string }> = [];
  if (answers.category) {
    out.push({ k: 'category', l: 'kind', v: answers.category.replace('-', ' ') });
  }
  if (answers.occasion) {
    const ev = EVENTS.find((e) => e.k === answers.occasion);
    if (ev) out.push({ k: 'occasion', l: 'event', v: ev.l });
  }
  if (answers.nameA) {
    out.push({
      k: 'names',
      l: 'names',
      v: answers.nameB ? `${answers.nameA} & ${answers.nameB}` : answers.nameA,
    });
  }
  if (answers.dateMode) {
    const v =
      answers.dateMode === 'specific'
        ? fmtDate(answers.date)
        : answers.dateMode === 'season'
        ? answers.dateSeason ?? ''
        : answers.dateMode === 'year'
        ? String(answers.dateYear ?? '')
        : 'TBA';
    if (v) out.push({ k: 'date', l: 'when', v });
  }
  if (answers.venue) out.push({ k: 'venue', l: 'where', v: answers.venue });
  if (answers.photos?.length) {
    out.push({ k: 'photos', l: 'photos', v: `${answers.photos.length}` });
  }
  if (answers.vibeName) out.push({ k: 'vibe', l: 'vibe', v: answers.vibeName });
  return out;
}

// ── Generation request builder ────────────────────────────────
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

  return JSON.stringify({
    photos: a.photos ?? [],
    vibeString: `${a.occasion ?? ''} ${a.vibe ?? ''} ${a.venue ?? ''}`.trim(),
    vibeName: a.vibeName || a.vibe || undefined,
    category: a.category,
    names,
    occasion: a.occasion,
    eventDate: a.date,
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

// ── Orchestrator ──────────────────────────────────────────────
export function WizardV2() {
  const router = useRouter();
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [current, setCurrent] = useState<StepKey>('category');
  const [dark, setDark] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [showBreath, setShowBreath] = useState(false);

  // Generation state
  const [progress, setProgress] = useState(0);
  const [genMessage, setGenMessage] = useState<string | undefined>();
  const [genDone, setGenDone] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{
    manifest: unknown;
    subdomain: string;
  } | null>(null);

  // ── Load from storage ───────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { answers: WizardAnswers; step: StepKey };
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.step) setCurrent(parsed.step);
      }
      const theme = localStorage.getItem(THEME_KEY);
      if (theme === 'dark') setDark(true);
    } catch {
      /* ignore */
    }
  }, []);

  // ── Persist answers ─────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, step: current }));
    } catch {
      /* ignore */
    }
  }, [answers, current]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  const visible = useMemo(() => visibleSteps(answers), [answers]);
  const chips = useMemo(() => chipsFor(answers), [answers]);

  const set = useCallback((patch: Partial<WizardAnswers>) => {
    setAnswers((prev) => ({ ...prev, ...patch }));
  }, []);

  const stepIndex = visible.findIndex((s) => s.k === current);

  const goTo = useCallback(
    (k: StepKey) => {
      if (visible.some((s) => s.k === k)) setCurrent(k);
    },
    [visible],
  );

  const next = useCallback(() => {
    const idx = visible.findIndex((s) => s.k === current);
    const nextStep = visible[idx + 1];
    if (!nextStep) return;
    // Breath moment fires between photoreview and vibe
    if (current === 'photoreview' && nextStep.k === 'vibe') {
      setShowBreath(true);
      return;
    }
    setCurrent(nextStep.k);
  }, [current, visible]);

  const back = useCallback(() => {
    const idx = visible.findIndex((s) => s.k === current);
    const prev = visible[idx - 1];
    if (prev) setCurrent(prev.k);
  }, [current, visible]);

  const skip = useCallback(() => next(), [next]);

  const reset = useCallback(() => {
    setAnswers({});
    setCurrent('category');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

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

  // ── Generation kickoff on entering 'generating' ─────────────
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
        let buffer = '';
        let manifest: unknown = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
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
              if (event.type === 'error') {
                throw new Error(event.message || 'Generation failed');
              }
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

      // Fallback — plain JSON
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

  // ── Handoff on curtain reveal ───────────────────────────────
  const handleCurtainDone = useCallback(async () => {
    if (!completed) return;
    try {
      await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: completed.subdomain,
          manifest: completed.manifest,
          names: [answers.nameA ?? '', answers.nameB ?? ''],
        }),
      });
    } catch {
      /* non-fatal — editor will resave */
    }
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    router.push(`/editor/${completed.subdomain}`);
  }, [completed, router, answers.nameA, answers.nameB]);

  // ── Step props ──────────────────────────────────────────────
  const sharedProps = { answers, set, next, back, skip, goTo, dark };

  // ── Render current step ─────────────────────────────────────
  let body: React.ReactNode = null;
  switch (current) {
    case 'category':
      body = <StepCategory {...sharedProps} onVoice={() => setVoiceOpen(true)} />;
      break;
    case 'occasion':
      body = <StepOccasion {...sharedProps} />;
      break;
    case 'names':
      body = <StepNames {...sharedProps} />;
      break;
    case 'date':
      body = <StepDate {...sharedProps} />;
      break;
    case 'venue':
      body = <StepVenue {...sharedProps} />;
      break;
    case 'details':
      body = <StepDetails {...sharedProps} />;
      break;
    case 'photos':
      body = <StepPhotos {...sharedProps} />;
      break;
    case 'photoreview':
      body = <StepPhotoReview {...sharedProps} />;
      break;
    case 'vibe':
      body = <StepVibe {...sharedProps} />;
      break;
    case 'layout':
      body = <StepLayout {...sharedProps} />;
      break;
    case 'song':
      body = <StepSong {...sharedProps} />;
      break;
    case 'ready':
      body = <StepReady {...sharedProps} />;
      break;
    case 'generating':
      body = (
        <StepGenerating
          progress={progress}
          message={genError ?? genMessage}
          done={genDone && !genError}
          onDone={handleCurtainDone}
          dark={dark}
        />
      );
      break;
  }

  return (
    <div style={{ background: dark ? PD.ink : PD.paper, minHeight: '100vh' }}>
      {current !== 'generating' && (
        <>
          <ReturnPill onClick={() => router.push('/dashboard')} dark={dark} />
          <ProgressThread current={current} visible={visible} goTo={goTo} dark={dark} />
          <ContinuingStrip
            chips={chips.filter((c) => {
              const stepIdx = visible.findIndex((s) => s.k === c.k);
              return stepIdx >= 0 && stepIdx < stepIndex;
            })}
            onReset={reset}
            onGoTo={goTo}
          />
        </>
      )}

      {body}

      {current !== 'generating' && (
        <PearHelper
          stepKey={current}
          onStartOver={reset}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
        />
      )}

      {voiceOpen && (
        <VoiceFirst
          onParsed={onVoiceParsed}
          onCancel={() => setVoiceOpen(false)}
          dark={dark}
        />
      )}

      {showBreath && (
        <BreathMoment
          title={
            <>
              The facts are in.{' '}
              <span style={{ fontStyle: 'italic', color: PD.olive }}>
                Now the feeling.
              </span>
            </>
          }
          subtitle="Take a breath. The next part is about mood and color — your gut answer is almost always right."
          onContinue={() => {
            setShowBreath(false);
            setCurrent('vibe');
          }}
        />
      )}

      {genError && current === 'generating' && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            background: PD.terra,
            color: PD.paper,
            padding: '12px 22px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            zIndex: 600,
            fontFamily: 'var(--pl-font-body)',
            display: 'flex',
            gap: 14,
            alignItems: 'center',
          }}
        >
          <span>{genError}</span>
          <button
            onClick={() => {
              setGenError(null);
              setCurrent('ready');
            }}
            style={{
              background: PD.paper,
              color: PD.ink,
              border: 'none',
              borderRadius: 999,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Back to review
          </button>
        </div>
      )}
    </div>
  );
}
