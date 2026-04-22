'use client';

// Day-of side panels: VendorContacts (real /api/vendors), Livestream
// Control (link to /sites/:domain/live), VoiceToasts (real /api/toasts
// with MediaRecorder upload), CoordinatorChecklist (localStorage),
// GuestCommunication (stub with deep-link to messages).

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';
import type { ChecklistItem, Toast, Vendor } from './DayOfHooks';

// ── Vendor Contacts ──────────────────────────────────────────
const VENDOR_ICON: Record<string, string> = {
  venue: '🏛',
  catering: '🍽',
  photography: '📷',
  video: '🎬',
  florals: '💐',
  music: '🎶',
  entertainment: '🎤',
  transport: '🚐',
  other: '✦',
};

export function VendorContacts({
  subdomain,
  items,
  loading,
}: {
  subdomain?: string;
  items: Vendor[];
  loading: boolean;
}) {
  return (
    <section
      style={{
        background: '#FFFEF7',
        borderRadius: 18,
        padding: 22,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10.5,
            color: PD.inkSoft,
            letterSpacing: '0.24em',
          }}
        >
          VENDOR CONTACTS
        </div>
        <Link
          href="/marketplace?tab=vendors"
          style={{
            fontSize: 12,
            color: PD.ink,
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          View all
        </Link>
      </div>
      {loading ? (
        <div style={{ fontSize: 13, color: PD.inkSoft, padding: '12px 0' }}>Threading…</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 13, color: PD.inkSoft, padding: '12px 0', lineHeight: 1.55 }}>
          No vendors saved yet. Add them from the marketplace.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.slice(0, 5).map((v) => {
            const icon = VENDOR_ICON[v.category.toLowerCase()] ?? '✦';
            return (
              <div
                key={v.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(31,36,24,0.04)',
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    background: PD.paperCard,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: PD.ink }}>
                    {v.category} — {v.name}
                  </div>
                  {v.notes && (
                    <div
                      style={{
                        fontSize: 11,
                        color: PD.inkSoft,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {v.notes}
                    </div>
                  )}
                </div>
                {v.phone && (
                  <a
                    href={`tel:${v.phone}`}
                    aria-label={`Call ${v.name}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      border: '1px solid rgba(31,36,24,0.12)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      color: PD.ink,
                      flexShrink: 0,
                      fontSize: 13,
                    }}
                  >
                    ☎
                  </a>
                )}
                {v.contact_email && (
                  <a
                    href={`mailto:${v.contact_email}`}
                    aria-label={`Email ${v.name}`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      border: '1px solid rgba(31,36,24,0.12)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      color: PD.ink,
                      flexShrink: 0,
                      fontSize: 12,
                    }}
                  >
                    ✉
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Link
        href={subdomain ? `/marketplace?tab=vendors&site=${subdomain}` : '/marketplace?tab=vendors'}
        style={{
          display: 'inline-block',
          marginTop: 10,
          fontSize: 12.5,
          color: PD.ink,
          textDecoration: 'none',
          fontWeight: 500,
          border: '1px solid rgba(31,36,24,0.15)',
          padding: '7px 14px',
          borderRadius: 999,
        }}
      >
        All contacts →
      </Link>
    </section>
  );
}

// ── Livestream Control ───────────────────────────────────────
export function LivestreamControl({ subdomain }: { subdomain?: string }) {
  const [state, setState] = useState<'idle' | 'live' | 'paused'>('idle');
  return (
    <section
      style={{
        background: '#FFFEF7',
        borderRadius: 18,
        padding: 22,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10.5,
            color: PD.inkSoft,
            letterSpacing: '0.24em',
          }}
        >
          LIVESTREAM CONTROL
        </div>
        <button
          style={{
            background: 'transparent',
            border: '1px solid rgba(31,36,24,0.15)',
            borderRadius: 999,
            padding: '6px 10px',
            fontSize: 11.5,
            color: PD.ink,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ✱ Settings
        </button>
      </div>
      <div
        style={{
          aspectRatio: '16 / 9',
          borderRadius: 12,
          background: `linear-gradient(135deg, ${PD.paperCard}, ${PD.paper2})`,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 14,
        }}
      >
        <button
          style={{
            width: 48,
            height: 48,
            borderRadius: 999,
            background: 'rgba(31,36,24,0.78)',
            color: '#FFFEF7',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          ▶
        </button>
        <span
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: state === 'live' ? '#C47A4A' : 'rgba(31,36,24,0.6)',
            color: '#FFFEF7',
            fontSize: 10,
            padding: '3px 9px',
            borderRadius: 999,
            fontWeight: 600,
          }}
        >
          {state === 'live' ? 'LIVE' : state === 'paused' ? 'PAUSED' : 'IDLE'}
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Stat label="Viewers" value="—" />
        <Stat label="Duration" value={state === 'live' ? 'live now' : '—'} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setState(state === 'live' ? 'idle' : 'live')}
          style={{
            flex: 1,
            background: state === 'live' ? 'rgba(196,122,74,0.12)' : PD.oliveDeep,
            color: state === 'live' ? '#C47A4A' : '#FFFEF7',
            border: state === 'live' ? '1px solid rgba(196,122,74,0.3)' : 'none',
            borderRadius: 999,
            padding: '10px 16px',
            fontSize: 12.5,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {state === 'live' ? '● End stream' : '● Start stream'}
        </button>
        {(state === 'live' || state === 'paused') && (
          <button
            onClick={() => setState((s) => (s === 'paused' ? 'live' : 'paused'))}
            style={{
              background: 'transparent',
              border: '1px solid rgba(31,36,24,0.15)',
              borderRadius: 999,
              padding: '10px 18px',
              fontSize: 12.5,
              color: PD.ink,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {state === 'paused' ? 'Resume' : 'Pause'}
          </button>
        )}
      </div>
      {subdomain && (
        <Link
          href={`/sites/${subdomain}/live`}
          target="_blank"
          style={{
            display: 'block',
            marginTop: 10,
            fontSize: 11,
            color: PD.inkSoft,
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          View guest stream page →
        </Link>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: PD.inkSoft, opacity: 0.7 }}>{label}</div>
      <div
        style={{
          ...DISPLAY_STYLE,
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: '-0.015em',
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ── Voice Toasts (record + upload) ───────────────────────────
export function VoiceToasts({
  siteId,
  items,
  loading,
  onRefresh,
}: {
  siteId?: string | null;
  items: Toast[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_SECONDS = 120;

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = async () => {
    if (!siteId) return;
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Recording isn’t supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => uploadBlob();
      mr.start();
      setRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => {
        setElapsed((e) => {
          if (e + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return e + 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  const uploadBlob = async () => {
    if (!siteId || chunksRef.current.length === 0) return;
    setUploading(true);
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      const b64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('Read failed'));
        reader.readAsDataURL(blob);
      });
      const res = await fetch('/api/toasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          guestName: 'Host',
          durationSeconds: elapsed,
          audio: b64,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      chunksRef.current = [];
      setElapsed(0);
    }
  };

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m.toString().padStart(2, '0')}:${sec}`;
  };

  return (
    <section
      style={{
        background: '#FFFEF7',
        borderRadius: 18,
        padding: 22,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10.5,
            color: PD.inkSoft,
            letterSpacing: '0.24em',
          }}
        >
          ~|||~ VOICE TOASTS
        </div>
        <span
          style={{
            fontSize: 11,
            color: recording ? '#C47A4A' : PD.olive,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: recording ? '#C47A4A' : PD.olive,
            }}
          />
          {recording ? 'Recording' : 'Ready'}
        </span>
      </div>

      <div style={{ fontSize: 13, color: PD.inkSoft, marginBottom: 12, lineHeight: 1.5 }}>
        Let guests leave a voice toast you&rsquo;ll cherish forever.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(120px, 160px) 1fr',
          gap: 14,
          alignItems: 'center',
          marginBottom: 12,
        }}
        className="pl-toasts-record"
      >
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={uploading || !siteId}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
          style={{
            width: 72,
            height: 72,
            borderRadius: 999,
            background: recording ? '#C47A4A' : '#6E5BA8',
            color: '#FFFEF7',
            border: 'none',
            cursor: uploading || !siteId ? 'not-allowed' : 'pointer',
            opacity: uploading || !siteId ? 0.6 : 1,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 8px 24px rgba(110,91,168,0.28)',
          }}
        >
          {recording ? '■' : '●'}
        </button>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
            {recording ? 'Tap to stop' : uploading ? 'Uploading…' : 'Tap to record'}
          </div>
          <div style={{ fontSize: 11, color: PD.inkSoft, marginBottom: 6 }}>
            Max 2 minutes
          </div>
          <div
            style={{
              ...DISPLAY_STYLE,
              fontSize: 18,
              fontWeight: 400,
              fontVariationSettings: '"opsz" 144',
            }}
          >
            {fmtTime(elapsed)} / {fmtTime(MAX_SECONDS)}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            fontSize: 12,
            color: PD.plum,
            marginBottom: 10,
            padding: '6px 10px',
            background: 'rgba(122,45,45,0.08)',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div
          style={{
            borderTop: '1px solid rgba(31,36,24,0.06)',
            paddingTop: 10,
            marginTop: 10,
          }}
        >
          <div
            style={{
              ...MONO_STYLE,
              fontSize: 9.5,
              color: PD.inkSoft,
              opacity: 0.7,
              marginBottom: 6,
              letterSpacing: '0.2em',
            }}
          >
            RECENT TOASTS
          </div>
          {items.slice(0, 4).map((t) => (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 0',
              }}
            >
              <button
                aria-label="Play"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: PD.paperCard,
                  border: '1px solid rgba(31,36,24,0.08)',
                  cursor: 'pointer',
                  fontSize: 10,
                  color: PD.ink,
                }}
                onClick={() => {
                  if (t.audio_url) {
                    const audio = new Audio(t.audio_url);
                    audio.play().catch(() => {});
                  }
                }}
              >
                ▶
              </button>
              <div style={{ flex: 1, fontSize: 12.5, color: PD.ink, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {t.guest_name ?? 'Guest'}
                </div>
              </div>
              <span style={{ fontSize: 11, color: PD.inkSoft }}>
                {t.duration_seconds ? fmtTime(t.duration_seconds) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/dashboard/submissions"
        style={{
          display: 'block',
          textAlign: 'center',
          marginTop: 10,
          fontSize: 12,
          color: PD.ink,
          textDecoration: 'none',
          fontWeight: 500,
          border: '1px solid rgba(31,36,24,0.12)',
          padding: '7px 14px',
          borderRadius: 999,
        }}
      >
        View all toasts →
      </Link>
    </section>
  );
}

// ── Coordinator Checklist ────────────────────────────────────
export function CoordinatorChecklist({
  items,
  toggle,
  progress,
}: {
  items: ChecklistItem[];
  toggle: (id: string) => void;
  progress: number;
}) {
  const doneCount = items.filter((i) => i.done).length;
  return (
    <section
      style={{
        background: '#FFFEF7',
        borderRadius: 18,
        padding: 22,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10.5,
            color: PD.inkSoft,
            letterSpacing: '0.24em',
          }}
        >
          COORDINATOR CHECKLIST
        </div>
        <span style={{ fontSize: 11, color: PD.inkSoft }}>
          {doneCount} of {items.length} complete
        </span>
      </div>

      <div
        style={{
          height: 4,
          background: 'rgba(31,36,24,0.06)',
          borderRadius: 999,
          overflow: 'hidden',
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            background: PD.olive,
            transition: 'width 300ms',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((it) => (
          <label
            key={it.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '9px 0',
              borderBottom: '1px solid rgba(31,36,24,0.04)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={it.done}
              onChange={() => toggle(it.id)}
              style={{
                width: 18,
                height: 18,
                accentColor: PD.olive,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: PD.ink,
                textDecoration: it.done ? 'line-through' : 'none',
                opacity: it.done ? 0.55 : 1,
              }}
            >
              {it.label}
            </span>
            <span
              style={{
                fontSize: 11,
                color: it.done ? PD.olive : PD.inkSoft,
                fontWeight: 500,
              }}
            >
              {it.done ? 'All set' : 'In progress'}
            </span>
          </label>
        ))}
      </div>

      <Link
        href="/dashboard/day-of#timeline"
        style={{
          display: 'block',
          textAlign: 'center',
          marginTop: 12,
          fontSize: 12,
          color: PD.ink,
          textDecoration: 'none',
          fontWeight: 500,
          border: '1px solid rgba(31,36,24,0.12)',
          padding: '7px 14px',
          borderRadius: 999,
        }}
      >
        View full checklist →
      </Link>
    </section>
  );
}

// ── Guest Communication (quick peek + link) ──────────────────
export function GuestComms() {
  return (
    <section
      style={{
        background: '#FFFEF7',
        borderRadius: 18,
        padding: 22,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <Pear size={22} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Guest Communication</div>
          <div style={{ fontSize: 11, color: PD.inkSoft }}>Pear is here to help.</div>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: PD.inkSoft, lineHeight: 1.55 }}>
        We&rsquo;ll route guest questions to you and suggest answers from your FAQ.
      </div>
      <Link
        href="/rsvps"
        style={{
          display: 'inline-block',
          marginTop: 12,
          fontSize: 12,
          color: PD.ink,
          textDecoration: 'none',
          fontWeight: 500,
          border: '1px solid rgba(31,36,24,0.12)',
          padding: '7px 14px',
          borderRadius: 999,
        }}
      >
        View all messages →
      </Link>
    </section>
  );
}
