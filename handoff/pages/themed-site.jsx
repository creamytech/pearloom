/* =========================================================================
   THEMED SITE — the live event-site preview. Driven by:
     event  · which sections, copy, subject (couple vs title), CTA, mood
     theme  · palette pack + texture + type + component looks + motifs
     voice  · tone-of-voice copy (weddings get 3 voices)
     layouts· per-section layout variant ids
     palette· optional colour override from photos
     photos · drag-drop <image-slot>s

   Sections are data-driven: ThemedSite maps the event's section list to a
   set of universal section renderers, so the same renderers serve a wedding,
   a funeral, a product launch or a kid's birthday with the right copy.
   ========================================================================= */

const { useState: useTSState, useEffect: useTSEff } = React;

const TCOUPLE = { a: 'Scott', b: 'Shauna', date: 'Monday, April 26, 2027', venue: 'Casa Chorro', place: 'Santorini, Greece' };

function siteVars(theme, density, palette) { return themeRootStyle(theme, density, palette); }

function TGrip({ color = 'currentColor' }) {
  return (
    <svg width="9" height="14" viewBox="0 0 9 14" aria-hidden="true">
      {[[2,2],[7,2],[2,7],[7,7],[2,12],[7,12]].map(([x,y],i)=>(<circle key={i} cx={x} cy={y} r="1.1" fill={color}/>))}
    </svg>
  );
}

function TSection({ id, label, children, active, hover, setActive, setHover, editable, hideHandle, style }) {
  const isActive = active === id;
  const isHover = hover === id && !isActive;
  return (
    <div data-screen-label={label}
      onMouseEnter={() => setHover(id)}
      onClick={(e) => { if (!editable) return; e.stopPropagation(); setActive(id); }}
      style={{ position: 'relative', cursor: editable ? 'pointer' : 'default', ...style }}>
      {children}
      {editable && (
        <>
          <div style={{ position: 'absolute', inset: 4, borderRadius: 6,
            outline: isActive ? '2px solid var(--lavender-2)' : isHover ? '1.5px dashed var(--lavender-2)' : 'none',
            outlineOffset: -2, pointerEvents: 'none', zIndex: 4 }}/>
          {(isActive || isHover) && !hideHandle && (
            <div style={{ position: 'absolute', top: 8, left: 12, padding: '4px 10px', borderRadius: 6,
              background: isActive ? 'var(--lavender-2)' : 'rgba(196,181,217,0.85)', color: '#3D4A1F',
              fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              display: 'inline-flex', alignItems: 'center', gap: 6, zIndex: 5,
              boxShadow: isActive ? '0 4px 12px rgba(61,74,31,0.15)' : 'none', fontFamily: 'Inter, sans-serif' }}>
              <TGrip color="#3D4A1F"/>{label}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TInline({ editable, children, inline, className, style }) {
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag className={className}
      contentEditable={editable || undefined} suppressContentEditableWarning={true}
      style={{ ...style, display: inline ? 'inline' : style?.display, outline: 'none',
      borderBottom: editable ? '1px dashed transparent' : 'none', cursor: editable ? 'text' : 'inherit',
      transition: 'border-color 140ms ease' }}
      onFocus={(e) => { if (editable) e.currentTarget.style.borderBottomColor = 'var(--lavender-2)'; }}
      onBlur={(e) => { if (editable) e.currentTarget.style.borderBottomColor = 'transparent'; }}
      onMouseEnter={(e) => { if (editable) e.currentTarget.style.borderBottomColor = 'rgba(196,181,217,0.7)'; }}
      onMouseLeave={(e) => { if (editable && document.activeElement !== e.currentTarget) e.currentTarget.style.borderBottomColor = 'transparent'; }}>
      {children}
    </Tag>
  );
}

function TSectionHead({ eyebrow, title, italic, theme, align = 'center' }) {
  return (
    <div style={{ textAlign: align, marginBottom: 26 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}>{eyebrow}</div>
      <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 40, margin: 0, lineHeight: 1.0, letterSpacing: theme.id === 'editorial' ? '-0.03em' : '-0.01em', color: 'var(--t-ink)' }}>
        {title}{italic && <span style={{ fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}> {italic}</span>}
      </h2>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: align === 'left' ? 'flex-start' : 'center' }}>
        <KDivider look={theme.look.divider} width={170}/>
      </div>
    </div>
  );
}

function SitePhoto({ photosOn, id, look, tone, aspect = '1/1', caption, width = '100%', style = {} }) {
  if (photosOn) {
    const arch = look === 'arch';
    return (
      <div style={{ width, ...style }}>
        <image-slot id={id} shape="rect" radius="8" placeholder="Drop a photo"
          style={{ display: 'block', width: '100%', aspectRatio: aspect, borderRadius: arch ? '999px 999px 6px 6px' : 'var(--t-radius)', border: '1px solid var(--t-line)', overflow: 'hidden', background: 'var(--t-section)' }}></image-slot>
      </div>
    );
  }
  return <TPhoto look={look} tone={tone} aspect={aspect} caption={caption} width={width} style={style}/>;
}

/* =========================================================================
   THE SITE — data-driven over the event's section list
   ========================================================================= */

function ThemedSite({ active, hover, setActive, setHover, editable, theme, density,
  textureIntensity = 1, motifsOn, voice = 'classic', layouts = {}, palette = null, photosOn = false, eventId = 'wedding', siteLayout = 'stacked', kitId = 'classic', decor = {} }) {
  if (typeof setKit !== 'undefined') setKit(kitId);
  if (typeof setDecor !== 'undefined') setDecor(decor || {});
  const look = theme.look;
  const event = (typeof getEvent !== 'undefined') ? getEvent(eventId) : null;
  const C = (event && typeof buildEventCopy !== 'undefined') ? buildEventCopy(event, voice)
          : (typeof COPY !== 'undefined' ? { ...COPY[voice] || COPY.classic, subject: { type: 'couple', a: TCOUPLE.a, b: TCOUPLE.b }, lead: 'SAVE THE DATE', cta: 'RSVP', meta: { date: TCOUPLE.date, place: `${TCOUPLE.venue} · ${TCOUPLE.place}` }, sections: ['hero','story','details','schedule','travel','registry','gallery','rsvp','faq'], data: {} } : null);

  const somber = C.mood === 'somber';
  const baseMotif = (motifsOn && !somber) ? theme.motif : 'none';
  const motif = decor.motif ? (decor.motif === 'none' ? 'none' : decor.motif) : baseMotif;
  const pad = { cozy: 0.74, comfortable: 1, spacious: 1.32 }[density] || 1;
  const showWashHero = textureIntensity > 0 && theme.texture === 'watercolor';
  const L = (sec, def) => (layouts && layouts[sec]) || def;
  const ital = (s) => s ? <span style={{ fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}> {s}</span> : null;

  const ctx = { theme, look, pad, editable, photosOn, motif, ital, C, showWashHero, L };
  const sections = C.sections || [];

  // Scroll-reveal motion in preview only (reduced-motion safe)
  useTSEff(() => {
    if (editable) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const els = [...document.querySelectorAll('[data-screen-label]')];
    els.forEach(el => el.classList.add('t-reveal'));
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add('t-reveal-in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(el => io.observe(el));
    return () => { io.disconnect(); els.forEach(el => el.classList.remove('t-reveal', 't-reveal-in')); };
  }, [editable, eventId, siteLayout]);
  const navLinks = sections.filter(s => s !== 'hero' && s !== 'rsvp').map(s => (SECTION_META[s] || {}).label || s);
  const headline = C.subject.type === 'couple' ? `${C.subject.a} & ${C.subject.b}` : C.subject.title;

  const renderKind = (kind) => {
    switch (kind) {
      case 'hero':     return <HeroBlock ctx={ctx} variant={L('hero', look.heroAlign === 'left' ? 'minimal' : 'centered')}/>;
      case 'story':    return <StoryBlock ctx={ctx} variant={L('story', 'sidebyside')}/>;
      case 'details':  return <DetailsBlock ctx={ctx} variant={L('details', 'tiles')}/>;
      case 'schedule': return <ScheduleBlock ctx={ctx} variant={L('schedule', 'cards')}/>;
      case 'travel':   return <TravelBlock ctx={ctx} variant={L('travel', 'map')}/>;
      case 'registry': return <RegistryBlock ctx={ctx} variant={L('registry', 'cards')}/>;
      case 'gallery':  return <GalleryBlock ctx={ctx} variant={L('gallery', 'grid')}/>;
      case 'rsvp':     return <RsvpBlock ctx={ctx} variant={L('rsvp', 'centered')}/>;
      case 'faq':      return <FaqBlock ctx={ctx} variant={L('faq', 'accordion')}/>;
      default:         return null;
    }
  };

  const navEl = (
    <TSection id="nav" label="Site nav" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable} hideHandle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '15px 36px', fontSize: 12.5, color: 'var(--t-ink-soft)', borderBottom: '1px solid var(--t-line-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pear size={22} tone="sage" shadow={false}/>
          <span style={{ fontFamily: 'var(--t-display)', fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontWeight: 600, fontSize: 18, color: 'var(--t-ink)' }}>{headline}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 20, opacity: 0.85, fontWeight: 500 }}>
          {navLinks.map(l => <span key={l}>{l}</span>)}
        </div>
        <TButton look={look.button} variant="primary" style={{ padding: '7px 16px', fontSize: 12 }}>{C.cta}</TButton>
      </div>
    </TSection>
  );
  const sectionEl = (kind) => (
    <TSection key={kind} id={kind} label={(SECTION_META[kind] || {}).label || kind}
      active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
      {renderKind(kind)}
    </TSection>
  );
  const rootStyle = { ...siteVars(theme, density, palette), position: 'relative', ...(decor.color ? { '--t-motif': decor.color } : {}) };
  const texEl = <TextureLayer texture={textureIntensity > 0 ? theme.texture : 'none'} intensity={textureIntensity}/>;
  const patEl = (decor.pattern && decor.pattern !== 'none') ? <PatternLayer pattern={decor.pattern} intensity={1}/> : null;

  /* ----- SPLIT: sticky sidebar lockup + scrolling content ----- */
  if (siteLayout === 'split') {
    return (
      <div onMouseLeave={() => setHover(null)} style={rootStyle}>
        <ThemeDefs/>{patEl}{texEl}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'minmax(290px, 35%) 1fr', alignItems: 'start' }}>
          <div style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
            <SidebarHero ctx={ctx} headline={headline} navLinks={navLinks}
              active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}/>
          </div>
          <div style={{ borderLeft: '1px solid var(--t-line-soft)' }}>
            {sections.filter(s => s !== 'hero').map(sectionEl)}
          </div>
        </div>
      </div>
    );
  }

  /* ----- INVITATION: the whole suite as a card on a mat ----- */
  if (siteLayout === 'boxed') {
    return (
      <div onMouseLeave={() => setHover(null)} style={{ ...rootStyle, background: 'color-mix(in oklab, var(--t-ink) 14%, var(--t-section))', padding: '40px 26px' }}>
        <ThemeDefs/>
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', background: 'var(--t-paper)', borderRadius: 'var(--t-radius-lg)', boxShadow: '0 40px 90px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.12)', border: '1px solid var(--t-line)', overflow: 'hidden' }}>
          {patEl}{texEl}
          <div style={{ position: 'relative', zIndex: 1 }}>{navEl}{sections.map(sectionEl)}</div>
        </div>
      </div>
    );
  }

  /* ----- STACKED (default classic scroll) ----- */
  return (
    <div onMouseLeave={() => setHover(null)} style={rootStyle}>
      <ThemeDefs/>{patEl}{texEl}
      <div style={{ position: 'relative', zIndex: 1 }}>{navEl}{sections.map(sectionEl)}</div>
    </div>
  );
}

