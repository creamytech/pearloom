/* =========================================================================
   PEARLOOM — HOME REDESIGN
   The actual landing dashboard for couples mid-planning.

   Fixes the original "Welcome back" page where:
   - Home was empty chrome (countdown + 4 redundant tiles)
   - Pear's voice was nowhere
   - Nothing showed what changed since last visit
   - Milestones were invisible despite being the whole point of the product

   Three planning stages, all real:
   - early   — under 3 weeks in, almost nothing done
   - mid     — 6mo out, save-the-dates landing, RSVPs trickling
   - late    — 18 days out, RSVPs closing, day-of mode warming up
   ========================================================================= */

const { useState: useHRState, useMemo: useHRMemo } = React;

/* ---------- DATA: three states of the same wedding ----------------------- */

function useStageData(stage) {
  return useHRMemo(() => {
    if (stage === 'early') return EARLY;
    if (stage === 'late')  return LATE;
    return MID;
  }, [stage]);
}

const COUPLE = { a: 'Scott', b: 'Shauna', date: 'Monday, April 26, 2027', venue: 'Casa Chorro' };

/* A live, textured preview of the couple's actual themed site — ties the
   dashboard to the generated-site vibe. */
function HomeSitePreview() {
  const theme = getTheme('santorini');
  const divider = 'sprig';
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="eye" size={15} color="var(--gold)"/>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>Your site</span>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--sage-deep)', background: 'var(--sage-tint)', padding: '2px 8px', borderRadius: 999 }}>{theme.name}</span>
        </div>
        <a href="Pearloom Live Preview.html" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>View live</a>
      </div>
      <div style={{ ...themeRootStyle({ vars: theme.vars }, 'comfortable'), position: 'relative', height: 188, borderRadius: 14, overflow: 'hidden', background: 'var(--t-section)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '22px 18px', border: '1px solid var(--t-line)' }}>
        <TextureLayer texture={theme.texture} intensity={1}/>
        <div style={{ position: 'absolute', top: 10, left: 12, opacity: 0.55, transform: 'scaleX(-1)' }}><Motif kind={theme.motif} size={48}/></div>
        <div style={{ position: 'absolute', top: 10, right: 12, opacity: 0.55 }}><Motif kind={theme.motif} size={48}/></div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 7 }}>Save the date</div>
          <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 30, lineHeight: 0.98, color: 'var(--t-ink)' }}>
            {COUPLE.a}<span style={{ fontStyle: 'italic', fontSize: '0.6em', color: 'var(--t-ink-soft)', margin: '0 0.16em', fontWeight: 400 }}>&amp;</span>{COUPLE.b}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '9px 0' }}><TDivider look={divider} width={120}/></div>
          <div style={{ fontSize: 11, color: 'var(--t-ink-soft)' }}>Apr 26, 2027 · Santorini</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <a href="Pearloom Editor Redesign.html" className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}><Icon name="brush" size={12}/> Edit</a>
        <a href="Pearloom Theme Store.html" className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}><Icon name="sparkles" size={12}/> Themes</a>
      </div>
    </div>
  );
}

