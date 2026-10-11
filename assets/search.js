/* WallBliss search engine (runs in the visitor's browser, instant, no server).
   1. Cleans the query (case, accents, punctuation, filler words like "wall design for").
   2. Finds phrases first ("pooja room", "seven horses", "world map"), then single words.
   3. Maps each word to concepts through the dictionary (search-lexicon.js) in English, Hindi,
      Kannada and Telugu, and fixes typos ("krishana" -> krishna, "peacok" -> peacock).
   4. Broad words widen to narrower ones ("god" also finds Krishna, Ganesha, Surya…).
   5. Scores each design on its name, hidden tags, AI search words, rooms, styles and colours.
   Returns designs that match every part of the query; if none do, the closest ones, with a note. */
(function () {
  var LEX = window.WB_LEXICON || [], STOP = {};
  (window.WB_STOPWORDS || []).forEach(function (w) { STOP[w] = 1; });

  function clean(s) {
    return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " and ").replace(/[^\p{L}\p{N}\p{M}\s]+/gu, " ").replace(/\s+/g, " ").trim();
  }
  var squash = function (s) { return s.replace(/\s+/g, ""); };

  /* ---------- dictionary ---------- */
  var CONCEPT = {}, WORD2C = {}, PHRASES = {}, MAXP = 1, VOCAB = [];
  LEX.forEach(function (line) {
    var p = line.split("|"), id = p[0], c = { id: id, label: p[1], words: [], narrower: (p[3] || "").split(",").filter(Boolean) };
    CONCEPT[id] = c;
    p[2].split(",").forEach(function (w) {
      w = clean(w); if (!w) return;
      c.words.push(w);
      (WORD2C[w] = WORD2C[w] || []).indexOf(id) < 0 && WORD2C[w].push(id);
      var sq = squash(w); if (sq !== w) (WORD2C[sq] = WORD2C[sq] || []).indexOf(id) < 0 && WORD2C[sq].push(id);
      var n = w.split(" ").length; if (n > 1) { PHRASES[w] = 1; MAXP = Math.max(MAXP, n); }
    });
  });
  VOCAB = Object.keys(WORD2C);
  function expand(ids) {
    var out = {}, stack = ids.slice();
    while (stack.length) { var id = stack.pop(); if (out[id] || !CONCEPT[id]) continue; out[id] = 1; stack.push.apply(stack, CONCEPT[id].narrower); }
    return out;
  }

  /* edit distance with an early exit (Damerau: a swap counts as one) */
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    var prev2 = null, prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i]; var rowMin = i;
      for (j = 1; j <= b.length; j++) {
        var cost = a[i - 1] === b[j - 1] ? 0 : 1;
        var v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v; if (v < rowMin) rowMin = v;
      }
      if (rowMin > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[b.length];
  }
  function allowed(w) { return w.length >= 8 ? 2 : w.length >= 4 ? 1 : 0; }
  function stem(w) { return w.length > 4 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w; }

  /* ---------- index ---------- */
  var DESIGNS = [], WORDSET = {};
  function index(list, spaceWords) {
    DESIGNS = list; WORDSET = {};
    list.forEach(function (d) {
      var name = clean(d.name), extra = (d.spaces || []).map(function (s) { return (spaceWords && spaceWords[s]) || s; }).join(" ");
      var tags = (d.tags || []).concat(d.search || []).map(clean);
      var words = {}, concepts = {};
      function add(text, weight) {
        text.split(" ").forEach(function (w) { if (w) { words[w] = Math.max(words[w] || 0, weight); words[stem(w)] = Math.max(words[stem(w)] || 0, weight); WORDSET[w] = 1; } });
        var sq = squash(text); if (WORD2C[text] || WORD2C[sq]) (WORD2C[text] || WORD2C[sq]).forEach(function (c) { concepts[c] = Math.max(concepts[c] || 0, weight); });
        text.split(" ").forEach(function (w) { (WORD2C[w] || WORD2C[stem(w)] || []).forEach(function (c) { concepts[c] = Math.max(concepts[c] || 0, weight); }); });
      }
      add(name, 4);
      tags.forEach(function (t) { add(t, 3); });
      add(clean(d.code || ""), 5);
      (d.spaces || []).concat(d.styles || [], d.colours || []).forEach(function (f) { concepts[f] = Math.max(concepts[f] || 0, 3); });
      add(clean(extra), 1.5);
      d._s = { name: name, words: words, concepts: concepts };
    });
  }

  /* ---------- parse the query into units ---------- */
  function parse(q, typing) {
    var toks = clean(q).split(" ").filter(Boolean), units = [], i = 0;
    while (i < toks.length) {
      var took = 0;
      for (var n = Math.min(MAXP, toks.length - i); n >= 2 && !took; n--) {
        var ph = toks.slice(i, i + n).join(" ");
        if (PHRASES[ph] || WORD2C[squash(ph)]) { units.push({ text: ph, ids: WORD2C[ph] || WORD2C[squash(ph)] }); took = n; }
      }
      if (took) { i += took; continue; }
      var t = toks[i++];
      if (STOP[t] && toks.length > 1) continue;
      if (STOP[t]) continue;
      var u = { text: t, ids: WORD2C[t] || WORD2C[stem(t)] || null, last: i === toks.length };
      if (!u.ids && t.length >= 4) {                      // typo -> nearest dictionary word
        var best = null, bd = 9, max = allowed(t);
        for (var k = 0; k < VOCAB.length; k++) { var v = VOCAB[k]; if (v.indexOf(" ") > -1) continue; var dd = dist(t, v, max); if (dd <= max && dd < bd) { bd = dd; best = v; if (dd === 0) break; } }
        if (best) { u.ids = WORD2C[best]; u.fixed = best; }
      }
      if (!u.ids && typing && u.last && t.length >= 3) {     // still typing -> prefix of a dictionary word
        var pre = VOCAB.filter(function (v) { return v.indexOf(t) === 0; });
        if (pre.length) { var ids = {}; pre.slice(0, 12).forEach(function (v) { WORD2C[v].forEach(function (c) { ids[c] = 1; }); }); u.ids = Object.keys(ids); u.prefix = true; }
      }
      units.push(u);
    }
    units.forEach(function (u) { if (u.ids) { u.direct = {}; u.ids.forEach(function (c) { u.direct[c] = 1; }); u.all = expand(u.ids); } });
    return units;
  }

  function unitScore(d, u) {
    var s = d._s, best = 0, t = u.text;
    if (s.name.indexOf(t) > -1) best = 4.5;
    var w = s.words[t] || s.words[stem(t)] || s.words[squash(t)];
    if (w) best = Math.max(best, w + 0.6);
    if (u.all) for (var c in u.all) if (s.concepts[c]) best = Math.max(best, u.direct[c] ? 3 + s.concepts[c] / 10 : 2);
    if (!best && u.last && t.length >= 2) for (var x in s.words) if (x.indexOf(t) === 0) { best = 1.2; break; }
    if (!best && !u.ids && t.length >= 4) { var m = allowed(t); for (var y in s.words) if (y.length >= 4 && dist(t, y, m) <= m) { best = 1; break; } }
    return best;
  }

  /* ---------- run ---------- */
  function run(q, list, opts) {
    opts = opts || {};
    list = list || DESIGNS;
    var code = clean(q).replace(/\s/g, "");
    if (/^wb\d+$/.test(code)) {
      var hit = list.filter(function (d) { return clean(d.code).replace(/\s/g, "") === code; });
      return { mode: hit.length ? "all" : "none", results: hit.map(function (d) { return { d: d, s: 10 }; }), understood: [], unknown: [] };
    }
    var units = parse(q, opts.typing);
    if (!units.length) return { mode: "empty", results: list.map(function (d) { return { d: d, s: 1 }; }), understood: [], unknown: [] };
    var all = [], part = [];
    list.forEach(function (d) {
      var tot = 0, hits = 0;
      units.forEach(function (u) { var s = unitScore(d, u); if (s) { hits++; tot += s; } });
      if (hits === units.length) all.push({ d: d, s: tot });
      else if (hits) part.push({ d: d, s: tot + hits });
    });
    var understood = [], unknown = [], seen = {};
    units.forEach(function (u) {
      if (u.ids && !u.prefix) { var c = CONCEPT[u.ids[0]], lb = c ? c.label : u.text; if (!seen[lb]) { seen[lb] = 1; understood.push({ text: u.text, label: lb, fixed: u.fixed || null }); } }
      else if (!u.ids) unknown.push(u.text);
    });
    if (all.length) return { mode: "all", results: all, understood: understood, unknown: unknown };
    if (part.length) return { mode: "partial", results: part, understood: understood, unknown: unknown };
    /* nothing yet for this exact subject: show the family it belongs to ("Ganesha" -> other devotional designs) */
    var parents = {};
    units.forEach(function (u) { (u.ids || []).forEach(function (id) { for (var k in CONCEPT) if (k !== "vastu" && CONCEPT[k].narrower.indexOf(id) > -1) parents[k] = 1; }); });
    var pids = Object.keys(parents);
    if (pids.length) {
      var rel = [];
      list.forEach(function (d) { var sc = 0; pids.forEach(function (p) { if (d._s.concepts[p]) sc += d._s.concepts[p]; }); if (sc) rel.push({ d: d, s: sc }); });
      if (rel.length) return { mode: "related", results: rel, understood: understood, unknown: unknown, related: CONCEPT[pids[0]].label };
    }
    return { mode: "none", results: [], understood: understood, unknown: unknown };
  }
  /* compatibility: score of one design for a query (0 = no full match) */
  function score(d, q, typing) {
    if (!d._s) index(DESIGNS.indexOf(d) > -1 ? DESIGNS : [d]);
    var r = run(q, [d], { typing: typing });
    return r.mode === "all" || r.mode === "empty" ? r.results[0].s : 0;
  }

  function wants(r, id) { return (r.understood || []).some(function (u) { return CONCEPT[id] && u.label === CONCEPT[id].label; }); }
  window.WBSearch = { wants: wants, index: index, run: run, score: score, parse: parse, clean: clean, concepts: CONCEPT };
})();