/* Left lockup panel for the SPLIT layout */
function SidebarHero({ ctx, headline, navLinks, active, hover, setActive, setHover, editable }) {
  const { theme, look, C, motif, photosOn, pad } = ctx;
  const isCouple = C.subject.type === 'couple';
  return (
    <TSection id="hero" label="Hero" active={active} hover={hover} setActive={setActive} setHover={setHover} editable={editable}>
      <div style={{ position: 'relative', minHeight: 520, background: 'var(--t-section)', padding: '44px 36px', display: 'flex', flexDirection: 'column', gap: 18, overflow: 'hidden' }}>
        <MotifScatter motif={motif} density={look.motifDensity} accent={theme.vars['--t-accent']}/>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9 }}>
          <Pear size={24} tone="sage" shadow={false}/>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--t-ink-soft)' }}>Pearloom</span>
        </div>
        <div style={{ position: 'relative', marginTop: 'auto' }}>
          {C.lead && <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}>{C.lead}</div>}
          <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 46, lineHeight: 1.0, margin: 0, letterSpacing: '-0.02em', color: 'var(--t-ink)' }}>
            {isCouple ? <>{C.subject.a}<span style={{ display: 'block', fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontSize: '0.7em', fontWeight: 400, color: 'var(--t-ink-soft)' }}>{theme.id === 'editorial' ? '×' : 'and'}</span>{C.subject.b}</> : C.subject.title}
          </h1>
          {C.tagline && <div style={{ fontFamily: 'var(--t-display)', fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontSize: 17, color: 'var(--t-ink-soft)', marginTop: 12 }}>{C.tagline}</div>}
        </div>
        <div style={{ position: 'relative', marginTop: 4 }}><KDivider look={look.divider} width={150} style={{ marginLeft: 0 }}/></div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13, color: 'var(--t-ink-soft)' }}>
          {C.meta.date && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="calendar" size={14} color="var(--t-accent)"/> {C.meta.date}</span>}
          {C.meta.place && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name="pin" size={14} color="var(--t-accent)"/> {C.meta.place}</span>}
        </div>
        <nav style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 12.5, fontWeight: 500, color: 'var(--t-ink-soft)' }}>
          {navLinks.map(l => <span key={l}>{l}</span>)}
        </nav>
        <div style={{ position: 'relative' }}>
          <TButton look={look.button} variant="primary">{C.cta} <Icon name="arrow-right" size={13} color="var(--t-paper)"/></TButton>
        </div>
      </div>
    </TSection>
  );
}

