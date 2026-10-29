/* WallBliss admin — original design files, archived in Google Drive.
   Every original picked in "Add design" (or attached later) is uploaded, untouched, to ONE folder in the
   studio's Google Drive (wallblissstudio@gmail.com), named "WB-0124 Kamadhenu colorful.jpeg".
   The website copy is made separately, as before; publishing never waits for Drive.

   HOW IT STAYS SAFE
   • Drive access is asked for separately from the admin sign-in, always as the studio account. Any other
     account is refused, so files never land in a personal Drive.
   • Permission "drive.file": the site only sees files it created plus the folder picked in Google's picker.
   • Files are found by a hidden tag (appProperties wbCode), not by name or place, so renaming or moving a
     file in Drive does not lose it. No Drive links are written into the public website data.
   • Uploads go through a queue kept in this browser (IndexedDB): a dropped connection, a closed tab or an
     expired sign-in only pauses it. Big files upload in 8 MB pieces and resume where they stopped.
   • Nothing is ever deleted: replaced or deleted designs move their original to the "Retired" subfolder.
   Setup (once): README → "Design originals". Config: assets/admin-config.js → drive. */
(function () {
  "use strict";
  var CFG = (window.WB_ADMIN_CONFIG || {}).drive || {};
  if (!CFG.apiKey) return;                                   // feature off until configured
  var A = window.WBAdmin, $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var CLIENT = (window.WB_ADMIN_CONFIG || {}).googleClientId, ACCOUNT = String(CFG.account || "").toLowerCase();
  var SCOPE = "https://www.googleapis.com/auth/drive.file", API = "https://www.googleapis.com/drive/v3", UP = "https://www.googleapis.com/upload/drive/v3";
  var CHUNK = 8 * 1024 * 1024, HASH_MAX = 300 * 1024 * 1024;
  var FIELDS = "id,name,size,mimeType,createdTime,trashed,parents,appProperties,imageMediaMetadata(width,height),webViewLink";

  /* ---------------- small stores ---------------- */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var Q = {                                                   // the upload queue: survives reloads and closed tabs
    db: null,
    open: function () {
      if (Q.db) return Promise.resolve(Q.db);
      return new Promise(function (res, rej) {
        var r = indexedDB.open("wb_originals", 1);
        r.onupgradeneeded = function () { r.result.createObjectStore("q", { keyPath: "id" }); };
        r.onsuccess = function () { Q.db = r.result; res(Q.db); }; r.onerror = function () { rej(r.error); };
      });
    },
    tx: function (mode, fn) { return Q.open().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction("q", mode), out = fn(t.objectStore("q")); t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); }; t.onerror = function () { rej(t.error); }; t.onabort = function () { rej(t.error || new Error("Storage full")); }; }); }); },
    all: function () { return Q.tx("readonly", function (s) { return s.getAll(); }); },
    put: function (it) { return Q.tx("readwrite", function (s) { s.put(it); }); },
    del: function (id) { return Q.tx("readwrite", function (s) { s.delete(id); }); }
  };
  var queue = [];                                             // in-memory copy of the queue (with progress)
  function qLoad() { return Q.all().then(function (l) { queue = (l || []).sort(function (a, b) { return a.at - b.at; }); }).catch(function () { queue = []; }); }
  function qSave(it) { var keep = Object.assign({}, it); delete keep.pct; delete keep.busy; return Q.put(keep); }

  /* ---------------- settings (shared by both editors through the published data) ---------------- */
  function conf() { var s = A.db().settings || {}; return s.originals || {}; }
  function setConf(c) { var db = A.db(); db.settings = db.settings || {}; db.settings.originals = Object.assign({}, conf(), c); A.save(); A.autoPublish("Originals folder saved"); }

  /* ---------------- Google sign-in for Drive (separate from the admin sign-in) ---------------- */
  var tok = lsGet("wb_drive_tok", null), tokenClient = null, pendingTok = null, state = { need: "", full: false, quota: null, err: "" };
  function tokenOk() { return tok && tok.t && tok.exp > Date.now() + 60000; }
  function gisReady() { return !!(window.google && google.accounts && google.accounts.oauth2); }
  function initClient() {
    if (tokenClient || !gisReady()) return !!tokenClient;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT, scope: SCOPE, hint: ACCOUNT, include_granted_scopes: true,
      callback: function (r) {
        var p = pendingTok; pendingTok = null; if (!p) return;
        if (r.error || !r.access_token) return p.rej(new Error(r.error === "access_denied" ? "Drive access was not allowed." : "Drive sign-in didn't finish."));
        p.res({ t: r.access_token, exp: Date.now() + (+r.expires_in || 3600) * 1000 });
      },
      error_callback: function (e) {
        var p = pendingTok; pendingTok = null; if (!p) return;
        p.rej(new Error(e && e.type === "popup_failed_to_open" ? "POPUP" : e && e.type === "popup_closed" ? "The Google window was closed before finishing." : "Drive sign-in didn't finish."));
      }
    });
    return true;
  }
  /* must be called straight from a tap (browsers only allow sign-in pop-ups then) */
  function signIn() {
    if (!initClient()) return Promise.reject(new Error("Google isn't loaded yet. Wait a moment and tap again."));
    var p = new Promise(function (res, rej) { pendingTok = { res: res, rej: rej }; });
    tokenClient.requestAccessToken({ prompt: tok ? "" : "consent", hint: ACCOUNT });
    return p.then(function (t) {
      return api("GET", "/about?fields=user(emailAddress),storageQuota", null, t.t).then(function (a) {
        var email = String(a.user && a.user.emailAddress || "").toLowerCase();
        if (ACCOUNT && email !== ACCOUNT) {
          try { google.accounts.oauth2.revoke(t.t, function () {}); } catch (e) {}
          throw new Error("Connected as " + email + ". Please choose " + ACCOUNT + " in the Google window.");
        }
        tok = { t: t.t, exp: t.exp, email: email }; lsSet("wb_drive_tok", tok);
        state.need = ""; state.quota = a.storageQuota || null; state.full = false; state.err = "";
        return tok;
      });
    });
  }
  function popupHelp(e) { return e.message === "POPUP" ? "The browser blocked Google's window. Allow pop-ups for wallbliss.in (Safari: Settings → Websites → Pop-up Windows) and tap again." : e.message; }

  /* ---------------- Drive API ---------------- */
  function api(method, path, body, t, base) {
    t = t || (tok && tok.t);
    var url = (base || API) + path;
    return fetch(url, { method: method, headers: Object.assign({ Authorization: "Bearer " + t }, body ? { "Content-Type": "application/json; charset=UTF-8" } : {}), body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        if (r.status === 401) { state.need = "reconnect"; throw new Error("AUTH"); }
        if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) {
          var reason = ((j.error && j.error.errors && j.error.errors[0]) || {}).reason || "";
          if (/storageQuotaExceeded/.test(reason)) { state.full = true; throw new Error("FULL"); }
          if (r.status === 404) throw new Error("NOTFOUND");
          throw new Error("Drive said " + r.status + (j.error && j.error.message ? ": " + j.error.message : ""));
        });
        return r.status === 204 ? null : r.json();
      });
  }

  /* ---------------- the index: which designs have an original (cached for showing offline) ---------------- */
  var index = lsGet("wb_orig_index", null);                   // { at, files: { CODE: fileInfo }, trash: { CODE: fileInfo } }
  function info(f) {
    var ap = f.appProperties || {}, m = f.imageMediaMetadata || {};
    return { id: f.id, name: f.name, size: +f.size || 0, mime: f.mimeType, at: f.createdTime, by: ap.wbBy || "", sha: ap.wbSha || "", w: m.width || 0, h: m.height || 0, link: f.webViewLink, parents: f.parents || [] };
  }
  function listAll(pageToken, acc) {
    var q = encodeURIComponent("appProperties has { key='wbApp' and value='originals' }");
    return api("GET", "/files?pageSize=1000&q=" + q + "&fields=nextPageToken,files(" + FIELDS + ")" + (pageToken ? "&pageToken=" + pageToken : ""))
      .then(function (r) { acc = acc.concat(r.files || []); return r.nextPageToken ? listAll(r.nextPageToken, acc) : acc; });
  }
  function refresh() {
    if (!tokenOk() || !conf().folderId) return Promise.resolve(false);
    return listAll(null, []).then(function (all) {
      var retired = conf().retiredId, files = {}, trash = {};
      all.forEach(function (f) {
        var code = (f.appProperties || {}).wbCode; if (!code) return;
        if ((f.parents || []).indexOf(retired) > -1) return;          // retired originals don't count
        var i = info(f);
        if (f.trashed) { if (!files[code]) trash[code] = i; return; }
        if (!files[code] || files[code].at < i.at) files[code] = i;   // newest wins if there are two
        delete trash[code];
      });
      index = { at: Date.now(), files: files, trash: trash }; lsSet("wb_orig_index", index);
      return api("GET", "/about?fields=storageQuota").then(function (a) { state.quota = a.storageQuota || null; }).catch(function () {}).then(function () { changed(); return true; });
    }).catch(function (e) { if (e.message === "AUTH") changed(); return false; });
  }

  /* ---------------- helpers ---------------- */
  function cleanName(code, name, file) {
    var ext = (/\.([a-z0-9]{1,5})$/i.exec(file && file.name || "") || [])[1];
    if (!ext) ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/tiff": "tif", "application/pdf": "pdf" }[file && file.type] || "";
    var base = (code + " " + String(name || "").replace(/[\/\\:*?"<>|#%]+/g, " ")).replace(/\s+/g, " ").trim().slice(0, 120);
    return base + (ext ? "." + ext.toLowerCase() : "");
  }
  function sha(file) {
    if (!file || file.size > HASH_MAX || !(window.crypto && crypto.subtle)) return Promise.resolve("");
    return file.arrayBuffer().then(function (b) { return crypto.subtle.digest("SHA-256", b); })
      .then(function (h) { return Array.prototype.map.call(new Uint8Array(h), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }).catch(function () { return ""; });
  }
  function mb(n) { if (n >= 1073741824) return (n / 1073741824).toFixed(1) + " GB"; return n >= 1048576 ? (n / 1048576).toFixed(n >= 104857600 ? 0 : 1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function day(iso) { try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch (e) { return ""; } }
  function who() { var w = document.getElementById("who-nm"); return (w && w.textContent || "").trim(); }
  function coarse() { return matchMedia && matchMedia("(pointer: coarse)").matches; }

  /* ---------------- the queue: upload / rename / retire, one at a time ---------------- */
  function add(job) {
    job.id = job.id || job.op + "-" + job.code + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    job.at = job.at || Date.now(); job.tries = 0; job.err = "";
    queue.push(job); changed();
    return qSave(job).catch(function () {
      /* the browser has no room to keep the file for later: upload now if possible, otherwise ask to attach again */
      job.memoryOnly = true;
      if (job.op === "upload") WB.notify("This browser has no room to keep " + job.code + "'s original for later. It uploads now; if that fails, attach it again from the design.", { ms: 8000 });
    }).then(function () { run(); return job; });
  }
  var running = false;
  function run() {
    if (running) return;
    var next = queue.filter(function (j) { return !j.wait && !j.failed; })[0];
    if (!next) { changed(); return; }
    if (!conf().folderId) { state.need = "folder"; changed(); return; }
    if (!tokenOk()) { state.need = "reconnect"; changed(); return; }
    if (state.full) { changed(); return; }
    if (!navigator.onLine) { changed(); addEventListener("online", run, { once: true }); return; }
    running = true; next.busy = true; changed();
    (next.op === "upload" ? doUpload(next) : next.op === "rename" ? doRename(next) : doRetire(next)).then(function () {
      queue.splice(queue.indexOf(next), 1); return Q.del(next.id).catch(function () {});
    }, function (e) {
      next.busy = false; next.pct = 0;
      if (e.message === "AUTH") { state.need = "reconnect"; return; }
      if (e.message === "FULL") { state.full = true; return; }
      next.tries++; next.err = e.message;
      if (next.tries >= 3) { next.failed = true; return qSave(next).catch(function () {}); }
      return new Promise(function (r) { setTimeout(r, 2000 * next.tries); });
    }).then(function () { running = false; changed(); if (!state.need && !state.full) run(); });
  }
  function codeFile(code) { return index && index.files && index.files[code] || null; }
  function doUpload(j) {
    var f = j.file, folder = conf().folderId;
    if (!f) return Promise.reject(new Error("The file is no longer in this browser. Attach it again."));
    var meta = { name: cleanName(j.code, j.name, f), parents: [folder], mimeType: f.type || "application/octet-stream",
      description: "WallBliss design " + j.code + " · " + (j.name || "") + (j.note ? " · " + j.note : ""),
      appProperties: { wbApp: "originals", wbCode: j.code, wbSha: j.sha || "", wbBy: j.by || "" } };
    return startSession(j, meta).then(function () { return sendChunks(j); }).then(function (file) {
      /* any older original of this code (replaced, or saved by the other editor meanwhile) moves to Retired */
      return refresh().then(function () {
        return listCode(j.code).then(function (list) {
          var old = list.filter(function (x) { return x.id !== file.id && !x.trashed && (x.parents || []).indexOf(conf().retiredId) < 0; });
          return old.reduce(function (p, o) { return p.then(function () { return retireFile(o, "replaced " + day(new Date().toISOString())); }); }, Promise.resolve());
        });
      }).then(refresh);
    });
  }
  function listCode(code) {
    var q = encodeURIComponent("appProperties has { key='wbCode' and value='" + code.replace(/'/g, "") + "' }");
    return api("GET", "/files?pageSize=50&q=" + q + "&fields=files(" + FIELDS + ")").then(function (r) { return r.files || []; });
  }
  function startSession(j, meta) {
    if (j.session) return Promise.resolve();
    return fetch(UP + "/files?uploadType=resumable&fields=" + encodeURIComponent(FIELDS), {
      method: "POST", headers: { Authorization: "Bearer " + tok.t, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": meta.mimeType, "X-Upload-Content-Length": String(j.file.size) },
      body: JSON.stringify(meta)
    }).then(function (r) {
      if (r.status === 401) throw new Error("AUTH");
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (x) { var reason = ((x.error && x.error.errors && x.error.errors[0]) || {}).reason || ""; if (/storageQuota/.test(reason)) throw new Error("FULL"); throw new Error("Drive said " + r.status); });
      var loc = r.headers.get("Location"); if (!loc) throw new Error("Drive didn't start the upload. Try again.");
      j.session = loc; j.offset = 0; return qSave(j).catch(function () {});
    });
  }
  function put(url, blob, range) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest(); x.open("PUT", url);
      x.setRequestHeader("Content-Range", range);
      x.upload.onprogress = function (e) { if (put.onp) put.onp(e.loaded); };
      x.onload = function () { res({ status: x.status, range: x.getResponseHeader("Range"), body: x.responseText }); };
      x.onerror = function () { rej(new Error("The connection dropped. It will continue.")); };
      x.send(blob);
    });
  }
  function sendChunks(j) {
    var size = j.file.size;
    function step() {
      var from = j.offset || 0, to = Math.min(size, from + CHUNK);
      put.onp = function (n) { j.pct = Math.round((from + n) / Math.max(1, size) * 100); changed(true); };
      return put(j.session, size ? j.file.slice(from, to) : j.file, size ? "bytes " + from + "-" + (to - 1) + "/" + size : "bytes */0").then(function (r) {
        if (r.status === 200 || r.status === 201) { j.pct = 100; return JSON.parse(r.body); }
        if (r.status === 308) { var m = /bytes=0-(\d+)/.exec(r.range || ""); j.offset = m ? +m[1] + 1 : to; qSave(j).catch(function () {}); return step(); }
        if (r.status === 404 || r.status === 410) { j.session = null; j.offset = 0; throw new Error("The upload expired. Starting again."); }
        if (r.status === 401) throw new Error("AUTH");
        throw new Error("Drive said " + r.status + " while uploading.");
      });
    }
    /* after a break, ask Drive how much it already has */
    if (j.offset) return put(j.session, new Blob([]), "bytes */" + size).then(function (r) {
      if (r.status === 200 || r.status === 201) return JSON.parse(r.body);
      if (r.status === 308) { var m = /bytes=0-(\d+)/.exec(r.range || ""); j.offset = m ? +m[1] + 1 : 0; return step(); }
      j.session = null; j.offset = 0; throw new Error("The upload expired. Starting again.");
    });
    return step();
  }
  function retireFile(f, why) {
    var r = conf().retiredId, from = (f.parents || []).join(",");
    var name = String(f.name).replace(/(\.[a-z0-9]{1,5})?$/i, function (ext) { return " (" + why + ")" + ext; });
    return api("PATCH", "/files/" + f.id + "?fields=id" + (r ? "&addParents=" + r + (from ? "&removeParents=" + from : "") : ""), { name: name });
  }
  function doRename(j) {
    return listCode(j.code).then(function (list) {
      var live = list.filter(function (x) { return !x.trashed && (x.parents || []).indexOf(conf().retiredId) < 0; });
      return live.reduce(function (p, f) {
        var want = cleanName(j.code, j.name, { name: f.name });
        return p.then(function () { return f.name === want ? null : api("PATCH", "/files/" + f.id + "?fields=id", { name: want }); });
      }, Promise.resolve());
    }).then(refresh);
  }
  function doRetire(j) {
    return listCode(j.code).then(function (list) {
      var live = list.filter(function (x) { return !x.trashed && (x.parents || []).indexOf(conf().retiredId) < 0; });
      return live.reduce(function (p, f) { return p.then(function () { return retireFile(f, "design deleted " + day(new Date().toISOString())); }); }, Promise.resolve());
    }).then(refresh);
  }

  /* ---------------- folder: picked once (in Google's own picker), shared by both editors ---------------- */
  var pickerP = null;
  function pickerLib() {
    pickerP = pickerP || new Promise(function (res, rej) {
      function go() { gapi.load("picker", { callback: res, onerror: function () { pickerP = null; rej(new Error("Couldn't load Google's folder picker.")); } }); }
      if (window.gapi) return go();
      var s = document.createElement("script"); s.src = "https://apis.google.com/js/api.js"; s.onload = go; s.onerror = function () { pickerP = null; rej(new Error("Couldn't reach Google. Check the internet.")); };
      document.head.appendChild(s);
    });
    return pickerP;
  }
  function pickFolder() {
    return pickerLib().then(function () {
      return new Promise(function (res, rej) {
        var view = new google.picker.DocsView(google.picker.ViewId.FOLDERS).setSelectFolderEnabled(true).setIncludeFolders(true).setMimeTypes("application/vnd.google-apps.folder");
        new google.picker.PickerBuilder().addView(view).setOAuthToken(tok.t).setDeveloperKey(CFG.apiKey).setAppId(CFG.appId)
          .setTitle("Choose the “" + (CFG.folderName || "Design originals") + "” folder").setCallback(function (d) {
            if (d.action === google.picker.Action.PICKED) { var f = d.docs[0]; res({ id: f.id, name: f.name }); }
            else if (d.action === google.picker.Action.CANCEL) rej(new Error("No folder chosen."));
          }).build().setVisible(true);
      });
    }).then(function (f) {
      /* a "Retired" folder made by this site inside it (the site can't see folders it didn't make or wasn't given) */
      var q = encodeURIComponent("'" + f.id + "' in parents and mimeType='application/vnd.google-apps.folder' and name='Retired' and trashed=false");
      return api("GET", "/files?q=" + q + "&fields=files(id)").then(function (r) {
        if (r.files && r.files[0]) return r.files[0].id;
        return api("POST", "/files?fields=id", { name: "Retired", mimeType: "application/vnd.google-apps.folder", parents: [f.id], description: "Originals of replaced or deleted WallBliss designs. Nothing here is deleted." }).then(function (x) { return x.id; });
      }).then(function (rid) { setConf({ folderId: f.id, folderName: f.name, retiredId: rid, by: who(), at: new Date().toISOString() }); return f; });
    });
  }

  /* ---------------- public API for the admin screens ---------------- */
  var listeners = [];
  var paintT = null;
  function changed(fast) {
    if (fast) { listeners.forEach(function (fn) { try { fn(true); } catch (e) {} }); return; }
    clearTimeout(paintT); paintT = setTimeout(function () { listeners.forEach(function (fn) { try { fn(false); } catch (e) {} }); }, 30);
  }
  function jobFor(code) { return queue.filter(function (j) { return j.code === code && j.op === "upload"; }).slice(-1)[0] || null; }
  var O = window.WBOriginals = {
    on: function (fn) { listeners.push(fn); },
    connected: function () { return tokenOk(); },
    folder: function () { return conf(); },
    known: function () { return !!index; },
    state: function () { return { need: !conf().folderId ? "folder" : state.need || (!tokenOk() && pendingCount() ? "reconnect" : ""), full: state.full, quota: state.quota, err: state.err, at: index && index.at, email: tok && tok.email }; },
    status: function (code) {
      var j = jobFor(code);
      if (j) return j.failed ? { s: "failed", job: j } : j.busy ? { s: "uploading", pct: j.pct || 0, job: j } : j.wait ? { s: "wifi", job: j } : { s: "queued", job: j };
      if (!index) return { s: "unknown" };
      if (index.files[code]) return { s: "saved", file: index.files[code] };
      if (index.trash && index.trash[code]) return { s: "trash", file: index.trash[code] };
      return { s: "missing" };
    },
    has: function (code) { var s = O.status(code).s; return s === "saved" || s === "uploading" || s === "queued" || s === "wifi"; },
    pending: function () { return queue.slice(); },
    /* a tap: sign in to Drive as the studio account (and pick the folder the first time) */
    connect: function () {
      return signIn().then(function () { return conf().folderId ? null : pickFolder(); }).then(function () { state.need = ""; return refresh(); })
        .then(function () { run(); WB.notify("Drive connected: " + (conf().folderName || "originals folder") + "."); })
        .catch(function (e) { state.err = popupHelp(e); WB.notify(state.err, { type: "error" }); changed(); });
    },
    changeFolder: function () {
      return (tokenOk() ? Promise.resolve() : signIn()).then(pickFolder).then(refresh).then(function () { run(); WB.notify("Originals folder changed for both of you."); })
        .catch(function (e) { WB.notify(popupHelp(e), { type: "error" }); });
    },
    disconnect: function () {
      if (tok && tok.t) try { google.accounts.oauth2.revoke(tok.t, function () {}); } catch (e) {}
      tok = null; lsSet("wb_drive_tok", null); state.need = "reconnect"; changed(); WB.notify("Drive disconnected on this device.");
    },
    refresh: refresh,
    /* queue the original of a design. opts: { replace, wait (Wi-Fi later), note } */
    save: function (code, name, file, opts) {
      opts = opts || {};
      return sha(file).then(function (h) {
        return add({ op: "upload", code: code, name: name, file: file, size: file.size, type: file.type, fname: file.name, sha: h, by: who(), wait: !!opts.wait, note: opts.note || "" });
      });
    },
    rename: function (code, name) { if (O.status(code).s === "missing") return; return add({ op: "rename", code: code, name: name }); },
    retire: function (code) { queue.filter(function (j) { return j.code === code && j.op === "upload" && !j.busy; }).forEach(function (j) { queue.splice(queue.indexOf(j), 1); Q.del(j.id).catch(function () {}); }); if (!index || !index.files[code]) return; return add({ op: "retire", code: code }); },
    retry: function (code) {
      queue.forEach(function (j) { if (!code || j.code === code) { j.failed = false; j.wait = false; j.tries = 0; qSave(j).catch(function () {}); } });
      state.full = false; changed(); run();
    },
    cancel: function (code) { queue.filter(function (j) { return j.code === code && !j.busy; }).forEach(function (j) { queue.splice(queue.indexOf(j), 1); Q.del(j.id).catch(function () {}); }); changed(); },
    /* same file content already saved for another design? */
    duplicateOf: function (file, code) {
      return sha(file).then(function (h) {
        if (!h || !index) return null;
        var hit = null; Object.keys(index.files).forEach(function (c) { if (c !== code && index.files[c].sha === h) hit = c; });
        return hit;
      });
    },
    open: function (code) { var f = index && (index.files[code] || (index.trash || {})[code]); if (f && f.link) window.open(f.link, "_blank", "noopener"); },
    mb: mb, day: day, coarse: coarse, needsTap: function () { return !tokenOk(); }, signIn: signIn, popupHelp: popupHelp
  };
  function pendingCount() { return queue.filter(function (j) { return !j.wait; }).length; }

  /* start: load the queue, then catch up quietly if this device is still signed in to Drive */
  qLoad().then(function () { changed(); if (tokenOk()) refresh().then(run); else if (pendingCount()) { state.need = "reconnect"; changed(); } });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && tokenOk() && (!index || Date.now() - index.at > 5 * 60000)) refresh().then(run); });
  addEventListener("beforeunload", function (e) { if (queue.some(function (j) { return j.busy; })) { e.preventDefault(); e.returnValue = ""; } });
})();
