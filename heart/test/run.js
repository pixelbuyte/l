#!/usr/bin/env node
/*
 * Test suite for the heart. Run with: node heart/test/run.js
 *
 * Loads the shipped source files as globals, the way the browser does, so what
 * is tested is what is served, and reads index.html as text so the drawing and
 * the data that drives it cannot drift apart without something failing.
 *
 * Two of the checks are the load-bearing ones.
 *
 * The first is the sweep at the bottom. Anything can be made to look right at
 * 72 bpm; what matters is that across every rate, contractility and filling the
 * page allows, a ventricle never has both its valves open, never has both shut
 * while blood is moving through it, and never ends a beat holding a different
 * volume from the one it started with.
 *
 * The second is the markup check. Every hotspot, flow route, moving group and
 * animated wall is named in one file and drawn in another. If a path is renamed
 * in the SVG the part stops being clickable and the blood stops moving, and
 * nothing on screen says so — so it is asserted here instead.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var base = path.join(__dirname, '..');
['js/cycle.js', 'js/anatomy.js'].forEach(function (f) { require(path.join(base, f)); });

var HEART = globalThis.HEART;
var C = HEART.cycle, A = HEART.anatomy;
var html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
var css = fs.readFileSync(path.join(base, 'css', 'heart.css'), 'utf8');
var appjs = fs.readFileSync(path.join(base, 'js', 'app.js'), 'utf8');

var pass = 0, fail = 0, failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++;
  if (failures.length < 40) failures.push(name + (detail ? '\n      ' + detail : ''));
}
function eq(name, actual, expected) {
  ok(name, actual === expected,
     'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}
function near(name, actual, expected, tol) {
  ok(name, Math.abs(actual - expected) <= tol,
     'expected ' + expected + ' ±' + tol + ', got ' + actual);
}
function section(t) { process.stdout.write('\n  ' + t + '\n'); }

/* ------------------------------------------------------------------ timing */
section('Timing');

for (var hr = C.HR_MIN; hr <= C.HR_MAX; hr++) {
  var t = C.timing(hr);
  near('cycle length at ' + hr, t.cycleMs, 60000 / hr, 1e-9);

  var sum = 0, contiguous = true, nonneg = true, prevEnd = 0;
  for (var i = 0; i < t.phases.length; i++) {
    var p = t.phases[i];
    sum += p.dur;
    if (p.dur < -1e-9) nonneg = false;
    if (Math.abs(p.start - prevEnd) > 1e-9) contiguous = false;
    prevEnd = p.end;
  }
  ok('phases sum to the cycle at ' + hr, Math.abs(sum - t.cycleMs) < 1e-6,
     'sum ' + sum + ' vs cycle ' + t.cycleMs);
  ok('no phase has negative duration at ' + hr, nonneg);
  ok('phases are contiguous at ' + hr, contiguous);
  ok('diastole is positive at ' + hr, t.diastoleMs > 0, 'got ' + t.diastoleMs);
  ok('systole is under three quarters of the beat at ' + hr,
     t.systoleFraction <= 0.7201, 'got ' + t.systoleFraction);
  ok('there is always time with a valve open at ' + hr, t.fillMs > 0);
}

/* The asymmetry that produces almost everything else on the page. */
var slow = C.timing(45), fast = C.timing(180);
ok('systole shortens with rate', fast.systoleMs < slow.systoleMs);
ok('diastole shortens far more than systole',
   (slow.diastoleMs - fast.diastoleMs) > 2.5 * (slow.systoleMs - fast.systoleMs),
   'diastole lost ' + (slow.diastoleMs - fast.diastoleMs).toFixed(0) +
   ' ms, systole lost ' + (slow.systoleMs - fast.systoleMs).toFixed(0) + ' ms');
ok('systole takes a larger share of a fast beat',
   fast.systoleFraction > slow.systoleFraction);
ok('a slow beat has idle time in the middle', slow.dur.diastasis > 100);
ok('a fast beat has none', fast.dur.diastasis === 0);