/* ---------- HERO ---------- */
function HeroBlock({ ctx, variant }) {
  const { theme, look, pad, editable, C, motif, showWashHero, photosOn, ital } = ctx;
  const heroLeft = variant === 'minimal' || variant === 'split';
  const isCouple = C.subject.type === 'couple';
  const headline = (size) => (
    <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: `calc(${size}px * var(--t-hero-scale))`, lineHeight: 0.96, margin: '12px 0 0', letterSpacing: theme.id === 'editorial' ? '-0.045em' : '-0.02em' }}>
      {isCouple ? (
        <>
          <TInline editable={editable} inline>{C.subject.a}</TInline>
          <span style={{ fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontSize: '0.74em', color: 'var(--t-ink-soft)', margin: '0 0.18em', fontWeight: 400 }}>{theme.id === 'editorial' ? '×' : 'and'}</span>
          <TInline editable={editable} inline>{C.subject.b}</TInline>
        </>
      ) : <TInline editable={editable} inline>{C.subject.title}</TInline>}
    </h1>
  );
  const lead = C.lead && <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 8 }}>{C.lead}</div>;
  const tagline = C.tagline && <TInline editable={editable} style={{ fontFamily: 'var(--t-display)', fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontSize: 19, color: 'var(--t-ink-soft)', fontWeight: theme.id === 'editorial' ? 600 : 400, marginTop: 8 }}>{C.tagline}</TInline>;
  const meta = (
    <div style={{ marginTop: 18, display: 'flex', gap: 22, justifyContent: heroLeft ? 'flex-start' : 'center', flexWrap: 'wrap', fontSize: 14, color: 'var(--t-ink-soft)' }}>
      {C.meta.date && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="calendar" size={14} color="var(--t-accent)"/> {C.meta.date}</span>}
      {C.meta.place && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><Icon name="pin" size={14} color="var(--t-accent)"/> {C.meta.place}</span>}
    </div>
  );
  const buttons = (
    <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: heroLeft ? 'flex-start' : 'center' }}>
      <TButton look={look.button} variant="primary">{C.cta} <Icon name="arrow-right" size={13} color="var(--t-paper)"/></TButton>
      <TButton look={look.button} variant={look.button === 'sharp' ? 'link' : 'outline'}>Learn more</TButton>
    </div>
  );

  if (variant === 'split') {
    return (
      <div style={{ position: 'relative', padding: `${56*pad}px 56px`, background: 'var(--t-section)', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 44, alignItems: 'center' }}>
        <MotifScatter motif={motif} density={look.motifDensity} accent={theme.vars['--t-accent']}/>
        <div style={{ position: 'relative', textAlign: 'left' }}>
          {lead}{tagline}{headline(60)}{meta}
          <div style={{ marginTop: 16 }}><KDivider look={look.divider} width={180} style={{ marginLeft: 0 }}/></div>
          {buttons}
        </div>
        <div style={{ position: 'relative' }}><SitePhoto photosOn={photosOn} id="hero-split" look={look.photo} tone="warm" aspect="3/4"/></div>
      </div>
    );
  }
  if (variant === 'minimal') {
    return (
      <div style={{ position: 'relative', padding: `${72*pad}px 56px ${56*pad}px`, background: 'var(--t-section)', overflow: 'hidden', textAlign: 'left' }}>
        <div style={{ maxWidth: 840 }}>
          {lead}{tagline}{headline(78)}{meta}
          <div style={{ marginTop: 18 }}><KDivider look={look.divider} width={200} style={{ marginLeft: 0 }}/></div>
          {buttons}
        </div>
      </div>
    );
  }
  if (variant === 'fullbleed') {
    return (
      <div style={{ position: 'relative', minHeight: 460, display: 'grid', placeItems: 'center', textAlign: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}><SitePhoto photosOn={photosOn} id="hero-full" look="clean" tone="dusk" aspect="auto" style={{ height: '100%' }}/></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.5))' }}/>
        <div style={{ position: 'relative', color: '#fff', padding: '40px 24px' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.9, marginBottom: 8 }}>{C.lead}</div>
          <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'calc(76px * var(--t-hero-scale))', lineHeight: 0.96, margin: 0, color: '#fff' }}>
            {isCouple ? <>{C.subject.a}<span style={{ fontStyle: 'italic', fontSize: '0.7em', margin: '0 0.16em', opacity: 0.85 }}>and</span>{C.subject.b}</> : C.subject.title}
          </h1>
          <div style={{ marginTop: 14, fontSize: 14.5, opacity: 0.92 }}>{C.meta.date} · {C.meta.place}</div>
          <div style={{ marginTop: 22 }}><TButton look={look.button} variant="primary">{C.cta} <Icon name="arrow-right" size={13} color="var(--t-paper)"/></TButton></div>
        </div>
      </div>
    );
  }
  if (variant === 'typographic') {
    return (
      <div style={{ position: 'relative', padding: `${78*pad}px 48px ${60*pad}px`, background: 'var(--t-section)', overflow: 'hidden', textAlign: 'center' }}>
        <MotifScatter motif={motif} density={look.motifDensity} accent={theme.vars['--t-accent']}/>
        <div style={{ position: 'relative' }}>
          {lead}
          <h1 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 'calc(108px * var(--t-hero-scale))', lineHeight: 0.86, margin: '6px 0', letterSpacing: '-0.03em', color: 'var(--t-ink)' }}>
            {isCouple ? <><TInline editable={editable} inline>{C.subject.a}</TInline><br/><span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--t-accent-ink)' }}>{theme.id === 'editorial' ? '×' : '&'}</span><br/><TInline editable={editable} inline>{C.subject.b}</TInline></> : C.subject.title}
          </h1>
          {meta}{buttons}
        </div>
      </div>
    );
  }
  if (variant === 'postcard') {
    return (
      <div style={{ position: 'relative', padding: `${48*pad}px 40px`, background: 'color-mix(in oklab, var(--t-ink) 8%, var(--t-section))', overflow: 'hidden' }}>
        <div style={{ maxWidth: 720, marginInline: 'auto', background: 'var(--t-paper)', borderRadius: 'var(--t-radius-lg)', boxShadow: 'var(--t-shadow)', border: '1px solid var(--t-line)', padding: `${40*pad}px 40px`, textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 10, border: '1px solid var(--t-line)', borderRadius: 'var(--t-radius)', pointerEvents: 'none' }}/>
          <MotifScatter motif={motif} density={look.motifDensity} accent={theme.vars['--t-accent']}/>
          <div style={{ position: 'relative' }}>{lead}{tagline}{headline(58)}{meta}<div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}><KDivider look={look.divider} width={180}/></div>{buttons}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', textAlign: 'center', padding: `${64*pad}px 40px ${52*pad}px`, background: 'var(--t-section)', overflow: 'hidden' }}>
      {showWashHero && <WatercolorBloom size={520} tone="var(--t-accent-bg)" tone2="rgba(138,154,107,0.3)" style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', opacity: 0.7 }}/>}
      <MotifScatter motif={motif} density={look.motifDensity} accent={theme.vars['--t-accent']}/>
      <div style={{ position: 'relative', marginInline: 'auto' }}>
        {lead}{tagline}{headline(isCouple ? 74 : 64)}{meta}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}><KDivider look={look.divider} width={200}/></div>
        {buttons}
        <HeroPhotos look={look} photosOn={photosOn}/>
      </div>
    </div>
  );
}

