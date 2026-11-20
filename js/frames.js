/* K-Cheer Studio · twenty original photocard frames, drawn as vectors on canvas */
(function () {
  'use strict';

  var INK = '#1F1B24';
  var PAPER = '#FBF4F3';
  var MUTED = '#6B5F66';

  function rr(ctx, x, y, w, h, r) {
    var rad = Math.min(r || 0, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.lineTo(x + w - rad, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
    ctx.lineTo(x + w, y + h - rad);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
    ctx.lineTo(x + rad, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
    ctx.lineTo(x, y + rad);
    ctx.quadraticCurveTo(x, y, x + rad, y);
    ctx.closePath();
  }

  function starPath(ctx, cx, cy, outer, inner, points) {
    var n = points || 5;
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 ? inner : outer;
      var a = (Math.PI / n) * i - Math.PI / 2;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function seeded(seed) {
    var s = seed;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  function line(ctx, x1, y1, x2, y2, w, color) {
    ctx.strokeStyle = color || INK;
    ctx.lineWidth = w || 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function matte(ctx, W, H, color, r) {
    ctx.fillStyle = color;
    rr(ctx, 0, 0, W, H, r || 0);
    ctx.fill();
  }

  function punch(ctx, win, r) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    rr(ctx, win.x, win.y, win.w, win.h, r || 0);
    ctx.fill();
    ctx.restore();
  }

  function plateText(ctx, g, o, opts) {
    var name = (o.name || '').trim();
    var date = (o.date || '').trim();
    var color = (opts && opts.ink) || INK;
    var muted = (opts && opts.muted) || MUTED;
    var nameSize = g.W * ((opts && opts.nameSize) || 0.058);
    var dateSize = g.W * ((opts && opts.dateSize) || 0.038);
    var cx = g.W / 2;
    var maxW = g.W * 0.66;
    var baseY = g.H - g.bottom * 0.42;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (name) {
      ctx.fillStyle = color;
      ctx.font = '900 ' + Math.round(nameSize) + 'px Pretendard, sans-serif';
      ctx.fillText(name, cx, name && date ? baseY - dateSize * 0.8 : baseY, maxW);
    }
    if (date) {
      ctx.fillStyle = muted;
      ctx.font = '400 ' + Math.round(dateSize) + 'px Pretendard, sans-serif';
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0.06em';
      ctx.fillText(date, cx, name ? baseY + dateSize * 0.85 : baseY, maxW);
    }
    ctx.restore();
  }

  /* The window keeps the 11:17 photocard ratio, so a photo fills it with no crop.
     side and bottom are fractions of the width; the top band takes what is left. */
  function geom(W, H, side, top, bottom) {
    var s = W * side;
    var b = W * bottom;
    var ww = W - s * 2;
    var wh = (ww * 17) / 11;
    var t = H - b - wh;
    if (t < W * 0.03) {
      ww = (H - b - W * 0.03) * (11 / 17);
      s = (W - ww) / 2;
      wh = (ww * 17) / 11;
      t = H - b - wh;
    }
    return { W: W, H: H, side: s, top: t, bottom: b, win: { x: s, y: t, w: ww, h: wh } };
  }

  var FRAMES = [
    {
      id: 'star',
      pro: false,
      name: 'frame.star',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.17);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        var cy = g.top * 0.5;
        ctx.fillStyle = o.color;
        starPath(ctx, g.W / 2, cy, g.top * 0.26, g.top * 0.11, 5);
        ctx.fill();
        line(ctx, g.side * 0.5, cy, g.W * 0.34, cy, 2, INK);
        line(ctx, g.W * 0.66, cy, g.W - g.side * 0.5, cy, 2, INK);
        line(ctx, g.W * 0.32, g.H - g.bottom * 0.86, g.W * 0.68, g.H - g.bottom * 0.86, 2, o.color);
        plateText(ctx, g, o);
      }
    },
    {
      id: 'ribbon',
      pro: false,
      name: 'frame.ribbon',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.165);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        var bandY = g.top * 0.26;
        var bandH = g.top * 0.46;
        var x0 = g.W * 0.08;
        var x1 = g.W * 0.92;
        var notch = g.side * 0.5;
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.moveTo(x0 + notch, bandY);
        ctx.lineTo(x1 - notch, bandY);
        ctx.lineTo(x1, bandY + bandH / 2);
        ctx.lineTo(x1 - notch, bandY + bandH);
        ctx.lineTo(x0 + notch, bandY + bandH);
        ctx.lineTo(x0, bandY + bandH / 2);
        ctx.closePath();
        ctx.fill();
        line(ctx, g.W * 0.34, bandY + bandH / 2, g.W * 0.66, bandY + bandH / 2, 2, PAPER);
        line(ctx, g.W * 0.34, g.H - g.bottom * 0.86, g.W * 0.66, g.H - g.bottom * 0.86, 1.5, INK);
        plateText(ctx, g, o);
      }
    },
    {
      id: 'checker',
      pro: false,
      name: 'frame.checker',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.17);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        var cell = g.W * 0.04;
        var i, j;
        ctx.fillStyle = o.color;
        for (i = 0; i * cell < g.W; i++) {
          for (j = 0; j < 3; j++) {
            if ((i + j) % 2 === 0) ctx.fillRect(i * cell, g.top * 0.18 + j * cell, cell, cell);
          }
        }
        var bcell = g.W * 0.03;
        for (i = 0; i * bcell < g.W; i++) {
          for (j = 0; j < 2; j++) {
            if ((i + j) % 2 === 0) ctx.fillRect(i * bcell, g.H - g.bottom + j * bcell, bcell, bcell);
          }
        }
        plateText(ctx, g, o);
      }
    },
    {
      id: 'polaroid',
      pro: false,
      name: 'frame.polaroid',
      geom: function (W, H) {
        return geom(W, H, 0.105, 0, 0.27);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER, g.W * 0.01);
        punch(ctx, g.win, 0);
        ctx.strokeStyle = INK;
        ctx.globalAlpha = 0.14;
        ctx.lineWidth = 1;
        ctx.strokeRect(g.win.x + 5, g.win.y + 5, g.win.w - 10, g.win.h - 10);
        ctx.globalAlpha = 1;
        ctx.fillStyle = o.color;
        ctx.fillRect(g.W / 2 - g.W * 0.04, g.H - g.bottom + g.W * 0.03, g.W * 0.08, g.W * 0.008);
        plateText(ctx, g, o, { nameSize: 0.056, dateSize: 0.038 });
      }
    },
    {
      id: 'stub',
      pro: true,
      name: 'frame.stub',
      geom: function (W, H) {
        return geom(W, H, 0.09, 0, 0.22);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        var y = g.H - g.bottom;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.setLineDash([g.W * 0.016, g.W * 0.012]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(g.W, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(0, y, g.W * 0.026, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(g.W, y, g.W * 0.026, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = o.color;
        ctx.fillRect(0, g.H - g.bottom * 0.14, g.W, g.bottom * 0.14);
        plateText(ctx, g, o, { nameSize: 0.05, dateSize: 0.034 });
      }
    },
    {
      id: 'scallop',
      pro: true,
      name: 'frame.scallop',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.175);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        var r = g.side * 0.28;
        var x;
        ctx.fillStyle = o.color;
        for (x = g.side * 0.5; x < g.W - r * 0.5; x += r * 2.05) {
          ctx.beginPath();
          ctx.arc(x, g.top * 0.55, r, Math.PI, 0);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, g.H - g.bottom * 0.22, r, 0, Math.PI);
          ctx.fill();
        }
        plateText(ctx, g, o);
      }
    },
    {
      id: 'halftone',
      pro: true,
      name: 'frame.halftone',
      geom: function (W, H) {
        return geom(W, H, 0.1, 0, 0.17);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        ctx.fillStyle = o.color;
        var step = g.W * 0.032;
        var i, j;
        for (i = 0; i * step < g.W; i++) {
          for (j = 0; j * step < g.H; j++) {
            var px = i * step + step / 2;
            var py = j * step + step / 2;
            if (px > g.win.x - step && px < g.win.x + g.win.w + step && py > g.win.y - step && py < g.win.y + g.win.h + step) continue;
            if (py > g.H - g.bottom * 0.72) continue;
            var t = Math.min(1, Math.max(0, (py / g.H) * 1.1));
            var d = step * (0.12 + t * 0.55);
            ctx.beginPath();
            ctx.arc(px, py, d / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        plateText(ctx, g, o);
      }
    },
    {
      id: 'confetti',
      pro: true,
      name: 'frame.confetti',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.17);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        var rnd = seeded(11);
        var i;
        for (i = 0; i < 96; i++) {
          var px = rnd() * g.W;
          var py = rnd() * g.H;
          if (px > g.win.x - 8 && px < g.win.x + g.win.w + 8 && py > g.win.y - 8 && py < g.win.y + g.win.h + 8) continue;
          if (py > g.H - g.bottom * 0.7) continue;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(rnd() * Math.PI);
          ctx.fillStyle = i % 4 === 0 ? INK : o.color;
          ctx.globalAlpha = 0.92;
          ctx.fillRect(-g.W * 0.007, -g.W * 0.0035, g.W * 0.014, g.W * 0.007);
          ctx.restore();
        }
        plateText(ctx, g, o);
      }
    },
    {
      id: 'arch',
      pro: true,
      name: 'frame.arch',
      geom: function (W, H) {
        return geom(W, H, 0.115, 0, 0.175);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.moveTo(g.win.x, g.win.y + g.win.h);
        ctx.lineTo(g.win.x, g.win.y + g.win.w / 2);
        ctx.arc(g.win.x + g.win.w / 2, g.win.y + g.win.w / 2, g.win.w / 2, Math.PI, 0);
        ctx.lineTo(g.win.x + g.win.w, g.win.y + g.win.h);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = o.color;
        ctx.lineWidth = Math.max(3, g.W * 0.011);
        ctx.beginPath();
        ctx.moveTo(g.win.x, g.win.y + g.win.h);
        ctx.lineTo(g.win.x, g.win.y + g.win.w / 2);
        ctx.arc(g.win.x + g.win.w / 2, g.win.y + g.win.w / 2, g.win.w / 2, Math.PI, 0);
        ctx.lineTo(g.win.x + g.win.w, g.win.y + g.win.h);
        ctx.stroke();
        line(ctx, g.W * 0.34, g.H - g.bottom * 0.86, g.W * 0.66, g.H - g.bottom * 0.86, 1.5, INK);
        plateText(ctx, g, o);
      }
    },
    {
      id: 'film',
      pro: true,
      name: 'frame.film',
      geom: function (W, H) {
        return geom(W, H, 0.135, 0, 0.16);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, INK);
        punch(ctx, g.win, 0);
        var holeW = g.side * 0.46;
        var holeH = g.W * 0.05;
        var gap = g.W * 0.03;
        var y;
        ctx.fillStyle = PAPER;
        for (y = g.top * 0.75; y < g.H - g.bottom * 0.9 - holeH; y += holeH + gap) {
          rr(ctx, (g.side - holeW) / 2, y, holeW, holeH, holeW * 0.2);
          ctx.fill();
          rr(ctx, g.W - g.side + (g.side - holeW) / 2, y, holeW, holeH, holeW * 0.2);
          ctx.fill();
        }
        ctx.fillStyle = o.color;
        ctx.fillRect(g.side, g.H - g.bottom * 0.92, g.win.w, g.W * 0.006);
        plateText(ctx, g, o, { ink: PAPER, muted: '#BCAFB4' });
      }
    },
    {
      id: 'stamp',
      pro: true,
      name: 'frame.stamp',
      geom: function (W, H) {
        return geom(W, H, 0.1, 0, 0.175);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        var r = g.W * 0.02;
        var x, y;
        for (x = r; x < g.W; x += r * 2.2) {
          ctx.beginPath();
          ctx.arc(x, 0, r, 0, Math.PI * 2);
          ctx.arc(x, g.H, r, 0, Math.PI * 2);
          ctx.fill();
        }
        for (y = r; y < g.H; y += r * 2.2) {
          ctx.beginPath();
          ctx.arc(0, y, r, 0, Math.PI * 2);
          ctx.arc(g.W, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = o.color;
        ctx.lineWidth = Math.max(3, g.W * 0.01);
        var inset = g.side * 0.55;
        rr(ctx, inset, g.top * 0.55, g.W - inset * 2, g.H - g.top * 0.55 - g.bottom * 0.55, g.W * 0.01);
        ctx.stroke();
        plateText(ctx, g, o);
      }
    },
    {
      id: 'tape',
      pro: true,
      name: 'frame.tape',
      geom: function (W, H) {
        return geom(W, H, 0.075, 0, 0.19);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = o.color;
        ctx.translate(g.W * 0.16, g.top * 0.62);
        ctx.rotate(-0.7);
        ctx.fillRect(-g.W * 0.13, -g.W * 0.026, g.W * 0.26, g.W * 0.052);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = o.color;
        ctx.translate(g.W * 0.84, g.top * 0.62);
        ctx.rotate(0.7);
        ctx.fillRect(-g.W * 0.13, -g.W * 0.026, g.W * 0.26, g.W * 0.052);
        ctx.restore();
        line(ctx, g.W * 0.3, g.H - g.bottom * 0.86, g.W * 0.7, g.H - g.bottom * 0.86, 1, INK);
        plateText(ctx, g, o);
      }
    },
    {
      id: 'prism',
      pro: true,
      name: 'frame.prism',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.215);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        var grad = ctx.createLinearGradient(0, 0, g.W, 0);
        grad.addColorStop(0, o.color);
        grad.addColorStop(0.5, PAPER);
        grad.addColorStop(1, o.color);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, g.W, g.top * 0.78);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, g.W, g.top * 0.78);
        ctx.clip();
        ctx.strokeStyle = INK;
        ctx.globalAlpha = 0.12;
        ctx.lineWidth = Math.max(1, g.W * 0.004);
        for (var i = -g.top; i < g.W + g.top; i += g.W * 0.03) {
          ctx.beginPath();
          ctx.moveTo(i, g.top);
          ctx.lineTo(i + g.top, 0);
          ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = o.color;
        ctx.fillRect(0, g.H - g.bottom * 0.78, g.W, g.bottom * 0.78);
        plateText(ctx, g, o, { ink: PAPER, muted: '#F1E4E7' });
      }
    },
    {
      id: 'grid',
      pro: true,
      name: 'frame.grid',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.17);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        ctx.fillStyle = o.color;
        var step = g.W * 0.026;
        var i, j;
        for (i = 0; i * step < g.W; i++) {
          for (j = 0; j * step < g.H; j++) {
            var px = i * step + step / 2;
            var py = j * step + step / 2;
            if (px > g.win.x - step && px < g.win.x + g.win.w + step && py > g.win.y - step && py < g.win.y + g.win.h + step) continue;
            if (py > g.H - g.bottom * 0.72) continue;
            ctx.globalAlpha = 0.62;
            ctx.fillRect(px - 1, py - 1, 3, 3);
          }
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = INK;
        ctx.lineWidth = Math.max(2, g.W * 0.007);
        var c = g.side * 0.42;
        var pad = g.side * 0.55;
        ctx.beginPath();
        ctx.moveTo(pad, pad + c);
        ctx.lineTo(pad, pad);
        ctx.lineTo(pad + c, pad);
        ctx.moveTo(g.W - pad - c, pad);
        ctx.lineTo(g.W - pad, pad);
        ctx.lineTo(g.W - pad, pad + c);
        ctx.moveTo(pad, g.H - pad - c);
        ctx.lineTo(pad, g.H - pad);
        ctx.lineTo(pad + c, g.H - pad);
        ctx.moveTo(g.W - pad - c, g.H - pad);
        ctx.lineTo(g.W - pad, g.H - pad);
        ctx.lineTo(g.W - pad, g.H - pad - c);
        ctx.stroke();
        plateText(ctx, g, o);
      }
    },
    {
      id: 'banner',
      pro: true,
      name: 'frame.banner',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.175);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        line(ctx, g.W * 0.3, g.top * 0.1, g.W * 0.3, g.top * 0.44, 2, INK);
        line(ctx, g.W * 0.7, g.top * 0.1, g.W * 0.7, g.top * 0.44, 2, INK);
        ctx.fillStyle = o.color;
        ctx.beginPath();
        ctx.moveTo(g.W * 0.2, g.top * 0.44);
        ctx.lineTo(g.W * 0.8, g.top * 0.44);
        ctx.lineTo(g.W * 0.74, g.top * 0.86);
        ctx.lineTo(g.W * 0.5, g.top * 0.74);
        ctx.lineTo(g.W * 0.26, g.top * 0.86);
        ctx.closePath();
        ctx.fill();
        plateText(ctx, g, o);
      }
    },
    {
      id: 'cloud',
      pro: true,
      name: 'frame.cloud',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.19);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        ctx.fillStyle = o.color;
        var r = g.side * 0.34;
        var x;
        for (x = r * 0.9; x < g.W - r * 0.4; x += r * 2.05) {
          ctx.beginPath();
          ctx.arc(x, g.top * 0.5, r, Math.PI, 0);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, g.H - g.bottom * 0.22, r, 0, Math.PI);
          ctx.fill();
        }
        plateText(ctx, g, o);
      }
    },
    {
      id: 'laurel',
      pro: true,
      name: 'frame.laurel',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.21);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        var leaf = function (dir) {
          ctx.save();
          ctx.translate(g.W / 2 + dir * g.W * 0.325, g.H - g.bottom * 0.44);
          ctx.scale(dir, 1);
          var h = g.bottom * 0.34;
          ctx.strokeStyle = INK;
          ctx.lineWidth = Math.max(2, g.W * 0.004);
          ctx.beginPath();
          ctx.moveTo(-g.W * 0.004, h);
          ctx.quadraticCurveTo(g.W * 0.014, h * 0.2, g.W * 0.006, -h);
          ctx.stroke();
          ctx.fillStyle = o.color;
          for (var i = 0; i < 5; i++) {
            var t = i / 4;
            var lx = g.W * 0.006 - g.W * 0.012 * Math.sin(t * 1.4);
            var ly = h * 0.78 - h * 1.6 * t;
            ctx.save();
            ctx.translate(lx, ly);
            ctx.rotate(0.6 - t * 0.3);
            ctx.beginPath();
            ctx.ellipse(-g.W * 0.019, 0, g.W * 0.023, g.W * 0.009, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.restore();
        };
        leaf(1);
        leaf(-1);
        plateText(ctx, g, o, { nameSize: 0.052, dateSize: 0.034 });
      }
    },
    {
      id: 'wave',
      pro: true,
      name: 'frame.wave',
      geom: function (W, H) {
        return geom(W, H, 0.095, 0, 0.185);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        var amp = g.side * 0.22;
        var y = g.win.y + g.win.h + amp;
        var x;
        ctx.strokeStyle = o.color;
        ctx.lineWidth = Math.max(3, g.W * 0.01);
        ctx.beginPath();
        ctx.moveTo(g.win.x, y);
        for (x = 0; x <= g.win.w; x += 3) {
          ctx.lineTo(g.win.x + x, y + Math.sin((x / g.win.w) * Math.PI * 6) * amp);
        }
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.moveTo(g.win.x, y + amp * 2.4);
        for (x = 0; x <= g.win.w; x += 3) {
          ctx.lineTo(g.win.x + x, y + amp * 2.4 + Math.sin((x / g.win.w) * Math.PI * 6 + 1) * amp * 0.5);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        plateText(ctx, g, o);
      }
    },
    {
      id: 'stripe',
      pro: true,
      name: 'frame.stripe',
      geom: function (W, H) {
        return geom(W, H, 0.105, 0, 0.17);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, PAPER);
        punch(ctx, g.win, 0);
        var w = g.side / 3;
        var i;
        ctx.fillStyle = o.color;
        for (i = 0; i < 3; i += 2) {
          ctx.fillRect(i * w, 0, w, g.H);
          ctx.fillRect(g.W - g.side + i * w, 0, w, g.H);
        }
        plateText(ctx, g, o);
      }
    },
    {
      id: 'plate',
      pro: true,
      name: 'frame.plate',
      geom: function (W, H) {
        return geom(W, H, 0.1, 0, 0.2);
      },
      draw: function (ctx, g, o) {
        matte(ctx, g.W, g.H, INK);
        punch(ctx, g.win, 0);
        ctx.strokeStyle = PAPER;
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = 1;
        ctx.strokeRect(g.side * 0.42, g.top * 0.42, g.W - g.side * 0.84, g.H - g.bottom * 0.6 - g.top * 0.42);
        ctx.globalAlpha = 1;
        ctx.fillStyle = o.color;
        var s = g.W * 0.012;
        [
          [g.side * 0.62, g.top * 0.55],
          [g.W - g.side * 0.62, g.top * 0.55],
          [g.side * 0.62, g.H - g.bottom * 0.55],
          [g.W - g.side * 0.62, g.H - g.bottom * 0.55]
        ].forEach(function (p) {
          ctx.beginPath();
          ctx.arc(p[0], p[1], s, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.fillStyle = o.color;
        ctx.fillRect(g.W * 0.36, g.H - g.bottom * 0.86, g.W * 0.28, g.W * 0.005);
        plateText(ctx, g, o, { ink: PAPER, muted: '#B7AAB0', nameSize: 0.052, dateSize: 0.034 });
      }
    }
  ];

  window.KCS_FRAMES = FRAMES;
  window.KCS_FRAME_UTIL = { rr: rr, star: starPath, matte: matte, punch: punch, INK: INK, PAPER: PAPER, MUTED: MUTED };
})();
