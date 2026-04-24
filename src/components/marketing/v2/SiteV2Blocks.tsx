'use client';

// Additional v2 site sections: Schedule, Photos gallery, RSVP,
// FAQ. These sit between the action rail and the linked-events
// strip on /sites/[domain] so a guest can read the whole site
// without leaving the page.

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { PD, DISPLAY_STYLE, MONO_STYLE, Pear } from '../design/DesignAtoms';
import { REMEMBER } from '@/lib/assets';
import { BrandImage } from './BrandImage';
import type { StoryManifest, WeddingEvent } from '@/types';

// ── Schedule ─────────────────────────────────────────────────
export function ScheduleSection({ events }: { events: WeddingEvent[] }) {
  if (!events || events.length === 0) return null;
  return (
    <section
      id="schedule"
      style={{
        padding: 'clamp(32px, 5vw, 64px) clamp(20px, 5vw, 56px) clamp(20px, 4vw, 36px)',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 11,
            color: '#6E5BA8',
            letterSpacing: '0.26em',
            marginBottom: 12,
          }}
        >
          THE WEEKEND
        </div>
        <h2
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(32px, 4vw, 44px)',
            fontWeight: 400,
            margin: '0 0 40px',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          The{' '}
          <span
            style={{
              fontStyle: 'italic',
              color: PD.olive,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            schedule
          </span>
          .
        </h2>
      </div>
      <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: 22,
            top: 8,
            bottom: 8,
            width: 1,
            background: `repeating-linear-gradient(to bottom, ${PD.olive} 0 3px, transparent 3px 7px)`,
            opacity: 0.35,
          }}
        />
        {events.map((ev) => (
          <div
            key={ev.id}
            style={{
              display: 'flex',
              gap: 20,
              padding: '16px 0',
              alignItems: 'flex-start',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 44,
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'center',
                paddingTop: 6,
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: '#FFFEF7',
                  border: `3px solid ${PD.olive}`,
                }}
              />
            </span>
            <div
              style={{
                flex: 1,
                background: '#FFFEF7',
                borderRadius: 16,
                padding: 18,
                border: '1px solid rgba(31,36,24,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    ...DISPLAY_STYLE,
                    fontSize: 20,
                    fontWeight: 400,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {ev.name}
                </div>
                <div style={{ fontSize: 12, color: PD.inkSoft, fontFamily: 'var(--pl-font-mono)' }}>
                  {ev.time || ''} {ev.endTime ? `– ${ev.endTime}` : ''}
                </div>
              </div>
              {ev.venue && (
                <div style={{ fontSize: 13, color: PD.inkSoft, marginBottom: 6 }}>
                  <span style={{ color: PD.olive }}>◉</span> {ev.venue}
                  {ev.address ? ` · ${ev.address}` : ''}
                </div>
              )}
              {ev.description && (
                <div style={{ fontSize: 13, color: PD.ink, lineHeight: 1.55 }}>
                  {ev.description}
                </div>
              )}
              {ev.dressCode && (
                <div
                  style={{
                    marginTop: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: PD.paperCard,
                    color: PD.ink,
                    fontWeight: 500,
                  }}
                >
                  Dress · {ev.dressCode}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Photos gallery ───────────────────────────────────────────
export function PhotosGallery({ manifest }: { manifest: StoryManifest }) {
  const photos = (manifest.chapters ?? [])
    .flatMap((c) => c.images ?? [])
    .filter((img) => img?.url)
    .slice(0, 12);
  if (photos.length === 0) return null;
  return (
    <section
      id="photos"
      style={{
        padding: 'clamp(24px, 4vw, 40px) clamp(20px, 5vw, 56px)',
        background: PD.paper,
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center', marginBottom: 28 }}>
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 11,
            color: '#6E5BA8',
            letterSpacing: '0.26em',
            marginBottom: 12,
          }}
        >
          A PICTURE-PERFECT SET
        </div>
        <h2
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(30px, 3.8vw, 42px)',
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          Some{' '}
          <span
            style={{
              fontStyle: 'italic',
              color: PD.olive,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            moments
          </span>
          .
        </h2>
      </div>
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 10,
        }}
      >
        {photos.map((img, i) => (
          <div
            key={i}
            style={{
              aspectRatio: i % 5 === 0 ? '3 / 4' : '4 / 3',
              borderRadius: 12,
              overflow: 'hidden',
              position: 'relative',
              background: PD.paperCard,
            }}
          >
            <Image
              src={img.url}
              alt={img.caption ?? ''}
              fill
              sizes="(max-width: 820px) 50vw, 240px"
              style={{ objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── RSVP form ────────────────────────────────────────────────
export function RSVPSection({
  domain,
  deadline,
}: {
  domain: string;
  deadline?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attending, setAttending] = useState<'yes' | 'no' | null>(null);
  const [name, setName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [dietary, setDietary] = useState('');
  const [song, setSong] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attending === null || !name.trim() || !guestEmail.trim()) {
      setError('Name, email, and response are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: domain,
          name: name.trim(),
          email: guestEmail.trim(),
          attending: attending === 'yes',
          dietary_restrictions: dietary.trim() || null,
          song_request: song.trim() || null,
          message: message.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Submit failed (${res.status})`);
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section
        id="rsvp"
        style={{
          padding: 'clamp(32px, 5vw, 64px) clamp(20px, 5vw, 56px)',
          background: PD.paper,
        }}
      >
        <div
          style={{
            maxWidth: 620,
            margin: '0 auto',
            textAlign: 'center',
            background: '#FFFEF7',
            borderRadius: 22,
            padding: 'clamp(28px, 4vw, 44px)',
            border: '1px solid rgba(31,36,24,0.06)',
          }}
        >
          <BrandImage
            src={REMEMBER.thankyouTag}
            alt=""
            style={{ width: 100, margin: '0 auto 14px' }}
            fallback={
              <Pear size={48} color={PD.pear} stem={PD.oliveDeep} leaf={PD.olive} />
            }
          />
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 28,
              fontStyle: 'italic',
              fontWeight: 400,
              margin: '0 0 10px',
              color: PD.olive,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            Thank you.
          </h2>
          <p style={{ fontSize: 14, color: PD.inkSoft, margin: 0, lineHeight: 1.6 }}>
            Your RSVP is in. We&rsquo;ll reach out with the final details soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="rsvp"
      style={{
        padding: 'clamp(32px, 5vw, 64px) clamp(20px, 5vw, 56px)',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          textAlign: 'center',
          marginBottom: 28,
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 11,
            color: '#6E5BA8',
            letterSpacing: '0.26em',
            marginBottom: 12,
          }}
        >
          PLEASE RSVP
        </div>
        <h2
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(32px, 4vw, 44px)',
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          Let us{' '}
          <span
            style={{
              fontStyle: 'italic',
              color: PD.olive,
              fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            }}
          >
            know
          </span>
          .
        </h2>
        {deadline && (
          <p
            style={{
              fontSize: 13.5,
              color: PD.inkSoft,
              margin: '14px 0 0',
            }}
          >
            Please reply by{' '}
            <strong style={{ color: PD.ink }}>
              {new Date(deadline).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </strong>
            .
          </p>
        )}
      </div>

      <form
        onSubmit={submit}
        style={{
          maxWidth: 620,
          margin: '0 auto',
          background: '#FFFEF7',
          borderRadius: 20,
          padding: 'clamp(22px, 3vw, 32px)',
          border: '1px solid rgba(31,36,24,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <label style={fieldLabel}>Will you be joining us?</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <AttBtn onClick={() => setAttending('yes')} active={attending === 'yes'}>
              Yes, can&rsquo;t wait!
            </AttBtn>
            <AttBtn onClick={() => setAttending('no')} active={attending === 'no'}>
              Sorry, can&rsquo;t make it
            </AttBtn>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={fieldLabel}>Full name(s)</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex & Jamie"
              style={fieldInput}
              required
            />
          </div>
          <div>
            <label style={fieldLabel}>Email address</label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="you@example.com"
              style={fieldInput}
              required
            />
          </div>
        </div>

        {attending === 'yes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={fieldLabel}>Dietary preferences</label>
              <input
                value={dietary}
                onChange={(e) => setDietary(e.target.value)}
                placeholder="(optional)"
                style={fieldInput}
              />
            </div>
            <div>
              <label style={fieldLabel}>Song request</label>
              <input
                value={song}
                onChange={(e) => setSong(e.target.value)}
                placeholder="(optional)"
                style={fieldInput}
              />
            </div>
          </div>
        )}

        <div>
          <label style={fieldLabel}>A note for us</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Say hi, share excitement, anything you like."
            rows={3}
            style={{ ...fieldInput, resize: 'vertical' }}
          />
        </div>

        {error && (
          <div
            style={{
              fontSize: 12.5,
              color: PD.plum,
              padding: '8px 12px',
              background: 'rgba(198,86,61,0.08)',
              borderRadius: 8,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: PD.oliveDeep,
            color: '#FFFEF7',
            border: 'none',
            borderRadius: 999,
            padding: '13px 22px',
            fontSize: 14,
            fontWeight: 500,
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            fontFamily: 'inherit',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 10px 24px rgba(76,90,38,0.22)',
          }}
        >
          {submitting ? 'Sending…' : 'Send RSVP'}
          <span style={{ fontSize: 14 }}>→</span>
        </button>
      </form>
    </section>
  );
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  fontWeight: 500,
  color: PD.ink,
  marginBottom: 6,
};

const fieldInput: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: PD.paper,
  border: '1px solid rgba(31,36,24,0.12)',
  borderRadius: 10,
  fontFamily: 'inherit',
  fontSize: 14,
  color: PD.ink,
  outline: 'none',
  boxSizing: 'border-box',
};

function AttBtn({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 16px',
        background: active ? '#E8DFE9' : 'transparent',
        border: `1.5px solid ${active ? '#6E5BA8' : 'rgba(31,36,24,0.18)'}`,
        color: PD.ink,
        borderRadius: 12,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 13.5,
        fontWeight: active ? 500 : 400,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {active && <span style={{ color: '#6E5BA8' }}>●</span>}
      {children}
    </button>
  );
}

// ── FAQ ──────────────────────────────────────────────────────
export function FAQSection({ faqs }: { faqs: Array<{ q: string; a: string }> }) {
  const [open, setOpen] = useState<number | null>(0);
  if (!faqs || faqs.length === 0) return null;
  return (
    <section
      id="faq"
      style={{
        padding: 'clamp(24px, 4vw, 40px) clamp(20px, 5vw, 56px)',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 740,
          margin: '0 auto',
          textAlign: 'center',
          marginBottom: 28,
        }}
      >
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 11,
            color: '#6E5BA8',
            letterSpacing: '0.26em',
            marginBottom: 12,
          }}
        >
          GOOD TO KNOW
        </div>
        <h2
          style={{
            ...DISPLAY_STYLE,
            fontSize: 'clamp(30px, 3.8vw, 42px)',
            fontWeight: 400,
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          Questions?
        </h2>
      </div>
      <div
        style={{
          maxWidth: 740,
          margin: '0 auto',
          background: '#FFFEF7',
          borderRadius: 20,
          padding: 'clamp(12px, 2vw, 18px) clamp(18px, 3vw, 28px)',
          border: '1px solid rgba(31,36,24,0.06)',
        }}
      >
        {faqs.map((f, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              style={{
                borderBottom:
                  i < faqs.length - 1 ? '1px solid rgba(31,36,24,0.06)' : 'none',
              }}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '18px 0',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  color: PD.ink,
                  textAlign: 'left',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                }}
              >
                <span>{f.q}</span>
                <span style={{ fontSize: 18, color: PD.inkSoft, flexShrink: 0, marginLeft: 14 }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div
                  style={{
                    padding: '0 0 20px',
                    fontSize: 14,
                    color: PD.inkSoft,
                    lineHeight: 1.65,
                    maxWidth: 620,
                  }}
                >
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
