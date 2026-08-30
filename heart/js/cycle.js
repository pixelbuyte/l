/*
 * cycle.js — the cardiac cycle, as numbers.
 *
 * Everything the page draws comes from here: where the valves are, how full
 * each chamber is, what the pressures are doing, what the ECG is doing. The
 * drawing code asks this file for the state at a moment and renders it. No
 * animation lives in here, and nothing in here touches the DOM, which is why
 * the whole model can be run in node and asserted against.
 *
 * The cycle starts at the QRS complex — the electrical instant the ventricles
 * are told to contract — and runs through seven named phases:
 *
 *   ivc           isovolumic contraction   all four valves shut, pressure builds
 *   rapidEject    rapid ejection           semilunar valves open, ~70% leaves
 *   reducedEject  reduced ejection         flow tails off, pressure falls
 *   ivr           isovolumic relaxation    all four shut again, ventricle relaxes
 *   rapidFill     rapid filling            AV valves open, blood falls in
 *   diastasis     diastasis                the slow middle; first thing lost to rate
 *   atrialSystole atrial systole           the atrial kick, last 10-20% of filling
 *
 * The one structural claim worth stating: only one of a ventricle's two valves
 * is ever open, and for two intervals per beat neither is. That is what makes a
 * ventricle a pump rather than a tube, and the test suite checks it against the
 * pressures across every rate and setting the page allows.
 */
