/*
 * app.js — everything that touches the DOM.
 *
 * bodies.js decides; this file only shows. Selecting a variant swaps the
 * drawing and re-renders the panel from the data; selecting an effector swaps
 * every hand on the plate and re-adds the cost sheet; hovering either end of
 * the joint↔row link lights the other. The one piece of theatre — the distress
 * demo — is a small state machine that runs on the same wall clock as
 * everything else and jumps straight to its end under reduced motion.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var money = function (n) { return '$' + n.toLocaleString('en-US'); };

  var S = { body: 'warden', effector: 'hand' };

  var plate = $('plate');

  function bodyById(id) {
    for (var i = 0; i < BOT.bodies.length; i++) if (BOT.bodies[i].id === id) return BOT.bodies[i];
    return null;
  }
  function effectorById(id) {
    for (var i = 0; i < BOT.effectors.length; i++) if (BOT.effectors[i].id === id) return BOT.effectors[i];
    return null;
  }

  /* ------------------------------------------------------------ variants */

  function renderVariants() {
    var box = $('variants');
    box.textContent = '';
    BOT.bodies.forEach(function (b) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'variant';
      el.setAttribute('aria-pressed', String(b.id === S.body));
      var priced = b.hasBom ? '<span class="price-chip" data-role="price"></span>' : '';
      el.innerHTML = '<b>' + b.name + '</b><span>' + b.role + '</span>' + priced;
      el.addEventListener('click', function () { S.body = b.id; sync(); });
      box.appendChild(el);
    });
  }

  /* ----------------------------------------------------------- the plate */

  function renderPlate() {
    var b = bodyById(S.body);
    plate.setAttribute('data-body', b.id);

    /* dimension line follows the body it measures */
    $('dim-line').setAttribute('y1', b.dims.top);
    $('dim-line').setAttribute('y2', b.dims.bottom);
    $('dim-cap-t').setAttribute('d', 'M30 ' + (b.dims.top + 5) + ' L34 ' + (b.dims.top - 1) + ' L38 ' + (b.dims.top + 5));
    $('dim-cap-b').setAttribute('d', 'M30 ' + (b.dims.bottom - 5) + ' L34 ' + (b.dims.bottom + 1) + ' L38 ' + (b.dims.bottom - 5));
    var mid = (b.dims.top + b.dims.bottom) / 2;
    var t = $('dim-label');
    t.textContent = b.specs.height.toFixed(2) + ' m';
    t.setAttribute('transform', 'rotate(-90 24 ' + mid + ')');
    t.setAttribute('x', 24);
    t.setAttribute('y', mid);

    /* every wrist on every body wears the chosen effector */
    var slots = plate.querySelectorAll('.fx-slot');
    for (var i = 0; i < slots.length; i++) slots[i].setAttribute('href', '#fx-' + S.effector);

    $('cap-name').textContent = b.name + ' · ' + b.role;
    $('cap-note').textContent = b.blurb;
  }

  /* -------------------------------------------------------------- panel */

  function renderSpecs() {
    var b = bodyById(S.body), fx = effectorById(S.effector);
    var rows = [
      ['Height', b.specs.height.toFixed(2) + ' m'],
      ['Mass', (b.specs.mass + Math.round(fx.mass * 2 / 1000)) + ' kg'],
      ['Body DoF', String(b.specs.dof)],
      ['Hand DoF', b.specs.handDof ? String(b.specs.handDof) : '— (effector-defined)'],
      ['Payload', b.specs.payload],
      ['Speed', b.specs.speed],
      ['Power', b.specs.power],
      ['Runtime', b.specs.runtime],
      ['Effector', fx.name + ' × 2']
    ];
    var dl = $('specs');
    dl.textContent = '';
    rows.forEach(function (r) {
      var dt = document.createElement('dt'); dt.textContent = r[0];
      var dd = document.createElement('dd'); dd.textContent = r[1];
      dl.appendChild(dt); dl.appendChild(dd);
    });
    var ul = $('features');
    ul.textContent = '';
    b.features.forEach(function (f) {
      var li = document.createElement('li'); li.textContent = f; ul.appendChild(li);
    });
  }

  function renderEffectors() {
    var box = $('effectors');
    box.textContent = '';
    BOT.effectors.forEach(function (fx) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'chip';
      el.textContent = fx.name;
      el.setAttribute('aria-pressed', String(fx.id === S.effector));
      el.addEventListener('click', function () { S.effector = fx.id; sync(); });
      box.appendChild(el);
    });
  }

  function renderFxNote() {
    var fx = effectorById(S.effector);
    $('fx-note').textContent = fx.note + ' ' + money(fx.unit) + ' each, ' + fx.mass + ' g.';
  }

  /* ---------------------------------------------------------- cost sheet */

  function renderBom() {
    var p = BOT.price(S.effector);
    var box = $('bom');
    box.textContent = '';
    p.groups.forEach(function (g) {
      var el = document.createElement('div');
      el.className = 'bom-group';
      var rows = g.rows.map(function (r) {
        return '<tr' + (r.joint ? ' class="linked" data-joint="' + r.joint + '"' : '') + '>' +
          '<td>' + r.label + '</td>' +
          '<td class="qty">× ' + r.qty + '</td>' +
          '<td class="unit">' + money(r.unit) + '</td>' +
          '<td class="line">' + money(r.line) + '</td></tr>';
      }).join('');
      el.innerHTML =
        '<div class="bom-head"><h3>' + g.group + '</h3>' +
        '<span class="g-note">' + g.note + '</span>' +
        '<span class="sub">' + money(g.sub) + '</span></div>' +
        '<table><tbody>' + rows + '</tbody></table>';
      box.appendChild(el);
    });
    $('grand').textContent = money(p.grand);
    $('top-price').textContent = 'Warden as configured · ' + money(p.grand);
    var chip = document.querySelector('.variant .price-chip');
    if (chip) chip.textContent = money(p.grand);
    $('footer-stats').textContent =
      BOT.bodies.length + ' bodies · ' + BOT.effectors.length + ' effectors · ' +
      p.groups.length + ' cost groups · ' + money(p.grand) + ' as configured';
    wireBomHover();
  }

  /* Hover either end of the link and the other lights up. Rows and joints
     share data-joint keys; that is the whole mechanism. */
  function light(joint, on) {
    var els = document.querySelectorAll('[data-joint="' + joint + '"]');
    for (var i = 0; i < els.length; i++) els[i].classList.toggle('lit', on);
  }
  function wireBomHover() {
    var rows = document.querySelectorAll('.bom tr.linked');
    for (var i = 0; i < rows.length; i++) {
      (function (row) {
        var j = row.getAttribute('data-joint');
        row.addEventListener('mouseenter', function () { light(j, true); });
        row.addEventListener('mouseleave', function () { light(j, false); });
      })(rows[i]);
    }
  }
  plate.addEventListener('mouseover', function (e) {
    var n = e.target;
    while (n && n !== plate && !(n.getAttribute && n.getAttribute('data-joint'))) n = n.parentNode;
    if (n && n !== plate) light(n.getAttribute('data-joint'), true);
  });
  plate.addEventListener('mouseout', function (e) {
    var n = e.target;
    while (n && n !== plate && !(n.getAttribute && n.getAttribute('data-joint'))) n = n.parentNode;
    if (n && n !== plate) light(n.getAttribute('data-joint'), false);
  });

  /* ------------------------------------------------------- distress demo */

  /*
   * A strip-chart of your pulse and a three-state machine watching it:
   * STANDBY until the rate crosses the alarm line, ALERT while it confirms
   * the spike is sustained, INBOUND as the closing velocity ramps. The
   * confirmation delay is the honest part — a robot that launches on a single
   * noisy sample launches at every stumble and staircase.
   */
  var D = {
    hr: 72, target: 72, phase: 'standby', tPhase: 0,
    range: 240, v: 0, buf: [], running: !reduced
  };
  var THRESH = 120, CONFIRM_MS = 1400, VMAX = 40;

  function drawPulse() {
    var c = $('pulse'), ctx = c.getContext('2d');
    var cs = getComputedStyle(document.documentElement);
    var line = cs.getPropertyValue('--line').trim() || '#7fd4ff';
    var danger = cs.getPropertyValue('--danger').trim() || '#ff6b5e';
    var grid = cs.getPropertyValue('--hair').trim() || '#14283f';
    var w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (var gy = h; gy > 0; gy -= h / 4) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    }
    var Y = function (hr) { return h - ((hr - 50) / 130) * (h - 12) - 6; };
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = danger;
    ctx.beginPath(); ctx.moveTo(0, Y(THRESH)); ctx.lineTo(w, Y(THRESH)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = D.hr >= THRESH ? danger : line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var i = 0; i < D.buf.length; i++) {
      var x = (i / (D.buf.length - 1 || 1)) * w;
      if (i === 0) ctx.moveTo(x, Y(D.buf[i])); else ctx.lineTo(x, Y(D.buf[i]));
    }
    ctx.stroke();
  }

  function setStatus(text, cls) {
    var el = $('status');
    el.textContent = text;
    el.className = 'status num' + (cls ? ' ' + cls : '');
  }

  var last = 0;
  function tick(now) {
    var dt = last ? Math.min(100, now - last) : 16;
    last = now;

    /* pulse drifts towards its target with a little noise on top */
    D.hr += (D.target - D.hr) * dt / 900 + (Math.random() - 0.5) * 1.6;
    D.buf.push(D.hr);
    if (D.buf.length > 160) D.buf.shift();

    if (D.phase === 'alert') {
      D.tPhase += dt;
      if (D.tPhase >= CONFIRM_MS) { D.phase = 'inbound'; D.tPhase = 0; }
      setStatus('ALERT — confirming', 'alert');
    } else if (D.phase === 'inbound') {
      D.v = Math.min(VMAX, D.v + dt * 0.02);
      D.range = Math.max(0, D.range - D.v * dt / 1000);
      setStatus(D.range > 0 ? 'INBOUND' : 'ON STATION', 'inbound');
      if (D.range === 0 && D.target > 100) D.target = 96;  /* it arrived; you calm down */
    } else if (D.hr >= THRESH && D.phase === 'standby') {
      D.phase = 'alert'; D.tPhase = 0;
    }

    $('telemetry').textContent =
      'pulse ' + Math.round(D.hr) + ' bpm · range ' + Math.round(D.range) +
      ' m · v ' + D.v.toFixed(0) + ' m/s';
    drawPulse();
    if (D.running) requestAnimationFrame(tick);
  }

  $('distress').addEventListener('click', function () {
    if (D.phase !== 'standby') {                      /* reset */
      D.phase = 'standby'; D.target = 72; D.range = 240; D.v = 0; D.tPhase = 0;
      this.textContent = 'Simulate distress';
      setStatus('STANDBY', '');
      if (reduced) { D.hr = 72; D.buf = []; for (var j = 0; j < 160; j++) D.buf.push(72); drawPulse();
        $('telemetry').textContent = 'pulse 72 bpm · range 240 m · v 0 m/s'; }
      return;
    }
    this.textContent = 'Reset';
    if (reduced) {
      /* no animation: jump to the end state and say what happened */
      D.hr = 158; D.buf = []; for (var i = 0; i < 160; i++) D.buf.push(i < 100 ? 72 : 158);
      D.phase = 'inbound'; D.v = VMAX; D.range = 0;
      drawPulse();
      setStatus('ON STATION', 'inbound');
      $('telemetry').textContent = 'pulse 158 bpm · range 0 m · v 40 m/s';
      return;
    }
    D.target = 162;
  });

  /* ---------------------------------------------------------------- sync */

  function sync() {
    renderVariants();
    renderPlate();
    renderSpecs();
    renderEffectors();
    renderFxNote();
    renderBom();
    $('distress-block').style.display = S.body === 'warden' ? '' : 'none';
  }

  sync();
  for (var i = 0; i < 160; i++) D.buf.push(72);
  if (D.running) requestAnimationFrame(tick);
  else { drawPulse(); setStatus('STANDBY', ''); }
})();
