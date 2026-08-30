/*
 * app.js — the clock, the controls, and everything that touches the DOM.
 *
 * The shape of it: one requestAnimationFrame loop advances a clock, asks
 * cycle.js what the heart is doing at that instant, and pushes the answer into
 * the drawing. Nothing here decides anything about the heart; it only moves
 * what the model says has moved.
 */
(function () {
  'use strict';

  var C = HEART.cycle, A = HEART.anatomy;
  var $ = function (id) { return document.getElementById(id); };
  var clamp = C.util.clamp, lerp = C.util.lerp;

  var svg = $('heart');
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- state */

  var S = {
    hr: 72,
    contractility: 1,
    filling: 1,
    playing: !reduced,
    slow: false,
    view: 'cutaway',
    flow: !reduced,
    labels: false,
    sound: false,
    t: 0,                  /* ms into the current beat */
    beats: 0,
    scrubbing: false,
    selected: null
  };

  var h = C.hemodynamics(S.hr, S.contractility, S.filling);
  function rebuild() { h = C.hemodynamics(S.hr, S.contractility, S.filling); }

  var flow = new HEART.Flow(svg, $('flow-layer'));
  var beatSound = new HEART.Heartbeat();

  /* ------------------------------------------------------- chart palette */

  function palette() {
    var cs = getComputedStyle(document.documentElement);
    var v = function (n, f) { return (cs.getPropertyValue(n) || '').trim() || f; };
    return {
      grid:     v('--chart-grid', '#2a2226'),
      gridFine: v('--chart-grid-fine', '#1d1719'),
      dim:      v('--chart-dim', '#8b7f83'),
      trace:    v('--chart-trace', '#54e08a'),
      ao:       v('--chart-ao', '#ff6b5e'),
      lv:       v('--chart-lv', '#ffc857'),
      la:       v('--chart-la', '#6fb1ff'),
      vol:      v('--chart-vol', '#c86bd8'),
      band:     v('--chart-band', 'rgba(255,255,255,.035)'),
      cursor:   v('--chart-cursor', '#f4f1ee')
    };
  }
  var pal = palette();
  var ecg = new HEART.charts.Ecg($('ecg'), pal);
  var wiggers = new HEART.charts.Wiggers($('wiggers'), pal);
  var loop = new HEART.charts.Loop($('loop'), pal);

  /* --------------------------------------------------------- presets */

  var PRESETS = [
    { key: 'rest',    name: 'At rest',      hr: 72,  c: 1.00, f: 1.00,
      note: 'A quiet adult. Five litres a minute, about a fifth of it going to the brain.' },
    { key: 'asleep',  name: 'Asleep',       hr: 48,  c: 0.95, f: 1.08,
      note: 'Slow, and therefore roomy: the long diastole fills the ventricle further than a waking beat does.' },
    { key: 'sprint',  name: 'Running hard', hr: 176, c: 1.58, f: 0.94,
      note: 'Rate and squeeze both up, and the muscle relaxes faster too. Diastasis is gone entirely — there is no idle time left in the beat.' },
    { key: 'athlete', name: 'Endurance-trained', hr: 44, c: 1.32, f: 1.30,
      note: 'A big, slow, strong heart. Same output as the resting adult on two thirds of the beats.' },
    { key: 'bleed',   name: 'Blood lost',   hr: 138, c: 1.15, f: 0.56,
      note: 'Nothing to fill with. Rate climbs to defend an output the stroke volume can no longer carry.' },
    { key: 'failing', name: 'Failing pump', hr: 98,  c: 0.50, f: 1.40,
      note: 'A weak, dilated ventricle holding its output up by filling further and beating faster. It manages at rest, and has nothing left for anything else.' }
  ];

  function renderPresets() {
    var box = $('presets');
    box.textContent = '';
    PRESETS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = p.name;
      b.addEventListener('click', function () {
        S.hr = p.hr; S.contractility = p.c; S.filling = p.f;
        syncInputs(); rebuild(); ecg.prime(h, S.t); noteHint(p.note); refreshStatic();
      });
      box.appendChild(b);
    });
  }

  var hintTimer = null;
  function noteHint(text) {
    var el = $('stage-hint');
    el.firstElementChild.textContent = text;
    el.classList.add('lit');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      el.classList.remove('lit');
      el.firstElementChild.textContent =
        'Point at a part to name it. Drag across the heart to scrub one beat by hand.';
    }, 7000);
  }

  /* --------------------------------------------------------- toggles */

  function renderToggles() {
    var box = $('toggles');
    box.textContent = '';

    var seg = document.createElement('div');
    seg.className = 'segmented';
    [['cutaway', 'Cut away'], ['surface', 'Whole']].forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = o[1];
      b.setAttribute('aria-pressed', String(S.view === o[0]));
      b.addEventListener('click', function () {
        S.view = o[0];
        svg.setAttribute('data-view', S.view);
        Array.prototype.forEach.call(seg.children, function (c) {
          c.setAttribute('aria-pressed', String(c.textContent === o[1]));
        });
      });
      seg.appendChild(b);
    });
    box.appendChild(seg);

    [
      { key: 'flow',   label: 'Blood' },
      { key: 'labels', label: 'Labels' },
      { key: 'sound',  label: 'Heart sounds' }
    ].forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip toggle';
      b.textContent = t.label;
      b.setAttribute('aria-pressed', String(!!S[t.key]));
      b.addEventListener('click', function () {
        S[t.key] = !S[t.key];
        if (t.key === 'sound') S.sound = beatSound.setEnabled(S.sound);
        if (t.key === 'flow') flow.setEnabled(S.flow);
        if (t.key === 'labels') renderLabels();
        b.setAttribute('aria-pressed', String(!!S[t.key]));
      });
      box.appendChild(b);
    });
  }

  /* ----------------------------------------------------------- labels */

  var NS = 'http://www.w3.org/2000/svg';

  function labelNode(part, cls) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'label ' + (cls || ''));
    var L = part.label;
    var lead = document.createElementNS(NS, 'path');
    lead.setAttribute('d', 'M' + L.px + ' ' + L.py + ' L' + L.x + ' ' + L.y);
    lead.setAttribute('class', 'leader');
    var dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', L.px); dot.setAttribute('cy', L.py); dot.setAttribute('r', 3);
    dot.setAttribute('class', 'leader-dot');
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', L.x + (L.anchor === 'end' ? -7 : 7));
    t.setAttribute('y', L.y + 4);
    t.setAttribute('text-anchor', L.anchor);
    t.textContent = part.name;
    g.appendChild(lead); g.appendChild(dot); g.appendChild(t);
    return g;
  }

  /* A chip pinned next to the part, for pointing at one thing. */
  function chipNode(part) {
    var L = part.label;
    var right = L.side === 'right';
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'chip-label');
    var w = part.name.length * 7.1 + 20;
    var x = L.px + (right ? 16 : -16 - w);
    var y = L.py - 15;
    /* keep the chip on the canvas even for parts near an edge */
    x = clamp(x, 6, 640 - w - 6);
    var r = document.createElementNS(NS, 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y);
    r.setAttribute('width', w); r.setAttribute('height', 30);
    r.setAttribute('rx', 15);
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', x + w / 2); t.setAttribute('y', y + 20);
    t.setAttribute('text-anchor', 'middle');
    t.textContent = part.name;
    var d = document.createElementNS(NS, 'circle');
    d.setAttribute('cx', L.px); d.setAttribute('cy', L.py); d.setAttribute('r', 4);
    d.setAttribute('class', 'leader-dot');
    g.appendChild(d); g.appendChild(r); g.appendChild(t);
    return g;
  }

  /* The full plate. The viewBox widens to open margins for it, so the labels
     never sit on top of the anatomy the way a tooltip has to. */
  var VIEW_TIGHT = '0 6 640 722', VIEW_PLATE = '-152 6 944 722';

  function renderLabels() {
    var layer = $('label-layer');
    layer.textContent = '';
    svg.setAttribute('viewBox', S.labels ? VIEW_PLATE : VIEW_TIGHT);
    if (!S.labels) return;
    A.parts.forEach(function (p) { if (p.label) layer.appendChild(labelNode(p)); });
  }

  /* ------------------------------------------------- hover and selection */

  function partOf(node) {
    while (node && node !== svg) {
      if (node.getAttribute && node.getAttribute('data-part')) return node.getAttribute('data-part');
      node = node.parentNode;
    }
    return null;
  }

  function light(id) {
    if (S.selected === id) return;
    S.selected = id;
    Array.prototype.forEach.call(svg.querySelectorAll('.part'), function (el) {
      el.classList.toggle('is-lit', el.getAttribute('data-part') === id);
    });
    svg.classList.toggle('has-lit', !!id);

    var ring = $('focus-ring');
    ring.textContent = '';
    var part = id && A.byId(id);
    if (part && part.label && !S.labels) ring.appendChild(chipNode(part));
    renderInfo(part);
  }

  function metricText(part) {
    if (!part || !part.metric) return null;
    var st = C.state(S.t, h), pr = st.pressure;
    var one = function (n) { return n.toFixed(0); };
    switch (part.metric) {
      case 'lv': return one(pr.lv) + ' mmHg · ' + one(st.volume) + ' mL';
      case 'ao': return one(pr.ao) + ' mmHg';
      case 'la': return pr.la.toFixed(1) + ' mmHg';
      case 'rv': return one(pr.rv) + ' mmHg · ' + one(st.volume) + ' mL';
      case 'pa': return one(pr.pa) + ' mmHg';
      case 'rap': return pr.ra.toFixed(1) + ' mmHg';
      case 'mitral': case 'tricuspid': case 'aortic': case 'pulmonary':
        var o = st.valves[part.metric];
        return o < 0.02 ? 'shut' : Math.round(o * 100) + '% open';
    }
    return null;
  }

  var infoBox = $('info');
  function renderInfo(part) {
    infoBox.textContent = '';
    var hd = document.createElement('h2');
    hd.className = 'panel-h';
    if (!part) {
      hd.textContent = 'Point at something';
      infoBox.appendChild(hd);
      var p0 = document.createElement('p');
      p0.className = 'info-blurb';
      p0.textContent = 'Every labelled part has a note. Hover, tap, or tab to it.';
      infoBox.appendChild(p0);
      return;
    }
    hd.textContent = part.name;
    infoBox.appendChild(hd);

    var tag = document.createElement('span');
    tag.className = 'blood-tag ' + part.side;
    tag.textContent = part.side === 'venous' ? 'carrying blood to the lungs'
                    : part.side === 'arterial' ? 'carrying blood to the body' : 'muscle';
    infoBox.appendChild(tag);

    var live = document.createElement('p');
    live.className = 'info-live num';
    live.id = 'info-live';
    live.textContent = metricText(part) || '';
    infoBox.appendChild(live);

    var b = document.createElement('p');
    b.className = 'info-blurb';
    b.textContent = part.blurb;
    infoBox.appendChild(b);
  }

  svg.addEventListener('pointerover', function (e) {
    if (S.scrubbing) return;
    var id = partOf(e.target);
    if (id) light(id);
  });
  svg.addEventListener('pointerleave', function () { if (!S.scrubbing) light(null); });
  svg.addEventListener('focusin', function (e) {
    var id = partOf(e.target);
    if (id) light(id);
  });

  /* ------------------------------------------------- drag across to scrub */

  var drag = null;
  svg.addEventListener('pointerdown', function (e) {
    drag = { x: e.clientX, moved: false };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', function (e) {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x) < 7) return;
    if (!drag.moved) {
      drag.moved = true;
      S.scrubbing = true;
      setPlaying(false);
      svg.classList.add('scrubbing');
    }
    var r = svg.getBoundingClientRect();
    var u = clamp((e.clientX - r.left) / r.width, 0, 0.9999);
    S.t = u * h.timing.cycleMs;
    $('scrub').value = String(Math.round(u * 1000));
  });
  function endDrag(e) {
    if (!drag) return;
    if (drag.moved) { S.scrubbing = false; svg.classList.remove('scrubbing'); }
    try { svg.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
    drag = null;
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  /* ------------------------------------------------------------ controls */

  function syncInputs() {
    $('hr').value = String(Math.round(S.hr));
    $('contract').value = String(S.contractility);
    $('filling').value = String(S.filling);
    $('hr-val').textContent = Math.round(S.hr) + ' bpm';
    $('contract-val').textContent = S.contractility.toFixed(2);
    $('filling-val').textContent = S.filling.toFixed(2);
  }

  $('hr').addEventListener('input', function () {
    S.hr = +this.value; rebuild(); syncInputs(); refreshStatic();
  });
  $('contract').addEventListener('input', function () {
    S.contractility = +this.value; rebuild(); syncInputs(); refreshStatic();
  });
  $('filling').addEventListener('input', function () {
    S.filling = +this.value; rebuild(); syncInputs(); refreshStatic();
  });

  function setPlaying(on) {
    S.playing = on;
    var b = $('play');
    b.textContent = on ? 'Pause' : 'Play';
    b.setAttribute('aria-pressed', String(on));
    $('scrub').disabled = on;
  }
  $('play').addEventListener('click', function () { setPlaying(!S.playing); });
  $('slow').addEventListener('click', function () {
    S.slow = !S.slow;
    this.setAttribute('aria-pressed', String(S.slow));
    this.classList.toggle('on', S.slow);
  });
  $('scrub').addEventListener('input', function () {
    if (S.playing) return;
    S.t = (+this.value / 1000) * h.timing.cycleMs;
  });

  /* tap a rate: four taps is enough to average out a shaky hand */
  var taps = [], tapIdle = null;
  $('tap').addEventListener('click', function () {
    var btn = this, now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2500) taps.length = 0;
    clearTimeout(tapIdle);
    tapIdle = setTimeout(function () {
      taps.length = 0;
      btn.textContent = 'Tap a rate';
    }, 2600);
    taps.push(now);
    if (taps.length > 5) taps.shift();
    if (taps.length >= 2) {
      var span = taps[taps.length - 1] - taps[0];
      var bpm = clamp(60000 / (span / (taps.length - 1)), C.HR_MIN, C.HR_MAX);
      S.hr = Math.round(bpm);
      syncInputs(); rebuild(); refreshStatic();
      this.textContent = Math.round(bpm) + ' bpm — keep tapping';
    } else {
      this.textContent = 'again…';
    }
  });

  /* ---------------------------------------------------- the phase ribbon */

  var PHASE_NOTE = {
    ivc: 'Every valve is shut. The ventricle squeezes on a sealed box, so pressure climbs and nothing moves. The inlet valves slamming is the first heart sound.',
    rapidEject: 'Ventricular pressure passes arterial pressure, the outlet valve opens, and about seven tenths of the stroke volume leaves in this window.',
    reducedEject: 'Flow tails off as the muscle runs out of shortening. Pressure is already falling while blood is still on its way out.',
    ivr: 'Sealed again, and relaxing. Pressure collapses from arterial to nearly nothing in under a tenth of a second. The outlet valves shutting is the second heart sound.',
    rapidFill: 'Ventricular pressure drops below atrial, the inlet valve opens, and blood falls in without anything pushing it.',
    diastasis: 'The idle middle of the beat, when pressures have equalised and little moves. It is pure slack, and the first thing a fast heart spends.',
    atrialSystole: 'The atrium wrings out the last fifth. Worth little at rest and a great deal when there was no time for the rest of filling.'
  };

  function renderPhaseBar() {
    var bar = $('phase-bar'), notes = $('phase-notes');
    bar.textContent = ''; notes.textContent = '';
    h.timing.phases.forEach(function (p) {
      var seg = document.createElement('div');
      seg.className = 'seg seg-' + p.key;
      seg.style.flexGrow = String(Math.max(0.0001, p.dur));
      seg.setAttribute('data-key', p.key);
      var l = document.createElement('span');
      l.className = 'seg-l';
      l.textContent = p.label;
      var m = document.createElement('span');
      m.className = 'seg-m num';
      m.textContent = Math.round(p.dur) + ' ms';
      seg.appendChild(l); seg.appendChild(m);
      bar.appendChild(seg);

      var n = document.createElement('div');
      n.className = 'pnote';
      n.setAttribute('data-key', p.key);
      n.innerHTML = '<strong>' + p.label + '</strong><span class="num">' +
        Math.round(p.dur) + ' ms · ' + (p.dur / h.timing.cycleMs * 100).toFixed(0) +
        '% of the beat</span><p>' + PHASE_NOTE[p.key] + '</p>';
      notes.appendChild(n);
    });
    var cur = document.createElement('div');
    cur.className = 'seg-cursor';
    cur.id = 'seg-cursor';
    bar.appendChild(cur);
  }

  /* ------------------------------------------------------------- vitals */

  var VITALS = [
    { k: 'hr',  label: 'Rate',            unit: 'bpm' },
    { k: 'bp',  label: 'Arterial',        unit: 'mmHg' },
    { k: 'sv',  label: 'Stroke volume',   unit: 'mL' },
    { k: 'ef',  label: 'Ejection fraction', unit: '%' },
    { k: 'co',  label: 'Cardiac output',  unit: 'L/min' },
    { k: 'edv', label: 'Filled to',       unit: 'mL' }
  ];

  function renderVitals() {
    var box = $('vitals');
    box.textContent = '';
    VITALS.forEach(function (v) {
      var d = document.createElement('div');
      d.className = 'vital';
      d.innerHTML = '<span class="v-l">' + v.label + '</span>' +
        '<span class="v-n num" id="v-' + v.k + '">—</span>' +
        '<span class="v-u">' + v.unit + '</span>';
      box.appendChild(d);
    });
  }

  function refreshStatic() {
    renderPhaseBar();
    $('v-hr').textContent = Math.round(h.hr);
    $('v-bp').textContent = Math.round(h.sbp) + '/' + Math.round(h.dbp);
    $('v-sv').textContent = Math.round(h.sv);
    $('v-ef').textContent = Math.round(h.ef * 100);
    $('v-co').textContent = h.co.toFixed(1);
    $('v-edv').textContent = Math.round(h.edv);
    $('hr-note').textContent = h.timing.fillMs < 190
      ? 'Filling has ' + Math.round(h.timing.fillMs) + ' ms. That is the whole problem with a fast heart.'
      : 'Filling has ' + Math.round(h.timing.fillMs) + ' ms of the ' +
        Math.round(h.timing.cycleMs) + ' ms beat.';
    $('footer-stats').textContent =
      Math.round(h.timing.cycleMs) + ' ms per beat · ' +
      Math.round(h.timing.systoleMs) + ' ms systole · ' +
      Math.round(h.timing.diastoleMs) + ' ms diastole · ' +
      Math.round(h.timing.fillMs) + ' ms with a valve open';
  }

  /* -------------------------------------------------------- the drawing */

  var motionEls = {}, wallEls = {}, leaflets = [];

  function bind() {
    A.motion.forEach(function (m) { motionEls[m.id] = svg.getElementById(m.id); });
    A.walls.forEach(function (w) { wallEls[w.id] = svg.getElementById(w.id); });
    ['tricuspid', 'mitral', 'aortic', 'pulmonary'].forEach(function (key) {
      var g = svg.getElementById('valve-' + key);
      if (!g) return;
      Array.prototype.forEach.call(g.querySelectorAll('.leaflet'), function (el) {
        var hinge = el.getAttribute('data-hinge').split(',');
        leaflets.push({
          el: el, key: key,
          hx: +hinge[0], hy: +hinge[1],
          open: +el.getAttribute('data-open')
        });
      });
    });
  }

  function paint(st) {
    /* squeeze: 0 with the chamber full, 1 with it as empty as it gets */
    var vq = 1 - st.fill;
    var aq = 1 - st.atrialFill;

    A.motion.forEach(function (m) {
      var el = motionEls[m.id];
      if (!el) return;
      var q = m.driver === 'atrium' ? aq : m.driver === 'body' ? vq * 0.62 : vq;
      var sx = 1 - m.sx * q, sy = 1 - m.sy * q;
      var px = m.pivot[0], py = m.pivot[1];
      var tr = 'translate(' + px + ' ' + py + ') scale(' + sx.toFixed(4) + ' ' +
               sy.toFixed(4) + ')';
      if (m.twist) tr += ' rotate(' + (m.twist * q).toFixed(3) + ')';
      tr += ' translate(' + (-px) + ' ' + (-py) + ')';
      el.setAttribute('transform', tr);
    });

    A.walls.forEach(function (w) {
      var el = wallEls[w.id];
      if (!el) return;
      var q = (w.id === 'w-ra' || w.id === 'w-la') ? aq : vq;
      el.setAttribute('stroke-width', lerp(w.min, w.max, q).toFixed(2));
    });

    for (var i = 0; i < leaflets.length; i++) {
      var L = leaflets[i];
      var a = L.open * st.valves[L.key];
      L.el.setAttribute('transform',
        'rotate(' + a.toFixed(2) + ' ' + L.hx + ' ' + L.hy + ')');
    }

    svg.setAttribute('data-phase', st.phase);
  }

  /* ------------------------------------------------------------ the loop */

  var last = 0, lastPhase = -1;
  var pulseDot = $('pulse-dot');

  function frame(now) {
    var dt = last ? Math.min(80, now - last) : 16;
    last = now;

    if (S.playing) {
      var adv = dt * (S.slow ? 0.25 : 1);
      S.t += adv;
      if (S.t >= h.timing.cycleMs) {
        S.t -= h.timing.cycleMs * Math.floor(S.t / h.timing.cycleMs);
        S.beats++;
        $('beat-count').textContent = S.beats.toLocaleString() +
          (S.beats === 1 ? ' beat' : ' beats');
      }
    }

    var st = C.state(S.t, h);

    /* heart sounds fire on the two phase changes that are actually audible */
    if (st.phaseIndex !== lastPhase) {
      if (S.playing) {
        if (st.phaseIndex === 0) {
          beatSound.beat(1, h.sv / 70);
          pulseDot.classList.remove('hit');
          void pulseDot.offsetWidth;
          pulseDot.classList.add('hit');
        }
        if (st.phaseIndex === 3) beatSound.beat(2, h.sbp / 120);
      }
      lastPhase = st.phaseIndex;
      $('phase-tag').textContent = st.phaseLabel;
      $('cap-phase').textContent = st.phaseLabel;
      $('cap-note').textContent = PHASE_NOTE[st.phase];
      var bar = $('phase-bar');
      Array.prototype.forEach.call(bar.children, function (c) {
        if (c.classList.contains('seg')) c.classList.toggle('on', c.getAttribute('data-key') === st.phase);
      });
      Array.prototype.forEach.call($('phase-notes').children, function (c) {
        c.classList.toggle('on', c.getAttribute('data-key') === st.phase);
      });
    }

    paint(st);

    flow.step(st, h.hr, (S.playing ? dt * (S.slow ? 0.25 : 1) : 0) / 1000);
    flow.draw();

    ecg.push(S.playing ? dt * (S.slow ? 0.25 : 1) : 0, st.ecg);
    ecg.draw();
    wiggers.draw(h, st);
    loop.draw(h, st, wiggers.sample(h));

    var cur = $('seg-cursor');
    if (cur) cur.style.left = (S.t / h.timing.cycleMs * 100).toFixed(2) + '%';
    if (!S.playing) $('scrub-val').textContent = Math.round(S.t) + ' ms';
    else $('scrub-val').textContent = '—';

    var live = $('info-live');
    if (live && S.selected) live.textContent = metricText(A.byId(S.selected)) || '';

    requestAnimationFrame(frame);
  }

  /* -------------------------------------------------------------- start */

  bind();
  renderPresets();
  renderToggles();
  renderVitals();
  syncInputs();
  refreshStatic();
  ecg.prime(h, S.t);
  renderLabels();
  renderInfo(null);
  svg.setAttribute('data-view', S.view);
  flow.setEnabled(S.flow);
  setPlaying(S.playing);
  if (reduced) {
    S.t = 0;
    noteHint('Motion is off because this device asks for reduced motion. Press Play, or drag across the heart, to move it by hand.');
  }
  addEventListener('resize', function () { pal = palette(); });
  requestAnimationFrame(frame);
})();