(function (root) {
  'use strict';

  var HEART = (root.HEART = root.HEART || {});

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  /* Smoothstep. Used everywhere a value moves between two phase endpoints so
     that the curves meet with a flat tangent instead of a corner. */
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function gauss(x, mu, sigma) {
    var z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z);
  }

  var PHASES = [
    { key: 'ivc',           label: 'Isovolumic contraction', short: 'IVC' },
    { key: 'rapidEject',    label: 'Rapid ejection',         short: 'Ejection' },
    { key: 'reducedEject',  label: 'Reduced ejection',       short: 'Ejection' },
    { key: 'ivr',           label: 'Isovolumic relaxation',  short: 'IVR' },
    { key: 'rapidFill',     label: 'Rapid filling',          short: 'Filling' },
    { key: 'diastasis',     label: 'Diastasis',              short: 'Diastasis' },
    { key: 'atrialSystole', label: 'Atrial systole',         short: 'Atrial kick' }
  ];

  var HR_MIN = 35, HR_MAX = 200;

  /*
   * Durations, in milliseconds, for one beat at a given rate.
   *
   * Systole does not scale with the cycle. Electromechanical systole is taken
   * as 420 ms at 60 bpm shrinking as the 0.55 power of the beat length, which
   * tracks the standard regression on the interval through the middle of the
   * range and, unlike a straight line, still behaves at the top of it — a
   * linear fit eventually shortens systole faster than the beat itself, which
   * would have diastole growing as the heart raced.
   *
   * What matters is the asymmetry: as the rate climbs, systole shortens a
   * little and diastole shortens a lot. At 60 bpm the ventricle spends nearly
   * six tenths of the beat filling; at 180 it spends a third. The part it
   * loses first is diastasis, the idle middle, which is why diastasis is
   * computed as the remainder here rather than as a fraction of anything: it
   * is the slack in the beat.
   */
  function timing(hr) {
    hr = clamp(hr, HR_MIN, HR_MAX);
    var cycle = 60000 / hr;
    var systole = clamp(420 * Math.pow(60 / hr, 0.55), 90, cycle * 0.72);
    var diastole = cycle - systole;

    var ivc = clamp(0.06 * systole, 18, 60);
    var eject = systole - ivc;
    var rapidEject = eject / 3;
    var reducedEject = eject - rapidEject;

    /* Relaxation and the atrial kick are close to fixed in absolute time, so
       they are capped as a share of diastole only to keep them sane when
       diastole gets very short. */
    var ivr = Math.min(80, 0.25 * diastole);
    var kick = Math.min(110, 0.30 * diastole);
    var rest = Math.max(0, diastole - ivr - kick);
    var rapidFill = Math.min(rest, 160);
    var diastasis = rest - rapidFill;

    var dur = {
      ivc: ivc,
      rapidEject: rapidEject,
      reducedEject: reducedEject,
      ivr: ivr,
      rapidFill: rapidFill,
      diastasis: diastasis,
      atrialSystole: kick
    };

    var phases = [], at = 0;
    for (var i = 0; i < PHASES.length; i++) {
      var d = dur[PHASES[i].key];
      phases.push({
        key: PHASES[i].key,
        label: PHASES[i].label,
        short: PHASES[i].short,
        start: at,
        end: at + d,
        dur: d,
        index: i
      });
      at += d;
    }

    return {
      hr: hr,
      cycleMs: cycle,
      systoleMs: systole,
      diastoleMs: diastole,
      fillMs: rapidFill + diastasis + kick,
      systoleFraction: systole / cycle,
      phases: phases,
      dur: dur
    };
  }

  function phaseAt(t, tim) {
    var p = tim.phases;
    for (var i = 0; i < p.length; i++) {
      if (t < p[i].end || i === p.length - 1) return p[i];
    }
    return p[p.length - 1];
  }

  /*
   * Volumes and pressures that hold for a whole beat, given the three things
   * the page lets you change: rate, contractility and filling.
   *
   * What gets in over one diastole depends on how long the inlet valve was
   * open, approaching a ceiling on an exponential — and that exponential is
   * what makes the interesting thing happen. Past about 150 bpm the beat is
   * refilling so briefly that stroke volume falls faster than the rate rises,
   * and output starts going down again.
   *
   * What comes out is a fraction of what is there above the ventricle's
   * unstressed volume, and contractility sets the fraction. Writing it that way
   * round rather than fixing an end-systolic volume matters: a ventricle that
   * has hardly filled cannot then be left holding more than it started with,
   * which is exactly what a fixed end-systolic volume implies at the bottom of
   * the range.
   */
  var TAU_FILL = 130;    /* ms; the bulk of filling happens in the first third of it */
  var SV_CAP = 73.5;     /* mL a well-filled diastole delivers with time to spare */
  var V0 = 15;           /* mL; the unstressed volume, which no beat ejects */
  var K_REF = 0.663;     /* fraction of the stressed volume a normal beat ejects */

  function hemodynamics(hr, contractility, filling) {
    var tim = timing(hr);
    var c = clamp(contractility, 0.45, 1.9);
    var f = clamp(filling, 0.45, 1.5);

    /* A hard-driven ventricle relaxes faster as well as contracting harder, and
       that lusitropy is most of how one still manages to fill at 180 bpm. */
    var drive = 0.55 + 0.45 * c;
    var tau = TAU_FILL / drive;
    var sv = SV_CAP * f * drive * (1 - Math.exp(-tim.fillMs / tau));
    var k = clamp(K_REF * Math.pow(c, 0.62), 0.2, 0.85);
    var edv = V0 + sv / k;
    var esv = edv - sv;
    var ef = sv / edv;
    var co = sv * tim.hr / 1000;                       /* litres per minute */

    /* Mean pressure is what the circulation resists; the pulse laid over it is
       the stroke volume divided by how stretchy the aorta is. Splitting it two
       thirds up and one third down is the usual approximation, and keeps the
       three numbers consistent with each other. */
    var map = clamp(60 + 6.4 * co, 52, 140);
    var pp = clamp(sv / 1.72, 12, 95);
    var sbp = map + (2 / 3) * pp;
    var dbp = map - (1 / 3) * pp;
    var edp = clamp(3 + (edv - 100) * 0.10, 1.5, 24);  /* filling pressure */

    /* The right side moves the same stroke volume against about a sixth of the
       pressure, which is the whole reason its wall is thin. */
    var pas = clamp(16 + 0.14 * sv * c, 12, 60);
    var pad = clamp(pas - (3 + 0.10 * sv), 4, 40);

    return {
      hr: tim.hr, timing: tim,
      contractility: c, filling: f,
      edv: edv, esv: esv, sv: sv, ef: ef, co: co,
      sbp: sbp, dbp: dbp, map: map, edp: edp,
      pas: pas, pad: pad,
      lap: edp + 3.4,                                  /* mean left atrial */
      rap: edp * 0.45 + 1.6                            /* mean right atrial */
    };
  }

  /*
   * Ventricular volume through the beat. Piecewise, and deliberately written so
   * that the value at the end of the last phase is exactly the value at the
   * start of the first — the curve has to close, or the heart gains or loses
   * blood every beat.
   */
  function volumeAt(t, h) {
    var tim = h.timing, ph = phaseAt(t, tim);
    var u = ph.dur > 0 ? (t - ph.start) / ph.dur : 1;
    var sv = h.sv, esv = h.esv, edv = h.edv;

    switch (ph.key) {
      case 'ivc':           return edv;
      case 'rapidEject':    return edv - 0.72 * sv * smooth(u);
      case 'reducedEject':  return edv - sv * (0.72 + 0.28 * smooth(u));
      case 'ivr':           return esv;
      case 'rapidFill':     return esv + 0.68 * sv * smooth(u);
      case 'diastasis':     return esv + sv * (0.68 + 0.12 * u);
      case 'atrialSystole': return esv + sv * (0.80 + 0.20 * smooth(u));
    }
    return edv;
  }

  /* Instantaneous flow out of (positive) or into (negative) the ventricle, in
     mL/s. Differentiated from the curve above so the two can never disagree.
     The window is clipped to the phase: volume is genuinely discontinuous in
     slope at every phase boundary, and a difference taken across one would
     report blood moving during the intervals when nothing can. */
  function flowAt(t, h) {
    var tim = h.timing, ph = phaseAt(t, tim);
    var w = Math.min(2, t - ph.start, ph.end - 1e-9 - t);
    if (w <= 1e-9) return 0;
    return -(volumeAt(t + w, h) - volumeAt(t - w, h)) / (2 * w) * 1000;
  }

  /*
   * Left-heart pressures. The shapes are the standard ones, pinned to the
   * numbers computed above rather than hard-coded, so moving contractility
   * moves the whole family of curves together.
   */
  function pressures(t, h) {
    var tim = h.timing, ph = phaseAt(t, tim);
    var u = ph.dur > 0 ? (t - ph.start) / ph.dur : 1;
    var sbp = h.sbp, dbp = h.dbp, edp = h.edp;
    var notch = dbp + 0.45 * (sbp - dbp);
    var lv, ao, la;

    switch (ph.key) {
      case 'ivc':
        lv = lerp(edp, dbp, smooth(u));
        ao = dbp + (notch - dbp) * 0;
        break;
      case 'rapidEject':
        lv = lerp(dbp, sbp, smooth(Math.min(1, u * 1.35)));
        ao = lv;
        break;
      case 'reducedEject':
        lv = lerp(sbp, notch, smooth(u));
        ao = lv;
        break;
      case 'ivr':
        /* the floor is the atrial pressure this phase is racing down to meet:
           the crossing is what opens the mitral valve a moment later */
        lv = lerp(notch, h.lap + 3.4, smooth(Math.min(1, u * 1.15)));
        ao = notch;
        break;
      default:
        lv = lerp(3, edp, smooth((volumeAt(t, h) - h.esv) / Math.max(1, h.sv)));
        ao = notch;
    }

    /* Aortic pressure runs down an exponential from the dicrotic notch for the
       whole of diastole, and is simply equal to ventricular pressure while the
       valve is open. Its floor is the diastolic pressure, which is why a slow
       heart has a lower one: the leak has longer to run. */
    if (ph.index >= 3) {
      var since = t - tim.phases[3].start;
      var span = Math.max(40, tim.cycleMs - tim.phases[3].start);
      ao = dbp + (notch - dbp) * Math.exp(-since / (span / 1.55));
    }

    /* Atrial pressure: the a, c and v waves, and the x and y descents between
       them. Small numbers, but they are what decides when the mitral valve
       opens, so the shape has to be right rather than decorative. */
    var base = h.lap;
    switch (ph.key) {
      case 'ivc':           la = lerp(base, base + 2.6, smooth(u)); break;
      case 'rapidEject':    la = lerp(base + 2.6, base - 1.6, smooth(u)); break;
      case 'reducedEject':  la = lerp(base - 1.6, base + 4.2, smooth(u)); break;
      case 'ivr':           la = lerp(base + 4.2, base + 3.4, smooth(u)); break;
      case 'rapidFill':     la = lerp(base + 3.4, base - 2.2, smooth(u)); break;
      case 'diastasis':     la = lerp(base - 2.2, base - 1.2, smooth(u)); break;
      case 'atrialSystole': la = base - 1.2 + 5.4 * Math.sin(Math.PI * u); break;
    }

    /* The right side is the same waveform against pulmonary pressures. */
    var scale = h.pas / Math.max(1, sbp);
    var rv, pa, ra;
    var pnotch = h.pad + 0.45 * (h.pas - h.pad);
    switch (ph.key) {
      case 'ivc':          rv = lerp(h.edp * 0.45, h.pad, smooth(u)); break;
      case 'rapidEject':   rv = lerp(h.pad, h.pas, smooth(Math.min(1, u * 1.35))); break;
      case 'reducedEject': rv = lerp(h.pas, pnotch, smooth(u)); break;
      case 'ivr':          rv = lerp(pnotch, h.rap + 1.5, smooth(Math.min(1, u * 1.15))); break;
      default:             rv = lerp(h.rap * 0.4, h.edp * 0.45,
                                smooth((volumeAt(t, h) - h.esv) / Math.max(1, h.sv)));
    }
    if (ph.index >= 3) {
      var s2 = t - tim.phases[3].start;
      var sp2 = Math.max(40, tim.cycleMs - tim.phases[3].start);
      pa = h.pad + (pnotch - h.pad) * Math.exp(-s2 / (sp2 / 1.35));
    } else if (ph.index >= 1) {
      pa = rv;
    } else {
      pa = h.pad;
    }
    ra = h.rap + (la - base) * 0.42;

    return { lv: lv, ao: ao, la: la, rv: rv, pa: pa, ra: ra, notch: notch, scale: scale };
  }

  /*
   * Valve position, 0 shut to 1 wide open.
   *
   * Which valves are open is decided by the phase, not by comparing the
   * pressure curves — the phases are the definition and the pressures are drawn
   * to agree with them. The test suite checks the agreement in the other
   * direction, so if a pressure shape is ever edited into nonsense the suite
   * catches it.
   *
   * The small ramps at each end are the leaflets physically moving. Semilunar
   * valves snap; AV valves drift half shut through diastasis and are pushed
   * fully open again by the atrial kick, which is a real thing you can see on
   * an echo and the reason the kick matters at all.
   */
  function valves(t, h) {
    var tim = h.timing, ph = phaseAt(t, tim);
    var u = ph.dur > 0 ? (t - ph.start) / ph.dur : 1;
    var av = 0, semi = 0;
    var RAMP = 22;                                     /* ms of leaflet travel */

    switch (ph.key) {
      case 'ivc':
        av = 0; semi = 0;
        break;
      case 'rapidEject':
        semi = Math.min(1, (t - ph.start) / RAMP);
        break;
      case 'reducedEject':
        semi = 1 - 0.35 * smooth(u) - 0.65 * smooth(Math.max(0, (t - ph.end + RAMP) / RAMP));
        break;
      case 'ivr':
        av = 0; semi = 0;
        break;
      case 'rapidFill':
        av = Math.min(1, (t - ph.start) / RAMP) * (1 - 0.25 * smooth(u));
        break;
      case 'diastasis':
        av = 0.75 - 0.35 * smooth(u);
        break;
      case 'atrialSystole':
        av = 0.40 + 0.60 * Math.sin(Math.PI * clamp(u * 1.05, 0, 1));
        av *= 1 - smooth(Math.max(0, (t - ph.end + RAMP) / RAMP));
        break;
    }
    return {
      mitral: clamp(av, 0, 1),
      tricuspid: clamp(av, 0, 1),
      aortic: clamp(semi, 0, 1),
      pulmonary: clamp(semi, 0, 1)
    };
  }

  /*
   * The ECG, as a sum of five bumps placed in real time against the phases.
   *
   * P sits just before atrial systole, because the atrium contracts when it is
   * told to; QRS sits at t = 0, because that is where the cycle was defined to
   * start; T sits in reduced ejection, so that the QT interval tracks systole.
   * Tie the waves to the phases and the trace stays right at every rate for
   * free — at 180 bpm the P wave marches up into the T wave, exactly as it does
   * on a real strip.
   */
  function ecgAt(t, h) {
    var tim = h.timing;
    var atrial = tim.phases[6];
    var sys = tim.systoleMs;
    var v = 0;
    var pMu = atrial.start - 55;

    v += 0.155 * gauss(t, pMu, Math.min(26, atrial.dur * 0.42 + 12));
    /* the P wave belongs to the beat after this one too, once it wraps */
    v += 0.155 * gauss(t + tim.cycleMs, pMu, Math.min(26, atrial.dur * 0.42 + 12));

    v -= 0.085 * gauss(t, 6, 7);                       /* Q */
    v += 1.000 * gauss(t, 24, 8.5);                    /* R */
    v -= 0.230 * gauss(t, 45, 9);                      /* S */
    v += 0.260 * gauss(t, sys * 0.72, sys * 0.135);    /* T */
    return v;
  }

  /*
   * Everything about one instant. `t` is milliseconds since the QRS of the
   * current beat; the caller keeps the clock.
   */
  function state(t, h) {
    var tim = h.timing;
    t = ((t % tim.cycleMs) + tim.cycleMs) % tim.cycleMs;
    var ph = phaseAt(t, tim);
    var v = volumeAt(t, h);
    var p = pressures(t, h);

    return {
      t: t,
      phase: ph.key,
      phaseLabel: ph.label,
      phaseShort: ph.short,
      phaseIndex: ph.index,
      u: ph.dur > 0 ? (t - ph.start) / ph.dur : 1,
      systole: ph.index <= 2,
      volume: v,
      /* 0 at end-systole, 1 at end-diastole: the number the drawing squeezes by */
      fill: clamp((v - h.esv) / Math.max(1, h.sv), 0, 1),
      flow: flowAt(t, h),
      pressure: p,
      valves: valves(t, h),
      ecg: ecgAt(t, h),
      atrialFill: atrialFill(t, h)
    };
  }

  /* The atria run a beat out of step with the ventricles: they fill all through
     ventricular systole against a shut valve, empty as it opens, and wring out
     last of all. This returns 1 when full, 0 when emptied. */
  function atrialFill(t, h) {
    var tim = h.timing, ph = phaseAt(t, tim);
    var u = ph.dur > 0 ? (t - ph.start) / ph.dur : 1;
    switch (ph.key) {
      case 'ivc':           return 0.30 + 0.12 * smooth(u);
      case 'rapidEject':    return 0.42 + 0.30 * smooth(u);
      case 'reducedEject':  return 0.72 + 0.28 * smooth(u);
      case 'ivr':           return 1.00;
      case 'rapidFill':     return 1.00 - 0.52 * smooth(u);
      case 'diastasis':     return 0.48 - 0.06 * u;
      case 'atrialSystole': return 0.42 - 0.30 * smooth(u);
    }
    return 0.5;
  }

  HEART.cycle = {
    HR_MIN: HR_MIN,
    HR_MAX: HR_MAX,
    PHASES: PHASES,
    timing: timing,
    phaseAt: phaseAt,
    hemodynamics: hemodynamics,
    volumeAt: volumeAt,
    flowAt: flowAt,
    pressures: pressures,
    valves: valves,
    ecgAt: ecgAt,
    atrialFill: atrialFill,
    state: state,
    util: { clamp: clamp, lerp: lerp, smooth: smooth, gauss: gauss }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