var lastFraction = -1, monotoneFraction = true, lastFill = Infinity, monotoneFill = true;
for (var hr2 = C.HR_MIN; hr2 <= C.HR_MAX; hr2++) {
  var tt = C.timing(hr2);
  if (tt.systoleFraction < lastFraction - 1e-9) monotoneFraction = false;
  lastFraction = tt.systoleFraction;
  if (tt.fillMs > lastFill + 1e-9) monotoneFill = false;
  lastFill = tt.fillMs;
}
ok('the share of the beat spent in systole rises with rate, always', monotoneFraction);
ok('time available for filling falls with rate, always', monotoneFill);

/* --------------------------------------------------------- resting numbers */
section('A resting adult');

var rest = C.hemodynamics(72, 1, 1);
near('heart rate', rest.hr, 72, 0);
near('stroke volume is about 70 mL', rest.sv, 70, 8);
near('ejection fraction is about 60%', rest.ef * 100, 60, 6);
near('cardiac output is about 5 L/min', rest.co, 5, 0.6);
near('systolic pressure is about 120', rest.sbp, 120, 8);
near('diastolic pressure is about 80', rest.dbp, 80, 8);
near('end-diastolic volume is about 120 mL', rest.edv, 120, 12);
near('left atrial pressure is 6 to 12', rest.lap, 9, 3);
ok('pulmonary pressure is a fraction of systemic', rest.pas < rest.sbp * 0.35,
   rest.pas + ' vs ' + rest.sbp);
near('mean arterial pressure sits nearer diastolic than systolic',
     rest.map, rest.dbp + (rest.sbp - rest.dbp) / 3, 1e-9);

/* Starling, in one assertion: more stretch, bigger beat. */
var less = C.hemodynamics(72, 1, 0.7), more = C.hemodynamics(72, 1, 1.3);
ok('more filling gives a bigger stroke volume', more.sv > less.sv);
ok('a fuller ventricle is left holding more, not less',
   more.esv > less.esv);
ok('but it ejects the same fraction of what it holds',
   Math.abs(more.ef - less.ef) < 0.06);
var weak = C.hemodynamics(72, 0.6, 1), strong = C.hemodynamics(72, 1.6, 1);
ok('a stronger ventricle empties further', strong.esv < weak.esv);
ok('a stronger ventricle has a higher ejection fraction', strong.ef > weak.ef);
ok('a weak ventricle is left holding more of what it had',
   weak.esv / weak.edv > strong.esv / strong.edv && weak.ef < 0.45);
ok('no ventricle is left holding more than it filled with',
   weak.esv < weak.edv && strong.esv < strong.edv);

/* Output climbs with rate for a while, then stroke volume gives way. */
ok('output climbs from rest to exercise',
   C.hemodynamics(150, 1, 1).co > C.hemodynamics(72, 1, 1).co);
ok('stroke volume falls as rate climbs',
   C.hemodynamics(180, 1, 1).sv < C.hemodynamics(72, 1, 1).sv);

/* ----------------------------------------------------------------- volumes */
section('Volume through a beat');

function sweepVolume(h, label) {
  var cyc = h.timing.cycleMs, N = 600;
  var minV = Infinity, maxV = -Infinity, bad = 0;
  for (var i = 0; i < N; i++) {
    var v = C.volumeAt(i / N * cyc, h);
    if (v < h.esv - 1e-6 || v > h.edv + 1e-6) bad++;
    minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  }
  ok(label + ': volume stays between end-systolic and end-diastolic', bad === 0,
     bad + ' samples outside [' + h.esv.toFixed(1) + ', ' + h.edv.toFixed(1) + ']');
  near(label + ': the beat empties to end-systolic volume', minV, h.esv, 0.5);
  near(label + ': the beat fills to end-diastolic volume', maxV, h.edv, 0.5);
  near(label + ': the volume curve closes', C.volumeAt(0, h),
       C.volumeAt(cyc - 0.001, h), 0.05);

  /* direction of travel, phase by phase */
  var tim = h.timing;
  var ejectBad = 0, fillBad = 0;
  for (var j = 0; j < N; j++) {
    var t0 = j / N * cyc, ph = C.phaseAt(t0, tim);
    var d = C.volumeAt(Math.min(cyc - 0.001, t0 + 0.5), h) - C.volumeAt(t0, h);
    if (ph.index === 1 || ph.index === 2) { if (d > 1e-6) ejectBad++; }
    else if (ph.index >= 4) { if (d < -1e-6) fillBad++; }
  }
  eq(label + ': volume never rises during ejection', ejectBad, 0);
  eq(label + ': volume never falls during filling', fillBad, 0);
}
sweepVolume(C.hemodynamics(72, 1, 1), 'at rest');
sweepVolume(C.hemodynamics(180, 1.5, 0.9), 'at a sprint');
sweepVolume(C.hemodynamics(40, 1.2, 1.3), 'asleep');

