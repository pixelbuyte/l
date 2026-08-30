#!/usr/bin/env node
/*
 * coronaries.js — grows the coronary tree, once, and prints it as SVG.
 *
 * A real heart wears its blood supply on the outside: two arteries off the
 * aortic root that divide four or five times over the surface until the
 * branches are hair-thin. Drawing forty tapering vessels by hand is miserable
 * and looks it — the branches come out evenly spaced and the same length,
 * which is the one thing a real tree never is.
 *
 * So the tree is grown instead. Trunks are hand-placed, because their course is
 * anatomy and not a matter of taste: the left anterior descending runs in the
 * groove over the septum, the right coronary round the atrioventricular groove
 * and down the right border, the circumflex round the other side. Everything
 * finer than that is grown off them with a seeded generator, and clipped to
 * stay on the muscle.
 *
 * Vessels are emitted as filled outlines rather than strokes, because a stroke
 * cannot taper and an artery that does not taper reads as a wire.
 *
 * Deterministic: same seed, same tree, every time.
 *
 *   node heart/tools/coronaries.js > /tmp/tree.svg
 *
 * The output is pasted verbatim into the marked block in index.html. It is
 * committed rather than generated at load so the page stays a file you can
 * open — and the test suite re-runs this and checks the two still agree, so
 * the committed art cannot quietly stop matching the code that grew it.
 */
'use strict';

/* ------------------------------------------------------------ randomness */

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
var rnd = mulberry32(20260830);
function rr(a, b) { return a + rnd() * (b - a); }

/* ------------------------------------------------------------- geometry */

function cubic(p0, p1, p2, p3, t) {
  var u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
          a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}
function norm(v) { var m = Math.hypot(v[0], v[1]) || 1; return [v[0] / m, v[1] / m]; }
function dist2seg(p, a, b) {
  var vx = b[0] - a[0], vy = b[1] - a[1];
  var wx = p[0] - a[0], wy = p[1] - a[1];
  var L = vx * vx + vy * vy;
  var t = L ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / L)) : 0;
  return Math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy));
}

/* A chain of cubics, sampled so a point and a heading can be had at any t. */
function Spine(segs) { this.segs = segs; }
Spine.prototype.at = function (t) {
  var n = this.segs.length;
  var i = Math.min(n - 1, Math.floor(t * n));
  var lt = t * n - i, s = this.segs[i];
  var p = cubic(s[0], s[1], s[2], s[3], lt);
  var q = cubic(s[0], s[1], s[2], s[3], Math.min(1, lt + 0.01));
  return { p: p, d: norm([q[0] - p[0], q[1] - p[1]]) };
};
Spine.prototype.outline = function (w0, w1, steps) {
  var pts = [], ws = [];
  for (var i = 0; i <= steps; i++) {
    var t = i / steps, s = this.at(t);
    pts.push(s.p);
    ws.push(w0 + (w1 - w0) * t);
  }
  return ribbon(pts, ws);
};

/* ------------------------------------------------- the muscle to stay on */

/* the body silhouette from index.html, sampled into a polygon */
var BODY = [
  [[214, 226], [168, 238], [148, 286], [152, 344]],
  [[152, 344], [156, 404], [170, 462], [194, 516]],
  [[194, 516], [222, 578], [286, 654], [344, 692]],
  [[344, 692], [362, 704], [382, 702], [394, 688]],
  [[394, 688], [436, 636], [472, 566], [490, 502]],
  [[490, 502], [506, 444], [508, 384], [498, 328]],
  [[498, 328], [486, 268], [460, 232], [422, 222]],
  [[422, 222], [358, 206], [268, 210], [214, 226]]
];
var POLY = [];
BODY.forEach(function (s) {
  for (var i = 0; i < 24; i++) POLY.push(cubic(s[0], s[1], s[2], s[3], i / 24));
});

