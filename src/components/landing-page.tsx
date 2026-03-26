'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/landing-page.tsx
// High-Fidelity App Story Landing Page
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Camera, Sparkles, LogIn, Loader2, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface LandingPageProps {
  handleSignIn: () => void;
  status: 'authenticated' | 'loading' | 'unauthenticated';
}

export function LandingPage({ handleSignIn, status }: LandingPageProps) {
  return (
    <div style={{ backgroundColor: '#faf9f6', minHeight: '100vh', overflow: 'hidden' }}>
      
      {/* ── HERO ── */}
      <section style={{ 
        position: 'relative', 
        height: '90vh', 
        minHeight: '700px',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '0 2rem',
        overflow: 'hidden'
      }}>
        {/* Abstract shapes / orbs */}
        <div style={{ 
          position: 'absolute', top: '10%', left: '-5%', width: '50vw', height: '50vw', 
          background: 'radial-gradient(circle, var(--eg-accent-light) 0%, transparent 60%)', 
          opacity: 0.6, pointerEvents: 'none' 
        }} />
        <div style={{ 
          position: 'absolute', bottom: '10%', right: '-10%', width: '60vw', height: '60vw', 
          background: 'radial-gradient(circle, #e8dccb 0%, transparent 60%)', 
          opacity: 0.4, pointerEvents: 'none' 
        }} />

        <div style={{ 
          position: 'relative', zIndex: 10, maxWidth: '1000px', width: '100%', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
        }}>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 1rem', borderRadius: '2rem',
              background: 'rgba(184, 146, 106, 0.1)', color: 'var(--eg-accent)',
              fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em',
              textTransform: 'uppercase', marginBottom: '3rem'
            }}
          >
            <Sparkles size={14} /> The AI Memory Engine
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: 'var(--eg-font-heading)',
              fontSize: 'clamp(3.5rem, 8vw, 6rem)',
              fontWeight: 400,
              lineHeight: 1.05,
              color: 'var(--eg-fg)',
              letterSpacing: '-0.02em',
              marginBottom: '2rem',
            }}
          >
            Your love story, <br />
            <span style={{ fontStyle: 'italic', color: 'var(--eg-accent)' }}>beautifully told.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            style={{
              fontSize: '1.25rem',
              fontWeight: 300,
              lineHeight: 1.6,
              color: 'var(--eg-muted)',
              maxWidth: '600px',
              fontFamily: 'var(--eg-font-body)',
              marginBottom: '4rem'
            }}
          >
            Connect your Google Photos, tell us your vibe, and let our Memory Engine instantly craft a magazine-quality wedding or anniversary site.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
          >
            <button
              onClick={handleSignIn}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
                padding: '1.25rem 3rem', borderRadius: '4rem',
                background: 'var(--eg-fg)', color: '#fff', fontSize: '1.1rem',
                fontWeight: 500, cursor: 'pointer', border: 'none',
                boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
            >
              {status === 'loading' ? (
                <Loader2 size={24} style={{ animation: 'spin 1.5s linear infinite' }} />
              ) : (
                <Camera size={24} />
              )}
              Start Building — It's Free
            </button>
            <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--eg-muted)' }}>
              Requires Google Login for Photos library access.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── SHOWCASE GRID ── */}
      <section style={{ padding: '8rem 2rem', background: '#ffffff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--eg-fg)' }}>
              The Pearloom Experience
            </h2>
            <p style={{ color: 'var(--eg-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
              We've completely rethought how you share your memories. No drag-and-drop templates. No complicated text boxes. 
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
            {/* Feature 1 */}
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8 }}>
              <div style={{ 
                height: '300px', background: '#f5f5f5', borderRadius: '1rem', marginBottom: '1.5rem',
                backgroundImage: 'url("https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800")',
                backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid rgba(0,0,0,0.04)'
              }} />
              <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--eg-fg)' }}>Seamless Google Sync</h3>
              <p style={{ color: 'var(--eg-muted)', lineHeight: 1.6 }}>Simply select your favorite photos directly from your Google Photos library. No need to download, compress, or manually organize anything.</p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, delay: 0.2 }}>
              <div style={{ 
                height: '300px', background: '#f5f5f5', borderRadius: '1rem', marginBottom: '1.5rem',
                backgroundImage: 'url("https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800")',
                backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid rgba(0,0,0,0.04)'
              }} />
              <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--eg-fg)' }}>AI Memory Engine</h3>
              <p style={{ color: 'var(--eg-muted)', lineHeight: 1.6 }}>Our AI analyzes your photos' dates and locations, paired with your "wedding vibe", to automatically write your story and format an editorial timeline.</p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-100px' }} transition={{ duration: 0.8, delay: 0.4 }}>
              <div style={{ 
                height: '300px', background: '#f5f5f5', borderRadius: '1rem', marginBottom: '1.5rem',
                backgroundImage: 'url("https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&q=80&w=800")',
                backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid rgba(0,0,0,0.04)'
              }} />
              <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--eg-fg)' }}>Magazine Quality</h3>
              <p style={{ color: 'var(--eg-muted)', lineHeight: 1.6 }}>The final product is a completely stunning, mobile-responsive editorial spread rivaling Vogue layout designers—instantly generated for you.</p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* ── FOOTER ── */}
      <footer style={{ padding: '6rem 2rem', background: '#1a1a1a', color: '#fff', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2.5rem', marginBottom: '2rem' }}>Ready for your story?</h2>
        <button
          onClick={handleSignIn}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.75rem',
            padding: '1rem 2.5rem', borderRadius: '2rem',
            background: 'var(--eg-accent)', color: '#fff', fontSize: '1rem',
            fontWeight: 500, cursor: 'pointer', border: 'none',
          }}
        >
          Sign In width Google <ArrowRight size={18} />
        </button>
      </footer>
    </div>
  );
}
