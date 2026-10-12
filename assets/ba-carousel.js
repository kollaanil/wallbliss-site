/* Homepage before/after carousel.
   Slides = projects published from the admin (newest first, "Show in the homepage" on)
   followed by the built-in world-map wall. Swipe or use the arrows to move between walls;
   drag the round handle to compare before and after. Neighbouring walls peek in on both sides. */
(function () {
  var root = document.getElementById("bac"); if (!root) return;
  var track = root.querySelector(".bac-track"), prev = root.querySelector(".bac-prev"), next = root.querySelector(".bac-next"), count = root.querySelector(".bac-count");
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  var slides = (window.WB_PROJECTS || []).filter(function (p) { return p.before && p.after && !p.hidden && !p.noHome; })
    .sort(function (a, b) { return (b.month || "").localeCompare(a.month || ""); })
    .map(function (p) {
      return { before: '<img src="' + esc(p.before) + '" alt="' + esc(p.space + " in " + p.locality + " before printing") + '" loading="lazy" decoding="async">',
        after: '<img src="' + esc(p.after) + '" alt="' + esc(p.title) + '" loading="lazy" decoding="async">',
        title: p.title, meta: [p.locality, p.space, p.time].filter(Boolean).join(" · "), href: "projects.html#" + p.slug };
    });
  function pic(n, alt) {
    return '<picture><source type="image/webp" srcset="assets/img/ba-' + n + '-m.webp 800w, assets/img/ba-' + n + '-l.webp 1120w" sizes="(max-width: 640px) 86vw, 760px">' +
      '<img src="assets/img/ba-' + n + '-l.jpg" srcset="assets/img/ba-' + n + '-m.jpg 800w, assets/img/ba-' + n + '-l.jpg 1120w" sizes="(max-width: 640px) 86vw, 760px" width="1120" height="840" alt="' + alt + '" loading="lazy" decoding="async"></picture>';
  }
  slides.push({ before: pic("before", "The bare wall before printing"), after: pic("after", "The same wall with a world map printed on it"),
    title: "World map feature wall", meta: "Bengaluru home · Living room", href: "projects.html" });

  track.innerHTML = slides.map(function (s, i) {
    return '<figure class="bac-slide" data-i="' + i + '" aria-roledescription="slide" aria-label="' + (i + 1) + " of " + slides.length + '">' +
      '<div class="cmp" style="--pos:50%"><div class="cmp-b">' + s.before + '</div><div class="cmp-a">' + s.after + '</div>' +
      '<span class="cmp-l l">Before</span><span class="cmp-l r">After</span>' +
      '<div class="cmp-line"><button type="button" class="cmp-knob" aria-label="Drag to compare before and after" tabindex="-1">⟷</button></div>' +
      '<input class="cmp-range" type="range" min="0" max="100" value="50" aria-label="Compare before and after: ' + esc(s.title) + '"></div>' +
      '<figcaption><b>' + esc(s.title) + '</b><span>' + esc(s.meta) + '</span></figcaption></figure>';
  }).join("");
  root.classList.toggle("single", slides.length < 2);

  /* ---------- compare handle: only the knob drags, so the rest of the photo still swipes ---------- */
  function setPos(cmp, v) { v = Math.max(0, Math.min(100, v)); cmp.style.setProperty("--pos", v + "%"); var r = cmp.querySelector(".cmp-range"); if (r) r.value = v; }
  track.querySelectorAll(".cmp").forEach(function (cmp) {
    var knob = cmp.querySelector(".cmp-knob"), range = cmp.querySelector(".cmp-range"), drag = false;
    function at(e) { var b = cmp.getBoundingClientRect(); return (e.clientX - b.left) / b.width * 100; }
    knob.addEventListener("pointerdown", function (e) { drag = true; cmp.classList.add("drag"); knob.setPointerCapture(e.pointerId); e.preventDefault(); cmp.dataset.used = 1; });
    knob.addEventListener("pointermove", function (e) { if (drag) setPos(cmp, at(e)); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (t) { knob.addEventListener(t, function () { if (drag && window.WB && WB.track) WB.track("before_after_slide", { id: "home" }); drag = false; cmp.classList.remove("drag"); }); });
    /* a tap on the photo moves the line there (a swipe still scrolls the carousel) */
    var down = null;
    cmp.addEventListener("pointerdown", function (e) { if (e.target === knob) return; down = { x: e.clientX, y: e.clientY, t: Date.now() }; });
    cmp.addEventListener("pointerup", function (e) { if (!down || e.target === knob) return; if (Math.abs(e.clientX - down.x) < 8 && Math.abs(e.clientY - down.y) < 8 && Date.now() - down.t < 400) { cmp.classList.add("glide"); setPos(cmp, at(e)); setTimeout(function () { cmp.classList.remove("glide"); }, 450); cmp.dataset.used = 1; } down = null; });
    range.addEventListener("input", function () { setPos(cmp, +range.value); });
  });

  /* ---------- carousel ---------- */
  var els = Array.prototype.slice.call(track.children), cur = 0;
  function go(i) { i = Math.max(0, Math.min(els.length - 1, i)); var el = els[i]; track.scrollTo({ left: el.offsetLeft - (track.clientWidth - el.clientWidth) / 2, behavior: reduce ? "auto" : "smooth" }); }
  prev.onclick = function () { go(cur - 1); };
  els.forEach(function (el, i) { el.addEventListener("click", function (e) { if (i !== cur) { e.preventDefault(); go(i); } }, true); });
  next.onclick = function () { go(cur + 1); };
  function sync() {
    var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
    els.forEach(function (el, i) { var c = el.offsetLeft + el.clientWidth / 2, d = Math.abs(c - mid); if (d < bd) { bd = d; best = i; } });
    if (best !== cur || !count.textContent) { cur = best; hint(els[cur]); }
    els.forEach(function (el, i) { el.classList.toggle("on", i === cur); });
    prev.disabled = cur === 0; next.disabled = cur === els.length - 1;
    count.textContent = (cur + 1) + " / " + els.length;
  }
  var t; track.addEventListener("scroll", function () { clearTimeout(t); t = setTimeout(sync, 60); }, { passive: true });
  root.addEventListener("keydown", function (e) { if (e.target.classList.contains("cmp-range")) return; if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); } });
  addEventListener("resize", function () { go(cur); });

  /* a short nudge of the handle the first time each wall is centred, so people see it moves */
  var seen = {};
  function hint(el) {
    if (reduce || !el || seen[el.dataset.i]) return;
    var cmp = el.querySelector(".cmp"); if (cmp.dataset.used) return;
    seen[el.dataset.i] = 1;
    var steps = [[50, 0], [32, 420], [68, 1000], [50, 1500]];
    steps.forEach(function (s) { setTimeout(function () { if (cmp.classList.contains("drag")) return; cmp.classList.add("glide"); setPos(cmp, s[0]); }, s[1] + 250); });
    setTimeout(function () { cmp.classList.remove("glide"); }, 2300);
  }
  /* start the hint only when the section scrolls into view */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); count.textContent = ""; sync(); } }, { threshold: 0.4 });
    io.observe(root);
  } else sync();
  prev.disabled = true; next.disabled = els.length < 2; count.textContent = "1 / " + els.length;
})();