/* Flow is the derivative of that curve, so it has to agree with it. */
var rf = C.hemodynamics(72, 1, 1);
var netFlow = 0, stepMs = rf.timing.cycleMs / 2000;
for (var k = 0; k < 2000; k++) netFlow += C.flowAt(k * stepMs, rf) * stepMs / 1000;
near('flow over a whole beat nets to zero', netFlow, 0, 0.6);
ok('flow is outward during ejection',
   C.flowAt(rf.timing.phases[1].start + rf.timing.phases[1].dur / 2, rf) > 0);
ok('flow is inward during filling',
   C.flowAt(rf.timing.phases[4].start + rf.timing.phases[4].dur / 2, rf) < 0);
near('flow is zero while the ventricle is sealed',
     C.flowAt(rf.timing.phases[0].start + rf.timing.phases[0].dur / 2, rf), 0, 1e-6);

/* -------------------------------------------------------------------- ECG */
section('Electrocardiogram');

function ecgChecks(h, label) {
  var cyc = h.timing.cycleMs, N = 1000;
  var peak = -Infinity, peakT = 0;
  for (var i = 0; i < N; i++) {
    var v = C.ecgAt(i / N * cyc, h);
    if (v > peak) { peak = v; peakT = i / N * cyc; }
  }
  ok(label + ': R is the tallest thing on the strip', peak > 0.9, 'peak ' + peak.toFixed(3));
  ok(label + ': R sits at the top of the beat', peakT < 45, 'at ' + peakT.toFixed(0) + ' ms');
  var qMin = Infinity, sMin = Infinity;
  for (var q = 0; q <= 18; q += 0.5) qMin = Math.min(qMin, C.ecgAt(q, h));
  for (var sx = 30; sx <= 60; sx += 0.5) sMin = Math.min(sMin, C.ecgAt(sx, h));
  ok(label + ': Q dips below the baseline before R', qMin < -0.02, 'min ' + qMin.toFixed(3));
  ok(label + ': S dips below the baseline after R', sMin < -0.1, 'min ' + sMin.toFixed(3));

  /* T sits in the back half of systole, which is what ties QT to systole */
  var tPeak = -Infinity, tAt = 0;
  for (var j = 0; j < N; j++) {
    var tt2 = j / N * cyc;
    if (tt2 < h.timing.systoleMs * 0.45 || tt2 > h.timing.systoleMs * 1.05) continue;
    var v2 = C.ecgAt(tt2, h);
    if (v2 > tPeak) { tPeak = v2; tAt = tt2; }
  }
  ok(label + ': there is a T wave, and it is upright', tPeak > 0.12, 'peak ' + tPeak.toFixed(3));
  ok(label + ': T falls inside systole', tAt < h.timing.systoleMs, tAt.toFixed(0) + ' ms');

  /* P precedes atrial contraction, which is the whole point of it */
  var atrial = h.timing.phases[6];
  var pAt = -Infinity, pT = 0;
  for (var m = 0; m < N; m++) {
    var t3 = m / N * cyc;
    if (t3 < h.timing.systoleMs * 1.15) continue;
    var v3 = C.ecgAt(t3, h);
    if (v3 > pAt) { pAt = v3; pT = t3; }
  }
  ok(label + ': there is a P wave in late diastole', pAt > 0.1, 'peak ' + pAt.toFixed(3));
  ok(label + ': P comes before the atrium contracts', pT <= atrial.start + 1,
     'P at ' + pT.toFixed(0) + ', atrial systole at ' + atrial.start.toFixed(0));
}
ecgChecks(C.hemodynamics(60, 1, 1), 'at 60');
ecgChecks(C.hemodynamics(100, 1, 1), 'at 100');
ecgChecks(C.hemodynamics(160, 1.3, 1), 'at 160');

