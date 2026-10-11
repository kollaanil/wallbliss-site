/* WallBliss image pipeline for catalogue uploads: resize + watermark.
   One template, applied the same way to every design so the catalogue looks consistent.

   RESIZE   Long side 1600 px (never upscaled). Downscaled in halving steps with high-quality
            smoothing so fine detail (faces, text, texture) stays crisp. Saved as JPEG q 0.86,
            typically 250–450 KB.
   WATERMARK (template v1)
            1. Tiled text across the whole image: "WallBliss Studio", diagonal (-28°), white at
               15% with a faint dark edge so it shows on light and dark artwork alike.
               Size scales with the image (3% of the long side), so it looks the same on every design.
            2. Corner badge, bottom-right: WB logo + "WallBliss Studio" + the design code.
               Customers who screenshot a design send the code with it.
   Usage: WBImage.process(fileOrImg, { code: "WB-0137", logo: imgEl, watermark: true }) -> Promise<{dataUrl, w, h, bytes}> */
(function () {
  var LONG = 1600, QUALITY = 0.86, TEXT = "WallBliss Studio";

  function loadImage(src) {
    return new Promise(function (res, rej) {
      if (src instanceof HTMLImageElement && src.complete && src.naturalWidth) return res(src);
      var im = new Image(); im.decoding = "async";
      im.onload = function () { res(im); }; im.onerror = function () { rej(new Error("This file type can't be opened here. Use JPG, PNG or WebP (export print files like TIFF or PDF to JPG first).")); };
      im.src = typeof src === "string" ? src : URL.createObjectURL(src);
    });
  }

  /* high-quality downscale: halve repeatedly, then one final smooth step */
  function resize(img, long) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    var s = Math.min(1, long / Math.max(w, h)), tw = Math.round(w * s), th = Math.round(h * s);
    var src = img, cw = w, ch = h;
    while (cw / 2 >= tw * 1.05) {
      var c = document.createElement("canvas"); c.width = Math.round(cw / 2); c.height = Math.round(ch / 2);
      var x = c.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      x.drawImage(src, 0, 0, c.width, c.height); src = c; cw = c.width; ch = c.height;
    }
    var out = document.createElement("canvas"); out.width = tw; out.height = th;
    var o = out.getContext("2d"); o.imageSmoothingEnabled = true; o.imageSmoothingQuality = "high";
    o.fillStyle = "#fff"; o.fillRect(0, 0, tw, th);                       // flatten transparent PNGs onto white
    o.drawImage(src, 0, 0, tw, th);
    return out;
  }

  function roundRect(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }

  function watermark(canvas, opt) {
    opt = opt || {};
    var W = canvas.width, H = canvas.height, x = canvas.getContext("2d"), L = Math.max(W, H);
    var family = "'DM Sans', 'Segoe UI', system-ui, sans-serif";
    /* 1. tiled diagonal text */
    var fs = Math.max(14, Math.round(L * 0.03));
    x.save();
    x.font = "600 " + fs + "px " + family; x.textBaseline = "middle";
    x.translate(W / 2, H / 2); x.rotate(-28 * Math.PI / 180);
    var tw = x.measureText(TEXT).width + fs * 3.2, gap = fs * 4.2, R = Math.hypot(W, H) / 2 + tw;
    x.lineJoin = "round";
    for (var row = 0, yy = -R; yy < R; yy += gap, row++) {
      for (var xx = -R + (row % 2 ? tw / 2 : 0); xx < R; xx += tw) {
        x.lineWidth = Math.max(1, fs * 0.06); x.strokeStyle = "rgba(0,0,0,.07)"; x.strokeText(TEXT, xx, yy);
        x.fillStyle = "rgba(255,255,255,.15)"; x.fillText(TEXT, xx, yy);
      }
    }
    x.restore();
    /* 2. corner badge: logo + name + code */
    var f = Math.max(12, Math.round(L * 0.018)), pad = Math.round(f * 0.8), logo = opt.logo;
    var hasLogo = logo && logo.complete && logo.naturalWidth;
    x.save();
    x.font = "700 " + f + "px " + family;
    var nameW = x.measureText(TEXT).width;
    x.font = "600 " + Math.round(f * 0.82) + "px " + family;
    var codeTxt = opt.code ? "  ·  " + opt.code : "", codeW = codeTxt ? x.measureText(codeTxt).width : 0;
    var lw = hasLogo ? f * 1.9 : 0, lh = hasLogo ? lw * logo.naturalHeight / logo.naturalWidth : 0;
    var bh = Math.round(f * 2.3), bw = Math.round(pad * 2 + (hasLogo ? lw + pad * 0.6 : 0) + nameW + codeW);
    var bx = W - bw - pad * 1.4, by = H - bh - pad * 1.4;
    x.shadowColor = "rgba(30,20,10,.25)"; x.shadowBlur = f * 0.8; x.shadowOffsetY = f * 0.15;
    x.fillStyle = "rgba(255,253,249,.88)"; roundRect(x, bx, by, bw, bh, bh / 2); x.fill();
    x.shadowColor = "transparent";
    var cx = bx + pad;
    if (hasLogo) { x.drawImage(logo, cx, by + (bh - lh) / 2, lw, lh); cx += lw + pad * 0.6; }
    x.textBaseline = "middle"; x.fillStyle = "#241B14"; x.font = "700 " + f + "px " + family; x.fillText(TEXT, cx, by + bh / 2 + 1);
    if (codeTxt) { x.fillStyle = "#0F6B6E"; x.font = "600 " + Math.round(f * 0.82) + "px " + family; x.fillText(codeTxt, cx + nameW, by + bh / 2 + 1); }
    x.restore();
    return canvas;
  }

  function process(src, opt) {
    opt = opt || {};
    return loadImage(src).then(function (img) {
      var c = resize(img, opt.long || LONG);
      if (opt.watermark !== false) watermark(c, opt);
      var dataUrl = c.toDataURL("image/jpeg", opt.quality || QUALITY);
      return { dataUrl: dataUrl, w: c.width, h: c.height, bytes: Math.round((dataUrl.length - 23) * 0.75), srcW: img.naturalWidth, srcH: img.naturalHeight };
    });
  }

  window.WBImage = { process: process, resize: resize, watermark: watermark, LONG: LONG };
})();
