/* Pearloom — published-site theme catalogue + themeRootStyle().
   VERBATIM-SHAPED port of src/components/pearloom/site/themes.ts.
   The renderer reads a theme, calls themeRootStyle(), and spreads the
   result onto the .pl8-guest root so every var(--t-*) re-skins.
   This is the production contract — kit blocks bind to --t-* only. */
window.PEARLOOM_SITE_THEMES = [
  { id:'santorini', name:'Santorini Linen', blurb:'Sun-bleached linen, Aegean blue, whitewash & olive.',
    swatches:['#3F6E92','#283D4E','#C2A165','#EDE7DA'], texture:'linen', motif:'olive',
    look:{ card:'frame', button:'square', divider:'sprig', photo:'arch', heroAlign:'center', motifDensity:'sparse' },
    vars:{ '--t-paper':'#F5F1E8','--t-section':'#EDE7DA','--t-card':'#FBF9F3','--t-ink':'#283D4E','--t-ink-soft':'#4A6076','--t-ink-muted':'#8A9AA6','--t-accent':'#3F6E92','--t-accent-2':'#7C9BB0','--t-accent-bg':'#E2EAEF','--t-accent-ink':'#2C5571','--t-gold':'#C2A165','--t-line':'rgba(40,61,78,0.16)','--t-line-soft':'rgba(40,61,78,0.08)','--t-rsvp':'#283D4E','--t-rsvp-ink':'#F5F1E8','--t-display':"'Cormorant Garamond', Georgia, serif",'--t-body':"'Geist', sans-serif",'--t-script':"'Caveat', cursive",'--t-radius':'5px','--t-radius-lg':'8px','--t-display-wght':'600','--t-hero-scale':'1.18','--t-eyebrow-ls':'0.2em','--t-shadow':'0 1px 0 rgba(40,61,78,0.05)' } },
  { id:'tuscan', name:'Tuscan Watercolor', blurb:'Soft washes, terracotta & sage, blooms and lemons.',
    swatches:['#C2693E','#8A9A6B','#C99A4E','#F4E3D3'], texture:'watercolor', motif:'bloom',
    look:{ card:'wash', button:'pill', divider:'brush', photo:'tape', heroAlign:'center', motifDensity:'generous' },
    vars:{ '--t-paper':'#FBF6EC','--t-section':'#F6ECDC','--t-card':'#FFFCF5','--t-ink':'#4B3D2A','--t-ink-soft':'#6E5B43','--t-ink-muted':'#A0907A','--t-accent':'#C2693E','--t-accent-2':'#D89A6A','--t-accent-bg':'#F4E3D3','--t-accent-ink':'#A4502A','--t-gold':'#C99A4E','--t-line':'rgba(75,61,42,0.15)','--t-line-soft':'rgba(75,61,42,0.08)','--t-rsvp':'#4B3D2A','--t-rsvp-ink':'#FBF6EC','--t-display':"'Fraunces', Georgia, serif",'--t-body':"'Geist', sans-serif",'--t-script':"'Caveat', cursive",'--t-radius':'16px','--t-radius-lg':'24px','--t-display-wght':'500','--t-hero-scale':'1','--t-eyebrow-ls':'0.14em','--t-shadow':'0 14px 30px rgba(75,61,42,0.10)' } },
  { id:'garden', name:'Pressed Garden', blurb:'Cotton paper, pressed wildflowers, the Pearloom warmth.',
    swatches:['#B7A4D0','#8B9C5A','#EAB286','#F3E9D4'], texture:'paper', motif:'pressed',
    look:{ card:'soft', button:'pill', divider:'dot', photo:'polaroid', heroAlign:'center', motifDensity:'generous' },
    vars:{ '--t-paper':'#FDFAF0','--t-section':'#F3E9D4','--t-card':'#FFFEF7','--t-ink':'#3D4A1F','--t-ink-soft':'#566438','--t-ink-muted':'#8A8671','--t-accent':'#B7A4D0','--t-accent-2':'#C4B5D9','--t-accent-bg':'#E8E0F0','--t-accent-ink':'#6B5A8C','--t-gold':'#C19A4B','--t-line':'rgba(61,74,31,0.14)','--t-line-soft':'rgba(61,74,31,0.08)','--t-rsvp':'#3D4A1F','--t-rsvp-ink':'#F8F1E4','--t-display':"'Fraunces', Georgia, serif",'--t-body':"'Geist', sans-serif",'--t-script':"'Caveat', cursive",'--t-radius':'14px','--t-radius-lg':'22px','--t-display-wght':'600','--t-hero-scale':'1','--t-eyebrow-ls':'0.14em','--t-shadow':'0 8px 22px rgba(61,74,31,0.08)' } },
  { id:'editorial', name:'Modern Editorial', blurb:'Flat matte, high-contrast type. The clean counterpoint.',
    swatches:['#1A1A17','#B08940','#E9E7E0','#F4F3EF'], texture:'none', motif:'none',
    look:{ card:'flat', button:'sharp', divider:'rule', photo:'clean', heroAlign:'left', motifDensity:'none' },
    vars:{ '--t-paper':'#F4F3EF','--t-section':'#EAE8E1','--t-card':'#FBFAF7','--t-ink':'#1A1A17','--t-ink-soft':'#46453E','--t-ink-muted':'#8A8980','--t-accent':'#1A1A17','--t-accent-2':'#B08940','--t-accent-bg':'#E9E7E0','--t-accent-ink':'#1A1A17','--t-gold':'#B08940','--t-line':'rgba(26,26,23,0.16)','--t-line-soft':'rgba(26,26,23,0.08)','--t-rsvp':'#1A1A17','--t-rsvp-ink':'#F4F3EF','--t-display':"'Geist', sans-serif",'--t-body':"'Geist', sans-serif",'--t-script':"'Geist', sans-serif",'--t-radius':'2px','--t-radius-lg':'3px','--t-display-wght':'800','--t-hero-scale':'1','--t-eyebrow-ls':'0.24em','--t-shadow':'none' } },
  { id:'midnight', name:'Midnight Velvet', blurb:'Inky velvet, candlelight gold — made for evenings.',
    swatches:['#1A1B2E','#C9A24B','#B9A6E0','#262842'], dark:true, foil:true, texture:'velvet', motif:'pressed',
    look:{ card:'soft', button:'pill', divider:'dot', photo:'clean', heroAlign:'center', motifDensity:'sparse' },
    vars:{ '--t-paper':'#1A1B2E','--t-section':'#20223A','--t-card':'#262842','--t-ink':'#F1EBDD','--t-ink-soft':'#C4BDD0','--t-ink-muted':'#8B86A0','--t-accent':'#B9A6E0','--t-accent-2':'#C9A24B','--t-accent-bg':'#2E2C50','--t-accent-ink':'#D9C9F0','--t-gold':'#C9A24B','--t-line':'rgba(241,235,221,0.16)','--t-line-soft':'rgba(241,235,221,0.09)','--t-rsvp':'#C9A24B','--t-rsvp-ink':'#1A1B2E','--t-display':"'Cormorant Garamond', Georgia, serif",'--t-body':"'Geist', sans-serif",'--t-script':"'Caveat', cursive",'--t-radius':'12px','--t-radius-lg':'18px','--t-display-wght':'500','--t-hero-scale':'1.08','--t-eyebrow-ls':'0.18em','--t-shadow':'0 16px 40px rgba(0,0,0,0.40)' } },
  { id:'coastal', name:'Coastal Ink', blurb:'Deckled paper, navy ink line-work, sea-glass calm.',
    swatches:['#2C5E7A','#1F3A4D','#C9B89A','#E8E4D6'], texture:'cotton', motif:'none',
    look:{ card:'frame', button:'square', divider:'deckle', photo:'deckle', heroAlign:'center', motifDensity:'none' },
    vars:{ '--t-paper':'#EAE5D7','--t-section':'#E0DAC8','--t-card':'#F4F0E4','--t-ink':'#1F3A4D','--t-ink-soft':'#3E5B6E','--t-ink-muted':'#82929E','--t-accent':'#2C5E7A','--t-accent-2':'#6E93A8','--t-accent-bg':'#DCE5E7','--t-accent-ink':'#1F4254','--t-gold':'#B89A5E','--t-line':'rgba(31,58,77,0.18)','--t-line-soft':'rgba(31,58,77,0.09)','--t-rsvp':'#1F3A4D','--t-rsvp-ink':'#EAE5D7','--t-display':"'Cormorant Garamond', Georgia, serif",'--t-body':"'Geist', sans-serif",'--t-script':"'Caveat', cursive",'--t-radius':'2px','--t-radius-lg':'3px','--t-display-wght':'600','--t-hero-scale':'1.12','--t-eyebrow-ls':'0.22em','--t-shadow':'0 1px 0 rgba(31,58,77,0.06)' } },

  /* ── New collection — reconciled into the real --t-* contract ── */
  { id:'amalfi', name:'Amalfi Citrus', blurb:'Sun-bleached blue, lemon and terracotta — a coastal supper.',
    swatches:['#2E6B8A','#C6703D','#D9B44A','#FBF6EA'], texture:'linen', motif:'bloom',
    look:{ card:'frame', button:'pill', divider:'sprig', photo:'arch', heroAlign:'center', motifDensity:'generous' },
    vars:{ '--t-paper':'#FBF6EA','--t-section':'#F1E7D4','--t-card':'#FFFCF4','--t-ink':'#1A2A33','--t-ink-soft':'#3C5560','--t-ink-muted':'#7E8E96','--t-accent':'#2E6B8A','--t-accent-2':'#5E94AD','--t-accent-bg':'#E2EAEF','--t-accent-ink':'#235874','--t-gold':'#D9B44A','--t-line':'rgba(26,42,51,0.16)','--t-line-soft':'rgba(26,42,51,0.08)','--t-rsvp':'#C6703D','--t-rsvp-ink':'#FBF6EA','--t-display':"'Fraunces', Georgia, serif",'--t-body':"'Geist', sans-serif",'--t-script':"'Caveat', cursive",'--t-radius':'14px','--t-radius-lg':'22px','--t-display-wght':'500','--t-hero-scale':'1.06','--t-eyebrow-ls':'0.16em','--t-shadow':'0 10px 26px rgba(26,42,51,0.10)' } },
  { id:'first-light', name:'First Light', blurb:'Dawn rose and gold — the morning after, every year after.',
    swatches:['#C6563D','#C19A4B','#D9A89E','#FCF4EE'], texture:'paper', motif:'pressed',
    look:{ card:'soft', button:'pill', divider:'dot', photo:'polaroid', heroAlign:'center', motifDensity:'sparse' },
    vars:{ '--t-paper':'#FCF4EE','--t-section':'#F6E4DA','--t-card':'#FFFBF7','--t-ink':'#3A2A2A','--t-ink-soft':'#5E4742','--t-ink-muted':'#9C8780','--t-accent':'#C6563D','--t-accent-2':'#D9897A','--t-accent-bg':'#F6DDD4','--t-accent-ink':'#A63F2A','--t-gold':'#C19A4B','--t-line':'rgba(58,42,42,0.14)','--t-line-soft':'rgba(58,42,42,0.07)','--t-rsvp':'#C6563D','--t-rsvp-ink':'#FCF4EE','--t-display':"'Fraunces', Georgia, serif",'--t-body':"'Geist', sans-serif",'--t-script':"'Caveat', cursive",'--t-radius':'14px','--t-radius-lg':'22px','--t-display-wght':'600','--t-hero-scale':'1','--t-eyebrow-ls':'0.14em','--t-shadow':'0 8px 22px rgba(58,42,42,0.09)' } },
  { id:'deco-gilt', name:'Deco Gilt', blurb:'Jazz-age geometry — ink, gilt and a hard-edged fan.',
    swatches:['#14110C','#C9A24B','#7C8A6A','#F3ECD9'], dark:true, foil:true, texture:'velvet', motif:'none',
    look:{ card:'flat', button:'sharp', divider:'rule', photo:'clean', heroAlign:'left', motifDensity:'none' },
    vars:{ '--t-paper':'#14110C','--t-section':'#1C1810','--t-card':'#211C13','--t-ink':'#F3ECD9','--t-ink-soft':'#C9C0A8','--t-ink-muted':'#8A8266','--t-accent':'#C9A24B','--t-accent-2':'#7C8A6A','--t-accent-bg':'#2A2416','--t-accent-ink':'#E6C977','--t-gold':'#C9A24B','--t-line':'rgba(243,236,217,0.16)','--t-line-soft':'rgba(243,236,217,0.08)','--t-rsvp':'#C9A24B','--t-rsvp-ink':'#14110C','--t-display':"'Fraunces', Georgia, serif",'--t-body':"'Geist Mono', monospace",'--t-script':"'Caveat', cursive",'--t-radius':'1px','--t-radius-lg':'2px','--t-display-wght':'700','--t-hero-scale':'1.1','--t-eyebrow-ls':'0.3em','--t-shadow':'0 16px 40px rgba(0,0,0,0.45)' } },
  { id:'tide-coast', name:'Tide & Coast', blurb:'Fog, driftwood and rope — an unhurried seaside vow.',
    swatches:['#5E7A82','#C8BFA5','#9DB0B2','#F2F1EC'], texture:'cotton', motif:'none',
    look:{ card:'frame', button:'square', divider:'deckle', photo:'deckle', heroAlign:'center', motifDensity:'sparse' },
    vars:{ '--t-paper':'#F2F1EC','--t-section':'#E6E5DD','--t-card':'#FAFAF6','--t-ink':'#2C353A','--t-ink-soft':'#4E5A60','--t-ink-muted':'#8B969B','--t-accent':'#5E7A82','--t-accent-2':'#9DB0B2','--t-accent-bg':'#DEE5E5','--t-accent-ink':'#46626A','--t-gold':'#B8A580','--t-line':'rgba(44,53,58,0.16)','--t-line-soft':'rgba(44,53,58,0.08)','--t-rsvp':'#2C353A','--t-rsvp-ink':'#F2F1EC','--t-display':"'Cormorant Garamond', Georgia, serif",'--t-body':"'Geist', sans-serif",'--t-script':"'Caveat', cursive",'--t-radius':'3px','--t-radius-lg':'5px','--t-display-wght':'600','--t-hero-scale':'1.12','--t-eyebrow-ls':'0.2em','--t-shadow':'0 1px 0 rgba(44,53,58,0.06)' } },
];

var PAD = { cozy:0.74, comfortable:1, spacious:1.32 };
/* Port of themeRootStyle(): emit --t-* PLUS base-token shadows so any
   markup referencing base vars re-skins for free. */
window.themeRootStyle = function (theme, density) {
  var v = theme.vars; var pad = PAD[density || 'comfortable'] || 1;
  var s = {};
  for (var k in v) s[k] = v[k];
  s['--t-pad'] = String(pad);
  s['--paper']=v['--t-paper']; s['--card']=v['--t-card']; s['--ink']=v['--t-ink'];
  s['--ink-soft']=v['--t-ink-soft']; s['--ink-muted']=v['--t-ink-muted'];
  s['--cream']=v['--t-paper']; s['--cream-2']=v['--t-section']; s['--cream-3']=v['--t-section'];
  s['--line']=v['--t-line']; s['--line-soft']=v['--t-line-soft']; s['--card-ring']=v['--t-line-soft'];
  s['--font-display']=v['--t-display']; s['--gold']=v['--t-gold'];
  s.fontFamily=v['--t-body']; s.color=v['--t-ink']; s.background=v['--t-paper'];
  return s;
};