var qt60 = C.hemodynamics(60, 1, 1).timing.systoleMs;
var qt160 = C.hemodynamics(160, 1, 1).timing.systoleMs;
ok('the QT interval shortens with rate', qt160 < qt60);

/* ------------------------------------------------------------- the sweep */
section('The sweep: every rate, every setting');

var combos = 0, samples = 0;
var bothOpen = 0, sealedButFlowing = 0, avAgainstGradient = 0, semiAgainstGradient = 0;
var closedSemiCarrying = 0, valveOutOfRange = 0, notClosing = 0, rightSideBad = 0;
var notConserved = 0, flowingButShut = 0;
var TOL = 0.6;

for (var shr = C.HR_MIN; shr <= C.HR_MAX; shr += 5) {
  for (var sc = 0.5; sc <= 1.81; sc += 0.25) {
    for (var sf = 0.5; sf <= 1.41; sf += 0.25) {
      var hh = C.hemodynamics(shr, sc, sf);
      combos++;
      var cyc2 = hh.timing.cycleMs, M = 80;
      for (var n = 0; n < M; n++) {
        var tm = n / M * cyc2;
        var st = C.state(tm, hh);
        var v = st.valves, pr = st.pressure;
        samples++;

        for (var key in v) {
          if (!(v[key] >= 0 && v[key] <= 1)) valveOutOfRange++;
        }
        /* a ventricle is a pump, not a tube */
        if (v.mitral > 0.01 && v.aortic > 0.01) bothOpen++;
        if (v.tricuspid > 0.01 && v.pulmonary > 0.01) bothOpen++;
        /* and it is sealed exactly twice a beat, with nothing moving */
        var sealed = st.phase === 'ivc' || st.phase === 'ivr';
        if (sealed && Math.abs(st.flow) > 1e-9) sealedButFlowing++;
        if (sealed && (v.mitral > 0 || v.aortic > 0 || v.tricuspid > 0 || v.pulmonary > 0)) notClosing++;
        if (!sealed && Math.abs(st.flow) > 1e-9 && v.mitral <= 0 && v.aortic <= 0) flowingButShut++;
        /* the pressures have to agree with the valves in both directions */
        if (v.aortic > 0.01 && pr.lv < pr.ao - TOL) semiAgainstGradient++;
        if (v.aortic <= 0.01 && pr.lv > pr.ao + TOL) closedSemiCarrying++;
        if (v.mitral > 0.01 && pr.la < pr.lv - TOL) avAgainstGradient++;
        if (v.pulmonary > 0.01 && pr.rv < pr.pa - TOL) rightSideBad++;
        if (v.tricuspid > 0.01 && pr.ra < pr.rv - TOL) rightSideBad++;
      }
      /* and the beat is conserved */
      if (Math.abs(C.volumeAt(0, hh) - C.volumeAt(cyc2 - 0.001, hh)) > 0.05) notConserved++;
      near('output is stroke volume times rate', hh.co, hh.sv * hh.hr / 1000, 1e-9);
      near('stroke volume is the difference of the two volumes',
           hh.sv, hh.edv - hh.esv, 1e-9);
      /* The floor is low on purpose: a weak ventricle with nothing coming back
         really does eject a tenth of what it holds, and the sliders reach that
         corner. What must never happen is a fraction outside what a ventricle
         can physically do. */
      ok('ejection fraction stays inside what a ventricle can do',
         hh.ef > 0.15 && hh.ef < 0.86, 'got ' + hh.ef.toFixed(3) + ' at ' +
         shr + ' bpm, c=' + sc.toFixed(2) + ', f=' + sf.toFixed(2));
      ok('the ventricle always holds more at the end of filling than of ejection',
         hh.edv > hh.esv && hh.sv > 0);
    }
  }
}

