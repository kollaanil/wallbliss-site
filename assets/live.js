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
    return db;
  }
  var PUB = norm(JSON.parse(JSON.stringify(window.WB_PUBLISHED || {})));

  var BASE = "wb_admin_base";   // the published data this device's draft started from (for safe merging at Publish)
  WB.db = {
    published: function () { return norm(JSON.parse(JSON.stringify(window.WB_PUBLISHED || {}))); },
    load: function () {
      var d = get(KEY, null);
      if (!d) { set(BASE, this.published()); return this.published(); }     // fresh draft: starts from what is live now
      return norm(d);
    },
    save: function (db) { if (!get(BASE, null)) set(BASE, this.published()); return set(KEY, db); },
    base: function () { return norm(get(BASE, null) || this.published()); },
    setBase: function (data) { set(BASE, data); },
    discardDraft: function () { try { localStorage.removeItem(KEY); localStorage.removeItem(BASE); } catch (e) {} }
  };

  /* the admin previews its own draft; everyone else sees the published data */
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
  if (Array.isArray(RAW.faqs) || isAdmin) window.WB_FAQS = db.faqs.filter(function (f) { return f.show !== false && f.q && f.a; });
  if (db.reviews.length) window.WB_REVIEWS = db.reviews.filter(function (r) { return r.show; }).concat(window.WB_REVIEWS || []);

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
