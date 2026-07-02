'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { PLCard } from '@/components/pearloom/dash/PLChrome';
import { PageIntro, StatStrip, HintChip } from '@/components/pearloom/dash/QuietDash';
import { Icon, Pear } from '@/components/pearloom/motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';
import { getEventType } from '@/lib/event-os/event-types';
import { isSoloSubject } from '@/lib/event-os/solo-occasions';

interface VoicePrompt {
  id: string;
  label: string;
  body: string;
}

// Three prompt sets, one voice tool. The ids stay identical across
// sets so recorded samples survive a site switch — only the label
// and framing change with the occasion.
const COUPLE_PROMPTS: VoicePrompt[] = [
  { id: 'meet', label: 'How did you meet?', body: 'Tell me the story — the version you tell at parties.' },
  { id: 'three-words', label: 'Three words', body: 'How would your closest friends describe you?' },
  { id: 'phrase', label: 'A phrase you say a lot', body: 'A few sentences using it naturally.' },
  { id: 'love', label: 'Why this person', body: 'What do you love about your partner / why this celebration?' },
  { id: 'guests', label: 'Why these guests', body: 'Why these particular people get invited?' },
  { id: 'today', label: 'Today, in your voice', body: 'Tell me what today felt like, in your normal voice.' },
  { id: 'thanks', label: 'Saying thank you', body: 'How would you thank someone who travelled to be there?' },
  { id: 'wish', label: 'A wish', body: 'A wish for the person being celebrated.' },
];

const SOLO_PROMPTS: VoicePrompt[] = [
  { id: 'meet', label: 'A favorite story', body: 'Tell a favorite story about the guest of honor — the version you tell at parties.' },
  { id: 'three-words', label: 'Three words', body: 'How would your closest friends describe you?' },
  { id: 'phrase', label: 'A phrase you say a lot', body: 'A few sentences using it naturally.' },
  { id: 'love', label: 'Why this celebration', body: 'What makes the guest of honor — and this milestone — worth celebrating?' },
  { id: 'guests', label: 'Why these guests', body: 'Why these particular people get invited?' },
  { id: 'today', label: 'Today, in your voice', body: 'Tell me what today felt like, in your normal voice.' },
  { id: 'thanks', label: 'Saying thank you', body: 'How would you thank someone who travelled to be there?' },
  { id: 'wish', label: 'A wish', body: 'A wish for the person being celebrated.' },
];

const MEMORIAL_PROMPTS: VoicePrompt[] = [
  { id: 'meet', label: 'How you knew them', body: 'Tell me how you came to know them — the version you find yourself telling.' },
  { id: 'three-words', label: 'Three words', body: 'How would the people who loved them describe them?' },
  { id: 'phrase', label: 'A phrase you say a lot', body: 'A few sentences using it naturally.' },
  { id: 'love', label: 'What you want remembered', body: 'What do you most want people to carry with them about their life?' },
  { id: 'guests', label: 'Why these guests', body: 'Why these particular people are gathering to remember them.' },
  { id: 'today', label: 'The gathering, in your voice', body: 'Tell me what you hope the day feels like, in your normal voice.' },
  { id: 'thanks', label: 'Saying thank you', body: 'How would you thank someone who travelled to be there?' },
  { id: 'wish', label: 'A memory to keep', body: 'A memory of them you never want to lose.' },
];

interface Sample {
  promptId: string;
  text: string;
  duration?: number;
  recording?: boolean;
  uploading?: boolean;
  error?: string;
}

interface VoiceProfile {
  tone: string;
  formality: number;
  vocabulary: string[];
  phrases: string[];
  greetingStyle?: string;
  signoffStyle?: string;
  avoidList?: string[];
  capturedAt: string;
}

