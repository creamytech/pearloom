'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashLayout } from '@/components/pearloom/dash/DashShell';
import { Icon } from '@/components/pearloom/motifs';
import { useSelectedSite } from '@/components/marketing/design/dash/hooks';

const PROMPTS = [
  { id: 'meet', label: 'How did you meet?', body: 'Tell me the story — the version you tell at parties.' },
  { id: 'three-words', label: 'Three words', body: 'How would your closest friends describe you?' },
  { id: 'phrase', label: 'A phrase you say a lot', body: 'A few sentences using it naturally.' },
  { id: 'love', label: 'Why this person', body: 'What do you love about your partner / why this celebration?' },
  { id: 'guests', label: 'Why these guests', body: 'Why these particular people get invited?' },
  { id: 'today', label: 'Today, in your voice', body: 'Tell me what today felt like, in your normal voice.' },
  { id: 'thanks', label: 'Saying thank you', body: 'How would you thank someone who travelled to be there?' },
  { id: 'wish', label: 'A wish', body: 'A wish for the person being celebrated.' },
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
    <DashLayout active="creative">
      <div className="pl8-dash-page-enter" style={{ padding: 'clamp(20px, 3vw, 32px)', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div className="eyebrow" style={{ color: 'var(--peach-ink)', marginBottom: 6 }}>
            Voice DNA
          </div>
          <h1 className="display" style={{ fontSize: 'clamp(28px, 3vw, 36px)', margin: 0 }}>
            Capture your voice
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, marginTop: 6, lineHeight: 1.55, maxWidth: 620 }}>
            Five minutes of you talking, eight short prompts. Pear listens, extracts your tone + signature phrases, and uses them in every draft from now on — save-the-dates, vows, thank-yous, anniversary recaps. So the words sound like you.
          </p>
        </div>

        {profile && (
          <div style={{
            background: 'rgba(92,107,63,0.08)',
            border: '1px solid rgba(92,107,63,0.22)',
            borderRadius: 14,
            padding: 18,
            marginBottom: 24,
          }}>
            <div className="eyebrow" style={{ color: '#3D4A1F', marginBottom: 6 }}>
              Captured · {new Date(profile.capturedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
              {profile.tone}
            </div>
            {profile.phrases.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {profile.phrases.slice(0, 8).map((p) => (
                  <span key={p} style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(92,107,63,0.12)',
                    color: '#3D4A1F',
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}>“{p}”</span>
                ))}
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 8 }}>
              Pear is now writing in your voice across the cadence, story passes, and thank-you drafts. Re-record any time to refresh.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            {recordedCount} of {PROMPTS.length} captured
          </div>
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
        </div>

        {error && (
          <div style={{ padding: '10px 12px', background: 'rgba(122,45,45,0.08)', color: '#7A2D2D', borderRadius: 10, fontSize: 12, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <div className="pl8-dash-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROMPTS.map((p) => {
            const s = samples[p.id];
            const isRecording = recordingForId === p.id;
            const isExpanded = activeId === p.id || s?.text || isRecording;
            return (
              <div
                key={p.id}
                className="pl8-card-lift"
                style={{
                  background: 'var(--cream-2)',
                  border: '1px solid var(--line-soft)',
                  borderRadius: 14,
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
                    background: 'var(--paper)',
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
              </div>
            );
          })}
        </div>
      </div>
    </DashLayout>
  );
}
