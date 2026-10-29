/* WallBliss — data bridge
   PUBLIC PAGES use only what has been published (assets/published.js, written by the admin's
   Publish button as a commit to GitHub). Everyone sees the same thing.
   THE ADMIN works on a draft kept in its own browser, seeded from the published data, until
   someone presses Publish. Visitor numbers (searches, clicks, WhatsApp taps) go to Google Analytics. */
(function () {
  var WB = window.WB || (window.WB = {});
  var KEY = "wb_admin_db";
  var isAdmin = /(^|\/)admin\.html$/.test(location.pathname);
  function get(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  var RAW = window.WB_PUBLISHED || {};
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function norm(db) {
    db = db || {};
    db.designs = db.designs || []; db.edits = db.edits || {}; db.projects = db.projects || [];
    db.reviews = db.reviews || []; db.settings = db.settings || {};
    /* FAQs came later: a draft or snapshot saved before then starts from the published FAQs */
    if (!Array.isArray(db.faqs)) db.faqs = Array.isArray(RAW.faqs) ? clone(RAW.faqs) : [];
    /* "Pooja room" was retired as a room (Oct 2026): those designs count as living room */
    function noPooja(o) { if (!o || !Array.isArray(o.spaces) || o.spaces.indexOf("pooja") < 0) return; o.spaces = o.spaces.filter(function (s) { return s !== "pooja"; }); if (o.spaces.indexOf("living") < 0) o.spaces.unshift("living"); }
    db.designs.forEach(noPooja); Object.keys(db.edits).forEach(function (k) { noPooja(db.edits[k]); });
    db.projects.forEach(function (p) { if (p && p.space === "Pooja room") p.space = "Living room"; });
    return db;
  }
  var PUB = norm(JSON.parse(JSON.stringify(window.WB_PUBLISHED || {})));

  var BASE = "wb_admin_base";   // the published data this device's draft started from (for safe merging at Publish)
  /* the newest published data this browser knows: the file the site served, or what this device itself
     published a moment ago (the site takes 1–2 minutes to catch up, so its file can still be the older one) */
  function newest() { var b = get(BASE, null), r = window.WB_PUBLISHED || {}; return b && (b.updated || "") > (r.updated || "") ? b : r; }
  var PARTS = ["designs", "edits", "projects", "reviews", "settings", "faqs"];
  function sameParts(a, b) { return PARTS.every(function (k) { return JSON.stringify(a[k]) === JSON.stringify(b[k]); }); }
  WB.db = {
    published: function () { return norm(clone(newest())); },
    load: function () {
      var d = get(KEY, null);
      if (!d) { var p = this.published(), b = get(BASE, null); if (!b || b.updated !== p.updated) set(BASE, p); return p; }     // fresh draft: starts from what is live now
      return norm(d);
    },
    /* Someone published from another device (or tab) since this browser's draft started.
       No edits here → simply switch to the live data. Edits here → merge now, so only real edits stay "unpublished".
       Returns true when something changed. */
    catchUp: function (live) {
      if (!live || !live.updated) return false;
      var base = get(BASE, null), ref = base || window.WB_PUBLISHED || {};
      if ((live.updated || "") <= (ref.updated || "")) return false;
      var d = get(KEY, null), note = { by: live.by || "the team", clashes: [] };
      if (d && base) {
        var b = norm(clone(base)), mine = norm(d);
        if (sameParts(mine, b)) { try { localStorage.removeItem(KEY); } catch (e) {} }
        else { var m = WB.mergeDrafts(b, mine, norm(clone(live))); set(KEY, Object.assign(mine, m.data)); note.clashes = m.clashes; note.merged = true; }
      } else if (d) return false;                      // very old draft without a base: leave it to Publish
      set(BASE, live);
      try { sessionStorage.setItem("wb_sync_note", JSON.stringify(note)); } catch (e) {}
      return true;
    },
    save: function (db) { if (!get(BASE, null)) set(BASE, this.published()); return set(KEY, db); },
    base: function () { return norm(get(BASE, null) || this.published()); },
    setBase: function (data) { set(BASE, data); },
    discardDraft: function () { try { localStorage.removeItem(KEY); localStorage.removeItem(BASE); } catch (e) {} }
  };

  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function idOf(kind, x) { return kind === "designs" ? x.code : kind === "projects" ? x.slug : kind === "faqs" ? x.id : (x.id || (x.name + "|" + x.quote)); }
  function mergeList(kind, base, mine, theirs, clashes) {
    var B = {}, M = {}, T = {};
    base.forEach(function (x) { B[idOf(kind, x)] = x; }); mine.forEach(function (x) { M[idOf(kind, x)] = x; }); theirs.forEach(function (x) { T[idOf(kind, x)] = x; });
    var out = [], seen = {};
    mine.forEach(function (x) {
      var id = idOf(kind, x), b = B[id], t = T[id];
      if (b && !t) { if (!same(x, b)) { out.push(x); clashes.push(x.code || x.title || x.name || x.q); } seen[id] = 1; return; }   // they deleted it; keep only if I changed it
      if (b && t && !same(t, b) && !same(x, b) && !same(x, t)) clashes.push(x.code || x.title || x.name || x.q);
      out.push(b && same(x, b) && t ? t : x); seen[id] = 1;                                                         // unchanged by me → take theirs
    });
    theirs.forEach(function (t) {
      var id = idOf(kind, t); if (seen[id]) return;
      var b = B[id];
      if (b && same(t, b)) return;                                                                                      // I deleted it and they didn't touch it
      if (kind === "designs" || kind === "faqs") out.push(t); else out.unshift(t);                                                         // their new (or changed) item
    });
    /* only they re-ordered the list: keep their order */
    var ids = function (l) { return l.map(function (x) { return idOf(kind, x); }).join("|"); };
    if (ids(mine) === ids(base) && ids(theirs) !== ids(base)) {
      var pos = {}; theirs.forEach(function (x, i) { pos[idOf(kind, x)] = i; });
      out.sort(function (a, b) { var i = idOf(kind, a), j = idOf(kind, b); return (i in pos ? pos[i] : -1) - (j in pos ? pos[j] : -1); });
    }
    return out;
  }
  function mergeMap(base, mine, theirs) {
    var out = {}, keys = {};
    [base, mine, theirs].forEach(function (o) { Object.keys(o || {}).forEach(function (k) { keys[k] = 1; }); });
    Object.keys(keys).forEach(function (k) {
      var b = base[k], m = mine[k], t = theirs[k];
      var v = same(m, b) ? t : m;                                                                                       // my change wins, otherwise theirs
      if (v !== undefined) out[k] = v;
    });
    return out;
  }
  /* FAQs are an ordered list: if only the other editor re-ordered them, keep their order */
  function mergeFaqs(base, mine, theirs, clashes) {
    var out = mergeList("faqs", base, mine, theirs, clashes);
    var ids = function (l) { return l.map(function (x) { return x.id; }).join("|"); };
    if (ids(mine) === ids(base) && ids(theirs) !== ids(base)) {
      var pos = {}; theirs.forEach(function (x, i) { pos[x.id] = i; });
      out.sort(function (a, b) { return (a.id in pos ? pos[a.id] : 1e6) - (b.id in pos ? pos[b.id] : 1e6); });
    }
    return out;
  }
  /* Design codes never repeat: the highest number ever used (live designs, settings.lastCode, and every
     design that ever had a share page) + 1. Deleted designs' codes stay retired. */
  function codeNum(c) { var m = /^WB-(\d+)$/.exec(String(c || "")); return m ? +m[1] : 0; }
  function codeFloor() {
    var n = 0;
    for (var i = 0; i < arguments.length; i++) {
      var d = arguments[i] || {};
      (d.designs || []).forEach(function (x) { n = Math.max(n, codeNum(x.code)); });
      n = Math.max(n, +((d.settings || {}).lastCode) || 0);
      Object.keys(d.og || {}).forEach(function (k) { n = Math.max(n, codeNum(k.replace(/^d:/, ""))); });
    }
    return n;
  }
  WB.codeFloor = codeFloor;
  WB.codeName = function (n) { return "WB-" + String(n).padStart(4, "0"); };
  function merge(base, mine, theirs) {
    var clashes = [], recoded = [];
    /* both editors added a new design with the same code at the same time: this device's one gets the next free code */
    var B = {}, T = {}; (base.designs || []).forEach(function (d) { B[d.code] = 1; }); (theirs.designs || []).forEach(function (d) { T[d.code] = d; });
    var top = codeFloor(base, mine, theirs);
    (mine.designs || []).forEach(function (d) {
      if (!B[d.code] && T[d.code] && !same(T[d.code], d)) { var n = WB.codeName(++top); recoded.push([d.code, n]); d.code = n; }
    });
    var out = {
      designs: mergeList("designs", base.designs || [], mine.designs, theirs.designs, clashes),
      projects: mergeList("projects", base.projects || [], mine.projects, theirs.projects, clashes),
      reviews: mergeList("reviews", base.reviews || [], mine.reviews, theirs.reviews, clashes),
      faqs: mergeFaqs(base.faqs || [], mine.faqs || [], theirs.faqs || [], clashes),
      edits: mergeMap(base.edits || {}, mine.edits, theirs.edits),
      settings: mergeMap(base.settings || {}, mine.settings, theirs.settings)
    };
    out.settings.lastCode = Math.max(top, codeFloor({ designs: out.designs }));
    return { data: out, clashes: clashes, recoded: recoded };
  }

  WB.mergeDrafts = merge;

  /* the admin previews its own draft; everyone else sees the published data */
  if (isAdmin) WB.db.catchUp(RAW);
  var db = isAdmin ? WB.db.load() : PUB;

  if (WB.config) ["whatsapp", "phoneDisplay", "googleReviewsUrl", "googleWriteReviewUrl"].forEach(function (k) {
    if (db.settings[k]) WB.config[k] = db.settings[k];
  });

  if (window.WB_DESIGNS) {
    window.WB_DESIGNS_BASE = window.WB_DESIGNS_BASE || window.WB_DESIGNS.slice();
    var retired = !!db.settings.samplesRetired;          // set by the first real upload
    var base = window.WB_DESIGNS_BASE.map(function (d) {
      var e = db.edits[d.code], x = e ? Object.assign({}, d, e) : d;
      return retired && !x.img ? Object.assign({}, x, { hidden: true, sample: true }) : x;
    });
    var added = db.designs.map(function (d) { return Object.assign({ pop: 5 }, d); });
    window.WB_DESIGNS_ALL = base.concat(added);
    window.WB_DESIGNS = window.WB_DESIGNS_ALL.filter(function (d) { return !d.hidden; });
  }
  if (db.projects.length) window.WB_PROJECTS = db.projects.filter(function (p) { return !p.hidden; }).concat(window.WB_PROJECTS || []);
  window.WB_TILES = db.settings.tiles || {};          // Admin → Homepage pictures
  if (Array.isArray(RAW.faqs) || isAdmin) window.WB_FAQS = db.faqs.filter(function (f) { return f.show !== false && f.q && f.a; });
  if (db.reviews.length) window.WB_REVIEWS = db.reviews.filter(function (r) { return r.show; }).concat(window.WB_REVIEWS || []);

  /* projects are either homes or corporate / institutions; older projects are sorted by their space */
  WB.SEGMENTS = { residential: "Homes", corporate: "Corporate & institutions" };
  WB.projectSegment = function (p) {
    if (p && (p.segment === "residential" || p.segment === "corporate")) return p.segment;
    return /office|caf|restaurant|hotel|lobby|hospital|clinic|school|college|shop|store|showroom|gym|commercial|corporate/i.test((p && p.space) || "") ? "corporate" : "residential";
  };

  /* FAQ answers are plain text: a blank line starts a new paragraph, [words](link) makes a link */
  var LINK = /\[([^\]]+)\]\(((?:https?:\/\/|mailto:|tel:|#|\/|[\w-]+\.html)[^)\s]*)\)/g;
  function escH(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  WB.faqHTML = function (a) {
    return String(a || "").trim().split(/\n\s*\n/).map(function (p) {
      return "<p>" + escH(p).replace(LINK, function (m, t, u) { return '<a href="' + u + '"' + (/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : "") + ">" + t + "</a>"; }).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  };
  WB.faqText = function (a) { return String(a || "").replace(LINK, "$1").trim(); };

  try { localStorage.removeItem("wb_events"); } catch (e) {}   // old per-browser visit log, no longer kept
})();
