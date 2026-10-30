/* WallBliss admin — upload up to 10 designs at once.
   For every photo: trim plain borders (e.g. screenshot bars) → resize to 1600 px → suggest a
   code, name, tags, rooms, style and search words (AI) → you finalise → watermark with the
   final code → saved (images kept in this browser's IndexedDB) and published automatically.
   AI: Claude (vision) called straight from this browser with the team's own API key, stored on
   this device only (Settings → AI tagging key). Without a key, or if you tap "Fill in myself",
   you type the details yourself. Tags are mandatory (2+) and never shown to customers. */
(function () {
  "use strict";
  var A = window.WBAdmin; if (!A) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = A.esc, MAX = 10, MIN_TAGS = 2, AI_MODELS = ["claude-haiku-4-5-20251001", "claude-sonnet-5-5"];   // fast + cheap first; the next one is tried if a model is unavailable
  var AI_MODEL = (function () { try { return localStorage.getItem("wb_ai_model") || AI_MODELS[0]; } catch (e) { return AI_MODELS[0]; } })();
  var AIKEY = "wb_ai_key";
  function aiKey() { try { return localStorage.getItem(AIKEY) || ""; } catch (e) { return ""; } }
  function setAiKey(k) { try { k ? localStorage.setItem(AIKEY, k) : localStorage.removeItem(AIKEY); } catch (e) {} }

  /* ---------- image store (IndexedDB) ---------- */
  var IDB = {
    db: null,
    open: function () {
      if (IDB.db) return Promise.resolve(IDB.db);
      return new Promise(function (res, rej) { var r = indexedDB.open("wb_admin_images", 1); r.onupgradeneeded = function () { r.result.createObjectStore("img"); }; r.onsuccess = function () { IDB.db = r.result; res(r.result); }; r.onerror = function () { rej(r.error); }; });
    },
    put: function (k, v) { return IDB.open().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction("img", "readwrite"); t.objectStore("img").put(v, k); t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); }; }); }); },
    get: function (k) { return IDB.open().then(function (db) { return new Promise(function (res) { var r = db.transaction("img").objectStore("img").get(k); r.onsuccess = function () { res(r.result || null); }; r.onerror = function () { res(null); }; }); }); },
    del: function (k) { return IDB.open().then(function (db) { db.transaction("img", "readwrite").objectStore("img").delete(k); }); }
  };
  /* iPhone photos (HEIC), including 10-bit HDR photos and Live Photo stills. Safari opens most of them
     itself; otherwise they are converted to JPG here on this device (heic-to, ~3 MB, loaded only when needed). */
  var heicLib = null;
  function isHeic(f) { return /hei[cf]/i.test((f && f.type) || "") || /\.hei[cf]$/i.test((f && f.name) || ""); }
  function heicToJpeg(f) {
    heicLib = heicLib || new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = "assets/vendor/heic-to.js";
      s.onload = function () { res(window.HeicTo); };
      s.onerror = function () { heicLib = null; rej(new Error("Couldn't load the iPhone photo converter. Check the internet and try again.")); };
      document.head.appendChild(s);
    });
    var slow = new Promise(function (res, rej) { setTimeout(function () { rej(new Error("slow")); }, 60000); });
    return heicLib.then(function (H) { return Promise.race([H({ blob: f, type: "image/jpeg", quality: 0.92 }), slow]); })
      .catch(function (e) {
        if (e instanceof Error && /converter/.test(e.message)) throw e;
        throw new Error("Couldn't convert “" + f.name + "”. In Photos, tap Share → Options → Most Compatible (or save it as JPG) and try again.");
      });
  }
  window.WBHeic = { is: isHeic, toJpeg: heicToJpeg };

  /* one door to Claude for the whole admin (design tags + project stories): clear messages for every failure,
     and if a model name is retired, the next one is used and remembered on this device */
  function aiPost(payload, signal) {
    var key = aiKey(), order = [AI_MODEL].concat(AI_MODELS.filter(function (m) { return m !== AI_MODEL; }));
    function attempt(i) {
      var model = order[i];
      return fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: signal,
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify(Object.assign({ model: model }, payload))
      }).then(function (r) {
        if (r.ok) { if (model !== AI_MODEL) { AI_MODEL = model; try { localStorage.setItem("wb_ai_model", model); } catch (e) {} showAi(); } return r.json(); }
        return r.text().then(function (t) {
          var msg = ""; try { var j = JSON.parse(t); msg = (j.error && j.error.message) || ""; } catch (e) { msg = t; }
          if ((r.status === 404 || /model/i.test(msg) && r.status === 400) && i + 1 < order.length) return attempt(i + 1);
          if (r.status === 401) throw new Error("The AI key was not accepted. Copy it again from the Claude Console and save it in Settings.");
          if (/credit balance/i.test(msg)) throw new Error("Your Anthropic credit is empty. Add credit in the Claude Console → Billing, then try again.");
          if (r.status === 403) throw new Error("This key isn't allowed to use Claude. Check the key's workspace in the Claude Console.");
          if (r.status === 429) throw new Error("Claude is busy (rate limit). Wait a minute and try again.");
          if (r.status === 529 || r.status >= 500) throw new Error("Claude is overloaded right now. Try again in a minute.");
          throw new Error("Claude said " + r.status + ": " + String(msg).slice(0, 140));
        });
      }, function (e) {
        if (e && e.name === "AbortError") throw e;
        throw new Error("Couldn't reach Claude. Check the internet, or turn off an ad/tracker blocker for wallbliss.in.");
      });
    }
    if (!key) return Promise.reject(new Error("No AI key on this device."));
    return attempt(0);
  }
  window.WBAI = { key: function () { return aiKey(); }, model: AI_MODEL, post: aiPost };   // also used by the project story writer
  window.WBImages = {
    /* turn "idb:<key>" into a data URL (used by Publish and by thumbnails) */
    resolve: function (ref) { return /^idb:/.test(ref || "") ? IDB.get(ref.slice(4)) : Promise.resolve(ref); },
    put: function (key, dataUrl) { return IDB.put(key, dataUrl).then(function () { return "idb:" + key; }); },
    forget: function (ref) { if (/^idb:/.test(ref || "")) IDB.del(ref.slice(4)); }
  };
  /* any <img data-idb="idb:…"> anywhere in the admin gets its picture filled in */
  function fillIdb(root) { $$("img[data-idb]", root).forEach(function (im) { var r = im.getAttribute("data-idb"); im.removeAttribute("data-idb"); WBImages.resolve(r).then(function (u) { if (u) im.src = u; }); }); }
  new MutationObserver(function () { fillIdb(document); }).observe(document.body, { childList: true, subtree: true });

  /* ---------- styles ---------- */
  var st = document.createElement("style");
  st.textContent =
    ".u-items{display:grid;gap:16px}.u-item{border:1px solid var(--line);border-radius:18px;background:var(--surface);padding:12px;display:grid;gap:12px}" +
    ".u-top{display:grid;grid-template-columns:112px minmax(0,1fr);gap:12px;align-items:start}.u-thumb{width:112px;aspect-ratio:3/4;border-radius:12px;overflow:hidden;background:var(--wall);display:grid;place-items:center;cursor:zoom-in}" +
    ".u-thumb canvas{width:100%;height:100%;object-fit:contain;display:block}.u-st{font-size:.8rem;color:var(--muted);display:flex;gap:6px;align-items:center}" +
    ".u-st.bad{color:#B42318}.u-st.ok{color:#1B6B4A}.u-row{display:grid;grid-template-columns:118px minmax(0,1fr);gap:8px}.u-f{display:grid;gap:0}.u-f input{width:100%}" +
    ".u-item input[type=text]{min-height:42px}.u-code.bad{border-color:#B42318!important}.u-tags{display:flex;flex-wrap:wrap;gap:6px;align-items:center}" +
    ".u-tag{display:inline-flex;align-items:center;gap:4px;min-height:32px;padding:0 6px 0 12px;border-radius:999px;background:var(--ink);color:#fff;font:500 .84rem var(--font-body)}" +
    ".u-tag button{border:0;background:rgba(255,255,255,.18);color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:.9rem;line-height:1}" +
    ".u-add{flex:1;min-width:120px;border:1px dashed var(--line-strong)!important;border-radius:999px!important;min-height:32px!important;padding:4px 12px!important;font-size:.86rem!important}" +
    ".u-lbl{font-size:.78rem;font-weight:700;color:var(--ink);display:flex;justify-content:space-between;gap:8px;margin-bottom:6px}.u-lbl small{font-weight:500;color:var(--faint)}" +
    ".u-item details summary{cursor:pointer;font-size:.84rem;color:var(--accent);font-weight:700}.u-item textarea{width:100%;min-height:70px;font:.86rem var(--font-body);padding:8px 10px;border-radius:10px;border:1px solid var(--line-strong)}" +
    ".u-wait{display:grid;gap:10px;align-content:start}.u-wait .u-st{display:block;font-size:.9rem;color:var(--ink)}.u-wait p{margin:0;font-size:.8rem;color:var(--muted)}.u-skip{justify-self:start;border:1px solid var(--line-strong);background:#fff;border-radius:999px;padding:8px 14px;font:600 .84rem var(--font-body);color:var(--ink);cursor:pointer}" +
    ".u-own{margin-top:8px;max-width:300px;border:1px dashed var(--line-strong)!important;border-radius:999px!important;min-height:34px!important;padding:4px 12px!important;font-size:.86rem!important;width:100%}" +
    ".u-skipall{border:0;background:none;color:var(--accent);font:700 .84rem var(--font-body);cursor:pointer;padding:0;text-decoration:underline}" +
    ".u-rm{border:0;background:none;color:#B42318;font:600 .82rem var(--font-body);cursor:pointer;justify-self:end}" +
    ".u-zoom{border:0;padding:0;background:#111;max-width:min(96vw,900px);border-radius:14px;overflow:hidden}.u-zoom::backdrop{background:rgba(0,0,0,.75)}.u-zoom canvas{display:block;max-width:100%;max-height:86dvh}";
  document.head.appendChild(st);

  /* ---------- markup ---------- */
  var dlg = document.createElement("dialog");
  dlg.className = "sheet"; dlg.id = "u-dlg"; dlg.setAttribute("aria-labelledby", "u-title");
  dlg.innerHTML = '<div class="sheet-in"><header><h2 id="u-title">Upload designs</h2><button class="x" type="button" data-close aria-label="Close">×</button></header>' +
    '<div class="body"><div id="u-pick" class="field"><div class="drop"><input type="file" id="u-file" accept="image/*,.heic,.heif,.tif,.tiff,.psd,.pdf,.ai,.eps,.bmp" multiple aria-label="Choose photos"><div><b>Tap to choose up to ' + MAX + ' photos</b>JPG, PNG, WebP or iPhone photos. Print-size files are fine; they are resized for the website.</div></div>' +
    '<p class="muted" id="u-ai-state" style="font-size:.84rem"></p><p class="muted" id="u-orig-state" style="font-size:.84rem;margin-top:-4px"></p></div><p id="u-skipall-row" hidden style="margin:0 0 4px;font-size:.84rem;color:var(--muted)">Claude is filling in the details. <button type="button" class="u-skipall" id="u-skipall">Fill all in myself</button></p><div class="u-items" id="u-items"></div></div>' +
    '<footer><span class="muted" id="u-count" style="font-size:.86rem;margin-right:auto"></span><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-wa" type="button" id="u-save" style="background:var(--ink);box-shadow:none" disabled>Save and publish</button></footer></div>';
  document.body.appendChild(dlg);
  var zoom = document.createElement("dialog"); zoom.className = "u-zoom"; document.body.appendChild(zoom);
  zoom.addEventListener("click", function () { zoom.close(); });
  $$("[data-close]", dlg).forEach(function (b) { b.onclick = function () { dlg.close(); }; });

  var items = [], logo = new Image(); logo.src = "assets/img/mark.png";

  function aiState() {
    $("#u-ai-state").innerHTML = aiKey()
      ? "✨ Claude fills in the name, tags, rooms, style and search words for each photo, usually in 5–10 seconds. You can skip it and type them yourself."
      : "AI is off on this device, so you'll type the details. <button type=\"button\" class=\"linkbtn\" id=\"u-go-ai\" style=\"font-size:inherit;padding:0\">Add the AI key</button> once on this device (Settings) and Claude will fill them in for you.";
    var g = $("#u-go-ai"); if (g) g.onclick = function () { dlg.close(); location.hash = "settings"; setTimeout(function () { var k = $("#ai-key-in"); if (k) { k.scrollIntoView({ block: "center" }); k.focus(); } }, 300); };
    /* where the original files go */
    var O = window.WBOriginals, el = $("#u-orig-state"); if (!el) return;
    if (!O) { el.innerHTML = ""; return; }
    var st = O.state(), f = O.folder();
    el.innerHTML = st.need === "folder" ? "☁ Originals: Drive isn't connected yet, so ticked originals wait on this device until you connect the folder (Designs page)."
      : st.need === "reconnect" || O.needsTap() ? "☁ Originals go to Drive · " + A.esc(f.folderName || "Design originals") + ". Drive needs a quick reconnect on this device; ticked originals wait until then."
      : "☁ Ticked originals are saved to Drive · " + A.esc(f.folderName || "Design originals") + ", untouched. Untick small or low-quality files.";
  }
  function open() {
    items = []; $("#u-items").innerHTML = ""; $("#u-file").value = ""; $("#u-pick").hidden = false; aiState(); update();
    A.openDlg(dlg);
  }
  $("#d-new").onclick = open;

  /* ---------- codes ---------- */
  function usedCodes(except) {
    var u = {}; A.designs().forEach(function (d) { u[d.code] = 1; });
    items.forEach(function (it) { if (it !== except) u[it.code] = 1; });
    return u;
  }
  function nextFree(used) {                                   // never reuses a deleted design's code (see live.js codeFloor)
    var n = WB.codeFloor({ designs: A.designs(), settings: A.db().settings }, window.WB_PUBLISHED, WB.db.base());
    Object.keys(used).forEach(function (c) { var m = /^WB-(\d+)$/.exec(c); if (m) n = Math.max(n, +m[1]); });
    return WB.codeName(n + 1);
  }
  function codeProblem(it) {
    if (!/^WB-\d{4}$/.test(it.code)) return "Use the format WB-0000";
    if (usedCodes(it)[it.code]) return "This code is already taken";
    var floor = WB.codeFloor({ settings: A.db().settings }, window.WB_PUBLISHED, WB.db.base());
    if (+it.code.slice(3) <= floor) return it.code + " belonged to a deleted design. Codes are never reused";
    return "";
  }

  /* ---------- image steps ---------- */
  function openImg(blob, name) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { res(im); };
      im.onerror = function () { rej(new Error("Can't open “" + name + "”. Use JPG, PNG, WebP or iPhone photos (export TIFF, PSD or PDF print files to JPG first).")); };
      im.src = url;
    });
  }
  function load(file) {
    return openImg(file, file.name).catch(function (e) { if (!isHeic(file)) throw e; return heicToJpeg(file).then(function (b) { return openImg(b, file.name); }); });
  }
  /* remove plain bars at the edges (black screenshot bars, white scanner margins) */
  function trimBox(img) {
    var W = img.naturalWidth, H = img.naturalHeight, s = Math.min(1, 320 / Math.max(W, H)), w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
    var c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h).data;
    function px(i, j) { var k = (j * w + i) * 4; return [d[k], d[k + 1], d[k + 2]]; }
    function plain(line) {           // a row/column that is one flat colour, near black or near white
      var r = 0, g = 0, b = 0; line.forEach(function (p) { r += p[0]; g += p[1]; b += p[2]; }); var n = line.length; r /= n; g /= n; b /= n;
      var lum = (r + g + b) / 3; if (lum > 40 && lum < 228) return false;
      return line.filter(function (p) { return Math.abs(p[0] - r) + Math.abs(p[1] - g) + Math.abs(p[2] - b) < 36; }).length / n > 0.97;
    }
    function row(j) { var a = []; for (var i = 0; i < w; i++) a.push(px(i, j)); return a; }
    function col(i) { var a = []; for (var j = 0; j < h; j++) a.push(px(i, j)); return a; }
    var t = 0, bt = h - 1, l = 0, r = w - 1;
    while (t < h * 0.4 && plain(row(t))) t++;
    while (bt > h * 0.6 && plain(row(bt))) bt--;
    while (l < w * 0.4 && plain(col(l))) l++;
    while (r > w * 0.6 && plain(col(r))) r--;
    if (t < h * 0.015) t = 0; if (h - 1 - bt < h * 0.015) bt = h - 1; if (l < w * 0.015) l = 0; if (w - 1 - r < w * 0.015) r = w - 1;
    if (!t && bt === h - 1 && !l && r === w - 1) return null;
    var box = { x: Math.round(l / s), y: Math.round(t / s), w: Math.round((r - l + 1) / s), h: Math.round((bt - t + 1) / s) };
    if (box.w * box.h < W * H * 0.4) return null;
    return box;
  }
  function crop(img, box) {
    if (!box) return img;
    var c = document.createElement("canvas"); c.width = box.w; c.height = box.h;
    c.getContext("2d").drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h); return c;
  }
  function shape(c) { var ar = c.width / c.height; return ar > 1.2 ? "wide" : ar < .85 ? "tall" : "square"; }
  function scaled(c, long, q) { var s = Math.min(1, long / Math.max(c.width, c.height)), o = document.createElement("canvas"); o.width = Math.round(c.width * s); o.height = Math.round(c.height * s); o.getContext("2d").drawImage(c, 0, 0, o.width, o.height); return o.toDataURL("image/jpeg", q || .8); }
  function watermarked(it) {
    var c = document.createElement("canvas"); c.width = it.base.width; c.height = it.base.height;
    c.getContext("2d").drawImage(it.base, 0, 0); WBImage.watermark(c, { code: it.code, logo: logo }); return c;
  }

  /* ---------- AI suggestions ---------- */
  var ids = function (l) { return l.map(function (o) { return o[0]; }); };
  function aiPrompt() {
    return "You tag designs for WallBliss Studio, a Bengaluru company that prints murals directly onto walls of homes, offices, cafés, hotels and clinics. " +
      "Look at this design and reply with ONLY a JSON object, no other text:\n" +
      '{"name": "2-4 word catchy English name", ' +
      '"tags": ["8-14 lowercase English tags, most specific first: deities or people by their common Indian name, animals, objects, scene, art style, mood. No generic words like art, design, wall, image"], ' +
      '"search_words": ["15-30 words or short phrases customers in India might type to find this: synonyms, Hindi, Kannada and Telugu words written in Roman letters AND in their own script, common misspellings, and intent phrases like \\"living room wall\\" or \\"seven horses vastu\\""], ' +
      '"spaces": [all that suit it, from ' + JSON.stringify(ids(A.ROOMS)) + '], "styles": [1-3 that fit best, from ' + JSON.stringify(ids(A.STYLES)) + ']}\n' +
      "If the photo shows a finished wall in a room, tag the artwork, not the room. Be accurate: only tag what you can see.";
  }
  var AI_TIMEOUT = 45000;
  function askAI(it) {
    var key = aiKey(); if (!key) return Promise.resolve(null);
    var data = scaled(it.base, 768, .82).split(",")[1];
    it.ctl = window.AbortController ? new AbortController() : null;
    it.timer = setTimeout(function () { if (it.ctl) { it.timedOut = true; it.ctl.abort(); } }, AI_TIMEOUT);
    return aiPost({ max_tokens: 1000, messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: data } }, { type: "text", text: aiPrompt() }] }] }, it.ctl ? it.ctl.signal : undefined)
    .then(function (j) {
      var txt = (j.content || []).map(function (c) { return c.text || ""; }).join("");
      var m = txt.match(/\{[\s\S]*\}/); if (!m) throw new Error("AI reply could not be read.");
      return JSON.parse(m[0]);
    }).catch(function (e) {
      if (e && e.name === "AbortError") throw new Error(it.timedOut ? "Claude took too long." : "SKIP");
      throw e;
    }).finally(function () { clearTimeout(it.timer); it.ctl = null; });
  }
  /* "Fill in myself": stop waiting for Claude on one photo (or all) */
  function skipAI(it) { if (it.state !== "ai" || !it.base) return; it.skipped = true; if (it.ctl) it.ctl.abort(); else { it.state = ""; check(it); renderItem(it); } }
  /* live seconds counter on photos Claude is still working on */
  setInterval(function () {
    items.forEach(function (it) {
      if (it.state !== "ai" || !it.aiStart || !it.el) return;
      var s = (Date.now() - it.aiStart) / 1000, st = $(".u-sec", it.el), m = $(".u-line", it.el), line = WB.loadLine("aiDesign", s);
      if (st) st.textContent = Math.round(s) + " s";
      if (m && m.textContent !== line) { m.textContent = line; m.classList.remove("in"); void m.offsetWidth; m.classList.add("in"); }
    });
  }, 1000);
  function clean(list, allowed) {
    var seen = {}, out = [];
    (list || []).forEach(function (t) { t = String(t || "").trim().toLowerCase().replace(/\s+/g, " "); if (!t || t.length > 40 || seen[t]) return; if (allowed && allowed.indexOf(t) < 0) return; seen[t] = 1; out.push(t); });
    return out;
  }
  function fileWords(name) {
    return clean(name.replace(/\.[a-z0-9]+$/i, "").split(/[^a-zA-Z]+/).filter(function (w) { return w.length > 2 && !/^(img|image|dsc|whatsapp|screenshot|photo|final|copy|new|edit|print|file|jpeg|png|scaled)$/i.test(w); }));
  }

  /* ---------- items ---------- */
  function addFiles(files) {
    files = Array.prototype.slice.call(files || []).filter(function (f) { return /^image\//.test(f.type) || /\.(heic|heif|jpe?g|jfif|png|webp|tiff?|psd|pdf|ai|eps|bmp)$/i.test(f.name); });
    var room = MAX - items.length;
    if (files.length > room) A.toast("Up to " + MAX + " photos at a time. Taking the first " + room + ".");
    files.slice(0, room).forEach(function (f) {
      var used = usedCodes(null);
      var it = { file: f, code: nextFree(used), name: "", tags: [], search: [], spaces: [], styles: [], orient: "wide", status: "Preparing…", state: "ai" };
      items.push(it); renderItem(it);
      prep(it, f);
    });
    update();
  }
  /* make the website picture from the file (or from a smaller copy when the original can't be opened here) */
  function prep(it, src) {
    var f = src;
    load(src).then(function (img) {
      if (!img.naturalWidth) throw new Error("Can't open “" + f.name + "”. If it's a very large print file, save a copy at about 4000 px and try again.");
      var box = trimBox(img);
      it.trimmed = !!box; it.srcW = img.naturalWidth; it.srcH = img.naturalHeight;
      /* originals smaller than the website picture (1600 px) add nothing: unticked by default, tick to keep anyway */
      if (src === it.file) { it.lowRes = Math.max(it.srcW, it.srcH) < 1600; if (!it.keepTouched) it.keepOrig = !it.lowRes; }
      it.base = WBImage.resize(img, WBImage.LONG, box);                 // trim + shrink in one step (safe for huge print files)
      it.orient = shape(it.base);
      it.tags = fileWords(f.name);
      it.status = aiKey() ? "Claude is filling in the details…" : "Add at least " + MIN_TAGS + " tags"; it.state = aiKey() ? "ai" : "";
      if (aiKey()) it.aiStart = Date.now();
      renderItem(it); paint(it);
      return askAI(it).then(function (s) {
        if (s && !it.skipped) {
          it.name = it.name || (s.name || "").slice(0, 40);
          it.tags = clean((s.tags || []).concat(it.tags)).slice(0, 16);
          it.search = clean(s.search_words).slice(0, 40);
          it.spaces = clean(s.spaces, ids(A.ROOMS)); it.styles = clean(s.styles, ids(A.STYLES));
          it.aiDone = true; it.aiSecs = Math.round((Date.now() - it.aiStart) / 1000);
        }
        it.state = ""; check(it); renderItem(it);
      }).catch(function (e) {
        it.state = ""; check(it);
        if (e.message !== "SKIP") { it.aiErr = e.message + " Fill in the details yourself."; }
        renderItem(it);
      });
    }).catch(function (e) {
      it.state = "bad"; it.broken = true;
      /* a print master the browser can't open (huge, TIFF, PSD, PDF…): its original can still be archived */
      if (src === it.file && window.WBOrigUI) { it.needWeb = true; it.keepOrig = true; it.status = "This file can't be opened here (" + (e.message.indexOf("large") > -1 ? "too large" : "file type") + "). Its original will still be saved to Drive. Choose a smaller JPG or PNG copy for the website picture."; }
      else it.status = e.message;
      renderItem(it);
    });
  }
  function check(it) {
    if (it.broken) return false;
    var probs = [];
    var cp = codeProblem(it); if (cp) probs.push(cp);
    if (!it.name.trim()) probs.push("add a name");
    if (it.tags.length < MIN_TAGS) probs.push("add " + (MIN_TAGS - it.tags.length) + " more tag" + (MIN_TAGS - it.tags.length > 1 ? "s" : ""));
    if (!it.spaces.length) probs.push("pick a room");
    if (!it.base) { it.status = "Preparing…"; it.state = "ai"; return false; }
    if (it.state === "ai") return false;
    if (probs.length) { it.status = "To finish: " + probs.join(", "); it.state = "bad"; }
    else { it.status = (it.aiDone ? "✨ Filled in by Claude in " + it.aiSecs + " s. Check it. " : "") + "Ready" + (it.trimmed ? " · plain borders trimmed" : ""); it.state = "ok"; }
    if (it.aiErr && probs.length) it.status = it.aiErr + " " + it.status;
    return !probs.length;
  }
  function paint(it) {
    var el = it.el && $("canvas", it.el); if (!el || !it.base) return;
    var c = watermarked(it); el.width = c.width; el.height = c.height; el.getContext("2d").drawImage(c, 0, 0);
  }
  function chipRow(list, sel, key) {
    return '<div class="chips">' + list.map(function (o) { return '<button type="button" class="fchip" data-k="' + key + '" data-v="' + o[0] + '" aria-pressed="' + (sel.indexOf(o[0]) > -1) + '">' + (o[2] ? '<span class="sw" style="background:' + o[2] + '"></span>' : "") + o[1] + "</button>"; }).join("") + "</div>";
  }
  function renderItem(it) {
    if (!it.el) { it.el = document.createElement("div"); it.el.className = "u-item"; $("#u-items").appendChild(it.el); }
    if (it.needWeb && !it.base) {                          // original kept; ask for a website copy
      it.el.innerHTML = '<div style="display:grid;gap:8px"><p class="u-st bad">' + esc(it.status) + '</p><small class="muted" style="font-size:.74rem;overflow-wrap:anywhere">Original: ' + esc(it.file.name) + ' · ' + (window.WBOriginals ? WBOriginals.mb(it.file.size) : "") + '</small>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="btn btn-ghost btn-xs" style="position:relative;overflow:hidden">Choose website picture<input type="file" accept="image/*" class="u-web" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label><button type="button" class="u-rm">Remove this file</button></div></div>';
      $(".u-web", it.el).onchange = function () { var w = this.files[0]; if (!w) return; it.webFile = w; it.needWeb = false; it.broken = false; it.state = "ai"; it.status = "Preparing…"; renderItem(it); prep(it, w); };
      $(".u-rm", it.el).onclick = function () { items.splice(items.indexOf(it), 1); it.el.remove(); update(); };
      update(); return;
    }
    if (it.state === "ai" && it.base) {                      // Claude is working: show progress, not a half-filled form
      it.el.innerHTML = '<div class="u-top"><button type="button" class="u-thumb" aria-label="See larger"><canvas></canvas></button><div class="u-wait">' +
        '<p class="u-st ai"><i class="wb-spin" aria-hidden="true"></i> <span class="u-line wb-msg">' + WB.loadLine("aiDesign", (Date.now() - it.aiStart) / 1000) + '</span> <b class="u-sec wb-sec"></b></p>' +
        '<p>✨ Claude is filling in the name, tags, rooms and style. Usually 5–10 seconds. ' + esc(it.file.name) + '</p>' +
        '<button type="button" class="u-skip">Fill in myself</button></div></div>';
      paint(it);
      $(".u-thumb", it.el).onclick = function () { var c = watermarked(it); zoom.innerHTML = ""; zoom.appendChild(c); zoom.showModal(); };
      $(".u-skip", it.el).onclick = function () { skipAI(it); };
      update(); return;
    }
    var focus = document.activeElement && it.el.contains(document.activeElement) ? document.activeElement.getAttribute("data-f") : null;
    it.el.innerHTML =
      '<div class="u-top"><button type="button" class="u-thumb" aria-label="See larger"><canvas></canvas></button><div style="display:grid;gap:8px;min-width:0">' +
      '<p class="u-st ' + (it.state || "") + '">' + (it.state === "ai" ? '<i class="wb-spin" aria-hidden="true"></i> ' : "") + esc(it.state === "ai" && !it.base && isHeic(it.file) ? WB.LOAD_LINES.heic[1] : it.status) + '</p>' +
      '<small class="muted" style="font-size:.74rem;overflow-wrap:anywhere">' + (it.srcW ? it.srcW + "×" + it.srcH + " → " + (it.base ? it.base.width + "×" + it.base.height : "") + " px · " : "") + esc(it.file.name) + '</small><small class="muted" style="font-size:.74rem">Tap the picture to check the watermark.</small></div></div>' +
      '<div class="u-row"><label class="u-f"><span class="u-lbl">Code</span><input type="text" class="u-code' + (codeProblem(it) ? " bad" : "") + '" data-f="code" value="' + esc(it.code) + '" aria-label="Design code" autocapitalize="characters"></label><label class="u-f"><span class="u-lbl">Name</span><input type="text" data-f="name" value="' + esc(it.name) + '" placeholder="e.g. Surya Chariot" maxlength="40" aria-label="Design name"></label></div>' +
      '<div><p class="u-lbl">Tags <small>hidden from customers · used by search · ' + it.tags.length + '/' + MIN_TAGS + '+</small></p><div class="u-tags">' +
      it.tags.map(function (t, i) { return '<span class="u-tag">' + esc(t) + '<button type="button" data-rmtag="' + i + '" aria-label="Remove ' + esc(t) + '">×</button></span>'; }).join("") +
      '<input type="text" class="u-add" data-f="addtag" placeholder="+ add tag" enterkeyhint="done" aria-label="Add a tag"></div></div>' +
      '<div><p class="u-lbl">Rooms it suits</p>' + chipRow(A.ROOMS, it.spaces, "spaces") + '</div>' +
      '<div><p class="u-lbl">Style</p>' + chipRow(A.styleList(it.styles), it.styles, "styles") + '<input type="text" class="u-own" data-f="ownstyle" placeholder="+ type your own style" maxlength="24" enterkeyhint="done" aria-label="Add your own style"></div>' +
      '<details><summary>Also found by these search words (' + it.search.length + ')</summary><textarea data-f="search" aria-label="Search words">' + esc(it.search.join(", ")) + '</textarea><small class="muted" style="font-size:.74rem">Other ways customers may type it: Hindi, Kannada, Telugu, misspellings. Comma separated.</small></details>' +
      (window.WBOriginals ? '<label class="switch u-keep" style="font-size:.84rem"><input type="checkbox" data-f="keep"' + (it.keepOrig ? " checked" : "") + '> Save original to Drive <span class="muted" style="font-weight:400">· ' +
        (it.srcW ? it.srcW + "×" + it.srcH + " px · " : "") + WBOriginals.mb(it.file.size) + (it.lowRes ? " · smaller than the website picture, not needed" : "") + '</span></label>' : "") +
      '<button type="button" class="u-rm">Remove this photo</button>';
    paint(it);
    if (focus) { var f = $('[data-f="' + focus + '"]', it.el); if (f) { f.focus(); if (f.setSelectionRange && f.value) f.setSelectionRange(f.value.length, f.value.length); } }
    wire(it); update();
  }
  function addTag(it, v) {
    clean(v.split(",")).forEach(function (t) { if (it.tags.indexOf(t) < 0) it.tags.push(t); });
  }
  function wire(it) {
    var el = it.el;
    $(".u-thumb", el).onclick = function () { if (!it.base) return; var c = watermarked(it); zoom.innerHTML = ""; zoom.appendChild(c); zoom.showModal(); };
    $('[data-f="code"]', el).oninput = function () { it.code = this.value.toUpperCase().replace(/\s/g, ""); this.classList.toggle("bad", !!codeProblem(it)); };
    $('[data-f="code"]', el).onchange = function () { this.value = it.code; check(it); renderItem(it); items.forEach(function (o) { if (o !== it) { check(o); renderItem(o); } }); };
    $('[data-f="name"]', el).oninput = function () { it.name = this.value; };
    $('[data-f="name"]', el).onchange = function () { check(it); renderItem(it); };
    var add = $('[data-f="addtag"]', el);
    add.onkeydown = function (e) { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (this.value.trim()) { addTag(it, this.value); this.value = ""; check(it); renderItem(it); } } };
    add.onblur = function () { if (this.value.trim()) { addTag(it, this.value); this.value = ""; check(it); renderItem(it); } };
    $$("[data-rmtag]", el).forEach(function (b) { b.onclick = function () { it.tags.splice(+b.dataset.rmtag, 1); check(it); renderItem(it); }; });
    $$(".fchip[data-k]", el).forEach(function (b) { b.onclick = function () { var arr = it[b.dataset.k], i = arr.indexOf(b.dataset.v); if (i > -1) arr.splice(i, 1); else arr.push(b.dataset.v); check(it); renderItem(it); }; });
    var own = $('[data-f="ownstyle"]', el);
    function addOwn() { var v = A.ownStyle(own.value); own.value = ""; if (v && it.styles.indexOf(v) < 0) { it.styles.push(v); check(it); renderItem(it); } }
    own.onkeydown = function (e) { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addOwn(); } };
    own.onblur = addOwn;
    $('[data-f="search"]', el).onchange = function () { it.search = clean(this.value.split(",")); };
    var keep = $('[data-f="keep"]', el); if (keep) keep.onchange = function () { it.keepOrig = this.checked; it.keepTouched = true; };
    $(".u-rm", el).onclick = function () { items.splice(items.indexOf(it), 1); el.remove(); items.forEach(function (o) { check(o); renderItem(o); }); update(); };
  }
  function update() {
    var ready = items.filter(function (it) { return it.base && check(it); }).length, busy = items.filter(function (it) { return !it.broken && (!it.base || it.state === "ai"); }).length;
    var waiting = items.filter(function (it) { return it.state === "ai" && it.base; }).length;
    $("#u-skipall-row").hidden = waiting < 2;
    $("#u-pick").hidden = items.length >= MAX;
    $("#u-count").textContent = items.length ? ready + " of " + items.length + " ready" + (busy ? " · " + (waiting ? "Claude working on " + waiting : "preparing " + busy) : "") : "";
    var b = $("#u-save"); b.disabled = !items.length || ready !== items.filter(function (it) { return !it.broken; }).length || busy > 0;
    b.textContent = items.length > 1 ? "Save " + items.length + " and publish" : "Save and publish";
  }
  $("#u-skipall").onclick = function () { items.slice().forEach(skipAI); };
  $("#u-file").onchange = function () { addFiles(this.files); this.value = ""; };
  var drop = $("#u-pick .drop");
  ["dragover", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); if (ev === "drop") addFiles(e.dataTransfer.files); }); });

  /* ---------- save ---------- */
  $("#u-save").onclick = function () {
    var ok = items.filter(function (it) { return !it.broken; });
    if (!ok.every(check)) { A.toast("Finish the highlighted photos first"); ok.forEach(renderItem); return; }
    var btn = this; btn.disabled = true; btn.textContent = "Saving…";
    var month = new Date().toISOString().slice(0, 7), stamp = Date.now().toString(36);
    Promise.all(ok.map(function (it) {
      var ref = it.code.toLowerCase() + "-" + stamp, data = watermarked(it).toDataURL("image/jpeg", 0.86);
      return IDB.put(ref, data).then(function () {
        return Object.assign(it.keepOrig === false && window.WBOriginals ? { noOrig: true } : {}, { code: it.code, name: A.niceName(it.name), img: "idb:" + ref, tags: it.tags.slice(), search: it.search.slice(), spaces: it.spaces.slice(), styles: it.styles.slice(), orient: it.orient, added: month, pop: 5 });
      });
    })).then(function (list) {
      var db = A.db();
      list.forEach(function (d) { db.designs.push(d); A.noteCode(d.code); });
      var first = !db.settings.samplesRetired;
      db.settings.samplesRetired = true;                 // the first real upload retires the drawn samples
      if (!A.save()) throw new Error("Could not save the draft on this device");
      dlg.close(); A.renderDesigns();
      if (window.WBOrigUI) WBOrigUI.uploaded(ok.filter(function (it) { return it.keepOrig !== false; }).map(function (it) { return { code: it.code, name: A.niceName(it.name), file: it.file }; }));   // the untouched originals go to Drive
      A.autoPublish("Saved " + list.length + (list.length > 1 ? " designs" : " design") + (first ? " (sample designs will be hidden)" : ""));
    }).catch(function (e) { A.toast(e.message, "error"); btn.disabled = false; update(); });
  };

  /* ---------- AI key in Settings ---------- */
  var keyCard = document.createElement("div");
  keyCard.className = "card";
  keyCard.innerHTML = '<h2>AI tagging key</h2><p class="sub" style="margin-top:0" id="ai-state"></p>' +
    '<ol class="muted" style="font-size:.84rem;margin:0 0 10px;padding-left:18px;display:grid;gap:3px"><li>Sign in at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com → API keys</a> and create a key</li><li>Under Billing, add a small amount and set a monthly limit (for example $5). One photo costs well under ₹1</li><li>Paste the key here. It stays on this device only</li></ol>' +
    '<div class="btn-row" style="display:flex;gap:8px;flex-wrap:wrap"><input type="password" id="ai-key-in" placeholder="sk-ant-…" autocomplete="off" style="flex:1;min-width:200px"><button class="btn btn-ghost btn-xs" type="button" id="ai-key-save">Save key</button><button class="btn btn-ghost btn-xs" type="button" id="ai-key-del">Remove</button></div>';
  var settingsPane = $('[data-pane="settings"]');
  if (settingsPane) { var grids = $$(".grid-2", settingsPane); (grids[grids.length - 1] || settingsPane).appendChild(keyCard); }
  function showAi() { var e = $("#ai-state"); if (e) e.textContent = aiKey() ? "Added on this device. New uploads get AI tag suggestions (model: " + AI_MODEL + ")." : "Not added. Uploads work, but you type the tags yourself."; }
  showAi();
  /* saving a key also tests it with a tiny request, so problems show up here and not mid-upload */
  function testAi() {
    var e = $("#ai-state"); if (!aiKey()) return;
    var w = WB.waiting(e, "save"); w.step("Checking the key with Claude…");
    aiPost({ max_tokens: 5, messages: [{ role: "user", content: "Reply with OK" }] })
      .then(function () { w.stop(); showAi(); e.textContent = "✓ Working. " + e.textContent; A.toast("AI key works ✓"); })
      .catch(function (err) { w.stop(); e.textContent = "⚠ " + err.message; A.toast(err.message, "error"); });
  }
  $("#ai-key-save").onclick = function () { var v = $("#ai-key-in").value.trim(); if (!/^sk-ant-/.test(v)) { A.toast("That doesn't look like an Anthropic key (starts with sk-ant-)"); return; } setAiKey(v); $("#ai-key-in").value = ""; showAi(); testAi(); };
  var tb = document.createElement("button"); tb.type = "button"; tb.className = "btn btn-ghost btn-xs"; tb.textContent = "Test key"; tb.onclick = testAi;
  $("#ai-key-del").parentNode.insertBefore(tb, $("#ai-key-del"));
  $("#ai-key-del").onclick = function () { setAiKey(""); showAi(); A.toast("AI key removed from this device"); };

  window.WBUpload = { open: open, _items: function () { return items; } };
})();
