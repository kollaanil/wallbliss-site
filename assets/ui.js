/* WallBliss — shared UI: notifications and loading. ONE place for both, used by the website and the admin.
   Styles live in styles-v2.css (search "Shared UI").

   NOTIFICATIONS  WB.notify("Saved")                    → bottom-right, stacked, fades after 3 s
                  WB.notify("Not published", { type: "error" }) → stays until tapped

   LOADING (the standard)
     under 0.4 s       show nothing
     0.4 s – 2 s       WB.busy(button, "Saving…") → spinner inside the tapped button (min 0.5 s on screen)
     2 s – 10 s        WB.waiting(el, "publish", { skip }) → spinner + message + seconds (+ Skip)
     after 3 s         the message rotates every 2.5 s (lines below); a real step always wins: w.step("Uploading 3 of 7")
     long / counted    w.progress(3, 7) → thin progress bar
     after 20 s        "Taking a little longer than usual…"
   Website images: <img class="fade"> fades in over a wall-coloured box (no spinners for customers). */
(function () {
  "use strict";
  var WB = window.WB || (window.WB = {});

  /* ---------- rotating messages: edit the wording here ---------- */
  WB.LOAD_LINES = {
    aiDesign: ["Looking closely at your design…", "Spotting the details…", "Finding the right name…", "Matching it to rooms…", "Thinking how customers will search for it…"],
    story: ["Comparing before and after…", "Finding the feeling in this wall…", "Writing three titles…", "Polishing the story…"],
    publish: ["Gathering your changes…", "Checking what the team published…", "Hanging it on the website…", "Almost there…"],
    heic: ["Opening your iPhone photo…", "Converting it for the web…"],
    save: ["Saving…"],
    slow: "Taking a little longer than usual…"
  };
  WB.loadLine = function (kind, sec) {
    var L = WB.LOAD_LINES[kind] || WB.LOAD_LINES.save;
    if (sec >= 20) return WB.LOAD_LINES.slow;
    if (sec < 3 || L.length < 2) return L[0];
    return L[Math.floor((sec - 3) / 2.5) % L.length];
  };

  /* ---------- notifications ---------- */
  var stack = null;
  function holder() {
    if (!stack || !document.body.contains(stack)) {
      stack = document.createElement("div"); stack.className = "wb-notes"; stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    return stack;
  }
  WB.notify = function (msg, opts) {
    opts = opts || {}; if (!document.body) return { close: function () {} };
    var err = opts.type === "error", n = document.createElement("div");
    n.className = "wb-note" + (err ? " err" : ""); n.setAttribute("role", err ? "alert" : "status");
    n.innerHTML = "<span></span>" + (err ? '<b class="x" aria-hidden="true">×</b>' : "");
    n.firstChild.textContent = msg;
    var h = holder(); h.appendChild(n);
    while (h.children.length > 4) h.removeChild(h.firstChild);              // never a wall of messages
    var gone = false;
    function close() { if (gone) return; gone = true; n.classList.add("out"); setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 320); }
    n.addEventListener("click", close);
    if (!err) setTimeout(close, opts.ms || 3000);
    return { close: close };
  };

  /* ---------- spinner inside a button ---------- */
  WB.busy = function (btn, label) {
    if (!btn) return function () {};
    var old = btn.innerHTML, shownAt = 0, t = setTimeout(function () { shownAt = Date.now(); btn.innerHTML = '<i class="wb-spin" aria-hidden="true"></i> ' + (label || "Saving…"); }, 400);
    btn.disabled = true; btn.setAttribute("aria-busy", "true");
    return function done() {
      clearTimeout(t);
      var wait = shownAt ? Math.max(0, 500 - (Date.now() - shownAt)) : 0;      // once shown, stay at least 0.5 s
      setTimeout(function () { btn.innerHTML = old; btn.disabled = false; btn.removeAttribute("aria-busy"); }, wait);
    };
  };

  /* ---------- waiting line: spinner + rotating message + seconds (+ Skip) (+ progress) ---------- */
  WB.waiting = function (el, kind, opts) {
    opts = opts || {}; if (!el) return { step: function () {}, progress: function () {}, stop: function () {} };
    var start = Date.now(), fixed = null;
    el.classList.add("wb-wait");
    el.innerHTML = '<span class="wb-wait-row"><i class="wb-spin" aria-hidden="true"></i><span class="wb-msg"></span><span class="wb-sec"></span>' +
      (opts.skip ? '<button type="button" class="wb-skip">' + (opts.skipLabel || "Skip") + "</button>" : "") + '</span><span class="wb-bar" hidden><i></i></span>';
    var msg = el.querySelector(".wb-msg"), sec = el.querySelector(".wb-sec"), bar = el.querySelector(".wb-bar");
    if (opts.skip) el.querySelector(".wb-skip").onclick = function () { opts.skip(); };
    function tick() {
      var s = (Date.now() - start) / 1000, line = fixed || WB.loadLine(kind, s);
      if (msg.textContent !== line) { msg.classList.remove("in"); void msg.offsetWidth; msg.textContent = line; msg.classList.add("in"); }
      sec.textContent = s >= 2 ? Math.round(s) + " s" : "";
    }
    tick(); var iv = setInterval(tick, 500);
    return {
      step: function (text) { fixed = text || null; tick(); },
      progress: function (n, total) { bar.hidden = false; bar.firstChild.style.width = Math.round(Math.min(1, n / total) * 100) + "%"; },
      stop: function () { clearInterval(iv); el.classList.remove("wb-wait"); },
      seconds: function () { return Math.round((Date.now() - start) / 1000); }
    };
  };

  /* ---------- website images fade in when ready ---------- */
  document.addEventListener("load", function (e) { var t = e.target; if (t && t.tagName === "IMG" && t.classList.contains("fade")) t.classList.add("in"); }, true);
  document.addEventListener("DOMContentLoaded", function () { Array.prototype.forEach.call(document.querySelectorAll("img.fade"), function (i) { if (i.complete) i.classList.add("in"); }); });
  document.addEventListener("error", function (e) { var t = e.target; if (t && t.tagName === "IMG" && t.classList.contains("fade")) t.classList.add("in"); }, true);
})();
