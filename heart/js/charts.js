/*
 * charts.js — the three instruments.
 *
 * An electrocardiogram that scrolls, a pressure-and-volume plot of one whole
 * beat, and the same beat drawn against itself as a loop. All three read the
 * same model as the heart does, so they cannot drift out of step with it.
 *
 * Canvas rather than SVG: these redraw every frame and have no parts anyone
 * needs to click.
 */
(function (root) {
  'use strict';

  var HEART = (root.HEART = root.HEART || {});
  var C = null;                                 /* HEART.cycle, bound on first use */

  function fit(canvas) {
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    var r = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width * dpr));
    var h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: r.width, h: r.height };
  }

  function line(ctx, pts, colour, width) {
    ctx.beginPath();
    for (var i = 0; i < pts.length; i += 2) {
      if (i === 0) ctx.moveTo(pts[0], pts[1]); else ctx.lineTo(pts[i], pts[i + 1]);
    }
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  /* ------------------------------------------------------------------ ECG */

  function Ecg(canvas, pal) {
    this.canvas = canvas;
    this.pal = pal;
    this.window = 5200;                          /* ms of strip on screen */
    this.buf = [];                               /* [t, v, t, v, ...] */
    this.clock = 0;
  }

  Ecg.prototype.push = function (dt, v) {
    this.clock += dt;
    this.buf.push(this.clock, v);
    var cut = this.clock - this.window - 200;
    var drop = 0;
    while (drop + 2 < this.buf.length && this.buf[drop] < cut) drop += 2;
    if (drop) this.buf.splice(0, drop);
  };

  Ecg.prototype.reset = function () { this.buf.length = 0; };

  /* Fill the strip with the beats that would have run before the page opened,
     so the first thing you see is a trace rather than an empty grid. */
  Ecg.prototype.prime = function (h, t0) {
    C = C || HEART.cycle;
    var step = 8, cyc = h.timing.cycleMs;
    this.buf.length = 0;
    this.clock = 0;
    for (var i = Math.ceil(this.window / step); i >= 0; i--) {
      var t = ((t0 - i * step) % cyc + cyc) % cyc;
      this.buf.push(this.clock, C.ecgAt(t, h));
      this.clock += step;
    }
  };

  Ecg.prototype.draw = function () {
    var f = fit(this.canvas), ctx = f.ctx, w = f.w, h = f.h, p = this.pal;
    ctx.clearRect(0, 0, w, h);

    /* Paper. Real ECG paper is 25 mm/s with a 5 mm heavy grid; the heavy lines
       here are 200 ms apart for the same reason — so an interval can be counted
       off the picture rather than read off a label. */
    var pxPerMs = w / this.window;
    ctx.save();
    ctx.strokeStyle = p.gridFine; ctx.lineWidth = 1;
    var step = 40 * pxPerMs, x;
    for (x = w; x > 0; x -= step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (var y = h; y > 0; y -= h / 10) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.strokeStyle = p.grid;
    for (x = w; x > 0; x -= step * 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (var y2 = h; y2 > 0; y2 -= h / 2) { ctx.beginPath(); ctx.moveTo(0, y2); ctx.lineTo(w, y2); ctx.stroke(); }
    ctx.restore();

    var base = h * 0.70, amp = h * 0.46;
    var pts = [], b = this.buf;
    for (var i = 0; i < b.length; i += 2) {
      var t = b[i] - (this.clock - this.window);
      if (t < -20) continue;
      pts.push(t * pxPerMs, base - b[i + 1] * amp);
    }
    if (pts.length >= 4) {
      ctx.save();
      ctx.shadowColor = p.trace; ctx.shadowBlur = 9;
      line(ctx, pts, p.trace, 2);
      ctx.restore();
      ctx.fillStyle = p.trace;
      ctx.beginPath();
      ctx.arc(pts[pts.length - 2], pts[pts.length - 1], 3.1, 0, 6.2832);
      ctx.fill();
    }
  };

  /* ----------------------------------------------------- pressures over time */

  function Wiggers(canvas, pal) {
    this.canvas = canvas;
    this.pal = pal;
    this.cache = null;
    this.key = '';
  }

  /* One beat, sampled once and kept until a slider moves. */
  Wiggers.prototype.sample = function (h) {
    C = C || HEART.cycle;
    var key = [h.hr, h.contractility, h.filling].join('|');
    if (this.key === key && this.cache) return this.cache;
    var N = 400, cyc = h.timing.cycleMs;
    var s = { t: [], lv: [], ao: [], la: [], v: [], pmax: 0, vmax: 0 };
    for (var i = 0; i <= N; i++) {
      var t = i / N * cyc;
      var pr = C.pressures(t, h);
      s.t.push(t); s.lv.push(pr.lv); s.ao.push(pr.ao); s.la.push(pr.la);
      s.v.push(C.volumeAt(t, h));
      s.pmax = Math.max(s.pmax, pr.lv, pr.ao);
      s.vmax = Math.max(s.vmax, s.v[i]);
    }
    this.key = key;
    this.cache = s;
    return s;
  };

  Wiggers.prototype.draw = function (h, st) {
    C = C || HEART.cycle;
    var f = fit(this.canvas), ctx = f.ctx, w = f.w, hh = f.h, p = this.pal;
    var s = this.sample(h), cyc = h.timing.cycleMs;
    ctx.clearRect(0, 0, w, hh);

    var padL = 42, padR = 10, padT = 30, padB = 24;
    var W = w - padL - padR;
    var pH = (hh - padT - padB) * 0.64;          /* pressure panel */
    var vTop = padT + pH + 12;
    var vH = hh - padB - vTop;
    var pmax = Math.max(140, s.pmax * 1.08);

    var X = function (t) { return padL + t / cyc * W; };
    var PY = function (mm) { return padT + pH - mm / pmax * pH; };
    var VY = function (ml) { return vTop + vH - ml / Math.max(160, s.vmax * 1.12) * vH; };

    /* Phase bands. Systole shaded, so the collapse of diastole with rate is
       visible as a picture rather than a number. */
    var ph = h.timing.phases;
    ctx.fillStyle = p.band;
    ctx.fillRect(X(ph[0].start), padT, X(ph[2].end) - X(ph[0].start), pH);
    ctx.strokeStyle = p.gridFine; ctx.lineWidth = 1;
    for (var i = 0; i < ph.length; i++) {
      ctx.beginPath(); ctx.moveTo(X(ph[i].start), padT); ctx.lineTo(X(ph[i].start), padT + pH); ctx.stroke();
    }

    ctx.strokeStyle = p.grid; ctx.lineWidth = 1;
    ctx.fillStyle = p.dim; ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var mm = 0; mm <= pmax; mm += 40) {
      ctx.beginPath(); ctx.moveTo(padL, PY(mm)); ctx.lineTo(w - padR, PY(mm)); ctx.stroke();
      ctx.fillText(String(mm), padL - 6, PY(mm));
    }
    ctx.beginPath(); ctx.moveTo(padL, vTop + vH); ctx.lineTo(w - padR, vTop + vH); ctx.stroke();

    function series(arr, y, colour, width) {
      var pts = [];
      for (var i = 0; i < arr.length; i++) pts.push(X(s.t[i]), y(arr[i]));
      line(ctx, pts, colour, width);
    }
    series(s.la, PY, p.la, 1.6);
    series(s.ao, PY, p.ao, 2.4);
    series(s.lv, PY, p.lv, 2.4);
    ctx.save();
    ctx.globalAlpha = 0.16; ctx.fillStyle = p.vol;
    ctx.beginPath(); ctx.moveTo(X(0), vTop + vH);
    for (var k = 0; k < s.v.length; k++) ctx.lineTo(X(s.t[k]), VY(s.v[k]));
    ctx.lineTo(X(cyc), vTop + vH); ctx.closePath(); ctx.fill();
    ctx.restore();
    series(s.v, VY, p.vol, 2.2);

    /* where we are now */
    var cx = X(st.t);
    ctx.strokeStyle = p.cursor; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx, padT); ctx.lineTo(cx, vTop + vH); ctx.stroke();

    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.font = '11px "IBM Plex Mono", monospace';
    /* The axis and the caption both say mmHg, so the keys do not have to; four
       of them repeating it ran the legend off the edge of a narrow panel. */
    var keys = [['Aortic', p.ao], ['Left ventricular', p.lv],
                ['Left atrial', p.la], ['Volume mL', p.vol]];
    var lx = padL;
    for (var q = 0; q < keys.length; q++) {
      ctx.fillStyle = keys[q][1];
      ctx.fillRect(lx, 8, 14, 2.5);
      ctx.fillText(keys[q][0], lx + 19, 3);
      lx += ctx.measureText(keys[q][0]).width + 42;
    }
    ctx.fillStyle = p.dim;
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillText(Math.round(cyc) + ' ms', w - padR, hh - 4);
    ctx.textAlign = 'left';
    ctx.fillText('0 ms', padL, hh - 4);
  };

  /* ------------------------------------------------------------- PV loop */

  function Loop(canvas, pal) {
    this.canvas = canvas;
    this.pal = pal;
    this.wig = null;
  }

  Loop.prototype.draw = function (h, st, sample) {
    var f = fit(this.canvas), ctx = f.ctx, w = f.w, hh = f.h, p = this.pal;
    ctx.clearRect(0, 0, w, hh);
    var padL = 44, padR = 14, padT = 14, padB = 30;
    var W = w - padL - padR, H = hh - padT - padB;
    var vmax = Math.max(180, sample.vmax * 1.15);
    var pmax = Math.max(150, sample.pmax * 1.1);
    var X = function (v) { return padL + v / vmax * W; };
    var Y = function (mm) { return padT + H - mm / pmax * H; };

    ctx.strokeStyle = p.grid; ctx.lineWidth = 1;
    ctx.fillStyle = p.dim; ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var mm = 0; mm <= pmax; mm += 50) {
      ctx.beginPath(); ctx.moveTo(padL, Y(mm)); ctx.lineTo(w - padR, Y(mm)); ctx.stroke();
      ctx.fillText(String(mm), padL - 6, Y(mm));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (var v = 0; v <= vmax; v += 50) {
      ctx.strokeStyle = p.gridFine;
      ctx.beginPath(); ctx.moveTo(X(v), padT); ctx.lineTo(X(v), padT + H); ctx.stroke();
      ctx.fillStyle = p.dim;
      ctx.fillText(String(v), X(v), padT + H + 6);
    }

    var pts = [];
    for (var i = 0; i < sample.v.length; i++) pts.push(X(sample.v[i]), Y(sample.lv[i]));
    ctx.save();
    ctx.globalAlpha = 0.13; ctx.fillStyle = p.lv;
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]);
    for (var j = 2; j < pts.length; j += 2) ctx.lineTo(pts[j], pts[j + 1]);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    line(ctx, pts, p.lv, 2.2);

    var pr = HEART.cycle.pressures(st.t, h);
    ctx.fillStyle = p.cursor;
    ctx.beginPath(); ctx.arc(X(st.volume), Y(pr.lv), 4.2, 0, 6.2832); ctx.fill();

    ctx.fillStyle = p.dim;
    ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.fillText('mL', w - padR - 18, padT + H + 22);
    ctx.save();
    ctx.translate(12, padT + H / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.fillText('mmHg', 0, 0);
    ctx.restore();
  };

  HEART.charts = { Ecg: Ecg, Wiggers: Wiggers, Loop: Loop };
})(typeof globalThis !== 'undefined' ? globalThis : this);
