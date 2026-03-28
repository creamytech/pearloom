'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/landing-page.tsx
// The Loom — Intertwined brand marketing page
// "Pair + Loom" — two lives woven together
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ArrowRight, Check, Star, Heart } from 'lucide-react';
import { PearloomMark, PearloomWordmark, FloatingThread, WovenCircle } from '@/components/brand/PearloomMark';

interface LandingPageProps {
  handleSignIn: () => void;
  status: 'authenticated' | 'loading' | 'unauthenticated';
}

const FEATURES = [
  { emoji: '🧠', title: 'Your story, written for you', body: 'Gemini reads your photos, maps your timeline, and writes an intimate narrative in your voice — never a template.' },
  { emoji: '📸', title: 'Photos stay where they live', body: 'Select memories directly from Google Photos. Nothing to download, compress, or re-upload.' },
  { emoji: '💌', title: 'Guests feel taken care of', body: 'RSVPs, meal preferences, song requests, and plus-ones — collected gracefully in one place.' },
  { emoji: '🎨', title: 'Layouts that feel like memory', body: 'Cinematic parallax, editorial type, and gentle motion — every page feels handcrafted, never generic.' },
  { emoji: '🗺', title: 'All the details, already there', body: 'Hotels, airports, travel notes — written by AI and shown beautifully for every guest who needs them.' },
  { emoji: '✨', title: 'Rewrite any moment, any time', body: 'One touch rewrites any chapter with fresh, intimate language. The story stays yours, just more beautifully told.' },
];

const TESTIMONIALS = [
  { quote: 'Our guests said it looked like a design studio built it. We did it ourselves in 4 minutes.', name: 'Sarah & James', wedding: 'June 2025 · Napa, CA' },
  { quote: 'The AI described our relationship better than we could have. We both cried reading it.', name: 'Priya & Aiden', wedding: 'March 2026 · Charleston, SC' },
  { quote: "I've built websites professionally for 10 years. I've never seen anything generate this fast and look this good.", name: 'Elena & Marco', wedding: 'September 2025 · Tuscany' },
];

