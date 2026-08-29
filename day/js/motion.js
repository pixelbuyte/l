/*
 * motion.js — the animation used on this page, and nothing else.
 *
 * Small on purpose. A planner you open every morning should not pull a
 * framework over the network to slide a row up four pixels. Six primitives
 * cover everything here:
 *
 *   tween      one value over time, on rAF, with an easing curve
 *   count      a numeric readout that rolls to its new value
 *   reveal     staggered entrance, driven by IntersectionObserver
 *   settle     re-run the entrance on an element that just changed
 *   marker     a value updated every frame against the wall clock
 *   type       a line of text written out a character at a time
 *
 * Every one of them checks prefers-reduced-motion first and, when it is set,
 * jumps to the final state on the first frame. Reduced motion means no motion,
 * not less of it.
 */
(function (root) {
  'use strict';

  var DAY = (root.DAY = root.DAY || {});

  var reduced = false;
  if (root.matchMedia) {
    var mq = root.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = mq.matches;
    if (mq.addEventListener) {
      mq.addEventListener('change', function (e) { reduced = e.matches; });
    }
  }

  /*
   * Curves. `out` is the workhorse — fast departure, long settle, which is what
   * makes an interface feel answered rather than animated. `snap` overshoots a
   * little and is only for things that should feel physical.
   */
  var ease = {
    linear: function (t) { return t; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    outQuint: function (t) { return 1 - Math.pow(1 - t, 5); },
    inOut: function (t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },
    snap: function (t) {
      var c = 1.70158 + 1;
      return 1 + c * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
    }
  };

  function now() {
    return root.performance && root.performance.now ? root.performance.now() : Date.now();
  }

  /* One tween. Returns a cancel function. */
  function tween(opts) {
    var from = opts.from || 0;
    var to = opts.to === undefined ? 1 : opts.to;
    var dur = reduced ? 0 : (opts.duration === undefined ? 400 : opts.duration);
    var delay = reduced ? 0 : (opts.delay || 0);
    var curve = typeof opts.easing === 'function' ? opts.easing : (ease[opts.easing] || ease.out);
    var started = now() + delay;
    var frame = null;
    var done = false;

    function step() {
      var t = now();
      if (t < started) { frame = requestAnimationFrame(step); return; }
      var p = dur <= 0 ? 1 : Math.min(1, (t - started) / dur);
      opts.onUpdate(from + (to - from) * curve(p), p);
      if (p < 1) frame = requestAnimationFrame(step);
      else { done = true; if (opts.onDone) opts.onDone(); }
    }
    frame = requestAnimationFrame(step);

    return function cancel() {
      if (!done && frame !== null) cancelAnimationFrame(frame);
    };
  }

  /*
   * A numeric readout that rolls. Holds the last value on the node so repeated
   * calls animate from where the eye left off rather than from zero, which is
   * the thing that makes rolling counters look cheap.
   */
  function count(el, to, opts) {
    opts = opts || {};
    var from = el.__dayCount === undefined ? (opts.from === undefined ? to : opts.from) : el.__dayCount;
    el.__dayCount = to;
    var render = opts.format || function (v) { return String(Math.round(v)); };
    if (from === to) { el.textContent = render(to); return function () {}; }
    return tween({
      from: from, to: to,
      duration: opts.duration === undefined ? 600 : opts.duration,
      delay: opts.delay || 0,
      easing: opts.easing || 'outQuint',
      onUpdate: function (v) { el.textContent = render(v); }
    });
  }

  /*
   * Entrance. Elements carrying [data-reveal] start hidden by CSS and get
   * .is-in once they are near the viewport, staggered in document order within
   * each group. Observed once and then released — a planner scrolls up and
   * down all day and re-playing entrances on every pass would be miserable.
   */
  function reveal(scope, opts) {
    opts = opts || {};
    var step = opts.stagger === undefined ? 55 : opts.stagger;
    var nodes = Array.prototype.slice.call(
      (scope || document).querySelectorAll('[data-reveal]:not(.is-in)'));
    if (!nodes.length) return;

    if (reduced || !root.IntersectionObserver) {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }

    var seen = 0;
    var io = new IntersectionObserver(function (entries) {
      // Top to bottom, so a stagger reads as a wipe and not as popcorn.
      entries.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) {
          return a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top;
        })
        .forEach(function (e) {
          var delay = Math.min(seen++, 12) * step;
          e.target.style.transitionDelay = delay + 'ms';
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        });
      // Reset the stagger between scroll-in batches.
      if (!entries.some(function (e) { return e.isIntersecting; })) seen = 0;
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });

    nodes.forEach(function (n) { io.observe(n); });
  }

  /* Re-run the entrance on a subtree that was just rebuilt. */
  function settle(scope, opts) {
    opts = opts || {};
    var nodes = Array.prototype.slice.call(scope.querySelectorAll('[data-reveal]'));
    nodes.forEach(function (n) { n.classList.remove('is-in'); n.style.transitionDelay = ''; });
    // One frame for the browser to notice the removed class.
    requestAnimationFrame(function () {
      var step = opts.stagger === undefined ? 40 : opts.stagger;
      nodes.forEach(function (n, i) {
        n.style.transitionDelay = (reduced ? 0 : Math.min(i, 14) * step) + 'ms';
        n.classList.add('is-in');
      });
    });
  }

  /*
   * A callback on every frame, throttled to a minimum interval. Used for the
   * clock and the now-marker, which need to move continuously but do not need
   * to move sixty times a second.
   */
  function marker(fn, interval) {
    var min = interval === undefined ? 1000 : interval;
    var last = -Infinity;
    var stopped = false;
    (function loop() {
      if (stopped) return;
      var t = now();
      if (t - last >= min) { last = t; fn(); }
      requestAnimationFrame(loop);
    })();
    return function stop() { stopped = true; };
  }

  /* Text written out a character at a time. Used once, in the masthead. */
  function type(el, text, opts) {
    opts = opts || {};
    if (reduced) { el.textContent = text; return function () {}; }
    el.textContent = '';
    return tween({
      from: 0, to: text.length,
      duration: opts.duration === undefined ? text.length * 22 : opts.duration,
      delay: opts.delay || 0,
      easing: 'inOut',
      onUpdate: function (v) { el.textContent = text.slice(0, Math.round(v)); },
      onDone: function () { el.textContent = text; }
    });
  }

  DAY.motion = {
    ease: ease,
    tween: tween,
    count: count,
    reveal: reveal,
    settle: settle,
    marker: marker,
    type: type,
    get reduced() { return reduced; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
