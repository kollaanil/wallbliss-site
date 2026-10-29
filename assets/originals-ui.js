/* WallBliss admin — screens for design originals (engine: assets/originals.js).
   • Designs page: a folder bar (connect / status / storage), a "Missing originals" filter, and a small
     status on every design picture (Original saved · Saving 64% · No original · …).
   • Edit design: an "Original file (for printing)" box: open it in Drive, replace it, or attach one,
     with a side-by-side check before anything is uploaded. */
(function () {
  "use strict";
  var O = window.WBOriginals, A = window.WBAdmin;
  if (!O || !A) return;
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = A.esc;

  var css = document.createElement("style");
  css.textContent =
    ".og-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 14px;border-radius:12px;background:var(--surface);border:1px solid var(--line);font-size:.9rem}" +
    ".og-bar .ic{width:32px;height:32px;border-radius:50%;background:#E8F3EE;color:#1B6B4A;display:grid;place-items:center;font-weight:700;flex:none}" +
    ".og-bar.warn .ic{background:#FFF3DC;color:#9A6400}.og-bar.bad{border-color:#F2B8B5;background:#FFF7F6}.og-bar.bad .ic{background:#FDE2E0;color:#B42318}" +
    ".og-bar .grow{flex:1;min-width:200px}.og-bar b{color:var(--ink)}.og-bar small{color:var(--muted);display:block;font-size:.8rem;margin-top:2px}" +
    ".og-btn{border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);border-radius:999px;padding:8px 14px;font:700 .84rem var(--font-body);cursor:pointer;min-height:38px}" +
    ".og-btn.pri{background:var(--ink);color:#fff;border-color:var(--ink)}.og-btn:disabled{opacity:.6;cursor:wait}" +
    ".og-more{position:relative}.og-more summary{list-style:none;cursor:pointer}.og-more summary::-webkit-details-marker{display:none}" +
    ".og-more[open] .og-menu{display:grid}.og-menu{display:none;position:absolute;right:0;top:calc(100% + 6px);z-index:30;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 30px -10px rgba(36,27,20,.3);padding:6px;min-width:220px}" +
    ".og-menu button{border:0;background:none;text-align:left;padding:10px 12px;border-radius:8px;font:600 .88rem var(--font-body);color:var(--ink);cursor:pointer}.og-menu button:hover{background:var(--surface-2)}" +
    ".oc{position:absolute;left:8px;bottom:8px;z-index:3;font:700 .7rem/1 var(--font-body);padding:5px 8px;border-radius:999px;background:rgba(255,253,249,.95);box-shadow:0 2px 8px rgba(0,0,0,.15);pointer-events:none;white-space:nowrap}" +
    ".oc.saved{color:#1B6B4A}.oc.missing,.oc.trash,.oc.failed{color:#9A4A00;background:#FFF3DC}.oc.uploading,.oc.queued,.oc.wifi{color:#0F6B6E}" +
    ".og-sec{border:1px solid var(--line-strong);border-radius:12px;padding:12px 14px;display:grid;gap:10px;background:var(--surface-2)}" +
    ".og-sec.warn{border-style:dashed;background:#FFFBF2;border-color:#E9C98B}.og-sec .t{font-weight:700;color:var(--ink);font-size:.92rem}.og-sec.warn .t{color:#9A4A00}" +
    ".og-sec.drag{outline:2px dashed var(--accent);outline-offset:3px}" +
    ".og-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.og-row .grow{flex:1;min-width:180px;font-size:.88rem}.og-row .grow b{display:block;color:var(--ink);overflow-wrap:anywhere}.og-row .grow small{color:var(--muted)}" +
    ".og-prog{height:6px;border-radius:3px;background:var(--line);overflow:hidden}.og-prog i{display:block;height:100%;background:var(--accent);transition:width .3s}" +
    ".og-cmp{display:grid;grid-template-columns:1fr 1fr;gap:10px}.og-cmp figure{margin:0;display:grid;gap:4px}.og-cmp .bx{aspect-ratio:4/3;border-radius:10px;overflow:hidden;background:var(--wall);display:grid;place-items:center;color:var(--muted);font-size:.8rem;text-align:center;padding:6px}" +
    ".og-cmp img{width:100%;height:100%;object-fit:contain}.og-cmp figcaption{font-size:.78rem;color:var(--muted)}" +
    ".og-dup{font-size:.84rem;color:#9A4A00;background:#FFF3DC;border-radius:8px;padding:8px 10px}";
  document.head.appendChild(css);

  /* ---------------- Designs page: folder bar + filter chip ---------------- */
  var tb = $('[data-pane="designs"] .toolbar'), bar = document.createElement("div");
  bar.className = "og-bar"; bar.id = "og-bar"; tb.parentNode.insertBefore(bar, tb);
  var chips = $(".chips", tb), chip = document.createElement("button");
  chip.className = "fchip"; chip.type = "button"; chip.dataset.df = "noorig"; chip.hidden = true; chips.appendChild(chip);
  chip.onclick = function () { A.setFilter("noorig"); };

  function codes() { return A.designs().filter(function (d) { return d.img && !d.builtIn; }).map(function (d) { return d.code; }); }
  function counts() { var c = codes(), saved = c.filter(function (x) { return O.status(x).s === "saved"; }).length; return { all: c.length, saved: saved, missing: c.filter(function (x) { return !O.has(x); }).length }; }
  function ago(t) { if (!t) return ""; var m = Math.round((Date.now() - t) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; }

  function paintBar() {
    var st = O.state(), f = O.folder(), n = counts(), jobs = O.pending(), up = jobs.filter(function (j) { return j.op === "upload"; });
    var busy = up.filter(function (j) { return j.busy; })[0], failed = up.filter(function (j) { return j.failed; }).length, wifi = up.filter(function (j) { return j.wait; }).length;
    var q = st.quota, used = q && +q.limit ? +q.usage / +q.limit : 0, cls = "", html;
    if (st.need === "folder") {
      cls = "warn";
      html = '<span class="ic">☁</span><span class="grow"><b>Keep every design’s original file in Google Drive</b><small>Connect the studio Drive once (' + esc(((window.WB_ADMIN_CONFIG || {}).drive || {}).account || "") + ') and pick the “Design originals” folder.</small></span><button class="og-btn pri" type="button" data-og="connect">Connect originals folder</button>';
    } else if (st.full) {
      cls = "bad";
      html = '<span class="ic">!</span><span class="grow"><b>The studio Drive is full</b><small>' + up.length + ' original(s) waiting. Free space in Drive or upgrade storage, then tap Retry.</small></span><button class="og-btn pri" type="button" data-og="retry">Retry</button>';
    } else if (st.need === "reconnect") {
      cls = "warn";
      html = '<span class="ic">☁</span><span class="grow"><b>' + esc(f.folderName || "Design originals") + ' · reconnect Drive on this device</b><small>' + (up.length ? up.length + " original(s) waiting to upload. " : "") + 'Google asks again about once an hour.</small></span><button class="og-btn pri" type="button" data-og="connect">Reconnect Drive</button>';
    } else {
      if (failed) cls = "warn"; if (used >= .8) cls = used >= .95 ? "bad" : "warn";
      var line = busy ? "Saving " + up.length + " original" + (up.length > 1 ? "s" : "") + "… " + (busy.pct || 0) + "%"
        : failed ? failed + " original" + (failed > 1 ? "s" : "") + " couldn’t upload"
        : wifi ? wifi + " original" + (wifi > 1 ? "s" : "") + " waiting for Wi-Fi"
        : O.known() ? n.saved + " of " + n.all + " designs have their original saved" : "Checking Drive…";
      var sub = (st.email || "") + (st.at ? " · checked " + ago(st.at) : "") + (q && +q.limit ? " · " + O.mb(+q.usage) + " of " + O.mb(+q.limit) + " used" + (used >= .8 ? " — nearly full" : "") : "");
      html = '<span class="ic">' + (busy ? "⟳" : failed ? "!" : "☁") + '</span><span class="grow"><b>' + esc(f.folderName || "Design originals") + ' · ' + esc(line) + '</b><small>' + esc(sub) + '</small></span>' +
        (failed || wifi ? '<button class="og-btn pri" type="button" data-og="retry">' + (failed ? "Retry" : "Upload now") + '</button>' : "") +
        '<details class="og-more"><summary class="og-btn">More ▾</summary><div class="og-menu">' +
        '<button type="button" data-og="refresh">Check Drive again</button><button type="button" data-og="folder">Change folder…</button><button type="button" data-og="disconnect">Disconnect Drive on this device</button></div></details>';
    }
    bar.className = "og-bar " + cls; bar.innerHTML = html;
    chip.hidden = !O.known() || st.need === "folder";
    chip.innerHTML = 'Missing originals <b style="color:#9A4A00">' + n.missing + '</b>';
  }
  bar.addEventListener("click", function (e) {
    var b = e.target.closest("[data-og]"); if (!b) return;
    var k = b.dataset.og, more = b.closest("details"); if (more) more.open = false;
    if (k === "connect") O.connect();                                   // straight from the tap: Google's window may open
    else if (k === "retry") { if (O.needsTap()) O.connect().then(function () { O.retry(); }); else O.retry(); }
    else if (k === "refresh") { if (O.needsTap()) O.connect(); else O.refresh(); }
    else if (k === "folder") { if (confirm("Change the originals folder for both of you? Originals already saved stay where they are.")) O.changeFolder(); }
    else if (k === "disconnect") O.disconnect();
  });

  /* ---------------- status on each design picture ---------------- */
  var LABEL = { saved: "☁ Original saved", missing: "⚠ No original", trash: "⚠ Original in Drive trash", failed: "⚠ Original upload failed", queued: "⟳ Original waiting", wifi: "⟳ Waiting for Wi-Fi" };
  function decorate() {
    if (O.state().need === "folder" || !O.known() && !O.pending().length) { $$("#d-grid .oc").forEach(function (x) { x.remove(); }); return; }
    $$("#d-grid .d-card").forEach(function (c) {
      var b = c.querySelector(".pic[data-edit]"); if (!b) return;
      var code = b.dataset.edit, d = A.designs().filter(function (x) { return x.code === code; })[0]; if (!d || !d.img) return;
      var st = O.status(code), t = st.s === "uploading" ? "⟳ Saving original " + (st.pct || 0) + "%" : LABEL[st.s];
      var el = b.querySelector(".oc");
      if (!t) { if (el) el.remove(); return; }
      if (!el) { el = document.createElement("span"); b.appendChild(el); }
      el.className = "oc " + st.s; el.textContent = t;
    });
  }

  /* ---------------- Edit design: the "Original file" box ---------------- */
  var box = document.createElement("div"), cur = null, pick = null, editFile = null;
  box.id = "d-orig";
  var imgField = $("#d-dlg .body .field"); imgField.parentNode.insertBefore(box, imgField.nextSibling);
  var input = document.createElement("input"); input.type = "file"; input.hidden = true; document.body.appendChild(input);
  input.onchange = function () { if (this.files[0]) choose(this.files[0]); this.value = ""; };

  function section(d) { cur = d; pick = null; editFile = null; paintSection(); }
  function paintSection() {
    var d = cur;
    if (!d || !d.img || d.builtIn) { box.hidden = true; return; }
    box.hidden = false;
    var st = O.state();
    if (st.need === "folder") { box.className = "og-sec"; box.innerHTML = '<span class="t">Original file (for printing)</span><div class="og-row"><span class="grow"><small>Connect the studio Google Drive to keep the original print file of every design.</small></span><button class="og-btn pri" type="button" data-oa="connect">Connect originals folder</button></div>'; return; }
    if (pick) return paintPick();
    var s = O.status(d.code), f = s.file, h;
    if (s.s === "saved") {
      box.className = "og-sec";
      h = '<span class="t">Original file (for printing)</span><div class="og-row"><span style="font-size:22px" aria-hidden="true">☁</span><span class="grow"><b>' + esc(f.name) + '</b><small>' +
        [f.w ? f.w + " × " + f.h + " px" : "", O.mb(f.size), "saved " + O.day(f.at) + (f.by ? " by " + esc(f.by) : ""), "in " + esc(O.folder().folderName || "Design originals")].filter(Boolean).join(" · ") +
        '</small></span><button class="og-btn pri" type="button" data-oa="open">Open in Drive ↗</button><button class="og-btn" type="button" data-oa="pick">Replace</button></div>';
    } else if (s.s === "uploading" || s.s === "queued" || s.s === "wifi" || s.s === "failed") {
      var j = s.job; box.className = "og-sec" + (s.s === "failed" ? " warn" : "");
      h = '<span class="t">Original file (for printing)</span><div class="og-row"><span class="grow"><b>' + esc(j.fname || "") + '</b><small>' + O.mb(j.size || 0) + " · " +
        (s.s === "uploading" ? "uploading " + (s.pct || 0) + "%" : s.s === "queued" ? (O.needsTap() ? "waiting: reconnect Drive to upload" : "waiting to upload") : s.s === "wifi" ? "waiting for Wi-Fi" : "couldn’t upload: " + esc(j.err || "")) + '</small></span>' +
        (s.s === "failed" || s.s === "wifi" || (s.s === "queued" && O.needsTap()) ? '<button class="og-btn pri" type="button" data-oa="retry">' + (s.s === "wifi" ? "Upload now" : O.needsTap() ? "Reconnect & upload" : "Retry") + '</button>' : "") +
        (s.s !== "uploading" ? '<button class="og-btn" type="button" data-oa="cancel">Cancel</button>' : "") + '</div>' +
        (s.s === "uploading" ? '<div class="og-prog"><i style="width:' + (s.pct || 0) + '%"></i></div>' : "");
    } else {
      box.className = "og-sec warn";
      h = '<span class="t">⚠ ' + (s.s === "trash" ? "The original is in Drive’s trash" : s.s === "unknown" ? "Original not checked yet" : "No original saved for this design") + '</span>' +
        '<div class="og-row"><span class="grow"><small>' + (s.s === "trash" ? "Restore “" + esc(f.name) + "” from Drive’s trash (kept 30 days), or attach the file again." : s.s === "unknown" ? "Connect Drive on this device to check." : "Drop the original print file here (any type: JPG, PNG, TIFF, PSD, PDF…), or") + '</small></span>' +
        (s.s === "unknown" ? '<button class="og-btn pri" type="button" data-oa="connect">Connect Drive</button>' : s.s === "trash" ? '<button class="og-btn" type="button" data-oa="open">Open in Drive ↗</button><button class="og-btn pri" type="button" data-oa="pick">Attach again</button>' : '<button class="og-btn pri" type="button" data-oa="pick">Attach original</button>') + '</div>';
    }
    if (editFile) h += '<label class="switch" style="font-size:.84rem"><input type="checkbox" id="og-also" checked> Also keep the new image you chose as this design’s original (' + O.mb(editFile.size) + ')</label>';
    box.innerHTML = h;
  }
  /* the side-by-side check before uploading */
  function choose(file) {
    pick = { file: file, url: URL.createObjectURL(file), w: 0, h: 0, dup: null, ok: false };
    var im = new Image(); im.onload = function () { if (!pick) return; pick.w = im.naturalWidth; pick.h = im.naturalHeight; pick.ok = true; paintSection(); }; im.onerror = function () { if (pick) { pick.ok = false; paintSection(); } };
    im.src = pick.url;
    setTimeout(function () { box.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, 50);
    O.duplicateOf(file, cur.code).then(function (c) { if (pick && pick.file === file) { pick.dup = c; paintSection(); } });
    paintSection();
  }
  function paintPick() {
    var p = pick, s = O.status(cur.code), replacing = s.s === "saved" || s.s === "uploading" || s.s === "queued";
    var big = p.file.size > 25 * 1048576 && O.coarse();
    box.className = "og-sec";
    box.innerHTML = '<span class="t">Is this the right original for ' + esc(cur.code) + '?</span>' +
      '<div class="og-cmp"><figure><div class="bx"><img src="' + esc(cur.img) + '" alt=""></div><figcaption>Design on the website</figcaption></figure>' +
      '<figure><div class="bx">' + (p.ok ? '<img src="' + p.url + '" alt="">' : "No preview for this file type<br>" + esc((p.file.name.split(".").pop() || "").toUpperCase()) + "</div>") + (p.ok ? "</div>" : "") +
      '<figcaption>' + esc(p.file.name) + " · " + (p.w ? p.w + " × " + p.h + " px · " : "") + O.mb(p.file.size) + '</figcaption></figure></div>' +
      (p.dup ? '<div class="og-dup">This exact file is already the original for ' + esc(p.dup) + '. Use it here too?</div>' : "") +
      (replacing ? '<div class="og-dup" style="background:var(--surface);color:var(--muted)">The current original moves to the “Retired” folder. Nothing is deleted.</div>' : "") +
      '<div class="og-row" style="justify-content:flex-end">' + '<button class="og-btn" type="button" data-oa="nopick">Cancel</button>' +
      (big ? '<button class="og-btn" type="button" data-oa="later">Later on Wi-Fi</button>' : "") +
      '<button class="og-btn pri" type="button" data-oa="confirm">' + (replacing ? "Replace original" : "Save original") + (big ? " now (" + O.mb(p.file.size) + ")" : "") + '</button></div>';
  }
  box.addEventListener("click", function (e) {
    var b = e.target.closest("[data-oa]"); if (!b) return;
    var k = b.dataset.oa;
    if (k === "connect") return O.connect().then(paintSection);
    if (k === "open") return O.open(cur.code);
    if (k === "pick") return input.click();
    if (k === "nopick") { if (pick) URL.revokeObjectURL(pick.url); pick = null; return paintSection(); }
    if (k === "retry") { if (O.needsTap()) O.connect().then(function () { O.retry(cur.code); }); else O.retry(cur.code); return; }
    if (k === "cancel") { O.cancel(cur.code); return paintSection(); }
    if (k === "confirm" || k === "later") {
      var p = pick, needTap = O.needsTap() && k === "confirm";
      var go = function () { return O.save(cur.code, cur.name, p.file, { wait: k === "later" }); };
      (needTap ? O.connect().then(go) : go()).then(function () { URL.revokeObjectURL(p.url); pick = null; paintSection(); A.renderDesigns(); WB.notify(k === "later" ? "Original saved on this device. Tap “Upload now” on Wi-Fi." : "Saving the original to Drive…"); });
    }
  });
  ["dragenter", "dragover"].forEach(function (t) { box.addEventListener(t, function (e) { if (box.hidden || !cur) return; e.preventDefault(); box.classList.add("drag"); }); });
  ["dragleave", "drop"].forEach(function (t) { box.addEventListener(t, function (e) { e.preventDefault(); box.classList.remove("drag"); if (t === "drop" && e.dataTransfer.files[0]) choose(e.dataTransfer.files[0]); }); });

  /* ---------------- hooks called by the admin ---------------- */
  window.WBOrigUI = {
    decorate: decorate,
    section: section,
    /* Edit design → "Change image" picked a new file: offer to keep it as the original too */
    newImage: function (file) { editFile = file || null; paintSection(); },
    /* after Save in Edit design */
    saved: function (code, oldName, newName) {
      if (editFile && $("#og-also") && $("#og-also").checked) O.save(code, newName, editFile, { note: "new image" });
      else if (oldName !== newName) O.rename(code, newName);
      editFile = null;
    },
    deleted: function (code) { O.retire(code); },
    /* the bulk uploader: one call per saved design */
    uploaded: function (list) {
      var total = list.reduce(function (a, x) { return a + x.file.size; }, 0), later = total > 25 * 1048576 && O.coarse();
      list.forEach(function (x) { O.save(x.code, x.name, x.file); });
      if (O.state().need === "folder") WB.notify("The original" + (list.length > 1 ? "s are" : " is") + " kept on this device until you connect the originals folder.", { ms: 8000, action: { label: "Connect", fn: function () { O.connect(); } } });
      else if (O.needsTap()) WB.notify(list.length + " original" + (list.length > 1 ? "s" : "") + " will upload once Drive is reconnected.", { ms: 6000, action: { label: "Reconnect", fn: function () { O.connect(); } } });
      else if (later) WB.notify("Uploading " + list.length + " original" + (list.length > 1 ? "s" : "") + " (" + O.mb(total) + ") in the background.", { ms: 8000, action: { label: "Wait for Wi-Fi", fn: function () { O.pending().forEach(function (j) { if (!j.busy) j.wait = true; }); A.renderDesigns(); } } });
    },
    isMissing: function (code) { return O.known() && !O.has(code); }
  };
  O.on(function (fast) { if (fast) { decorate(); var s = cur && O.status(cur.code); if (s && s.s === "uploading" && !pick) { var bar2 = $(".og-prog i", box); if (bar2) bar2.style.width = (s.pct || 0) + "%"; } paintBarLight(); return; } paintBar(); decorate(); if ($("#d-dlg").open && !pick) paintSection(); });
  var lightT = 0; function paintBarLight() { if (Date.now() - lightT > 400) { lightT = Date.now(); paintBar(); } }
  paintBar();
})();
