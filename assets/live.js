/* WallBliss — data bridge
   PUBLIC PAGES use only what has been published (assets/published.js, written by the admin's
   Publish button as a commit to GitHub). Everyone sees the same thing.
   THE ADMIN works on a draft kept in its own browser, seeded from the published data, until
   someone presses Publish. Visitor events (searches, clicks, WhatsApp taps) are kept in each
   visitor's own browser only; real analytics come from GA4 / Clarity. */
(function () {
  var WB = window.WB || (window.WB = {});
  var KEY = "wb_admin_db", EV = "wb_events";
  var isAdmin = /(^|\/)admin\.html$/.test(location.pathname);
  function get(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function norm(db) {
    db = db || {};
    db.designs = db.designs || []; db.edits = db.edits || {}; db.projects = db.projects || [];
    db.reviews = db.reviews || []; db.settings = db.settings || {};
    return db;
  }
  var PUB = norm(JSON.parse(JSON.stringify(window.WB_PUBLISHED || {})));

  WB.db = {
    published: function () { return norm(JSON.parse(JSON.stringify(window.WB_PUBLISHED || {}))); },
    load: function () { return norm(get(KEY, null) || this.published()); },
    save: function (db) { return set(KEY, db); },
    discardDraft: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    events: function () { return get(EV, []); },
    clearEvents: function () { set(EV, []); }
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
  if (db.reviews.length) window.WB_REVIEWS = db.reviews.filter(function (r) { return r.show; }).concat(window.WB_REVIEWS || []);

  if (WB.track) {
    var send = WB.track;
    WB.track = function (type, data) {
      send(type, data);
      var ev = window.WB_EVENTS[window.WB_EVENTS.length - 1];
      var all = get(EV, []); all.push(ev); if (all.length > 3000) all = all.slice(-3000); set(EV, all);
    };
  }
})();