export function LandingPage({ handleSignIn, status }: LandingPageProps) {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setActiveTestimonial(tick % TESTIMONIALS.length);
  }, [tick]);

  return (
    <div style={{ backgroundColor: '#F5F1E8', minHeight: '100dvh', fontFamily: 'var(--eg-font-body)', overflowX: 'hidden' }}>

      {/* ══════════════════════════════════════
          HERO — The Loom
      ══════════════════════════════════════ */}
      <section style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '10rem 2rem 6rem',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background floating threads */}
        <FloatingThread x="5%" y="10%" size={80} delay={0} opacity={0.18} />
        <FloatingThread x="88%" y="8%" size={55} delay={1.5} opacity={0.15} />
        <FloatingThread x="78%" y="60%" size={100} delay={3} opacity={0.12} />
        <FloatingThread x="3%" y="65%" size={65} delay={2} opacity={0.14} />
        <FloatingThread x="92%" y="35%" size={45} delay={4} opacity={0.16} />
        <FloatingThread x="15%" y="82%" size={40} delay={1} opacity={0.15} />
        <FloatingThread x="60%" y="88%" size={55} delay={2.5} opacity={0.12} />

        {/* Background warm radial glow */}
        <div style={{
          position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '700px', height: '700px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(163,177,138,0.1) 0%, transparent 65%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        {/* Subtle woven texture */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(45deg, rgba(163,177,138,0.03) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(163,177,138,0.03) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(163,177,138,0.03) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(163,177,138,0.03) 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '860px', width: '100%', textAlign: 'center' }}>
          {/* Giant intertwined mark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}
          >
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Outer glow rings */}
              {[1, 2, 3].map((ring) => (
                <motion.div
                  key={ring}
                  style={{
                    position: 'absolute',
                    width: 160 + ring * 40, height: 80 + ring * 20,
                    borderRadius: '50%',
                    border: `1px solid rgba(163,177,138,${0.2 - ring * 0.05})`,
                    pointerEvents: 'none',
                  }}
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 4 + ring, repeat: Infinity, ease: 'easeInOut', delay: ring * 0.6 }}
                />
              ))}
              {/* Core logo mark — animated draw-in */}
              <PearloomMark size={160} color="#A3B18A" color2="#D6C6A8" animated />
            </div>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.45rem 1.2rem', borderRadius: '2rem',
              background: 'rgba(163,177,138,0.1)', border: '1px solid rgba(163,177,138,0.2)',
              color: '#A3B18A', fontSize: '0.72rem', fontWeight: 500,
              letterSpacing: '0.1em', textTransform: 'lowercase',
              marginBottom: '2.5rem',
            }}
          >
            <Sparkles size={11} />
            woven with care · free to begin
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.3, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(4rem, 10.5vw, 8.5rem)',
              fontWeight: 400, lineHeight: 0.92,
              color: 'var(--eg-fg)', letterSpacing: '-0.035em',
              marginBottom: '2.5rem',
            }}
          >
            Your love story,<br />
            <span style={{ fontStyle: 'italic', color: '#A3B18A' }}>beautifully&nbsp;woven.</span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            style={{
              fontSize: 'clamp(1rem, 2.2vw, 1.2rem)', fontWeight: 300,
              lineHeight: 1.75, color: '#9A9488',
              maxWidth: '560px', margin: '0 auto 4rem',
            }}
          >
            Connect Google Photos. Describe your vibe. Pearloom&apos;s AI weaves a
            magazine-quality site for every milestone — in under 90 seconds.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.65 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}
          >
            <button
              onClick={handleSignIn}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.9rem',
                padding: '1.2rem 3.75rem', borderRadius: '100px',
                background: 'linear-gradient(135deg, var(--eg-dark) 0%, var(--eg-dark-2) 100%)',
                color: '#fff', fontSize: '1.05rem', fontWeight: 600,
                border: 'none', cursor: 'pointer', letterSpacing: '0.02em',
                boxShadow: '0 18px 55px rgba(26,23,19,0.25), 0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                fontFamily: 'var(--eg-font-body)',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'scale(1.04) translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 28px 70px rgba(26,26,26,0.35), 0 4px 12px rgba(0,0,0,0.12)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = '0 18px 55px rgba(26,23,19,0.25), 0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              {status === 'loading' ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <PearloomMark size={24} color="#fff" />}
              Begin Your Story
              <ArrowRight size={15} style={{ opacity: 0.55 }} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.75rem', color: '#b0b0b0', letterSpacing: '0.02em' }}>
              <div style={{ display: 'flex', gap: '0.18rem' }}>
                {[...Array(5)].map((_, i) => <Star key={i} size={11} fill="#A3B18A" color="#A3B18A" />)}
              </div>
              <span>4.9 rating · No credit card · Free forever</span>
            </div>
          </motion.div>

          {/* Stats pills */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
            style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '5.5rem', flexWrap: 'wrap' }}
          >
            {[
              { value: '< 90s', label: 'To your story' },
              { value: '10k+', label: 'Couples' },
              { value: '∞', label: 'Moments' },
              { value: '0', label: 'Templates' },
            ].map((s) => (
              <div key={s.label} style={{
                padding: '1.25rem 2rem', textAlign: 'center',
                background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(24px)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(163,177,138,0.18)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.04)',
                minWidth: '110px',
              }}>
                <div style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', fontWeight: 400, color: 'var(--eg-fg)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ width: '20px', height: '1px', background: 'rgba(163,177,138,0.4)', margin: '0.5rem auto' }} />
                <div style={{ fontSize: '0.6rem', color: '#b0b0b0', textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES — Card Grid
      ══════════════════════════════════════ */}
      <section style={{ padding: '9rem 2rem', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '6rem' }}
          >
            <WovenCircle size={44} style={{ margin: '0 auto 1.5rem' }}>
              <PearloomMark size={24} color="#A3B18A" />
            </WovenCircle>
            <h2 style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 400, color: 'var(--eg-fg)',
              letterSpacing: '-0.025em', lineHeight: 1.05,
              marginTop: '0.5rem',
            }}>
              Every memory deserves to be<br />
              <span style={{ fontStyle: 'italic', color: '#A3B18A' }}>beautifully told</span>
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: i * 0.09 }}
                whileHover={{ y: -8 }}
                style={{
                  background: '#F5F1E8', borderRadius: '1.5rem',
                  padding: '2.25rem', border: '1px solid rgba(0,0,0,0.05)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                  cursor: 'default',
                }}
              >
                <WovenCircle size={52} style={{ marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{f.emoji}</span>
                </WovenCircle>
                <h3 style={{
                  fontFamily: 'var(--eg-font-heading)', fontSize: '1.35rem',
                  fontWeight: 400, color: 'var(--eg-fg)',
                  marginBottom: '0.75rem', letterSpacing: '-0.01em',
                }}>{f.title}</h3>
                <p style={{ color: '#9A9488', fontSize: '0.95rem', lineHeight: 1.8 }}>{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS — Thread spine
      ══════════════════════════════════════ */}
      <section style={{ padding: '9rem 2rem', background: '#F5F1E8', position: 'relative' }}>
        {/* Giant background thread outline */}
        <div style={{
          position: 'absolute', top: '50%', right: '-100px', transform: 'translateY(-50%)',
          pointerEvents: 'none', opacity: 0.08,
        }}>
          <PearloomMark size={500} color="#A3B18A" />
        </div>

        <div style={{ maxWidth: '820px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '6rem' }}
          >
            <h2 style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 400, color: 'var(--eg-fg)',
              letterSpacing: '-0.025em', lineHeight: 1.05,
            }}>
              From your photos<br />
              <span style={{ fontStyle: 'italic', color: '#A3B18A' }}>to a living memory</span>
            </h2>
          </motion.div>

          <div style={{ position: 'relative' }}>
            {/* Vertical connecting line — woven double-line */}
            <div style={{
              position: 'absolute', left: '2.35rem', top: '3rem', bottom: '3rem',
              width: '3px', display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ flex: 1, background: 'linear-gradient(to bottom, rgba(163,177,138,0.35), rgba(163,177,138,0.05))', width: '1px', marginLeft: '0px' }} />
              <div style={{ position: 'absolute', inset: 0, width: '1px', marginLeft: '2px', background: 'linear-gradient(to bottom, rgba(163,177,138,0.2), rgba(163,177,138,0.03))' }} />
            </div>

            {[
              { emoji: '📸', step: '01', title: 'Bring your memories', body: 'Connect Google Photos or upload directly. Select the moments that tell your story.' },
              { emoji: '✍️', step: '02', title: 'Describe how it feels', body: 'Tell us your occasion and mood. The AI weaves your words and photos into something intimate.' },
              { emoji: '🌿', step: '03', title: 'Share something beautiful', body: 'Your site is live at yourname.pearloom.app — a shared space that grows with you.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.8, delay: i * 0.15 }}
                style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start', marginBottom: '4rem' }}
              >
                <WovenCircle
                  size={48}
                  color={i === 0 ? 'linear-gradient(160deg, #e8cba8, #D6C6A8)' : 'rgba(163,177,138,0.1)'}
                  borderColor="rgba(163,177,138,0.3)"
                  style={{
                    background: i === 0 ? 'linear-gradient(160deg, #e8cba8, #D6C6A8)' : 'rgba(163,177,138,0.08)',
                    boxShadow: i === 0 ? '0 8px 24px rgba(163,177,138,0.3)' : 'none',
                  }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{item.emoji}</span>
                </WovenCircle>

                <div style={{ paddingTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.1em', color: '#A3B18A', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    {item.step}
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--eg-font-heading)', fontSize: '2rem',
                    fontWeight: 400, color: 'var(--eg-fg)',
                    letterSpacing: '-0.015em', marginBottom: '0.75rem',
                  }}>
                    {item.title}
                  </h3>
                  <p style={{ color: '#9A9488', lineHeight: 1.8, fontSize: '1rem', maxWidth: '480px' }}>{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TESTIMONIALS — Dark Section
      ══════════════════════════════════════ */}
      <section style={{ padding: '9rem 2rem', background: 'var(--eg-dark)', position: 'relative', overflow: 'hidden' }}>
        {/* Giant background thread outlines */}
        <div style={{
          position: 'absolute', left: '-60px', top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', opacity: 0.06,
        }}>
          <PearloomMark size={400} color="#A3B18A" />
        </div>
        <div style={{
          position: 'absolute', right: '-40px', bottom: '-20px',
          pointerEvents: 'none', opacity: 0.04,
        }}>
          <PearloomMark size={300} color="#A3B18A" />
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <WovenCircle size={44} color="rgba(163,177,138,0.1)" borderColor="rgba(163,177,138,0.3)" style={{ margin: '0 auto 2rem' }}>
            <span style={{ fontSize: '1.1rem' }}>💬</span>
          </WovenCircle>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 400, color: '#fff',
            letterSpacing: '-0.025em', lineHeight: 1.05,
            marginBottom: '5rem',
          }}>
            Couples who trusted<br />
            <span style={{ fontStyle: 'italic', color: '#A3B18A' }}>Pearloom</span>
          </h2>

          {/* Carousel */}
          <div style={{ position: 'relative', minHeight: '220px' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: 'rgba(255,255,255,0.045)',
                  borderRadius: '1.25rem', padding: '3rem 3.5rem',
                  border: '1px solid rgba(255,255,255,0.09)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {/* Opening quote mark */}
                <div style={{
                  fontFamily: 'var(--eg-font-heading)', fontSize: '5rem',
                  color: '#A3B18A', opacity: 0.25, lineHeight: 0.7,
                  marginBottom: '1rem', textAlign: 'left',
                }}>&ldquo;</div>
                <p style={{
                  fontFamily: 'var(--eg-font-heading)', fontSize: 'clamp(1.15rem, 2.5vw, 1.55rem)',
                  fontWeight: 400, fontStyle: 'italic',
                  color: 'rgba(255,255,255,0.92)', lineHeight: 1.65, marginBottom: '2.5rem',
                  marginTop: '-0.5rem',
                }}>
                  {TESTIMONIALS[activeTestimonial].quote}
                </p>
                {/* Divider line */}
                <div style={{ width: '30px', height: '1px', background: 'rgba(163,177,138,0.4)', margin: '0 auto 2rem' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <WovenCircle
                    size={44}
                    color="linear-gradient(135deg, #A3B18A, #8b6b4a)"
                    borderColor="rgba(163,177,138,0.3)"
                    style={{ background: 'linear-gradient(135deg, #A3B18A, #8b6b4a)' }}
                  >
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                      {TESTIMONIALS[activeTestimonial].name[0]}
                    </span>
                  </WovenCircle>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.88rem', letterSpacing: '0.02em' }}>{TESTIMONIALS[activeTestimonial].name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.38)', marginTop: '0.15rem', letterSpacing: '0.04em' }}>{TESTIMONIALS[activeTestimonial].wedding}</div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '2rem', alignItems: 'center' }}>
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                style={{
                  width: i === activeTestimonial ? '28px' : '7px',
                  height: '7px', borderRadius: '999px',
                  background: i === activeTestimonial ? '#A3B18A' : 'rgba(255,255,255,0.18)',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          PRICING — All Included
      ══════════════════════════════════════ */}
      <section style={{ padding: '9rem 2rem', background: '#F5F1E8' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: '4rem' }}
          >
            <h2 style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 400, color: 'var(--eg-fg)',
              letterSpacing: '-0.025em', lineHeight: 1.05,
            }}>
              Start free.<br />
              <span style={{ fontStyle: 'italic', color: '#A3B18A' }}>Stay beautiful.</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              background: '#fff', borderRadius: '2rem',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 12px 50px rgba(0,0,0,0.05)',
              overflow: 'hidden',
            }}
          >
            {/* Header stripe */}
            <div style={{
              background: 'linear-gradient(135deg, var(--eg-dark), var(--eg-dark-2))',
              padding: '2.5rem 3rem',
              display: 'flex', alignItems: 'center', gap: '1.5rem',
            }}>
              <WovenCircle size={52} color="rgba(163,177,138,0.15)" borderColor="rgba(163,177,138,0.4)" style={{ flexShrink: 0 }}>
                <PearloomMark size={28} color="#A3B18A" />
              </WovenCircle>
              <div>
                <div style={{ color: '#fff', fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem', fontWeight: 400, letterSpacing: '-0.01em' }}>Free Forever</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', marginTop: '0.2rem' }}>No credit card required · No hidden fees</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '3rem', fontWeight: 400, color: '#fff', lineHeight: 1 }}>$0</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>FOREVER</div>
              </div>
            </div>

            {/* Feature list */}
            <div style={{ padding: '2rem 3rem' }}>
              {[
                'AI-generated story chapters from your photos',
                'Event cards, RSVP & guest manager',
                'Registry showcase & travel logistics',
                'Social OG preview card for sharing',
                'Drag-and-drop editor with AI rewrite',
                'Live countdown to your special day',
                'Published at yourname.pearloom.app',
                'FAQ accordion for guests',
              ].map((feat) => (
                <div key={feat} style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.875rem 0',
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
                }}>
                  <WovenCircle size={22} style={{ flexShrink: 0 }}>
                    <Check size={11} color="#A3B18A" strokeWidth={2.5} />
                  </WovenCircle>
                  <span style={{ fontSize: '0.95rem', color: '#3a3a3a' }}>{feat}</span>
                </div>
              ))}

              <button
                onClick={handleSignIn}
                style={{
                  width: '100%', marginTop: '2rem',
                  padding: '1.15rem', borderRadius: '100px',
                  background: 'linear-gradient(135deg, #A3B18A, #8b6b4a)',
                  color: '#fff', fontSize: '1rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  boxShadow: '0 12px 40px rgba(163,177,138,0.4)',
                  fontFamily: 'var(--eg-font-body)', letterSpacing: '0.01em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'none'; }}
              >
                <Heart size={18} />
                Begin Your Story
                <ArrowRight size={16} style={{ opacity: 0.7 }} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER — Elegant Close
      ══════════════════════════════════════ */}
      <footer style={{ background: 'var(--eg-dark)', padding: '8rem 2rem 5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Large thread outline center */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          pointerEvents: 'none', opacity: 0.05,
        }}>
          <PearloomMark size={500} color="#A3B18A" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ maxWidth: '600px', margin: '0 auto', position: 'relative', zIndex: 1 }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '3rem' }}>
            <PearloomMark size={80} color="#A3B18A" color2="rgba(163,177,138,0.5)" />
          </div>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
            fontWeight: 400, color: '#fff',
            letterSpacing: '-0.03em', lineHeight: 1.05,
            marginBottom: '1.5rem',
          }}>
            Ready to weave<br />
            <span style={{ fontStyle: 'italic', color: '#A3B18A' }}>your love story?</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1rem', lineHeight: 1.65, marginBottom: '4rem' }}>
            Thousands of couples building beautiful sites for every milestone.
          </p>

          <button
            onClick={handleSignIn}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
              padding: '1.15rem 3.5rem', borderRadius: '100px',
              background: 'linear-gradient(135deg, #A3B18A, #8b6b4a)',
              color: '#fff', fontSize: '1.05rem', fontWeight: 600,
              border: 'none', cursor: 'pointer',
              boxShadow: '0 14px 50px rgba(163,177,138,0.4)',
              fontFamily: 'var(--eg-font-body)',
            }}
            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.04) translateY(-3px)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'none'; }}
          >
            <PearloomMark size={22} color="#fff" />
            Start Building Free
          </button>

          <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
            {['© 2026 Pearloom', 'Built by Pixel Boba Studio', 'Privacy', 'Terms'].map((item) => (
              <span key={item} style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em' }}>{item}</span>
            ))}
          </div>
        </motion.div>
      </footer>
    </div>
  );
}
