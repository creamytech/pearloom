'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/landing-page.tsx
// Ultra-Premium Marketing Landing Page
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Camera, Sparkles, Loader2, ArrowRight, Globe, Palette, Layers } from 'lucide-react';

interface LandingPageProps {
  handleSignIn: () => void;
  status: 'authenticated' | 'loading' | 'unauthenticated';
}

const FEATURES = [
  {
    icon: Camera,
    title: 'Seamless Google Sync',
    subtitle: '30 photos in 30 seconds',
    desc: 'Select memories directly from your Google Photos library. No downloading, compressing, or organizing. The AI does the heavy lifting.',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    accentColor: '#b8926a',
  },
  {
    icon: Sparkles,
    title: 'AI Memory Engine',
    subtitle: 'Gemini-powered storytelling',
    desc: "We analyze your photos' metadata, map their timelines, and pair them with your vibe to write an intimate, editorial narrative — not a template.",
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
    accentColor: '#8b6b4a',
  },
  {
    icon: Palette,
    title: 'Magazine Quality Output',
    subtitle: 'Vogue-level design, instantly',
    desc: 'Cinematic parallax, editorial type hierarchies, overlapping polaroids, fullbleed photography. Your site rivals a Condé Nast spread.',
    image: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=800',
    accentColor: '#7a5c3a',
  },
];

const STATS = [
  { value: '< 90s', label: 'Average generation time' },
  { value: '6', label: 'Editorial layout variants' },
  { value: '∞', label: 'Color themes generated' },
  { value: '0', label: 'Design decisions required' },
];

