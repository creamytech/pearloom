'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/rsvp-form.tsx
// Premium multi-step RSVP form with confetti on success
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, PartyPopper, HeartCrack, ChevronRight, ChevronLeft } from 'lucide-react';
import { LoomThreadIcon } from '@/components/icons/PearloomIcons';
import type { RsvpStatus, WeddingEvent } from '@/types';

// ── Canvas Confetti ─────────────────────────────────────────────
function ConfettiBurst({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = [
      '#A3B18A', '#f0c080', '#f87171', '#a78bfa', '#34d399',
      '#60a5fa', '#fb923c', '#e879f9',
    ];
    const SHAPES = ['circle', 'rect', 'heart'] as const;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      rotSpeed: number;
      shape: (typeof SHAPES)[number];
      alpha: number;
      gravity: number;
    }

    const particles: Particle[] = Array.from({ length: 140 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 200,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 18,
      vy: -(Math.random() * 18 + 8),
      size: Math.random() * 8 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      alpha: 1,
      gravity: 0.45 + Math.random() * 0.2,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;
      for (const p of particles) {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        if (p.y < canvas.height + 40) {
          p.alpha = Math.max(0, p.alpha - 0.008);
          alive++;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          const s = p.size * 0.4;
          ctx.beginPath();
          ctx.moveTo(0, s * 0.4);
          ctx.bezierCurveTo(-s * 1.2, -s * 0.6, -s * 2, s * 0.4, 0, s * 1.6);
          ctx.bezierCurveTo(s * 2, s * 0.4, s * 1.2, -s * 0.6, 0, s * 0.4);
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive > 0) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
}

// ── Step progress indicator ─────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '2rem' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? '24px' : '6px',
            height: '6px',
            borderRadius: '100px',
            background: i === current ? 'var(--pl-olive)' : 'rgba(0,0,0,0.12)',
            transition: 'all 0.35s ease',
          }}
        />
      ))}
    </div>
  );
}

interface RsvpFormProps {
  events: WeddingEvent[];
  siteId: string;
  /** Custom meal options from manifest — if provided, replaces defaults */
  mealOptions?: Array<{ id: string; name: string; dietaryTags?: string[] }>;
}

// ── Shared input style ───────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.75rem 0',
  borderTop: 'none',
  borderLeft: 'none',
  borderRight: 'none',
  borderBottom: '1.5px solid rgba(0,0,0,0.1)',
  background: 'transparent',
  fontSize: 'max(16px, 0.9rem)',
  fontFamily: 'var(--pl-font-body)',
  color: 'var(--pl-ink)',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  borderRadius: 0,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  color: 'var(--pl-muted)',
  marginBottom: '0.3rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

function focusBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderBottomColor = 'var(--pl-olive)';
}
function blurBorder(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
  e.target.style.borderBottomColor = 'rgba(0,0,0,0.1)';
}

