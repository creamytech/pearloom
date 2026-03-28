'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/rsvp-form.tsx
// Premium RSVP form with rich visual styling
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, Check, Loader2, PartyPopper, HeartCrack } from 'lucide-react';
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

    const COLORS = ['#b8926a', '#f0c080', '#f87171', '#a78bfa', '#34d399', '#60a5fa', '#fb923c', '#e879f9'];
    const SHAPES = ['circle', 'rect', 'heart'] as const;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; rotation: number; rotSpeed: number;
      shape: typeof SHAPES[number]; alpha: number; gravity: number;
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
          // heart
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
        position: 'fixed', inset: 0, zIndex: 9999,
        pointerEvents: 'none', width: '100%', height: '100%',
      }}
    />
  );
}

interface RsvpFormProps {
  events: WeddingEvent[];
  siteId: string;
}

export function RsvpForm({ events, siteId }: RsvpFormProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
      }
    } catch {
      console.error('RSVP submission failed');
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
        style={{
          textAlign: 'center',
          padding: '4rem 2rem',
        }}
      >
        <div style={{
          width: '5rem', height: '5rem', borderRadius: '50%',
          background: status === 'attending' ? '#ecfdf5' : '#fef2f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          {status === 'attending'
            ? <PartyPopper size={28} color="#059669" />
            : <HeartCrack size={28} color="#dc2626" />
          }
        </div>
        <h3 style={{
          fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem',
          fontWeight: 600, marginBottom: '0.75rem',
        }}>
          {status === 'attending' ? "We Can't Wait to See You!" : "We'll Miss You!"}
        </h3>
        <p style={{ color: 'var(--eg-muted)', maxWidth: '380px', margin: '0 auto', lineHeight: 1.7 }}>
          {status === 'attending'
            ? `Thank you, ${name}. Your RSVP has been recorded. We're so excited to celebrate with you.`
            : `Thank you for letting us know, ${name}. You'll be in our hearts.`}
        </p>
      </motion.div>
      </>
    );
  }

  // ── Shared styles ──
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.85rem 1rem',
    borderRadius: '0.75rem',
    border: '1.5px solid rgba(0,0,0,0.1)',
    background: '#ffffff',
    fontSize: '0.9rem',
    fontFamily: 'var(--eg-font-body)',
    color: 'var(--eg-fg)',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--eg-muted)',
    marginBottom: '0.5rem',
    letterSpacing: '0.02em',
  };

  const sectionGap: React.CSSProperties = {
    marginBottom: '1.5rem',
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Attendance toggle ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        {(['attending', 'declined'] as RsvpStatus[]).map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => setStatus(s)}
            style={{
              flex: 1,
              padding: '1rem',
              borderRadius: '0.75rem',
              border: `2px solid ${status === s
                ? (s === 'attending' ? '#059669' : '#dc2626')
                : 'rgba(0,0,0,0.08)'}`,
              background: status === s
                ? (s === 'attending' ? '#ecfdf5' : '#fef2f2')
                : '#ffffff',
              color: status === s
                ? (s === 'attending' ? '#059669' : '#dc2626')
                : 'var(--eg-muted)',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--eg-font-body)',
            }}
          >
            {s === 'attending' ? '🎉 Joyfully Accepts' : '💌 Respectfully Declines'}
          </button>
        ))}
      </div>

      {/* ── Name & Email ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', ...sectionGap }}>
        <div>
          <label style={labelStyle}>Your Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="First and last name"
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--eg-accent)';
              e.target.style.boxShadow = '0 0 0 3px rgba(184,146,106,0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(0,0,0,0.1)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
        <div>
          <label style={labelStyle}>Email *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--eg-accent)';
              e.target.style.boxShadow = '0 0 0 3px rgba(184,146,106,0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(0,0,0,0.1)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* ── Events ── */}
      {events.length > 1 && (
        <div style={sectionGap}>
          <label style={labelStyle}>Which events will you attend?</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {events.map((evt) => (
              <label
                key={evt.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '0.75rem',
                  border: `1.5px solid ${selectedEvents.includes(evt.id) ? 'var(--eg-accent)' : 'rgba(0,0,0,0.08)'}`,
                  background: selectedEvents.includes(evt.id) ? 'var(--eg-accent-light)' : '#fff',
                  cursor: 'pointer', transition: 'all 0.2s',
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
                  style={{ accentColor: 'var(--eg-accent)' }}
                />
                <span style={{ fontSize: '0.9rem' }}>{evt.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Plus one ── */}
      <div style={sectionGap}>
        <label
          style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            cursor: 'pointer', userSelect: 'none',
          }}
          onClick={() => setPlusOne(!plusOne)}
        >
          <div style={{
            width: '1.25rem', height: '1.25rem', borderRadius: '0.375rem',
            border: `2px solid ${plusOne ? 'var(--eg-accent)' : 'rgba(0,0,0,0.15)'}`,
            background: plusOne ? 'var(--eg-accent)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
          }}>
            {plusOne && <Check size={12} color="#fff" />}
          </div>
          <span style={{ fontSize: '0.9rem' }}>I&apos;m Bringing a Plus One</span>
        </label>
        {plusOne && (
          <motion.input
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            type="text"
            value={plusOneName}
            onChange={(e) => setPlusOneName(e.target.value)}
            placeholder="Their name"
            style={{ ...inputStyle, marginTop: '0.75rem' }}
          />
        )}
      </div>

      {/* ── Attending-only fields ── */}
      {status === 'attending' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}
        >
          {/* Meal */}
          <div>
            <label style={labelStyle}>Meal Preference</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Chicken', 'Fish', 'Beef', 'Vegetarian', 'Vegan'].map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMealPreference(m)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '999px',
                    border: `1.5px solid ${mealPreference === m ? 'var(--eg-accent)' : 'rgba(0,0,0,0.08)'}`,
                    background: mealPreference === m ? 'var(--eg-accent-light)' : '#ffffff',
                    color: mealPreference === m ? 'var(--eg-accent)' : 'var(--eg-muted)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'var(--eg-font-body)',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary */}
          <div>
            <label style={labelStyle}>Dietary Restrictions</label>
            <input
              type="text"
              value={dietaryRestrictions}
              onChange={(e) => setDietaryRestrictions(e.target.value)}
              placeholder="Allergies, preferences, etc."
              style={inputStyle}
            />
          </div>

          {/* Song */}
          <div>
            <label style={labelStyle}>Song Request 🎵</label>
            <input
              type="text"
              value={songRequest}
              onChange={(e) => setSongRequest(e.target.value)}
              placeholder="What song gets you on the dance floor?"
              style={inputStyle}
            />
          </div>
        </motion.div>
      )}

      {/* ── Message ── */}
      <div style={sectionGap}>
        <label style={labelStyle}>Leave a Note 💌</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="A message for the couple..."
          rows={3}
          style={{
            ...inputStyle,
            resize: 'none',
            lineHeight: 1.6,
          }}
        />
      </div>

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={!name || !email || loading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '1rem 2rem',
          borderRadius: '0.75rem',
          background: 'var(--eg-fg)',
          color: '#ffffff',
          fontSize: '0.9rem',
          fontWeight: 500,
          fontFamily: 'var(--eg-font-body)',
          border: 'none',
          cursor: (!name || !email || loading) ? 'not-allowed' : 'pointer',
          opacity: (!name || !email || loading) ? 0.35 : 1,
          transition: 'all 0.25s ease',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        }}
      >
        {loading ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Heart size={16} />
        )}
        {loading ? 'Submitting...' : 'Send RSVP'}
      </button>
    </form>
  );
}
