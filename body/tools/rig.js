/*
 * rig.js — draws the four bodies and prints them as SVG.
 *
 * One rig, four specs. Every body is the same set of parts in the same
 * order — helmet, neck, chest, abdomen, pelvis, one arm, one leg — sized by
 * the numbers in its spec and mirrored for the right side with a single
 * transform. Run it and paste the output between the markers in index.html:
 *
 *     node body/tools/rig.js > /tmp/bodies.svg
 *
 * The Warden's parts carry data-joint keys because it is the body that gets
 * priced; hovering a row on the cost sheet lights the part it pays for.
 */
'use strict';

var CX = 180;                      /* the plate's centre line */
var MIRROR = 'transform="translate(360 0) scale(-1 1)"';

function r(n) { return Math.round(n * 10) / 10; }
function P() { return Array.prototype.slice.call(arguments).map(r).join(' '); }
function attr(joint, title) {
  return joint ? ' data-joint="' + joint + '"' : '';
}
function titled(joint, title) {
  return joint && title ? '<title>' + title + '</title>' : '';
}

/* an actuator: outer ring, inner hub, a little bolt circle */
function actuator(x, y, rad, joint, title, cls) {
  var s = '<g class="act' + (cls ? ' ' + cls : '') + '"' + attr(joint) + '>';
  s += titled(joint, title);
  s += '<circle cx="' + r(x) + '" cy="' + r(y) + '" r="' + r(rad) + '" class="joint"/>';
  s += '<circle cx="' + r(x) + '" cy="' + r(y) + '" r="' + r(rad * 0.42) + '" class="hub"/>';
  return s + '</g>';
}

/* a tapered limb shell between two joints: wide at the top, rounded ends */
function shell(x, y0, y1, w0, w1, cls, extra) {
  var a = w0 / 2, b = w1 / 2, k = Math.min(8, b);
  var d = 'M' + P(x - a, y0 + 6) +
    ' Q' + P(x - a, y0, x - a + 6, y0) + ' L' + P(x + a - 6, y0) +
    ' Q' + P(x + a, y0, x + a, y0 + 6) +
    ' L' + P(x + b, y1 - k) + ' Q' + P(x + b, y1, x + b - k, y1) +
    ' L' + P(x - b + k, y1) + ' Q' + P(x - b, y1, x - b, y1 - k) + ' Z';
  return '<path d="' + d + '" class="' + cls + '"' + (extra || '') + '/>';
}

/* a panel line down a limb, offset to the lit side */
function seam(x, y0, y1, dx) {
  return '<path d="M' + P(x + dx, y0) + ' L' + P(x + dx * 0.85, y1) + '" class="hair"/>';
}

function vents(x, y, n, w, gap) {
  var s = '';
  for (var i = 0; i < n; i++) s += 'M' + P(x - w / 2, y + i * gap) + ' L' + P(x + w / 2, y + i * gap) + ' ';
  return '<path d="' + s.trim() + '" class="hair"/>';
}

/* ------------------------------------------------------------- the rig */