/* ---------- STORY ---------- */
function StoryBlock({ ctx, variant }) {
  const { theme, look, pad, editable, C, motif, photosOn, ital } = ctx;
  const head = (
    <>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 10 }}>{C.story.eyebrow}</div>
      <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 38, margin: 0, lineHeight: 1.02, letterSpacing: '-0.01em' }}>{C.story.title}{ital(C.story.italic)}</h2>
    </>
  );
  const body = <p style={{ marginTop: 16, fontSize: 15, color: 'var(--t-ink-soft)', lineHeight: 1.65, textWrap: 'pretty' }}><TInline editable={editable} inline>{C.story.body}</TInline></p>;
  const chips = (
    <div style={{ marginTop: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {(C.story.chips || []).map((c,i) => (<span key={i} style={{ padding: '6px 13px', borderRadius: look.button === 'sharp' ? 0 : 999, background: 'var(--t-accent-bg)', color: 'var(--t-accent-ink)', fontSize: 12, fontWeight: 600 }}>{c}</span>))}
    </div>
  );
  if (variant === 'stacked') {
    return (
      <div style={{ padding: `${48*pad}px 72px`, textAlign: 'center', maxWidth: 760, marginInline: 'auto' }}>
        <div style={{ marginInline: 'auto', maxWidth: 520, marginBottom: 26 }}><SitePhoto photosOn={photosOn} id="story-stacked" look={look.photo} tone="warm" aspect="16/9"/></div>
        {head}{body}<div style={{ display: 'flex', justifyContent: 'center' }}>{chips}</div>
      </div>
    );
  }
  if (variant === 'quote') {
    return (
      <div style={{ position: 'relative', padding: `${56*pad}px 72px`, textAlign: 'center', maxWidth: 880, marginInline: 'auto' }}>
        <MotifScatter motif={motif} density={look.motifDensity === 'generous' ? 'sparse' : look.motifDensity} accent={theme.vars['--t-accent']}/>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 16 }}>{C.story.eyebrow}</div>
          <blockquote style={{ fontFamily: 'var(--t-display)', fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontWeight: 'var(--t-display-wght)', fontSize: 28, lineHeight: 1.32, margin: 0, color: 'var(--t-ink)', letterSpacing: '-0.01em' }}><TInline editable={editable} inline>{C.story.body}</TInline></blockquote>
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}><KDivider look={look.divider} width={160}/></div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>{chips}</div>
        </div>
      </div>
    );
  }
  if (variant === 'timeline') {
    const items = (C.story.chips || ['We met', 'We fell', 'We knew']).slice(0, 4);
    return (
      <div style={{ padding: `${52*pad}px 56px`, maxWidth: 760, marginInline: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>{head}</div>
        <div style={{ position: 'relative', paddingLeft: 30 }}>
          <div style={{ position: 'absolute', left: 7, top: 4, bottom: 4, width: 2, background: 'var(--t-line)' }}/>
          {items.map((it, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: i < items.length - 1 ? 22 : 0 }}>
              <span style={{ position: 'absolute', left: -30, top: 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--t-accent)', border: '3px solid var(--t-paper)' }}/>
              <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 19, color: 'var(--t-accent-ink)' }}>{it}</div>
              <div style={{ fontSize: 13.5, color: 'var(--t-ink-soft)', lineHeight: 1.55, marginTop: 3 }}>{C.story.body}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === 'zigzag') {
    const rows = [{ t: 'How we met', tone: 'warm' }, { t: 'The proposal', tone: 'lavender' }];
    return (
      <div style={{ padding: `${48*pad}px 56px`, maxWidth: 880, marginInline: 'auto', display: 'flex', flexDirection: 'column', gap: 26 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, alignItems: 'center', direction: i % 2 ? 'rtl' : 'ltr' }}>
            <div style={{ direction: 'ltr' }}><SitePhoto photosOn={photosOn} id={`story-zig-${i}`} look={look.photo} tone={r.tone} aspect="4/3"/></div>
            <div style={{ direction: 'ltr' }}>
              <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 26, color: 'var(--t-accent-ink)' }}>{r.t}</div>
              <p style={{ fontSize: 14, color: 'var(--t-ink-soft)', lineHeight: 1.6, marginTop: 8 }}>{C.story.body}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'letter') {
    return (
      <div style={{ position: 'relative', padding: `${52*pad}px 40px`, background: 'var(--t-section)' }}>
        <MotifScatter motif={motif} density={look.motifDensity} accent={theme.vars['--t-accent']}/>
        <div style={{ position: 'relative', maxWidth: 640, marginInline: 'auto', background: 'var(--t-paper)', borderRadius: 'var(--t-radius-lg)', boxShadow: 'var(--t-shadow)', border: '1px solid var(--t-line)', padding: '40px 46px', textAlign: 'center' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', color: 'var(--t-accent-ink)', marginBottom: 14 }}>{C.story.eyebrow}</div>
          <p style={{ fontFamily: 'var(--t-display)', fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontSize: 19, color: 'var(--t-ink)', lineHeight: 1.6, textAlign: 'left', textWrap: 'pretty' }}>{C.story.body}</p>
          <div style={{ fontFamily: 'var(--t-script)', fontSize: 30, color: 'var(--t-accent-ink)', marginTop: 14, textAlign: 'right' }}>{C.subject.type === 'couple' ? `${C.subject.a} & ${C.subject.b}` : ''}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', padding: `${48*pad}px 72px`, display: 'grid', gridTemplateColumns: '0.85fr 1fr', gap: 44, alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <SitePhoto photosOn={photosOn} id="story-main" look={look.photo} tone="warm" aspect="4/5" caption={look.photo === 'polaroid' ? 'a favourite' : null}/>
        {motif !== 'none' && <div style={{ position: 'absolute', bottom: -18, right: -14, zIndex: 2 }}><Motif kind={motif} size={70}/></div>}
      </div>
      <div>{head}{body}{chips}</div>
    </div>
  );
}

/* ---------- DETAILS ---------- */
function DetailsBlock({ ctx, variant }) {
  const { theme, look, pad, C, motif } = ctx;
  const items = C.data.details || [];
  let body = <div style={{ position: 'relative' }}><KDetails items={items} look={look.card}/></div>;
  if (variant === 'iconrow') {
    body = (
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 36, flexWrap: 'wrap', maxWidth: 760, marginInline: 'auto' }}>
        {items.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', maxWidth: 160 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--t-accent-bg)', display: 'grid', placeItems: 'center', marginInline: 'auto', marginBottom: 10 }}><Icon name={d.icon} size={22} color="var(--t-accent-ink)"/></div>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--t-ink-muted)' }}>{d.l}</div>
            <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 19, marginTop: 2 }}>{d.v}</div>
            <div style={{ fontSize: 12, color: 'var(--t-ink-soft)', marginTop: 2 }}>{d.s}</div>
          </div>
        ))}
      </div>
    );
  } else if (variant === 'accordion') {
    body = (
      <div style={{ position: 'relative', maxWidth: 620, marginInline: 'auto', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 18px', borderRadius: 'var(--t-radius)', background: 'var(--t-card)', border: '1px solid var(--t-line)' }}>
            <Icon name={d.icon} size={18} color="var(--t-accent-ink)"/>
            <div style={{ flex: 1 }}><span style={{ fontWeight: 600, fontSize: 14 }}>{d.l}</span> <span style={{ color: 'var(--t-ink-soft)', fontSize: 13.5 }}>— {d.v}, {d.s}</span></div>
            <Icon name="chev-down" size={14} color="var(--t-ink-muted)"/>
          </div>
        ))}
      </div>
    );
  } else if (variant === 'bento') {
    body = (
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, maxWidth: 640, marginInline: 'auto' }}>
        {items.map((d, i) => (
          <div key={i} style={{ gridColumn: i === 0 ? 'span 2' : 'span 1', padding: 20, borderRadius: 'var(--t-radius-lg)', background: i === 0 ? 'var(--t-accent-bg)' : 'var(--t-card)', border: '1px solid var(--t-line)' }}>
            <Icon name={d.icon} size={20} color="var(--t-accent-ink)"/>
            <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 22, marginTop: 8 }}>{d.v}</div>
            <div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', marginTop: 2 }}>{d.l} · {d.s}</div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ position: 'relative', padding: `${44*pad}px 40px`, background: 'var(--t-section)' }}>
      <MotifScatter motif={motif} density={look.motifDensity === 'generous' ? 'sparse' : look.motifDensity} accent={theme.vars['--t-accent']}/>
      <TSectionHead eyebrow={C.details.eyebrow} title={C.details.title} italic={C.details.italic} theme={theme}/>
      {body}
    </div>
  );
}

