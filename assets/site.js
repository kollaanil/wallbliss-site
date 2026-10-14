/* WallBliss Studio — shared site script.
   EDIT HERE: WhatsApp number, Google reviews link and analytics IDs live in WB.config. */
(function () {
  var WB = (window.WB = window.WB || {});

  WB.config = {
    brand: "WallBliss Studio",
    whatsapp: "917676701113",          // country code + number, no "+" or spaces
    phoneDisplay: "+91 76767 01113",
    city: "Bengaluru",
    // Paste your Google Business Profile links here (Google Business Profile > Share profile / Ask for reviews).
    googleReviewsUrl: "",              // e.g. "https://g.page/r/XXXXXXXX"
    googleWriteReviewUrl: "",          // e.g. "https://g.page/r/XXXXXXXX/review"
    // Google Analytics 4 Measurement ID (looks like "G-XXXXXXXXXX"). When set, every tracked
    // search, filter, design opened, heart and WhatsApp tap is also sent to GA4 as an event.
    ga4Id: "",
    // Optional extra endpoint for the same events (not used yet). Events always queue in window.WB_EVENTS.
    eventsEndpoint: ""
  };

  /* ---------- helpers ---------- */
  WB.store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* Lead context: ?for=Name or #for-name personalises; ?src= / utm_source tags the WhatsApp message. */
  WB.lead = (function () {
    var q = new URLSearchParams(location.search), name = q.get("for") || "", src = q.get("src") || q.get("utm_source") || "";
    var h = (location.hash || "").slice(1);
    if (!name && /^for-/.test(h)) name = h.slice(4).replace(/[-_.]+/g, " ");
    name = name.replace(/[^\p{L}\p{N} .'-]/gu, "").trim().slice(0, 40);
    if (name) name = name.replace(/\b\p{L}/gu, function (c) { return c.toUpperCase(); });
    var saved = WB.store.get("wb_lead", {});
    if (name || src) WB.store.set("wb_lead", { name: name || saved.name || "", src: src || saved.src || "" });
    else { name = saved.name || ""; src = saved.src || ""; }
    return { name: name, src: src };
  })();

  WB.waLink = function (text) {
    var msg = text || "Hi WallBliss, I'd like to know more about printing a design on my wall.";
    if (WB.lead.src) msg += "\n(Ref: " + WB.lead.src + ")";
    return "https://wa.me/" + WB.config.whatsapp + "?text=" + encodeURIComponent(msg);
  };

  /* ---------- analytics: every search and click, no personal data ---------- */
  var session = WB.store.get("wb_sid", null);
  if (!session) { session = Math.random().toString(36).slice(2, 10); WB.store.set("wb_sid", session); }
  window.WB_EVENTS = window.WB_EVENTS || [];

  /* Google Analytics 4: loads only when ga4Id is set, and never on the admin page */
  var GA = WB.config.ga4Id && !/(^|\/)admin\.html$/.test(location.pathname) ? WB.config.ga4Id : "";
  if (GA) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA, WB.lead.src ? { campaign_source: WB.lead.src } : {});
    var gs = document.createElement("script"); gs.async = true; gs.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA);
    document.head.appendChild(gs);
  }
  function toGA(type, data) {
    if (!GA || type === "page_view") return;                 // GA4 counts page views by itself
    var p = { lead_source: WB.lead.src || "(direct)" };
    Object.keys(data || {}).forEach(function (k) { var v = data[k]; if (v != null && typeof v !== "object") p[k === "q" ? "search_term" : k] = String(v).slice(0, 100); });
    window.gtag("event", type, p);
  }

  WB.track = function (type, data) {
    var ev = { type: type, data: data || {}, page: location.pathname.split("/").pop() || "index.html", src: WB.lead.src || "", sid: session, t: new Date().toISOString() };
    window.WB_EVENTS.push(ev);
    try { toGA(type, ev.data); } catch (e) {}
    if (!WB.config.eventsEndpoint) return;
    try {
      var body = JSON.stringify(ev);
      if (navigator.sendBeacon) navigator.sendBeacon(WB.config.eventsEndpoint, body);
      else fetch(WB.config.eventsEndpoint, { method: "POST", body: body, keepalive: true });
    } catch (e) {}
  };

  /* ---------- shortlist (catalogue hearts) ---------- */
  WB.shortlist = {
    all: function () { return WB.store.get("wb_shortlist", []); },
    has: function (code) { return this.all().indexOf(code) > -1; },
    toggle: function (code) {
      var a = this.all(), i = a.indexOf(code);
      if (i > -1) a.splice(i, 1); else a.push(code);
      WB.store.set("wb_shortlist", a);
      WB.track(i === -1 ? "shortlist_add" : "shortlist_remove", { code: code });
      document.dispatchEvent(new CustomEvent("wb:shortlist", { detail: a }));
      return i === -1;
    }
  };

  /* ---------- page wiring ---------- */
  var WA_SVG = '<svg class="wa-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';
  WB.waIcon = WA_SVG;

  function wireWhatsApp() {
    document.querySelectorAll("[data-wa]").forEach(function (a) {
      var msg = a.getAttribute("data-wa") || "";
      if (WB.lead.name && !msg) msg = "Hi WallBliss, this is " + WB.lead.name + ". I'd like to know more about printing a design on my wall.";
      a.href = WB.waLink(msg || undefined);
      a.target = "_blank"; a.rel = "noopener";
      if (!a.querySelector(".wa-ico") && a.classList.contains("btn")) a.insertAdjacentHTML("afterbegin", WA_SVG);
    });
    document.querySelectorAll("[data-phone]").forEach(function (el) { el.textContent = WB.config.phoneDisplay; });
    document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    // every WhatsApp tap is logged, wherever it happens
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="https://wa.me/"]');
      if (a) WB.track("whatsapp_tap", { where: a.getAttribute("data-where") || a.id || a.textContent.trim().slice(0, 40) });
    }, true);
  }

  function reviews() {
    var url = WB.config.googleReviewsUrl;
    document.querySelectorAll("[data-google-reviews]").forEach(function (el) {
      if (!url) { el.hidden = true; return; }
      el.hidden = false;
      el.querySelectorAll("a[data-g-read]").forEach(function (a) { a.href = url; });
      el.querySelectorAll("a[data-g-write]").forEach(function (a) { a.href = WB.config.googleWriteReviewUrl || url; });
    });
  }

  function menu() {
    var b = document.querySelector(".menu-btn"), nav = document.getElementById("site-nav");
    if (!b || !nav) return;
    b.addEventListener("click", function () {
      var open = b.getAttribute("aria-expanded") !== "true";
      b.setAttribute("aria-expanded", open); nav.classList.toggle("open", open);
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) { b.setAttribute("aria-expanded", "false"); nav.classList.remove("open"); } });
  }

  function greet() {
    if (!WB.lead.name) return;
    document.querySelectorAll("[data-greet]").forEach(function (el) {
      el.textContent = "Hi " + WB.lead.name.split(" ")[0] + " 👋 " + el.getAttribute("data-greet");
      el.hidden = false;
    });
  }

  function reveal() {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) io.observe(el);
    });
  }

  /* Before/after sliders: any .ba with an input[type=range] */
  WB.wireBA = function (root) {
    (root || document).querySelectorAll(".ba").forEach(function (ba) {
      var r = ba.querySelector("input[type=range]"); if (!r || r._wired) return; r._wired = true;
      r.addEventListener("input", function () { ba.style.setProperty("--pos", r.value + "%"); });
      r.addEventListener("change", function () { WB.track("before_after_slide", { id: ba.id || "" }); }, { once: true });
    });
  };

  document.addEventListener("DOMContentLoaded", function () {
    wireWhatsApp(); reviews(); menu(); greet(); reveal(); WB.wireBA();
    if (document.querySelector(".wa-bar")) document.body.classList.add("has-wa-bar");
    WB.track("page_view", { ref: document.referrer ? new URL(document.referrer).hostname : "" });
  });
})();