function body(S) {
  var o = [];
  var W = S.warden;                            /* only the Warden is priced */
  var J = function (k) { return W ? k : null; };
  var T = {
    neck: 'Neck — 2 DoF', shoulder: 'Shoulder — 3 DoF', elbow: 'Elbow — 1 DoF',
    wrist: 'Wrist — 2 DoF', waist: 'Waist — 3 DoF', hip: 'Hip — 3 DoF',
    knee: 'Knee — 1 DoF', ankle: 'Ankle — 2 DoF'
  };

  S.shoulderX = S.chestW / 2 + S.armW * 0.5 + 3;
  o.push('<g id="body-' + S.id + '" class="bod">');

  /* ground shadow */
  o.push('<ellipse cx="180" cy="596" rx="' + r(S.hipX + S.footW) + '" ry="5" class="ground"/>');

  /* things behind the frame come first */
  if (S.wings) {
    o.push('<g id="' + S.id[0] + '-wing-l">' +
      '<path d="M' + P(CX - 30, S.chestTop + 16) + ' C' + P(CX - 80, S.chestTop + 30, CX - 116, S.chestTop + 78, CX - 124, S.chestTop + 134) +
      ' C' + P(CX - 92, S.chestTop + 112, CX - 56, S.chestTop + 74, CX - 30, S.chestTop + 48) + ' Z" class="plate"/>' +
      '<path d="M' + P(CX - 42, S.chestTop + 30) + ' C' + P(CX - 76, S.chestTop + 50, CX - 98, S.chestTop + 82, CX - 110, S.chestTop + 116) + '" class="hair"/>' +
      '</g><use href="#' + S.id[0] + '-wing-l" ' + MIRROR + '/>');
  }
  if (S.jets) {
    var jx = CX - S.shoulderX - 42, jy = S.chestTop + 8;
    o.push('<g class="jets" data-joint="jet"><title>Microturbines — 4</title><g id="w-jet-l">' +
      '<path d="M' + P(jx, jy + 8) + ' Q' + P(jx, jy, jx + 8, jy) + ' L' + P(jx + 16, jy) + ' Q' + P(jx + 24, jy, jx + 24, jy + 8) +
      ' L' + P(jx + 24, jy + 56) + ' L' + P(jx + 28, jy + 74) + ' L' + P(jx - 4, jy + 74) + ' L' + P(jx, jy + 56) + ' Z" class="dark"/>' +
      '<path d="M' + P(jx + 2, jy + 74) + ' L' + P(jx + 22, jy + 74) + ' L' + P(jx + 19, jy + 82) + ' L' + P(jx + 5, jy + 82) + ' Z" class="nozzle"/>' +
      vents(jx + 12, jy + 12, 4, 14, 5) +
      '<path d="M' + P(jx + 24, jy + 22) + ' L' + P(CX - S.shoulderX - 8, jy + 18) + ' M' + P(jx + 24, jy + 46) + ' L' + P(CX - S.shoulderX - 8, jy + 50) + '" class="strut"/>' +
      /* pelvic pair: outboard of the hips, clear of the forearms */
      (function(){ var px = CX - S.pelvisW / 2 - 4, pt = S.pelvisTop + 4; return '' +
      '<path d="M' + P(px - 18, pt + 6) + ' Q' + P(px - 18, pt, px - 12, pt) + ' L' + P(px - 6, pt) +
      ' Q' + P(px, pt, px, pt + 6) + ' L' + P(px, pt + 40) + ' L' + P(px + 3, pt + 52) + ' L' + P(px - 21, pt + 52) + ' L' + P(px - 18, pt + 40) + ' Z" class="dark"/>' +
      '<path d="M' + P(px - 17, pt + 52) + ' L' + P(px - 1, pt + 52) + ' L' + P(px - 3, pt + 58) + ' L' + P(px - 15, pt + 58) + ' Z" class="nozzle"/>' +
      vents(px - 9, pt + 8, 3, 10, 5) +
      '<path d="M' + P(px, pt + 14) + ' L' + P(px + 10, pt + 12) + ' M' + P(px, pt + 34) + ' L' + P(px + 10, pt + 36) + '" class="strut"/>'; })() +
      '</g><use href="#w-jet-l" ' + MIRROR + '/></g>');
  }
  if (S.legJets) {
    var lx = CX - S.hipX - 4, ly = S.hipY + 16;
    o.push('<g class="jets">' +
      '<path d="M' + P(lx - 6, ly) + ' L' + P(lx + 6, ly) + ' L' + P(lx + 8, ly + 34) + ' L' + P(lx - 8, ly + 34) + ' Z" class="dark"/>' +
      '<path d="M' + P(lx + 2 * (S.hipX + 4) - 6, ly) + ' L' + P(lx + 2 * (S.hipX + 4) + 6, ly) + ' L' + P(lx + 2 * (S.hipX + 4) + 8, ly + 34) + ' L' + P(lx + 2 * (S.hipX + 4) - 8, ly + 34) + ' Z" class="dark"/>' +
      '<path d="M' + P(lx - 7, ly + 34) + ' L' + P(lx + 7, ly + 34) + ' L' + P(lx + 5, ly + 40) + ' L' + P(lx - 5, ly + 40) + ' Z M' + P(lx + 2 * (S.hipX + 4) - 7, ly + 34) + ' L' + P(lx + 2 * (S.hipX + 4) + 7, ly + 34) + ' L' + P(lx + 2 * (S.hipX + 4) + 5, ly + 40) + ' L' + P(lx + 2 * (S.hipX + 4) - 5, ly + 40) + ' Z" class="nozzle"/>' +
      '</g>');
  }

  /* ---- head ---- */
  var hw = S.headW / 2, ht = S.headTop, hb = S.headTop + S.headH;
  var crown = S.headR;
  if (S.cage) {
    o.push('<path d="M' + P(CX - hw - 8, ht + 26) + ' C' + P(CX - hw - 4, ht - 16, CX + hw + 4, ht - 16, CX + hw + 8, ht + 26) + '" class="cage"/>' +
      '<path d="M' + P(CX - hw - 8, ht + 26) + ' L' + P(CX - hw - 8, ht + 40) + ' M' + P(CX + hw + 8, ht + 26) + ' L' + P(CX + hw + 8, ht + 40) + '" class="cage"/>');
  }
  /* ear pods behind the helmet */
  o.push('<g id="' + S.id[0] + '-ear-l"><rect x="' + r(CX - hw - 7) + '" y="' + r(ht + S.headH * 0.36) + '" width="9" height="' + r(S.headH * 0.34) + '" rx="3.5" class="plate"/>' +
    '<circle cx="' + r(CX - hw - 2.5) + '" cy="' + r(ht + S.headH * 0.53) + '" r="1.6" class="dot"/></g>' +
    '<use href="#' + S.id[0] + '-ear-l" ' + MIRROR + '/>');
  /* helmet: domed crown, slight jaw taper, chin cut */
  var jaw = hw - S.jawIn;
  o.push('<path d="M' + P(CX - hw, ht + crown) + ' C' + P(CX - hw, ht, CX + hw, ht, CX + hw, ht + crown) +
    ' L' + P(CX + hw, hb - 22) + ' Q' + P(CX + hw, hb - 8, CX + jaw, hb - 4) +
    ' L' + P(CX + 14, hb) + ' L' + P(CX - 14, hb) + ' L' + P(CX - jaw, hb - 4) +
    ' Q' + P(CX - hw, hb - 8, CX - hw, hb - 22) + ' Z" class="shell head"/>');
  /* brow ridge */
  o.push('<path d="M' + P(CX - hw + 6, ht + S.visorY - 6) + ' Q' + P(CX, ht + S.visorY - 12, CX + hw - 6, ht + S.visorY - 6) + '" class="hair"/>');
  /* visor */
  if (S.eyes === 'band') {
    o.push('<path d="M' + P(CX - hw + 7, ht + S.visorY) + ' L' + P(CX + hw - 7, ht + S.visorY) +
      ' Q' + P(CX + hw - 4, ht + S.visorY, CX + hw - 5, ht + S.visorY + 3) +
      ' L' + P(CX + hw - 8, ht + S.visorY + 13) + ' Q' + P(CX + hw - 9, ht + S.visorY + 15, CX + hw - 11, ht + S.visorY + 15) +
      ' L' + P(CX - hw + 11, ht + S.visorY + 15) + ' Q' + P(CX - hw + 9, ht + S.visorY + 15, CX - hw + 8, ht + S.visorY + 13) +
      ' L' + P(CX - hw + 5, ht + S.visorY + 3) + ' Q' + P(CX - hw + 4, ht + S.visorY, CX - hw + 7, ht + S.visorY) + ' Z" class="visor"/>' +
      '<path d="M' + P(CX - hw + 12, ht + S.visorY + 4) + ' L' + P(CX + hw - 20, ht + S.visorY + 4) + '" class="glint"/>');
  } else if (S.eyes === 'lens') {
    o.push('<circle cx="180" cy="' + r(ht + S.visorY + 8) + '" r="11" class="visor"/>' +
      '<circle cx="180" cy="' + r(ht + S.visorY + 8) + '" r="5" class="lens"/>' +
      '<path d="M' + P(CX - 6, ht + S.visorY + 2) + ' Q' + P(CX - 2, ht + S.visorY - 1, CX + 2, ht + S.visorY + 1) + '" class="glint"/>');
  } else {                                     /* two eyes */
    o.push('<circle cx="' + r(CX - 11) + '" cy="' + r(ht + S.visorY + 7) + '" r="5" class="visor"/>' +
      '<circle cx="' + r(CX + 11) + '" cy="' + r(ht + S.visorY + 7) + '" r="5" class="visor"/>' +
      '<circle cx="' + r(CX - 12.5) + '" cy="' + r(ht + S.visorY + 5.5) + '" r="1.5" class="glint-dot"/>' +
      '<circle cx="' + r(CX + 9.5) + '" cy="' + r(ht + S.visorY + 5.5) + '" r="1.5" class="glint-dot"/>');
  }
  /* chin vents */
  o.push(vents(CX, hb - 14, 2, 22, 4));

  /* ---- neck ---- */
  var ny = hb, collarY = S.chestTop - 4;
  o.push('<rect x="' + r(CX - 9) + '" y="' + r(ny) + '" width="18" height="' + r(collarY - ny + 4) + '" rx="3" class="dark"/>');
  o.push(actuator(CX, ny + (collarY - ny) * 0.55, 5.5, J('neck'), T.neck));
  o.push('<path d="M' + P(CX - 26, collarY) + ' Q' + P(CX, collarY + 10, CX + 26, collarY) + '" class="collar"/>');

  /* ---- chest ---- */
  var ct = S.chestTop, cw = S.chestW / 2;
  var sx = S.shoulderX = cw + S.armW * 0.5 + 3;   /* the arm hangs clear of the chest */
  var pecB = ct + S.chestH;                    /* bottom of the pectoral plates */
  /* backplate behind the pecs so the seam reads as a seam */
  o.push('<path d="M' + P(CX - cw - 6, ct + 10) + ' Q' + P(CX - cw - 6, ct - 2, CX - cw + 6, ct - 2) + ' L' + P(CX + cw - 6, ct - 2) +
    ' Q' + P(CX + cw + 6, ct - 2, CX + cw + 6, ct + 10) + ' L' + P(CX + cw, pecB + 6) + ' L' + P(CX - cw, pecB + 6) + ' Z" class="dark"/>');
  /* pectoral plate, left, mirrored */
  o.push('<g id="' + S.id[0] + '-pec-l"><path d="M' + P(CX - 2, ct + 4) + ' L' + P(CX - cw + 6, ct + 4) +
    ' Q' + P(CX - cw - 4, ct + 4, CX - cw - 4, ct + 14) + ' L' + P(CX - cw - 2, pecB - 14) +
    ' Q' + P(CX - cw - 2, pecB, CX - cw + 12, pecB) + ' L' + P(CX - 10, pecB) +
    ' Q' + P(CX - 2, pecB, CX - 2, pecB - 8) + ' Z" class="shell"/>' +
    '<path d="M' + P(CX - cw + 2, ct + 20) + ' L' + P(CX - cw + 4, pecB - 16) + '" class="hair"/>' +
    vents(CX - cw + 22, pecB - 26, 3, 18, 5) +
    '</g><use href="#' + S.id[0] + '-pec-l" ' + MIRROR + '/>');
  /* core */
  var coreY = ct + S.chestH * 0.52;
  if (S.core === 'reactor') {
    o.push('<circle cx="180" cy="' + r(coreY) + '" r="15" class="core"/>' +
      '<circle cx="180" cy="' + r(coreY) + '" r="8.5" class="core-in"/>' +
      '<path d="M180 ' + r(coreY - 15) + ' L180 ' + r(coreY - 9) + ' M180 ' + r(coreY + 9) + ' L180 ' + r(coreY + 15) +
      ' M' + P(CX - 15, coreY) + ' L' + P(CX - 9, coreY) + ' M' + P(CX + 9, coreY) + ' L' + P(CX + 15, coreY) + '" class="core-tick"/>');
  } else if (S.core === 'soft') {
    o.push('<rect x="' + r(CX - 16) + '" y="' + r(coreY - 20) + '" width="32" height="40" rx="12" class="core soft"/>' +
      '<circle cx="180" cy="' + r(coreY) + '" r="6" class="core-in"/>');
  } else if (S.core === 'chevron') {
    var cy0 = coreY - 12;
    o.push('<path d="M' + P(CX - 34, cy0) + ' L' + P(CX - 14, cy0) + ' L' + P(CX - 26, cy0 + 18) + ' L' + P(CX - 46, cy0 + 18) + ' Z' +
      ' M' + P(CX - 10, cy0) + ' L' + P(CX + 10, cy0) + ' L' + P(CX - 2, cy0 + 18) + ' L' + P(CX - 22, cy0 + 18) + ' Z' +
      ' M' + P(CX + 14, cy0) + ' L' + P(CX + 34, cy0) + ' L' + P(CX + 22, cy0 + 18) + ' L' + P(CX + 2, cy0 + 18) + ' Z" class="chevron"/>');
  }

  /* ---- abdomen: stacked plates narrowing to the waist ---- */
  var ay = pecB + 6, aw = cw - 4, ww = S.waistW / 2, n = 3, step = (S.pelvisTop - 10 - ay) / n;
  for (var i = 0; i < n; i++) {
    var t0 = i / n, t1 = (i + 1) / n;
    var w0 = aw + (ww - aw) * t0, w1 = aw + (ww - aw) * t1;
    var y0 = ay + i * step, y1 = y0 + step - 3;
    o.push('<path d="M' + P(CX - w0, y0) + ' L' + P(CX + w0, y0) + ' L' + P(CX + w1, y1) + ' Q' + P(CX + w1, y1 + 2, CX + w1 - 3, y1 + 2) +
      ' L' + P(CX - w1 + 3, y1 + 2) + ' Q' + P(CX - w1, y1 + 2, CX - w1, y1) + ' Z" class="plate"/>');
  }
  /* waist ring */
  var wy = S.pelvisTop - 8;
  o.push('<rect x="' + r(CX - ww - 4) + '" y="' + r(wy - 6) + '" width="' + r(ww * 2 + 8) + '" height="12" rx="6" class="ring"/>');
  o.push(actuator(CX, wy, 5.5, J('waist'), T.waist));

  /* ---- pelvis ---- */
  var pt = S.pelvisTop, pw = S.pelvisW / 2, hx = CX - S.hipX, hy = S.hipY;
  o.push('<path d="M' + P(CX - pw, pt) + ' L' + P(CX + pw, pt) + ' Q' + P(CX + pw + 4, pt, CX + pw + 3, pt + 6) +
    ' L' + P(CX + pw - 4, hy + 8) + ' L' + P(CX + 16, hy + 8) + ' L' + P(CX, hy + 20) + ' L' + P(CX - 16, hy + 8) +
    ' L' + P(CX - pw + 4, hy + 8) + ' L' + P(CX - pw - 3, pt + 6) + ' Q' + P(CX - pw - 4, pt, CX - pw, pt) + ' Z" class="shell"/>');
  o.push('<path d="M' + P(CX - pw + 12, pt + 8) + ' L' + P(CX + pw - 12, pt + 8) + '" class="hair"/>');

  /* ---- shoulder pauldrons (over the arm, drawn after the arm) ---- */

  /* ---- arm, left, mirrored ---- */
  var ax = CX - sx, ay0 = S.shoulderY, el = ay0 + S.upperArm, wr = el + S.lowerArm;
  var a = '<g id="' + S.id[0] + '-arm-l">';
  a += shell(ax, ay0 + 4, el - 8, S.armW, S.armW * 0.82, 'limb');
  a += seam(ax, ay0 + 14, el - 16, -S.armW * 0.22);
  a += '<rect x="' + r(ax - S.armW * 0.34) + '" y="' + r(ay0 + S.upperArm * 0.34) + '" width="' + r(S.armW * 0.68) + '" height="' + r(S.upperArm * 0.28) + '" rx="3" class="plate"/>';
  a += actuator(ax, el, 6.5, J('elbow'), T.elbow);
  a += shell(ax, el + 8, wr - 6, S.armW * 0.86, S.armW * 0.66, 'limb');
  a += seam(ax, el + 16, wr - 12, -S.armW * 0.18);
  a += vents(ax, el + 22, 3, S.armW * 0.42, 5);
  a += '<rect x="' + r(ax - S.armW * 0.36) + '" y="' + r(wr - 8) + '" width="' + r(S.armW * 0.72) + '" height="8" rx="3" class="ring"/>';
  a += actuator(ax, wr + 3, 4.5, J('wrist'), T.wrist);
  a += '<use href="#fx-' + S.fx + '" class="fx-slot effector" x="' + r(ax) + '" y="' + r(wr + 7) + '"' + (W ? ' data-joint="hand"' : '') + '/>';
  /* pauldron */
  a += '<path d="M' + P(ax - S.armW * 0.62 - 6, ay0 + 10) + ' Q' + P(ax - S.armW * 0.62 - 6, ay0 - 16, ax + 6, ay0 - 16) +
    ' L' + P(ax + S.armW * 0.5 + 18, ay0 - 16) + ' Q' + P(ax + S.armW * 0.5 + 26, ay0 - 16, ax + S.armW * 0.5 + 26, ay0 - 8) + ' L' + P(ax + S.armW * 0.5 + 24, ay0 + 2) +
    ' Q' + P(ax + S.armW * 0.5 + 22, ay0 + 12, ax + S.armW * 0.3, ay0 + 12) + ' L' + P(ax - S.armW * 0.62 + 2, ay0 + 12) +
    ' Q' + P(ax - S.armW * 0.62 - 6, ay0 + 12, ax - S.armW * 0.62 - 6, ay0 + 10) + ' Z" class="pauldron"/>';
  a += '<path d="M' + P(ax - S.armW * 0.5, ay0 - 6) + ' L' + P(ax + S.armW * 0.5 + 14, ay0 - 6) + '" class="hair"/>';
  a += actuator(ax, ay0, 7, J('shoulder'), T.shoulder);
  a += '</g>';
  o.push(a + '<use href="#' + S.id[0] + '-arm-l" ' + MIRROR + '/>');

  /* ---- leg, left, mirrored ---- */
  var kn = hy + S.upperLeg, an = kn + S.lowerLeg;
  var l = '<g id="' + S.id[0] + '-leg-l">';
  l += shell(hx, hy + 6, kn - 8, S.legW, S.legW * 0.84, 'limb');
  l += seam(hx, hy + 18, kn - 18, -S.legW * 0.24);
  l += '<rect x="' + r(hx - S.legW * 0.32) + '" y="' + r(hy + S.upperLeg * 0.3) + '" width="' + r(S.legW * 0.64) + '" height="' + r(S.upperLeg * 0.3) + '" rx="3" class="plate"/>';
  /* knee cap */
  l += '<path d="M' + P(hx - S.legW * 0.42, kn - 14) + ' Q' + P(hx, kn - 24, hx + S.legW * 0.42, kn - 14) +
    ' L' + P(hx + S.legW * 0.4, kn + 8) + ' Q' + P(hx, kn + 16, hx - S.legW * 0.4, kn + 8) + ' Z" class="pauldron"/>';
  l += actuator(hx, kn, 6.5, J('knee'), T.knee);
  l += shell(hx, kn + 12, an - 8, S.legW * 0.9, S.legW * 0.7, 'limb');
  l += seam(hx, kn + 22, an - 16, -S.legW * 0.2);
  l += '<path d="M' + P(hx + S.legW * 0.42, kn + 24) + ' Q' + P(hx + S.legW * 0.56, kn + 44, hx + S.legW * 0.36, an - 20) + '" class="hair"/>';
  l += '<rect x="' + r(hx - S.legW * 0.38) + '" y="' + r(an - 10) + '" width="' + r(S.legW * 0.76) + '" height="9" rx="3" class="ring"/>';
  l += actuator(hx, an + 2, 5, J('ankle'), T.ankle);
  /* boot */
  var fw = S.footW;
  l += '<path d="M' + P(hx - fw * 0.42, an + 8) + ' L' + P(hx + fw * 0.42, an + 8) + ' L' + P(hx + fw * 0.5, 588) +
    ' Q' + P(hx + fw * 0.5, 594, hx + fw * 0.44, 594) + ' L' + P(hx - fw * 0.44, 594) +
    ' Q' + P(hx - fw * 0.5, 594, hx - fw * 0.5, 588) + ' Z" class="shell"/>';
  l += '<path d="M' + P(hx - fw * 0.44, 586) + ' L' + P(hx + fw * 0.44, 586) + '" class="hair"/>';
  l += '<path d="M' + P(hx - fw * 0.1, an + 8) + ' L' + P(hx - fw * 0.1, 585) + '" class="hair"/>';
  l += actuator(hx, hy, 7, J('hip'), T.hip);
  l += '</g>';
  o.push(l + '<use href="#' + S.id[0] + '-leg-l" ' + MIRROR + '/>');

  o.push('</g>');
  return o.join('\n');
}

