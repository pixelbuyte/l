/*
 * app.js — the page.
 *
 * All the thinking happens in schedule.js and sun.js; this file only reads the
 * controls, calls them, and draws the answer. Anything here that looks like a
 * decision about the day is a bug in the layering.
 */
(function () {
  'use strict';

  var DAY = window.DAY;
  var S = DAY.schedule, M = DAY.motion, R = DAY.routine;
  var STORE = 'day.route.v1';

  var $ = function (id) { return document.getElementById(id); };
  // Block labels carry a subtitle after an em dash. Chips and bars want the
  // name only.
  var short = function (label) { return label.split(/[—,]/)[0].trim().toLowerCase(); };
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  /* ------------------------------------------------------------- state -- */

  // Where the browser thinks it is, before anyone is asked for permission.
  var guess = DAY.guessPlace(
    (window.Intl && Intl.DateTimeFormat().resolvedOptions().timeZone) || '',
    -new Date().getTimezoneOffset()
  );

  var state = {
    wake: R.defaults.wake,
    midday: R.defaults.midday,
    goingOut: R.defaults.goingOut,
    workoutMinutes: R.defaults.workoutMinutes,
    lat: guess.lat,
    lng: guess.lng,
    place: guess.place,
    located: guess.exact ? 'zone' : 'offset',
    sunsetOverride: null,   // 'HH:MM' set by hand, which beats the computation
    twelveHour: false,
    date: null,        // 'YYYY-MM-DD' the ticks belong to
    done: {},          // block id -> true
    sub: {}            // block id -> [checked, ...]
  };

  function todayKey(d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) +
           '-' + ('0' + d.getDate()).slice(-2);
  }

  function load() {
    var raw;
    try { raw = window.localStorage.getItem(STORE); } catch (e) { return; }
    if (!raw) return;
    var saved;
    try { saved = JSON.parse(raw); } catch (e) { return; }
    Object.keys(state).forEach(function (k) {
      if (saved[k] !== undefined && saved[k] !== null) state[k] = saved[k];
    });
    // Ticks belong to the day they were made on. A new date starts empty —
    // a planner that opens still showing yesterday as finished is worse than
    // useless, because it looks finished.
    if (state.date !== todayKey(new Date())) { state.done = {}; state.sub = {}; }
  }

  function save() {
    state.date = todayKey(new Date());
    try { window.localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }

  /* --------------------------------------------------------------- sun -- */

  var sun = { sunrise: null, sunset: null };

  function computeSun() {
    var d = new Date();
    sun = DAY.sun.times(
      { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() },
      state.lat, state.lng, -d.getTimezoneOffset()
    );
    var manual = S.parseClock(state.sunsetOverride || '');
    if (manual !== null) {
      // A typed sunset wins outright. Keep the computed day length so sunrise
      // still shades the band sensibly.
      var span = sun.sunrise !== null && sun.sunset !== null ? sun.sunset - sun.sunrise : 720;
      sun = { sunrise: manual - span, sunset: manual, computed: sun.sunset };
    }
  }

  /* -------------------------------------------------------------- plan -- */

  var current = null;

  function replan() {
    current = S.plan(R, {
      wake: state.wake,
      midday: state.midday,
      goingOut: state.goingOut,
      workoutMinutes: state.workoutMinutes,
      sunrise: sun.sunrise,
      sunset: sun.sunset,
      twelveHour: state.twelveHour
    });
    return current;
  }

  function t(mins) { return S.fmt(mins, state.twelveHour); }

  function nowMinutes() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
  }

  /* ------------------------------------------------------------ header -- */

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function drawHeader(p) {
    var d = new Date();
    $('today').textContent = DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
    $('where').textContent = state.place + ' · sunset ' + t(sun.sunset);

    var first = p.blocks[0], last = p.blocks[p.blocks.length - 1];
    var counted = p.blocks.filter(function (b) {
      return b.kind !== 'free' && b.kind !== 'anchor';
    }).length;
    $('shape').innerHTML = 'Up at <b>' + t(first.start) + '</b> · ' + counted +
      ' blocks · free from <b>' + t(p.freeFrom) + '</b> · done <b>' +
      t(p.byId.workout ? p.byId.workout.end : last.end) + '</b>';

    var v = $('verdict');
    var mark = v.querySelector('.mark');
    var line = v.querySelector('p');

    if (p.ok) {
      var tightest = null;
      p.blocks.forEach(function (b) {
        if (b.kind === 'free' || b.kind === 'anchor') return;
        if (!tightest || b.slack < tightest.slack) tightest = b;
      });
      v.classList.remove('bad');
      mark.textContent = 'Clear';
      line.textContent = tightest
        ? 'Everything lands. The tightest point is ' + tightest.label.toLowerCase() +
          ', with ' + S.fmtSpan(tightest.slack) + ' of give before a deadline breaks.'
        : 'Everything lands.';
    } else {
      // One broken deadline knocks every block behind it out too. Lead with
      // the deadline that actually broke and count the rest, rather than
      // printing the same failure three times in different words.
      var root = p.conflicts.filter(function (c) { return c.own; });
      var lead = (root.length ? root : p.conflicts)[0];
      var knocked = p.conflicts.length - (root.length || 1);
      v.classList.add('bad');
      mark.textContent = root.length > 1 ? root.length + ' deadlines' : 'Does not fit';
      line.textContent = (root.length ? root : [lead])
        .map(function (c) { return c.because + '.'; }).join(' ') +
        (knocked > 0 ? ' ' + knocked + (knocked === 1 ? ' block behind it is' : ' blocks behind it are') +
          ' pushed late with it.' : '');
    }

    var latest = S.latestViableWake(R, {
      midday: state.midday, goingOut: state.goingOut,
      workoutMinutes: state.workoutMinutes,
      sunrise: sun.sunrise, sunset: sun.sunset
    });

    var daylightLeft = sun.sunset === null ? null : sun.sunset - nowMinutes();

    drawFacts([
      { k: 'Daylight left', v: daylightLeft === null ? '—' : (daylightLeft > 0 ? S.fmtSpan(daylightLeft) : 'gone'),
        s: sun.sunset === null ? 'no sunset today' : 'sunset ' + t(sun.sunset) },
      { k: 'Free from', v: t(p.freeFrom), s: p.freeMinutes > 0 ? S.fmtSpan(p.freeMinutes) + ' of it' : 'nothing left' },
      { k: 'Committed', v: S.fmtSpan(p.committedMinutes), s: 'across ' + p.blocks.filter(function (b) {
          return b.kind !== 'free' && b.kind !== 'anchor'; }).length + ' blocks' },
      { k: 'Could have woken', v: latest === null ? '—' : t(latest),
        s: latest === null ? 'no wake time clears it' : 'and still cleared everything' }
    ]);
  }

  function drawFacts(items) {
    var box = $('facts');
    if (box.children.length !== items.length) {
      box.textContent = '';
      items.forEach(function () {
        var d = el('div');
        d.appendChild(el('span', 'tag'));
        d.appendChild(el('b', 'v num'));
        d.appendChild(el('span', 's'));
        box.appendChild(d);
      });
    }
    items.forEach(function (it, i) {
      var d = box.children[i];
      d.children[0].textContent = it.k;
      d.children[1].textContent = it.v;
      d.children[2].textContent = it.s;
    });
  }

  /* -------------------------------------------------------------- band -- */

  function pct(mins) { return Math.max(0, Math.min(100, (mins / 1440) * 100)); }

  function drawBand(p) {
    var scale = $('band-scale');
    if (!scale.children.length) {
      for (var h = 0; h <= 24; h++) {
        var tick = el('i');
        if (h % 6 === 0) tick.className = 'major';
        tick.style.left = pct(h * 60) + '%';
        scale.appendChild(tick);
        if (h % 3 === 0 && h < 24) {
          var lab = el('span', null, ('0' + h).slice(-2));
          lab.style.left = pct(h * 60) + '%';
          if (h === 0) lab.style.transform = 'translateX(0)';
          scale.appendChild(lab);
        }
      }
    }

    var track = $('band-track');
    track.textContent = '';

    // Dark at both ends.
    if (sun.sunrise !== null) {
      var dawn = el('div', 'band-night');
      dawn.style.left = '0%';
      dawn.style.width = pct(sun.sunrise) + '%';
      track.appendChild(dawn);
    }
    if (sun.sunset !== null) {
      var dusk = el('div', 'band-night');
      dusk.style.left = pct(sun.sunset) + '%';
      dusk.style.right = '0';
      track.appendChild(dusk);
    }

    var now = nowMinutes();
    p.blocks.forEach(function (b) {
      if (b.kind === 'anchor' || b.minutes <= 0) return;
      var bar = el('div', 'band-block');
      bar.dataset.kind = b.kind;
      bar.dataset.status = b.status;
      bar.style.left = pct(b.start) + '%';
      bar.style.width = Math.max(0.35, pct(b.end) - pct(b.start)) + '%';
      bar.title = b.label + '  ' + t(b.start) + '–' + t(b.end);
      if (now >= b.start && now < b.end) bar.classList.add('is-now');
      // Only label a bar wide enough to hold the word.
      if (b.end - b.start >= 55) bar.textContent = b.label.split(/[—,]/)[0].trim();
      bar.addEventListener('click', function () {
        var row = document.querySelector('[data-row="' + b.id + '"]');
        if (row) row.scrollIntoView({ block: 'center' });
      });
      track.appendChild(bar);

      if (!M.reduced) {
        bar.style.transform = 'scaleX(0)';
        M.tween({
          from: 0, to: 1, duration: 520, delay: 60 + pct(b.start) * 4, easing: 'outQuint',
          onUpdate: function (v) { bar.style.transform = 'scaleX(' + v + ')'; }
        });
      }
    });

    // Deadline flags, read off the routine so they cannot drift from it. The
    // label sits in the lane above; only the hairline goes through the bars.
    var lane = $('band-flags');
    lane.textContent = '';
    var flags = [];
    p.blocks.forEach(function (b) {
      if (b.hard && b.deadline !== null) {
        flags.push({ at: b.deadline, label: short(b.label) + ' ' + t(b.deadline) });
      }
    });
    flags.sort(function (a, b2) { return a.at - b2.at; });

    var labels = flags.map(function (f) {
      var line = el('div', 'band-flag');
      line.style.left = pct(f.at) + '%';
      track.appendChild(line);

      var tagEl = el('b', pct(f.at) > 70 ? 'right' : null, f.label);
      tagEl.style.left = pct(f.at) + '%';
      lane.appendChild(tagEl);
      return tagEl;
    });

    /*
     * Two deadlines seven minutes apart would print on top of each other, and
     * on a phone all four collide. Measure what each label actually occupies
     * and drop it into the lowest lane row it fits in, growing the lane rather
     * than hiding a deadline.
     */
    var width = lane.offsetWidth || 1;
    var rows = [];
    labels.forEach(function (tagEl, i) {
      var w = tagEl.offsetWidth;
      var left = pct(flags[i].at) / 100 * width - (tagEl.className === 'right' ? w : 0);
      var r = 0;
      while (rows[r] !== undefined && left < rows[r] + 4) r++;
      rows[r] = left + w;
      tagEl.style.bottom = (r * 15) + 'px';
    });
    lane.style.height = (20 + rows.length * 15) + 'px';

    moveNow();
  }

  function moveNow() {
    var marker = $('band-now');
    var n = nowMinutes();
    marker.hidden = false;
    marker.style.left = pct(n) + '%';
  }

  /* -------------------------------------------------------------- rows -- */

  function reasonForGap(next) {
    if (next.drivenBy === 'notBefore') {
      return next.id === 'dusk' ? 'waiting for the sun to go down' : 'waiting for the clock';
    }
    return 'nothing planned';
  }

  var rowNodes = {};

  function drawRows(p) {
    var host = $('rows');
    host.textContent = '';
    rowNodes = {};
    var now = nowMinutes();
    var n = 0, prevEnd = null;

    p.blocks.forEach(function (b) {
      if (prevEnd !== null && b.start - prevEnd >= 5) {
        var gap = el('div', 'gap');
        gap.setAttribute('data-reveal', '');
        gap.appendChild(el('span', null, ''));
        gap.appendChild(el('span', 'num', t(prevEnd) + '–' + t(b.start)));
        gap.appendChild(el('span', null, S.fmtSpan(b.start - prevEnd) + ' — ' + reasonForGap(b)));
        host.appendChild(gap);
      }
      prevEnd = b.end;

      var row = el('div', 'row');
      row.dataset.row = b.id;
      row.setAttribute('data-reveal', '');
      if (b.status === 'late') row.classList.add('late');
      if (state.done[b.id]) row.classList.add('done');
      if (now >= b.start && now < b.end && b.kind !== 'anchor') {
        row.classList.add('now');
        row.style.setProperty('--done',
          ((now - b.start) / Math.max(1, b.end - b.start) * 100) + '%');
      } else if (now >= b.end) {
        row.style.setProperty('--done', '100%');
      }

      row.appendChild(el('div', 'idx num', b.kind === 'anchor' ? '00' : ('0' + (++n)).slice(-2)));

      var when = el('div', 'when');
      when.appendChild(el('b', null, t(b.start)));
      when.appendChild(el('s', null,
        b.minutes > 0 ? t(b.end) + '  ·  ' + S.fmtSpan(b.minutes) : 'the anchor'));
      row.appendChild(when);

      var what = el('div', 'what');
      what.appendChild(el('h3', null, b.label));
      what.appendChild(el('p', null, b.note));

      if (b.checklist) {
        var sub = el('div', 'sub');
        var picks = state.sub[b.id] || [];
        b.checklist.forEach(function (name, i) {
          var lab = el('label');
          var box = el('input');
          box.type = 'checkbox';
          box.checked = !!picks[i];
          if (picks[i]) lab.classList.add('on');
          box.addEventListener('change', function () {
            var arr = state.sub[b.id] || [];
            arr[i] = box.checked;
            state.sub[b.id] = arr;
            lab.classList.toggle('on', box.checked);
            save();
          });
          lab.appendChild(box);
          lab.appendChild(document.createTextNode(name));
          sub.appendChild(lab);
        });
        what.appendChild(sub);
      }
      row.appendChild(what);

      var meta = el('div', 'meta');
      if (b.deadlineLabel && b.hard) {
        meta.appendChild(el('span', 'chip hard', b.deadlineLabel));
      }
      if (b.elastic && b.kind !== 'free') meta.appendChild(el('span', 'chip', 'fills the gap'));
      if (b.kind !== 'anchor' && b.kind !== 'free') {
        if (b.status === 'late') {
          meta.appendChild(el('span', 'chip bad',
            b.missedBy > 0 ? S.fmtSpan(b.missedBy) + ' over' : S.fmtSpan(-b.slack) + ' short'));
        } else {
          meta.appendChild(el('span', 'chip' + (b.status === 'tight' ? ' tight' : ''),
            S.fmtSpan(b.slack) + ' of slack'));
        }
        if (b.binding && b.binding !== b.id && p.byId[b.binding]) {
          meta.appendChild(el('span', 'chip', 'held by ' + short(p.byId[b.binding].label)));
        }
      }
      if (b.soonerMargin !== null && b.soonerMargin !== undefined) {
        meta.appendChild(el('span', 'chip',
          b.soonerMargin >= 0 ? S.fmtSpan(b.soonerMargin) + ' before sunset' : 'after sunset'));
      }
      row.appendChild(meta);

      if (b.kind === 'anchor') {
        row.appendChild(el('div'));
      } else {
        var tick = el('input', 'tick');
        tick.type = 'checkbox';
        tick.checked = !!state.done[b.id];
        tick.setAttribute('aria-label', 'Mark ' + b.label + ' done');
        tick.addEventListener('change', function () {
          if (tick.checked) state.done[b.id] = true; else delete state.done[b.id];
          row.classList.toggle('done', tick.checked);
          save();
        });
        row.appendChild(tick);
      }

      rowNodes[b.id] = row;
      host.appendChild(row);
    });

    M.settle(host, { stagger: 28 });
  }

  /*
   * The clock moves every minute, but rebuilding the list every minute would
   * replay the entrance animation and drop focus out of whatever checkbox
   * someone was using. So the tick only touches the two things that actually
   * change: which row is current, and how far its progress rule has filled.
   */
  function tickRows(p) {
    var now = nowMinutes();
    p.blocks.forEach(function (b) {
      var row = rowNodes[b.id];
      if (!row) return;
      var isNow = now >= b.start && now < b.end && b.kind !== 'anchor';
      row.classList.toggle('now', isNow);
      row.style.setProperty('--done',
        now >= b.end ? '100%'
          : isNow ? ((now - b.start) / Math.max(1, b.end - b.start) * 100) + '%'
          : '0%');
    });
    Array.prototype.forEach.call($('band-track').querySelectorAll('.band-block'),
      function (bar) { bar.classList.remove('is-now'); });
    var pos = S.positionAt(p, now);
    if (pos.current) {
      var bars = $('band-track').querySelectorAll('.band-block');
      p.blocks.filter(function (b) { return b.kind !== 'anchor' && b.minutes > 0; })
        .forEach(function (b, i) {
          if (b.id === pos.current.id && bars[i]) bars[i].classList.add('is-now');
        });
    }
  }

  /* ------------------------------------------------------------- rules -- */

  function drawRules(p) {
    var host = $('rules');
    host.textContent = '';

    var hard = p.blocks.filter(function (b) { return b.hard; });

    hard.forEach(function (b) {
      var art = el('article');
      art.setAttribute('data-reveal', '');
      var missed = b.status === 'late';
      if (missed) art.classList.add('miss');

      art.appendChild(el('span', 'tag ' + (missed ? '' : 'ink'), b.id === 'ready'
        ? 'Within 30 minutes' : (b.deadlineLabel || 'deadline').replace(/^by /, 'By ')));
      art.appendChild(el('h3', null, b.label));
      art.appendChild(el('p', 'said', b.note));

      // An elastic block always ends exactly on its deadline — that is what
      // makes it elastic — so its margin is meaninglessly zero. What is worth
      // knowing there is how much of the block survived.
      var margin, caption;
      if (b.elastic) {
        margin = b.minutes;
        caption = b.status === 'late' ? 'and it does not fit' : 'is what is left of it';
      } else if (b.id === 'ready') {
        margin = b.slack;
        caption = margin >= 0 ? 'to spare' : 'over the line';
      } else if (b.deadline === null) {
        margin = null;
        caption = 'no deadline today';
      } else {
        margin = b.deadline - b.end;
        caption = margin >= 0 ? 'to spare' : 'over the line';
      }

      art.appendChild(el('b', 'margin num',
        margin === null ? '—' : S.fmtSpan(Math.abs(margin))));
      art.appendChild(el('span', 'state', caption));
      host.appendChild(art);
    });

    M.settle(host, { stagger: 45 });
  }

  /* ------------------------------------------------------------- clock -- */

  function drawClock() {
    var d = new Date();
    var h = ('0' + d.getHours()).slice(-2), m = ('0' + d.getMinutes()).slice(-2);
    var s = ('0' + d.getSeconds()).slice(-2);
    if (state.twelveHour) {
      var hh = d.getHours() % 12; if (hh === 0) hh = 12;
      h = ('0' + hh).slice(-2);
    }
    $('clock').innerHTML = h + ':' + m + '<span class="sec">:' + s + '</span>';
  }

  /* ------------------------------------------------------------- paint -- */

  var painted = false;

  function paint() {
    computeSun();
    var p = replan();
    drawHeader(p);
    drawBand(p);
    drawRows(p);
    drawRules(p);
    syncControls();
    save();
    if (!painted) { painted = true; M.reveal(document); }
  }

  function syncControls() {
    $('wake').value = state.wake;
    $('wo-val').innerHTML = state.workoutMinutes + '<small style="font-size:.5em"> min</small>';
    $('place').value = state.place;
    if (!document.activeElement || document.activeElement.id !== 'sunset-set') {
      $('sunset-set').value = sun.sunset === null ? '' : S.fmt(Math.round(sun.sunset), false);
    }
    $('sunset-auto').hidden = !state.sunsetOverride;
    $('place-src').textContent = state.sunsetOverride ? ' · sunset set by hand'
      : state.located === 'gps' ? ' · from your device'
      : state.located === 'zone' ? ' · from your time zone'
      : ' · guessed from your clock';
    setSeg('midday', state.midday);
    setSeg('going', state.goingOut ? '1' : '0');
    setSeg('fmt', state.twelveHour ? '12' : '24');
    $('going-hint').textContent = state.goingOut
      ? 'Ninety minutes out of the middle of the day, and work is what gives.'
      : 'Working straight through to 18:30.';
    var ready = current && current.byId.ready;
    $('wake-hint').textContent = ready
      ? 'Ready by ' + t(ready.end) + '. The half hour after waking is the rule.'
      : 'Getting ready starts within 30 minutes of this.';
  }

  function setSeg(id, value) {
    Array.prototype.forEach.call($(id).children, function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.v === value));
    });
  }

  function onSeg(id, fn) {
    $(id).addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      fn(b.dataset.v);
      paint();
    });
  }

  /* ------------------------------------------------------------ wiring -- */

  function nudgeWake(delta) {
    var m = S.parseClock(state.wake);
    if (m === null) m = 7 * 60;
    m = Math.max(0, Math.min(23 * 60 + 59, m + delta));
    state.wake = S.fmt(m, false);
    paint();
  }

  function boot() {
    load();

    $('wake').addEventListener('input', function () {
      if (S.parseClock(this.value) !== null) { state.wake = this.value; paint(); }
    });
    $('wake-down').addEventListener('click', function () { nudgeWake(-15); });
    $('wake-up').addEventListener('click', function () { nudgeWake(15); });

    $('wo-down').addEventListener('click', function () {
      state.workoutMinutes = Math.max(10, state.workoutMinutes - 5); paint();
    });
    $('wo-up').addEventListener('click', function () {
      state.workoutMinutes = Math.min(120, state.workoutMinutes + 5); paint();
    });

    onSeg('midday', function (v) { state.midday = v; });
    onSeg('going', function (v) { state.goingOut = v === '1'; });
    onSeg('fmt', function (v) { state.twelveHour = v === '12'; });

    $('place').addEventListener('input', function () { state.place = this.value; save(); drawHeader(current); });

    $('sunset-set').addEventListener('change', function () {
      state.sunsetOverride = S.parseClock(this.value) === null ? null : this.value;
      paint();
    });
    $('sunset-auto').addEventListener('click', function () {
      state.sunsetOverride = null;
      paint();
    });

    $('locate').addEventListener('click', function () {
      var btn = this;
      if (!navigator.geolocation) { btn.textContent = 'not available here'; return; }
      btn.textContent = 'asking…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        state.lat = pos.coords.latitude;
        state.lng = pos.coords.longitude;
        state.located = 'gps';
        state.sunsetOverride = null;
        btn.textContent = 'update my location';
        paint();
      }, function () {
        btn.textContent = 'declined — sunset is for ' + state.place;
      }, { timeout: 8000, maximumAge: 3600000 });
    });

    $('reset').addEventListener('click', function () {
      state.done = {}; state.sub = {};
      state.wake = R.defaults.wake;
      state.midday = R.defaults.midday;
      state.goingOut = R.defaults.goingOut;
      state.workoutMinutes = R.defaults.workoutMinutes;
      state.sunsetOverride = null;
      paint();
    });
    $('print').addEventListener('click', function () { window.print(); });

    // Left and right nudge the wake time, as long as you are not in a field.
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') { nudgeWake(-15); e.preventDefault(); }
      if (e.key === 'ArrowRight') { nudgeWake(15); e.preventDefault(); }
    });

    paint();
    M.type($('kicker'), 'The routine, held to its own deadlines', { delay: 250 });

    drawClock();
    M.marker(function () {
      drawClock();
      moveNow();
    }, 1000);

    // Rows carry a live progress rule and a "you are here" state, so they need
    // rebuilding as the day moves — but once a minute, not once a second.
    var lastMinute = -1;
    M.marker(function () {
      var m = Math.floor(nowMinutes());
      if (m === lastMinute) return;
      lastMinute = m;
      if (!current) return;
      drawHeader(current);
      tickRows(current);
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
