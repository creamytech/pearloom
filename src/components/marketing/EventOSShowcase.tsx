'use client';

// ─────────────────────────────────────────────────────────────
// Pearloom / components/marketing/EventOSShowcase.tsx
//
// The new marketing section that explains what Pearloom
// actually is now — not a site builder, but an Event OS.
// Three marquee features, each anchored in a specific capability:
//
//   1. The Event Director (planner-in-a-chat)
//   2. Seat-to-Story (personalized guest microsites)
//   3. The Post-Event Film (AI-scripted highlight film)
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { C, EASE } from './colors';

const FEATURES = [
  {
    eyebrow: 'The Event Director',
    title: 'An AI planner that actually plans.',
    body: 'Tell it your city, date, budget, and guest count. It shortlists vendors from our marketplace, writes your checklist, splits your budget, and keeps evolving as decisions land.',
    accent: C.olive,
    cta: 'Open the director',
    href: '/dashboard/director',
  },
  {
    eyebrow: 'Seat-to-Story',
    title: 'Every guest gets their own page.',
    body: 'Every invite links to a personal microsite — their seat, chapters they star in, travel tips from their home city, and a hero written for them by name. No one else in the industry does this.',
    accent: C.plum,
    cta: 'See how it works',
    href: '#guest-experience',
  },
  {
    eyebrow: 'The Post-Event Film',
    title: 'A film stitched from your day, automatically.',
    body: 'After the event, Pearloom pulls photos, voice toasts, and the relationship graph into a 4-minute narrated film. Claude writes the script, real guests narrate, your memories do the rest.',
    accent: C.gold,
    cta: 'Coming with every plan',
    href: '#pricing',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export function EventOSShowcase() {
  return (
    <section
      id="event-os"
      className="relative py-28 px-6"
      style={{ background: C.cream }}
    >
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-16 max-w-2xl"
        >
          <div
            className="uppercase text-xs tracking-[0.28em] mb-4"
            style={{ color: C.olive }}
          >
            Pearloom is an Event OS
          </div>
          <h2
            className="font-heading text-4xl md:text-5xl leading-tight mb-4"
            style={{ color: C.ink, letterSpacing: '-0.01em' }}
          >
            Not just a site. An entire celebration, end to end.
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: C.inkSoft }}>
            The website was the easy part. We planned the celebration too —
            vendors, seating, travel, personalization, and the film you&apos;ll
            watch on every anniversary.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid md:grid-cols-3 gap-6"
        >
          {FEATURES.map((f) => (
            <motion.a
              key={f.eyebrow}
              variants={item}
              href={f.href}
              className="group relative block rounded-2xl p-8 no-underline overflow-hidden transition-shadow hover:shadow-xl"
              style={{
                background: '#FFFFFF',
                border: `1px solid ${C.deep}`,
              }}
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl transition-transform duration-500 origin-left group-hover:scale-x-110"
                style={{ background: f.accent }}
              />
              <div
                className="uppercase text-[10px] tracking-[0.2em] mb-3 font-semibold"
                style={{ color: f.accent }}
              >
                {f.eyebrow}
              </div>
              <h3
                className="font-heading text-2xl leading-tight mb-3"
                style={{ color: C.ink, letterSpacing: '-0.01em' }}
              >
                {f.title}
              </h3>
              <p
                className="text-[0.95rem] leading-[1.65] mb-6"
                style={{ color: C.inkSoft }}
              >
                {f.body}
              </p>
              <span
                className="inline-flex items-center gap-1 text-sm font-medium"
                style={{ color: f.accent }}
              >
                {f.cta}
                <span
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </span>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