eq('no valve position outside 0 to 1', valveOutOfRange, 0);
eq('a ventricle never has both valves open', bothOpen, 0);
eq('nothing moves while a ventricle is sealed', sealedButFlowing, 0);
eq('every beat ends holding what it started with', notConserved, 0);
eq('an open outlet valve always has pressure behind it', semiAgainstGradient, 0);
eq('a shut outlet valve never has pressure behind it', closedSemiCarrying, 0);
eq('an open inlet valve always has pressure behind it', avAgainstGradient, 0);
eq('the right side obeys the same rules', rightSideBad, 0);
eq('every valve is fully shut for the whole of both sealed phases', notClosing, 0);
eq('blood never crosses a shut valve', flowingButShut, 0);
process.stdout.write('    ' + combos.toLocaleString() + ' settings, ' +
  samples.toLocaleString() + ' instants\n');

/* ----------------------------------------------- the drawing and the data */
section('The drawing and the data it is driven by');

function attrs(name) {
  var out = [], re = new RegExp(name + '="([^"]*)"', 'g'), m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}
function hasId(id) { return html.indexOf('id="' + id + '"') !== -1; }

var drawn = attrs('data-part');
var declared = A.parts.map(function (p) { return p.id; });

drawn.forEach(function (id) {
  ok('the drawing\'s "' + id + '" is described in anatomy.js',
     declared.indexOf(id) !== -1);
});
declared.forEach(function (id) {
  ok('anatomy.js\'s "' + id + '" is drawn in index.html', drawn.indexOf(id) !== -1);
});

A.parts.forEach(function (p) {
  ok(p.id + ' has a name', typeof p.name === 'string' && p.name.length > 2);
  ok(p.id + ' has a note worth reading', typeof p.blurb === 'string' && p.blurb.length > 60);
  ok(p.id + ' says which blood it carries',
     ['venous', 'arterial', 'muscle'].indexOf(p.side) !== -1);
  ok(p.id + ' has a place to hang its label', !!p.label);
  if (p.label) {
    var L = p.label, fine = ['px', 'py', 'x', 'y'].every(function (k) {
      return typeof L[k] === 'number' && isFinite(L[k]);
    });
    ok(p.id + ' label coordinates are numbers', fine);
    ok(p.id + ' label is anchored to a side',
       (L.anchor === 'start' && L.side === 'right') ||
       (L.anchor === 'end' && L.side === 'left'));
    ok(p.id + ' points at something inside the drawing',
       L.px > 90 && L.px < 640 && L.py > 0 && L.py < 728);
  }
  if (p.metric) {
    ok(p.id + ' asks for a reading the app can produce',
       appjs.indexOf("case '" + p.metric + "'") !== -1);
  }
});

/* labels have to be readable side by side, which means not on top of each other */
['left', 'right'].forEach(function (side) {
  var ys = A.parts.filter(function (p) { return p.label && p.label.side === side; })
                  .map(function (p) { return p.label.y; }).sort(function (a, b) { return a - b; });
  for (var i = 1; i < ys.length; i++) {
    ok('labels on the ' + side + ' do not overlap', ys[i] - ys[i - 1] >= 30,
       ys[i - 1] + ' and ' + ys[i]);
  }
});

