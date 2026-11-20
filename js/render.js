/* K-Cheer Studio · canvas renderers and the PDF writer */
(function () {
  'use strict';

  var U = window.KCS_FRAME_UTIL;
  var INK = U.INK;
  var PAPER = U.PAPER;
  var MUTED = U.MUTED;

  function hexToRgb(hex) {
    var h = (hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function luminance(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return 0.5;
    var c = rgb.map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function withAlpha(hex, a) {
    var rgb = hexToRgb(hex) || [0, 0, 0];
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  function fitSize(ctx, text, maxW, start, min, weight, family, spacing) {
    var size = start;
    while (size > min) {
      ctx.font = weight + ' ' + Math.round(size) + 'px ' + family;
      if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = spacing;
      if (ctx.measureText(text).width <= maxW) break;
      size *= 0.96;
    }
    return Math.round(size);
  }

  /* ---------- slogan ---------- */

  function drawSlogan(ctx, W, H, s, opts) {
    var ground = s.ground || 'dark';
    var color = s.color || '#E4572E';
    var h = W / 3;
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = ground === 'dark' ? INK : PAPER;
    ctx.fillRect(0, 0, W, H);

    var dark = ground === 'dark';
    var textInk;
    if (dark) textInk = luminance(color) < 0.16 ? PAPER : color;
    else textInk = luminance(color) > 0.62 ? INK : color;
    var subInk = dark ? withAlpha(PAPER, 0.82) : MUTED;

    /* pattern */
    var p = s.pattern || 'holo';
    if (p === 'holo') {
      ctx.save();
      var band = W / 26;
      for (var i = -H; i < W + H; i += band * 2) {
        ctx.fillStyle = withAlpha(color, dark ? 0.16 : 0.13);
        ctx.beginPath();
        ctx.moveTo(i, H);
        ctx.lineTo(i + band, H);
        ctx.lineTo(i + band + H * 0.9, 0);
        ctx.lineTo(i + H * 0.9, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = withAlpha(dark ? PAPER : color, dark ? 0.16 : 0.22);
        ctx.lineWidth = Math.max(1, W * 0.0008);
        ctx.beginPath();
        ctx.moveTo(i + band, H);
        ctx.lineTo(i + band + H * 0.9, 0);
        ctx.stroke();
      }
      ctx.restore();
    } else if (p === 'check') {
      var cell = H / 7;
      ctx.fillStyle = withAlpha(color, dark ? 0.2 : 0.16);
      for (var xi = 0; xi * cell < W; xi++) {
        for (var yi = 0; yi * cell < H; yi++) {
          if ((xi + yi) % 2 === 0) ctx.fillRect(xi * cell, yi * cell, cell, cell);
        }
      }
      ctx.strokeStyle = withAlpha(dark ? PAPER : INK, 0.35);
      ctx.lineWidth = Math.max(1, H * 0.006);
      ctx.strokeRect(W * 0.035, H * 0.09, W * 0.93, H * 0.82);
    } else if (p === 'border') {
      ctx.strokeStyle = color;
      ctx.lineWidth = H * 0.022;
      ctx.strokeRect(W * 0.03, H * 0.08, W * 0.94, H * 0.84);
      ctx.strokeStyle = withAlpha(dark ? PAPER : INK, 0.5);
      ctx.lineWidth = Math.max(1, H * 0.005);
      ctx.strokeRect(W * 0.048, H * 0.13, W * 0.904, H * 0.74);
      ctx.fillStyle = color;
      var cw = W * 0.012;
      [[W * 0.03, H * 0.08], [W * 0.97 - cw, H * 0.08], [W * 0.03, H * 0.92 - cw], [W * 0.97 - cw, H * 0.92 - cw]].forEach(function (pt) {
        ctx.fillRect(pt[0], pt[1], cw, cw);
      });
    } else {
      ctx.fillStyle = withAlpha(color, dark ? 0.14 : 0.1);
      ctx.fillRect(0, H * 0.86, W, H * 0.14);
    }

    /* main line */
    var main = (s.text || '').trim();
    var sub = (s.sub || '').trim();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (main) {
      var family = '"Archivo Black", "Pretendard Black", sans-serif';
      var spacing = '0em';
      var maxW = W * (p === 'border' ? 0.82 : 0.87);
      if (s.font === 'wide') spacing = '0.1em';
      if (s.font === 'condensed') spacing = '-0.02em';
      var size = fitSize(ctx, main, maxW, H * 0.52, H * 0.1, '400', family, spacing);
      ctx.save();
      ctx.translate(W / 2, H * (sub ? 0.43 : 0.48));
      if (s.font === 'slant') ctx.transform(1, 0, -0.16, 1, 0, 0);
      if (s.font === 'condensed') ctx.scale(0.8, 1);
      if (s.font === 'wide') ctx.scale(0.92, 1);
      ctx.font = '400 ' + size + 'px ' + family;
      if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
      if (s.font === 'outline') {
        ctx.lineWidth = Math.max(2, size * 0.035);
        ctx.strokeStyle = textInk;
        ctx.lineJoin = 'round';
        ctx.strokeText(main, 0, 0);
      } else {
        ctx.fillStyle = textInk;
        ctx.fillText(main, 0, 0);
      }
      ctx.restore();
    }

    /* sub line */
    if (sub) {
      ctx.save();
      ctx.font = '400 ' + Math.round(H * 0.062) + 'px Pretendard, sans-serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.18em';
      ctx.fillStyle = subInk;
      ctx.fillText(sub, W / 2, H * 0.735, W * 0.82);
      ctx.restore();
      ctx.strokeStyle = withAlpha(dark ? PAPER : INK, 0.28);
      ctx.lineWidth = Math.max(1, H * 0.004);
      ctx.beginPath();
      ctx.moveTo(W / 2 - W * 0.06, H * 0.665);
      ctx.lineTo(W / 2 + W * 0.06, H * 0.665);
      ctx.stroke();
    }

    if (opts && opts.mark) {
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = '400 ' + Math.round(H * 0.032) + 'px Pretendard, sans-serif';
      ctx.fillStyle = dark ? withAlpha(PAPER, 0.55) : withAlpha(INK, 0.5);
      ctx.fillText(opts.mark, W * 0.022, H * 0.955);
      ctx.restore();
    }

    ctx.restore();
  }

  /* ---------- photocard ---------- */

  function drawPhoto(ctx, W, H, frame, o, img) {
    var g = frame.geom(W, H);
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    frame.draw(ctx, g, o);
    if (img) {
      ctx.save();
      U.rr(ctx, g.win.x, g.win.y, g.win.w, g.win.h, 0);
      ctx.clip();
      var r = Math.max(g.win.w / img.width, g.win.h / img.height);
      var dw = img.width * r;
      var dh = img.height * r;
      ctx.drawImage(img, g.win.x + (g.win.w - dw) / 2, g.win.y + (g.win.h - dh) / 2, dw, dh);
      ctx.restore();
    }
    if (o.mark) {
      ctx.save();
      ctx.fillStyle = 'rgba(31,27,36,0.5)';
      ctx.font = '400 ' + Math.round(W * 0.026) + 'px Pretendard, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(o.mark, W - W * 0.05, H - H * 0.012);
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- ticket ---------- */

  function drawTicket(ctx, W, H, t, opts) {
    var color = t.color || '#B03A6E';
    var title = (t.title || '').trim();
    var date = (t.date || '').trim();
    var venue = (t.venue || '').trim();
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    if (t.variant === 'ribbon') {
      var rw = W;
      var rh = H;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, rh * 0.05);
      ctx.lineTo(rw / 2, 0);
      ctx.lineTo(rw, rh * 0.05);
      ctx.lineTo(rw, rh * 0.95);
      ctx.lineTo(rw / 2, rh);
      ctx.lineTo(0, rh * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(251,244,243,0.18)';
      ctx.fillRect(rw * 0.14, rh * 0.07, Math.max(1, rw * 0.012), rh * 0.86);
      ctx.fillRect(rw * 0.85, rh * 0.07, Math.max(1, rw * 0.012), rh * 0.86);

      ctx.save();
      ctx.translate(rw / 2, rh / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = PAPER;
      var rsize = fitSize(ctx, title, rh * 0.62, rw * 0.24, rw * 0.05, '400', '"Archivo Black", "Pretendard Black", sans-serif', '0.02em');
      ctx.font = '400 ' + rsize + 'px "Archivo Black", "Pretendard Black", sans-serif';
      ctx.fillText(title, 0, 0, rh * 0.64);
      ctx.restore();

      if (venue) {
        ctx.save();
        ctx.translate(rw / 2, rh * 0.14);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(251,244,243,0.88)';
        ctx.font = '400 ' + Math.round(rw * 0.045) + 'px Pretendard, sans-serif';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0.14em';
        ctx.fillText(venue, 0, 0, rh * 0.16);
        ctx.restore();
      }

      if (date) {
        ctx.save();
        ctx.translate(rw / 2, rh * 0.86);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(251,244,243,0.88)';
        ctx.font = '400 ' + Math.round(rw * 0.04) + 'px Pretendard, sans-serif';
        if ('letterSpacing' in ctx) ctx.letterSpacing = '0.12em';
        ctx.fillText(date, 0, 0, rh * 0.14);
        ctx.restore();
      }

      if (opts && opts.mark) {
        ctx.save();
        ctx.translate(rw / 2, rh * 0.965);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(251,244,243,0.7)';
        ctx.font = '400 ' + Math.round(rw * 0.032) + 'px Pretendard, sans-serif';
        ctx.fillText(opts.mark, 0, 0, rh * 0.4);
        ctx.restore();
      }
      ctx.restore();
      return;
    }

    var stubW = W * 0.26;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, stubW, H);
    /* perforation */
    ctx.save();
    ctx.strokeStyle = 'rgba(31,27,36,0.32)';
    ctx.lineWidth = Math.max(1, W * 0.0018);
    ctx.setLineDash([H * 0.03, H * 0.022]);
    ctx.beginPath();
    ctx.moveTo(stubW, 0);
    ctx.lineTo(stubW, H);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.arc(stubW, 0, H * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(stubW, H, H * 0.035, 0, Math.PI * 2);
    ctx.fill();

    /* stub content */
    ctx.save();
    ctx.translate(stubW * 0.5, H * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PAPER;
    ctx.font = '400 ' + Math.round(H * 0.075) + 'px Pretendard, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.22em';
    ctx.fillText(date, 0, 0, W * 0.22);
    ctx.restore();

    var x0 = stubW + W * 0.055;
    var maxW = W - x0 - W * 0.055;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK;
    var size = fitSize(ctx, title, maxW, H * 0.3, H * 0.08, '400', '"Archivo Black", "Pretendard Black", sans-serif', '0em');
    ctx.font = '400 ' + size + 'px "Archivo Black", "Pretendard Black", sans-serif';
    ctx.fillText(title, x0, H * 0.43, maxW);
    ctx.fillStyle = MUTED;
    ctx.font = '400 ' + Math.round(H * 0.068) + 'px Pretendard, sans-serif';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0.04em';
    ctx.fillText(venue, x0, H * 0.6, maxW);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0em';
    /* decorative barcode */
    var bars = 26;
    var bx = x0;
    var bw = Math.max(1, W * 0.0022);
    var gap = (maxW * 0.44) / bars;
    for (var i = 0; i < bars; i++) {
      var hh = H * (i % 4 === 0 ? 0.15 : i % 3 === 0 ? 0.11 : 0.08);
      ctx.fillStyle = i % 5 === 0 ? color : INK;
      ctx.fillRect(bx + i * gap, H * 0.87 - hh, bw + (i % 4 === 0 ? bw : 0), hh);
    }
    ctx.fillStyle = INK;
    ctx.font = '400 ' + Math.round(H * 0.05) + 'px Pretendard, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('K-Cheer  ' + (opts && opts.serial || ''), W - W * 0.05, H * 0.94);

    if (opts && opts.mark) {
      ctx.fillStyle = 'rgba(31,27,36,0.45)';
      ctx.font = '400 ' + Math.round(H * 0.042) + 'px Pretendard, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(opts.mark, x0, H * 0.94);
    }
    ctx.restore();
  }

  function rwRen(rw) {
    return rw;
  }

  /* ---------- sizing ---------- */

  function pxFor(mm, dpi) {
    return Math.round((mm / 25.4) * dpi);
  }

  function exportSize(mode, variant, dpi) {
    var cfg = window.KCS_CONFIG;
    if (mode === 'slogan') return { w: pxFor(cfg.sizes.slogan.w, dpi), h: pxFor(cfg.sizes.slogan.h, dpi) };
    if (mode === 'photo') return { w: pxFor(cfg.sizes.photocard.w, dpi), h: pxFor(cfg.sizes.photocard.h, dpi) };
    var key = variant === 'ribbon' ? 'ribbon' : 'ticket';
    return { w: pxFor(cfg.sizes[key].w, dpi), h: pxFor(cfg.sizes[key].h, dpi) };
  }

  function renderTo(canvas, mode, state, dpi, opts) {
    var o = opts || {};
    var size = exportSize(mode, state.ticket.variant, dpi);
    canvas.width = size.w;
    canvas.height = size.h;
    var ctx = canvas.getContext('2d');
    if (mode === 'slogan') drawSlogan(ctx, size.w, size.h, state.slogan, o);
    else if (mode === 'photo') {
      var frame = window.KCS_FRAMES.filter(function (f) { return f.id === state.photo.frame; })[0] || window.KCS_FRAMES[0];
      drawPhoto(ctx, size.w, size.h, frame, {
        color: state.photo.color,
        name: state.photo.name,
        date: state.photo.dateText,
        mark: o.mark,
        previewEmpty: !!o.previewEmpty
      }, state.photo.img);
    } else drawTicket(ctx, size.w, size.h, state.ticket, o);
    return canvas;
  }

  /* ---------- pdf ---------- */

  function pdfFromCanvas(canvas, mmW, mmH) {
    var jpeg = canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
    var bin = atob(jpeg);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var wpt = (mmW / 25.4) * 72;
    var hpt = (mmH / 25.4) * 72;
    var enc = new TextEncoder();
    var chunks = [];
    var offsets = [];
    var total = 0;
    function push(part) {
      var b = typeof part === 'string' ? enc.encode(part) : part;
      chunks.push(b);
      total += b.length;
    }
    function obj(n, body, stream) {
      offsets[n] = total;
      push(n + ' 0 obj\n' + body + '\n');
      if (stream) {
        push('stream\n');
        push(stream);
        push('\nendstream\n');
      }
      push('endobj\n');
    }
    push('%PDF-1.4\n');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + wpt.toFixed(2) + ' ' + hpt.toFixed(2) + '] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>');
    var content = 'q\n' + wpt.toFixed(2) + ' 0 0 ' + hpt.toFixed(2) + ' 0 0 cm\n/Im0 Do\nQ\n';
    obj(4, '<< /Length ' + enc.encode(content).length + ' >>', content);
    obj(5, '<< /Type /XObject /Subtype /Image /Width ' + canvas.width + ' /Height ' + canvas.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + bytes.length + ' >>', bytes);
    var xref = total;
    var pad = function (n) {
      var s = String(n);
      while (s.length < 10) s = '0' + s;
      return s;
    };
    push('xref\n0 6\n0000000000 65535 f \n');
    for (var k = 1; k <= 5; k++) push(pad(offsets[k]) + ' 00000 n \n');
    push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    var out = new Uint8Array(total);
    var at = 0;
    chunks.forEach(function (b) {
      out.set(b, at);
      at += b.length;
    });
    return new Blob([out], { type: 'application/pdf' });
  }

  window.KCS_RENDER = {
    drawSlogan: drawSlogan,
    drawPhoto: drawPhoto,
    drawTicket: drawTicket,
    renderTo: renderTo,
    exportSize: exportSize,
    pxFor: pxFor,
    pdfFromCanvas: pdfFromCanvas,
    luminance: luminance
  };
})();