/* ---------- SCHEDULE ---------- */
function ScheduleBlock({ ctx, variant }) {
  const { theme, look, pad, C } = ctx;
  const rows = C.data.schedule || [];
  const dsp = { fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)' };
  let body = <KSchedule rows={rows} variant={variant} look={look.card}/>;
  if (variant === 'timeline') {
    body = (
      <div style={{ maxWidth: 600, marginInline: 'auto', position: 'relative', paddingLeft: 30 }}>
        <div style={{ position: 'absolute', left: 7, top: 6, bottom: 6, width: 2, background: 'var(--t-line)' }}/>
        {rows.map((r, i) => (
          <div key={i} style={{ position: 'relative', paddingBottom: i < rows.length - 1 ? 20 : 0 }}>
            <span style={{ position: 'absolute', left: -30, top: 2, width: 16, height: 16, borderRadius: '50%', background: 'var(--t-accent)', border: '3px solid var(--t-paper)' }}/>
            <div style={{ ...dsp, fontSize: 18, color: 'var(--t-accent-ink)' }}>{r.t}<span style={{ fontSize: 11, marginLeft: 3, color: 'var(--t-ink-muted)' }}>{r.m}</span></div>
            <div style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>{r.l}</div>
            {r.s && <div style={{ fontSize: 13, color: 'var(--t-ink-muted)' }}>{r.s}</div>}
          </div>
        ))}
      </div>
    );
  } else if (variant === 'stepper') {
    body = (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, maxWidth: 900, marginInline: 'auto', flexWrap: 'wrap' }}>
        {rows.map((r, i) => (
          <React.Fragment key={i}>
            <div style={{ textAlign: 'center', maxWidth: 150 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--t-accent-bg)', border: '2px solid var(--t-accent)', display: 'grid', placeItems: 'center', marginInline: 'auto', ...dsp, fontSize: 14, color: 'var(--t-accent-ink)' }}>{i + 1}</div>
              <div style={{ ...dsp, fontSize: 16, marginTop: 8 }}>{r.t}<span style={{ fontSize: 10, marginLeft: 2 }}>{r.m}</span></div>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{r.l}</div>
              {r.s && <div style={{ fontSize: 11.5, color: 'var(--t-ink-muted)' }}>{r.s}</div>}
            </div>
            {i < rows.length - 1 && <div style={{ flex: '0 1 50px', height: 2, background: 'var(--t-line)', alignSelf: 'flex-start', marginTop: 22 }}/>}
          </React.Fragment>
        ))}
      </div>
    );
  } else if (variant === 'numbered') {
    body = (
      <div style={{ maxWidth: 600, marginInline: 'auto' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 1fr auto', gap: 16, alignItems: 'baseline', padding: '16px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--t-line-soft)' : 'none' }}>
            <span style={{ ...dsp, fontSize: 30, color: 'var(--t-accent-ink)', opacity: 0.5 }}>{String(i + 1).padStart(2, '0')}</span>
            <div><div style={{ fontSize: 16, fontWeight: 600 }}>{r.l}</div>{r.s && <div style={{ fontSize: 13, color: 'var(--t-ink-muted)' }}>{r.s}</div>}</div>
            <span style={{ ...dsp, fontSize: 17 }}>{r.t}<span style={{ fontSize: 11, marginLeft: 2, color: 'var(--t-ink-muted)' }}>{r.m}</span></span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ padding: `${48*pad}px 40px` }}>
      <TSectionHead eyebrow={C.schedule.eyebrow} title={C.schedule.title} italic={C.schedule.italic} theme={theme}/>
      {body}
    </div>
  );
}

