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
    ".pub button{border:0;border-radius:999px;padding:10px 16px;font:700 .9rem var(--font-body,system-ui);cursor:pointer;background:#fff;color:#241B14;white-space:nowrap}" +
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
    return ["designs", "edits", "projects", "reviews", "settings"].some(function (k) { return JSON.stringify(a[k]) !== JSON.stringify(b[k]); });
  }
  var busy = false, lastOk = 0;
  function refresh() {
    if (busy) return;
    var app = document.getElementById("app"); if (!app || app.hidden) { bar.hidden = true; return; }
    if (dirty()) { bar.hidden = false; bar.classList.remove("ok"); msg.textContent = "Unpublished changes"; bar.querySelector('[data-act="discard"]').hidden = false; pubBtn.hidden = false; }
    else if (Date.now() - lastOk < 12000) { bar.hidden = false; bar.classList.add("ok"); bar.querySelector('[data-act="discard"]').hidden = true; pubBtn.hidden = true; }
    else bar.hidden = true;
  }
  setInterval(refresh, 1500); refresh();

  /* ---------- GitHub ---------- */
  function gh(path, opts, k) {
    opts = opts || {};
    return fetch(API + path, {
      method: opts.method || "GET",
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

  function publish(k) {
    busy = true; pubBtn.disabled = true; msg.textContent = "Publishing…"; bar.classList.remove("ok");
    var draft = WB.db.load(), files = [], usedRefs = [];
    /* images saved by the uploader live in this browser's image store ("idb:…"); fetch them first */
    var refs = [];
    draft.designs.forEach(function (d) { if (/^idb:/.test(d.img || "")) refs.push([d, "img"]); });
    draft.projects.forEach(function (p) { ["before", "after"].forEach(function (k) { if (/^idb:/.test(p[k] || "")) refs.push([p, k]); }); });
    var R = window.WBImages;
    return Promise.all(refs.map(function (r) { usedRefs.push(r[0][r[1]]); return R.resolve(r[0][r[1]]).then(function (u) { if (!u) throw new Error("A photo for " + (r[0].code || r[0].title || "an item") + " is missing on this device. Upload it again."); r[0][r[1]] = u; }); }))
      .then(function () { return build(); })
      .catch(function (e) { busy = false; pubBtn.disabled = false; msg.textContent = "Not published"; alertMsg(e.message); });
    function build() {
    function take(dataUrl, path) {
      var m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl || ""); if (!m) return dataUrl;
      var ext = m[1] === "jpeg" ? "jpg" : m[1], p = path + "-" + hash(m[2]) + "." + ext;
      files.push({ path: p, content: m[2], encoding: "base64" }); return p;
    }
    var out = JSON.parse(JSON.stringify(draft));
    out.designs.forEach(function (d) { d.img = take(d.img, "assets/uploads/designs/" + slug(d.code)); });
    out.projects.forEach(function (p) { var s = slug(p.slug || p.title); p.before = take(p.before, "assets/uploads/projects/" + s + "-before"); p.after = take(p.after, "assets/uploads/projects/" + s + "-after"); });
    var data = { designs: out.designs, edits: out.edits, projects: out.projects, reviews: out.reviews, settings: out.settings, updated: new Date().toISOString() };
    files.push({ path: "assets/published.js", content: "/* Written by the admin Publish button. Do not edit by hand. */\nwindow.WB_PUBLISHED = " + JSON.stringify(data, null, 1) + ";\n", encoding: "utf-8" });

    var headSha, treeSha;
    return gh("/repos/" + OWNER + "/" + REPO + "/git/ref/heads/" + BRANCH, null, k)
      .then(function (ref) { headSha = ref.object.sha; return gh("/repos/" + OWNER + "/" + REPO + "/git/commits/" + headSha, null, k); })
      .then(function (c) {
        treeSha = c.tree.sha;
        msg.textContent = "Uploading " + files.length + (files.length === 1 ? " file…" : " files…");
        return files.reduce(function (p, f) {
          return p.then(function (acc) {
            return gh("/repos/" + OWNER + "/" + REPO + "/git/blobs", { method: "POST", body: { content: f.content, encoding: f.encoding } }, k)
              .then(function (b) { acc.push({ path: f.path, mode: "100644", type: "blob", sha: b.sha }); return acc; });
          });
        }, Promise.resolve([]));
      })
      .then(function (tree) { return gh("/repos/" + OWNER + "/" + REPO + "/git/trees", { method: "POST", body: { base_tree: treeSha, tree: tree } }, k); })
      .then(function (t) {
        var who = (document.getElementById("who-nm") || {}).textContent || "admin";
        return gh("/repos/" + OWNER + "/" + REPO + "/git/commits", { method: "POST", body: { message: "Publish from admin (" + who + ")", tree: t.sha, parents: [headSha] } }, k);
      })
      .then(function (c) { return gh("/repos/" + OWNER + "/" + REPO + "/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha: c.sha } }, k); })
      .then(function () {
        window.WB_PUBLISHED = data;                       // draft now equals what is live
        if (R) usedRefs.forEach(function (ref) { R.forget(ref); });
        WB.db.save(Object.assign(WB.db.load(), { designs: out.designs, projects: out.projects }));
        busy = false; lastOk = Date.now(); pubBtn.disabled = false;
        bar.hidden = false; bar.classList.add("ok"); msg.textContent = "Published. The website updates in 1–2 minutes.";
        bar.querySelector('[data-act="discard"]').hidden = true; pubBtn.hidden = true;
      })
      .catch(function (e) {
        busy = false; pubBtn.disabled = false; msg.textContent = "Not published"; bar.classList.remove("ok");
        if (/key/.test(e.message)) askKey(e.message); else alertMsg(e.message);
      });
    }
  }
  function alertMsg(t) { var tEl = document.querySelector(".toast") || document.body.appendChild(Object.assign(document.createElement("div"), { className: "toast", role: "status" })); tEl.textContent = t; tEl.hidden = false; setTimeout(function () { tEl.hidden = true; }, 6000); }

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

  WB.publishing = { hasKey: function () { return !!key(); }, forgetKey: function () { setKey(""); }, askKey: function () { askKey(); } };
})();