/* ------------------------------------------------------------ the specs */

var BODIES = [
  { id: 'warden', warden: true, fx: 'hand', jets: true,
    headTop: 40, headH: 62, headW: 58, headR: 26, jawIn: 8, visorY: 22, eyes: 'band',
    chestTop: 132, chestH: 62, chestW: 112, shoulderX: 58, shoulderY: 150,
    upperArm: 100, lowerArm: 82, armW: 28,
    waistW: 66, pelvisTop: 284, pelvisW: 78, hipX: 22, hipY: 322,
    upperLeg: 122, lowerLeg: 108, legW: 34, footW: 40, core: 'reactor' },
  { id: 'aide', warden: false, fx: 'hand',
    headTop: 58, headH: 54, headW: 52, headR: 30, jawIn: 4, visorY: 18, eyes: 'two',
    chestTop: 138, chestH: 58, chestW: 100, shoulderX: 52, shoulderY: 154,
    upperArm: 96, lowerArm: 78, armW: 24,
    waistW: 58, pelvisTop: 280, pelvisW: 70, hipX: 22, hipY: 318,
    upperLeg: 124, lowerLeg: 112, legW: 28, footW: 34, core: 'soft' },
  { id: 'swift', warden: false, fx: 'gripper', wings: true, legJets: true,
    headTop: 46, headH: 54, headW: 50, headR: 24, jawIn: 10, visorY: 14, eyes: 'lens',
    chestTop: 124, chestH: 56, chestW: 92, shoulderX: 46, shoulderY: 140,
    upperArm: 92, lowerArm: 76, armW: 20,
    waistW: 50, pelvisTop: 268, pelvisW: 62, hipX: 20, hipY: 304,
    upperLeg: 136, lowerLeg: 122, legW: 24, footW: 30, core: 'reactor' },
  { id: 'forge', warden: false, fx: 'chuck', cage: true,
    headTop: 66, headH: 54, headW: 62, headR: 18, jawIn: 4, visorY: 16, eyes: 'band',
    chestTop: 142, chestH: 70, chestW: 132, shoulderX: 70, shoulderY: 164,
    upperArm: 96, lowerArm: 84, armW: 36,
    waistW: 82, pelvisTop: 292, pelvisW: 96, hipX: 26, hipY: 332,
    upperLeg: 112, lowerLeg: 100, legW: 40, footW: 56, core: 'chevron' }
];

var out = BODIES.map(function (b) {
  return '          <!-- ===================== ' + b.id.toUpperCase() + ' ===================== -->\n' +
    body(b).split('\n').map(function (ln) { return '          ' + ln; }).join('\n');
}).join('\n\n');

if (require.main === module) process.stdout.write(out + '\n');
module.exports = { BODIES: BODIES, body: body, svg: out };