export function LandingPage({ handleSignIn, status }: LandingPageProps) {
  return (
    <div style={{ backgroundColor: '#faf9f6', minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── HERO ── */}
      <section style={{
        position: 'relative',
        height: '100vh',
        minHeight: '750px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 2rem',
        overflow: 'hidden',
      }}>
        {/* Animated ambient blobs */}
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-10%', left: '-10%',
            width: '65vw', height: '65vw', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(184,146,106,0.14) 0%, transparent 65%)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }}
        />
        <motion.div
          animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 21, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          style={{
            position: 'absolute', bottom: '-15%', right: '-10%',
            width: '70vw', height: '70vw', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,220,203,0.25) 0%, transparent 65%)',
            filter: 'blur(50px)', pointerEvents: 'none',
          }}
        />
        {/* Subtle dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.045) 1px, transparent 0)',
          backgroundSize: '30px 30px',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative', zIndex: 10, maxWidth: '1100px', width: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        }}>
          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.5rem 1.25rem', borderRadius: '2rem',
              background: 'rgba(184,146,106,0.1)',
              border: '1px solid rgba(184,146,106,0.2)',
              color: '#b8926a',
              fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', marginBottom: '3.5rem',
            }}
          >
            <Sparkles size={12} />
            Powered by Gemini 2.0 Flash
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.3, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(3.5rem, 9vw, 7rem)',
              fontWeight: 400,
              lineHeight: 1.0,
              color: 'var(--eg-fg)',
              letterSpacing: '-0.025em',
              marginBottom: '2.5rem',
            }}
          >
            Your love story,<br />
            <span style={{ fontStyle: 'italic', color: '#b8926a' }}>beautifully told.</span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            style={{
              fontSize: '1.2rem', fontWeight: 300, lineHeight: 1.7,
              color: '#8c8c8c', maxWidth: '560px',
              fontFamily: 'var(--eg-font-body)', marginBottom: '4.5rem',
            }}
          >
            Connect Google Photos. Tell us your vibe. Our AI Memory Engine crafts a magazine-quality anniversary or wedding site in under 90 seconds.
          </motion.p>

          {/* CTA cluster */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}
          >
            <button
              onClick={handleSignIn}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.85rem',
                padding: '1.2rem 3.5rem', borderRadius: '4rem',
                background: '#1a1a1a', color: '#fff', fontSize: '1.05rem',
                fontWeight: 600, cursor: 'pointer', border: 'none',
                boxShadow: '0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
                letterSpacing: '0.01em',
                transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.04) translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 20px 50px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)';
              }}
            >
              {status === 'loading' ? (
                <Loader2 size={22} style={{ animation: 'spin 1.5s linear infinite' }} />
              ) : (
                <Camera size={22} />
              )}
              Start Building — It's Free
            </button>
            <p style={{ fontSize: '0.8rem', color: '#b0b0b0', letterSpacing: '0.02em' }}>
              Sign in with Google · No credit card required
            </p>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.9 }}
            style={{
              display: 'flex', gap: '3rem', marginTop: '6rem',
              padding: '2rem 3.5rem', background: 'rgba(255,255,255,0.7)',
              borderRadius: '100px', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
            }}
            className="flex-wrap justify-center"
          >
            {STATS.map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.8rem', fontWeight: 400, color: '#1a1a1a', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#8c8c8c', marginTop: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ padding: '8rem 2rem', background: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '7rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#b8926a' }}>
              The Platform
            </span>
            <h2 style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
              fontWeight: 400, color: '#1a1a1a', letterSpacing: '-0.02em',
              marginTop: '1.25rem', marginBottom: '1.5rem',
            }}>
              A completely new way to share memories
            </h2>
            <p style={{ color: '#8c8c8c', fontSize: '1.1rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.7 }}>
              No templates. No drag-and-drop. The AI reads your photos, learns your aesthetic, and publishes a site worthy of a design award.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.8, delay: i * 0.15 }}
                  style={{
                    background: '#faf9f6',
                    borderRadius: '1.25rem',
                    overflow: 'hidden',
                    border: '1px solid rgba(0,0,0,0.04)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease',
                    cursor: 'default',
                  }}
                  whileHover={{ y: -8, boxShadow: '0 20px 60px rgba(0,0,0,0.08)' }}
                >
                  {/* Photo card */}
                  <div style={{
                    height: '260px',
                    backgroundImage: `url("${f.image}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)',
                    }} />
                    <div style={{
                      position: 'absolute', bottom: '1.5rem', left: '1.5rem',
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)',
                      backdropFilter: 'blur(12px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}>
                      <Icon size={18} color="#fff" />
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '2rem 2rem 2.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#b8926a' }}>
                      {f.subtitle}
                    </span>
                    <h3 style={{
                      fontFamily: 'var(--eg-font-heading)',
                      fontSize: '1.5rem', fontWeight: 400, color: '#1a1a1a',
                      marginTop: '0.6rem', marginBottom: '0.75rem',
                    }}>
                      {f.title}
                    </h3>
                    <p style={{ color: '#8c8c8c', lineHeight: 1.75, fontSize: '0.95rem' }}>{f.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: '8rem 2rem', background: '#faf9f6' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#b8926a' }}>
            How It Works
          </span>
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.2rem, 4vw, 3rem)',
            fontWeight: 400, color: '#1a1a1a', letterSpacing: '-0.02em',
            marginTop: '1.25rem', marginBottom: '5rem',
          }}>
            From photos to published in 3 steps
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
            {[
              { step: '01', icon: Camera, title: 'Connect Your Photos', body: 'Link your Google Photos library or drag and drop directly from your computer. We accept up to 30 photos per site.' },
              { step: '02', icon: Sparkles, title: 'Describe Your Vibe', body: "Tell us the aesthetic, occasion, and personality of your relationship. Our wizard turns your words into a rich AI prompt." },
              { step: '03', icon: Globe, title: 'Publish in One Click', body: 'Claim a free .pearloom.app subdomain and your site is instantly live, shareable, and stunning.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.8 }}
                  style={{
                    display: 'flex', gap: '3rem', alignItems: 'center',
                    textAlign: 'left', flexDirection: i % 2 === 0 ? 'row' : 'row-reverse',
                  }}
                  className="max-md:flex-col max-md:text-center"
                >
                  <div style={{
                    flex: '0 0 auto', width: '90px', height: '90px', borderRadius: '50%',
                    border: '2px solid rgba(184,146,106,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <Icon size={32} color="#b8926a" />
                    <span style={{
                      position: 'absolute', top: '-6px', right: '-6px',
                      background: '#1a1a1a', color: '#fff',
                      width: '24px', height: '24px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700,
                    }}>{item.step}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.75rem', fontWeight: 400, color: '#1a1a1a', marginBottom: '0.75rem' }}>
                      {item.title}
                    </h3>
                    <p style={{ color: '#8c8c8c', lineHeight: 1.75, fontSize: '1rem' }}>{item.body}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <footer style={{ padding: '7rem 2rem 5rem', background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          style={{ maxWidth: '700px', margin: '0 auto' }}
        >
          <Layers size={40} color="rgba(255,255,255,0.15)" style={{ marginBottom: '2rem' }} />
          <h2 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: 400, letterSpacing: '-0.02em',
            marginBottom: '1.5rem', lineHeight: 1.1,
          }}>
            Ready to tell your story?
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.5)', marginBottom: '3.5rem', lineHeight: 1.6 }}>
            Join thousands of couples who&apos;ve shared their love story in minutes.
          </p>
          <button
            onClick={handleSignIn}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
              padding: '1.1rem 3rem', borderRadius: '4rem',
              background: '#b8926a', color: '#fff', fontSize: '1rem',
              fontWeight: 600, cursor: 'pointer', border: 'none',
              boxShadow: '0 10px 40px rgba(184,146,106,0.35)',
              transition: 'all 0.25s ease',
              letterSpacing: '0.01em',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.04) translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; }}
          >
            Sign in with Google
            <ArrowRight size={18} />
          </button>
          <p style={{ marginTop: '2.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em' }}>
            © 2026 Pearloom · Built by Pixel Boba Studio
          </p>
        </motion.div>
      </footer>
    </div>
  );
}
