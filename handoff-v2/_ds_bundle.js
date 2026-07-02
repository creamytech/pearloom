/* @ds-bundle: {"format":3,"namespace":"PearloomDesignSystem_55118c","components":[{"name":"Folio","sourcePath":"components/brand/Folio.jsx"},{"name":"Monogram","sourcePath":"components/brand/Monogram.jsx"},{"name":"Pearl","sourcePath":"components/brand/Pearl.jsx"},{"name":"PearloomGlyph","sourcePath":"components/brand/PearloomGlyph.jsx"},{"name":"PearloomWordmark","sourcePath":"components/brand/PearloomGlyph.jsx"},{"name":"PearloomLogo","sourcePath":"components/brand/PearloomGlyph.jsx"},{"name":"Thread","sourcePath":"components/brand/Thread.jsx"},{"name":"WeaveLoader","sourcePath":"components/brand/WeaveLoader.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"Field","sourcePath":"components/core/Field.jsx"},{"name":"Divider","sourcePath":"components/motifs/Divider.jsx"},{"name":"Motif","sourcePath":"components/motifs/Motif.jsx"},{"name":"MOTIF_NAMES","sourcePath":"components/motifs/Motif.jsx"}],"sourceHashes":{"assets/pearloom-motion.js":"6ed5fae263e6","components/brand/Folio.jsx":"b828b10bf101","components/brand/Monogram.jsx":"e0b5652490a6","components/brand/Pearl.jsx":"feb1f6157ab1","components/brand/PearloomGlyph.jsx":"98921cf0faaf","components/brand/Thread.jsx":"631c3511cdc4","components/brand/WeaveLoader.jsx":"313a19750613","components/core/Badge.jsx":"360500651f90","components/core/Button.jsx":"558b91e12a60","components/core/Card.jsx":"76f4104bcf2f","components/core/Eyebrow.jsx":"dbad1d7b7c7c","components/core/Field.jsx":"8159f1134861","components/motifs/Divider.jsx":"49b26bd64269","components/motifs/Motif.jsx":"bcb0df5bb700","design_handoff_pearloom_dashboard_editor/themes.js":"12737e1439a6","design_handoff_pearloom_dashboard_editor/tweaks-panel.jsx":"6591467622ed","site-editor/editor.jsx":"dd5e13f7cf41","site-renderer/app.jsx":"740b8265871a","site-renderer/site.jsx":"10c8a3e67333","site-renderer/themes.js":"614d99f79f9e","ui_kits/dashboard/DashShell.jsx":"6b2f190c004a","ui_kits/dashboard/Enhance.jsx":"e67c3c16ee96","ui_kits/dashboard/GuestLink.jsx":"3391063cf6be","ui_kits/dashboard/Icons.jsx":"9644f4bd5a44","ui_kits/dashboard/Premium.jsx":"5030b2fad4bf","ui_kits/dashboard/ScreensExtra.jsx":"066bdc17e1f4","ui_kits/dashboard/ScreensGuests.jsx":"05f8eaa61b15","ui_kits/dashboard/ScreensHome.jsx":"65d220964e0f","ui_kits/dashboard/ScreensSite.jsx":"002516b60ae4","ui_kits/dashboard/ScreensStudio.jsx":"6591fa1249c3","ui_kits/dashboard/tweaks-panel.jsx":"6591467622ed","ui_kits/editor/Editor.jsx":"d5acf37e4f7d","ui_kits/marketing/Hero.jsx":"301008b71876","ui_kits/marketing/Nav.jsx":"51d5cb4ab3c8","ui_kits/marketing/Sections.jsx":"2bcb96ac95b9","ui_kits/renderer/themes.js":"12737e1439a6","ui_kits/wallpapers/wallpaper-engine.js":"06ad40239528","ui_kits/wizard/Wizard.jsx":"9a6ae368992a"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PearloomDesignSystem_55118c = window.PearloomDesignSystem_55118c || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// assets/pearloom-motion.js
try { (() => {
/* ═══════════════════════════════════════════════════════════════
   Pearloom Motion — the runtime that brings tokens/animation.css to
   life. Vanilla JS, no deps, reduced-motion aware. Auto-initialises
   on DOMContentLoaded.

   API (window.PearloomMotion):
     .init(root?)            — wire scroll-reveals under root (idempotent)
     .reveal(el, opts?)      — reveal one element now
     .weave(onPeak?, opts?)  — play the two-strand page transition; runs
                               onPeak() at the covered moment (swap content
                               / navigate there). Returns a Promise.
     .navigate(href)         — weave, then location.assign(href)

   Markup:
     <h1 data-reveal="press">…           (up·down·left·right·fade·scale·thread·press·rise)
     <div data-reveal-stagger> <child/> … (children reveal in sequence)
     data-reveal-delay="120"             (ms, per element)
     data-reveal-once="false"            (re-animate every time it enters)
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Scroll reveals ──────────────────────────────────────────────
  var io = null;
  function ensureObserver() {
    if (io || REDUCED || !('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        revealNow(el);
        if (el.getAttribute('data-reveal-once') !== 'false') io.unobserve(el);else {/* allow re-trigger: reset when it leaves (handled below) */}
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08
    });
  }
  function revealNow(el) {
    var delay = el.getAttribute('data-reveal-delay');
    if (delay != null && delay !== '') el.style.setProperty('--pl-reveal-delay', parseFloat(delay) + 'ms');
    el.setAttribute('data-revealed', '');
  }
  function wireStagger(root) {
    (root || document).querySelectorAll('[data-reveal-stagger]').forEach(function (group) {
      var step = parseFloat(group.getAttribute('data-reveal-stagger')) || 80;
      var base = parseFloat(group.getAttribute('data-reveal-delay')) || 0;
      var kids = group.children;
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (!k.hasAttribute('data-reveal')) k.setAttribute('data-reveal', group.getAttribute('data-reveal-as') || 'up');
        if (!k.hasAttribute('data-reveal-delay')) k.setAttribute('data-reveal-delay', String(base + i * step));
      }
    });
  }
  function init(root) {
    root = root || document;
    // Flag the root so the hidden start-states in animation.css engage
    // (progressive enhancement: no JS = content stays visible).
    if (!REDUCED) document.documentElement.classList.add('pl-motion-ready');
    wireStagger(root);
    var els = root.querySelectorAll('[data-reveal]');
    if (REDUCED || !('IntersectionObserver' in window)) {
      els.forEach(function (el) {
        el.setAttribute('data-revealed', '');
      });
      return;
    }
    ensureObserver();
    els.forEach(function (el) {
      if (el.hasAttribute('data-revealed')) return;
      // already in view on load? reveal next frame so the transition runs.
      io.observe(el);
    });
  }
  function reveal(el, opts) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (el) revealNow(el);
  }

  // ── The weave transition ────────────────────────────────────────
  // Two paper panels close from top & bottom; olive + gold threads draw
  // across the seam; onPeak fires fully-covered; panels open away.
  function weave(onPeak, opts) {
    opts = opts || {};
    var dur = opts.duration || 620;
    return new Promise(function (resolve) {
      if (REDUCED) {
        if (onPeak) onPeak();
        resolve();
        return;
      }
      var ov = document.createElement('div');
      ov.className = 'pl-weave-overlay';
      var ease = 'cubic-bezier(0.16,1,0.3,1)';
      var top = document.createElement('div');
      top.className = 'pl-weave-panel top';
      var seam = document.createElement('div');
      seam.className = 'pl-weave-seam';
      var bot = document.createElement('div');
      bot.className = 'pl-weave-panel bot';
      ov.appendChild(top);
      ov.appendChild(seam);
      ov.appendChild(bot);

      // seam threads
      var W = window.innerWidth;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '20');
      svg.setAttribute('viewBox', '0 0 ' + W + ' 20');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.style.cssText = 'position:absolute;left:0;top:-10px;width:100%;height:20px;overflow:visible';
      function strand(color, off, w) {
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        var amp = 7,
          k = W / 6;
        var d = 'M0 10 ';
        for (var x = 0; x <= 6; x++) d += 'Q ' + (k * x - k / 2).toFixed(0) + ' ' + (10 + (x % 2 ? amp : -amp)) + ' ' + (k * x).toFixed(0) + ' 10 ';
        p.setAttribute('d', d);
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', color);
        p.setAttribute('stroke-width', w);
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('pathLength', '1');
        p.style.strokeDasharray = '1';
        p.style.strokeDashoffset = '1';
        p.style.animation = 'pl-strand-draw ' + dur * 0.55 + 'ms ' + ease + ' ' + off + 'ms forwards';
        return p;
      }
      svg.appendChild(strand('var(--pl-olive)', 60, 2.5));
      svg.appendChild(strand('var(--pl-gold)', 150, 2));
      seam.appendChild(svg);
      document.body.appendChild(ov);
      // close
      top.style.animation = 'pl-weave-close-top ' + dur * 0.5 + 'ms ' + ease + ' forwards';
      bot.style.animation = 'pl-weave-close-bot ' + dur * 0.5 + 'ms ' + ease + ' forwards';
      window.setTimeout(function () {
        if (onPeak) {
          try {
            onPeak();
          } catch (e) {}
        }
        // open away
        top.style.animation = 'pl-weave-open-top ' + dur * 0.5 + 'ms ' + ease + ' forwards';
        bot.style.animation = 'pl-weave-open-bot ' + dur * 0.5 + 'ms ' + ease + ' forwards';
        window.setTimeout(function () {
          ov.remove();
          resolve();
        }, dur * 0.5 + 40);
      }, dur * 0.5 + 120);
    });
  }
  function navigate(href, opts) {
    weave(function () {
      window.location.assign(href);
    }, opts);
  }
  window.PearloomMotion = {
    init: init,
    reveal: reveal,
    weave: weave,
    navigate: navigate,
    reduced: REDUCED
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () {
    init();
  });else init();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "assets/pearloom-motion.js", error: String((e && e.message) || e) }); }

// components/brand/Folio.jsx
try { (() => {
const SIZES = {
  xs: {
    font: '0.54rem',
    tracking: '0.22em',
    rule: 14
  },
  sm: {
    font: '0.62rem',
    tracking: '0.24em',
    rule: 22
  },
  md: {
    font: '0.7rem',
    tracking: '0.28em',
    rule: 32
  }
};

/**
 * Folio — the editorial corner-mark. A mono-uppercase label paired
 * with a 1px gold rule that gives a screen the feel of a printed
 * page: "Edition · No. 03 · Day-of". Use in page corners, panel and
 * modal headers — anywhere a quiet location anchor belongs.
 */
function Folio({
  kicker,
  no,
  label,
  direction = 'row',
  ruleColor = 'var(--pl-gold)',
  color = 'var(--pl-muted)',
  rules = true,
  size = 'sm',
  className,
  style
}) {
  const cfg = SIZES[size] || SIZES.sm;
  const noStr = no == null ? null : `No. ${typeof no === 'number' ? String(no).padStart(2, '0') : no}`;
  const meta = [kicker, noStr, label].filter(Boolean);
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: 'inline-flex',
      flexDirection: direction === 'column' ? 'column' : 'row',
      alignItems: direction === 'column' ? 'flex-start' : 'center',
      gap: direction === 'column' ? 6 : 12,
      fontFamily: 'var(--pl-font-mono)',
      fontSize: cfg.font,
      letterSpacing: cfg.tracking,
      textTransform: 'uppercase',
      color,
      fontWeight: 600,
      ...style
    }
  }, rules && direction === 'row' ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: cfg.rule,
      height: 1,
      background: ruleColor
    }
  }) : null, meta.map((m, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12
    }
  }, m, i < meta.length - 1 ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 3,
      height: 3,
      borderRadius: '50%',
      background: ruleColor,
      opacity: 0.7,
      marginLeft: 6
    }
  }) : null)), rules && direction === 'row' ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: cfg.rule,
      height: 1,
      background: ruleColor
    }
  }) : null, rules && direction === 'column' ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: cfg.rule * 1.4,
      height: 1,
      background: ruleColor,
      marginTop: 6
    }
  }) : null);
}
Object.assign(__ds_scope, { Folio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Folio.jsx", error: String((e && e.message) || e) }); }

// components/brand/Monogram.jsx
try { (() => {
const {
  useId
} = React;
/**
 * Monogram — the couple / host monogram system. Two (or one) initials
 * set in Fraunces, with a choice of editorial frames. The wedding
 * keystone: a save-the-date, a wax-seal favicon, a footer sign-off.
 *
 * Frames: plain · ring · crest · wreath · diamond · interlock.
 * Strokes follow the brand's 1.75px round-cap language; the bead at
 * the join is the Pearloom pearl.
 */
function Monogram({
  left = 'M',
  right = 'J',
  single = false,
  frame = 'ring',
  size = 120,
  ink = 'var(--pl-ink)',
  accent = 'var(--pl-gold)',
  paper = 'var(--pl-cream)',
  showAmp = true,
  className,
  style
}) {
  const rawId = useId();
  const id = `pl-mono-${rawId.replace(/:/g, '')}`;
  const S = 100; // viewBox unit
  const stroke = 2.2;

  // The lettering: one or two initials in Fraunces, with an optional
  // hairline ampersand between. Rendered as SVG text so it inherits
  // the real webfont and themes with `ink`.
  const letters = single ? /*#__PURE__*/React.createElement("text", {
    x: S / 2,
    y: S / 2 + 1,
    textAnchor: "middle",
    dominantBaseline: "central",
    fontFamily: "var(--pl-font-display)",
    fontStyle: "italic",
    fontWeight: "500",
    fontSize: frame === 'plain' ? 62 : 46,
    fill: ink,
    style: {
      fontVariationSettings: '"opsz" 144, "SOFT" 60, "WONK" 0'
    }
  }, left) : /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("text", {
    x: frame === 'interlock' ? S / 2 - 13 : S / 2 - 16,
    y: S / 2 + 1,
    textAnchor: "middle",
    dominantBaseline: "central",
    fontFamily: "var(--pl-font-display)",
    fontWeight: "500",
    fontSize: frame === 'plain' ? 56 : 42,
    fill: ink,
    style: {
      fontVariationSettings: '"opsz" 144, "SOFT" 50'
    }
  }, left), showAmp && !single ? /*#__PURE__*/React.createElement("text", {
    x: S / 2,
    y: S / 2 + 1,
    textAnchor: "middle",
    dominantBaseline: "central",
    fontFamily: "var(--pl-font-display)",
    fontStyle: "italic",
    fontWeight: "400",
    fontSize: frame === 'plain' ? 30 : 22,
    fill: accent,
    style: {
      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1'
    }
  }, "&") : null, /*#__PURE__*/React.createElement("text", {
    x: frame === 'interlock' ? S / 2 + 13 : S / 2 + 16,
    y: S / 2 + 1,
    textAnchor: "middle",
    dominantBaseline: "central",
    fontFamily: "var(--pl-font-display)",
    fontStyle: "italic",
    fontWeight: "500",
    fontSize: frame === 'plain' ? 56 : 42,
    fill: ink,
    style: {
      fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1'
    }
  }, right));
  const Pearl = ({
    cx,
    cy,
    r = 3
  }) => /*#__PURE__*/React.createElement("circle", {
    cx: cx,
    cy: cy,
    r: r,
    fill: accent,
    stroke: paper,
    strokeWidth: "1.4"
  });
  const frames = {
    plain: null,
    ring: /*#__PURE__*/React.createElement("g", {
      fill: "none",
      stroke: accent,
      strokeWidth: stroke
    }, /*#__PURE__*/React.createElement("circle", {
      cx: S / 2,
      cy: S / 2,
      r: 44
    }), /*#__PURE__*/React.createElement(Pearl, {
      cx: S / 2,
      cy: 6
    })),
    diamond: /*#__PURE__*/React.createElement("g", {
      fill: "none",
      stroke: accent,
      strokeWidth: stroke
    }, /*#__PURE__*/React.createElement("rect", {
      x: S / 2 - 33,
      y: S / 2 - 33,
      width: 66,
      height: 66,
      transform: `rotate(45 ${S / 2} ${S / 2})`,
      rx: 4
    }), /*#__PURE__*/React.createElement(Pearl, {
      cx: S / 2,
      cy: 2
    }), /*#__PURE__*/React.createElement(Pearl, {
      cx: S / 2,
      cy: 98
    }), /*#__PURE__*/React.createElement(Pearl, {
      cx: 2,
      cy: S / 2
    }), /*#__PURE__*/React.createElement(Pearl, {
      cx: 98,
      cy: S / 2
    })),
    crest: /*#__PURE__*/React.createElement("g", {
      fill: "none",
      stroke: accent,
      strokeWidth: stroke,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, /*#__PURE__*/React.createElement("path", {
      d: `M ${S / 2 - 38} 20 L ${S / 2 + 38} 20 L ${S / 2 + 38} 58 Q ${S / 2 + 38} 84 ${S / 2} 96 Q ${S / 2 - 38} 84 ${S / 2 - 38} 58 Z`
    }), /*#__PURE__*/React.createElement("path", {
      d: `M ${S / 2 - 30} 30 L ${S / 2 + 30} 30`,
      strokeWidth: 1.2
    }), /*#__PURE__*/React.createElement(Pearl, {
      cx: S / 2,
      cy: 20
    })),
    wreath: /*#__PURE__*/React.createElement("g", {
      fill: "none",
      stroke: accent,
      strokeWidth: 1.8,
      strokeLinecap: "round"
    }, [-1, 1].map(dir => /*#__PURE__*/React.createElement("g", {
      key: dir
    }, /*#__PURE__*/React.createElement("path", {
      d: `M ${S / 2 + dir * 4} 92 Q ${S / 2 + dir * 40} 70 ${S / 2 + dir * 30} 14`
    }), [0.15, 0.3, 0.45, 0.6, 0.75].map((t, i) => {
      const ang = -1.4 + t * 1.2;
      const cx = S / 2 + dir * (8 + t * 30),
        cy = 92 - t * 76;
      return /*#__PURE__*/React.createElement("path", {
        key: i,
        d: `M ${cx} ${cy} q ${dir * 9 * Math.cos(ang)} ${-9 * Math.sin(ang) - 3} ${dir * 4} ${-11}`,
        strokeWidth: 1.5
      });
    }))), /*#__PURE__*/React.createElement(Pearl, {
      cx: S / 2,
      cy: 92
    })),
    interlock: /*#__PURE__*/React.createElement("g", {
      fill: "none",
      stroke: accent,
      strokeWidth: stroke
    }, /*#__PURE__*/React.createElement("circle", {
      cx: S / 2 - 12,
      cy: S / 2,
      r: 30,
      opacity: "0.85"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: S / 2 + 12,
      cy: S / 2,
      r: 30,
      opacity: "0.85"
    }), /*#__PURE__*/React.createElement(Pearl, {
      cx: S / 2,
      cy: S / 2 - 30
    }), /*#__PURE__*/React.createElement(Pearl, {
      cx: S / 2,
      cy: S / 2 + 30
    }))
  };
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${S} ${S}`,
    width: size,
    height: size,
    className: className,
    style: style,
    role: "img",
    "aria-label": single ? `Monogram ${left}` : `Monogram ${left} and ${right}`
  }, frames[frame], letters);
}
Object.assign(__ds_scope, { Monogram });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Monogram.jsx", error: String((e && e.message) || e) }); }

// components/brand/Pearl.jsx
try { (() => {
/**
 * Pearl — the brand's gold pearl bead, the same one knotted into the
 * logo's weft. Use it as inline punctuation beside headlines, inside
 * CTAs, and as a list/status marker. Two looks: a flat SVG bead
 * (default, crisp + themeable) or the iridescent shimmer dot.
 */
function Pearl({
  size = 10,
  iridescent = false,
  style
}) {
  if (iridescent) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: 999,
        background: 'linear-gradient(135deg, #F4ECD8 0%, #E8C77A 30%, #D9A89E 55%, #B8C96B 80%, #F4ECD8 100%)',
        backgroundSize: '200% 200%',
        animation: 'pl-pearl-shimmer 6s ease-in-out infinite',
        boxShadow: 'inset 0 0 4px rgba(255,255,255,0.4), 0 0 1px rgba(31,36,24,0.3)',
        flexShrink: 0,
        ...style
      }
    });
  }
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 12 12",
    "aria-hidden": "true",
    style: {
      flexShrink: 0,
      display: 'inline-block',
      verticalAlign: 'middle',
      ...style
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "6",
    r: "4.4",
    fill: "var(--pl-gold)",
    stroke: "var(--pl-cream)",
    strokeWidth: "1.4"
  }));
}
Object.assign(__ds_scope, { Pearl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Pearl.jsx", error: String((e && e.message) || e) }); }

// components/brand/PearloomGlyph.jsx
try { (() => {
const {
  useId
} = React; // The final, signed-off pear silhouette (vectorized). Body + leaf as
// two solid paths; the spiral is negative space carved by the leaf
// being separate and the body path's interior curve. viewBox 0 0 115.4 186.
const PEAR_BODY = 'm90 92c-4.4-9-5.7-15.4-7.1-25.2-1.6-10.9-8-19.3-15.9-23-2.5-1.3-6.7-1.2-8.6-1.4 0.2-6.7-0.4-12.5-2.2-20.4-1.1-3-2.9-2-4.3-1.1s-2.9 2.2-1.5 4.8 4.2 4.4 5 17c0.1 0.3-1.1-0.1-1.8 0-10.6 1.4-19.4 10.1-21.2 22.7-1.7 11.4-2.5 17.7-8.7 28.6-4.9 8.9-6.9 10.4-10.1 18-2.2 4.8-5.1 12.6-4.6 24.1 0.4 9.1 3.7 22.5 12.3 31.2 7.9 8.2 18.6 14.5 35.1 15.1 26.6 0 45.6-14.1 49.5-35.6 4.2-18.4-1.2-33.1-10.2-47.8l-5.7-7zm-31.4 77.5c-18.6 0-31.7-13.2-31.8-33.5-0.1-17.1 9-26.8 13.8-34.7 5.2-8.6 12.2-28.2 14.4-50.2h0.4c0.7 9.2-0.1 25.3-2.1 34.4-3.9 18.3-11.4 26.3-14.5 38.5-5.9 22.5 8.1 32.7 20.6 32.9 14.1 0.1 18.2-9.6 18.5-17 0.2-6.5-6-13.8-12.9-14.1-5.2-0.1-9.7 3.1-9.8 8.7-0.3 7 7.5 9.9 11.3 5.8-0.1 2.5-2.9 5.2-7.5 4.9-4-0.2-9.1-4-9.1-11.3 0.1-5.8 5.1-16.3 17.3-16.3 12.9-0.3 20.7 9.8 21.1 21 0.3 13.8-9.6 30.9-29.7 30.9zm6.3-137.2c0.5-8.1 5.7-25.3 24.5-25.7 11.5-0.5 15.5 1.3 16.3 1.8 0.5 0.2 1.6 0.6-0.6 3.4-3.4 4.8-8.8 22.1-27.5 23.3-7.9 0.3-9.7-2-13 1.5s-5.2 7.2 0.3-4.3zm0.5 1.6c3.2-4.3 13.3-16.5 25.1-17.9 9.7-1.2-12 1-23.6 17.9h-1.5z';
const PEAR_LEAF = 'm64.9 32.3c-0.1-4.7 3.1-24.3 22.4-25.5 9.7-0.9 14.7-0.2 18 1l0.2 0.1c0.7 0.2 1.3 0.6 0.6 1.5-5.1 7.7-9.4 22.2-25.6 25.4-9.1 1.3-12.3-2.7-15.6 1.2v-3.7z';

/**
 * PearloomGlyph — the brand mark: the solid pear with a carved spiral
 * core, stem and leaf. The final signed-off vectorized silhouette,
 * recolored to brand olive. One `color` paints the whole mark (the
 * spiral is true negative space), so it reverses cleanly to a cream
 * knockout on olive/ink and reads from 16px to hero. `gold`/`paper`
 * are accepted for API compatibility but unused by this mark.
 */
function PearloomGlyph({
  size = 32,
  color = 'var(--pl-olive)',
  gold,
  paper,
  className,
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 115.4 186",
    height: size,
    width: size * (115.4 / 186),
    className: className,
    style: style,
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: PEAR_BODY,
    fill: color
  }), /*#__PURE__*/React.createElement("path", {
    d: PEAR_LEAF,
    fill: color
  }));
}

// The final, signed-off "pearloom" lettering (vectorized), viewBox
// 157 44.6 289 81 → normalized width:height ≈ 3.57:1.
const WORDMARK_PATHS = ['m176.3 72c-8.8 0-16.8 7.2-16.8 17.3v30.7c0 1.1 0.6 1.9 1.7 1.9s1.8-0.8 1.8-1.9v-19.8l0.2 0.2c3.2 3.6 6.9 6.4 13.1 6.4 9.3 0 16.8-6.9 16.8-16.8 0-10-7.3-18-16.8-18zm0 31.5c-7.3 0-13-5.7-13-13.5 0-7.3 5.8-14 13-14 7.3 0 13 5.2 13 13.3 0 7.3-5.7 14.2-13 14.2z', 'm216.8 72c-8.8 0-16.4 7-16.4 17.2 0.2 9 6.7 16.9 16.2 17.1 5.3 0 10.4-1.7 14-6.4 0.4-0.6 0.9-1.3 0.1-2.4-0.9-1.1-2.3-1-3 0-3 3.6-6.3 5.3-11.1 5.6-6.2 0-11.7-4.9-12.7-12.1h2.7c1.2-0.2 3.2-0.3 4.7-0.3h19.8c1.8 0 2.4-0.2 2.2-2.1-0.6-8.6-6.3-16.6-16.5-16.6zm-13.1 15c0.9-6 5.9-11.1 12.8-11.1 6.5 0 12.2 4.4 13 11l-25.8 0.1z', 'm276.5 103c-2.6 0.3-3.4-1.5-3.4-4.5v-9.2c0-9.3-7.2-17.2-16.6-17.2-9.3 0-16.9 7.3-16.9 17.2 0.4 12 9.2 17 17.2 17 4.5 0 9.8-1.8 12.4-6.2h0.2l0.2 0.7c0.8 3.4 2.7 5.5 6.5 5.4 1.8 0.1 2.5-0.7 2.5-1.9 0.1-1.1-1-1.7-2.1-1.3zm-19.9 0c-7.5 0-13.1-5.7-13.1-13.6 0-6.6 5.8-13.5 13.1-13.5s12.7 5.4 12.7 13.4c0 7.3-5 13.7-12.7 13.7z', 'm299.3 72.3c-1.5-0.2-4-0.3-5.7-0.1-5.7 0.4-11.6 5.1-11.6 13.5v18.4c0 1.5 3.6 1.9 3.6-0.5v-17.9c0-5.1 3.4-9.8 9.9-9.7 1.6 0 1.9 0.1 3.5 0.3 0.9 0.1 1.9-0.9 2-1.8 0-1-0.9-2.1-1.7-2.2z', 'm323.3 102.5c-1.2 0.5-2.9 0.7-4.3 0.6-4.1 0-8-2.4-9.7-7.9 9.8-5.6 14.7-19.9 14.6-34.4-0.1-5.7-2-13.4-9.9-13.4-4.5 0-9.4 3.1-9.5 12.2l-0.1 30c0 6.7 5.6 16.4 16.9 16.5 1.1-0.1 2.4-0.3 3.1-0.5 1.2-0.4 1.9-1.5 1.1-2.8-0.3-0.4-0.8-0.7-2.2-0.3zm-15.1-41.5c0-5.2 1.7-9.6 6-9.5 4.2 0 5.8 3.4 5.8 9.1 0 12.9-4.4 25-11.6 30.6-0.1-0.7-0.2-1.2-0.1-2.2v-28h-0.1z', 'm343.3 72c-8.9 0-16.4 7.2-16.7 16.8 0 10 7 17.4 16.3 17.4s16.4-7 16.6-16.6c0.5-9.2-7.4-17.6-16.2-17.6zm-0.3 31c-7.2 0-12.7-6.3-12.8-13.7 0-6.5 5.1-13.4 12.7-13.4 8.4 0 13.2 6.6 13.2 13.4 0 7.2-5.7 13.7-13.1 13.7z', 'm378.4 72c-9.2 0-16.7 6.8-17.1 16.8 0.2 9.4 6.2 17.5 16.5 17.4 9.1 0 16.3-6.2 16.7-16.6 0-8.9-7.1-17.6-16.1-17.6zm-0.5 31c-7.9 0-12.9-6.4-13.1-13.6 0-6.6 5.4-13.5 13.1-13.5 7.1 0 13.1 5.9 13.1 13.4 0 7.3-5.7 13.7-13.1 13.7z', 'm432.2 72c-3.7 0-7.6 1.5-9.7 5.3-2.2-3.5-6.1-5.3-9.5-5.3-6.6 0-11 4.5-11.3 11.5l0.1 20.9c0 2.1 3.3 2.4 3.6 0.1l-0.1-20.2c0-4.9 3.4-8.4 7.7-8.4 4.5 0 8 3.2 8 8.4l0.1 20.2c0 2.1 3.3 2.4 3.3 0v-20.2c0-4.8 3.5-8.4 7.7-8.4 4.5 0 7.8 3.2 7.8 8.1v20.4c0 2.1 3.1 2.3 3.1 0v-20.3c0.4-7.4-5.1-12.1-10.8-12.1z'];

/**
 * PearloomWordmark — the final signed-off "pearloom" lettering
 * (vectorized), recolored to brand olive. `color` fills the glyphs;
 * `size` is the cap height in px. Pure vector — crisp at any scale.
 */
function PearloomWordmark({
  size = 24,
  color = 'var(--pl-ink)',
  style
}) {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "157 44.6 289 81",
    height: size,
    width: size * (289 / 81),
    style: {
      display: 'inline-block',
      verticalAlign: 'middle',
      ...style
    },
    role: "img",
    "aria-label": "Pearloom"
  }, WORDMARK_PATHS.map((d, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: d,
    fill: color
  })));
}

/**
 * PearloomLogo — glyph + wordmark lockup.
 */
function PearloomLogo({
  size = 28,
  color = 'var(--pl-ink)'
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: Math.max(6, Math.round(size * 0.36))
    }
  }, /*#__PURE__*/React.createElement(PearloomGlyph, {
    size: size + 12,
    color: color
  }), /*#__PURE__*/React.createElement(PearloomWordmark, {
    size: size * 0.82,
    color: color
  }));
}
Object.assign(__ds_scope, { PearloomGlyph, PearloomWordmark, PearloomLogo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/PearloomGlyph.jsx", error: String((e && e.message) || e) }); }

// components/brand/Thread.jsx
try { (() => {
const {
  useId
} = React;
/**
 * Thread — the visual atom of Pearloom. Two strands (olive + gold)
 * acting as dividers, rules, and editorial flourishes. Replaces every
 * loose <hr> and one-off rule stroke.
 *   weave    — two strands cross at the middle (default)
 *   straight — two parallel hairlines
 *   single   — one gold hairline
 *   bullet   — short rule with a centered bead
 */
function Thread({
  variant = 'weave',
  width = '100%',
  height = 14,
  color = 'var(--pl-olive)',
  color2 = 'var(--pl-gold)',
  weight = 1,
  className,
  style
}) {
  const rawId = useId();
  const id = `pl-thread-${rawId.replace(/:/g, '')}`;
  if (variant === 'bullet') {
    return /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true",
      className: className,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width,
        color,
        ...style
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: weight,
        background: `linear-gradient(90deg, transparent, ${color2} 60%, ${color2})`
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        width: Math.max(6, height * 0.5),
        height: Math.max(6, height * 0.5),
        borderRadius: '50%',
        background: color2,
        display: 'inline-block'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        height: weight,
        background: `linear-gradient(90deg, ${color2}, ${color2} 40%, transparent)`
      }
    }));
  }
  if (variant === 'single') {
    return /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      className: className,
      style: {
        display: 'block',
        width,
        height: weight,
        background: color2,
        ...style
      }
    });
  }
  if (variant === 'straight') {
    return /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true",
      className: className,
      style: {
        width,
        display: 'flex',
        flexDirection: 'column',
        gap: Math.max(2, height / 4),
        ...style
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        height: weight,
        background: color
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        height: weight,
        background: color2
      }
    }));
  }

  // weave — two cubic curves crossing the midline.
  const w = 200;
  const h = height;
  const path1 = `M 0 ${h - 1} C ${w * 0.25} ${h - 1}, ${w * 0.25} 1, ${w * 0.5} 1 S ${w * 0.75} ${h - 1}, ${w} ${h - 1}`;
  const path2 = `M 0 1 C ${w * 0.25} 1, ${w * 0.25} ${h - 1}, ${w * 0.5} ${h - 1} S ${w * 0.75} 1, ${w} 1`;
  return /*#__PURE__*/React.createElement("svg", {
    "aria-hidden": "true",
    className: className,
    width: width,
    height: h,
    viewBox: `0 0 ${w} ${h}`,
    preserveAspectRatio: "none",
    style: {
      display: 'block',
      overflow: 'visible',
      ...style
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: `${id}-a`,
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: color,
    stopOpacity: "0.15"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: color,
    stopOpacity: "1"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: color,
    stopOpacity: "0.15"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: `${id}-b`,
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: color2,
    stopOpacity: "0.15"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: color2,
    stopOpacity: "1"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: color2,
    stopOpacity: "0.15"
  }))), /*#__PURE__*/React.createElement("path", {
    d: path1,
    stroke: `url(#${id}-a)`,
    strokeWidth: weight,
    strokeLinecap: "round",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: path2,
    stroke: `url(#${id}-b)`,
    strokeWidth: weight,
    strokeLinecap: "round",
    fill: "none"
  }));
}
Object.assign(__ds_scope, { Thread });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/Thread.jsx", error: String((e && e.message) || e) }); }

// components/brand/WeaveLoader.jsx
try { (() => {
const {
  useId
} = React;
const SIZES = {
  xs: {
    w: 14,
    stroke: 1.4,
    gap: 6
  },
  sm: {
    w: 22,
    stroke: 1.6,
    gap: 8
  },
  md: {
    w: 36,
    stroke: 1.8,
    gap: 12
  },
  lg: {
    w: 56,
    stroke: 2.2,
    gap: 16
  },
  xl: {
    w: 80,
    stroke: 2.6,
    gap: 20
  }
};

/**
 * WeaveLoader — the single Pearloom loader. Two threads weave across
 * each other on a continuous loop (the brand metaphor in motion).
 * Replaces every spinner. Say "Threading…", never "Loading…".
 */
function WeaveLoader({
  size = 'md',
  label,
  color = 'var(--pl-olive)',
  color2 = 'var(--pl-gold)',
  weight,
  inline = false,
  className,
  style,
  ariaLabel = 'Threading'
}) {
  const rawId = useId();
  const id = `pl-weave-${rawId.replace(/:/g, '')}`;
  const cfg = SIZES[size] || SIZES.md;
  const w = cfg.w;
  const h = Math.round(w * 0.55);
  const sw = weight != null ? weight : cfg.stroke;
  const path1 = `M 0 ${h - 1} C ${w * 0.25} ${h - 1}, ${w * 0.25} 1, ${w * 0.5} 1 S ${w * 0.75} ${h - 1}, ${w} ${h - 1}`;
  const path2 = `M 0 1 C ${w * 0.25} 1, ${w * 0.25} ${h - 1}, ${w * 0.5} ${h - 1} S ${w * 0.75} 1, ${w} 1`;
  const wrapperStyle = inline ? {
    display: 'inline-flex',
    alignItems: 'center',
    gap: cfg.gap,
    verticalAlign: 'middle'
  } : {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: cfg.gap
  };
  return /*#__PURE__*/React.createElement("span", {
    role: "status",
    "aria-label": ariaLabel,
    "aria-live": "polite",
    className: className,
    style: {
      ...wrapperStyle,
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: w,
    height: h,
    viewBox: `0 0 ${w} ${h}`,
    style: {
      display: 'block',
      overflow: 'visible'
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: `${id}-a`,
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: color,
    stopOpacity: "0.18"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: color,
    stopOpacity: "1"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: color,
    stopOpacity: "0.18"
  })), /*#__PURE__*/React.createElement("linearGradient", {
    id: `${id}-b`,
    x1: "0",
    y1: "0",
    x2: "1",
    y2: "0"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: color2,
    stopOpacity: "0.18"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "50%",
    stopColor: color2,
    stopOpacity: "1"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: color2,
    stopOpacity: "0.18"
  }))), /*#__PURE__*/React.createElement("path", {
    d: path1,
    stroke: `url(#${id}-a)`,
    strokeOpacity: "0.18",
    strokeWidth: sw,
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: path2,
    stroke: `url(#${id}-b)`,
    strokeOpacity: "0.18",
    strokeWidth: sw,
    fill: "none",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: path1,
    stroke: color,
    strokeWidth: sw,
    fill: "none",
    strokeLinecap: "round",
    pathLength: "1",
    style: {
      strokeDasharray: '0.32 1',
      animation: `${id}-a 1.6s cubic-bezier(0.4,0,0.6,1) infinite`
    }
  }), /*#__PURE__*/React.createElement("path", {
    d: path2,
    stroke: color2,
    strokeWidth: sw,
    fill: "none",
    strokeLinecap: "round",
    pathLength: "1",
    style: {
      strokeDasharray: '0.32 1',
      animation: `${id}-b 1.6s cubic-bezier(0.4,0,0.6,1) infinite`,
      animationDelay: '0.4s'
    }
  })), label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--pl-font-mono)',
      fontSize: size === 'xs' || size === 'sm' ? '0.6rem' : '0.66rem',
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: 'var(--pl-muted)'
    }
  }, label) : null, /*#__PURE__*/React.createElement("style", null, `
        @keyframes ${id}-a { 0% { stroke-dashoffset: 1; } 100% { stroke-dashoffset: -0.32; } }
        @keyframes ${id}-b { 0% { stroke-dashoffset: 1; } 100% { stroke-dashoffset: -0.32; } }
        @media (prefers-reduced-motion: reduce) {
          [aria-label="${ariaLabel}"] path[style] { animation: none !important; stroke-dasharray: none !important; }
        }
      `));
}
Object.assign(__ds_scope, { WeaveLoader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/WeaveLoader.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const TONES = {
  olive: {
    bg: 'var(--pl-olive-10)',
    fg: 'var(--pl-olive)',
    border: 'var(--pl-olive-20)'
  },
  gold: {
    bg: 'var(--pl-gold-mist)',
    fg: '#8C6E3D',
    border: 'var(--pl-gold-soft)'
  },
  plum: {
    bg: 'var(--pl-plum-mist)',
    fg: 'var(--pl-plum)',
    border: 'var(--pl-plum)'
  },
  neutral: {
    bg: 'var(--pl-cream-deep)',
    fg: 'var(--pl-muted)',
    border: 'var(--pl-divider)'
  },
  ink: {
    bg: 'var(--pl-ink)',
    fg: 'var(--pl-cream)',
    border: 'transparent'
  }
};

/**
 * Badge — a small status / category marker. Two shapes: a mono
 * editorial label (default — uppercase, tracked, the Pearloom voice)
 * or a soft pill. Use sparingly; never pepper a screen with them.
 */
function Badge({
  children,
  tone = 'olive',
  variant = 'label',
  dot = false,
  className,
  style
}) {
  const t = TONES[tone] || TONES.olive;
  const isLabel = variant === 'label';
  return /*#__PURE__*/React.createElement("span", {
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: isLabel ? '4px 9px' : '5px 12px',
      borderRadius: isLabel ? 'var(--pl-radius-sm)' : 'var(--pl-radius-full)',
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.border}`,
      fontFamily: isLabel ? 'var(--pl-font-mono)' : 'var(--pl-font-body)',
      fontSize: isLabel ? 'var(--pl-text-2xs)' : 'var(--pl-text-xs)',
      fontWeight: isLabel ? 500 : 600,
      letterSpacing: isLabel ? '0.16em' : '0',
      textTransform: isLabel ? 'uppercase' : 'none',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...style
    }
  }, dot ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 6,
      height: 6,
      borderRadius: '50%',
      background: 'currentColor',
      flexShrink: 0
    }
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const {
  useState
} = React;
const PALETTES = {
  ink: {
    bg: 'var(--pl-ink)',
    fg: 'var(--pl-cream)',
    hover: 'var(--pl-olive-deep)',
    border: 'none'
  },
  olive: {
    bg: 'var(--pl-olive)',
    fg: 'var(--pl-cream)',
    hover: 'var(--pl-olive-hover)',
    border: 'none'
  },
  paper: {
    bg: 'var(--pl-cream-card)',
    fg: 'var(--pl-ink)',
    hover: 'var(--pl-cream-deep)',
    border: '1px solid var(--pl-divider)'
  },
  terra: {
    bg: 'var(--pl-terra)',
    fg: 'var(--pl-cream)',
    hover: '#8F4828',
    border: 'none'
  },
  ghost: {
    bg: 'transparent',
    fg: 'var(--pl-ink)',
    hover: 'var(--pl-olive-8)',
    border: '1px solid var(--pl-olive-20)'
  }
};
const SIZES = {
  sm: {
    pad: '8px 16px',
    fs: 13
  },
  md: {
    pad: '12px 22px',
    fs: 15
  },
  lg: {
    pad: '16px 30px',
    fs: 17
  }
};

/**
 * Button — the Pearloom action control. Verb-first, lowercase except
 * first letter ("Begin a thread", not "GET STARTED NOW!"). Pill-shaped.
 * The `pearl` variant wears an iridescent gold surface for the single
 * primary CTA on a surface. Always honours the spring press.
 */
function Button({
  children,
  variant = 'ink',
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
  className,
  style
}) {
  const [hover, setHover] = useState(false);
  const isPearl = variant === 'pearl';
  const p = PALETTES[isPearl ? 'ink' : variant] || PALETTES.ink;
  const s = SIZES[size] || SIZES.md;
  const pearlSurface = isPearl ? {
    background: 'linear-gradient(135deg, #F4ECD8 0%, #E8C77A 32%, #D9A89E 58%, #B8C96B 82%, #F4ECD8 100%)',
    backgroundSize: '180% 180%',
    backgroundPosition: hover ? '100% 50%' : '0% 50%',
    color: 'var(--pl-ink)',
    border: '1px solid var(--pl-gold-soft)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), var(--pl-shadow-sm)'
  } : {
    background: hover && !disabled ? p.hover : p.bg,
    color: p.fg,
    border: p.border
  };
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    onClick: onClick,
    disabled: disabled,
    className: className,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...pearlSurface,
      padding: s.pad,
      fontSize: s.fs,
      fontWeight: 500,
      borderRadius: 'var(--pl-radius-full)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background var(--pl-dur-quick) var(--pl-ease-out), background-position var(--pl-dur-slow) var(--pl-ease-out), transform var(--pl-dur-quick) var(--pl-ease-spring)',
      transform: hover && !disabled ? 'translateY(-1px)' : 'translateY(0)',
      fontFamily: 'var(--pl-font-body)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
      letterSpacing: '-0.005em',
      opacity: disabled ? 0.55 : 1,
      whiteSpace: 'nowrap',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
const {
  useState
} = React;
/**
 * Card — the paper surface (BRAND §9, the "paper" layer). Warm cream
 * card, hairline tan border, restrained radius, soft warm shadow.
 * Cards are paper, never glass. Set `interactive` for a hover lift.
 */
function Card({
  children,
  interactive = false,
  padding = 24,
  as = 'div',
  onClick,
  className,
  style
}) {
  const [hover, setHover] = useState(false);
  const Tag = as;
  return /*#__PURE__*/React.createElement(Tag, {
    className: className,
    onClick: onClick,
    onMouseEnter: interactive ? () => setHover(true) : undefined,
    onMouseLeave: interactive ? () => setHover(false) : undefined,
    style: {
      background: 'var(--pl-cream-card)',
      border: '1px solid var(--pl-divider)',
      borderRadius: 'var(--pl-radius-lg)',
      boxShadow: hover ? 'var(--pl-shadow-md)' : 'var(--pl-shadow-sm)',
      padding,
      transform: hover ? 'translateY(-2px)' : 'translateY(0)',
      transition: 'transform var(--pl-dur-base) var(--pl-ease-emphasis), box-shadow var(--pl-dur-base) var(--pl-ease-emphasis)',
      cursor: interactive && onClick ? 'pointer' : 'default',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
/**
 * Eyebrow — the mono-uppercase section kicker, paired with a 1px gold
 * rule on the leading edge (BRAND §4). The quiet label that opens a
 * section above a Fraunces heading.
 */
function Eyebrow({
  children,
  rule = 'leading',
  color = 'var(--pl-muted)',
  ruleColor = 'var(--pl-gold)',
  className,
  style
}) {
  const Rule = () => /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 24,
      height: 1,
      background: ruleColor,
      flexShrink: 0
    }
  });
  return /*#__PURE__*/React.createElement("span", {
    className: className,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 12,
      fontFamily: 'var(--pl-font-mono)',
      fontSize: 'var(--pl-text-2xs)',
      fontWeight: 500,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color,
      ...style
    }
  }, rule === 'leading' || rule === 'both' ? /*#__PURE__*/React.createElement(Rule, null) : null, children, rule === 'trailing' || rule === 'both' ? /*#__PURE__*/React.createElement(Rule, null) : null);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/Field.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
/**
 * Field — a labelled text input. Mono editorial label above a warm
 * paper input with a hairline border that warms to olive on focus.
 * Supports textarea via `multiline`. Plain-word labels (BRAND §7).
 */
function Field({
  label,
  hint,
  value,
  defaultValue,
  onChange,
  placeholder,
  type = 'text',
  multiline = false,
  rows = 3,
  disabled = false,
  id,
  className,
  style
}) {
  const [focus, setFocus] = useState(false);
  const controlStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: multiline ? '12px 14px' : '11px 14px',
    background: 'var(--pl-cream-card)',
    border: `1px solid ${focus ? 'var(--pl-olive)' : 'var(--pl-divider)'}`,
    borderRadius: 'var(--pl-radius-md)',
    boxShadow: focus ? 'var(--pl-shadow-focus)' : 'none',
    color: 'var(--pl-ink)',
    fontFamily: 'var(--pl-font-body)',
    fontSize: 'var(--pl-text-base)',
    lineHeight: 1.5,
    outline: 'none',
    resize: multiline ? 'vertical' : undefined,
    transition: 'border-color var(--pl-dur-quick) var(--pl-ease-out), box-shadow var(--pl-dur-base) var(--pl-ease-out)',
    opacity: disabled ? 0.55 : 1
  };
  const common = {
    id,
    value,
    defaultValue,
    placeholder,
    disabled,
    onChange: onChange ? e => onChange(e.target.value, e) : undefined,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: controlStyle
  };
  return /*#__PURE__*/React.createElement("label", {
    className: className,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 7,
      ...style
    }
  }, label ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--pl-font-mono)',
      fontSize: 'var(--pl-text-2xs)',
      fontWeight: 500,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--pl-muted)'
    }
  }, label) : null, multiline ? /*#__PURE__*/React.createElement("textarea", _extends({
    rows: rows
  }, common)) : /*#__PURE__*/React.createElement("input", _extends({
    type: type
  }, common)), hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--pl-font-body)',
      fontSize: 'var(--pl-text-xs)',
      color: 'var(--pl-muted)'
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Field });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Field.jsx", error: String((e && e.message) || e) }); }

// components/motifs/Divider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Divider — ornamental section breaks beyond the woven Thread. A
 * centered fleuron flanked by hairlines, in the brand's line hand.
 * Use between site sections, above a date, under a chapter title.
 *
 * Ornaments: fleuron · pearl · diamond · sprig · infinity · sun · cross.
 * (`cross` is a soft botanical cross for memorial sites.)
 */
function Divider({
  ornament = 'fleuron',
  width = '100%',
  color = 'var(--pl-divider)',
  accent = 'var(--pl-gold)',
  ink = 'var(--pl-olive)',
  weight = 1,
  className,
  style
}) {
  const P = {
    fill: 'none',
    stroke: ink,
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };
  const ornaments = {
    fleuron: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("path", _extends({
      d: "M16 10 C 8 10, 4 16, 10 18 C 4 20, 8 26, 16 26 C 12 20, 12 16, 16 10 Z"
    }, P, {
      transform: "translate(-2 -8)"
    })), /*#__PURE__*/React.createElement("path", _extends({
      d: "M16 10 C 24 10, 28 16, 22 18 C 28 20, 24 26, 16 26 C 20 20, 20 16, 16 10 Z"
    }, P, {
      transform: "translate(2 -8)"
    })), /*#__PURE__*/React.createElement("circle", {
      cx: "16",
      cy: "10",
      r: "2.6",
      fill: accent
    })),
    pearl: /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
      cx: "16",
      cy: "10",
      r: "4",
      fill: "none",
      stroke: ink,
      strokeWidth: "1.5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "16",
      cy: "10",
      r: "2",
      fill: accent
    })),
    diamond: /*#__PURE__*/React.createElement("g", P, /*#__PURE__*/React.createElement("rect", {
      x: "10",
      y: "4",
      width: "12",
      height: "12",
      transform: "rotate(45 16 10)"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "16",
      cy: "10",
      r: "2",
      fill: accent,
      stroke: "none"
    })),
    sprig: /*#__PURE__*/React.createElement("g", P, /*#__PURE__*/React.createElement("path", {
      d: "M16 2 L16 18"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 7 q -7 -1 -10 -6 M16 7 q 7 -1 10 -6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 13 q -6 -1 -9 -5 M16 13 q 6 -1 9 -5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "16",
      cy: "2",
      r: "2",
      fill: accent,
      stroke: "none"
    })),
    infinity: /*#__PURE__*/React.createElement("g", P, /*#__PURE__*/React.createElement("path", {
      d: "M16 10 C 13 4, 4 4, 4 10 C 4 16, 13 16, 16 10 C 19 4, 28 4, 28 10 C 28 16, 19 16, 16 10 Z"
    })),
    sun: /*#__PURE__*/React.createElement("g", P, /*#__PURE__*/React.createElement("circle", {
      cx: "16",
      cy: "10",
      r: "5"
    }), [0, 60, 120, 180, 240, 300].map(a => /*#__PURE__*/React.createElement("path", {
      key: a,
      d: "M16 3 L16 0.5",
      transform: `rotate(${a} 16 10)`
    })), /*#__PURE__*/React.createElement("circle", {
      cx: "16",
      cy: "10",
      r: "2",
      fill: accent,
      stroke: "none"
    })),
    cross: /*#__PURE__*/React.createElement("g", P, /*#__PURE__*/React.createElement("path", {
      d: "M16 1 L16 19 M9 10 L23 10"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 6 q -4 -1 -6 -4 M16 6 q 4 -1 6 -4",
      strokeWidth: "1.1"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "16",
      cy: "10",
      r: "1.8",
      fill: accent,
      stroke: "none"
    }))
  };
  return /*#__PURE__*/React.createElement("div", {
    className: className,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      width,
      color,
      ...style
    },
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: weight,
      background: `linear-gradient(90deg, transparent, ${color})`
    }
  }), /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 32 20",
    width: "38",
    height: "24",
    style: {
      flex: '0 0 auto',
      overflow: 'visible'
    }
  }, ornaments[ornament] || ornaments.fleuron), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: weight,
      background: `linear-gradient(90deg, ${color}, transparent)`
    }
  }));
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/motifs/Divider.jsx", error: String((e && e.message) || e) }); }

// components/motifs/Motif.jsx
try { (() => {
/**
 * Motif — the Pearloom line-ornament set. Single-stroke editorial
 * glyphs (1.75px round caps, fill:none) that scatter through a site:
 * section openers, list bullets, empty-state centerpieces, sticker
 * decor. One consistent hand across every occasion.
 *
 * Names: sprig · laurel · bloom · rings · dove · candle · star ·
 * sun · wave · cake · vine · cresset · arch · feather.
 */
const P = {
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};
function Motif({
  name = 'sprig',
  size = 48,
  color = 'var(--pl-olive)',
  accent = 'var(--pl-gold)',
  weight = 1.75,
  className,
  style
}) {
  const common = {
    ...P,
    stroke: color,
    strokeWidth: weight
  };
  const paths = {
    sprig: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("path", {
      d: "M24 44 C 24 30, 24 16, 24 6"
    }), [0.25, 0.45, 0.65].map((t, i) => /*#__PURE__*/React.createElement("g", {
      key: i
    }, /*#__PURE__*/React.createElement("path", {
      d: `M24 ${44 - t * 36} q -11 -3 -15 -12`
    }), /*#__PURE__*/React.createElement("path", {
      d: `M24 ${44 - t * 36} q 11 -3 15 -12`
    }))), /*#__PURE__*/React.createElement("circle", {
      cx: "24",
      cy: "6",
      r: "2.4",
      fill: accent,
      stroke: "none"
    })),
    laurel: /*#__PURE__*/React.createElement("g", common, [-1, 1].map(d => /*#__PURE__*/React.createElement("g", {
      key: d
    }, /*#__PURE__*/React.createElement("path", {
      d: `M24 42 C ${24 + d * 14} 34, ${24 + d * 17} 18, 24 6`
    }), [0.2, 0.38, 0.56, 0.74].map((t, i) => {
      const x = 24 + d * (5 + Math.sin(t * 3) * 11),
        y = 42 - t * 34;
      return /*#__PURE__*/React.createElement("path", {
        key: i,
        d: `M${x} ${y} q ${d * 8} -2 ${d * 3} -8`
      });
    })))),
    bloom: /*#__PURE__*/React.createElement("g", common, [0, 60, 120, 180, 240, 300].map(a => /*#__PURE__*/React.createElement("ellipse", {
      key: a,
      cx: "24",
      cy: "14",
      rx: "5",
      ry: "10",
      transform: `rotate(${a} 24 24)`
    })), /*#__PURE__*/React.createElement("circle", {
      cx: "24",
      cy: "24",
      r: "4",
      fill: accent,
      stroke: "none"
    })),
    rings: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("circle", {
      cx: "18",
      cy: "26",
      r: "13"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "31",
      cy: "26",
      r: "13"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M24 11 l3 -5 l3 5",
      fill: accent,
      stroke: accent
    })),
    dove: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("path", {
      d: "M8 30 C 18 30, 22 22, 24 14 C 28 24, 36 28, 42 26 C 36 32, 28 36, 20 34 C 16 38, 10 38, 6 36 C 8 34, 8 32, 8 30 Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M24 14 C 26 12, 30 10, 34 11"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "31",
      r: "1.4",
      fill: color,
      stroke: "none"
    })),
    candle: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("rect", {
      x: "18",
      y: "20",
      width: "12",
      height: "22",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M24 20 L24 14"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M24 14 C 20 11, 21 5, 24 2 C 27 5, 28 11, 24 14 Z",
      fill: accent,
      stroke: accent
    })),
    star: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("path", {
      d: "M24 6 L24 42 M6 24 L42 24"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 12 L36 36 M36 12 L12 36",
      strokeWidth: weight * 0.7,
      opacity: "0.7"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "24",
      cy: "24",
      r: "3",
      fill: accent,
      stroke: "none"
    })),
    sun: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("circle", {
      cx: "24",
      cy: "24",
      r: "9"
    }), [0, 45, 90, 135, 180, 225, 270, 315].map(a => /*#__PURE__*/React.createElement("path", {
      key: a,
      d: "M24 11 L24 5",
      transform: `rotate(${a} 24 24)`
    }))),
    wave: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("path", {
      d: "M4 20 q 6 -8 12 0 t 12 0 t 12 0"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M4 30 q 6 -8 12 0 t 12 0 t 12 0",
      opacity: "0.8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 38 q 8 6 16 0 t 16 0",
      stroke: accent,
      opacity: "0.9"
    })),
    cake: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("path", {
      d: "M10 42 L10 28 L38 28 L38 42 Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 34 q 7 5 14 0 t 14 0"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 28 L10 22 L38 22 L38 28"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M24 22 L24 16"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "24",
      cy: "14",
      r: "2.4",
      fill: accent,
      stroke: accent
    })),
    vine: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("path", {
      d: "M6 38 C 16 34, 14 18, 24 14 C 34 10, 32 28, 42 24"
    }), [[16, 28], [24, 14], [33, 19]].map((p, i) => /*#__PURE__*/React.createElement("path", {
      key: i,
      d: `M${p[0]} ${p[1]} q -5 -4 -2 -9`
    })), /*#__PURE__*/React.createElement("circle", {
      cx: "42",
      cy: "24",
      r: "2.2",
      fill: accent,
      stroke: "none"
    })),
    cresset: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("path", {
      d: "M16 42 L32 42 M24 42 L24 30"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 30 L34 30 L30 22 L18 22 Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M24 22 C 19 17, 21 9, 24 5 C 27 9, 29 17, 24 22 Z",
      fill: accent,
      stroke: accent
    })),
    arch: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("path", {
      d: "M10 42 L10 22 Q 10 8 24 8 Q 38 8 38 22 L38 42"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M16 42 L16 26 Q 16 16 24 16 Q 32 16 32 26 L32 42",
      strokeWidth: weight * 0.7,
      opacity: "0.6"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "24",
      cy: "8",
      r: "2.2",
      fill: accent,
      stroke: "none"
    })),
    feather: /*#__PURE__*/React.createElement("g", common, /*#__PURE__*/React.createElement("path", {
      d: "M14 42 C 14 28, 22 12, 36 6 C 34 22, 28 36, 14 42 Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 42 C 18 32, 26 18, 34 9"
    }), [0.3, 0.5, 0.7].map((t, i) => /*#__PURE__*/React.createElement("path", {
      key: i,
      d: `M${14 + t * 16} ${42 - t * 30} l 7 -2`,
      strokeWidth: weight * 0.7
    })))
  };
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 48 48",
    width: size,
    height: size,
    className: className,
    style: style,
    role: "img",
    "aria-label": `${name} motif`
  }, paths[name] || paths.sprig);
}

/** The catalogue of available motif names, for pickers. */
const MOTIF_NAMES = ['sprig', 'laurel', 'bloom', 'rings', 'dove', 'candle', 'star', 'sun', 'wave', 'cake', 'vine', 'cresset', 'arch', 'feather'];
Object.assign(__ds_scope, { Motif, MOTIF_NAMES });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/motifs/Motif.jsx", error: String((e && e.message) || e) }); }

// design_handoff_pearloom_dashboard_editor/themes.js
try { (() => {
/* Pearloom — published-site theme catalogue + themeRootStyle().
   VERBATIM-SHAPED port of src/components/pearloom/site/themes.ts.
   The renderer reads a theme, calls themeRootStyle(), and spreads the
   result onto the .pl8-guest root so every var(--t-*) re-skins.
   This is the production contract — kit blocks bind to --t-* only. */
window.PEARLOOM_SITE_THEMES = [{
  id: 'santorini',
  name: 'Santorini Linen',
  blurb: 'Sun-bleached linen, Aegean blue, whitewash & olive.',
  swatches: ['#3F6E92', '#283D4E', '#C2A165', '#EDE7DA'],
  texture: 'linen',
  motif: 'olive',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'sprig',
    photo: 'arch',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#F5F1E8',
    '--t-section': '#EDE7DA',
    '--t-card': '#FBF9F3',
    '--t-ink': '#283D4E',
    '--t-ink-soft': '#4A6076',
    '--t-ink-muted': '#8A9AA6',
    '--t-accent': '#3F6E92',
    '--t-accent-2': '#7C9BB0',
    '--t-accent-bg': '#E2EAEF',
    '--t-accent-ink': '#2C5571',
    '--t-gold': '#C2A165',
    '--t-line': 'rgba(40,61,78,0.16)',
    '--t-line-soft': 'rgba(40,61,78,0.08)',
    '--t-rsvp': '#283D4E',
    '--t-rsvp-ink': '#F5F1E8',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '5px',
    '--t-radius-lg': '8px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.18',
    '--t-eyebrow-ls': '0.2em',
    '--t-shadow': '0 1px 0 rgba(40,61,78,0.05)'
  }
}, {
  id: 'tuscan',
  name: 'Tuscan Watercolor',
  blurb: 'Soft washes, terracotta & sage, blooms and lemons.',
  swatches: ['#C2693E', '#8A9A6B', '#C99A4E', '#F4E3D3'],
  texture: 'watercolor',
  motif: 'bloom',
  look: {
    card: 'wash',
    button: 'pill',
    divider: 'brush',
    photo: 'tape',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FBF6EC',
    '--t-section': '#F6ECDC',
    '--t-card': '#FFFCF5',
    '--t-ink': '#4B3D2A',
    '--t-ink-soft': '#6E5B43',
    '--t-ink-muted': '#A0907A',
    '--t-accent': '#C2693E',
    '--t-accent-2': '#D89A6A',
    '--t-accent-bg': '#F4E3D3',
    '--t-accent-ink': '#A4502A',
    '--t-gold': '#C99A4E',
    '--t-line': 'rgba(75,61,42,0.15)',
    '--t-line-soft': 'rgba(75,61,42,0.08)',
    '--t-rsvp': '#4B3D2A',
    '--t-rsvp-ink': '#FBF6EC',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '16px',
    '--t-radius-lg': '24px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.14em',
    '--t-shadow': '0 14px 30px rgba(75,61,42,0.10)'
  }
}, {
  id: 'garden',
  name: 'Pressed Garden',
  blurb: 'Cotton paper, pressed wildflowers, the Pearloom warmth.',
  swatches: ['#B7A4D0', '#8B9C5A', '#EAB286', '#F3E9D4'],
  texture: 'paper',
  motif: 'pressed',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'dot',
    photo: 'polaroid',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FDFAF0',
    '--t-section': '#F3E9D4',
    '--t-card': '#FFFEF7',
    '--t-ink': '#3D4A1F',
    '--t-ink-soft': '#566438',
    '--t-ink-muted': '#8A8671',
    '--t-accent': '#B7A4D0',
    '--t-accent-2': '#C4B5D9',
    '--t-accent-bg': '#E8E0F0',
    '--t-accent-ink': '#6B5A8C',
    '--t-gold': '#C19A4B',
    '--t-line': 'rgba(61,74,31,0.14)',
    '--t-line-soft': 'rgba(61,74,31,0.08)',
    '--t-rsvp': '#3D4A1F',
    '--t-rsvp-ink': '#F8F1E4',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.14em',
    '--t-shadow': '0 8px 22px rgba(61,74,31,0.08)'
  }
}, {
  id: 'editorial',
  name: 'Modern Editorial',
  blurb: 'Flat matte, high-contrast type. The clean counterpoint.',
  swatches: ['#1A1A17', '#B08940', '#E9E7E0', '#F4F3EF'],
  texture: 'none',
  motif: 'none',
  look: {
    card: 'flat',
    button: 'sharp',
    divider: 'rule',
    photo: 'clean',
    heroAlign: 'left',
    motifDensity: 'none'
  },
  vars: {
    '--t-paper': '#F4F3EF',
    '--t-section': '#EAE8E1',
    '--t-card': '#FBFAF7',
    '--t-ink': '#1A1A17',
    '--t-ink-soft': '#46453E',
    '--t-ink-muted': '#8A8980',
    '--t-accent': '#1A1A17',
    '--t-accent-2': '#B08940',
    '--t-accent-bg': '#E9E7E0',
    '--t-accent-ink': '#1A1A17',
    '--t-gold': '#B08940',
    '--t-line': 'rgba(26,26,23,0.16)',
    '--t-line-soft': 'rgba(26,26,23,0.08)',
    '--t-rsvp': '#1A1A17',
    '--t-rsvp-ink': '#F4F3EF',
    '--t-display': "'Geist', sans-serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Geist', sans-serif",
    '--t-radius': '2px',
    '--t-radius-lg': '3px',
    '--t-display-wght': '800',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.24em',
    '--t-shadow': 'none'
  }
}, {
  id: 'midnight',
  name: 'Midnight Velvet',
  blurb: 'Inky velvet, candlelight gold — made for evenings.',
  swatches: ['#1A1B2E', '#C9A24B', '#B9A6E0', '#262842'],
  dark: true,
  foil: true,
  texture: 'velvet',
  motif: 'pressed',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'dot',
    photo: 'clean',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#1A1B2E',
    '--t-section': '#20223A',
    '--t-card': '#262842',
    '--t-ink': '#F1EBDD',
    '--t-ink-soft': '#C4BDD0',
    '--t-ink-muted': '#8B86A0',
    '--t-accent': '#B9A6E0',
    '--t-accent-2': '#C9A24B',
    '--t-accent-bg': '#2E2C50',
    '--t-accent-ink': '#D9C9F0',
    '--t-gold': '#C9A24B',
    '--t-line': 'rgba(241,235,221,0.16)',
    '--t-line-soft': 'rgba(241,235,221,0.09)',
    '--t-rsvp': '#C9A24B',
    '--t-rsvp-ink': '#1A1B2E',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '12px',
    '--t-radius-lg': '18px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1.08',
    '--t-eyebrow-ls': '0.18em',
    '--t-shadow': '0 16px 40px rgba(0,0,0,0.40)'
  }
}, {
  id: 'coastal',
  name: 'Coastal Ink',
  blurb: 'Deckled paper, navy ink line-work, sea-glass calm.',
  swatches: ['#2C5E7A', '#1F3A4D', '#C9B89A', '#E8E4D6'],
  texture: 'cotton',
  motif: 'none',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'deckle',
    photo: 'deckle',
    heroAlign: 'center',
    motifDensity: 'none'
  },
  vars: {
    '--t-paper': '#EAE5D7',
    '--t-section': '#E0DAC8',
    '--t-card': '#F4F0E4',
    '--t-ink': '#1F3A4D',
    '--t-ink-soft': '#3E5B6E',
    '--t-ink-muted': '#82929E',
    '--t-accent': '#2C5E7A',
    '--t-accent-2': '#6E93A8',
    '--t-accent-bg': '#DCE5E7',
    '--t-accent-ink': '#1F4254',
    '--t-gold': '#B89A5E',
    '--t-line': 'rgba(31,58,77,0.18)',
    '--t-line-soft': 'rgba(31,58,77,0.09)',
    '--t-rsvp': '#1F3A4D',
    '--t-rsvp-ink': '#EAE5D7',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '2px',
    '--t-radius-lg': '3px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.22em',
    '--t-shadow': '0 1px 0 rgba(31,58,77,0.06)'
  }
}, /* ── New collection — reconciled into the real --t-* contract ── */
{
  id: 'amalfi',
  name: 'Amalfi Citrus',
  blurb: 'Sun-bleached blue, lemon and terracotta — a coastal supper.',
  swatches: ['#2E6B8A', '#C6703D', '#D9B44A', '#FBF6EA'],
  texture: 'linen',
  motif: 'bloom',
  look: {
    card: 'frame',
    button: 'pill',
    divider: 'sprig',
    photo: 'arch',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FBF6EA',
    '--t-section': '#F1E7D4',
    '--t-card': '#FFFCF4',
    '--t-ink': '#1A2A33',
    '--t-ink-soft': '#3C5560',
    '--t-ink-muted': '#7E8E96',
    '--t-accent': '#2E6B8A',
    '--t-accent-2': '#5E94AD',
    '--t-accent-bg': '#E2EAEF',
    '--t-accent-ink': '#235874',
    '--t-gold': '#D9B44A',
    '--t-line': 'rgba(26,42,51,0.16)',
    '--t-line-soft': 'rgba(26,42,51,0.08)',
    '--t-rsvp': '#C6703D',
    '--t-rsvp-ink': '#FBF6EA',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1.06',
    '--t-eyebrow-ls': '0.16em',
    '--t-shadow': '0 10px 26px rgba(26,42,51,0.10)'
  }
}, {
  id: 'first-light',
  name: 'First Light',
  blurb: 'Dawn rose and gold — the morning after, every year after.',
  swatches: ['#C6563D', '#C19A4B', '#D9A89E', '#FCF4EE'],
  texture: 'paper',
  motif: 'pressed',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'dot',
    photo: 'polaroid',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#FCF4EE',
    '--t-section': '#F6E4DA',
    '--t-card': '#FFFBF7',
    '--t-ink': '#3A2A2A',
    '--t-ink-soft': '#5E4742',
    '--t-ink-muted': '#9C8780',
    '--t-accent': '#C6563D',
    '--t-accent-2': '#D9897A',
    '--t-accent-bg': '#F6DDD4',
    '--t-accent-ink': '#A63F2A',
    '--t-gold': '#C19A4B',
    '--t-line': 'rgba(58,42,42,0.14)',
    '--t-line-soft': 'rgba(58,42,42,0.07)',
    '--t-rsvp': '#C6563D',
    '--t-rsvp-ink': '#FCF4EE',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.14em',
    '--t-shadow': '0 8px 22px rgba(58,42,42,0.09)'
  }
}, {
  id: 'deco-gilt',
  name: 'Deco Gilt',
  blurb: 'Jazz-age geometry — ink, gilt and a hard-edged fan.',
  swatches: ['#14110C', '#C9A24B', '#7C8A6A', '#F3ECD9'],
  dark: true,
  foil: true,
  texture: 'velvet',
  motif: 'none',
  look: {
    card: 'flat',
    button: 'sharp',
    divider: 'rule',
    photo: 'clean',
    heroAlign: 'left',
    motifDensity: 'none'
  },
  vars: {
    '--t-paper': '#14110C',
    '--t-section': '#1C1810',
    '--t-card': '#211C13',
    '--t-ink': '#F3ECD9',
    '--t-ink-soft': '#C9C0A8',
    '--t-ink-muted': '#8A8266',
    '--t-accent': '#C9A24B',
    '--t-accent-2': '#7C8A6A',
    '--t-accent-bg': '#2A2416',
    '--t-accent-ink': '#E6C977',
    '--t-gold': '#C9A24B',
    '--t-line': 'rgba(243,236,217,0.16)',
    '--t-line-soft': 'rgba(243,236,217,0.08)',
    '--t-rsvp': '#C9A24B',
    '--t-rsvp-ink': '#14110C',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist Mono', monospace",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '1px',
    '--t-radius-lg': '2px',
    '--t-display-wght': '700',
    '--t-hero-scale': '1.1',
    '--t-eyebrow-ls': '0.3em',
    '--t-shadow': '0 16px 40px rgba(0,0,0,0.45)'
  }
}, {
  id: 'tide-coast',
  name: 'Tide & Coast',
  blurb: 'Fog, driftwood and rope — an unhurried seaside vow.',
  swatches: ['#5E7A82', '#C8BFA5', '#9DB0B2', '#F2F1EC'],
  texture: 'cotton',
  motif: 'none',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'deckle',
    photo: 'deckle',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#F2F1EC',
    '--t-section': '#E6E5DD',
    '--t-card': '#FAFAF6',
    '--t-ink': '#2C353A',
    '--t-ink-soft': '#4E5A60',
    '--t-ink-muted': '#8B969B',
    '--t-accent': '#5E7A82',
    '--t-accent-2': '#9DB0B2',
    '--t-accent-bg': '#DEE5E5',
    '--t-accent-ink': '#46626A',
    '--t-gold': '#B8A580',
    '--t-line': 'rgba(44,53,58,0.16)',
    '--t-line-soft': 'rgba(44,53,58,0.08)',
    '--t-rsvp': '#2C353A',
    '--t-rsvp-ink': '#F2F1EC',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '3px',
    '--t-radius-lg': '5px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.2em',
    '--t-shadow': '0 1px 0 rgba(44,53,58,0.06)'
  }
}];
var PAD = {
  cozy: 0.74,
  comfortable: 1,
  spacious: 1.32
};
/* Port of themeRootStyle(): emit --t-* PLUS base-token shadows so any
   markup referencing base vars re-skins for free. */
window.themeRootStyle = function (theme, density) {
  var v = theme.vars;
  var pad = PAD[density || 'comfortable'] || 1;
  var s = {};
  for (var k in v) s[k] = v[k];
  s['--t-pad'] = String(pad);
  s['--paper'] = v['--t-paper'];
  s['--card'] = v['--t-card'];
  s['--ink'] = v['--t-ink'];
  s['--ink-soft'] = v['--t-ink-soft'];
  s['--ink-muted'] = v['--t-ink-muted'];
  s['--cream'] = v['--t-paper'];
  s['--cream-2'] = v['--t-section'];
  s['--cream-3'] = v['--t-section'];
  s['--line'] = v['--t-line'];
  s['--line-soft'] = v['--t-line-soft'];
  s['--card-ring'] = v['--t-line-soft'];
  s['--font-display'] = v['--t-display'];
  s['--gold'] = v['--t-gold'];
  s.fontFamily = v['--t-body'];
  s.color = v['--t-ink'];
  s.background = v['--t-paper'];
  return s;
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_pearloom_dashboard_editor/themes.js", error: String((e && e.message) || e) }); }

// design_handoff_pearloom_dashboard_editor/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "design_handoff_pearloom_dashboard_editor/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// site-editor/editor.jsx
try { (() => {
/* Pearloom — Site Editor (redesigned shell).
   The live renderer (../site-renderer) is embedded as the canvas via an
   iframe; the editor drives it over postMessage (pl:set / pl:select) and
   listens for selection + state back. Chrome runs on the brand product
   palette, insulated from the edited site's theme. */
(function () {
  const h = React.createElement;
  const {
    useState,
    useEffect,
    useRef,
    useCallback
  } = React;

  /* ── Brand chrome palette ── */
  const C = {
    cream: '#FBF7EE',
    page: '#F1E8D6',
    studio: '#E7E0D0',
    card: '#FFFDF7',
    ink: '#18181B',
    inkSoft: '#4A5642',
    muted: '#7A7060',
    faint: '#A89E8B',
    line: '#E2D9C3',
    lineSoft: '#EDE6D5',
    olive: '#5C6B3F',
    oliveHover: '#4A5731',
    gold: '#C19A4B',
    goldSoft: '#F0E6CF',
    goldInk: '#8C6E3D',
    plum: '#C6563D'
  };
  const FONT_D = "'Fraunces', Georgia, serif";
  const FONT_M = "'Geist Mono', ui-monospace, monospace";
  const SECTIONS = [{
    id: 'top',
    name: 'Hero',
    note: 'Names, date, the cover'
  }, {
    id: 'story',
    name: 'Our story',
    note: 'How you got here'
  }, {
    id: 'countdown',
    name: 'Countdown',
    note: 'Days until'
  }, {
    id: 'details',
    name: 'Details',
    note: 'Dress code, gifts'
  }, {
    id: 'schedule',
    name: 'Schedule',
    note: 'The run of the day'
  }, {
    id: 'travel',
    name: 'Travel',
    note: 'Where to stay'
  }, {
    id: 'gallery',
    name: 'Gallery',
    note: 'A few favorites'
  }, {
    id: 'registry',
    name: 'Registry',
    note: 'Gifts & funds'
  }, {
    id: 'faq',
    name: 'FAQ',
    note: 'Anything else'
  }, {
    id: 'rsvp',
    name: 'RSVP',
    note: 'The reply'
  }];
  const SEC_MAP = {};
  SECTIONS.forEach(s => {
    SEC_MAP[s.id] = s;
  });
  SEC_MAP.map = {
    id: 'map',
    name: 'Map',
    note: 'Where it happens'
  };
  const DEFAULT_ORDER = SECTIONS.map(s => s.id);
  const DEVICES = {
    desktop: {
      label: 'Desktop',
      w: null
    },
    tablet: {
      label: 'Tablet',
      w: 834
    },
    mobile: {
      label: 'Mobile',
      w: 390
    }
  };
  const TEXTURES = [['paper', 'Pressed paper'], ['linen', 'Linen'], ['watercolor', 'Watercolor'], ['cotton', 'Cotton rag'], ['velvet', 'Velvet'], ['silk', 'Silk'], ['marble', 'Marble'], ['washi', 'Washi'], ['slate', 'Slate'], ['tweed', 'Tweed'], ['none', 'Smooth']];
  const DENSITIES = ['cozy', 'comfortable', 'spacious'];
  const HEROES = ['centered', 'split', 'minimal', 'postcard', 'typographic', 'fullbleed'];
  const STORIES = [['sidebyside', 'Side by side'], ['stacked', 'Stacked'], ['quote', 'Quote'], ['letter', 'Letter']];
  const SECTION_LAYOUTS = {
    top: [['centered', 'Centered'], ['split', 'Split'], ['minimal', 'Minimal'], ['postcard', 'Postcard'], ['typographic', 'Type'], ['fullbleed', 'Full bleed']],
    story: [['sidebyside', 'Side by side'], ['stacked', 'Stacked'], ['quote', 'Quote'], ['letter', 'Letter']],
    details: [['grid', 'Grid'], ['list', 'List']],
    schedule: [['cards', 'Cards'], ['timeline', 'Timeline']],
    gallery: [['grid', 'Grid'], ['strip', 'Strip'], ['mosaic', 'Mosaic']]
  };
  const LAYOUT_DEFAULT = {
    top: 'centered',
    story: 'sidebyside',
    details: 'grid',
    schedule: 'cards',
    gallery: 'grid'
  };
  const DIVIDERS = [['auto', 'From theme'], ['rule', 'Rule'], ['dot', 'Dot'], ['sprig', 'Sprig'], ['brush', 'Brush'], ['deckle', 'Deckle'], ['laurel', 'Laurel'], ['wave', 'Wave'], ['chevron', 'Chevron'], ['ribbon', 'Ribbon'], ['arc', 'Arc'], ['rays', 'Rays'], ['diamond', 'Diamond']];
  const DIVIDERS_ANIM = [['flow', 'Gleam'], ['grow-vine', 'Growing vine'], ['tide', 'Tide'], ['twinkle', 'Twinkle']];
  const MOTIFS = [['auto', 'From theme'], ['none', 'None'], ['olive', 'Olive sprig'], ['bloom', 'Bloom'], ['pressed', 'Pressed bloom'], ['fern', 'Fern'], ['laurel', 'Laurel'], ['deco', 'Deco fan'], ['sun', 'Sun'], ['wave', 'Wave'], ['lavender', 'Lavender']];
  const MOTIFS_ANIM = [['breeze', 'Breeze'], ['sunbeam', 'Sunbeam'], ['tide', 'Tide'], ['fireflies', 'Fireflies'], ['bloom-open', 'Blooming']];
  const DEFAULT_CONTENT = {
    names: ['Mira', 'Jun'],
    coupleType: 'couple',
    date: 'Saturday · September 6, 2026',
    place: 'Point Reyes, California',
    dateISO: '2026-09-06',
    tagline: 'together, at last',
    story: {
      eyebrow: 'Our story',
      title: 'How we',
      italic: 'met',
      body: 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry — there is no story we would rather tell, and no one we would rather tell it to.'
    },
    schedule: [{
      t: '4:30 pm',
      l: 'Ceremony',
      s: 'Olive grove'
    }, {
      t: '5:30 pm',
      l: 'Cocktails',
      s: 'Terrace bar'
    }, {
      t: '7:00 pm',
      l: 'Dinner',
      s: 'Long table'
    }, {
      t: '9:00 pm',
      l: 'Dancing',
      s: 'Until late'
    }],
    registryBody: "If you'd like to celebrate further, we've put a few things together.",
    registry: ['Honeymoon fund', 'Crate & Barrel', 'Zola'],
    travel: [],
    faq: [{
      q: "What's the dress code, really?",
      a: 'Garden formal — think linen suits and tea-length dresses. The ceremony is on grass, so consider your heels.'
    }, {
      q: 'Can I bring a plus-one?',
      a: 'If your invitation names a guest, absolutely. If you are flying solo, you will be in great company.'
    }, {
      q: 'Are kids welcome at the ceremony?',
      a: 'Little ones aged ten and up are warmly welcome for the whole evening.'
    }, {
      q: 'Where should we stay?',
      a: 'We have blocked rooms at Cosmos Suites and Andronis Boutique — both a short walk from the venue.'
    }]
  };
  const STATIC_KITS = ['classic', 'ticket', 'plate', 'scrapbook', 'index', 'minimal', 'arch', 'stamp', 'deco', 'gallery', 'menu', 'boarding-pass', 'marquee', 'chalkboard', 'nursery', 'certificate', 'kraft', 'luggage-tag', 'memoriam', 'gilt', 'atelier', 'cabinet', 'scallop', 'noir', 'glass', 'linen-press', 'wax-seal', 'pennant', 'embossed'];
  const KIT_LABEL = {
    'boarding-pass': 'Boarding pass',
    'luggage-tag': 'Luggage tag',
    'linen-press': 'Linen press',
    'wax-seal': 'Wax seal'
  };
  const kitLabel = k => KIT_LABEL[k] || k.charAt(0).toUpperCase() + k.slice(1);
  const MOTION_KITS = [{
    id: 'neon',
    name: 'Neon',
    desc: 'Tube flicker + buzz glow',
    for: 'Bachelor/ette · NYE · galas',
    sw: ['#15131C', '#B9A6E0']
  }, {
    id: 'marquee-live',
    name: 'Marquee Live',
    desc: 'Bulb lights, pulsing',
    for: 'Birthdays · theatre',
    sw: ['#FFFEF7', '#C19A4B']
  }, {
    id: 'aurora-glass',
    name: 'Aurora Glass',
    desc: 'Light drifting behind frosted glass',
    for: 'Evening weddings',
    sw: ['#1A1B2E', '#B9A6E0']
  }, {
    id: 'gold-foil',
    name: 'Gold Foil',
    desc: 'A sheen sweeping the edges',
    for: 'Deco · anniversaries',
    sw: ['#14110C', '#C9A24B']
  }, {
    id: 'confetti',
    name: 'Confetti',
    desc: 'Slow falling flecks',
    for: 'Parties · reveals',
    sw: ['#FFFEF7', '#D9A89E']
  }, {
    id: 'candlelight',
    name: 'Candlelight',
    desc: 'A gentle warm flame',
    for: 'Memorials · vigils',
    sw: ['#FCF4EE', '#C19A4B']
  }, {
    id: 'pressed-bloom',
    name: 'Pressed Bloom',
    desc: 'A swaying pressed flower',
    for: 'Garden · baby · bridal',
    sw: ['#FDFAF0', '#B7A4D0']
  }, {
    id: 'vinyl',
    name: 'Vinyl',
    desc: 'A spinning record',
    for: 'Milestone birthdays · music',
    sw: ['#FFFEF7', '#5C6B3F']
  }];
  const PREMIUM_THEMES = new Set(['deco-gilt', 'midnight', 'tide-coast', 'provence', 'botanical', 'gilded-noir', 'blush-atelier', 'sage-marble', 'terracotta-sun', 'ink-botanical', 'champagne-deco', 'moss-velvet', 'coral-sea', 'plum-romance', 'golden-hour']);

  /* ── Tiny UI atoms ── */
  function Glyph({
    size = 26
  }) {
    return h('svg', {
      width: size,
      height: size * 0.42,
      viewBox: '0 0 100 42',
      'aria-hidden': true
    }, h('g', {
      fill: 'none',
      stroke: C.olive,
      strokeWidth: 1.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }, h('path', {
      d: 'M2 21 C 30 21 64 21 96 21'
    }), [0.34, 0.54, 0.74].map((t, i) => h('g', {
      key: i
    }, h('path', {
      d: `M${2 + t * 94} 21 q -7 -8 -15 -9`
    }), h('path', {
      d: `M${2 + t * 94} 21 q -7 8 -15 9`
    }))), h('circle', {
      cx: 96,
      cy: 21,
      r: 2,
      fill: C.gold,
      stroke: 'none'
    })));
  }
  function GLabel({
    children,
    style
  }) {
    return h('div', {
      style: Object.assign({
        fontFamily: FONT_M,
        fontSize: 9.5,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: C.faint,
        margin: '0 0 9px'
      }, style)
    }, children);
  }
  function Chip({
    active,
    premium,
    onClick,
    title,
    children
  }) {
    return h('button', {
      onClick,
      title,
      style: {
        padding: '7px 12px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (active ? premium ? C.gold : C.olive : C.line),
        background: active ? premium ? C.gold : C.olive : C.cream,
        color: active ? premium ? '#241a08' : C.cream : premium ? C.goldInk : C.inkSoft,
        transition: 'all .12s',
        textTransform: 'capitalize'
      }
    }, children);
  }

  /* ════════════════════ TOPBAR ════════════════════ */
  function Topbar({
    device,
    setDevice,
    editMode,
    setEditMode,
    undo,
    redo,
    canUndo,
    canRedo,
    premium,
    onUpgrade,
    onPublish,
    saved,
    onCmd,
    onDecor,
    onStore,
    onCoHost,
    onProfile,
    onProgress,
    progress
  }) {
    const seg = (val, label) => h('button', {
      onClick: () => setDevice(val),
      style: {
        padding: '6px 13px',
        borderRadius: 7,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        background: device === val ? C.cream : 'transparent',
        color: device === val ? C.ink : C.muted,
        boxShadow: device === val ? '0 1px 3px rgba(40,28,12,0.12)' : 'none'
      }
    }, label);
    const eseg = (val, label) => h('button', {
      onClick: () => setEditMode(val),
      title: val ? 'Edit text, photos & order right on the canvas' : 'Preview the live site',
      style: {
        padding: '6px 13px',
        borderRadius: 7,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        background: editMode === val ? C.cream : 'transparent',
        color: editMode === val ? C.ink : C.muted,
        boxShadow: editMode === val ? '0 1px 3px rgba(40,28,12,0.12)' : 'none'
      }
    }, label);
    const tbtn = (label, onClick, extra) => h('button', {
      onClick,
      style: Object.assign({
        padding: '7px 11px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + C.line,
        background: C.cream,
        color: C.inkSoft,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap'
      }, extra || {})
    }, label);
    const hbtn = (label, onClick, enabled, title) => h('button', {
      onClick: enabled ? onClick : undefined,
      title,
      disabled: !enabled,
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        border: '1px solid ' + C.line,
        background: C.cream,
        color: enabled ? C.inkSoft : C.faint,
        cursor: enabled ? 'pointer' : 'default',
        fontSize: 14,
        display: 'grid',
        placeItems: 'center',
        opacity: enabled ? 1 : 0.5
      }
    }, label);
    return h('header', {
      style: {
        gridArea: 'top',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        background: C.cream,
        borderBottom: '1px solid ' + C.line,
        zIndex: 20
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 0
      }
    }, h('span', {
      style: {
        fontSize: 12,
        color: C.muted,
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }
    }, '‹ Dashboard'), h('div', {
      style: {
        width: 1,
        height: 22,
        background: C.line
      }
    }), h(Glyph, {
      size: 26
    }), h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        lineHeight: 1.1,
        minWidth: 0
      }
    }, h('span', {
      style: {
        fontFamily: FONT_D,
        fontStyle: 'italic',
        fontSize: 16,
        color: C.ink
      }
    }, 'Mira & Jun'), h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        marginTop: 2
      }
    }, h('span', {
      style: {
        fontFamily: FONT_M,
        fontSize: 8.5,
        letterSpacing: '0.08em',
        color: C.faint,
        textTransform: 'uppercase'
      }
    }, 'pearloom.com/wedding'), h('button', {
      onClick: onProgress,
      title: 'Ready to publish',
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        padding: 0
      }
    }, h('span', {
      style: {
        width: 50,
        height: 4,
        borderRadius: 99,
        background: C.line,
        overflow: 'hidden',
        display: 'inline-block'
      }
    }, h('span', {
      style: {
        display: 'block',
        height: '100%',
        width: progress + '%',
        background: C.olive
      }
    })), h('span', {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: C.olive
      }
    }, progress + '%'))))), h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: C.studio,
        borderRadius: 9,
        padding: 3
      }
    }, eseg(true, 'Editing'), eseg(false, 'Preview')), h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: C.studio,
        borderRadius: 9,
        padding: 3
      }
    }, seg('desktop', 'Desktop'), seg('tablet', 'Tablet'), seg('mobile', 'Mobile'))), h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }
    }, hbtn('↶', undo, canUndo, 'Undo (⌘Z)'), hbtn('↷', redo, canRedo, 'Redo (⇧⌘Z)')), h('span', {
      style: {
        fontSize: 11.5,
        color: C.muted,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        marginRight: 1
      }
    }, h('span', {
      style: {
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: saved ? C.olive : C.gold
      }
    }), saved ? 'Saved' : 'Saving…'), tbtn(h(React.Fragment, null, '✦ Ask Pear ', h('kbd', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9,
        background: C.studio,
        borderRadius: 4,
        padding: '1px 4px',
        color: C.muted
      }
    }, '⌘K')), onCmd, {
      background: '#fff',
      color: C.ink
    }), function () {
      const av = (init, grad, ring, active) => h('span', {
        style: {
          position: 'relative',
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: '#fff',
          fontSize: 10.5,
          fontWeight: 700,
          fontFamily: FONT_D,
          background: grad,
          boxShadow: '0 0 0 2px ' + C.cream + ', 0 0 0 3px ' + ring
        }
      }, init, active && h('span', {
        style: {
          position: 'absolute',
          right: -1,
          bottom: -1,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#4B9E6A',
          boxShadow: '0 0 0 1.5px ' + C.cream
        }
      }));
      return h('button', {
        onClick: onCoHost,
        title: 'Jun is here \u00b7 co-hosts',
        style: {
          display: 'flex',
          alignItems: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 4px',
          marginRight: 2
        }
      }, av('SB', 'linear-gradient(135deg,#8B9C5A,#5C6B3F)', 'rgba(92,107,63,0.25)', false), h('span', {
        style: {
          marginLeft: -7,
          display: 'inline-flex'
        }
      }, av('J', 'linear-gradient(135deg,#E6C877,#C19A4B)', 'rgba(193,154,75,0.3)', true)));
    }(), tbtn('Decor', onDecor), tbtn('Theme', onStore), h('button', {
      onClick: onUpgrade,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '7px 11px',
        borderRadius: 999,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        border: '1px solid ' + (premium ? C.gold : 'rgba(193,154,75,0.5)'),
        background: premium ? C.gold : C.goldSoft,
        color: premium ? '#241a08' : C.goldInk
      }
    }, '✦ ', premium ? 'Atelier' : 'Upgrade'), h('button', {
      onClick: onPublish,
      style: {
        padding: '8px 18px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 12.5,
        fontWeight: 700,
        border: 'none',
        background: C.olive,
        color: C.cream
      }
    }, 'Publish'), h('button', {
      onClick: onProfile,
      title: 'Account',
      style: {
        width: 34,
        height: 34,
        borderRadius: '50%',
        border: '1px solid ' + C.line,
        background: C.olive,
        color: C.cream,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: FONT_D,
        flexShrink: 0
      }
    }, 'SB')));
  }

  /* ════════════════════ LEFT — SECTION RAIL ════════════════════ */
  function SectionRail({
    selId,
    onSelect,
    hidden,
    toggleHidden,
    onCoHost,
    onTool,
    onAdd,
    order,
    onReorder
  }) {
    const dragRef = useRef(null);
    const [overId, setOverId] = useState(null);
    const reorder = (from, to) => {
      if (!from || from === to) return;
      const cur = order.filter(x => x !== from);
      const ti = cur.indexOf(to);
      cur.splice(ti < 0 ? cur.length : ti, 0, from);
      onReorder(cur);
    };
    const rows = order && order.length ? order : DEFAULT_ORDER;
    return h('aside', {
      className: 'ed-scroll',
      style: {
        gridArea: 'left',
        background: C.cream,
        borderRight: '1px solid ' + C.line,
        overflowY: 'auto',
        padding: '16px 12px'
      }
    }, h(GLabel, {
      style: {
        padding: '0 6px'
      }
    }, 'Sections'), h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }
    }, rows.map(id => {
      const s = SEC_MAP[id];
      if (!s) return null;
      const on = selId === id;
      const off = hidden[id];
      const isOver = overId === id;
      const shadows = [];
      if (on) shadows.push('inset 2px 0 0 ' + C.olive);
      if (isOver) shadows.push('inset 0 2px 0 ' + C.gold);
      return h('div', {
        key: id,
        draggable: true,
        onDragStart: e => {
          try {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', id);
          } catch (_) {/* */}
          dragRef.current = id;
        },
        onDragOver: e => {
          e.preventDefault();
          if (overId !== id) setOverId(id);
        },
        onDragLeave: () => {
          if (overId === id) setOverId(null);
        },
        onDrop: e => {
          e.preventDefault();
          reorder(dragRef.current, id);
          setOverId(null);
          dragRef.current = null;
        },
        onDragEnd: () => {
          setOverId(null);
          dragRef.current = null;
        },
        onClick: () => onSelect(id),
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '9px 9px',
          borderRadius: 9,
          cursor: 'pointer',
          background: on ? 'rgba(92,107,63,0.12)' : 'transparent',
          boxShadow: shadows.length ? shadows.join(', ') : 'none',
          opacity: off ? 0.5 : 1,
          transition: 'background .12s, box-shadow .1s'
        }
      }, h('span', {
        style: {
          color: C.faint,
          fontSize: 13,
          cursor: 'grab',
          letterSpacing: '-2px'
        }
      }, '⠿'), h('div', {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, h('div', {
        style: {
          fontSize: 13,
          fontWeight: on ? 700 : 600,
          color: on ? C.olive : C.ink
        }
      }, s.name), h('div', {
        style: {
          fontSize: 10.5,
          color: C.faint,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, s.note)), h('button', {
        onClick: e => {
          e.stopPropagation();
          toggleHidden(id);
        },
        title: off ? 'Hidden — show' : 'Hide section',
        style: {
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: off ? C.faint : C.muted,
          fontSize: 13,
          padding: 2
        }
      }, off ? '◌' : '◉'));
    })), h('button', {
      onClick: onAdd,
      style: {
        marginTop: 12,
        width: '100%',
        padding: '11px',
        borderRadius: 9,
        border: '1.5px dashed ' + C.line,
        background: 'transparent',
        color: C.olive,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, '+ Add section'), h(GLabel, {
      style: {
        padding: '0 6px',
        marginTop: 24
      }
    }, 'Tools'), h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }
    }, TOOLS.map(t => h('div', {
      key: t.id,
      onClick: () => t.id === 'cohosts' ? onCoHost() : onTool && onTool(t.id),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 9px',
        borderRadius: 9,
        cursor: 'pointer'
      },
      onMouseEnter: e => e.currentTarget.style.background = C.page,
      onMouseLeave: e => e.currentTarget.style.background = 'transparent'
    }, h('span', {
      style: {
        width: 24,
        height: 24,
        borderRadius: 7,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: C.page,
        color: C.olive,
        fontFamily: FONT_M,
        fontSize: 11,
        fontWeight: 700
      }
    }, t.g), h('div', {
      style: {
        minWidth: 0
      }
    }, h('div', {
      style: {
        fontSize: 12.5,
        fontWeight: 600,
        color: C.ink
      }
    }, t.name), h('div', {
      style: {
        fontSize: 10,
        color: C.faint
      }
    }, t.note))))));
  }

  /* ════════════════════ CENTER — CANVAS ════════════════════ */
  function Canvas({
    device,
    iframeRef,
    onLoad
  }) {
    const d = DEVICES[device] || DEVICES.desktop;
    const framed = device !== 'desktop';
    const phone = device === 'mobile';
    return h('main', {
      style: {
        gridArea: 'canvas',
        background: C.studio,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: framed ? 'flex-start' : 'stretch',
        padding: framed ? '12px 0 60px' : '0'
      }
    }, framed && h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontFamily: FONT_M,
        fontSize: 9.5,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: C.faint,
        padding: '4px 0 9px'
      }
    }, h('span', {
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: C.olive
      }
    }), d.label + ' · ' + d.w + ' px'), h('div', {
      className: 'ed-canvas-frame',
      style: {
        width: framed ? d.w : '100%',
        maxWidth: '100%',
        height: framed ? 'calc(100vh - 56px - 96px)' : '100%',
        flex: framed ? 'none' : 1,
        borderRadius: phone ? 30 : framed ? 14 : 0,
        overflow: 'hidden',
        background: '#fff',
        border: phone ? '7px solid #1d1b16' : framed ? '1px solid ' + C.line : 'none',
        boxShadow: framed ? '0 24px 60px -18px rgba(40,28,12,0.45)' : 'none'
      }
    }, h('iframe', {
      ref: iframeRef,
      onLoad,
      src: '../site-renderer/index.html?embed=1',
      title: 'Site canvas',
      style: {
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block'
      }
    })));
  }

  /* ════════════════════ RIGHT — INSPECTOR ════════════════════ */
  function Inspector({
    tab,
    setTab,
    st,
    set,
    selId,
    content,
    updateContent,
    onDraft,
    drafting,
    applied,
    onPicks,
    onCmd
  }) {
    const tabBtn = (id, label) => h('button', {
      onClick: () => setTab(id),
      style: {
        flex: 1,
        padding: '11px 0',
        border: 'none',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        background: 'transparent',
        color: tab === id ? C.ink : C.muted,
        borderBottom: '2px solid ' + (tab === id ? C.olive : 'transparent'),
        fontFamily: 'inherit'
      }
    }, label);
    return h('aside', {
      style: {
        gridArea: 'right',
        background: C.cream,
        borderLeft: '1px solid ' + C.line,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }
    }, h('div', {
      style: {
        display: 'flex',
        borderBottom: '1px solid ' + C.line,
        flexShrink: 0
      }
    }, tabBtn('content', 'Content'), tabBtn('design', 'Design'), tabBtn('motion', '✦ Motion')), h('div', {
      className: 'ed-scroll',
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: '18px 16px 28px'
      }
    }, tab === 'content' ? h(ContentTab, {
      selId,
      st,
      set,
      content,
      updateContent,
      onDraft,
      drafting,
      onPicks,
      onCmd
    }) : tab === 'design' ? h(DesignTab, {
      st,
      set,
      applied
    }) : h(MotionTab, {
      st,
      set
    })));
  }
  function ContentTab({
    selId,
    st,
    set,
    content,
    updateContent,
    onDraft,
    drafting,
    onPicks,
    onCmd
  }) {
    const section = SECTIONS.find(s => s.id === selId);
    if (!selId || !section) {
      return h('div', {
        style: {
          textAlign: 'center',
          padding: '40px 16px',
          color: C.muted
        }
      }, h('div', {
        style: {
          fontSize: 30,
          marginBottom: 10
        }
      }, '◷'), h('div', {
        style: {
          fontFamily: FONT_D,
          fontSize: 18,
          color: C.ink,
          marginBottom: 6
        }
      }, 'Pick a section'), h('div', {
        style: {
          fontSize: 12.5,
          lineHeight: 1.5
        }
      }, 'Click any section on the canvas, or in the list on the left, to edit its content.'));
    }
    const field = {
      width: '100%',
      padding: '9px 11px',
      borderRadius: 8,
      border: '1px solid ' + C.line,
      background: C.card,
      color: C.ink,
      fontSize: 13,
      outline: 'none',
      fontFamily: 'inherit',
      marginBottom: 12,
      boxSizing: 'border-box'
    };
    const lab = {
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: C.faint,
      marginBottom: 5,
      display: 'block'
    };
    const PK = {
      details: 'details',
      gallery: 'gallery'
    };
    const PTITLE = {
      details: 'Fill in the details',
      gallery: 'Arrange the gallery'
    };
    const pkind = PK[selId];
    const c = content || {};
    const sfield = Object.assign({}, field, {
      marginBottom: 0,
      padding: '7px 9px',
      fontSize: 12.5
    });
    const miniBtn = {
      width: 24,
      height: 24,
      borderRadius: 6,
      border: '1px solid ' + C.line,
      background: C.cream,
      color: C.inkSoft,
      cursor: 'pointer',
      fontSize: 12,
      lineHeight: 1,
      padding: 0,
      flexShrink: 0
    };
    const move = (arr, i, d) => {
      const n = arr.slice();
      const j = i + d;
      if (j < 0 || j >= n.length) return null;
      const t = n[i];
      n[i] = n[j];
      n[j] = t;
      return n;
    };
    const rowTools = (arr, i, key) => h('div', {
      style: {
        display: 'flex',
        gap: 4,
        marginLeft: 'auto'
      }
    }, h('button', {
      title: 'Move up',
      onClick: () => {
        const n = move(arr, i, -1);
        if (n) updateContent({
          [key]: n
        });
      },
      style: miniBtn
    }, '\u2191'), h('button', {
      title: 'Move down',
      onClick: () => {
        const n = move(arr, i, 1);
        if (n) updateContent({
          [key]: n
        });
      },
      style: miniBtn
    }, '\u2193'), h('button', {
      title: 'Remove',
      onClick: () => updateContent({
        [key]: arr.filter((_, k) => k !== i)
      }),
      style: Object.assign({}, miniBtn, {
        color: '#B5524A'
      })
    }, '\u2715'));
    const addBtn = (label, onClick) => h('button', {
      onClick,
      style: {
        width: '100%',
        padding: '9px',
        borderRadius: 9,
        border: '1px dashed ' + C.line,
        background: 'transparent',
        color: C.olive,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        marginTop: 4
      }
    }, '+ ' + label);
    const cardWrap = kids => h('div', {
      style: {
        border: '1px solid ' + C.lineSoft,
        borderRadius: 10,
        padding: 10,
        marginBottom: 8,
        background: C.card
      }
    }, kids);
    const draftBtn = (kind, label) => h('button', {
      onClick: () => onDraft && onDraft(kind),
      disabled: !!drafting,
      title: 'Draft with Pear (AI)',
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        padding: '8px 13px',
        borderRadius: 8,
        border: '1px solid ' + C.gold,
        background: C.goldSoft,
        color: C.goldInk,
        fontSize: 11.5,
        fontWeight: 700,
        cursor: drafting ? 'default' : 'pointer',
        opacity: drafting && drafting !== kind ? 0.5 : 1
      }
    }, drafting === kind ? '✦ Drafting…' : '✦ ' + label);
    const draftNote = drafting === '__noapi' || drafting === '__err' ? h('div', {
      style: {
        fontSize: 11.5,
        color: C.plum,
        marginBottom: 12,
        lineHeight: 1.4
      }
    }, drafting === '__noapi' ? 'Pear drafting runs in the live preview — open this site in Preview to use it.' : 'Pear had trouble drafting that — try again.') : null;
    return h('div', {
      className: 'ed-pop'
    }, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 21,
        color: C.ink,
        marginBottom: 3
      }
    }, section.name), h('div', {
      style: {
        fontSize: 12,
        color: C.muted,
        marginBottom: 18
      }
    }, section.note), selId === 'top' && h('div', null, h('label', {
      style: lab
    }, 'Names'), h('div', {
      style: {
        display: 'flex',
        gap: 8
      }
    }, h('input', {
      value: (c.names || ['', ''])[0] || '',
      onChange: e => {
        const n = (c.names || ['', '']).slice();
        n[0] = e.target.value;
        updateContent({
          names: n
        });
      },
      style: field
    }), (c.coupleType || 'couple') !== 'solo' && h('input', {
      value: (c.names || ['', ''])[1] || '',
      onChange: e => {
        const n = (c.names || ['', '']).slice();
        n[1] = e.target.value;
        updateContent({
          names: n
        });
      },
      style: field
    })), h('label', {
      style: lab
    }, 'Celebrating'), h('div', {
      style: {
        display: 'flex',
        gap: 6,
        marginBottom: 12
      }
    }, [['couple', 'A couple'], ['solo', 'One person']].map(([v, l]) => h(Chip, {
      key: v,
      active: (c.coupleType || 'couple') === v,
      onClick: () => updateContent({
        coupleType: v
      })
    }, l))), h('label', {
      style: lab
    }, 'Date shown'), h('input', {
      value: c.date || '',
      onChange: e => updateContent({
        date: e.target.value
      }),
      style: field
    }), h('label', {
      style: lab
    }, 'Date · for the countdown'), h('input', {
      type: 'date',
      value: (c.dateISO || '').slice(0, 10),
      onChange: e => updateContent({
        dateISO: e.target.value
      }),
      style: field
    }), h('label', {
      style: lab
    }, 'Place'), h('input', {
      value: c.place || '',
      onChange: e => updateContent({
        place: e.target.value
      }),
      style: field
    }), h('label', {
      style: lab
    }, 'Tagline'), h('input', {
      value: c.tagline || '',
      onChange: e => updateContent({
        tagline: e.target.value
      }),
      style: field
    }), h(GLabel, {
      style: {
        marginTop: 6
      }
    }, 'Hero layout'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6
      }
    }, HEROES.map(v => h(Chip, {
      key: v,
      active: st.hero === v,
      onClick: () => set('hero', v)
    }, v)))), selId === 'story' && (() => {
      const s = c.story || {};
      const us = p => updateContent({
        story: Object.assign({}, s, p)
      });
      return h('div', null, h('label', {
        style: lab
      }, 'Eyebrow'), h('input', {
        value: s.eyebrow || '',
        onChange: e => us({
          eyebrow: e.target.value
        }),
        style: field
      }), h('label', {
        style: lab
      }, 'Title'), h('div', {
        style: {
          display: 'flex',
          gap: 8
        }
      }, h('input', {
        value: s.title || '',
        onChange: e => us({
          title: e.target.value
        }),
        style: field
      }), h('input', {
        value: s.italic || '',
        placeholder: 'italic',
        onChange: e => us({
          italic: e.target.value
        }),
        style: field
      })), h('label', {
        style: lab
      }, 'Story'), h('textarea', {
        rows: 6,
        value: s.body || '',
        onChange: e => us({
          body: e.target.value
        }),
        style: Object.assign({}, field, {
          resize: 'vertical',
          lineHeight: 1.5
        })
      }), h('button', {
        onClick: () => onPicks('story'),
        style: {
          display: 'none'
        }
      }, ''), h('div', {
        style: {
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap'
        }
      }, draftBtn('story', 'Draft with Pear'), draftBtn('warm', 'Polish tone')), draftNote, h(GLabel, {
        style: {
          marginTop: 6
        }
      }, 'Story layout'), h('div', {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6
        }
      }, STORIES.map(([v, l]) => h(Chip, {
        key: v,
        active: st.story === v,
        onClick: () => set('story', v)
      }, l))));
    })(), selId === 'schedule' && (() => {
      const rows = c.schedule || [];
      return h('div', null, h('label', {
        style: lab
      }, 'Timeline'), draftBtn('schedule', 'Draft the timeline'), draftNote, rows.map((r, i) => h('div', {
        key: i
      }, cardWrap([h('div', {
        key: 'h',
        style: {
          display: 'flex',
          alignItems: 'center',
          marginBottom: 7
        }
      }, h('span', {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: C.faint
        }
      }, 'Event ' + (i + 1)), rowTools(rows, i, 'schedule')), h('div', {
        key: 'b',
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }
      }, h('input', {
        value: r.t || '',
        placeholder: 'Time',
        onChange: e => {
          const n = rows.slice();
          n[i] = Object.assign({}, r, {
            t: e.target.value
          });
          updateContent({
            schedule: n
          });
        },
        style: sfield
      }), h('input', {
        value: r.l || '',
        placeholder: 'Title',
        onChange: e => {
          const n = rows.slice();
          n[i] = Object.assign({}, r, {
            l: e.target.value
          });
          updateContent({
            schedule: n
          });
        },
        style: sfield
      }), h('input', {
        value: r.s || '',
        placeholder: 'Detail',
        onChange: e => {
          const n = rows.slice();
          n[i] = Object.assign({}, r, {
            s: e.target.value
          });
          updateContent({
            schedule: n
          });
        },
        style: sfield
      }))]))), addBtn('Add event', () => updateContent({
        schedule: rows.concat([{
          t: '',
          l: 'New moment',
          s: ''
        }])
      })));
    })(), selId === 'faq' && (() => {
      const qa = c.faq || [];
      return h('div', null, h('label', {
        style: lab
      }, 'Questions'), draftBtn('faq', 'Draft the FAQ'), draftNote, qa.map((it, i) => h('div', {
        key: i
      }, cardWrap([h('div', {
        key: 'h',
        style: {
          display: 'flex',
          alignItems: 'center',
          marginBottom: 7
        }
      }, h('span', {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: C.faint
        }
      }, 'Q' + (i + 1)), rowTools(qa, i, 'faq')), h('input', {
        key: 'q',
        value: it.q || '',
        placeholder: 'Question',
        onChange: e => {
          const n = qa.slice();
          n[i] = Object.assign({}, it, {
            q: e.target.value
          });
          updateContent({
            faq: n
          });
        },
        style: Object.assign({}, sfield, {
          marginBottom: 6
        })
      }), h('textarea', {
        key: 'a',
        rows: 3,
        value: it.a || '',
        placeholder: 'Answer',
        onChange: e => {
          const n = qa.slice();
          n[i] = Object.assign({}, it, {
            a: e.target.value
          });
          updateContent({
            faq: n
          });
        },
        style: Object.assign({}, sfield, {
          resize: 'vertical',
          lineHeight: 1.5
        })
      })]))), addBtn('Add question', () => updateContent({
        faq: qa.concat([{
          q: 'New question?',
          a: ''
        }])
      })));
    })(), selId === 'registry' && (() => {
      const stores = c.registry || [];
      return h('div', null, draftBtn('registry', 'Draft with Pear'), draftNote, h('label', {
        style: lab
      }, 'Intro'), h('textarea', {
        rows: 3,
        value: c.registryBody || '',
        onChange: e => updateContent({
          registryBody: e.target.value
        }),
        style: Object.assign({}, field, {
          resize: 'vertical',
          lineHeight: 1.5
        })
      }), h('label', {
        style: lab
      }, 'Registry links'), stores.map((s, i) => h('div', {
        key: i,
        style: {
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          marginBottom: 6
        }
      }, h('input', {
        value: s || '',
        onChange: e => {
          const n = stores.slice();
          n[i] = e.target.value;
          updateContent({
            registry: n
          });
        },
        style: sfield
      }), rowTools(stores, i, 'registry'))), addBtn('Add link', () => updateContent({
        registry: stores.concat(['New registry'])
      })));
    })(), selId === 'travel' && (() => {
      const stays = c.travel || [];
      return h('div', null, draftBtn('travel', stays.length ? 'Re-suggest stays' : 'Suggest stays near ' + (c.place ? c.place.split(',')[0] : 'the venue')), draftNote, stays.length === 0 && drafting !== 'travel' && h('div', {
        style: {
          fontSize: 12.5,
          color: C.muted,
          lineHeight: 1.5,
          background: C.card,
          border: '1px solid ' + C.lineSoft,
          borderRadius: 10,
          padding: 12,
          marginBottom: 10
        }
      }, 'Empty for now — Pear suggests places to stay near your venue automatically, or add your own below.'), stays.map((r, i) => h('div', {
        key: i
      }, cardWrap([h('div', {
        key: 'h',
        style: {
          display: 'flex',
          alignItems: 'center',
          marginBottom: 7
        }
      }, h('span', {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: C.faint
        }
      }, 'Stay ' + (i + 1)), rowTools(stays, i, 'travel')), h('div', {
        key: 'b',
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }
      }, h('input', {
        value: r.name || '',
        placeholder: 'Name',
        onChange: e => {
          const n = stays.slice();
          n[i] = Object.assign({}, r, {
            name: e.target.value
          });
          updateContent({
            travel: n
          });
        },
        style: sfield
      }), h('input', {
        value: r.area || '',
        placeholder: 'Area / distance',
        onChange: e => {
          const n = stays.slice();
          n[i] = Object.assign({}, r, {
            area: e.target.value
          });
          updateContent({
            travel: n
          });
        },
        style: sfield
      }), h('textarea', {
        rows: 2,
        value: r.blurb || '',
        placeholder: 'One-line description',
        onChange: e => {
          const n = stays.slice();
          n[i] = Object.assign({}, r, {
            blurb: e.target.value
          });
          updateContent({
            travel: n
          });
        },
        style: Object.assign({}, sfield, {
          resize: 'vertical',
          lineHeight: 1.45
        })
      }), h('input', {
        value: r.link || '',
        placeholder: 'Link (https://…)',
        onChange: e => {
          const n = stays.slice();
          n[i] = Object.assign({}, r, {
            link: e.target.value
          });
          updateContent({
            travel: n
          });
        },
        style: sfield
      }))]))), addBtn('Add a stay', () => updateContent({
        travel: stays.concat([{
          name: 'New stay',
          area: '',
          blurb: '',
          link: ''
        }])
      })));
    })(), ['details', 'gallery', 'rsvp', 'countdown', 'map'].includes(selId) && h('div', null, selId === 'map' && h('div', {
      style: {
        fontSize: 13,
        color: C.inkSoft,
        lineHeight: 1.6,
        background: C.card,
        border: '1px solid ' + C.lineSoft,
        borderRadius: 10,
        padding: 14,
        marginBottom: 10
      }
    }, h('span', {
      style: {
        fontWeight: 700
      }
    }, '◉ Pinned to your venue. '), 'The map and “Get directions” use the place set in the ', h('b', null, 'Hero'), ' section.'), selId === 'countdown' && h('div', {
      style: {
        fontSize: 13,
        color: C.inkSoft,
        lineHeight: 1.6,
        background: C.card,
        border: '1px solid ' + C.lineSoft,
        borderRadius: 10,
        padding: 14,
        marginBottom: 10
      }
    }, h('span', {
      style: {
        fontWeight: 700
      }
    }, '⏱ Counts to your date. '), 'Set the date in the ', h('b', null, 'Hero'), ' section.'), pkind && h('div', {
      className: 'ed-pop',
      style: {
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid ' + C.gold,
        marginBottom: 12
      }
    }, h('div', {
      style: {
        background: 'linear-gradient(135deg, rgba(193,154,75,0.16), rgba(193,154,75,0.06))',
        padding: 14
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        marginBottom: 6
      }
    }, h(Glyph, {
      size: 22
    }), h('span', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: C.goldInk
      }
    }, 'Pear can populate this')), h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 16,
        color: C.ink,
        marginBottom: 4
      }
    }, PTITLE[selId]), h('div', {
      style: {
        fontSize: 12,
        color: C.muted,
        lineHeight: 1.5,
        marginBottom: 11
      }
    }, 'Pear returns rich, ready-to-place cards — not just text. Review and Add what fits.'), h('button', {
      onClick: () => onPicks(pkind),
      style: {
        padding: '9px 16px',
        borderRadius: 8,
        border: 'none',
        background: C.olive,
        color: C.cream,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, '✦ Show me'))), h('div', {
      style: {
        fontSize: 13,
        color: C.inkSoft,
        lineHeight: 1.6,
        background: C.card,
        border: '1px solid ' + C.lineSoft,
        borderRadius: 10,
        padding: 14
      }
    }, h('span', {
      style: {
        fontWeight: 700
      }
    }, '✎ Edit on the canvas. '), 'Click any text in this section to rewrite it inline. Card styling follows the ', h('b', null, 'Design'), ' tab.'), h('button', {
      onClick: onCmd,
      style: {
        marginTop: 10,
        width: '100%',
        padding: '10px',
        borderRadius: 9,
        border: '1px dashed ' + C.gold,
        background: C.goldSoft,
        color: C.goldInk,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, '✦ Ask Pear to draft this section')));
  }
  function LThumb({
    kind,
    id,
    label,
    active,
    onClick
  }) {
    const links = w => h('span', {
      style: {
        display: 'flex',
        gap: 3
      }
    }, [0, 1, 2].map(i => h('span', {
      key: i,
      style: {
        width: w || 7,
        height: 3,
        borderRadius: 2,
        background: C.faint
      }
    })));
    const dot = h('span', {
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: C.olive
      }
    });
    const pill = h('span', {
      style: {
        width: 12,
        height: 6,
        borderRadius: 3,
        background: C.olive
      }
    });
    let dia;
    if (kind === 'nav') {
      if (id === 'centered') dia = h('div', {
        style: {
          position: 'relative',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4
        }
      }, dot, links(), h('span', {
        style: {
          position: 'absolute',
          right: 0,
          top: 0
        }
      }, pill));else if (id === 'split') dia = h('div', {
        style: {
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }
      }, dot, links(), pill);else if (id === 'minimal') dia = links();else dia = h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4
        }
      }, h('span', {
        style: {
          width: 34,
          height: 6,
          borderRadius: 2,
          background: C.ink
        }
      }), links());
    } else {
      if (id === 'signature') dia = h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3
        }
      }, h('span', {
        style: {
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: C.olive
        }
      }), h('span', {
        style: {
          width: 24,
          height: 4,
          borderRadius: 2,
          background: C.ink
        }
      }), links(5));else if (id === 'columns') dia = h('div', {
        style: {
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }
      }, h('span', {
        style: {
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: C.olive
        }
      }), links(5));else dia = h('span', {
        style: {
          width: 36,
          height: 3,
          borderRadius: 2,
          background: C.faint
        }
      });
    }
    return h('button', {
      onClick,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        padding: '10px 8px',
        borderRadius: 10,
        cursor: 'pointer',
        border: '1px solid ' + (active ? C.olive : C.line),
        background: active ? 'rgba(92,107,63,0.08)' : C.card
      }
    }, h('div', {
      style: {
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 8px'
      }
    }, dia), h('span', {
      style: {
        fontSize: 10.5,
        fontWeight: active ? 700 : 600,
        color: active ? C.olive : C.inkSoft,
        textAlign: 'center'
      }
    }, label));
  }
  function DesignTab({
    st,
    set,
    applied
  }) {
    const themeDefaultTexture = window.PL_getTheme(st.theme).texture;
    const curTexture = st.texture || themeDefaultTexture;
    return h('div', {
      className: 'ed-pop'
    }, h('button', {
      onClick: () => set('_store', true),
      style: {
        width: '100%',
        padding: '12px',
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12.5,
        fontWeight: 800,
        marginBottom: applied ? 6 : 18,
        color: '#241a08',
        background: 'linear-gradient(135deg,#E6C877,#C19A4B)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7
      }
    }, '✦ Browse the Theme Store'), applied && h('div', {
      style: {
        fontSize: 11,
        color: C.goldInk,
        textAlign: 'center',
        marginBottom: 16,
        fontStyle: 'italic'
      }
    }, 'Wearing a store pack — pick a base theme below to reset.'), h(GLabel, null, 'Theme'), h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 7,
        marginBottom: 20
      }
    }, window.PL_THEMES.map(t => {
      const active = st.theme === t.id;
      const prem = PREMIUM_THEMES.has(t.id);
      return h('button', {
        key: t.id,
        onClick: () => set('theme', t.id),
        title: t.blurb,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 9px',
          borderRadius: 9,
          cursor: 'pointer',
          textAlign: 'left',
          border: '1px solid ' + (active ? C.olive : C.line),
          background: active ? 'rgba(92,107,63,0.1)' : C.card,
          position: 'relative'
        }
      }, h('span', {
        style: {
          display: 'flex',
          flexShrink: 0,
          borderRadius: 5,
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.06)'
        }
      }, t.swatches.slice(0, 4).map((c, i) => h('span', {
        key: i,
        style: {
          width: 8,
          height: 19,
          background: c
        }
      }))), h('span', {
        style: {
          fontSize: 10.5,
          fontWeight: active ? 700 : 500,
          color: active ? C.olive : C.inkSoft,
          lineHeight: 1.15
        }
      }, t.name), prem && h('span', {
        style: {
          position: 'absolute',
          top: 5,
          right: 6,
          fontSize: 9,
          color: C.gold
        }
      }, '✦'));
    })), h(GLabel, null, 'Paper · texture'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 20
      }
    }, TEXTURES.map(([v, l]) => h(Chip, {
      key: v,
      active: curTexture === v,
      onClick: () => set('texture', v)
    }, l))), h(GLabel, null, 'Component kit'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 14
      }
    }, STATIC_KITS.map(k => h(Chip, {
      key: k,
      active: st.kit === k,
      onClick: () => set('kit', k)
    }, kitLabel(k)))), h('button', {
      onClick: () => set('_tab', 'motion'),
      style: {
        width: '100%',
        padding: '10px',
        borderRadius: 9,
        border: '1px solid ' + C.gold,
        background: C.goldSoft,
        color: C.goldInk,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        marginBottom: 20
      }
    }, '✦ Browse animated kits — Atelier'), h(GLabel, null, 'Divider'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8
      }
    }, DIVIDERS.map(([v, l]) => h(Chip, {
      key: v,
      active: (st.divider || 'auto') === v,
      onClick: () => set('divider', v)
    }, l))), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 20,
        alignItems: 'center'
      }
    }, h('span', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: C.gold,
        marginRight: 2
      }
    }, '✦ Animated'), DIVIDERS_ANIM.map(([v, l]) => h(Chip, {
      key: v,
      active: st.divider === v,
      premium: true,
      title: 'Atelier motion divider',
      onClick: () => set('divider', v)
    }, l))), h(GLabel, null, 'Motif'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 8
      }
    }, MOTIFS.map(([v, l]) => h(Chip, {
      key: v,
      active: (st.motif || 'auto') === v,
      onClick: () => set('motif', v)
    }, l))), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 20,
        alignItems: 'center'
      }
    }, h('span', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: C.gold,
        marginRight: 2
      }
    }, '✦ Animated'), MOTIFS_ANIM.map(([v, l]) => h(Chip, {
      key: v,
      active: st.motif === v,
      premium: true,
      title: 'Atelier motion motif',
      onClick: () => set('motif', v)
    }, l))), h(GLabel, null, 'Density'), h('div', {
      style: {
        display: 'flex',
        gap: 6,
        marginBottom: 22
      }
    }, DENSITIES.map(d => h(Chip, {
      key: d,
      active: st.density === d,
      onClick: () => set('density', d)
    }, d))), h(GLabel, null, 'Navigation · desktop'), h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        marginBottom: 12
      }
    }, [['centered', 'Centered'], ['split', 'Split'], ['minimal', 'Minimal'], ['serif', 'Serif block']].map(([id, l]) => h(LThumb, {
      key: id,
      kind: 'nav',
      id,
      label: l,
      active: (st.nav || 'centered') === id,
      onClick: () => set('nav', id)
    }))), h(GLabel, null, 'Navigation · mobile'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 22
      }
    }, [['overlay', 'Overlay'], ['slide', 'Slide-in'], ['sheet', 'Bottom sheet'], ['pill', 'Pill']].map(([id, l]) => h(Chip, {
      key: id,
      active: (st.navm || 'overlay') === id,
      onClick: () => set('navm', id)
    }, l))), h(GLabel, null, 'Footer'), h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
        marginBottom: 22
      }
    }, [['signature', 'Signature'], ['columns', 'Columns'], ['minimal', 'Minimal']].map(([id, l]) => h(LThumb, {
      key: id,
      kind: 'footer',
      id,
      label: l,
      active: (st.footer || 'signature') === id,
      onClick: () => set('footer', id)
    }))), h(GLabel, null, 'Decor'), h('div', {
      style: {
        fontSize: 11,
        color: C.muted,
        marginBottom: 10,
        lineHeight: 1.4
      }
    }, 'Drag a flourish onto any section.'), h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8
      }
    }, DECOR.map(it => {
      const locked = it.prem && !st.premium;
      return h('div', {
        key: it.id,
        title: it.name,
        style: {
          position: 'relative',
          aspectRatio: '1',
          borderRadius: 10,
          border: '1px solid ' + C.line,
          background: C.card,
          display: 'grid',
          placeItems: 'center',
          cursor: 'grab'
        }
      }, decorSvg(it), locked && h('span', {
        style: {
          position: 'absolute',
          top: 4,
          right: 5,
          fontSize: 9,
          color: C.gold
        }
      }, '✦'));
    })));
  }
  function MotionTab({
    st,
    set
  }) {
    const premium = st.premium;
    return h('div', {
      className: 'ed-pop'
    }, /* Hero upsell banner */
    h('div', {
      style: {
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 18,
        background: 'linear-gradient(135deg, #2A2416, #4A3A1C)',
        padding: '18px 16px',
        position: 'relative'
      }
    }, h('div', {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(115deg, transparent 30%, rgba(255,240,200,0.18) 47%, transparent 64%)',
        backgroundSize: '250% 100%',
        animation: 'ed-sheen 4.5s ease-in-out infinite',
        pointerEvents: 'none'
      }
    }), h('div', {
      style: {
        position: 'relative'
      }
    }, h('div', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9.5,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: C.gold,
        marginBottom: 7
      }
    }, '✦ Atelier · Motion'), h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 21,
        color: '#FBF1DC',
        lineHeight: 1.1,
        marginBottom: 6
      }
    }, premium ? 'Your site is alive.' : 'Bring your site to life.'), h('div', {
      style: {
        fontSize: 12,
        color: 'rgba(243,236,217,0.75)',
        lineHeight: 1.5,
        marginBottom: 14
      }
    }, premium ? 'Every motion kit is unlocked for this site. Tap one to apply it.' : 'Eight living finishes — neon, foil, candlelight and more. One unlock, this site forever.'), h('button', {
      onClick: () => set('premium', !premium),
      style: {
        padding: '10px 18px',
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        fontSize: 12.5,
        fontWeight: 800,
        background: premium ? 'rgba(251,241,220,0.16)' : C.gold,
        color: premium ? '#FBF1DC' : '#241a08'
      }
    }, premium ? 'Unlocked ✓ · Manage' : 'Unlock Atelier — $19'))), /* Motion kit cards */
    h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 9
      }
    }, MOTION_KITS.map(k => {
      const active = st.kit === k.id;
      return h('div', {
        key: k.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: 10,
          borderRadius: 11,
          border: '1px solid ' + (active ? C.gold : C.line),
          background: active ? C.goldSoft : C.card
        }
      }, h('span', {
        style: {
          width: 38,
          height: 38,
          borderRadius: 9,
          flexShrink: 0,
          background: 'linear-gradient(135deg,' + k.sw[0] + ',' + k.sw[1] + ')',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
          position: 'relative'
        }
      }, !premium && h('span', {
        style: {
          position: 'absolute',
          right: -3,
          bottom: -3,
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: C.gold,
          color: '#241a08',
          fontSize: 8,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800
        }
      }, '✦')), h('div', {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, h('div', {
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: C.ink
        }
      }, k.name), h('div', {
        style: {
          fontSize: 11,
          color: C.muted,
          lineHeight: 1.35
        }
      }, k.desc), h('div', {
        style: {
          fontFamily: FONT_M,
          fontSize: 8.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: C.faint,
          marginTop: 3
        }
      }, k.for)), h('button', {
        onClick: () => set('kit', k.id),
        style: {
          padding: '7px 12px',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 11.5,
          fontWeight: 700,
          flexShrink: 0,
          border: '1px solid ' + (active ? C.gold : C.line),
          background: active ? C.gold : 'transparent',
          color: active ? '#241a08' : C.olive
        }
      }, active ? premium ? 'On' : 'Preview' : 'Apply'));
    })), !premium && h('div', {
      style: {
        fontSize: 11,
        color: C.goldInk,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 14,
        lineHeight: 1.5
      }
    }, 'Applying shows the still preview on your canvas. Unlock to set it in motion.'));
  }

  /* ════════════════════ PEAR ASSISTANT ════════════════════ */
  function PearBubble() {
    const [open, setOpen] = useState(false);
    return h('div', {
      style: {
        position: 'fixed',
        left: 20,
        bottom: 20,
        zIndex: 60
      }
    }, open && h('div', {
      className: 'ed-pop',
      style: {
        position: 'absolute',
        bottom: 58,
        left: 0,
        width: 270,
        background: C.cream,
        border: '1px solid ' + C.line,
        borderRadius: 14,
        boxShadow: '0 18px 44px -16px rgba(40,28,12,0.4)',
        padding: 16
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10
      }
    }, h(Glyph, {
      size: 24
    }), h('span', {
      style: {
        fontFamily: FONT_D,
        fontStyle: 'italic',
        fontSize: 16,
        color: C.ink
      }
    }, 'Pear')), h('div', {
      style: {
        fontSize: 12.5,
        color: C.inkSoft,
        lineHeight: 1.5,
        marginBottom: 12
      }
    }, 'Want me to set the tone? I can draft your story, suggest a look, or write your FAQ.'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6
      }
    }, ['Draft my story', 'Suggest a look', 'Write the FAQ'].map(c => h('button', {
      key: c,
      style: {
        padding: '6px 11px',
        borderRadius: 999,
        border: '1px solid ' + C.line,
        background: C.card,
        color: C.olive,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, c)))), h('button', {
      onClick: () => setOpen(!open),
      style: {
        width: 50,
        height: 50,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        background: C.olive,
        boxShadow: '0 10px 26px -8px rgba(40,28,12,0.5)',
        display: 'grid',
        placeItems: 'center'
      }
    }, h('svg', {
      width: 26,
      height: 26,
      viewBox: '0 0 100 42',
      'aria-hidden': true
    }, h('g', {
      fill: 'none',
      stroke: C.cream,
      strokeWidth: 2,
      strokeLinecap: 'round'
    }, h('path', {
      d: 'M2 21 C 30 21 64 21 96 21'
    }), h('circle', {
      cx: 96,
      cy: 21,
      r: 2.4,
      fill: C.gold,
      stroke: 'none'
    })))));
  }

  /* ════════════════════ UPGRADE MODAL ════════════════════ */
  function UpgradeModal({
    open,
    onClose,
    premium,
    setPremium
  }) {
    if (!open) return null;
    const feat = t => h('li', {
      style: {
        display: 'flex',
        gap: 9,
        alignItems: 'flex-start',
        fontSize: 13,
        color: C.inkSoft,
        lineHeight: 1.5,
        marginBottom: 9
      }
    }, h('span', {
      style: {
        color: C.olive,
        fontWeight: 800
      }
    }, '✓'), t);
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(20,14,8,0.5)',
        backdropFilter: 'blur(3px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      className: 'ed-pop',
      style: {
        width: '100%',
        maxWidth: 440,
        background: C.cream,
        borderRadius: 18,
        border: '1px solid ' + C.line,
        overflow: 'hidden',
        boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)'
      }
    }, h('div', {
      style: {
        background: 'linear-gradient(135deg, #2A2416, #4A3A1C)',
        padding: '26px 26px 22px',
        position: 'relative',
        overflow: 'hidden'
      }
    }, h('div', {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(115deg, transparent 30%, rgba(255,240,200,0.18) 47%, transparent 64%)',
        backgroundSize: '250% 100%',
        animation: 'ed-sheen 4.5s ease-in-out infinite'
      }
    }), h('div', {
      style: {
        position: 'relative'
      }
    }, h('div', {
      style: {
        fontFamily: FONT_M,
        fontSize: 10,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: C.gold,
        marginBottom: 8
      }
    }, '✦ Atelier'), h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 28,
        color: '#FBF1DC',
        lineHeight: 1.05
      }
    }, 'Every finish, in motion.'))), h('div', {
      style: {
        padding: '22px 26px 26px'
      }
    }, h('ul', {
      style: {
        listStyle: 'none',
        padding: 0,
        margin: '0 0 20px'
      }
    }, feat('All 8 animated Motion kits — neon, foil, candlelight & more'), feat('Premium theme packs (Deco Gilt, Midnight, Tide & Coast)'), feat('Every component kit & paper texture'), feat('One-time, this celebration — yours forever')), h('div', {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 18
      }
    }, h('span', {
      style: {
        fontFamily: FONT_D,
        fontSize: 34,
        color: C.ink,
        fontWeight: 600
      }
    }, '$19'), h('span', {
      style: {
        fontSize: 12.5,
        color: C.muted
      }
    }, 'once · per site')), h('button', {
      onClick: () => {
        setPremium(true);
        onClose();
      },
      style: {
        width: '100%',
        padding: '13px',
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 800,
        background: premium ? C.olive : C.gold,
        color: premium ? C.cream : '#241a08'
      }
    }, premium ? 'Atelier is active ✓' : 'Unlock Atelier'), h('button', {
      onClick: onClose,
      style: {
        width: '100%',
        padding: '11px',
        marginTop: 8,
        borderRadius: 10,
        border: 'none',
        background: 'transparent',
        color: C.muted,
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer'
      }
    }, 'Maybe later'))));
  }

  /* ════════════════════ THEME STORE ════════════════════
     Curated cross-section of the real catalog (lib/theme-store/packs.ts),
     built with the production mk() factory so palettes/type/radii match
     exactly. Applying a pack writes its full --t-* bag onto the canvas. */
  const F = {
    cormorant: "'Cormorant Garamond',Georgia,serif",
    fraunces: "'Fraunces',Georgia,serif",
    playfair: "'Playfair Display',Georgia,serif",
    dmserif: "'DM Serif Display',Georgia,serif",
    marcellus: "'Marcellus',Georgia,serif",
    cinzel: "'Cinzel',Georgia,serif",
    italiana: "'Italiana',Georgia,serif",
    space: "'Space Grotesk',sans-serif",
    tenor: "'Tenor Sans',sans-serif",
    inter: "'Inter',sans-serif",
    dmsans: "'DM Sans',sans-serif",
    bodoni: "'Bodoni Moda',Georgia,serif",
    prata: "'Prata',Georgia,serif",
    jost: "'Jost',sans-serif"
  };
  const SC = {
    caveat: "'Caveat',cursive",
    dancing: "'Dancing Script',cursive"
  };
  const cm = (a, p, b) => 'color-mix(in oklab, ' + a + ' ' + p + '%, ' + b + ')';
  const EXCL_KITS = new Set([]);
  const EXCL_TEX = new Set(['flecked']);
  const KIT_FALLBACK = {};
  const TEX_FALLBACK = {
    flecked: 'paper',
    marble: 'marble',
    kraft: 'cotton',
    gilded: 'velvet',
    canvas: 'cotton'
  };
  function mk(o) {
    const dark = !!o.dark,
      paper = o.paper,
      ink = o.ink,
      accent = o.accent,
      gold = o.gold;
    const section = o.section || cm(paper, dark ? 86 : 93, dark ? '#ffffff' : ink);
    const card = o.card || (dark ? cm(paper, 84, '#ffffff') : cm('#ffffff', 70, paper));
    const vars = {
      '--t-paper': paper,
      '--t-section': section,
      '--t-card': card,
      '--t-ink': ink,
      '--t-ink-soft': o.inkSoft || cm(ink, 74, paper),
      '--t-ink-muted': o.inkMuted || cm(ink, 48, paper),
      '--t-accent': accent,
      '--t-accent-2': o.accent2 || cm(accent, 62, paper),
      '--t-accent-bg': o.accentBg || cm(accent, dark ? 28 : 16, paper),
      '--t-accent-ink': o.accentInk || (dark ? cm(accent, 78, '#ffffff') : cm(accent, 84, ink)),
      '--t-gold': gold,
      '--t-line': o.line || cm(ink, dark ? 22 : 16, 'transparent'),
      '--t-line-soft': cm(ink, dark ? 12 : 8, 'transparent'),
      '--t-rsvp': o.rsvp || (dark ? gold : ink),
      '--t-rsvp-ink': o.rsvpInk || (dark ? '#1a1a1a' : paper),
      '--t-display': o.display || F.fraunces,
      '--t-body': o.body || F.inter,
      '--t-script': o.script || SC.caveat,
      '--t-radius': (o.radius != null ? o.radius : 8) + 'px',
      '--t-radius-lg': (o.radius != null ? o.radius : 8) + 8 + 'px',
      '--t-display-wght': o.wght || '600',
      '--t-hero-scale': String(o.heroScale || 1),
      '--t-eyebrow-ls': o.ls || '0.18em',
      '--t-shadow': o.shadow || (dark ? '0 16px 40px rgba(0,0,0,0.42)' : '0 10px 26px rgba(40,40,30,0.08)')
    };
    const price = o.price || 0;
    const tier = price === 0 ? 'free' : price >= 20 ? 'signature' : 'premium';
    const sw = o.swatches || [accent, dark ? o.accent2 || gold : ink, gold, section];
    return {
      id: o.id,
      name: o.name,
      collection: o.collection,
      blurb: o.blurb,
      vars,
      texture: o.texture || 'none',
      kit: o.kit || 'classic',
      dark,
      foil: !!o.foil,
      swatches: sw,
      price,
      tier,
      rating: o.r || 4.8,
      sales: o.s || '1.0k',
      badges: o.badges || {},
      exclKit: EXCL_KITS.has(o.kit),
      exclTex: EXCL_TEX.has(o.texture)
    };
  }
  const COLLECTIONS = [['all', 'All'], ['med', 'Mediterranean'], ['garden', 'Garden'], ['watercolor', 'Watercolor'], ['modern', 'Modern'], ['evening', 'Evening & Luxe'], ['coastal', 'Coastal'], ['heritage', 'Heritage'], ['celestial', 'Celestial'], ['whimsy', 'Whimsy'], ['prints', 'Prints'], ['seasonal', 'Seasonal']];
  const PACKS = [mk({
    id: 'first-thread',
    name: 'First Thread',
    collection: 'modern',
    blurb: 'The house colors — cream paper, olive ink, one gold thread. On us.',
    paper: '#F5EFE2',
    ink: '#0E0D0B',
    accent: '#5C6B3F',
    accent2: '#A4B57A',
    gold: '#B8935A',
    motif: 'vine',
    kit: 'classic',
    texture: 'paper',
    section: '#EBE3D2',
    card: '#FBF7EE',
    display: F.fraunces,
    radius: 12,
    price: 0,
    swatches: ['#F5EFE2', '#5C6B3F', '#B8935A', '#A4B57A']
  }), mk({
    id: 'pressed-garden',
    name: 'Pressed Garden',
    collection: 'garden',
    blurb: 'Sage leaves pressed between linen pages — herbarium-soft.',
    paper: '#F7F8F2',
    ink: '#2A3328',
    accent: '#6E8A6A',
    gold: '#B8935A',
    section: '#FDFAF0',
    card: '#FFFFFF',
    accentBg: '#E0DDC9',
    line: '#D4D8C6',
    display: F.fraunces,
    radius: 10,
    texture: 'paper',
    motif: 'pressed',
    kit: 'classic',
    price: 0,
    r: 4.9,
    s: '3.4k'
  }), mk({
    id: 'modern-editorial',
    name: 'Modern Editorial',
    collection: 'modern',
    blurb: 'Magazine-clean cream, crisp labels, charcoal ink.',
    paper: '#F4F3EF',
    ink: '#1A1A17',
    accent: '#1A1A17',
    gold: '#A89578',
    accent2: '#5A5A55',
    line: '#D9D6CE',
    display: F.inter,
    body: F.inter,
    radius: 2,
    wght: '600',
    ls: '0.04em',
    texture: 'paper',
    kit: 'minimal',
    swatches: ['#F4F3EF', '#1A1A17', '#A89578', '#5A5A55'],
    price: 0,
    s: '2.4k'
  }), mk({
    id: 'sage-watercolor',
    name: 'Sage Watercolor',
    collection: 'watercolor',
    blurb: 'Soft sage leaves washed across cream — garden-fresh.',
    paper: '#F5F2E8',
    ink: '#2A3324',
    accent: '#7E8F6E',
    gold: '#B8935A',
    accent2: '#A8B59A',
    texture: 'watercolor',
    motif: 'fern',
    kit: 'classic',
    radius: 16,
    wght: '500',
    ls: '0.16em',
    price: 0,
    s: '5.4k'
  }), mk({
    id: 'shell-blush',
    name: 'Shell Blush',
    collection: 'coastal',
    blurb: 'Seafoam wash on sand paper with scallop-shell motifs.',
    paper: '#F2EDDF',
    ink: '#1F3833',
    accent: '#6FA8A0',
    gold: '#C7A971',
    motif: 'shell',
    kit: 'classic',
    texture: 'cotton',
    display: F.fraunces,
    wght: '500',
    radius: 16,
    price: 0
  }), mk({
    id: 'cinque-terre',
    name: 'Cinque Terre',
    collection: 'med',
    blurb: 'Coral villages stacked above a quiet harbor.',
    paper: '#FBF7EC',
    ink: '#2E4A52',
    accent: '#D96A4A',
    gold: '#C2A165',
    accent2: '#EFA68A',
    accentBg: '#F5D5C5',
    display: F.marcellus,
    radius: 12,
    wght: '600',
    heroScale: 1.12,
    ls: '0.2em',
    texture: 'watercolor',
    motif: 'bloom',
    kit: 'ticket',
    price: 0
  }), mk({
    id: 'santorini-linen',
    name: 'Santorini Linen',
    collection: 'med',
    blurb: 'Whitewashed walls and Aegean blue on sea-bleached linen.',
    paper: '#F5F1E8',
    ink: '#1F2A35',
    accent: '#3F6E92',
    gold: '#C9A765',
    motif: 'olive',
    kit: 'plate',
    texture: 'linen',
    display: F.cormorant,
    wght: '500',
    ls: '0.22em',
    price: 18
  }), mk({
    id: 'amalfi-lemon',
    name: 'Amalfi Lemon',
    collection: 'med',
    blurb: 'Lemon groves spilling over a sun-warmed coast.',
    paper: '#FBF7EC',
    ink: '#2C5E72',
    accent: '#E0A92E',
    gold: '#C2A165',
    accent2: '#F1D27A',
    accentBg: '#F8EBC3',
    display: F.playfair,
    radius: 14,
    wght: '600',
    heroScale: 1.1,
    ls: '0.18em',
    texture: 'watercolor',
    motif: 'citrus',
    kit: 'scallop',
    price: 18,
    s: '2.1k'
  }), mk({
    id: 'tuscan-watercolor',
    name: 'Tuscan Watercolor',
    collection: 'watercolor',
    blurb: 'Sun-warmed terracotta washes — an afternoon in Montepulciano.',
    paper: '#FBF1E4',
    ink: '#3A1F12',
    accent: '#C2693E',
    gold: '#B8893E',
    inkSoft: '#5C3A26',
    accent2: '#D89576',
    texture: 'watercolor',
    motif: 'bloom',
    kit: 'scrapbook',
    radius: 16,
    wght: '500',
    ls: '0.14em',
    price: 18,
    r: 4.9,
    s: '2.4k'
  }), mk({
    id: 'peony-dusk',
    name: 'Peony Dusk',
    collection: 'watercolor',
    blurb: 'Plum peonies bleeding at the edges — gentle, romantic.',
    paper: '#F8F0EC',
    ink: '#3C1F33',
    accent: '#9C5E84',
    gold: '#BFA15E',
    inkSoft: '#5E3850',
    accent2: '#C892B0',
    accentBg: '#EFD9E4',
    texture: 'watercolor',
    motif: 'peony',
    kit: 'classic',
    radius: 18,
    wght: '500',
    ls: '0.16em',
    price: 18,
    r: 4.9,
    s: '3.1k',
    badges: {
      best: true
    }
  }), mk({
    id: 'english-rose',
    name: 'English Rose',
    collection: 'garden',
    blurb: 'Soft pink blooms on cream — a cottage garden in full bloom.',
    paper: '#FDFAF0',
    ink: '#3A2832',
    accent: '#C66B7C',
    gold: '#C9A769',
    section: '#F8EFE8',
    card: '#FFFFFF',
    accentBg: '#F3D8DE',
    line: '#E8D4D0',
    display: F.cormorant,
    script: SC.dancing,
    radius: 12,
    texture: 'paper',
    motif: 'bow',
    kit: 'classic',
    price: 18,
    s: '2.1k'
  }), mk({
    id: 'palm-springs',
    name: 'Palm Springs',
    collection: 'coastal',
    blurb: 'Retro pink on cabana stripes — poolside ease.',
    paper: '#F6F1E7',
    ink: '#2A1820',
    accent: '#D06A8E',
    gold: '#D4A85E',
    motif: 'palm',
    kit: 'ticket',
    texture: 'cotton',
    display: F.dmserif,
    wght: '500',
    radius: 10,
    price: 18
  }), mk({
    id: 'gingham-picnic',
    name: 'Gingham Picnic',
    collection: 'prints',
    blurb: 'Red-check picnic gingham on kraft — a backyard supper.',
    paper: '#FBF3E6',
    ink: '#2A1A12',
    accent: '#C7493B',
    gold: '#C9A55E',
    accent2: '#8A6A3C',
    texture: 'kraft',
    motif: 'none',
    kit: 'arch',
    display: F.fraunces,
    body: F.dmsans,
    wght: '600',
    price: 16
  }), mk({
    id: 'magnolia-porch',
    name: 'Magnolia Porch',
    collection: 'garden',
    blurb: 'Dusty rose magnolias on warm linen — a southern veranda.',
    paper: '#F8F3EA',
    ink: '#2C2218',
    accent: '#A86B76',
    accent2: '#D9B8A6',
    gold: '#C9A55E',
    motif: 'magnolia',
    kit: 'plate',
    texture: 'linen',
    section: '#F0E7D8',
    card: '#FFFDF4',
    display: F.playfair,
    radius: 14,
    price: 16,
    s: '1.1k'
  }), mk({
    id: 'provence-lavender',
    name: 'Provence Lavender',
    collection: 'whimsy',
    blurb: 'Dried lavender bundles in a sun-bleached farmhouse.',
    paper: '#FAF6F0',
    ink: '#4A3F5C',
    accent: '#8B7BB0',
    gold: '#C9A961',
    accent2: '#B8A8D4',
    accentBg: '#EDE6F3',
    accentInk: '#3A3148',
    motif: 'bloom',
    kit: 'scrapbook',
    texture: 'washi',
    price: 18,
    swatches: ['#8B7BB0', '#4A3F5C', '#C9A961', '#FAF6F0']
  }), mk({
    id: 'citrus-pop',
    name: 'Citrus Pop',
    collection: 'whimsy',
    blurb: 'Sliced orange on a juice-stained ticket — punchy citrus.',
    paper: '#FFF6EC',
    ink: '#3D1F12',
    accent: '#F0682E',
    gold: '#D49A3A',
    accent2: '#F4A155',
    accentBg: '#FCDCC4',
    accentInk: '#6A2E14',
    motif: 'citrus',
    kit: 'ticket',
    pattern: 'dots',
    price: 16,
    swatches: ['#F0682E', '#3D1F12', '#D49A3A', '#FFF6EC']
  }), mk({
    id: 'autumn-harvest',
    name: 'Autumn Harvest',
    collection: 'seasonal',
    blurb: 'Kraft paper, wheat stamps, rust ink — a late-October table.',
    paper: '#FAF2E4',
    ink: '#2A1A0E',
    accent: '#B5552B',
    accent2: '#D87A48',
    gold: '#C9A55E',
    motif: 'wheat',
    kit: 'cabinet',
    texture: 'tweed',
    section: '#F0E5D0',
    card: '#FFFCEE',
    display: F.fraunces,
    radius: 12,
    wght: '500',
    price: 14,
    swatches: ['#FAF2E4', '#B5552B', '#C9A55E', '#D87A48']
  }), mk({
    id: 'winter-frost',
    name: 'Winter Frost',
    collection: 'seasonal',
    blurb: 'Pale ice and brushed silver — a clear-sky January morning.',
    paper: '#F2F5F7',
    ink: '#1F2A35',
    accent: '#6E8FA6',
    accent2: '#B9C2D6',
    gold: '#A4B8C8',
    motif: 'none',
    kit: 'minimal',
    texture: 'silk',
    section: '#E8EEF2',
    card: '#FFFFFF',
    display: F.italiana,
    radius: 4,
    ls: '0.18em',
    price: 14,
    swatches: ['#F2F5F7', '#6E8FA6', '#A4B8C8', '#B9C2D6']
  }), mk({
    id: 'glasshouse',
    name: 'The Glasshouse',
    collection: 'celestial',
    blurb: 'Liquid-glass panes floating on aurora light.',
    paper: '#15131C',
    ink: '#F2EEF8',
    accent: '#8FA8E8',
    gold: '#D4B373',
    section: '#1B1826',
    card: '#211D2E',
    inkSoft: '#C9C2DC',
    inkMuted: '#8E86A6',
    accent2: '#C490C8',
    accentBg: '#2A2540',
    accentInk: '#0E0C14',
    line: 'rgba(242,238,248,0.16)',
    display: F.italiana,
    radius: 16,
    wght: '400',
    ls: '0.10em',
    heroScale: 1.12,
    kit: 'glass',
    dark: true,
    swatches: ['#15131C', '#8FA8E8', '#C490C8', '#D4B373'],
    price: 24,
    r: 5.0,
    s: 'New',
    badges: {
      new: true
    }
  }), mk({
    id: 'midnight-velvet',
    name: 'Midnight Velvet',
    collection: 'evening',
    blurb: 'Mauve champagne on inky velvet — a midnight ballroom.',
    paper: '#1A1B2E',
    section: '#20223A',
    card: '#262842',
    ink: '#F1ECDC',
    inkSoft: '#C9C2B2',
    inkMuted: '#8E8978',
    accent: '#B9A6E0',
    accent2: '#C9A24B',
    accentBg: '#2C2A48',
    accentInk: '#F4ECFF',
    gold: '#D4B373',
    line: 'rgba(241,236,220,0.18)',
    display: F.fraunces,
    radius: 6,
    wght: '500',
    ls: '0.22em',
    dark: true,
    foil: true,
    texture: 'velvet',
    motif: 'chandelier',
    kit: 'plate',
    swatches: ['#1A1B2E', '#B9A6E0', '#C9A24B', '#F1ECDC'],
    price: 24
  }), mk({
    id: 'obsidian-gold',
    name: 'Obsidian Gold',
    collection: 'evening',
    blurb: 'Pure leaf gold pressed onto obsidian — one bright glint.',
    paper: '#1A1B2E',
    section: '#20223A',
    card: '#262842',
    ink: '#F1ECDC',
    inkSoft: '#C9C2B2',
    inkMuted: '#8E8978',
    accent: '#CDA349',
    accent2: '#E5C77E',
    accentBg: '#2E2818',
    accentInk: '#F9E9C0',
    gold: '#CDA349',
    line: 'rgba(241,236,220,0.20)',
    display: F.italiana,
    radius: 2,
    wght: '400',
    ls: '0.28em',
    dark: true,
    foil: true,
    texture: 'velvet',
    kit: 'gilt',
    swatches: ['#1A1B2E', '#CDA349', '#E5C77E', '#F1ECDC'],
    price: 24,
    r: 5,
    s: '2.1k'
  }), mk({
    id: 'art-deco-gatsby',
    name: 'Art Deco Gatsby',
    collection: 'heritage',
    blurb: 'Onyx and gilt — fan-rays, foil rules, a roaring twenties press.',
    paper: '#15161A',
    ink: '#F4EAD2',
    accent: '#CBA14A',
    gold: '#CBA14A',
    accent2: '#E6C879',
    accentBg: '#2A2316',
    accentInk: '#15161A',
    line: '#3A2F18',
    display: F.cinzel,
    body: F.tenor,
    ls: '0.14em',
    wght: '600',
    radius: 2,
    dark: true,
    foil: true,
    texture: 'gilded',
    motif: 'deco',
    kit: 'deco',
    swatches: ['#15161A', '#CBA14A', '#E6C879', '#2A2316'],
    price: 24,
    s: '2.4k'
  }), mk({
    id: 'sicilian-marble',
    name: 'Sicilian Marble',
    collection: 'med',
    blurb: 'Veined stone, old laurel, and slow afternoons.',
    paper: '#FBF7EC',
    ink: '#2D2D28',
    accent: '#5A5A52',
    gold: '#C2A165',
    accent2: '#9C9C92',
    accentBg: '#DCDBD2',
    section: '#F0ECDF',
    card: '#FFFFFF',
    display: F.cinzel,
    radius: 8,
    wght: '600',
    heroScale: 1.16,
    ls: '0.24em',
    foil: true,
    texture: 'marble',
    motif: 'laurel',
    kit: 'deco',
    price: 22,
    badges: {
      best: true
    }
  }), mk({
    id: 'celestial-night',
    name: 'Celestial Night',
    collection: 'celestial',
    blurb: 'Midnight indigo with gilded constellations.',
    paper: '#111634',
    ink: '#EFEAD8',
    accent: '#C7A24B',
    accent2: '#9AA6E0',
    gold: '#C7A24B',
    dark: true,
    foil: true,
    motif: 'sun',
    kit: 'deco',
    texture: 'velvet',
    section: '#171D40',
    card: '#1D2450',
    display: F.cinzel,
    radius: 6,
    wght: '600',
    ls: '0.22em',
    price: 22,
    swatches: ['#111634', '#C7A24B', '#9AA6E0', '#EFEAD8']
  }), mk({
    id: 'opera-house',
    name: 'Opera House',
    collection: 'evening',
    blurb: 'Aubergine velvet, orchids on the rail, Bodoni at full voice.',
    paper: '#221420',
    ink: '#F2EAE4',
    accent: '#B687A8',
    accent2: '#D9B3C9',
    gold: '#D4AF6A',
    dark: true,
    foil: true,
    motif: 'orchid',
    kit: 'deco',
    texture: 'silk',
    section: '#2B1A28',
    card: '#322030',
    display: F.bodoni,
    body: F.jost,
    radius: 4,
    wght: '500',
    ls: '0.16em',
    price: 24,
    s: '860',
    badges: {
      new: true
    }
  }), mk({
    id: 'the-gallery',
    name: 'The Gallery',
    collection: 'modern',
    blurb: 'Museum mats, exhibit numbers, Prata under glass.',
    paper: '#F7F5F1',
    ink: '#1A1916',
    accent: '#44403A',
    accent2: '#8A8378',
    gold: '#B8935A',
    motif: 'none',
    kit: 'gallery',
    texture: 'marble',
    section: '#EFECE6',
    card: '#FFFFFF',
    display: F.prata,
    body: F.jost,
    radius: 0,
    ls: '0.12em',
    price: 22,
    s: '720',
    badges: {
      new: true
    }
  }), mk({
    id: 'gilded-coupe',
    name: 'Gilded Coupe',
    collection: 'evening',
    blurb: 'Champagne bubbles rising through candlelit velvet.',
    paper: '#1C1712',
    ink: '#F1EBDC',
    accent: '#D4B373',
    accent2: '#E8C77A',
    gold: '#D8A06A',
    dark: true,
    foil: true,
    motif: 'champagne',
    kit: 'deco',
    texture: 'velvet',
    section: '#251E16',
    card: '#2C241A',
    display: F.italiana,
    radius: 6,
    wght: '500',
    ls: '0.20em',
    price: 20,
    swatches: ['#1C1712', '#D4B373', '#D8A06A', '#E8C77A']
  })];
  const TIER_LABEL = {
    free: 'Free',
    premium: 'Premium',
    signature: 'Signature'
  };
  function PackCard({
    p,
    applied,
    premium,
    onApply
  }) {
    const locked = p.tier !== 'free' && !premium;
    const on = applied === p.id;
    return h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 13,
        overflow: 'hidden',
        border: '1px solid ' + (on ? C.olive : C.line),
        background: C.card,
        boxShadow: on ? '0 0 0 2px ' + C.olive : '0 1px 2px rgba(40,28,12,0.05)'
      }
    }, h('div', {
      style: {
        position: 'relative',
        height: 60,
        display: 'flex'
      }
    }, p.swatches.map((c, i) => h('span', {
      key: i,
      style: {
        flex: 1,
        background: c
      }
    })), h('span', {
      style: {
        position: 'absolute',
        top: 7,
        left: 7,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: p.tier === 'free' ? 'rgba(92,107,63,0.92)' : 'rgba(20,14,8,0.78)',
        color: p.tier === 'free' ? '#F4EFE2' : C.gold
      }
    }, TIER_LABEL[p.tier]), (p.badges.best || p.badges.new) && h('span', {
      style: {
        position: 'absolute',
        top: 7,
        right: 7,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 9,
        fontWeight: 800,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        background: C.cream,
        color: C.plum
      }
    }, p.badges.new ? 'New' : 'Best')), h('div', {
      style: {
        padding: '11px 12px 12px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 6
      }
    }, h('span', {
      style: {
        fontFamily: FONT_D,
        fontSize: 15.5,
        fontWeight: 600,
        color: C.ink
      }
    }, p.name), h('span', {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        color: p.price ? C.goldInk : C.olive
      }
    }, p.price ? '$' + p.price : 'Free')), h('div', {
      style: {
        fontSize: 11.5,
        color: C.muted,
        lineHeight: 1.4,
        margin: '4px 0 9px',
        flex: 1
      }
    }, p.blurb), (p.exclKit || p.exclTex || p.foil) && h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        marginBottom: 9
      }
    }, p.exclKit && h('span', {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: C.goldInk,
        background: C.goldSoft,
        padding: '2px 7px',
        borderRadius: 999
      }
    }, '✦ ' + p.kit + ' kit'), p.exclTex && h('span', {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: C.goldInk,
        background: C.goldSoft,
        padding: '2px 7px',
        borderRadius: 999
      }
    }, '✦ ' + p.texture), p.foil && h('span', {
      style: {
        fontSize: 9,
        fontWeight: 700,
        color: C.goldInk,
        background: C.goldSoft,
        padding: '2px 7px',
        borderRadius: 999
      }
    }, '✦ foil')), h('button', {
      onClick: () => onApply(p),
      style: {
        width: '100%',
        padding: '9px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        border: '1px solid ' + (on ? C.olive : locked ? C.gold : C.line),
        background: on ? C.olive : 'transparent',
        color: on ? C.cream : locked ? C.goldInk : C.olive
      }
    }, on ? 'Applied ✓' : locked ? '✦ Preview' : 'Apply')));
  }
  function Store({
    open,
    onClose,
    applied,
    premium,
    onApply,
    onUnlock
  }) {
    const [col, setCol] = useState('all');
    if (!open) return null;
    const list = PACKS.filter(p => col === 'all' || p.collection === col);
    return h('div', {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(20,14,8,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24
      }
    }, h('div', {
      className: 'ed-pop',
      style: {
        width: '100%',
        maxWidth: 1080,
        height: '88vh',
        display: 'flex',
        flexDirection: 'column',
        background: C.page,
        borderRadius: 18,
        border: '1px solid ' + C.line,
        overflow: 'hidden',
        boxShadow: '0 40px 100px -30px rgba(0,0,0,0.55)'
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 24px 16px',
        background: C.cream,
        borderBottom: '1px solid ' + C.line
      }
    }, h('div', null, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 24,
        fontWeight: 600,
        color: C.ink,
        lineHeight: 1
      }
    }, 'The Theme Store'), h('div', {
      style: {
        fontSize: 12,
        color: C.muted,
        marginTop: 4
      }
    }, 'Curated looks for every occasion — applied to your site in one tap.')), h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, h('button', {
      onClick: onUnlock,
      style: {
        padding: '8px 14px',
        borderRadius: 999,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        border: '1px solid ' + (premium ? C.gold : 'rgba(193,154,75,0.5)'),
        background: premium ? C.gold : C.goldSoft,
        color: premium ? '#241a08' : C.goldInk
      }
    }, premium ? '✦ Atelier — all unlocked' : '✦ Unlock all — $19'), h('button', {
      onClick: onClose,
      style: {
        width: 32,
        height: 32,
        borderRadius: 9,
        border: '1px solid ' + C.line,
        background: C.cream,
        color: C.muted,
        cursor: 'pointer',
        fontSize: 15
      }
    }, '✕'))), h('div', {
      className: 'ed-scroll',
      style: {
        display: 'flex',
        gap: 7,
        padding: '12px 24px',
        overflowX: 'auto',
        borderBottom: '1px solid ' + C.line,
        background: C.cream,
        flexShrink: 0
      }
    }, COLLECTIONS.map(([id, label]) => h('button', {
      key: id,
      onClick: () => setCol(id),
      style: {
        whiteSpace: 'nowrap',
        padding: '6px 13px',
        borderRadius: 999,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (col === id ? C.olive : C.line),
        background: col === id ? C.olive : C.cream,
        color: col === id ? C.cream : C.inkSoft
      }
    }, label))), h('div', {
      className: 'ed-scroll',
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: '20px 24px 28px'
      }
    }, h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))',
        gap: 16
      }
    }, list.map(p => h(PackCard, {
      key: p.id,
      p,
      applied,
      premium,
      onApply
    }))))));
  }

  /* ── Tools (left rail) + small line icons ── */
  const TOOLS = [{
    id: 'photos',
    name: 'Photos',
    note: 'Your image library',
    g: '▦'
  }, {
    id: 'fitting',
    name: 'Fitting room',
    note: 'Try looks on your site',
    g: 'F'
  }, {
    id: 'guests',
    name: 'Guests',
    note: 'Your guest list',
    g: 'G'
  }, {
    id: 'sitefile',
    name: 'Site file',
    note: 'Back up · move · duplicate',
    g: '⤓'
  }, {
    id: 'savedate',
    name: 'Save the date',
    note: 'Pre-invite teaser',
    g: 'S'
  }, {
    id: 'privacy',
    name: 'Privacy',
    note: 'Password · public',
    g: 'P'
  }, {
    id: 'dayof',
    name: 'Day-of',
    note: 'Live broadcasts',
    g: 'D'
  }, {
    id: 'toasts',
    name: 'Toasts & speeches',
    note: 'Drafted with Pear',
    g: 'T'
  }, {
    id: 'cohosts',
    name: 'Co-hosts',
    note: 'Invite a partner to edit',
    g: '+'
  }];

  /* ════════ PEAR COMMAND BAR (⌘K) — the AI hub ════════
     Natural-language asks + jump-to-section + quick Pear actions,
     all in one surface. Replaces the chat popup as the primary AI. */
  function CmdBar({
    open,
    onClose,
    onJump,
    onAction
  }) {
    const [q, setQ] = useState('');
    const ref = useRef(null);
    useEffect(() => {
      if (open) {
        setQ('');
        setTimeout(() => ref.current && ref.current.focus(), 30);
      }
    }, [open]);
    if (!open) return null;
    const ql = q.trim().toLowerCase();
    const ACTIONS = [{
      k: 'story',
      t: 'Draft our story',
      d: 'Pear writes it from your details'
    }, {
      k: 'faq',
      t: 'Write the FAQ',
      d: 'The questions guests always ask'
    }, {
      k: 'warm',
      t: 'Warm up the tone',
      d: 'Rephrase every line, softer'
    }, {
      k: 'look',
      t: 'Suggest a look',
      d: 'Open Theme Store picks for you'
    }, {
      k: 'hotels',
      t: 'Recommend stays for guests',
      d: 'Pear finds hotels near your venue'
    }, {
      k: 'moment',
      t: 'Add a schedule moment',
      d: 'Drop a new time card'
    }];
    const fa = ACTIONS.filter(a => !ql || a.t.toLowerCase().includes(ql));
    const fj = SECTIONS.filter(s => !ql || s.name.toLowerCase().includes(ql));
    const row = (icon, title, desc, onClick, key) => h('button', {
      key,
      onClick,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 14px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        borderRadius: 9
      },
      onMouseEnter: e => e.currentTarget.style.background = C.cream,
      onMouseLeave: e => e.currentTarget.style.background = 'transparent'
    }, h('span', {
      style: {
        width: 26,
        height: 26,
        borderRadius: 7,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: C.goldSoft,
        color: C.goldInk,
        fontSize: 12,
        fontWeight: 800
      }
    }, icon), h('div', {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, h('div', {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: C.ink
      }
    }, title), desc && h('div', {
      style: {
        fontSize: 11,
        color: C.muted
      }
    }, desc)));
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(20,14,8,0.4)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh'
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      className: 'ed-pop',
      style: {
        width: 'min(560px, 92vw)',
        maxHeight: '70vh',
        display: 'flex',
        flexDirection: 'column',
        background: C.cream,
        borderRadius: 16,
        border: '1px solid ' + C.line,
        boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '15px 18px',
        borderBottom: '1px solid ' + C.line
      }
    }, h(Glyph, {
      size: 24
    }), h('input', {
      ref,
      value: q,
      onChange: e => setQ(e.target.value),
      placeholder: 'Ask Pear, or jump anywhere…',
      style: {
        flex: 1,
        border: 'none',
        background: 'transparent',
        outline: 'none',
        fontSize: 15,
        color: C.ink,
        fontFamily: 'inherit'
      }
    }), h('kbd', {
      style: {
        fontFamily: FONT_M,
        fontSize: 10,
        background: C.studio,
        borderRadius: 5,
        padding: '2px 6px',
        color: C.muted
      }
    }, 'esc')), h('div', {
      className: 'ed-scroll',
      style: {
        overflowY: 'auto',
        padding: '8px 8px 12px'
      }
    }, ql && h('div', {
      style: {
        padding: '4px 10px'
      }
    }, row('✦', 'Ask Pear: “' + q + '”', 'Pear drafts a reply and proposes the edit', () => {
      onAction('nl', q);
      onClose();
    }, 'nl')), fa.length > 0 && h('div', null, h('div', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: C.faint,
        padding: '8px 14px 4px'
      }
    }, 'Pear can'), fa.map(a => row('✦', a.t, a.d, () => {
      onAction(a.k);
      onClose();
    }, a.k))), fj.length > 0 && h('div', null, h('div', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: C.faint,
        padding: '10px 14px 4px'
      }
    }, 'Jump to'), fj.map(s => row(s.name[0], s.name, s.note, () => {
      onJump(s.id);
      onClose();
    }, s.id)))), h('div', {
      style: {
        padding: '9px 16px',
        borderTop: '1px solid ' + C.line,
        fontSize: 10.5,
        color: C.faint,
        display: 'flex',
        gap: 16
      }
    }, h('span', null, '⏎ run'), h('span', null, '↑↓ move'), h('span', null, 'Pear suggests — you approve every change'))));
  }

  /* ════════ PROFILE MENU (top-right) ════════ */
  function ProfileMenu({
    open,
    onClose
  }) {
    if (!open) return null;
    const link = (t, sub) => h('button', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        padding: '9px 12px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        borderRadius: 8,
        fontSize: 13,
        color: C.ink,
        fontFamily: 'inherit'
      },
      onMouseEnter: e => e.currentTarget.style.background = C.page,
      onMouseLeave: e => e.currentTarget.style.background = 'transparent'
    }, h('span', null, t), sub && h('span', {
      style: {
        fontSize: 11,
        color: C.faint
      }
    }, sub));
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 95
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      className: 'ed-pop',
      style: {
        position: 'absolute',
        top: 50,
        right: 14,
        width: 248,
        background: C.cream,
        border: '1px solid ' + C.line,
        borderRadius: 14,
        boxShadow: '0 20px 50px -16px rgba(40,28,12,0.4)',
        overflow: 'hidden'
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '15px 14px',
        background: C.page
      }
    }, h('span', {
      style: {
        width: 40,
        height: 40,
        borderRadius: 11,
        background: C.olive,
        color: C.cream,
        display: 'grid',
        placeItems: 'center',
        fontFamily: FONT_D,
        fontSize: 16,
        fontWeight: 600
      }
    }, 'SB'), h('div', null, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 16,
        color: C.ink,
        lineHeight: 1
      }
    }, 'Scott B'), h('div', {
      style: {
        fontSize: 11,
        color: C.muted,
        marginTop: 3
      }
    }, 'Journal plan'))), h('div', {
      style: {
        padding: 6
      }
    }, link('Your mark', 'SB'), link('Account'), link('Usage & credits'), link('Subscription', 'Journal'), link('Notifications')), h('div', {
      style: {
        borderTop: '1px solid ' + C.line,
        padding: 6
      }
    }, link('Sign out'))));
  }

  /* ════════ CO-HOST MODAL ════════ */
  function CoHostModal({
    open,
    onClose
  }) {
    const [role, setRole] = useState('editor');
    const [copied, setCopied] = useState(false);
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    useEffect(() => {
      if (open) {
        setSent(false);
        setCopied(false);
        setEmail('');
      }
    }, [open]);
    if (!open) return null;
    const ROLES = [['editor', 'Editor', 'Edits everything', 'M4 20 14 10l3 3L7 20ZM14 10l1.8-1.8a2 2 0 0 1 3 3L17 13'], ['guest', 'Guest manager', 'RSVPs & notes', 'M3 6h18v12H3zM3 7l9 6 9-6'], ['viewer', 'Viewer', 'Preview only', 'M2 12C5 6 19 6 22 12 19 18 5 18 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z']];
    const ricon = (p, on) => h('svg', {
      width: 17,
      height: 17,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: on ? C.olive : C.muted,
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }, h('path', {
      d: p
    }));
    const avatar = (init, grad, ring) => h('span', {
      style: {
        width: 40,
        height: 40,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        color: '#fff',
        fontSize: 13.5,
        fontWeight: 700,
        fontFamily: FONT_D,
        background: grad,
        boxShadow: '0 0 0 2px ' + C.cream + ', 0 0 0 3.5px ' + ring
      }
    }, init);
    const pill = (txt, tone, bg) => h('span', {
      style: {
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: tone,
        background: bg,
        padding: '3px 8px',
        borderRadius: 999
      }
    }, txt);
    const person = (av, name, sub, right) => h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '9px 0'
      }
    }, av, h('div', {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, h('div', {
      style: {
        fontSize: 13,
        fontWeight: 700,
        color: C.ink
      }
    }, name), h('div', {
      style: {
        fontSize: 11,
        color: C.muted
      }
    }, sub)), right);
    const link = 'pearloom.co/j/mira-jun-2026';
    const doCopy = () => {
      try {
        navigator.clipboard && navigator.clipboard.writeText('https://' + link);
      } catch (e) {/* */}
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 130,
        background: 'rgba(20,14,8,0.52)',
        WebkitBackdropFilter: 'blur(5px)',
        backdropFilter: 'blur(5px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        fontFamily: "'Inter',system-ui,sans-serif"
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      className: 'ed-pop ed-scroll',
      style: {
        width: '100%',
        maxWidth: 460,
        background: C.cream,
        borderRadius: 20,
        border: '1px solid ' + C.line,
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxShadow: '0 50px 100px -30px rgba(20,14,8,0.55)'
      }
    }, /* Invitation header band */
    h('div', {
      style: {
        position: 'relative',
        padding: '26px 26px 22px',
        background: 'radial-gradient(120% 140% at 15% 0%, ' + C.goldSoft + ' 0%, ' + C.cream + ' 60%)',
        borderBottom: '1px solid ' + C.line,
        overflow: 'hidden'
      }
    }, h('div', {
      'aria-hidden': true,
      style: {
        position: 'absolute',
        top: -18,
        right: -10,
        opacity: 0.16
      }
    }, h(Glyph, {
      size: 132
    })), h('button', {
      onClick: onClose,
      style: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 30,
        height: 30,
        borderRadius: 999,
        border: '1px solid ' + C.line,
        background: 'rgba(255,253,247,0.7)',
        color: C.muted,
        cursor: 'pointer',
        fontSize: 14,
        zIndex: 2
      }
    }, '\u2715'), h('div', {
      style: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 13
      }
    }, avatar('M', 'linear-gradient(135deg,#8B9C5A,#5C6B3F)', 'rgba(92,107,63,0.25)'), h('div', null, h('div', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9.5,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: C.goldInk,
        marginBottom: 5
      }
    }, '\u2726 Plan it together'), h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 25,
        color: C.ink,
        lineHeight: 1
      }
    }, 'Invite a co-host'))), h('div', {
      style: {
        position: 'relative',
        fontSize: 12.5,
        color: C.muted,
        marginTop: 11,
        lineHeight: 1.5,
        maxWidth: 360
      }
    }, 'They edit the very same site \u2014 no copies, no account juggling. Perfect for a partner, planner, or family.')), h('div', {
      style: {
        padding: '20px 26px 24px'
      }
    }, h('label', {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: C.faint,
        marginBottom: 7,
        display: 'block'
      }
    }, 'Invite by email'), h('div', {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 18
      }
    }, h('input', {
      value: email,
      onChange: e => setEmail(e.target.value),
      placeholder: 'partner@email.com',
      style: {
        flex: 1,
        padding: '11px 13px',
        borderRadius: 10,
        border: '1px solid ' + C.line,
        background: C.card,
        fontSize: 13.5,
        outline: 'none',
        fontFamily: 'inherit',
        boxSizing: 'border-box'
      }
    }), h('button', {
      onClick: () => {
        if (email.trim()) {
          setSent(true);
          setEmail('');
          setTimeout(() => setSent(false), 2200);
        }
      },
      style: {
        padding: '0 18px',
        borderRadius: 10,
        border: 'none',
        background: C.olive,
        color: C.cream,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap'
      }
    }, sent ? 'Sent \u2713' : 'Send')), h('label', {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: C.faint,
        marginBottom: 8,
        display: 'block'
      }
    }, 'They can'), h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
        marginBottom: 20
      }
    }, ROLES.map(([id, t, d, p]) => {
      const on = role === id;
      return h('button', {
        key: id,
        onClick: () => setRole(id),
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          padding: '12px 10px',
          borderRadius: 12,
          cursor: 'pointer',
          textAlign: 'left',
          border: '1px solid ' + (on ? C.olive : C.line),
          background: on ? 'rgba(92,107,63,0.09)' : C.card,
          transition: 'all .12s'
        }
      }, h('span', {
        style: {
          width: 30,
          height: 30,
          borderRadius: 9,
          display: 'grid',
          placeItems: 'center',
          background: on ? 'rgba(92,107,63,0.14)' : C.page
        }
      }, ricon(p, on)), h('div', null, h('div', {
        style: {
          fontSize: 12,
          fontWeight: 700,
          color: on ? C.olive : C.ink,
          lineHeight: 1.1
        }
      }, t), h('div', {
        style: {
          fontSize: 10.5,
          color: C.muted,
          marginTop: 2
        }
      }, d)));
    })), h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '0 0 20px'
      }
    }, h('span', {
      style: {
        flex: 1,
        height: 1,
        background: C.line
      }
    }), h('span', {
      style: {
        fontSize: 10.5,
        color: C.faint,
        fontWeight: 600
      }
    }, 'or share a link'), h('span', {
      style: {
        flex: 1,
        height: 1,
        background: C.line
      }
    })), h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '9px 9px 9px 14px',
        borderRadius: 11,
        border: '1px dashed ' + C.line,
        background: C.card,
        marginBottom: 22
      }
    }, h('span', {
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: C.page,
        color: C.olive
      }
    }, h('svg', {
      width: 16,
      height: 16,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.7,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }, h('path', {
      d: 'M9 15 15 9M10.5 6.5 12 5a4 4 0 0 1 6 6l-1.5 1.5M13.5 17.5 12 19a4 4 0 0 1-6-6l1.5-1.5'
    }))), h('span', {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 12.5,
        color: C.inkSoft,
        fontFamily: FONT_M,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, link), h('button', {
      onClick: doCopy,
      style: {
        padding: '8px 14px',
        borderRadius: 8,
        border: '1px solid ' + (copied ? C.olive : C.line),
        background: copied ? 'rgba(92,107,63,0.1)' : C.cream,
        color: copied ? C.olive : C.inkSoft,
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap'
      }
    }, copied ? 'Copied \u2713' : 'Copy')), h('div', {
      style: {
        borderTop: '1px solid ' + C.line,
        paddingTop: 14
      }
    }, h('div', {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: C.faint,
        marginBottom: 4
      }
    }, 'On this site'), person(avatar('SB', 'linear-gradient(135deg,#8B9C5A,#5C6B3F)', 'rgba(92,107,63,0.25)'), 'Scott B', 'scott@email.com', pill('Owner', C.olive, 'rgba(92,107,63,0.12)')), person(avatar('J', 'linear-gradient(135deg,#E6C877,#C19A4B)', 'rgba(193,154,75,0.3)'), 'jun@email.com', 'Editor', pill('Pending', C.goldInk, C.goldSoft))))));
  }

  /* ════════ DECOR LIBRARY (drawer) ════════ */
  const DECOR = [{
    id: 'sprig',
    name: 'Olive sprig',
    g: 'M4 12 H20 M10 12 q-3-4-6-5 M10 12 q-3 4-6 5 M16 12 q3-4 6-5 M16 12 q3 4 6 5'
  }, {
    id: 'bloom',
    name: 'Bloom',
    g: 'circle'
  }, {
    id: 'laurel',
    name: 'Laurel',
    g: 'M12 21 C5 17 4 9 8 4 M12 21 C19 17 20 9 16 4'
  }, {
    id: 'sun',
    name: 'Sun',
    g: 'sun'
  }, {
    id: 'wave',
    name: 'Wave',
    g: 'M3 13 q3-5 6 0 t6 0 t6 0'
  }, {
    id: 'ring',
    name: 'Rings',
    g: 'rings'
  }, {
    id: 'heart',
    name: 'Heart',
    g: 'M12 20 C4 14 4 7 9 6 C11 6 12 8 12 9 C12 8 13 6 15 6 C20 7 20 14 12 20Z',
    prem: true
  }, {
    id: 'star',
    name: 'Sparkle',
    g: 'M12 3 C13 9 15 11 21 12 C15 13 13 15 12 21 C11 15 9 13 3 12 C9 11 11 9 12 3Z',
    prem: true
  }];
  function decorSvg(it) {
    const stroke = h('g', {
      fill: 'none',
      stroke: C.olive,
      strokeWidth: 1.6,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }, it.g === 'circle' ? [0, 60, 120, 180, 240, 300].map(a => h('ellipse', {
      key: a,
      cx: 12,
      cy: 7,
      rx: 2.4,
      ry: 5,
      transform: 'rotate(' + a + ' 12 12)'
    })).concat(h('circle', {
      key: 'c',
      cx: 12,
      cy: 12,
      r: 2,
      fill: C.gold,
      stroke: 'none'
    })) : it.g === 'sun' ? [h('circle', {
      key: 'c',
      cx: 12,
      cy: 12,
      r: 4.5
    })].concat([0, 45, 90, 135, 180, 225, 270, 315].map(a => h('path', {
      key: a,
      d: 'M12 5.5 V3',
      transform: 'rotate(' + a + ' 12 12)'
    }))) : it.g === 'rings' ? [h('circle', {
      key: 1,
      cx: 9,
      cy: 13,
      r: 6
    }), h('circle', {
      key: 2,
      cx: 15,
      cy: 13,
      r: 6
    }), h('path', {
      key: 3,
      d: 'M12 6 l1.5-2.5 l1.5 2.5',
      fill: C.gold,
      stroke: C.gold
    })] : h('path', {
      d: it.g
    }));
    return h('svg', {
      width: 30,
      height: 30,
      viewBox: '0 0 24 24',
      'aria-hidden': true
    }, stroke);
  }
  function DecorDrawer({
    open,
    onClose,
    premium,
    onUnlock
  }) {
    const [tab, setTab] = useState('motifs');
    if (!open) return null;
    const PATTERNS = [['gingham', 'repeating-linear-gradient(0deg,rgba(92,107,63,.25) 0 4px,transparent 4px 8px),repeating-linear-gradient(90deg,rgba(92,107,63,.25) 0 4px,transparent 4px 8px)'], ['stripe', 'repeating-linear-gradient(90deg,rgba(92,107,63,.3) 0 5px,transparent 5px 11px)'], ['dots', 'radial-gradient(circle,rgba(92,107,63,.4) 1.5px,transparent 2px)'], ['scallop', 'radial-gradient(circle at 50% 0,transparent 6px,rgba(193,154,75,.3) 6px 7px,transparent 7px)'], ['deco', 'repeating-linear-gradient(45deg,rgba(193,154,75,.3) 0 3px,transparent 3px 8px)'], ['celestial', 'radial-gradient(circle,rgba(193,154,75,.5) 1px,transparent 1.5px)']];
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(20,14,8,0.4)'
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      className: 'ed-pop',
      style: {
        position: 'absolute',
        top: 0,
        right: 0,
        height: '100vh',
        width: 340,
        background: C.cream,
        borderLeft: '1px solid ' + C.line,
        boxShadow: '-20px 0 50px -20px rgba(40,28,12,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 18px 14px',
        borderBottom: '1px solid ' + C.line
      }
    }, h('div', null, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 21,
        color: C.ink,
        lineHeight: 1
      }
    }, 'Decor library'), h('div', {
      style: {
        fontSize: 11.5,
        color: C.muted,
        marginTop: 4
      }
    }, 'Drag a flourish onto your site.')), h('button', {
      onClick: onClose,
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        border: '1px solid ' + C.line,
        background: C.card,
        color: C.muted,
        cursor: 'pointer',
        fontSize: 14
      }
    }, '✕')), h('div', {
      style: {
        display: 'flex',
        gap: 6,
        padding: '12px 16px',
        borderBottom: '1px solid ' + C.line
      }
    }, [['motifs', 'Motifs'], ['patterns', 'Patterns']].map(([id, l]) => h('button', {
      key: id,
      onClick: () => setTab(id),
      style: {
        padding: '6px 13px',
        borderRadius: 999,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 600,
        border: '1px solid ' + (tab === id ? C.olive : C.line),
        background: tab === id ? C.olive : C.cream,
        color: tab === id ? C.cream : C.inkSoft
      }
    }, l))), h('div', {
      className: 'ed-scroll',
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: 16
      }
    }, tab === 'motifs' ? h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10
      }
    }, DECOR.map(it => {
      const locked = it.prem && !premium;
      return h('div', {
        key: it.id,
        title: it.name,
        style: {
          position: 'relative',
          aspectRatio: '1',
          borderRadius: 11,
          border: '1px solid ' + C.line,
          background: C.card,
          display: 'grid',
          placeItems: 'center',
          cursor: 'grab'
        }
      }, decorSvg(it), locked && h('span', {
        style: {
          position: 'absolute',
          top: 5,
          right: 6,
          fontSize: 9,
          color: C.gold
        }
      }, '✦'));
    })) : h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10
      }
    }, PATTERNS.map(([id, bg], i) => h('div', {
      key: id,
      title: id,
      style: {
        position: 'relative',
        height: 72,
        borderRadius: 11,
        border: '1px solid ' + C.line,
        background: bg + ', ' + C.card,
        backgroundSize: id === 'gingham' ? '8px 8px' : id === 'dots' || id === 'celestial' ? '10px 10px' : 'auto',
        cursor: 'grab'
      }
    }, i > 3 && !premium && h('span', {
      style: {
        position: 'absolute',
        top: 5,
        right: 6,
        fontSize: 9,
        color: C.gold
      }
    }, '✦'))))), !premium && h('button', {
      onClick: onUnlock,
      style: {
        margin: 16,
        padding: '11px',
        borderRadius: 10,
        border: 'none',
        background: 'linear-gradient(135deg,#E6C877,#C19A4B)',
        color: '#241a08',
        fontSize: 12.5,
        fontWeight: 800,
        cursor: 'pointer'
      }
    }, '✦ Unlock premium decor — Atelier')));
  }

  /* ════ PEAR PICKS — rich, VISUAL AI suggestions (not text) ════
     Ask Pear to recommend stays → it returns real hotel cards
     (photo, rating, price, amenities) ready to drop into Travel. */
  const PEAR_HOTELS = [{
    name: 'Cosmos Suites',
    tone: 'warm',
    rating: 4.8,
    reviews: 412,
    price: '$$$',
    dist: '8-min walk',
    blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.',
    tags: ['Caldera view', 'Pool', 'Breakfast']
  }, {
    name: 'Andronis Boutique',
    tone: 'lavender',
    rating: 4.9,
    reviews: 286,
    price: '$$$$',
    dist: '12-min walk',
    blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite.',
    tags: ['Spa', 'Infinity pool', 'Fine dining']
  }, {
    name: 'Olive & Vine Inn',
    tone: 'sage',
    rating: 4.7,
    reviews: 198,
    price: '$$',
    dist: '5-min drive',
    blurb: 'A restored farmhouse among the groves — simple, warm, walkable.',
    tags: ['Garden', 'Free parking', 'Pet-friendly']
  }];
  const PTONE = {
    warm: 'linear-gradient(135deg,#E8C8A8,#D9A87E)',
    lavender: 'linear-gradient(135deg,#D4C4E4,#B0A0CE)',
    sage: 'linear-gradient(135deg,#CBD4B0,#A6B884)'
  };
  function PearPicks({
    open,
    onClose
  }) {
    const [added, setAdded] = useState({});
    useEffect(() => {
      if (open) setAdded({});
    }, [open]);
    if (!open) return null;
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 96,
        background: 'rgba(20,14,8,0.5)',
        backdropFilter: 'blur(3px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      className: 'ed-pop',
      style: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '86vh',
        display: 'flex',
        flexDirection: 'column',
        background: C.cream,
        borderRadius: 16,
        border: '1px solid ' + C.line,
        overflow: 'hidden',
        boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)'
      }
    }, h('div', {
      style: {
        padding: '18px 20px 14px',
        borderBottom: '1px solid ' + C.line,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11
      }
    }, h(Glyph, {
      size: 26
    }), h('div', {
      style: {
        flex: 1
      }
    }, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 19,
        color: C.ink,
        lineHeight: 1.1
      }
    }, 'Three stays near Point Reyes'), h('div', {
      style: {
        fontSize: 12,
        color: C.muted,
        marginTop: 3,
        lineHeight: 1.4
      }
    }, 'Pear pulled these for your guests — tap Add and they drop into Travel as cards.')), h('button', {
      onClick: onClose,
      style: {
        width: 28,
        height: 28,
        borderRadius: 8,
        border: '1px solid ' + C.line,
        background: C.card,
        color: C.muted,
        cursor: 'pointer'
      }
    }, '✕')), h('div', {
      className: 'ed-scroll',
      style: {
        overflowY: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, PEAR_HOTELS.map((ht, i) => {
      const on = added[i];
      return h('div', {
        key: i,
        className: 'ed-pop',
        style: {
          display: 'flex',
          gap: 12,
          padding: 12,
          borderRadius: 13,
          border: '1px solid ' + (on ? C.olive : C.line),
          background: C.card
        }
      }, h('div', {
        style: {
          width: 84,
          height: 84,
          borderRadius: 10,
          flexShrink: 0,
          background: PTONE[ht.tone],
          position: 'relative'
        }
      }, h('span', {
        style: {
          position: 'absolute',
          bottom: 5,
          left: 5,
          background: 'rgba(20,14,8,0.62)',
          color: '#fff',
          borderRadius: 6,
          padding: '1px 6px',
          fontSize: 10,
          fontWeight: 700
        }
      }, '★ ' + ht.rating)), h('div', {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, h('div', {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 6
        }
      }, h('div', {
        style: {
          fontFamily: FONT_D,
          fontSize: 16,
          color: C.ink
        }
      }, ht.name), h('div', {
        style: {
          fontSize: 11.5,
          fontWeight: 700,
          color: C.muted
        }
      }, ht.price)), h('div', {
        style: {
          fontSize: 11,
          color: C.muted,
          margin: '2px 0 5px'
        }
      }, ht.reviews + ' reviews · ' + ht.dist), h('div', {
        style: {
          fontSize: 11.5,
          color: C.inkSoft,
          lineHeight: 1.4,
          marginBottom: 7
        }
      }, ht.blurb), h('div', {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          marginBottom: 9
        }
      }, ht.tags.map(t => h('span', {
        key: t,
        style: {
          fontSize: 9.5,
          fontWeight: 600,
          color: C.olive,
          background: C.page,
          padding: '2px 7px',
          borderRadius: 999
        }
      }, t))), h('button', {
        onClick: () => setAdded(a => Object.assign({}, a, {
          [i]: !a[i]
        })),
        style: {
          padding: '7px 14px',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 700,
          border: '1px solid ' + (on ? C.olive : C.line),
          background: on ? C.olive : 'transparent',
          color: on ? C.cream : C.olive
        }
      }, on ? 'Added ✓' : '+ Add to site')));
    })), h('div', {
      style: {
        padding: '12px 16px',
        borderTop: '1px solid ' + C.line,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, h('button', {
      style: {
        fontSize: 12,
        color: C.olive,
        fontWeight: 600,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer'
      }
    }, '↺ Show three more'), h('button', {
      onClick: onClose,
      style: {
        padding: '8px 18px',
        borderRadius: 8,
        border: 'none',
        background: C.olive,
        color: C.cream,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, 'Done'))));
  }

  /* ════ PEAR BLOCKS — rich VISUAL results for every section ════ */
  const PB_META = {
    travel: ['Three stays near Point Reyes', 'Pear pulled these for your guests — tap Add and they drop into Travel.'],
    story: ['A first draft of your story', 'In your voice, from your details. Edit anything after.'],
    schedule: ['Your day, in moments', 'A timeline Pear built from your event.'],
    registry: ['A few registry ideas', 'Funds and shops that fit your celebration.'],
    gallery: ['A gallery, arranged', 'Pear set your photos into a rhythm.'],
    faq: ['The questions guests ask', 'Answered in your voice — keep the ones that fit.'],
    details: ['The details guests need', 'Dress code, kids, gifts — filled in for you.']
  };
  function PearBlocks({
    open,
    kind,
    onClose
  }) {
    const [added, setAdded] = useState({});
    useEffect(() => {
      if (open) setAdded({});
    }, [open, kind]);
    if (!open) return null;
    const k = PB_META[kind] ? kind : 'travel';
    const meta = PB_META[k];
    const cardBase = {
      borderRadius: 13,
      border: '1px solid ' + C.line,
      background: C.card,
      padding: 13
    };
    const addBtn = (i, label) => h('button', {
      onClick: () => setAdded(a => Object.assign({}, a, {
        [i]: !a[i]
      })),
      style: {
        padding: '7px 13px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        border: '1px solid ' + (added[i] ? C.olive : C.line),
        background: added[i] ? C.olive : 'transparent',
        color: added[i] ? C.cream : C.olive
      }
    }, added[i] ? 'Added ✓' : label || '+ Add');
    let body;
    if (k === 'travel') {
      body = PEAR_HOTELS.map((ht, i) => h('div', {
        key: i,
        style: Object.assign({
          display: 'flex',
          gap: 12
        }, cardBase, {
          borderColor: added[i] ? C.olive : C.line
        })
      }, h('div', {
        style: {
          width: 78,
          height: 78,
          borderRadius: 10,
          flexShrink: 0,
          background: PTONE[ht.tone],
          position: 'relative'
        }
      }, h('span', {
        style: {
          position: 'absolute',
          bottom: 5,
          left: 5,
          background: 'rgba(20,14,8,0.62)',
          color: '#fff',
          borderRadius: 6,
          padding: '1px 6px',
          fontSize: 10,
          fontWeight: 700
        }
      }, '★ ' + ht.rating)), h('div', {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, h('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          gap: 6
        }
      }, h('div', {
        style: {
          fontFamily: FONT_D,
          fontSize: 16,
          color: C.ink
        }
      }, ht.name), h('div', {
        style: {
          fontSize: 11.5,
          fontWeight: 700,
          color: C.muted
        }
      }, ht.price)), h('div', {
        style: {
          fontSize: 11,
          color: C.muted,
          margin: '2px 0 6px'
        }
      }, ht.reviews + ' reviews · ' + ht.dist), h('div', {
        style: {
          fontSize: 11.5,
          color: C.inkSoft,
          lineHeight: 1.4,
          marginBottom: 8
        }
      }, ht.blurb), addBtn(i))));
    } else if (k === 'story') {
      body = [h('div', {
        key: 'd',
        style: cardBase
      }, h('div', {
        style: {
          fontFamily: FONT_M,
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: C.goldInk,
          marginBottom: 8
        }
      }, 'Our story'), h('div', {
        style: {
          fontFamily: FONT_D,
          fontSize: 22,
          color: C.ink,
          marginBottom: 10
        }
      }, 'How we ', h('span', {
        style: {
          fontStyle: 'italic',
          color: C.olive
        }
      }, 'met')), h('p', {
        style: {
          fontSize: 13,
          color: C.inkSoft,
          lineHeight: 1.6,
          margin: '0 0 12px'
        }
      }, 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry.'), h('div', {
        style: {
          borderLeft: '2px solid ' + C.gold,
          paddingLeft: 12,
          fontFamily: FONT_D,
          fontStyle: 'italic',
          fontSize: 15,
          color: C.ink,
          marginBottom: 14,
          lineHeight: 1.4
        }
      }, '“No story we would rather tell, and no one we would rather tell it to.”'), h('div', {
        style: {
          display: 'flex',
          gap: 8
        }
      }, addBtn(0, 'Use this draft'), h('button', {
        style: {
          padding: '7px 13px',
          borderRadius: 8,
          border: '1px solid ' + C.line,
          background: 'transparent',
          color: C.muted,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer'
        }
      }, '↺ Another tone')))];
    } else if (k === 'schedule') {
      const rows = [['4:30 pm', 'Ceremony', 'Olive grove'], ['5:30 pm', 'Cocktails', 'Terrace bar'], ['7:00 pm', 'Dinner', 'Long table'], ['9:00 pm', 'Dancing', 'Until late']];
      body = [h('div', {
        key: 't',
        style: cardBase
      }, h('div', {
        style: {
          position: 'relative',
          paddingLeft: 20
        }
      }, h('div', {
        style: {
          position: 'absolute',
          left: 5,
          top: 4,
          bottom: 4,
          width: 2,
          background: C.line
        }
      }), rows.map((r, i) => h('div', {
        key: i,
        style: {
          position: 'relative',
          paddingBottom: i < 3 ? 15 : 0
        }
      }, h('span', {
        style: {
          position: 'absolute',
          left: -20,
          top: 2,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: C.olive,
          border: '2px solid ' + C.card
        }
      }), h('div', {
        style: {
          fontFamily: FONT_D,
          fontWeight: 600,
          fontSize: 15,
          color: C.ink
        }
      }, r[0] + ' · ' + r[1]), h('div', {
        style: {
          fontSize: 12,
          color: C.muted
        }
      }, r[2])))), h('div', {
        style: {
          marginTop: 12
        }
      }, addBtn(0, 'Add these moments')))];
    } else if (k === 'registry') {
      const regs = [['Honeymoon fund', 'A week in the Cyclades', 64], ['Crate & Barrel', 'Home & table', null], ['Zola', 'The full registry', null]];
      body = regs.map((r, i) => h('div', {
        key: i,
        style: Object.assign({}, cardBase, {
          borderColor: added[i] ? C.olive : C.line
        })
      }, h('div', {
        style: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8
        }
      }, h('div', null, h('div', {
        style: {
          fontFamily: FONT_D,
          fontSize: 16,
          color: C.ink
        }
      }, r[0]), h('div', {
        style: {
          fontSize: 11.5,
          color: C.muted
        }
      }, r[1])), addBtn(i)), r[2] != null && h('div', {
        style: {
          marginTop: 10
        }
      }, h('div', {
        style: {
          height: 6,
          borderRadius: 99,
          background: C.page,
          overflow: 'hidden'
        }
      }, h('div', {
        style: {
          height: '100%',
          width: r[2] + '%',
          background: C.gold
        }
      })), h('div', {
        style: {
          fontSize: 10.5,
          color: C.muted,
          marginTop: 4
        }
      }, r[2] + '% funded'))));
    } else if (k === 'gallery') {
      const tones = ['warm', 'sage', 'lavender', 'warm', 'sage', 'lavender', 'warm', 'sage', 'lavender'];
      body = [h('div', {
        key: 'g',
        style: cardBase
      }, h('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 6,
          marginBottom: 12
        }
      }, tones.map((t, i) => h('div', {
        key: i,
        style: {
          aspectRatio: '1',
          borderRadius: 7,
          background: PTONE[t]
        }
      }))), h('div', {
        style: {
          fontSize: 12,
          color: C.muted,
          marginBottom: 12,
          lineHeight: 1.5
        }
      }, 'Pear grouped 12 photos into a balanced grid — cover first, candids after.'), addBtn(0, 'Use this arrangement'))];
    } else if (k === 'faq') {
      const qa = [["What's the dress code?", 'Garden formal — linen suits, tea-length dresses.'], ['Can I bring a plus-one?', 'If your invite names a guest, absolutely.'], ['Are kids welcome?', 'Little ones ten and up, all evening.'], ['Where should we stay?', "We've blocked rooms at two nearby hotels."]];
      body = qa.map((q, i) => h('div', {
        key: i,
        style: Object.assign({}, cardBase, {
          borderColor: added[i] ? C.olive : C.line
        })
      }, h('div', {
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: C.ink,
          marginBottom: 4
        }
      }, q[0]), h('div', {
        style: {
          fontSize: 12,
          color: C.inkSoft,
          lineHeight: 1.5,
          marginBottom: 9
        }
      }, q[1]), addBtn(i)));
    } else {
      const tiles = [['Dress code', 'Garden formal'], ['Kids', 'Ages 10 +'], ['Gifts', 'Your presence is enough']];
      body = tiles.map((t, i) => h('div', {
        key: i,
        style: Object.assign({
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }, cardBase, {
          borderColor: added[i] ? C.olive : C.line
        })
      }, h('div', null, h('div', {
        style: {
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: C.faint
        }
      }, t[0]), h('div', {
        style: {
          fontFamily: FONT_D,
          fontSize: 16,
          color: C.ink,
          marginTop: 2
        }
      }, t[1])), addBtn(i)));
    }
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 96,
        background: 'rgba(20,14,8,0.5)',
        backdropFilter: 'blur(3px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      className: 'ed-pop',
      style: {
        width: '100%',
        maxWidth: 480,
        maxHeight: '86vh',
        display: 'flex',
        flexDirection: 'column',
        background: C.cream,
        borderRadius: 16,
        border: '1px solid ' + C.line,
        overflow: 'hidden',
        boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)'
      }
    }, h('div', {
      style: {
        padding: '18px 20px 14px',
        borderBottom: '1px solid ' + C.line,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11
      }
    }, h(Glyph, {
      size: 26
    }), h('div', {
      style: {
        flex: 1
      }
    }, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 19,
        color: C.ink,
        lineHeight: 1.1
      }
    }, meta[0]), h('div', {
      style: {
        fontSize: 12,
        color: C.muted,
        marginTop: 3,
        lineHeight: 1.4
      }
    }, meta[1])), h('button', {
      onClick: onClose,
      style: {
        width: 28,
        height: 28,
        borderRadius: 8,
        border: '1px solid ' + C.line,
        background: C.card,
        color: C.muted,
        cursor: 'pointer'
      }
    }, '✕')), h('div', {
      className: 'ed-scroll',
      style: {
        overflowY: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, body), h('div', {
      style: {
        padding: '12px 16px',
        borderTop: '1px solid ' + C.line,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }
    }, h('button', {
      style: {
        fontSize: 12,
        color: C.olive,
        fontWeight: 600,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer'
      }
    }, '↺ Regenerate'), h('button', {
      onClick: onClose,
      style: {
        padding: '8px 18px',
        borderRadius: 8,
        border: 'none',
        background: C.olive,
        color: C.cream,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, 'Done'))));
  }

  /* ════ PUBLISH CHECKLIST — the progress meter, made actionable ════ */
  function Checklist({
    open,
    onClose,
    onJump,
    onPear,
    onCoHost
  }) {
    if (!open) return null;
    const items = [{
      done: true,
      label: 'Choose a look',
      desc: 'Pressed Garden'
    }, {
      done: true,
      label: 'Set the date & place',
      desc: 'Sept 6 · Point Reyes',
      jump: 'top'
    }, {
      done: false,
      label: 'Add a cover photo',
      desc: 'Your hero needs one image',
      jump: 'top'
    }, {
      done: false,
      label: 'Write your story',
      desc: 'Pear can draft it for you',
      pear: 'story'
    }, {
      done: false,
      label: 'Line up the day',
      desc: 'Add your schedule moments',
      pear: 'schedule'
    }, {
      done: true,
      label: 'Open RSVPs',
      desc: 'Guests can reply',
      jump: 'rsvp'
    }, {
      done: false,
      label: 'Invite a co-host',
      desc: 'Optional — plan together',
      cohost: true
    }];
    const done = items.filter(i => i.done).length;
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 95
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      className: 'ed-pop',
      style: {
        position: 'absolute',
        top: 50,
        left: 14,
        width: 332,
        background: C.cream,
        border: '1px solid ' + C.line,
        borderRadius: 14,
        boxShadow: '0 20px 50px -16px rgba(40,28,12,0.4)',
        overflow: 'hidden'
      }
    }, h('div', {
      style: {
        padding: '15px 16px 13px',
        borderBottom: '1px solid ' + C.line
      }
    }, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 18,
        color: C.ink
      }
    }, 'Ready to publish'), h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 8
      }
    }, h('div', {
      style: {
        flex: 1,
        height: 5,
        borderRadius: 99,
        background: C.page,
        overflow: 'hidden'
      }
    }, h('div', {
      style: {
        height: '100%',
        width: Math.round(done / items.length * 100) + '%',
        background: C.olive
      }
    })), h('span', {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: C.olive
      }
    }, done + ' of ' + items.length))), h('div', {
      className: 'ed-scroll',
      style: {
        maxHeight: '58vh',
        overflowY: 'auto',
        padding: 6
      }
    }, items.map((it, i) => h('div', {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 10px',
        borderRadius: 9
      }
    }, h('span', {
      style: {
        width: 18,
        height: 18,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        border: '1.5px solid ' + (it.done ? C.olive : C.line),
        background: it.done ? C.olive : 'transparent',
        color: C.cream,
        fontSize: 10,
        fontWeight: 800
      }
    }, it.done ? '✓' : ''), h('div', {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, h('div', {
      style: {
        fontSize: 12.5,
        fontWeight: 600,
        color: it.done ? C.muted : C.ink,
        textDecoration: it.done ? 'line-through' : 'none'
      }
    }, it.label), h('div', {
      style: {
        fontSize: 10.5,
        color: C.faint
      }
    }, it.desc)), !it.done && h('button', {
      onClick: () => {
        onClose();
        if (it.pear) onPear(it.pear);else if (it.cohost) onCoHost();else if (it.jump) onJump(it.jump);
      },
      style: {
        padding: '5px 10px',
        borderRadius: 7,
        border: '1px solid ' + C.olive,
        background: 'transparent',
        color: C.olive,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        flexShrink: 0
      }
    }, it.pear ? '✦ Pear' : 'Fix')))), h('div', {
      style: {
        padding: '12px 16px',
        borderTop: '1px solid ' + C.line
      }
    }, h('button', {
      onClick: onClose,
      style: {
        width: '100%',
        padding: '11px',
        borderRadius: 9,
        border: 'none',
        background: C.olive,
        color: C.cream,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, 'Publish site'))));
  }

  /* ════ ADD SECTION — a visual gallery, occasion-filtered ════ */
  const ADD_CORE = [['Countdown', 'Days until the date', 'C'], ['Map', 'Where it happens', 'M'], ['Music', 'A playlist or first song', '♪'], ['Wedding party', 'Who stands with you', 'W'], ['Note from us', 'A welcome message', 'N'], ['More Q&A', 'Extra guest questions', '?']];
  const ADD_BLOCKS = [['Cost splitter', 'Share weekend costs', 1], ['Advice wall', 'Guests leave notes', 0], ['Livestream', 'For those far away', 1], ['Program', 'The order of service', 0], ['Voice toasts', 'Collect spoken toasts', 1], ['Packing list', 'What to bring', 0]];
  const ADD_ID = {
    Map: 'map',
    Countdown: 'countdown',
    Gallery: 'gallery',
    Registry: 'registry',
    FAQ: 'faq',
    Travel: 'travel'
  };
  function AddSection({
    open,
    onClose,
    premium,
    order,
    onInsert
  }) {
    const [added, setAdded] = useState({});
    useEffect(() => {
      if (open) setAdded({});
    }, [open]);
    if (!open) return null;
    const inOrder = name => {
      const id = ADD_ID[name];
      return id && (order || []).includes(id);
    };
    const tile = g => h('span', {
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: C.page,
        color: C.olive,
        fontFamily: FONT_M,
        fontSize: 13,
        fontWeight: 700
      }
    }, g);
    const card = (key, name, desc, locked) => {
      const realId = ADD_ID[name];
      const present = inOrder(name);
      const on = present || added[key];
      return h('button', {
        key,
        onClick: () => {
          if (realId && onInsert) {
            onInsert(realId);
            setAdded(a => Object.assign({}, a, {
              [key]: true
            }));
          } else {
            setAdded(a => Object.assign({}, a, {
              [key]: !a[key]
            }));
          }
        },
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: 12,
          borderRadius: 12,
          textAlign: 'left',
          cursor: 'pointer',
          border: '1px solid ' + (on ? C.olive : C.line),
          background: on ? 'rgba(92,107,63,0.08)' : C.card,
          position: 'relative'
        }
      }, tile(name[0]), h('div', {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, h('div', {
        style: {
          fontSize: 13,
          fontWeight: 700,
          color: C.ink,
          display: 'flex',
          alignItems: 'center',
          gap: 5
        }
      }, name, locked && h('span', {
        style: {
          fontSize: 9,
          color: C.gold
        }
      }, '✦')), h('div', {
        style: {
          fontSize: 11,
          color: C.muted
        }
      }, present ? 'On your site' : desc)), h('span', {
        style: {
          fontSize: 16,
          fontWeight: 700,
          color: on ? C.olive : C.faint
        }
      }, on ? '✓' : '+'));
    };
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 96,
        background: 'rgba(20,14,8,0.5)',
        backdropFilter: 'blur(3px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      className: 'ed-pop',
      style: {
        width: '100%',
        maxWidth: 560,
        maxHeight: '86vh',
        display: 'flex',
        flexDirection: 'column',
        background: C.cream,
        borderRadius: 16,
        border: '1px solid ' + C.line,
        overflow: 'hidden',
        boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)'
      }
    }, h('div', {
      style: {
        padding: '18px 22px 15px',
        borderBottom: '1px solid ' + C.line,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between'
      }
    }, h('div', null, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 22,
        color: C.ink
      }
    }, 'Add a section'), h('div', {
      style: {
        fontSize: 12.5,
        color: C.muted,
        marginTop: 3
      }
    }, 'Pick what your celebration needs — chosen for a wedding.')), h('button', {
      onClick: onClose,
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        border: '1px solid ' + C.line,
        background: C.card,
        color: C.muted,
        cursor: 'pointer'
      }
    }, '✕')), h('div', {
      className: 'ed-scroll',
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: 18
      }
    }, h(GLabel, null, 'Core sections'), h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 9,
        marginBottom: 22
      }
    }, ADD_CORE.map(c => card('c-' + c[0], c[0], c[1], false))), h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '0 0 11px'
      }
    }, h('span', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9.5,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: C.goldInk
      }
    }, '✦ Atelier blocks'), h('span', {
      style: {
        flex: 1,
        height: 1,
        background: C.line
      }
    })), h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 9
      }
    }, ADD_BLOCKS.map(b => card('b-' + b[0], b[0], b[1], b[2] && !premium)))), h('div', {
      style: {
        padding: '12px 18px',
        borderTop: '1px solid ' + C.line,
        display: 'flex',
        justifyContent: 'flex-end'
      }
    }, h('button', {
      onClick: onClose,
      style: {
        padding: '9px 22px',
        borderRadius: 8,
        border: 'none',
        background: C.olive,
        color: C.cream,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer'
      }
    }, 'Done'))));
  }

  /* ════ FITTING ROOM — try your site on under each look (#5) ════ */
  function FittingRoom({
    open,
    onClose,
    current,
    onWear
  }) {
    const [tryId, setTryId] = useState(current);
    const ref = useRef(null);
    const tryRef = useRef(current);
    tryRef.current = tryId;
    useEffect(() => {
      if (open) setTryId(current);
    }, [open, current]);
    useEffect(() => {
      const f = ref.current;
      if (f && f.contentWindow) f.contentWindow.postMessage({
        type: 'pl:set',
        key: 'theme',
        value: tryId
      }, '*');
    }, [tryId]);
    if (!open) return null;
    const themes = window.PL_THEMES;
    const t = window.PL_getTheme(tryId);
    const prem = PREMIUM_THEMES.has(tryId);
    return h('div', {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(16,11,6,0.72)',
        WebkitBackdropFilter: 'blur(5px)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        flexDirection: 'column'
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 22px',
        flexShrink: 0
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, h(Glyph, {
      size: 26
    }), h('div', null, h('div', {
      style: {
        fontFamily: FONT_D,
        fontStyle: 'italic',
        fontSize: 21,
        color: C.cream,
        lineHeight: 1
      }
    }, 'The fitting room'), h('div', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9.5,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'rgba(251,247,238,0.55)',
        marginTop: 4
      }
    }, 'Try your site on for size'))), h('button', {
      onClick: onClose,
      style: {
        width: 34,
        height: 34,
        borderRadius: 9,
        border: '1px solid rgba(251,247,238,0.22)',
        background: 'rgba(251,247,238,0.08)',
        color: C.cream,
        cursor: 'pointer',
        fontSize: 15
      }
    }, '\u2715')), h('div', {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 22px'
      }
    }, h('div', {
      style: {
        width: '100%',
        maxWidth: 1040,
        height: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 30px 80px -24px rgba(0,0,0,0.6)',
        border: '1px solid rgba(0,0,0,0.3)'
      }
    }, h('iframe', {
      ref: ref,
      onLoad: () => {
        const f = ref.current;
        if (f && f.contentWindow) f.contentWindow.postMessage({
          type: 'pl:set',
          key: 'theme',
          value: tryRef.current
        }, '*');
      },
      src: '../site-renderer/index.html?embed=1&preview=1&theme=' + tryId,
      title: 'Fitting room preview',
      style: {
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block'
      }
    }))), h('div', {
      style: {
        flexShrink: 0,
        padding: '14px 22px 18px'
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 11
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
        minWidth: 0
      }
    }, h('span', {
      style: {
        fontFamily: FONT_D,
        fontSize: 18,
        color: C.cream
      }
    }, t.name), prem && h('span', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: C.gold
      }
    }, '\u2726 Atelier'), h('span', {
      style: {
        fontSize: 11.5,
        color: 'rgba(251,247,238,0.5)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, t.blurb)), h('button', {
      onClick: () => onWear(tryId),
      style: {
        flexShrink: 0,
        padding: '10px 22px',
        borderRadius: 999,
        border: 'none',
        background: tryId === current ? 'rgba(251,247,238,0.14)' : C.cream,
        color: tryId === current ? 'rgba(251,247,238,0.7)' : C.ink,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, tryId === current ? 'You\u2019re wearing this' : 'Wear this look')), h('div', {
      className: 'ed-scroll',
      style: {
        display: 'flex',
        gap: 10,
        overflowX: 'auto',
        paddingBottom: 4
      }
    }, themes.map(th => {
      const on = tryId === th.id;
      return h('button', {
        key: th.id,
        onClick: () => setTryId(th.id),
        title: th.name,
        style: {
          flexShrink: 0,
          width: 92,
          padding: 7,
          borderRadius: 11,
          cursor: 'pointer',
          border: '1.5px solid ' + (on ? C.gold : 'rgba(251,247,238,0.2)'),
          background: on ? 'rgba(251,247,238,0.12)' : 'rgba(251,247,238,0.04)'
        }
      }, h('div', {
        style: {
          display: 'flex',
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 6,
          height: 30
        }
      }, th.swatches.slice(0, 4).map((c, i) => h('span', {
        key: i,
        style: {
          flex: 1,
          background: c
        }
      }))), h('div', {
        style: {
          fontSize: 10,
          fontWeight: on ? 700 : 600,
          color: on ? C.cream : 'rgba(251,247,238,0.72)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textAlign: 'center'
        }
      }, th.name));
    }))));
  }

  /* ════ SITE FILE — one document: back up · move · duplicate ════ */
  function SiteFileModal({
    open,
    onClose
  }) {
    const inputRef = useRef(null);
    const [msg, setMsg] = useState(null);
    if (!open) return null;
    const KEYS = ['pl-editor-design', 'pl-site-content', 'pl-site-edits', 'pl-site-images', 'pl-site-library', 'pl-site-rsvps'];
    const sizeKB = (() => {
      let n = 0;
      KEYS.forEach(k => {
        const v = localStorage.getItem(k);
        if (v) n += v.length;
      });
      return Math.round(n / 1024);
    })();
    const doExport = () => {
      const doc = {
        _pearloom: 1,
        savedAt: new Date().toISOString()
      };
      KEYS.forEach(k => {
        doc[k] = localStorage.getItem(k);
      });
      const blob = new Blob([JSON.stringify(doc)], {
        type: 'application/json'
      });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pearloom-site.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setMsg('Downloaded pearloom-site.json');
    };
    const doImport = file => {
      if (!file) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const doc = JSON.parse(r.result);
          if (!doc || !doc._pearloom) {
            setMsg('That doesn\u2019t look like a Pearloom site file.');
            return;
          }
          KEYS.forEach(k => {
            if (typeof doc[k] === 'string') localStorage.setItem(k, doc[k]);
          });
          setMsg('Loaded \u2014 reopening\u2026');
          setTimeout(() => location.reload(), 600);
        } catch (e) {
          setMsg('That file could not be read.');
        }
      };
      r.readAsText(file);
    };
    const btn = (label, onClick, primary) => h('button', {
      onClick,
      style: {
        flex: 1,
        padding: '12px',
        borderRadius: 10,
        border: primary ? 'none' : '1px solid ' + C.line,
        background: primary ? C.olive : C.card,
        color: primary ? C.cream : C.ink,
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, label);
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(20,14,8,0.5)',
        WebkitBackdropFilter: 'blur(4px)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        fontFamily: "'Inter',system-ui,sans-serif"
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      style: {
        width: '100%',
        maxWidth: 460,
        background: C.cream,
        borderRadius: 16,
        border: '1px solid ' + C.line,
        overflow: 'hidden',
        boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)'
      }
    }, h('div', {
      style: {
        padding: '18px 20px 15px',
        borderBottom: '1px solid ' + C.line,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12
      }
    }, h('div', null, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 21,
        color: C.ink,
        lineHeight: 1.1
      }
    }, 'Site file'), h('div', {
      style: {
        fontSize: 12,
        color: C.muted,
        marginTop: 4,
        lineHeight: 1.4
      }
    }, 'One file holds your whole site \u2014 design, words, photos and replies. Back it up, move it, or duplicate it.')), h('button', {
      onClick: onClose,
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        border: '1px solid ' + C.line,
        background: C.card,
        color: C.muted,
        cursor: 'pointer',
        fontSize: 14,
        flexShrink: 0
      }
    }, '\u2715')), h('div', {
      style: {
        padding: 18
      }
    }, h('div', {
      style: {
        fontSize: 11.5,
        color: C.faint,
        marginBottom: 12
      }
    }, 'This site \u2248 ' + sizeKB + ' KB'), h('div', {
      style: {
        display: 'flex',
        gap: 8
      }
    }, btn('\u2913  Export', doExport, true), btn('\u2911  Import', () => inputRef.current && inputRef.current.click(), false)), h('input', {
      ref: inputRef,
      type: 'file',
      accept: 'application/json,.json',
      onChange: e => {
        doImport(e.target.files && e.target.files[0]);
        e.target.value = '';
      },
      style: {
        display: 'none'
      }
    }), h('div', {
      style: {
        fontSize: 11.5,
        color: C.muted,
        marginTop: 12,
        lineHeight: 1.5
      }
    }, 'Importing replaces what\u2019s on this site and reopens the editor.'), msg && h('div', {
      style: {
        fontSize: 12,
        color: C.olive,
        marginTop: 10,
        fontWeight: 600
      }
    }, msg))));
  }

  /* ════ GUESTS — RSVPs collected from the published site ════ */
  function GuestsModal({
    open,
    onClose,
    nonce
  }) {
    const list = (() => {
      if (!open) return [];
      try {
        return JSON.parse(localStorage.getItem('pl-site-rsvps') || '[]');
      } catch {
        return [];
      }
    })();
    if (!open) return null;
    const yes = list.filter(r => r.attending === 'yes');
    const no = list.filter(r => r.attending !== 'yes');
    const heads = yes.reduce((n, r) => n + (Number(r.party) || 1), 0);
    const stat = (n, l) => h('div', {
      style: {
        flex: 1,
        textAlign: 'center',
        padding: '12px 6px',
        background: C.card,
        border: '1px solid ' + C.line,
        borderRadius: 11
      }
    }, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 26,
        color: C.ink,
        lineHeight: 1
      }
    }, n), h('div', {
      style: {
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: C.faint,
        marginTop: 5
      }
    }, l));
    const when = t => {
      try {
        return new Date(t).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return '';
      }
    };
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(20,14,8,0.5)',
        WebkitBackdropFilter: 'blur(4px)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        fontFamily: "'Inter',system-ui,sans-serif"
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      style: {
        width: '100%',
        maxWidth: 560,
        maxHeight: '84vh',
        display: 'flex',
        flexDirection: 'column',
        background: C.cream,
        borderRadius: 16,
        border: '1px solid ' + C.line,
        overflow: 'hidden',
        boxShadow: '0 40px 90px -24px rgba(0,0,0,0.5)'
      }
    }, h('div', {
      style: {
        padding: '17px 20px 14px',
        borderBottom: '1px solid ' + C.line,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12
      }
    }, h('div', null, h('div', {
      style: {
        fontFamily: FONT_D,
        fontSize: 21,
        color: C.ink,
        lineHeight: 1.1
      }
    }, 'Guest replies'), h('div', {
      style: {
        fontSize: 12,
        color: C.muted,
        marginTop: 4
      }
    }, list.length ? 'Replies land here as guests RSVP on your site.' : 'No replies yet.')), h('button', {
      onClick: onClose,
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        border: '1px solid ' + C.line,
        background: C.card,
        color: C.muted,
        cursor: 'pointer',
        fontSize: 14,
        flexShrink: 0
      }
    }, '✕')), h('div', {
      className: 'ed-scroll',
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: 18
      }
    }, h('div', {
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 16
      }
    }, stat(heads, 'Coming'), stat(yes.length, 'Yes'), stat(no.length, 'Regrets')), list.length === 0 ? h('div', {
      style: {
        textAlign: 'center',
        padding: '26px 16px',
        color: C.muted,
        lineHeight: 1.5,
        fontSize: 12.5
      }
    }, h('div', {
      style: {
        fontSize: 28,
        marginBottom: 8
      }
    }, '✉'), 'When someone replies on your published site, their name, headcount and note will appear here.') : h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, list.slice().reverse().map((r, i) => h('div', {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 11,
        padding: 12,
        background: C.card,
        border: '1px solid ' + C.lineSoft,
        borderRadius: 11
      }
    }, h('span', {
      style: {
        width: 9,
        height: 9,
        borderRadius: '50%',
        marginTop: 5,
        flexShrink: 0,
        background: r.attending === 'yes' ? C.olive : C.plum
      }
    }), h('div', {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 8
      }
    }, h('span', {
      style: {
        fontWeight: 700,
        fontSize: 13.5,
        color: C.ink
      }
    }, r.name || 'Someone'), h('span', {
      style: {
        fontSize: 11,
        color: r.attending === 'yes' ? C.olive : C.plum,
        fontWeight: 600
      }
    }, r.attending === 'yes' ? 'Coming · ' + (Number(r.party) || 1) : 'Regrets'), h('span', {
      style: {
        marginLeft: 'auto',
        fontSize: 10.5,
        color: C.faint
      }
    }, when(r.at))), r.note && h('div', {
      style: {
        fontSize: 12,
        color: C.muted,
        marginTop: 4,
        lineHeight: 1.45,
        fontStyle: 'italic'
      }
    }, '“' + r.note + '”'))))))));
  }

  /* ════ INLINE LAYOUT BAR — switch the selected section's layout on-canvas ════ */
  function InlineLayoutBar({
    iframeRef,
    selId,
    value,
    onPick
  }) {
    const opts = SECTION_LAYOUTS[selId];
    const [pos, setPos] = useState(null);
    useEffect(() => {
      if (!opts) {
        setPos(null);
        return;
      }
      let stop = false;
      const tick = () => {
        if (stop) return;
        const f = iframeRef.current;
        if (f && f.contentDocument) {
          const fr = f.getBoundingClientRect();
          const el = f.contentDocument.getElementById(selId);
          if (el) {
            const r = el.getBoundingClientRect();
            const onScreen = r.top < fr.height - 24 && r.bottom > 56;
            const top = onScreen ? Math.max(fr.top + 10, Math.min(fr.top + r.top + 12, fr.bottom - 46)) : fr.top + 12;
            const left = onScreen ? fr.left + r.left + r.width / 2 : fr.left + fr.width / 2;
            setPos({
              top,
              left
            });
          } else setPos(null);
        }
        setTimeout(tick, 200);
      };
      tick();
      return () => {
        stop = true;
      };
    }, [selId]);
    if (!opts || !pos) return null;
    return h('div', {
      style: {
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: 'translateX(-50%)',
        zIndex: 58,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: 4,
        borderRadius: 999,
        background: 'rgba(255,253,247,0.97)',
        WebkitBackdropFilter: 'blur(10px)',
        backdropFilter: 'blur(10px)',
        border: '1px solid ' + C.line,
        boxShadow: '0 10px 28px -8px rgba(40,28,12,0.4)',
        fontFamily: "'Inter',system-ui,sans-serif",
        transition: 'top .3s cubic-bezier(.22,.61,.36,1), left .3s cubic-bezier(.22,.61,.36,1)',
        maxWidth: '92vw',
        overflowX: 'auto'
      }
    }, h('span', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: C.faint,
        padding: '0 7px 0 9px',
        whiteSpace: 'nowrap'
      }
    }, h('svg', {
      width: 13,
      height: 13,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }, h('path', {
      d: 'M3 5h18M3 12h18M3 19h10'
    })), 'Layout'), opts.map(([v, l]) => {
      const on = value === v;
      return h('button', {
        key: v,
        onClick: () => onPick(v),
        style: {
          padding: '6px 12px',
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          fontSize: 11.5,
          fontWeight: 700,
          background: on ? C.olive : 'transparent',
          color: on ? C.cream : C.inkSoft,
          whiteSpace: 'nowrap',
          fontFamily: 'inherit'
        }
      }, l);
    }));
  }

  /* ════ LIVE PRESENCE — a co-host editing alongside you ════ */
  const PEER = {
    id: 'jun',
    name: 'Jun',
    initial: 'J',
    color: '#C19A4B'
  };
  function PresenceLayer({
    iframeRef,
    section,
    peer
  }) {
    const [box, setBox] = useState(null);
    useEffect(() => {
      let stop = false;
      const tick = () => {
        if (stop) return;
        const f = iframeRef.current;
        if (f && f.contentDocument) {
          const fr = f.getBoundingClientRect();
          const el = f.contentDocument.getElementById(section);
          if (el) {
            const r = el.getBoundingClientRect();
            const visible = r.bottom > 8 && r.top < fr.height - 8;
            const top = Math.max(fr.top, Math.min(fr.top + r.top, fr.bottom));
            const height = Math.max(0, Math.min(fr.top + r.bottom, fr.bottom) - top);
            setBox({
              top,
              left: fr.left + r.left,
              width: r.width,
              height,
              flagY: Math.max(fr.top + 4, fr.top + r.top),
              visible
            });
          } else setBox(null);
        }
        setTimeout(tick, 220);
      };
      tick();
      return () => {
        stop = true;
      };
    }, [section]);
    if (!box || !box.visible || box.height < 12) return null;
    const ease = 'top .5s cubic-bezier(.22,.61,.36,1), left .5s cubic-bezier(.22,.61,.36,1), width .5s, height .5s';
    return h(React.Fragment, null, h('div', {
      'aria-hidden': true,
      style: {
        position: 'fixed',
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        border: '2px solid ' + peer.color,
        borderRadius: 7,
        pointerEvents: 'none',
        zIndex: 55,
        boxShadow: '0 0 0 4px ' + peer.color + '22, inset 0 0 0 1px ' + peer.color + '55',
        transition: ease
      }
    }), h('div', {
      'aria-hidden': true,
      style: {
        position: 'fixed',
        top: box.flagY,
        left: box.left + 10,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px 4px 4px',
        borderRadius: 999,
        background: peer.color,
        color: '#241a08',
        fontSize: 11,
        fontWeight: 800,
        pointerEvents: 'none',
        zIndex: 56,
        boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45)',
        transition: 'top .5s cubic-bezier(.22,.61,.36,1), left .5s cubic-bezier(.22,.61,.36,1)',
        whiteSpace: 'nowrap',
        fontFamily: "'Inter',system-ui,sans-serif"
      }
    }, h('span', {
      style: {
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.4)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 9.5,
        fontWeight: 700
      }
    }, peer.initial), peer.name + ' is editing'));
  }

  /* ════════════════════ APP ════════════════════ */
  function App() {
    const DOC = (() => {
      try {
        return JSON.parse(localStorage.getItem('pl-editor-design') || '{}') || {};
      } catch {
        return {};
      }
    })();
    const ST_DEFAULTS = {
      theme: 'garden',
      texture: null,
      divider: 'auto',
      motif: 'auto',
      density: 'comfortable',
      hero: 'centered',
      story: 'sidebyside',
      kit: 'classic',
      premium: false,
      nav: 'centered',
      navm: 'overlay',
      footer: 'signature'
    };
    const [st, setSt] = useState(Object.assign({}, ST_DEFAULTS, DOC.st || {}));
    const [tab, setTab] = useState('design');
    const [device, setDevice] = useState('desktop');
    const [selId, setSelId] = useState(null);
    const [hidden, setHidden] = useState(() => DOC.hidden || {});
    const [saved, setSaved] = useState(true);
    const [upgrade, setUpgrade] = useState(false);
    const [storeOpen, setStoreOpen] = useState(false);
    const [applied, setApplied] = useState(null);
    const [cmdOpen, setCmdOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [cohostOpen, setCohostOpen] = useState(false);
    const [decorOpen, setDecorOpen] = useState(false);
    const [picks, setPicks] = useState(null);
    const [checklistOpen, setChecklistOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [editMode, setEditModeState] = useState(true);
    const [order, setOrder] = useState(Array.isArray(DOC.order) && DOC.order.length ? DOC.order : DEFAULT_ORDER);
    const [edits, setEdits] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem('pl-site-edits') || '{}');
      } catch {
        return {};
      }
    });
    const [imagesMap, setImagesMap] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem('pl-site-images') || '{}');
      } catch {
        return {};
      }
    });
    const [content, setContent] = useState(() => {
      try {
        const s = JSON.parse(localStorage.getItem('pl-site-content') || 'null');
        return s && Object.keys(s).length ? Object.assign({}, DEFAULT_CONTENT, s) : Object.assign({}, DEFAULT_CONTENT);
      } catch {
        return Object.assign({}, DEFAULT_CONTENT);
      }
    });
    const [fittingOpen, setFittingOpen] = useState(false);
    const [guestsOpen, setGuestsOpen] = useState(false);
    const [siteFileOpen, setSiteFileOpen] = useState(false);
    const [peerSection, setPeerSection] = useState('top');
    const [rsvpNonce, setRsvpNonce] = useState(0);
    const [histState, setHistState] = useState({
      canUndo: false,
      canRedo: false
    });
    const iframeRef = useRef(null);
    const readyRef = useRef(false);
    const stRef = useRef(st);
    stRef.current = st;
    const orderRef = useRef(order);
    orderRef.current = order;
    const hiddenRef = useRef(hidden);
    hiddenRef.current = hidden;
    const editsRef = useRef(edits);
    editsRef.current = edits;
    const imagesRef = useRef(imagesMap);
    imagesRef.current = imagesMap;
    const contentRef = useRef(content);
    contentRef.current = content;
    const histRef = useRef({
      stack: [],
      idx: -1,
      applying: false
    });
    const undoRef = useRef(null);
    const redoRef = useRef(null);
    const sendToCanvas = useCallback((key, value) => {
      const f = iframeRef.current;
      if (!f || !f.contentWindow) return;
      f.contentWindow.postMessage({
        type: 'pl:set',
        key,
        value
      }, '*');
    }, []);
    const setEditMode = useCallback(v => {
      setEditModeState(v);
      sendToCanvas('editMode', v);
    }, [sendToCanvas]);
    const updateContent = useCallback(patch => {
      setContent(c => {
        const n = Object.assign({}, c, patch);
        try {
          localStorage.setItem('pl-site-content', JSON.stringify(n));
        } catch {/* */}
        sendToCanvas('content', n);
        return n;
      });
      setSaved(false);
    }, [sendToCanvas]);
    const [drafting, setDrafting] = useState(null);
    const onDraft = useCallback(async kind => {
      if (drafting) return;
      if (!(window.claude && typeof window.claude.complete === 'function')) {
        setDrafting('__noapi');
        setTimeout(() => setDrafting(null), 2600);
        return;
      }
      setDrafting(kind);
      const c = contentRef.current || {};
      const who = c.coupleType === 'solo' ? c.names && c.names[0] : (c.names && c.names[0]) + ' & ' + (c.names && c.names[1]);
      const base = `Hosts: ${who}. Date: ${c.date}. Place: ${c.place}. Voice: warm, literary, understated — never cheesy or salesy.`;
      const P = {
        story: `${base}\nWrite their "how we met / our story" in first person plural, 2–4 sentences. Return ONLY minified JSON: {"eyebrow":"Our story","title":"How we","italic":"met","body":"..."}`,
        warm: `${base}\nRewrite this story copy warmer and more personal, same meaning, 2–4 sentences. Current: "${c.story && c.story.body || ''}". Return ONLY minified JSON: {"body":"..."}`,
        faq: `${base}\nWrite 4 concise FAQ items guests would ask for this event, answered in the hosts' voice. Return ONLY minified JSON: {"qa":[{"q":"...","a":"..."}]}`,
        schedule: `${base}\nWrite a 4–5 moment day-of timeline. Each: t (time e.g. "4:30 pm"), l (short title), s (short location/detail). Return ONLY minified JSON: {"rows":[{"t":"","l":"","s":""}]}`,
        registry: `${base}\nWrite a one-sentence registry intro plus 3–4 registry destinations (funds or shops). Return ONLY minified JSON: {"body":"...","stores":["..."]}`,
        travel: `${base}\nSuggest 3 real, well-known places to stay near the venue location for out-of-town guests — a mix of price points. For each: name (real hotel/inn if you know one for that area, else a plausible type like "a downtown boutique hotel"), area (short location or distance to venue), blurb (one warm sentence), and link (a Google search URL like "https://www.google.com/search?q=NAME+CITY"). Return ONLY minified JSON: {"hotels":[{"name":"","area":"","blurb":"","link":""}]}`
      };
      try {
        const raw = await window.claude.complete(P[kind] || P.story);
        const json = JSON.parse(String(raw).replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
        const cur = contentRef.current || {};
        if (kind === 'story') updateContent({
          story: Object.assign({}, cur.story, {
            eyebrow: json.eyebrow || cur.story.eyebrow,
            title: json.title || cur.story.title,
            italic: json.italic || cur.story.italic,
            body: json.body || cur.story.body
          })
        });else if (kind === 'warm' && json.body) updateContent({
          story: Object.assign({}, cur.story, {
            body: json.body
          })
        });else if (kind === 'faq' && Array.isArray(json.qa) && json.qa.length) updateContent({
          faq: json.qa
        });else if (kind === 'schedule' && Array.isArray(json.rows) && json.rows.length) updateContent({
          schedule: json.rows
        });else if (kind === 'registry') updateContent({
          registry: Array.isArray(json.stores) && json.stores.length ? json.stores : cur.registry,
          registryBody: json.body || cur.registryBody
        });else if (kind === 'travel' && Array.isArray(json.hotels) && json.hotels.length) updateContent({
          travel: json.hotels.slice(0, 6)
        });
      } catch (e) {
        setDrafting('__err');
        setTimeout(() => setDrafting(null), 2600);
        return;
      }
      setDrafting(null);
    }, [drafting, updateContent]);
    /* Travel: when empty + a venue is set, let Pear suggest stays once on open. */
    const autoTravelRef = useRef(false);
    useEffect(() => {
      if (selId === 'travel' && !(content.travel || []).length && content.place && !autoTravelRef.current && window.claude && typeof window.claude.complete === 'function') {
        autoTravelRef.current = true;
        onDraft('travel');
      }
    }, [selId, content.travel, content.place, onDraft]);
    const reorder = useCallback(next => {
      setOrder(next);
      sendToCanvas('order', next);
      setSaved(false);
    }, [sendToCanvas]);
    const toggleHidden = useCallback(id => {
      setHidden(hh => {
        const n = Object.assign({}, hh, {
          [id]: !hh[id]
        });
        sendToCanvas('hidden', n);
        return n;
      });
      setSaved(false);
    }, [sendToCanvas]);
    const openLibrary = useCallback(() => {
      const f = iframeRef.current;
      if (f && f.contentWindow) f.contentWindow.postMessage({
        type: 'pl:openLibrary'
      }, '*');
    }, []);
    const onTool = useCallback(id => {
      if (id === 'photos') openLibrary();else if (id === 'fitting') setFittingOpen(true);else if (id === 'guests') setGuestsOpen(true);else if (id === 'sitefile') setSiteFileOpen(true);
    }, [openLibrary]);

    /* History — snapshot the whole doc; undo/redo re-pushes to canvas. */
    const snapshot = () => ({
      st: Object.assign({}, stRef.current),
      order: orderRef.current.slice(),
      hidden: Object.assign({}, hiddenRef.current),
      edits: Object.assign({}, editsRef.current),
      images: Object.assign({}, imagesRef.current),
      content: Object.assign({}, contentRef.current)
    });
    const applySnap = snap => {
      histRef.current.applying = true;
      setSt(snap.st);
      setOrder(snap.order);
      setHidden(snap.hidden);
      setEdits(snap.edits);
      setImagesMap(snap.images);
      if (snap.content) setContent(snap.content);
      setApplied(null);
      ['theme', 'texture', 'density', 'hero', 'story', 'kit', 'premium', 'nav', 'footer'].forEach(k => sendToCanvas(k, snap.st[k]));
      sendToCanvas('order', snap.order);
      sendToCanvas('hidden', snap.hidden);
      sendToCanvas('edits', snap.edits);
      sendToCanvas('images', snap.images);
      if (snap.content) sendToCanvas('content', snap.content);
      setSaved(false);
    };
    const undo = useCallback(() => {
      const H = histRef.current;
      if (H.idx <= 0) return;
      H.idx -= 1;
      applySnap(H.stack[H.idx]);
      setHistState({
        canUndo: H.idx > 0,
        canRedo: true
      });
    }, [sendToCanvas]);
    const redo = useCallback(() => {
      const H = histRef.current;
      if (H.idx >= H.stack.length - 1) return;
      H.idx += 1;
      applySnap(H.stack[H.idx]);
      setHistState({
        canUndo: H.idx > 0,
        canRedo: H.idx < H.stack.length - 1
      });
    }, [sendToCanvas]);
    undoRef.current = undo;
    redoRef.current = redo;
    useEffect(() => {
      const H = histRef.current;
      if (H.applying) {
        H.applying = false;
        return;
      }
      const snap = snapshot();
      if (H.idx < 0) {
        H.stack = [snap];
        H.idx = 0;
        setHistState({
          canUndo: false,
          canRedo: false
        });
        return;
      }
      if (JSON.stringify(H.stack[H.idx]) === JSON.stringify(snap)) return;
      H.stack = H.stack.slice(0, H.idx + 1);
      H.stack.push(snap);
      if (H.stack.length > 80) H.stack.shift();
      H.idx = H.stack.length - 1;
      setHistState({
        canUndo: H.idx > 0,
        canRedo: false
      });
    }, [st, order, hidden, edits, imagesMap, content]);

    /* A control changed something — update editor state, push to canvas. */
    const set = useCallback((key, value) => {
      if (key === '_tab') {
        setTab(value);
        return;
      }
      setSt(s => {
        const next = Object.assign({}, s, {
          [key]: value
        });
        if (key === 'theme') {
          next.texture = null;
          next.divider = 'auto';
          next.motif = 'auto';
        } // theme resets paper + ornaments to its defaults
        return next;
      });
      if (key === '_store') {
        setStoreOpen(value);
        return;
      }
      setSaved(false);
      sendToCanvas(key, value);
      if (key === 'theme') {
        sendToCanvas('texture', null);
        sendToCanvas('themeVars', null);
        sendToCanvas('divider', 'auto');
        sendToCanvas('motif', 'auto');
        setApplied(null);
      }
    }, [sendToCanvas]);
    const applyPack = useCallback(p => {
      const kit = KIT_FALLBACK[p.kit] || p.kit;
      const tex = TEX_FALLBACK[p.texture] || p.texture;
      setSt(s => Object.assign({}, s, {
        kit,
        texture: tex
      }));
      sendToCanvas('themeVars', p.vars);
      sendToCanvas('kit', kit);
      sendToCanvas('texture', tex);
      setApplied(p.id);
      setSaved(false);
    }, [sendToCanvas]);

    /* Fake autosave settle. */
    useEffect(() => {
      if (saved) return;
      const t = setTimeout(() => setSaved(true), 900);
      return () => clearTimeout(t);
    }, [saved, st]);

    /* Persist the design document (survives editor reload + feeds export). */
    useEffect(() => {
      try {
        localStorage.setItem('pl-editor-design', JSON.stringify({
          st,
          order,
          hidden
        }));
      } catch {/* */}
    }, [st, order, hidden]);

    /* A co-host (Jun) editing alongside you: drift their focus across visible sections. */
    useEffect(() => {
      const vis = (order || []).filter(id => !hidden[id]);
      if (vis.length < 2) return;
      setPeerSection(p => vis.includes(p) ? p : vis[0]);
      const t = setInterval(() => {
        setPeerSection(p => {
          const i = vis.indexOf(p);
          return vis[(i + 1) % vis.length];
        });
      }, 4800);
      return () => clearInterval(t);
    }, [order, hidden]);

    /* Listen to the canvas — selection + ready handshake. */
    useEffect(() => {
      const onMsg = e => {
        const d = e.data;
        if (!d || typeof d !== 'object') return;
        if (d.type === 'pl:ready') {
          readyRef.current = true;
          pushAll();
        } else if (d.type === 'pl:select') {
          setSelId(d.id);
          setTab('content');
        } else if (d.type === 'pl:order' && Array.isArray(d.order)) setOrder(d.order);else if (d.type === 'pl:edit') {
          setSaved(false);
          if (d.edits) setEdits(d.edits);
        } else if (d.type === 'pl:image') {
          setSaved(false);
          if (d.images) setImagesMap(d.images);
        } else if (d.type === 'pl:rsvp-new') setRsvpNonce(n => n + 1);
      };
      window.addEventListener('message', onMsg);
      return () => window.removeEventListener('message', onMsg);
    }, []);
    const pushAll = () => {
      ['theme', 'texture', 'divider', 'motif', 'density', 'hero', 'story', 'kit', 'premium', 'nav', 'footer'].forEach(k => sendToCanvas(k, st[k]));
      sendToCanvas('content', content);
      sendToCanvas('editMode', editMode);
      sendToCanvas('order', order);
      sendToCanvas('hidden', hidden);
      sendToCanvas('edits', edits);
      sendToCanvas('images', imagesMap);
    };
    const onSelect = id => {
      setSelId(id);
      setTab('content');
      const f = iframeRef.current;
      if (f && f.contentWindow) {
        f.contentWindow.postMessage({
          type: 'pl:select',
          id
        }, '*');
        try {
          const el = f.contentDocument.getElementById(id);
          if (el) f.contentWindow.scrollTo({
            top: Math.max(0, el.getBoundingClientRect().top + (f.contentWindow.scrollY || 0) - 24),
            behavior: 'smooth'
          });
        } catch (e) {/* */}
      }
    };

    /* Pear actions from the command bar — rich, visual results. */
    const onAction = (kind, text) => {
      if (kind === 'look') {
        setStoreOpen(true);
        return;
      }
      const t = (text || '').toLowerCase();
      const m = kind === 'hotels' ? 'travel' : kind === 'moment' ? 'schedule' : kind === 'faq' ? 'faq' : kind === 'story' || kind === 'warm' ? 'story' : /hotel|stay|where/.test(t) ? 'travel' : /schedule|timeline|moment|day/.test(t) ? 'schedule' : /registr|gift|fund/.test(t) ? 'registry' : /faq|question/.test(t) ? 'faq' : /gallery|photo/.test(t) ? 'gallery' : 'story';
      setPicks(m);
    };
    useEffect(() => {
      const onKey = e => {
        const tag = e.target && e.target.tagName || '';
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setCmdOpen(true);
          return;
        }
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
          e.preventDefault();
          if (e.shiftKey) {
            redoRef.current && redoRef.current();
          } else {
            undoRef.current && undoRef.current();
          }
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []);
    return h('div', {
      style: {
        display: 'grid',
        height: '100vh',
        gridTemplateRows: '56px 1fr',
        gridTemplateColumns: '248px 1fr 340px',
        gridTemplateAreas: '"top top top" "left canvas right"'
      }
    }, h(Topbar, {
      device,
      setDevice,
      editMode,
      setEditMode,
      undo,
      redo,
      canUndo: histState.canUndo,
      canRedo: histState.canRedo,
      premium: st.premium,
      onUpgrade: () => setUpgrade(true),
      onPublish: () => {},
      saved,
      onCmd: () => setCmdOpen(true),
      onDecor: () => setTab('design'),
      onStore: () => setStoreOpen(true),
      onCoHost: () => setCohostOpen(true),
      onProfile: () => setProfileOpen(true),
      onProgress: () => setChecklistOpen(true),
      progress: 62
    }), h(SectionRail, {
      selId,
      onSelect,
      hidden,
      toggleHidden,
      onCoHost: () => setCohostOpen(true),
      onTool,
      onAdd: () => setAddOpen(true),
      order,
      onReorder: reorder
    }), h(Canvas, {
      device,
      iframeRef,
      onLoad: () => {
        if (readyRef.current) pushAll();
      }
    }), editMode && device === 'desktop' && h(PresenceLayer, {
      iframeRef,
      section: peerSection,
      peer: PEER
    }), editMode && device === 'desktop' && selId && SECTION_LAYOUTS[selId] && h(InlineLayoutBar, {
      iframeRef,
      selId,
      value: selId === 'top' ? st.hero : selId === 'story' ? st.story : content.layouts && content.layouts[selId] || LAYOUT_DEFAULT[selId],
      onPick: v => {
        if (selId === 'top') set('hero', v);else if (selId === 'story') set('story', v);else updateContent({
          layouts: Object.assign({}, content.layouts, {
            [selId]: v
          })
        });
      }
    }), h(Inspector, {
      tab,
      setTab,
      st,
      set,
      selId,
      content,
      updateContent,
      onDraft,
      drafting,
      applied,
      onPicks: kind => setPicks(kind || 'travel'),
      onCmd: () => setCmdOpen(true)
    }), h('button', {
      onClick: () => setCmdOpen(true),
      style: {
        position: 'fixed',
        left: 20,
        bottom: 20,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 15px',
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        background: C.olive,
        color: C.cream,
        fontSize: 12.5,
        fontWeight: 700,
        fontFamily: 'inherit',
        boxShadow: '0 10px 26px -8px rgba(40,28,12,0.5)'
      }
    }, '✦ Ask Pear', h('kbd', {
      style: {
        fontFamily: FONT_M,
        fontSize: 9,
        background: 'rgba(255,255,255,0.18)',
        borderRadius: 4,
        padding: '1px 5px'
      }
    }, '⌘K')), h(CmdBar, {
      open: cmdOpen,
      onClose: () => setCmdOpen(false),
      onJump: onSelect,
      onAction
    }), h(ProfileMenu, {
      open: profileOpen,
      onClose: () => setProfileOpen(false)
    }), h(CoHostModal, {
      open: cohostOpen,
      onClose: () => setCohostOpen(false)
    }), h(DecorDrawer, {
      open: decorOpen,
      onClose: () => setDecorOpen(false),
      premium: st.premium,
      onUnlock: () => {
        setDecorOpen(false);
        setUpgrade(true);
      }
    }), h(PearBlocks, {
      open: !!picks,
      kind: picks,
      onClose: () => setPicks(null)
    }), h(Checklist, {
      open: checklistOpen,
      onClose: () => setChecklistOpen(false),
      onJump: onSelect,
      onPear: k => setPicks(k),
      onCoHost: () => setCohostOpen(true)
    }), h(AddSection, {
      open: addOpen,
      onClose: () => setAddOpen(false),
      premium: st.premium,
      order,
      onInsert: id => {
        if (!order.includes(id)) {
          const o = order.slice();
          const after = o.indexOf('travel');
          o.splice(after >= 0 ? after + 1 : o.length, 0, id);
          reorder(o);
        }
        setSelId(id);
        setTab('content');
      }
    }), h(Store, {
      open: storeOpen,
      onClose: () => setStoreOpen(false),
      applied,
      premium: st.premium,
      onApply: applyPack,
      onUnlock: () => {
        if (!st.premium) setUpgrade(true);
      }
    }), h(FittingRoom, {
      open: fittingOpen,
      onClose: () => setFittingOpen(false),
      current: st.theme,
      onWear: id => {
        set('theme', id);
        setFittingOpen(false);
      }
    }), h(GuestsModal, {
      open: guestsOpen,
      onClose: () => setGuestsOpen(false),
      nonce: rsvpNonce
    }), h(SiteFileModal, {
      open: siteFileOpen,
      onClose: () => setSiteFileOpen(false)
    }), h(UpgradeModal, {
      open: upgrade,
      onClose: () => setUpgrade(false),
      premium: st.premium,
      setPremium: v => set('premium', v)
    }));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "site-editor/editor.jsx", error: String((e && e.message) || e) }); }

// site-renderer/app.jsx
try { (() => {
/* Pearloom — published-site shell. Mirrors PublishedSiteShell +
   ThemedSite's root: emits themeRootStyle() onto .pl8-guest, sets
   data-pl-texture / data-pl-density, stacks the sections, and wires
   the RSVP modal. Plus a live control panel to explore every theme
   setting (theme / paper / density / hero + story layout). */
(function () {
  const h = React.createElement;
  const {
    useState,
    useEffect,
    useRef
  } = React;
  const S = window.PearSite;
  /* Embed mode — when the renderer runs inside the editor iframe, it
     hides its own floating panel, accepts state via postMessage, and
     reports section selection back to the editor shell. */
  const EMBED = (() => {
    try {
      return new URLSearchParams(location.search).get('embed') === '1' || window.self !== window.top;
    } catch {
      return false;
    }
  })();
  const post = (type, extra) => {
    try {
      window.parent.postMessage(Object.assign({
        type
      }, extra), '*');
    } catch (e) {/* */}
  };
  const NAV_ITEMS = [{
    id: 'story',
    label: 'Our story'
  }, {
    id: 'details',
    label: 'Details'
  }, {
    id: 'schedule',
    label: 'Schedule'
  }, {
    id: 'travel',
    label: 'Travel'
  }, {
    id: 'gallery',
    label: 'Gallery'
  }, {
    id: 'registry',
    label: 'Registry'
  }, {
    id: 'faq',
    label: 'FAQ'
  }];
  const TEXTURES = ['paper', 'linen', 'watercolor', 'cotton', 'velvet', 'none'];
  const TEXTURE_LABEL = {
    paper: 'Pressed paper',
    linen: 'Linen weave',
    watercolor: 'Watercolor',
    cotton: 'Cotton rag',
    velvet: 'Velvet',
    none: 'Smooth'
  };
  const DENSITIES = ['cozy', 'comfortable', 'spacious'];
  const HEROES = ['centered', 'split', 'minimal', 'postcard', 'typographic', 'fullbleed'];
  const STORIES = ['sidebyside', 'stacked', 'quote', 'letter'];
  const KITS = ['classic', 'ticket', 'plate', 'scrapbook', 'index', 'minimal', 'arch', 'stamp', 'deco', 'gallery', 'menu', 'boarding-pass', 'marquee', 'chalkboard', 'nursery', 'certificate', 'kraft', 'luggage-tag', 'memoriam'];
  const PREMIUM_KITS = ['neon', 'marquee-live', 'aurora-glass', 'gold-foil', 'confetti', 'candlelight', 'pressed-bloom', 'vinyl'];
  const KIT_LABEL = {
    'boarding-pass': 'boarding pass',
    'luggage-tag': 'luggage tag',
    'marquee-live': 'marquee live',
    'aurora-glass': 'aurora glass',
    'gold-foil': 'gold foil',
    'pressed-bloom': 'pressed bloom'
  };

  /* ─── RSVP modal — the 90-second reply ──────────────────────── */
  function RsvpModal({
    open,
    onClose,
    C
  }) {
    const [sent, setSent] = useState(false);
    const [attending, setAttending] = useState('yes');
    const [name, setName] = useState('');
    const [party, setParty] = useState(2);
    const [note, setNote] = useState('');
    useEffect(() => {
      if (open) {
        setSent(false);
        setName('');
        setParty(2);
        setNote('');
        setAttending('yes');
      }
    }, [open]);
    const submit = e => {
      e.preventDefault();
      const rec = {
        name: name.trim(),
        attending,
        party: attending === 'yes' ? Number(party) || 1 : 0,
        note: note.trim(),
        at: Date.now()
      };
      try {
        const list = JSON.parse(localStorage.getItem('pl-site-rsvps') || '[]');
        list.push(rec);
        localStorage.setItem('pl-site-rsvps', JSON.stringify(list));
      } catch {/* */}
      if (EMBED) post('pl:rsvp-new', {
        rec
      });
      setSent(true);
    };
    if (!open) return null;
    const field = {
      width: '100%',
      padding: '11px 14px',
      borderRadius: 'var(--t-radius)',
      border: '1px solid var(--t-line)',
      background: 'var(--t-paper)',
      color: 'var(--t-ink)',
      fontSize: 14,
      outline: 'none',
      fontFamily: 'var(--t-body)',
      boxSizing: 'border-box'
    };
    const label = {
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--t-ink-muted)',
      marginBottom: 6,
      display: 'block'
    };
    return h('div', {
      onClick: onClose,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(20,14,8,0.5)',
        backdropFilter: 'blur(3px)',
        display: 'grid',
        placeItems: 'center',
        padding: 20
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      style: {
        width: '100%',
        maxWidth: 440,
        background: 'var(--t-card)',
        borderRadius: 'var(--t-radius-lg)',
        border: '1px solid var(--t-line)',
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.5)',
        padding: '30px 30px 28px',
        color: 'var(--t-ink)',
        fontFamily: 'var(--t-body)'
      }
    }, sent ? h('div', {
      style: {
        textAlign: 'center',
        padding: '20px 0'
      }
    }, h('div', {
      style: {
        display: 'inline-flex',
        marginBottom: 14
      }
    }, h(S.OliveSprig, {
      size: 44
    })), h('h3', {
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: 28,
        margin: '0 0 8px',
        color: 'var(--t-ink)'
      }
    }, attending === 'yes' ? 'See you there.' : 'We will miss you.'), h('p', {
      style: {
        fontSize: 14,
        color: 'var(--t-ink-soft)',
        margin: 0,
        lineHeight: 1.55
      }
    }, attending === 'yes' ? 'Your seat is saved. We will send the details closer to the day.' : 'Thank you for letting us know — you will be with us in spirit.'), h('button', {
      onClick: onClose,
      style: {
        marginTop: 22,
        padding: '11px 26px',
        borderRadius: 999,
        border: 'none',
        background: 'var(--t-ink)',
        color: 'var(--t-paper)',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'var(--t-body)'
      }
    }, 'Done')) : h('form', {
      onSubmit: submit
    }, h('div', {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 'var(--t-eyebrow-ls)',
        textTransform: 'uppercase',
        color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
        marginBottom: 6
      }
    }, C.rsvp.eyebrow), h('h3', {
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: 30,
        margin: '0 0 18px',
        color: 'var(--t-ink)'
      }
    }, C.rsvp.title), h('div', {
      style: {
        marginBottom: 14
      }
    }, h('label', {
      style: label
    }, 'Your name'), h('input', {
      required: true,
      value: name,
      onChange: e => setName(e.target.value),
      placeholder: 'First & last',
      style: field
    })), h('div', {
      style: {
        marginBottom: 14
      }
    }, h('label', {
      style: label
    }, 'Will you join us?'), h('div', {
      style: {
        display: 'flex',
        gap: 8
      }
    }, ['yes', 'no'].map(v => h('button', {
      key: v,
      type: 'button',
      onClick: () => setAttending(v),
      style: {
        flex: 1,
        padding: '10px',
        borderRadius: 'var(--t-radius)',
        border: '1px solid ' + (attending === v ? 'var(--t-accent)' : 'var(--t-line)'),
        background: attending === v ? 'var(--t-accent-bg)' : 'var(--t-paper)',
        color: attending === v ? 'var(--t-accent-ink)' : 'var(--t-ink-soft)',
        fontSize: 13.5,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--t-body)'
      }
    }, v === 'yes' ? 'Joyfully yes' : 'Sadly no')))), attending === 'yes' && h('div', {
      style: {
        marginBottom: 14
      }
    }, h('label', {
      style: label
    }, 'Guests in your party'), h('input', {
      type: 'number',
      min: 1,
      max: 8,
      value: party,
      onChange: e => setParty(e.target.value),
      style: field
    })), h('div', {
      style: {
        marginBottom: 20
      }
    }, h('label', {
      style: label
    }, 'A note for the hosts'), h('textarea', {
      rows: 2,
      value: note,
      onChange: e => setNote(e.target.value),
      placeholder: 'Optional',
      style: Object.assign({}, field, {
        resize: 'vertical'
      })
    })), h('button', {
      type: 'submit',
      style: {
        width: '100%',
        padding: '13px',
        borderRadius: 999,
        border: 'none',
        background: 'var(--t-ink)',
        color: 'var(--t-paper)',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'var(--t-body)'
      }
    }, 'Send reply'))));
  }

  /* ─── Control panel — explore the theme settings ────────────── */
  function Controls({
    theme,
    setTheme,
    texture,
    setTexture,
    density,
    setDensity,
    hero,
    setHero,
    story,
    setStory,
    kit,
    setKit,
    premium,
    setPremium,
    open,
    setOpen
  }) {
    const chip = active => ({
      padding: '6px 11px',
      borderRadius: 8,
      border: '1px solid ' + (active ? '#5C6B3F' : '#E2D9C3'),
      background: active ? '#5C6B3F' : '#FBF7EE',
      color: active ? '#FDFAF0' : '#4A5642',
      fontSize: 11.5,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: "'Inter',sans-serif",
      textTransform: 'capitalize',
      transition: 'all .12s'
    });
    const groupLabel = {
      fontFamily: "'Geist Mono',ui-monospace,monospace",
      fontSize: 9,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: '#8A8275',
      margin: '0 0 7px'
    };
    if (!open) {
      return h('button', {
        onClick: () => setOpen(true),
        style: {
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 150,
          padding: '11px 16px',
          borderRadius: 999,
          border: '1px solid #E2D9C3',
          background: 'rgba(252,248,238,0.9)',
          backdropFilter: 'blur(8px)',
          color: '#3D4A1F',
          fontSize: 12.5,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: "'Inter',sans-serif",
          boxShadow: '0 8px 24px -8px rgba(40,28,12,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }
      }, h('span', {
        style: {
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#C19A4B'
        }
      }), 'Theme settings');
    }
    return h('div', {
      style: {
        position: 'fixed',
        right: 18,
        bottom: 18,
        zIndex: 150,
        width: 320,
        maxHeight: '86vh',
        overflowY: 'auto',
        background: 'rgba(251,247,238,0.96)',
        backdropFilter: 'blur(14px) saturate(1.4)',
        border: '1px solid #E2D9C3',
        borderRadius: 16,
        boxShadow: '0 20px 60px -16px rgba(40,28,12,0.4)',
        padding: '18px 18px 20px',
        fontFamily: "'Inter',sans-serif"
      }
    }, h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
      }
    }, h('div', null, h('div', {
      style: {
        fontFamily: "'Fraunces',Georgia,serif",
        fontSize: 18,
        fontWeight: 600,
        color: '#18181B',
        lineHeight: 1
      }
    }, 'Site settings'), h('div', {
      style: {
        fontSize: 10.5,
        color: '#8A8275',
        marginTop: 3
      }
    }, 'Same renderer, every theme')), h('button', {
      onClick: () => setOpen(false),
      style: {
        width: 26,
        height: 26,
        borderRadius: 7,
        border: '1px solid #E2D9C3',
        background: '#FDFAF0',
        color: '#6F6557',
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1
      }
    }, '✕')), h('p', {
      style: groupLabel
    }, 'Theme'), h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 7,
        marginBottom: 16
      }
    }, window.PL_THEMES.map(t => {
      const active = theme.id === t.id;
      return h('button', {
        key: t.id,
        onClick: () => setTheme(t.id),
        title: t.blurb,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 9px',
          borderRadius: 9,
          border: '1px solid ' + (active ? '#5C6B3F' : '#E2D9C3'),
          background: active ? 'rgba(92,107,63,0.1)' : '#FDFAF0',
          cursor: 'pointer',
          textAlign: 'left'
        }
      }, h('span', {
        style: {
          display: 'flex',
          flexShrink: 0,
          borderRadius: 5,
          overflow: 'hidden',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.06)'
        }
      }, t.swatches.slice(0, 4).map((c, i) => h('span', {
        key: i,
        style: {
          width: 8,
          height: 18,
          background: c
        }
      }))), h('span', {
        style: {
          fontSize: 10.5,
          fontWeight: active ? 700 : 500,
          color: active ? '#3D4A1F' : '#4A5642',
          lineHeight: 1.15
        }
      }, t.name));
    })), h('p', {
      style: groupLabel
    }, 'Paper · texture'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 16
      }
    }, TEXTURES.map(t => h('button', {
      key: t,
      onClick: () => setTexture(t),
      style: chip(texture === t)
    }, TEXTURE_LABEL[t]))), h('p', {
      style: groupLabel
    }, 'Component kit'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 16
      }
    }, KITS.map(k => h('button', {
      key: k,
      onClick: () => setKit(k),
      style: chip(kit === k)
    }, KIT_LABEL[k] || k))), h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: '0 0 8px'
      }
    }, h('span', {
      style: {
        fontFamily: "'Geist Mono',ui-monospace,monospace",
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#9A7838'
      }
    }, '\u2726 Atelier \u00b7 Motion'), h('button', {
      onClick: () => setPremium(!premium),
      style: {
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid ' + (premium ? '#9A7838' : '#E2D9C3'),
        background: premium ? '#C19A4B' : '#FBF7EE',
        color: premium ? '#241a08' : '#9A7838',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        fontFamily: "'Inter',sans-serif"
      }
    }, premium ? 'Unlocked \u2713' : 'Unlock')), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: premium || !PREMIUM_KITS.includes(kit) ? 16 : 8
      }
    }, PREMIUM_KITS.map(k => {
      const active = kit === k;
      return h('button', {
        key: k,
        onClick: () => setKit(k),
        title: premium ? 'Animated' : 'Preview \u2014 unlock to animate',
        style: Object.assign({}, chip(active), !premium && {
          borderColor: active ? '#C19A4B' : '#E6D6AE',
          background: active ? '#C19A4B' : '#FBF4E2',
          color: active ? '#241a08' : '#9A7838'
        })
      }, (premium ? '' : '\u2726 ') + (KIT_LABEL[k] || k));
    })), !premium && PREMIUM_KITS.includes(kit) && h('div', {
      style: {
        fontSize: 10.5,
        color: '#9A7838',
        fontStyle: 'italic',
        margin: '0 0 16px',
        lineHeight: 1.4
      }
    }, '\u2726 Showing the still preview. Unlock Atelier to bring this kit to life.'), h('p', {
      style: groupLabel
    }, 'Density'), h('div', {
      style: {
        display: 'flex',
        gap: 6,
        marginBottom: 16
      }
    }, DENSITIES.map(d => h('button', {
      key: d,
      onClick: () => setDensity(d),
      style: chip(density === d)
    }, d))), h('p', {
      style: groupLabel
    }, 'Hero layout'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 16
      }
    }, HEROES.map(v => h('button', {
      key: v,
      onClick: () => setHero(v),
      style: chip(hero === v)
    }, v))), h('p', {
      style: groupLabel
    }, 'Story layout'), h('div', {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6
      }
    }, STORIES.map(v => h('button', {
      key: v,
      onClick: () => setStory(v),
      style: chip(story === v)
    }, v === 'sidebyside' ? 'side by side' : v))));
  }

  /* ─── PhotoPicker — bottom drawer: your library as a tray (#4) ─── */
  function PhotoPicker({
    open,
    slot,
    current,
    library,
    onPick,
    onUploadFiles,
    onClear,
    onRemoveLib,
    onClose
  }) {
    const inputRef = useRef(null);
    const [render, setRender] = useState(open);
    const [vis, setVis] = useState(false);
    useEffect(() => {
      if (open) {
        setRender(true);
        const t = setTimeout(() => setVis(true), 20);
        return () => clearTimeout(t);
      }
      setVis(false);
      const t = setTimeout(() => setRender(false), 280);
      return () => clearTimeout(t);
    }, [open]);
    if (!render) return null;
    const manage = slot == null;
    const head = manage ? 'Photo library' : 'Choose a photo';
    const sub = manage ? 'Upload once, reuse anywhere — or drag a photo straight onto any spot.' : 'Tap a photo to drop it into this spot.';
    const trigger = () => inputRef.current && inputRef.current.click();
    return h('div', {
      onClick: onClose,
      'data-pl-skip': true,
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        fontFamily: "'Inter',system-ui,sans-serif",
        background: 'rgba(20,14,8,0.18)',
        opacity: vis ? 1 : 0,
        transition: 'opacity .26s ease',
        pointerEvents: vis ? 'auto' : 'none'
      }
    }, h('div', {
      onClick: e => e.stopPropagation(),
      style: {
        width: '100%',
        maxHeight: '56vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#FBF7EE',
        borderTop: '1px solid #E2D9C3',
        borderRadius: '18px 18px 0 0',
        boxShadow: '0 -24px 60px -24px rgba(20,14,8,0.45)',
        transform: vis ? 'translateY(0)' : 'translateY(101%)',
        transition: 'transform .28s cubic-bezier(.22,.61,.36,1)'
      }
    }, h('div', {
      style: {
        display: 'flex',
        justifyContent: 'center',
        padding: '9px 0 2px'
      }
    }, h('span', {
      'aria-hidden': true,
      style: {
        width: 38,
        height: 4,
        borderRadius: 999,
        background: '#D8CDB4'
      }
    })), h('div', {
      style: {
        padding: '6px 22px 12px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12
      }
    }, h('div', null, h('div', {
      style: {
        fontFamily: "'Fraunces',Georgia,serif",
        fontSize: 19,
        color: '#18181B',
        lineHeight: 1.1
      }
    }, head), h('div', {
      style: {
        fontSize: 12,
        color: '#7A7060',
        marginTop: 3,
        lineHeight: 1.4
      }
    }, sub)), h('div', {
      style: {
        display: 'flex',
        gap: 8,
        flexShrink: 0
      }
    }, h('button', {
      onClick: trigger,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 999,
        border: 'none',
        background: '#5C6B3F',
        color: '#FBF7EE',
        fontSize: 12.5,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, '\u2191 Upload'), h('button', {
      onClick: onClose,
      title: 'Close',
      style: {
        width: 34,
        height: 34,
        borderRadius: 999,
        border: '1px solid #E2D9C3',
        background: '#FFFDF7',
        color: '#7A7060',
        cursor: 'pointer',
        fontSize: 14,
        flexShrink: 0
      }
    }, '\u2715'))), h('div', {
      className: 'ed-scroll',
      style: {
        flex: 1,
        overflowY: 'auto',
        padding: '4px 22px 22px'
      }
    }, h('input', {
      ref: inputRef,
      type: 'file',
      accept: 'image/*',
      multiple: true,
      onChange: e => {
        onUploadFiles(e.target.files, slot);
        e.target.value = '';
      },
      style: {
        display: 'none'
      }
    }), h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
        gap: 10
      }
    }, h('button', {
      onClick: trigger,
      style: {
        aspectRatio: '1',
        borderRadius: 12,
        border: '1.5px dashed #C8B98C',
        background: 'rgba(193,154,75,0.07)',
        color: '#8C6E3D',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'inherit'
      }
    }, h('span', {
      style: {
        fontSize: 24,
        lineHeight: 1,
        fontWeight: 300
      }
    }, '+'), h('span', {
      style: {
        fontSize: 11,
        fontWeight: 700
      }
    }, 'Add photo')), current && !manage && h('div', {
      style: {
        position: 'relative',
        aspectRatio: '1',
        borderRadius: 12,
        overflow: 'hidden',
        border: '2px solid #5C6B3F'
      }
    }, h('img', {
      src: current,
      alt: '',
      style: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block'
      }
    }), h('span', {
      style: {
        position: 'absolute',
        top: 6,
        left: 6,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#fff',
        background: 'rgba(92,107,63,0.92)',
        padding: '2px 7px',
        borderRadius: 999
      }
    }, 'In this spot'), h('button', {
      onClick: onClear,
      title: 'Remove from this spot',
      style: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        padding: '4px 9px',
        borderRadius: 7,
        border: 'none',
        background: 'rgba(20,14,8,0.66)',
        color: '#fff',
        fontSize: 10.5,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'inherit'
      }
    }, 'Remove')), library.map(p => {
      const sel = !manage && current === p.src;
      return h('div', {
        key: p.id,
        style: {
          position: 'relative',
          aspectRatio: '1',
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid ' + (sel ? '#5C6B3F' : '#E2D9C3'),
          cursor: manage ? 'default' : 'pointer',
          boxShadow: sel ? '0 0 0 2px #5C6B3F' : 'none',
          transition: 'transform .12s ease, box-shadow .12s ease'
        }
      }, h('img', {
        src: p.src,
        alt: '',
        onClick: manage ? undefined : () => onPick(p.src),
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          cursor: manage ? 'default' : 'pointer'
        }
      }), h('button', {
        onClick: e => {
          e.stopPropagation();
          onRemoveLib(p.id);
        },
        title: 'Remove from library',
        style: {
          position: 'absolute',
          top: 5,
          right: 5,
          width: 22,
          height: 22,
          borderRadius: 6,
          border: 'none',
          background: 'rgba(20,14,8,0.6)',
          color: '#fff',
          fontSize: 12,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          lineHeight: 1
        }
      }, '\u2715'));
    })), library.length === 0 && h('div', {
      style: {
        textAlign: 'center',
        padding: '22px 0 4px',
        fontSize: 12.5,
        color: '#9A9080',
        lineHeight: 1.5
      }
    }, 'Nothing yet \u2014 tap Add photo to begin your library.'))));
  }

  /* ─── App ───────────────────────────────────────────────────── */
  function App() {
    const saved = (() => {
      try {
        return JSON.parse(localStorage.getItem('pl-site-state') || '{}');
      } catch {
        return {};
      }
    })();
    const PARAMS = (() => {
      try {
        return new URLSearchParams(location.search);
      } catch {
        return new URLSearchParams();
      }
    })();
    const PREVIEW = PARAMS.get('preview') === '1';
    const FORCED_THEME = PARAMS.get('theme');
    const [themeId, setThemeId] = useState(FORCED_THEME || saved.themeId || 'garden');
    const [density, setDensity] = useState(saved.density || 'comfortable');
    const [hero, setHero] = useState(saved.hero || 'centered');
    const [story, setStory] = useState(saved.story || 'sidebyside');
    const [textureOverride, setTextureOverride] = useState(saved.texture || null);
    const [dividerOverride, setDividerOverride] = useState(saved.divider || null);
    const [motifOverride, setMotifOverride] = useState(saved.motif || null);
    const [contentOverride, setContentOverride] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem('pl-site-content') || '{}');
      } catch {
        return {};
      }
    });
    const [contentEpoch, setContentEpoch] = useState(0);
    const [kit, setKit] = useState(saved.kit || 'classic');
    const [navVariant, setNavVariant] = useState(saved.nav || 'centered');
    const [footerVariant, setFooterVariant] = useState(saved.footer || 'signature');
    const [premium, setPremium] = useState(saved.premium || false);
    const [panelOpen, setPanelOpen] = useState(saved.panelOpen !== false);
    const [rsvpOpen, setRsvpOpen] = useState(false);
    const [activeId, setActiveId] = useState('story');
    const [selId, setSelId] = useState(null);
    const [customVars, setCustomVars] = useState(null);
    const DEFAULT_ORDER = ['top', 'story', 'countdown', 'details', 'schedule', 'travel', 'gallery', 'registry', 'faq', 'rsvp'];
    const [order, setOrder] = useState(() => {
      const o = Array.isArray(saved.order) ? saved.order.filter(x => DEFAULT_ORDER.includes(x)) : null;
      if (!o || !o.length) return DEFAULT_ORDER;
      DEFAULT_ORDER.forEach(id => {
        if (!o.includes(id)) o.push(id);
      });
      return o;
    });
    const [editMode, setEditMode] = useState(EMBED && !PREVIEW ? saved.editMode !== false : false);
    const [images, setImages] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem('pl-site-images') || '{}');
      } catch {
        return {};
      }
    });
    const [hidden, setHidden] = useState(saved.hidden || {});
    const [library, setLibrary] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem('pl-site-library') || '[]');
      } catch {
        return [];
      }
    });
    const [pickerSlot, setPickerSlot] = useState(undefined); // undefined=closed, null=manage, string=slot
    const [dragId, setDragId] = useState(null);
    const [dropIdx, setDropIdx] = useState(null);
    const orderRef = useRef(order);
    orderRef.current = order;
    const editModeRef = useRef(editMode);
    editModeRef.current = editMode;
    const dragIdRef = useRef(null);
    const dropIdxRef = useRef(null);
    const editsRef = useRef(null);
    const origRef = useRef({});
    const rescanRef = useRef(null);
    const persistImages = n => {
      try {
        localStorage.setItem('pl-site-images', JSON.stringify(n));
        return true;
      } catch (e) {
        if (EMBED) post('pl:warn', {
          kind: 'storage'
        });
        return false;
      }
    };
    const onImage = (slot, src) => {
      setImages(m => {
        let n;
        if (src == null) {
          n = Object.assign({}, m);
          delete n[slot];
        } else {
          n = Object.assign({}, m, {
            [slot]: src
          });
        }
        persistImages(n);
        if (EMBED) post('pl:image', {
          slot,
          images: n
        });
        return n;
      });
    };
    /* Downscale on import so a few photos can't blow the storage quota:
       cap the longest edge and re-encode (JPEG unless the source is a PNG
       that may carry transparency). Falls back to the raw data URL. */
    const fileToDataURL = file => new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) {
        rej();
        return;
      }
      const r = new FileReader();
      r.onerror = rej;
      r.onload = () => {
        const raw = r.result;
        const img = new Image();
        img.onload = () => {
          try {
            const MAX = 1600;
            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            const w = Math.max(1, Math.round(img.width * scale));
            const hgt = Math.max(1, Math.round(img.height * scale));
            const cv = document.createElement('canvas');
            cv.width = w;
            cv.height = hgt;
            cv.getContext('2d').drawImage(img, 0, 0, w, hgt);
            const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const out = cv.toDataURL(type, 0.85);
            res(out && out.length < raw.length ? out : raw);
          } catch (e) {
            res(raw);
          }
        };
        img.onerror = () => res(raw);
        img.src = raw;
      };
      r.readAsDataURL(file);
    });
    const addToLibrary = src => {
      setLibrary(prev => {
        if (prev.some(p => p.src === src)) return prev;
        const item = {
          id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
          src
        };
        const n = [item].concat(prev).slice(0, 80);
        try {
          localStorage.setItem('pl-site-library', JSON.stringify(n));
        } catch {/* */}
        return n;
      });
    };
    const removeFromLibrary = id => setLibrary(prev => {
      const n = prev.filter(p => p.id !== id);
      try {
        localStorage.setItem('pl-site-library', JSON.stringify(n));
      } catch {/* */}
      return n;
    });
    const onUploadFiles = async (fileList, slot) => {
      const files = Array.from(fileList || []);
      let first = null;
      for (let i = 0; i < files.length; i++) {
        try {
          const src = await fileToDataURL(files[i]);
          addToLibrary(src);
          if (i === 0) first = src;
        } catch (e) {/* */}
      }
      if (slot && first) onImage(slot, first);
      if (slot != null) setPickerSlot(undefined);
    };
    const onSlotDrop = async (slot, file) => {
      try {
        const src = await fileToDataURL(file);
        addToLibrary(src);
        onImage(slot, src);
      } catch (e) {/* */}
    };
    const applyEditsMap = map => {
      editsRef.current = map || {};
      try {
        localStorage.setItem('pl-site-edits', JSON.stringify(editsRef.current));
      } catch {/* */}
      if (rescanRef.current) rescanRef.current();
    };
    const theme = window.PL_getTheme(themeId);
    const texture = textureOverride || theme.texture;
    const pad = window.PL_PAD_BY_DENSITY[density] || 1;
    const isEditorial = theme.id === 'editorial' || theme.id === 'deco-gilt';

    /* When the theme changes, clear any manual texture override so the
       new theme's own material takes over (mirrors effectiveTexture). */
    const setTheme = id => {
      setThemeId(id);
      setTextureOverride(null);
      setDividerOverride(null);
      setMotifOverride(null);
    };

    /* Editor bridge — receive state + selection from the shell; report
       selection + state back so the editor's rails stay in sync. */
    useEffect(() => {
      if (!EMBED) return;
      const onMsg = e => {
        const d = e.data;
        if (!d || typeof d !== 'object' || !String(d.type || '').startsWith('pl:')) return;
        if (d.type === 'pl:set') {
          if (d.key === 'theme') {
            setTheme(d.value);
            setCustomVars(null);
          } else if (d.key === 'themeVars') setCustomVars(d.value && Object.keys(d.value).length ? d.value : null);else if (d.key === 'texture') setTextureOverride(d.value);else if (d.key === 'divider') setDividerOverride(d.value === 'auto' ? null : d.value);else if (d.key === 'motif') setMotifOverride(d.value === 'auto' ? null : d.value);else if (d.key === 'content') {
            const v = d.value || {};
            /* Structured content is authoritative: drop inline-edit overrides
               for any section whose data this change touches, so the new
               content isn't masked by a stale inline edit on the same element. */
            const prev = contentOverride || {};
            const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
            const changed = new Set();
            ['names', 'coupleType', 'tagline', 'date', 'place'].forEach(k => {
              if (!eq(prev[k], v[k])) {
                changed.add('top');
                changed.add('root');
              }
            });
            if (!eq(prev.story, v.story)) changed.add('story');
            if (!eq(prev.schedule, v.schedule)) changed.add('schedule');
            if (!eq(prev.faq, v.faq)) changed.add('faq');
            if (!eq(prev.registry, v.registry) || prev.registryBody !== v.registryBody) changed.add('registry');
            const store = editsRef.current;
            if (store && changed.size) {
              let touched = false;
              Object.keys(store).forEach(p => {
                if (changed.has(p.split('|')[0])) {
                  delete store[p];
                  touched = true;
                }
              });
              if (touched) {
                try {
                  localStorage.setItem('pl-site-edits', JSON.stringify(store));
                } catch {/* */}
                if (rescanRef.current) rescanRef.current();
                setContentEpoch(n => n + 1);
              }
            }
            setContentOverride(v);
            try {
              localStorage.setItem('pl-site-content', JSON.stringify(v));
            } catch {/* */}
          } else if (d.key === 'density') setDensity(d.value);else if (d.key === 'hero') setHero(d.value);else if (d.key === 'story') setStory(d.value);else if (d.key === 'kit') setKit(d.value);else if (d.key === 'nav') setNavVariant(d.value);else if (d.key === 'footer') setFooterVariant(d.value);else if (d.key === 'premium') setPremium(!!d.value);else if (d.key === 'editMode') setEditMode(!!d.value);else if (d.key === 'order' && Array.isArray(d.value)) setOrder(d.value.slice());else if (d.key === 'hidden') setHidden(d.value || {});else if (d.key === 'edits') applyEditsMap(d.value || {});else if (d.key === 'images') {
            const n = d.value || {};
            setImages(n);
            persistImages(n);
          }
        } else if (d.type === 'pl:openLibrary') {
          setPickerSlot(null);
        } else if (d.type === 'pl:select') {
          setSelId(d.id);
          const el = document.getElementById(d.id);
          if (el) el.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        } else if (d.type === 'pl:rsvp') {
          setRsvpOpen(true);
        }
      };
      window.addEventListener('message', onMsg);
      if (!PREVIEW) post('pl:ready', {});
      return () => window.removeEventListener('message', onMsg);
    }, []);
    useEffect(() => {
      if (!PREVIEW) {
        try {
          localStorage.setItem('pl-site-state', JSON.stringify({
            themeId,
            density,
            hero,
            story,
            texture: textureOverride,
            divider: dividerOverride,
            motif: motifOverride,
            kit,
            premium,
            nav: navVariant,
            footer: footerVariant,
            panelOpen,
            order,
            editMode,
            hidden
          }));
        } catch {/* */}
      }
      if (EMBED && !PREVIEW) post('pl:state', {
        state: {
          themeId,
          density,
          hero,
          story,
          texture: textureOverride,
          kit,
          premium
        }
      });
    }, [themeId, density, hero, story, textureOverride, dividerOverride, motifOverride, kit, premium, navVariant, footerVariant, panelOpen, order, editMode, hidden]);
    const co = contentOverride || {};
    const baseNames = Array.isArray(co.names) && co.names[0] ? [co.names[0], co.names[1] || ''] : ['Mira', 'Jun'];
    const meta = {
      date: co.date || 'Saturday · September 6, 2026',
      place: co.place || 'Point Reyes, California',
      dateISO: co.dateISO || '2026-09-06T16:30:00'
    };
    const C = S.buildCopy(baseNames, meta);
    if (co.coupleType) C.subject.type = co.coupleType;
    if (co.tagline != null) C.tagline = co.tagline;
    if (co.story) C.story = Object.assign({}, C.story, co.story);
    if (Array.isArray(co.schedule)) C.schedule = Object.assign({}, C.schedule, {
      rows: co.schedule
    });
    if (Array.isArray(co.faq)) C.faq = Object.assign({}, C.faq, {
      qa: co.faq
    });
    if (Array.isArray(co.registry)) C.registry = Object.assign({}, C.registry, {
      stores: co.registry
    });
    if (Array.isArray(co.travel)) C.travel = Object.assign({}, C.travel, {
      hotels: co.travel
    });
    const layouts = co.layouts || {};
    if (co.registryBody != null) C.registry = Object.assign({}, C.registry, {
      body: co.registryBody
    });
    const onRsvp = e => {
      if (e) e.preventDefault();
      setRsvpOpen(true);
    };
    const ctx = {
      C,
      pad,
      isEditorial,
      variant: hero,
      storyVariant: story,
      layouts,
      dividerLook: dividerOverride || theme.look.divider,
      motif: motifOverride || theme.motif,
      motifDensity: motifOverride ? 'generous' : theme.look.motifDensity,
      navItems: NAV_ITEMS,
      onRsvp,
      activeId,
      navVariant,
      footerVariant,
      images,
      onImage,
      onSlotClick: slot => setPickerSlot(slot),
      onSlotDrop,
      editMode
    };

    /* Active-section highlight for the nav. */
    const rootRef = useRef(null);
    useEffect(() => {
      const ids = NAV_ITEMS.map(n => n.id);
      const onScroll = () => {
        let cur = ids[0];
        for (const id of ids) {
          const el = document.getElementById(id);
          if (el && el.getBoundingClientRect().top <= 140) cur = id;
        }
        setActiveId(cur);
      };
      window.addEventListener('scroll', onScroll, {
        passive: true
      });
      onScroll();
      return () => window.removeEventListener('scroll', onScroll);
    }, []);

    /* Scroll-reveal — sections thread in (fade + rise). Entrance motion
       runs in preview/published only; in edit mode everything is shown
       statically so editing never fights an animation. A failsafe reveal
       guarantees nothing stays hidden if the observer never fires (e.g.
       a capture engine that pauses just after mount). */
    useEffect(() => {
      const root = rootRef.current;
      if (!root) return;
      const els = Array.from(root.querySelectorAll('[data-reveal]'));
      const animate = !editMode;
      if (!animate) {
        root.classList.remove('pl-anim');
        els.forEach(el => el.classList.add('pl-in'));
        return;
      }
      root.classList.add('pl-anim');
      els.forEach(el => el.classList.remove('pl-in'));
      const io = new IntersectionObserver(ents => ents.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('pl-in');
          io.unobserve(en.target);
        }
      }), {
        threshold: 0.08,
        rootMargin: '0px 0px -8% 0px'
      });
      els.forEach((el, i) => {
        if (i < 2) el.classList.add('pl-in');else io.observe(el);
      });
      const failsafe = setTimeout(() => els.forEach(el => el.classList.add('pl-in')), 2600);
      return () => {
        io.disconnect();
        clearTimeout(failsafe);
      };
    }, [themeId, hero, story, density, editMode, order, hidden]);

    /* ─── Direct text editing — DOM overlay (editor canvas) ─────── */
    useEffect(() => {
      if (!EMBED) return;
      const root = rootRef.current;
      if (!root) return;
      if (!editsRef.current) {
        try {
          editsRef.current = JSON.parse(localStorage.getItem('pl-site-edits') || '{}');
        } catch {
          editsRef.current = {};
        }
      }
      const orig = origRef.current;
      const OK = new Set(['H1', 'H2', 'H3', 'H4', 'H5', 'P', 'SPAN', 'DIV', 'BUTTON', 'A', 'LI', 'BLOCKQUOTE', 'B', 'STRONG', 'EM', 'I', 'LABEL']);
      const INLINE = new Set(['SPAN', 'B', 'I', 'EM', 'STRONG', 'A', 'BR', 'SMALL', 'SUP', 'SUB', 'U']);
      let applying = false;
      const pathFor = el => {
        const secEl = el.closest('[data-screen-label]');
        const sec = secEl ? secEl.getAttribute('data-screen-label') : 'root';
        const stop = secEl || root;
        const parts = [];
        let node = el;
        while (node && node !== stop && node.parentElement) {
          const p = node.parentElement;
          parts.unshift(node.tagName.toLowerCase() + Array.prototype.indexOf.call(p.children, node));
          node = p;
        }
        return sec + '|' + parts.join('/');
      };
      const isUnit = el => {
        if (!OK.has(el.tagName)) return false;
        if (!(el.textContent || '').trim()) return false;
        if (el.closest('input,textarea')) return false;
        if (el.closest('[data-pl-skip]')) return false;
        for (const c of el.children) {
          if (!INLINE.has(c.tagName)) return false;
        }
        return true;
      };
      const scan = () => {
        applying = true;
        const store = editsRef.current || {};
        root.querySelectorAll('h1,h2,h3,h4,h5,p,span,div,button,a,li,blockquote,b,strong,em,i,label').forEach(el => {
          if (el.parentElement && el.parentElement.closest('[data-pl-txt]')) return;
          if (!isUnit(el)) return;
          el.setAttribute('data-pl-txt', '');
          const path = pathFor(el);
          el.setAttribute('data-pl-path', path);
          const hasEl = el.children.length > 0;
          if (!(path in orig)) orig[path] = hasEl ? {
            h: el.innerHTML
          } : {
            t: el.textContent
          };
          if (el.isContentEditable) return;
          const ov = store[path];
          if (ov) {
            if (ov.h != null && el.innerHTML !== ov.h) el.innerHTML = ov.h;else if (ov.t != null && el.textContent !== ov.t) el.textContent = ov.t;
          }
          /* No else: elements without an explicit inline edit are owned by
             React/structured content — never force them back to first-seen
             text, or content changes would be silently reverted. */
        });
        applying = false;
      };
      rescanRef.current = scan;
      const finish = el => {
        el.removeAttribute('contenteditable');
        el.removeEventListener('blur', onBlur, true);
        el.removeEventListener('keydown', onKey);
        const path = el.getAttribute('data-pl-path') || pathFor(el);
        const store = editsRef.current || (editsRef.current = {});
        const o = orig[path];
        const val = el.children.length ? {
          h: el.innerHTML
        } : {
          t: el.textContent
        };
        const isOrig = o && (o.h != null && o.h === val.h || o.t != null && o.t === val.t);
        if (isOrig) delete store[path];else store[path] = val;
        try {
          localStorage.setItem('pl-site-edits', JSON.stringify(store));
        } catch {/* */}
        post('pl:edit', {
          path,
          text: (el.textContent || '').slice(0, 80),
          edits: store
        });
      };
      function onBlur(e) {
        finish(e.currentTarget);
      }
      function onKey(e) {
        if (e.key === 'Enter' && !e.shiftKey || e.key === 'Escape') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }
      const onClick = e => {
        if (!editModeRef.current) return;
        const el = e.target.closest && e.target.closest('[data-pl-txt]');
        if (!el || !root.contains(el) || el.isContentEditable) return;
        if (e.target.closest('[data-pl-skip]')) return;
        e.preventDefault();
        e.stopPropagation();
        el.setAttribute('contenteditable', 'true');
        el.focus();
        el.addEventListener('blur', onBlur, true);
        el.addEventListener('keydown', onKey);
      };
      root.addEventListener('click', onClick, true);
      scan();
      let raf = 0;
      const obs = new MutationObserver(() => {
        if (applying) return;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(scan);
      });
      obs.observe(root, {
        childList: true,
        characterData: true,
        subtree: true
      });
      return () => {
        root.removeEventListener('click', onClick, true);
        obs.disconnect();
        cancelAnimationFrame(raf);
      };
    }, []);

    /* ─── Section drag-reorder ──────────────────────────────────── */
    const commitReorder = (id, idx) => {
      setOrder(prev => {
        const oldIdx = prev.indexOf(id);
        if (oldIdx < 0) return prev;
        let target = idx;
        if (oldIdx < idx) target -= 1;
        const cur = prev.filter(x => x !== id);
        target = Math.max(0, Math.min(target, cur.length));
        cur.splice(target, 0, id);
        if (EMBED) post('pl:order', {
          order: cur
        });
        return cur;
      });
    };
    const startDrag = (id, e) => {
      e.preventDefault();
      e.stopPropagation();
      dragIdRef.current = id;
      setDragId(id);
      document.body.style.userSelect = 'none';
      const move = ev => {
        const y = ev.clientY;
        const ids = orderRef.current;
        let idx = ids.length;
        for (let i = 0; i < ids.length; i++) {
          const el = document.getElementById(ids[i]);
          if (!el) continue;
          const r = el.getBoundingClientRect();
          if (y < r.top + r.height / 2) {
            idx = i;
            break;
          }
        }
        dropIdxRef.current = idx;
        setDropIdx(idx);
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        document.body.style.userSelect = '';
        const from = dragIdRef.current,
          di = dropIdxRef.current;
        dragIdRef.current = null;
        dropIdxRef.current = null;
        setDragId(null);
        setDropIdx(null);
        if (from != null && di != null) commitReorder(from, di);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    };
    const rootStyle = Object.assign({}, window.PL_themeRootStyle(theme, density, customVars), {
      minHeight: '100vh',
      position: 'relative'
    });
    const SEC_NODE = {
      top: () => h(S.Hero, {
        ctx
      }),
      story: () => h(S.Story, {
        ctx
      }),
      countdown: () => h(S.Countdown, {
        ctx
      }),
      details: () => h(S.Details, {
        ctx
      }),
      schedule: () => h(S.Schedule, {
        ctx
      }),
      travel: () => h(S.Travel, {
        ctx
      }),
      map: () => h(S.MapSection, {
        ctx
      }),
      gallery: () => h(S.Gallery, {
        ctx
      }),
      registry: () => h(S.Registry, {
        ctx
      }),
      faq: () => h(S.Faq, {
        ctx
      }),
      rsvp: () => h(S.Rsvp, {
        ctx
      })
    };
    const SEC_NAME = {
      top: 'Hero',
      story: 'Our story',
      countdown: 'Countdown',
      details: 'Details',
      schedule: 'Schedule',
      travel: 'Travel',
      map: 'Map',
      gallery: 'Gallery',
      registry: 'Registry',
      faq: 'FAQ',
      rsvp: 'RSVP'
    };
    const dropBar = k => h('div', {
      key: 'db' + k,
      'data-pl-skip': true,
      style: {
        position: 'relative',
        height: 0
      }
    }, h('div', {
      style: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: -2,
        height: 4,
        borderRadius: 3,
        background: '#C19A4B',
        boxShadow: '0 0 0 1px rgba(193,154,75,0.45), 0 2px 8px rgba(193,154,75,0.5)',
        zIndex: 60
      }
    }));
    const sec = id => {
      const selected = selId === id;
      const dragging = dragId === id;
      const handle = EMBED && editMode ? h('button', {
        'data-pl-skip': true,
        className: 'pl-sec-handle',
        onPointerDown: e => startDrag(id, e),
        onClick: e => e.stopPropagation(),
        title: 'Drag to reorder',
        style: {
          position: 'absolute',
          top: 12,
          left: 12,
          zIndex: 44,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 999,
          border: '1px solid rgba(40,28,12,0.16)',
          background: 'rgba(252,248,238,0.94)',
          WebkitBackdropFilter: 'blur(6px)',
          backdropFilter: 'blur(6px)',
          color: '#5C6B3F',
          fontSize: 10.5,
          fontWeight: 700,
          fontFamily: "'Geist Mono',ui-monospace,monospace",
          letterSpacing: '0.04em',
          cursor: 'grab',
          opacity: selected || dragging ? 1 : 0,
          transition: 'opacity .12s',
          boxShadow: '0 4px 14px -5px rgba(40,28,12,0.4)',
          touchAction: 'none'
        }
      }, '\u283F  ' + SEC_NAME[id]) : null;
      return h('div', {
        id,
        key: id + '|e' + contentEpoch,
        'data-reveal': true,
        'data-screen-label': id,
        onClick: EMBED && !PREVIEW ? () => {
          setSelId(id);
          post('pl:select', {
            id
          });
        } : undefined,
        style: EMBED ? {
          position: 'relative',
          cursor: PREVIEW || editMode ? 'default' : 'pointer',
          scrollMarginTop: 20,
          boxShadow: selected ? 'inset 0 0 0 2px var(--pl-gold, #C19A4B)' : 'none',
          transition: 'box-shadow .15s, opacity .15s',
          opacity: dragging ? 0.45 : 1
        } : undefined
      }, handle, SEC_NODE[id]());
    };
    const body = [];
    order.forEach((id, i) => {
      if (hidden[id]) return;
      if (dragId && dropIdx === i) body.push(dropBar(i));
      body.push(sec(id));
    });
    if (dragId && dropIdx === order.length) body.push(dropBar(order.length));
    return h(React.Fragment, null, h('div', {
      ref: rootRef,
      className: 'pl8-guest' + (editMode ? ' pl-edit-on' : ''),
      'data-pl-texture': texture,
      'data-pl-kit': kit,
      'data-pl-premium': premium ? 'on' : 'off',
      'data-pl-density': density,
      style: rootStyle
    }, h(S.Nav, {
      key: 'nav|e' + contentEpoch,
      ctx
    }), body, h(S.Footer, {
      key: 'foot|e' + contentEpoch,
      ctx
    })), h(RsvpModal, {
      open: rsvpOpen,
      onClose: () => setRsvpOpen(false),
      C
    }), h(PhotoPicker, {
      open: pickerSlot !== undefined,
      slot: pickerSlot,
      current: pickerSlot && images[pickerSlot] || null,
      library,
      onPick: src => {
        if (pickerSlot) onImage(pickerSlot, src);
        setPickerSlot(undefined);
      },
      onUploadFiles,
      onClear: () => {
        if (pickerSlot) onImage(pickerSlot, null);
        setPickerSlot(undefined);
      },
      onRemoveLib: removeFromLibrary,
      onClose: () => setPickerSlot(undefined)
    }), !EMBED && h(Controls, {
      theme,
      setTheme,
      texture,
      setTexture: setTextureOverride,
      density,
      setDensity,
      hero,
      setHero,
      story,
      setStory,
      kit,
      setKit,
      premium,
      setPremium,
      open: panelOpen,
      setOpen: setPanelOpen
    }));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "site-renderer/app.jsx", error: String((e && e.message) || e) }); }

// site-renderer/site.jsx
try { (() => {
/* Pearloom — published-site renderer. Faithful port of the section
   blocks + atoms from src/components/pearloom/redesign/ThemedSite.tsx
   (published mode: edit chrome / InlineEdit removed). Every section
   reads var(--t-*) so it re-skins per theme. */
(function () {
  const h = React.createElement;

  /* ─── Icons — line set used across the renderer ─────────────── */
  const PATHS = {
    calendar: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM4 9h16M8 2v4M16 2v4',
    pin: 'M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
    'arrow-right': 'M5 12h14M13 6l6 6-6 6',
    'arrow-ur': 'M7 17 17 7M9 7h8v8',
    sparkles: 'M12 3l1.8 4.7L18 9l-4.2 1.3L12 15l-1.8-4.7L6 9l4.2-1.3L12 3Z',
    users: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 5.2a3 3 0 0 1 0 5.6',
    gift: 'M20 12v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8M3 8h18v4H3V8ZM12 8v13M12 8S10.5 4 8 4a2 2 0 0 0 0 4h4ZM12 8s1.5-4 4-4a2 2 0 0 1 0 4h-4Z',
    'chev-down': 'M5 9l7 7 7-7',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2',
    camera: 'M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    phone: 'M6 3h3l1.5 5L8 9.5a12 12 0 0 0 6 6l1.5-2.5L21 14v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z'
  };
  function Icon({
    name,
    size = 16,
    color = 'currentColor'
  }) {
    if (name === 'star') {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        'aria-hidden': true,
        style: {
          display: 'block'
        }
      }, h('path', {
        d: 'M12 3.5l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 17l-5.3 2.9 1.2-6L3.4 9.8l6-.7L12 3.5Z',
        fill: color,
        stroke: 'none'
      }));
    }
    return h('svg', {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth: 1.7,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
      style: {
        display: 'block',
        flexShrink: 0
      }
    }, h('path', {
      d: PATHS[name] || PATHS.sparkles
    }));
  }

  /* ─── OliveSprig — for the 'sprig' divider ──────────────────── */
  function OliveSprig({
    size = 42
  }) {
    return h('svg', {
      width: size,
      height: size * 0.42,
      viewBox: '0 0 100 42',
      'aria-hidden': true,
      style: {
        display: 'block'
      }
    }, h('g', {
      fill: 'none',
      stroke: 'var(--t-accent)',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    }, h('path', {
      d: 'M2 21 C 30 21 64 21 96 21'
    }), [0.32, 0.52, 0.72].map((t, i) => h('g', {
      key: i
    }, h('path', {
      d: `M${2 + t * 94} 21 q -7 -8 -15 -9`
    }), h('path', {
      d: `M${2 + t * 94} 21 q -7 8 -15 9`
    }))), h('circle', {
      cx: 96,
      cy: 21,
      r: 2,
      fill: 'var(--t-gold)',
      stroke: 'none'
    })));
  }

  /* ─── KDivider — handoff/shared/kits.jsx divider variants ───── */
  function KDivider({
    look,
    width = 170,
    style = {}
  }) {
    const wrap = Object.assign({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      margin: '0 auto',
      width
    }, style);
    if (look === 'sprig') {
      return h('div', {
        className: 'pl-divider',
        style: wrap
      }, h('span', {
        style: {
          display: 'inline-flex',
          transform: 'scaleX(-1)'
        }
      }, h(OliveSprig, {
        size: 42
      })), h('span', {
        'aria-hidden': true,
        style: {
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--t-accent)',
          flexShrink: 0
        }
      }), h(OliveSprig, {
        size: 42
      }));
    }
    if (look === 'brush') {
      return h('div', {
        className: 'pl-divider',
        style: wrap
      }, h('div', {
        style: {
          width,
          height: 4,
          background: 'var(--t-accent)',
          borderRadius: 2,
          opacity: 0.6,
          transform: 'skewX(-12deg)'
        }
      }));
    }
    if (look === 'dot') {
      return h('div', {
        className: 'pl-divider',
        style: wrap
      }, h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-line)'
        }
      }), h('span', {
        style: {
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--t-accent)'
        }
      }), h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-line)'
        }
      }));
    }
    if (look === 'deckle') {
      const d = `M0 3 ${Array.from({
        length: 14
      }).map((_, i) => `L${i * width / 14 + width / 28} ${i % 2 ? 5 : 1}`).join(' ')} L${width} 3`;
      return h('div', {
        className: 'pl-divider',
        style: wrap
      }, h('svg', {
        width,
        height: 6,
        viewBox: `0 0 ${width} 6`,
        'aria-hidden': true
      }, h('path', {
        d,
        stroke: 'var(--t-line)',
        strokeWidth: 1,
        fill: 'none'
      })));
    }
    if (look === 'laurel') {
      const branch = flip => h('svg', {
        width: 46,
        height: 22,
        viewBox: '0 0 46 22',
        'aria-hidden': true,
        style: {
          display: 'block',
          transform: flip ? 'scaleX(-1)' : 'none'
        }
      }, h('g', {
        fill: 'none',
        stroke: 'var(--t-accent)',
        strokeWidth: 1.3,
        strokeLinecap: 'round'
      }, h('path', {
        d: 'M3 11 C 16 11 34 11 43 11'
      }), [0.3, 0.5, 0.7, 0.9].map((t, i) => h('path', {
        key: i,
        d: `M${3 + t * 40} 11 q 5 -6 11 -4`,
        fill: 'color-mix(in oklab, var(--t-accent) 18%, transparent)'
      })), [0.3, 0.5, 0.7, 0.9].map((t, i) => h('path', {
        key: 'b' + i,
        d: `M${3 + t * 40} 11 q 5 6 11 4`,
        fill: 'color-mix(in oklab, var(--t-accent) 18%, transparent)'
      }))));
      return h('div', {
        className: 'pl-divider',
        style: wrap
      }, branch(true), h('span', {
        'aria-hidden': true,
        style: {
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--t-gold)',
          flexShrink: 0
        }
      }), branch(false));
    }
    if (look === 'wave') {
      const seg = 22;
      const n = Math.max(4, Math.round(width / seg));
      const w = n * seg;
      let d = 'M0 5';
      for (let i = 0; i < n; i++) {
        const x = i * seg;
        d += ` Q ${x + seg / 4} 0 ${x + seg / 2} 5 T ${x + seg} 5`;
      }
      return h('div', {
        className: 'pl-divider',
        style: wrap
      }, h('svg', {
        width: w,
        height: 10,
        viewBox: `0 0 ${w} 10`,
        'aria-hidden': true
      }, h('path', {
        d,
        fill: 'none',
        stroke: 'var(--t-accent)',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        opacity: 0.7
      })));
    }
    if (look === 'chevron') {
      return h('div', {
        className: 'pl-divider',
        style: Object.assign({}, wrap, {
          gap: 5
        })
      }, h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-gold)'
        }
      }), Array.from({
        length: 3
      }).map((_, i) => h('span', {
        key: i,
        'aria-hidden': true,
        style: {
          width: 7,
          height: 7,
          borderRight: '1.5px solid var(--t-gold)',
          borderBottom: '1.5px solid var(--t-gold)',
          transform: 'rotate(-45deg)',
          flexShrink: 0
        }
      })), h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-gold)'
        }
      }));
    }
    if (look === 'ribbon') {
      return h('div', {
        className: 'pl-divider',
        style: wrap
      }, h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-line)'
        }
      }), h('svg', {
        width: 30,
        height: 18,
        viewBox: '0 0 30 18',
        'aria-hidden': true,
        style: {
          flexShrink: 0
        }
      }, h('path', {
        d: 'M15 9 L4 2 Q1 1 2 4 L8 9 L2 14 Q1 17 4 16 Z M15 9 L26 2 Q29 1 28 4 L22 9 L28 14 Q29 17 26 16 Z',
        fill: 'color-mix(in oklab, var(--t-accent) 22%, transparent)',
        stroke: 'var(--t-accent)',
        strokeWidth: 1,
        strokeLinejoin: 'round'
      }), h('circle', {
        cx: 15,
        cy: 9,
        r: 2.4,
        fill: 'var(--t-gold)'
      })), h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-line)'
        }
      }));
    }
    if (look === 'arc') {
      return h('div', {
        className: 'pl-divider',
        style: wrap
      }, h('svg', {
        width,
        height: 12,
        viewBox: `0 0 ${width} 12`,
        'aria-hidden': true
      }, h('path', {
        d: `M6 10 Q ${width / 2} -4 ${width - 6} 10`,
        fill: 'none',
        stroke: 'var(--t-accent)',
        strokeWidth: 1.3,
        opacity: 0.65
      }), h('circle', {
        cx: 6,
        cy: 10,
        r: 2.4,
        fill: 'var(--t-gold)'
      }), h('circle', {
        cx: width - 6,
        cy: 10,
        r: 2.4,
        fill: 'var(--t-gold)'
      })));
    }
    if (look === 'rays') {
      const rays = Array.from({
        length: 9
      }).map((_, i) => {
        const a = (-90 + (i - 4) * 18) * Math.PI / 180;
        const x1 = 30 + Math.cos(a) * 6,
          y1 = 22 + Math.sin(a) * 6,
          x2 = 30 + Math.cos(a) * 15,
          y2 = 22 + Math.sin(a) * 15;
        return h('line', {
          key: i,
          x1,
          y1,
          x2,
          y2,
          stroke: 'var(--t-gold)',
          strokeWidth: 1.4,
          strokeLinecap: 'round'
        });
      });
      return h('div', {
        className: 'pl-divider',
        style: wrap
      }, h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-line)'
        }
      }), h('svg', {
        width: 60,
        height: 24,
        viewBox: '0 0 60 24',
        'aria-hidden': true,
        style: {
          flexShrink: 0
        }
      }, rays, h('circle', {
        cx: 30,
        cy: 22,
        r: 3,
        fill: 'var(--t-accent)'
      })), h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-line)'
        }
      }));
    }
    if (look === 'diamond') {
      return h('div', {
        className: 'pl-divider',
        style: Object.assign({}, wrap, {
          gap: 7
        })
      }, h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-line)'
        }
      }), h('span', {
        'aria-hidden': true,
        style: {
          width: 7,
          height: 7,
          background: 'var(--t-accent)',
          transform: 'rotate(45deg)',
          flexShrink: 0
        }
      }), h('span', {
        'aria-hidden': true,
        style: {
          width: 9,
          height: 9,
          border: '1.5px solid var(--t-gold)',
          transform: 'rotate(45deg)',
          flexShrink: 0
        }
      }), h('span', {
        'aria-hidden': true,
        style: {
          width: 7,
          height: 7,
          background: 'var(--t-accent)',
          transform: 'rotate(45deg)',
          flexShrink: 0
        }
      }), h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-line)'
        }
      }));
    }
    /* ── Animated dividers (Atelier) — carry a signature motion that
         plays only when premium + motion are on; static fallback else. ── */
    if (look === 'flow') {
      const rail = () => h('div', {
        style: {
          position: 'relative',
          flex: 1,
          height: 2,
          background: 'var(--t-line)',
          overflow: 'hidden',
          borderRadius: 2
        }
      }, h('span', {
        className: 'pl-da-gleam',
        'aria-hidden': true,
        style: {
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '38%',
          background: 'linear-gradient(90deg, transparent, var(--t-gold), transparent)'
        }
      }));
      return h('div', {
        className: 'pl-divider pl-da pl-da-flow',
        style: wrap
      }, rail(), h('span', {
        'aria-hidden': true,
        style: {
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--t-gold)',
          flexShrink: 0
        }
      }), rail());
    }
    if (look === 'grow-vine') {
      return h('div', {
        className: 'pl-divider pl-da pl-da-vine',
        style: wrap
      }, h('span', {
        style: {
          display: 'inline-flex',
          transform: 'scaleX(-1)'
        }
      }, h(OliveSprig, {
        size: 46
      })), h('span', {
        'aria-hidden': true,
        style: {
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--t-accent)',
          flexShrink: 0
        }
      }), h(OliveSprig, {
        size: 46
      }));
    }
    if (look === 'tide') {
      const seg = 22;
      const n = Math.max(4, Math.round(width / seg));
      const w = n * seg;
      let d = 'M0 5';
      for (let i = 0; i < n; i++) {
        const x = i * seg;
        d += ` Q ${x + seg / 4} 0 ${x + seg / 2} 5 T ${x + seg} 5`;
      }
      return h('div', {
        className: 'pl-divider pl-da pl-da-tide',
        style: wrap
      }, h('svg', {
        width: w,
        height: 10,
        viewBox: `0 0 ${w} 10`,
        'aria-hidden': true
      }, h('path', {
        d,
        fill: 'none',
        stroke: 'var(--t-accent)',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        opacity: 0.7
      })));
    }
    if (look === 'twinkle') {
      return h('div', {
        className: 'pl-divider pl-da pl-da-twinkle',
        style: Object.assign({}, wrap, {
          gap: 9
        })
      }, h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-line)'
        }
      }), h('span', {
        className: 'pl-da-star',
        'aria-hidden': true,
        style: {
          width: 9,
          height: 9,
          background: 'var(--t-gold)',
          transform: 'rotate(45deg)',
          flexShrink: 0
        }
      }), h('div', {
        style: {
          flex: 1,
          height: 1,
          background: 'var(--t-line)'
        }
      }));
    }
    /* rule (editorial) + fallback */
    return h('div', {
      className: 'pl-divider',
      style: wrap
    }, h('div', {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--t-line)'
      }
    }), h('span', {
      style: {
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: 'var(--t-gold)'
      }
    }), h('div', {
      style: {
        flex: 1,
        height: 1,
        background: 'var(--t-line)'
      }
    }));
  }

  /* ─── MotifMark — decorative botanical/geometric ornament ───── */
  function MotifMark({
    motif,
    size = 28,
    style = {}
  }) {
    const G = {
      fill: 'none',
      stroke: 'var(--t-accent)',
      strokeWidth: 1.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round'
    };
    const leaf = 'color-mix(in oklab, var(--t-accent) 16%, transparent)';
    const key = {
      olive: 'branch',
      sprig: 'branch',
      lavender: 'lavender',
      vine: 'branch',
      bloom: 'bloom',
      pressed: 'pressed',
      fern: 'fern',
      laurel: 'laurel',
      deco: 'deco',
      sun: 'sun',
      wave: 'wave',
      breeze: 'branch',
      sunbeam: 'sun',
      tide: 'wave',
      fireflies: 'fireflies',
      'bloom-open': 'bloom'
    }[motif] || 'branch';
    const ANIM = {
      breeze: 1,
      sunbeam: 1,
      tide: 1,
      fireflies: 1,
      'bloom-open': 1
    };
    const cls = 'pl-motif pl-motif-' + key + (ANIM[motif] ? ' pl-ma pl-ma-' + motif : '');
    const svg = kids => h('svg', {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      'aria-hidden': true,
      className: cls,
      style: Object.assign({
        display: 'block'
      }, style)
    }, h('g', G, kids));
    if (key === 'branch') return svg([h('path', {
      key: 's',
      d: 'M12 22 C 12 16 12 9 12 3'
    }), [5, 9, 13].map((y, i) => h('g', {
      key: i
    }, h('path', {
      d: `M12 ${y} q -5 -1 -7 -5`,
      fill: leaf
    }), h('path', {
      d: `M12 ${y + 2} q 5 -1 7 -5`,
      fill: leaf
    })))]);
    if (key === 'lavender') return svg([h('path', {
      key: 's',
      d: 'M12 22 L12 9'
    }), [0, 1, 2, 3, 4].map(i => h('g', {
      key: i
    }, h('circle', {
      cx: 12 - 2.4,
      cy: 4 + i * 2.6,
      r: 1.5,
      fill: leaf
    }), h('circle', {
      cx: 12 + 2.4,
      cy: 5 + i * 2.6,
      r: 1.5,
      fill: leaf
    }))), h('circle', {
      key: 't',
      cx: 12,
      cy: 3,
      r: 1.6,
      fill: 'var(--t-gold)',
      stroke: 'none'
    })]);
    if (key === 'bloom') return svg([[0, 72, 144, 216, 288].map((a, i) => h('ellipse', {
      key: i,
      cx: 12,
      cy: 6.5,
      rx: 2.6,
      ry: 5,
      fill: leaf,
      transform: `rotate(${a} 12 12)`
    })), h('circle', {
      key: 'c',
      cx: 12,
      cy: 12,
      r: 2.2,
      fill: 'var(--t-gold)',
      stroke: 'none'
    })]);
    if (key === 'pressed') return svg([h('path', {
      key: 's',
      d: 'M12 22 L12 8'
    }), h('path', {
      key: 'l1',
      d: 'M12 16 q -6 0 -8 -5',
      fill: leaf
    }), h('path', {
      key: 'l2',
      d: 'M12 13 q 6 0 8 -5',
      fill: leaf
    }), h('circle', {
      key: 'b',
      cx: 12,
      cy: 6,
      r: 2.6,
      fill: leaf
    }), h('circle', {
      key: 'd',
      cx: 12,
      cy: 6,
      r: 1,
      fill: 'var(--t-gold)',
      stroke: 'none'
    })]);
    if (key === 'fern') return svg([h('path', {
      key: 's',
      d: 'M12 22 C 11 15 11 8 13 3'
    }), [6, 9, 12, 15, 18].map((y, i) => h('g', {
      key: i
    }, h('path', {
      d: `M${12 - (i - 2) * 0.3} ${y} q -4 -2 -6 -5`
    }), h('path', {
      d: `M${12 - (i - 2) * 0.3} ${y} q 4 -2 6 -5`
    })))]);
    if (key === 'laurel') return svg([h('path', {
      key: 'a',
      d: 'M5 21 C 5 13 8 6 12 3'
    }), h('path', {
      key: 'b',
      d: 'M19 21 C 19 13 16 6 12 3'
    }), [0.3, 0.55, 0.8].map((t, i) => h('g', {
      key: i
    }, h('path', {
      d: `M${5 + t * 2} ${21 - t * 16} q -4 -1 -5 -4`,
      fill: leaf
    }), h('path', {
      d: `M${19 - t * 2} ${21 - t * 16} q 4 -1 5 -4`,
      fill: leaf
    })))]);
    if (key === 'deco') return svg([[0, 1, 2, 3, 4].map(i => h('line', {
      key: i,
      x1: 12,
      y1: 21,
      x2: 12 + (i - 2) * 6,
      y2: 4 + Math.abs(i - 2) * 3,
      stroke: 'var(--t-gold)'
    })), h('path', {
      key: 'arc',
      d: 'M3 7 Q 12 -1 21 7',
      stroke: 'var(--t-gold)'
    }), h('circle', {
      key: 'c',
      cx: 12,
      cy: 21,
      r: 1.6,
      fill: 'var(--t-gold)',
      stroke: 'none'
    })]);
    if (key === 'sun') return svg([h('circle', {
      key: 'c',
      cx: 12,
      cy: 12,
      r: 4.2,
      fill: leaf
    }), Array.from({
      length: 8
    }).map((_, i) => {
      const a = i * 45 * Math.PI / 180;
      return h('line', {
        key: i,
        x1: 12 + Math.cos(a) * 7,
        y1: 12 + Math.sin(a) * 7,
        x2: 12 + Math.cos(a) * 10,
        y2: 12 + Math.sin(a) * 10,
        stroke: 'var(--t-gold)'
      });
    })]);
    if (key === 'wave') return svg([h('path', {
      key: 'w1',
      d: 'M2 9 Q 6 5 10 9 T 18 9 T 22 9'
    }), h('path', {
      key: 'w2',
      d: 'M2 15 Q 6 11 10 15 T 18 15 T 22 15',
      opacity: 0.6
    })]);
    if (key === 'fireflies') return svg([[[6, 9], [14, 6], [10, 14], [18, 13], [8, 17]].map(([x, y], i) => h('circle', {
      key: i,
      className: 'pl-ff pl-ff' + i,
      cx: x,
      cy: y,
      r: 1.7,
      fill: 'var(--t-gold)',
      stroke: 'none'
    }))]);
    return svg([h('circle', {
      cx: 12,
      cy: 12,
      r: 3,
      fill: leaf
    })]);
  }

  /* ─── PhotoPlaceholder — tone gradients (no photos yet) ─────── */
  const TONE_GRAD = {
    warm: 'linear-gradient(135deg,#E8C8A8,#D9A87E)',
    sage: 'linear-gradient(135deg,#CBD4B0,#A6B884)',
    dusk: 'linear-gradient(135deg,#B9A6C8,#8C7AA0)',
    peach: 'linear-gradient(135deg,#F0C8B8,#E0A088)',
    lavender: 'linear-gradient(135deg,#D4C4E4,#B0A0CE)',
    cream: 'linear-gradient(135deg,#F0E6D2,#E0D2B6)'
  };
  function PhotoPlaceholder({
    tone = 'warm',
    aspect = '3/4',
    style = {}
  }) {
    return h('div', {
      style: Object.assign({
        aspectRatio: aspect === 'auto' ? undefined : aspect.replace('/', ' / '),
        height: aspect === 'auto' ? '100%' : undefined,
        width: '100%',
        background: TONE_GRAD[tone] || TONE_GRAD.warm,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden'
      }, style)
    }, h('span', {
      style: {
        opacity: 0.45
      }
    }, h(Icon, {
      name: 'camera',
      size: 24,
      color: 'rgba(255,255,255,0.9)'
    })));
  }

  /* ─── ImageSlot — a fillable photo well (drop / click to set) ─── */
  function ImageSlot({
    ctx,
    slot,
    tone = 'warm',
    aspect = '3/4',
    style = {}
  }) {
    const {
      images = {},
      onSlotClick,
      onSlotDrop,
      editMode
    } = ctx || {};
    const src = images[slot];
    const [over, setOver] = React.useState(false);
    const [hot, setHot] = React.useState(false);
    const ar = aspect === 'auto' ? undefined : aspect.replace('/', ' / ');
    const editable = editMode && !!onSlotClick;
    const show = editable && (over || hot || !src);
    return h('div', {
      onClick: editable ? () => onSlotClick(slot) : undefined,
      onMouseEnter: editable ? () => setHot(true) : undefined,
      onMouseLeave: editable ? () => {
        setHot(false);
        setOver(false);
      } : undefined,
      onDragOver: editable ? e => {
        e.preventDefault();
        setOver(true);
      } : undefined,
      onDragLeave: editable ? () => setOver(false) : undefined,
      onDrop: editable ? e => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files && e.dataTransfer.files[0];
        if (f && onSlotDrop) onSlotDrop(slot, f);
      } : undefined,
      style: Object.assign({
        position: 'relative',
        aspectRatio: ar,
        height: aspect === 'auto' ? '100%' : undefined,
        width: '100%',
        background: src ? '#0e0d0b' : TONE_GRAD[tone] || TONE_GRAD.warm,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        cursor: editable ? 'pointer' : 'default'
      }, style)
    }, src ? h('img', {
      src,
      alt: '',
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block'
      }
    }) : h('span', {
      style: {
        opacity: 0.45
      }
    }, h(Icon, {
      name: 'camera',
      size: 24,
      color: 'rgba(255,255,255,0.9)'
    })), editable && h('div', {
      'aria-hidden': true,
      'data-pl-skip': true,
      style: {
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
        background: over ? 'rgba(92,107,63,0.34)' : 'transparent',
        boxShadow: over ? 'inset 0 0 0 2px #C19A4B' : src ? 'inset 0 0 0 0 transparent' : 'inset 0 0 0 1.5px rgba(255,255,255,0.5)',
        opacity: show ? 1 : 0,
        transition: 'opacity .14s, background .14s'
      }
    }, h('span', {
      style: {
        fontFamily: "'Geist Mono',ui-monospace,monospace",
        fontSize: 9.5,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        fontWeight: 700,
        color: '#fff',
        background: 'rgba(20,14,8,0.58)',
        padding: '4px 10px',
        borderRadius: 999
      }
    }, over ? 'Drop photo' : src ? 'Replace' : 'Add photo')));
  }
  function Stars({
    r
  }) {
    return h('span', {
      style: {
        display: 'inline-flex',
        gap: 1
      },
      'aria-hidden': true
    }, [0, 1, 2, 3, 4].map(i => h('span', {
      key: i,
      style: {
        opacity: i < Math.round(r) ? 1 : 0.3
      }
    }, h(Icon, {
      name: 'star',
      size: 12,
      color: 'var(--t-gold)'
    }))));
  }

  /* ─── TButton ───────────────────────────────────────────────── */
  function TButton({
    variant = 'primary',
    children,
    href,
    onClick,
    style = {}
  }) {
    const base = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '10px 22px',
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 700,
      cursor: 'pointer',
      border: 0,
      transition: 'all .18s',
      fontFamily: 'inherit',
      textDecoration: 'none',
      whiteSpace: 'nowrap'
    };
    const visual = variant === 'primary' ? {
      background: 'var(--t-ink)',
      color: 'var(--t-paper)'
    } : variant === 'outline' ? {
      background: 'transparent',
      color: 'var(--t-ink)',
      border: '1px solid var(--t-line)'
    } : {
      background: 'transparent',
      color: 'var(--t-accent-ink)',
      padding: '10px 0'
    };
    return h('a', {
      href: href || '#',
      onClick,
      style: Object.assign({}, base, visual, style)
    }, children);
  }

  /* ─── TSectionHead ──────────────────────────────────────────── */
  function TSectionHead({
    eyebrow,
    title,
    italic,
    divider = 'sprig',
    motif,
    density
  }) {
    const showMotif = motif && motif !== 'none' && density === 'generous';
    return h('div', {
      style: {
        textAlign: 'center',
        marginBottom: 26
      }
    }, showMotif && h('div', {
      'aria-hidden': true,
      style: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: 10,
        opacity: 0.7
      }
    }, h(MotifMark, {
      motif,
      size: 30
    })), h('div', {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 'var(--t-eyebrow-ls)',
        textTransform: 'uppercase',
        color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
        marginBottom: 10
      }
    }, eyebrow), h('h2', {
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: 'clamp(26px, 7vw, 40px)',
        margin: 0,
        lineHeight: 1.0,
        letterSpacing: '-0.01em',
        color: 'var(--t-ink)',
        overflowWrap: 'break-word'
      }
    }, title, italic && h('span', {
      style: {
        fontStyle: 'italic',
        fontWeight: 400,
        color: 'var(--t-accent-ink)'
      }
    }, ' ' + italic)), divider && divider !== 'none' && h('div', {
      style: {
        marginTop: 14,
        display: 'flex',
        justifyContent: 'center'
      }
    }, h(KDivider, {
      look: divider,
      width: 170
    })));
  }
  const metaRow = (C, center) => h('div', {
    style: {
      marginTop: 18,
      display: 'flex',
      gap: 22,
      justifyContent: center ? 'center' : 'flex-start',
      flexWrap: 'wrap',
      fontSize: 14,
      color: 'var(--t-ink-soft)'
    }
  }, h('span', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7
    }
  }, h(Icon, {
    name: 'calendar',
    size: 14,
    color: 'var(--t-accent)'
  }), ' ', C.meta.date), h('span', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7
    }
  }, h(Icon, {
    name: 'pin',
    size: 14,
    color: 'var(--t-accent)'
  }), ' ', C.meta.place));
  const nameLine = (C, isEditorial, sep) => h(React.Fragment, null, C.subject.a, C.subject.type === 'couple' && h('span', {
    style: {
      fontStyle: isEditorial ? 'normal' : 'italic',
      fontSize: '0.74em',
      color: 'var(--t-ink-soft)',
      margin: '0 0.18em',
      fontWeight: 400
    }
  }, isEditorial ? '×' : sep || 'and'), C.subject.type === 'couple' && C.subject.b);
  const ctaPair = (C, onRsvp) => h('div', {
    style: {
      marginTop: 20,
      display: 'flex',
      gap: 10,
      justifyContent: 'inherit',
      flexWrap: 'wrap'
    }
  }, h(TButton, {
    variant: 'primary',
    href: '#rsvp',
    onClick: onRsvp
  }, C.cta, ' ', h(Icon, {
    name: 'arrow-right',
    size: 13,
    color: 'var(--t-paper)'
  })), h(TButton, {
    variant: 'outline',
    href: '#story'
  }, C.ctaSecondary));

  /* ─── HERO variants ─────────────────────────────────────────── */
  function HeroPhotos(ctx) {
    return h('div', {
      style: {
        marginTop: 40,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 14,
        maxWidth: 940,
        marginInline: 'auto'
      }
    }, ['warm', 'lavender', 'peach', 'sage'].map((t, i) => h('div', {
      key: i,
      style: {
        aspectRatio: '3 / 4',
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 8px 22px rgba(0,0,0,0.18)'
      }
    }, h(ImageSlot, {
      ctx,
      slot: 'hero-strip-' + i,
      tone: t,
      aspect: '3/4'
    }))));
  }
  function Hero({
    ctx
  }) {
    const {
      C,
      variant,
      isEditorial,
      pad,
      onRsvp,
      dividerLook
    } = ctx;
    const eyebrow = h('div', {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 'var(--t-eyebrow-ls)',
        textTransform: 'uppercase',
        color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
        marginBottom: 8
      }
    }, C.lead);
    const tagline = C.tagline && h('div', {
      style: {
        fontFamily: 'var(--t-display)',
        fontStyle: isEditorial ? 'normal' : 'italic',
        fontSize: 19,
        color: 'var(--t-ink-soft)',
        fontWeight: isEditorial ? 600 : 400,
        marginTop: 8
      }
    }, C.tagline);
    const H1 = sz => h('h1', {
      className: 'pl8-hero-display',
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: sz,
        lineHeight: 0.96,
        margin: '12px 0 0',
        letterSpacing: isEditorial ? '-0.045em' : '-0.02em',
        color: 'var(--t-ink)',
        overflowWrap: 'break-word'
      }
    }, nameLine(C, isEditorial));
    if (variant === 'split') {
      return h('div', {
        className: 'pl8-hero-split',
        style: {
          position: 'relative',
          padding: `clamp(28px, 6vw, ${56 * pad}px) clamp(20px, 5vw, 56px)`,
          background: 'var(--t-section)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: 'clamp(24px, 4vw, 44px)',
          alignItems: 'center'
        }
      }, h('div', {
        style: {
          textAlign: 'left'
        }
      }, eyebrow, tagline, H1('clamp(32px, 9vw, calc(60px * var(--t-hero-scale)))'), metaRow(C, false), h('div', {
        style: {
          marginTop: 16
        }
      }, h(KDivider, {
        look: dividerLook,
        width: 180,
        style: {
          marginLeft: 0
        }
      })), h('div', {
        style: {
          marginTop: 20,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap'
        }
      }, h(TButton, {
        variant: 'primary',
        href: '#rsvp',
        onClick: onRsvp
      }, C.cta, ' ', h(Icon, {
        name: 'arrow-right',
        size: 13,
        color: 'var(--t-paper)'
      })), h(TButton, {
        variant: 'outline',
        href: '#story'
      }, C.ctaSecondary))), h('div', null, h(ImageSlot, {
        ctx,
        slot: 'hero-split',
        tone: 'warm',
        aspect: '3/4',
        style: {
          borderRadius: 'var(--t-radius)'
        }
      })));
    }
    if (variant === 'minimal') {
      return h('div', {
        style: {
          position: 'relative',
          padding: `${72 * pad}px 56px ${56 * pad}px`,
          background: 'var(--t-section)',
          overflow: 'hidden',
          textAlign: 'left'
        }
      }, h('div', {
        style: {
          maxWidth: 840
        }
      }, eyebrow, tagline, H1('clamp(38px, 11vw, calc(78px * var(--t-hero-scale)))'), metaRow(C, false), h('div', {
        style: {
          marginTop: 18
        }
      }, h(KDivider, {
        look: dividerLook,
        width: 200,
        style: {
          marginLeft: 0
        }
      })), h('div', {
        style: {
          marginTop: 20,
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap'
        }
      }, h(TButton, {
        variant: 'primary',
        href: '#rsvp',
        onClick: onRsvp
      }, C.cta, ' ', h(Icon, {
        name: 'arrow-right',
        size: 13,
        color: 'var(--t-paper)'
      })), h(TButton, {
        variant: 'outline',
        href: '#story'
      }, C.ctaSecondary))));
    }
    if (variant === 'fullbleed') {
      return h('div', {
        style: {
          position: 'relative',
          minHeight: 460,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
          overflow: 'hidden'
        }
      }, h('div', {
        style: {
          position: 'absolute',
          inset: 0
        }
      }, h(ImageSlot, {
        ctx,
        slot: 'hero-bg',
        tone: 'dusk',
        aspect: 'auto',
        style: {
          height: '100%'
        }
      })), h('div', {
        'aria-hidden': true,
        style: {
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.5))'
        }
      }), h('div', {
        style: {
          position: 'relative',
          color: '#fff',
          padding: '40px 24px'
        }
      }, h('div', {
        style: {
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          opacity: 0.9,
          marginBottom: 8
        }
      }, C.lead), h('h1', {
        className: 'pl8-hero-display',
        style: {
          fontFamily: 'var(--t-display)',
          fontWeight: 'var(--t-display-wght)',
          fontSize: 'clamp(38px, 11vw, calc(76px * var(--t-hero-scale)))',
          lineHeight: 0.96,
          margin: 0,
          color: '#fff',
          overflowWrap: 'break-word'
        }
      }, nameLine(C, isEditorial)), h('div', {
        style: {
          marginTop: 14,
          fontSize: 14.5,
          opacity: 0.92
        }
      }, C.meta.date + ' · ' + C.meta.place), h('div', {
        style: {
          marginTop: 22
        }
      }, h(TButton, {
        variant: 'primary',
        href: '#rsvp',
        onClick: onRsvp
      }, C.cta, ' ', h(Icon, {
        name: 'arrow-right',
        size: 13,
        color: 'var(--t-paper)'
      })))));
    }
    if (variant === 'typographic') {
      return h('div', {
        style: {
          position: 'relative',
          padding: `${78 * pad}px 48px ${60 * pad}px`,
          background: 'var(--t-section)',
          overflow: 'hidden',
          textAlign: 'center'
        }
      }, eyebrow, h('h1', {
        className: 'pl8-hero-display',
        style: {
          fontFamily: 'var(--t-display)',
          fontWeight: 'var(--t-display-wght)',
          fontSize: 'clamp(48px, 16vw, calc(108px * var(--t-hero-scale)))',
          lineHeight: 0.86,
          margin: '6px 0',
          letterSpacing: '-0.03em',
          color: 'var(--t-ink)',
          overflowWrap: 'break-word'
        }
      }, C.subject.a, C.subject.type === 'couple' && h(React.Fragment, null, h('br'), h('span', {
        style: {
          fontStyle: 'italic',
          fontWeight: 400,
          color: 'var(--t-accent-ink)'
        }
      }, isEditorial ? '×' : '&'), h('br'), C.subject.b)), metaRow(C, true), h('div', {
        style: {
          marginTop: 20,
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }
      }, h(TButton, {
        variant: 'primary',
        href: '#rsvp',
        onClick: onRsvp
      }, C.cta, ' ', h(Icon, {
        name: 'arrow-right',
        size: 13,
        color: 'var(--t-paper)'
      }))));
    }
    if (variant === 'postcard') {
      return h('div', {
        style: {
          position: 'relative',
          padding: `${48 * pad}px clamp(16px, 5vw, 40px)`,
          background: 'color-mix(in oklab, var(--t-ink) 8%, var(--t-section))',
          overflow: 'hidden'
        }
      }, h('div', {
        style: {
          maxWidth: 720,
          marginInline: 'auto',
          background: 'var(--t-paper)',
          borderRadius: 'var(--t-radius-lg)',
          boxShadow: 'var(--t-shadow)',
          border: '1px solid var(--t-line)',
          padding: `${40 * pad}px clamp(16px, 5vw, 40px)`,
          textAlign: 'center',
          position: 'relative'
        }
      }, h('div', {
        'aria-hidden': true,
        style: {
          position: 'absolute',
          inset: 10,
          border: '1px solid var(--t-line)',
          borderRadius: 'var(--t-radius)',
          pointerEvents: 'none'
        }
      }), h('div', {
        style: {
          position: 'relative'
        }
      }, eyebrow, tagline, H1('clamp(32px, 9vw, calc(58px * var(--t-hero-scale)))'), metaRow(C, true), h('div', {
        style: {
          marginTop: 16,
          display: 'flex',
          justifyContent: 'center'
        }
      }, h(KDivider, {
        look: dividerLook,
        width: 180
      })), h('div', {
        style: {
          marginTop: 20,
          display: 'flex',
          gap: 10,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }
      }, h(TButton, {
        variant: 'primary',
        href: '#rsvp',
        onClick: onRsvp
      }, C.cta, ' ', h(Icon, {
        name: 'arrow-right',
        size: 13,
        color: 'var(--t-paper)'
      })), h(TButton, {
        variant: 'outline',
        href: '#story'
      }, C.ctaSecondary)))));
    }
    /* default: centered */
    return h('div', {
      style: {
        position: 'relative',
        textAlign: 'center',
        padding: `${64 * pad}px 40px ${52 * pad}px`,
        background: 'var(--t-section)',
        overflow: 'hidden'
      }
    }, ctx.motif && ctx.motif !== 'none' && h('div', {
      'aria-hidden': true,
      style: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: ctx.motifDensity === 'generous' ? 0.1 : 0.06
      }
    }, h('div', {
      style: {
        position: 'absolute',
        top: 24,
        left: 26,
        transform: 'rotate(-12deg)'
      }
    }, h(MotifMark, {
      motif: ctx.motif,
      size: 96
    })), h('div', {
      style: {
        position: 'absolute',
        bottom: 22,
        right: 28,
        transform: 'rotate(160deg)'
      }
    }, h(MotifMark, {
      motif: ctx.motif,
      size: 110
    }))), h('div', {
      style: {
        position: 'relative',
        marginInline: 'auto'
      }
    }, eyebrow, tagline, H1('clamp(38px, 11vw, calc(74px * var(--t-hero-scale)))'), metaRow(C, true), h('div', {
      style: {
        marginTop: 16,
        display: 'flex',
        justifyContent: 'center'
      }
    }, h(KDivider, {
      look: dividerLook,
      width: 200
    })), h('div', {
      style: {
        marginTop: 20,
        display: 'flex',
        gap: 10,
        justifyContent: 'center',
        flexWrap: 'wrap'
      }
    }, h(TButton, {
      variant: 'primary',
      href: '#rsvp',
      onClick: onRsvp
    }, C.cta, ' ', h(Icon, {
      name: 'arrow-right',
      size: 13,
      color: 'var(--t-paper)'
    })), h(TButton, {
      variant: 'outline',
      href: '#story'
    }, C.ctaSecondary)), HeroPhotos(ctx)));
  }

  /* ─── STORY variants ────────────────────────────────────────── */
  function Story({
    ctx
  }) {
    const {
      C,
      storyVariant,
      isEditorial,
      pad,
      motif,
      dividerLook
    } = ctx;
    const s = C.story;
    if (storyVariant === 'stacked') {
      return h('div', {
        style: {
          padding: `${48 * pad}px clamp(20px, 6vw, 72px)`,
          textAlign: 'center',
          maxWidth: 760,
          marginInline: 'auto',
          background: 'var(--t-paper)'
        }
      }, h('div', {
        style: {
          marginInline: 'auto',
          maxWidth: 520,
          marginBottom: 26
        }
      }, h(ImageSlot, {
        ctx,
        slot: 'story-photo',
        tone: 'warm',
        aspect: '16/9',
        style: {
          borderRadius: 'var(--t-radius)'
        }
      })), h('div', {
        style: {
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 'var(--t-eyebrow-ls)',
          textTransform: 'uppercase',
          color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
          marginBottom: 10
        }
      }, s.eyebrow), h('h2', {
        style: {
          fontFamily: 'var(--t-display)',
          fontWeight: 'var(--t-display-wght)',
          fontSize: 38,
          margin: 0,
          lineHeight: 1.02,
          color: 'var(--t-ink)'
        }
      }, s.title, s.italic && h('span', {
        style: {
          fontStyle: 'italic',
          fontWeight: 400,
          color: 'var(--t-accent-ink)'
        }
      }, ' ' + s.italic)), h('p', {
        style: {
          marginTop: 16,
          fontSize: 15,
          color: 'var(--t-ink-soft)',
          lineHeight: 1.65
        }
      }, s.body));
    }
    if (storyVariant === 'quote') {
      return h('div', {
        style: {
          position: 'relative',
          padding: `${56 * pad}px clamp(20px, 6vw, 72px)`,
          textAlign: 'center',
          maxWidth: 880,
          marginInline: 'auto',
          background: 'var(--t-paper)'
        }
      }, h('div', {
        style: {
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 'var(--t-eyebrow-ls)',
          textTransform: 'uppercase',
          color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
          marginBottom: 16
        }
      }, s.eyebrow), h('blockquote', {
        style: {
          fontFamily: 'var(--t-display)',
          fontStyle: isEditorial ? 'normal' : 'italic',
          fontWeight: 'var(--t-display-wght)',
          fontSize: 28,
          lineHeight: 1.32,
          margin: 0,
          color: 'var(--t-ink)',
          letterSpacing: '-0.01em'
        }
      }, s.body), h('div', {
        style: {
          marginTop: 20,
          display: 'flex',
          justifyContent: 'center'
        }
      }, h(KDivider, {
        look: dividerLook,
        width: 160
      })));
    }
    if (storyVariant === 'letter') {
      return h('div', {
        style: {
          position: 'relative',
          padding: `${52 * pad}px clamp(16px, 5vw, 40px)`,
          background: 'var(--t-section)'
        }
      }, h('div', {
        style: {
          position: 'relative',
          maxWidth: 640,
          marginInline: 'auto',
          background: 'var(--t-paper)',
          borderRadius: 'var(--t-radius-lg)',
          boxShadow: 'var(--t-shadow)',
          border: '1px solid var(--t-line)',
          padding: '40px 46px',
          textAlign: 'center'
        }
      }, h('div', {
        style: {
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: 'var(--t-eyebrow-ls)',
          textTransform: 'uppercase',
          color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
          marginBottom: 14
        }
      }, s.eyebrow), h('p', {
        style: {
          fontFamily: 'var(--t-display)',
          fontStyle: isEditorial ? 'normal' : 'italic',
          fontSize: 19,
          color: 'var(--t-ink)',
          lineHeight: 1.6,
          textAlign: 'left'
        }
      }, s.body), h('div', {
        style: {
          fontFamily: 'var(--t-script)',
          fontSize: 30,
          color: 'var(--t-accent-ink)',
          marginTop: 14,
          textAlign: 'right'
        }
      }, C.subject.type === 'solo' ? C.subject.a : C.subject.a + ' & ' + C.subject.b)));
    }
    /* default sidebyside */
    return h('div', {
      className: 'pl8-story-sbs',
      style: {
        position: 'relative',
        padding: `${48 * pad}px clamp(20px, 6vw, 72px)`,
        display: 'grid',
        gridTemplateColumns: '0.85fr 1fr',
        gap: 'clamp(24px, 5vw, 44px)',
        alignItems: 'center',
        background: 'var(--t-paper)'
      }
    }, h('div', {
      style: {
        position: 'relative'
      }
    }, h(ImageSlot, {
      ctx,
      slot: 'story-photo',
      tone: 'warm',
      aspect: '4/5'
    })), h('div', null, h('div', {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 'var(--t-eyebrow-ls)',
        textTransform: 'uppercase',
        color: 'color-mix(in oklab, var(--t-accent-ink) 65%, var(--t-ink) 35%)',
        marginBottom: 10
      }
    }, s.eyebrow), h('h2', {
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: 38,
        margin: 0,
        lineHeight: 1.02,
        letterSpacing: '-0.01em',
        color: 'var(--t-ink)'
      }
    }, [s.title, s.italic].filter(Boolean).join(' ')), h('div', {
      style: {
        marginTop: 16,
        fontSize: 15,
        color: 'var(--t-ink-soft)',
        lineHeight: 1.65
      }
    }, s.body)));
  }

  /* ─── DETAILS (tiles) ───────────────────────────────────────── */
  function Details({
    ctx
  }) {
    const {
      C,
      pad,
      dividerLook,
      layouts
    } = ctx;
    const lay = layouts && layouts.details || 'grid';
    const head = h(TSectionHead, {
      eyebrow: C.details.eyebrow,
      title: C.details.title,
      italic: C.details.italic,
      divider: dividerLook,
      motif: ctx.motif,
      density: ctx.motifDensity
    });
    if (lay === 'list') {
      return h('div', {
        style: {
          position: 'relative',
          padding: `${44 * pad}px clamp(16px, 5vw, 40px)`,
          background: 'var(--t-section)'
        }
      }, head, h('div', {
        style: {
          maxWidth: 600,
          marginInline: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }
      }, C.details.items.map((d, i) => h('div', {
        key: i,
        className: 'pl8-card pl8-detail-card',
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 18px',
          background: 'var(--t-card)',
          borderRadius: 'var(--t-radius)',
          border: '1px solid var(--t-line-soft)'
        }
      }, h(Icon, {
        name: d.icon,
        size: 18,
        color: 'var(--t-gold)'
      }), h('div', {
        style: {
          flex: 1,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--t-ink-muted)'
        }
      }, d.l), h('div', {
        style: {
          fontFamily: 'var(--t-display)',
          fontWeight: 'var(--t-display-wght)',
          fontSize: 18,
          color: 'var(--t-ink)',
          textAlign: 'right'
        }
      }, d.v)))));
    }
    return h('div', {
      style: {
        position: 'relative',
        padding: `${44 * pad}px clamp(16px, 5vw, 40px)`,
        background: 'var(--t-section)'
      }
    }, head, h('div', {
      style: {
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 18,
        maxWidth: 760,
        marginInline: 'auto'
      }
    }, C.details.items.map((d, i) => h('div', {
      key: i,
      className: 'pl8-card pl8-detail-card',
      style: {
        background: 'var(--t-card)',
        borderRadius: 'var(--t-radius)',
        padding: 18,
        border: '1px solid var(--t-line-soft)'
      }
    }, h(Icon, {
      name: d.icon,
      size: 18,
      color: 'var(--t-gold)'
    }), h('div', {
      style: {
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--t-ink-muted)',
        marginTop: 10,
        marginBottom: 4
      }
    }, d.l), h('div', {
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: 18,
        color: 'var(--t-ink)'
      }
    }, d.v)))));
  }

  /* ─── SCHEDULE (cards) ──────────────────────────────────────── */
  function Schedule({
    ctx
  }) {
    const {
      C,
      pad,
      dividerLook,
      layouts
    } = ctx;
    const lay = layouts && layouts.schedule || 'cards';
    const head = h(TSectionHead, {
      eyebrow: C.schedule.eyebrow,
      title: C.schedule.title,
      italic: C.schedule.italic,
      divider: dividerLook,
      motif: ctx.motif,
      density: ctx.motifDensity
    });
    if (lay === 'timeline') {
      const rows = C.schedule.rows;
      return h('div', {
        style: {
          padding: `${48 * pad}px clamp(16px, 5vw, 40px)`,
          background: 'var(--t-paper)'
        }
      }, head, h('div', {
        style: {
          maxWidth: 600,
          marginInline: 'auto'
        }
      }, rows.map((r, i) => h('div', {
        key: i,
        style: {
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 16
        }
      }, h('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }
      }, h('span', {
        'aria-hidden': true,
        style: {
          width: 13,
          height: 13,
          borderRadius: '50%',
          background: 'var(--t-accent)',
          marginTop: 6,
          flexShrink: 0
        }
      }), i < rows.length - 1 && h('span', {
        'aria-hidden': true,
        style: {
          flex: 1,
          width: 2,
          background: 'var(--t-line)',
          marginTop: 4
        }
      })), h('div', {
        className: 'pl8-card pl8-schedule-row',
        style: {
          background: 'var(--t-card)',
          border: '1px solid var(--t-line-soft)',
          borderRadius: 'var(--t-radius)',
          padding: '12px 16px',
          marginBottom: 14,
          textAlign: 'left'
        }
      }, h('div', {
        style: {
          fontFamily: 'var(--t-display)',
          fontWeight: 'var(--t-display-wght)',
          fontSize: 18,
          color: 'var(--t-ink)'
        }
      }, r.t), h('div', {
        style: {
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--t-ink)',
          marginTop: 2
        }
      }, r.l), h('div', {
        style: {
          fontSize: 11.5,
          color: 'var(--t-ink-muted)',
          marginTop: 2
        }
      }, r.s))))));
    }
    return h('div', {
      style: {
        padding: `${48 * pad}px clamp(16px, 5vw, 40px)`,
        background: 'var(--t-paper)'
      }
    }, head, h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        maxWidth: 880,
        marginInline: 'auto'
      }
    }, C.schedule.rows.map((r, i) => h('div', {
      key: i,
      className: 'pl8-card pl8-schedule-row',
      style: {
        padding: 16,
        background: 'var(--t-card)',
        borderRadius: 'var(--t-radius)',
        border: '1px solid var(--t-line-soft)',
        textAlign: 'center',
        position: 'relative'
      }
    }, h('div', {
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: 20,
        color: 'var(--t-ink)'
      }
    }, r.t), h('div', {
      style: {
        fontSize: 13,
        color: 'var(--t-ink)',
        marginTop: 4,
        fontWeight: 600
      }
    }, r.l), h('div', {
      style: {
        fontSize: 11.5,
        color: 'var(--t-ink-muted)',
        marginTop: 2
      }
    }, r.s)))));
  }

  /* ─── TRAVEL (rows) ─────────────────────────────────────────── */
  function Travel({
    ctx
  }) {
    const {
      C,
      pad,
      dividerLook,
      editMode
    } = ctx;
    const hotels = C.travel && C.travel.hotels || [];
    const place = C.meta && C.meta.place || 'your venue';
    return h('div', {
      style: {
        position: 'relative',
        padding: `${48 * pad}px clamp(16px, 5vw, 40px)`,
        background: 'var(--t-section)'
      }
    }, h(TSectionHead, {
      eyebrow: C.travel.eyebrow,
      title: C.travel.title,
      italic: C.travel.italic,
      divider: dividerLook,
      motif: ctx.motif,
      density: ctx.motifDensity
    }), h('div', {
      style: {
        position: 'relative',
        maxWidth: 820,
        marginInline: 'auto'
      }
    }, hotels.length === 0 ? h('div', {
      'data-pl-skip': true,
      style: {
        textAlign: 'center',
        maxWidth: 460,
        margin: '0 auto',
        padding: '26px 24px',
        border: '1px dashed var(--t-line)',
        borderRadius: 'var(--t-radius-lg)',
        color: 'var(--t-ink-soft)'
      }
    }, h('div', {
      style: {
        fontFamily: 'var(--t-display)',
        fontStyle: 'italic',
        fontSize: 19,
        color: 'var(--t-ink)',
        marginBottom: 6
      }
    }, 'Where to stay'), h('div', {
      style: {
        fontSize: 13.5,
        lineHeight: 1.55
      }
    }, editMode ? 'Pear is gathering a few stays near ' + place + ' \u2014 or add your own in the Travel panel.' : 'Lodging details for ' + place + ' are on the way.')) : h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16
      }
    }, hotels.map((hh, i) => h('div', {
      key: i,
      className: 'pl8-card pl8-hotel-row',
      style: {
        background: 'var(--t-card)',
        borderRadius: 'var(--t-radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--t-line-soft)',
        boxShadow: 'var(--t-shadow)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }
    }, h('div', {
      style: {
        aspectRatio: '16 / 9'
      }
    }, h(ImageSlot, {
      ctx,
      slot: 'travel-' + i,
      tone: hh.tone || ['warm', 'sage', 'dusk', 'peach'][i % 4],
      aspect: '16/9'
    })), h('div', {
      style: {
        padding: 15,
        display: 'flex',
        flexDirection: 'column',
        flex: 1
      }
    }, h('div', {
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: 20,
        color: 'var(--t-ink)'
      }
    }, hh.name), hh.area && h('div', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        marginTop: 5,
        fontSize: 12.5,
        color: 'var(--t-ink-soft)'
      }
    }, h(Icon, {
      name: 'pin',
      size: 12,
      color: 'var(--t-accent)'
    }), ' ', hh.area), hh.blurb && h('div', {
      style: {
        fontSize: 13,
        color: 'var(--t-ink-soft)',
        lineHeight: 1.5,
        margin: '9px 0 12px'
      }
    }, hh.blurb), hh.link && h('a', {
      href: hh.link,
      target: '_blank',
      rel: 'noopener',
      'data-pl-skip': true,
      style: {
        marginTop: 'auto',
        alignSelf: 'flex-start',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 999,
        background: 'var(--t-accent-bg)',
        color: 'var(--t-accent-ink)',
        fontSize: 12.5,
        fontWeight: 700,
        textDecoration: 'none'
      }
    }, 'View \u2197')))))));
  }

  /* ─── MAP (styled venue map + directions) ───────────────────── */
  function MapSection({
    ctx
  }) {
    const {
      C,
      pad,
      dividerLook
    } = ctx;
    const place = C.meta && C.meta.place || '';
    const dirs = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place || 'venue');
    return h('div', {
      style: {
        position: 'relative',
        padding: `${48 * pad}px clamp(16px, 5vw, 40px)`,
        background: 'var(--t-paper)'
      }
    }, h(TSectionHead, {
      eyebrow: C.travel ? 'Getting there' : 'Where',
      title: 'Find your',
      italic: 'way',
      divider: dividerLook,
      motif: ctx.motif,
      density: ctx.motifDensity
    }), h('div', {
      style: {
        maxWidth: 720,
        marginInline: 'auto',
        borderRadius: 'var(--t-radius-lg)',
        overflow: 'hidden',
        border: '1px solid var(--t-line)',
        boxShadow: 'var(--t-shadow)',
        background: 'var(--t-card)'
      }
    }, h('div', {
      'data-pl-skip': true,
      style: {
        position: 'relative',
        height: 280,
        background: 'var(--t-section)',
        overflow: 'hidden'
      }
    }, h('svg', {
      width: '100%',
      height: '100%',
      viewBox: '0 0 600 280',
      preserveAspectRatio: 'xMidYMid slice',
      'aria-hidden': true,
      style: {
        position: 'absolute',
        inset: 0
      }
    }, h('rect', {
      x: 0,
      y: 0,
      width: 600,
      height: 280,
      fill: 'var(--t-section)'
    }), h('path', {
      d: 'M-20 200 C 120 150 180 250 320 200 S 540 150 640 190 L 640 300 L -20 300 Z',
      fill: 'color-mix(in oklab, var(--t-accent) 14%, transparent)'
    }), h('g', {
      fill: 'none',
      stroke: 'var(--t-line)',
      strokeWidth: 2
    }, h('path', {
      d: 'M-20 70 C 150 60 200 120 360 90 S 560 60 640 80'
    }), h('path', {
      d: 'M80 -10 C 70 80 140 140 110 290'
    }), h('path', {
      d: 'M420 -10 C 440 90 380 160 430 290'
    })), h('g', {
      stroke: 'color-mix(in oklab, var(--t-ink) 8%, transparent)',
      strokeWidth: 1
    }, Array.from({
      length: 7
    }).map((_, i) => h('line', {
      key: 'h' + i,
      x1: 0,
      y1: i * 44,
      x2: 600,
      y2: i * 44
    })), Array.from({
      length: 11
    }).map((_, i) => h('line', {
      key: 'v' + i,
      x1: i * 60,
      y1: 0,
      x2: i * 60,
      y2: 280
    })))), h('div', {
      style: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%,-100%)',
        textAlign: 'center'
      }
    }, h('svg', {
      width: 40,
      height: 52,
      viewBox: '0 0 40 52',
      'aria-hidden': true,
      style: {
        display: 'block',
        filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.25))'
      }
    }, h('path', {
      d: 'M20 2 C 9 2 2 11 2 21 C 2 34 20 50 20 50 C 20 50 38 34 38 21 C 38 11 31 2 20 2 Z',
      fill: 'var(--t-accent)',
      stroke: 'var(--t-paper)',
      strokeWidth: 2
    }), h('circle', {
      cx: 20,
      cy: 20,
      r: 6,
      fill: 'var(--t-paper)'
    }))), h('span', {
      'aria-hidden': true,
      style: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 24,
        height: 8,
        transform: 'translate(-50%,4px)',
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.16)',
        filter: 'blur(2px)'
      }
    })), h('div', {
      style: {
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 14,
        flexWrap: 'wrap'
      }
    }, h('div', null, h('div', {
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: 20,
        color: 'var(--t-ink)'
      }
    }, C.mapVenue || C.subject && C.subject.a + (C.subject.type === 'couple' ? ' & ' + C.subject.b : '') + '\u2019s celebration' || 'The venue'), place && h('div', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginTop: 5,
        fontSize: 13,
        color: 'var(--t-ink-soft)'
      }
    }, h(Icon, {
      name: 'pin',
      size: 13,
      color: 'var(--t-accent)'
    }), ' ', place)), h('a', {
      href: dirs,
      target: '_blank',
      rel: 'noopener',
      'data-pl-skip': true,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '11px 18px',
        borderRadius: 999,
        background: 'var(--t-rsvp)',
        color: 'var(--t-rsvp-ink)',
        fontSize: 13,
        fontWeight: 700,
        textDecoration: 'none',
        whiteSpace: 'nowrap'
      }
    }, 'Get directions \u2197'))));
  }

  /* ─── REGISTRY (pills) ──────────────────────────────────────── */
  function Registry({
    ctx
  }) {
    const {
      C,
      pad,
      dividerLook
    } = ctx;
    return h('div', {
      style: {
        padding: `${48 * pad}px clamp(16px, 5vw, 40px)`,
        textAlign: 'center',
        background: 'var(--t-paper)'
      }
    }, h(TSectionHead, {
      eyebrow: C.registry.eyebrow,
      title: C.registry.title,
      italic: C.registry.italic,
      divider: dividerLook,
      motif: ctx.motif,
      density: ctx.motifDensity
    }), h('div', {
      style: {
        fontSize: 14.5,
        color: 'var(--t-ink-soft)',
        maxWidth: 480,
        margin: '0 auto 22px',
        lineHeight: 1.6
      }
    }, C.registry.body), h('div', {
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, C.registry.stores.map((sName, i) => h('span', {
      key: i,
      style: {
        padding: '12px 22px',
        borderRadius: 'var(--t-radius)',
        background: 'var(--t-card)',
        border: '1px solid var(--t-line)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--t-ink)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }
    }, sName, h(Icon, {
      name: 'arrow-ur',
      size: 12,
      color: 'var(--t-accent-ink)'
    })))));
  }

  /* ─── GALLERY (grid) ────────────────────────────────────────── */
  function Gallery({
    ctx
  }) {
    const {
      C,
      pad,
      dividerLook,
      layouts
    } = ctx;
    const lay = layouts && layouts.gallery || 'grid';
    const head = h(TSectionHead, {
      eyebrow: C.gallery.eyebrow,
      title: C.gallery.title,
      italic: C.gallery.italic,
      divider: dividerLook,
      motif: ctx.motif,
      density: ctx.motifDensity
    });
    if (lay === 'strip') {
      return h('div', {
        style: {
          padding: `${36 * pad}px clamp(16px, 4vw, 32px)`,
          background: 'var(--t-section)'
        }
      }, head, h('div', {
        className: 'ed-scroll',
        style: {
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 8,
          maxWidth: 940,
          marginInline: 'auto'
        }
      }, C.gallery.tones.map((t, i) => h('div', {
        key: i,
        style: {
          flex: '0 0 190px'
        }
      }, h(ImageSlot, {
        ctx,
        slot: 'gallery-' + i,
        tone: t,
        aspect: '4/5',
        style: {
          borderRadius: 8
        }
      })))));
    }
    if (lay === 'mosaic') {
      return h('div', {
        style: {
          padding: `${36 * pad}px clamp(16px, 4vw, 32px)`,
          background: 'var(--t-section)'
        }
      }, head, h('div', {
        style: {
          columnCount: 3,
          columnGap: 8,
          maxWidth: 920,
          marginInline: 'auto'
        }
      }, C.gallery.tones.map((t, i) => h('div', {
        key: i,
        style: {
          breakInside: 'avoid',
          marginBottom: 8
        }
      }, h(ImageSlot, {
        ctx,
        slot: 'gallery-' + i,
        tone: t,
        aspect: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '1/1' : '4/5',
        style: {
          borderRadius: 8
        }
      })))));
    }
    return h('div', {
      style: {
        padding: `${36 * pad}px clamp(16px, 4vw, 32px)`,
        background: 'var(--t-section)'
      }
    }, head, h('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
        gap: 8,
        maxWidth: 920,
        marginInline: 'auto'
      }
    }, C.gallery.tones.map((t, i) => h(ImageSlot, {
      key: i,
      ctx,
      slot: 'gallery-' + i,
      tone: t,
      aspect: '1/1',
      style: {
        borderRadius: 8
      }
    }))));
  }

  /* ─── RSVP (centered dark plate) ────────────────────────────── */
  function Rsvp({
    ctx
  }) {
    const {
      C,
      pad,
      onRsvp
    } = ctx;
    return h('div', {
      className: 'pl8-rsvp-plate',
      style: {
        padding: `${56 * pad}px clamp(16px, 4vw, 32px)`,
        textAlign: 'center',
        background: 'var(--t-rsvp)',
        color: 'var(--t-rsvp-ink)'
      }
    }, h('div', {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 'var(--t-eyebrow-ls)',
        textTransform: 'uppercase',
        opacity: 0.6,
        marginBottom: 8,
        color: 'var(--t-rsvp-ink)'
      }
    }, C.rsvp.eyebrow), h('h2', {
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: 44,
        margin: '8px 0 6px',
        color: 'var(--t-rsvp-ink)'
      }
    }, C.rsvp.title), h('div', {
      style: {
        fontSize: 13.5,
        opacity: 0.7,
        marginBottom: 18,
        color: 'var(--t-rsvp-ink)'
      }
    }, C.rsvp.body), h('button', {
      type: 'button',
      onClick: onRsvp,
      style: {
        display: 'inline-block',
        padding: '13px 30px',
        minHeight: 44,
        borderRadius: 999,
        border: 'none',
        background: 'var(--t-rsvp-ink)',
        color: 'var(--t-rsvp)',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        fontFamily: 'var(--t-body)'
      }
    }, C.cta + ' →'));
  }

  /* ─── FAQ (accordion) ───────────────────────────────────────── */
  function Faq({
    ctx
  }) {
    const {
      C,
      pad,
      dividerLook
    } = ctx;
    const [open, setOpen] = React.useState(null);
    return h('div', {
      style: {
        padding: `${48 * pad}px clamp(16px, 4vw, 32px)`,
        background: 'var(--t-paper)'
      }
    }, h(TSectionHead, {
      eyebrow: C.faq.eyebrow,
      title: C.faq.title,
      italic: C.faq.italic,
      divider: dividerLook,
      motif: ctx.motif,
      density: ctx.motifDensity
    }), h('div', {
      style: {
        maxWidth: 640,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, C.faq.qa.map((item, i) => {
      const isOpen = open === i;
      return h('div', {
        key: i,
        className: 'pl8-card pl8-faq-row',
        style: {
          background: 'var(--t-card)',
          border: '1px solid var(--t-line-soft)',
          borderRadius: 'var(--t-radius)',
          position: 'relative'
        }
      }, h('div', {
        role: 'button',
        'aria-expanded': isOpen,
        onClick: () => setOpen(isOpen ? null : i),
        style: {
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer'
        }
      }, h('span', {
        style: {
          fontSize: 13.5,
          color: 'var(--t-ink)',
          flex: 1
        }
      }, item.q), h('span', {
        style: {
          display: 'inline-flex',
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform .2s',
          flexShrink: 0
        }
      }, h(Icon, {
        name: 'chev-down',
        size: 13,
        color: 'var(--t-ink-muted)'
      }))), isOpen && h('div', {
        style: {
          padding: '0 16px 12px'
        }
      }, h('div', {
        style: {
          fontSize: 12.5,
          color: 'var(--t-ink-soft)',
          lineHeight: 1.55
        }
      }, item.a)));
    })));
  }

  /* ─── COUNTDOWN (cards) ─────────────────────────────────────── */
  function Countdown({
    ctx
  }) {
    const {
      C,
      pad
    } = ctx;
    const target = Date.parse(C.dateISO);
    const [now, setNow] = React.useState(() => Date.now());
    React.useEffect(() => {
      const t = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(t);
    }, []);
    if (!Number.isFinite(target)) return null;
    const diff = Math.max(0, target - now);
    const p = {
      d: Math.floor(diff / 86400000),
      h: Math.floor(diff / 3600000 % 24),
      m: Math.floor(diff / 60000 % 60),
      s: Math.floor(diff / 1000 % 60)
    };
    const cell = (n, l) => h('div', {
      className: 'pl8-countdown-cell',
      style: {
        textAlign: 'center',
        minWidth: 72,
        padding: '14px 12px'
      }
    }, h('div', {
      style: {
        fontFamily: 'var(--t-display)',
        fontWeight: 'var(--t-display-wght)',
        fontSize: 'clamp(34px,6vw,52px)',
        color: 'var(--t-ink)',
        lineHeight: 1
      }
    }, String(n).padStart(2, '0')), h('div', {
      style: {
        fontSize: 10.5,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--t-ink-muted)',
        marginTop: 6
      }
    }, l));
    return h('div', {
      'data-pl-skip': true,
      style: {
        padding: `${48 * pad}px clamp(16px, 4vw, 32px)`,
        background: 'var(--t-paper)',
        textAlign: 'center'
      }
    }, h('div', {
      style: {
        fontSize: 12,
        color: 'var(--t-ink-muted)',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        marginBottom: 18
      }
    }, 'The big day'), h('div', {
      style: {
        display: 'inline-flex',
        gap: 'clamp(10px,3vw,28px)',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }
    }, cell(p.d, 'days'), cell(p.h, 'hours'), cell(p.m, 'minutes'), cell(p.s, 'seconds')));
  }

  /* ─── NAV — desktop layout variants ─────────────────────────── */
  function Nav({
    ctx
  }) {
    const {
      C,
      navItems,
      onRsvp,
      activeId,
      navVariant
    } = ctx;
    const headline = C.subject.type === 'solo' ? C.subject.a : C.subject.a + ' & ' + C.subject.b;
    const v = navVariant || 'centered';
    const link = it => h('a', {
      key: it.id,
      href: '#' + it.id,
      style: {
        fontSize: 12.5,
        color: activeId === it.id ? 'var(--t-accent-ink)' : 'var(--t-ink-soft)',
        fontFamily: 'var(--t-body)',
        textDecoration: 'none',
        borderBottom: activeId === it.id ? '1px solid var(--t-gold)' : '1px solid transparent',
        paddingBottom: 2
      }
    }, it.label);
    const rsvpBtn = style => h('button', {
      type: 'button',
      onClick: onRsvp,
      style: Object.assign({
        padding: '8px 16px',
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--t-accent-ink)',
        background: 'var(--t-accent-bg)',
        border: '1px solid var(--t-accent)',
        borderRadius: 'var(--t-radius)',
        cursor: 'pointer',
        fontFamily: 'var(--t-body)'
      }, style || {})
    }, 'RSVP');
    const wrap = {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      borderBottom: '1px solid var(--t-line-soft)',
      background: 'var(--t-paper)',
      backdropFilter: 'saturate(140%) blur(6px)',
      WebkitBackdropFilter: 'saturate(140%) blur(6px)'
    };
    const mark = (sz, fs) => h('span', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10
      }
    }, h(OliveSprig, {
      size: sz
    }), h('span', {
      style: {
        fontFamily: 'var(--t-display)',
        fontStyle: 'italic',
        fontSize: fs,
        color: 'var(--t-ink)',
        lineHeight: 1
      }
    }, headline));
    if (v === 'split') {
      return h('nav', {
        style: Object.assign({}, wrap, {
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '14px 32px'
        })
      }, h('div', {
        style: {
          flexShrink: 0
        }
      }, mark(24, 18)), h('div', {
        style: {
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          gap: 24,
          flexWrap: 'wrap'
        }
      }, navItems.map(link)), rsvpBtn({
        flexShrink: 0
      }));
    }
    if (v === 'minimal') {
      return h('nav', {
        style: Object.assign({}, wrap, {
          padding: '14px 32px',
          textAlign: 'center'
        })
      }, h('div', {
        style: {
          display: 'inline-flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 22,
          flexWrap: 'wrap'
        }
      }, navItems.map(link), h('button', {
        type: 'button',
        onClick: onRsvp,
        style: {
          fontSize: 12,
          color: 'var(--t-accent-ink)',
          fontFamily: 'var(--t-body)',
          fontWeight: 600,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer'
        }
      }, 'RSVP →')));
    }
    if (v === 'serif') {
      return h('nav', {
        style: Object.assign({}, wrap, {
          padding: '22px 40px',
          textAlign: 'center',
          borderBottom: '2px solid var(--t-accent)'
        })
      }, h('div', {
        style: {
          marginBottom: 12
        }
      }, mark(30, 28)), h('div', {
        style: {
          display: 'flex',
          justifyContent: 'center',
          gap: 18,
          flexWrap: 'wrap'
        }
      }, navItems.map(it => h('a', {
        key: it.id,
        href: '#' + it.id,
        style: {
          fontFamily: 'var(--t-mono, monospace)',
          fontSize: 10.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: activeId === it.id ? 'var(--t-accent-ink)' : 'var(--t-ink-soft)',
          textDecoration: 'none'
        }
      }, it.label))));
    }
    /* centered (default) */
    return h('nav', {
      style: Object.assign({}, wrap, {
        padding: '18px 36px 14px',
        textAlign: 'center',
        position: 'relative'
      })
    }, h('div', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: 'center'
      }
    }, mark(30, 22)), h('div', {
      style: {
        display: 'flex',
        justifyContent: 'center',
        gap: 28,
        marginTop: 12,
        flexWrap: 'wrap'
      }
    }, navItems.map(link)), rsvpBtn({
      position: 'absolute',
      right: 36,
      top: 18
    }));
  }
  function Footer({
    ctx
  }) {
    const {
      C,
      footerVariant
    } = ctx;
    const headline = C.subject.type === 'solo' ? C.subject.a : C.subject.a + ' & ' + C.subject.b;
    const v = footerVariant || 'signature';
    if (v === 'minimal') {
      return h('footer', {
        style: {
          padding: '26px 24px',
          textAlign: 'center',
          background: 'var(--t-paper)',
          borderTop: '1px solid var(--t-line-soft)',
          fontSize: 12,
          color: 'var(--t-ink-muted)'
        }
      }, h('span', {
        style: {
          fontFamily: 'var(--t-display)',
          fontStyle: 'italic',
          color: 'var(--t-ink)',
          fontSize: 15
        }
      }, headline), ' · ', C.meta.date, ' · Made with Pearloom');
    }
    if (v === 'columns') {
      return h('footer', {
        style: {
          padding: '36px 40px',
          background: 'var(--t-paper)',
          borderTop: '1px solid var(--t-line-soft)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 18
        }
      }, h('div', null, h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 9
        }
      }, h(OliveSprig, {
        size: 26
      }), h('span', {
        style: {
          fontFamily: 'var(--t-display)',
          fontStyle: 'italic',
          fontSize: 20,
          color: 'var(--t-ink)'
        }
      }, headline)), h('div', {
        style: {
          fontSize: 11.5,
          color: 'var(--t-ink-muted)',
          marginTop: 6,
          letterSpacing: '0.06em'
        }
      }, C.meta.date + ' · ' + C.meta.place)), h('div', {
        style: {
          display: 'flex',
          gap: 22,
          flexWrap: 'wrap'
        }
      }, ctx.navItems.map(it => h('a', {
        key: it.id,
        href: '#' + it.id,
        style: {
          fontSize: 12,
          color: 'var(--t-ink-soft)',
          textDecoration: 'none',
          fontFamily: 'var(--t-body)'
        }
      }, it.label))));
    }
    /* signature (default) */
    return h('footer', {
      style: {
        padding: '40px 24px 48px',
        textAlign: 'center',
        background: 'var(--t-paper)',
        borderTop: '1px solid var(--t-line-soft)'
      }
    }, h('div', {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10
      }
    }, h(OliveSprig, {
      size: 28
    })), h('div', {
      style: {
        fontFamily: 'var(--t-display)',
        fontStyle: 'italic',
        fontSize: 20,
        color: 'var(--t-ink)'
      }
    }, headline), h('div', {
      style: {
        fontSize: 12,
        color: 'var(--t-ink-muted)',
        marginTop: 8,
        letterSpacing: '0.08em'
      }
    }, C.meta.date + ' · ' + C.meta.place), h('div', {
      style: {
        fontSize: 10.5,
        color: 'var(--t-ink-muted)',
        marginTop: 18,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        opacity: 0.7
      }
    }, 'Made with Pearloom'));
  }

  /* ─── buildCopy — default wedding content (classic voice) ───── */
  function buildCopy(names, meta) {
    return {
      subject: {
        type: 'couple',
        a: names[0],
        b: names[1]
      },
      lead: 'Save the date',
      tagline: 'together, at last',
      cta: 'RSVP',
      ctaSecondary: 'Learn more',
      meta,
      dateISO: meta.dateISO,
      story: {
        eyebrow: 'Our story',
        title: 'How we',
        italic: 'met',
        body: 'We met on an ordinary Tuesday and spent the evening arguing, fondly, about whether olives belong on pizza. Ten years later, we would be honoured to have you with us as we marry — there is no story we would rather tell, and no one we would rather tell it to.'
      },
      details: {
        eyebrow: 'The fine print',
        title: 'Everything you',
        italic: 'should know',
        items: [{
          l: 'Dress code',
          v: 'Garden formal',
          icon: 'sparkles'
        }, {
          l: 'Kids welcome',
          v: 'Ages 10 +',
          icon: 'users'
        }, {
          l: 'Gifts',
          v: 'Your presence is enough',
          icon: 'gift'
        }]
      },
      schedule: {
        eyebrow: 'The day',
        title: 'In',
        italic: 'moments',
        rows: [{
          t: '4:30 pm',
          l: 'Ceremony',
          s: 'Olive grove'
        }, {
          t: '5:30 pm',
          l: 'Cocktails',
          s: 'Terrace bar'
        }, {
          t: '7:00 pm',
          l: 'Dinner',
          s: 'Long table'
        }, {
          t: '9:00 pm',
          l: 'Dancing',
          s: 'Until late'
        }]
      },
      travel: {
        eyebrow: 'Getting there',
        title: 'Where to',
        italic: 'stay',
        hotels: [{
          name: 'Cosmos Suites',
          price: '$$$',
          rating: 4.8,
          reviews: 412,
          dist: '8-min walk',
          tone: 'warm',
          blurb: 'Whitewashed cliffside suites with private plunge pools and sunset terraces.',
          amenities: ['Caldera view', 'Pool', 'Breakfast']
        }, {
          name: 'Andronis Boutique',
          price: '$$$$',
          rating: 4.9,
          reviews: 286,
          dist: '12-min walk',
          tone: 'lavender',
          blurb: 'A romantic cliff retreat carved into the caldera — a guest favourite.',
          amenities: ['Spa', 'Infinity pool', 'Fine dining']
        }]
      },
      registry: {
        eyebrow: 'Registry',
        title: 'Your presence is',
        italic: 'the gift',
        body: "If you'd like to celebrate further, we've put a few things together.",
        stores: ['Honeymoon fund', 'Crate & Barrel', 'Zola']
      },
      gallery: {
        eyebrow: 'Gallery',
        title: 'A few',
        italic: 'favorites',
        tones: ['warm', 'sage', 'dusk', 'peach', 'lavender', 'cream', 'warm', 'sage', 'dusk', 'peach', 'lavender', 'cream']
      },
      rsvp: {
        eyebrow: 'RSVP by August 8',
        title: 'Save your seat',
        body: 'It takes about 90 seconds. Pear will follow up if anyone forgets.'
      },
      faq: {
        eyebrow: 'Questions & answers',
        title: 'The',
        italic: 'little things',
        qa: [{
          q: "What's the dress code, really?",
          a: 'Garden formal — think linen suits and tea-length dresses. The ceremony is on grass, so consider your heels.'
        }, {
          q: 'Can I bring a plus-one?',
          a: 'If your invitation names a guest, absolutely. If you are flying solo, you will be in great company.'
        }, {
          q: 'Are kids welcome at the ceremony?',
          a: 'Little ones aged ten and up are warmly welcome for the whole evening.'
        }, {
          q: 'Where should we stay?',
          a: 'We have blocked rooms at Cosmos Suites and Andronis Boutique — both a short walk from the venue.'
        }]
      }
    };
  }
  window.PearSite = {
    buildCopy,
    Nav,
    Hero,
    Story,
    Details,
    Schedule,
    Travel,
    MapSection,
    Registry,
    Gallery,
    Rsvp,
    Faq,
    Countdown,
    Footer,
    Icon,
    OliveSprig,
    ImageSlot,
    PhotoPlaceholder
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "site-renderer/site.jsx", error: String((e && e.message) || e) }); }

// site-renderer/themes.js
try { (() => {
/* Pearloom — theme catalog. LITERAL PORT of
   src/components/pearloom/site/themes.ts (THEMES + themeRootStyle).
   Each theme is a complete --t-* token bag: palette + material
   texture + type pairing + radii + shadows. */

window.PL_THEMES = [{
  id: 'santorini',
  name: 'Santorini Linen',
  blurb: 'Sun-bleached linen, Aegean blue, whitewash & olive.',
  swatches: ['#3F6E92', '#283D4E', '#C2A165', '#EDE7DA'],
  texture: 'linen',
  motif: 'olive',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'sprig',
    photo: 'arch',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#F5F1E8',
    '--t-section': '#EDE7DA',
    '--t-card': '#FBF9F3',
    '--t-ink': '#283D4E',
    '--t-ink-soft': '#4A6076',
    '--t-ink-muted': '#8A9AA6',
    '--t-accent': '#3F6E92',
    '--t-accent-2': '#7C9BB0',
    '--t-accent-bg': '#E2EAEF',
    '--t-accent-ink': '#2C5571',
    '--t-gold': '#C2A165',
    '--t-line': 'rgba(40,61,78,0.16)',
    '--t-line-soft': 'rgba(40,61,78,0.08)',
    '--t-rsvp': '#283D4E',
    '--t-rsvp-ink': '#F5F1E8',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '5px',
    '--t-radius-lg': '8px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.18',
    '--t-eyebrow-ls': '0.2em',
    '--t-shadow': '0 1px 0 rgba(40,61,78,0.05)'
  }
}, {
  id: 'tuscan',
  name: 'Tuscan Watercolor',
  blurb: 'Soft washes, terracotta & sage, blooms and lemons.',
  swatches: ['#C2693E', '#8A9A6B', '#C99A4E', '#F4E3D3'],
  texture: 'watercolor',
  motif: 'bloom',
  look: {
    card: 'wash',
    button: 'pill',
    divider: 'brush',
    photo: 'tape',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FBF6EC',
    '--t-section': '#F6ECDC',
    '--t-card': '#FFFCF5',
    '--t-ink': '#4B3D2A',
    '--t-ink-soft': '#6E5B43',
    '--t-ink-muted': '#A0907A',
    '--t-accent': '#C2693E',
    '--t-accent-2': '#D89A6A',
    '--t-accent-bg': '#F4E3D3',
    '--t-accent-ink': '#A4502A',
    '--t-gold': '#C99A4E',
    '--t-line': 'rgba(75,61,42,0.15)',
    '--t-line-soft': 'rgba(75,61,42,0.08)',
    '--t-rsvp': '#4B3D2A',
    '--t-rsvp-ink': '#FBF6EC',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '16px',
    '--t-radius-lg': '24px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.14em',
    '--t-shadow': '0 14px 30px rgba(75,61,42,0.10)'
  }
}, {
  id: 'garden',
  name: 'Pressed Garden',
  blurb: 'Cotton paper, pressed wildflowers, the Pearloom warmth.',
  swatches: ['#B7A4D0', '#8B9C5A', '#EAB286', '#F3E9D4'],
  texture: 'paper',
  motif: 'pressed',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'dot',
    photo: 'polaroid',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FDFAF0',
    '--t-section': '#F3E9D4',
    '--t-card': '#FFFEF7',
    '--t-ink': '#3D4A1F',
    '--t-ink-soft': '#566438',
    '--t-ink-muted': '#8A8671',
    '--t-accent': '#B7A4D0',
    '--t-accent-2': '#C4B5D9',
    '--t-accent-bg': '#E8E0F0',
    '--t-accent-ink': '#6B5A8C',
    '--t-gold': '#C19A4B',
    '--t-line': 'rgba(61,74,31,0.14)',
    '--t-line-soft': 'rgba(61,74,31,0.08)',
    '--t-rsvp': '#3D4A1F',
    '--t-rsvp-ink': '#F8F1E4',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.14em',
    '--t-shadow': '0 8px 22px rgba(61,74,31,0.08)'
  }
}, {
  id: 'editorial',
  name: 'Modern Editorial',
  blurb: 'Flat matte, high-contrast type. The clean counterpoint.',
  swatches: ['#1A1A17', '#B08940', '#E9E7E0', '#F4F3EF'],
  texture: 'none',
  motif: 'none',
  look: {
    card: 'flat',
    button: 'sharp',
    divider: 'rule',
    photo: 'clean',
    heroAlign: 'left',
    motifDensity: 'none'
  },
  vars: {
    '--t-paper': '#F4F3EF',
    '--t-section': '#EAE8E1',
    '--t-card': '#FBFAF7',
    '--t-ink': '#1A1A17',
    '--t-ink-soft': '#46453E',
    '--t-ink-muted': '#8A8980',
    '--t-accent': '#1A1A17',
    '--t-accent-2': '#B08940',
    '--t-accent-bg': '#E9E7E0',
    '--t-accent-ink': '#1A1A17',
    '--t-gold': '#B08940',
    '--t-line': 'rgba(26,26,23,0.16)',
    '--t-line-soft': 'rgba(26,26,23,0.08)',
    '--t-rsvp': '#1A1A17',
    '--t-rsvp-ink': '#F4F3EF',
    '--t-display': "'Inter', sans-serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Inter', sans-serif",
    '--t-radius': '2px',
    '--t-radius-lg': '3px',
    '--t-display-wght': '800',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.24em',
    '--t-shadow': 'none'
  }
}, {
  id: 'midnight',
  name: 'Midnight Velvet',
  blurb: 'Inky velvet, candlelight gold — made for evenings.',
  swatches: ['#1A1B2E', '#C9A24B', '#B9A6E0', '#262842'],
  dark: true,
  foil: true,
  texture: 'velvet',
  motif: 'pressed',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'dot',
    photo: 'clean',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#1A1B2E',
    '--t-section': '#20223A',
    '--t-card': '#262842',
    '--t-ink': '#F1EBDD',
    '--t-ink-soft': '#C4BDD0',
    '--t-ink-muted': '#8B86A0',
    '--t-accent': '#B9A6E0',
    '--t-accent-2': '#C9A24B',
    '--t-accent-bg': '#2E2C50',
    '--t-accent-ink': '#D9C9F0',
    '--t-gold': '#C9A24B',
    '--t-line': 'rgba(241,235,221,0.16)',
    '--t-line-soft': 'rgba(241,235,221,0.09)',
    '--t-rsvp': '#C9A24B',
    '--t-rsvp-ink': '#1A1B2E',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '12px',
    '--t-radius-lg': '18px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1.08',
    '--t-eyebrow-ls': '0.18em',
    '--t-shadow': '0 16px 40px rgba(0,0,0,0.40)'
  }
}, {
  id: 'coastal',
  name: 'Coastal Ink',
  blurb: 'Deckled paper, navy ink line-work, sea-glass calm.',
  swatches: ['#2C5E7A', '#1F3A4D', '#C9B89A', '#E8E4D6'],
  texture: 'cotton',
  motif: 'none',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'deckle',
    photo: 'deckle',
    heroAlign: 'center',
    motifDensity: 'none'
  },
  vars: {
    '--t-paper': '#EAE5D7',
    '--t-section': '#E0DAC8',
    '--t-card': '#F4F0E4',
    '--t-ink': '#1F3A4D',
    '--t-ink-soft': '#3E5B6E',
    '--t-ink-muted': '#82929E',
    '--t-accent': '#2C5E7A',
    '--t-accent-2': '#6E93A8',
    '--t-accent-bg': '#DCE5E7',
    '--t-accent-ink': '#1F4254',
    '--t-gold': '#B89A5E',
    '--t-line': 'rgba(31,58,77,0.18)',
    '--t-line-soft': 'rgba(31,58,77,0.09)',
    '--t-rsvp': '#1F3A4D',
    '--t-rsvp-ink': '#EAE5D7',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '2px',
    '--t-radius-lg': '3px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.22em',
    '--t-shadow': '0 1px 0 rgba(31,58,77,0.06)'
  }
}, {
  id: 'amalfi',
  name: 'Amalfi Citrus',
  blurb: 'Sun-bleached blue, lemon and terracotta — a coastal supper.',
  swatches: ['#2E6B8A', '#C6703D', '#D9B44A', '#FBF6EA'],
  texture: 'linen',
  motif: 'bloom',
  look: {
    card: 'frame',
    button: 'pill',
    divider: 'sprig',
    photo: 'arch',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FBF6EA',
    '--t-section': '#F1E7D4',
    '--t-card': '#FFFCF4',
    '--t-ink': '#1A2A33',
    '--t-ink-soft': '#3C5560',
    '--t-ink-muted': '#7E8E96',
    '--t-accent': '#2E6B8A',
    '--t-accent-2': '#5E94AD',
    '--t-accent-bg': '#E2EAEF',
    '--t-accent-ink': '#235874',
    '--t-gold': '#D9B44A',
    '--t-line': 'rgba(26,42,51,0.16)',
    '--t-line-soft': 'rgba(26,42,51,0.08)',
    '--t-rsvp': '#C6703D',
    '--t-rsvp-ink': '#FBF6EA',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1.06',
    '--t-eyebrow-ls': '0.16em',
    '--t-shadow': '0 10px 26px rgba(26,42,51,0.10)'
  }
}, {
  id: 'first-light',
  name: 'First Light',
  blurb: 'Dawn rose and gold — the morning after, every year after.',
  swatches: ['#C6563D', '#C19A4B', '#D9A89E', '#FCF4EE'],
  texture: 'paper',
  motif: 'pressed',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'dot',
    photo: 'polaroid',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#FCF4EE',
    '--t-section': '#F6E4DA',
    '--t-card': '#FFFBF7',
    '--t-ink': '#3A2A2A',
    '--t-ink-soft': '#5E4742',
    '--t-ink-muted': '#9C8780',
    '--t-accent': '#C6563D',
    '--t-accent-2': '#D9897A',
    '--t-accent-bg': '#F6DDD4',
    '--t-accent-ink': '#A63F2A',
    '--t-gold': '#C19A4B',
    '--t-line': 'rgba(58,42,42,0.14)',
    '--t-line-soft': 'rgba(58,42,42,0.07)',
    '--t-rsvp': '#C6563D',
    '--t-rsvp-ink': '#FCF4EE',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.14em',
    '--t-shadow': '0 8px 22px rgba(58,42,42,0.09)'
  }
}, {
  id: 'deco-gilt',
  name: 'Deco Gilt',
  blurb: 'Jazz-age geometry — ink, gilt and a hard-edged fan.',
  swatches: ['#14110C', '#C9A24B', '#7C8A6A', '#F3ECD9'],
  dark: true,
  foil: true,
  texture: 'velvet',
  motif: 'none',
  look: {
    card: 'flat',
    button: 'sharp',
    divider: 'rule',
    photo: 'clean',
    heroAlign: 'left',
    motifDensity: 'none'
  },
  vars: {
    '--t-paper': '#14110C',
    '--t-section': '#1C1810',
    '--t-card': '#211C13',
    '--t-ink': '#F3ECD9',
    '--t-ink-soft': '#C9C0A8',
    '--t-ink-muted': '#8A8266',
    '--t-accent': '#C9A24B',
    '--t-accent-2': '#7C8A6A',
    '--t-accent-bg': '#2A2416',
    '--t-accent-ink': '#E6C977',
    '--t-gold': '#C9A24B',
    '--t-line': 'rgba(243,236,217,0.16)',
    '--t-line-soft': 'rgba(243,236,217,0.08)',
    '--t-rsvp': '#C9A24B',
    '--t-rsvp-ink': '#14110C',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist Mono', ui-monospace, monospace",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '1px',
    '--t-radius-lg': '2px',
    '--t-display-wght': '700',
    '--t-hero-scale': '1.1',
    '--t-eyebrow-ls': '0.3em',
    '--t-shadow': '0 16px 40px rgba(0,0,0,0.45)'
  }
}, {
  id: 'tide-coast',
  name: 'Tide & Coast',
  blurb: 'Fog, driftwood and rope — an unhurried seaside vow.',
  swatches: ['#5E7A82', '#C8BFA5', '#9DB0B2', '#F2F1EC'],
  texture: 'cotton',
  motif: 'none',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'deckle',
    photo: 'deckle',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#F2F1EC',
    '--t-section': '#E6E5DD',
    '--t-card': '#FAFAF6',
    '--t-ink': '#2C353A',
    '--t-ink-soft': '#4E5A60',
    '--t-ink-muted': '#8B969B',
    '--t-accent': '#5E7A82',
    '--t-accent-2': '#9DB0B2',
    '--t-accent-bg': '#DEE5E5',
    '--t-accent-ink': '#46626A',
    '--t-gold': '#B8A580',
    '--t-line': 'rgba(44,53,58,0.16)',
    '--t-line-soft': 'rgba(44,53,58,0.08)',
    '--t-rsvp': '#2C353A',
    '--t-rsvp-ink': '#F2F1EC',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '3px',
    '--t-radius-lg': '5px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.2em',
    '--t-shadow': '0 1px 0 rgba(44,53,58,0.06)'
  }
}, /* ═══════════ ATELIER COLLECTION — premium themes ═══════════ */
{
  id: 'provence',
  name: 'Provence Lavender',
  blurb: 'Lavender rows, warm stone and a laurel hush — Aix in June.',
  swatches: ['#7C6AA6', '#3B3550', '#C2A165', '#ECE6DC'],
  texture: 'linen',
  motif: 'lavender',
  look: {
    card: 'frame',
    button: 'pill',
    divider: 'laurel',
    photo: 'arch',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#F6F2EC',
    '--t-section': '#ECE6DC',
    '--t-card': '#FCFAF4',
    '--t-ink': '#3B3550',
    '--t-ink-soft': '#5C5470',
    '--t-ink-muted': '#928BA4',
    '--t-accent': '#7C6AA6',
    '--t-accent-2': '#A99BC8',
    '--t-accent-bg': '#E7E1F0',
    '--t-accent-ink': '#5E4E86',
    '--t-gold': '#C2A165',
    '--t-line': 'rgba(59,53,80,0.15)',
    '--t-line-soft': 'rgba(59,53,80,0.08)',
    '--t-rsvp': '#3B3550',
    '--t-rsvp-ink': '#F6F2EC',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '8px',
    '--t-radius-lg': '14px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.14',
    '--t-eyebrow-ls': '0.2em',
    '--t-shadow': '0 10px 26px rgba(59,53,80,0.10)'
  }
}, {
  id: 'botanical',
  name: 'Botanical Press',
  blurb: 'Deep herbarium green, pressed ferns between cotton leaves.',
  swatches: ['#3C5A40', '#243A28', '#C2A04E', '#EEEAD9'],
  texture: 'paper',
  motif: 'fern',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'laurel',
    photo: 'polaroid',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#F1EEDE',
    '--t-section': '#E6E2CE',
    '--t-card': '#F8F6EC',
    '--t-ink': '#243A28',
    '--t-ink-soft': '#42583F',
    '--t-ink-muted': '#7E8C74',
    '--t-accent': '#3C5A40',
    '--t-accent-2': '#6E8A66',
    '--t-accent-bg': '#DDE5D4',
    '--t-accent-ink': '#2E4A32',
    '--t-gold': '#C2A04E',
    '--t-line': 'rgba(36,58,40,0.16)',
    '--t-line-soft': 'rgba(36,58,40,0.08)',
    '--t-rsvp': '#243A28',
    '--t-rsvp-ink': '#F1EEDE',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '4px',
    '--t-radius-lg': '7px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1.1',
    '--t-eyebrow-ls': '0.22em',
    '--t-shadow': '0 6px 18px rgba(36,58,40,0.10)'
  }
}, {
  id: 'gilded-noir',
  name: 'Gilded Noir',
  blurb: 'Black tie after dark — onyx velvet struck with champagne gold.',
  swatches: ['#0E0C0A', '#D8B26A', '#9C8552', '#1A1712'],
  dark: true,
  foil: true,
  texture: 'velvet',
  motif: 'deco',
  look: {
    card: 'flat',
    button: 'sharp',
    divider: 'chevron',
    photo: 'clean',
    heroAlign: 'left',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#0E0C0A',
    '--t-section': '#16130E',
    '--t-card': '#1C1812',
    '--t-ink': '#F4ECDA',
    '--t-ink-soft': '#C9BD9F',
    '--t-ink-muted': '#988B6E',
    '--t-accent': '#D8B26A',
    '--t-accent-2': '#E8D29A',
    '--t-accent-bg': '#2A2417',
    '--t-accent-ink': '#E8CE92',
    '--t-gold': '#D8B26A',
    '--t-line': 'rgba(216,178,106,0.22)',
    '--t-line-soft': 'rgba(216,178,106,0.10)',
    '--t-rsvp': '#D8B26A',
    '--t-rsvp-ink': '#0E0C0A',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist Mono', ui-monospace, monospace",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '1px',
    '--t-radius-lg': '2px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.16',
    '--t-eyebrow-ls': '0.32em',
    '--t-shadow': '0 18px 44px rgba(0,0,0,0.5)'
  }
}, {
  id: 'blush-atelier',
  name: 'Blush Atelier',
  blurb: 'Powder blush and rose-gold — a couture fitting in soft light.',
  swatches: ['#C77F8E', '#5A3340', '#C9A05E', '#F7ECEC'],
  texture: 'silk',
  motif: 'bloom',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'ribbon',
    photo: 'arch',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FBF3F2',
    '--t-section': '#F5E6E5',
    '--t-card': '#FFFAF9',
    '--t-ink': '#5A3340',
    '--t-ink-soft': '#7C5060',
    '--t-ink-muted': '#A98390',
    '--t-accent': '#C77F8E',
    '--t-accent-2': '#DFA9B3',
    '--t-accent-bg': '#F4E0E2',
    '--t-accent-ink': '#A85E6E',
    '--t-gold': '#C9A05E',
    '--t-line': 'rgba(90,51,64,0.14)',
    '--t-line-soft': 'rgba(90,51,64,0.07)',
    '--t-rsvp': '#5A3340',
    '--t-rsvp-ink': '#FBF3F2',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Dancing Script', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.18em',
    '--t-shadow': '0 14px 34px rgba(90,51,64,0.12)'
  }
}, {
  id: 'sage-marble',
  name: 'Sage & Marble',
  blurb: 'Veined marble, sage and a quiet laurel — a sculpted calm.',
  swatches: ['#6E8169', '#33402F', '#B8A878', '#EFEDE6'],
  texture: 'marble',
  motif: 'laurel',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'arc',
    photo: 'clean',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#F1EFE8',
    '--t-section': '#E7E5DB',
    '--t-card': '#FAF9F4',
    '--t-ink': '#33402F',
    '--t-ink-soft': '#52604C',
    '--t-ink-muted': '#8B9683',
    '--t-accent': '#6E8169',
    '--t-accent-2': '#9AAA92',
    '--t-accent-bg': '#E0E4D8',
    '--t-accent-ink': '#536650',
    '--t-gold': '#B8A878',
    '--t-line': 'rgba(51,64,47,0.15)',
    '--t-line-soft': 'rgba(51,64,47,0.08)',
    '--t-rsvp': '#33402F',
    '--t-rsvp-ink': '#F1EFE8',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '3px',
    '--t-radius-lg': '6px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.15',
    '--t-eyebrow-ls': '0.24em',
    '--t-shadow': '0 8px 24px rgba(51,64,47,0.09)'
  }
}, {
  id: 'terracotta-sun',
  name: 'Terracotta Sun',
  blurb: 'Warm clay, ochre and a low sun — a courtyard at golden hour.',
  swatches: ['#C2673B', '#5A2E1B', '#D29B3F', '#F6E9DA'],
  texture: 'cotton',
  motif: 'sun',
  look: {
    card: 'wash',
    button: 'pill',
    divider: 'rays',
    photo: 'tape',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FAEEDF',
    '--t-section': '#F2E0CC',
    '--t-card': '#FFF8EF',
    '--t-ink': '#5A2E1B',
    '--t-ink-soft': '#7E4C32',
    '--t-ink-muted': '#A87E62',
    '--t-accent': '#C2673B',
    '--t-accent-2': '#DB9460',
    '--t-accent-bg': '#F4DCC6',
    '--t-accent-ink': '#A2502A',
    '--t-gold': '#D29B3F',
    '--t-line': 'rgba(90,46,27,0.15)',
    '--t-line-soft': 'rgba(90,46,27,0.08)',
    '--t-rsvp': '#5A2E1B',
    '--t-rsvp-ink': '#FAEEDF',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '12px',
    '--t-radius-lg': '20px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1.1',
    '--t-eyebrow-ls': '0.16em',
    '--t-shadow': '0 12px 28px rgba(90,46,27,0.12)'
  }
}, {
  id: 'ink-botanical',
  name: 'Ink Botanical',
  blurb: 'Navy line-work ferns on sea-cotton — an engraver\u2019s garden.',
  swatches: ['#26415A', '#16283A', '#B79A5E', '#E9E6DB'],
  texture: 'cotton',
  motif: 'fern',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'wave',
    photo: 'deckle',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#ECE9DE',
    '--t-section': '#E2DFD1',
    '--t-card': '#F6F4EA',
    '--t-ink': '#16283A',
    '--t-ink-soft': '#35495E',
    '--t-ink-muted': '#73849A',
    '--t-accent': '#26415A',
    '--t-accent-2': '#5E7790',
    '--t-accent-bg': '#D8E0E8',
    '--t-accent-ink': '#1E3650',
    '--t-gold': '#B79A5E',
    '--t-line': 'rgba(22,40,58,0.16)',
    '--t-line-soft': 'rgba(22,40,58,0.08)',
    '--t-rsvp': '#16283A',
    '--t-rsvp-ink': '#ECE9DE',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '3px',
    '--t-radius-lg': '5px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.22em',
    '--t-shadow': '0 1px 0 rgba(22,40,58,0.06)'
  }
}, {
  id: 'champagne-deco',
  name: 'Champagne Deco',
  blurb: 'Cream and gilt geometry — a Gatsby parlor at half past ten.',
  swatches: ['#B89248', '#2A2418', '#8A7038', '#F4EEDD'],
  texture: 'none',
  motif: 'deco',
  look: {
    card: 'flat',
    button: 'sharp',
    divider: 'chevron',
    photo: 'clean',
    heroAlign: 'left',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#F4EEDD',
    '--t-section': '#ECE4CF',
    '--t-card': '#FBF7EA',
    '--t-ink': '#2A2418',
    '--t-ink-soft': '#4C4330',
    '--t-ink-muted': '#8A7E62',
    '--t-accent': '#B89248',
    '--t-accent-2': '#D2B878',
    '--t-accent-bg': '#EBE0C4',
    '--t-accent-ink': '#917130',
    '--t-gold': '#B89248',
    '--t-line': 'rgba(42,36,24,0.16)',
    '--t-line-soft': 'rgba(42,36,24,0.08)',
    '--t-rsvp': '#2A2418',
    '--t-rsvp-ink': '#F4EEDD',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist Mono', ui-monospace, monospace",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '1px',
    '--t-radius-lg': '2px',
    '--t-display-wght': '700',
    '--t-hero-scale': '1.14',
    '--t-eyebrow-ls': '0.3em',
    '--t-shadow': '0 2px 0 rgba(42,36,24,0.06)'
  }
}, {
  id: 'moss-velvet',
  name: 'Moss Velvet',
  blurb: 'Deep forest velvet and brass — an evening among the pines.',
  swatches: ['#2C3A2A', '#C7A86A', '#A9BE8E', '#1E281C'],
  dark: true,
  foil: true,
  texture: 'velvet',
  motif: 'fern',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'laurel',
    photo: 'clean',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#1A231A',
    '--t-section': '#212C20',
    '--t-card': '#28331F',
    '--t-ink': '#EDEEDF',
    '--t-ink-soft': '#C3CBB0',
    '--t-ink-muted': '#93A07E',
    '--t-accent': '#C7A86A',
    '--t-accent-2': '#A9BE8E',
    '--t-accent-bg': '#2E3A24',
    '--t-accent-ink': '#D8BE84',
    '--t-gold': '#C7A86A',
    '--t-line': 'rgba(237,238,223,0.16)',
    '--t-line-soft': 'rgba(237,238,223,0.08)',
    '--t-rsvp': '#C7A86A',
    '--t-rsvp-ink': '#1A231A',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '10px',
    '--t-radius-lg': '16px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.14',
    '--t-eyebrow-ls': '0.2em',
    '--t-shadow': '0 16px 38px rgba(0,0,0,0.42)'
  }
}, {
  id: 'coral-sea',
  name: 'Coral & Sea',
  blurb: 'Living coral against teal shallows — a reef-bright welcome.',
  swatches: ['#E0735C', '#1F5560', '#E2B85C', '#F3EFE4'],
  texture: 'linen',
  motif: 'wave',
  look: {
    card: 'frame',
    button: 'pill',
    divider: 'wave',
    photo: 'arch',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#F4F0E5',
    '--t-section': '#E8E8DA',
    '--t-card': '#FCFAF1',
    '--t-ink': '#1F4048',
    '--t-ink-soft': '#3E5C63',
    '--t-ink-muted': '#7C949A',
    '--t-accent': '#E0735C',
    '--t-accent-2': '#3E8A93',
    '--t-accent-bg': '#F5DAD2',
    '--t-accent-ink': '#C2543E',
    '--t-gold': '#E2B85C',
    '--t-line': 'rgba(31,64,72,0.15)',
    '--t-line-soft': 'rgba(31,64,72,0.08)',
    '--t-rsvp': '#1F5560',
    '--t-rsvp-ink': '#F4F0E5',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '7px',
    '--t-radius-lg': '12px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.18em',
    '--t-shadow': '0 10px 26px rgba(31,64,72,0.10)'
  }
}, {
  id: 'plum-romance',
  name: 'Plum Romance',
  blurb: 'Plum peonies bleeding into dusty rose — a velvet evening vow.',
  swatches: ['#7E4368', '#3A2034', '#C19A6B', '#F4ECEF'],
  texture: 'watercolor',
  motif: 'bloom',
  look: {
    card: 'wash',
    button: 'pill',
    divider: 'ribbon',
    photo: 'tape',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#F6EEF1',
    '--t-section': '#EEE0E6',
    '--t-card': '#FCF7F9',
    '--t-ink': '#3A2034',
    '--t-ink-soft': '#5E3F54',
    '--t-ink-muted': '#967986',
    '--t-accent': '#7E4368',
    '--t-accent-2': '#A86E92',
    '--t-accent-bg': '#EDDBE5',
    '--t-accent-ink': '#6A3556',
    '--t-gold': '#C19A6B',
    '--t-line': 'rgba(58,32,52,0.14)',
    '--t-line-soft': 'rgba(58,32,52,0.07)',
    '--t-rsvp': '#3A2034',
    '--t-rsvp-ink': '#F6EEF1',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Dancing Script', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.16em',
    '--t-shadow': '0 14px 32px rgba(58,32,52,0.12)'
  }
}, {
  id: 'golden-hour',
  name: 'Golden Hour',
  blurb: 'Amber light spilling long across the field — the last warm hour.',
  swatches: ['#D88A3A', '#5A3A1E', '#C9A14A', '#FBF0DD'],
  texture: 'paper',
  motif: 'sun',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'rays',
    photo: 'polaroid',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FCF2E0',
    '--t-section': '#F6E6CC',
    '--t-card': '#FFFBF2',
    '--t-ink': '#5A3A1E',
    '--t-ink-soft': '#7E5836',
    '--t-ink-muted': '#AB8A64',
    '--t-accent': '#D88A3A',
    '--t-accent-2': '#E8AE66',
    '--t-accent-bg': '#F7E2C4',
    '--t-accent-ink': '#B26C24',
    '--t-gold': '#C9A14A',
    '--t-line': 'rgba(90,58,30,0.15)',
    '--t-line-soft': 'rgba(90,58,30,0.08)',
    '--t-rsvp': '#5A3A1E',
    '--t-rsvp-ink': '#FCF2E0',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Inter', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '11px',
    '--t-radius-lg': '18px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.16em',
    '--t-shadow': '0 12px 28px rgba(90,58,30,0.12)'
  }
}];
window.PL_DEFAULT_THEME_ID = 'garden';
window.PL_getTheme = function (id) {
  return window.PL_THEMES.find(t => t.id === id) || window.PL_THEMES.find(t => t.id === window.PL_DEFAULT_THEME_ID) || window.PL_THEMES[0];
};
window.PL_PAD_BY_DENSITY = {
  cozy: 0.74,
  comfortable: 1,
  spacious: 1.32
};

/* Full theme ROOT style — the --t-* set PLUS the base design-system
   vars shadowed to the theme's values, so any markup referencing
   base tokens re-skins for free. Port of themeRootStyle(). */
window.PL_themeRootStyle = function (theme, density, override) {
  const v = override && Object.keys(override).length ? Object.assign({}, theme.vars, override) : theme.vars;
  const pad = window.PL_PAD_BY_DENSITY[density] || 1;
  return Object.assign({}, v, {
    '--t-pad': pad,
    '--paper': v['--t-paper'],
    '--card': v['--t-card'],
    '--ink': v['--t-ink'],
    '--ink-soft': v['--t-ink-soft'],
    '--ink-muted': v['--t-ink-muted'],
    '--cream': v['--t-paper'],
    '--cream-2': v['--t-section'],
    '--cream-3': v['--t-section'],
    '--line': v['--t-line'],
    '--line-soft': v['--t-line-soft'],
    '--card-ring': v['--t-line-soft'],
    '--font-display': v['--t-display'],
    '--gold': v['--t-gold'],
    '--t-mono': "'Geist Mono', ui-monospace, monospace",
    fontFamily: v['--t-body'],
    color: v['--t-ink'],
    background: v['--t-paper']
  });
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "site-renderer/themes.js", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/DashShell.jsx
try { (() => {
/* global React */
// Pearloom dashboard — shared chrome, rebuilt to the production IA
// (src/components/pearloom/dash/DashShell.tsx). A 264px cream sidebar:
// logo · celebration switcher · grouped nav with an ink active pill ·
// compact plan strip · user-menu popover. A glass utility bar rides the
// top of the scroll column (Pear command search · notifications ·
// avatar). PageHead is the per-route DashTopbar — letterpress display
// title knotted with the gold pearl, subtitle, right-aligned actions.
(() => {
  const {
    PearloomLogo,
    PearloomGlyph,
    Button,
    Pearl,
    Thread
  } = window.PearloomDesignSystem_55118c;
  const Icon = window.Icon;
  const NAV = [{
    group: '',
    items: [{
      k: 'home',
      l: 'Home',
      i: 'home'
    }]
  }, {
    group: 'Your loom',
    items: [{
      k: 'sites',
      l: 'My sites',
      i: 'layout'
    }]
  }, {
    group: 'This event',
    items: [{
      k: 'guests',
      l: 'Guests',
      i: 'users',
      badge: '5',
      tone: 'peach'
    }, {
      k: 'studio',
      l: 'Studio',
      i: 'sparkles'
    }, {
      k: 'gallery',
      l: 'The Reel',
      i: 'image',
      badge: '3',
      tone: 'gold'
    }, {
      k: 'registry',
      l: 'Registry',
      i: 'gift'
    }]
  }, {
    group: 'The house',
    items: [{
      k: 'analytics',
      l: 'Analytics',
      i: 'bars'
    }]
  }];
  const SITES = [{
    id: 'mj',
    name: 'Mira & Jun',
    occ: 'Wedding',
    date: 'Sept 6, 2026',
    tint: 'var(--peach-bg)',
    ink: 'var(--peach-ink)'
  }, {
    id: 'maya',
    name: "Maya's shower",
    occ: 'Bridal shower',
    date: 'Aug 16, 2026',
    tint: 'rgba(193,154,75,0.16)',
    ink: '#8A6A2E'
  }];
  function Crest({
    site,
    size = 38
  }) {
    const r = Math.max(8, Math.round(size * 0.26));
    return /*#__PURE__*/React.createElement("div", {
      "aria-hidden": true,
      style: {
        width: size,
        height: size,
        borderRadius: r,
        flexShrink: 0,
        background: site.tint,
        border: '1px solid var(--card-ring)',
        display: 'grid',
        placeItems: 'center',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontWeight: 600,
        fontSize: size * 0.48,
        lineHeight: 1,
        color: site.ink
      }
    }, site.name[0]), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: Math.round(size * 0.14),
        bottom: Math.round(size * 0.14),
        width: Math.max(4, Math.round(size * 0.13)),
        height: Math.max(4, Math.round(size * 0.13)),
        borderRadius: 999,
        background: 'var(--pl-gold)'
      }
    }));
  }
  function CelebrationCard() {
    const [open, setOpen] = React.useState(false);
    const [sel, setSel] = React.useState(SITES[0]);
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (!open) return;
      const h = e => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [open]);
    return /*#__PURE__*/React.createElement("div", {
      ref: ref,
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(o => !o),
      className: "dash-cele",
      style: {
        width: '100%',
        background: open ? 'var(--cream-2)' : 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 14,
        padding: 10,
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        textAlign: 'left',
        cursor: 'pointer',
        color: 'inherit',
        transition: 'background 200ms var(--pl-ease-out)'
      }
    }, /*#__PURE__*/React.createElement(Crest, {
      site: sel,
      size: 38
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontFamily: 'var(--font-ui)'
      }
    }, sel.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, sel.date)), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-muted)',
        transform: open ? 'rotate(180deg)' : 'none',
        transition: 'transform 200ms var(--pl-ease-out)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 12
    }))), open ? /*#__PURE__*/React.createElement("div", {
      role: "listbox",
      style: {
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
        right: 0,
        zIndex: 30,
        background: 'var(--card)',
        border: '1px solid var(--card-ring)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-md)',
        padding: 6
      }
    }, SITES.map(s => {
      const on = s.id === sel.id;
      return /*#__PURE__*/React.createElement("button", {
        key: s.id,
        onClick: () => {
          setSel(s);
          setOpen(false);
        },
        style: {
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px',
          borderRadius: 8,
          border: 'none',
          background: on ? 'var(--cream-2)' : 'transparent',
          color: 'var(--ink)',
          cursor: 'pointer',
          textAlign: 'left'
        }
      }, /*#__PURE__*/React.createElement(Crest, {
        site: s,
        size: 28
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'var(--font-ui)'
        }
      }, s.name), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'block',
          fontSize: 10.5,
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-ui)'
        }
      }, s.occ, " \xB7 ", s.date)), on ? /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--pl-gold)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "check",
        size: 13,
        strokeWidth: 3
      })) : null);
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: 'var(--line-soft)',
        margin: '4px 6px'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        fontSize: 12.5,
        fontWeight: 600,
        color: 'var(--accent-ink, var(--peach-ink))',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 13
    }), " Manage sites")) : null);
  }
  function NavLink({
    it,
    on,
    onNav
  }) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: () => onNav(it.k),
      className: "dash-navbtn",
      "data-on": on ? '1' : undefined,
      style: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: on ? 600 : 500,
        color: on ? 'var(--cream)' : 'var(--ink)',
        backgroundColor: on ? 'var(--ink)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'var(--font-ui)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "dash-navrail",
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", {
      className: "dash-navicon",
      style: {
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: it.i,
      size: 18
    })), /*#__PURE__*/React.createElement("span", {
      className: "dash-navlabel",
      style: {
        flex: 1
      }
    }, it.l), it.badge ? /*#__PURE__*/React.createElement("span", {
      className: "dash-navbadge",
      style: {
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 999,
        fontWeight: 700,
        fontFamily: 'var(--pl-font-mono)',
        background: it.tone === 'gold' ? 'rgba(193,154,75,0.18)' : 'var(--accent-bg, var(--peach-bg))',
        color: it.tone === 'gold' ? '#8A6A2E' : 'var(--accent-ink, var(--peach-ink))'
      }
    }, it.badge) : null);
  }
  function UserMenu() {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (!open) return;
      const h = e => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [open]);
    const items = [['sliders', 'Settings', 'Profile, preferences, theme'], ['heart', 'Plan & billing', null], ['sparkles', 'Usage & credits', null], ['bell', 'Help center', null]];
    return /*#__PURE__*/React.createElement("div", {
      ref: ref,
      style: {
        position: 'relative',
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(v => !v),
      style: {
        width: '100%',
        background: 'var(--card)',
        border: `1px solid ${open ? 'var(--ink)' : 'var(--card-ring)'}`,
        borderRadius: 14,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        textAlign: 'left',
        color: 'inherit',
        transition: 'border-color 160ms var(--pl-ease-out)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--sage-deep), var(--sage))',
        display: 'grid',
        placeItems: 'center',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--cream)',
        flexShrink: 0,
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic'
      }
    }, "M"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, "Mira Vega"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, "mira@vega.mx")), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-muted)',
        transform: open ? 'rotate(180deg)' : 'none',
        transition: 'transform 200ms var(--pl-ease-out)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 11
    }))), open ? /*#__PURE__*/React.createElement("div", {
      className: "pl-glass-surface",
      style: {
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: 0,
        right: 0,
        borderRadius: 14,
        padding: 6,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 5
      }
    }, items.map(([ic, l, d]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      onClick: () => {
        if (l === 'Plan & billing') window.dispatchEvent(new CustomEvent('pl-open-plan'));
      },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        color: 'var(--ink)'
      },
      onMouseEnter: e => {
        e.currentTarget.style.background = 'var(--cream-2)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = 'transparent';
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-soft)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 14
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'var(--font-ui)'
      }
    }, l), d ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, d) : null))), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 1,
        background: 'var(--line-soft)',
        margin: '4px 6px'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 13,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      },
      onMouseEnter: e => {
        e.currentTarget.style.background = 'var(--cream-2)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = 'transparent';
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow",
      size: 14
    }), " Log out")) : null);
  }
  function Sidebar({
    active,
    onNav
  }) {
    return /*#__PURE__*/React.createElement("aside", {
      className: "dash-side",
      style: {
        width: 264,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--cream)',
        borderRight: '1px solid var(--line-soft)',
        position: 'sticky',
        top: 0,
        height: '100dvh',
        maxHeight: '100dvh',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '18px 14px 12px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "dash-logo",
      style: {
        padding: '4px 8px 4px'
      }
    }, /*#__PURE__*/React.createElement(PearloomLogo, {
      size: 24,
      color: "var(--pl-ink)"
    })), /*#__PURE__*/React.createElement(CelebrationCard, null)), /*#__PURE__*/React.createElement("nav", {
      className: "dash-nav",
      onKeyDown: e => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        const btns = [...e.currentTarget.querySelectorAll('.dash-navbtn')];
        const i = btns.indexOf(document.activeElement);
        if (i < 0) return;
        e.preventDefault();
        const next = e.key === 'ArrowDown' ? Math.min(btns.length - 1, i + 1) : Math.max(0, i - 1);
        btns[next].focus();
      },
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        padding: '4px 14px 12px'
      }
    }, NAV.map((g, gi) => /*#__PURE__*/React.createElement("div", {
      key: g.group || gi,
      className: "dash-navgroup"
    }, g.group ? /*#__PURE__*/React.createElement("div", {
      className: "dash-grouplabel",
      style: {
        padding: '4px 12px 6px',
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)'
      }
    }, g.group) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, g.items.map(it => /*#__PURE__*/React.createElement(NavLink, {
      key: it.k,
      it: it,
      on: active === it.k,
      onNav: onNav
    })))))), /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        padding: '0 14px 18px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--cream-2)',
        border: '1px solid var(--line-soft)',
        borderRadius: 12,
        padding: '8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 24,
      color: "var(--sage)"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        fontSize: 11.5,
        color: 'var(--ink-soft)',
        lineHeight: 1.3,
        fontFamily: 'var(--font-ui)'
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: 'var(--ink)'
      }
    }, "The full bolt"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-muted)',
        marginLeft: 4
      }
    }, "\xB7 plan")), /*#__PURE__*/React.createElement("span", {
      onClick: () => window.dispatchEvent(new CustomEvent('pl-open-plan')),
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--accent-ink, var(--peach-ink))',
        padding: '2px 6px',
        borderRadius: 6,
        cursor: 'pointer'
      }
    }, "View")), /*#__PURE__*/React.createElement(UserMenu, null)));
  }
  function NotifBell() {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (!open) return;
      const h = e => {
        if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [open]);
    const NOTES = [{
      i: 'users',
      c: 'var(--sage)',
      t: 'Amara replied — coming, +1',
      w: '2h'
    }, {
      i: 'image',
      c: 'var(--accent-ink, var(--peach-ink))',
      t: 'Jonah added a photo to the Reel',
      w: '5h'
    }, {
      i: 'gift',
      c: 'var(--pl-gold)',
      t: 'Priya bought the pour-over set',
      w: '1d'
    }];
    return /*#__PURE__*/React.createElement("div", {
      ref: ref,
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(v => !v),
      title: "Notifications",
      style: {
        position: 'relative',
        width: 34,
        height: 34,
        borderRadius: 999,
        border: `1px solid ${open ? 'var(--ink)' : 'var(--line)'}`,
        background: 'var(--card)',
        color: 'var(--ink)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "bell",
      size: 16
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 6,
        right: 7,
        width: 7,
        height: 7,
        borderRadius: 99,
        background: 'var(--accent-ink, var(--peach-ink))',
        border: '1.5px solid var(--card)'
      }
    })), open ? /*#__PURE__*/React.createElement("div", {
      className: "pl-glass-surface",
      style: {
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 300,
        borderRadius: 14,
        padding: 8,
        boxShadow: 'var(--shadow-lg)',
        zIndex: 40
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: '6px 8px 8px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.16em',
        color: 'var(--ink-muted)'
      }
    }, "LATELY"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--accent-ink, var(--peach-ink))',
        fontFamily: 'var(--font-ui)',
        cursor: 'pointer'
      }
    }, "Mark all read")), NOTES.map((n, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 8px',
        borderRadius: 8,
        cursor: 'pointer'
      },
      onMouseEnter: e => {
        e.currentTarget.style.background = 'var(--cream-2)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = 'transparent';
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 28,
        height: 28,
        borderRadius: 8,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--cream-3)',
        color: n.c
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: n.i,
      size: 13
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.35
      }
    }, n.t), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        color: 'var(--ink-muted)'
      }
    }, n.w)))) : null);
  }
  function UtilityBar() {
    const [focus, setFocus] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      className: "pl-glass-surface dash-topbar",
      style: {
        position: 'sticky',
        top: 0,
        zIndex: 20,
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        maxWidth: 440,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: focus ? 'var(--card)' : 'var(--cream-3)',
        border: `1px solid ${focus ? 'var(--accent-ink, var(--peach-ink))' : 'var(--line)'}`,
        borderRadius: 999,
        padding: '8px 14px',
        transition: 'all var(--pl-dur-fast) var(--pl-ease-out)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--accent-ink, var(--peach-ink))'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 15
    })), /*#__PURE__*/React.createElement("input", {
      onFocus: () => setFocus(true),
      onBlur: () => setFocus(false),
      placeholder: "Ask Pear anything, or jump to a block\u2026",
      style: {
        flex: 1,
        border: 'none',
        background: 'transparent',
        outline: 'none',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--ink)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.1em',
        color: 'var(--ink-muted)',
        padding: '2px 6px',
        background: 'var(--accent-bg, var(--peach-bg))',
        borderRadius: 4
      }
    }, "\u2318K")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(NotifBell, null), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 34,
        height: 34
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 999,
        background: 'linear-gradient(135deg, var(--sage-deep), var(--sage))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--cream)',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic'
      }
    }, "M"), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        right: -1,
        bottom: -1,
        width: 10,
        height: 10,
        borderRadius: 99,
        background: 'var(--sage)',
        border: '2px solid var(--cream)'
      }
    })));
  }
  function PageHead({
    pre,
    title,
    italic,
    sub,
    actions,
    pearl = true
  }) {
    return /*#__PURE__*/React.createElement("header", {
      style: {
        padding: 'clamp(18px,2.8vw,30px) clamp(20px,4vw,40px) clamp(10px,1.4vw,14px)',
        maxWidth: 1240,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0,
        flex: 1
      }
    }, pre ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 11,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--accent-ink, var(--peach-ink))',
        marginBottom: 8
      }
    }, pre) : null, /*#__PURE__*/React.createElement("h1", {
      className: "pl-heading pl-letterpress",
      style: {
        fontSize: 'clamp(28px,3.6vw,38px)',
        lineHeight: 1.08,
        margin: 0,
        fontWeight: 600,
        letterSpacing: '-0.01em'
      }
    }, title, " ", italic ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        fontWeight: 500,
        color: 'var(--lavender-ink)',
        fontFamily: 'var(--font-display)'
      }
    }, italic) : null, pearl ? /*#__PURE__*/React.createElement("svg", {
      width: "12",
      height: "12",
      viewBox: "0 0 12 12",
      "aria-hidden": true,
      style: {
        marginLeft: 8,
        verticalAlign: 'baseline'
      }
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "6",
      r: "4.4",
      fill: "var(--pl-gold)",
      stroke: "var(--pl-cream)",
      strokeWidth: "1.4"
    })) : null), sub ? /*#__PURE__*/React.createElement("p", {
      style: {
        marginTop: 10,
        color: 'var(--ink-soft)',
        fontSize: 14.5,
        lineHeight: 1.5,
        maxWidth: 640,
        fontFamily: 'var(--font-ui)'
      }
    }, sub) : null), actions ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
        flexShrink: 0
      }
    }, actions) : null);
  }
  function DashShell({
    active,
    onNav,
    children,
    texture = 'none',
    density = 'comfortable'
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--cream-3)'
      }
    }, /*#__PURE__*/React.createElement(Sidebar, {
      active: active,
      onNav: onNav
    }), /*#__PURE__*/React.createElement("div", {
      className: "dash-main",
      style: {
        position: 'relative',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--glow, var(--cream-3))'
      }
    }, texture !== 'none' ? /*#__PURE__*/React.createElement("div", {
      className: 'pl-tx-' + texture,
      style: {
        position: 'absolute',
        inset: 0,
        opacity: 0.55,
        pointerEvents: 'none',
        zIndex: 0
      }
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(UtilityBar, null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        zoom: density === 'compact' ? 0.92 : density === 'spacious' ? 1.06 : 1
      }
    }, children))));
  }
  window.DashShell = DashShell;
  window.PageHead = PageHead;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/DashShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/Enhance.jsx
try { (() => {
/* global React */
// Pearloom dashboard — shared enhancements: an animated count-up for
// display numbers, and the ⌘K command palette wired to navigation.
(() => {
  const Icon = window.Icon;
  const {
    useState,
    useEffect,
    useRef
  } = React;

  // ── Count-up — eases a display number from 0 on mount ──
  function CountUp({
    value,
    dur = 950,
    format
  }) {
    const [n, setN] = useState(0);
    useEffect(() => {
      let raf;
      const start = performance.now();
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        setN(value);
        return;
      }
      const tick = t => {
        const p = Math.min(1, (t - start) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setN(value * e);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [value, dur]);
    return React.createElement(React.Fragment, null, format ? format(n) : Math.round(n).toLocaleString());
  }

  // ── ⌘K command palette ──
  const CMDS = [{
    k: 'home',
    l: 'Home',
    i: 'home',
    hint: 'The cockpit',
    kind: 'Go to'
  }, {
    k: 'sites',
    l: 'My sites',
    i: 'layout',
    hint: 'Your loom',
    kind: 'Go to'
  }, {
    k: 'guests',
    l: 'Guests',
    i: 'users',
    hint: 'Roster · messages · seating',
    kind: 'Go to'
  }, {
    k: 'studio',
    l: 'Studio',
    i: 'sparkles',
    hint: 'Design the invitation',
    kind: 'Go to'
  }, {
    k: 'gallery',
    l: 'The Reel',
    i: 'image',
    hint: 'The photo wall',
    kind: 'Go to'
  }, {
    k: 'registry',
    l: 'Registry',
    i: 'gift',
    hint: 'Gifts & thank-yous',
    kind: 'Go to'
  }, {
    k: 'analytics',
    l: 'Analytics',
    i: 'bars',
    hint: 'Quietly read',
    kind: 'Go to'
  }, {
    k: 'guests',
    l: 'Nudge the quiet guests',
    i: 'send',
    hint: 'Pear drafts it',
    kind: 'Action'
  }, {
    k: 'guests',
    l: 'Add a guest',
    i: 'plus',
    hint: 'Roster',
    kind: 'Action'
  }, {
    k: 'registry',
    l: 'Draft thank-you notes',
    i: 'heart',
    hint: 'Pear writes them',
    kind: 'Action'
  }, {
    k: 'gallery',
    l: 'Approve guest photos',
    i: 'check',
    hint: '3 waiting',
    kind: 'Action'
  }, {
    k: 'studio',
    l: 'Redraft the invite with Pear',
    i: 'sparkles',
    hint: 'In your voice',
    kind: 'Action'
  }];
  function CommandPalette({
    onNav
  }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [sel, setSel] = useState(0);
    const inputRef = useRef(null);
    useEffect(() => {
      const onKey = e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setOpen(v => !v);
        } else if (e.key === 'Escape') setOpen(false);
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []);
    useEffect(() => {
      if (open) {
        setQ('');
        setSel(0);
        setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
      }
    }, [open]);
    const results = CMDS.filter(c => !q || (c.l + c.hint + c.kind).toLowerCase().includes(q.toLowerCase()));
    const pick = c => {
      if (c) {
        onNav(c.k);
        setOpen(false);
      }
    };
    const onKeyDown = e => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSel(s => Math.min(results.length - 1, s + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSel(s => Math.max(0, s - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        pick(results[sel]);
      }
    };
    if (!open) return null;
    return /*#__PURE__*/React.createElement("div", {
      onClick: () => setOpen(false),
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        background: 'rgba(14,13,11,0.36)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh',
        animation: 'pl-fade-q 160ms ease both'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      className: "pl-glass-surface pl-cmd",
      style: {
        width: 'min(560px, 92vw)',
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        animation: 'pl-cmd-in 220ms var(--pl-ease-emphasis) both'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px',
        borderBottom: '1px solid var(--line)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--accent-ink, var(--peach-ink))',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 18
    })), /*#__PURE__*/React.createElement("input", {
      ref: inputRef,
      value: q,
      onChange: e => {
        setQ(e.target.value);
        setSel(0);
      },
      onKeyDown: onKeyDown,
      placeholder: "Ask Pear, or jump to a block\u2026",
      style: {
        flex: 1,
        border: 'none',
        background: 'transparent',
        outline: 'none',
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        color: 'var(--ink)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.1em',
        color: 'var(--ink-muted)',
        padding: '3px 7px',
        background: 'var(--cream-3)',
        borderRadius: 5
      }
    }, "ESC")), /*#__PURE__*/React.createElement("div", {
      style: {
        maxHeight: '46vh',
        overflowY: 'auto',
        padding: 8
      }
    }, results.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '28px 20px',
        textAlign: 'center',
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 18,
        color: 'var(--ink-muted)'
      }
    }, "Nothing matches. Try another word.") : results.map((c, i) => /*#__PURE__*/React.createElement("button", {
      key: c.l,
      onMouseEnter: () => setSel(i),
      onClick: () => pick(c),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '11px 12px',
        borderRadius: 10,
        border: 'none',
        background: sel === i ? 'var(--cream-2)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 9,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: sel === i ? 'var(--accent-bg, var(--peach-bg))' : 'var(--cream-3)',
        color: sel === i ? 'var(--accent-ink, var(--peach-ink))' : 'var(--ink-soft)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: c.i,
      size: 15
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, c.l), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, c.hint)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.12em',
        color: 'var(--ink-muted)',
        textTransform: 'uppercase'
      }
    }, c.kind)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '10px 20px',
        borderTop: '1px solid var(--line)',
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        color: 'var(--ink-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "\u2191\u2193 move"), /*#__PURE__*/React.createElement("span", null, "\u21B5 open"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5
      }
    }, "woven by Pear"))));
  }
  window.CountUp = CountUp;
  window.CommandPalette = CommandPalette;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/Enhance.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/GuestLink.jsx
try { (() => {
/* global React */
// Pearloom dashboard — the host↔guest bridge. A "guest's-eye view"
// drawer that renders the published site exactly as one guest sees it
// (their greeting, RSVP, table, meal, the day, travel), opened with a
// 'pl-guest-view' event. Plus the shared invite front-door card.
(() => {
  const Icon = window.Icon;
  const {
    Button,
    PearloomGlyph,
    Pearl,
    Monogram,
    Thread
  } = window.PearloomDesignSystem_55118c;
  const {
    useState,
    useEffect
  } = React;
  const openGuestView = guest => window.dispatchEvent(new CustomEvent('pl-guest-view', {
    detail: guest || {}
  }));
  const first = p => (p || 'Guest').replace(/ &.*| \+.*|'s.*/, '').split(' ')[0];
  const RUN = [{
    t: '4:00',
    label: 'Gather on the lawn'
  }, {
    t: '5:00',
    label: 'The ceremony',
    star: true
  }, {
    t: '6:30',
    label: 'Supper & toasts'
  }, {
    t: '9:00',
    label: 'Dancing in the barn'
  }];
  function GuestView() {
    const [g, setG] = useState(null);
    useEffect(() => {
      const o = e => setG(e.detail || {});
      const k = e => {
        if (e.key === 'Escape') setG(null);
      };
      window.addEventListener('pl-guest-view', o);
      window.addEventListener('keydown', k);
      return () => {
        window.removeEventListener('pl-guest-view', o);
        window.removeEventListener('keydown', k);
      };
    }, []);
    if (!g) return null;
    const name = g.party || 'Your guests';
    const coming = g.rsvp === 'yes';
    const pending = !g.rsvp || g.rsvp === 'pending';
    const fn = first(name);
    return /*#__PURE__*/React.createElement("div", {
      onClick: () => setG(null),
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 9700,
        background: 'rgba(14,13,11,0.42)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'pl-fade-q 160ms ease both'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        width: 'min(440px, 96vw)',
        height: '100%',
        background: 'var(--cream)',
        borderLeft: '1px solid var(--line)',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'pl-drawer-in 280ms var(--pl-ease-emphasis) both'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 18px',
        borderBottom: '1px solid var(--line)',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        background: 'var(--lavender-bg)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--lavender-ink)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "users",
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.14em',
        color: 'var(--ink-muted)'
      }
    }, "GUEST'S-EYE VIEW"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }
    }, "How ", fn, " sees the site")), /*#__PURE__*/React.createElement("button", {
      onClick: () => setG(null),
      style: {
        width: 30,
        height: 30,
        borderRadius: 999,
        border: '1px solid var(--line)',
        background: 'var(--card)',
        color: 'var(--ink-soft)',
        cursor: 'pointer',
        fontSize: 16,
        lineHeight: 1,
        flexShrink: 0
      }
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflowY: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        height: 200,
        background: 'center/cover url(../../assets/imagery/vase-linen-still.png)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(24,24,27,0.6), transparent 60%)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 'auto 0 0 0',
        padding: '0 22px 18px',
        color: 'var(--pl-cream)'
      }
    }, /*#__PURE__*/React.createElement(Monogram, {
      left: "M",
      right: "J",
      frame: "ring",
      size: 44,
      ink: "var(--pl-cream)",
      accent: "var(--pl-cream)",
      paper: "transparent"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 30,
        lineHeight: 1,
        marginTop: 6
      }
    }, "Mira & Jun"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.2em',
        marginTop: 6
      }
    }, "SEPT 6, 2026 \xB7 POINT REYES"))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '22px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 22,
        color: 'var(--ink)'
      }
    }, "Welcome, ", fn, "."), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 14,
        padding: 16,
        borderRadius: 14,
        background: pending ? 'var(--peach-bg)' : 'var(--sage-tint)',
        border: `1px solid ${pending ? 'var(--peach)' : 'var(--sage-bg)'}`
      }
    }, pending ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        marginBottom: 12
      }
    }, "We're holding a place for you. Will you join us?"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm",
      style: {
        flex: 1
      }
    }, "Joyfully yes"), /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm"
    }, "Can't make it"))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.14em',
        color: 'var(--sage-deep)',
        marginBottom: 6
      }
    }, "YOU'RE ", coming ? 'COMING' : g.rsvp === 'maybe' ? 'A MAYBE' : 'NOT COMING'), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.5
      }
    }, g.count > 1 ? `Party of ${g.count}` : 'Just you', g.meal ? ` · ${g.meal}` : '', g.table ? ` · Table ${g.table}` : '', ". We can't wait."))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.16em',
        color: 'var(--ink-muted)',
        margin: '22px 0 10px'
      }
    }, "THE DAY"), RUN.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'baseline',
        padding: '7px 0',
        borderBottom: i < RUN.length - 1 ? '1px solid var(--line-soft)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 11.5,
        color: r.star ? 'var(--accent-ink, var(--peach-ink))' : 'var(--ink-muted)',
        width: 36
      }
    }, r.t), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 13.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        fontWeight: r.star ? 600 : 400
      }
    }, r.label))), /*#__PURE__*/React.createElement(Thread, {
      width: "100%",
      style: {
        margin: '20px 0'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10
      }
    }, [['pin', 'Travel & stay'], ['gift', 'The registry'], ['image', 'Add your photos'], ['message', 'Message the hosts']].map(([ic, l]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '11px 12px',
        borderRadius: 10,
        background: 'var(--cream-2)',
        border: '1px solid var(--line)',
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--lavender-ink)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 14
    })), l))))), /*#__PURE__*/React.createElement("div", {
      style: {
        flexShrink: 0,
        padding: '12px 18px',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--cream-2)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)',
        flex: 1
      }
    }, "This is the live site, signed in as ", fn, "."), /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm"
    }, "Resend ", fn, "'s link"))));
  }
  window.GuestView = GuestView;
  window.openGuestView = openGuestView;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/GuestLink.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/Icons.jsx
try { (() => {
/* global React */
// Pearloom dashboard — the in-house line-icon set. No icon font, no
// CDN: a small family of 24×24, fill:none, 1.75px round-cap strokes,
// the calmer cousin of Feather the brand specifies (motifs.tsx). Each
// entry is the inner markup of an <svg>; <Icon name size/> wraps it.
(() => {
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/>',
    layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 9v11"/>',
    link: '<path d="M9 12h6"/><path d="M10.5 7.5H8a4.5 4.5 0 0 0 0 9h2.5"/><path d="M13.5 7.5H16a4.5 4.5 0 0 1 0 9h-2.5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1"/><path d="M17.5 14.6A5.5 5.5 0 0 1 20.5 20"/>',
    inbox: '<path d="M3 13.5 5.2 5a2 2 0 0 1 1.9-1.4h9.8A2 2 0 0 1 18.8 5L21 13.5"/><path d="M3 13.5h5l1.5 2.5h5L16 13.5h5V19a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19Z"/>',
    message: '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.5V16H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="M8 9.5h8"/><path d="M8 12.5h5"/>',
    gift: '<rect x="3.5" y="9" width="17" height="4" rx="1"/><path d="M5 13v6.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V13"/><path d="M12 9v11.5"/><path d="M12 9S10.8 4.5 8.5 4.5a2 2 0 0 0 0 4.5Z"/><path d="M12 9s1.2-4.5 3.5-4.5a2 2 0 0 1 0 4.5Z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    grid: '<circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/>',
    sparkles: '<path d="M12 3.5c.5 3.4 1.6 4.5 5 5-3.4.5-4.5 1.6-5 5-.5-3.4-1.6-4.5-5-5 3.4-.5 4.5-1.6 5-5Z"/><path d="M18.5 13.5c.3 1.6.8 2.1 2.4 2.4-1.6.3-2.1.8-2.4 2.4-.3-1.6-.8-2.1-2.4-2.4 1.6-.3 2.1-.8 2.4-2.4Z"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M4.5 17.5 9 13l3 2.5L15.5 11l4.5 5"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15 9-2 5-4 2 2-5Z"/>',
    bars: '<path d="M4 20V11"/><path d="M9.3 20V5"/><path d="M14.6 20v-6.5"/><path d="M20 20V8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 1.5 6.5 1.5 6.5h-15S6 14 6 9Z"/><path d="M10 19a2 2 0 0 0 4 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    chevron: '<polyline points="6 9 12 15 18 9"/>',
    arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    send: '<path d="M21 3 3 10.5l7 2.5 2.5 7L21 3Z"/><path d="M10 13 21 3"/>',
    play: '<path d="M7 5.5v13l11-6.5Z"/>',
    music: '<path d="M9 18V6l11-2.5v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="15.5" r="3"/>',
    pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15" r="1.2"/>',
    heart: '<path d="M12 20S4 14.5 4 9a4.2 4.2 0 0 1 8-1.6A4.2 4.2 0 0 1 20 9c0 5.5-8 11-8 11Z"/>',
    sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M21.5 12h-2.4M4.9 12H2.5M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.3 6.3 0 0 0 20 14.5Z"/>',
    ticket: '<path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2.5a2 2 0 0 0 0 4V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2.5a2 2 0 0 0 0-4Z"/><path d="M13 5v14"/>',
    table: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 5.5V3M12 21v-2.5M18.5 12H21M3 12h2.5"/>'
  };
  function Icon({
    name,
    size = 18,
    color = 'currentColor',
    strokeWidth = 1.75,
    style
  }) {
    return React.createElement('svg', {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      style,
      'aria-hidden': true,
      'data-icon': name,
      dangerouslySetInnerHTML: {
        __html: P[name] || ''
      }
    });
  }
  window.Icon = Icon;
  window.ICON_NAMES = Object.keys(P);
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/Icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/Premium.jsx
try { (() => {
/* global React */
// Pearloom dashboard — premium. A warm, letterpress plan surface (three
// tiers + live usage meters) opened by a 'pl-open-plan' event, plus a
// reusable LockChip the screens drop beside full-bolt features. Premium
// reads as gold — the brand's punctuation — never a banner.
(() => {
  const Icon = window.Icon;
  const {
    Button,
    PearloomGlyph,
    Pearl
  } = window.PearloomDesignSystem_55118c;
  const {
    useState,
    useEffect
  } = React;
  const openPlan = () => window.dispatchEvent(new CustomEvent('pl-open-plan'));
  function LockChip({
    label = 'On the full bolt',
    onClick
  }) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick || openPlan,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        border: '1px solid var(--gold-line)',
        background: 'rgba(193,154,75,0.12)',
        color: '#8A6A2E',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 11
    }), " ", label);
  }
  const TIERS = [{
    name: 'A single thread',
    price: 'Free',
    cadence: '',
    tagline: 'Your first site, forever.',
    perks: ['One site, kept forever', 'Up to 30 guests', 'RSVPs & a guest message board', 'The Pearloom mark in the footer'],
    cta: 'Your free thread',
    current: false
  }, {
    name: 'The full bolt',
    price: '$18',
    cadence: '/ month',
    tagline: 'Everything to host it beautifully.',
    perks: ['Unlimited sites & guests', 'Your own custom domain', 'Every theme pack, free', 'Fee-free cash funds', 'Pear in your voice + matching suite', 'The Reel, unlimited photos'],
    cta: 'Your plan',
    current: true
  }, {
    name: 'The atelier',
    price: '$48',
    cadence: '/ month',
    tagline: 'For weekends, not just days.',
    perks: ['Everything in the full bolt', 'Linked multi-event weekends', 'Letterpress print credits', 'Priority Pear & white-glove setup', 'A keepsake page that lasts forever'],
    cta: 'Talk to the atelier',
    current: false
  }];
  const USAGE = [{
    l: 'Sites',
    v: '2',
    cap: 'unlimited',
    pct: 20
  }, {
    l: 'Guests',
    v: '64',
    cap: 'unlimited',
    pct: 28
  }, {
    l: 'Photos in the Reel',
    v: '212',
    cap: '∞',
    pct: 32
  }, {
    l: 'Pear credits this month',
    v: '80%',
    cap: 'left',
    pct: 80
  }];
  function PlanModal() {
    const [open, setOpen] = useState(false);
    useEffect(() => {
      const o = () => setOpen(true);
      const k = e => {
        if (e.key === 'Escape') setOpen(false);
      };
      window.addEventListener('pl-open-plan', o);
      window.addEventListener('keydown', k);
      return () => {
        window.removeEventListener('pl-open-plan', o);
        window.removeEventListener('keydown', k);
      };
    }, []);
    if (!open) return null;
    return /*#__PURE__*/React.createElement("div", {
      onClick: () => setOpen(false),
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 9600,
        background: 'rgba(14,13,11,0.42)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',
        padding: '6vh 20px 40px',
        animation: 'pl-fade-q 180ms ease both'
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: e => e.stopPropagation(),
      style: {
        width: 'min(980px, 96vw)',
        background: 'var(--cream)',
        borderRadius: 22,
        border: '1px solid var(--line)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
        animation: 'pl-cmd-in 240ms var(--pl-ease-emphasis) both'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        padding: 'clamp(24px,3vw,36px) clamp(24px,4vw,44px) 0',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(false),
      style: {
        position: 'absolute',
        top: 18,
        right: 18,
        width: 32,
        height: 32,
        borderRadius: 999,
        border: '1px solid var(--line)',
        background: 'var(--card)',
        color: 'var(--ink-soft)',
        cursor: 'pointer',
        fontSize: 16,
        lineHeight: 1
      }
    }, "\xD7"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.2em',
        color: 'var(--accent-ink, var(--peach-ink))',
        marginBottom: 10
      }
    }, "YOUR PLAN"), /*#__PURE__*/React.createElement("h2", {
      className: "pl-heading pl-letterpress",
      style: {
        fontSize: 'clamp(26px,3.4vw,34px)',
        margin: 0,
        fontWeight: 600
      }
    }, "Kept the way it was ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--lavender-ink)',
        fontFamily: 'var(--font-display)'
      }
    }, "made.")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 14,
        color: 'var(--ink-soft)',
        maxWidth: 460,
        margin: '10px auto 0',
        lineHeight: 1.5,
        fontFamily: 'var(--font-ui)'
      }
    }, "Pearloom is yours to keep, not to rent by the feature. One quiet price, every craft in the house.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3,1fr)',
        gap: 16,
        padding: 'clamp(20px,3vw,32px) clamp(24px,4vw,44px)'
      },
      className: "pl-plan-grid"
    }, TIERS.map(t => /*#__PURE__*/React.createElement("div", {
      key: t.name,
      style: {
        position: 'relative',
        borderRadius: 16,
        padding: '22px 20px 20px',
        background: t.current ? 'var(--ink)' : 'var(--card)',
        color: t.current ? 'var(--cream)' : 'var(--ink)',
        border: t.current ? '1px solid var(--ink)' : '1px solid var(--line)',
        boxShadow: t.current ? '0 0 0 2px var(--pl-gold)' : 'none'
      }
    }, t.current ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -10,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '3px 12px',
        borderRadius: 999,
        background: 'var(--pl-gold)',
        color: 'var(--pl-ink)',
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.14em'
      }
    }, "YOUR PLAN") : null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 21,
        fontWeight: 500,
        color: t.current ? 'var(--pl-gold)' : 'var(--lavender-ink)'
      }
    }, t.name), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
        margin: '8px 0 2px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 34,
        fontWeight: 400,
        letterSpacing: '-0.02em'
      }
    }, t.price), t.cadence ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: t.current ? 'var(--stone, #C9BFA8)' : 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, t.cadence) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: t.current ? 'var(--stone, #C9BFA8)' : 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)',
        marginBottom: 16,
        minHeight: 34
      }
    }, t.tagline), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        marginBottom: 20
      }
    }, t.perks.map(p => /*#__PURE__*/React.createElement("div", {
      key: p,
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 9,
        fontSize: 12.5,
        lineHeight: 1.4,
        fontFamily: 'var(--font-ui)',
        color: t.current ? 'var(--cream)' : 'var(--ink-soft)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: t.current ? 'var(--pl-gold)' : 'var(--sage)',
        flexShrink: 0,
        marginTop: 1
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 13,
      strokeWidth: 2.5
    })), p))), /*#__PURE__*/React.createElement(Button, {
      variant: t.current ? 'pearl' : 'paper',
      size: "sm",
      style: {
        width: '100%'
      },
      disabled: t.current
    }, t.current ? '✦ Your plan' : t.cta)))), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: '1px solid var(--line)',
        padding: 'clamp(18px,2.4vw,26px) clamp(24px,4vw,44px)',
        background: 'var(--cream-2)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: 'var(--ink-muted)'
      }
    }, "YOUR FULL BOLT, IN USE"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--ink-soft)',
        fontFamily: 'var(--font-ui)'
      }
    }, "Renews Mar 2027 \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--accent-ink, var(--peach-ink))',
        cursor: 'pointer'
      }
    }, "Manage billing"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 16
      },
      className: "pl-plan-grid"
    }, USAGE.map(u => /*#__PURE__*/React.createElement("div", {
      key: u.l
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 5,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        color: 'var(--ink)'
      }
    }, u.v), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, u.cap)), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 5,
        background: 'var(--cream-3)',
        borderRadius: 99,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: u.pct + '%',
        height: '100%',
        background: 'var(--sage)',
        borderRadius: 99
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.1em',
        color: 'var(--ink-muted)',
        marginTop: 6
      }
    }, u.l.toUpperCase())))))));
  }
  window.LockChip = LockChip;
  window.PlanModal = PlanModal;
  window.openPlan = openPlan;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/Premium.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/ScreensExtra.jsx
try { (() => {
/* global React */
// Pearloom dashboard — Registry (gifts + cash funds with group gifting,
// paste-any-store import, and a Pear thank-you composer) and Analytics
// (RSVP funnel, traffic source, and a jump to the quiet guests).
(() => {
  const {
    Card,
    Badge,
    Button,
    Eyebrow,
    Thread,
    Pearl,
    PearloomGlyph
  } = window.PearloomDesignSystem_55118c;
  const Icon = window.Icon;

  // ───────────────────────── Registry ─────────────────────────
  const GIFTS = [{
    name: 'A weekend in Big Sur',
    sub: 'Honeymoon fund',
    price: '$480',
    kind: 'fund',
    pct: 62,
    contrib: 3,
    tone: 'var(--sage-tint)',
    ink: 'var(--sage-deep)'
  }, {
    name: 'Cast-iron everything',
    sub: 'The good skillet set',
    price: '$210',
    status: 'claimed',
    by: 'The Abernathys',
    tone: 'var(--peach-bg)',
    ink: 'var(--peach-ink)'
  }, {
    name: 'Hario pour-over set',
    sub: 'Slow mornings',
    price: '$84',
    status: 'purchased',
    by: 'Priya N.',
    tone: 'rgba(193,154,75,0.16)',
    ink: '#8A6A2E'
  }, {
    name: 'Linen table runner',
    sub: 'For the long table',
    price: '$120',
    tone: 'var(--lavender-bg)',
    ink: 'var(--lavender-ink)'
  }, {
    name: 'A tree in their name',
    sub: 'Point Reyes restoration',
    price: '$60',
    status: 'purchased',
    by: 'Sage K.',
    tone: 'var(--sage-tint)',
    ink: 'var(--sage-deep)'
  }, {
    name: 'Records, dealer\u2019s choice',
    sub: 'Build the shelf',
    price: '$45',
    tone: 'var(--cream-3)',
    ink: 'var(--ink-soft)'
  }];
  const THANKS = [{
    who: 'Priya N.',
    gift: 'Pour-over set',
    state: 'sent',
    note: ''
  }, {
    who: 'Sage K.',
    gift: 'A tree in your name',
    state: 'drafted',
    note: 'Sage — a whole tree. We\u2019ll think of you every time we walk the Point Reyes trail. Thank you for rooting something that lasts. — M & J'
  }, {
    who: 'The Abernathys',
    gift: 'Cast-iron skillet set',
    state: 'todo',
    note: 'Glenn & Ruth — the skillets already feel like the start of a hundred Sunday breakfasts. Thank you, and we can\u2019t wait to cook for you. — Mira & Jun'
  }];
  const T_LABEL = {
    sent: 'Sent',
    drafted: 'Drafted',
    todo: 'Not yet'
  };
  const T_TONE = {
    sent: 'olive',
    drafted: 'gold',
    todo: 'neutral'
  };
  function GiftStatus({
    g
  }) {
    if (g.kind === 'fund') return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 6,
        background: 'var(--cream-3)',
        borderRadius: 99,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: g.pct + '%',
        height: '100%',
        background: g.ink,
        borderRadius: 99
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        color: 'var(--ink-muted)'
      }
    }, g.pct, "% there"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: 'var(--sage-deep)',
        fontFamily: 'var(--font-ui)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "users",
      size: 12
    }), " ", g.contrib, " chipping in")));
    if (g.status) return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 12,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, g.status === 'purchased' ? 'Purchased' : 'Claimed', " by ", /*#__PURE__*/React.createElement("strong", {
      style: {
        color: 'var(--ink)'
      }
    }, g.by));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 12,
        color: 'var(--sage-deep)',
        fontFamily: 'var(--font-ui)'
      }
    }, "Available");
  }
  function Registry() {
    const [url, setUrl] = React.useState('');
    const [sel, setSel] = React.useState(null);
    const claimed = GIFTS.filter(g => g.status).length;
    const due = THANKS.filter(t => t.state !== 'sent').length;
    const selT = sel != null ? THANKS[sel] : null;
    return /*#__PURE__*/React.createElement("main", {
      style: {
        padding: '0 clamp(20px,4vw,40px) 56px',
        maxWidth: 1180,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 300px',
        gap: 22,
        alignItems: 'flex-start'
      },
      className: "pd-guests"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 16,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        background: 'var(--cream-3)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--accent-ink, var(--peach-ink))',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "link",
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 180,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--cream-3)',
        border: '1px solid var(--line)',
        borderRadius: 999,
        padding: '8px 14px'
      }
    }, /*#__PURE__*/React.createElement("input", {
      value: url,
      onChange: e => setUrl(e.target.value),
      placeholder: "Paste a link from any store \u2014 Pear pulls in the photo, name & price\u2026",
      style: {
        flex: 1,
        border: 'none',
        background: 'transparent',
        outline: 'none',
        fontSize: 12.5,
        fontFamily: 'var(--font-ui)',
        color: 'var(--ink)'
      }
    })), /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm"
    }, "Add gift"), /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm"
    }, "+ Cash fund")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16
      }
    }, GIFTS.map((g, i) => /*#__PURE__*/React.createElement(Card, {
      key: i,
      interactive: true,
      padding: 0,
      style: {
        overflow: 'hidden',
        opacity: g.status === 'purchased' ? 0.72 : 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 110,
        background: g.tone,
        display: 'grid',
        placeItems: 'center',
        borderBottom: '1px solid var(--line)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: g.kind === 'fund' ? 'heart' : 'gift',
      size: 34,
      color: g.ink
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 16px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "pl-heading",
      style: {
        fontSize: 16
      }
    }, g.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 16,
        color: 'var(--ink)'
      }
    }, g.price)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 13,
        color: 'var(--lavender-ink)',
        marginTop: 2
      }
    }, g.sub), /*#__PURE__*/React.createElement(GiftStatus, {
      g: g
    })))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'sticky',
        top: 86
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "The registry"), [['Listed', GIFTS.length], ['Claimed', claimed], ['Still open', GIFTS.length - claimed]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: '5px 0'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, l), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        color: 'var(--ink)'
      }
    }, v))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--ink-muted)',
        lineHeight: 1.5,
        fontFamily: 'var(--font-ui)',
        marginTop: 6
      }
    }, "Cash funds settle straight to your account. No fees on gifts.")), /*#__PURE__*/React.createElement(Card, {
      padding: 22,
      style: {
        border: due ? '1px solid var(--gold-line)' : undefined
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none",
      style: {
        margin: 0
      }
    }, "Thank-yous"), due ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        background: 'var(--pl-gold)',
        color: 'var(--pl-ink)',
        borderRadius: 999,
        padding: '1px 8px'
      }
    }, due, " due") : null), THANKS.map((t, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => setSel(sel === i ? null : i),
      style: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 0',
        borderBottom: i < THANKS.length - 1 ? '1px solid var(--line-soft)' : 'none',
        background: 'transparent',
        border: 'none',
        borderBottomStyle: 'solid',
        cursor: 'pointer',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, t.who), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 11,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, t.gift)), /*#__PURE__*/React.createElement(Badge, {
      tone: T_TONE[t.state],
      variant: "pill",
      dot: t.state === 'sent'
    }, T_LABEL[t.state]))), selT && selT.state !== 'sent' ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        padding: 14,
        borderRadius: 12,
        background: 'var(--cream-3)',
        border: '1px solid var(--line)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 15,
      color: "var(--lavender-ink)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.14em',
        color: 'var(--lavender-ink)'
      }
    }, "PEAR DREW THIS UP")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 14,
        lineHeight: 1.5,
        color: 'var(--ink)'
      }
    }, selT.note), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        marginTop: 12
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm",
      style: {
        flex: 1
      }
    }, "Send"), /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm"
    }, "Edit"))) : /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm",
      style: {
        width: '100%',
        marginTop: 12
      }
    }, "\u2726 Draft all with Pear"))));
  }

  // ──────────────────────── Analytics ────────────────────────
  function Kpi({
    l,
    v,
    delta,
    c
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      padding: "18px 20px"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.14em',
        color: 'var(--ink-muted)',
        marginBottom: 8
      }
    }, l.toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 40,
        lineHeight: 1,
        fontWeight: 400,
        letterSpacing: '-0.025em',
        color: 'var(--ink)'
      }
    }, v), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: c,
        marginTop: 8,
        fontWeight: 500,
        fontFamily: 'var(--font-ui)'
      }
    }, delta));
  }
  const FUNNEL = [{
    s: 'Invites sent',
    n: 64,
    pct: 100,
    c: 'var(--ink)'
  }, {
    s: 'Opened',
    n: 56,
    pct: 88,
    c: 'var(--sage)'
  }, {
    s: 'Started a reply',
    n: 49,
    pct: 77,
    c: 'var(--pl-gold)'
  }, {
    s: 'Replied',
    n: 46,
    pct: 72,
    c: 'var(--accent-ink, var(--peach-ink))'
  }];
  const SOURCES = [{
    s: 'Text message',
    pct: 48,
    c: 'var(--sage)'
  }, {
    s: 'Email',
    pct: 31,
    c: 'var(--pl-gold)'
  }, {
    s: 'Shared link',
    pct: 21,
    c: 'var(--lavender-ink)'
  }];
  function Analytics() {
    return /*#__PURE__*/React.createElement("main", {
      style: {
        padding: '0 clamp(20px,4vw,40px) 48px',
        maxWidth: 1240,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 14,
        marginBottom: 20
      },
      className: "pd-an-kpi"
    }, /*#__PURE__*/React.createElement(Kpi, {
      l: "Site visits \xB7 all time",
      v: "2,418",
      delta: "138 today",
      c: "var(--sage)"
    }), /*#__PURE__*/React.createElement(Kpi, {
      l: "Today",
      v: "138",
      delta: "Since midnight",
      c: "var(--pl-gold)"
    }), /*#__PURE__*/React.createElement(Kpi, {
      l: "Mobile share",
      v: "68%",
      delta: "1,644 mobile \xB7 774 desktop",
      c: "var(--lavender-ink)"
    }), /*#__PURE__*/React.createElement(Kpi, {
      l: "RSVP conversion",
      v: "72%",
      delta: "46 of 64 invited",
      c: "var(--accent-ink, var(--peach-ink))"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 20,
        marginBottom: 20
      },
      className: "pd-an-charts"
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 28
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "From sent to replied"), /*#__PURE__*/React.createElement("div", {
      className: "pl-heading",
      style: {
        fontSize: 22,
        margin: '8px 0 18px'
      }
    }, "The RSVP ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--lavender-ink)',
        fontFamily: 'var(--font-display)'
      }
    }, "funnel.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, FUNNEL.map((f, i) => /*#__PURE__*/React.createElement("div", {
      key: f.s
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, f.s), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 11.5,
        color: 'var(--ink-muted)'
      }
    }, f.n, " \xB7 ", f.pct, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 14,
        background: 'var(--cream-3)',
        borderRadius: 8,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: f.pct + '%',
        height: '100%',
        background: f.c,
        borderRadius: 8
      }
    })), i < FUNNEL.length - 1 ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9.5,
        color: 'var(--ink-muted)',
        marginTop: 4,
        textAlign: 'right'
      }
    }, "\u2193 ", FUNNEL[i].n - FUNNEL[i + 1].n, " dropped") : null)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 24,
      style: {
        background: 'var(--accent-bg, var(--peach-bg))',
        border: '1px solid var(--accent, var(--peach))'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.14em',
        color: 'var(--accent-ink, var(--peach-ink))',
        marginBottom: 8
      }
    }, "STILL QUIET"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 38,
        lineHeight: 1,
        color: 'var(--ink)'
      }
    }, "8 parties"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--ink-soft)',
        margin: '8px 0 14px',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.5
      }
    }, "opened the invite but never replied. Two more weeks until your deadline."), /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm",
      style: {
        width: '100%'
      }
    }, "See who in Guests \u2192")), /*#__PURE__*/React.createElement(Card, {
      padding: 24
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "How they arrived"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, SOURCES.map(s => /*#__PURE__*/React.createElement("div", {
      key: s.s
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, s.s), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 11,
        color: s.c
      }
    }, s.pct, "%")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 8,
        background: 'var(--cream-3)',
        borderRadius: 99,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: s.pct + '%',
        height: '100%',
        background: s.c,
        borderRadius: 99
      }
    })))))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 20
      },
      className: "pd-an-scroll"
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 28
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none",
      color: "var(--lavender-ink)",
      ruleColor: "var(--lavender-ink)"
    }, "What people read"), /*#__PURE__*/React.createElement("div", {
      className: "pl-heading",
      style: {
        fontSize: 22,
        margin: '8px 0 16px'
      }
    }, "Engagement ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--lavender-ink)',
        fontFamily: 'var(--font-display)'
      }
    }, "by section.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, [['Cover', 100, 'var(--sage)'], ['Our story', 88, 'var(--sage)'], ['The day', 81, 'var(--sage)'], ['Travel', 64, 'var(--pl-gold)'], ['Registry', 52, 'var(--pl-gold)'], ['FAQ', 41, 'var(--accent-ink, var(--peach-ink))'], ['Gallery', 33, 'var(--accent-ink, var(--peach-ink))'], ['RSVP', 71, 'var(--lavender-ink)']].map(([s, pct, c]) => /*#__PURE__*/React.createElement("div", {
      key: s,
      style: {
        display: 'grid',
        gridTemplateColumns: '110px 1fr 48px',
        gap: 14,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, s), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 12,
        background: 'var(--cream-3)',
        borderRadius: 99,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: pct + '%',
        height: '100%',
        background: c,
        borderRadius: 99
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 11,
        textAlign: 'right',
        color: c,
        fontWeight: 500
      }
    }, pct, "%"))))), /*#__PURE__*/React.createElement(Card, {
      padding: 28,
      style: {
        background: 'var(--ink)',
        color: 'var(--cream)',
        border: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: 'var(--pl-gold)',
        marginBottom: 8
      }
    }, "PEAR'S READING"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        lineHeight: 1.3,
        fontStyle: 'italic',
        fontWeight: 400,
        marginBottom: 18
      }
    }, "\"Guests drop off around the Gallery. Want me to move it above Travel?\""), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm"
    }, "Ask Pear why"), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      style: {
        color: 'var(--cream)',
        borderColor: 'rgba(245,239,226,0.22)'
      }
    }, "Dismiss")))));
  }
  window.Registry = Registry;
  window.Analytics = Analytics;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/ScreensExtra.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/ScreensGuests.jsx
try { (() => {
/* global React */
// Pearloom dashboard — Guests. One home for everything guest-shaped:
// Roster (RSVPs · meals · dietary · follow-up cadence · table links),
// Messages (broadcast + DMs), and Seating. Built for what a host
// actually frets over — a confident headcount and a fed, seated room.
(() => {
  const {
    Card,
    Badge,
    Button,
    Eyebrow,
    Thread,
    Pearl,
    PearloomGlyph
  } = window.PearloomDesignSystem_55118c;
  const Icon = window.Icon;
  const openGuestView = window.openGuestView;

  // party = seats in the reply · kids = of which children · meal = entrée chosen · table = seated at
  const GUESTS = [{
    party: 'Amara + Tobi',
    em: 'amara@hey.com',
    rsvp: 'yes',
    count: 2,
    kids: 0,
    meal: 'Fish',
    diet: 'Pescatarian',
    allergy: 'Tree nuts',
    note: '',
    track: 'opened',
    table: 3
  }, {
    party: 'Jonah Reyes',
    em: 'jonah@reyes.co',
    rsvp: 'yes',
    count: 1,
    kids: 0,
    meal: 'Garden',
    diet: 'Vegetarian',
    allergy: '',
    note: '',
    track: 'opened',
    table: 3
  }, {
    party: 'Cal & Dana Whitmore',
    em: 'cal@whitmore.net',
    rsvp: 'maybe',
    count: 2,
    kids: 1,
    meal: '',
    diet: '',
    allergy: '',
    note: 'High chair for the little one',
    track: 'opened'
  }, {
    party: 'Priya + guest',
    em: 'priya.nair@gmail.com',
    rsvp: 'pending',
    count: 2,
    kids: 0,
    meal: '',
    diet: '',
    allergy: '',
    note: '',
    track: 'opened'
  }, {
    party: 'Dewei Lin',
    em: 'dewei@lin.dev',
    rsvp: 'pending',
    count: 1,
    kids: 0,
    meal: '',
    diet: '',
    allergy: '',
    note: '',
    track: 'sent',
    stale: true
  }, {
    party: 'Marisol + Diego',
    em: 'marisol@vega.mx',
    rsvp: 'yes',
    count: 2,
    kids: 0,
    meal: 'Beef',
    diet: '',
    allergy: 'Shellfish',
    note: '',
    track: 'opened',
    table: 1
  }, {
    party: 'Glenn & Ruth Abernathy',
    em: 'glenn@abernathy.us',
    rsvp: 'no',
    count: 0,
    kids: 0,
    meal: '',
    diet: '',
    allergy: '',
    note: 'Sends love',
    track: 'opened'
  }, {
    party: 'Sage Kowalski',
    em: 'sage.k@proton.me',
    rsvp: 'pending',
    count: 1,
    kids: 0,
    meal: '',
    diet: 'Vegan',
    allergy: '',
    note: '',
    track: 'opened',
    stale: true
  }];
  const RSVP_TONE = {
    yes: 'olive',
    maybe: 'gold',
    no: 'plum',
    pending: 'neutral'
  };
  const RSVP_LABEL = {
    yes: 'Coming',
    maybe: 'Maybe',
    no: 'Declined',
    pending: 'Pending'
  };
  const CADENCE = [{
    when: 'Sent',
    label: 'Save-the-date',
    done: true
  }, {
    when: 'Sun',
    label: 'Gentle reminder',
    done: true
  }, {
    when: 'Aug 1',
    label: 'Firm nudge — Pear drafts',
    now: true
  }, {
    when: 'Aug 8',
    label: 'Final call',
    done: false
  }];
  function Toggle({
    on,
    onClick
  }) {
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      style: {
        width: 38,
        height: 22,
        borderRadius: 999,
        border: 'none',
        background: on ? 'var(--sage)' : 'var(--line)',
        position: 'relative',
        cursor: 'pointer',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: 3,
        left: on ? 19 : 3,
        width: 16,
        height: 16,
        borderRadius: 99,
        background: 'var(--cream)',
        transition: 'left 160ms var(--pl-ease-spring)',
        boxShadow: 'var(--shadow-sm)'
      }
    }));
  }
  function Roster() {
    const [filter, setFilter] = React.useState('all');
    const [q, setQ] = React.useState('');
    const [pol, setPol] = React.useState({
      plus: true,
      kids: true
    });
    const c = GUESTS.reduce((a, g) => {
      a.all++;
      a[g.rsvp]++;
      if (g.stale) a.stale++;
      return a;
    }, {
      all: 0,
      yes: 0,
      maybe: 0,
      no: 0,
      pending: 0,
      stale: 0
    });
    const coming = GUESTS.filter(g => g.rsvp === 'yes').reduce((s, g) => s + g.count, 0);
    const likely = GUESTS.filter(g => g.rsvp === 'maybe').reduce((s, g) => s + g.count, 0);
    const kids = GUESTS.filter(g => g.rsvp === 'yes').reduce((s, g) => s + g.kids, 0);
    const meals = GUESTS.filter(g => g.meal).reduce((m, g) => {
      m[g.meal] = (m[g.meal] || 0) + 1;
      return m;
    }, {});
    const mealsLeft = coming - Object.values(meals).reduce((a, b) => a + b, 0);
    const allergies = GUESTS.filter(g => g.allergy).map(g => g.allergy);
    const rows = GUESTS.filter(g => {
      const fm = filter === 'all' ? true : filter === 'stale' ? g.stale : g.rsvp === filter;
      return fm && (!q || (g.party + g.em + g.diet + g.allergy + g.note).toLowerCase().includes(q.toLowerCase()));
    });
    return /*#__PURE__*/React.createElement("div", {
      className: "pd-guests",
      style: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 300px',
        gap: 22,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: 'var(--accent-bg, var(--peach-bg))',
        border: '1px solid var(--accent, var(--peach))',
        borderRadius: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 30,
        height: 30,
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--card)',
        color: 'var(--accent-ink, var(--peach-ink))',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 15
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--ink)',
        flex: 1,
        fontFamily: 'var(--font-ui)'
      }
    }, /*#__PURE__*/React.createElement("strong", null, c.stale, " parties"), " opened the invite a week ago and never replied. Pear can send a gentle nudge in your voice."), /*#__PURE__*/React.createElement(Button, {
      variant: "terra",
      size: "sm"
    }, "Draft a nudge")), /*#__PURE__*/React.createElement(Card, {
      padding: 0,
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        borderBottom: '1px solid var(--line)',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "pl-hscroll",
      style: {
        display: 'flex',
        gap: 8
      }
    }, [['all', 'All'], ['yes', 'Coming'], ['maybe', 'Maybe'], ['pending', 'Pending'], ['stale', 'Quiet'], ['no', 'Declined']].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setFilter(k),
      style: {
        padding: '6px 13px',
        fontSize: 12,
        borderRadius: 999,
        background: filter === k ? 'var(--ink)' : 'transparent',
        color: filter === k ? 'var(--cream)' : 'var(--ink)',
        border: `1px solid ${filter === k ? 'var(--ink)' : 'var(--line)'}`,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontWeight: 500,
        whiteSpace: 'nowrap'
      }
    }, l, " \xB7 ", c[k] ?? c.all))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--cream-3)',
        border: '1px solid var(--line)',
        borderRadius: 999,
        padding: '6px 12px',
        minWidth: 150
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 13,
      color: "var(--ink-muted)"
    }), /*#__PURE__*/React.createElement("input", {
      value: q,
      onChange: e => setQ(e.target.value),
      placeholder: "Search name, diet, note\u2026",
      style: {
        flex: 1,
        border: 'none',
        background: 'transparent',
        outline: 'none',
        fontSize: 12.5,
        fontFamily: 'var(--font-ui)',
        color: 'var(--ink)'
      }
    }))), rows.length === 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '48px 24px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 22,
        color: 'var(--sage-deep)'
      }
    }, "Nobody here yet."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'var(--ink-muted)',
        marginTop: 6,
        fontFamily: 'var(--font-ui)'
      }
    }, "Try another filter, or clear the search.")) : null, /*#__PURE__*/React.createElement("div", null, rows.map((g, i) => /*#__PURE__*/React.createElement("div", {
      key: g.em,
      style: {
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr auto',
        gap: 14,
        alignItems: 'center',
        padding: '13px 18px',
        borderBottom: i < rows.length - 1 ? '1px solid var(--line-soft)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, g.party, g.count > 1 ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-muted)',
        fontWeight: 400
      }
    }, " \xB7 party of ", g.count, g.kids ? ` (${g.kids} child)` : '') : null), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--pl-font-mono)',
        marginTop: 2
      }
    }, g.em, g.table ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sage-deep)'
      }
    }, " \xB7 table ", g.table) : g.track === 'opened' && g.rsvp === 'yes' ? ' · unseated' : '')), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 5,
        alignItems: 'center'
      }
    }, g.meal ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 999,
        background: 'var(--cream-3)',
        border: '1px solid var(--line)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, g.meal) : null, g.diet ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 999,
        background: 'var(--sage-tint)',
        color: 'var(--sage-deep)',
        fontFamily: 'var(--font-ui)'
      }
    }, g.diet) : null, g.allergy ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 999,
        background: 'var(--pl-plum-mist)',
        color: 'var(--pl-plum)',
        fontFamily: 'var(--font-ui)'
      }
    }, "\u26A0 ", g.allergy) : null, g.note ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontStyle: 'italic',
        fontFamily: 'var(--font-ui)'
      }
    }, g.note) : null), g.stale ? /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm",
      onClick: () => openGuestView(g)
    }, "Resend link") : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: RSVP_TONE[g.rsvp],
      variant: "pill",
      dot: true
    }, RSVP_LABEL[g.rsvp]), /*#__PURE__*/React.createElement("button", {
      onClick: () => openGuestView(g),
      title: "See the site as this guest",
      style: {
        width: 28,
        height: 28,
        borderRadius: 8,
        border: '1px solid var(--line)',
        background: 'var(--card)',
        color: 'var(--ink-soft)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "arrow",
      size: 13
    })))))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'sticky',
        top: 86
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "The count"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        margin: '10px 0 4px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 42,
        lineHeight: 1,
        color: 'var(--ink)'
      }
    }, coming), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--ink-soft)',
        fontFamily: 'var(--font-ui)'
      }
    }, "coming for sure")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)',
        marginBottom: 14
      }
    }, "+", likely, " likely \xB7 ", kids, " ", kids === 1 ? 'child' : 'children', " \xB7 ", c.pending, " parties yet to reply"), /*#__PURE__*/React.createElement(Thread, {
      width: "100%",
      style: {
        margin: '0 0 12px'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.14em',
        color: 'var(--ink-muted)',
        marginBottom: 8
      }
    }, "MEALS CHOSEN"), Object.entries(meals).map(([m, n]) => /*#__PURE__*/React.createElement("div", {
      key: m,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, m), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 12,
        color: 'var(--ink)'
      }
    }, n))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)',
        marginTop: 2
      }
    }, mealsLeft, " still to choose"), allergies.length ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 10,
        padding: '8px 10px',
        borderRadius: 8,
        background: 'var(--pl-plum-mist)',
        fontSize: 12,
        color: 'var(--pl-plum)',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.4
      }
    }, "\u26A0 Allergies: ", allergies.join(', ')) : null, /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm",
      style: {
        width: '100%',
        marginTop: 12
      }
    }, "Export catering sheet")), /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none",
      style: {
        margin: 0
      }
    }, "Replies by"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 18,
        color: 'var(--ink)'
      }
    }, "Aug 10")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)',
        marginBottom: 12
      }
    }, "23 days out \xB7 Pear's nudge cadence"), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 5,
        top: 6,
        bottom: 6,
        width: 2,
        background: 'var(--line)'
      }
    }), CADENCE.map((s, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '5px 0',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 12,
        height: 12,
        borderRadius: 99,
        flexShrink: 0,
        zIndex: 1,
        background: s.done ? 'var(--sage)' : s.now ? 'var(--accent-ink, var(--peach-ink))' : 'var(--cream)',
        border: `2px solid ${s.done ? 'var(--sage)' : s.now ? 'var(--accent-ink, var(--peach-ink))' : 'var(--line)'}`
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 12.5,
        color: s.done ? 'var(--ink-muted)' : 'var(--ink)',
        fontWeight: s.now ? 600 : 400,
        fontFamily: 'var(--font-ui)'
      }
    }, s.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        color: 'var(--ink-muted)'
      }
    }, s.when))))), /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "Reply form rules"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0 10px',
        borderBottom: '1px solid var(--line-soft)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 13.5,
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, "Allow a plus-one"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, "Guests may bring one")), /*#__PURE__*/React.createElement(Toggle, {
      on: pol.plus,
      onClick: () => setPol(p => ({
        ...p,
        plus: !p.plus
      }))
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0 2px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 13.5,
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, "Kids welcome"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, "Show a children count field")), /*#__PURE__*/React.createElement(Toggle, {
      on: pol.kids,
      onClick: () => setPol(p => ({
        ...p,
        kids: !p.kids
      }))
    }))), /*#__PURE__*/React.createElement(Card, {
      padding: 22,
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "Each guest's own door"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 92,
        height: 92,
        margin: '12px auto 10px',
        borderRadius: 12,
        background: 'var(--cream-3)',
        border: '1px solid var(--line)',
        display: 'grid',
        placeItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 40
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--ink-soft)',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.5,
        marginBottom: 12
      }
    }, "Every guest gets a personal link. The site greets them by name and pre-fills their reply \u2014 and you see who's opened it."), /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm",
      style: {
        width: '100%',
        marginBottom: 8
      },
      onClick: () => openGuestView({})
    }, "Preview as a guest"), /*#__PURE__*/React.createElement("button", {
      style: {
        width: '100%',
        padding: '6px',
        background: 'transparent',
        border: 'none',
        color: 'var(--accent-ink, var(--peach-ink))',
        fontSize: 12.5,
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        cursor: 'pointer'
      }
    }, "See the live site \u2192"))));
  }

  // ───────────────────────── Messages ─────────────────────────
  const TEMPLATES = ['Shuttle & parking', 'Weather update', 'Dress code', 'Thank you', 'Schedule change'];
  const PARTY = [{
    from: 'Mira (you)',
    host: true,
    when: 'Jun 12',
    body: 'Shuttle leaves the hotel at 3:30 sharp — don\u2019t be the one we wait for!',
    to: 'All 64 guests'
  }, {
    from: 'Jonah Reyes',
    host: false,
    when: 'Jun 13',
    body: 'Anyone want to split a cab from the airport Friday?'
  }, {
    from: 'Priya Nair',
    host: false,
    when: 'Jun 14',
    body: 'I\u2019m in! Landing at 2pm.'
  }];
  const DMS = [{
    name: 'Cal Whitmore',
    last: 'We\u2019ll need a high chair for the little one.',
    msgs: [{
      host: false,
      body: 'We\u2019ll need a high chair for the little one — possible?'
    }, {
      host: true,
      body: 'Absolutely, I\u2019ll let the venue know. Can\u2019t wait to meet them!'
    }]
  }, {
    name: 'Sage Kowalski',
    last: 'You: See you there!',
    msgs: [{
      host: false,
      body: 'Is the ceremony outdoors?'
    }, {
      host: true,
      body: 'It is — bring a layer for the evening. See you there!'
    }]
  }];
  function Messages() {
    const [draft, setDraft] = React.useState('');
    const [to, setTo] = React.useState('all');
    const [open, setOpen] = React.useState(0);
    const AUD = [['all', 'Everyone · 64'], ['yes', 'Coming · 38'], ['pending', 'Not replied · 8']];
    return /*#__PURE__*/React.createElement("div", {
      className: "pd-msgs",
      style: {
        display: 'grid',
        gridTemplateColumns: '1.3fr 1fr',
        gap: 20,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.16em',
        color: 'var(--ink-muted)'
      }
    }, "BROADCAST"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "clock",
      size: 12
    }), " 1 scheduled for Aug 1")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginBottom: 14
      }
    }, PARTY.map((m, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        padding: '10px 12px',
        borderRadius: 12,
        background: m.host ? 'var(--sage-tint)' : 'var(--cream-3)',
        border: '1px solid var(--line)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        fontWeight: 700,
        color: m.host ? 'var(--sage-deep)' : 'var(--ink)',
        marginBottom: 3,
        fontFamily: 'var(--font-ui)',
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, m.from, m.to ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: 'var(--ink-muted)',
        fontSize: 10
      }
    }, "\u2192 ", m.to) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 400,
        color: 'var(--ink-muted)',
        fontSize: 10.5
      }
    }, m.when)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, m.body), m.host ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid var(--sage-bg)',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.08em',
        color: 'var(--sage-deep)'
      }
    }, "SEEN BY 41 OF 64"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), ['Site', 'Email', 'Text'].map(ch => /*#__PURE__*/React.createElement("span", {
      key: ch,
      style: {
        fontSize: 10,
        padding: '1px 7px',
        borderRadius: 999,
        background: 'var(--card)',
        border: '1px solid var(--sage-bg)',
        color: 'var(--sage-deep)',
        fontFamily: 'var(--font-ui)'
      }
    }, ch))) : null))), /*#__PURE__*/React.createElement("div", {
      className: "pl-hscroll",
      style: {
        display: 'flex',
        gap: 6,
        marginBottom: 10
      }
    }, AUD.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setTo(k),
      style: {
        padding: '5px 11px',
        fontSize: 11.5,
        borderRadius: 999,
        background: to === k ? 'var(--ink)' : 'transparent',
        color: to === k ? 'var(--cream)' : 'var(--ink)',
        border: `1px solid ${to === k ? 'var(--ink)' : 'var(--line)'}`,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap'
      }
    }, l))), /*#__PURE__*/React.createElement("div", {
      className: "pl-hscroll",
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 10
      }
    }, TEMPLATES.map(t => /*#__PURE__*/React.createElement("button", {
      key: t,
      onClick: () => setDraft(t + ': '),
      style: {
        padding: '5px 11px',
        fontSize: 11.5,
        borderRadius: 999,
        background: 'var(--cream-3)',
        border: '1px solid var(--line)',
        color: 'var(--ink-soft)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap'
      }
    }, t))), /*#__PURE__*/React.createElement("form", {
      onSubmit: e => {
        e.preventDefault();
        setDraft('');
      },
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("input", {
      value: draft,
      onChange: e => setDraft(e.target.value),
      placeholder: "Write to the chosen group\u2026",
      style: {
        flex: 1,
        padding: '10px 14px',
        borderRadius: 999,
        border: '1px solid var(--line)',
        background: 'var(--cream-3)',
        fontSize: 13,
        fontFamily: 'var(--font-ui)',
        color: 'var(--ink)',
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm",
      type: "submit"
    }, "Post"))), /*#__PURE__*/React.createElement(Card, {
      padding: 22,
      style: {
        background: 'var(--cream-3)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.16em',
        color: 'var(--ink-muted)',
        marginBottom: 12
      }
    }, "DIRECT MESSAGES"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, DMS.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        background: 'var(--card)',
        borderRadius: 12,
        border: '1px solid var(--line)'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpen(open === i ? -1 : i),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '11px 14px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--ink)'
      }
    }, d.name), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-ui)'
      }
    }, d.last), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sage)',
        transform: open === i ? 'rotate(180deg)' : 'none',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 13
    }))), open === i ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, d.msgs.map((m, j) => /*#__PURE__*/React.createElement("div", {
      key: j,
      style: {
        alignSelf: m.host ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        padding: '8px 12px',
        borderRadius: 12,
        fontSize: 12.5,
        lineHeight: 1.5,
        background: m.host ? 'var(--ink)' : 'var(--cream-3)',
        color: m.host ? 'var(--cream)' : 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, m.body))) : null)))));
  }

  // ───────────────────────── Seating ─────────────────────────
  const TABLES = [{
    n: 1,
    label: 'Family · Vega',
    seats: 8,
    filled: 8
  }, {
    n: 2,
    label: 'Family · Park',
    seats: 8,
    filled: 7
  }, {
    n: 3,
    label: 'College',
    seats: 10,
    filled: 6
  }, {
    n: 4,
    label: 'The neighbours',
    seats: 8,
    filled: 8
  }, {
    n: 5,
    label: 'Work & travel',
    seats: 10,
    filled: 4
  }, {
    n: 0,
    label: 'Sweetheart',
    seats: 2,
    filled: 2,
    head: true
  }];
  const UNSEATED = ['Dewei Lin', 'Sage Kowalski', 'Priya + 1', 'The Whitmores (+ high chair)'];
  function TableToken({
    tb,
    active,
    onClick
  }) {
    const full = tb.filled >= tb.seats;
    const ring = tb.head ? 'var(--pl-gold)' : full ? 'var(--sage)' : tb.filled === 0 ? 'var(--line)' : 'var(--accent-ink, var(--peach-ink))';
    return /*#__PURE__*/React.createElement("button", {
      onClick: onClick,
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative',
        width: 74,
        height: 74,
        borderRadius: 999,
        background: active ? 'var(--accent-bg, var(--peach-bg))' : 'var(--card)',
        border: `2px solid ${active ? 'var(--ink)' : ring}`,
        display: 'grid',
        placeItems: 'center',
        boxShadow: active ? 'var(--shadow)' : 'var(--shadow-sm)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        color: 'var(--ink)',
        lineHeight: 1
      }
    }, tb.head ? '♥' : tb.n), Array.from({
      length: tb.seats
    }).map((_, i) => {
      const a = i / tb.seats * Math.PI * 2 - Math.PI / 2;
      const rad = 45;
      return /*#__PURE__*/React.createElement("span", {
        key: i,
        style: {
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 9,
          height: 9,
          borderRadius: 99,
          transform: `translate(-50%,-50%) translate(${Math.cos(a) * rad}px, ${Math.sin(a) * rad}px)`,
          background: i < tb.filled ? tb.head ? 'var(--pl-gold)' : full ? 'var(--sage)' : 'var(--accent-ink, var(--peach-ink))' : 'var(--cream-3)',
          border: '1.5px solid var(--card)'
        }
      });
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, tb.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        color: full ? 'var(--sage-deep)' : 'var(--ink-muted)'
      }
    }, tb.filled, "/", tb.seats));
  }
  function Seating() {
    const [active, setActive] = React.useState(3);
    const seated = TABLES.reduce((a, t) => a + t.filled, 0);
    return /*#__PURE__*/React.createElement("div", {
      className: "pd-conn",
      style: {
        display: 'grid',
        gridTemplateColumns: '1.5fr 300px',
        gap: 20,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 0,
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 22px',
        borderBottom: '1px solid var(--line)',
        flexWrap: 'wrap',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.16em',
        color: 'var(--ink-muted)'
      }
    }, "THE FLOOR"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 18,
        marginTop: 3,
        fontWeight: 500,
        color: 'var(--ink)'
      }
    }, TABLES.length, " tables \xB7 ", seated, " seated")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 99,
        background: 'var(--pl-plum)'
      }
    }), " allergy"), /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm"
    }, "+ Table"))), /*#__PURE__*/React.createElement("div", {
      className: "pl-tx-dotwork",
      style: {
        padding: '28px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))',
        gap: 12,
        justifyItems: 'center',
        minHeight: 420,
        background: 'linear-gradient(180deg, var(--cream-2), var(--cream-3))'
      }
    }, TABLES.map(tb => /*#__PURE__*/React.createElement(TableToken, {
      key: tb.label,
      tb: tb,
      active: active === tb.n,
      onClick: () => setActive(tb.n)
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        position: 'sticky',
        top: 86
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 22,
      style: {
        background: 'var(--lavender-bg)',
        border: '1px solid var(--lavender-3)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 20,
      color: "var(--lavender-ink)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: 'var(--lavender-ink)'
      }
    }, "LET PEAR SOLVE IT")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'var(--ink)',
        lineHeight: 1.5,
        fontFamily: 'var(--font-ui)',
        marginBottom: 14
      }
    }, "Keep the Vegas and Parks apart, sit the Whitmores near a high chair, group the allergies away from the shellfish course \u2014 Pear seats the last ", UNSEATED.length, " parties to your rules."), /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm",
      style: {
        width: '100%'
      }
    }, "\u2726 Auto-seat the rest")), /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "Unseated"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 11,
        color: 'var(--accent-ink, var(--peach-ink))'
      }
    }, UNSEATED.length)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8
      }
    }, UNSEATED.map(u => /*#__PURE__*/React.createElement("span", {
      key: u,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 999,
        background: 'var(--cream-3)',
        border: '1px dashed var(--line)',
        fontSize: 12,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        cursor: 'grab'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: 99,
        background: 'var(--accent-ink, var(--peach-ink))'
      }
    }), u))))));
  }

  // ───────────────────────── Guests shell ─────────────────────────
  const TABS = [['roster', 'Roster', 'users'], ['messages', 'Messages', 'message'], ['seating', 'Seating', 'table']];
  function Guests() {
    const [tab, setTab] = React.useState('roster');
    return /*#__PURE__*/React.createElement("main", {
      style: {
        padding: '0 clamp(20px,4vw,40px) 48px',
        maxWidth: 1180,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "pl-hscroll",
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 22,
        borderBottom: '1px solid var(--line)'
      }
    }, TABS.map(([k, l, ic]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setTab(k),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 4px',
        marginRight: 18,
        fontSize: 14,
        fontWeight: tab === k ? 600 : 500,
        color: tab === k ? 'var(--ink)' : 'var(--ink-muted)',
        background: 'transparent',
        border: 'none',
        borderBottom: `2px solid ${tab === k ? 'var(--ink)' : 'transparent'}`,
        marginBottom: -1,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        whiteSpace: 'nowrap'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 15
    }), " ", l))), tab === 'roster' ? /*#__PURE__*/React.createElement(Roster, null) : tab === 'messages' ? /*#__PURE__*/React.createElement(Messages, null) : /*#__PURE__*/React.createElement(Seating, null));
  }
  window.Guests = Guests;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/ScreensGuests.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/ScreensHome.jsx
try { (() => {
/* global React */
// Pearloom dashboard — Home, the cockpit. Open it and know in two
// seconds: are we on track, and what needs me today. Phase-aware
// urgency, an openable budget breakdown, co-host presence, the day-of
// run-of-show + broadcast, and a Pear nudge. Occasion-aware copy.
(() => {
  const {
    Card,
    Badge,
    Button,
    Eyebrow,
    Thread,
    Pearl,
    PearloomGlyph
  } = window.PearloomDesignSystem_55118c;
  const Icon = window.Icon;
  const CountUp = window.CountUp;
  const STATS = [{
    k: 'rsvp',
    l: 'Coming',
    num: 38,
    v: '38',
    sub: '+5 likely · of 64',
    c: 'var(--sage)',
    i: 'users'
  }, {
    k: 'budget',
    l: 'Budget used',
    num: 74,
    suffix: '%',
    v: '74%',
    sub: '$35.4k of $48k · tap to open',
    c: 'var(--accent-ink, var(--peach-ink))',
    i: 'heart',
    bar: 74
  }, {
    k: 'gifts',
    l: 'Gifts claimed',
    num: 12,
    v: '12',
    sub: 'of 18 · 3 thank-yous due',
    c: 'var(--pl-gold)',
    i: 'gift'
  }, {
    k: 'days',
    l: 'Days to go',
    num: 84,
    v: '84',
    sub: 'Sept 6, 2026',
    c: 'var(--lavender-ink)',
    i: 'clock'
  }];
  const BUDGET = [{
    cat: 'Venue',
    used: 14000,
    cap: 14000
  }, {
    cat: 'Catering',
    used: 11000,
    cap: 13000
  }, {
    cat: 'Florals',
    used: 4400,
    cap: 4000
  }, {
    cat: 'Music & sound',
    used: 3000,
    cap: 3500
  }, {
    cat: 'Attire',
    used: 2000,
    cap: 3000
  }, {
    cat: 'Stationery & other',
    used: 1000,
    cap: 2500
  }];
  // Phase-aware decision queue — what Pear surfaces shifts with the count.
  const PHASES = {
    planning: {
      label: 'Planning',
      note: '84 days out',
      decide: [{
        i: 'image',
        t: '3 guest photos are waiting for the wall',
        sub: 'The Reel',
        cta: 'Review',
        accent: true
      }, {
        i: 'users',
        t: '2 parties opened the invite but never replied',
        sub: 'Guests · Pear can draft the nudge',
        cta: 'Nudge'
      }, {
        i: 'heart',
        t: "You're $400 over on florals",
        sub: 'Budget · Pear found room in the bar package',
        cta: 'Show me'
      }, {
        i: 'music',
        t: 'First-dance song is still open',
        sub: 'Studio',
        cta: 'Pick'
      }]
    },
    final: {
      label: 'Final stretch',
      note: '12 days out',
      decide: [{
        i: 'users',
        t: 'Send the final headcount to Lark Hill',
        sub: 'Day-of · 43 confirmed',
        cta: 'Send',
        accent: true
      }, {
        i: 'table',
        t: '4 parties are still unseated',
        sub: 'Guests · Seating',
        cta: 'Seat'
      }, {
        i: 'clock',
        t: 'Confirm the shuttle window with Renata',
        sub: 'Day-of',
        cta: 'Confirm'
      }]
    },
    dayof: {
      label: 'The day',
      note: 'today',
      decide: [{
        i: 'clock',
        t: 'Shuttle leaves in 40 minutes',
        sub: '42 guests · Lobby',
        cta: 'Remind all',
        accent: true
      }, {
        i: 'message',
        t: 'Cal asked where to park',
        sub: 'Messages',
        cta: 'Reply'
      }]
    }
  };
  const WEEK = [{
    t: 'Approve the new guest photos',
    who: 'The Reel',
    done: false
  }, {
    t: 'Send the menu to Lark Hill',
    who: 'Day-of',
    done: false
  }, {
    t: 'Confirm the shuttle window',
    who: 'Renata Cole',
    done: false
  }, {
    t: 'Lock the first-dance song',
    who: 'Studio',
    done: true
  }];
  const RUN = [{
    t: '3:30',
    label: 'Shuttle leaves the hotel',
    who: '42 guests'
  }, {
    t: '5:00',
    label: 'The ceremony',
    who: 'Under the cypress'
  }, {
    t: '6:30',
    label: 'Supper & toasts',
    who: 'The long table'
  }];
  const FEED = [{
    who: 'Amara',
    act: 'replied — coming, +1',
    when: '2 hr',
    i: 'check',
    c: 'var(--sage)'
  }, {
    who: 'Jun',
    act: 'confirmed the florist deposit',
    when: '4 hr',
    i: 'heart',
    c: 'var(--lavender-ink)'
  }, {
    who: 'Priya',
    act: 'bought the pour-over set',
    when: 'yesterday',
    i: 'gift',
    c: 'var(--pl-gold)'
  }];
  const fmt = n => '$' + (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'k';
  function Stat({
    s,
    onClick,
    open
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      padding: "16px 18px",
      interactive: true,
      onClick: onClick,
      style: onClick ? {
        cursor: 'pointer',
        borderColor: open ? 'var(--accent-ink, var(--peach-ink))' : undefined
      } : undefined
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.14em',
        color: 'var(--ink-muted)'
      }
    }, s.l.toUpperCase()), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: s.c
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: onClick ? open ? 'chevron' : 'bars' : s.i,
      size: 15
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 36,
        lineHeight: 1,
        fontWeight: 400,
        letterSpacing: '-0.025em',
        color: 'var(--ink)'
      }
    }, CountUp ? /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(CountUp, {
      value: s.num
    }), s.suffix || '') : s.v), s.bar != null ? /*#__PURE__*/React.createElement("div", {
      style: {
        height: 4,
        background: 'var(--cream-3)',
        borderRadius: 99,
        overflow: 'hidden',
        margin: '8px 0 6px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: s.bar + '%',
        height: '100%',
        background: s.c,
        borderRadius: 99
      }
    })) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: s.c,
        marginTop: s.bar != null ? 0 : 8,
        fontWeight: 500,
        fontFamily: 'var(--font-ui)'
      }
    }, s.sub));
  }
  function BudgetBreakdown() {
    const total = BUDGET.reduce((a, b) => a + b.cap, 0);
    const used = BUDGET.reduce((a, b) => a + b.used, 0);
    return /*#__PURE__*/React.createElement(Card, {
      padding: 26
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "Budget"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--ink-soft)'
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        color: 'var(--ink)'
      }
    }, fmt(used)), " committed of ", fmt(total), " \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sage-deep)'
      }
    }, fmt(total - used), " left"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '14px 28px',
        marginTop: 16
      },
      className: "pd-budget"
    }, BUDGET.map(b => {
      const over = b.used > b.cap;
      const pct = Math.min(100, b.used / b.cap * 100);
      return /*#__PURE__*/React.createElement("div", {
        key: b.cat
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 5
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'var(--font-ui)'
        }
      }, b.cat), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--pl-font-mono)',
          fontSize: 11.5,
          color: over ? 'var(--pl-plum)' : 'var(--ink-muted)'
        }
      }, fmt(b.used), " / ", fmt(b.cap), over ? ' ⚠' : '')), /*#__PURE__*/React.createElement("div", {
        style: {
          height: 7,
          background: 'var(--cream-3)',
          borderRadius: 99,
          overflow: 'hidden'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: pct + '%',
          height: '100%',
          background: over ? 'var(--pl-plum)' : 'var(--sage)',
          borderRadius: 99
        }
      })));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 16,
        padding: '10px 14px',
        background: 'var(--lavender-bg)',
        borderRadius: 10,
        fontSize: 13,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 18,
      color: "var(--lavender-ink)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, "Florals are $400 over. Trim the bar package to two signature cocktails to even out?"), /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm"
    }, "Do it")));
  }
  function Home() {
    const [done, setDone] = React.useState(WEEK.map(w => w.done));
    const [bc, setBc] = React.useState('');
    const [openBudget, setOpenBudget] = React.useState(false);
    const phase = PHASES.planning;
    const left = done.filter(d => !d).length;
    return /*#__PURE__*/React.createElement("main", {
      style: {
        padding: '0 clamp(20px,4vw,40px) 48px',
        maxWidth: 1240,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 0,
      style: {
        overflow: 'hidden',
        background: 'var(--ink)',
        border: 'none',
        color: 'var(--cream)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr'
      },
      className: "pd-home-hero"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 'clamp(24px,3vw,36px)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.18em',
        color: 'var(--pl-gold)',
        marginBottom: 12
      }
    }, "A BRIGHT SATURDAY IN POINT REYES"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(40px,5.4vw,64px)',
        lineHeight: 0.98,
        fontWeight: 400,
        letterSpacing: '-0.03em'
      }
    }, CountUp ? /*#__PURE__*/React.createElement(CountUp, {
      value: 84
    }) : 84, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--peach)'
      }
    }, "days")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 15,
        color: 'var(--stone, #C9BFA8)',
        marginTop: 12,
        lineHeight: 1.5,
        fontFamily: 'var(--font-ui)',
        maxWidth: 420
      }
    }, "until two families gather at one very long table. You're on track \u2014 ", phase.decide.length, " things want a decision, and ", left, " small tasks are left this week."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 18
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex'
      }
    }, [['M', 'var(--sage-deep)'], ['J', 'var(--lavender-ink)']].map(([n, c], i) => /*#__PURE__*/React.createElement("span", {
      key: n,
      style: {
        width: 28,
        height: 28,
        borderRadius: 999,
        background: c,
        border: '2px solid var(--ink)',
        marginLeft: i ? -8 : 0,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--cream)',
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 13
      }
    }, n))), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: 'var(--stone, #C9BFA8)',
        fontFamily: 'var(--font-ui)'
      }
    }, "You & Jun, co-hosting \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--peach)'
      }
    }, "Jun was here 4h ago"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        marginTop: 18,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "pearl",
      size: "sm"
    }, "Open the site ", /*#__PURE__*/React.createElement(Pearl, {
      size: 8
    })), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "sm",
      style: {
        color: 'var(--cream)',
        borderColor: 'rgba(245,239,226,0.24)'
      }
    }, "\u2726 Ask Pear to plan"))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        minHeight: 220,
        background: 'linear-gradient(140deg, rgba(240,201,168,0.22), rgba(196,181,217,0.16))',
        borderLeft: '1px solid rgba(245,239,226,0.12)',
        display: 'grid',
        placeItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        opacity: 0.5
      },
      className: "pl-tx-laid"
    }), /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 92,
      color: "rgba(245,239,226,0.5)"
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 14
      },
      className: "pd-home-stats"
    }, STATS.map(s => /*#__PURE__*/React.createElement(Stat, {
      key: s.k,
      s: s,
      onClick: s.k === 'budget' ? () => setOpenBudget(v => !v) : undefined,
      open: s.k === 'budget' && openBudget
    }))), openBudget ? /*#__PURE__*/React.createElement(BudgetBreakdown, null) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 20,
        alignItems: 'flex-start'
      },
      className: "pd-home-cols"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 26
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: 99,
        background: 'var(--accent-ink, var(--peach-ink))'
      }
    }), /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none",
      style: {
        margin: 0
      }
    }, "Needs you now"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 999,
        background: 'var(--cream-3)',
        border: '1px solid var(--line)',
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.12em',
        color: 'var(--ink-soft)'
      }
    }, phase.label.toUpperCase(), " \xB7 ", phase.note.toUpperCase())), /*#__PURE__*/React.createElement("div", {
      className: "pl-heading",
      style: {
        fontSize: 22,
        margin: '4px 0 16px'
      }
    }, phase.decide.length, " things only ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--lavender-ink)',
        fontFamily: 'var(--font-display)'
      }
    }, "you can decide.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column'
      }
    }, phase.decide.map((d, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 0',
        borderBottom: i < phase.decide.length - 1 ? '1px solid var(--line-soft)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 34,
        height: 34,
        borderRadius: 10,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: d.accent ? 'var(--accent-bg, var(--peach-bg))' : 'var(--cream-3)',
        color: d.accent ? 'var(--accent-ink, var(--peach-ink))' : 'var(--ink-soft)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: d.i,
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.35
      }
    }, d.t), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 12,
        color: 'var(--ink-muted)',
        marginTop: 2,
        fontFamily: 'var(--font-ui)'
      }
    }, d.sub)), /*#__PURE__*/React.createElement(Button, {
      variant: d.accent ? 'ink' : 'paper',
      size: "sm"
    }, d.cta))))), /*#__PURE__*/React.createElement(Card, {
      padding: 26
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "This week"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 11,
        color: 'var(--ink-muted)'
      }
    }, left, " open")), WEEK.map((w, i) => /*#__PURE__*/React.createElement("button", {
      key: i,
      onClick: () => setDone(d => d.map((v, j) => j === i ? !v : v)),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '11px 0',
        borderBottom: i < WEEK.length - 1 ? '1px solid var(--line-soft)' : 'none',
        background: 'transparent',
        border: 'none',
        borderBottomStyle: 'solid',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 20,
        height: 20,
        borderRadius: 6,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        border: `1.5px solid ${done[i] ? 'var(--sage)' : 'var(--line)'}`,
        background: done[i] ? 'var(--sage)' : 'transparent',
        color: 'var(--cream)'
      }
    }, done[i] ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 12,
      strokeWidth: 3
    }) : null), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 14,
        fontWeight: 500,
        color: done[i] ? 'var(--ink-muted)' : 'var(--ink)',
        textDecoration: done[i] ? 'line-through' : 'none',
        fontFamily: 'var(--font-ui)'
      }
    }, w.t), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 12,
        color: 'var(--ink-muted)',
        marginTop: 1,
        fontFamily: 'var(--font-ui)'
      }
    }, w.who)))))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 0,
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '16px 20px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "The day"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        color: 'var(--ink-muted)'
      }
    }, "OPENS SEPT 1")), /*#__PURE__*/React.createElement("div", {
      className: "pl-heading",
      style: {
        fontSize: 19,
        margin: '6px 0 12px'
      }
    }, "Run of ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--lavender-ink)',
        fontFamily: 'var(--font-display)'
      }
    }, "the day."))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '0 20px'
      }
    }, RUN.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'baseline',
        padding: '8px 0',
        borderBottom: i < RUN.length - 1 ? '1px solid var(--line-soft)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 12,
        color: 'var(--accent-ink, var(--peach-ink))',
        width: 38
      }
    }, r.t), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontSize: 13.5,
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, r.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, r.who))))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 20px 18px',
        marginTop: 8,
        background: 'var(--ink)',
        color: 'var(--cream)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.16em',
        color: 'var(--pl-gold)',
        marginBottom: 8
      }
    }, "IF PLANS SHIFT \u2014 ONE LINE TO ALL"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("input", {
      value: bc,
      onChange: e => setBc(e.target.value),
      placeholder: "e.g. Shuttle now at 3:45\u2026",
      style: {
        flex: 1,
        padding: '8px 12px',
        borderRadius: 999,
        border: '1px solid rgba(245,239,226,0.2)',
        background: 'rgba(245,239,226,0.06)',
        color: 'var(--cream)',
        fontSize: 12.5,
        fontFamily: 'var(--font-ui)',
        outline: 'none'
      }
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "pearl",
      size: "sm"
    }, "Send")))), /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "Lately"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, FEED.map((f, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 0',
        borderBottom: i < FEED.length - 1 ? '1px solid var(--line-soft)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 28,
        height: 28,
        borderRadius: 8,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--cream-3)',
        color: f.c
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: f.i,
      size: 13
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, /*#__PURE__*/React.createElement("strong", {
      style: {
        fontWeight: 600
      }
    }, f.who), " ", f.act), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        color: 'var(--ink-muted)'
      }
    }, f.when))))))), /*#__PURE__*/React.createElement(Card, {
      padding: 0,
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '20px 26px 0'
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "The long view"), /*#__PURE__*/React.createElement("div", {
      className: "pl-heading",
      style: {
        fontSize: 20,
        margin: '6px 0 2px'
      }
    }, "This day is the ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--lavender-ink)',
        fontFamily: 'var(--font-display)'
      }
    }, "first knot.")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13.5,
        color: 'var(--ink-soft)',
        lineHeight: 1.5,
        fontFamily: 'var(--font-ui)',
        maxWidth: 560,
        margin: '6px 0 0'
      }
    }, "A wedding today is a keepsake in forty years. Pear keeps the weave going long after the last dance.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 0,
        padding: '20px 26px 24px'
      }
    }, [['heart', 'Sept 6, 2026', 'The day', 'var(--accent-ink, var(--peach-ink))', true], ['image', 'That week', 'The Reel fills with guest photos', 'var(--sage)'], ['gift', 'One year on', 'Pear sends a first-anniversary note', 'var(--pl-gold)'], ['sparkles', 'Forever', 'The site becomes a keepsake page', 'var(--lavender-ink)']].map(([ic, when, what, c, now], i, arr) => /*#__PURE__*/React.createElement("div", {
      key: when,
      style: {
        position: 'relative',
        paddingRight: 16
      }
    }, i < arr.length - 1 ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: 16,
        right: 0,
        top: 16,
        height: 2,
        background: 'var(--line)',
        backgroundImage: 'linear-gradient(90deg, var(--line) 50%, transparent 50%)',
        backgroundSize: '8px 2px'
      }
    }) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'relative',
        zIndex: 1,
        width: 34,
        height: 34,
        borderRadius: 999,
        display: 'grid',
        placeItems: 'center',
        background: now ? c : 'var(--card)',
        color: now ? 'var(--cream)' : c,
        border: `2px solid ${c}`
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.12em',
        color: 'var(--ink-muted)',
        marginTop: 12
      }
    }, when.toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        marginTop: 3,
        lineHeight: 1.4
      }
    }, what))))));
  }
  window.Home = Home;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/ScreensHome.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/ScreensSite.jsx
try { (() => {
/* global React */
// Pearloom dashboard — My sites. Every celebration you're hosting, each
// card carrying its live pulse, its co-hosts, its address, and the one
// thing it needs next. New sites start from an occasion; old ones rest
// in the archive.
(() => {
  const {
    Card,
    Badge,
    Button,
    Eyebrow,
    Pearl,
    PearloomGlyph
  } = window.PearloomDesignSystem_55118c;
  const Icon = window.Icon;
  const LockChip = window.LockChip;
  const MY = [{
    name: 'Mira & Jun',
    occ: 'Wedding',
    date: 'Sept 6, 2026',
    status: 'live',
    tint: 'var(--peach-bg)',
    ink: 'var(--peach-ink)',
    img: '../../assets/imagery/vase-linen-still.png',
    rsvp: '38 / 64',
    visits: '2,418',
    theme: 'Pressed Garden',
    next: '3 photos to approve',
    domain: 'mira-and-jun.com',
    domainOk: true,
    hosts: [['M', 'var(--sage-deep)'], ['J', 'var(--lavender-ink)']]
  }, {
    name: "Maya's 30th",
    occ: 'Birthday',
    date: 'Aug 16, 2026',
    status: 'draft',
    tint: 'rgba(193,154,75,0.16)',
    ink: '#8A6A2E',
    img: null,
    rsvp: '— / 24',
    visits: '0',
    theme: 'First Light',
    next: 'Pear has a draft ready',
    domain: 'pearloom.com/mayas-30th',
    domainOk: false,
    hosts: [['M', 'var(--sage-deep)']]
  }];
  const ARCHIVED = [{
    name: 'Vega family reunion',
    occ: 'Reunion',
    date: 'Last July',
    tint: 'var(--sage-tint)',
    ink: 'var(--sage-deep)'
  }];
  const OCCASIONS = [['Wedding', 'heart'], ['Birthday', 'sparkles'], ['Anniversary', 'gift'], ['Memorial', 'pin'], ['Shower', 'image'], ['Something else', 'plus']];
  function SiteCard({
    s
  }) {
    return /*#__PURE__*/React.createElement(Card, {
      interactive: true,
      padding: 0,
      style: {
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 150,
        position: 'relative',
        background: s.img ? `center/cover url(${s.img})` : s.tint,
        borderBottom: '1px solid var(--line)'
      }
    }, !s.img ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 54,
      color: s.ink
    })) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 12,
        left: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: 'var(--pl-glass)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--pl-glass-border)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 7,
        height: 7,
        borderRadius: 99,
        background: s.status === 'live' ? 'var(--sage)' : 'var(--pl-gold)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--ink)'
      }
    }, s.status === 'live' ? 'Live' : 'Draft')), /*#__PURE__*/React.createElement("button", {
      style: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 30,
        height: 30,
        borderRadius: 999,
        border: 'none',
        background: 'var(--pl-glass)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: 'var(--ink)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center',
        fontSize: 16,
        lineHeight: 1
      },
      title: "Archive \xB7 duplicate \xB7 delete"
    }, "\u22EF")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '16px 20px 18px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "pl-heading",
      style: {
        fontSize: 21
      }
    }, s.name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10.5,
        color: 'var(--ink-muted)'
      }
    }, s.date)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 14,
        color: 'var(--lavender-ink)',
        marginTop: 3
      }
    }, s.occ, " \xB7 ", s.theme), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 22,
        margin: '14px 0',
        paddingTop: 12,
        borderTop: '1px solid var(--line-soft)'
      }
    }, [['RSVPs', s.rsvp], ['Visits', s.visits]].map(([l, v]) => /*#__PURE__*/React.createElement("div", {
      key: l
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.12em',
        color: 'var(--ink-muted)'
      }
    }, l.toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 22,
        color: 'var(--ink)',
        marginTop: 2
      }
    }, v)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex'
      }
    }, s.hosts.map(([n, c], i) => /*#__PURE__*/React.createElement("span", {
      key: n,
      style: {
        width: 24,
        height: 24,
        borderRadius: 999,
        background: c,
        border: '2px solid var(--card)',
        marginLeft: i ? -7 : 0,
        display: 'grid',
        placeItems: 'center',
        color: 'var(--cream)',
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 11
      }
    }, n))), /*#__PURE__*/React.createElement("button", {
      style: {
        width: 24,
        height: 24,
        borderRadius: 999,
        border: '1px dashed var(--line)',
        background: 'transparent',
        color: 'var(--ink-muted)',
        cursor: 'pointer',
        display: 'grid',
        placeItems: 'center'
      },
      title: "Invite a co-host"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        color: s.domainOk ? 'var(--sage-deep)' : 'var(--ink-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: 99,
        background: s.domainOk ? 'var(--sage)' : 'var(--line)'
      }
    }), s.domain, !s.domainOk ? /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 6
      }
    }, /*#__PURE__*/React.createElement(LockChip, {
      label: "Connect a domain"
    })) : null)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 12px',
        borderRadius: 10,
        background: 'var(--accent-bg, var(--peach-bg))',
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--accent-ink, var(--peach-ink))',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "sparkles",
      size: 13
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, s.next)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm",
      style: {
        flex: 1
      }
    }, "Open editor"), /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm"
    }, "Preview"))));
  }
  function MySites() {
    const [picking, setPicking] = React.useState(false);
    return /*#__PURE__*/React.createElement("main", {
      style: {
        padding: '0 clamp(20px,4vw,40px) 56px',
        maxWidth: 1180,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 20
      }
    }, MY.map(s => /*#__PURE__*/React.createElement(SiteCard, {
      key: s.name,
      s: s
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: 380,
        borderRadius: 'var(--r)',
        border: '1.5px dashed var(--line)',
        background: picking ? 'var(--card)' : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        boxSizing: 'border-box',
        transition: 'background 180ms var(--pl-ease-out)'
      }
    }, !picking ? /*#__PURE__*/React.createElement("button", {
      onClick: () => setPicking(true),
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 52,
        height: 52,
        borderRadius: 999,
        border: '1.5px solid var(--accent-ink, var(--peach-ink))',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--accent-ink, var(--peach-ink))'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 22
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 19,
        color: 'var(--ink)'
      }
    }, "Begin a new site"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)',
        maxWidth: 200,
        textAlign: 'center',
        lineHeight: 1.5
      }
    }, "Start from the occasion and Pear drafts the first weave.")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: 'var(--ink-muted)'
      }
    }, "WHAT ARE WE CELEBRATING?"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
        width: '100%'
      }
    }, OCCASIONS.map(([o, ic]) => /*#__PURE__*/React.createElement("button", {
      key: o,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--cream-3)',
        border: '1px solid var(--line)',
        cursor: 'pointer',
        textAlign: 'left'
      },
      onMouseEnter: e => {
        e.currentTarget.style.borderColor = 'var(--accent-ink, var(--peach-ink))';
      },
      onMouseLeave: e => {
        e.currentTarget.style.borderColor = 'var(--line)';
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--accent-ink, var(--peach-ink))',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 15
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 500
      }
    }, o)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, "Hosting a whole weekend? ", /*#__PURE__*/React.createElement(LockChip, {
      label: "Linked events \xB7 atelier"
    })), /*#__PURE__*/React.createElement("button", {
      onClick: () => setPicking(false),
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)'
      }
    }, "Cancel")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none",
      style: {
        marginBottom: 12
      }
    }, "Archived"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16
      }
    }, ARCHIVED.map(a => /*#__PURE__*/React.createElement(Card, {
      key: a.name,
      padding: 16,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        opacity: 0.85
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 48,
        height: 48,
        borderRadius: 10,
        background: a.tint,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 24,
      color: a.ink
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, a.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)'
      }
    }, a.occ, " \xB7 ", a.date)), /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm"
    }, "Restore"))))));
  }
  window.MySites = MySites;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/ScreensSite.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/ScreensStudio.jsx
try { (() => {
/* global React */
// Pearloom dashboard — Studio (invitation studio: live preview across
// channels, Pear's draft with a voice slider, palette, and a matching
// stationery suite) and The Reel (albums + guest-upload controls + the
// submission approval queue folded in).
(() => {
  const {
    Card,
    Badge,
    Button,
    Eyebrow,
    Pearl,
    PearloomGlyph,
    Monogram
  } = window.PearloomDesignSystem_55118c;
  const Icon = window.Icon;
  const LockChip = window.LockChip;
  const PALETTES = [{
    name: 'Pressed Garden',
    cols: ['#5C6B3F', '#D9A89E', '#FBF7EE', '#363F22']
  }, {
    name: 'First Light',
    cols: ['#C6703D', '#F0C9A8', '#FDFAF0', '#3A2A1E']
  }, {
    name: 'Editorial',
    cols: ['#18181B', '#C19A4B', '#FDFAF0', '#6F6557']
  }, {
    name: 'Midnight Velvet',
    cols: ['#0D0B07', '#D4B373', '#A4B57A', '#1A1610']
  }];
  const OCCASIONS = ['Save-the-date', 'Wedding', 'Birthday', 'Anniversary', 'Memorial'];
  const DRAFTS = {
    warm: 'A bright Saturday in Point Reyes — two families, one very long table. Come for the vows, stay for the dancing. Kindly reply by Aug 10.',
    formal: 'Together with their families, Mira Vega and Jun Park request the pleasure of your company at the celebration of their marriage. Point Reyes, the sixth of September. Kindly respond by the tenth of August.'
  };
  const SUITE = [{
    name: 'Menu card',
    i: 'ticket'
  }, {
    name: 'Table numbers',
    i: 'table'
  }, {
    name: 'Thank-you card',
    i: 'heart'
  }, {
    name: 'Program',
    i: 'image'
  }];
  function VoiceSlider({
    label,
    a,
    b,
    val,
    onChange
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9.5,
        letterSpacing: '0.1em',
        color: 'var(--ink-muted)',
        marginBottom: 6
      }
    }, /*#__PURE__*/React.createElement("span", null, a.toUpperCase()), /*#__PURE__*/React.createElement("span", null, b.toUpperCase())), /*#__PURE__*/React.createElement("input", {
      type: "range",
      min: "0",
      max: "100",
      value: val,
      onChange: e => onChange(+e.target.value),
      className: "pl-native-control",
      style: {
        width: '100%',
        accentColor: 'var(--accent-ink, var(--peach-ink))'
      }
    }));
  }
  function ChannelPreview({
    channel,
    p,
    body
  }) {
    if (channel === 'email') {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          width: '100%',
          maxWidth: 460,
          background: 'var(--card)',
          borderRadius: 12,
          border: '1px solid var(--line)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--cream-3)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12,
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-ui)'
        }
      }, "From ", /*#__PURE__*/React.createElement("strong", {
        style: {
          color: 'var(--ink)'
        }
      }, "Mira & Jun"), " \xB7 via Pearloom"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ink)',
          fontFamily: 'var(--font-ui)',
          marginTop: 2
        }
      }, "Save our date \u2014 September 6")), /*#__PURE__*/React.createElement("div", {
        style: {
          height: 110,
          background: `linear-gradient(135deg, ${p.cols[0]}, ${p.cols[3]})`,
          display: 'grid',
          placeItems: 'center'
        }
      }, /*#__PURE__*/React.createElement(Monogram, {
        left: "M",
        right: "J",
        frame: "ring",
        size: 52,
        ink: p.cols[2],
        accent: p.cols[2],
        paper: "transparent"
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: '20px 24px',
          textAlign: 'center'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-display)',
          fontStyle: 'italic',
          fontSize: 26,
          color: 'var(--ink)'
        }
      }, "Mira & Jun"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13.5,
          lineHeight: 1.6,
          color: 'var(--ink-soft)',
          fontFamily: 'var(--font-ui)',
          margin: '12px 0 18px'
        }
      }, body), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-block',
          padding: '10px 22px',
          borderRadius: 999,
          background: p.cols[0],
          color: p.cols[2],
          fontFamily: 'var(--font-ui)',
          fontWeight: 600,
          fontSize: 13
        }
      }, "Reply on our site")));
    }
    if (channel === 'text') {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          width: '100%',
          maxWidth: 320
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          background: 'var(--cream-3)',
          border: '1px solid var(--line)',
          borderRadius: '18px 18px 18px 4px',
          padding: '14px 16px',
          boxShadow: 'var(--shadow-sm)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 14,
          lineHeight: 1.5,
          color: 'var(--ink)',
          fontFamily: 'var(--font-ui)'
        }
      }, body), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 13,
          color: 'var(--accent-ink, var(--peach-ink))',
          marginTop: 8,
          fontFamily: 'var(--font-ui)',
          textDecoration: 'underline'
        }
      }, "pearloom.com/mira-and-jun")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--pl-font-mono)',
          fontSize: 10,
          color: 'var(--ink-muted)',
          marginTop: 8,
          textAlign: 'center'
        }
      }, "Delivered \xB7 as a text"));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        maxWidth: 420,
        aspectRatio: '5 / 7',
        background: p.cols[2],
        boxShadow: '0 24px 60px -28px rgba(40,28,12,0.45)',
        padding: 'clamp(24px,4vw,40px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 10,
        border: `1px solid ${p.cols[1]}`,
        pointerEvents: 'none'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.28em',
        color: p.cols[0],
        marginTop: 8
      }
    }, "SAVE THE DATE"), /*#__PURE__*/React.createElement(Monogram, {
      left: "M",
      right: "J",
      frame: "ring",
      size: 64,
      ink: p.cols[3],
      accent: p.cols[0],
      paper: p.cols[2],
      style: {
        margin: '20px 0 8px'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(30px,4.4vw,42px)',
        fontStyle: 'italic',
        lineHeight: 1.05,
        color: p.cols[3],
        letterSpacing: '-0.01em'
      }
    }, "Mira ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'normal'
      }
    }, "&"), " Jun"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 1,
        background: p.cols[1],
        margin: '16px 0'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13.5,
        lineHeight: 1.6,
        color: p.cols[3],
        opacity: 0.85,
        flex: 1
      }
    }, body), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 11,
        letterSpacing: '0.18em',
        color: p.cols[0],
        marginTop: 16
      }
    }, "06 \xB7 09 \xB7 2026"));
  }
  function Studio() {
    const [pal, setPal] = React.useState(0);
    const [occ, setOcc] = React.useState(0);
    const [channel, setChannel] = React.useState('site');
    const [formal, setFormal] = React.useState(20);
    const [body, setBody] = React.useState(DRAFTS.warm);
    const p = PALETTES[pal];
    const setVoice = v => {
      setFormal(v);
      setBody(v > 55 ? DRAFTS.formal : DRAFTS.warm);
    };
    return /*#__PURE__*/React.createElement("main", {
      className: "pd-studio-grid",
      style: {
        padding: '0 clamp(20px,4vw,40px) 48px',
        maxWidth: 1180,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 360px',
        gap: 24,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 0,
      style: {
        overflow: 'hidden',
        position: 'sticky',
        top: 86
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '10px 14px',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, [['site', 'Site card'], ['email', 'Email'], ['text', 'Text']].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setChannel(k),
      style: {
        padding: '6px 14px',
        fontSize: 12,
        borderRadius: 999,
        background: channel === k ? 'var(--ink)' : 'transparent',
        color: channel === k ? 'var(--cream)' : 'var(--ink)',
        border: `1px solid ${channel === k ? 'var(--ink)' : 'var(--line)'}`,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontWeight: 500
      }
    }, l)), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        gap: 6
      }
    }, p.cols.map((c, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        width: 12,
        height: 12,
        borderRadius: 3,
        background: c,
        border: '1px solid var(--line)'
      }
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 'clamp(24px,4vw,48px)',
        display: 'grid',
        placeItems: 'center',
        background: channel === 'site' ? p.cols[2] : 'var(--cream-3)'
      }
    }, /*#__PURE__*/React.createElement(ChannelPreview, {
      channel: channel,
      p: p,
      body: body
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "Occasion"), /*#__PURE__*/React.createElement("div", {
      className: "pl-hscroll",
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12
      }
    }, OCCASIONS.map((o, i) => /*#__PURE__*/React.createElement("button", {
      key: o,
      onClick: () => setOcc(i),
      style: {
        padding: '7px 14px',
        fontSize: 12.5,
        borderRadius: 999,
        background: occ === i ? 'var(--ink)' : 'transparent',
        color: occ === i ? 'var(--cream)' : 'var(--ink)',
        border: `1px solid ${occ === i ? 'var(--ink)' : 'var(--line)'}`,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontWeight: 500
      }
    }, o)))), /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 18,
      color: "var(--lavender-ink)"
    }), /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none",
      style: {
        margin: 0
      }
    }, "Pear's draft"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm"
    }, "\u21BB Redraft")), /*#__PURE__*/React.createElement("textarea", {
      value: body,
      onChange: e => setBody(e.target.value),
      rows: 5,
      style: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '12px 14px',
        borderRadius: 12,
        border: '1px solid var(--line)',
        background: 'var(--cream-3)',
        fontSize: 13.5,
        lineHeight: 1.55,
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        color: 'var(--ink)',
        outline: 'none',
        resize: 'vertical',
        marginBottom: 14
      }
    }), /*#__PURE__*/React.createElement(VoiceSlider, {
      label: "tone",
      a: "Warm",
      b: "Formal",
      val: formal,
      onChange: setVoice
    }), /*#__PURE__*/React.createElement(VoiceSlider, {
      label: "energy",
      a: "Playful",
      b: "Classic",
      val: 62,
      onChange: () => {}
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        marginTop: 4,
        fontFamily: 'var(--font-ui)'
      }
    }, "Slide and Pear rewrites in your voice \u2014 warm for a birthday, hushed for a memorial.")), /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none"
    }, "Palette"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        marginTop: 12
      }
    }, PALETTES.map((pp, i) => /*#__PURE__*/React.createElement("button", {
      key: pp.name,
      onClick: () => setPal(i),
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 10px',
        borderRadius: 10,
        background: pal === i ? 'var(--cream-3)' : 'transparent',
        border: `1px solid ${pal === i ? 'var(--accent-ink, var(--peach-ink))' : 'transparent'}`,
        cursor: 'pointer',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid var(--line)'
      }
    }, pp.cols.map((c, j) => /*#__PURE__*/React.createElement("span", {
      key: j,
      style: {
        width: 16,
        height: 24,
        background: c
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, pp.name), pal === i ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 14,
      color: "var(--accent-ink, var(--peach-ink))",
      strokeWidth: 2.4
    }) : null)))), /*#__PURE__*/React.createElement(Card, {
      padding: 22
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none",
      style: {
        margin: 0
      }
    }, "The matching suite"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(LockChip, {
      label: "Printed & mailed \xB7 atelier"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)',
        margin: '0 0 12px',
        lineHeight: 1.5
      }
    }, "Same palette and type, carried across the day's paper."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8
      }
    }, SUITE.map(s => /*#__PURE__*/React.createElement("button", {
      key: s.name,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--cream-3)',
        border: '1px solid var(--line)',
        cursor: 'pointer',
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: p.cols[0],
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: s.i,
      size: 15
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, s.name), /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 13,
      color: "var(--ink-muted)"
    }))))), /*#__PURE__*/React.createElement(Button, {
      variant: "pearl",
      size: "md",
      style: {
        width: '100%'
      }
    }, "Set the type & send ", /*#__PURE__*/React.createElement(Pearl, {
      size: 9
    }))));
  }

  // ───────────────────────── The Reel ─────────────────────────
  const PENDING = [{
    from: 'Amara',
    tone: 'var(--sage-tint)',
    cap: 'The rehearsal toast'
  }, {
    from: 'Jonah',
    src: '../../assets/imagery/coffee-mug.png',
    cap: 'Morning of'
  }, {
    from: 'Marisol',
    tone: 'var(--peach-bg)',
    cap: 'On the dance floor'
  }];
  const ALBUMS = [['all', 'All'], ['getting-ready', 'Getting ready'], ['ceremony', 'Ceremony'], ['party', 'The party'], ['guest', 'From guests']];
  const PHOTOS = [{
    src: '../../assets/imagery/pear-photo.png',
    tag: 'guest',
    name: 'Mira & Jun',
    h: 220,
    cover: true
  }, {
    tone: 'var(--sage-tint)',
    tag: 'ceremony',
    name: 'Point Reyes',
    h: 280
  }, {
    src: '../../assets/imagery/vase-linen-still.png',
    tag: 'getting-ready',
    name: 'The table',
    h: 240
  }, {
    tone: 'var(--peach-bg)',
    tag: 'party',
    name: 'First dance',
    h: 200
  }, {
    src: '../../assets/imagery/coffee-mug.png',
    tag: 'getting-ready',
    name: 'Morning of',
    h: 260
  }, {
    tone: 'var(--lavender-bg)',
    tag: 'guest',
    name: 'Maya at 30',
    h: 220
  }, {
    tone: 'var(--sage-tint)',
    tag: 'ceremony',
    name: 'Lark Hill',
    h: 300
  }, {
    tone: 'var(--peach-bg)',
    tag: 'party',
    name: 'The toasts',
    h: 240
  }];
  function Gallery() {
    const [filter, setFilter] = React.useState('all');
    const [queue, setQueue] = React.useState(PENDING);
    const [openUp, setOpenUp] = React.useState(true);
    const shown = filter === 'all' ? PHOTOS : PHOTOS.filter(p => p.tag === filter);
    const cols = 4;
    const split = Array.from({
      length: cols
    }, () => []);
    shown.forEach((p, i) => split[i % cols].push(p));
    const counts = PHOTOS.reduce((a, p) => {
      a.all++;
      a[p.tag] = (a[p.tag] || 0) + 1;
      return a;
    }, {
      all: 0
    });
    const drop = i => setQueue(q => q.filter((_, j) => j !== i));
    return /*#__PURE__*/React.createElement("main", {
      style: {
        padding: '0 clamp(20px,4vw,40px) 60px',
        maxWidth: 1240,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        flexWrap: 'wrap',
        padding: '12px 18px',
        marginBottom: 20,
        borderRadius: 12,
        background: 'var(--cream-2)',
        border: '1px solid var(--line)'
      }
    }, [['image', 'Guests add on the site', 'var(--sage)'], ['check', 'Your nod', 'var(--accent-ink, var(--peach-ink))'], ['sparkles', 'Live on the wall', 'var(--lavender-ink)']].map(([ic, l, c], i, a) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: l
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 26,
        height: 26,
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--card)',
        color: c,
        border: `1px solid ${c}`
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: ic,
      size: 13
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)',
        fontWeight: 500
      }
    }, l)), i < a.length - 1 ? /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 24,
        margin: '0 12px',
        height: 0,
        borderTop: '2px dashed var(--line)'
      }
    }) : null))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: openUp ? '1fr 280px' : '1fr',
        gap: 20,
        marginBottom: 24,
        alignItems: 'flex-start'
      },
      className: "pd-an-charts"
    }, queue.length ? /*#__PURE__*/React.createElement(Card, {
      padding: 20,
      style: {
        border: '1px solid var(--gold-line)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        color: 'var(--accent-ink, var(--peach-ink))'
      }
    }, "AWAITING YOUR NOD"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        background: 'var(--pl-gold)',
        color: 'var(--pl-ink)',
        borderRadius: 999,
        padding: '1px 8px'
      }
    }, queue.length), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        color: 'var(--ink-soft)',
        flex: 1,
        fontFamily: 'var(--font-ui)'
      }
    }, "Guests added these. Approve what fits the wall.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))',
        gap: 14
      }
    }, queue.map((p, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--line)',
        background: 'var(--card)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 110,
        background: p.src ? `center/cover url(${p.src})` : p.tone,
        display: 'grid',
        placeItems: 'center'
      }
    }, !p.src ? /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 28,
      color: "var(--ink-soft)"
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '10px 12px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, /*#__PURE__*/React.createElement("strong", null, p.from), " \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--ink-muted)'
      }
    }, p.cap)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        marginTop: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "ink",
      size: "sm",
      style: {
        flex: 1
      },
      onClick: () => drop(i)
    }, "Approve"), /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm",
      onClick: () => drop(i)
    }, "Hide"))))))) : /*#__PURE__*/React.createElement(Card, {
      padding: 40,
      style: {
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 22,
        color: 'var(--sage-deep)'
      }
    }, "All caught up."), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'var(--ink-muted)',
        marginTop: 6,
        fontFamily: 'var(--font-ui)'
      }
    }, "Nothing waiting. New guest photos land here.")), openUp ? /*#__PURE__*/React.createElement(Card, {
      padding: 20
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "none",
      style: {
        margin: 0
      }
    }, "Guests can add"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setOpenUp(false),
      style: {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: 'var(--ink-muted)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 14
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 92,
        height: 92,
        margin: '4px auto 12px',
        borderRadius: 12,
        background: 'var(--cream-3)',
        border: '1px solid var(--line)',
        display: 'grid',
        placeItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 40
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        color: 'var(--ink-muted)',
        textAlign: 'center',
        marginBottom: 12
      }
    }, "pearloom.com/mira-and-jun/add"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 0',
        borderTop: '1px solid var(--line-soft)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        fontSize: 12.5,
        color: 'var(--ink)',
        fontFamily: 'var(--font-ui)'
      }
    }, "Review before posting"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        color: 'var(--sage-deep)'
      }
    }, "ON")), /*#__PURE__*/React.createElement(Button, {
      variant: "paper",
      size: "sm",
      style: {
        width: '100%',
        marginTop: 8
      }
    }, "Copy upload link"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        paddingTop: 12,
        borderTop: '1px solid var(--line-soft)',
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-ui)',
        lineHeight: 1.4
      }
    }, "Turn the Reel into a printed book ", /*#__PURE__*/React.createElement(LockChip, {
      label: "atelier"
    }))) : null), /*#__PURE__*/React.createElement("div", {
      className: "pl-hscroll",
      style: {
        display: 'flex',
        gap: 8,
        marginBottom: 20
      }
    }, ALBUMS.map(([k, l]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setFilter(k),
      style: {
        padding: '6px 14px',
        fontSize: 12,
        borderRadius: 999,
        background: filter === k ? 'var(--ink)' : 'transparent',
        color: filter === k ? 'var(--cream)' : 'var(--ink)',
        border: `1px solid ${filter === k ? 'var(--ink)' : 'var(--line)'}`,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontWeight: 500,
        whiteSpace: 'nowrap'
      }
    }, l, " \xB7 ", counts[k] ?? counts.all))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 14
      },
      className: "pd-reel"
    }, split.map((col, ci) => /*#__PURE__*/React.createElement("div", {
      key: ci,
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, col.map((p, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        height: p.h,
        borderRadius: 14,
        overflow: 'hidden',
        position: 'relative',
        background: p.tone || 'var(--cream-3)',
        backgroundImage: p.src ? `url(${p.src})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        border: '1px solid var(--line)'
      }
    }, !p.src ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        opacity: 0.4
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 36
    })) : null, p.cover ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 10,
        left: 10,
        padding: '3px 9px',
        borderRadius: 999,
        background: 'var(--pl-gold)',
        color: 'var(--pl-ink)',
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.12em'
      }
    }, "COVER") : null, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 'auto 0 0 0',
        padding: '18px 12px 10px',
        background: 'linear-gradient(to top, rgba(24,24,27,0.7), transparent)',
        color: 'var(--pl-cream)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.1em',
        opacity: 0.85
      }
    }, p.tag.replace('-', ' ').toUpperCase()), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-display)',
        fontStyle: 'italic',
        fontSize: 13
      }
    }, p.name))))))));
  }
  window.Studio = Studio;
  window.Gallery = Gallery;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/ScreensStudio.jsx", error: String((e && e.message) || e) }); }

// ui_kits/dashboard/tweaks-panel.jsx
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
// Exports (to window): useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider,
//   TweakToggle, TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// TweakRadio is the segmented control for 2–3 short options (auto-falls-back to
// TweakSelect past ~16/~10 chars per label); reach for TweakSelect directly when
// options are many or long. For color tweaks always curate 3-4 options rather than
// a free picker; an option can also be a whole 2–5 color palette (the stored value
// is the array). The Tweak* controls are a floor, not a ceiling — build custom
// controls inside the panel if a tweak calls for UI they don't cover.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

const __TWEAKS_STYLE = `
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}

  .twk-chips{display:flex;gap:6px}
  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;
    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);
    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}
  .twk-chip:hover{transform:translateY(-1px);
    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}
  .twk-chip[data-on="1"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),
    0 2px 6px rgba(0,0,0,.15)}
  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;
    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}
  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}
  .twk-chip>span>i:first-child{box-shadow:none}
  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;
    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}
`;

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  const [values, setValues] = React.useState(defaults);
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  const setTweak = React.useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null ? keyOrEdits : {
      [keyOrEdits]: val
    };
    setValues(prev => ({
      ...prev,
      ...edits
    }));
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel({
  title = 'Tweaks',
  children
}) {
  const [open, setOpen] = React.useState(false);
  const dragRef = React.useRef(null);
  const offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  const PAD = 16;
  const clampToViewport = React.useCallback(() => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth,
      h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(() => {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return () => window.removeEventListener('resize', clampToViewport);
    }
    const ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, [open, clampToViewport]);
  React.useEffect(() => {
    const onMsg = e => {
      const t = e?.data?.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const dismiss = () => {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  const onDragStart = e => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX,
      sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = ev => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-omelette-chrome": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: e => e.stopPropagation(),
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children)));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection({
  label,
  children
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow({
  label,
  value,
  children,
  inline = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: `${value}${unit}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange(Number(e.target.value))
  }));
}
function TweakToggle({
  label,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: () => onChange(!value)
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio({
  label,
  value,
  options,
  onChange
}) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  const valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  const labelLen = o => String(typeof o === 'object' ? o.label : o).length;
  const maxLen = options.reduce((m, o) => Math.max(m, labelLen(o)), 0);
  const fitsAsSegments = maxLen <= ({
    2: 16,
    3: 10
  }[options.length] ?? 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    const resolve = s => {
      const m = options.find(o => String(typeof o === 'object' ? o.value : o) === s);
      return m === undefined ? s : typeof m === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: s => onChange(resolve(s))
    });
  }
  const opts = options.map(o => typeof o === 'object' ? o : {
    value: o,
    label: o
  });
  const idx = Math.max(0, opts.findIndex(o => o.value === value));
  const n = opts.length;
  const segAt = clientX => {
    const r = trackRef.current.getBoundingClientRect();
    const inner = r.width - 4;
    const i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  const onPointerDown = e => {
    setDragging(true);
    const v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) onChange(v0);
    const move = ev => {
      if (!trackRef.current) return;
      const v = segAt(ev.clientX);
      if (v !== valueRef.current) onChange(v);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
      width: `calc((100% - 4px) / ${n})`
    }
  }), opts.map(o => /*#__PURE__*/React.createElement("button", {
    key: o.value,
    type: "button",
    role: "radio",
    "aria-checked": o.value === value
  }, o.label))));
}
function TweakSelect({
  label,
  value,
  options,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: e => onChange(e.target.value)
  }, options.map(o => {
    const v = typeof o === 'object' ? o.value : o;
    const l = typeof o === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText({
  label,
  value,
  placeholder,
  onChange
}) {
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: e => onChange(e.target.value)
  }));
}
function TweakNumber({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange
}) {
  const clamp = n => {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  const startRef = React.useRef({
    x: 0,
    val: 0
  });
  const onScrubStart = e => {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    const decimals = (String(step).split('.')[1] || '').length;
    const move = ev => {
      const dx = ev.clientX - startRef.current.x;
      const raw = startRef.current.val + dx * step;
      const snapped = Math.round(raw / step) * step;
      onChange(clamp(Number(snapped.toFixed(decimals))));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: e => onChange(clamp(Number(e.target.value)))
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  const h = String(hex).replace('#', '');
  const x = h.length === 3 ? h.replace(/./g, c => c + c) : h.padEnd(6, '0');
  const n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  const r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
const __TwkCheck = ({
  light
}) => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 14 14",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("path", {
  d: "M3 7.2 5.8 10 11 4.2",
  fill: "none",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
}));

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor({
  label,
  value,
  options,
  onChange
}) {
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: e => onChange(e.target.value)
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  const key = o => String(JSON.stringify(o)).toLowerCase();
  const cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map((o, i) => {
    const colors = Array.isArray(o) ? o : [o];
    const [hero, ...rest] = colors;
    const sup = rest.slice(0, 4);
    const on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: () => onChange(o)
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map((c, j) => /*#__PURE__*/React.createElement("i", {
      key: j,
      style: {
        background: c
      }
    }))), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton({
  label,
  onClick,
  secondary = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks,
  TweaksPanel,
  TweakSection,
  TweakRow,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  TweakSelect,
  TweakText,
  TweakNumber,
  TweakColor,
  TweakButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/tweaks-panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/editor/Editor.jsx
try { (() => {
/* global React */
// Pearloom site EDITOR — faithful recreation of EditorRedesign.
// Built on the PRODUCT CHROME tokens (--cream / --card / --ink /
// --line + sage = saved, peach = active/working, lavender = italic).
// Four-zone grid: topbar · left section rail · canvas · property rail.
(() => {
  const {
    PearloomGlyph,
    Button,
    Pearl,
    WeaveLoader
  } = window.PearloomDesignSystem_55118c;
  const SECTIONS = [{
    id: 'hero',
    label: 'Opening',
    icon: '⌂',
    desc: 'Names, date, cover photo',
    req: true
  }, {
    id: 'story',
    label: 'Our story',
    icon: '❧',
    desc: '2 chapters'
  }, {
    id: 'details',
    label: 'Details',
    icon: '✦',
    desc: 'Dress code, kids, FAQ-lite'
  }, {
    id: 'schedule',
    label: 'Schedule',
    icon: '◷',
    desc: '4 moments'
  }, {
    id: 'travel',
    label: 'Travel',
    icon: '✈',
    desc: 'Hotels, transit, tips'
  }, {
    id: 'registry',
    label: 'Registry',
    icon: '❖',
    desc: 'Linked stores',
    attn: true
  }, {
    id: 'gallery',
    label: 'Gallery',
    icon: '◎',
    desc: 'No photos yet',
    attn: true
  }, {
    id: 'rsvp',
    label: 'RSVP',
    icon: '✉',
    desc: 'Closes Aug 10',
    req: true
  }, {
    id: 'faq',
    label: 'FAQ',
    icon: '✢',
    desc: '3 answered'
  }];
  const TOOLS = [{
    id: 'guests',
    label: 'Guests',
    icon: '☞',
    desc: 'Your guest list'
  }, {
    id: 'share',
    label: 'Share',
    icon: '∞',
    desc: 'Link, QR, preview'
  }, {
    id: 'dayof',
    label: 'Day-of',
    icon: '✦',
    desc: 'Live broadcasts'
  }];
  function Editor() {
    const [active, setActive] = React.useState('hero');
    const [tab, setTab] = React.useState('sections');
    const [mode, setMode] = React.useState('edit');
    const [pearOpen, setPearOpen] = React.useState(false);
    const preview = mode === 'preview';
    const showTheme = tab === 'theme';

    // ── Topbar ──
    const Topbar = /*#__PURE__*/React.createElement("header", {
      className: "ed-top",
      style: {
        gridArea: 'top',
        background: 'var(--cream)',
        borderBottom: '1px solid var(--line-soft)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        height: 56,
        zIndex: 5
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 200,
        fontSize: 12.5,
        color: 'var(--ink-soft)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        opacity: 0.6
      }
    }, "\u2039"), /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 20
    }), /*#__PURE__*/React.createElement("span", null, "Dashboard")), /*#__PURE__*/React.createElement("div", {
      className: "ed-modepills",
      style: {
        flex: 1,
        display: 'flex',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 2,
        padding: 3,
        background: 'var(--card)',
        borderRadius: 999,
        border: '1px solid var(--line-soft)'
      }
    }, [['edit', 'Edit', '✎'], ['preview', 'Preview', '◉'], ['mobile', 'Mobile', '▢']].map(([id, l, ic]) => {
      const on = mode === id;
      return /*#__PURE__*/React.createElement("button", {
        key: id,
        onClick: () => setMode(id),
        style: {
          padding: '6px 14px',
          borderRadius: 999,
          fontSize: 12.5,
          fontWeight: 600,
          background: on ? 'var(--ink)' : 'transparent',
          color: on ? 'var(--cream)' : 'var(--ink-soft)',
          border: 0,
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)'
        }
      }, ic, " ", l);
    }))), /*#__PURE__*/React.createElement("div", {
      className: "ed-coverchip",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '4px 11px',
        borderRadius: 999,
        background: 'var(--cream-2)',
        border: '1px solid var(--line-soft)',
        color: 'var(--ink-soft)',
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: 'nowrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--gold)'
      }
    }), " Add your cover photo"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "ed-savestate",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11.5,
        color: 'var(--ink-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--sage)'
      }
    }), " Saved 12:30"), /*#__PURE__*/React.createElement("div", {
      className: "ed-savestate",
      style: {
        width: 1,
        height: 18,
        background: 'var(--line-soft)'
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => setPearOpen(!pearOpen),
      className: "ed-btn ed-hide-sm",
      style: {
        background: pearOpen ? 'var(--peach-bg)' : 'var(--card)',
        borderColor: pearOpen ? 'transparent' : 'var(--line)',
        color: pearOpen ? 'var(--peach-ink)' : 'var(--ink)'
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 14
    }), " Ask Pear"), /*#__PURE__*/React.createElement("button", {
      className: "ed-btn ed-hide-sm",
      onClick: () => setTab('theme')
    }, "\u25D1 Theme"), /*#__PURE__*/React.createElement("button", {
      className: "pl-pearl-ed",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 999,
        border: '1px solid var(--pl-gold-soft)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        color: 'var(--pl-ink)',
        background: 'linear-gradient(135deg,#F4ECD8 0%,#E8C77A 32%,#D9A89E 58%,#B8C96B 82%,#F4ECD8 100%)'
      }
    }, "Publish \u2191"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 30,
        height: 30,
        borderRadius: 999,
        background: 'var(--pl-gradient-olive)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--cream)',
        fontFamily: 'var(--pl-font-display)',
        fontStyle: 'italic',
        fontSize: 12,
        border: '1px solid var(--line)'
      }
    }, "M")));

    // ── Left section rail ──
    const LeftRail = /*#__PURE__*/React.createElement("aside", {
      className: "ed-left",
      style: {
        gridArea: 'left',
        borderRight: '1px solid var(--line-soft)',
        background: 'var(--cream-2)',
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 12,
        background: 'var(--card)',
        border: '1px solid var(--line-soft)',
        borderRadius: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)',
        marginBottom: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-block',
        width: 4,
        height: 4,
        borderRadius: '50%',
        background: 'var(--gold)',
        marginRight: 6,
        verticalAlign: 'middle'
      }
    }), "Wedding"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12.5,
        fontWeight: 700,
        color: 'var(--ink)',
        marginBottom: 2
      }
    }, "Mira & Jun"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10.5,
        color: 'var(--ink-muted)',
        marginBottom: 8
      }
    }, "\u2295 pearloom.com/wedding/mira-and-jun"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 4,
        background: 'var(--cream-3)',
        borderRadius: 999,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '72%',
        height: '100%',
        background: 'var(--sage)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10,
        color: 'var(--ink-muted)',
        fontWeight: 600
      }
    }, "72%"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 2,
        padding: 3,
        background: 'var(--card)',
        borderRadius: 8,
        border: '1px solid var(--line-soft)'
      }
    }, ['sections', 'pages', 'theme'].map(t => {
      const on = tab === t;
      return /*#__PURE__*/React.createElement("button", {
        key: t,
        onClick: () => {
          setTab(t);
          if (t === 'theme') setActive(null);else if (!active) setActive('hero');
        },
        style: {
          flex: 1,
          padding: 6,
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
          background: on ? 'var(--ink)' : 'transparent',
          color: on ? 'var(--cream)' : 'var(--ink-soft)',
          border: 0,
          cursor: 'pointer',
          textTransform: 'capitalize',
          fontFamily: 'var(--font-ui)'
        }
      }, t);
    })), tab === 'sections' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)',
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Page sections"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontWeight: 500,
        textTransform: 'none',
        letterSpacing: 0
      }
    }, "drag to reorder")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, SECTIONS.map(s => {
      const on = s.id === active;
      return /*#__PURE__*/React.createElement("div", {
        key: s.id,
        onClick: () => setActive(s.id),
        style: {
          display: 'grid',
          gridTemplateColumns: '12px 22px 1fr 14px',
          gap: 8,
          alignItems: 'center',
          padding: '8px 10px',
          borderRadius: 8,
          background: on ? 'var(--ink)' : 'transparent',
          color: on ? 'var(--cream)' : 'var(--ink)',
          cursor: 'pointer'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          opacity: on ? 0.5 : 0.3,
          fontSize: 9,
          letterSpacing: 1
        }
      }, "\u283F"), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--pl-font-display)',
          fontSize: 13,
          opacity: on ? 1 : 0.7
        }
      }, s.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }
      }, s.label, s.attn ? /*#__PURE__*/React.createElement("span", {
        style: {
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--peach-ink)'
        }
      }) : null), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10.5,
          opacity: on ? 0.7 : 0.55,
          marginTop: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, s.desc)), s.req ? /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 10,
          opacity: on ? 0.8 : 0.5
        }
      }, "\u26BF") : /*#__PURE__*/React.createElement("span", null));
    }), /*#__PURE__*/React.createElement("button", {
      style: {
        marginTop: 4,
        padding: '8px 10px',
        borderRadius: 8,
        fontSize: 11.5,
        color: 'var(--ink-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        border: '1px dashed var(--line)',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)'
      }
    }, "+ Add section")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)',
        marginTop: 6,
        paddingTop: 10,
        borderTop: '1px solid var(--line-soft)'
      }
    }, "Tools"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, TOOLS.map(s => {
      const on = s.id === active;
      return /*#__PURE__*/React.createElement("div", {
        key: s.id,
        onClick: () => setActive(s.id),
        style: {
          display: 'grid',
          gridTemplateColumns: '22px 1fr',
          gap: 8,
          alignItems: 'center',
          padding: '8px 10px',
          borderRadius: 8,
          background: on ? 'var(--ink)' : 'transparent',
          color: on ? 'var(--cream)' : 'var(--ink)',
          cursor: 'pointer'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--pl-font-display)',
          fontSize: 13,
          opacity: on ? 1 : 0.7
        }
      }, s.icon), /*#__PURE__*/React.createElement("div", {
        style: {
          minWidth: 0
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 12.5,
          fontWeight: 600
        }
      }, s.label), /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 10.5,
          opacity: on ? 0.7 : 0.55,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }
      }, s.desc)));
    }))) : /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '12px 13px',
        borderRadius: 10,
        background: 'var(--card)',
        border: '1px solid var(--line-soft)',
        fontSize: 11.5,
        color: 'var(--ink-soft)',
        lineHeight: 1.55,
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--peach-ink)'
      }
    }, "\u2726"), /*#__PURE__*/React.createElement("span", null, tab === 'theme' ? 'Theme controls are open in the panel on the right — palette, type, layout, texture.' : 'Flip to magazine mode and arrange your pages here.')));

    // ── Canvas (mini published site) ──
    const sel = active && ['hero', 'story', 'schedule', 'gallery', 'rsvp'].includes(active);
    const frame = (id, children, label) => {
      const on = active === id && !preview;
      return /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'relative',
          outline: on ? '2px solid var(--peach-ink)' : '2px solid transparent',
          outlineOffset: -2,
          borderRadius: 4,
          transition: 'outline-color var(--pl-dur-quick)'
        }
      }, on ? /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          transform: 'translateY(-100%)',
          background: 'var(--peach-ink)',
          color: 'var(--cream)',
          fontFamily: 'var(--pl-font-mono)',
          fontSize: 9,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '2px 7px',
          borderRadius: '4px 4px 0 0'
        }
      }, label) : null, children);
    };
    const Canvas = /*#__PURE__*/React.createElement("div", {
      className: "ed-canvas",
      style: {
        gridArea: 'canvas',
        background: 'var(--cream-3)',
        overflow: 'auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      "aria-hidden": true,
      style: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(61,74,31,0.08) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
        opacity: 0.5
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 'min(720px, 100%)',
        maxWidth: '100%',
        background: 'var(--paper)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--card-ring)',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 22px',
        borderBottom: '1px solid var(--line-soft)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontStyle: 'italic',
        fontSize: 18,
        color: 'var(--ink)'
      }
    }, "M & J"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        gap: 16,
        fontSize: 11.5,
        color: 'var(--ink-soft)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "Story"), /*#__PURE__*/React.createElement("span", null, "Day"), /*#__PURE__*/React.createElement("span", null, "Travel"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sage-deep)',
        fontWeight: 600
      }
    }, "RSVP"))), frame('hero', /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '40px 28px 32px',
        textAlign: 'center',
        background: 'var(--cream-2)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)',
        marginBottom: 12
      }
    }, "Pressed by Pear \xB7 Sept 6, 2026"), /*#__PURE__*/React.createElement("div", {
      className: "pl-letterpress",
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontSize: 42,
        lineHeight: 1.0,
        fontWeight: 400,
        letterSpacing: '-0.03em',
        color: 'var(--ink)',
        fontVariationSettings: '"opsz" 144, "SOFT" 50'
      }
    }, "Mira & Jun"), /*#__PURE__*/React.createElement("div", {
      className: "pl8-display-italic",
      style: {
        fontSize: 18,
        margin: '14px 0 0',
        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1'
      }
    }, "are getting married")), 'Opening'), frame('story', /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '28px',
        display: 'grid',
        gridTemplateColumns: '1fr 120px',
        gap: 18,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)'
      }
    }, "Our story"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontSize: 24,
        color: 'var(--ink)',
        margin: '6px 0'
      }
    }, "A very long table"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 13,
        lineHeight: 1.6,
        color: 'var(--ink-soft)',
        margin: 0
      }
    }, "Two families, one Saturday in Point Reyes. Come hungry, stay late.")), /*#__PURE__*/React.createElement("div", {
      style: {
        height: 120,
        borderRadius: 8,
        background: 'var(--cream-3) url(../../assets/imagery/vase-linen-still.png) center/cover'
      }
    })), 'Our story'), frame('schedule', /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '24px 28px',
        background: 'var(--cream-2)',
        borderTop: '1px solid var(--line-soft)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)',
        marginBottom: 12
      }
    }, "The run of the day"), [['4:00', 'Arrive & gather'], ['5:00', 'The vows'], ['6:30', 'Supper & toasts']].map(([t, l]) => /*#__PURE__*/React.createElement("div", {
      key: t,
      style: {
        display: 'flex',
        gap: 16,
        alignItems: 'baseline',
        padding: '7px 0'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 12,
        color: 'var(--sage-deep)',
        width: 50
      }
    }, t), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: 'var(--ink)'
      }
    }, l)))), 'Schedule'), frame('rsvp', /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '28px',
        textAlign: 'center',
        borderTop: '1px solid var(--line-soft)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontSize: 28,
        color: 'var(--ink)'
      }
    }, "Kindly reply"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: 'var(--ink-soft)',
        margin: '6px 0 14px'
      }
    }, "by ", /*#__PURE__*/React.createElement("em", {
      className: "pl8-display-italic",
      style: {
        fontSize: 14
      }
    }, "August 10th")), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        padding: '9px 20px',
        borderRadius: 999,
        background: 'var(--ink)',
        color: 'var(--cream)',
        fontSize: 13,
        fontWeight: 600
      }
    }, "Press RSVP \u2192")), 'RSVP')), preview ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 16,
        right: 24,
        padding: '6px 12px',
        borderRadius: 999,
        background: 'var(--ink)',
        color: 'var(--cream)',
        fontSize: 11.5,
        fontWeight: 600
      }
    }, "\u25C9 Preview \u2014 chrome hidden") : null);

    // ── Right rail: property panel OR theme rail ──
    const RightRail = showTheme || !active ? /*#__PURE__*/React.createElement(ThemeRail, null) : /*#__PURE__*/React.createElement(PropertyPanel, {
      active: active
    });
    return /*#__PURE__*/React.createElement("div", {
      className: "ed-shell",
      style: {
        height: '100%',
        display: 'grid',
        gridTemplateColumns: pearOpen ? '236px 1fr 320px 300px' : '236px 1fr 340px',
        gridTemplateRows: '56px 1fr',
        gridTemplateAreas: pearOpen ? '"top top top top" "left canvas right pear"' : '"top top top" "left canvas right"',
        background: 'var(--cream)',
        fontFamily: 'var(--font-ui)',
        color: 'var(--ink)',
        overflow: 'hidden'
      }
    }, Topbar, !preview ? LeftRail : null, Canvas, !preview ? showTheme || !active ? /*#__PURE__*/React.createElement("div", {
      className: "ed-right",
      style: {
        gridArea: 'right'
      }
    }, /*#__PURE__*/React.createElement(ThemeRail, null)) : /*#__PURE__*/React.createElement("div", {
      className: "ed-right",
      style: {
        gridArea: 'right'
      }
    }, /*#__PURE__*/React.createElement(PropertyPanel, {
      active: active
    })) : null, pearOpen && !preview ? /*#__PURE__*/React.createElement(PearAside, {
      onClose: () => setPearOpen(false)
    }) : null, /*#__PURE__*/React.createElement("div", {
      className: "ed-mobile-bar",
      style: {
        display: 'none',
        gridArea: 'mbar',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: 4,
        padding: '8px 10px calc(8px + env(safe-area-inset-bottom))',
        background: 'var(--cream)',
        borderTop: '1px solid var(--line-soft)'
      }
    }, [['sections', '❑', 'Sections'], ['theme', '◑', 'Theme'], ['preview', '◉', 'Preview'], ['pear', '✦', 'Pear']].map(function (it) {
      var on = it[0] === 'sections' && tab === 'sections' && !showTheme || it[0] === 'theme' && showTheme || it[0] === 'preview' && preview || it[0] === 'pear' && pearOpen;
      return React.createElement('button', {
        key: it[0],
        onClick: function () {
          if (it[0] === 'sections') {
            setTab('sections');
            setMode('edit');
          } else if (it[0] === 'theme') {
            setTab('theme');
            setMode('edit');
          } else if (it[0] === 'preview') {
            setMode(preview ? 'edit' : 'preview');
          } else {
            setPearOpen(!pearOpen);
          }
        },
        style: {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          padding: '6px 0',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: on ? 'var(--peach-ink)' : 'var(--ink-muted)',
          fontFamily: 'var(--font-ui)'
        }
      }, React.createElement('span', {
        style: {
          fontSize: 17,
          fontFamily: 'var(--pl-font-display)'
        }
      }, it[1]), React.createElement('span', {
        style: {
          fontSize: 10,
          fontWeight: 600
        }
      }, it[2]));
    })));
  }
  function RailShell({
    title,
    eyebrow,
    children
  }) {
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        height: '100%',
        borderLeft: '1px solid var(--line-soft)',
        background: 'var(--cream-2)',
        overflow: 'auto',
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--peach-ink)'
      }
    }, eyebrow), /*#__PURE__*/React.createElement("div", {
      className: "pl8-display-italic",
      style: {
        fontSize: 22,
        marginTop: 2
      }
    }, title)), children);
  }
  function Group({
    label,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--card)',
        border: '1px solid var(--line-soft)',
        borderRadius: 12,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--ink-muted)',
        marginBottom: 10
      }
    }, label), children);
  }
  function Lbl({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--ink-soft)',
        marginBottom: 5
      }
    }, children);
  }
  function In({
    v
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '9px 12px',
        background: 'var(--paper)',
        border: '1.5px solid var(--line)',
        borderRadius: 10,
        fontSize: 13,
        color: 'var(--ink)',
        marginBottom: 12
      }
    }, v);
  }
  const PANELS = {
    hero: {
      eyebrow: 'Editing · Opening',
      title: 'The first impression.'
    },
    story: {
      eyebrow: 'Editing · Our story',
      title: 'How you met.'
    },
    details: {
      eyebrow: 'Editing · Details',
      title: 'The fine print.'
    },
    schedule: {
      eyebrow: 'Editing · Schedule',
      title: 'The run of the day.'
    },
    travel: {
      eyebrow: 'Editing · Travel',
      title: 'Getting there.'
    },
    registry: {
      eyebrow: 'Editing · Registry',
      title: 'The wish list.'
    },
    gallery: {
      eyebrow: 'Editing · Gallery',
      title: 'The photo wall.'
    },
    rsvp: {
      eyebrow: 'Editing · RSVP',
      title: 'The reply form.'
    },
    faq: {
      eyebrow: 'Editing · FAQ',
      title: 'Guest questions.'
    },
    guests: {
      eyebrow: 'Tool · Guests',
      title: 'Your guest list.'
    },
    share: {
      eyebrow: 'Tool · Share',
      title: 'Send it out.'
    },
    dayof: {
      eyebrow: 'Tool · Day-of',
      title: 'On the day.'
    }
  };
  function PropertyPanel({
    active
  }) {
    const p = PANELS[active] || PANELS.hero;
    return /*#__PURE__*/React.createElement(RailShell, {
      eyebrow: p.eyebrow,
      title: p.title
    }, /*#__PURE__*/React.createElement(Group, {
      label: "Names"
    }, /*#__PURE__*/React.createElement(Lbl, null, "Partner one"), /*#__PURE__*/React.createElement(In, {
      v: "Mira Vega"
    }), /*#__PURE__*/React.createElement(Lbl, null, "Partner two"), /*#__PURE__*/React.createElement(In, {
      v: "Jun Park"
    })), /*#__PURE__*/React.createElement(Group, {
      label: "The day"
    }, /*#__PURE__*/React.createElement(Lbl, null, "Date"), /*#__PURE__*/React.createElement(In, {
      v: "September 6, 2026"
    }), /*#__PURE__*/React.createElement(Lbl, null, "Where"), /*#__PURE__*/React.createElement(In, {
      v: "Point Reyes, CA"
    })), /*#__PURE__*/React.createElement(Group, {
      label: "Cover photo"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 96,
        borderRadius: 10,
        border: '1.5px dashed var(--line)',
        background: 'var(--paper)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--ink-muted)',
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--peach-ink)'
      }
    }, "\uFF0B"), " Drop a photo, or ask Pear"))), /*#__PURE__*/React.createElement("button", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        justifyContent: 'center',
        padding: '10px',
        borderRadius: 999,
        background: 'var(--peach-bg)',
        border: '1px solid var(--peach-ink)',
        color: 'var(--peach-ink)',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)'
      }
    }, "\u2726 Ask Pear to write this"));
  }
  const THEMES = [{
    name: 'Garden',
    pal: ['#5C6B3F', '#D9A89E', '#FBF7EE'],
    on: true
  }, {
    name: 'Santorini',
    pal: ['#2E6B8A', '#E8EEF1', '#D9C7A8']
  }, {
    name: 'Tuscan',
    pal: ['#B5613A', '#7A8B4A', '#E8DCB4']
  }, {
    name: 'Midnight',
    pal: ['#0D0B07', '#D4B373', '#A4B57A']
  }];
  function ThemeRail() {
    const [sel, setSel] = React.useState('Garden');
    return /*#__PURE__*/React.createElement(RailShell, {
      eyebrow: "Theme",
      title: "Dress the page."
    }, /*#__PURE__*/React.createElement(Group, {
      label: "Palette"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8
      }
    }, THEMES.map(t => {
      const on = sel === t.name;
      return /*#__PURE__*/React.createElement("button", {
        key: t.name,
        onClick: () => setSel(t.name),
        style: {
          padding: 0,
          borderRadius: 10,
          overflow: 'hidden',
          border: on ? '2px solid var(--peach-ink)' : '1px solid var(--line)',
          cursor: 'pointer',
          background: 'var(--paper)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          height: 38,
          display: 'flex'
        }
      }, t.pal.map((c, i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          flex: 1,
          background: c
        }
      }))), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: '6px 8px',
          fontSize: 11.5,
          fontWeight: 600,
          color: 'var(--ink)',
          textAlign: 'left'
        }
      }, t.name));
    }))), /*#__PURE__*/React.createElement(Group, {
      label: "Type"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '8px 12px',
        borderRadius: 8,
        border: '1.5px solid var(--peach-ink)',
        background: 'var(--peach-bg)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontSize: 18,
        color: 'var(--ink)'
      }
    }, "Fraunces"), " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10.5,
        color: 'var(--ink-muted)'
      }
    }, "\xB7 letterpress display")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '8px 12px',
        borderRadius: 8,
        border: '1px solid var(--line)',
        background: 'var(--paper)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-body)',
        fontSize: 15,
        color: 'var(--ink)'
      }
    }, "Geist"), " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 10.5,
        color: 'var(--ink-muted)'
      }
    }, "\xB7 body")))), /*#__PURE__*/React.createElement(Group, {
      label: "Paper texture"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, ['None', 'Grain', 'Linen'].map((x, i) => /*#__PURE__*/React.createElement("div", {
      key: x,
      style: {
        flex: 1,
        textAlign: 'center',
        padding: '8px 0',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        border: i === 1 ? '1.5px solid var(--peach-ink)' : '1px solid var(--line)',
        background: i === 1 ? 'var(--peach-bg)' : 'var(--paper)',
        color: i === 1 ? 'var(--peach-ink)' : 'var(--ink-soft)',
        cursor: 'pointer'
      }
    }, x)))), /*#__PURE__*/React.createElement("button", {
      style: {
        padding: '10px',
        borderRadius: 999,
        background: 'var(--ink)',
        color: 'var(--cream)',
        border: 'none',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)'
      }
    }, "Open the Theme Shop"));
  }
  function PearAside({
    onClose
  }) {
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        gridArea: 'pear',
        borderLeft: '1px solid var(--line-soft)',
        background: 'var(--cream-2)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 16px',
        borderBottom: '1px solid var(--line-soft)',
        background: 'var(--card)'
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 28
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14,
        color: 'var(--ink)'
      }
    }, "Pear"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: 'var(--ink-muted)'
      }
    }, "your design advisor")), /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      style: {
        border: 'none',
        background: 'transparent',
        color: 'var(--ink-muted)',
        cursor: 'pointer',
        fontSize: 16
      }
    }, "\xD7")), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        alignSelf: 'flex-start',
        maxWidth: '90%',
        padding: '10px 14px',
        borderRadius: 16,
        background: 'var(--card)',
        border: '1px solid var(--line-soft)',
        fontSize: 13,
        lineHeight: 1.5,
        color: 'var(--ink)'
      }
    }, "Your Opening looks lovely. Want me to draft a one-line welcome under your names, or find a warmer cover photo?"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap'
      }
    }, ['Draft a welcome', 'Warmer photo', 'Tighten the story'].map(q => /*#__PURE__*/React.createElement("span", {
      key: q,
      style: {
        fontSize: 11,
        padding: '5px 11px',
        borderRadius: 999,
        background: 'var(--peach-bg)',
        border: '1px solid var(--peach-2)',
        color: 'var(--peach-ink)',
        cursor: 'pointer'
      }
    }, q)))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '12px 14px',
        borderTop: '1px solid var(--line-soft)',
        background: 'var(--card)',
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        padding: '9px 12px',
        borderRadius: 12,
        border: '1px solid var(--line)',
        background: 'var(--paper)',
        fontSize: 12.5,
        color: 'var(--ink-muted)'
      }
    }, "Ask Pear to change anything\u2026"), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 36,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 10,
        background: 'var(--ink)',
        color: 'var(--cream)'
      }
    }, "\u2192")));
  }
  window.Editor = Editor;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/editor/Editor.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Hero.jsx
try { (() => {
/* global React */
// Pearloom marketing — hero. Two columns: editorial copy + a live
// threading indicator + stats on the left; a switchable preview-site
// card (wedding / milestone / memorial) on the right. Recreated from
// the product's DesignHero.
(() => {
  const {
    Button,
    Pearl,
    PearloomGlyph,
    Thread
  } = window.PearloomDesignSystem_55118c;
  const THREADING = ['reading your photos', 'pressing a palette', 'writing your story', 'weaving your RSVP', 'setting the type'];
  const DATA = {
    wedding: {
      hosts: 'Mira & Jun',
      verb: 'are getting married',
      sub: 'A bright Saturday in Point Reyes, two families, one very long table.',
      date: 'Sept 6, 2026',
      slug: 'mira-and-jun',
      accent: 'var(--pl-gold)'
    },
    milestone: {
      hosts: 'Maya turns 30',
      verb: 'is throwing a supper',
      sub: 'Citrus, rosé, the garden hose for the kids, no speeches longer than 90 seconds.',
      date: 'Aug 15, 2026',
      slug: 'maya-at-thirty',
      accent: 'var(--pl-terra)'
    },
    memorial: {
      hosts: 'For Amara Osei',
      verb: 'a quiet gathering',
      sub: 'Tea, her records, her people. Come as you are.',
      date: 'Nov 15, 2026',
      slug: 'for-amara',
      accent: 'var(--pl-plum)'
    }
  };
  function Hero({
    onStart,
    onToast
  }) {
    const [occasion, setOccasion] = React.useState('wedding');
    const [step, setStep] = React.useState(0);
    React.useEffect(() => {
      const id = setInterval(() => setStep(s => (s + 1) % THREADING.length), 1500);
      return () => clearInterval(id);
    }, []);
    const d = DATA[occasion];
    return /*#__PURE__*/React.createElement("section", {
      style: {
        position: 'relative',
        padding: '52px 24px 120px',
        maxWidth: 1180,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "pd-hero-grid",
      style: {
        display: 'grid',
        gridTemplateColumns: '1.05fr 1fr',
        gap: 56,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      className: "pl-letterpress",
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontWeight: 400,
        fontVariationSettings: '"opsz" 144, "SOFT" 50',
        fontSize: 'clamp(48px, 6vw, 92px)',
        lineHeight: 0.94,
        letterSpacing: '-0.028em',
        color: 'var(--pl-ink)',
        margin: '0 0 22px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block'
      }
    }, "The days that"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--pl-olive)',
        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1'
      }
    }, "matter"), ", woven"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block'
      }
    }, "in an afternoon.")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--pl-font-body)',
        fontSize: 18,
        lineHeight: 1.55,
        maxWidth: 500,
        color: 'var(--pl-ink-soft)',
        margin: '0 0 28px'
      }
    }, "Answer three questions. Hand over a few photos. Pearloom drafts the whole site \u2014 cover, story, RSVP, schedule, travel, registry. Pear, our in-house planner, writes it in your voice."), /*#__PURE__*/React.createElement("div", {
      "aria-live": "polite",
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        background: 'var(--pl-cream-deep)',
        borderRadius: 999,
        marginBottom: 28,
        border: '1px solid var(--pl-olive-10)'
      }
    }, /*#__PURE__*/React.createElement(Pearl, {
      size: 9,
      iridescent: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        fontSize: 10,
        color: 'var(--pl-muted)'
      }
    }, "Pear is"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        fontStyle: 'italic',
        color: 'var(--pl-olive)',
        fontFamily: 'var(--pl-font-display)',
        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1',
        minWidth: 180,
        display: 'inline-block'
      }
    }, THREADING[step], "\u2026")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 38
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "pearl",
      size: "lg",
      onClick: onStart
    }, "Start your loom ", /*#__PURE__*/React.createElement(Pearl, {
      size: 9
    })), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      size: "lg",
      onClick: () => onToast('Watch Pear thread a site')
    }, "\u25B6 \xA0Watch Pear thread a site")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 28,
        alignItems: 'center',
        paddingTop: 24,
        borderTop: '1px solid var(--pl-olive-12)',
        flexWrap: 'wrap'
      }
    }, [['28', 'occasions, one voice each', 'var(--pl-olive)'], ['20 sec', 'to a first draft', 'var(--pl-gold)'], ['$0', 'your first site, forever', 'var(--pl-olive)']].map(([n, l, c], i) => /*#__PURE__*/React.createElement("div", {
      key: l,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 28
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontStyle: 'italic',
        fontSize: 26,
        color: c,
        lineHeight: 1,
        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1'
      }
    }, n), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-body)',
        fontSize: 12,
        color: 'var(--pl-muted)',
        marginTop: 3,
        maxWidth: 140
      }
    }, l)), i < 2 ? /*#__PURE__*/React.createElement("div", {
      style: {
        width: 1,
        height: 36,
        background: 'var(--pl-olive-12)'
      }
    }) : null)))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        display: 'flex',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: -36,
        left: -10,
        opacity: 0.9
      },
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 130
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: 'min(440px, 92vw)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--pl-cream-card)',
        color: 'var(--pl-ink)',
        borderRadius: 24,
        border: '1px solid var(--pl-divider)',
        overflow: 'hidden',
        boxShadow: 'var(--pl-shadow-xl)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        borderBottom: '1px solid var(--pl-divider)',
        background: 'var(--pl-cream-deep)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 99,
        background: 'var(--pl-stone)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 99,
        background: 'var(--pl-stone)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: 99,
        background: 'var(--pl-stone)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 10,
        fontFamily: 'var(--pl-font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontSize: 9,
        color: 'var(--pl-muted)'
      }
    }, "pearloom.com/", occasion, "/", d.slug)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '34px 30px 24px',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 22,
        right: 22
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 34
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontSize: 10,
        color: 'var(--pl-muted)',
        marginBottom: 12
      }
    }, "Pressed by Pear \xB7 ", d.date), /*#__PURE__*/React.createElement("div", {
      className: "pl-letterpress",
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontSize: 42,
        lineHeight: 0.95,
        fontWeight: 400,
        letterSpacing: '-0.025em',
        fontVariationSettings: '"opsz" 144, "SOFT" 60'
      }
    }, d.hosts), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontSize: 17,
        fontStyle: 'italic',
        color: d.accent,
        margin: '6px 0 14px',
        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1'
      }
    }, d.verb), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--pl-font-body)',
        fontSize: 13.5,
        lineHeight: 1.55,
        color: 'var(--pl-ink-soft)',
        margin: 0,
        maxWidth: 340
      }
    }, d.sub)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '16px 30px 22px',
        background: 'var(--pl-cream-card)',
        borderTop: '1px solid var(--pl-divider)',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Pearl, {
      size: 10
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        fontSize: 13,
        fontFamily: 'var(--pl-font-body)'
      }
    }, "Kindly reply by ", /*#__PURE__*/React.createElement("em", {
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontStyle: 'italic'
      }
    }, "Aug 10"), "."), /*#__PURE__*/React.createElement("button", {
      onClick: () => onToast('RSVP pressed — see you there'),
      style: {
        background: d.accent,
        color: 'var(--pl-cream-card)',
        border: 'none',
        padding: '9px 16px',
        borderRadius: 999,
        fontSize: 12,
        fontFamily: 'var(--pl-font-body)',
        fontWeight: 500,
        cursor: 'pointer'
      }
    }, "Press RSVP \u2192"))), /*#__PURE__*/React.createElement("div", {
      className: "pl-glass-surface",
      style: {
        position: 'absolute',
        left: '50%',
        bottom: -54,
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: 4,
        borderRadius: 999
      }
    }, [['wedding', 'Wedding'], ['milestone', 'Milestone'], ['memorial', 'Memorial']].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setOccasion(k),
      style: {
        background: occasion === k ? 'var(--pl-ink)' : 'transparent',
        color: occasion === k ? 'var(--pl-cream)' : 'var(--pl-ink)',
        border: 'none',
        borderRadius: 999,
        padding: '8px 16px',
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'var(--pl-font-body)',
        transition: 'all var(--pl-dur-fast) var(--pl-ease-out)'
      }
    }, l)))))));
  }
  window.Hero = Hero;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Hero.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Nav.jsx
try { (() => {
/* global React */
// Pearloom marketing — sticky pill nav. Glyph + wordmark, links,
// sign-in, and the "Begin a thread" pearl CTA. Recreated from the
// product's DesignNav.
(() => {
  const {
    PearloomLogo,
    Button,
    Pearl
  } = window.PearloomDesignSystem_55118c;
  const NAV_LINKS = ['The three acts', 'Occasions', 'The Director', 'Pricing', 'Journal'];
  function Nav({
    onStart
  }) {
    return /*#__PURE__*/React.createElement("nav", {
      style: {
        position: 'sticky',
        top: 14,
        zIndex: 50,
        margin: '14px auto 0',
        maxWidth: 1180,
        padding: '0 24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "pl-glass-surface",
      style: {
        borderRadius: 999,
        padding: '10px 14px 10px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(PearloomLogo, {
      size: 26
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        fontSize: 14,
        fontWeight: 500,
        fontFamily: 'var(--pl-font-body)'
      }
    }, NAV_LINKS.map(l => /*#__PURE__*/React.createElement("a", {
      key: l,
      href: "#",
      onClick: e => e.preventDefault(),
      style: {
        color: 'var(--pl-ink)',
        opacity: 0.82,
        textDecoration: 'none',
        whiteSpace: 'nowrap'
      }
    }, l))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onStart,
      style: {
        fontSize: 14,
        fontWeight: 500,
        opacity: 0.8,
        padding: '8px 10px',
        background: 'transparent',
        border: 'none',
        color: 'var(--pl-ink)',
        fontFamily: 'var(--pl-font-body)',
        cursor: 'pointer'
      }
    }, "Sign in"), /*#__PURE__*/React.createElement(Button, {
      variant: "pearl",
      size: "sm",
      onClick: onStart
    }, "Begin a thread ", /*#__PURE__*/React.createElement(Pearl, {
      size: 8
    })))));
  }
  window.Nav = Nav;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Nav.jsx", error: String((e && e.message) || e) }); }

// ui_kits/marketing/Sections.jsx
try { (() => {
/* global React */
// Pearloom marketing — "The three acts" + pricing + footer. The acts
// describe the product arc (Thread it · Press it · Keep it); pricing
// shows the free + studio tiers; the footer signs off with the mark.
(() => {
  const {
    Eyebrow,
    Thread,
    Card,
    Button,
    PearloomLogo,
    Pearl
  } = window.PearloomDesignSystem_55118c;
  const ACTS = [{
    no: '01',
    t: 'Thread it',
    verb: 'woven',
    d: 'Answer three questions, hand over a few photos. Pear drafts the whole site in your voice — in about twenty seconds.'
  }, {
    no: '02',
    t: 'Press it',
    verb: 'pressed',
    d: 'Edit anything by hand, set the type, then press publish. Your site goes live at its own occasion address.'
  }, {
    no: '03',
    t: 'Keep it',
    verb: 'kept',
    d: 'RSVPs, a guest thread, a day-of timeline, and a keepsake that stays with you a year later.'
  }];
  function ActsStrip() {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        background: 'var(--pl-cream-deep)',
        padding: '76px 24px',
        position: 'relative'
      },
      className: "pl-grain"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1100,
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        marginBottom: 48
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "both"
    }, "The three acts"), /*#__PURE__*/React.createElement("h2", {
      className: "pl-display pl-letterpress",
      style: {
        fontSize: 'clamp(34px, 4.5vw, 56px)',
        margin: '14px 0 0'
      }
    }, "A site, ", /*#__PURE__*/React.createElement("span", {
      className: "pl-display-italic",
      style: {
        fontSize: 'inherit'
      }
    }, "woven"), " then kept")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 22
      }
    }, ACTS.map(a => /*#__PURE__*/React.createElement(Card, {
      key: a.no,
      padding: 28
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 11,
        letterSpacing: '0.22em',
        color: 'var(--pl-gold)'
      }
    }, "No. ", a.no), /*#__PURE__*/React.createElement("h3", {
      className: "pl-heading",
      style: {
        fontSize: 24,
        margin: '12px 0 4px'
      }
    }, a.t), /*#__PURE__*/React.createElement(Thread, {
      width: "48px",
      height: 10,
      style: {
        margin: '6px 0 14px'
      }
    }), /*#__PURE__*/React.createElement("p", {
      className: "pl-body",
      style: {
        fontSize: 14.5,
        margin: 0,
        color: 'var(--pl-ink-soft)'
      }
    }, a.d))))));
  }
  const TIERS = [{
    name: 'The first thread',
    price: '$0',
    sub: 'forever',
    feats: ['One site, fully woven', 'RSVP + guest thread', 'Your occasion address', 'Pear writes in your voice'],
    cta: 'Begin a thread',
    variant: 'paper'
  }, {
    name: 'The full bolt',
    price: '$48',
    sub: 'one-time, per occasion',
    feats: ['Everything in the first thread', 'Theme packs + the stationery studio', 'Day-of timeline + keepsake', 'Custom domain'],
    cta: 'Press the upgrade',
    variant: 'pearl',
    featured: true
  }];
  function Pricing({
    onStart,
    onToast
  }) {
    return /*#__PURE__*/React.createElement("section", {
      style: {
        padding: '76px 24px',
        maxWidth: 900,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        marginBottom: 44
      }
    }, /*#__PURE__*/React.createElement(Eyebrow, {
      rule: "both"
    }, "Pricing"), /*#__PURE__*/React.createElement("h2", {
      className: "pl-display pl-letterpress",
      style: {
        fontSize: 'clamp(34px, 4.5vw, 52px)',
        margin: '14px 0 0'
      }
    }, "Your first site is free.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 20,
        alignItems: 'stretch'
      }
    }, TIERS.map(t => /*#__PURE__*/React.createElement(Card, {
      key: t.name,
      padding: 30,
      style: t.featured ? {
        border: '1px solid var(--pl-gold-soft)',
        boxShadow: 'var(--pl-shadow-lg)'
      } : {}
    }, /*#__PURE__*/React.createElement("div", {
      className: "pl-heading",
      style: {
        fontSize: 20
      }
    }, t.name), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        margin: '10px 0 4px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "pl-display",
      style: {
        fontSize: 44
      }
    }, t.price), /*#__PURE__*/React.createElement("span", {
      className: "pl-body",
      style: {
        fontSize: 13,
        color: 'var(--pl-muted)'
      }
    }, t.sub)), /*#__PURE__*/React.createElement(Thread, {
      width: "100%",
      style: {
        margin: '14px 0 18px'
      }
    }), /*#__PURE__*/React.createElement("ul", {
      style: {
        listStyle: 'none',
        padding: 0,
        margin: '0 0 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 11
      }
    }, t.feats.map(f => /*#__PURE__*/React.createElement("li", {
      key: f,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--pl-font-body)',
        fontSize: 14,
        color: 'var(--pl-ink-soft)'
      }
    }, /*#__PURE__*/React.createElement(Pearl, {
      size: 9
    }), " ", f))), /*#__PURE__*/React.createElement(Button, {
      variant: t.variant,
      size: "md",
      style: {
        width: '100%'
      },
      onClick: t.featured ? () => onToast('Pressing the upgrade…') : onStart
    }, t.cta, t.featured ? /*#__PURE__*/React.createElement(Pearl, {
      size: 8
    }) : null)))));
  }
  function Footer() {
    return /*#__PURE__*/React.createElement("footer", {
      style: {
        background: 'var(--pl-ink)',
        color: 'var(--pl-cream)',
        padding: '56px 24px 40px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 1100,
        margin: '0 auto'
      }
    }, /*#__PURE__*/React.createElement(Thread, {
      width: "100%",
      color: "var(--pl-olive)",
      color2: "var(--pl-gold)",
      style: {
        marginBottom: 34
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: 24
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(PearloomLogo, {
      size: 26,
      color: "var(--pl-cream)"
    }), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontStyle: 'italic',
        fontSize: 22,
        color: 'var(--pl-gold)',
        margin: '16px 0 0',
        fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 1'
      }
    }, "A craft house for memory.")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--pl-stone)'
      }
    }, "Edition 01 \xB7 Pressed in California"))));
  }
  window.ActsStrip = ActsStrip;
  window.Pricing = Pricing;
  window.Footer = Footer;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/marketing/Sections.jsx", error: String((e && e.message) || e) }); }

// ui_kits/renderer/themes.js
try { (() => {
/* Pearloom — published-site theme catalogue + themeRootStyle().
   VERBATIM-SHAPED port of src/components/pearloom/site/themes.ts.
   The renderer reads a theme, calls themeRootStyle(), and spreads the
   result onto the .pl8-guest root so every var(--t-*) re-skins.
   This is the production contract — kit blocks bind to --t-* only. */
window.PEARLOOM_SITE_THEMES = [{
  id: 'santorini',
  name: 'Santorini Linen',
  blurb: 'Sun-bleached linen, Aegean blue, whitewash & olive.',
  swatches: ['#3F6E92', '#283D4E', '#C2A165', '#EDE7DA'],
  texture: 'linen',
  motif: 'olive',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'sprig',
    photo: 'arch',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#F5F1E8',
    '--t-section': '#EDE7DA',
    '--t-card': '#FBF9F3',
    '--t-ink': '#283D4E',
    '--t-ink-soft': '#4A6076',
    '--t-ink-muted': '#8A9AA6',
    '--t-accent': '#3F6E92',
    '--t-accent-2': '#7C9BB0',
    '--t-accent-bg': '#E2EAEF',
    '--t-accent-ink': '#2C5571',
    '--t-gold': '#C2A165',
    '--t-line': 'rgba(40,61,78,0.16)',
    '--t-line-soft': 'rgba(40,61,78,0.08)',
    '--t-rsvp': '#283D4E',
    '--t-rsvp-ink': '#F5F1E8',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '5px',
    '--t-radius-lg': '8px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.18',
    '--t-eyebrow-ls': '0.2em',
    '--t-shadow': '0 1px 0 rgba(40,61,78,0.05)'
  }
}, {
  id: 'tuscan',
  name: 'Tuscan Watercolor',
  blurb: 'Soft washes, terracotta & sage, blooms and lemons.',
  swatches: ['#C2693E', '#8A9A6B', '#C99A4E', '#F4E3D3'],
  texture: 'watercolor',
  motif: 'bloom',
  look: {
    card: 'wash',
    button: 'pill',
    divider: 'brush',
    photo: 'tape',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FBF6EC',
    '--t-section': '#F6ECDC',
    '--t-card': '#FFFCF5',
    '--t-ink': '#4B3D2A',
    '--t-ink-soft': '#6E5B43',
    '--t-ink-muted': '#A0907A',
    '--t-accent': '#C2693E',
    '--t-accent-2': '#D89A6A',
    '--t-accent-bg': '#F4E3D3',
    '--t-accent-ink': '#A4502A',
    '--t-gold': '#C99A4E',
    '--t-line': 'rgba(75,61,42,0.15)',
    '--t-line-soft': 'rgba(75,61,42,0.08)',
    '--t-rsvp': '#4B3D2A',
    '--t-rsvp-ink': '#FBF6EC',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '16px',
    '--t-radius-lg': '24px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.14em',
    '--t-shadow': '0 14px 30px rgba(75,61,42,0.10)'
  }
}, {
  id: 'garden',
  name: 'Pressed Garden',
  blurb: 'Cotton paper, pressed wildflowers, the Pearloom warmth.',
  swatches: ['#B7A4D0', '#8B9C5A', '#EAB286', '#F3E9D4'],
  texture: 'paper',
  motif: 'pressed',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'dot',
    photo: 'polaroid',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FDFAF0',
    '--t-section': '#F3E9D4',
    '--t-card': '#FFFEF7',
    '--t-ink': '#3D4A1F',
    '--t-ink-soft': '#566438',
    '--t-ink-muted': '#8A8671',
    '--t-accent': '#B7A4D0',
    '--t-accent-2': '#C4B5D9',
    '--t-accent-bg': '#E8E0F0',
    '--t-accent-ink': '#6B5A8C',
    '--t-gold': '#C19A4B',
    '--t-line': 'rgba(61,74,31,0.14)',
    '--t-line-soft': 'rgba(61,74,31,0.08)',
    '--t-rsvp': '#3D4A1F',
    '--t-rsvp-ink': '#F8F1E4',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.14em',
    '--t-shadow': '0 8px 22px rgba(61,74,31,0.08)'
  }
}, {
  id: 'editorial',
  name: 'Modern Editorial',
  blurb: 'Flat matte, high-contrast type. The clean counterpoint.',
  swatches: ['#1A1A17', '#B08940', '#E9E7E0', '#F4F3EF'],
  texture: 'none',
  motif: 'none',
  look: {
    card: 'flat',
    button: 'sharp',
    divider: 'rule',
    photo: 'clean',
    heroAlign: 'left',
    motifDensity: 'none'
  },
  vars: {
    '--t-paper': '#F4F3EF',
    '--t-section': '#EAE8E1',
    '--t-card': '#FBFAF7',
    '--t-ink': '#1A1A17',
    '--t-ink-soft': '#46453E',
    '--t-ink-muted': '#8A8980',
    '--t-accent': '#1A1A17',
    '--t-accent-2': '#B08940',
    '--t-accent-bg': '#E9E7E0',
    '--t-accent-ink': '#1A1A17',
    '--t-gold': '#B08940',
    '--t-line': 'rgba(26,26,23,0.16)',
    '--t-line-soft': 'rgba(26,26,23,0.08)',
    '--t-rsvp': '#1A1A17',
    '--t-rsvp-ink': '#F4F3EF',
    '--t-display': "'Geist', sans-serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Geist', sans-serif",
    '--t-radius': '2px',
    '--t-radius-lg': '3px',
    '--t-display-wght': '800',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.24em',
    '--t-shadow': 'none'
  }
}, {
  id: 'midnight',
  name: 'Midnight Velvet',
  blurb: 'Inky velvet, candlelight gold — made for evenings.',
  swatches: ['#1A1B2E', '#C9A24B', '#B9A6E0', '#262842'],
  dark: true,
  foil: true,
  texture: 'velvet',
  motif: 'pressed',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'dot',
    photo: 'clean',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#1A1B2E',
    '--t-section': '#20223A',
    '--t-card': '#262842',
    '--t-ink': '#F1EBDD',
    '--t-ink-soft': '#C4BDD0',
    '--t-ink-muted': '#8B86A0',
    '--t-accent': '#B9A6E0',
    '--t-accent-2': '#C9A24B',
    '--t-accent-bg': '#2E2C50',
    '--t-accent-ink': '#D9C9F0',
    '--t-gold': '#C9A24B',
    '--t-line': 'rgba(241,235,221,0.16)',
    '--t-line-soft': 'rgba(241,235,221,0.09)',
    '--t-rsvp': '#C9A24B',
    '--t-rsvp-ink': '#1A1B2E',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '12px',
    '--t-radius-lg': '18px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1.08',
    '--t-eyebrow-ls': '0.18em',
    '--t-shadow': '0 16px 40px rgba(0,0,0,0.40)'
  }
}, {
  id: 'coastal',
  name: 'Coastal Ink',
  blurb: 'Deckled paper, navy ink line-work, sea-glass calm.',
  swatches: ['#2C5E7A', '#1F3A4D', '#C9B89A', '#E8E4D6'],
  texture: 'cotton',
  motif: 'none',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'deckle',
    photo: 'deckle',
    heroAlign: 'center',
    motifDensity: 'none'
  },
  vars: {
    '--t-paper': '#EAE5D7',
    '--t-section': '#E0DAC8',
    '--t-card': '#F4F0E4',
    '--t-ink': '#1F3A4D',
    '--t-ink-soft': '#3E5B6E',
    '--t-ink-muted': '#82929E',
    '--t-accent': '#2C5E7A',
    '--t-accent-2': '#6E93A8',
    '--t-accent-bg': '#DCE5E7',
    '--t-accent-ink': '#1F4254',
    '--t-gold': '#B89A5E',
    '--t-line': 'rgba(31,58,77,0.18)',
    '--t-line-soft': 'rgba(31,58,77,0.09)',
    '--t-rsvp': '#1F3A4D',
    '--t-rsvp-ink': '#EAE5D7',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '2px',
    '--t-radius-lg': '3px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.22em',
    '--t-shadow': '0 1px 0 rgba(31,58,77,0.06)'
  }
}, /* ── New collection — reconciled into the real --t-* contract ── */
{
  id: 'amalfi',
  name: 'Amalfi Citrus',
  blurb: 'Sun-bleached blue, lemon and terracotta — a coastal supper.',
  swatches: ['#2E6B8A', '#C6703D', '#D9B44A', '#FBF6EA'],
  texture: 'linen',
  motif: 'bloom',
  look: {
    card: 'frame',
    button: 'pill',
    divider: 'sprig',
    photo: 'arch',
    heroAlign: 'center',
    motifDensity: 'generous'
  },
  vars: {
    '--t-paper': '#FBF6EA',
    '--t-section': '#F1E7D4',
    '--t-card': '#FFFCF4',
    '--t-ink': '#1A2A33',
    '--t-ink-soft': '#3C5560',
    '--t-ink-muted': '#7E8E96',
    '--t-accent': '#2E6B8A',
    '--t-accent-2': '#5E94AD',
    '--t-accent-bg': '#E2EAEF',
    '--t-accent-ink': '#235874',
    '--t-gold': '#D9B44A',
    '--t-line': 'rgba(26,42,51,0.16)',
    '--t-line-soft': 'rgba(26,42,51,0.08)',
    '--t-rsvp': '#C6703D',
    '--t-rsvp-ink': '#FBF6EA',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '500',
    '--t-hero-scale': '1.06',
    '--t-eyebrow-ls': '0.16em',
    '--t-shadow': '0 10px 26px rgba(26,42,51,0.10)'
  }
}, {
  id: 'first-light',
  name: 'First Light',
  blurb: 'Dawn rose and gold — the morning after, every year after.',
  swatches: ['#C6563D', '#C19A4B', '#D9A89E', '#FCF4EE'],
  texture: 'paper',
  motif: 'pressed',
  look: {
    card: 'soft',
    button: 'pill',
    divider: 'dot',
    photo: 'polaroid',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#FCF4EE',
    '--t-section': '#F6E4DA',
    '--t-card': '#FFFBF7',
    '--t-ink': '#3A2A2A',
    '--t-ink-soft': '#5E4742',
    '--t-ink-muted': '#9C8780',
    '--t-accent': '#C6563D',
    '--t-accent-2': '#D9897A',
    '--t-accent-bg': '#F6DDD4',
    '--t-accent-ink': '#A63F2A',
    '--t-gold': '#C19A4B',
    '--t-line': 'rgba(58,42,42,0.14)',
    '--t-line-soft': 'rgba(58,42,42,0.07)',
    '--t-rsvp': '#C6563D',
    '--t-rsvp-ink': '#FCF4EE',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '14px',
    '--t-radius-lg': '22px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1',
    '--t-eyebrow-ls': '0.14em',
    '--t-shadow': '0 8px 22px rgba(58,42,42,0.09)'
  }
}, {
  id: 'deco-gilt',
  name: 'Deco Gilt',
  blurb: 'Jazz-age geometry — ink, gilt and a hard-edged fan.',
  swatches: ['#14110C', '#C9A24B', '#7C8A6A', '#F3ECD9'],
  dark: true,
  foil: true,
  texture: 'velvet',
  motif: 'none',
  look: {
    card: 'flat',
    button: 'sharp',
    divider: 'rule',
    photo: 'clean',
    heroAlign: 'left',
    motifDensity: 'none'
  },
  vars: {
    '--t-paper': '#14110C',
    '--t-section': '#1C1810',
    '--t-card': '#211C13',
    '--t-ink': '#F3ECD9',
    '--t-ink-soft': '#C9C0A8',
    '--t-ink-muted': '#8A8266',
    '--t-accent': '#C9A24B',
    '--t-accent-2': '#7C8A6A',
    '--t-accent-bg': '#2A2416',
    '--t-accent-ink': '#E6C977',
    '--t-gold': '#C9A24B',
    '--t-line': 'rgba(243,236,217,0.16)',
    '--t-line-soft': 'rgba(243,236,217,0.08)',
    '--t-rsvp': '#C9A24B',
    '--t-rsvp-ink': '#14110C',
    '--t-display': "'Fraunces', Georgia, serif",
    '--t-body': "'Geist Mono', monospace",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '1px',
    '--t-radius-lg': '2px',
    '--t-display-wght': '700',
    '--t-hero-scale': '1.1',
    '--t-eyebrow-ls': '0.3em',
    '--t-shadow': '0 16px 40px rgba(0,0,0,0.45)'
  }
}, {
  id: 'tide-coast',
  name: 'Tide & Coast',
  blurb: 'Fog, driftwood and rope — an unhurried seaside vow.',
  swatches: ['#5E7A82', '#C8BFA5', '#9DB0B2', '#F2F1EC'],
  texture: 'cotton',
  motif: 'none',
  look: {
    card: 'frame',
    button: 'square',
    divider: 'deckle',
    photo: 'deckle',
    heroAlign: 'center',
    motifDensity: 'sparse'
  },
  vars: {
    '--t-paper': '#F2F1EC',
    '--t-section': '#E6E5DD',
    '--t-card': '#FAFAF6',
    '--t-ink': '#2C353A',
    '--t-ink-soft': '#4E5A60',
    '--t-ink-muted': '#8B969B',
    '--t-accent': '#5E7A82',
    '--t-accent-2': '#9DB0B2',
    '--t-accent-bg': '#DEE5E5',
    '--t-accent-ink': '#46626A',
    '--t-gold': '#B8A580',
    '--t-line': 'rgba(44,53,58,0.16)',
    '--t-line-soft': 'rgba(44,53,58,0.08)',
    '--t-rsvp': '#2C353A',
    '--t-rsvp-ink': '#F2F1EC',
    '--t-display': "'Cormorant Garamond', Georgia, serif",
    '--t-body': "'Geist', sans-serif",
    '--t-script': "'Caveat', cursive",
    '--t-radius': '3px',
    '--t-radius-lg': '5px',
    '--t-display-wght': '600',
    '--t-hero-scale': '1.12',
    '--t-eyebrow-ls': '0.2em',
    '--t-shadow': '0 1px 0 rgba(44,53,58,0.06)'
  }
}];
var PAD = {
  cozy: 0.74,
  comfortable: 1,
  spacious: 1.32
};
/* Port of themeRootStyle(): emit --t-* PLUS base-token shadows so any
   markup referencing base vars re-skins for free. */
window.themeRootStyle = function (theme, density) {
  var v = theme.vars;
  var pad = PAD[density || 'comfortable'] || 1;
  var s = {};
  for (var k in v) s[k] = v[k];
  s['--t-pad'] = String(pad);
  s['--paper'] = v['--t-paper'];
  s['--card'] = v['--t-card'];
  s['--ink'] = v['--t-ink'];
  s['--ink-soft'] = v['--t-ink-soft'];
  s['--ink-muted'] = v['--t-ink-muted'];
  s['--cream'] = v['--t-paper'];
  s['--cream-2'] = v['--t-section'];
  s['--cream-3'] = v['--t-section'];
  s['--line'] = v['--t-line'];
  s['--line-soft'] = v['--t-line-soft'];
  s['--card-ring'] = v['--t-line-soft'];
  s['--font-display'] = v['--t-display'];
  s['--gold'] = v['--t-gold'];
  s.fontFamily = v['--t-body'];
  s.color = v['--t-ink'];
  s.background = v['--t-paper'];
  return s;
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/renderer/themes.js", error: String((e && e.message) || e) }); }

// ui_kits/wallpapers/wallpaper-engine.js
try { (() => {
/* Pearloom — Interactive shader wallpapers engine.
   One WebGL canvas, five fragment shaders, pointer + tap reactive.
   No deps. GLSL ES 1.00 (WebGL1) for broad device support. */
(function () {
  'use strict';

  // ── Shared GLSL header: precision, uniforms, noise, ripple field ──
  var HEAD = ['precision highp float;', 'uniform vec2 u_res;', 'uniform float u_time;', 'uniform vec2 u_mouse;',
  // 0..1, y up, smoothed
  'uniform vec2 u_mvel;',
  // pointer velocity
  'uniform float u_down;',
  // 0..1 press amount (smoothed)
  'uniform vec3 u_rip[6];',
  // x,y (0..1), start-time ; z<0 = empty
  'uniform float u_dark;',
  // 0 light, 1 dark
  'float hash21(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }', 'vec2 hash22(vec2 p){ float n=sin(dot(p,vec2(41.0,289.0))); return fract(vec2(262144.0,32768.0)*n); }', 'float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);', '  float a=hash21(i),b=hash21(i+vec2(1.,0.)),c=hash21(i+vec2(0.,1.)),d=hash21(i+vec2(1.,1.));', '  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }', 'float fbm(vec2 p){ float s=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ s+=a*vnoise(p); p=m*p; a*=0.5;} return s; }',
  // ripple field: sum of decaying concentric waves from recent taps
  'float ripple(vec2 uv){ float s=0.0; for(int i=0;i<6;i++){ vec3 r=u_rip[i]; if(r.z<0.0) continue;', '  float age=u_time-r.z; if(age<0.0||age>3.0) continue; float d=distance(uv,r.xy);', '  s += sin(d*42.0 - age*15.0)*exp(-d*5.5)*exp(-age*2.0); } return s; }', 'vec3 toLin(vec3 c){ return pow(c,vec3(2.2)); }', 'vec3 toSRGB(vec3 c){ return pow(max(c,0.0),vec3(1.0/2.2)); }'].join('\n');
  var VERT = 'attribute vec2 p; void main(){ gl_Position=vec4(p,0.0,1.0); }';

  // Palette (sRGB 0..1) — Pearloom tokens
  var PAL = ['vec3 CREAM=vec3(0.992,0.980,0.941);', 'vec3 CREAMD=vec3(0.969,0.941,0.878);', 'vec3 INK=vec3(0.094,0.094,0.106);', 'vec3 INKW=vec3(0.082,0.067,0.043);', 'vec3 OLIVE=vec3(0.361,0.420,0.247);', 'vec3 OLIVED=vec3(0.212,0.247,0.133);', 'vec3 GOLD=vec3(0.757,0.604,0.294);', 'vec3 TERRA=vec3(0.776,0.439,0.239);', 'vec3 LAV=vec3(0.420,0.353,0.549);', 'vec3 SAGE=vec3(0.545,0.612,0.353);', 'vec3 ROSE=vec3(0.851,0.659,0.620);'].join('\n');

  // ── The five shaders. Each defines main(); uses helpers above. ──
  var SHADERS = {};

  // 1 · WOVEN SILK — the brand weave. Olive + gold threads over cream.
  SHADERS.silk = PAL + ['void main(){', ' vec2 asp=vec2(u_res.x/u_res.y,1.0);', ' vec2 uv=gl_FragCoord.xy/u_res; vec2 q=uv*asp; vec2 m=u_mouse*asp;', ' float md=distance(q,m);', ' q += normalize(q-m+1e-4)*0.03*exp(-md*3.5)*(0.6+u_down);',
  // bulge near pointer
  ' q += 0.012*ripple(uv);', ' float freq=44.0; vec2 cell=q*freq; vec2 id=floor(cell); vec2 f=fract(cell);', ' float checker=mod(id.x+id.y,2.0);', ' float hor=smoothstep(0.5,0.06,abs(f.y-0.5)); float ver=smoothstep(0.5,0.06,abs(f.x-0.5));', ' float thread=mix(hor,ver,checker);', ' float round=mix(abs(f.y-0.5),abs(f.x-0.5),checker);', ' float sheen=0.5+0.5*sin((q.x+q.y)*freq*0.5+u_time*0.4);', ' vec3 tcol=mix(OLIVE,GOLD,step(1.5,mod(id.x+id.y*2.0,3.0)));', ' tcol*= (0.78+0.42*(1.0-round*1.6))*(0.85+0.3*sheen);', ' vec3 base=mix(CREAMD,CREAM,0.5+0.5*sin(uv.y*3.0));', ' if(u_dark>0.5){ base=mix(INKW,vec3(0.10,0.09,0.06),uv.y); tcol*=1.15; }', ' vec3 col=mix(base,tcol,thread);', ' float glow=exp(-md*2.6)*(0.12+0.5*u_down);', ' col += GOLD*glow*0.6;', ' col += GOLD*max(0.0,ripple(uv))*0.25;', ' col*=1.0-0.18*length(uv-0.5);', ' gl_FragColor=vec4(col,1.0);', '}'].join('\n');

  // 2 · AURORA LINEN — soft warm flowing bands; pointer bends the flow.
  SHADERS.aurora = PAL + ['void main(){', ' vec2 asp=vec2(u_res.x/u_res.y,1.0); vec2 uv=gl_FragCoord.xy/u_res; vec2 q=uv*asp;', ' vec2 mo=(u_mouse-0.5);', ' q += mo*0.35 + 0.05*u_mvel;', ' float t=u_time*0.06;', ' float n=fbm(q*1.8+vec2(t,t*0.7));', ' float n2=fbm(q*3.1-vec2(t*0.8,t));', ' float bands=0.5+0.5*sin((q.y*2.6+n*2.6+t*1.4)*3.14159);', ' bands += 0.18*ripple(uv);', ' vec3 a=mix(CREAM,vec3(0.984,0.910,0.839),bands);',
  // cream→peach
  ' a=mix(a,SAGE,smoothstep(0.3,0.9,n2)*0.45);', ' a=mix(a,GOLD,smoothstep(0.7,1.0,bands)*0.35);', ' if(u_dark>0.5){ a=mix(INKW,LAV*0.6+INKW,bands); a=mix(a,SAGE*0.5,smoothstep(0.3,0.9,n2)*0.4); a=mix(a,GOLD*0.7,smoothstep(0.75,1.0,bands)*0.4);} ', ' float md=distance(q,u_mouse*asp);', ' a += GOLD*exp(-md*3.0)*(0.10+0.45*u_down);', ' a*=1.0-0.16*length(uv-0.5);', ' gl_FragColor=vec4(a,1.0);', '}'].join('\n');

  // 3 · STILL WATER — calm caustic ripples, lavender/sage. Memorials.
  SHADERS.water = PAL + ['void main(){', ' vec2 asp=vec2(u_res.x/u_res.y,1.0); vec2 uv=gl_FragCoord.xy/u_res; vec2 q=uv*asp; vec2 m=u_mouse*asp;', ' float md=distance(q,m);', ' float emit=sin(md*26.0-u_time*2.2)*exp(-md*3.2)*0.5;',
  // gentle source at pointer
  ' float h=ripple(uv)*0.8 + emit*0.5;', ' float caustic=fbm(q*2.2+vec2(0.0,u_time*0.05)+h*0.4);', ' caustic=pow(0.5+0.5*sin((caustic*3.0+h*3.0)*3.14159),2.0);', ' vec3 deep=mix(INKW,vec3(0.16,0.15,0.20),uv.y);',
  // warm midnight→lavender shadow
  ' vec3 lo=mix(deep,LAV*0.55,0.5);', ' vec3 col=mix(lo,mix(LAV,SAGE,0.4),caustic*0.8);', ' col += vec3(0.85,0.78,0.55)*pow(caustic,3.0)*0.25;',
  // faint gold glint
  ' if(u_dark<0.5){ vec3 lcol=mix(CREAMD,vec3(0.81,0.78,0.86),caustic*0.7); lcol=mix(lcol,SAGE,caustic*0.15); col=lcol; col+=GOLD*pow(caustic,3.0)*0.12; }', ' col += (LAV+0.2)*max(0.0,h)*0.18;', ' col*=1.0-0.2*length(uv-0.5);', ' gl_FragColor=vec4(col,1.0);', '}'].join('\n');

  // 4 · GILDED DUST — drifting gold motes on warm dark; pointer parallax + bloom.
  SHADERS.dust = PAL + ['float layer(vec2 q,float sc,float tw){', ' q*=sc; vec2 id=floor(q); vec2 f=fract(q)-0.5; float h=hash21(id);', ' vec2 off=(hash22(id)-0.5)*0.7; float d=length(f-off);', ' float tw2=0.5+0.5*sin(u_time*tw+h*6.2831);', ' return smoothstep(0.16,0.0,d)*tw2*step(0.45,h);', '}', 'void main(){', ' vec2 asp=vec2(u_res.x/u_res.y,1.0); vec2 uv=gl_FragCoord.xy/u_res; vec2 q=uv*asp;', ' vec2 par=(u_mouse-0.5);', ' float m=0.0;', ' m+=layer(q+par*0.10+vec2(u_time*0.01,0.0),7.0,2.0)*0.6;', ' m+=layer(q+par*0.22+vec2(0.0,u_time*0.015),12.0,3.0)*0.9;', ' m+=layer(q+par*0.40-vec2(u_time*0.02,0.0),20.0,4.5)*1.2;', ' m+=max(0.0,ripple(uv))*1.2;', ' vec3 bg=mix(INKW,vec3(0.16,0.12,0.07),uv.y);',
  // warm ember ground
  ' if(u_dark<0.5){ bg=mix(vec3(0.20,0.16,0.10),vec3(0.28,0.22,0.13),uv.y);} ', ' float md=distance(q,u_mouse*asp);', ' float halo=exp(-md*2.4)*(0.18+0.7*u_down);', ' vec3 col=bg + GOLD*m*(1.3+halo*2.0) + TERRA*m*0.3;', ' col += GOLD*halo*0.5;', ' col*=1.0-0.26*length(uv-0.5);', ' gl_FragColor=vec4(col,1.0);', '}'].join('\n');

  // 5 · MARBLED PAPER — the craft-house signature; pointer stirs the ink.
  SHADERS.marble = PAL + ['void main(){', ' vec2 asp=vec2(u_res.x/u_res.y,1.0); vec2 uv=gl_FragCoord.xy/u_res; vec2 q=uv*asp*1.5;', ' q += (u_mouse-0.5)*0.5;', ' vec2 m=u_mouse*asp*1.5; vec2 rel=q-m;', ' float swirl=exp(-dot(rel,rel)*2.2)*(2.2+3.0*u_down);',
  // stir near pointer
  ' float a=swirl + ripple(uv)*2.0; float c=cos(a),s=sin(a);', ' q=m+mat2(c,-s,s,c)*rel;', ' float t=u_time*0.03;', ' vec2 warp=vec2(fbm(q*1.3+t),fbm(q*1.3+vec2(5.2,1.3)-t));', ' float w=fbm(q*1.6+warp*1.6);', ' float veins=abs(sin(w*6.2831*2.5));', ' vec3 col=mix(CREAM,ROSE,smoothstep(0.25,0.65,w));', ' col=mix(col,SAGE,smoothstep(0.5,0.95,fbm(q*2.0-warp)));', ' col=mix(col,LAV*0.85+0.15,smoothstep(0.6,0.9,w)*0.5);', ' col=mix(col,GOLD,smoothstep(0.12,0.0,veins)*0.9);',
  // thin gold veins
  ' if(u_dark>0.5){ col=mix(INKW,col*0.6+INKW*0.4,0.7); col=mix(col,GOLD*0.9,smoothstep(0.12,0.0,veins)*0.8);} ', ' col*=1.0-0.16*length(uv-0.5);', ' gl_FragColor=vec4(col,1.0);', '}'].join('\n');

  // ── WebGL plumbing ──
  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('shader error:', gl.getShaderInfoLog(s), '\n', src);
      return null;
    }
    return s;
  }
  function program(gl, frag) {
    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, HEAD + '\n' + frag);
    if (!vs || !fs) return null;
    var p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('link error:', gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }
  function Wallpaper(canvas) {
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.error('WebGL unavailable');
      return null;
    }
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var progs = {},
      keys = Object.keys(SHADERS);
    keys.forEach(function (k) {
      progs[k] = program(gl, SHADERS[k]);
    });
    var current = 'silk';
    var mouse = [0.5, 0.6],
      target = [0.5, 0.6],
      vel = [0, 0],
      down = 0,
      downT = 0;
    var rips = [],
      maxR = 6;
    for (var i = 0; i < maxR; i++) rips.push([0, 0, -1]);
    var ripHead = 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var t0 = performance.now();
    function resize() {
      var w = canvas.clientWidth,
        h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    function setPointer(cx, cy) {
      var r = canvas.getBoundingClientRect();
      target[0] = (cx - r.left) / r.width;
      target[1] = 1.0 - (cy - r.top) / r.height;
    }
    canvas.addEventListener('pointermove', function (e) {
      setPointer(e.clientX, e.clientY);
      poke();
    });
    canvas.addEventListener('pointerdown', function (e) {
      setPointer(e.clientX, e.clientY);
      down = 1;
      downT = performance.now();
      var r = canvas.getBoundingClientRect();
      rips[ripHead] = [(e.clientX - r.left) / r.width, 1.0 - (e.clientY - r.top) / r.height, (performance.now() - t0) / 1000];
      ripHead = (ripHead + 1) % maxR;
      poke();
    });
    window.addEventListener('pointerup', function () {
      down = 0;
    });
    canvas.style.touchAction = 'none';
    function frame(now) {
      var time = (now - t0) / 1000 * (reduce ? 0.35 : 1.0);
      // smooth pointer
      var sm = reduce ? 0.18 : 0.12;
      var nx = mouse[0] + (target[0] - mouse[0]) * sm,
        ny = mouse[1] + (target[1] - mouse[1]) * sm;
      vel[0] = nx - mouse[0];
      vel[1] = ny - mouse[1];
      mouse[0] = nx;
      mouse[1] = ny;
      var downAmt = down ? 1 : Math.max(0, 1 - (now - downT) / 450);
      if (down) downAmt = 1;
      var p = progs[current];
      if (p) {
        gl.useProgram(p);
        var loc = gl.getAttribLocation(p, 'p');
        gl.enableVertexAttribArray(loc);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(gl.getUniformLocation(p, 'u_res'), canvas.width, canvas.height);
        gl.uniform1f(gl.getUniformLocation(p, 'u_time'), time);
        gl.uniform2f(gl.getUniformLocation(p, 'u_mouse'), mouse[0], mouse[1]);
        gl.uniform2f(gl.getUniformLocation(p, 'u_mvel'), vel[0] * 60, vel[1] * 60);
        gl.uniform1f(gl.getUniformLocation(p, 'u_down'), downAmt);
        gl.uniform1f(gl.getUniformLocation(p, 'u_dark'), document.documentElement.getAttribute('data-theme') === 'dark' ? 1 : 0);
        var flat = [];
        for (var i = 0; i < maxR; i++) {
          flat.push(rips[i][0], rips[i][1], rips[i][2]);
        }
        gl.uniform3fv(gl.getUniformLocation(p, 'u_rip'), new Float32Array(flat));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    }
    function loop(now) {
      frame(now);
      raf = requestAnimationFrame(loop);
    }
    var raf = 0;
    // Immediate first paint, then animate. The immediate paint guarantees a
    // visible frame even if rAF is throttled (e.g. background/preview frames).
    resize();
    frame(performance.now());
    raf = requestAnimationFrame(loop);

    // Pointer also nudges a repaint, so movement responds even between rAF ticks.
    function poke() {
      frame(performance.now());
    }
    return {
      set: function (k) {
        if (progs[k]) {
          current = k;
          poke();
        }
      },
      get: function () {
        return current;
      },
      resize: function () {
        resize();
        poke();
      },
      poke: poke
    };
  }
  window.PearloomWallpaper = Wallpaper;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wallpapers/wallpaper-engine.js", error: String((e && e.message) || e) }); }

// ui_kits/wizard/Wizard.jsx
try { (() => {
/* global React */
// Pearloom wizard — experiential rebuild. Five woven steps with the
// motion system: letterpress questions, thread-in transitions, a live
// phone preview, Pear's running commentary, and a threading finale.
// Built on the .pl8 chrome tokens + the new logo/monogram/motifs.
(() => {
  const NS = window.PearloomDesignSystem_55118c;
  const {
    PearloomGlyph,
    PearloomWordmark,
    Pearl,
    WeaveLoader,
    Monogram,
    Motif,
    Divider
  } = NS;
  const OCCASIONS = [{
    id: 'wedding',
    label: 'Wedding',
    verb: 'are getting married',
    motif: 'rings',
    voice: 'A bright day, two families, one long table.'
  }, {
    id: 'anniversary',
    label: 'Anniversary',
    verb: 'are celebrating',
    motif: 'laurel',
    voice: 'The years, gathered and toasted.'
  }, {
    id: 'birthday',
    label: 'Milestone birthday',
    verb: 'is turning',
    motif: 'cake',
    voice: 'Citrus, ros\u00e9, no speech over 90 seconds.'
  }, {
    id: 'memorial',
    label: 'Memorial',
    verb: 'a gathering for',
    motif: 'dove',
    voice: 'Tea, their records, their people.'
  }, {
    id: 'baby',
    label: 'Baby shower',
    verb: 'are expecting',
    motif: 'bloom',
    voice: 'Soft mornings and small things.'
  }, {
    id: 'reunion',
    label: 'Reunion',
    verb: 'are reuniting',
    motif: 'sun',
    voice: 'Everyone, back in one place.'
  }];
  const VIBES = [{
    id: 'romantic',
    label: 'Romantic',
    face: {
      fontFamily: 'var(--pl-font-display)',
      fontStyle: 'italic',
      fontWeight: 500
    }
  }, {
    id: 'joyful',
    label: 'Joyful',
    face: {
      fontWeight: 700
    }
  }, {
    id: 'intimate',
    label: 'Intimate',
    face: {
      fontFamily: 'var(--pl-font-display)',
      fontStyle: 'italic',
      fontWeight: 500
    }
  }, {
    id: 'editorial',
    label: 'Editorial',
    face: {
      textTransform: 'uppercase',
      letterSpacing: '0.18em',
      fontSize: 12,
      fontWeight: 700
    }
  }, {
    id: 'quiet',
    label: 'Quiet',
    face: {
      fontWeight: 400,
      letterSpacing: '0.14em'
    }
  }, {
    id: 'elegant',
    label: 'Elegant',
    face: {
      fontFamily: 'var(--pl-font-display)',
      fontStyle: 'italic',
      letterSpacing: '0.06em'
    }
  }, {
    id: 'bold',
    label: 'Bold',
    face: {
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      fontSize: 13
    }
  }, {
    id: 'outdoorsy',
    label: 'Outdoorsy',
    face: {
      fontWeight: 600,
      letterSpacing: '0.02em'
    }
  }];
  const PALETTES = [{
    id: 'garden',
    name: 'Pressed Garden',
    bg: '#FDFAF0',
    ink: '#3D4A1F',
    accent: '#5C6B3F',
    gold: '#C19A4B',
    swatch: ['#FDFAF0', '#5C6B3F', '#C19A4B', '#D9A89E']
  }, {
    id: 'amalfi',
    name: 'Amalfi Citrus',
    bg: '#FBF6EA',
    ink: '#1A2A33',
    accent: '#2E6B8A',
    gold: '#D9B44A',
    swatch: ['#FBF6EA', '#2E6B8A', '#C6703D', '#D9B44A']
  }, {
    id: 'midnight',
    name: 'Midnight Velvet',
    bg: '#1A1B2E',
    ink: '#F1EBDD',
    accent: '#B9A6E0',
    gold: '#C9A24B',
    swatch: ['#1A1B2E', '#C9A24B', '#B9A6E0', '#262842'],
    dark: true
  }, {
    id: 'first-light',
    name: 'First Light',
    bg: '#FCF4EE',
    ink: '#3A2A2A',
    accent: '#C6563D',
    gold: '#C19A4B',
    swatch: ['#FCF4EE', '#C6563D', '#C19A4B', '#D9A89E']
  }];
  const STEPS = ['Occasion', 'The basics', 'The feeling', 'Photos', 'Review'];
  const PEAR_LINES = ["Let's start with the occasion — I'll set the whole tone from here.", "Just the essentials. I'll write everything else in your voice.", "Pick what it should feel like. The type and color follow.", "Hand me a few photos and I'll cluster them into chapters.", "Here's your loom. Press it, and I'll weave the whole site."];
  function threadingMessages() {
    return ['reading your photos', 'pressing a palette', 'writing your story', 'weaving your RSVP', 'setting the type', 'pressing publish'];
  }
  function Wizard() {
    const [step, setStep] = React.useState(0);
    const [dir, setDir] = React.useState(1);
    const [busy, setBusy] = React.useState(false);
    const [done, setDone] = React.useState(false);
    const [st, setSt] = React.useState({
      occasion: '',
      n1: '',
      n2: '',
      date: '',
      place: '',
      vibes: [],
      palette: 'garden',
      photos: 0
    });
    const occ = OCCASIONS.find(o => o.id === st.occasion);
    const pal = PALETTES.find(p => p.id === st.palette);
    const canNext = [!!st.occasion, st.n1.trim().length > 0, st.vibes.length > 0, true, true][step];
    const go = d => {
      if (d > 0 && !canNext) return;
      if (step === STEPS.length - 1 && d > 0) {
        generate();
        return;
      }
      setDir(d);
      if (window.PearloomMotion && !window.PearloomMotion.reduced) {
        window.PearloomMotion.weave(() => setStep(s => Math.max(0, Math.min(STEPS.length - 1, s + d))), {
          duration: 540
        });
      } else {
        setStep(s => Math.max(0, Math.min(STEPS.length - 1, s + d)));
      }
    };
    const generate = () => {
      setBusy(true);
      setTimeout(() => {
        setBusy(false);
        setDone(true);
      }, 4200);
    };

    // ── progress thread ──
    const Progress = /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        marginBottom: 'clamp(20px,4vh,40px)'
      }
    }, STEPS.map((s, i) => {
      const on = i === step,
        past = i < step;
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: s
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          position: 'relative'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: on ? 13 : 10,
          height: on ? 13 : 10,
          borderRadius: '50%',
          background: past || on ? 'var(--pl-olive)' : 'var(--cream-3)',
          border: on ? '2px solid var(--pl-cream)' : '1.5px solid var(--pl-divider)',
          outline: on ? '2px solid var(--pl-olive)' : 'none',
          transition: 'all var(--pl-dur-base) var(--pl-ease-spring)'
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          top: 20,
          fontFamily: 'var(--pl-font-mono)',
          fontSize: 8.5,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: on ? 'var(--pl-olive)' : 'var(--pl-muted)',
          whiteSpace: 'nowrap',
          fontWeight: on ? 700 : 400,
          opacity: on ? 1 : 0.6
        }
      }, s)), i < STEPS.length - 1 ? /*#__PURE__*/React.createElement("div", {
        style: {
          width: 'clamp(28px,7vw,64px)',
          height: 2,
          margin: '0 4px',
          background: 'var(--pl-divider)',
          position: 'relative',
          overflow: 'hidden'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          inset: 0,
          background: 'var(--pl-gold)',
          transform: `scaleX(${past ? 1 : 0})`,
          transformOrigin: 'left',
          transition: 'transform var(--pl-dur-slow) var(--pl-ease-emphasis)'
        }
      })) : null);
    }));
    if (done) return /*#__PURE__*/React.createElement(DonePanel, {
      st: st,
      occ: occ,
      pal: pal,
      onReopen: () => {
        setDone(false);
        setStep(0);
      }
    });
    if (busy) return /*#__PURE__*/React.createElement(Generating, null);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 2
      }
    }, /*#__PURE__*/React.createElement("header", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 28px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9
      }
    }, /*#__PURE__*/React.createElement(PearloomGlyph, {
      size: 26,
      color: "var(--pl-olive)"
    }), /*#__PURE__*/React.createElement(PearloomWordmark, {
      size: 17,
      color: "var(--pl-ink)"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--pl-muted)'
      }
    }, "New site \xB7 ", step + 1, " of ", STEPS.length)), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: step >= 2 ? '1fr minmax(0,300px)' : '1fr',
        gap: 40,
        alignItems: 'center',
        maxWidth: step >= 2 ? 1080 : 720,
        margin: '0 auto',
        width: '100%',
        padding: '0 28px 40px',
        boxSizing: 'border-box'
      },
      className: "wz-main"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%'
      }
    }, Progress, /*#__PURE__*/React.createElement("div", {
      key: step,
      className: "wz-step"
    }, /*#__PURE__*/React.createElement(Step, {
      step: step,
      st: st,
      setSt: setSt,
      occ: occ
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 26,
        color: 'var(--pl-ink-soft)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Pearl, {
      size: 11,
      iridescent: true
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13.5,
        fontStyle: 'italic',
        fontFamily: 'var(--pl-font-display)',
        color: 'var(--pl-olive)'
      }
    }, PEAR_LINES[step])), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginTop: 28
      }
    }, step > 0 ? /*#__PURE__*/React.createElement("button", {
      onClick: () => go(-1),
      className: "wz-btn ghost"
    }, "\u2190 Back") : /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => go(1),
      className: 'wz-btn ' + (canNext ? 'pearl' : 'disabled'),
      disabled: !canNext
    }, step === STEPS.length - 1 ? 'Weave my site' : 'Continue', " ", /*#__PURE__*/React.createElement(Pearl, {
      size: 8
    })))), step >= 2 ? /*#__PURE__*/React.createElement(LivePreview, {
      st: st,
      occ: occ,
      pal: pal
    }) : null));
  }
  function Step({
    step,
    st,
    setSt,
    occ
  }) {
    if (step === 0) return /*#__PURE__*/React.createElement("div", {
      "data-wz": true
    }, /*#__PURE__*/React.createElement(Q, null, "What are we ", /*#__PURE__*/React.createElement("i", null, "celebrating?")), /*#__PURE__*/React.createElement(Sub, null, "Pick the closest \u2014 it sets the whole tone. You can change it any time."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))',
        gap: 12,
        marginTop: 24
      }
    }, OCCASIONS.map(o => {
      const on = st.occasion === o.id;
      return /*#__PURE__*/React.createElement("button", {
        key: o.id,
        onClick: () => setSt(s => ({
          ...s,
          occasion: o.id
        })),
        className: "wz-tile",
        style: {
          borderColor: on ? 'var(--pl-olive)' : 'var(--pl-divider)',
          background: on ? 'var(--pl-olive-8)' : 'var(--pl-cream-card)',
          boxShadow: on ? '0 0 0 3px var(--pl-olive-12)' : 'none'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 40,
          height: 40,
          borderRadius: 12,
          background: on ? 'var(--pl-olive)' : 'var(--peach-bg)',
          display: 'grid',
          placeItems: 'center',
          transition: 'background var(--pl-dur-base)'
        }
      }, /*#__PURE__*/React.createElement(Motif, {
        name: o.motif,
        size: 26,
        color: on ? 'var(--pl-cream)' : 'var(--pl-olive)',
        accent: on ? 'var(--pl-gold)' : 'var(--pl-gold)'
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--pl-font-display)',
          fontSize: 15.5,
          color: 'var(--pl-ink)'
        }
      }, o.label));
    })));
    if (step === 1) return /*#__PURE__*/React.createElement("div", {
      "data-wz": true
    }, /*#__PURE__*/React.createElement(Q, null, "The ", /*#__PURE__*/React.createElement("i", null, "essentials.")), /*#__PURE__*/React.createElement(Sub, null, "Just enough to start. Pear writes the rest in your voice."), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Inp, {
      label: occ && occ.id === 'memorial' ? 'In memory of' : 'Your name',
      v: st.n1,
      on: v => setSt(s => ({
        ...s,
        n1: v
      })),
      ph: "Mira"
    }), /*#__PURE__*/React.createElement(Inp, {
      label: "& (optional)",
      v: st.n2,
      on: v => setSt(s => ({
        ...s,
        n2: v
      })),
      ph: "Jun"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Inp, {
      label: "Date",
      v: st.date,
      on: v => setSt(s => ({
        ...s,
        date: v
      })),
      ph: "Sept 6, 2026"
    }), /*#__PURE__*/React.createElement(Inp, {
      label: "Where",
      v: st.place,
      on: v => setSt(s => ({
        ...s,
        place: v
      })),
      ph: "Point Reyes, CA"
    }))));
    if (step === 2) return /*#__PURE__*/React.createElement("div", {
      "data-wz": true
    }, /*#__PURE__*/React.createElement(Q, null, "How should it ", /*#__PURE__*/React.createElement("i", null, "feel?")), /*#__PURE__*/React.createElement(Sub, null, "Tap a few. The type and palette follow your mood."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 9,
        marginTop: 22
      }
    }, VIBES.map(v => {
      const on = st.vibes.includes(v.id);
      return /*#__PURE__*/React.createElement("button", {
        key: v.id,
        onClick: () => setSt(s => ({
          ...s,
          vibes: on ? s.vibes.filter(x => x !== v.id) : [...s.vibes, v.id]
        })),
        className: "wz-chip",
        style: {
          borderColor: on ? 'var(--pl-olive)' : 'var(--pl-divider)',
          background: on ? 'var(--pl-olive)' : 'var(--pl-cream-card)',
          color: on ? 'var(--pl-cream)' : 'var(--pl-ink)',
          ...v.face
        }
      }, v.label);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 26,
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--pl-muted)',
        marginBottom: 12
      }
    }, "And a palette"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2,1fr)',
        gap: 10
      }
    }, PALETTES.map(p => {
      const on = st.palette === p.id;
      return /*#__PURE__*/React.createElement("button", {
        key: p.id,
        onClick: () => setSt(s => ({
          ...s,
          palette: p.id
        })),
        className: "wz-pal",
        style: {
          borderColor: on ? 'var(--pl-gold)' : 'var(--pl-divider)',
          boxShadow: on ? '0 0 0 2px var(--pl-gold-soft)' : 'none'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'flex',
          height: 30,
          borderRadius: 7,
          overflow: 'hidden',
          flex: 1
        }
      }, p.swatch.map((c, i) => /*#__PURE__*/React.createElement("span", {
        key: i,
        style: {
          flex: 1,
          background: c
        }
      }))), /*#__PURE__*/React.createElement("span", {
        style: {
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--pl-ink)',
          whiteSpace: 'nowrap'
        }
      }, p.name));
    })));
    if (step === 3) return /*#__PURE__*/React.createElement("div", {
      "data-wz": true
    }, /*#__PURE__*/React.createElement(Q, null, "Hand over a few ", /*#__PURE__*/React.createElement("i", null, "photos.")), /*#__PURE__*/React.createElement(Sub, null, "Pear clusters them into chapters. You can also start empty."), /*#__PURE__*/React.createElement("button", {
      onClick: () => setSt(s => ({
        ...s,
        photos: Math.min(24, s.photos + 6)
      })),
      className: "wz-drop",
      style: {
        marginTop: 22
      }
    }, /*#__PURE__*/React.createElement(Motif, {
      name: "feather",
      size: 40,
      color: "var(--pl-olive)",
      accent: "var(--pl-gold)"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--pl-ink)',
        marginTop: 8
      }
    }, "Drop photos, or tap to add"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--pl-muted)'
      }
    }, "JPG, PNG, HEIC \xB7 up to 24")), st.photos > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(6,1fr)',
        gap: 8,
        marginTop: 14
      }
    }, Array.from({
      length: st.photos
    }).map((_, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "pl-pearl-pop",
      style: {
        aspectRatio: '1',
        borderRadius: 8,
        background: `linear-gradient(135deg, var(--pl-olive-20), var(--pl-gold-mist))`,
        animationDelay: i % 6 * 40 + 'ms'
      }
    }))) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        fontSize: 12.5,
        color: 'var(--pl-muted)'
      }
    }, st.photos === 0 ? 'No photos yet — Pear will start with an empty canvas.' : st.photos + ' photos ready. Pear clusters them into chapters.'));

    // review
    return /*#__PURE__*/React.createElement("div", {
      "data-wz": true
    }, /*#__PURE__*/React.createElement(Q, null, "Ready to ", /*#__PURE__*/React.createElement("i", null, "weave.")), /*#__PURE__*/React.createElement(Sub, null, "Here's what Pear heard. Press the button and watch it come together."), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        background: 'var(--pl-cream-card)',
        border: '1px solid var(--pl-divider)',
        borderRadius: 16,
        overflow: 'hidden'
      }
    }, [['Occasion', occ ? occ.label : '—'], ['Names', [st.n1, st.n2].filter(Boolean).join(' & ') || '—'], ['When · where', [st.date, st.place].filter(Boolean).join(' · ') || '—'], ['Feeling', st.vibes.join(', ') || '—'], ['Photos', st.photos ? st.photos + ' ready' : 'Empty canvas']].map((r, i, a) => /*#__PURE__*/React.createElement("div", {
      key: r[0],
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        padding: '13px 18px',
        borderBottom: i < a.length - 1 ? '1px solid var(--pl-divider-soft)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--pl-muted)'
      }
    }, r[0]), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: 'var(--pl-ink)',
        textAlign: 'right',
        fontWeight: 500
      }
    }, r[1])))));
  }
  function LivePreview({
    st,
    occ,
    pal
  }) {
    const names = [st.n1, st.n2].filter(Boolean).join(' & ') || 'Your names';
    return /*#__PURE__*/React.createElement("div", {
      className: "wz-preview",
      style: {
        justifySelf: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 9,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'var(--pl-muted)',
        textAlign: 'center',
        marginBottom: 10
      }
    }, "Live \xB7 your site"), /*#__PURE__*/React.createElement("div", {
      key: pal.id + names,
      className: "pl-press-in",
      style: {
        width: 264,
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid var(--pl-divider)',
        boxShadow: 'var(--pl-shadow-xl)',
        background: pal.bg
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '30px 22px 22px',
        textAlign: 'center',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 12,
        right: 12,
        opacity: 0.5
      }
    }, /*#__PURE__*/React.createElement(Motif, {
      name: occ ? occ.motif : 'sprig',
      size: 26,
      color: pal.accent,
      accent: pal.gold
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 8,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: pal.accent,
        marginBottom: 10,
        opacity: 0.8
      }
    }, "Save the date"), /*#__PURE__*/React.createElement(Monogram, {
      left: (st.n1 || 'M')[0].toUpperCase(),
      right: (st.n2 || 'J')[0].toUpperCase(),
      single: !st.n2,
      frame: "ring",
      size: 70,
      ink: pal.ink,
      accent: pal.accent,
      paper: pal.bg
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontWeight: 600,
        fontSize: 22,
        lineHeight: 1.05,
        color: pal.ink,
        marginTop: 10
      }
    }, names), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontStyle: 'italic',
        fontSize: 13,
        color: pal.accent,
        marginTop: 4
      }
    }, occ ? occ.verb : 'are celebrating'), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'center',
        margin: '12px 0'
      }
    }, /*#__PURE__*/React.createElement(Divider, {
      ornament: "sprig",
      width: "90px",
      ink: pal.accent,
      accent: pal.gold,
      color: pal.accent + '33'
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 10,
        color: pal.ink,
        opacity: 0.6,
        fontFamily: 'var(--pl-font-mono)',
        letterSpacing: '0.04em'
      }
    }, (st.date || 'SEPT 6, 2026').toUpperCase())), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 12,
        borderTop: `1px solid ${pal.accent}22`
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '9px',
        borderRadius: 999,
        background: pal.accent,
        color: pal.bg,
        textAlign: 'center',
        fontSize: 11.5,
        fontWeight: 600,
        fontFamily: 'var(--pl-font-body)'
      }
    }, "Press RSVP \u2192"))));
  }
  function Generating() {
    const [i, setI] = React.useState(0);
    const msgs = threadingMessages();
    React.useEffect(() => {
      const id = setInterval(() => setI(x => Math.min(msgs.length - 1, x + 1)), 680);
      return () => clearInterval(id);
    }, []);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
        zIndex: 2
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18
      }
    }, /*#__PURE__*/React.createElement(WeaveLoader, {
      size: "xl"
    }), /*#__PURE__*/React.createElement("div", {
      className: "pl-press-in",
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontSize: 'clamp(28px,4vw,40px)',
        color: 'var(--pl-ink)'
      }
    }, "Pear is ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--pl-olive)'
      }
    }, "weaving"), " your site"), /*#__PURE__*/React.createElement("div", {
      "aria-live": "polite",
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontStyle: 'italic',
        fontSize: 17,
        color: 'var(--pl-olive)',
        minHeight: 24
      }
    }, msgs[i], "\u2026"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 220,
        height: 3,
        background: 'var(--cream-3)',
        borderRadius: 99,
        overflow: 'hidden',
        marginTop: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        background: 'linear-gradient(90deg, var(--pl-olive), var(--pl-gold))',
        width: (i + 1) / msgs.length * 100 + '%',
        transition: 'width var(--pl-dur-slow) var(--pl-ease-emphasis)'
      }
    }))));
  }
  function DonePanel({
    st,
    occ,
    pal,
    onReopen
  }) {
    const names = [st.n1, st.n2].filter(Boolean).join(' & ') || 'Your site';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
        zIndex: 2,
        padding: 28
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "pl-press-in",
      style: {
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        maxWidth: 460
      }
    }, /*#__PURE__*/React.createElement(Monogram, {
      left: (st.n1 || 'M')[0].toUpperCase(),
      right: (st.n2 || 'J')[0].toUpperCase(),
      single: !st.n2,
      frame: "wreath",
      size: 104
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--pl-gold)'
      }
    }, "Woven \xB7 ready to press"), /*#__PURE__*/React.createElement("h1", {
      className: "pl-letterpress",
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontSize: 'clamp(34px,5vw,56px)',
        lineHeight: 1.0,
        margin: 0,
        color: 'var(--pl-ink)'
      }
    }, names, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--pl-olive)'
      }
    }, "is woven.")), /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 15.5,
        color: 'var(--pl-ink-soft)',
        lineHeight: 1.6,
        margin: 0
      }
    }, "Pear drafted the cover, story, schedule, RSVP, and travel guide \u2014 all in your voice. Open the editor to press it, then publish."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        marginTop: 6,
        flexWrap: 'wrap',
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "wz-btn pearl"
    }, "Open the editor ", /*#__PURE__*/React.createElement(Pearl, {
      size: 8
    })), /*#__PURE__*/React.createElement("button", {
      onClick: onReopen,
      className: "wz-btn ghost"
    }, "Start another"))));
  }
  function Q({
    children
  }) {
    return /*#__PURE__*/React.createElement("h1", {
      className: "pl-letterpress",
      style: {
        fontFamily: 'var(--pl-font-display)',
        fontWeight: 400,
        fontSize: 'clamp(32px,5vw,52px)',
        lineHeight: 1.02,
        letterSpacing: '-0.02em',
        margin: 0,
        color: 'var(--pl-ink)'
      }
    }, wrapItalic(children));
  }
  function wrapItalic(children) {
    return React.Children.map(children, c => c && c.type === 'i' ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontStyle: 'italic',
        color: 'var(--pl-olive)'
      }
    }, c.props.children) : c);
  }
  function Sub({
    children
  }) {
    return /*#__PURE__*/React.createElement("p", {
      style: {
        fontSize: 16,
        color: 'var(--pl-ink-soft)',
        lineHeight: 1.55,
        margin: '12px 0 0',
        maxWidth: 480
      }
    }, children);
  }
  function Inp({
    label,
    v,
    on,
    ph
  }) {
    return /*#__PURE__*/React.createElement("label", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--pl-font-mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--pl-muted)'
      }
    }, label), /*#__PURE__*/React.createElement("input", {
      value: v,
      onChange: e => on(e.target.value),
      placeholder: ph,
      className: "wz-input"
    }));
  }
  window.PearloomWizard = Wizard;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wizard/Wizard.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Folio = __ds_scope.Folio;

__ds_ns.Monogram = __ds_scope.Monogram;

__ds_ns.Pearl = __ds_scope.Pearl;

__ds_ns.PearloomGlyph = __ds_scope.PearloomGlyph;

__ds_ns.PearloomWordmark = __ds_scope.PearloomWordmark;

__ds_ns.PearloomLogo = __ds_scope.PearloomLogo;

__ds_ns.Thread = __ds_scope.Thread;

__ds_ns.WeaveLoader = __ds_scope.WeaveLoader;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Field = __ds_scope.Field;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.Motif = __ds_scope.Motif;

__ds_ns.MOTIF_NAMES = __ds_scope.MOTIF_NAMES;

})();