const MID = {
  daysOut: 187,
  weddingLabel: 'Apr 26, 2027',
  nextMilestone: { label: 'RSVPs close', dueIn: 'in 28 days', date: 'May 27', urgency: 'on-track' },
  progress: { done: 11, total: 24 },
  guests:   { invited: 124, yes: 47, no: 6, maybe: 8, pending: 63 },
  rsvpDelta: '+9 this week',
  pearActive: true,
  partnerLastSeen: '2h ago',
  partnerEditing: 'Schedule',
  newSinceVisit: 7,
  feed: [
    { kind: 'rsvp',     who: 'Linda Chen',         what: 'said yes — bringing +1 (Marco)', meta: '+ dietary: vegetarian', when: '12 min ago', tone: 'sage'    },
    { kind: 'partner',  who: 'Shauna',             what: 'edited the Schedule — added Welcome dinner', when: '2h ago', tone: 'lavender' },
    { kind: 'pear',     who: 'Pear',               what: 'drafted reminder cadence for 63 pending guests', meta: 'Ready to review', when: '5h ago', tone: 'peach' },
    { kind: 'rsvp',     who: 'Marcus & Priya Patel', what: 'said yes — meal: chicken / fish', when: 'Yesterday', tone: 'sage' },
    { kind: 'note',     who: 'Aunt Rosa',          what: 'left a note: "Can\u2019t wait. Tell Shauna the dress sounds perfect."', when: 'Yesterday', tone: 'cream' },
    { kind: 'rsvp',     who: 'Theo Park',          what: 'declined — wrote a note',           when: '2 days ago', tone: 'cream' },
    { kind: 'pear',     who: 'Pear',               what: 'noticed 6 guests near Athens — drafted a hotel-block recommendation', when: '2 days ago', tone: 'peach' },
  ],
  pearTodo: [
    { title: 'Send reminder cadence',   sub: '63 guests haven\u2019t opened the invite yet',     cta: 'Review draft', urgency: 'now' },
    { title: 'Confirm welcome dinner',  sub: 'Shauna added it — needs venue + count',          cta: 'Open Schedule', urgency: 'soon' },
    { title: 'Approve hotel block',     sub: '6 out-of-town guests, walking distance to venue', cta: 'See suggestion', urgency: 'soon' },
  ],
  milestones: [
    { date: 'Done',      label: 'Save the dates sent',   status: 'done',     sub: '124 invited' },
    { date: 'Done',      label: 'Venue contract signed', status: 'done',     sub: 'Casa Chorro' },
    { date: 'May 27',    label: 'RSVP cutoff',           status: 'next',     sub: 'in 28 days' },
    { date: 'Jun 12',    label: 'Final menu count',      status: 'upcoming', sub: 'in 6 weeks' },
    { date: 'Jul 3',     label: 'Seating chart',         status: 'upcoming', sub: 'in 9 weeks' },
    { date: 'Apr 26',    label: 'The big day',           status: 'distant',  sub: '187 days out' },
  ],
};

const EARLY = {
  daysOut: 365,
  weddingLabel: 'Apr 26, 2027',
  nextMilestone: { label: 'Send save-the-dates', dueIn: 'recommended this week', date: 'soon', urgency: 'soon' },
  progress: { done: 2, total: 24 },
  guests: { invited: 0, yes: 0, no: 0, maybe: 0, pending: 0 },
  rsvpDelta: null,
  pearActive: true,
  partnerLastSeen: null,
  partnerEditing: null,
  newSinceVisit: 0,
  feed: [
    { kind: 'pear',  who: 'Pear', what: 'drafted your first save-the-date in three styles', meta: 'Tap to preview', when: 'Just now', tone: 'peach' },
    { kind: 'pear',  who: 'Pear', what: 'noticed your venue is in Casa Chorro — pulled travel info for guests', when: '10 min ago', tone: 'peach' },
  ],
  pearTodo: [
    { title: 'Build your guest list',   sub: 'I can suggest one from your story, or import contacts',  cta: 'Start with Pear', urgency: 'now' },
    { title: 'Pick a save-the-date',    sub: 'Three styles ready to try',                              cta: 'Preview', urgency: 'now' },
    { title: 'Tell guests what to wear',sub: 'Add a dress code & travel tips to your site',            cta: 'Open editor', urgency: 'later' },
  ],
  milestones: [
    { date: 'Done',     label: 'Site claimed',           status: 'done',     sub: 'pearloom.com/scott-and-shauna' },
    { date: 'Done',     label: 'Date locked',            status: 'done',     sub: 'Apr 26, 2027' },
    { date: 'This week',label: 'Send save-the-dates',    status: 'next',     sub: 'recommended now' },
    { date: 'Aug',      label: 'Book vendors',           status: 'upcoming', sub: 'in ~4 months' },
    { date: 'Mar',      label: 'Send invitations',       status: 'upcoming', sub: 'in ~10 months' },
    { date: 'Apr 26',   label: 'The big day',            status: 'distant',  sub: '365 days out' },
  ],
};