/* ---------- TRAVEL ---------- */
function TStars({ r }) {
  const full = Math.round(r);
  return <span style={{ display: 'inline-flex', gap: 1 }}>{[1,2,3,4,5].map(i => <Icon key={i} name="star" size={12} color={i <= full ? 'var(--t-gold)' : 'var(--t-line)'}/>)}</span>;
}
function TravelBlock({ ctx, variant }) {
  const { theme, look, pad, C, motif, photosOn } = ctx;
  const RICH = [
    { rating: 4.8, reviews: 412, price: '$$$', dist: '8-min walk', amenities: ['Caldera view', 'Pool', 'Breakfast'], blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.' },
    { rating: 4.9, reviews: 286, price: '$$$$', dist: '12-min walk', amenities: ['Spa', 'Infinity pool', 'Fine dining'], blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite.' },
  ];
  const hotels = (C.data.travel || []).map((h, i) => ({ ...RICH[i % RICH.length], ...h }));
  if (variant === 'table') {
    return (
      <div style={{ position: 'relative', padding: `${48*pad}px 40px`, background: 'var(--t-section)' }}>
        <MotifScatter motif={motif} density={look.motifDensity} accent={theme.vars['--t-accent']}/>
        <TSectionHead eyebrow={C.travel.eyebrow} title={C.travel.title} italic={C.travel.italic} theme={theme}/>
        <div style={{ maxWidth: 680, marginInline: 'auto' }}>
          {hotels.map((h, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr auto auto auto', gap: 14, alignItems: 'center', padding: '14px 4px', borderBottom: '1px solid var(--t-line-soft)' }}>
              <div><div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 18 }}>{h.name}</div><div style={{ fontSize: 12, color: 'var(--t-ink-muted)' }}>{h.amenities.slice(0,2).join(' · ')}</div></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}><Icon name="star" size={12} color="var(--t-gold)"/> <b>{h.rating}</b></div>
              <div style={{ fontSize: 13, color: 'var(--t-ink-soft)' }}>{h.price}</div>
              <div style={{ fontSize: 12.5, color: 'var(--t-accent-ink)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="pin" size={11} color="var(--t-accent)"/> {h.dist}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const cardCols = variant === 'rows' ? '1fr' : 'repeat(2,1fr)';
  const carousel = variant === 'carousel';
  return (
    <div style={{ position: 'relative', padding: `${48*pad}px 40px`, background: 'var(--t-section)' }}>
      <MotifScatter motif={motif} density={look.motifDensity} accent={theme.vars['--t-accent']}/>
      <TSectionHead eyebrow={C.travel.eyebrow} title={C.travel.title} italic={C.travel.italic} theme={theme}/>
      <div style={{ position: 'relative', maxWidth: 820, marginInline: 'auto' }}>
        {/* map strip */}
        <div style={{ position: 'relative', height: 150, borderRadius: 'var(--t-radius-lg)', overflow: 'hidden', border: '1px solid var(--t-line)', marginBottom: 18 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, color-mix(in oklab, var(--t-accent) 12%, var(--t-card)), color-mix(in oklab, var(--t-accent-2) 16%, var(--t-card)))' }}/>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, var(--t-line-soft) 0 1px, transparent 1px 30px), repeating-linear-gradient(90deg, var(--t-line-soft) 0 1px, transparent 1px 30px)' }}/>
          <div style={{ position: 'absolute', top: 40, left: '18%', width: 130, height: 9, background: 'color-mix(in oklab, var(--t-accent) 35%, transparent)', borderRadius: 5, transform: 'rotate(16deg)' }}/>
          <div style={{ position: 'absolute', bottom: 34, right: '20%', width: 160, height: 9, background: 'color-mix(in oklab, var(--t-accent) 30%, transparent)', borderRadius: 5, transform: 'rotate(-10deg)' }}/>
          {[['28%','30%','heart-icon','--t-accent-2'],['52%','58%','home','--t-accent'],['72%','38%','home','--t-accent']].map(([l,t,ic,c],i) => (
            <div key={i} style={{ position: 'absolute', left: l, top: t }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: '50% 50% 50% 0', background: `var(${c})`, transform: 'rotate(-45deg)', boxShadow: '0 3px 8px rgba(0,0,0,0.22)' }}>
                <Icon name={ic} size={13} color="var(--t-paper)" style={{ transform: 'rotate(45deg)' }}/>
              </span>
            </div>
          ))}
          <div style={{ position: 'absolute', bottom: 10, left: 12, fontSize: 11, fontWeight: 700, color: 'var(--t-ink)', background: 'var(--t-card)', padding: '3px 10px', borderRadius: 999, boxShadow: 'var(--t-shadow)' }}>{TCOUPLE.place || 'Santorini, Greece'}</div>
        </div>
        <div style={{ display: carousel ? 'flex' : 'grid', gridTemplateColumns: carousel ? undefined : cardCols, gap: 16, overflowX: carousel ? 'auto' : undefined, paddingBottom: carousel ? 6 : 0 }}>
          {hotels.map((h, i) => (
            <TCard key={i} look={look.card} style={{ overflow: 'hidden', flex: carousel ? '0 0 300px' : undefined }}>
              <div style={{ aspectRatio: '16/9' }}><SitePhoto photosOn={photosOn} id={`travel-${i}`} look="clean" tone={h.tone} aspect="16/9"/></div>
              <div style={{ padding: 15 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 20 }}>{h.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--t-ink-muted)', fontWeight: 600 }}>{h.price}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, fontSize: 12.5, color: 'var(--t-ink-soft)' }}>
                  <TStars r={h.rating}/> <b style={{ color: 'var(--t-ink)' }}>{h.rating}</b> <span style={{ color: 'var(--t-ink-muted)' }}>({h.reviews})</span>
                  <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--t-ink-muted)' }}/>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon name="pin" size={11} color="var(--t-accent)"/> {h.dist}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--t-ink-soft)', lineHeight: 1.5, margin: '9px 0 11px', textWrap: 'pretty' }}>{h.blurb}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 13 }}>
                  {h.amenities.map(a => <span key={a} style={{ fontSize: 11, fontWeight: 600, color: 'var(--t-accent-ink)', background: 'var(--t-accent-bg)', padding: '4px 9px', borderRadius: 999 }}>{a}</span>)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--t-ink-muted)' }}>{h.sub}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: 'var(--t-accent-ink)' }}>Book <Icon name="arrow-ur" size={11} color="var(--t-accent-ink)"/></span>
                </div>
              </div>
            </TCard>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- REGISTRY / GIVING ---------- */
function RegistryBlock({ ctx, variant }) {
  const { theme, look, pad, C } = ctx;
  const items = (C.data.registry || []);
  const meta = { 'Honeymoon fund': { icon: 'heart-icon', sub: '62% funded · €3,100 of €5,000', pct: 62 }, 'Crate & Barrel': { icon: 'gift', sub: '14 of 32 gifts remaining' }, 'Zola': { icon: 'gift', sub: 'Full registry' } };
  if (variant === 'chips') {
    return (
      <div style={{ padding: `${48*pad}px 40px`, textAlign: 'center' }}>
        <TSectionHead eyebrow={C.registry.eyebrow} title={C.registry.title} italic={C.registry.italic} theme={theme}/>
        <div style={{ fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>{C.registry.body}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          {items.map(s => <KChip key={s} look={look.card}>{s} <Icon name="arrow-ur" size={12} color="var(--t-accent-ink)"/></KChip>)}
        </div>
      </div>
    );
  }
  if (variant === 'logowall') {
    return (
      <div style={{ padding: `${48*pad}px 40px`, textAlign: 'center' }}>
        <TSectionHead eyebrow={C.registry.eyebrow} title={C.registry.title} italic={C.registry.italic} theme={theme}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, maxWidth: 640, marginInline: 'auto' }}>
          {items.map(s => (
            <div key={s} style={{ padding: '22px 14px', borderRadius: 'var(--t-radius)', border: '1px solid var(--t-line)', background: 'var(--t-card)', display: 'grid', placeItems: 'center', gap: 8 }}>
              <Icon name="gift" size={22} color="var(--t-accent-ink)"/>
              <span style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 16 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === 'progress') {
    const fund = items.find(s => meta[s] && meta[s].pct != null) || items[0];
    const m = meta[fund] || { pct: 62, sub: '62% funded' };
    return (
      <div style={{ padding: `${48*pad}px 40px`, textAlign: 'center' }}>
        <TSectionHead eyebrow={C.registry.eyebrow} title={C.registry.title} italic={C.registry.italic} theme={theme}/>
        <div style={{ maxWidth: 520, marginInline: 'auto', background: 'var(--t-card)', border: '1px solid var(--t-line)', borderRadius: 'var(--t-radius-lg)', padding: '26px 28px', boxShadow: 'var(--t-shadow)' }}>
          <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 24 }}>{fund}</div>
          <div style={{ fontSize: 13, color: 'var(--t-ink-soft)', marginTop: 4 }}>{m.sub}</div>
          <div style={{ height: 10, borderRadius: 999, background: 'var(--t-accent-bg)', overflow: 'hidden', margin: '16px 0' }}><div style={{ width: `${m.pct}%`, height: '100%', background: 'var(--t-accent)', borderRadius: 999 }}/></div>
          <TButton look={look.button} variant="primary">Contribute <Icon name="arrow-right" size={13} color="var(--t-paper)"/></TButton>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          {items.filter(s => s !== fund).map(s => <KChip key={s} look={look.card}>{s}</KChip>)}
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: `${48*pad}px 40px`, textAlign: 'center' }}>
      <TSectionHead eyebrow={C.registry.eyebrow} title={C.registry.title} italic={C.registry.italic} theme={theme}/>
      <div style={{ fontSize: 14.5, color: 'var(--t-ink-soft)', maxWidth: 480, margin: '0 auto 22px', lineHeight: 1.6 }}>{C.registry.body}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(items.length, 3)},1fr)`, gap: 14, maxWidth: 720, marginInline: 'auto' }}>
        {items.map((s, i) => {
          const m = meta[s] || { icon: 'gift', sub: 'Linked store' };
          return (
            <TCard key={s} look={look.card} style={{ padding: 18, textAlign: 'left' }}>
              <div style={{ width: 38, height: 38, borderRadius: look.card === 'flat' ? 0 : 10, background: 'var(--t-accent-bg)', display: 'grid', placeItems: 'center', marginBottom: 11 }}>
                <Icon name={m.icon} size={17} color="var(--t-accent-ink)"/>
              </div>
              <div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 18 }}>{s}</div>
              <div style={{ fontSize: 12, color: 'var(--t-ink-muted)', marginTop: 3, lineHeight: 1.4 }}>{m.sub}</div>
              {m.pct != null && (
                <div style={{ height: 6, borderRadius: 999, background: 'var(--t-accent-bg)', overflow: 'hidden', marginTop: 10 }}>
                  <div style={{ width: `${m.pct}%`, height: '100%', background: 'var(--t-accent)', borderRadius: 999 }}/>
                </div>
              )}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 11, fontSize: 12.5, fontWeight: 700, color: 'var(--t-accent-ink)' }}>{m.pct != null ? 'Contribute' : 'View'} <Icon name="arrow-ur" size={11} color="var(--t-accent-ink)"/></span>
            </TCard>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- GALLERY ---------- */
function GalleryBlock({ ctx, variant }) {
  const { theme, look, pad, C, photosOn } = ctx;
  const tones = ['warm','sage','dusk','peach','lavender','cream','field','warm','dusk','peach','lavender','sage'];
  const shadow = look.card === 'flat' ? 'none' : 'var(--t-shadow)';
  const Tile = ({ i, style }) => (
    <div style={{ borderRadius: 'var(--t-radius)', overflow: 'hidden', boxShadow: shadow, ...style }}>
      {photosOn ? <image-slot id={`gallery-${i}`} shape="rect" placeholder="Photo" style={{ display: 'block', width: '100%', height: '100%', background: 'var(--t-section)' }}></image-slot>
        : <PhotoPlaceholder tone={tones[i % tones.length]} aspect={style && style.gridRow ? 'auto' : '1/1'} style={{ height: '100%' }}/>}
    </div>
  );
  if (variant === 'mosaic') {
    const spans = [{cs:'span 2',rs:'span 2'},{},{},{rs:'span 2'},{},{cs:'span 2'},{},{},{cs:'span 2',rs:'span 2'},{},{},{}];
    return (
      <div style={{ padding: `${44*pad}px 40px`, background: 'var(--t-section)' }}>
        <TSectionHead eyebrow={C.gallery.eyebrow} title={C.gallery.title} italic={C.gallery.italic} theme={theme}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gridAutoRows: 110, gap: 9, maxWidth: 900, marginInline: 'auto' }}>
          {tones.map((t,i) => <Tile key={i} i={i} style={{ gridColumn: spans[i]?.cs, gridRow: spans[i]?.rs }}/>)}
        </div>
      </div>
    );
  }
  if (variant === 'strip') {
    return (
      <div style={{ padding: `${44*pad}px 0`, background: 'var(--t-section)' }}>
        <div style={{ padding: '0 40px' }}><TSectionHead eyebrow={C.gallery.eyebrow} title={C.gallery.title} italic={C.gallery.italic} theme={theme}/></div>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 40px 8px' }}>
          {tones.slice(0,8).map((t,i) => <div key={i} style={{ flex: '0 0 200px' }}><Tile i={i} style={{ aspectRatio: '3/4' }}/></div>)}
        </div>
      </div>
    );
  }
  if (variant === 'masonry') {
    return (
      <div style={{ padding: `${44*pad}px 40px`, background: 'var(--t-section)' }}>
        <TSectionHead eyebrow={C.gallery.eyebrow} title={C.gallery.title} italic={C.gallery.italic} theme={theme}/>
        <div style={{ columnCount: 4, columnGap: 9, maxWidth: 940, marginInline: 'auto' }}>
          {tones.map((t,i) => <div key={i} style={{ breakInside: 'avoid', marginBottom: 9 }}><Tile i={i} style={{ aspectRatio: [3/4,1,4/5,1,3/4,1][i%6] }}/></div>)}
        </div>
      </div>
    );
  }
  if (variant === 'slideshow') {
    return (
      <div style={{ padding: `${44*pad}px 40px`, background: 'var(--t-section)' }}>
        <TSectionHead eyebrow={C.gallery.eyebrow} title={C.gallery.title} italic={C.gallery.italic} theme={theme}/>
        <div style={{ maxWidth: 760, marginInline: 'auto' }}>
          <Tile i={0} style={{ aspectRatio: '16/9', marginBottom: 9 }}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>{tones.slice(1,7).map((t,i) => <Tile key={i} i={i+1} style={{ aspectRatio: '1/1' }}/>)}</div>
        </div>
      </div>
    );
  }
  if (variant === 'polaroid') {
    return (
      <div style={{ padding: `${44*pad}px 40px`, background: 'var(--t-section)' }}>
        <TSectionHead eyebrow={C.gallery.eyebrow} title={C.gallery.title} italic={C.gallery.italic} theme={theme}/>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14, maxWidth: 880, marginInline: 'auto' }}>
          {tones.slice(0,8).map((t,i) => (
            <div key={i} style={{ width: 150, background: '#fffdf7', padding: '8px 8px 28px', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', transform: `rotate(${[-3,2,-1.5,3,-2,1.5,-2.5,2][i%8]}deg)` }}>
              <Tile i={i} style={{ aspectRatio: '1/1' }}/>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: `${44*pad}px 40px`, background: 'var(--t-section)' }}>
      <TSectionHead eyebrow={C.gallery.eyebrow} title={C.gallery.title} italic={C.gallery.italic} theme={theme}/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 9, maxWidth: 940, marginInline: 'auto' }}>
        {tones.map((t,i) => <Tile key={i} i={i} style={{ aspectRatio: '1/1' }}/>)}
      </div>
    </div>
  );
}

/* ---------- RSVP ---------- */
function RsvpBlock({ ctx, variant }) {
  const { theme, look, pad, C } = ctx;
  const foil = theme.foil;
  const ital = (s) => s ? <span style={{ fontStyle: theme.id === 'editorial' ? 'normal' : 'italic', fontWeight: 400 }}> {s}</span> : null;
  const onLight = variant === 'split' || variant === 'minimal';
  const fire = () => { try { window.dispatchEvent(new CustomEvent('pl-open-rsvp')); } catch (e) {} };
  const inner = (big) => (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 'var(--t-eyebrow-ls)', textTransform: 'uppercase', opacity: 0.72, marginBottom: 10, color: onLight ? 'var(--t-accent-ink)' : 'inherit' }}>{C.rsvp.eyebrow}</div>
      <h2 style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: big ? 48 : 38, margin: '0 0 8px', color: onLight ? 'var(--t-ink)' : 'var(--t-rsvp-ink)', letterSpacing: '-0.02em' }}>{C.rsvp.title}{ital(C.rsvp.italic)}</h2>
      <div style={{ fontSize: 14, opacity: onLight ? 0.85 : 0.78, marginBottom: 22, maxWidth: 440, color: onLight ? 'var(--t-ink-soft)' : 'inherit' }}>{C.rsvp.sub}</div>
      <span onClick={fire} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: look.button === 'sharp' ? 0 : look.button === 'square' ? 4 : 999, background: onLight ? 'var(--t-accent)' : 'var(--t-rsvp-ink)', color: onLight ? 'var(--t-paper)' : (foil ? '#3A2D08' : 'var(--t-rsvp)'), fontSize: 14, fontWeight: 700 }}>{C.cta} <Icon name="arrow-right" size={14} color={onLight ? 'var(--t-paper)' : (foil ? '#3A2D08' : 'var(--t-rsvp)')}/></span>
    </div>
  );
  if (variant === 'split') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'stretch', background: 'var(--t-section)' }}>
        <div style={{ minHeight: 320 }}><SitePhoto photosOn={false} id="rsvp-split" look="clean" tone="dusk" aspect="auto" style={{ height: '100%' }}/></div>
        <div style={{ padding: `${52*pad}px 44px`, display: 'grid', alignContent: 'center' }}>{inner(true)}</div>
      </div>
    );
  }
  if (variant === 'banner') {
    return (
      <div style={{ padding: `${28*pad}px 40px`, background: foil ? 'linear-gradient(135deg,#B8893A,#E6C877,#C9A24B)' : 'var(--t-rsvp)', color: 'var(--t-rsvp-ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div><div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.7 }}>{C.rsvp.eyebrow}</div><div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 30 }}>{C.rsvp.title}{ital(C.rsvp.italic)}</div></div>
        <span onClick={fire} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 999, background: 'var(--t-rsvp-ink)', color: foil ? '#3A2D08' : 'var(--t-rsvp)', fontSize: 14, fontWeight: 700 }}>{C.cta} <Icon name="arrow-right" size={14} color={foil ? '#3A2D08' : 'var(--t-rsvp)'}/></span>
      </div>
    );
  }
  if (variant === 'minimal') {
    return (
      <div style={{ padding: `${56*pad}px 40px`, textAlign: 'center', background: 'var(--t-section)' }}>{inner(true)}</div>
    );
  }
  return (
    <div style={{ position: 'relative', padding: `${60*pad}px 40px`, textAlign: 'center', overflow: 'hidden',
      background: foil ? 'linear-gradient(135deg, #B8893A 0%, #E6C877 28%, #C9A24B 52%, #F0DDA0 74%, #B8893A 100%)' : 'var(--t-rsvp)',
      color: 'var(--t-rsvp-ink)' }}>
      {inner(true)}
    </div>
  );
}

/* ---------- FAQ / TRIBUTES ---------- */
function FaqBlock({ ctx, variant }) {
  const { theme, look, pad, C } = ctx;
  const qs = C.faq.qs || [];
  let body = <div style={{ maxWidth: 640, margin: '0 auto' }}><KFaq qs={qs} look={look.card}/></div>;
  if (variant === 'twocol') {
    body = (
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 28px' }}>
        {qs.map((qn, i) => (
          <div key={i}><div style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 16, color: 'var(--t-accent-ink)' }}>{qn}</div><div style={{ fontSize: 13, color: 'var(--t-ink-soft)', lineHeight: 1.5, marginTop: 3 }}>A short, friendly answer goes here.</div></div>
        ))}
      </div>
    );
  } else if (variant === 'numbered') {
    body = (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {qs.map((qn, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, alignItems: 'baseline', padding: '15px 0', borderBottom: '1px solid var(--t-line-soft)' }}>
            <span style={{ fontFamily: 'var(--t-display)', fontWeight: 'var(--t-display-wght)', fontSize: 22, color: 'var(--t-ink-muted)' }}>{String(i+1).padStart(2,'0')}</span>
            <span style={{ fontSize: 14.5 }}>{qn}</span>
          </div>
        ))}
      </div>
    );
  } else if (variant === 'cards') {
    body = (
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {qs.map((qn, i) => <TCard key={i} look={look.card} style={{ padding: 16 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{qn}</div><div style={{ fontSize: 12.5, color: 'var(--t-ink-soft)', marginTop: 5, lineHeight: 1.5 }}>A short, friendly answer goes here.</div></TCard>)}
      </div>
    );
  }
  return (
    <div style={{ padding: `${48*pad}px 40px` }}>
      <TSectionHead eyebrow={C.faq.eyebrow} title={C.faq.title} italic={C.faq.italic} theme={theme}/>
      {body}
    </div>
  );
}

/* Hero photo cluster — treatment follows theme */
function HeroPhotos({ look, photosOn }) {
  const tones = ['warm','sage','peach','lavender','dusk'];
  if (look.photo === 'arch' || look.photo === 'deckle') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32, alignItems: 'flex-end' }}>
        {['warm','dusk','lavender'].map((t,i) => (
          <div key={i} style={{ width: i === 1 ? 150 : 116, transform: `translateY(${i===1?0:14}px)` }}>
            <SitePhoto photosOn={photosOn} id={`hero-${i}`} look={look.photo} tone={t} aspect={i===1 ? '3/4' : '4/5'}/>
          </div>
        ))}
      </div>
    );
  }
  if (look.photo === 'clean') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 32 }}>
        {['warm','dusk','lavender','peach'].map((t,i) => (<SitePhoto key={i} photosOn={photosOn} id={`hero-${i}`} look="clean" tone={t} aspect="3/4"/>))}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 32 }}>
      {tones.map((t,i) => (
        <div key={i} style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--t-paper)', boxShadow: '0 3px 10px rgba(0,0,0,0.14)', transform: `rotate(${(i-2)*3}deg) translateY(${Math.abs(i-2)*-3}px)` }}>
          <PhotoPlaceholder tone={t} aspect="1/1"/>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { ThemedSite, TCOUPLE });
