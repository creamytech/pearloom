'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/event-logistics.tsx
// Fully functional RSVP and Cash Fund / Registry Integration
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, CheckCircle2, Gift, Loader2 } from 'lucide-react';
import type { StoryManifest } from '@/types';

export function EventLogistics({ manifest, siteId }: { manifest: StoryManifest, siteId: string }) {
  const { logistics, registry } = manifest;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [attending, setAttending] = useState<boolean | null>(null);
  const [dietary, setDietary] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  if (!logistics?.venue && !registry?.cashFundUrl) return null;

  const handleRSVP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attending === null || !name || !email) return;
    
    setStatus('loading');
    try {
      const res = await fetch('/api/sites/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          name,
          email,
          attending,
          dietary
        }),
      });
      if (!res.ok) throw new Error('RSVP failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section 
      style={{ 
        background: 'var(--eg-card-bg, #ffffff)', 
        padding: '8rem 2rem', 
        borderTop: '1px solid rgba(0,0,0,0.05)',
        position: 'relative' 
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ 
          fontFamily: 'var(--eg-font-heading)', 
          fontSize: '3rem', 
          textAlign: 'center', 
          marginBottom: '4rem',
          color: 'var(--eg-fg)' 
        }}>
          Event Details
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem' }}>
          
          {/* LOGISTICS BLOCK */}
          {logistics?.venue && (
            <div style={{ background: 'var(--eg-card-bg)', padding: '3rem', borderRadius: 'var(--eg-radius)', boxShadow: 'var(--eg-card-shadow)', border: 'var(--eg-card-border)', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <Calendar color="var(--eg-accent)" style={{ marginTop: '0.2rem' }} />
                  <div>
                    <h4 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.25rem', fontWeight: 600 }}>When</h4>
                    <p style={{ color: 'var(--eg-muted)', marginTop: '0.5rem' }}>{logistics.date}</p>
                    {logistics.time && <p style={{ color: 'var(--eg-muted)' }}>{logistics.time}</p>}
                  </div>
                </div>
                
                <div style={{ width: '100%', height: '1px', background: 'rgba(0,0,0,0.05)' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <MapPin color="var(--eg-accent)" style={{ marginTop: '0.2rem' }} />
                  <div>
                    <h4 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.25rem', fontWeight: 600 }}>Where</h4>
                    <p style={{ color: 'var(--eg-muted)', marginTop: '0.5rem' }}>{logistics.venue}</p>
                  </div>
                </div>

                {registry?.cashFundUrl && (
                  <>
                    <div style={{ width: '100%', height: '1px', background: 'rgba(0,0,0,0.05)' }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                      <Gift color="var(--eg-accent)" style={{ marginTop: '0.2rem' }} />
                      <div>
                        <h4 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.25rem', fontWeight: 600 }}>Registry</h4>
                        <p style={{ color: 'var(--eg-muted)', margin: '0.5rem 0 1rem' }}>Your presence is enough, but if you wish to contribute to our future:</p>
                        <a 
                          href={registry.cashFundUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ 
                            display: 'inline-block',
                            padding: '0.5rem 1rem', 
                            background: 'var(--eg-accent-light, #EEE8DC)', 
                            color: 'var(--eg-accent, #A3B18A)',
                            borderRadius: '0.5rem',
                            fontWeight: 500,
                            textDecoration: 'none'
                          }}
                        >
                          Contribute Fund
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* RSVP FORM */}
          {logistics?.rsvpDeadline && (
            <div style={{ background: 'var(--eg-card-bg)', padding: '3rem', borderRadius: 'var(--eg-radius)', boxShadow: 'var(--eg-card-shadow)', border: 'var(--eg-card-border)', backdropFilter: 'blur(10px)' }}>
              <h3 style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '2rem', marginBottom: '0.5rem' }}>RSVP</h3>
              <p style={{ color: 'var(--eg-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Kindly reply by {logistics.rsvpDeadline}</p>
              
              {status === 'success' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--eg-accent)' }}
                >
                  <CheckCircle2 size={48} style={{ margin: '0 auto 1rem' }} />
                  <p style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.5rem' }}>Thank you!</p>
                  <p style={{ color: 'var(--eg-muted)', fontSize: '0.9rem' }}>Your RSVP has been received.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleRSVP} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <input 
                    required 
                    type="text" 
                    placeholder="Full Name" 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    style={{ width: '100%', padding: '1rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'calc(var(--eg-radius) / 2)', fontFamily: 'var(--eg-font-body)' }}
                  />
                  <input 
                    required 
                    type="email" 
                    placeholder="Email Address" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '1rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'calc(var(--eg-radius) / 2)', fontFamily: 'var(--eg-font-body)' }}
                  />
                  
                  <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0' }}>
                    <button 
                      type="button"
                      onClick={() => setAttending(true)}
                      style={{ 
                        flex: 1, padding: '1rem', borderRadius: 'calc(var(--eg-radius) / 2)', cursor: 'pointer',
                        border: `2px solid ${attending === true ? 'var(--eg-accent)' : 'rgba(0,0,0,0.1)'}`,
                        background: attending === true ? 'var(--eg-accent-light)' : 'transparent',
                        color: 'var(--eg-fg)', fontWeight: 500
                      }}
                    >
                      Joyfully Accept
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAttending(false)}
                      style={{ 
                        flex: 1, padding: '1rem', borderRadius: 'calc(var(--eg-radius) / 2)', cursor: 'pointer',
                        border: `2px solid ${attending === false ? '#ff4d4f' : 'rgba(0,0,0,0.1)'}`,
                        background: attending === false ? '#fff1f0' : 'transparent',
                        color: 'var(--eg-fg)', fontWeight: 500
                      }}
                    >
                      Regretfully Decline
                    </button>
                  </div>
                  
                  {attending && (
                    <textarea 
                      placeholder="Dietary Restrictions or Notes" 
                      value={dietary}
                      onChange={e => setDietary(e.target.value)}
                      rows={2}
                      style={{ width: '100%', padding: '1rem', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 'calc(var(--eg-radius) / 2)', fontFamily: 'var(--eg-font-body)', resize: 'vertical' }}
                    />
                  )}

                  <button 
                    type="submit" 
                    disabled={status === 'loading' || attending === null}
                    style={{ 
                      width: '100%', padding: '1.25rem', background: 'var(--eg-fg)', color: '#fff', 
                      borderRadius: '0.5rem', border: 'none', fontWeight: 600, cursor: 'pointer',
                      opacity: attending === null ? 0.5 : 1, transition: 'opacity 0.2s', marginTop: '1rem'
                    }}
                  >
                    {status === 'loading' ? <Loader2 className="animate-spin m-auto" /> : 'Send RSVP'}
                  </button>
                  {status === 'error' && <p style={{ color: '#ff4d4f', fontSize: '0.85rem', textAlign: 'center' }}>Something went wrong. Please try again.</p>}
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