const LATE = {
  daysOut: 18,
  weddingLabel: 'Apr 26, 2027',
  nextMilestone: { label: 'RSVPs close', dueIn: 'in 4 days', date: 'May 3', urgency: 'urgent' },
  progress: { done: 21, total: 24 },
  guests: { invited: 124, yes: 96, no: 14, maybe: 3, pending: 11 },
  rsvpDelta: '+14 this week',
  pearActive: true,
  partnerLastSeen: '20 min ago',
  partnerEditing: 'Seating',
  newSinceVisit: 23,
  feed: [
    { kind: 'pear',     who: 'Pear',          what: 'nudged 11 pending guests — final reminder went out 6h ago', when: '6h ago', tone: 'peach' },
    { kind: 'partner',  who: 'Shauna',        what: 'finalized Table 4 — Patel family + Aunt Rosa', when: '20 min ago', tone: 'lavender' },
    { kind: 'rsvp',     who: 'Daniel Okafor', what: 'said yes — meal: fish, song request: \u201cAt Last\u201d', when: '40 min ago', tone: 'sage' },
    { kind: 'rsvp',     who: 'The Hwangs',    what: 'said yes — 4 guests, kids meal x2',           when: '2h ago', tone: 'sage' },
    { kind: 'note',     who: 'Marcus Patel',  what: 'left a note: \u201cFlight in Friday morning, can drive the cake.\u201d', when: '3h ago', tone: 'cream' },
    { kind: 'pear',     who: 'Pear',          what: 'flagged: 11 guests still pending — risk to final count',  when: 'Yesterday', tone: 'peach' },
    { kind: 'rsvp',     who: 'Theo Park',     what: 'changed RSVP — now coming +1',                 when: '2 days ago', tone: 'sage' },
  ],
  pearTodo: [
    { title: 'Chase 11 pending RSVPs', sub: '4 days until cutoff. I drafted a final message.',     cta: 'Send for me', urgency: 'now' },
    { title: 'Confirm final headcount',sub: 'Caterer needs it by May 5 — I\u2019ll handle the math', cta: 'Lock count', urgency: 'now' },
    { title: 'Day-of timeline',         sub: '47 mini-tasks, 3 vendors, all in one room',          cta: 'Open Day-of', urgency: 'soon' },
  ],
  milestones: [
    { date: 'Done',    label: 'Invitations sent',     status: 'done',     sub: '124 invited' },
    { date: 'Done',    label: 'Menu finalized',       status: 'done',     sub: '4 options' },
    { date: 'May 3',   label: 'RSVP cutoff',          status: 'urgent',   sub: 'in 4 days · 11 pending' },
    { date: 'May 5',   label: 'Final count to caterer', status: 'next',   sub: 'in 6 days' },
    { date: 'May 12',  label: 'Seating finalized',    status: 'upcoming', sub: 'in 13 days' },
    { date: 'Apr 26',  label: 'The big day',          status: 'distant',  sub: '18 days · day-of room is open' },
  ],
};

/* ---------- HELPERS ------------------------------------------------------ */

function feedIcon(kind) {
  if (kind === 'rsvp')    return { name: 'check',     bg: 'var(--sage-tint)',     fg: 'var(--sage-deep)' };
  if (kind === 'partner') return { name: 'user',      bg: 'var(--lavender-bg)',   fg: 'var(--lavender-ink)' };
  if (kind === 'pear')    return { name: 'sparkles',  bg: 'var(--peach-bg)',      fg: 'var(--peach-ink)' };
  if (kind === 'note')    return { name: 'mail',      bg: 'var(--cream-2)',       fg: 'var(--ink-soft)' };
  return { name: 'dot', bg: 'var(--cream-2)', fg: 'var(--ink-soft)' };
}

/* ---------- BLOCKS ------------------------------------------------------- */

