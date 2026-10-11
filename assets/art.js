/* WallBliss sample-artwork renderer.
   Draws placeholder murals on <canvas> so the site looks complete before real
   design photos are added. When a design in catalogue-data.js has an `img`,
   that photo is used instead and nothing here runs for it. */
(function () {
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function grad(ctx, x0, y0, x1, y1, stops) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (c, i) { g.addColorStop(i / (stops.length - 1), c); });
    return g;
  }

  var G = {};

  G.mountains = function (ctx, w, h, p, r) {
    ctx.fillStyle = grad(ctx, 0, 0, 0, h, [p[0], p[1]]); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = p[4] || "rgba(255,255,255,.8)";
    ctx.beginPath(); ctx.arc(w * (0.2 + r() * 0.6), h * 0.26, h * 0.08, 0, 7); ctx.fill();
    var layers = 5;
    for (var i = 0; i < layers; i++) {
      var base = h * (0.42 + i * 0.12), amp = h * (0.16 - i * 0.02);
      ctx.fillStyle = p[2 + (i % 2)];
      ctx.globalAlpha = 0.35 + i * 0.16;
      ctx.beginPath(); ctx.moveTo(0, h);
      var x = 0, y = base;
      ctx.lineTo(0, y);
      while (x < w) { x += w * (0.06 + r() * 0.1); y = base - r() * amp; ctx.lineTo(x, y); }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  G.waves = function (ctx, w, h, p, r) {
    ctx.fillStyle = grad(ctx, 0, 0, 0, h, [p[0], p[1]]); ctx.fillRect(0, 0, w, h);
    var n = 9;
    for (var i = 0; i < n; i++) {
      var y0 = h * (0.25 + i * 0.09), a = h * (0.03 + r() * 0.04), f = 1.5 + r() * 2, ph = r() * 6;
      ctx.fillStyle = p[2 + (i % 3)] || p[2]; ctx.globalAlpha = 0.25 + (i / n) * 0.7;
      ctx.beginPath(); ctx.moveTo(0, h);
      for (var x = 0; x <= w; x += w / 60) ctx.lineTo(x, y0 + Math.sin((x / w) * Math.PI * f + ph) * a);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  G.leaves = function (ctx, w, h, p, r) {
    ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
    var count = 26;
    for (var i = 0; i < count; i++) {
      var x = r() * w, y = r() * h, s = (0.12 + r() * 0.22) * Math.max(w, h), ang = r() * Math.PI * 2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.fillStyle = p[1 + (i % 3)]; ctx.globalAlpha = 0.75 + r() * 0.25;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(s * 0.35, -s * 0.28, s * 0.85, -s * 0.18, s, 0);
      ctx.bezierCurveTo(s * 0.85, s * 0.18, s * 0.35, s * 0.28, 0, 0); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.lineWidth = Math.max(1, s * 0.012);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 0.95, 0); ctx.stroke();
      for (var k = 1; k < 7; k++) {
        var vx = s * k / 7.5;
        ctx.beginPath(); ctx.moveTo(vx, 0); ctx.lineTo(vx + s * 0.08, -s * 0.13); ctx.moveTo(vx, 0); ctx.lineTo(vx + s * 0.08, s * 0.13); ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  G.mandala = function (ctx, w, h, p, r) {
    ctx.fillStyle = grad(ctx, 0, 0, w, h, [p[0], p[1]]); ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46, rings = 6;
    ctx.save(); ctx.translate(cx, cy);
    for (var i = rings; i > 0; i--) {
      var rr = R * i / rings, petals = 8 + i * 4;
      ctx.fillStyle = p[2 + (i % 3)] || p[2]; ctx.globalAlpha = 0.85;
      for (var k = 0; k < petals; k++) {
        ctx.save(); ctx.rotate((k / petals) * Math.PI * 2 + i * 0.2);
        ctx.beginPath(); ctx.moveTo(0, rr * 0.55);
        ctx.quadraticCurveTo(rr * 0.16, rr * 0.8, 0, rr);
        ctx.quadraticCurveTo(-rr * 0.16, rr * 0.8, 0, rr * 0.55); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.strokeStyle = p[4] || "rgba(255,255,255,.5)"; ctx.lineWidth = Math.max(1, R * 0.006);
      ctx.beginPath(); ctx.arc(0, 0, rr * 0.55, 0, 7); ctx.stroke();
    }
    ctx.fillStyle = p[4] || "#fff"; ctx.beginPath(); ctx.arc(0, 0, R * 0.07, 0, 7); ctx.fill();
    ctx.restore();
  };

  G.warli = function (ctx, w, h, p, r) {
    ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = p[1]; ctx.strokeStyle = p[1];
    var cx = w / 2, cy = h * 0.52, R = Math.min(w, h) * 0.34;
    function person(x, y, s, ang) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
      ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.beginPath(); ctx.arc(0, -s * 0.95, s * 0.16, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.22, -s * 0.75); ctx.lineTo(s * 0.22, -s * 0.75); ctx.lineTo(0, -s * 0.38); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -s * 0.38); ctx.lineTo(-s * 0.22, 0); ctx.lineTo(s * 0.22, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.7); ctx.lineTo(-s * 0.45, -s * 0.5); ctx.moveTo(s * 0.2, -s * 0.7); ctx.lineTo(s * 0.45, -s * 0.5);
      ctx.moveTo(-s * 0.14, 0); ctx.lineTo(-s * 0.24, s * 0.32); ctx.moveTo(s * 0.14, 0); ctx.lineTo(s * 0.24, s * 0.32); ctx.stroke();
      ctx.restore();
    }
    var n = 18, s = R * 0.26;
    for (var i = 0; i < n; i++) { var a = (i / n) * Math.PI * 2; person(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.62, s, 0); }
    for (var j = 0; j < 9; j++) { var a2 = (j / 9) * Math.PI * 2 + 0.3; person(cx + Math.cos(a2) * R * 0.5, cy + Math.sin(a2) * R * 0.3, s * 0.8, 0); }
    ctx.lineWidth = Math.max(1, s * 0.05);
    for (var t = 0; t < 7; t++) { // trees and sun along the top
      var tx = w * (0.08 + t * 0.14), ty = h * 0.2;
      ctx.beginPath(); ctx.moveTo(tx, ty + s); ctx.lineTo(tx, ty - s * 0.3); ctx.stroke();
      for (var b = 0; b < 4; b++) { ctx.beginPath(); ctx.moveTo(tx, ty + b * s * 0.25 - s * 0.1); ctx.lineTo(tx - s * 0.35, ty + b * s * 0.25 - s * 0.45); ctx.moveTo(tx, ty + b * s * 0.25 - s * 0.1); ctx.lineTo(tx + s * 0.35, ty + b * s * 0.25 - s * 0.45); ctx.stroke(); }
    }
    for (var d = 0; d < 70; d++) { ctx.beginPath(); ctx.arc(r() * w, h * (0.86 + r() * 0.12), Math.max(1, s * 0.04), 0, 7); ctx.fill(); }
  };

  G.geometric = function (ctx, w, h, p, r) {
    var cols = 10, size = w / cols, rows = Math.ceil(h / size) + 1;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var px = x * size, py = y * size, c1 = p[Math.floor(r() * p.length)], c2 = p[Math.floor(r() * p.length)];
      ctx.fillStyle = c1; ctx.fillRect(px, py, size + 1, size + 1);
      ctx.fillStyle = c2; ctx.beginPath();
      var k = Math.floor(r() * 4);
      if (k === 0) { ctx.moveTo(px, py); ctx.lineTo(px + size, py); ctx.lineTo(px, py + size); }
      else if (k === 1) { ctx.moveTo(px + size, py); ctx.lineTo(px + size, py + size); ctx.lineTo(px, py + size); }
      else if (k === 2) { ctx.arc(px, py + size, size, -Math.PI / 2, 0); ctx.lineTo(px, py + size); }
      else { ctx.arc(px + size / 2, py + size / 2, size * 0.3, 0, 7); }
      ctx.closePath(); ctx.fill();
    }
  };

  G.stars = function (ctx, w, h, p, r, o) {
    ctx.fillStyle = grad(ctx, 0, 0, 0, h, [p[0], p[1]]); ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 220; i++) { ctx.fillStyle = "rgba(255,255,255," + (0.3 + r() * 0.7) + ")"; ctx.beginPath(); ctx.arc(r() * w, r() * h, r() * Math.max(1, w / 500), 0, 7); ctx.fill(); }
    var R = Math.min(w, h);
    if (o && o.planets) {
      [[0.22, 0.35, 0.12, p[2]], [0.7, 0.28, 0.07, p[3]], [0.58, 0.7, 0.16, p[4] || p[2]]].forEach(function (q) {
        ctx.fillStyle = q[3]; ctx.beginPath(); ctx.arc(w * q[0], h * q[1], R * q[2], 0, 7); ctx.fill();
      });
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = R * 0.012;
      ctx.beginPath(); ctx.ellipse(w * 0.22, h * 0.35, R * 0.2, R * 0.05, -0.3, 0, 7); ctx.stroke();
    } else {
      ctx.fillStyle = p[2]; ctx.beginPath(); ctx.arc(w * 0.75, h * 0.28, R * 0.1, 0, 7); ctx.fill();
      ctx.fillStyle = p[0]; ctx.beginPath(); ctx.arc(w * 0.75 + R * 0.04, h * 0.28 - R * 0.02, R * 0.09, 0, 7); ctx.fill();
      ctx.fillStyle = p[3]; ctx.beginPath(); ctx.moveTo(0, h);
      for (var x = 0; x <= w; x += w / 40) ctx.lineTo(x, h * 0.82 - Math.sin(x / w * 5) * h * 0.04 - r() * h * 0.02);
      ctx.lineTo(w, h); ctx.fill();
    }
  };

  G.dunes = function (ctx, w, h, p, r) {
    ctx.fillStyle = grad(ctx, 0, 0, 0, h, [p[0], p[1]]); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = p[4] || "#fff"; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(w * 0.3, h * 0.35, Math.min(w, h) * 0.12, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    for (var i = 0; i < 4; i++) {
      ctx.fillStyle = p[2 + (i % 2)]; ctx.globalAlpha = 0.6 + i * 0.13;
      var y0 = h * (0.5 + i * 0.12);
      ctx.beginPath(); ctx.moveTo(0, h); ctx.lineTo(0, y0);
      ctx.bezierCurveTo(w * (0.2 + r() * 0.2), y0 - h * 0.18, w * (0.5 + r() * 0.2), y0 + h * 0.1, w, y0 - h * 0.06);
      ctx.lineTo(w, h); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  G.terrazzo = function (ctx, w, h, p, r) {
    ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < 260; i++) {
      var x = r() * w, y = r() * h, s = (0.008 + r() * 0.03) * w;
      ctx.fillStyle = p[1 + Math.floor(r() * (p.length - 1))];
      ctx.beginPath();
      var pts = 4 + Math.floor(r() * 3);
      for (var k = 0; k < pts; k++) { var a = (k / pts) * Math.PI * 2, rr = s * (0.6 + r() * 0.6); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
    }
  };

  G.arches = function (ctx, w, h, p, r) {
    ctx.fillStyle = p[0]; ctx.fillRect(0, 0, w, h);
    var n = 4, bw = w / (n + 1);
    for (var i = 0; i < n; i++) {
      var cx = bw * (i + 1), base = h * (0.85 - r() * 0.15);
      for (var k = 4; k > 0; k--) {
        ctx.fillStyle = p[1 + ((i + k) % (p.length - 1))];
        var rr = bw * 0.12 * k;
        ctx.beginPath(); ctx.moveTo(cx - rr, base); ctx.arc(cx, base, rr, Math.PI, 0); ctx.closePath(); ctx.fill();
      }
    }
    ctx.fillStyle = p[1]; ctx.beginPath(); ctx.arc(w * 0.78, h * 0.22, Math.min(w, h) * 0.08, 0, 7); ctx.fill();
    for (var d = 0; d < 18; d++) { ctx.fillStyle = p[2]; ctx.beginPath(); ctx.arc(r() * w, r() * h * 0.5, Math.min(w, h) * 0.008, 0, 7); ctx.fill(); }
  };

  G.lotus = function (ctx, w, h, p, r) {
    ctx.fillStyle = grad(ctx, 0, 0, 0, h, [p[0], p[1]]); ctx.fillRect(0, 0, w, h);
    var cx = w / 2, cy = h * 0.62, S = Math.min(w, h) * 0.42;
    ctx.fillStyle = p[4] || "rgba(255,230,160,.35)"; ctx.beginPath(); ctx.arc(cx, cy - S * 0.35, S * 0.9, 0, 7); ctx.fill();
    function petal(ang, len, wid, col) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = col;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(wid, -len * 0.4, wid * 0.6, -len * 0.85, 0, -len);
      ctx.bezierCurveTo(-wid * 0.6, -len * 0.85, -wid, -len * 0.4, 0, 0); ctx.fill(); ctx.restore();
    }
    [-1.2, 1.2, -0.8, 0.8].forEach(function (a) { petal(a, S * 0.8, S * 0.26, p[2]); });
    [-0.4, 0.4].forEach(function (a) { petal(a, S * 0.95, S * 0.28, p[3]); });
    petal(0, S, S * 0.3, p[2]);
    ctx.fillStyle = p[3]; ctx.globalAlpha = .6;
    for (var i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx, cy + S * 0.12 + i * S * 0.12, S * (1.1 + i * 0.3), S * 0.05, 0, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  };

  function draw(canvas, d, opts) {
    opts = opts || {};
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(40, Math.round((opts.w || rect.width || 400) * dpr));
    var h = Math.max(30, Math.round((opts.h || rect.height || 300) * dpr));
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext("2d");
    (G[d.gen] || G.waves)(ctx, w, h, d.palette, rng(d.seed || 1), d.opts || {});
    return canvas;
  }

  /* Room mockup: draws a living room with the design on the main wall. */
  function room(canvas, d, opts) {
    opts = opts || {};
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round((rect.width || 800) * dpr), h = Math.round((rect.height || 450) * dpr);
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext("2d");
    var floorY = h * 0.78;
    ctx.fillStyle = opts.wall || "#E9E6DF"; ctx.fillRect(0, 0, w, floorY);
    if (d) {
      var aw = w * 0.86, ah = floorY * 0.86, ax = (w - aw) / 2, ay = floorY * 0.06;
      var off = document.createElement("canvas");
      draw(off, d, { w: aw / dpr, h: ah / dpr });
      ctx.drawImage(off, ax, ay, aw, ah);
      if (d.imgEl) { ctx.drawImage(d.imgEl, ax, ay, aw, ah); }
    }
    // skirting + floor
    ctx.fillStyle = "#D7D2C8"; ctx.fillRect(0, floorY - h * 0.012, w, h * 0.012);
    ctx.fillStyle = grad(ctx, 0, floorY, 0, h, ["#B99B78", "#9C7F5E"]); ctx.fillRect(0, floorY, w, h - floorY);
    ctx.strokeStyle = "rgba(0,0,0,.08)"; ctx.lineWidth = Math.max(1, w * 0.002);
    for (var i = 1; i < 9; i++) { ctx.beginPath(); ctx.moveTo(w * i / 9 - w * 0.03, floorY); ctx.lineTo(w * i / 9 + w * 0.05, h); ctx.stroke(); }
    // sofa
    var sx = w * 0.24, sw = w * 0.52, sy = floorY - h * 0.2;
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(w / 2, floorY + h * 0.03, sw * 0.55, h * 0.03, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#3E4A47";
    roundRect(ctx, sx, sy, sw, h * 0.13, h * 0.02); ctx.fill();
    ctx.fillStyle = "#4C5B57";
    roundRect(ctx, sx - w * 0.02, sy + h * 0.07, sw + w * 0.04, h * 0.12, h * 0.02); ctx.fill();
    ctx.fillStyle = "#2F3936"; ctx.fillRect(sx + w * 0.01, floorY - h * 0.012, w * 0.01, h * 0.02); ctx.fillRect(sx + sw - w * 0.02, floorY - h * 0.012, w * 0.01, h * 0.02);
    // plant
    var px = w * 0.86;
    ctx.fillStyle = "#C9B79C"; roundRect(ctx, px - w * 0.03, floorY - h * 0.1, w * 0.06, h * 0.1, h * 0.01); ctx.fill();
    ctx.fillStyle = "#2E6B45";
    for (var k = 0; k < 7; k++) { ctx.save(); ctx.translate(px, floorY - h * 0.1); ctx.rotate(-1.2 + k * 0.4); ctx.beginPath(); ctx.ellipse(0, -h * 0.09, w * 0.012, h * 0.09, 0, 0, 7); ctx.fill(); ctx.restore(); }
    // lamp
    var lx = w * 0.12;
    ctx.fillStyle = "#2B2B2B"; ctx.fillRect(lx - 1.5 * dpr, floorY - h * 0.36, 3 * dpr, h * 0.36);
    ctx.fillStyle = "#F1E3C2"; ctx.beginPath(); ctx.moveTo(lx - w * 0.035, floorY - h * 0.36); ctx.lineTo(lx + w * 0.035, floorY - h * 0.36); ctx.lineTo(lx + w * 0.022, floorY - h * 0.44); ctx.lineTo(lx - w * 0.022, floorY - h * 0.44); ctx.closePath(); ctx.fill();
    return canvas;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  window.WBArt = { draw: draw, room: room, generators: Object.keys(G) };
})();
