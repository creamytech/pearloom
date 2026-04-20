'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VibeSkin } from '@/lib/vibe-engine';

export interface SeatFinderProps {
  siteId: string;
  subdomain: string;
  vibeSkin?: VibeSkin;
}

type State = 'idle' | 'loading' | 'found' | 'not-found';

interface SeatingResult {
  found: true;
  table: { label: string; shape: string; notes: string | null };
  seat: { seatNumber: number; mealPreference: string | null };
}

export function SeatFinder({ siteId: _siteId, subdomain, vibeSkin: _vibeSkin }: SeatFinderProps) {
  const [name, setName] = useState('');
  const [state, setState] = useState<State>('idle');
  const [result, setResult] = useState<SeatingResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setState('loading');
    setResult(null);

    try {
      const res = await fetch('/api/seating/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, name: name.trim() }),
      });

      if (!res.ok) {
        setState('not-found');
        return;
      }

      const data = await res.json();
      if (data.found) {
        setResult(data as SeatingResult);
        setState('found');
      } else {
        setState('not-found');
      }
    } catch {
      setState('not-found');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--pl-cream, #fff)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '1.5rem',
          padding: '2.5rem',
          boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
        }}
      >
        {/* Heading */}
        <h2
          style={{
            fontFamily: 'var(--pl-font-heading, Georgia, serif)',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--pl-ink, #1a1a1a)',
            marginBottom: '0.5rem',
            marginTop: 0,
            textAlign: 'center',
          }}
        >
          Find Your Seat
        </h2>
        <p
          style={{
            fontSize: '0.9rem',
            color: 'var(--pl-muted, #888)',
            textAlign: 'center',
            marginBottom: '1.75rem',
            marginTop: 0,
          }}
        >
          Enter your name to find your table assignment.
        </p>

        {/* Search form */}
        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            disabled={state === 'loading'}
            style={{
              width: '100%',
              padding: '0.875rem 1.25rem',
              borderRadius: '0.75rem',
              border: '1.5px solid rgba(0,0,0,0.12)',
              fontSize: '1rem',
              color: 'var(--pl-ink, #1a1a1a)',
              background: 'var(--pl-cream, #fff)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color var(--pl-dur-fast)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--pl-olive, #5C6B3F)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)';
            }}
          />
          <button
            type="submit"
            disabled={state === 'loading' || !name.trim()}
            style={{
              background: 'var(--pl-olive, #5C6B3F)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--pl-radius-full)',
              padding: '0.875rem 2rem',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: state === 'loading' || !name.trim() ? 'not-allowed' : 'pointer',
              opacity: state === 'loading' || !name.trim() ? 0.65 : 1,
              transition: 'opacity 0.2s, transform 0.15s',
              width: '100%',
            }}
            onMouseOver={(e) => {
              if (state !== 'loading' && name.trim()) {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)';
              }
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            }}
          >
            {state === 'loading' ? 'Searching…' : 'Find My Seat'}
          </button>
        </form>

        {/* Result */}
        <AnimatePresence mode="popLayout">
          {state === 'found' && result && (
            <motion.div
              key="found"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginTop: '2rem' }}
            >
              <div
                style={{
                  background: 'rgba(163,177,138,0.08)',
                  border: '1.5px solid rgba(163,177,138,0.3)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--pl-muted, #888)',
                    marginBottom: '0.5rem',
                  }}
                >
                  Your Table
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--pl-font-heading, Georgia, serif)',
                    fontSize: '2rem',
                    fontWeight: 700,
                    fontStyle: 'italic',
                    color: 'var(--pl-ink, #1a1a1a)',
                    margin: '0 0 0.75rem 0',
                    lineHeight: 1.2,
                  }}
                >
                  {result.table.label}
                </h3>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--pl-ink, #1a1a1a)',
                      fontWeight: 600,
                    }}
                  >
                    Seat {result.seat.seatNumber}
                  </span>

                  {result.seat.mealPreference && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--pl-radius-full)',
                        background: 'var(--pl-olive, #5C6B3F)',
                        color: '#fff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'capitalize',
                      }}
                    >
                      {result.seat.mealPreference}
                    </span>
                  )}
                </div>

                {result.table.notes && (
                  <p
                    style={{
                      fontSize: '0.85rem',
                      color: 'var(--pl-muted, #888)',
                      marginTop: '0.75rem',
                      marginBottom: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {result.table.notes}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {state === 'not-found' && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              style={{ marginTop: '2rem' }}
            >
              <div
                style={{
                  background: 'rgba(0,0,0,0.03)',
                  border: '1.5px solid rgba(0,0,0,0.08)',
                  borderRadius: '1rem',
                  padding: '1.25rem 1.5rem',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: '0.92rem',
                    color: 'var(--pl-muted, #888)',
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  We couldn&apos;t find your name. Check with the couple or wedding coordinator.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
