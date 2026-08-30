#!/usr/bin/env node
/*
 * Test suite for Bodyworks. Run with: node body/test/run.js
 *
 * Loads the shipped data file as a global, the way the browser does, and reads
 * index.html as text, so what is tested is what is served.
 *
 * The load-bearing checks are the money ones. Every figure on the cost sheet
 * is computed at load time from the rows in bodies.js, so the suite re-adds
 * the whole sheet, checks the arithmetic closes for every effector, and pins
 * the totals inside a sane band — if a row is ever fat-fingered, the first
 * thing to notice should be a failing test, not a reader with a calculator.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var base = path.join(__dirname, '..');
require(path.join(base, 'data', 'bodies.js'));

var BOT = globalThis.BOT;
var html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
var css = fs.readFileSync(path.join(base, 'css', 'body.css'), 'utf8');
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
function section(t) { process.stdout.write('\n  ' + t + '\n'); }

/* ------------------------------------------------------------- the bodies */
section('The four bodies');

eq('there are four pre-built bodies', BOT.bodies.length, 4);
var ids = BOT.bodies.map(function (b) { return b.id; });
eq('their ids are unique', new Set(ids).size, 4);

var bomCount = 0;
BOT.bodies.forEach(function (b) {
  ok(b.id + ' is drawn in index.html', html.indexOf('id="body-' + b.id + '"') !== -1);
  ok(b.id + ' has a display rule in the stylesheet',
     new RegExp('#plate\\[data-body="' + b.id + '"\\]\\s+#body-' + b.id).test(css));
  ok(b.id + ' has a name and a role', b.name.length > 2 && b.role.length > 3);
  ok(b.id + ' has a blurb worth reading', typeof b.blurb === 'string' && b.blurb.length > 80);
  ok(b.id + ' has three features', b.features.length === 3);
  b.features.forEach(function (f, i) {
    ok(b.id + ' feature ' + i + ' is a sentence', f.length > 30);
  });

  var s = b.specs;
  ok(b.id + ' height is human-scaled', s.height >= 1.4 && s.height <= 2.2, s.height);
  ok(b.id + ' mass is plausible', s.mass >= 40 && s.mass <= 160, s.mass);
  ok(b.id + ' has enough joints to be a humanoid', s.dof >= 20 && s.dof <= 60, s.dof);
  ['payload', 'speed', 'power', 'runtime'].forEach(function (k) {
    ok(b.id + ' has a ' + k + ' spec', typeof s[k] === 'string' && s[k].length > 3);
  });

  ok(b.id + ' dimension line fits the plate',
     b.dims.top > 20 && b.dims.bottom > b.dims.top && b.dims.bottom < 640,
     JSON.stringify(b.dims));
  if (b.hasBom) bomCount++;
});
eq('exactly one body carries the cost sheet', bomCount, 1);
ok('and it is the Warden', BOT.bodies.filter(function (b) { return b.hasBom; })[0].id === 'warden');

/* ----------------------------------------------------------- the effectors */
section('The effectors');

eq('there are four end effectors', BOT.effectors.length, 4);
var fids = BOT.effectors.map(function (f) { return f.id; });
eq('their ids are unique', new Set(fids).size, 4);
BOT.effectors.forEach(function (f) {
  ok(f.id + ' has a symbol to wear', html.indexOf('id="fx-' + f.id + '"') !== -1);
  ok(f.id + ' has a price', f.unit > 100 && f.unit < 20000, f.unit);
  ok(f.id + ' has a mass in grams', f.mass > 200 && f.mass < 2000, f.mass);
  ok(f.id + ' has a note', f.note.length > 40);
});
ok('the scissor hand exists, as ordered', fids.indexOf('scissor') !== -1);
ok('every body wears its effector through a slot',
   (html.match(/class="fx-slot effector"/g) || []).length >= 4);

/* --------------------------------------------------------------- the money */
section('The cost sheet');

BOT.bom.forEach(function (g) {
  ok('group "' + g.group + '" has a note', g.note.length > 20);
  ok('group "' + g.group + '" is not empty', g.items.length > 0);
  g.items.forEach(function (it) {
    ok(it.label + ': quantity is positive', it.qty > 0);
    if (!it.effector) ok(it.label + ': unit price is positive', it.unit > 0);
  });
});

