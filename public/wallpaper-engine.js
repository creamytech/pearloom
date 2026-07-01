/* Pearloom — Interactive shader wallpapers engine.
   One WebGL canvas, five fragment shaders, pointer + tap reactive.
   No deps. GLSL ES 1.00 (WebGL1) for broad device support.

   Guest-device etiquette (this runs on phones for a whole visit):
   - prefers-reduced-motion → a single still frame, repainted only on
     resize / theme / shader change. No animation loop at all.
   - Pointer input listens on window (the canvas sits UNDER the site
     content and never hit-tests), so interactivity works everywhere
     without stealing scroll.
   - Uniform/attrib locations cached per program; zero per-frame
     allocations; shaders compile lazily (a site uses exactly one).
   - The loop drops to half rate when the pointer has been idle and
     no ripples are alive; full rate resumes on the next touch.
   - destroy() releases GL programs/buffer and the context itself. */
(function () {
  'use strict';

  // ── Shared GLSL header: precision, uniforms, noise, ripple field ──
  var HEAD = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform vec2 u_mouse;',      // 0..1, y up, smoothed
    'uniform vec2 u_mvel;',       // pointer velocity
    'uniform float u_down;',      // 0..1 press amount (smoothed)
    'uniform vec3 u_rip[6];',     // x,y (0..1), start-time ; z<0 = empty
    'uniform float u_dark;',      // 0 light, 1 dark
    'float hash21(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }',
    'vec2 hash22(vec2 p){ float n=sin(dot(p,vec2(41.0,289.0))); return fract(vec2(262144.0,32768.0)*n); }',
    'float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); vec2 u=f*f*(3.0-2.0*f);',
    '  float a=hash21(i),b=hash21(i+vec2(1.,0.)),c=hash21(i+vec2(0.,1.)),d=hash21(i+vec2(1.,1.));',
    '  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }',
    'float fbm(vec2 p){ float s=0.0,a=0.5; mat2 m=mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ s+=a*vnoise(p); p=m*p; a*=0.5;} return s; }',
    // ripple field: sum of decaying concentric waves from recent taps
    'float ripple(vec2 uv){ float s=0.0; for(int i=0;i<6;i++){ vec3 r=u_rip[i]; if(r.z<0.0) continue;',
    '  float age=u_time-r.z; if(age<0.0||age>3.0) continue; float d=distance(uv,r.xy);',
    '  s += sin(d*42.0 - age*15.0)*exp(-d*5.5)*exp(-age*2.0); } return s; }',
    'vec3 toLin(vec3 c){ return pow(c,vec3(2.2)); }',
    'vec3 toSRGB(vec3 c){ return pow(max(c,0.0),vec3(1.0/2.2)); }'
  ].join('\n');

  var VERT = 'attribute vec2 p; void main(){ gl_Position=vec4(p,0.0,1.0); }';

  // Palette (sRGB 0..1) — Pearloom tokens
  var PAL = [
    'vec3 CREAM=vec3(0.992,0.980,0.941);',
    'vec3 CREAMD=vec3(0.969,0.941,0.878);',
    'vec3 INK=vec3(0.094,0.094,0.106);',
    'vec3 INKW=vec3(0.082,0.067,0.043);',
    'vec3 OLIVE=vec3(0.361,0.420,0.247);',
    'vec3 OLIVED=vec3(0.212,0.247,0.133);',
    'vec3 GOLD=vec3(0.757,0.604,0.294);',
    'vec3 TERRA=vec3(0.776,0.439,0.239);',
    'vec3 LAV=vec3(0.420,0.353,0.549);',
    'vec3 SAGE=vec3(0.545,0.612,0.353);',
    'vec3 ROSE=vec3(0.851,0.659,0.620);'
  ].join('\n');

  // ── The five shaders. Each defines main(); uses helpers above. ──
  var SHADERS = {};

  // 1 · WOVEN SILK — the brand weave. Olive + gold threads over cream.
  SHADERS.silk = PAL + [
    'void main(){',
    ' vec2 asp=vec2(u_res.x/u_res.y,1.0);',
    ' vec2 uv=gl_FragCoord.xy/u_res; vec2 q=uv*asp; vec2 m=u_mouse*asp;',
    ' float md=distance(q,m);',
    ' q += normalize(q-m+1e-4)*0.03*exp(-md*3.5)*(0.6+u_down);',   // bulge near pointer
    ' q += 0.012*ripple(uv);',
    ' float freq=44.0; vec2 cell=q*freq; vec2 id=floor(cell); vec2 f=fract(cell);',
    ' float checker=mod(id.x+id.y,2.0);',
    ' float hor=smoothstep(0.5,0.06,abs(f.y-0.5)); float ver=smoothstep(0.5,0.06,abs(f.x-0.5));',
    ' float thread=mix(hor,ver,checker);',
    ' float round=mix(abs(f.y-0.5),abs(f.x-0.5),checker);',
    ' float sheen=0.5+0.5*sin((q.x+q.y)*freq*0.5+u_time*0.4);',
    ' vec3 tcol=mix(OLIVE,GOLD,step(1.5,mod(id.x+id.y*2.0,3.0)));',
    ' tcol*= (0.78+0.42*(1.0-round*1.6))*(0.85+0.3*sheen);',
    ' vec3 base=mix(CREAMD,CREAM,0.5+0.5*sin(uv.y*3.0));',
    ' if(u_dark>0.5){ base=mix(INKW,vec3(0.10,0.09,0.06),uv.y); tcol*=1.15; }',
    ' vec3 col=mix(base,tcol,thread);',
    ' float glow=exp(-md*2.6)*(0.12+0.5*u_down);',
    ' col += GOLD*glow*0.6;',
    ' col += GOLD*max(0.0,ripple(uv))*0.25;',
    ' col*=1.0-0.18*length(uv-0.5);',
    ' gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  // 2 · AURORA LINEN — soft warm flowing bands; pointer bends the flow.
  SHADERS.aurora = PAL + [
    'void main(){',
    ' vec2 asp=vec2(u_res.x/u_res.y,1.0); vec2 uv=gl_FragCoord.xy/u_res; vec2 q=uv*asp;',
    ' vec2 mo=(u_mouse-0.5);',
    ' q += mo*0.35 + 0.05*u_mvel;',
    ' float t=u_time*0.06;',
    ' float n=fbm(q*1.8+vec2(t,t*0.7));',
    ' float n2=fbm(q*3.1-vec2(t*0.8,t));',
    ' float bands=0.5+0.5*sin((q.y*2.6+n*2.6+t*1.4)*3.14159);',
    ' bands += 0.18*ripple(uv);',
    ' vec3 a=mix(CREAM,vec3(0.984,0.910,0.839),bands);',          // cream→peach
    ' a=mix(a,SAGE,smoothstep(0.3,0.9,n2)*0.45);',
    ' a=mix(a,GOLD,smoothstep(0.7,1.0,bands)*0.35);',
    ' if(u_dark>0.5){ a=mix(INKW,LAV*0.6+INKW,bands); a=mix(a,SAGE*0.5,smoothstep(0.3,0.9,n2)*0.4); a=mix(a,GOLD*0.7,smoothstep(0.75,1.0,bands)*0.4);} ',
    ' float md=distance(q,u_mouse*asp);',
    ' a += GOLD*exp(-md*3.0)*(0.10+0.45*u_down);',
    ' a*=1.0-0.16*length(uv-0.5);',
    ' gl_FragColor=vec4(a,1.0);',
    '}'
  ].join('\n');

  // 3 · STILL WATER — calm caustic ripples, lavender/sage. Memorials.
  SHADERS.water = PAL + [
    'void main(){',
    ' vec2 asp=vec2(u_res.x/u_res.y,1.0); vec2 uv=gl_FragCoord.xy/u_res; vec2 q=uv*asp; vec2 m=u_mouse*asp;',
    ' float md=distance(q,m);',
    ' float emit=sin(md*26.0-u_time*2.2)*exp(-md*3.2)*0.5;',       // gentle source at pointer
    ' float h=ripple(uv)*0.8 + emit*0.5;',
    ' float caustic=fbm(q*2.2+vec2(0.0,u_time*0.05)+h*0.4);',
    ' caustic=pow(0.5+0.5*sin((caustic*3.0+h*3.0)*3.14159),2.0);',
    ' vec3 deep=mix(INKW,vec3(0.16,0.15,0.20),uv.y);',             // warm midnight→lavender shadow
    ' vec3 lo=mix(deep,LAV*0.55,0.5);',
    ' vec3 col=mix(lo,mix(LAV,SAGE,0.4),caustic*0.8);',
    ' col += vec3(0.85,0.78,0.55)*pow(caustic,3.0)*0.25;',         // faint gold glint
    ' if(u_dark<0.5){ vec3 lcol=mix(CREAMD,vec3(0.81,0.78,0.86),caustic*0.7); lcol=mix(lcol,SAGE,caustic*0.15); col=lcol; col+=GOLD*pow(caustic,3.0)*0.12; }',
    ' col += (LAV+0.2)*max(0.0,h)*0.18;',
    ' col*=1.0-0.2*length(uv-0.5);',
    ' gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  // 4 · GILDED DUST — drifting gold motes on warm dark; pointer parallax + bloom.
  SHADERS.dust = PAL + [
    'float layer(vec2 q,float sc,float tw){',
    ' q*=sc; vec2 id=floor(q); vec2 f=fract(q)-0.5; float h=hash21(id);',
    ' vec2 off=(hash22(id)-0.5)*0.7; float d=length(f-off);',
    ' float tw2=0.5+0.5*sin(u_time*tw+h*6.2831);',
    ' return smoothstep(0.16,0.0,d)*tw2*step(0.45,h);',
    '}',
    'void main(){',
    ' vec2 asp=vec2(u_res.x/u_res.y,1.0); vec2 uv=gl_FragCoord.xy/u_res; vec2 q=uv*asp;',
    ' vec2 par=(u_mouse-0.5);',
    ' float m=0.0;',
    ' m+=layer(q+par*0.10+vec2(u_time*0.01,0.0),7.0,2.0)*0.6;',
    ' m+=layer(q+par*0.22+vec2(0.0,u_time*0.015),12.0,3.0)*0.9;',
    ' m+=layer(q+par*0.40-vec2(u_time*0.02,0.0),20.0,4.5)*1.2;',
    ' m+=max(0.0,ripple(uv))*1.2;',
    ' vec3 bg=mix(INKW,vec3(0.16,0.12,0.07),uv.y);',               // warm ember ground
    ' if(u_dark<0.5){ bg=mix(vec3(0.20,0.16,0.10),vec3(0.28,0.22,0.13),uv.y);} ',
    ' float md=distance(q,u_mouse*asp);',
    ' float halo=exp(-md*2.4)*(0.18+0.7*u_down);',
    ' vec3 col=bg + GOLD*m*(1.3+halo*2.0) + TERRA*m*0.3;',
    ' col += GOLD*halo*0.5;',
    ' col*=1.0-0.26*length(uv-0.5);',
    ' gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  // 5 · MARBLED PAPER — the craft-house signature; pointer stirs the ink.
  SHADERS.marble = PAL + [
    'void main(){',
    ' vec2 asp=vec2(u_res.x/u_res.y,1.0); vec2 uv=gl_FragCoord.xy/u_res; vec2 q=uv*asp*1.5;',
    ' q += (u_mouse-0.5)*0.5;',
    ' vec2 m=u_mouse*asp*1.5; vec2 rel=q-m;',
    ' float swirl=exp(-dot(rel,rel)*2.2)*(2.2+3.0*u_down);',        // stir near pointer
    ' float a=swirl + ripple(uv)*2.0; float c=cos(a),s=sin(a);',
    ' q=m+mat2(c,-s,s,c)*rel;',
    ' float t=u_time*0.03;',
    ' vec2 warp=vec2(fbm(q*1.3+t),fbm(q*1.3+vec2(5.2,1.3)-t));',
    ' float w=fbm(q*1.6+warp*1.6);',
    ' float veins=abs(sin(w*6.2831*2.5));',
    ' vec3 col=mix(CREAM,ROSE,smoothstep(0.25,0.65,w));',
    ' col=mix(col,SAGE,smoothstep(0.5,0.95,fbm(q*2.0-warp)));',
    ' col=mix(col,LAV*0.85+0.15,smoothstep(0.6,0.9,w)*0.5);',
    ' col=mix(col,GOLD,smoothstep(0.12,0.0,veins)*0.9);',          // thin gold veins
    ' if(u_dark>0.5){ col=mix(INKW,col*0.6+INKW*0.4,0.7); col=mix(col,GOLD*0.9,smoothstep(0.12,0.0,veins)*0.8);} ',
    ' col*=1.0-0.16*length(uv-0.5);',
    ' gl_FragColor=vec4(col,1.0);',
    '}'
  ].join('\n');

  var UNIFORMS = ['u_res', 'u_time', 'u_mouse', 'u_mvel', 'u_down', 'u_rip', 'u_dark'];

  // ── WebGL plumbing ──
  function compile(gl, type, src){
    var s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){ console.error('shader error:', gl.getShaderInfoLog(s), '\n', src); gl.deleteShader(s); return null; }
    return s;
  }
  function program(gl, frag){
    var vs=compile(gl,gl.VERTEX_SHADER,VERT); var fs=compile(gl,gl.FRAGMENT_SHADER,HEAD+'\n'+frag);
    if(!vs||!fs) return null;
    var p=gl.createProgram(); gl.attachShader(p,vs); gl.attachShader(p,fs); gl.linkProgram(p);
    // Shaders can be flagged for deletion now; they die with the program.
    gl.deleteShader(vs); gl.deleteShader(fs);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)){ console.error('link error:', gl.getProgramInfoLog(p)); gl.deleteProgram(p); return null; }
    return p;
  }

  function Wallpaper(canvas){
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if(!gl){ console.error('WebGL unavailable'); return null; }
    var buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);

    // Programs compile lazily — a published site uses exactly one of
    // the five, and eager compile is main-thread jank at page load.
    // Cache {prog, aPos, u:{name:loc}} per key; null = failed compile.
    var progs={};
    function build(k){
      if(k in progs) return progs[k];
      if(!SHADERS[k]){ progs[k]=null; return null; }
      var p=program(gl,SHADERS[k]);
      if(!p){ progs[k]=null; return null; }
      var entry={ prog:p, aPos:gl.getAttribLocation(p,'p'), u:{} };
      for(var i=0;i<UNIFORMS.length;i++) entry.u[UNIFORMS[i]]=gl.getUniformLocation(p,UNIFORMS[i]);
      progs[k]=entry;
      return entry;
    }

    var current='silk';
    var mouse=[0.5,0.6], target=[0.5,0.6], vel=[0,0], down=0, downT=0;
    var rips=[], maxR=6; for(var i=0;i<maxR;i++) rips.push([0,0,-1]);
    var ripHead=0;
    var ripFlat=new Float32Array(maxR*3);
    var t0=performance.now();
    var lastRipT=-1e9;           // engine-seconds of the newest tap
    var lastActive=t0;           // wall-clock ms of last pointer activity
    var lastDraw=0;
    var lost=false, destroyed=false;

    // Reduced motion = a still frame, not a slower loop (BRAND §6).
    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var reduce = !!(mq && mq.matches);
    function onMotionPref(){ reduce = !!(mq && mq.matches); if(reduce) stop(); else start(); poke(); }
    if(mq && mq.addEventListener) mq.addEventListener('change', onMotionPref);

    // data-theme is read once and watched — not queried per frame.
    var dark = document.documentElement.getAttribute('data-theme')==='dark' ? 1 : 0;
    var themeObserver = new MutationObserver(function(){
      var d = document.documentElement.getAttribute('data-theme')==='dark' ? 1 : 0;
      if(d!==dark){ dark=d; poke(); }
    });
    themeObserver.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });

    function resize(){
      var dpr=Math.min(window.devicePixelRatio||1, 2);   // re-read: zoom / monitor moves
      var w=canvas.clientWidth, h=canvas.clientHeight;
      canvas.width=Math.max(1,Math.floor(w*dpr)); canvas.height=Math.max(1,Math.floor(h*dpr));
      gl.viewport(0,0,canvas.width,canvas.height);
    }
    window.addEventListener('resize', resize);
    // Non-fixed mounts (framed previews) resize with their container,
    // not the window. RO also covers window resizes, but the listener
    // above stays as the no-RO fallback.
    var ro = typeof ResizeObserver!=='undefined' ? new ResizeObserver(function(){ resize(); poke(); }) : null;
    if(ro) ro.observe(canvas);

    // Pointer input lives on window: the canvas renders BEHIND the site
    // content (which hit-tests everywhere), so canvas-level listeners
    // would never fire on a real site — and this way we never need
    // touch-action hacks that could eat scrolling.
    function setPointer(cx,cy){
      var r=canvas.getBoundingClientRect();
      if(r.width<1||r.height<1) return;
      target[0]=(cx-r.left)/r.width;
      target[1]=1.0-(cy-r.top)/r.height;
      lastActive=performance.now();
    }
    var onMove=function(e){ setPointer(e.clientX,e.clientY); };
    var onDown=function(e){
      setPointer(e.clientX,e.clientY); down=1; downT=performance.now();
      var r=canvas.getBoundingClientRect();
      if(r.width<1||r.height<1) return;
      lastRipT=(performance.now()-t0)/1000;
      rips[ripHead]=[(e.clientX-r.left)/r.width, 1.0-(e.clientY-r.top)/r.height, lastRipT];
      ripHead=(ripHead+1)%maxR;
      poke();
    };
    var onUp=function(){ down=0; lastActive=performance.now(); };
    window.addEventListener('pointermove', onMove, { passive:true });
    window.addEventListener('pointerdown', onDown, { passive:true });
    window.addEventListener('pointerup', onUp, { passive:true });

    function frame(now){
      if(lost) return;
      var time=(now-t0)/1000;
      // smooth pointer
      var sm=0.12;
      var nx=mouse[0]+(target[0]-mouse[0])*sm, ny=mouse[1]+(target[1]-mouse[1])*sm;
      vel[0]=(nx-mouse[0]); vel[1]=(ny-mouse[1]); mouse[0]=nx; mouse[1]=ny;
      var downAmt=down?1:Math.max(0,1-(now-downT)/450);
      var p=build(current); if(p){
        gl.useProgram(p.prog);
        gl.enableVertexAttribArray(p.aPos);
        gl.bindBuffer(gl.ARRAY_BUFFER,buf); gl.vertexAttribPointer(p.aPos,2,gl.FLOAT,false,0,0);
        gl.uniform2f(p.u.u_res,canvas.width,canvas.height);
        gl.uniform1f(p.u.u_time,time);
        gl.uniform2f(p.u.u_mouse,mouse[0],mouse[1]);
        gl.uniform2f(p.u.u_mvel,vel[0]*60,vel[1]*60);
        gl.uniform1f(p.u.u_down,downAmt);
        gl.uniform1f(p.u.u_dark,dark);
        for(var i=0;i<maxR;i++){ ripFlat[i*3]=rips[i][0]; ripFlat[i*3+1]=rips[i][1]; ripFlat[i*3+2]=rips[i][2]; }
        gl.uniform3fv(p.u.u_rip,ripFlat);
        gl.drawArrays(gl.TRIANGLES,0,3);
      }
      lastDraw=now;
    }
    var raf=0;
    function loop(now){
      raf=requestAnimationFrame(loop);
      // Ambient throttle: full rate while the guest interacts (pointer
      // in the last 2s, press, or a live ripple <3s old); half rate
      // for the slow ambient drift after that. Saves real battery on
      // a site left open, invisibly for slow-moving shaders.
      var engaged = down===1 || (now-lastActive)<2000 || ((now-t0)/1000-lastRipT)<3.0;
      if(!engaged && (now-lastDraw)<28) return;
      frame(now);
    }
    function start(){ if(!raf && !reduce && !lost && !destroyed) raf=requestAnimationFrame(loop); }
    function stop(){ if(raf){ cancelAnimationFrame(raf); raf=0; } }

    // A dead context throws no errors, it just eats GL calls forever —
    // stop the loop instead (iOS reclaims contexts under memory
    // pressure), and pick back up if the browser restores it.
    var onLost=function(e){ e.preventDefault(); lost=true; stop(); };
    var onRestored=function(){
      lost=false; progs={};
      buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      resize(); poke(); start();
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    // Immediate first paint (guaranteed frame even if rAF is
    // throttled), then animate — unless reduced motion asked us not to.
    resize(); frame(performance.now()); start();

    // Repaint once, outside the loop — reduced-motion still frames and
    // pointer nudges between rAF ticks both come through here.
    function poke(){ if(!destroyed) frame(performance.now()); }

    // destroy() — React-safe teardown (the showcase/editor remount on
    // background change + route nav). Stops the loop, removes every
    // listener/observer, and releases the GL resources + context so
    // remounts can't accumulate live contexts.
    function destroy(){
      if(destroyed) return;
      destroyed=true;
      stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      if(ro) ro.disconnect();
      themeObserver.disconnect();
      if(mq && mq.removeEventListener) mq.removeEventListener('change', onMotionPref);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      try{
        Object.keys(progs).forEach(function(k){ if(progs[k]) gl.deleteProgram(progs[k].prog); });
        gl.deleteBuffer(buf);
        var ext=gl.getExtension('WEBGL_lose_context');
        if(ext) ext.loseContext();
      }catch(e){ /* context already gone */ }
    }
    return { set:function(k){ if(SHADERS[k]){ current=k; poke(); } }, get:function(){ return current; }, resize:function(){ resize(); poke(); }, poke:poke, destroy:destroy };
  }

  window.PearloomWallpaper = Wallpaper;
})();
