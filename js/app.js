/* K-Cheer Studio · interface */
(function () {
  'use strict';

  var CFG = window.KCS_CONFIG;
  var I18N = window.KCS_I18N;
  var R = window.KCS_RENDER;
  var FRAMES = window.KCS_FRAMES;

  var state = {
    lang: 'ko',
    mode: 'slogan',
    pro: false,
    slogan: {
      text: '',
      sub: '',
      touched: false,
      subTouched: false,
      font: 'solid',
      color: '#E4572E',
      pattern: 'holo',
      ground: 'dark'
    },
    photo: {
      frame: 'star',
      color: '#B03A6E',
      name: 'Sofía',
      date: '',
      dateText: '',
      img: null,
      imgName: ''
    },
    ticket: {
      variant: 'ticket',
      title: '',
      touched: false,
      iso: '',
      date: '',
      venue: '',
      color: '#B03A6E'
    }
  };

  var previewPx = {
    slogan: { w: 1400, h: 467 },
    photo: { w: 540, h: 835 },
    ticket: { w: 900, h: 350 },
    ribbon: { w: 300, h: 1200 }
  };

  var $ = function (sel, root) {
    return (root || document).querySelector(sel);
  };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  function t(key) {
    var d = I18N.dict[state.lang] || I18N.dict.ko;
    return d[key] != null ? d[key] : (I18N.dict.ko[key] != null ? I18N.dict.ko[key] : key);
  }

  function hash(str) {
    var h = 5381;
    var s = String(str).toUpperCase().replace(/\s+/g, '');
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
  }
  var PRO_HASHES = (CFG.licenceHashes || []).map(function (x) {
    return typeof x === 'number' ? x : hash(x);
  });

  /* ---------- language ---------- */

  function applyLang(lang) {
    if (!I18N.dict[lang]) lang = 'ko';
    state.lang = lang;
    document.documentElement.setAttribute('lang', lang);
    document.title = t('meta.title');
    var desc = $('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.desc'));

    $$('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    $$('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    $$('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
    });
    $$('[data-phrase]').forEach(function (el) {
      el.textContent = t('phrase.' + el.getAttribute('data-phrase'));
    });
    $$('[data-frame-name]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-frame-name'));
    });
    $$('[data-set-lang]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-set-lang') === lang ? 'true' : 'false');
    });

    try {
      localStorage.setItem('kcs.lang', lang);
    } catch (e) {}

    seedDefaults();
    syncSpec();
    paint();
  }

  /* A first visit shows a finished proof, not an empty sheet.
     Anything the visitor typed stays theirs when the language changes. */
  function seedDefaults() {
    if (!state.slogan.touched) {
      $('#sloganText').value = t('slogan.phText');
      state.slogan.text = t('slogan.phText');
    }
    if (!state.slogan.subTouched) {
      $('#sloganSub').value = t('slogan.phSub');
      state.slogan.sub = t('slogan.phSub');
    }
    if (!state.ticket.touched) {
      $('#ticketTitle').value = t('ticket.phTitle');
      state.ticket.title = t('ticket.phTitle');
    }
    if (!state.photo.date) {
      var today = new Date();
      var iso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      state.photo.date = iso;
      state.ticket.iso = iso;
      $('#photoDate').value = iso;
      $('#ticketDate').value = iso;
    }
    state.photo.dateText = formatDate(state.photo.date);
    state.ticket.date = formatDate(state.ticket.iso);
  }

  /* ---------- mode ---------- */

  function setMode(mode, push) {
    if (['slogan', 'photo', 'ticket'].indexOf(mode) < 0) mode = 'slogan';
    state.mode = mode;
    $$('.tab').forEach(function (tab) {
      var on = tab.getAttribute('data-mode') === mode;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.setAttribute('tabindex', on ? '0' : '-1');
    });
    $$('.panel').forEach(function (p) {
      p.hidden = p.id !== 'panel-' + mode;
    });
    $('#proofTitle').textContent = t(mode === 'slogan' ? 'proof.sloganHead' : mode === 'photo' ? 'proof.photoHead' : 'proof.ticketHead');
    $('#pdfBtn').hidden = mode !== 'slogan';
    $('#sheetCanvas').setAttribute('aria-label', t('proof.aria') + ' ' + t('mode.' + mode));
    if (push !== false && location.hash !== '#' + mode) {
      try {
        history.replaceState(null, '', '#' + mode);
      } catch (e) {
        location.hash = mode;
      }
    }
    syncSpec();
    paint();
  }

  function syncSpec() {
    var size = t('mode.slogan');
    var label = '';
    if (state.mode === 'slogan') label = CFG.sizes.slogan.label;
    else if (state.mode === 'photo') label = CFG.sizes.photocard.label;
    else label = CFG.sizes[state.ticket.variant === 'ribbon' ? 'ribbon' : 'ticket'].label;
    size = label;
    $('#specSize').textContent = size;
    $('#specDpi').textContent = (state.pro ? CFG.dpi.pro : CFG.dpi.free) + ' dpi';
    $('#specFormat').textContent = state.mode === 'slogan' ? 'PNG / PDF' : 'PNG';
    $('#proofNote').textContent = t(state.pro ? 'proof.notePro' : 'proof.noteFree');
  }

  /* ---------- paint ---------- */

  function paint() {
    var canvas = $('#sheetCanvas');
    var sheet = $('#sheet');
    var key = state.mode === 'ticket' && state.ticket.variant === 'ribbon' ? 'ribbon' : state.mode;
    var pv = previewPx[key];
    canvas.width = pv.w;
    canvas.height = pv.h;
    var ctx = canvas.getContext('2d');
    var mark = state.pro ? '' : CFG.freeMark;
    if (state.mode === 'slogan') {
      R.drawSlogan(ctx, pv.w, pv.h, state.slogan, { mark: mark });
      sheet.className = 'sheet';
    } else if (state.mode === 'photo') {
      var frame = frameById(state.photo.frame);
      R.drawPhoto(ctx, pv.w, pv.h, frame, {
        color: state.photo.color,
        name: state.photo.name,
        date: state.photo.dateText,
        mark: mark,
        previewEmpty: true
      }, state.photo.img);
      sheet.className = 'sheet is-photo';
    } else {
      R.drawTicket(ctx, pv.w, pv.h, state.ticket, { serial: serial(), mark: mark });
      sheet.className = state.ticket.variant === 'ribbon' ? 'sheet is-ribbon' : 'sheet is-ticket';
    }
  }

  function serial() {
    var d = new Date();
    return String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  function frameById(id) {
    for (var i = 0; i < FRAMES.length; i++) if (FRAMES[i].id === id) return FRAMES[i];
    return FRAMES[0];
  }

  /* ---------- photocard grid ---------- */

  function buildFrames() {
    var grid = $('#frameGrid');
    FRAMES.forEach(function (f) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'frame-btn';
      btn.setAttribute('data-frame', f.id);
      btn.setAttribute('aria-pressed', f.id === state.photo.frame ? 'true' : 'false');

      var cv = document.createElement('canvas');
      cv.width = 96;
      cv.height = 148;
      cv.setAttribute('aria-hidden', 'true');
      btn.appendChild(cv);

      var meta = document.createElement('span');
      meta.className = 'frame-meta';
      var nm = document.createElement('span');
      nm.setAttribute('data-frame-name', f.name);
      nm.textContent = t(f.name);
      meta.appendChild(nm);
      if (f.pro) {
        var pro = document.createElement('span');
        pro.className = 'pro-mark';
        pro.textContent = 'Pro';
        meta.appendChild(pro);
      }
      btn.appendChild(meta);
      grid.appendChild(btn);

      btn.addEventListener('click', function () {
        if (f.pro && !state.pro) {
          openPro(t('photo.lockedMsg'));
          return;
        }
        state.photo.frame = f.id;
        $$('.frame-btn', grid).forEach(function (b) {
          b.setAttribute('aria-pressed', b.getAttribute('data-frame') === f.id ? 'true' : 'false');
        });
        msg('#photoMsg', '');
        paintFrames();
        paint();
      });
      f._canvas = cv;
    });
    paintFrames();
  }

  function paintFrames() {
    FRAMES.forEach(function (f) {
      var cv = f._canvas;
      if (!cv) return;
      var ctx = cv.getContext('2d');
      var frame = f.id === state.photo.frame ? f : f;
      R.drawPhoto(ctx, cv.width, cv.height, frame, { color: state.photo.color, name: '', date: '', mark: '' }, null);
    });
  }

  /* ---------- messages ---------- */

  function msg(sel, text, tone) {
    var el = $(sel);
    if (!el) return;
    el.textContent = text || '';
    if (tone === 'error') el.setAttribute('data-tone', 'error');
    else el.removeAttribute('data-tone');
  }

  /* ---------- pro ---------- */

  function openPro(message) {
    var panel = $('#proPanel');
    panel.hidden = false;
    $('#proToggle').setAttribute('aria-expanded', 'true');
    if (message) msg('#codeMsg', message, 'error');
    $('#codeInput').focus();
  }

  function closePro() {
    $('#proPanel').hidden = true;
    $('#proToggle').setAttribute('aria-expanded', 'false');
  }

  function setPro(on) {
    state.pro = !!on;
    $('#proToggle').hidden = state.pro;
    $('#proBadge').hidden = !state.pro;
    $('#hiresBtn').textContent = t('dl.hires');
    try {
      localStorage.setItem('kcs.pro', state.pro ? '1' : '0');
    } catch (e) {}
    syncSpec();
    paint();
    paintFrames();
  }

  function tryCode(value) {
    var h = hash(value);
    if (PRO_HASHES.indexOf(h) >= 0) {
      setPro(true);
      msg('#codeMsg', t('pro.unlockedMsg'));
      closePro();
      return true;
    }
    msg('#codeMsg', t('pro.errorMsg'), 'error');
    return false;
  }

  /* ---------- downloads ---------- */

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 4000);
  }

  function exportCanvas(dpi) {
    var cv = document.createElement('canvas');
    R.renderTo(cv, state.mode, state, dpi, {
      mark: state.pro ? '' : CFG.freeMark,
      serial: serial(),
      previewEmpty: false
    });
    return cv;
  }

  function fileBase() {
    var d = new Date();
    var stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    var key = state.mode === 'ticket' && state.ticket.variant === 'ribbon' ? 'ribbon' : state.mode;
    return 'k-cheer-' + key + '-' + stamp;
  }

  function savePng(dpi) {
    var cv = exportCanvas(dpi);
    var name = fileBase() + '-' + dpi + 'dpi.png';
    if (cv.toBlob) {
      cv.toBlob(function (blob) {
        if (blob) download(blob, name);
      }, 'image/png');
    } else {
      var a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  function savePdf(dpi) {
    var cv = exportCanvas(dpi);
    var dims = state.mode === 'slogan' ? CFG.sizes.slogan : state.mode === 'photo' ? CFG.sizes.photocard : CFG.sizes[state.ticket.variant === 'ribbon' ? 'ribbon' : 'ticket'];
    var blob = R.pdfFromCanvas(cv, dims.w, dims.h);
    download(blob, fileBase() + '-' + dpi + 'dpi.pdf');
  }

  /* ---------- wiring ---------- */

  function bindSegments(sel, key, target, after) {
    $$(sel).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var attr = btn.getAttribute(key);
        target(attr);
        $$(sel).forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });
        if (after) after();
      });
    });
  }

  function syncSwatches(sel, color) {
    $$(sel + ' .swatch').forEach(function (s) {
      s.setAttribute('aria-pressed', s.getAttribute('data-color').toUpperCase() === String(color).toUpperCase() ? 'true' : 'false');
      s.style.background = s.getAttribute('data-color');
    });
  }

  function validHex(v) {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
  }

  function init() {
    try {
      var savedLang = localStorage.getItem('kcs.lang');
      if (savedLang && I18N.dict[savedLang]) state.lang = savedLang;
      state.pro = localStorage.getItem('kcs.pro') === '1';
    } catch (e) {}

    $$('.swatch').forEach(function (s) {
      s.style.background = s.getAttribute('data-color');
    });

    $$('[data-set-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLang(btn.getAttribute('data-set-lang'));
      });
    });

    $$('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        setMode(tab.getAttribute('data-mode'));
      });
      tab.addEventListener('keydown', function (e) {
        var idx = $$('.tab').indexOf(tab);
        var next = null;
        if (e.key === 'ArrowRight') next = $$('.tab')[(idx + 1) % 3];
        if (e.key === 'ArrowLeft') next = $$('.tab')[(idx + 2) % 3];
        if (next) {
          next.focus();
          setMode(next.getAttribute('data-mode'));
        }
      });
    });

    /* slogan */
    $('#sloganText').addEventListener('input', function (e) {
      state.slogan.text = e.target.value;
      state.slogan.touched = true;
      paint();
    });
    $('#sloganSub').addEventListener('input', function (e) {
      state.slogan.sub = e.target.value;
      state.slogan.subTouched = true;
      paint();
    });
    $$('[data-phrase]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        $('#sloganText').value = chip.textContent;
        state.slogan.text = chip.textContent;
        state.slogan.touched = true;
        paint();
      });
    });
    bindSegments('#fontSeg [data-font]', 'data-font', function (v) {
      state.slogan.font = v;
    }, paint);
    bindSegments('#patternSeg [data-pattern]', 'data-pattern', function (v) {
      state.slogan.pattern = v;
    }, paint);
    bindSegments('#groundSeg [data-ground]', 'data-ground', function (v) {
      state.slogan.ground = v;
    }, paint);

    $$('#sloganSwatches .swatch').forEach(function (s) {
      s.addEventListener('click', function () {
        state.slogan.color = s.getAttribute('data-color');
        $('#sloganHex').value = state.slogan.color;
        syncSwatches('#sloganSwatches', state.slogan.color);
        paint();
      });
    });
    $('#sloganHex').addEventListener('input', function (e) {
      var v = e.target.value.trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (validHex(v)) {
        state.slogan.color = v.toUpperCase();
        syncSwatches('#sloganSwatches', state.slogan.color);
        paint();
      }
    });

    /* photocard */
    buildFrames();
    $('#photoInput').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        msg('#photoMsg', t('photo.errorMsg'), 'error');
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          state.photo.img = img;
          state.photo.imgName = file.name;
          $('#photoName').textContent = file.name;
          $('#photoClear').hidden = false;
          msg('#photoMsg', '');
          paint();
        };
        img.onerror = function () {
          msg('#photoMsg', t('photo.errorMsg'), 'error');
        };
        img.src = reader.result;
      };
      reader.onerror = function () {
        msg('#photoMsg', t('photo.errorMsg'), 'error');
      };
      reader.readAsDataURL(file);
    });
    $('#photoClear').addEventListener('click', function () {
      state.photo.img = null;
      state.photo.imgName = '';
      $('#photoInput').value = '';
      $('#photoName').textContent = t('photo.none');
      $('#photoClear').hidden = true;
      paint();
    });
    $('#photoNameInput').addEventListener('input', function (e) {
      state.photo.name = e.target.value;
      paint();
    });
    $('#photoDate').addEventListener('change', function (e) {
      state.photo.date = e.target.value;
      state.photo.dateText = formatDate(e.target.value);
      paint();
    });
    $$('#photoSwatches .swatch').forEach(function (s) {
      s.addEventListener('click', function () {
        state.photo.color = s.getAttribute('data-color');
        $('#photoHex').value = state.photo.color;
        syncSwatches('#photoSwatches', state.photo.color);
        paintFrames();
        paint();
      });
    });
    $('#photoHex').addEventListener('input', function (e) {
      var v = e.target.value.trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (validHex(v)) {
        state.photo.color = v.toUpperCase();
        syncSwatches('#photoSwatches', state.photo.color);
        paintFrames();
        paint();
      }
    });

    /* ticket */
    bindSegments('#variantSeg [data-variant]', 'data-variant', function (v) {
      state.ticket.variant = v;
    }, function () {
      syncSpec();
      paint();
    });
    $('#ticketTitle').addEventListener('input', function (e) {
      state.ticket.title = e.target.value;
      state.ticket.touched = true;
      paint();
    });
    $('#ticketDate').addEventListener('change', function (e) {
      state.ticket.iso = e.target.value;
      state.ticket.date = e.target.value ? formatDate(e.target.value) : '';
      paint();
    });
    $('#ticketVenue').addEventListener('input', function (e) {
      state.ticket.venue = e.target.value;
      paint();
    });
    $$('#ticketSwatches .swatch').forEach(function (s) {
      s.addEventListener('click', function () {
        state.ticket.color = s.getAttribute('data-color');
        $('#ticketHex').value = state.ticket.color;
        syncSwatches('#ticketSwatches', state.ticket.color);
        paint();
      });
    });
    $('#ticketHex').addEventListener('input', function (e) {
      var v = e.target.value.trim();
      if (!v.startsWith('#')) v = '#' + v;
      if (validHex(v)) {
        state.ticket.color = v.toUpperCase();
        syncSwatches('#ticketSwatches', state.ticket.color);
        paint();
      }
    });

    /* pro */
    $('#proToggle').addEventListener('click', function () {
      if ($('#proPanel').hidden) openPro();
      else closePro();
    });
    $('#codeForm').addEventListener('submit', function (e) {
      e.preventDefault();
      tryCode($('#codeInput').value);
    });

    /* downloads */
    $('#pngBtn').addEventListener('click', function () {
      msg('#dlMsg', '');
      savePng(state.pro ? CFG.dpi.pro : CFG.dpi.free);
    });
    $('#pdfBtn').addEventListener('click', function () {
      msg('#dlMsg', '');
      savePdf(state.pro ? CFG.dpi.pro : CFG.dpi.free);
    });
    $('#hiresBtn').addEventListener('click', function () {
      if (!state.pro) {
        msg('#dlMsg', t('dl.locked'), 'error');
        openPro(t('dl.locked'));
        return;
      }
      msg('#dlMsg', '');
      savePng(CFG.dpi.pro);
    });

    /* buy link */
    if (CFG.proBuyUrl) {
      var lead = $('[data-i18n="pro.buyLead"]');
      if (lead) {
        var a = document.createElement('a');
        a.href = CFG.proBuyUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = t('pro.buyLink');
        lead.replaceWith(a);
      }
    } else if (CFG.proPrice) {
      $('#proToggle').textContent = 'Pro ' + CFG.proPrice;
    }

    window.addEventListener('hashchange', function () {
      setMode((location.hash || '#slogan').slice(1), false);
    });

    setPro(state.pro);
    applyLang(state.lang);
    setMode((location.hash || '#slogan').slice(1), false);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        paint();
        paintFrames();
      });
    }

    window.KCS = {
      state: state,
      t: t,
      applyLang: applyLang,
      setMode: setMode,
      paint: paint,
      tryCode: tryCode,
      setPro: setPro,
      exportCanvas: exportCanvas,
      savePdf: savePdf,
      savePng: savePng,
      frames: FRAMES,
      keys: function (lang) {
        return Object.keys(I18N.dict[lang] || {});
      },
      ready: true
    };
  }

  function formatDate(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    if (parts.length !== 3) return iso;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var locale = state.lang === 'pt' ? 'pt-BR' : state.lang;
    try {
      return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return iso;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
