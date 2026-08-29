#!/usr/bin/env node
/*
 * Test suite for the planner. Run with: node day/test/run.js
 *
 * Loads the shipped source files as globals, the way the browser does, so what
 * is tested is what is served.
 *
 * The load-bearing test is the sweep at the bottom. Anything can be made to
 * pass on one example day; what matters is that across every wake time, every
 * option and every sunset from the arctic to the equator, a plan reported as
 * clear never actually breaks one of its own deadlines.
 */
'use strict';
var path = require('path');
var base = path.join(__dirname, '..');
['js/sun.js', 'data/routine.js', 'js/schedule.js']
  .forEach(function (f) { require(path.join(base, f)); });

var DAY = globalThis.DAY;
var S = DAY.schedule, R = DAY.routine;
var pass = 0, fail = 0, failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(name + (detail ? '\n      ' + detail : ''));
}
function eq(name, actual, expected) {
  ok(name, actual === expected,
     'expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
}
function near(name, actual, expected, tol) {
  ok(name, Math.abs(actual - expected) <= tol,
     'expected ' + expected + ' ±' + tol + ', got ' + actual);
}

/* ------------------------------------------------------------------ sun -- */

var sun = DAY.sun;

eq('julian day: J2000 epoch', sun.julianDay(2000, 1, 1), 2451544.5);

// Published times for these places and dates, to the minute.
var nycJun = sun.times({ y: 2024, m: 6, d: 20 }, 40.7128, -74.006, -240);
near('sunrise: New York, June solstice', nycJun.sunrise, 5 * 60 + 25, 2);
near('sunset: New York, June solstice', nycJun.sunset, 20 * 60 + 31, 2);

var nycDec = sun.times({ y: 2024, m: 12, d: 21 }, 40.7128, -74.006, -300);
near('sunrise: New York, December solstice', nycDec.sunrise, 7 * 60 + 16, 2);
near('sunset: New York, December solstice', nycDec.sunset, 16 * 60 + 32, 2);

var ldnMar = sun.times({ y: 2024, m: 3, d: 20 }, 51.5074, -0.1278, 0);
near('sunset: London, March equinox', ldnMar.sunset, 18 * 60 + 14, 3);

var sgp = sun.times({ y: 2024, m: 9, d: 1 }, 1.3521, 103.8198, 480);
near('sunset: Singapore barely moves', sgp.sunset, 19 * 60 + 8, 5);

ok('day length grows from December to June in the north',
   (nycJun.sunset - nycJun.sunrise) > (nycDec.sunset - nycDec.sunrise));

var polarSummer = sun.times({ y: 2024, m: 6, d: 21 }, 78.22, 15.65, 60);
eq('polar day: no sunset', polarSummer.sunset, null);
eq('polar day: sun is up', polarSummer.alwaysUp, true);
var polarWinter = sun.times({ y: 2024, m: 12, d: 21 }, 78.22, 15.65, 60);
eq('polar night: no sunrise', polarWinter.sunrise, null);
eq('polar night: sun is down', polarWinter.alwaysUp, false);

eq('hour angle undefined above the horizon limit', sun.hourAngle(89, 23, 90.833), null);

/* ----------------------------------------------------------- formatting -- */

eq('parse clock', S.parseClock('07:05'), 425);
eq('parse clock: midnight', S.parseClock('00:00'), 0);
eq('parse clock: rejects 24:00', S.parseClock('24:00'), null);
eq('parse clock: rejects 12:60', S.parseClock('12:60'), null);
eq('parse clock: rejects nonsense', S.parseClock('half seven'), null);
eq('format 24 hour', S.fmt(425), '07:05');
eq('format 12 hour', S.fmt(425, true), '7:05am');
eq('format 12 hour: noon', S.fmt(720, true), '12:00pm');
eq('format 12 hour: midnight', S.fmt(0, true), '12:00am');
eq('format 12 hour: 22:24', S.fmt(1344, true), '10:24pm');
eq('format null', S.fmt(null), '—');
eq('span: hours and minutes', S.fmtSpan(95), '1h 35m');
eq('span: whole hours', S.fmtSpan(120), '2h');
eq('span: minutes', S.fmtSpan(45), '45m');
eq('span: negative', S.fmtSpan(-30), '−30m');

/* ------------------------------------------------------------ the plan -- */

var SUNSET = 19 * 60 + 33;   // late August in New York
var SUNRISE = 6 * 60 + 22;
var basic = { sunrise: SUNRISE, sunset: SUNSET };

function planAt(wake, extra) {
  return S.plan(R, Object.assign({ wake: wake }, basic, extra || {}));
}

var p = planAt('07:00');

eq('plan is clear from a seven o clock start', p.ok, true);
eq('wake anchors the day', p.byId.wake.start, 420);
eq('getting ready starts straight after waking', p.byId.ready.start, 420);
eq('getting ready runs half an hour', p.byId.ready.minutes, 30);
ok('pray is finished long before two', p.byId.pray.end < 14 * 60);
ok('the walk is over before sunset', p.byId.walk.end < SUNSET);
ok('the walk banks most of the afternoon', p.byId.walk.soonerMargin > 600);
eq('work stops at half six', p.byId.work.end, 18 * 60 + 30);
eq('work stretches to fill the afternoon', p.byId.work.elastic, true);
eq('reciting cannot start before half six', p.byId.recite.start, 18 * 60 + 30);
eq('the evening reading waits for sunset', p.byId.dusk.start, SUNSET);
eq('the evening reading is held by the sun, not by what precedes it',
   p.byId.dusk.drivenBy, 'notBefore');
ok('the workout is over before 22:24', p.byId.workout.end <= 22 * 60 + 24);
eq('the workout is the length you asked for', p.byId.workout.minutes, 30);
eq('free time is what is left', p.byId.free.start, p.byId.workout.end);
eq('every block is accounted for', p.blocks.length, 11);

// The order in the data file is the order in the day.
var order = p.blocks.map(function (b) { return b.id; });
eq('the day runs in the authored order',
   order.join(' '),
   'wake ready pray walk eat out work recite dusk productive workout free'
     .split(' ').filter(function (id) { return id !== 'out'; }).join(' '));

var monotonic = true;
for (var i = 1; i < p.blocks.length; i++) {
  if (p.blocks[i].start < p.blocks[i - 1].start) monotonic = false;
}
ok('nothing runs backwards', monotonic);

/* --------------------------------------------------------- the choices -- */

var prayOnly = planAt('07:00', { midday: 'pray' });
eq('choosing prayer alone drops the walk', prayOnly.byId.walk, undefined);
eq('choosing prayer alone keeps prayer', !!prayOnly.byId.pray, true);
var walkOnly = planAt('07:00', { midday: 'walk' });
eq('choosing the walk alone drops prayer', walkOnly.byId.pray, undefined);
eq('the walk still follows getting ready with prayer gone', walkOnly.byId.walk.start,
   walkOnly.byId.ready.end);

var out = planAt('07:00', { goingOut: true });
eq('going out inserts the block', !!out.byId.out, true);
eq('going out sits after eating', out.byId.out.start, out.byId.eat.end);
ok('going out is taken out of the work block, not the evening',
   out.byId.work.minutes < p.byId.work.minutes - 80 &&
   out.byId.workout.end === p.byId.workout.end);
eq('going out still ends work at half six', out.byId.work.end, 18 * 60 + 30);

/* ------------------------------------------------------- the deadlines -- */

var late = planAt('13:50');
eq('waking at ten to two breaks the day', late.ok, false);
ok('and it says prayer is what broke',
   late.conflicts.some(function (c) { return c.id === 'pray'; }),
   JSON.stringify(late.conflicts.map(function (c) { return c.id; })));
ok('the conflict is stated in minutes, not vaguely',
   /40m/.test(late.conflicts.map(function (c) { return c.because; }).join(' ')));

var latest = S.latestViableWake(R, basic);
eq('the last wake time that still clears everything', S.fmt(latest), '13:10');
eq('one minute later does not clear', S.plan(R, Object.assign({ wake: S.fmt(latest + 1) }, basic)).ok, false);
eq('that wake time does clear', S.plan(R, Object.assign({ wake: S.fmt(latest) }, basic)).ok, true);

// With prayer out of the picture the binding deadline moves to the evening.
var walkLatest = S.latestViableWake(R, Object.assign({ midday: 'walk' }, basic));
ok('dropping prayer lets you sleep later', walkLatest > latest,
   'pray ' + S.fmt(latest) + ' vs walk ' + S.fmt(walkLatest));

// A long enough workout has to bite eventually. After a late sunset the
// evening has a fixed amount of room in it, and the planner should say so
// rather than quietly finishing after the deadline.
var longWorkout = planAt('07:00', { workoutMinutes: 60 });
eq('an hour long workout still fits', longWorkout.ok, true);
ok('an hour long workout eats the slack',
   longWorkout.byId.workout.slack < p.byId.workout.slack);

var hugeWorkout = planAt('07:00', { workoutMinutes: 120 });
eq('two hours does not fit after a half past seven sunset', hugeWorkout.ok, false);
eq('and the overrun is measured, not guessed', hugeWorkout.byId.workout.missedBy, 19);
ok('the blocks that would have to move are named too',
   hugeWorkout.conflicts.map(function (c) { return c.id; }).join(' ') ===
   'dusk productive workout',
   hugeWorkout.conflicts.map(function (c) { return c.id; }).join(' '));

/* ------------------------------------------------------------- slack ---- */

ok('slack is reported against the binding deadline, not the next block',
   p.byId.recite.binding === 'workout',
   'got ' + p.byId.recite.binding);
ok('an early start leaves more slack than a late one',
   planAt('06:00').byId.pray.slack > planAt('11:00').byId.pray.slack);
eq('the morning is bounded by the half hour rule, whatever else is true',
   p.byId.ready.slack, 30);

/* -------------------------------------------------------- winter days --- */

// The short-day case is the interesting one: sunset lands before the evening
// blocks are due, so the walk is squeezed and the reading is not.
var winter = S.plan(R, { wake: '07:00', sunrise: 7 * 60 + 16, sunset: 16 * 60 + 32 });
eq('a winter walk is still placed in the morning', winter.byId.walk.end < 16 * 60 + 32, true);
eq('a winter evening reading follows reciting rather than waiting',
   winter.byId.dusk.start, winter.byId.recite.end);
eq('the short day is still workable', winter.ok, true);

var winterLate = S.plan(R, { wake: '15:30', sunrise: 7 * 60 + 16, sunset: 16 * 60 + 32 });
eq('waking after the walk deadline breaks it', winterLate.ok, false);
ok('and the walk is named', winterLate.conflicts.some(function (c) { return c.id === 'walk'; }));

/* -------------------------------------------------------- no sunset ----- */

var polar = S.plan(R, { wake: '07:00', sunrise: null, sunset: null });
eq('a day without a sunset still plans', polar.ok, true);
eq('the walk has no sun deadline to miss', polar.byId.walk.deadline, null);
eq('the evening reading falls in behind reciting', polar.byId.dusk.start, polar.byId.recite.end);
ok('and nothing comes out as not-a-number',
   polar.blocks.every(function (b) { return isFinite(b.start) && isFinite(b.end); }));

/* -------------------------------------------------------------- sweep --- */

/*
 * Every wake time in the day, against every combination of options, at eight
 * sunsets from an arctic winter to an equatorial evening. For each plan:
 *
 *   - no block starts before something it depends on has finished
 *   - no block runs to a non-integer or non-finite minute
 *   - and, when the plan reports itself clear, every hard deadline is met
 *
 * That last one is the whole contract. A planner that quietly reports a broken
 * day as fine is worse than no planner.
 */
var sunsets = [null, 15 * 60 + 50, 16 * 60 + 32, 17 * 60 + 45, 18 * 60 + 30,
  19 * 60 + 33, 20 * 60 + 31, 21 * 60 + 40];
var middays = ['pray', 'walk', 'both'];
var checked = 0, badOrder = 0, badNumber = 0, falseClear = 0, worst = null;

sunsets.forEach(function (ss) {
  middays.forEach(function (md) {
    [false, true].forEach(function (go) {
      [20, 30, 60].forEach(function (wo) {
        for (var m = 0; m < 24 * 60; m += 7) {
          var pl = S.plan(R, {
            wake: S.fmt(m), midday: md, goingOut: go, workoutMinutes: wo,
            sunrise: ss === null ? null : ss - 13 * 60, sunset: ss
          });
          checked++;

          pl.blocks.forEach(function (b) {
            if (!isFinite(b.start) || !isFinite(b.end) ||
                b.start % 1 !== 0 || b.end % 1 !== 0 || b.end < b.start) badNumber++;
            var spec = R.blocks.filter(function (x) { return x.id === b.id; })[0];
            (spec.after || []).forEach(function (dep) {
              var d = pl.byId[dep];
              if (d && b.start < d.end) badOrder++;
            });
          });

          if (pl.ok) {
            pl.blocks.forEach(function (b) {
              if (b.hard && b.deadline !== null && b.end > b.deadline) {
                falseClear++;
                if (!worst) worst = b.id + ' at wake ' + S.fmt(m) + ' sunset ' + S.fmt(ss) +
                  ': ends ' + S.fmt(b.end) + ', due ' + S.fmt(b.deadline);
              }
            });
            if (pl.byId.ready && pl.byId.ready.start > pl.byId.wake.end + 30) {
              falseClear++;
            }
          }
        }
      });
    });
  });
});

eq('sweep: nothing starts before its dependency finishes', badOrder, 0);
eq('sweep: every time is a whole finite minute', badNumber, 0);
eq('sweep: a plan reported clear never misses a hard deadline', falseClear, 0, worst);

/* ------------------------------------------------------------ routine --- */

var ids = {};
R.blocks.forEach(function (b) {
  ok('routine: ' + b.id + ' has a label', !!b.label);
  ok('routine: ' + b.id + ' has a note', !!b.note && b.note.length > 12);
  ok('routine: ' + b.id + ' has a kind', !!b.kind);
  ok('routine: ' + b.id + ' is unique', !ids[b.id]);
  ids[b.id] = true;
  ok('routine: ' + b.id + ' has a sane duration', b.minutes >= 0 && b.minutes <= 600);
  (b.after || []).forEach(function (d) {
    ok('routine: ' + b.id + ' depends on a block that exists',
       R.blocks.some(function (x) { return x.id === d; }), 'missing ' + d);
  });
  if (b.finishBy) {
    ok('routine: ' + b.id + ' has a resolvable deadline',
       S.resolve(b.finishBy, { sunset: SUNSET }) !== null);
  }
});
eq('routine: the defaults parse', S.parseClock(R.defaults.wake) !== null, true);

/* ------------------------------------------------------------- position - */

var pos = S.positionAt(p, 10 * 60);
eq('at ten in the morning you are at work', pos.current.id, 'work');
eq('and the next thing up is reciting', pos.next.id, 'recite');
var before = S.positionAt(p, 3 * 60);
eq('before waking there is nothing current', before.current, null);
eq('and the next thing is getting ready', before.next.id, 'ready');
ok('progress through the day is bounded', before.through >= 0 && before.through <= 1);

/* ------------------------------------------------------------------ run - */

console.log('\n' + (fail ? '✗ FAIL' : '✓ PASS') +
            '  ' + pass + ' passed, ' + fail + ' failed');
if (fail) {
  console.log('\nFailures:\n  - ' + failures.slice(0, 40).join('\n  - '));
  if (failures.length > 40) console.log('  ... and ' + (failures.length - 40) + ' more');
  process.exit(1);
}
console.log('  ' + checked.toLocaleString('en-US') + ' plans swept across ' +
            sunsets.length + ' sunsets, ' + middays.length + ' midday choices and 6 other settings');
console.log('  latest viable wake on a ' + S.fmt(SUNSET) + ' sunset: ' + S.fmt(latest));
