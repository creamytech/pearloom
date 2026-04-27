'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PD, DISPLAY_STYLE, MONO_STYLE } from '../design/DesignAtoms';

const FAQS = [
  {
    q: 'What is Pearloom?',
    a: 'Pearloom is an event operating system — a craft house for the days that matter. We help you plan, run, and remember weddings, reunions, memorials, birthdays, and every milestone in between, all in one place.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes. Our Starter plan is always free and gives you enough to build a beautiful one-page site with RSVP and photo sharing. Upgrade when you want multi-day events, vendor coordination, or custom domains.',
  },
  {
    q: 'Can I use my own domain?',
    a: 'Yes — on our Essentials plan and above. Bring your own domain or pick a pearloom.com/yourname address; both are free of our branding.',
  },
  {
    q: 'Can I export my guest list?',
    a: 'Always. Your guest list, RSVPs, and messages export to CSV at any time. It is your data, not ours.',
  },
  {
    q: 'Do you offer customer support?',
    a: 'Yes — on every plan. Email support for Starter, priority chat for Essentials, and dedicated onboarding for Professional and Enterprise.',
  },
];

const TESTIMONIAL_IMAGE =
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80';

export function LandingProof() {
  return (
    <section
      style={{
        padding: '60px 40px',
        background: PD.paper,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 20,
        }}
        className="pl-proof-grid"
      >
        <Testimonial />
        <FAQ />
      </div>

      <style jsx>{`
        @media (max-width: 960px) {
          :global(.pl-proof-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

function Testimonial() {
  return (
    <div
      style={{
        background: PD.paperCard,
        borderRadius: 24,
        padding: 32,
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            ...MONO_STYLE,
            fontSize: 10.5,
            color: '#6E5BA8',
            letterSpacing: '0.26em',
            marginBottom: 18,
          }}
        >
          LOVED BY PEOPLE WHO PLAN
        </div>
        <blockquote
          style={{
            ...DISPLAY_STYLE,
            fontStyle: 'italic',
            fontSize: 'clamp(18px, 1.8vw, 22px)',
            fontWeight: 400,
            lineHeight: 1.4,
            margin: '0 0 20px',
            letterSpacing: '-0.01em',
            fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
            color: PD.ink,
          }}
        >
          &ldquo;Pearloom brought clarity to our chaos. Our guests felt so taken care of, and
          we could actually enjoy our day.&rdquo;
        </blockquote>
        <div style={{ fontSize: 13, color: PD.inkSoft }}>
          <div style={{ fontWeight: 500, color: PD.ink, marginBottom: 2 }}>
            — Amanda &amp; James
          </div>
          Married June 2024
        </div>
      </div>
      <div
        style={{
          width: 140,
          height: 180,
          flexShrink: 0,
          position: 'relative',
          borderRadius: 12,
          overflow: 'hidden',
        }}
        className="pl-proof-image"
      >
        <Image
          src={TESTIMONIAL_IMAGE}
          alt=""
          fill
          sizes="140px"
          style={{ objectFit: 'cover' }}
        />
      </div>
      <style jsx>{`
        @media (max-width: 540px) {
          :global(.pl-proof-image) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div
      style={{
        background: PD.paperCard,
        borderRadius: 24,
        padding: 32,
        border: '1px solid rgba(31,36,24,0.06)',
      }}
    >
      <div
        style={{
          ...MONO_STYLE,
          fontSize: 10.5,
          color: '#6E5BA8',
          letterSpacing: '0.26em',
          marginBottom: 18,
        }}
      >
        FREQUENTLY ASKED QUESTIONS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} style={{ borderBottom: '1px solid rgba(31,36,24,0.08)' }}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 14.5,
                  color: PD.ink,
                  textAlign: 'left',
                  fontWeight: 500,
                }}
              >
                <span>{f.q}</span>
                <span style={{ fontSize: 16, color: PD.inkSoft, flexShrink: 0, marginLeft: 14 }}>
                  {isOpen ? '−' : '+'}
                </span>
              </button>
              {isOpen && (
                <div
                  style={{
                    padding: '0 4px 18px',
                    fontSize: 13.5,
                    color: PD.inkSoft,
                    lineHeight: 1.55,
                    maxWidth: 520,
                  }}
                >
                  {f.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