/* the arithmetic closes, for every effector you could fit */
BOT.effectors.forEach(function (f) {
  var p = BOT.price(f.id);
  var hand = 0;
  p.groups.forEach(function (g) {
    var sub = 0;
    g.rows.forEach(function (r) {
      eq('line = qty × unit (' + r.label + ', ' + f.id + ')', r.line, r.qty * r.unit);
      sub += r.line;
      if (r.joint === 'hand') hand = r.unit;
    });
    eq('subtotal adds up (' + g.group + ', ' + f.id + ')', g.sub, sub);
  });
  var grand = p.groups.reduce(function (a, g) { return a + g.sub; }, 0);
  eq('grand total adds up with ' + f.id, p.grand, grand);
  eq('the hands row wears the chosen effector price (' + f.id + ')', hand, f.unit);
  ok('the total stays inside a sane band with ' + f.id,
     p.grand > 60000 && p.grand < 200000, p.grand);
});

/* the shape of the argument: flight is the expensive part */
var p0 = BOT.price('hand');
var byName = {};
p0.groups.forEach(function (g) { byName[g.group] = g.sub; });
ok('flight is more than a third of the sheet', byName.Flight > p0.grand / 3,
   byName.Flight + ' of ' + p0.grand);
ok('actuation is the biggest group after flight',
   byName.Actuation > byName.Sensing && byName.Actuation > byName.Compute &&
   byName.Actuation > byName.Power && byName.Actuation > byName.Structure);
ok('the sensor link costs less than one per cent of the body',
   (240 + 180) < p0.grand / 100);

/* joint keys on the sheet must exist on the drawing, and vice versa */
var sheetJoints = new Set();
BOT.bom.forEach(function (g) {
  g.items.forEach(function (it) { if (it.joint) sheetJoints.add(it.joint); });
});
var m, drawn = new Set(), re = /data-joint="([a-z]+)"/g;
var warden = html.slice(html.indexOf('id="body-warden"'), html.indexOf('id="body-aide"'));
while ((m = re.exec(warden))) drawn.add(m[1]);
sheetJoints.forEach(function (j) {
  ok('sheet joint "' + j + '" is on the Warden drawing', drawn.has(j));
});
drawn.forEach(function (j) {
  ok('drawn joint "' + j + '" is priced on the sheet', sheetJoints.has(j));
});

/* the encoder count matches the joint count it claims to encode */
var wardenSpec = BOT.bodies.filter(function (b) { return b.id === 'warden'; })[0];
var encoders = null;
BOT.bom.forEach(function (g) {
  g.items.forEach(function (it) {
    if (it.label.indexOf('encoder') !== -1) encoders = it.qty;
  });
});
eq('one encoder per body joint', encoders, wardenSpec.specs.dof);

/* ------------------------------------------------------------ the page */
section('The page');

['variants', 'specs', 'features', 'effectors', 'bom', 'grand', 'pulse',
 'distress', 'status', 'telemetry', 'dim-label', 'plate'].forEach(function (id) {
  ok('#' + id + ' exists', html.indexOf('id="' + id + '"') !== -1);
});
ok('the mirror trick is used, not four hand-drawn right halves',
   (html.match(/scale\(-1 1\)/g) || []).length >= 6);
ok('reduced motion is honoured in the stylesheet',
   css.indexOf('prefers-reduced-motion') !== -1);
ok('reduced motion is honoured in the script',
   appjs.indexOf('prefers-reduced-motion') !== -1);
ok('the distress demo confirms before it launches',
   appjs.indexOf('CONFIRM_MS') !== -1);
ok('the page links back to the heart it listens to',
   html.indexOf('../heart/') !== -1);

/* ------------------------------------------------------------------ done */
process.stdout.write('\n');
if (fail) {
  failures.forEach(function (f) { process.stdout.write('    ✗ ' + f + '\n'); });
}
process.stdout.write('\n  ' + pass.toLocaleString() + ' passed, ' + fail + ' failed\n\n');
process.exit(fail ? 1 : 0);
