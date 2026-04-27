'use client';

// FAQ — 8 questions with plus-sign that rotates 45° to close.
// Groovy palette (paper3 bg, olive accent on open). Matches
// design bundle's faq.jsx.

import { useState } from 'react';
import { Bloom, Sparkle } from '@/components/brand/groove';
import { Ornament, Pill, PD, DISPLAY_STYLE } from './DesignAtoms';

const QS = [
  {
    q: 'What does Pear actually do?',
    a: 'Pear is our in-house planner. She drafts your whole site from three questions and a few photos, in your voice and the tone the occasion deserves. Then she stays with you, handling the timeline, the guest list, the budget, and the day-of room. She is not a button. She is a person who happens to run on a lot of code.',
  },
  {
    q: 'Is the first site really free, forever?',
    a: 'Yes. Journal is free. One site, every block it needs, all 28 occasions, unlimited RSVPs, and The Reel. No card to start, no expiry, no trial. Your first celebration is our gift.',
  },
  {
    q: 'Can I use my own domain?',
    a: 'On Atelier and Legacy, yes. Bring any domain. It takes about ninety seconds, HTTPS is automatic, and Pear handles the DNS copy-paste for you.',
  },
  {
    q: 'What happens on the day of the event?',
    a: 'Pearloom becomes a room. Announcements push to guests. Voice toasts collect in a moderated stream. The run-of-show sits beside the seating plan and the live photo wall. If something drifts off schedule, Pear re-threads it quietly.',
  },
  {
    q: 'What happens after?',
    a: "Photos file themselves into The Reel, one gallery across every site you've made. On your anniversary, the site returns with a highlight reel auto-cut from the weekend. Your site is yours to keep.",
  },
  {
    q: 'Is memorial hosting really always free?',
    a: "Always, on every tier. Every block, every feature, no asterisk. Grief deserves no paywall. This is Pear's promise.",
  },
  {
    q: 'How is my data handled?',
    a: 'GDPR and CCPA compliant, your choice of EU or US regions, nothing is ever sold. Delete a site and every byte is gone within thirty days, verified. Your photos are yours. They are never used to train anything.',
  },
  {
    q: 'Can co-hosts edit?',
    a: 'Yes. Invite a maid of honor to run the shower, a best man for the bachelor weekend, parents for the rehearsal dinner. Co-host roles and invite tokens keep edits clean and moderated.',
  },
];

export function DesignFAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section
      id="journal"
      style={{
        padding: '120px 24px',
        background: PD.paper3,
        borderTop: '1px solid rgba(31,36,24,0.1)',
        borderBottom: '1px solid rgba(31,36,24,0.1)',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', top: 40, right: 60, opacity: 0.4 }} aria-hidden>
        <Sparkle size={30} color={PD.gold} />
      </div>
      <div style={{ position: 'absolute', bottom: 60, left: 80, opacity: 0.4 }} aria-hidden>
        <Bloom size={90} color={PD.pear} centerColor={PD.olive} speed={9} />
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Pill style={{ marginBottom: 16 }}>
            <Ornament size={12} color={PD.olive} /> THE SMALL PRINT
          </Pill>
          <h2
            style={{
              ...DISPLAY_STYLE,
              fontSize: 'clamp(40px, 5.5vw, 72px)',
              lineHeight: 0.95,
              margin: 0,
              fontWeight: 400,
              letterSpacing: '-0.025em',
              color: PD.ink,
            }}
          >
            Questions,{' '}
            <span
              style={{
                fontStyle: 'italic',
                color: PD.olive,
                fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
              }}
            >
              answered.
            </span>
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {QS.map((x, i) => {
            const isOpen = open === i;
            return (
              <div
                key={x.q}
                onClick={() => setOpen(isOpen ? -1 : i)}
                style={{
                  borderTop: '1px solid rgba(31,36,24,0.15)',
                  padding: '24px 4px',
                  cursor: 'pointer',
                  borderBottom: i === QS.length - 1 ? '1px solid rgba(31,36,24,0.15)' : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      ...DISPLAY_STYLE,
                      fontSize: 22,
                      fontWeight: 400,
                      fontStyle: isOpen ? 'italic' : 'normal',
                      color: isOpen ? PD.olive : PD.ink,
                      letterSpacing: '-0.01em',
                      fontVariationSettings: isOpen
                        ? '"opsz" 144, "SOFT" 80, "WONK" 1'
                        : '"opsz" 144, "SOFT" 80, "WONK" 0',
                    }}
                  >
                    {x.q}
                  </div>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      border: '1px solid rgba(31,36,24,0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      color: PD.ink,
                      flexShrink: 0,
                      transform: isOpen ? 'rotate(45deg)' : 'rotate(0)',
                      transition: 'transform 200ms',
                    }}
                  >
                    +
                  </div>
                </div>
                {isOpen && (
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 16,
                      lineHeight: 1.6,
                      color: PD.inkSoft,
                      maxWidth: 780,
                      fontFamily: 'var(--pl-font-body)',
                    }}
                  >
                    {x.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