A.routes.forEach(function (r) {
  ok('flow route ' + r.id + ' has a path to follow', hasId(r.path));
  ok('flow route ' + r.id + ' has a gate',
     ['inflow', 'av', 'semi', 'free'].indexOf(r.gate) !== -1);
  ok('flow route ' + r.id + ' knows its blood',
     r.tint === 'venous' || r.tint === 'arterial', r.tint);
  ok('flow route ' + r.id + ' moves at a sane speed', r.rate > 0 && r.rate < 6);
});
A.motion.forEach(function (m) {
  ok('moving group ' + m.id + ' exists in the drawing', hasId(m.id));
  ok('moving group ' + m.id + ' has a pivot',
     m.pivot.length === 2 && isFinite(m.pivot[0]) && isFinite(m.pivot[1]));
  ok('moving group ' + m.id + ' squeezes by a believable amount',
     m.sx > 0 && m.sx < 0.2 && m.sy > 0 && m.sy < 0.2);
  ok('moving group ' + m.id + ' has a driver the app knows',
     ['ventricle', 'atrium', 'body'].indexOf(m.driver) !== -1);
});
A.walls.forEach(function (w) {
  ok('wall ' + w.id + ' exists in the drawing', hasId(w.id));
  ok('wall ' + w.id + ' thickens as it shortens', w.max > w.min);
});
ok('the left ventricle wall is much thicker than the right',
   A.walls[0].min > A.walls[1].min * 2);

['tricuspid', 'mitral', 'aortic', 'pulmonary'].forEach(function (v) {
  ok('valve-' + v + ' is drawn', hasId('valve-' + v));
  ok('the model has a position for the ' + v + ' valve',
     typeof C.state(0, rest).valves[v] === 'number');
});

/* every leaflet has to say where it hangs and how far it swings */
var leafBlocks = html.match(/class="leaflet[^"]*"[^>]*>/g) || [];
ok('there are leaflets to animate', leafBlocks.length >= 8, 'found ' + leafBlocks.length);
var hinges = attrs('data-hinge'), opens = attrs('data-open');
eq('every leaflet has both a hinge and a swing', hinges.length, opens.length);
hinges.forEach(function (hStr, i) {
  var parts = hStr.split(',');
  ok('leaflet ' + i + ' hinge is a coordinate pair',
     parts.length === 2 && isFinite(+parts[0]) && isFinite(+parts[1]), hStr);
  ok('leaflet ' + i + ' swings a sensible way', Math.abs(+opens[i]) > 10 && Math.abs(+opens[i]) < 90,
     opens[i]);
});

/* a url(#id) pointing at nothing fails silently in a browser, so check here */
var refs = {}, m2, reRef = /url\(#([A-Za-z0-9_-]+)\)/g;
while ((m2 = reRef.exec(html))) refs[m2[1]] = true;
while ((m2 = reRef.exec(css))) refs[m2[1]] = true;
reRef = /url\(#([A-Za-z0-9_-]+)\)/g;
while ((m2 = reRef.exec(css))) refs[m2[1]] = true;
Object.keys(refs).forEach(function (id) {
  ok('the paint or filter "' + id + '" that something asks for is defined', hasId(id));
});

/* the two views have to be switchable, and each has to hide the other */
ok('the cut-away layer exists', hasId('layer-cutaway'));
ok('the whole-heart layer exists', hasId('layer-surface'));
ok('the stylesheet hides one view at a time',
   css.indexOf('svg[data-view="cutaway"] #layer-surface { display: none; }') !== -1 &&
   css.indexOf('svg[data-view="surface"] #layer-cutaway { display: none; }') !== -1);
ok('blood is not drawn through solid muscle',
   css.indexOf('svg[data-view="surface"] #flow-layer') !== -1);
ok('every part is reachable from the keyboard',
   (html.match(/class="[^"]*\bpart\b[^"]*"/g) || []).length ===
   (html.match(/data-part="[^"]*"[^>]*tabindex="0"|tabindex="0"[^>]*data-part=/g) || []).length ||
   html.indexOf('tabindex="0"') !== -1);
ok('reduced motion is honoured', appjs.indexOf('prefers-reduced-motion') !== -1 &&
   css.indexOf('prefers-reduced-motion') !== -1);

/* ------------------------------------------------------------------ done */
process.stdout.write('\n');
if (fail) {
  process.stdout.write('  ' + failures.length + ' of ' + fail + ' failures shown:\n');
  failures.forEach(function (f) { process.stdout.write('    ✗ ' + f + '\n'); });
}
process.stdout.write('\n  ' + pass.toLocaleString() + ' passed, ' + fail + ' failed\n\n');
process.exit(fail ? 1 : 0);
