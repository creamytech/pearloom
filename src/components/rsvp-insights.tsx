'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/rsvp-insights.tsx
// RSVP Intelligence Dashboard — attendance stats, prediction,
// meal breakdown, per-event view, and follow-up email drafter.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import { Mail, Copy, Check, Users, UserCheck, UserX, Clock } from 'lucide-react';
import type { RsvpResponse, WeddingEvent } from '@/types';

// ── CSS Keyframes (injected once) ─────────────────────────────
const KEYFRAMES_ID = 'pearloom-rsvp-insights-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes ri-fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes ri-scaleIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes ri-ringDraw {
      from { stroke-dashoffset: var(--ri-circumference); }
      to { stroke-dashoffset: var(--ri-offset); }
    }
  `;
  document.head.appendChild(style);
}

// ── SVG Donut Chart ───────────────────────────────────────────
function DonutChart({ value, total, color, size = 64 }: { value: number; total: number; color: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? value / total : 0;
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      {/* Background ring */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6"
      />
      {/* Value ring */}
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{
          '--ri-circumference': `${circumference}`,
          '--ri-offset': `${offset}`,
          animation: 'ri-ringDraw 1s ease-out 0.3s both',
        } as React.CSSProperties}
      />
    </svg>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ label, value, total, color, icon: Icon, delay = 0 }: {
  label: string; value: number; total: number; color: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  delay?: number;
}) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.50)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      padding: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      animation: `ri-fadeInUp 0.5s ease-out ${delay}s both`,
    }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <DonutChart value={value} total={total} color={color} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div>
        <div style={{
          fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
          fontWeight: 800,
          color: 'var(--pl-ink, #1A1A1A)',
          lineHeight: 1.1,
        }}>
          {value}
        </div>
        <div style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--pl-muted, #9A9488)',
          marginTop: '2px',
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Horizontal Stacked Bar ────────────────────────────────────
function StackedBar({ segments, height = 28 }: {
  segments: Array<{ label: string; value: number; color: string }>;
  height?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  return (
    <div>
      <div style={{
        display: 'flex',
        borderRadius: `${height / 2}px`,
        overflow: 'hidden',
        height: `${height}px`,
        background: 'rgba(255,255,255,0.1)',
      }}>
        {segments.map((seg, i) => {
          const pct = (seg.value / total) * 100;
          if (pct === 0) return null;
          return (
            <div key={i} style={{
              width: `${pct}%`,
              background: seg.color,
              transition: 'width 0.6s ease-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: pct > 8 ? 'auto' : '0',
            }}>
              {pct > 12 && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  whiteSpace: 'nowrap',
                }}>
                  {seg.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.65rem' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: seg.color }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--pl-muted, #9A9488)' }}>
              {seg.label} ({seg.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
interface RsvpInsightsProps {
  rsvps: RsvpResponse[];
  totalInvited: number;
  events: WeddingEvent[];
  coupleNames?: string;
  eventDate?: string;
  occasion?: string;
}

export function RsvpInsights({ rsvps, totalInvited, events, coupleNames, eventDate, occasion }: RsvpInsightsProps) {
  const [followUp, setFollowUp] = useState<{ subject: string; body: string } | null>(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { injectKeyframes(); }, []);

  // ── Compute stats ──
  const stats = useMemo(() => {
    const attending = rsvps.filter(r => r.status === 'attending');
    const declined = rsvps.filter(r => r.status === 'declined');
    const pending = rsvps.filter(r => r.status === 'pending');

    // Predicted: attending + 70% of pending
    const predictedCount = Math.round(attending.length + pending.length * 0.7);

    // Meal breakdown
    const mealMap = new Map<string, number>();
    for (const r of attending) {
      const meal = r.mealPreference || 'Not specified';
      mealMap.set(meal, (mealMap.get(meal) || 0) + 1);
    }

    // Per-event attendance
    const eventStats = events.map(evt => {
      const eventRsvps = rsvps.filter(r => r.eventIds.includes(evt.id) && r.status === 'attending');
      return { event: evt, count: eventRsvps.length };
    });

    return { attending, declined, pending, predictedCount, mealMap, eventStats };
  }, [rsvps, events]);

  // Meal bar chart segments
  const mealColors = ['#5C6B3F', '#C4A265', '#8B6F8E', '#6B9BD2', '#D4836D', '#7DB8A5', '#B5A0D1'];
  const mealSegments = Array.from(stats.mealMap.entries()).map(([label, value], i) => ({
    label, value, color: mealColors[i % mealColors.length],
  }));

  // ── Follow-up email drafter ──
  const handleDraftFollowUp = async () => {
    const pendingNames = stats.pending.map(r => r.guestName);
    if (pendingNames.length === 0) return;

    setFollowUpLoading(true);
    setFollowUpError('');
    setFollowUp(null);

    try {
      const res = await fetch('/api/ai-followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestNames: pendingNames,
          coupleNames: coupleNames || 'The Couple',
          eventDate,
          occasion: occasion || 'wedding',
          tone: 'warm',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFollowUpError(data.error || 'Failed to generate email');
        return;
      }

      const data = await res.json();
      setFollowUp(data);
    } catch {
      setFollowUpError('Failed to generate email. Please try again.');
    } finally {
      setFollowUpLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!followUp) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${followUp.subject}\n\n${followUp.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = `Subject: ${followUp.subject}\n\n${followUp.body}`;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (rsvps.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Stat cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem',
      }}>
        <StatCard
          label="Attending" value={stats.attending.length} total={totalInvited}
          color="#5C6B3F" icon={UserCheck} delay={0}
        />
        <StatCard
          label="Declined" value={stats.declined.length} total={totalInvited}
          color="#D4836D" icon={UserX} delay={0.1}
        />
        <StatCard
          label="Pending" value={stats.pending.length} total={totalInvited}
          color="#C4A265" icon={Clock} delay={0.2}
        />
      </div>

      {/* Predicted Final Count */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(163, 177, 138, 0.15), rgba(163, 177, 138, 0.05))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '16px',
        border: '1px solid rgba(163, 177, 138, 0.25)',
        padding: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        animation: 'ri-fadeInUp 0.5s ease-out 0.3s both',
      }}>
        <div>
          <div style={{
            fontSize: '0.68rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em',
            color: 'var(--pl-olive, #5C6B3F)',
            marginBottom: '4px',
          }}>
            Predicted Final Count
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--pl-muted, #9A9488)',
            lineHeight: 1.4,
          }}>
            Based on {stats.attending.length} confirmed + 70% of {stats.pending.length} pending
          </div>
        </div>
        <div style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.4rem)',
          fontWeight: 800,
          color: 'var(--pl-ink, #1A1A1A)',
          minWidth: '60px',
          textAlign: 'right',
        }}>
          {stats.predictedCount}
        </div>
      </div>

      {/* Meal Breakdown */}
      {mealSegments.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.50)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          padding: '1.25rem',
          animation: 'ri-fadeInUp 0.5s ease-out 0.4s both',
        }}>
          <div style={{
            fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--pl-muted, #9A9488)',
            marginBottom: '0.85rem',
          }}>
            Meal Preferences
          </div>
          <StackedBar segments={mealSegments} />
        </div>
      )}

      {/* Per-Event Attendance */}
      {stats.eventStats.length > 1 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.50)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          padding: '1.25rem',
          animation: 'ri-fadeInUp 0.5s ease-out 0.5s both',
        }}>
          <div style={{
            fontSize: '0.72rem', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--pl-muted, #9A9488)',
            marginBottom: '0.85rem',
          }}>
            Per-Event Attendance
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {stats.eventStats.map((es, i) => {
              const pct = totalInvited > 0 ? (es.count / totalInvited) * 100 : 0;
              return (
                <div key={es.event.id} style={{
                  animation: `ri-scaleIn 0.4s ease-out ${0.5 + i * 0.1}s both`,
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    marginBottom: '4px',
                  }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--pl-ink, #1A1A1A)' }}>
                      {es.event.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--pl-muted, #9A9488)' }}>
                      {es.count} / {totalInvited}
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: '4px',
                      background: 'linear-gradient(90deg, #5C6B3F, #C4A265)',
                      transition: 'width 0.6s ease-out',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Follow-Up Email Drafter */}
      {stats.pending.length > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.50)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          padding: '1.25rem',
          animation: 'ri-fadeInUp 0.5s ease-out 0.6s both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: followUp ? '1rem' : '0',
          }}>
            <div>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--pl-muted, #9A9488)',
              }}>
                Follow-Up Reminder
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--pl-muted, #9A9488)',
                marginTop: '2px',
              }}>
                {stats.pending.length} guest{stats.pending.length !== 1 ? 's' : ''} haven&apos;t responded
              </div>
            </div>
            {!followUp && (
              <button
                onClick={handleDraftFollowUp}
                disabled={followUpLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(163, 177, 138, 0.35)',
                  background: followUpLoading ? 'rgba(163, 177, 138, 0.05)' : 'rgba(163, 177, 138, 0.12)',
                  color: 'var(--pl-olive, #5C6B3F)',
                  cursor: followUpLoading ? 'wait' : 'pointer',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  transition: 'background var(--pl-dur-instant)',
                }}
              >
                {followUpLoading ? (
                  <>
                    <div style={{
                      width: '14px', height: '14px',
                      border: '2px solid rgba(163, 177, 138, 0.2)',
                      borderTopColor: 'var(--pl-olive, #5C6B3F)',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Drafting...
                  </>
                ) : (
                  <>
                    <Mail size={13} />
                    Draft Follow-Up Email
                  </>
                )}
              </button>
            )}
          </div>

          {followUpError && (
            <p style={{ fontSize: '0.78rem', color: '#D4836D', margin: '0.5rem 0 0' }}>
              {followUpError}
            </p>
          )}

          {followUp && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '1rem',
              animation: 'ri-scaleIn 0.4s ease-out both',
            }}>
              {/* Subject */}
              <div style={{
                fontSize: '0.72rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--pl-olive, #5C6B3F)',
                marginBottom: '4px',
              }}>
                Subject
              </div>
              <div style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--pl-ink, #1A1A1A)',
                marginBottom: '1rem',
              }}>
                {followUp.subject}
              </div>

              {/* Body */}
              <div style={{
                fontSize: '0.72rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--pl-olive, #5C6B3F)',
                marginBottom: '4px',
              }}>
                Body
              </div>
              <div style={{
                fontSize: '0.84rem',
                color: 'var(--pl-ink, #1A1A1A)',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                opacity: 0.85,
              }}>
                {followUp.body}
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex', gap: '0.5rem',
                marginTop: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingTop: '0.85rem',
              }}>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(163, 177, 138, 0.35)',
                    background: copied ? 'rgba(163, 177, 138, 0.2)' : 'rgba(163, 177, 138, 0.1)',
                    color: 'var(--pl-olive, #5C6B3F)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    transition: 'all var(--pl-dur-instant)',
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                <button
                  onClick={() => { setFollowUp(null); setFollowUpError(''); }}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'var(--pl-muted, #9A9488)',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
