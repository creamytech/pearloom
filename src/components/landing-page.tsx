'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence, type Variants } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

interface LandingPageProps {
  handleSignIn: () => void;
  status: string;
}

const C = {
  cream:     '#F5F1E8',
  deep:      '#EEE8DC',
  olive:     '#A3B18A',
  oliveD:    '#8FA876',
  gold:      '#D6C6A8',
  plum:      '#6D597A',
  ink:       '#2B2B2B',
  dark:      '#3D3530',
  muted:     '#9A9488',
  divider:   '#E6DFD2',
} as const;

const EASE: [number,number,number,number] = [0.22,1,0.36,1];

const up: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i=0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE, delay: i*0.11 } }),
};

// ── Occasion data ─────────────────────────────────────────────
const OCCASIONS = [
  {
    label: 'Weddings',
    tagline: 'From first look to forever',
    desc: 'A full wedding site with your love story, events, RSVP, registry, and travel — all in one breathtaking place.',
    accent: C.plum,
    bg: 'rgba(109,89,122,0.07)',
  },
  {
    label: 'Engagements',
    tagline: 'She said yes. Now tell the world.',
    desc: 'Share the proposal story, the ring, and save-the-date details with everyone you love.',
    accent: C.olive,
    bg: 'rgba(163,177,138,0.08)',
  },
  {
    label: 'Anniversaries',
    tagline: 'Years together, still writing chapters',
    desc: 'Celebrate milestones with a timeline of your journey, favorite memories, and a message to each other.',
    accent: C.gold,
    bg: 'rgba(214,198,168,0.12)',
  },
  {
    label: 'Birthdays',
    tagline: 'Every year a new story',
    desc: 'A personalised birthday site with your story, photos, guest wishes, and all the event details.',
    accent: C.plum,
    bg: 'rgba(109,89,122,0.07)',
  },
  {
    label: 'Any Celebration',
    tagline: 'If it matters, it deserves a site',
    desc: 'Reunions, retirements, quinceañeras, graduations — any moment worth remembering gets a home.',
    accent: C.olive,
    bg: 'rgba(163,177,138,0.08)',
  },
];

const STEPS = [
  { n: '01', title: 'Tell your story', body: 'Type or speak — share how you met, what makes you laugh, the moment you knew. Our AI listens with care.' },
  { n: '02', title: 'AI builds your site', body: 'A bespoke visual identity, intimate narrative, and curated design generated uniquely for your moment.' },
  { n: '03', title: 'Share with everyone', body: 'RSVP, travel info, your story, a guestbook — collected gracefully in one luminous, branded destination.' },
];

const TESTIMONIALS = [
  { quote: 'The AI described our relationship better than we ever could. Our guests said it felt like a design studio built it just for us.', name: 'Emma & James', event: 'Wedding · June 2025' },
  { quote: 'I made an anniversary site in 20 minutes and my husband cried reading the story it wrote about us. Completely magical.', name: 'Priya', event: 'Anniversary · 10 years' },
  { quote: 'Everyone at my mum\'s 70th asked who designed the site. I said "an AI and me in half an hour." Jaws dropped.', name: 'Liam T.', event: 'Birthday · July 2025' },
  { quote: 'We used it to announce our engagement and the proposal story the AI crafted had our families in tears. Absolutely stunning.', name: 'Sofia & Marco', event: 'Engagement · March 2026' },
  { quote: 'Made a site for my dad\'s retirement party. His colleagues kept asking for the "design agency" behind it. It was just me and Pearloom.', name: 'Kezia O.', event: 'Celebration · February 2026' },
];