function inside(p) {
  var c = false;
  for (var i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    var a = POLY[i], b = POLY[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) &&
        p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function clearance(p) {
  var m = Infinity;
  for (var i = 0, j = POLY.length - 1; i < POLY.length; j = i++) {
    m = Math.min(m, dist2seg(p, POLY[i], POLY[j]));
  }
  return m;
}
/* on the muscle, and far enough in that the vessel is not half off the edge */
function onMuscle(p, margin) { return inside(p) && clearance(p) > margin; }

/* --------------------------------------------------- vessels as outlines */

/* Walk a centreline out from a point, bending as it goes, and stop when it
   runs off the muscle. Returns the sampled points. */
function grow(p0, dir, len, curve, steps, margin) {
  var pts = [p0], p = p0.slice(), d = dir.slice(), step = len / steps;
  for (var i = 0; i < steps; i++) {
    var a = curve * step;
    var nd = [d[0] * Math.cos(a) - d[1] * Math.sin(a),
              d[0] * Math.sin(a) + d[1] * Math.cos(a)];
    d = norm(nd);
    var q = [p[0] + d[0] * step, p[1] + d[1] * step];
    if (!onMuscle(q, margin)) break;
    p = q;
    pts.push(p.slice());
  }
  return pts;
}

/* Centreline plus a width at each point becomes a closed outline: down one
   side, back up the other. That is what lets a vessel taper. */

/*
 * A closed outline through a list of points, as curves rather than chords.
 * Sampling densely enough to hide the corners costs far more characters than
 * running a Catmull-Rom through the samples and emitting the equivalent
 * cubics, and the cubics are what an artery actually looks like.
 */
function smooth(P) {
  var n = P.length, f = function (v) { return v[0].toFixed(0) + ' ' + v[1].toFixed(0); };
  var out = f(P[0]);
  for (var i = 0; i < n - 1; i++) {
    var p0 = P[i === 0 ? 0 : i - 1], p1 = P[i], p2 = P[i + 1];
    var p3 = P[i + 2 >= n ? n - 1 : i + 2];
    out += 'C' + f([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]) +
           ' '  + f([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]) +
           ' '  + f(p2);
  }
  return out;
}

function ribbon(pts, ws, curved) {
  if (pts.length < 2) return null;
  var L = [], R = [];
  for (var i = 0; i < pts.length; i++) {
    var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    var d = norm([b[0] - a[0], b[1] - a[1]]);
    var n = [-d[1], d[0]], w = ws[i] / 2;
    L.push([pts[i][0] + n[0] * w, pts[i][1] + n[1] * w]);
    R.push([pts[i][0] - n[0] * w, pts[i][1] - n[1] * w]);
  }
  var ring = L.concat(R.reverse());
  if (curved) return 'M' + smooth(ring) + 'Z';
  /* Below about two units wide the chords are shorter than a pixel, so the
     curves buy nothing and cost three times the characters. */
  var f = function (v) { return v[0].toFixed(0) + ' ' + v[1].toFixed(0); };
  return 'M' + ring.map(f).join('L') + 'Z';
}

function taper(pts, w0, w1, curved) {
  var ws = pts.map(function (_, i) {
    var t = i / Math.max(1, pts.length - 1);
    return w0 + (w1 - w0) * t;
  });
  return ribbon(pts, ws, curved);
}

/* ------------------------------------------------------------ the trees */

/*
 * Trunks. Each is anatomy, so it is placed by hand:
 *   lad  the left anterior descending, down the groove over the septum
 *   rca  the right coronary, round the groove and down the right border
 *   lcx  the circumflex, round the left side towards the back
 * `side` is which way its branches leave: +1 is right of travel, -1 is left.
 */
var ARTERIES = [
  { name: 'lad', side: 1, w: [7.0, 2.2], branches: 6, spread: [0.12, 0.9],
    segs: [[[368, 400], [378, 448], [384, 510], [386, 570]],
           [[386, 570], [387, 616], [386, 656], [384, 688]]] },
  { name: 'rca', side: 1, w: [7.4, 2.0], branches: 7, spread: [0.1, 0.92],
    segs: [[[356, 404], [318, 400], [280, 388], [248, 374]],
           [[248, 374], [218, 360], [192, 344], [178, 346]],
           [[178, 346], [168, 368], [172, 410], [184, 452]],
           [[184, 452], [194, 492], [208, 528], [224, 558]]] },
  { name: 'lcx', side: -1, w: [6.2, 1.9], branches: 6, spread: [0.12, 0.92],
    segs: [[[382, 402], [414, 398], [446, 388], [472, 372]],
           [[472, 372], [490, 362], [500, 372], [502, 398]],
           [[502, 398], [500, 440], [490, 482], [474, 518]]] }
];

/* Veins run beside the arteries and are a shade wider and flatter. */
var VEINS = [
  { name: 'gcv', side: 1, w: [6.2, 1.9], branches: 6, spread: [0.1, 0.9],
    segs: [[[378, 682], [376, 620], [372, 556], [366, 496]],
           [[366, 496], [360, 448], [352, 418], [336, 404]],
           [[336, 404], [300, 392], [254, 382], [212, 368]]] },
  { name: 'acv', side: -1, w: [4.4, 1.5], branches: 4, spread: [0.18, 0.9],
    segs: [[[268, 556], [254, 500], [246, 446], [250, 404]]] },
  { name: 'pcv', side: -1, w: [4.2, 1.4], branches: 4, spread: [0.18, 0.9],
    segs: [[[458, 404], [452, 452], [440, 500], [422, 540]]] }
];


/*
 * Epicardial fat. Drawn as one soft band it reads as a painted stripe, because
 * a stripe is what it is. The real thing is a run of overlapping lobules
 * crowded along the groove, fattest where the vessels are, and it is the
 * lumpiness that makes it read as tissue rather than as a highlight.
 */
var FAT = [
  { name: 'av', count: 40, r: [10, 34], off: [-17, 19],
    segs: [[[146, 306], [186, 356], [238, 386], [300, 396]],
           [[300, 396], [364, 408], [430, 400], [478, 374]],
           [[478, 374], [498, 362], [510, 348], [518, 332]]] },
  { name: 'iv', count: 26, r: [6, 20], off: [-10, 10],
    segs: [[[352, 398], [370, 448], [382, 514], [386, 578]],
           [[386, 578], [388, 626], [387, 664], [385, 698]]] }
];

/* A disc with a wobbly edge — a fat lobule, near enough. */
function lobule(c, r) {
  var pts = [], N = 11;
  for (var i = 0; i < N; i++) {
    var a = (i / N) * Math.PI * 2;
    var rr2 = r * rr(0.74, 1.26);
    pts.push([c[0] + Math.cos(a) * rr2, c[1] + Math.sin(a) * rr2 * rr(0.72, 1.0)]);
  }
  pts.push(pts[0], pts[1]);
  return 'M' + smooth(pts) + 'Z';
}

function growFat(spec) {
  var spine = new Spine(spec.segs), out = [];
  for (var i = 0; i < spec.count; i++) {
    var t = (i + rr(0.1, 0.9)) / spec.count;
    var at = spine.at(t);
    var n = [at.d[1], -at.d[0]];
    var o = rr(spec.off[0], spec.off[1]);
    var c = [at.p[0] + n[0] * o, at.p[1] + n[1] * o];
    if (!onMuscle(c, 2)) continue;
    out.push({ d: lobule(c, rr(spec.r[0], spec.r[1])), o: rr(0.16, 0.42) });
  }
  return out;
}

function emitFat(indent) {
  var lines = [];
  FAT.forEach(function (spec) {
    var lobes = growFat(spec);
    lines.push(indent + '<!-- ' + spec.name + ' groove: ' + lobes.length + ' lobules -->');
    lobes.forEach(function (l) {
      lines.push(indent + '<path class="fat-lobe" opacity="' + l.o.toFixed(2) + '" d="' + l.d + '"/>');
    });
  });
  return lines.join('\n');
}

function normalOf(d, side) {
  return side > 0 ? [d[1], -d[0]] : [-d[1], d[0]];
}


/* A slow lateral wander along a centreline. Two waves that do not divide into
   each other, so the result never looks periodic. */
function wobble(pts, amp) {
  var ph = rr(0, 6.283), ph2 = rr(0, 6.283);
  return pts.map(function (p, i) {
    var t = i / Math.max(1, pts.length - 1);
    var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    var d = norm([b[0] - a[0], b[1] - a[1]]);
    var n = [-d[1], d[0]];
    /* held flat at both ends so joins and branch roots stay put */
    var env = Math.sin(Math.PI * t);
    var w = (Math.sin(t * 5.3 + ph) * 0.6 + Math.sin(t * 11.7 + ph2) * 0.4) * amp * env;
    return [p[0] + n[0] * w, p[1] + n[1] * w];
  });
}

function growTree(spec, margin) {
  var spine = new Spine(spec.segs);
  var out = [taper(wobble(sample(spine, 22), 5.5), spec.w[0], spec.w[1], true)];

  var lo = spec.spread[0], hi = spec.spread[1];
  for (var i = 0; i < spec.branches; i++) {
    /* jittered along the trunk, so the branches are not a comb */
    var t = lo + (hi - lo) * ((i + rr(0.15, 0.85)) / spec.branches);
    var at = spine.at(t);
    var w1 = spec.w[0] + (spec.w[1] - spec.w[0]) * t;

    var n = normalOf(at.d, spec.side);
    var lean = rr(-0.5, 0.5);                 /* branches rake, they do not stick out square */
    var dir = norm([n[0] + at.d[0] * lean, n[1] + at.d[1] * lean]);

    var pts = grow(at.p, dir, rr(58, 116), rr(-0.019, 0.019), 9, 7);
    if (pts.length < 3) continue;
    out.push(taper(pts, w1 * 0.55, w1 * 0.2, true));

    /* second order, off the middle of the branch */
    var subs = rnd() < 0.72 ? 2 : 1;
    for (var s = 0; s < subs; s++) {
      var k = Math.floor(pts.length * rr(0.32, 0.78));
      if (k < 1 || k >= pts.length - 1) continue;
      var bd = norm([pts[k + 1][0] - pts[k - 1][0], pts[k + 1][1] - pts[k - 1][1]]);
      var sn = normalOf(bd, s === 0 ? 1 : -1);
      var sdir = norm([sn[0] + bd[0] * rr(0.3, 1.1), sn[1] + bd[1] * rr(0.3, 1.1)]);
      var sp = grow(pts[k], sdir, rr(30, 66), rr(-0.032, 0.032), 8, 5);
      if (sp.length < 3) continue;
      out.push(taper(sp, w1 * 0.3, w1 * 0.1));

      /* third order, sparse — just enough to read as a tree, not a net */
      if (rnd() < 0.5) {
        var j = Math.floor(sp.length * rr(0.4, 0.8));
        if (j < 1 || j >= sp.length - 1) continue;
        var td = norm([sp[j + 1][0] - sp[j - 1][0], sp[j + 1][1] - sp[j - 1][1]]);
        var tn = normalOf(td, rnd() < 0.5 ? 1 : -1);
        var tdir = norm([tn[0] + td[0] * rr(0.4, 1.2), tn[1] + td[1] * rr(0.4, 1.2)]);
        var tp = grow(sp[j], tdir, rr(16, 36), rr(-0.05, 0.05), 6, 4);
        if (tp.length < 3) continue;
        out.push(taper(tp, w1 * 0.17, w1 * 0.06));
      }
    }
  }
  return out.filter(Boolean);
}

function sample(spine, steps) {
  var pts = [];
  for (var i = 0; i <= steps; i++) pts.push(spine.at(i / steps).p);
  return pts;
}

/* ------------------------------------------------------------- printing */

function emit(specs, cls, indent) {
  var lines = [];
  specs.forEach(function (spec) {
    var paths = growTree(spec, 6);
    lines.push(indent + '<!-- ' + spec.name + ': ' + paths.length + ' vessels -->');
    paths.forEach(function (d, i) {
      /* a little depth: the finer the vessel, the more the tissue veils it */
      var o = i === 0 ? 1 : rr(0.62, 0.95);
      lines.push(indent + '<path class="' + cls + (i ? ' twig' : ' trunk') + '"' +
                 (i ? ' opacity="' + o.toFixed(2) + '"' : '') + ' d="' + d + '"/>');
    });
  });
  return lines.join('\n');
}

var IND = '                ';
process.stdout.write(
  IND + '<!-- Grown by tools/coronaries.js, seed 20260830. Do not hand-edit:\n' +
  IND + '     re-run the generator instead. -->\n' +
  IND + '<g class="fat" filter="url(#f-lobe3d)">\n' + emitFat(IND + '  ') + '\n' + IND + '</g>\n' +
  IND + '<g class="vein-tree" filter="url(#f-tube)">\n' + emit(VEINS, 'vessel-vein', IND + '  ') + '\n' + IND + '</g>\n' +
  IND + '<g class="artery-tree" filter="url(#f-tube)">\n' + emit(ARTERIES, 'vessel-art', IND + '  ') + '\n' + IND + '</g>\n'
);
