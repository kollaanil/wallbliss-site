/* Work videos: YouTube links saved on projects (admin › project › Photos step).
   WB.videoStrip(box, where) draws a "Watch us print" row; a tap opens the full-screen player.
   where: "strip" (Projects page), "home" (homepage) or a project slug.
   Nothing loads from YouTube until a tap; the player is YouTube's privacy-enhanced one. */
(function () {
  var WB = window.WB = window.WB || {};
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID, /live/ID, or a bare ID */
  WB.videoId = function (u) {
    u = String(u || "").trim();
    if (/^[\w-]{11}$/.test(u)) return u;
    var m = u.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:shorts\/|embed\/|live\/|v\/|watch\?(?:.*&)?v=))([\w-]{11})/i);
    return m ? m[1] : "";
  };
  WB.videoThumb = function (id) { return "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg"; };

  function list(where) {
    var out = [];
    (window.WB_PROJECTS || []).filter(function (p) { return p && !p.hidden && (p.videos || []).length; })
      .sort(function (a, b) { return (b.month || "").localeCompare(a.month || ""); })
      .forEach(function (p) {
        if (where === "strip" ? p.noVidStrip : where === "home" ? !p.vidHome : p.slug !== where) return;
        p.videos.forEach(function (v) { if (v && v.id) out.push({ id: v.id, t: v.t || p.title, tall: !!v.v, p: p }); });
      });
    return out;
  }
  WB.videos = list;

  function tile(x, i) {
    return '<button type="button" class="vt' + (x.tall ? " tall" : "") + '" data-vi="' + i + '" aria-label="Play video: ' + esc(x.t) + '">' +
      '<img src="' + WB.videoThumb(x.id) + '" alt="" loading="lazy" decoding="async"><span class="vt-play" aria-hidden="true"></span>' +
      '<span class="vt-t">' + esc(x.t) + '<small>' + esc([x.p.locality, x.p.space].filter(Boolean).join(" · ")) + '</small></span></button>';
  }
  WB.videoStrip = function (box, where) {
    var L = list(where); if (!box || !L.length) return 0;
    box.innerHTML = '<div class="vstrip">' + L.map(tile).join("") + "</div>";
    box.onclick = function (e) { var b = e.target.closest("[data-vi]"); if (b) play(L, +b.dataset.vi, where); };
    seo(L);
    return L.length;
  };
  WB.playVideos = function (where, i) { var L = list(where); if (L.length) play(L, i || 0, where); };

  /* ---------- full-screen player ---------- */
  var dlg, L = [], at = 0, via = "";
  function build() {
    dlg = document.createElement("dialog"); dlg.className = "vp"; dlg.setAttribute("aria-label", "Work video");
    dlg.innerHTML = '<div class="vp-in">' +
      '<div class="vp-top"><span class="vp-dots" aria-hidden="true"></span><span class="vp-grow"></span>' +
      '<button type="button" class="vp-btn vp-prev" aria-label="Previous video">‹</button><button type="button" class="vp-btn vp-next" aria-label="Next video">›</button>' +
      '<button type="button" class="vp-btn vp-x" aria-label="Close video">×</button></div>' +
      '<div class="vp-frame"><iframe title="Work video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>' +
      '<div class="vp-bot"><p class="vp-hint"></p><h3></h3><p class="vp-sub"></p><div class="vp-row"><a class="btn vp-proj" href="#">See this project</a><a class="btn btn-wa vp-wa" target="_blank" rel="noopener" href="#">WhatsApp us</a></div></div></div>';
    document.body.appendChild(dlg);
    dlg.querySelector(".vp-x").onclick = close;
    dlg.querySelector(".vp-prev").onclick = function () { go(-1); };
    dlg.querySelector(".vp-next").onclick = function () { go(1); };
    dlg.addEventListener("close", function () { dlg.querySelector("iframe").src = "about:blank"; document.documentElement.classList.remove("vp-open"); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { go(1); e.preventDefault(); }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") { go(-1); e.preventDefault(); }
    });
    /* swipe up / left for the next wall (outside the video itself, which keeps its own touches) */
    var sx = 0, sy = 0;
    dlg.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    dlg.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 50) return;
      go((Math.abs(dy) > Math.abs(dx) ? dy : dx) < 0 ? 1 : -1);
    }, { passive: true });
    dlg.querySelector(".vp-proj").addEventListener("click", function (e) {
      var el = document.getElementById(L[at].p.slug);
      if (el) { e.preventDefault(); close(); el.scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
  }
  function close() { if (dlg.close) dlg.close(); else { dlg.removeAttribute("open"); dlg.dispatchEvent(new Event("close")); } }
  function go(d) { var n = at + d; if (n < 0 || n >= L.length) return; show(n); }
  function show(i) {
    at = i; var x = L[i], p = x.p;
    dlg.classList.toggle("tall", x.tall);
    dlg.querySelector("iframe").src = "https://www.youtube-nocookie.com/embed/" + x.id + "?autoplay=1&playsinline=1&rel=0&modestbranding=1";
    dlg.querySelector("h3").textContent = x.t;
    dlg.querySelector(".vp-sub").textContent = [p.locality, p.space, p.time ? "printed in " + p.time : ""].filter(Boolean).join(" · ");
    dlg.querySelector(".vp-proj").href = "projects.html#" + encodeURIComponent(p.slug);
    dlg.querySelector(".vp-wa").href = WB.waLink ? WB.waLink('Hi WallBliss, I watched your video "' + x.t + '"' + (p.locality ? " (" + p.locality + ")" : "") + ". I'd like something like this on my wall.") : "#";
    dlg.querySelector(".vp-dots").innerHTML = L.length > 1 ? (L.length <= 8 ? L.map(function (_, k) { return "<i" + (k === i ? ' class="on"' : "") + "></i>"; }).join("") : "<b>" + (i + 1) + " / " + L.length + "</b>") : "";
    dlg.querySelector(".vp-prev").disabled = i === 0;
    dlg.querySelector(".vp-next").disabled = i === L.length - 1;
    dlg.querySelector(".vp-prev").hidden = dlg.querySelector(".vp-next").hidden = L.length < 2;
    dlg.querySelector(".vp-hint").textContent = L.length > 1 && i === 0 ? "Swipe up for the next wall" : "";
    if (WB.track) WB.track("video_play", { id: x.id, project: p.slug, via: via });
  }
  function play(list, i, where) {
    if (!dlg) build();
    L = list; via = where === "strip" || where === "home" ? where : "project";
    document.documentElement.classList.add("vp-open");
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
    show(i);
  }

  /* ---------- Google: describe the videos so they can show in video results ---------- */
  var described = {};
  function seo(list) {
    var items = list.filter(function (x) { return !described[x.id]; }).map(function (x) {
      described[x.id] = 1;
      return { "@type": "VideoObject", name: x.t, description: x.p.summary || x.p.title, thumbnailUrl: WB.videoThumb(x.id),
        uploadDate: (x.p.month || "2026-01") + "-01", embedUrl: "https://www.youtube.com/embed/" + x.id, contentUrl: "https://www.youtube.com/watch?v=" + x.id };
    });
    if (!items.length) return;
    var s = document.createElement("script"); s.type = "application/ld+json";
    s.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": items });
    document.head.appendChild(s);
  }
})();
