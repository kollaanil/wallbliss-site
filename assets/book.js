/* "Book a free wall check": pick a day, a time slot and the area; WhatsApp opens with the request typed in.
   Days and slots come from admin → Settings (settings.booking), else Mon–Sat, morning / afternoon / evening.
   WB.bookWallCheck({ codes: ["WB-0143"], via: "design" }) */
(function () {
  var WB = window.WB = window.WB || {};
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var dlg, pick = { day: null, slot: null }, ctx = {};
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function conf() {
    var s = ((window.WB_PUBLISHED || {}).settings || {}).booking || {};
    var days = String(s.days || "1,2,3,4,5,6").split(",").map(Number).filter(function (n) { return n >= 0 && n <= 6; });
    var slots = String(s.slots || "Morning 10–12 | Afternoon 12–4 | Evening 4–7").split("|").map(function (x) {
      x = x.trim(); var m = /^(\S+)\s+(.+)$/.exec(x); return m ? [m[1], m[2]] : [x, ""];
    }).filter(function (x) { return x[0]; });
    return { days: days.length ? days : [1, 2, 3, 4, 5, 6], slots: slots };
  }
  function nextDays(c) {
    var out = [], d = new Date(), late = d.getHours() >= 15;
    for (var i = 0; out.length < 5 && i < 14; i++) {
      var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      if (c.days.indexOf(x.getDay()) < 0 || (i === 0 && late)) continue;
      out.push({ i: i, date: x, top: i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAYS[x.getDay()], sub: (i < 2 ? DAYS[x.getDay()] + " " : "") + x.getDate() + (i < 2 ? "" : " " + MON[x.getMonth()]) });
    }
    return out;
  }
  function build() {
    dlg = document.createElement("dialog"); dlg.className = "bk"; dlg.setAttribute("aria-labelledby", "bk-t");
    dlg.innerHTML = '<form class="bk-in" method="dialog"><header><h2 id="bk-t">Free wall check</h2><button type="button" class="bk-x" aria-label="Close">×</button></header>' +
      '<p class="bk-sub">We visit, measure your wall and show the design at full size. Free, no obligation.</p>' +
      '<p class="bk-l">Day</p><div class="bk-opts" data-k="day"></div><p class="bk-l">Time</p><div class="bk-opts" data-k="slot"></div>' +
      '<p class="bk-l"><label for="bk-area">Area in Bengaluru</label></p><input id="bk-area" type="text" autocomplete="address-level2" placeholder="e.g. HSR Layout">' +
      '<button type="submit" class="btn btn-wa bk-go">Request on WhatsApp</button><p class="bk-prev" aria-live="polite"></p></form>';
    document.body.appendChild(dlg);
    dlg.querySelector(".bk-x").onclick = function () { dlg.close(); };
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) return dlg.close();
      var b = e.target.closest("[data-v]"); if (!b) return;
      var k = b.parentNode.dataset.k; pick[k] = b.dataset.v;
      b.parentNode.querySelectorAll("[data-v]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); });
      preview();
    });
    dlg.querySelector("#bk-area").addEventListener("input", preview);
    dlg.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!pick.day || !pick.slot) { WB.notify("Pick a day and a time", { type: "error" }); return; }
      var area = dlg.querySelector("#bk-area").value.trim();
      try { localStorage.setItem("wb_area", area); } catch (x) {}
      if (WB.track) WB.track("book_request", { via: ctx.via || "", day: pick.day, slot: pick.slot, codes: (ctx.codes || []).join(",") });
      var a = document.createElement("a"); a.href = WB.waLink(message()); a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
      dlg.close();
    });
  }
  function message() {
    var area = dlg.querySelector("#bk-area").value.trim(), codes = ctx.codes || [];
    return "Hi WallBliss" + (WB.lead && WB.lead.name ? ", this is " + WB.lead.name : "") + ". I'd like a free wall check on " + (pick.day || "[day]") + ", " + (pick.slot || "[time]").toLowerCase() +
      (area ? ", in " + area : "") + "." + (codes.length ? " Design" + (codes.length > 1 ? "s: " : ": ") + codes.join(", ") + "." : "");
  }
  function preview() { dlg.querySelector(".bk-prev").textContent = "“" + message() + "”"; }
  WB.bookWallCheck = function (o) {
    ctx = o || {};
    if (!dlg) build();
    var c = conf(), days = nextDays(c);
    pick = { day: null, slot: null };
    dlg.querySelector('[data-k="day"]').innerHTML = days.map(function (d) {
      var v = DAYS[d.date.getDay()] + " " + d.date.getDate() + " " + MON[d.date.getMonth()];
      return '<button type="button" data-v="' + esc(v) + '" aria-pressed="false"><b>' + d.top + '</b><small>' + esc(d.sub) + '</small></button>';
    }).join("");
    dlg.querySelector('[data-k="slot"]').innerHTML = c.slots.map(function (s) {
      var v = s[0] + (s[1] ? " (" + s[1] + ")" : "");
      return '<button type="button" data-v="' + esc(v) + '" aria-pressed="false"><b>' + esc(s[0]) + '</b>' + (s[1] ? '<small>' + esc(s[1]) + '</small>' : "") + '</button>';
    }).join("");
    var area = ""; try { area = localStorage.getItem("wb_area") || ""; } catch (x) {}
    dlg.querySelector("#bk-area").value = area || ctx.area || "";
    preview();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
    if (WB.track) WB.track("book_open", { via: ctx.via || "" });
  };
})();
