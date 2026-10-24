/* WallBliss admin — Publish to the live website.
   Saves in the admin are drafts in this browser. "Publish" sends the draft to GitHub as ONE
   commit: uploaded photos become image files, and assets/published.js holds the data.
   GitHub Pages rebuilds the site in about a minute.
   Publishing needs a key: a GitHub fine-grained token with "Contents: read and write" on
   kollaanil/wallbliss-site only. It is stored in this browser only. */
(function () {
  "use strict";
  var OWNER = "kollaanil", REPO = "wallbliss-site", BRANCH = "main", API = "https://api.github.com";
  var KEYNAME = "wb_publish_key";
  function key() { try { return localStorage.getItem(KEYNAME) || ""; } catch (e) { return ""; } }
  function setKey(k) { try { k ? localStorage.setItem(KEYNAME, k) : localStorage.removeItem(KEYNAME); } catch (e) {} }

  /* ---------- UI ---------- */
  var css = document.createElement("style");
  css.textContent =
    ".pub{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:70;display:flex;align-items:center;gap:12px;" +
    "padding:8px 8px 8px 18px;border-radius:999px;background:rgba(36,27,20,.94);color:#fff;font:500 .92rem/1.2 var(--font-body,system-ui);box-shadow:0 18px 40px -12px rgba(36,27,20,.5);max-width:calc(100vw - 24px)}" +
    ".pub[hidden]{display:none}.pub .dot{width:8px;height:8px;border-radius:50%;background:#E9A23B;flex:none}.pub.ok .dot{background:#3DD6A0}" +
    ".pub .msg{min-width:0}.pub .wb-spin{color:#3DD6A0}.pub .wb-bar{background:rgba(255,255,255,.18)}.pub .wb-bar i{background:#3DD6A0}.pub button{border:0;border-radius:999px;padding:10px 16px;font:700 .9rem var(--font-body,system-ui);cursor:pointer;background:#fff;color:#241B14;white-space:nowrap}" +
    ".pub button.ghost{background:transparent;color:#fff;opacity:.8;padding:10px 8px}.pub button:disabled{opacity:.6;cursor:wait}" +
    ".pubk{border:0;border-radius:24px;padding:0;max-width:520px;width:calc(100vw - 32px);box-shadow:0 40px 80px -24px rgba(36,27,20,.4)}" +
    ".pubk::backdrop{background:rgba(36,27,20,.45)}.pubk form{display:grid;gap:14px;padding:24px}.pubk h2{margin:0;font-family:var(--font-display,Georgia);font-size:1.4rem}" +
    ".pubk ol{margin:0;padding-left:20px;color:#6B5E53;font-size:.92rem;display:grid;gap:4px}.pubk .row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}" +
    ".pubk input{width:100%;font:500 .95rem ui-monospace,monospace;padding:12px;border-radius:12px;border:1px solid rgba(70,45,20,.2)}.pubk .err{color:#C53030;font-size:.88rem;margin:0}";
  document.head.appendChild(css);

  var bar = document.createElement("div");
  bar.className = "pub"; bar.hidden = true; bar.setAttribute("role", "status");
  bar.innerHTML = '<span class="dot"></span><span class="msg">Unpublished changes</span><button type="button" class="ghost" data-act="discard">Undo all</button><button type="button" data-act="publish">Publish</button>';
  document.body.appendChild(bar);
  var msg = bar.querySelector(".msg"), pubBtn = bar.querySelector('[data-act="publish"]');
  /* status text: plain (say) or the shared waiting line with rotating messages (work) — see assets/ui.js */
  var waitLine = null;
  function say(t) { if (waitLine) { waitLine.stop(); waitLine = null; } msg.textContent = t; }
  function work(step) { if (!waitLine) waitLine = WB.waiting ? WB.waiting(msg, "publish") : null; if (waitLine) waitLine.step(step || null); else msg.textContent = step || "Publishing…"; }

  var dlg = document.createElement("dialog");
  dlg.className = "pubk";
  dlg.innerHTML = '<form method="dialog"><h2>Add the publishing key</h2>' +
    '<p style="margin:0;color:#6B5E53">Only a device with this key can change the live website. You do this once per phone or laptop.</p>' +
    '<ol><li>On GitHub, open <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Settings → Developer settings → Fine-grained tokens → Generate new token</a></li>' +
    '<li>Repository access: <b>Only select repositories → ' + REPO + '</b></li>' +
    '<li>Permissions → Repository → <b>Contents: Read and write</b>. Expiry: 1 year</li>' +
    '<li>Generate, copy the token and paste it below</li></ol>' +
    '<input type="password" id="pubk-in" autocomplete="off" spellcheck="false" placeholder="github_pat_…" aria-label="Publishing key">' +
    '<p class="err" id="pubk-err" hidden></p>' +
    '<div class="row"><button type="button" class="btn btn-ghost" value="cancel" id="pubk-cancel">Cancel</button><button type="button" class="btn btn-wa" id="pubk-save" style="background:#241B14;box-shadow:none">Save key and publish</button></div></form>';
  document.body.appendChild(dlg);

  /* ---------- dirty check ---------- */
  function stable(o) { return JSON.stringify(o, Object.keys(o || {}).sort()); }
  function dirty() {
    var a = WB.db.load(), b = WB.db.published();
    return ["designs", "edits", "projects", "reviews", "settings", "faqs"].some(function (k) { return JSON.stringify(a[k]) !== JSON.stringify(b[k]); });
  }
  var busy = false, lastOk = 0, again = false, autoT = null;
  function done() { busy = false; if (again) { again = false; auto(); } }
  /* publish by itself after a save (designs), so nobody has to remember the Publish button.
     Several quick changes are sent together; a change made while publishing goes in the next round. */
  function auto() {
    clearTimeout(autoT);
    autoT = setTimeout(function () {
      if (busy) { again = true; return; }
      if (!dirty()) return;
      var k = key(); if (!k) { askKey("Add the publishing key once on this phone or laptop. After that, saved designs go live by themselves."); return; }
      publish(k);
    }, 700);
  }
  function refresh() {
    if (busy) return;
    var app = document.getElementById("app"); if (!app || app.hidden) { bar.hidden = true; return; }
    if (dirty()) { bar.hidden = false; bar.classList.remove("ok"); say("Unpublished changes"); bar.querySelector('[data-act="discard"]').hidden = false; pubBtn.hidden = false; }
    else if (Date.now() - lastOk < 12000) { bar.hidden = false; bar.classList.add("ok"); bar.querySelector('[data-act="discard"]').hidden = true; pubBtn.hidden = true; }
    else bar.hidden = true;
  }
  setInterval(refresh, 1500); refresh();

  /* ---------- stay in step with other devices and other tabs ----------
     • Another admin tab in this browser saved → this tab reloads (so it never overwrites that tab's work).
     • Coming back to this tab, and every 2 minutes: if someone published from another device, this browser
       catches up (WB.db.catchUp merges any edits made here) and reloads.
     A reload waits while a form is open or a publish is running. */
  var LOADED = Date.now(), reloadWanted = false;
  function formOpen() { return !!document.querySelector("dialog[open]"); }
  function reloadSoon() { reloadWanted = true; if (!busy && !formOpen()) location.reload(); }
  setInterval(function () { if (reloadWanted && !busy && !formOpen()) location.reload(); }, 2000);
  addEventListener("storage", function (e) {
    if (e.key !== "wb_admin_db" && e.key !== "wb_admin_base") return;
    if (e.key === "wb_admin_base") { try { if ((JSON.parse(e.oldValue || "{}").updated || "") === (JSON.parse(e.newValue || "{}").updated || "")) return; } catch (x) {} }
    if (!reloadWanted) WB.notify("Changed in another admin tab. Refreshing this one…");
    reloadSoon();
  });
  function checkLive() {
    if (document.hidden || busy || reloadWanted) return;
    fetch("assets/published.js?t=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (txt) {
      if (!txt) return;
      var d = JSON.parse(txt.replace(/^[\s\S]*?window\.WB_PUBLISHED\s*=\s*/, "").replace(/;\s*$/, ""));
      if (WB.db.catchUp(d)) reloadSoon();
    }).catch(function () {});
  }
  document.addEventListener("visibilitychange", checkLive);
  setInterval(checkLive, 120000);
  try {
    var sn = JSON.parse(sessionStorage.getItem("wb_sync_note") || "null"); sessionStorage.removeItem("wb_sync_note");
    if (sn) WB.notify("Updated with " + sn.by + "'s latest changes" + (sn.merged ? "; your unpublished edits are kept" : "") + (sn.clashes && sn.clashes.length ? " (you both changed " + sn.clashes.slice(0, 3).join(", ") + ")" : "") + ".", { ms: 6000 });
  } catch (e) {}

  /* an admin tab opened before the latest website update runs old code: ask for a refresh before publishing */
  function freshCode(k) {
    return gh("/repos/" + OWNER + "/" + REPO + "/commits?sha=" + BRANCH + "&per_page=30", null, k).then(function (list) {
      var c = (list || []).filter(function (x) { return !/^Publish from admin/.test(x.commit.message); })[0];
      if (c && new Date(c.commit.committer.date).getTime() > LOADED - 90000) throw new Error("OLDADMIN");
    });
  }

  /* ---------- GitHub ---------- */
  function gh(path, opts, k) {
    opts = opts || {};
    return fetch(API + path, {
      method: opts.method || "GET", cache: "no-store",            // never reuse an old answer about the latest commit
      headers: { "Authorization": "Bearer " + k, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      if (r.status === 401) throw new Error("The key was not accepted. Check it was copied fully, or make a new one.");
      if (r.status === 403 || r.status === 404) throw new Error("The key has no write access to " + REPO + ". Set Contents: Read and write for that repository.");
      if (!r.ok) return r.text().then(function (t) { throw new Error("GitHub said: " + r.status + " " + t.slice(0, 120)); });
      return r.status === 204 ? null : r.json();
    });
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i += 7) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function slug(s) { return String(s || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "item"; }

  /* ---------- two editors, one website ----------
     Before publishing, read what is live on GitHub right now. If someone else published since this
     device's draft started, combine both: their changes are kept, and this device's changes are added
     on top. If both changed the same item, this device's version wins and the message says so. */
  function liveData(k) {
    return gh("/repos/" + OWNER + "/" + REPO + "/contents/assets/published.js?ref=" + BRANCH, null, k).then(function (f) {
      var txt = decodeURIComponent(escape(atob(String(f.content || "").replace(/\s/g, ""))));
      var json = txt.replace(/^[\s\S]*?window\.WB_PUBLISHED\s*=\s*/, "").replace(/;\s*$/, "");
      var d = JSON.parse(json); ["designs", "projects", "reviews", "faqs"].forEach(function (x) { d[x] = d[x] || []; }); d.edits = d.edits || {}; d.settings = d.settings || {};
      return d;
    });
  }
  /* the three-way merge (base / this device / live) lives in live.js: WB.mergeDrafts */
  function merge(base, mine, theirs) { return WB.mergeDrafts(base, mine, theirs); }

  function publish(k, attempt) {
    attempt = attempt || 1;
    busy = true; pubBtn.disabled = true; work(); bar.classList.remove("ok");
    var note = "", liveOg = {};
    return freshCode(k).then(function () { return liveData(k); }).then(function (live) {
      liveOg = live.og || {};
      var base = WB.db.base(), draft = WB.db.load();
      if ((live.updated || null) !== (base.updated || null)) {
        var m = merge(base, draft, live);
        WB.db.save(Object.assign(draft, m.data)); WB.db.setBase(live);
        note = " Also kept " + (live.by || "the team") + "'s changes published " + (live.updated ? new Date(live.updated).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "earlier") + "." +
          (m.clashes.length ? " You both changed " + m.clashes.slice(0, 3).join(", ") + (m.clashes.length > 3 ? "…" : "") + "; your version was used." : "");
      }
      return go();
    }).catch(function (e) {
      done(); pubBtn.disabled = false; say("Not published");
      if (e.message === "OLDADMIN") { WB.notify("The admin was updated. Refresh this page, then publish (your changes are kept).", { type: "error", action: { label: "Refresh", fn: function () { location.reload(); } } }); return; }
      if (/key/.test(e.message)) askKey(e.message); else alertMsg(e.message);
    });

    function go() {
    work();
    var draft = WB.db.load(), files = [], usedRefs = [];
    /* images saved by the uploader live in this browser's image store ("idb:…"); fetch them first */
    var refs = [];
    draft.designs.forEach(function (d) { if (/^idb:/.test(d.img || "")) refs.push([d, "img"]); });
    draft.projects.forEach(function (p) { ["before", "after"].forEach(function (k) { if (/^idb:/.test(p[k] || "")) refs.push([p, k]); }); });
    var R = window.WBImages;
    return Promise.all(refs.map(function (r) { usedRefs.push(r[0][r[1]]); return R.resolve(r[0][r[1]]).then(function (u) { if (!u) throw new Error("A photo for " + (r[0].code || r[0].title || "an item") + " is missing on this device. Upload it again."); r[0][r[1]] = u; }); }))
      .then(function () { return build(); })
      .catch(function (e) { done(); pubBtn.disabled = false; say("Not published"); alertMsg(e.message); });
    function build() {
    function take(dataUrl, path) {
      var m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl || ""); if (!m) return dataUrl;
      var ext = m[1] === "jpeg" ? "jpg" : m[1], p = path + "-" + hash(m[2]) + "." + ext;
      files.push({ path: p, content: m[2], encoding: "base64" }); return p;
    }
    var out = JSON.parse(JSON.stringify(draft)), srcImg = {};
    out.designs.forEach(function (d) { srcImg[d.code] = d.img; d.img = take(d.img, "assets/uploads/designs/" + slug(d.code)); });
    out.projects.forEach(function (p) { var s = slug(p.slug || p.title); p.before = take(p.before, "assets/uploads/projects/" + s + "-before"); p.after = take(p.after, "assets/uploads/projects/" + s + "-after"); });
    var data = { designs: out.designs, edits: out.edits, projects: out.projects, reviews: out.reviews, settings: out.settings, faqs: out.faqs || [], updated: new Date().toISOString(),
      by: ((document.getElementById("who-nm") || {}).textContent || "").trim() };
    var gone = [];
    return sharePages(out, srcImg, liveOg, k).then(function (sh) {
      files = files.concat(sh.files); gone = sh.gone; data.og = sh.og;
      files.push({ path: "assets/published.js", content: "/* Written by the admin Publish button. Do not edit by hand. */\nwindow.WB_PUBLISHED = " + JSON.stringify(data, null, 1) + ";\n", encoding: "utf-8" });
      return push();
    });
    function push() {
    var headSha, treeSha;
    return gh("/repos/" + OWNER + "/" + REPO + "/git/ref/heads/" + BRANCH, null, k)
      .then(function (ref) { headSha = ref.object.sha; return gh("/repos/" + OWNER + "/" + REPO + "/git/commits/" + headSha, null, k); })
      .then(function (c) {
        treeSha = c.tree.sha;
        return files.reduce(function (p, f) {
          return p.then(function (acc) {
            if (files.length > 1) { work("Uploading " + (/\.(jpe?g|png|webp)$/.test(f.path) ? "photo" : "file") + " " + (acc.length + 1) + " of " + files.length + "…"); if (waitLine) waitLine.progress(acc.length, files.length); }
            return gh("/repos/" + OWNER + "/" + REPO + "/git/blobs", { method: "POST", body: { content: f.content, encoding: f.encoding } }, k)
              .then(function (b) { acc.push({ path: f.path, mode: "100644", type: "blob", sha: b.sha }); return acc; });
          });
        }, Promise.resolve([]));
      })
      .then(function (tree) {
        if (waitLine) { waitLine.progress(1, 1); work(null); }
        gone.forEach(function (p) { tree.push({ path: p, mode: "100644", type: "blob", sha: null }); });   // old preview cards
        return gh("/repos/" + OWNER + "/" + REPO + "/git/trees", { method: "POST", body: { base_tree: treeSha, tree: tree } }, k); })
      .then(function (t) {
        var who = (document.getElementById("who-nm") || {}).textContent || "admin";
        return gh("/repos/" + OWNER + "/" + REPO + "/git/commits", { method: "POST", body: { message: "Publish from admin (" + who + ")", tree: t.sha, parents: [headSha] } }, k);
      })
      .then(function (c) { return gh("/repos/" + OWNER + "/" + REPO + "/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha: c.sha } }, k); })
      .then(function () {
        window.WB_PUBLISHED = data;                       // draft now equals what is live
        if (R) usedRefs.forEach(function (ref) { R.forget(ref); });
        WB.db.save(Object.assign(WB.db.load(), { designs: out.designs, projects: out.projects }));
        WB.db.setBase(data);
        if (window.WBAdmin && WBAdmin.reload) WBAdmin.reload();      // the open admin screens now use the published photo paths
        done(); lastOk = Date.now() + (note ? 8000 : 0); pubBtn.disabled = false;
        bar.hidden = false; bar.classList.add("ok"); say("Published. The website updates in 1–2 minutes." + note);
        bar.querySelector('[data-act="discard"]').hidden = true; pubBtn.hidden = true;
      })
      .catch(function (e) {
        /* someone (or this device a moment ago) published while this was uploading: start again on top of it */
        if (/fast forward|Reference cannot be updated|409/.test(e.message) && attempt < 4) {
          work("The website just changed. Trying again…");
          setTimeout(function () { publish(k, attempt + 1); }, 1500 * attempt); return;          // stays "busy" meanwhile, so nothing else starts
        }
        done(); pubBtn.disabled = false; say("Not published"); bar.classList.remove("ok");
        if (/key/.test(e.message)) askKey(e.message); else alertMsg(/fast forward/.test(e.message) ? "The website was busy with another update. Tap Publish again." : e.message);
      });
    }
    }
    }
  }

  /* ---------- share pages: a small page + picture card per design and per theme ----------
     So a link shared on WhatsApp shows the mural and a short write-up, not a bare address.
     wallbliss.in/d/WB-0157/  → that design      wallbliss.in/t/srinivasa-kalyanam/ → that theme
     Only new or changed ones are made; "og" in published.js remembers what exists. */
  var SITE = "https://www.wallbliss.in/";
  function escH(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pageHTML(o) {
    return '<!doctype html>\n<html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      "<title>" + escH(o.title) + " | WallBliss Studio</title>\n" +
      '<meta name="description" content="' + escH(o.desc) + '">\n<meta name="robots" content="noindex, follow">\n' +
      '<meta property="og:type" content="website">\n<meta property="og:site_name" content="WallBliss Studio">\n<meta property="og:locale" content="en_IN">\n' +
      '<meta property="og:title" content="' + escH(o.title) + '">\n<meta property="og:description" content="' + escH(o.desc) + '">\n' +
      '<meta property="og:url" content="' + SITE + o.path + '">\n<meta property="og:image" content="' + SITE + o.card + '">\n' +
      '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta property="og:image:alt" content="' + escH(o.title) + '">\n' +
      '<meta name="twitter:card" content="summary_large_image">\n' +
      '<link rel="canonical" href="' + SITE + 'catalogue.html">\n<meta http-equiv="refresh" content="0; url=' + escH(o.go) + '">\n' +
      '<script>location.replace(' + JSON.stringify(o.go) + ');</script>\n</head><body style="font-family:system-ui;background:#FBF6EE;color:#241B14;padding:24px">' +
      '<p><a href="' + escH(o.go) + '">' + escH(o.title) + " · WallBliss Studio</a></p></body></html>\n";
  }
  function loadImg(src) {
    return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; });
  }
  var logoP = null;
  function logo() { return logoP || (logoP = loadImg("assets/img/mark.png")); }
  function fontsReady() {
    try { return Promise.all([document.fonts.load('700 40px "Playfair Display"'), document.fonts.load('700 24px "DM Sans"')]).catch(function () {}); } catch (e) { return Promise.resolve(); }
  }
  function blurFill(x, im, W, H) {                    // soft backdrop: tiny copy scaled up (works in every browser)
    var t = document.createElement("canvas"), tw = 24, th = Math.max(1, Math.round(24 * H / W)); t.width = tw; t.height = th;
    var c = t.getContext("2d"), s = Math.max(tw / im.naturalWidth, th / im.naturalHeight);
    c.drawImage(im, (tw - im.naturalWidth * s) / 2, (th - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
    x.imageSmoothingQuality = "high"; x.drawImage(t, 0, 0, W, H);
  }
  function fit(im, bx, by, bw, bh) { var s = Math.min(bw / im.naturalWidth, bh / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s; return [bx + (bw - w) / 2, by + (bh - h) / 2, w, h]; }
  function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
  function badge(x, lg, W, H) {                        // "WallBliss Studio · wallbliss.in" pill, bottom left
    x.font = '700 22px "DM Sans", system-ui, sans-serif';
    var label = "WallBliss Studio · wallbliss.in", tw = x.measureText(label).width, w = tw + (lg ? 78 : 36), X = 28, Y = H - 28 - 52;
    x.save(); x.shadowColor = "rgba(0,0,0,.25)"; x.shadowBlur = 16; x.fillStyle = "rgba(255,253,249,.96)"; rr(x, X, Y, w, 52, 26); x.fill(); x.restore();
    if (lg) x.drawImage(lg, X + 14, Y + 9, 50, 34);
    x.fillStyle = "#241B14"; x.textBaseline = "middle"; x.fillText(label, X + (lg ? 70 : 18), Y + 27);
  }
  function chip(x, text, W) {
    x.font = '700 24px "DM Sans", system-ui, sans-serif';
    var w = x.measureText(text).width + 32, X = W - 28 - w, Y = 28;
    x.fillStyle = "rgba(36,27,20,.82)"; rr(x, X, Y, w, 46, 23); x.fill();
    x.fillStyle = "#fff"; x.textBaseline = "middle"; x.fillText(text, X + 16, Y + 24);
  }
  function designCard(src, code) {
    return Promise.all([loadImg(src), logo(), fontsReady()]).then(function (r) {
      var im = r[0], lg = r[1]; if (!im) return null;
      var W = 1200, H = 630, c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d");
      x.fillStyle = "#EFE7DA"; x.fillRect(0, 0, W, H); blurFill(x, im, W, H);
      x.fillStyle = "rgba(36,27,20,.18)"; x.fillRect(0, 0, W, H);
      var b = fit(im, 40, 34, W - 80, H - 68);
      x.save(); x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = 30; x.shadowOffsetY = 10; x.fillStyle = "#fff"; x.fillRect(b[0], b[1], b[2], b[3]); x.restore();
      x.drawImage(im, b[0], b[1], b[2], b[3]);
      badge(x, lg, W, H); chip(x, code, W);
      return c.toDataURL("image/jpeg", 0.82).split(",")[1];
    });
  }
  /* opt.sub = the small line under the title; opt.trim[i] = cut the "WallBliss Studio · WB-xxxx" corner badge off
     picture i (the bottom 6.8% of the long side, see watermark.js), so marketing cards never show design codes */
  function themeCard(srcs, name, opt) {
    opt = opt || {};
    return Promise.all([Promise.all(srcs.slice(0, 4).map(loadImg)), logo(), fontsReady()]).then(function (r) {
      var lg = r[1], keep = [], trims = [];
      r[0].forEach(function (im, i) { if (im) { keep.push(im); trims.push(!!(opt.trim && opt.trim[i])); } });
      var ims = keep; if (!ims.length) return null;
      var sh = ims.map(function (im, i) { return trims[i] ? Math.max(1, im.naturalHeight - Math.round(Math.max(im.naturalWidth, im.naturalHeight) * 0.068)) : im.naturalHeight; });
      var W = 1200, H = 630, c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d");
      x.fillStyle = "#FBF6EE"; x.fillRect(0, 0, W, H);
      /* lay the designs out whole, each at its own shape: one row, or two rows when they are wide */
      var gap = 14, top = 30, boxH = 430, boxW = W - 60, ars = ims.map(function (im, i) { return im.naturalWidth / sh[i]; });
      function rowsFor(groups) {
        var rh = (boxH - gap * (groups.length - 1)) / groups.length, out = [], area = 0;
        groups.forEach(function (g) {
          var sum = g.reduce(function (a, i) { return a + ars[i]; }, 0), h = Math.min(rh, (boxW - gap * (g.length - 1)) / sum);
          out.push({ g: g, h: h, w: sum * h + gap * (g.length - 1) }); area += sum * h * h;
        });
        return { rows: out, area: area };
      }
      var idx = ims.map(function (im, i) { return i; }), one = rowsFor([idx]), best = one;
      if (ims.length >= 3) { var half = Math.ceil(ims.length / 2), two = rowsFor([idx.slice(0, half), idx.slice(half)]); if (two.area > one.area) best = two; }
      var totalH = best.rows.reduce(function (a, r) { return a + r.h; }, 0) + gap * (best.rows.length - 1), Y = top + (boxH - totalH) / 2;
      best.rows.forEach(function (r) {
        var X = (W - r.w) / 2;
        r.g.forEach(function (i) {
          var im = ims[i], tw = ars[i] * r.h;
          x.save(); x.shadowColor = "rgba(36,27,20,.35)"; x.shadowBlur = 24; x.shadowOffsetY = 10; x.fillStyle = "#fff"; rr(x, X, Y, tw, r.h, 12); x.fill(); x.restore();
          x.save(); rr(x, X, Y, tw, r.h, 12); x.clip(); x.drawImage(im, 0, 0, im.naturalWidth, sh[i], X, Y, tw, r.h); x.restore();
          X += tw + gap;
        });
        Y += r.h + gap;
      });
      x.fillStyle = "#241B14"; x.textBaseline = "alphabetic"; x.font = '700 50px "Playfair Display", Georgia, serif';
      var title = name; while (x.measureText(title).width > W - 420 && title.length > 4) title = title.slice(0, -2) + "…";
      x.fillText(title, 34, H - 64);
      x.font = '500 24px "DM Sans", system-ui, sans-serif'; x.fillStyle = "#6B5E53";
      var line = opt.sub || (srcs.length + " " + (srcs.length === 1 ? "design" : "designs") + " · printed straight onto your wall");
      while (x.measureText(line).width > W - 240 && line.length > 4) line = line.slice(0, -2) + "…";
      x.fillText(line, 36, H - 26);
      if (lg) x.drawImage(lg, W - 30 - 120, H - 30 - 81, 120, 81);
      return c.toDataURL("image/jpeg", 0.82).split(",")[1];
    });
  }

  function sharePages(out, srcImg, liveOg, k) {
    var og = JSON.parse(JSON.stringify(liveOg || {})), add = [], gone = [], jobs = [];
    var live = out.designs.filter(function (d) { return !d.hidden && d.img; });
    var A = window.WBAdmin;
    var have = {};                                      // files already on the website (filled only when cards are needed)
    function want(key, sig, path, title, desc, go, make) {
      var cur = og[key]; if (cur && cur.sig === sig) return;
      jobs.push(function () {
        var card = path + "card-" + sig + ".jpg";
        if (have[card] && have[path + "index.html"]) { og[key] = { sig: sig, card: card }; return Promise.resolve(); }   // already there: nothing to make or upload
        return make().then(function (b64) {
          if (!b64) return;
          if (cur && cur.card && cur.card !== card) gone.push(cur.card);
          add.push({ path: card, content: b64, encoding: "base64" });
          add.push({ path: path + "index.html", content: pageHTML({ path: path, card: card, title: title, desc: desc, go: go }), encoding: "utf-8" });
          og[key] = { sig: sig, card: card };
        }).catch(function () {});
      });
    }
    live.forEach(function (d) {
      var path = "d/" + d.code + "/";
      var nm = A && A.niceName ? A.niceName(d.name) : d.name;
      want("d:" + d.code, hash(d.code + "|" + nm + "|" + d.img + "|v1"), path, nm + " · " + d.code,
        "A WallBliss mural, printed straight onto your wall. Tap to see it full size and get a price on WhatsApp.",
        "/catalogue.html?src=share#" + d.code, function () { return designCard(srcImg[d.code] || d.img, d.code); });
    });
    var themes = (out.settings && out.settings.themes) || [];
    themes.forEach(function (t) {
      if (!A || !A.themeDesigns) return;
      var q = t.q || t.name, list = A.themeDesigns(q, live), slugT = A.slugify(t.name), path = "t/" + slugT + "/";
      if (!list.length) return;
      var n = list.length;
      want("t:" + slugT, hash(t.name + "|" + q + "|" + list.map(function (d) { return d.code + d.img; }).join(",") + "|v1"), path, t.name + " wall murals · WallBliss",
        n + (n === 1 ? " design" : " designs") + " to choose from, printed straight onto your wall. Tap to browse and get a price on WhatsApp.",
        "/catalogue.html?src=share&q=" + encodeURIComponent(q), function () { return themeCard(list.map(function (d) { return srcImg[d.code] || d.img; }), t.name); });
    });
    /* the link previews of the main pages (Admin → Homepage → WhatsApp link previews): a new card,
       and the page's og:image / og:title / og:description tags updated to match */
    var share = (out.settings && out.settings.share) || {}, PAGES = { catalogue: "catalogue.html", home: "index.html", projects: "projects.html" };
    Object.keys(PAGES).forEach(function (pg) {
      var s = share[pg]; if (!s || !(s.pics || []).length || !k) return;
      var items = s.pics.map(function (ref) {
        if (/^p:/.test(ref)) { var p = out.projects.filter(function (x) { return x.slug === ref.slice(2); })[0]; return p && p.after && !/^data:/.test(p.after) ? { src: p.after, trim: false } : null; }
        var d = live.filter(function (x) { return x.code === ref; })[0]; return d ? { src: srcImg[d.code] || d.img, trim: true } : null;
      }).filter(Boolean);
      if (!items.length) return;
      var sig = hash(pg + "|" + s.pics.join(",") + "|" + items.map(function (i) { return String(i.src).slice(0, 200); }).join(",") + "|" + (s.title || "") + "|" + (s.sub || "") + "|v1");
      var key = "page:" + pg, cur = og[key]; if (cur && cur.sig === sig) return;
      jobs.push(function () {
        var card = "assets/img/share/" + pg + "-" + sig + ".jpg";
        return Promise.all([themeCard(items.map(function (i) { return i.src; }), s.title, { sub: s.sub, trim: items.map(function (i) { return i.trim; }) }),
          gh("/repos/" + OWNER + "/" + REPO + "/contents/" + PAGES[pg] + "?ref=" + BRANCH, null, k)]).then(function (r) {
          var b64 = r[0], html = decodeURIComponent(escape(atob(String(r[1].content || "").replace(/\s/g, ""))));
          if (!b64 || !html) return;
          function meta(prop, val) { html = html.replace(new RegExp('(<meta property="' + prop + '" content=")[^"]*(")'), function (m, a, b) { return a + escH(val) + b; }); }
          meta("og:image", SITE + card); if (s.title) meta("og:title", s.title); if (s.sub) meta("og:description", s.sub);
          if (cur && cur.card && cur.card !== card) gone.push(cur.card);
          add.push({ path: card, content: b64, encoding: "base64" });
          add.push({ path: PAGES[pg], content: html, encoding: "utf-8" });
          og[key] = { sig: sig, card: card };
        }).catch(function () {});
      });
    });
    if (!jobs.length) return Promise.resolve({ files: add, gone: gone, og: og });
    work("Making WhatsApp preview cards…");
    /* if the list of cards was ever lost, cards that already exist are reused instead of being made and uploaded again */
    var listed = k ? gh("/repos/" + OWNER + "/" + REPO + "/git/trees/" + BRANCH + "?recursive=1", null, k).then(function (t) { (t.tree || []).forEach(function (x) { have[x.path] = 1; }); }).catch(function () {}) : Promise.resolve();
    return listed.then(function () { return jobs.reduce(function (p, j) { return p.then(j); }, Promise.resolve()); }).then(function () { return { files: add, gone: gone, og: og }; });
  }
  function alertMsg(t) { WB.notify(t, { type: "error" }); }                 // errors stay until tapped

  function askKey(err) {
    var e = dlg.querySelector("#pubk-err"); e.hidden = !err; e.textContent = err || "";
    dlg.querySelector("#pubk-in").value = ""; dlg.showModal();
  }
  dlg.querySelector("#pubk-cancel").onclick = function () { dlg.close(); };
  dlg.querySelector("#pubk-save").onclick = function () {
    var k = dlg.querySelector("#pubk-in").value.trim();
    if (!/^(github_pat_|ghp_)/.test(k)) { var e = dlg.querySelector("#pubk-err"); e.hidden = false; e.textContent = "That doesn't look like a GitHub token. It starts with github_pat_"; return; }
    setKey(k); dlg.close(); publish(k);
  };
  pubBtn.onclick = function () { var k = key(); if (!k) askKey(); else publish(k); };
  bar.querySelector('[data-act="discard"]').onclick = function () {
    if (this.dataset.confirm) { WB.db.discardDraft(); location.reload(); return; }
    this.dataset.confirm = "1"; this.textContent = "Tap again to undo all"; var b = this;
    setTimeout(function () { delete b.dataset.confirm; b.textContent = "Undo all"; }, 3000);
  };

  WB.publishing = { auto: auto, hasKey: function () { return !!key(); }, forgetKey: function () { setKey(""); }, askKey: function () { askKey(); } };
})();