function StagePill({ stage }) {
  const map = {
    early: { label: 'Just getting started', tone: 'lavender' },
    mid:   { label: 'Mid-planning',         tone: 'sage' },
    late:  { label: 'Final stretch',        tone: 'peach' },
  };
  const m = map[stage];
  return <span className={`pill pill-${m.tone === 'sage' ? 'sage' : m.tone === 'peach' ? 'peach' : 'lav'}`} style={{ fontSize: 11.5 }}>{m.label}</span>;
}

/* ----- HERO BAND ----- */

function HeroBand({ data, stage, density }) {
  const { daysOut, weddingLabel, nextMilestone, progress, partnerLastSeen, partnerEditing, newSinceVisit } = data;
  const pct = Math.round((progress.done / progress.total) * 100);

  const urgencyTone = nextMilestone.urgency === 'urgent' ? 'peach'
                     : nextMilestone.urgency === 'soon' ? 'lavender' : 'sage';
  const urgencyTextColor = urgencyTone === 'peach' ? 'var(--peach-ink)' : urgencyTone === 'lavender' ? 'var(--lavender-ink)' : 'var(--sage-deep)';
  const urgencyBg = urgencyTone === 'peach' ? 'var(--peach-bg)' : urgencyTone === 'lavender' ? 'var(--lavender-bg)' : 'var(--sage-tint)';

  return (
    <div className="card" style={{
      padding: density === 'dense' ? '20px 24px' : '28px 32px',
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr 1fr',
      gap: 28,
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: 'linear-gradient(180deg, var(--card) 0%, #FBF6E8 100%)',
    }}>
      {/* atmosphere */}
      <div style={{ position: 'absolute', top: -100, right: -80, opacity: 0.5, pointerEvents: 'none' }}>
        <Blob tone="peach" size={300} opacity={0.7} />
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', top: 18, right: 196, opacity: 0.5, transform: 'rotate(-8deg)', pointerEvents: 'none' }}>
        <OliveSprig size={130} color="var(--sage)" berry="var(--gold)"/>
      </div>

      {/* LEFT — names */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span className="eyebrow" style={{ color: 'var(--peach-ink)' }}>{daysOut} DAYS UNTIL</span>
          <StagePill stage={stage} />
        </div>
        <h1 className="display" style={{ fontSize: density === 'dense' ? 40 : 52, margin: 0, lineHeight: 0.98 }}>
          {COUPLE.a} <span className="display-italic" style={{ color: 'var(--ink)' }}>&amp;</span> {COUPLE.b}
        </h1>
        <div style={{ marginTop: 8, fontSize: 14, color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="calendar" size={13}/> {COUPLE.date}</span>
          <span style={{ width: 3, height: 3, background: 'var(--ink-muted)', borderRadius: '50%' }}/>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name="pin" size={13}/> {COUPLE.venue}</span>
        </div>

        {/* partner presence */}
        {partnerLastSeen && (
          <div style={{
            marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 12px 6px 6px', borderRadius: 999,
            background: 'var(--lavender-bg)', color: 'var(--lavender-ink)',
            fontSize: 12.5, fontWeight: 500,
          }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--lavender-2)', display: 'grid', placeItems: 'center', color: 'white', fontWeight: 700, fontSize: 11 }}>S</span>
            Shauna · editing <strong style={{ fontWeight: 700, color: 'var(--lavender-ink)' }}>{partnerEditing}</strong>
            <span style={{ width: 5, height: 5, background: '#7BB661', borderRadius: '50%', marginLeft: 2 }}/>
          </div>
        )}
      </div>

      {/* MIDDLE — next milestone */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          padding: '14px 16px', borderRadius: 16,
          background: urgencyBg,
          border: `1px solid ${urgencyTone === 'peach' ? 'rgba(198,112,61,0.18)' : 'transparent'}`,
        }}>
          <div className="eyebrow" style={{ color: urgencyTextColor, marginBottom: 4 }}>NEXT UP</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: urgencyTextColor, lineHeight: 1.1 }}>
            {nextMilestone.label}
          </div>
          <div style={{ fontSize: 13, color: urgencyTextColor, opacity: 0.85, marginTop: 4 }}>
            {nextMilestone.dueIn}{nextMilestone.date && ` · ${nextMilestone.date}`}
          </div>
        </div>
      </div>

      {/* RIGHT — progress + activity */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <span className="eyebrow">PLANNING</span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
              <strong style={{ fontWeight: 700, color: 'var(--ink)' }}>{progress.done}</strong> of {progress.total}
            </span>
          </div>
          <div style={{ height: 8, background: 'var(--cream-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: 'linear-gradient(90deg, var(--sage), var(--sage-deep))',
              borderRadius: 999,
              transition: 'width 600ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}/>
          </div>
        </div>

        {newSinceVisit > 0 ? (
          <a href="#feed" style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: 'var(--ink)', fontWeight: 500,
            padding: '8px 12px', borderRadius: 10,
            background: 'var(--cream-2)',
          }}>
            <span style={{ width: 7, height: 7, background: 'var(--peach-ink)', borderRadius: '50%' }} className="pulse-dot"/>
            <strong style={{ fontWeight: 700 }}>{newSinceVisit}</strong> things since you last visited
            <Icon name="arrow-right" size={13} style={{ marginLeft: 'auto' }}/>
          </a>
        ) : (
          <div style={{ fontSize: 12.5, color: 'var(--ink-muted)', padding: '8px 12px' }}>
            All quiet. Pear's keeping watch.
          </div>
        )}
      </div>
    </div>
  );
}

/* ----- PEAR'S RECOMMENDATIONS (the new core) ----- */

function PearRecommendations({ data, prominence }) {
  const items = data.pearTodo;
  if (prominence === 'quiet') return null;
  const isHero = prominence === 'hero';

  return (
    <div className="card" style={{
      padding: 20,
      background: isHero
        ? 'linear-gradient(165deg, var(--peach-bg) 0%, var(--lavender-bg) 100%)'
        : 'var(--card)',
      border: isHero ? 'none' : '1px solid var(--card-ring)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pear size={28} tone="sage" sparkle shadow={false}/>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, lineHeight: 1 }}>From Pear</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>{items.length} things I think are worth your minute</div>
          </div>
        </div>
        <a style={{ fontSize: 12.5, color: 'var(--ink-soft)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          Ask Pear <Icon name="sparkles" size={12} color="var(--gold)"/>
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => {
          const urgent = it.urgency === 'now';
          return (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '6px 1fr auto', gap: 14, alignItems: 'center',
              padding: '12px 14px', borderRadius: 12,
              background: 'var(--card)',
              border: '1px solid var(--line-soft)',
            }}>
              <span style={{
                width: 6, height: 36, borderRadius: 999,
                background: urgent ? 'var(--peach-ink)' : it.urgency === 'soon' ? 'var(--lavender-2)' : 'var(--sage)',
              }}/>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{it.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{it.sub}</div>
              </div>
              <button className={`btn ${urgent ? 'btn-primary' : 'btn-outline'} btn-sm`}>
                {it.cta}
                {urgent && <Icon name="arrow-right" size={12} color="var(--cream)"/>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----- ACTIVITY FEED ----- */

function ActivityFeed({ data }) {
  const items = data.feed;
  if (items.length === 0) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <SectionHeader icon="bell">Activity</SectionHeader>
        <div style={{ padding: '24px 8px', fontSize: 13, color: 'var(--ink-muted)', textAlign: 'center' }}>
          Nothing yet. As guests RSVP, leave notes, or Pear acts on your behalf, it'll show up here.
        </div>
      </div>
    );
  }

  return (
    <div className="card" id="feed" style={{ padding: 20 }}>
      <SectionHeader icon="bell" extra={<a style={{ fontSize: 12, color: 'var(--ink-soft)' }}>See all activity</a>}>
        Activity
      </SectionHeader>

      <div style={{ position: 'relative' }}>
        {/* timeline line */}
        <div style={{ position: 'absolute', left: 17, top: 8, bottom: 8, width: 1.5, background: 'var(--line-soft)' }}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {items.map((it, i) => {
            const ic = feedIcon(it.kind);
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 1fr auto', gap: 12, alignItems: 'flex-start', padding: '10px 0' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: ic.bg, color: ic.fg,
                  display: 'grid', placeItems: 'center',
                  position: 'relative', zIndex: 1,
                  border: '2px solid var(--card)',
                }}>
                  {it.kind === 'pear'
                    ? <Pear size={18} tone="sage" shadow={false}/>
                    : <Icon name={ic.name} size={15} color={ic.fg}/>
                  }
                </div>
                <div style={{ minWidth: 0, paddingTop: 6 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.4 }}>
                    <strong style={{ fontWeight: 600 }}>{it.who}</strong>{' '}{it.what}
                  </div>
                  {it.meta && (
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2, fontStyle: 'italic' }}>{it.meta}</div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', paddingTop: 8, whiteSpace: 'nowrap' }}>{it.when}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----- GUEST PULSE ----- */

function GuestPulse({ data }) {
  const { invited, yes, no, maybe, pending } = data.guests;
  const respondedPct = invited === 0 ? 0 : Math.round(((yes + no + maybe) / invited) * 100);

  if (invited === 0) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <SectionHeader icon="users">Guests</SectionHeader>
        <div style={{
          padding: '20px 8px',
          background: 'var(--cream-2)',
          borderRadius: 14,
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginBottom: 6 }}>No guests yet</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 14, maxWidth: 240, marginInline: 'auto' }}>
            Pear can draft a list from your story, or import from your contacts.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm">Start with Pear <Icon name="sparkles" size={11} color="var(--cream)"/></button>
            <button className="btn btn-outline btn-sm">Import contacts</button>
          </div>
        </div>
      </div>
    );
  }

  // Stacked bar segments
  const segs = [
    { val: yes,     color: 'var(--sage)',      label: 'Yes' },
    { val: no,      color: 'var(--ink-muted)', label: 'No' },
    { val: maybe,   color: 'var(--lavender-2)',label: 'Maybe' },
    { val: pending, color: 'var(--cream-3)',   label: 'Pending' },
  ];

  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="users" size={15} color="var(--gold)"/>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>Guests</span>
          {data.rsvpDelta && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999,
              background: 'var(--sage-tint)', color: 'var(--sage-deep)', fontWeight: 700,
            }}>{data.rsvpDelta}</span>
          )}
        </div>
        <a style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Open Guests</a>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, lineHeight: 1 }}>{respondedPct}<span style={{ fontSize: 18, color: 'var(--ink-muted)' }}>%</span></span>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>responded · {yes + no + maybe} of {invited}</span>
      </div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', marginTop: 12, marginBottom: 12, background: 'var(--cream-2)' }}>
        {segs.map(s => s.val > 0 && (
          <div key={s.label} style={{ flex: s.val, background: s.color, transition: 'flex 400ms ease' }} title={`${s.label}: ${s.val}`}/>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {segs.map(s => (
          <div key={s.label} style={{ padding: '8px 6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color }}/>
              <span style={{ fontSize: 10.5, color: 'var(--ink-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--ink)' }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----- MILESTONES ----- */

function Milestones({ data }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <SectionHeader icon="calendar" extra={<a style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Full timeline</a>}>
        The road to {data.weddingLabel}
      </SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {data.milestones.map((m, i) => {
          const isLast = i === data.milestones.length - 1;
          const tone = m.status === 'done' ? 'done'
                     : m.status === 'urgent' ? 'urgent'
                     : m.status === 'next' ? 'next'
                     : 'soft';

          const dotStyle = {
            done:    { bg: 'var(--sage)',       border: 'var(--sage)',     content: 'check' },
            urgent:  { bg: 'var(--peach-ink)',  border: 'var(--peach-ink)',content: 'pulse' },
            next:    { bg: 'var(--card)',       border: 'var(--ink)',      content: 'ring' },
            soft:    { bg: 'var(--card)',       border: 'var(--ink-muted)',content: 'ring' },
            distant: { bg: 'var(--ink)',        border: 'var(--ink)',      content: 'heart' },
          }[m.status === 'distant' ? 'distant' : tone];

          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 22px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: !isLast ? '1px solid var(--line-soft)' : 'none' }}>
              <div style={{
                fontSize: 11.5, fontWeight: 600,
                color: m.status === 'urgent' ? 'var(--peach-ink)' : m.status === 'done' ? 'var(--sage-deep)' : 'var(--ink-muted)',
                textTransform: m.status === 'done' || m.status === 'urgent' ? 'uppercase' : 'none',
                letterSpacing: m.status === 'done' || m.status === 'urgent' ? '0.05em' : 0,
              }}>
                {m.date}
              </div>

              <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: 22 }}>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  background: dotStyle.bg, border: `2px solid ${dotStyle.border}`,
                  display: 'grid', placeItems: 'center',
                }}
                className={dotStyle.content === 'pulse' ? 'pulse-dot' : ''}>
                  {dotStyle.content === 'check' && <Icon name="check" size={8} color="white" strokeWidth={3}/>}
                  {dotStyle.content === 'heart' && <Heart size={7} color="var(--cream)"/>}
                </span>
              </div>

              <div style={{
                fontSize: 14, color: 'var(--ink)',
                fontWeight: m.status === 'urgent' || m.status === 'next' ? 600 : 500,
                textDecoration: m.status === 'done' ? 'line-through' : 'none',
                opacity: m.status === 'done' ? 0.7 : 1,
              }}>
                {m.label}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>{m.sub}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ----- SECTION HEADER ----- */

function SectionHeader({ icon, children, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={15} color="var(--gold)"/>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600 }}>{children}</span>
      </div>
      {extra}
    </div>
  );
}

/* ----- QUICK JUMPS — replaces the bland 4 tiles ----- */

function QuickJumps({ data, stage }) {
  // Contextual: changes by stage
  const jumps = stage === 'early'
    ? [
        { label: 'Open the editor',  sub: 'Edit your wedding site',     icon: 'brush',     href: 'Pearloom Editor Redesign.html' },
        { label: 'Build guest list', sub: 'Import or draft with Pear',  icon: 'user-plus', href: '#' },
        { label: 'Studio',           sub: 'Save-the-dates & invites',   icon: 'palette',   href: '#' },
        { label: 'Day-of room',      sub: 'Locked until 30 days out',  icon: 'lock',      href: '#', dim: true },
      ]
    : stage === 'late'
    ? [
        { label: 'Day-of room',      sub: 'Open now \u2014 timeline & vendors', icon: 'calendar-check', href: 'Pearloom Day.html', glow: true },
        { label: 'Seating chart',    sub: '113 seats placed of 124',    icon: 'grid',      href: '#' },
        { label: 'Open the editor',  sub: 'Final tweaks to the site',   icon: 'brush',     href: 'Pearloom Editor Redesign.html' },
        { label: 'Print orders',     sub: 'Programs ready to send',     icon: 'send',      href: '#' },
      ]
    : [
        { label: 'Open the editor',  sub: 'Edit your wedding site',     icon: 'brush',     href: 'Pearloom Editor Redesign.html' },
        { label: 'Send invitations', sub: 'Pear has 3 cadences ready',  icon: 'send',      href: '#' },
        { label: 'Studio',           sub: 'Save-the-dates & invites',   icon: 'palette',   href: '#' },
        { label: 'View live site',   sub: COUPLE.a.toLowerCase() + '-and-' + COUPLE.b.toLowerCase(), icon: 'eye', href: '#' },
      ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
      {jumps.map((j, i) => (
        <a key={i} href={j.href} className="lift" style={{
          padding: '14px 16px', borderRadius: 14,
          background: j.glow ? 'var(--ink)' : 'var(--card)',
          color: j.glow ? 'var(--cream)' : 'var(--ink)',
          border: j.glow ? 'none' : '1px solid var(--card-ring)',
          opacity: j.dim ? 0.5 : 1,
          display: 'flex', flexDirection: 'column', gap: 6,
          minHeight: 78,
          position: 'relative',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Icon name={j.icon} size={18} color={j.glow ? 'var(--cream)' : 'var(--gold)'}/>
            {j.glow && <span style={{ width: 6, height: 6, background: 'var(--peach)', borderRadius: '50%' }} className="pulse-dot"/>}
          </div>
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{j.label}</div>
            <div style={{ fontSize: 11.5, opacity: 0.7, marginTop: 2 }}>{j.sub}</div>
          </div>
        </a>
      ))}
    </div>
  );
}

/* ---------- TWEAKS PANEL ------------------------------------------------- */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "stage": "mid",
  "density": "calm",
  "pearProminence": "copilot"
}/*EDITMODE-END*/;

function HomeTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel>
      <TweakSection title="Planning stage" subtitle="The same wedding seen at three points in the year.">
        <TweakRadio
          value={tweaks.stage}
          onChange={(v) => setTweak('stage', v)}
          options={[
            { value: 'early', label: 'Early' },
            { value: 'mid',   label: 'Mid' },
            { value: 'late',  label: 'Final' },
          ]}
        />
      </TweakSection>
      <TweakSection title="Pear's prominence">
        <TweakRadio
          value={tweaks.pearProminence}
          onChange={(v) => setTweak('pearProminence', v)}
          options={[
            { value: 'quiet',   label: 'Quiet' },
            { value: 'copilot', label: 'Co-pilot' },
            { value: 'hero',    label: 'Hero' },
          ]}
        />
      </TweakSection>
      <TweakSection title="Visual density">
        <TweakRadio
          value={tweaks.density}
          onChange={(v) => setTweak('density', v)}
          options={[
            { value: 'calm',  label: 'Calm' },
            { value: 'dense', label: 'Dense' },
          ]}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

/* ---------- APP ---------------------------------------------------------- */

function HomeRedesignApp() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const data = useStageData(tweaks.stage);

  const sub = tweaks.stage === 'early'
    ? <>Just getting started. Pear has a few ideas to get the ball rolling.</>
    : tweaks.stage === 'late'
    ? <>The home stretch \u2014 RSVPs are closing and the day-of room is open.</>
    : <>Mid-planning. Replies are landing and Shauna's keeping the schedule moving.</>;

  return (
    <DashLayout
      active="dashboard"
      title={`Welcome back, ${COUPLE.a}`}
      subtitle={sub}
      hideTopbar={true}
    >
      <ThemeDefs/>
      {/* Custom topbar — denser, more intentional than the default */}
      <div style={{
        padding: '20px 32px 8px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24,
      }}>
        <div>
          <h1 className="display" style={{ fontSize: 36, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            Welcome back, {COUPLE.a}
          </h1>
          <div style={{ marginTop: 4, fontSize: 14, color: 'var(--ink-soft)' }}>{sub}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm">
            <Icon name="eye" size={13}/> View live
          </button>
          <button className="btn btn-primary btn-sm">
            <Icon name="brush" size={13} color="var(--cream)"/> Open editor
          </button>
        </div>
      </div>

      <div style={{ padding: '0 32px 32px', maxWidth: 1320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <HeroBand data={data} stage={tweaks.stage} density={tweaks.density}/>
        <QuickJumps data={data} stage={tweaks.stage}/>

        {/* Two-column work zone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <PearRecommendations data={data} prominence={tweaks.pearProminence}/>
            <ActivityFeed data={data}/>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <HomeSitePreview/>
            <GuestPulse data={data}/>
            <Milestones data={data}/>
          </div>
        </div>
      </div>

      <HomeTweaks tweaks={tweaks} setTweak={setTweak}/>
    </DashLayout>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<HomeRedesignApp/>);
