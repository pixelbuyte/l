/*
 * schedule.js — the planner.
 *
 * The day is a chain of blocks with three kinds of constraint on it: an anchor
 * (when you wake), orderings (this after that), and deadlines — some on the
 * clock, some tied to sunset. Given a wake time this lays the chain out as
 * early as it will go, then works backwards from the deadlines to find how far
 * each block could slip before something breaks.
 *
 * That backward pass is the useful half. Anyone can stack blocks end to end;
 * what you actually want to know at nine in the morning is how much of the day
 * you have already spent, and which of the evening's deadlines is the one
 * quietly deciding your afternoon.
 *
 * Pure functions over plain data. No DOM, no clock, no storage — the caller
 * passes the time in. That is what makes it testable.
 */
(function (root) {
  'use strict';

  var DAY = (root.DAY = root.DAY || {});

  var END_OF_DAY = 24 * 60 - 1;   // 23:59
  var TIGHT = 20;                 // minutes of slack below which a block is tight

  /* ------------------------------------------------------------ time ----- */

  function parseClock(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return h * 60 + mi;
  }

  function clamp(n, lo, hi) { return n < lo ? lo : n > hi ? hi : n; }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* Minutes after midnight to a clock string. Past midnight keeps counting. */
  function fmt(mins, twelve) {
    if (mins === null || mins === undefined || isNaN(mins)) return '—';
    var m = Math.round(mins);
    var over = m >= 1440;
    m = ((m % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60), mi = m % 60;
    var s;
    if (twelve) {
      var suffix = h < 12 ? 'am' : 'pm';
      var h12 = h % 12; if (h12 === 0) h12 = 12;
      s = h12 + ':' + pad(mi) + suffix;
    } else {
      s = pad(h) + ':' + pad(mi);
    }
    return over ? s + '+1' : s;
  }

  /* A span of minutes as something you would say out loud. */
  function fmtSpan(mins) {
    var m = Math.round(Math.abs(mins));
    var h = Math.floor(m / 60), mi = m % 60;
    var sign = mins < 0 ? '−' : '';
    if (h && mi) return sign + h + 'h ' + mi + 'm';
    if (h) return sign + h + 'h';
    return sign + mi + 'm';
  }

  /*
   * A constraint is either a clock string or an offset from sunset. Sunset can
   * be missing — inside the arctic circle there may not be one — in which case
   * the constraint simply does not apply and we say so rather than inventing a
   * time.
   */
  function resolve(spec, ctx) {
    if (spec === null || spec === undefined) return null;
    if (typeof spec === 'number') return spec;
    if (typeof spec === 'string') return parseClock(spec);
    if (spec.sun) {
      var base = ctx[spec.sun];
      if (base === null || base === undefined) return null;
      // Sun times arrive fractional. Everything downstream is clock minutes.
      return Math.round(base + (spec.offset || 0));
    }
    return null;
  }

  function describe(spec, ctx, twelve) {
    if (!spec) return '';
    if (typeof spec === 'string') return 'by ' + fmt(parseClock(spec), twelve);
    if (spec.sun) {
      var t = resolve(spec, ctx);
      var word = spec.sun === 'sunset' ? 'sunset' : spec.sun;
      if (t === null) return 'by ' + word;
      return 'by ' + word + ' (' + fmt(t, twelve) + ')';
    }
    return '';
  }

  /* ----------------------------------------------------------- blocks ---- */

  /* Which blocks are in play, given the options. */
  function active(routine, opts) {
    var on = {
      pray: opts.midday === 'pray' || opts.midday === 'both',
      walk: opts.midday === 'walk' || opts.midday === 'both',
      out: !!opts.goingOut
    };
    return routine.blocks.filter(function (b) {
      return !b.when || on[b.when];
    });
  }

  /*
   * Kahn's algorithm. The routine is authored in order and its dependencies
   * only ever point backwards, so this is really a check that someone editing
   * data/routine.js has not written a cycle by hand.
   */
  function topo(blocks) {
    var index = {}, indeg = {}, out = {};
    blocks.forEach(function (b) { index[b.id] = b; indeg[b.id] = 0; out[b.id] = []; });
    blocks.forEach(function (b) {
      (b.after || []).forEach(function (d) {
        if (!index[d]) return;              // inactive dependency: drop it
        indeg[b.id]++;
        out[d].push(b.id);
      });
    });
    var queue = blocks.filter(function (b) { return indeg[b.id] === 0; })
                      .map(function (b) { return b.id; });
    var order = [];
    while (queue.length) {
      var id = queue.shift();
      order.push(index[id]);
      out[id].forEach(function (n) { if (--indeg[n] === 0) queue.push(n); });
    }
    if (order.length !== blocks.length) throw new Error('routine has a cycle');
    return { order: order, index: index, successors: out };
  }

  /* ------------------------------------------------------------- plan ---- */

  /*
   * opts: { wake, midday, goingOut, workoutMinutes, sunrise, sunset, twelveHour }
   * Sun times come in as minutes after local midnight, or null.
   */
  function plan(routine, opts) {
    opts = opts || {};
    var d = routine.defaults;
    var o = {
      wake: opts.wake || d.wake,
      midday: opts.midday || d.midday,
      goingOut: opts.goingOut === undefined ? d.goingOut : opts.goingOut,
      workoutMinutes: opts.workoutMinutes || d.workoutMinutes,
      sunrise: opts.sunrise === undefined ? null : opts.sunrise,
      sunset: opts.sunset === undefined ? null : opts.sunset,
      twelveHour: !!opts.twelveHour
    };
    var wakeAt = parseClock(o.wake);
    if (wakeAt === null) wakeAt = parseClock(d.wake);

    var ctx = { sunrise: o.sunrise, sunset: o.sunset, wake: wakeAt };
    var blocks = active(routine, o);
    var g = topo(blocks);
    var state = {};

    /* Forward: everything as early as its dependencies and floors allow. */
    g.order.forEach(function (b) {
      var es = b.anchor === 'wake' ? wakeAt : 0;
      var drivenBy = b.anchor === 'wake' ? 'wake' : null;

      (b.after || []).forEach(function (dep) {
        var s = state[dep];
        if (s && s.end > es) { es = s.end; drivenBy = dep; }
      });

      var floor = resolve(b.notBefore, ctx);
      if (floor !== null && floor > es) { es = floor; drivenBy = 'notBefore'; }

      var deadline = resolve(b.finishBy, ctx);
      var nominal = b.id === 'workout' ? o.workoutMinutes : b.minutes;
      var dur = nominal;
      if (b.elastic) {
        var room = deadline === null ? END_OF_DAY - es : deadline - es;
        dur = Math.max(b.min || 0, room);
      }

      state[b.id] = {
        block: b, start: es, end: es + dur, minutes: dur,
        deadline: deadline, drivenBy: drivenBy,
        // An elastic block gives its own time up before it pushes anything
        // else, so predecessors are only on the hook for its minimum.
        backwardMinutes: b.elastic ? (b.min || 0) : dur
      };
    });

    /* Backward: the latest each block could start and still clear every hard
       deadline downstream of it. */
    for (var i = g.order.length - 1; i >= 0; i--) {
      var b = g.order[i];
      var s = state[b.id];
      var lf = END_OF_DAY;
      var binding = null;

      if (s.deadline !== null) { lf = s.deadline; binding = b.id; }

      g.successors[b.id].forEach(function (nid) {
        var n = state[nid];
        if (n.latestStart < lf) { lf = n.latestStart; binding = n.binding || nid; }
      });

      var ls = lf - s.backwardMinutes;

      if (b.startWithin) {
        var ref = state[b.startWithin.of];
        if (ref) {
          var cap = ref.end + b.startWithin.minutes;
          if (cap < ls) { ls = cap; binding = b.id; }
        }
      }

      s.latestFinish = lf;
      s.latestStart = ls;
      s.binding = binding;
      s.slack = ls - s.start;
    }

    /* Read the results off. */
    var conflicts = [];
    var out = g.order.map(function (b) {
      var s = state[b.id];
      var missedBy = 0;
      if (s.deadline !== null && s.end > s.deadline) missedBy = s.end - s.deadline;

      var status = 'ok';
      if (missedBy > 0 || s.slack < 0) status = 'late';
      else if (s.slack < TIGHT) status = 'tight';
      if (b.kind === 'free' || b.kind === 'anchor') status = 'ok';

      if (status === 'late' && b.kind !== 'free' && b.kind !== 'anchor') {
        var bindingBlock = s.binding && state[s.binding] ? state[s.binding].block : null;
        conflicts.push({
          id: b.id,
          label: b.label,
          // A broken deadline drags every block behind it down with it. `own`
          // marks the one that actually broke, so the page can lead with the
          // cause instead of printing the same failure once per casualty.
          own: missedBy > 0,
          missedBy: missedBy || -s.slack,
          because: missedBy > 0
            ? b.label + ' runs ' + fmtSpan(missedBy) + ' past its own ' +
              describe(b.finishBy, ctx, o.twelveHour).replace(/^by /, 'deadline of ')
            : b.label + ' has to start ' + fmtSpan(-s.slack) + ' earlier for ' +
              (bindingBlock ? bindingBlock.label.toLowerCase() : 'the evening') + ' to finish on time'
        });
      }

      return {
        id: b.id,
        label: b.label,
        note: b.note,
        kind: b.kind,
        checklist: b.checklist || null,
        start: s.start,
        end: s.end,
        minutes: s.minutes,
        latestStart: s.latestStart,
        latestFinish: s.latestFinish,
        slack: s.slack,
        status: status,
        elastic: !!b.elastic,
        deadline: s.deadline,
        // What pushed this block's start where it is: a predecessor id, or
        // 'notBefore' when it is sitting waiting for the clock or the sun.
        drivenBy: s.drivenBy,
        deadlineLabel: describe(b.finishBy, ctx, o.twelveHour),
        hard: !!b.hard,
        binding: s.binding,
        missedBy: missedBy,
        // For the walk: how long before sunset it is over. Earlier is better,
        // and this is the number that says how much better.
        soonerMargin: b.sooner && o.sunset !== null ? o.sunset - s.end : null
      };
    });

    var byId = {};
    out.forEach(function (b) { byId[b.id] = b; });

    var committed = out.reduce(function (a, b) {
      return a + (b.kind === 'free' || b.kind === 'anchor' ? 0 : b.minutes);
    }, 0);
    var freeBlock = byId.free;

    return {
      options: o,
      wake: wakeAt,
      sunrise: o.sunrise,
      sunset: o.sunset,
      blocks: out,
      byId: byId,
      conflicts: conflicts,
      ok: conflicts.length === 0,
      committedMinutes: committed,
      freeMinutes: freeBlock ? freeBlock.minutes : 0,
      freeFrom: freeBlock ? freeBlock.start : null,
      dayEnd: out.length ? out[out.length - 1].end : wakeAt,
      fmt: function (m) { return fmt(m, o.twelveHour); }
    };
  }

  /*
   * The latest you could get up and still clear every hard deadline. Runs the
   * planner once a minute across the morning; twelve blocks makes that cheap,
   * and it beats deriving it by hand from constraints that keep changing.
   */
  function latestViableWake(routine, opts, floor) {
    var start = floor === undefined ? 4 * 60 : floor;
    var best = null;
    for (var m = start; m <= 16 * 60; m++) {
      var p = plan(routine, Object.assign({}, opts, { wake: fmt(m, false) }));
      if (p.ok) best = m; else if (best !== null) break;
    }
    return best;
  }

  /* Where you are in the plan right now. */
  function positionAt(planned, now) {
    var current = null, next = null;
    planned.blocks.forEach(function (b) {
      if (b.kind === 'anchor') return;
      if (now >= b.start && now < b.end && !current) current = b;
      if (b.start > now && !next) next = b;
    });
    return {
      now: now,
      current: current,
      next: next,
      // Fraction of the waking plan elapsed, for the progress rule.
      through: clamp((now - planned.wake) / Math.max(1, planned.dayEnd - planned.wake), 0, 1)
    };
  }

  DAY.schedule = {
    plan: plan,
    latestViableWake: latestViableWake,
    positionAt: positionAt,
    parseClock: parseClock,
    fmt: fmt,
    fmtSpan: fmtSpan,
    resolve: resolve,
    END_OF_DAY: END_OF_DAY,
    TIGHT: TIGHT
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