export function VoiceDnaClient({ siteSlug: urlSiteSlug }: { siteSlug: string | null }) {
  const { site } = useSelectedSite();
  const siteSlug = urlSiteSlug ?? site?.domain ?? '';
  // Occasion-aware prompt set: couple occasions keep the classic
  // eight; solo celebrations ask about the guest of honor; solemn
  // voices get gentle remembrance prompts.
  const occasion = site?.occasion ?? null;
  const solemn = getEventType(occasion)?.voice === 'solemn';
  const solo = isSoloSubject({
    occasion,
    subject: (site?.manifest as { subject?: { kind?: string | null } } | null | undefined)?.subject ?? null,
  });
  const prompts = solemn ? MEMORIAL_PROMPTS : solo ? SOLO_PROMPTS : COUPLE_PROMPTS;
  const [samples, setSamples] = useState<Record<string, Sample>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [recordingForId, setRecordingForId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Load existing profile on mount.
  useEffect(() => {
    if (!siteSlug) return;
    let cancelled = false;
    fetch(`/api/voice-dna/analyze?site=${encodeURIComponent(siteSlug)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { voiceDNA?: VoiceProfile } | null) => {
        if (!cancelled && data?.voiceDNA) setProfile(data.voiceDNA);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [siteSlug]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  async function startRecording(promptId: string) {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser doesn\'t support audio recording.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorderRef.current = recorder;
      setRecordingForId(promptId);
      setActiveId(promptId);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        setRecordingForId(null);
        if (blob.size === 0) return;
        await transcribe(promptId, blob);
      };
      recorder.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied.');
      setRecordingForId(null);
    }
  }

  async function transcribe(promptId: string, blob: Blob) {
    setSamples((s) => ({
      ...s,
      [promptId]: { ...(s[promptId] ?? { promptId, text: '' }), uploading: true, error: undefined },
    }));
    try {
      const form = new FormData();
      form.set('audio', blob, `voice-${promptId}.webm`);
      form.set('promptId', promptId);
      const res = await fetch('/api/voice-dna/transcribe', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transcription failed.');
      setSamples((s) => ({
        ...s,
        [promptId]: {
          promptId,
          text: data.text || '',
          duration: data.duration,
          uploading: false,
        },
      }));
    } catch (err) {
      setSamples((s) => ({
        ...s,
        [promptId]: { ...(s[promptId] ?? { promptId, text: '' }), uploading: false, error: err instanceof Error ? err.message : 'Failed.' },
      }));
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const list = Object.values(samples).filter((s) => s.text.trim().length > 0);
      if (list.length < 2) {
        throw new Error('Record at least 2 prompts so Pear has something to listen to.');
      }
      const res = await fetch('/api/voice-dna/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, samples: list.map((s) => ({ promptId: s.promptId, text: s.text })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      setProfile(data.voiceDNA);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  }

  const recordedCount = Object.values(samples).filter((s) => s.text.trim().length > 0).length;

  return (
    <DashLayout active="studio" hideTopbar>
      <div style={{ padding: 'clamp(20px, 3vw, 32px) var(--pl-dash-pad) 60px', maxWidth: 'var(--pl-dash-maxw)', margin: '0 auto' }}>

        {/* Quiet header (plan rules 1 + 3): one line + the analyze
            action; "N of 8" rides a StatStrip chip and the pitch
            paragraph became a HintChip. Recorder rows lead. */}
        <PageIntro
          eyebrow="Pear's voice"
          title={
            <>
              Capture your <span className="display-italic">voice.</span>
            </>
          }
          actions={
            <button
              type="button"
              onClick={() => void handleAnalyze()}
              disabled={analyzing || recordedCount < 2}
              className={recordedCount >= 2 ? 'pl-pearl-accent' : ''}
              style={{
                padding: '10px 22px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                cursor: recordedCount >= 2 ? 'pointer' : 'not-allowed',
                border: 'none',
                fontFamily: 'var(--font-ui)',
                opacity: recordedCount >= 2 ? 1 : 0.5,
                background: recordedCount >= 2 ? undefined : '#0E0D0B',
                color: recordedCount >= 2 ? undefined : '#F1EBDC',
              }}
            >
              {analyzing ? 'Analysing…' : profile ? 'Re-analyse' : 'Build my voice profile'}
            </button>
          }
          meta={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatStrip items={[{ label: `of ${prompts.length} captured`, value: recordedCount, tone: 'sage' }]} />
              <HintChip
                storageKey="pl-hint-voice-dna"
                hint="Record a few prompts — Pear drafts in your voice from then on."
                detail="Five minutes of you talking, eight short prompts. Pear listens, extracts your tone + signature phrases, and uses them in every draft from now on — save-the-dates, vows, thank-yous, anniversary recaps. So the words sound like you. Record at least two prompts to build the profile."
              />
            </div>
          }
          style={{ marginBottom: 22 }}
        />

        {profile && (
          <PLCard tone="sage" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <Pear size={28} tone="sage" shadow={false} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--sage-deep, #3D4A1F)',
                  marginBottom: 4,
                }}>
                  Captured · {new Date(profile.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  marginBottom: 12,
                  lineHeight: 1.25,
                }}>
                  {profile.tone}
                </div>
                {profile.phrases.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {profile.phrases.slice(0, 8).map((p) => (
                      <span key={p} style={{
                        padding: '4px 11px',
                        borderRadius: 999,
                        background: 'var(--card, var(--cream-2))',
                        border: '1px solid var(--line-soft)',
                        color: 'var(--sage-deep, #3D4A1F)',
                        fontSize: 11.5,
                        fontWeight: 600,
                        fontStyle: 'italic',
                      }}>"{p}"</span>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
                  Pear is now writing in your voice across the cadence, story passes, and thank-you drafts. Re-record any time to refresh.
                </div>
              </div>
            </div>
          </PLCard>
        )}

        {error && (
          <div style={{ padding: '10px 12px', background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', borderRadius: 10, fontSize: 12, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div className="pl8-dash-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {prompts.map((p) => {
            const s = samples[p.id];
            const isRecording = recordingForId === p.id;
            const isExpanded = activeId === p.id || s?.text || isRecording;
            return (
              <PLCard
                key={p.id}
                style={{
                  padding: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>
                      {p.label}
                      {s?.text && (
                        <span style={{ marginLeft: 8, color: '#3D4A1F', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' }}>● CAPTURED</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                      {p.body}
                    </div>
                  </div>
                  {isRecording ? (
                    <button
                      type="button"
                      onClick={stopRecording}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        background: '#7A2D2D',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <span aria-hidden style={{
                        width: 8, height: 8, borderRadius: 999, background: '#FFFFFF',
                        animation: 'pl-dot-pulse 1.4s ease-in-out infinite',
                      }} />
                      Stop
                    </button>
                  ) : s?.uploading ? (
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Transcribing…</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void startRecording(p.id)}
                      disabled={!!recordingForId}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 999,
                        background: 'var(--ink)',
                        color: 'var(--cream)',
                        border: 'none',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: recordingForId ? 'wait' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'var(--font-ui)',
                        opacity: recordingForId ? 0.6 : 1,
                      }}
                    >
                      <Icon name="mic" size={12} color="var(--cream)" /> {s?.text ? 'Re-record' : 'Record'}
                    </button>
                  )}
                </div>
                {isExpanded && (s?.text || s?.error) && (
                  <div className="pl8-tab-enter" style={{
                    marginTop: 12,
                    padding: 12,
                    background: 'var(--paper, var(--cream))',
                    borderRadius: 10,
                    fontSize: 13,
                    color: 'var(--ink-soft)',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    border: s?.error ? '1px solid rgba(122,45,45,0.22)' : '1px solid var(--line-soft)',
                  }}>
                    {s?.error ? (
                      <span style={{ color: '#7A2D2D' }}>{s.error}</span>
                    ) : (
                      s?.text
                    )}
                  </div>
                )}
              </PLCard>
            );
          })}
        </div>
      </div>
    </DashLayout>
  );
}
