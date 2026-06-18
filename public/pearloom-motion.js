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
        if (el.getAttribute('data-reveal-once') !== 'false') io.unobserve(el);
        else { /* allow re-trigger: reset when it leaves (handled below) */ }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
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
      els.forEach(function (el) { el.setAttribute('data-revealed', ''); });
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
      if (REDUCED) { if (onPeak) onPeak(); resolve(); return; }

      var ov = document.createElement('div');
      ov.className = 'pl-weave-overlay';
      var ease = 'cubic-bezier(0.16,1,0.3,1)';
      var top = document.createElement('div'); top.className = 'pl-weave-panel top';
      var seam = document.createElement('div'); seam.className = 'pl-weave-seam';
      var bot = document.createElement('div'); bot.className = 'pl-weave-panel bot';
      ov.appendChild(top); ov.appendChild(seam); ov.appendChild(bot);

      // seam threads
      var W = window.innerWidth;
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%'); svg.setAttribute('height', '20');
      svg.setAttribute('viewBox', '0 0 ' + W + ' 20'); svg.setAttribute('preserveAspectRatio', 'none');
      svg.style.cssText = 'position:absolute;left:0;top:-10px;width:100%;height:20px;overflow:visible';
      function strand(color, off, w) {
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        var amp = 7, k = W / 6;
        var d = 'M0 10 ';
        for (var x = 0; x <= 6; x++) d += 'Q ' + (k * x - k / 2).toFixed(0) + ' ' + (10 + (x % 2 ? amp : -amp)) + ' ' + (k * x).toFixed(0) + ' 10 ';
        p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', color);
        p.setAttribute('stroke-width', w); p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1';
        p.style.animation = 'pl-strand-draw ' + (dur * 0.55) + 'ms ' + ease + ' ' + off + 'ms forwards';
        return p;
      }
      svg.appendChild(strand('var(--pl-olive)', 60, 2.5));
      svg.appendChild(strand('var(--pl-gold)', 150, 2));
      seam.appendChild(svg);

      document.body.appendChild(ov);
      // close
      top.style.animation = 'pl-weave-close-top ' + (dur * 0.5) + 'ms ' + ease + ' forwards';
      bot.style.animation = 'pl-weave-close-bot ' + (dur * 0.5) + 'ms ' + ease + ' forwards';

      window.setTimeout(function () {
        if (onPeak) { try { onPeak(); } catch (e) {} }
        // open away
        top.style.animation = 'pl-weave-open-top ' + (dur * 0.5) + 'ms ' + ease + ' forwards';
        bot.style.animation = 'pl-weave-open-bot ' + (dur * 0.5) + 'ms ' + ease + ' forwards';
        window.setTimeout(function () { ov.remove(); resolve(); }, dur * 0.5 + 40);
      }, dur * 0.5 + 120);
    });
  }

  function navigate(href, opts) { weave(function () { window.location.assign(href); }, opts); }

  window.PearloomMotion = { init: init, reveal: reveal, weave: weave, navigate: navigate, reduced: REDUCED };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();
