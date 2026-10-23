/* WallBliss launch reveal — used only for recording the launch video.
   Turned on/off per browser by the small snippet in index.html <head>:
     wallbliss.in/?launch=on   → plays on every homepage load in this browser
     wallbliss.in/?launch=off  → back to normal
   Customers and search engines never see it. Safe to delete after the launch. */
(function () {
  'use strict';
  var CSS = `
  .wbl { position: fixed; inset: 0; z-index: 2147483000; container-type: inline-size; pointer-events: none; }
  .wbl-wall {
    position: absolute; inset: 0; pointer-events: auto;
    display: grid; place-items: center; padding: 24px;
    background:
      radial-gradient(60% 55% at 50% 42%, #FFFDF9 0%, rgba(255,253,249,0) 70%),
      radial-gradient(120% 90% at 50% 120%, #EFE5D6 0%, rgba(239,229,214,0) 60%),
      var(--bg);
    transition: transform .95s cubic-bezier(.76,0,.24,1);
    will-change: transform;
  }
  .wbl-wall::after { /* soft painted-wall grain */
    content: ""; position: absolute; inset: 0; opacity: .35; pointer-events: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .35  0 0 0 .18 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  }
  .wbl.lift .wbl-wall { transform: translateY(-104%); }
  .wbl-wall .wbl-edge { /* a little shadow on the wall's bottom edge as it lifts */
    position: absolute; left: 0; right: 0; bottom: -28px; height: 28px;
    background: linear-gradient(rgba(70,45,20,.18), rgba(70,45,20,0));
  }
  .wbl-inner { position: relative; z-index: 1; text-align: center; max-width: 980px; transition: transform .95s cubic-bezier(.76,0,.24,1), opacity .5s; }
  .wbl.lift .wbl-inner { transform: translateY(-60px); opacity: 0; }

  .wbl-logo { position: relative; width: clamp(92px, 13cqw, 150px); margin: 0 auto clamp(18px, 2.6cqw, 30px); opacity: 0; transform: scale(.6); filter: blur(6px); transition: all .7s cubic-bezier(.16,1,.3,1); }
  .wbl-logo img { width: 100%; display: block; position: relative; }
  .wbl-logo::before { /* paint splash behind the logo */
    content: ""; position: absolute; inset: -38%; z-index: -1; border-radius: 47% 53% 42% 58% / 55% 41% 59% 45%;
    background: radial-gradient(circle at 42% 42%, rgba(76,175,122,.22), rgba(34,166,216,.14) 50%, rgba(34,166,216,0) 70%); filter: blur(6px);
    transform: scale(0); transition: transform .9s cubic-bezier(.16,1,.3,1) .1s;
  }
  .wbl.s1 .wbl-logo { opacity: 1; transform: none; filter: none; }
  .wbl.s1 .wbl-logo::before { transform: scale(1) rotate(12deg); }

  .wbl h1 { margin: 0; font: 800 clamp(30px, 6.4cqw, 78px)/1.06 var(--font-display); letter-spacing: -.02em; color: var(--ink); text-wrap: balance; }
  .wbl h1 .w { display: inline-block; opacity: 0; transform: translateY(.45em); transition: opacity .5s, transform .7s cubic-bezier(.16,1,.3,1); }
  .wbl.s2 h1 .w { opacity: 1; transform: none; }
  @container (max-width: 600px) { .wbl h1 { font-size: 9.6cqw; } .wbl-logo { width: 26cqw; } .wbl-live { font-size: 6.4cqw; } }
  .wbl h1 em { font-style: italic; color: var(--accent); position: relative; white-space: nowrap; }
  .wbl h1 em svg { position: absolute; left: -4%; bottom: -.12em; width: 108%; height: .42em; z-index: -1; overflow: visible; }
  .wbl h1 em path { stroke: #E9A23B; stroke-width: 14; stroke-linecap: round; fill: none; opacity: .55; stroke-dasharray: 420; stroke-dashoffset: 420; transition: stroke-dashoffset .7s cubic-bezier(.65,0,.35,1); }
  .wbl.s3 h1 em path { stroke-dashoffset: 0; }

  .wbl-live { display: inline-flex; align-items: center; gap: .55em; margin-top: clamp(24px, 3.4cqw, 40px); padding: .55em 1.1em .55em .8em; border-radius: 999px; background: var(--accent); color: #fff; font: 700 clamp(22px, 3.3cqw, 42px)/1 var(--font-body); letter-spacing: -.01em; box-shadow: 0 0 0 6px rgba(15,107,110,.12), 0 18px 40px -12px rgba(15,107,110,.7); opacity: 0; transform: translateY(18px) scale(.6); transition: opacity .4s, transform .75s cubic-bezier(.34,1.7,.5,1); }
  .wbl-live i { flex: none; width: .42em; height: .42em; border-radius: 50%; background: #7CE0A3; box-shadow: 0 0 0 0 rgba(124,224,163,.7); animation: wblPulse 1.2s infinite; }
  .wbl-live b { font-weight: 700; color: #FFE3B0; }
  .wbl-live u { text-decoration: none; font-weight: 800; letter-spacing: .06em; }
  .wbl.s3 .wbl-live { opacity: 1; transform: none; }
  @keyframes wblPulse { 70% { box-shadow: 0 0 0 .5em rgba(124,224,163,0); } 100% { box-shadow: 0 0 0 0 rgba(124,224,163,0); } }

  .wbl-skip { position: absolute; top: 16px; right: 16px; z-index: 2; font: 500 13px var(--font-body); color: var(--muted); background: rgba(255,253,249,.7); border: 1px solid rgba(70,45,20,.12); border-radius: 999px; padding: 7px 14px; cursor: pointer; }
  .wbl-skip:hover { color: var(--ink); }
  .wbl canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }

  @media (prefers-reduced-motion: reduce) {
    .wbl-wall, .wbl-inner, .wbl-logo, .wbl h1 .w, .wbl-live { transition-duration: .01s !important; }
    .wbl.lift .wbl-wall { transform: none; opacity: 0; transition: opacity .4s !important; }
  }
`;

function wbLaunch(stage, onDone) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.createElement('div');
  root.className = 'wbl';
  root.innerHTML = `
    <div class="wbl-wall" role="dialog" aria-label="WallBliss is live">
      <button class="wbl-skip" type="button">Skip</button>
      <div class="wbl-inner">
        <div class="wbl-logo"><img src="assets/img/logo.png" alt="WallBliss Studio"></div>
        <h1>${'Bengaluru, your walls just got a'.split(' ').map(w => `<span class="w">${w}</span>`).join(' ')}
          <span class="w"><em>new home.<svg viewBox="0 0 300 30" preserveAspectRatio="none"><path d="M6 20 C 70 8, 150 6, 294 16"/></svg></em></span></h1>
        <div class="wbl-live"><i></i><span><b>wallbliss.in</b> is now <u>LIVE</u></span></div>
      </div>
      <div class="wbl-edge"></div>
      <canvas></canvas>
    </div>`;
  document.body.appendChild(root);

  const words = root.querySelectorAll('h1 .w');
  words.forEach((w, i) => w.style.transitionDelay = (i * 65) + 'ms');

  /* ---- paint-drop confetti ---- */
  const cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
  const COLORS = ['#0F6B6E', '#E9A23B', '#4CAF7A', '#22A6D8', '#0B5C8A', '#E0603F', '#C2417A', '#F2C14E'];
  let W, H, dpr, parts = [], raf, last = 0, alive = true;
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); addEventListener('resize', size);
  const rnd = (a, b) => a + Math.random() * (b - a);
  function burst(x, y, angle, spread, count, speed) {
    const k = Math.max(.7, Math.min(Math.max(W, H), 1400) / 1100);
    for (let i = 0; i < count; i++) {
      const a = (angle + rnd(-spread, spread)) * Math.PI / 180, v = rnd(.55, 1) * speed * k;
      const r = Math.random();
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        shape: r < .45 ? 'drop' : r < .7 ? 'splat' : 'strip',
        s: rnd(5, 11) * Math.min(1.25, k), c: COLORS[(Math.random() * COLORS.length) | 0],
        rot: rnd(0, 6.28), vr: rnd(-8, 8), wob: rnd(0, 6.28), life: 0 });
    }
  }
  function rain(n) { for (let i = 0; i < n; i++) burst(rnd(0, W), rnd(-80, -10), 90, 25, 1, rnd(80, 260)); }
  function drawDrop(p) { // teardrop pointing along its fall
    const ang = Math.atan2(p.vy, p.vx) - Math.PI / 2, s = p.s;
    ctx.rotate(ang);
    ctx.beginPath(); ctx.moveTo(0, -s * 1.9);
    ctx.bezierCurveTo(s * .9, -s * .4, s, s * .9, 0, s);
    ctx.bezierCurveTo(-s, s * .9, -s * .9, -s * .4, 0, -s * 1.9);
    ctx.fill();
    ctx.globalAlpha *= .45; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-s * .35, s * .05, s * .18, s * .32, .3, 0, 6.28); ctx.fill();
  }
  function drawSplat(p) {
    const s = p.s * .75; ctx.rotate(p.rot);
    ctx.beginPath(); ctx.arc(0, 0, s, 0, 6.28); ctx.fill();
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + p.wob, d = s * 1.55; ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, s * (.22 + (i % 2) * .14), 0, 6.28); ctx.fill(); }
  }
  function drawStrip(p) {
    ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.wob)); // paper flutter
    const w = p.s * .7, h = p.s * 2; ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w / 2); ctx.fill();
  }
  function tick(t) {
    if (!last) last = t; const dt = Math.min(.033, (t - last) / 1000); last = t;
    ctx.clearRect(0, 0, W, H);
    parts = parts.filter(p => p.y < H + 40 && p.life < 6);
    for (const p of parts) {
      p.life += dt; p.vy += 900 * dt; p.vx *= Math.pow(.32, dt); p.vy *= Math.pow(.55, dt);
      if (p.shape === 'strip') p.vx += Math.sin(p.wob) * 30 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.wob += 9 * dt;
      ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = p.c; ctx.globalAlpha = Math.min(1, (6 - p.life) / 1.2);
      p.shape === 'drop' ? drawDrop(p) : p.shape === 'splat' ? drawSplat(p) : drawStrip(p);
      ctx.restore();
    }
    if (alive || parts.length) raf = requestAnimationFrame(tick); else finish();
  }

  /* ---- timeline (ms) ---- */
  const T = [], at = (ms, fn) => T.push(setTimeout(fn, ms));
  at(120, () => root.classList.add('s1'));
  at(560, () => root.classList.add('s2'));
  if (!reduce) {
    raf = requestAnimationFrame(tick);
    at(380, () => { const tall = H > W, a = tall ? 80 : 62; burst(-10, H + 10, -a, 12, 90, 1500); burst(W + 10, H + 10, -180 + a, 12, 90, 1500); if (tall) rain(30); });
    at(1650, () => { burst(W / 2, H * .62, -90, 70, 50, 900); rain(40); });
  }
  at(1500, () => root.classList.add('s3'));
  at(4400, lift);

  let lifted = false;
  function lift() {
    if (lifted) return; lifted = true;
    T.forEach(clearTimeout);
    root.classList.add('s1', 's2', 's3', 'lift');
    setTimeout(() => { alive = false; finish(); }, 1000);
  }
  function finish() {
    if (!root.isConnected) return;
    cancelAnimationFrame(raf); removeEventListener('resize', size); root.remove(); onDone && onDone();
  }
  root.querySelector('.wbl-skip').addEventListener('click', lift);
  addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { lift(); removeEventListener('keydown', esc); } });
}


  function start() {
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var html = document.documentElement, prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden'; scrollTo(0, 0);
    wbLaunch(null, function () { html.style.overflow = prevOverflow; });
    requestAnimationFrame(function () { html.classList.remove('wb-launching'); });
  }
  function whenReady() {
    var fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    var timeout = new Promise(function (r) { setTimeout(r, 1500); });
    Promise.race([fonts, timeout]).then(function () { setTimeout(start, 150); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', whenReady); else whenReady();
})();