export function RsvpForm({ events, siteId, mealOptions }: RsvpFormProps) {
  // Multi-step state
  const [step, setStep] = useState(0);

  const [status, setStatus] = useState<RsvpStatus>('attending');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(events.map((e) => e.id));
  const [plusOne, setPlusOne] = useState(false);
  const [plusOneName, setPlusOneName] = useState('');
  const [mealPreference, setMealPreference] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [songRequest, setSongRequest] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step count: step 0 always, step 1 if attending, step 2 (message) always
  const totalSteps = status === 'attending' ? 3 : 2;

  const canAdvanceStep0 = name.trim().length > 0 && email.trim().length > 0;

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          status,
          guestName: name,
          email,
          selectedEvents,
          plusOne,
          plusOneName: plusOne ? plusOneName : null,
          mealPreference: status === 'attending' ? mealPreference : null,
          dietaryRestrictions: status === 'attending' ? dietaryRestrictions : null,
          songRequest: status === 'attending' ? songRequest : null,
          message,
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        if (status === 'attending') {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4500);
        }
      } else {
        const body = await res.json().catch(() => ({}));
        setSubmitError(body?.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setSubmitError('Unable to reach the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ──
  if (submitted) {
    return (
      <>
        <ConfettiBurst active={showConfetti} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', padding: '4rem 2rem' }}
        >
          <div
            style={{
              width: '5rem',
              height: '5rem',
              borderRadius: '50%',
              background: status === 'attending' ? '#ecfdf5' : '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}
          >
            {status === 'attending' ? (
              <PartyPopper size={28} color="#059669" />
            ) : (
              <HeartCrack size={28} color="#dc2626" />
            )}
          </div>
          <h3
            style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 400,
              fontStyle: 'italic',
              marginBottom: '0.75rem',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}
          >
            {status === 'attending'
              ? `See you there, ${name.split(' ')[0]}!`
              : `We'll miss you, ${name.split(' ')[0]}`}
          </h3>
          <p
            style={{
              color: 'var(--pl-muted)',
              maxWidth: '380px',
              margin: '0 auto',
              lineHeight: 1.7,
              fontSize: '0.95rem',
            }}
          >
            {status === 'attending'
              ? `Thank you, ${name}. Your RSVP has been recorded. We're so excited to celebrate with you.`
              : `Thank you for letting us know, ${name}. You'll be in our hearts.`}
          </p>
        </motion.div>
      </>
    );
  }

  return (
    <div>
      {/* Step progress dots */}
      <StepDots current={step} total={totalSteps} />

      {/* Animated step content */}
      <AnimatePresence mode="wait">
        {/* ── Step 0: Name + Email + Attending toggle ── */}
        {step === 0 && (
          <motion.div
            key="step-0"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Conversational header */}
            <h3 style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(1.4rem, 3vw, 1.75rem)',
              fontWeight: 400, fontStyle: 'italic',
              color: 'var(--pl-ink)', marginBottom: '0.5rem',
              letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              Will you be joining us?
            </h3>
            <p style={{
              fontSize: '0.88rem', color: 'var(--pl-muted)',
              marginBottom: '1.75rem', lineHeight: 1.6,
            }}>
              Let us know if you can make it — we&apos;d love to celebrate with you.
            </p>

            {/* Attending pill toggle */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
              {(['attending', 'declined'] as RsvpStatus[]).map((s) => {
                const isActive = status === s;
                const isAttending = s === 'attending';
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStatus(s)}
                    style={{
                      flex: 1,
                      padding: '1rem',
                      borderRadius: '100px',
                      border: `2px solid ${
                        isActive
                          ? isAttending
                            ? 'var(--pl-olive)'
                            : '#dc2626'
                          : 'rgba(0,0,0,0.08)'
                      }`,
                      background: isActive
                        ? isAttending
                          ? 'var(--pl-olive)'
                          : '#fef2f2'
                        : 'transparent',
                      color: isActive
                        ? isAttending
                          ? '#fff'
                          : '#dc2626'
                        : 'var(--pl-muted)',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      fontFamily: 'var(--pl-font-body)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {s === 'attending' ? 'Joyfully Attending' : 'Regretfully Declining'}
                  </button>
                );
              })}
            </div>

            {/* Name */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Your Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="First and last name"
                style={inputStyle}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>

            {/* Email */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={labelStyle}>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                style={inputStyle}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>

            {/* Events (if multiple) */}
            {events.length > 1 && (
              <div style={{ marginBottom: '2rem' }}>
                <label style={labelStyle}>Which events will you attend?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {events.map((evt) => (
                    <label
                      key={evt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '0.75rem',
                        border: `1.5px solid ${
                          selectedEvents.includes(evt.id)
                            ? 'var(--pl-olive)'
                            : 'rgba(0,0,0,0.08)'
                        }`,
                        background: selectedEvents.includes(evt.id)
                          ? 'var(--pl-olive-mist)'
                          : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(evt.id)}
                        onChange={() => {
                          setSelectedEvents((prev) =>
                            prev.includes(evt.id)
                              ? prev.filter((id) => id !== evt.id)
                              : [...prev, evt.id]
                          );
                        }}
                        className="accent-olive w-4 h-4 cursor-pointer"
                      />
                      <span style={{ fontSize: 'max(16px, 0.9rem)', fontFamily: 'var(--pl-font-body)' }}>
                        {evt.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Next button */}
            <button
              type="button"
              disabled={!canAdvanceStep0}
              onClick={() => setStep(status === 'attending' ? 1 : 2)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1rem 2rem',
                borderRadius: '100px',
                background: canAdvanceStep0 ? 'var(--pl-olive)' : 'rgba(0,0,0,0.08)',
                color: canAdvanceStep0 ? '#fff' : 'var(--pl-muted)',
                fontSize: 'max(16px, 0.9rem)',
                fontWeight: 600,
                fontFamily: 'var(--pl-font-body)',
                border: 'none',
                cursor: canAdvanceStep0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.25s ease',
              }}
            >
              Continue
              <ChevronRight size={17} />
            </button>
          </motion.div>
        )}

        {/* ── Step 1: Plus one + Meal + Song (attending only) ── */}
        {step === 1 && status === 'attending' && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Conversational header */}
            <h3 style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(1.4rem, 3vw, 1.75rem)',
              fontWeight: 400, fontStyle: 'italic',
              color: 'var(--pl-ink)', marginBottom: '0.5rem',
              letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              A few more details
            </h3>
            <p style={{
              fontSize: '0.88rem', color: 'var(--pl-muted)',
              marginBottom: '1.75rem', lineHeight: 1.6,
            }}>
              Help us make the day perfect for you, {name.split(' ')[0] || 'friend'}.
            </p>

            {/* Plus one toggle */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setPlusOne(!plusOne)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                <div
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    borderRadius: '0.375rem',
                    border: `2px solid ${plusOne ? 'var(--pl-olive)' : 'rgba(0,0,0,0.15)'}`,
                    background: plusOne ? 'var(--pl-olive)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    flexShrink: 0,
                  }}
                >
                  {plusOne && <Check size={12} color="#fff" />}
                </div>
                <span style={{ fontSize: 'max(16px, 0.9rem)', color: 'var(--pl-ink)' }}>
                  I&apos;m bringing a plus one
                </span>
              </button>

              <AnimatePresence>
                {plusOne && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ marginTop: '0.75rem' }}
                  >
                    <input
                      type="text"
                      value={plusOneName}
                      onChange={(e) => setPlusOneName(e.target.value)}
                      placeholder="Their name"
                      style={inputStyle}
                      onFocus={focusBorder}
                      onBlur={blurBorder}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Meal preference cards */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Meal Preference</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
                  gap: '0.5rem',
                  marginTop: '0.5rem',
                }}
              >
                {(mealOptions && mealOptions.length > 0
                  ? mealOptions.map(o => ({ label: o.name, emoji: '' }))
                  : [
                    { label: 'Chicken', emoji: '' },
                    { label: 'Fish', emoji: '' },
                    { label: 'Beef', emoji: '' },
                    { label: 'Vegetarian', emoji: '' },
                    { label: 'Vegan', emoji: '' },
                  ]
                ).map(({ label: m, emoji }) => {
                  const selected = mealPreference === m;
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMealPreference(m === mealPreference ? '' : m)}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: '0.875rem',
                        border: `1.5px solid ${selected ? 'var(--pl-olive)' : 'rgba(0,0,0,0.08)'}`,
                        background: selected ? 'var(--pl-olive-mist)' : 'rgba(0,0,0,0.02)',
                        color: selected ? 'var(--pl-olive)' : 'var(--pl-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontFamily: 'var(--pl-font-body)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '0.35rem',
                        transform: selected ? 'scale(1.03)' : 'scale(1)',
                      }}
                    >
                      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{emoji}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{m}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dietary restrictions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Dietary Restrictions</label>
              <input
                type="text"
                value={dietaryRestrictions}
                onChange={(e) => setDietaryRestrictions(e.target.value)}
                placeholder="Allergies, preferences, etc."
                style={inputStyle}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>

            {/* Song request with LoomThreadIcon prefix */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={labelStyle}>Song Request</label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--pl-olive)',
                    opacity: 0.6,
                  }}
                >
                  <LoomThreadIcon size={16} />
                </div>
                <input
                  type="text"
                  value={songRequest}
                  onChange={(e) => setSongRequest(e.target.value)}
                  placeholder="Name a song that should be on our playlist."
                  style={{
                    ...inputStyle,
                    paddingLeft: '1.5rem',
                  }}
                  onFocus={focusBorder}
                  onBlur={blurBorder}
                />
              </div>
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setStep(0)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.9rem 1.5rem',
                  borderRadius: '100px',
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  background: 'transparent',
                  color: 'var(--pl-muted)',
                  fontSize: 'max(16px, 0.88rem)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.9rem 2rem',
                  borderRadius: '100px',
                  background: 'var(--pl-olive)',
                  color: '#fff',
                  fontSize: 'max(16px, 0.9rem)',
                  fontWeight: 600,
                  fontFamily: 'var(--pl-font-body)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                }}
              >
                Continue
                <ChevronRight size={17} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Step 2 (final): Message to couple ── */}
        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Conversational header */}
            <h3 style={{
              fontFamily: 'var(--pl-font-heading)',
              fontSize: 'clamp(1.4rem, 3vw, 1.75rem)',
              fontWeight: 400, fontStyle: 'italic',
              color: 'var(--pl-ink)', marginBottom: '0.5rem',
              letterSpacing: '-0.02em', lineHeight: 1.2,
            }}>
              {status === 'attending' ? 'One last thing\u2026' : 'Before you go\u2026'}
            </h3>
            <p style={{
              fontSize: '0.88rem', color: 'var(--pl-muted)',
              marginBottom: '1.75rem', lineHeight: 1.6,
            }}>
              {status === 'attending'
                ? 'Leave us a note — we\'d love to hear from you.'
                : 'We\'ll miss you! Feel free to leave a message.'}
            </p>

            <div style={{ marginBottom: '2rem' }}>
              <label style={labelStyle}>Your Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="A few words of love, excitement, or a memory..."
                rows={4}
                style={{
                  ...inputStyle,
                  resize: 'none' as const,
                  lineHeight: 1.6,
                  paddingTop: '0.5rem',
                }}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setStep(status === 'attending' ? 1 : 0)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.9rem 1.5rem',
                  borderRadius: '100px',
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  background: 'transparent',
                  color: 'var(--pl-muted)',
                  fontSize: 'max(16px, 0.88rem)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'var(--pl-font-body)',
                }}
              >
                <ChevronLeft size={16} />
                Back
              </button>

              {/* Full-width olive gradient submit */}
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '1rem 2rem',
                  borderRadius: '100px',
                  background: loading
                    ? 'rgba(0,0,0,0.08)'
                    : 'linear-gradient(135deg, var(--pl-olive) 0%, var(--pl-olive-hover) 100%)',
                  color: loading ? 'var(--pl-muted)' : '#fff',
                  fontSize: 'max(16px, 0.9rem)',
                  fontWeight: 700,
                  fontFamily: 'var(--pl-font-body)',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.25s ease',
                  boxShadow: loading
                    ? 'none'
                    : '0 4px 16px color-mix(in srgb, var(--pl-olive) 35%, transparent)',
                  letterSpacing: '0.02em',
                }}
              >
                {loading ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Check size={16} />
                )}
                {loading ? 'Submitting...' : 'Send my RSVP'}
              </button>
            </div>
            <AnimatePresence>
              {submitError && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    marginTop: '0.75rem',
                    fontSize: '0.82rem',
                    color: '#b91c1c',
                    textAlign: 'center',
                    background: 'rgba(185,28,28,0.06)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem',
                  }}
                >
                  {submitError}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
