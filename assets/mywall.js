/* "My Wall": customers try designs on a photo of their own wall (catalogue).
   - Full-screen studio: the wall photo fills the screen (whole photo visible); drag to move, pinch / corner-drag / wheel to resize;
     a strip swaps designs in at the same spot and size; swipe across the photo for the next one.
   - The photo is kept on this phone only (IndexedDB, 30 days). Nothing is uploaded unless the customer sends it.
   - "My wall view": every catalogue preview drawn on their wall.
   - Send: step 1 opens our WhatsApp chat with the text; step 2 shares the picture (wall + design) through the phone's share sheet.
   - Nudges: big "See it on your wall" button, one-time card after 2 designs, heart → "See on your wall", sticky bar,
     returning-visitor note, #mywall link. At most one pop-up nudge per visit; nudges stop once it's been used. */
(function () {
  var WB = window.WB = window.WB || {};
  var DAY = 864e5, KEEP = 30 * DAY;
  var cfg = null, wall = null, photo = null, place = { x: 0.5, y: 0.42, w: 0.5 };
  var dlg, cv, ctx, cur = null, order = [], art = {}, sendSheet, nudgeSheet;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ss(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || "null"); sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function track(n, p) { if (WB.track) WB.track(n, p || {}); }
  function used() { return !!ls("wb_mw_used"); }

  /* ---------- the photo, kept on this device ---------- */
  var DB = null;
  function db() {
    if (DB) return DB;
    DB = new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error("no idb"));
      var r = indexedDB.open("wb_mywall", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("kv"); };
      r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
    });
    return DB;
  }
  function idb(mode, fn) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction("kv", mode), s = t.objectStore("kv"), q = fn(s); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; }); }); }
  function saveWall() { if (!wall) return; wall.place = place; idb("readwrite", function (s) { return s.put(wall, "wall"); }).catch(function () {}); }
  function loadWall() {
    return idb("readonly", function (s) { return s.get("wall"); }).then(function (w) {
      if (!w || !w.data || Date.now() - (w.at || 0) > KEEP) return null;
      return new Promise(function (res) { var im = new Image(); im.onload = function () { wall = w; photo = im; if (w.place) place = w.place; res(true); }; im.onerror = function () { res(null); }; im.src = w.data; });
    }).catch(function () { return null; });
  }
  function takePhoto(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var s = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        var data = c.toDataURL("image/jpeg", 0.86), p = new Image();
        p.onload = function () {
          photo = p; place = { x: 0.5, y: 0.42, w: p.width >= p.height ? 0.5 : 0.7 };
          wall = { data: data, at: Date.now(), size: (wall && wall.size) || null, place: place };
          saveWall(); ls("wb_mw_used", 1); track("mywall_photo", {}); res();
        };
        p.src = data;
      };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error("That photo couldn't be opened. Try another one.")); };
      im.src = url;
    });
  }
  function pickPhoto() {
    var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
    inp.onchange = function () {
      var f = inp.files && inp.files[0]; if (!f) return;
      takePhoto(f).then(function () { paintStrip(); if (cur) swap(cur.code, "photo"); refreshPage(); stickyBar(); turnHint(); }).catch(function (e) { WB.notify(e.message, { type: "error" }); });
    };
    inp.click();
  }

  /* ---------- design pictures ---------- */
  function artFor(d, small) {
    var key = d.code + (small ? "s" : "");
    if (art[key]) return art[key];
    var src = small && WB.thumb ? WB.thumb(d) : d.img;
    art[key] = new Promise(function (res) {
      if (!src) { var c = document.createElement("canvas"); c.width = 600; c.height = d.orient === "tall" ? 800 : d.orient === "square" ? 600 : 400; if (window.WBArt) WBArt.draw(c, d, { w: c.width, h: c.height }); return res(c); }
      var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { if (small && d.img) { im.onerror = function () { res(null); }; im.src = d.img; } else res(null); }; im.src = src;
    });
    return art[key];
  }
  function ratio(a) { return a ? (a.naturalWidth || a.width) / (a.naturalHeight || a.height) : 1.5; }
  /* the design on the wall: multiply lets the wall's light and texture show through, a light normal pass keeps colours true */
  function paintArt(x, a, r) {
    x.save(); x.globalCompositeOperation = "multiply"; x.globalAlpha = .96; x.drawImage(a, r.x, r.y, r.w, r.h); x.restore();
    x.save(); x.globalAlpha = .18; x.drawImage(a, r.x, r.y, r.w, r.h); x.restore();
  }

  /* ---------- the studio ---------- */
  function build() {
    dlg = document.createElement("dialog"); dlg.className = "mw"; dlg.setAttribute("aria-label", "See designs on your wall");
    dlg.innerHTML =
      '<div class="mw-in"><div class="mw-stage"><canvas></canvas>' +
        '<div class="mw-empty" hidden><div><h2>See it on your wall</h2><p>Take a photo of your wall, straight on, the whole wall in the frame. It stays on your phone.</p>' +
          '<button type="button" class="btn btn-primary" data-mw="photo">📷 Take or choose a photo</button></div></div>' +
        '<div class="mw-top"><button type="button" class="mw-b" data-mw="close" aria-label="Close">✕</button><span class="mw-grow"></span>' +
          '<button type="button" class="mw-b" data-mw="size">Wall size</button><button type="button" class="mw-b" data-mw="photo">📷 New photo</button></div>' +
        '<span class="mw-tag" hidden></span><p class="mw-tip" hidden>Drag to move · pinch or drag a corner to resize</p></div>' +
      '<div class="mw-panel"><div class="mw-lbl"><b></b><small></small></div><div class="mw-strip" role="listbox" aria-label="Designs"></div>' +
        '<div class="mw-acts"><button type="button" class="mw-btn mw-ghost" data-mw="heart">♡ Save</button><button type="button" class="mw-btn mw-wa" data-mw="love">Love it? Get price</button></div></div></div>' +
      '<form class="mw-size" hidden><b>Your wall size</b><div><label>Width <input type="number" inputmode="decimal" min="1" max="200" name="w"> ft</label><label>Height <input type="number" inputmode="decimal" min="1" max="30" name="h"> ft</label></div>' +
        '<small>We use it to show the design\'s size. Assumes the photo shows the full wall width.</small><button type="submit" class="btn btn-primary btn-sm">Done</button></form>';
    document.body.appendChild(dlg);
    cv = dlg.querySelector("canvas"); ctx = cv.getContext("2d");
    dlg.addEventListener("click", function (e) {
      var b = e.target.closest("[data-mw]"); if (!b) return;
      var k = b.dataset.mw;
      if (k === "close") close();
      else if (k === "photo") pickPhoto();
      else if (k === "heart") heart();
      else if (k === "love") love();
      else if (k === "size") sizeForm(true);
    });
    dlg.querySelector(".mw-strip").addEventListener("click", function (e) { var b = e.target.closest("[data-code]"); if (b) swap(b.dataset.code, "strip"); });
    dlg.addEventListener("close", function () { document.documentElement.classList.remove("mw-open"); saveWall(); if (cfg.onClose) cfg.onClose(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { step(1); e.preventDefault(); } else if (e.key === "ArrowLeft") { step(-1); e.preventDefault(); }
    });
    var f = dlg.querySelector(".mw-size");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var w = parseFloat(f.w.value) || 0, h = parseFloat(f.h.value) || 0;
      if (wall) { wall.size = w && h ? { w: w, h: h } : null; saveWall(); }
      sizeForm(false); draw(); track("mywall_size", { w: w, h: h });
    });
    addEventListener("resize", function () { if (dlg.open) draw(); });
    wireTouch();
  }
  function sizeForm(on) {
    var f = dlg.querySelector(".mw-size"); f.hidden = !on;
    if (on) { var s = (wall && wall.size) || {}; f.w.value = s.w || ""; f.h.value = s.h || ""; f.w.focus(); }
  }
  function close() { if (dlg.close) dlg.close(); else { dlg.removeAttribute("open"); dlg.dispatchEvent(new Event("close")); } }

  function stageRect() {                          // whole photo visible, as large as the screen allows
    var r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    var W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    if (!photo) return null;
    var s = Math.min(W / photo.width, H / photo.height), w = photo.width * s, h = photo.height * s;
    return { x: (W - w) / 2, y: (H - h) / 2, w: w, h: h, dpr: dpr };
  }
  function designRect(pr, a) {
    var w = place.w * pr.w, h = w / ratio(a);
    return { x: pr.x + place.x * pr.w - w / 2, y: pr.y + place.y * pr.h - h / 2, w: w, h: h };
  }
  var curArt = null;
  function draw() {
    if (!dlg || !dlg.open) return;
    var pr = stageRect(); dlg.querySelector(".mw-empty").hidden = !!photo;
    ctx.clearRect(0, 0, cv.width, cv.height);
    var tag = dlg.querySelector(".mw-tag");
    if (!pr) { tag.hidden = true; return; }
    ctx.drawImage(photo, pr.x, pr.y, pr.w, pr.h);
    if (!curArt) { tag.hidden = true; return; }
    var r = designRect(pr, curArt); paintArt(ctx, curArt, r);
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = 2 * pr.dpr; ctx.strokeRect(r.x, r.y, r.w, r.h);
    [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(function (p) {
      ctx.beginPath(); ctx.arc(p[0], p[1], 8 * pr.dpr, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.lineWidth = 2.5 * pr.dpr; ctx.strokeStyle = "#0F6B6E"; ctx.stroke();
    });
    ctx.restore();
    var s = wall && wall.size;
    if (s && s.w) {
      var fw = place.w * s.w, fh = fw / ratio(curArt);
      tag.textContent = "≈ " + fmt(fw) + " × " + fmt(fh) + " ft on your " + fmt(s.w) + " ft wall";
      tag.style.left = (r.x / pr.dpr) + "px"; tag.style.top = Math.min((r.y + r.h) / pr.dpr + 10, cv.clientHeight - 34) + "px"; tag.hidden = false;
    } else tag.hidden = true;
  }
  /* a wide wall on an upright phone: suggest turning it sideways for a bigger view (once) */
  function turnHint() {
    if (!photo || photo.width < photo.height * 1.15 || innerWidth > innerHeight * 0.9 || ls("wb_mw_turned")) return;
    var t = dlg.querySelector(".mw-tip"); t.textContent = "Turn your phone sideways for a bigger view ⟲"; t.hidden = false;
    var done = function () { if (innerWidth > innerHeight) { ls("wb_mw_turned", 1); t.hidden = true; t.textContent = "Drag to move · pinch or drag a corner to resize"; removeEventListener("resize", done); } };
    addEventListener("resize", done);
  }
  function fmt(n) { return n >= 10 ? Math.round(n) : Math.round(n * 2) / 2; }

  /* ---------- touch: move, pinch, corner resize, swipe to the next design ---------- */
  function wireTouch() {
    var pts = {}, mode = null, start = null;
    function loc(e) { var b = cv.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2); return { x: (e.clientX - b.left) * d, y: (e.clientY - b.top) * d }; }
    function hit(p) {
      var pr = stageRect(); if (!pr || !curArt) return null;
      var r = designRect(pr, curArt), k = 26 * pr.dpr;
      var cs = [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]];
      for (var i = 0; i < 4; i++) if (Math.abs(p.x - cs[i][0]) < k && Math.abs(p.y - cs[i][1]) < k) return { m: "corner", pr: pr, r: r };
      if (p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h) return { m: "move", pr: pr, r: r };
      return { m: "swipe", pr: pr, r: r };
    }
    cv.addEventListener("pointerdown", function (e) {
      if (!photo) return;
      pts[e.pointerId] = loc(e); cv.setPointerCapture(e.pointerId);
      var ids = Object.keys(pts);
      if (ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        mode = "pinch"; start = { d: Math.hypot(a.x - b.x, a.y - b.y), w: place.w };
      } else if (ids.length === 1) {
        var h = hit(pts[e.pointerId]); if (!h) return;
        mode = h.m; var cx = h.r.x + h.r.w / 2, cy = h.r.y + h.r.h / 2, p = pts[e.pointerId];
        start = { p: p, place: { x: place.x, y: place.y, w: place.w }, pr: h.pr, c: { x: cx, y: cy }, d: Math.hypot(p.x - cx, p.y - cy) };
        hideTip();
      }
    });
    cv.addEventListener("pointermove", function (e) {
      if (!pts[e.pointerId] || !mode) return;
      pts[e.pointerId] = loc(e); var p = pts[e.pointerId];
      if (mode === "pinch") {
        var ids = Object.keys(pts); if (ids.length < 2) return;
        var a = pts[ids[0]], b = pts[ids[1]];
        place.w = clampW(start.w * Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, start.d));
      } else if (mode === "move") {
        place.x = Math.min(1, Math.max(0, start.place.x + (p.x - start.p.x) / start.pr.w));
        place.y = Math.min(1, Math.max(0, start.place.y + (p.y - start.p.y) / start.pr.h));
      } else if (mode === "corner") {
        place.w = clampW(start.place.w * Math.hypot(p.x - start.c.x, p.y - start.c.y) / Math.max(1, start.d));
      } else return;
      draw();
    });
    function up(e) {
      var p = pts[e.pointerId]; delete pts[e.pointerId];
      if (mode === "swipe" && p && start) {
        var dx = p.x - start.p.x, dy = p.y - start.p.y, dpr = start.pr.dpr;
        if (Math.abs(dx) > 50 * dpr && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1, "swipe");
      }
      if (mode && mode !== "swipe") saveWall();
      if (!Object.keys(pts).length) mode = null;
    }
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", function (e) { if (!photo) return; e.preventDefault(); place.w = clampW(place.w * (e.deltaY < 0 ? 1.06 : 0.94)); draw(); saveWall(); }, { passive: false });
  }
  function clampW(w) { return Math.min(1, Math.max(0.08, w)); }
  function hideTip() { var t = dlg.querySelector(".mw-tip"); if (!t.hidden) { t.hidden = true; ls("wb_mw_tip", 1); } }

  /* ---------- designs: strip order = this one, hearts, then designs that suit the wall's shape ---------- */
  function makeOrder(first) {
    var all = cfg.designs(), hearts = WB.shortlist ? WB.shortlist.all() : [];
    var wide = !photo || photo.width >= photo.height;
    function fit(d) { return d.orient === "square" || (wide ? d.orient !== "tall" : d.orient === "tall"); }
    var seen = {}, out = [];
    function add(d) { if (d && !seen[d.code]) { seen[d.code] = 1; out.push(d); } }
    add(cfg.byCode[first]);
    hearts.forEach(function (c) { add(cfg.byCode[c]); });
    all.filter(fit).forEach(add); all.forEach(add);
    return out;
  }
  function paintStrip() {
    order = makeOrder(cur && cur.code);
    var box = dlg.querySelector(".mw-strip"), hearts = WB.shortlist ? WB.shortlist.all() : [];
    box.innerHTML = order.map(function (d) {
      var t = WB.thumb ? WB.thumb(d) : d.img;
      return '<button type="button" role="option" class="mw-th' + (cur && d.code === cur.code ? " on" : "") + '" data-code="' + d.code + '" aria-label="' + esc(d.name) + '" aria-selected="' + (cur && d.code === cur.code) + '">' +
        (t ? '<img src="' + esc(t) + '" alt="" loading="lazy">' : '<span>' + d.code + '</span>') + (hearts.indexOf(d.code) > -1 ? '<i>♥</i>' : "") + '</button>';
    }).join("");
    label();
  }
  function label() {
    var tried = ss("wb_mw_tried") || [];
    dlg.querySelector(".mw-lbl b").textContent = cur ? cur.name : "";
    dlg.querySelector(".mw-lbl small").textContent = tried.length + " of " + order.length + " tried · swipe ↔";
    var on = cur && WB.shortlist && WB.shortlist.has(cur.code);
    var hb = dlg.querySelector("[data-mw=heart]"); hb.textContent = on ? "♥ Saved" : "♡ Save"; hb.setAttribute("aria-pressed", !!on);
    dlg.querySelectorAll(".mw-th").forEach(function (b) { var is = cur && b.dataset.code === cur.code; b.classList.toggle("on", is); b.setAttribute("aria-selected", is); });
  }
  function swap(code, via) {
    var d = cfg.byCode[code]; if (!d) return;
    cur = d; curArt = null; label(); draw();
    var on = dlg.querySelector('.mw-th[data-code="' + code + '"]'); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    artFor(d).then(function (a) { if (cur !== d) return; curArt = a; draw(); });
    if (photo) {
      var tried = ss("wb_mw_tried") || [];
      if (tried.indexOf(code) < 0) { tried.push(code); ss("wb_mw_tried", tried); label(); }
      track("mywall_try", { code: code, via: via || "open" });
      if (tried.length >= 3) setTimeout(function () { maybeNudge("tried"); }, 1400);
    }
  }
  function step(n, via) { if (!order.length || !cur) return; var i = order.indexOf(cur); swap(order[(i + n + order.length) % order.length].code, via || "arrow"); }
  function heart() {
    if (!cur || !WB.shortlist) return;
    var on = WB.shortlist.toggle(cur.code); label(); paintStripHearts();
    if (on && photo) setTimeout(function () { maybeNudge("heart"); }, 500);
  }
  function paintStripHearts() {
    var hearts = WB.shortlist.all();
    dlg.querySelectorAll(".mw-th").forEach(function (b) { var i = b.querySelector("i"), on = hearts.indexOf(b.dataset.code) > -1; if (on && !i) b.insertAdjacentHTML("beforeend", "<i>♥</i>"); if (!on && i) i.remove(); });
  }

  /* ---------- open ---------- */
  function open(code, via) {
    if (!cfg) return;
    if (!dlg) build();
    ls("wb_mw_used", 1); hideBar();
    var go = function () {
      if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
      document.documentElement.classList.add("mw-open");
      dlg.querySelector(".mw-tip").hidden = !!ls("wb_mw_tip");
      cur = cfg.byCode[code] || cfg.designs()[0]; paintStrip(); swap(cur.code, via || "open");
      requestAnimationFrame(draw); turnHint();
    };
    track("mywall_open", { code: code || "", via: via || "" });
    if (photo || wall === false) go(); else loadWall().then(go);
  }

  /* ---------- the picture we send: their wall + the design + a small WallBliss mark ---------- */
  function composite(d, maxSide) {
    return artFor(d).then(function (a) {
      var s = Math.min(1, (maxSide || 1600) / Math.max(photo.width, photo.height));
      var c = document.createElement("canvas"); c.width = Math.round(photo.width * s); c.height = Math.round(photo.height * s);
      var x = c.getContext("2d"); x.drawImage(photo, 0, 0, c.width, c.height);
      if (a) { var w = place.w * c.width, h = w / ratio(a); paintArt(x, a, { x: place.x * c.width - w / 2, y: place.y * c.height - h / 2, w: w, h: h }); }
      if (!maxSide || maxSide > 600) {
        var f = Math.max(13, Math.round(c.width / 55)), txt = "WallBliss Studio · " + d.code + " · wallbliss.in";
        x.font = "600 " + f + "px DM Sans, sans-serif"; var tw = x.measureText(txt).width, pad = f * .6, bw = tw + pad * 2, bh = f * 1.9;
        x.fillStyle = "rgba(255,255,255,.88)"; roundRect(x, c.width - bw - f, c.height - bh - f, bw, bh, bh / 2); x.fill();
        x.fillStyle = "#1A1714"; x.textBaseline = "middle"; x.fillText(txt, c.width - bw - f + pad, c.height - f - bh / 2);
      }
      return c;
    });
  }
  function roundRect(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
  function toBlob(c) { return new Promise(function (res) { c.toBlob(function (b) { res(b); }, "image/jpeg", 0.88); }); }

  /* ---------- nudge: "Which one felt like home?" (once per visit) ---------- */
  function maybeNudge(why) {
    if (ss("wb_mw_nudged") || !photo || !dlg.open) return;
    if (sendSheet && !sendSheet.hidden) return;
    ss("wb_mw_nudged", 1); track("mywall_nudge", { why: why });
    var tried = ss("wb_mw_tried") || [], hearts = WB.shortlist ? WB.shortlist.all() : [];
    var picks = [];
    function add(c) { if (picks.indexOf(c) < 0 && cfg.byCode[c] && picks.length < 3) picks.push(c); }
    if (cur) add(cur.code);
    tried.filter(function (c) { return hearts.indexOf(c) > -1; }).forEach(add);
    tried.slice().reverse().forEach(add);
    if (!nudgeSheet) {
      nudgeSheet = document.createElement("div"); nudgeSheet.className = "mw-sheet"; nudgeSheet.hidden = true;
      dlg.querySelector(".mw-in").appendChild(nudgeSheet);
      nudgeSheet.addEventListener("click", function (e) {
        var p = e.target.closest("[data-pick]"); if (p) { nudgeSheet.querySelectorAll("[data-pick]").forEach(function (x) { x.classList.toggle("on", x === p); }); swap(p.dataset.pick, "nudge"); return; }
        var b = e.target.closest("[data-ns]"); if (!b) return;
        if (b.dataset.ns === "send") { nudgeSheet.hidden = true; love("nudge"); }
        else { nudgeSheet.hidden = true; track("mywall_nudge_later", {}); }
      });
    }
    nudgeSheet.innerHTML = '<div class="mw-card"><h3>Which one felt like home?</h3><p>Pick your favourite. We\'ll send the exact price and a free print-ready preview on WhatsApp.</p>' +
      '<div class="mw-picks">' + picks.map(function (c, i) { return '<button type="button" data-pick="' + c + '" class="' + (i ? "" : "on") + '"><canvas></canvas><b>' + (hearts.indexOf(c) > -1 ? "♥ " : "") + esc(short(cfg.byCode[c].name)) + '</b></button>'; }).join("") + '</div>' +
      '<button type="button" class="mw-btn mw-wa" data-ns="send">Send my wall to WallBliss</button><button type="button" class="mw-btn mw-line" data-ns="later">Keep exploring</button>' +
      '<small>Your photo is shared only if you send it. Otherwise it stays on your phone.</small></div>';
    nudgeSheet.hidden = false;
    nudgeSheet.querySelectorAll("[data-pick]").forEach(function (b) {
      composite(cfg.byCode[b.dataset.pick], 420).then(function (c) { var t = b.querySelector("canvas"); t.width = c.width; t.height = c.height; t.getContext("2d").drawImage(c, 0, 0); });
    });
  }
  function short(n) { n = String(n || ""); return n.length > 22 ? n.slice(0, 21) + "…" : n; }

  /* ---------- send: 1) say hi on WhatsApp (text), 2) share the picture into that chat ---------- */
  function canShareFiles() {
    try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [new File([new Blob(["x"], { type: "image/jpeg" })], "x.jpg", { type: "image/jpeg" })] })); } catch (e) { return false; }
  }
  var pending = null;
  function love(via) {
    if (!cur) return;
    if (!photo) { pickPhoto(); return; }
    var d = cur, s = wall && wall.size;
    var msg = "Hi WallBliss" + (WB.lead && WB.lead.name ? ", this is " + WB.lead.name : "") + ". I tried " + d.code + " (" + d.name + ") on my wall" +
      (s && s.w ? " (about " + s.w + " × " + s.h + " ft)" : "") + ". " + (canShareFiles() ? "Sending you the picture now 👇" : "I'll attach the picture of my wall.") + " Please share the price and a preview.";
    pending = { code: d.code, blob: null };
    composite(d).then(toBlob).then(function (b) { if (pending && pending.code === d.code) pending.blob = b; showSend(); });
    track("mywall_send_text", { code: d.code, via: via || "button" });
    var a = document.createElement("a"); a.href = WB.waLink(msg); a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
    showSend();
  }
  function showSend() {
    if (!sendSheet) {
      sendSheet = document.createElement("div"); sendSheet.className = "mw-sheet"; sendSheet.hidden = true;
      dlg.querySelector(".mw-in").appendChild(sendSheet);
      sendSheet.addEventListener("click", function (e) {
        var b = e.target.closest("[data-ss]"); if (!b) return;
        if (b.dataset.ss === "share") sharePic();
        else if (b.dataset.ss === "save") savePic();
        else sendSheet.hidden = true;
      });
    }
    if (!pending) return;
    var d = cfg.byCode[pending.code], files = canShareFiles();
    sendSheet.innerHTML = '<div class="mw-card"><p class="mw-step">Step 2 of 2</p><h3>Now send the picture</h3>' +
      '<p>' + (files ? "Tap below, choose <b>WhatsApp</b>, then <b>WallBliss</b> (at the top of your recent chats)." : "Save the picture, then attach it in the WhatsApp chat that just opened.") + '</p>' +
      '<div class="mw-prev">' + (pending.blob ? '<img alt="Your wall with ' + esc(d.name) + '" src="' + URL.createObjectURL(pending.blob) + '">' : '<span class="mw-wait">Preparing your picture…</span>') + '</div>' +
      (files ? '<button type="button" class="mw-btn mw-wa" data-ss="share"' + (pending.blob ? "" : " disabled") + '>Send picture</button><button type="button" class="mw-btn mw-line" data-ss="save"' + (pending.blob ? "" : " disabled") + '>Save picture instead</button>'
             : '<button type="button" class="mw-btn mw-wa" data-ss="save"' + (pending.blob ? "" : " disabled") + '>Save picture</button>') +
      '<button type="button" class="mw-btn mw-line" data-ss="done">Done</button></div>';
    sendSheet.hidden = false;
  }
  function file() { return new File([pending.blob], "my-wall-" + pending.code + ".jpg", { type: "image/jpeg" }); }
  function sharePic() {
    if (!pending || !pending.blob) return;
    navigator.share({ files: [file()] }).then(function () { track("mywall_send_picture", { code: pending.code, via: "share" }); WB.notify("Sent. We'll reply with your price soon."); sendSheet.hidden = true; })
      .catch(function (e) { if (e && e.name !== "AbortError") savePic(); });
  }
  function savePic() {
    if (!pending || !pending.blob) return;
    var a = document.createElement("a"); a.href = URL.createObjectURL(pending.blob); a.download = "my-wall-" + pending.code + ".jpg";
    document.body.appendChild(a); a.click(); a.remove();
    track("mywall_send_picture", { code: pending.code, via: "download" });
    WB.notify("Picture saved. Attach it in our WhatsApp chat.", { ms: 6000 });
  }

  /* ---------- "My wall view": every catalogue preview on their wall ---------- */
  var io = null;
  function decorate(grid) {
    if (!grid) return;
    var on = !!photo && ls("wb_mw_grid") !== 0;
    grid.classList.toggle("mw-grid", on);
    grid.querySelectorAll(".mwc").forEach(function (c) { c.remove(); });
    if (!on) return;
    if (!io && "IntersectionObserver" in window) io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); tile(e.target); } }); }, { rootMargin: "300px" });
    grid.querySelectorAll(".card .thumb").forEach(function (t) {
      var c = document.createElement("canvas"); c.className = "mwc"; c.dataset.code = t.dataset.open; c.setAttribute("aria-hidden", "true");
      t.appendChild(c); io ? io.observe(c) : tile(c);
    });
  }
  function tile(c) {
    var d = cfg.byCode[c.dataset.code]; if (!d || !photo) return;
    artFor(d, true).then(function (a) {
      if (!a || !c.isConnected) return;
      var W = 480, H = 360; c.width = W; c.height = H;
      var x = c.getContext("2d");
      /* crop the wall around the design so it fills ~60% of the tile */
      var dw = place.w * photo.width, dh = dw / ratio(a), cw = Math.max(dw / 0.62, dh / 0.62 * W / H), ch = cw * H / W;
      if (cw > photo.width) { cw = photo.width; ch = cw * H / W; } if (ch > photo.height) { ch = photo.height; cw = ch * W / H; }
      var cx = place.x * photo.width, cy = place.y * photo.height;
      var sx = Math.min(Math.max(0, cx - cw / 2), photo.width - cw), sy = Math.min(Math.max(0, cy - ch / 2), photo.height - ch), k = W / cw;
      x.drawImage(photo, sx, sy, cw, ch, 0, 0, W, H);
      paintArt(x, a, { x: (cx - dw / 2 - sx) * k, y: (cy - dh / 2 - sy) * k, w: dw * k, h: dh * k });
      c.classList.add("in");
    });
  }

  /* ---------- page-level nudges ---------- */
  var bar = null, wallBar = null;
  function popOnce() { if (ss("wb_mw_pop")) return false; ss("wb_mw_pop", 1); return true; }
  function hideBar() { if (bar) bar.hidden = true; }
  function stickyBar() {
    /* phones: a button in the page's bottom bar (next to WhatsApp / Shortlist); it stays, and reads "My wall" once a photo is saved */
    var wa = document.querySelector(".wa-bar");
    if (wa) {
      if (!wa.querySelector(".mw-wa-btn")) {
        var b = document.createElement("button"); b.type = "button"; b.className = "btn mw-wa-btn";
        b.onclick = function () { open(cfg.current() || cfg.first(), "bottom-bar"); };
        wa.insertBefore(b, wa.firstChild);
      }
      wa.querySelector(".mw-wa-btn").textContent = photo ? "📷 My wall" : "📷 Try on wall";
      return;
    }
    if (used() || photo || ss("wb_mw_bar_off") || !matchMedia("(max-width: 760px)").matches) return;
    bar = document.createElement("div"); bar.className = "mw-bar";
    bar.innerHTML = '<button type="button" class="mw-bar-go">📷 Try designs on your wall</button><button type="button" class="mw-bar-x" aria-label="Hide">×</button>';
    bar.querySelector(".mw-bar-go").onclick = function () { open(cfg.first(), "sticky"); };
    bar.querySelector(".mw-bar-x").onclick = function () { ss("wb_mw_bar_off", 1); hideBar(); };
    document.body.appendChild(bar);
  }
  function refreshPage() {
    if (!cfg) return;
    var box = cfg.wallBar; if (!box) return;
    if (!photo) { box.hidden = true; decorate(cfg.grid); return; }
    var on = ls("wb_mw_grid") !== 0;
    box.hidden = false;
    box.innerHTML = '<span class="mw-wb-pic" style="background-image:url(' + wall.data + ')"></span><span class="mw-wb-t"><b>Your wall ✓</b><small>Designs shown on your wall</small></span>' +
      '<label class="mw-sw"><input type="checkbox"' + (on ? " checked" : "") + '><span>On my wall</span></label><button type="button" class="mw-wb-open">Open</button>';
    box.querySelector("input").onchange = function () { ls("wb_mw_grid", this.checked ? 1 : 0); decorate(cfg.grid); track("mywall_grid", { on: this.checked }); };
    box.querySelector(".mw-wb-open").onclick = function () { open(cfg.first(), "bar"); };
    decorate(cfg.grid);
  }

  WB.myWall = {
    /* cfg: { designs: fn → designs in page order, byCode, first: fn → code, grid, wallBar, onClose } */
    init: function (c) {
      cfg = c;
      loadWall().then(function (ok) {
        stickyBar();
        if (!ok) { wall = false; return; }
        refreshPage();
        if (!ss("wb_mw_welcomed") && popOnce()) {
          ss("wb_mw_welcomed", 1);
          setTimeout(function () { WB.notify("Welcome back. Your wall is ready.", { ms: 7000, action: { label: "Open my wall", fn: function () { open(cfg.first(), "welcome"); } } }); }, 1200);
        }
      });
    },
    open: open,
    has: function () { return !!photo; },
    decorate: function () { if (cfg) decorate(cfg.grid); },
    /* called by the catalogue when a design pop-up opens */
    noteOpen: function () {
      if (used() || photo) return;
      var n = (ss("wb_mw_opens") || 0) + 1; ss("wb_mw_opens", n);
      if (n === 2 && popOnce()) setTimeout(function () {
        WB.notify("Snap your wall and see these designs on it in 10 seconds. The photo stays on your phone.", { ms: 9000, action: { label: "Try it", fn: function () { open(cfg.current() || cfg.first(), "nudge-2"); } } });
      }, 2500);
    },
    heartAction: function (code) { return { label: "See on your wall", fn: function () { open(code, "heart"); } }; }
  };
})();