// ── Rotating occasion type in hero ───────────────────────────
function RotatingOccasion() {
  const items = ['Weddings', 'Anniversaries', 'Engagements', 'Birthdays', 'Every Celebration'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI(x => (x + 1) % items.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{ display: 'inline-block', minWidth: '280px', color: C.plum, position: 'relative' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={items[i]}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.4, ease: EASE }}
          style={{ display: 'inline-block' }}
        >
          {items[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ── Occasion SVG icons ────────────────────────────────────────
function OccasionIcon({ type, accent }: { type: string; accent: string }) {
  const s = { width: 24, height: 24, fill: 'none', stroke: accent, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (type === 'Weddings') return (
    <svg {...s} viewBox="0 0 24 24" aria-hidden="true">
      {/* Two interlocking rings */}
      <circle cx="8.5" cy="12" r="4.5"/>
      <circle cx="15.5" cy="12" r="4.5"/>
    </svg>
  );
  if (type === 'Engagements') return (
    <svg {...s} viewBox="0 0 24 24" aria-hidden="true">
      {/* Diamond */}
      <path d="M12 21L3 9l2.5-4h9L17 9l-5 12z"/>
      <path d="M3 9h18M8 9l4 12M16 9l-4 12"/>
    </svg>
  );
  if (type === 'Anniversaries') return (
    <svg {...s} viewBox="0 0 24 24" aria-hidden="true">
      {/* Heart with a small star */}
      <path d="M12 21C12 21 3 14 3 8a4 4 0 0 1 7.5-2A4 4 0 0 1 21 8c0 6-9 13-9 13z"/>
    </svg>
  );
  if (type === 'Birthdays') return (
    <svg {...s} viewBox="0 0 24 24" aria-hidden="true">
      {/* Birthday candle on cake */}
      <rect x="3" y="13" width="18" height="8" rx="2"/>
      <path d="M8 13v-2M12 13v-2M16 13v-2"/>
      <path d="M8 9a1 1 0 0 0 0-2c0-1 1-2 1-2s1 1 1 2a1 1 0 0 0 0 2" strokeWidth={1.3}/>
      <path d="M12 9a1 1 0 0 0 0-2c0-1 1-2 1-2s1 1 1 2a1 1 0 0 0 0 2" strokeWidth={1.3}/>
      <path d="M16 9a1 1 0 0 0 0-2c0-1 1-2 1-2s1 1 1 2a1 1 0 0 0 0 2" strokeWidth={1.3}/>
    </svg>
  );
  // Any Celebration — sparkle
  return (
    <svg {...s} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.95 16.95l1.41 1.41M5.64 18.36l1.42-1.42M16.95 7.05l1.41-1.41"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

// ── Ornament ──────────────────────────────────────────────────
function Ornament() {
  return (
    <svg width="140" height="18" viewBox="0 0 140 18" fill="none" aria-hidden="true">
      <line x1="0" y1="9" x2="54" y2="9" stroke={C.gold} strokeWidth="1" strokeOpacity="0.55"/>
      <circle cx="70" cy="9" r="4" stroke={C.gold} strokeWidth="1.5" strokeOpacity="0.6"/>
      <circle cx="70" cy="9" r="1.8" fill={C.gold} fillOpacity="0.5"/>
      <line x1="86" y1="9" x2="140" y2="9" stroke={C.gold} strokeWidth="1" strokeOpacity="0.55"/>
      <circle cx="54" cy="9" r="1.6" fill={C.gold} fillOpacity="0.45"/>
      <circle cx="86" cy="9" r="1.6" fill={C.gold} fillOpacity="0.45"/>
    </svg>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
      padding: '0.28rem 0.85rem',
      background: 'rgba(163,177,138,0.12)',
      border: `1px solid rgba(163,177,138,0.3)`,
      borderRadius: '999px',
      color: C.olive, fontSize: '0.7rem', fontWeight: 700,
      letterSpacing: '0.16em', textTransform: 'uppercase',
    }}>
      {children}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
export function LandingPage({ handleSignIn, status }: LandingPageProps) {
  const occasionRef  = useRef<HTMLElement>(null);
  const stepsRef     = useRef<HTMLElement>(null);
  const testRef      = useRef<HTMLElement>(null);
  const ctaRef       = useRef<HTMLElement>(null);

  const occasionInView = useInView(occasionRef, { once: true, amount: 0.1 });
  const stepsInView    = useInView(stepsRef,    { once: true, amount: 0.15 });
  const testInView     = useInView(testRef,     { once: true, amount: 0.2 });
  const ctaInView      = useInView(ctaRef,      { once: true, amount: 0.3 });

  return (
    <div style={{ background: C.cream, minHeight: '100dvh', fontFamily: 'var(--eg-font-body)', color: C.ink, overflowX: 'hidden' }}>

      {/* ══════════════ NAV ══════════════ */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(1.5rem,5vw,4rem)',
        height: '64px',
        background: 'rgba(245,241,232,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.divider}`,
      }}>
        {/* Logo */}
        <span style={{ fontFamily: 'var(--eg-font-heading)', fontSize: '1.15rem', fontWeight: 700, fontStyle: 'italic', color: C.ink, letterSpacing: '-0.01em' }}>
          Pearloom
        </span>

        {/* Center links — hidden on mobile */}
        <div style={{ display: 'flex', gap: '2.5rem', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          {['Occasions', 'How it works', 'Features'].map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              style={{ fontSize: '0.82rem', fontWeight: 500, color: C.muted, textDecoration: 'none', letterSpacing: '0.02em', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.ink)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          onClick={handleSignIn}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          style={{
            padding: '0.5rem 1.25rem',
            background: C.ink, color: C.cream,
            border: 'none', borderRadius: '0.6rem',
            fontSize: '0.82rem', fontWeight: 600,
            fontFamily: 'var(--eg-font-body)',
            cursor: 'pointer',
          }}
        >
          Get Started
        </motion.button>
      </nav>

      {/* ══════════════ HERO ══════════════ */}
      <section style={{
        minHeight: '100dvh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(5rem,10vw,8rem) 1.5rem 5rem',
        position: 'relative', overflow: 'hidden',
        background: `radial-gradient(ellipse at 20% 30%, rgba(163,177,138,0.09) 0%, transparent 55%),
                     radial-gradient(ellipse at 80% 70%, rgba(109,89,122,0.07) 0%, transparent 50%),
                     ${C.cream}`,
      }}>
        {/* Decorative rings */}
        <svg aria-hidden="true" width="420" height="420" viewBox="0 0 420 420"
          style={{ position:'absolute', top:'-80px', right:'-100px', opacity:0.1, pointerEvents:'none' }}>
          <circle cx="210" cy="210" r="205" stroke={C.gold} strokeWidth="1" fill="none"/>
          <circle cx="210" cy="210" r="170" stroke={C.olive} strokeWidth="0.5" fill="none" strokeDasharray="4 9"/>
          <circle cx="210" cy="210" r="130" stroke={C.gold} strokeWidth="0.75" fill="none"/>
        </svg>
        <svg aria-hidden="true" width="280" height="280" viewBox="0 0 280 280"
          style={{ position:'absolute', bottom:'-60px', left:'-70px', opacity:0.08, pointerEvents:'none' }}>
          <circle cx="140" cy="140" r="135" stroke={C.plum} strokeWidth="1" fill="none"/>
          <circle cx="140" cy="140" r="95" stroke={C.gold} strokeWidth="0.5" fill="none" strokeDasharray="3 7"/>
        </svg>

        <div style={{ position:'relative', zIndex:1, maxWidth:'820px', width:'100%', textAlign:'center' }}>
          <motion.div initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:0.5,delay:0.1}}
            style={{ marginBottom:'2.25rem' }}>
            <Pill><Sparkles size={9} strokeWidth={2.5}/> Beautiful Sites for Every Moment</Pill>
          </motion.div>

          <h1 style={{
            fontFamily: 'var(--eg-font-heading)',
            fontSize: 'clamp(2.8rem,7vw,6rem)',
            fontWeight: 700, lineHeight: 1.07,
            letterSpacing: '-0.035em',
            color: C.ink, marginBottom: '1.5rem',
          }}>
            {['Stunning', 'Sites', 'for'].map((w,i) => (
              <motion.span key={w} custom={i} variants={up} initial="hidden" animate="show"
                style={{ display:'inline-block', marginRight:'0.22em' }}>
                {w}
              </motion.span>
            ))}
            <br />
            <RotatingOccasion />
          </h1>

          <motion.p initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:0.65,delay:0.7}}
            style={{ fontSize:'clamp(1rem,1.8vw,1.18rem)', color:C.muted, maxWidth:'520px', margin:'0 auto 2.75rem', lineHeight:1.8 }}>
            Tell us your story. Our AI builds a beautiful, bespoke site — with its own visual identity, intimate narrative, and everything your guests need.
          </motion.p>

          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.55,delay:0.88}}
            style={{ display:'flex', gap:'0.8rem', justifyContent:'center', flexWrap:'wrap' }}>
            <motion.button
              onClick={handleSignIn} disabled={status==='loading'}
              whileHover={{ scale:1.04, boxShadow:`0 10px 40px rgba(163,177,138,0.42)` }}
              whileTap={{ scale:0.97 }}
              style={{
                display:'inline-flex', alignItems:'center', gap:'0.5rem',
                padding:'0.95rem 2.1rem',
                background: C.olive, color: C.cream,
                border:'none', borderRadius:'0.8rem',
                fontSize:'0.95rem', fontWeight:600,
                fontFamily:'var(--eg-font-body)',
                cursor: status==='loading' ? 'not-allowed' : 'pointer',
                opacity: status==='loading' ? 0.65 : 1,
                boxShadow:`0 2px 16px rgba(163,177,138,0.28)`,
              }}>
              Create Your Free Site <ArrowRight size={15} strokeWidth={2.2}/>
            </motion.button>
            <motion.button
              onClick={() => window.open('/demo', '_blank')}
              whileHover={{ scale:1.02, background: C.deep }}
              whileTap={{ scale:0.97 }}
              style={{
                display:'inline-flex', alignItems:'center', gap:'0.5rem',
                padding:'0.95rem 2.1rem',
                background:'transparent', color: C.dark,
                border:`1.5px solid ${C.gold}`, borderRadius:'0.8rem',
                fontSize:'0.95rem', fontWeight:500,
                fontFamily:'var(--eg-font-body)', cursor:'pointer',
              }}>
              See an Example
            </motion.button>
          </motion.div>

          <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.35, duration:0.5}}
            style={{ marginTop:'1.6rem', fontSize:'0.76rem', color:C.muted, letterSpacing:'0.05em' }}>
            Free to start · No credit card · Live in minutes
          </motion.p>
        </div>

        {/* Scroll cue */}
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.8}}
          style={{ position:'absolute', bottom:'2.25rem', display:'flex', flexDirection:'column', alignItems:'center', gap:'0.35rem', color:C.gold, fontSize:'0.62rem', letterSpacing:'0.18em', fontWeight:700, textTransform:'uppercase' }}>
          <motion.div animate={{y:[0,5,0]}} transition={{duration:2, repeat:Infinity, ease:'easeInOut'}}>
            <svg width="13" height="20" viewBox="0 0 13 20" fill="none" aria-hidden="true">
              <rect x="0.75" y="0.75" width="11.5" height="18.5" rx="5.75" stroke="currentColor" strokeWidth="1.2"/>
              <motion.circle cx="6.5" cy="5.5" r="1.8" fill="currentColor"
                animate={{cy:[5.5,11.5,5.5]}} transition={{duration:2,repeat:Infinity,ease:'easeInOut'}}/>
            </svg>
          </motion.div>
          Scroll
        </motion.div>
      </section>

      {/* ══════════════ OCCASIONS ══════════════ */}
      <section id="occasions" ref={occasionRef} style={{ background: C.deep, padding:'7rem 1.5rem', borderTop:`1px solid ${C.divider}`, borderBottom:`1px solid ${C.divider}` }}>
        <div style={{ maxWidth:'1080px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'4rem' }}>
            <motion.div initial={{opacity:0,y:14}} animate={occasionInView?{opacity:1,y:0}:{}} transition={{duration:0.5}}
              style={{ marginBottom:'1.1rem' }}>
              <Pill><Sparkles size={9} strokeWidth={2.5}/> Every Occasion</Pill>
            </motion.div>
            <motion.h2 initial={{opacity:0,y:18}} animate={occasionInView?{opacity:1,y:0}:{}} transition={{duration:0.6,delay:0.1}}
              style={{ fontFamily:'var(--eg-font-heading)', fontSize:'clamp(1.9rem,4vw,2.9rem)', fontWeight:700, color:C.ink, letterSpacing:'-0.03em', lineHeight:1.15 }}>
              Whatever you&rsquo;re celebrating
            </motion.h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'1.25rem' }}>
            {OCCASIONS.map((o,i) => (
              <motion.div key={o.label} custom={i} variants={up} initial="hidden" animate={occasionInView?'show':'hidden'}
                whileHover={{ y:-4, boxShadow:`0 14px 40px rgba(43,43,43,0.08)` }}
                style={{
                  padding:'2rem 1.5rem',
                  background:'rgba(255,255,255,0.65)', backdropFilter:'blur(8px)',
                  border:`1px solid rgba(255,255,255,0.9)`,
                  borderRadius:'1.25rem',
                  boxShadow:`0 2px 12px rgba(43,43,43,0.04)`,
                  position:'relative', overflow:'hidden',
                }}>
                <div style={{ width:'48px', height:'48px', borderRadius:'50%', background:o.bg, border:`1.5px solid ${o.accent}30`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1.25rem' }}>
                  <OccasionIcon type={o.label} accent={o.accent} />
                </div>
                <div style={{ fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:o.accent, marginBottom:'0.5rem' }}>
                  {o.label}
                </div>
                <div style={{ fontFamily:'var(--eg-font-heading)', fontSize:'1rem', fontWeight:700, fontStyle:'italic', color:C.ink, marginBottom:'0.65rem', lineHeight:1.3 }}>
                  {o.tagline}
                </div>
                <p style={{ fontSize:'0.84rem', color:C.muted, lineHeight:1.75, margin:0 }}>
                  {o.desc}
                </p>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:'3px', background:`linear-gradient(90deg, ${o.accent}55, transparent)`, borderRadius:'0 0 1.25rem 1.25rem' }}/>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ HOW IT WORKS ══════════════ */}
      <section id="how-it-works" ref={stepsRef} style={{ background:C.cream, padding:'8rem 1.5rem' }}>
        <div style={{ maxWidth:'940px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'4.5rem' }}>
            <motion.div initial={{opacity:0,y:14}} animate={stepsInView?{opacity:1,y:0}:{}} style={{ marginBottom:'1.1rem' }}>
              <Pill><Sparkles size={9} strokeWidth={2.5}/> How it works</Pill>
            </motion.div>
            <motion.h2 initial={{opacity:0,y:18}} animate={stepsInView?{opacity:1,y:0}:{}} transition={{delay:0.1}}
              style={{ fontFamily:'var(--eg-font-heading)', fontSize:'clamp(1.9rem,4vw,2.9rem)', fontWeight:700, color:C.ink, letterSpacing:'-0.03em' }}>
              Three steps to beautiful
            </motion.h2>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'1.75rem' }}>
            {STEPS.map((s,i) => (
              <motion.div key={s.n} custom={i} variants={up} initial="hidden" animate={stepsInView?'show':'hidden'}
                whileHover={{ y:-3, boxShadow:`0 12px 36px rgba(43,43,43,0.07)` }}
                style={{ padding:'2.25rem 2rem', background:'rgba(255,255,255,0.7)', backdropFilter:'blur(8px)', border:`1px solid ${C.divider}`, borderRadius:'1.25rem', position:'relative', overflow:'hidden' }}>
                <span aria-hidden="true" style={{ position:'absolute', top:'0.75rem', right:'1.25rem', fontFamily:'var(--eg-font-heading)', fontSize:'5rem', fontWeight:800, lineHeight:1, color:'rgba(214,198,168,0.2)', letterSpacing:'-0.04em', pointerEvents:'none' }}>
                  {s.n}
                </span>
                <h3 style={{ fontFamily:'var(--eg-font-heading)', fontSize:'1.15rem', fontWeight:700, color:C.ink, marginBottom:'0.75rem', lineHeight:1.2 }}>
                  {s.title}
                </h3>
                <p style={{ fontSize:'0.9rem', color:C.muted, lineHeight:1.8, margin:0 }}>
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ AI MAGIC ══════════════ */}
      <section id="features" style={{ background:C.deep, padding:'8rem 1.5rem', borderTop:`1px solid ${C.divider}` }}>
        <div style={{ maxWidth:'880px', margin:'0 auto', textAlign:'center' }}>
          <Pill><Sparkles size={9} strokeWidth={2.5}/> The AI difference</Pill>
          <motion.h2 initial={{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:0.3}} transition={{delay:0.1}}
            style={{ fontFamily:'var(--eg-font-heading)', fontSize:'clamp(1.9rem,4vw,2.75rem)', fontWeight:700, color:C.ink, letterSpacing:'-0.03em', margin:'1.25rem 0 1rem' }}>
            Not a template. A living portrait of your story.
          </motion.h2>
          <motion.p initial={{opacity:0,y:14}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:0.3}} transition={{delay:0.2}}
            style={{ fontSize:'clamp(0.95rem,1.8vw,1.1rem)', color:C.muted, lineHeight:1.8, maxWidth:'620px', margin:'0 auto 3.5rem' }}>
            Upload your photos, share your story in your own words. Pearloom&rsquo;s AI reads the emotion in your words, the light in your photos, and builds a site that&rsquo;s unmistakably, irreplaceably yours.
          </motion.p>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'1.25rem', textAlign:'left' }}>
            {[
              { accent:C.plum, title:'Intimate narrative', body:'Gemini writes your story in your voice — not a template, not filler. Guests feel like they were there.' },
              { accent:C.olive, title:'VibeSkin™ identity', body:'A complete visual language built from your personality — palette, typography, illustrations, all bespoke.' },
              { accent:C.gold, title:'Couple DNA illustrations', body:'Mention cats, mountains, or a favourite song — and your site\'s artwork will reference them.' },
              { accent:C.plum, title:'Guest experience', body:'RSVP, travel info, guestbook, day-of live feed — all collected gracefully in one luminous place.' },
            ].map((f,i) => (
              <motion.div key={f.title} custom={i} variants={up} initial="hidden" whileInView="show" viewport={{once:true,amount:0.2}}
                style={{ padding:'1.75rem', background:'rgba(255,255,255,0.55)', backdropFilter:'blur(8px)', border:`1px solid rgba(255,255,255,0.85)`, borderRadius:'1.1rem', boxShadow:`0 2px 10px rgba(43,43,43,0.04)` }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:f.accent, marginBottom:'1rem' }}/>
                <h3 style={{ fontFamily:'var(--eg-font-heading)', fontSize:'1.05rem', fontWeight:700, color:C.ink, marginBottom:'0.6rem' }}>{f.title}</h3>
                <p style={{ fontSize:'0.86rem', color:C.muted, lineHeight:1.75, margin:0 }}>{f.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ TESTIMONIALS ══════════════ */}
      <section ref={testRef} style={{ background:C.cream, padding:'8rem 1.5rem', borderTop:`1px solid ${C.divider}` }}>
        <div style={{ maxWidth:'1040px', margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:'4rem' }}>
            <Pill><Sparkles size={9} strokeWidth={2.5}/> Loved by real people</Pill>
            <motion.h2 initial={{opacity:0,y:16}} animate={testInView?{opacity:1,y:0}:{}} transition={{delay:0.1}}
              style={{ fontFamily:'var(--eg-font-heading)', fontSize:'clamp(1.9rem,4vw,2.75rem)', fontWeight:700, color:C.ink, letterSpacing:'-0.03em', marginTop:'1.1rem' }}>
              Stories from our community
            </motion.h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'1.5rem' }}>
            {TESTIMONIALS.map((t,i) => (
              <motion.div key={t.name} custom={i} variants={up} initial="hidden" animate={testInView?'show':'hidden'}
                style={{ padding: i === 0 ? '2rem' : '1.5rem', background:'rgba(255,255,255,0.7)', backdropFilter:'blur(8px)', border: i === 0 ? '1px solid rgba(163,177,138,0.3)' : `1px solid ${C.divider}`, borderRadius:'1.1rem', transform: i === 0 ? 'scale(1.02)' : undefined }}>
                <div style={{ fontFamily:'var(--eg-font-heading)', fontSize:'3.5rem', lineHeight:0.7, color:C.plum, opacity:0.35, marginBottom:'1rem', fontStyle:'italic' }}>&ldquo;</div>
                <blockquote style={{ fontFamily:'var(--eg-font-heading)', fontSize:'clamp(1rem,1.6vw,1.12rem)', fontStyle:'italic', fontWeight:500, color:C.dark, lineHeight:1.55, margin:'0 0 1.25rem' }}>
                  {t.quote}
                </blockquote>
                <div style={{ display:'flex', justifyContent:'center' }}><Ornament/></div>
                <p style={{ marginTop:'1rem', fontSize:'0.76rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:C.muted }}>{t.name} · {t.event}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════ FINAL CTA ══════════════ */}
      <section ref={ctaRef} style={{ background:C.deep, padding:'9rem 1.5rem 10rem', textAlign:'center', borderTop:`1px solid ${C.divider}`, position:'relative', overflow:'hidden' }}>
        <svg aria-hidden="true" viewBox="0 0 700 340"
          style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:'90%', maxWidth:'700px', opacity:0.05, pointerEvents:'none' }}>
          <ellipse cx="350" cy="170" rx="340" ry="155" stroke={C.plum} strokeWidth="1" fill="none"/>
          <ellipse cx="350" cy="170" rx="265" ry="110" stroke={C.olive} strokeWidth="0.5" fill="none" strokeDasharray="5 9"/>
        </svg>
        <div style={{ maxWidth:'600px', margin:'0 auto', position:'relative', zIndex:1 }}>
          <motion.div initial={{opacity:0,y:28}} animate={ctaInView?{opacity:1,y:0}:{}} transition={{duration:0.65}}>
            <Pill><Sparkles size={9} strokeWidth={2.5}/> Start for free</Pill>
            <h2 style={{ fontFamily:'var(--eg-font-heading)', fontSize:'clamp(2rem,5vw,3.25rem)', fontWeight:700, color:C.ink, letterSpacing:'-0.035em', lineHeight:1.1, margin:'1.5rem 0 1.25rem' }}>
              Your story deserves<br/>
              <span style={{ color:C.plum }}>more than a template.</span>
            </h2>
            <p style={{ fontSize:'clamp(0.95rem,1.8vw,1.1rem)', color:C.muted, lineHeight:1.8, marginBottom:'3rem', maxWidth:'480px', margin:'0 auto 3rem' }}>
              Weddings, anniversaries, birthdays, engagements — whatever you&rsquo;re celebrating, Pearloom makes it unforgettable.
            </p>
          </motion.div>
          <motion.div initial={{opacity:0,y:20}} animate={ctaInView?{opacity:1,y:0}:{}} transition={{duration:0.6,delay:0.25}}>
            <motion.button
              onClick={handleSignIn} disabled={status==='loading'}
              whileHover={{ scale:1.05, boxShadow:`0 14px 50px rgba(163,177,138,0.45)` }}
              whileTap={{ scale:0.97 }}
              style={{
                display:'inline-flex', alignItems:'center', gap:'0.65rem',
                padding:'1.1rem 2.8rem',
                background:C.olive, color:C.cream,
                border:'none', borderRadius:'0.875rem',
                fontSize:'1.05rem', fontWeight:700,
                fontFamily:'var(--eg-font-body)',
                cursor: status==='loading'?'not-allowed':'pointer',
                opacity: status==='loading'?0.65:1,
                boxShadow:`0 4px 24px rgba(163,177,138,0.3)`,
              }}>
              Begin Your Story <ArrowRight size={17} strokeWidth={2.2}/>
            </motion.button>
            <p style={{ marginTop:'1.1rem', fontSize:'0.76rem', color:C.muted, letterSpacing:'0.04em' }}>
              Free to start · No credit card · Live in minutes
            </p>
          </motion.div>
        </div>
      </section>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer style={{ background:C.dark, padding:'2.5rem 1.5rem', textAlign:'center', borderTop:'1px solid rgba(214,198,168,0.1)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.45rem', marginBottom:'0.65rem' }}>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:C.olive }}/>
          <span style={{ fontFamily:'var(--eg-font-heading)', fontSize:'0.95rem', fontWeight:700, color:C.cream, letterSpacing:'0.04em', fontStyle:'italic' }}>Pearloom</span>
        </div>
        <p style={{ fontSize:'0.7rem', color:'rgba(245,241,232,0.28)', letterSpacing:'0.06em' }}>
          © 2026 Pearloom · Crafted with love &amp; intelligence
        </p>
      </footer>
    </div>
  );
}
