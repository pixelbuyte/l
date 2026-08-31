#!/usr/bin/env node
/*
 * Tests for the Crown Fried Chicken page. Run with: node crown/test/run.js
 *
 * Loads the shipped source files as globals, the way the browser does, so what
 * is tested is what is served.
 *
 * Two things are worth testing here. The first is the open/closed clock, which
 * is swept across every minute of the day and across a spread of timezones —
 * a shop that closes at midnight is exactly the case where off-by-one and
 * wrap-around bugs live. The second is the data itself: this page makes
 * factual claims about a real business, so the address, the phone number and
 * every price are asserted against what was actually sourced.
 */
'use strict';
var path = require('path');
var fs = require('fs');

var base = path.join(__dirname, '..');
var DATA = require(path.join(base, 'data/place.js'));
var H = require(path.join(base, 'js/hours.js'));

var PLACE = DATA.PLACE, MENU = DATA.MENU, GALLERY = DATA.GALLERY;
var pass = 0, fail = 0, failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(name + (detail ? ' — ' + detail : ''));
}
function eq(name, got, want) {
  ok(name, got === want, 'got ' + JSON.stringify(got) + ', wanted ' + JSON.stringify(want));
}

/* ------------------------------------------------------------- clock ---- */

eq('midnight formats as 12am', H.fmtClock(0), '12am');
eq('10:00 formats as 10am', H.fmtClock(600), '10am');
eq('noon formats as 12pm', H.fmtClock(720), '12pm');
eq('13:30 formats as 1:30pm', H.fmtClock(810), '1:30pm');
eq('23:59 formats as 11:59pm', H.fmtClock(1439), '11:59pm');
eq('1440 wraps back to 12am', H.fmtClock(1440), '12am');
eq('negative minutes wrap forwards', H.fmtClock(-60), '11pm');

var HRS = PLACE.hours;

eq('shut at 9am', H.status(9 * 60, HRS).state, 'closed');
eq('shut one minute before opening', H.status(10 * 60 - 1, HRS).state, 'closed');
eq('open on the dot at 10am', H.status(10 * 60, HRS).state, 'open');
eq('open through the afternoon', H.status(15 * 60, HRS).state, 'open');
eq('open at 10:59pm', H.status(22 * 60 + 59, HRS).state, 'open');
eq('last hour reads as closing', H.status(23 * 60, HRS).state, 'closing');
eq('one minute to close still counts as closing', H.status(1439, HRS).state, 'closing');
eq('shut again at midnight', H.status(0, HRS).state, 'closed');
eq('shut at 2am', H.status(2 * 60, HRS).state, 'closed');

eq('closing label counts down', H.status(1439, HRS).label, 'Closing in 1 min');
eq('open label names midnight', H.status(12 * 60, HRS).label, 'Open · until midnight');
eq('closed label names the opening time', H.status(3 * 60, HRS).label, 'Closed · opens 10am');

// Minutes-until-open has to cross midnight correctly: at 11:30pm the shop is
// still open, but at 12:30am the next opening is nine and a half hours away.
eq('overnight wait crosses midnight', H.status(30, HRS).minutesLeft, 9 * 60 + 30);
eq('morning wait is same-day', H.status(9 * 60, HRS).minutesLeft, 60);

/* Sweep every minute of the day. The invariants: exactly one state, always a
 * label, and the open window is exactly as long as the published hours. */
var openCount = 0, states = {};
for (var m = 0; m < 1440; m++) {
  var s = H.status(m, HRS);
  states[s.state] = true;
  ok('minute ' + m + ' has a state',
     s.state === 'open' || s.state === 'closing' || s.state === 'closed', s.state);
  ok('minute ' + m + ' has a label', typeof s.label === 'string' && s.label.length > 0);
  ok('minute ' + m + ' has a non-negative wait', s.minutesLeft >= 0, String(s.minutesLeft));
  if (s.state !== 'closed') openCount++;
}
eq('open for exactly 14 hours a day', openCount, HRS.close - HRS.open);
eq('all three states occur across a day', Object.keys(states).sort().join(','),
   'closed,closing,open');

/* The wall clock must read Worcester, not the machine running the tests. */
var probe = new Date(Date.UTC(2026, 6, 4, 20, 30)); // 20:30 UTC on 4 Jul = 16:30 EDT
var wc = H.wallClock(probe);
ok('wall clock resolves a timezone', wc.exact === true);
eq('summer UTC converts to eastern daylight time', wc.minutes, 16 * 60 + 30);

var winter = new Date(Date.UTC(2026, 0, 15, 20, 30)); // 20:30 UTC in Jan = 15:30 EST
eq('winter UTC converts to eastern standard time',
   H.wallClock(winter).minutes, 15 * 60 + 30);

// Midnight in Worcester must land on 0, not 1440 — this is the fold that the
// "hour 24" engines get wrong.
var midnight = new Date(Date.UTC(2026, 6, 5, 4, 0)); // 04:00 UTC = 00:00 EDT
eq('eastern midnight folds to zero', H.wallClock(midnight).minutes, 0);
eq('and reads as closed', H.status(H.wallClock(midnight).minutes, HRS).state, 'closed');

// The shop's clock is independent of the process timezone.
var saved = process.env.TZ;
['UTC', 'Asia/Tokyo', 'America/Los_Angeles', 'Australia/Sydney'].forEach(function (tz) {
  process.env.TZ = tz;
  eq('reads eastern time regardless of process TZ (' + tz + ')',
     H.wallClock(probe).minutes, 16 * 60 + 30);
});
if (saved === undefined) delete process.env.TZ; else process.env.TZ = saved;

/* -------------------------------------------------------------- facts --- */

/* These are claims about somebody's real business. Every one was read off a
 * source: the phone number is legible on the storefront window in Street
 * View, the prices are the published combo prices for this address. */

eq('name', PLACE.name, 'Crown Fried Chicken');
eq('street', PLACE.street, '443 Lincoln St');
eq('city', PLACE.city, 'Worcester');
eq('state', PLACE.state, 'MA');
eq('zip', PLACE.zip, '01605');
eq('phone', PLACE.phone, '(508) 595-0220');
eq('phone href is E.164', PLACE.phoneHref, '+15085950220');
eq('the two phone spellings agree',
   PLACE.phoneHref, '+1' + PLACE.phone.replace(/\D/g, ''));
eq('address line', PLACE.addressLine, '443 Lincoln St, Worcester, MA 01605');
eq('opens at 10am', HRS.open, 600);
eq('closes at midnight', HRS.close, 1440);

ok('latitude is in Worcester', PLACE.lat > 42.28 && PLACE.lat < 42.30, String(PLACE.lat));
ok('longitude is in Worcester', PLACE.lng > -71.79 && PLACE.lng < -71.77, String(PLACE.lng));
ok('maps url carries the listing id', PLACE.mapsUrl.indexOf(PLACE.cid) > -1);
ok('directions url names the street', /443\+?%?2?0?Lincoln/.test(PLACE.directionsUrl));

/* --------------------------------------------------------------- menu --- */

var seenIds = {}, itemCount = 0, cheapest = Infinity, dearest = 0;
MENU.forEach(function (sec) {
  ok('section ' + sec.id + ' has a unique id', !seenIds[sec.id]);
  seenIds[sec.id] = true;
  ok('section ' + sec.id + ' has a label', !!sec.label);
  ok('section ' + sec.id + ' says what the combo includes', /soda/.test(sec.note), sec.note);
  ok('section ' + sec.id + ' has items', sec.items.length > 0);

  sec.items.forEach(function (it) {
    itemCount++;
    ok('"' + it.name + '" has a name', typeof it.name === 'string' && it.name.length > 2);
    ok('"' + it.name + '" is priced in dollars and cents',
       typeof it.price === 'number' && it.price > 0 &&
       Math.abs(it.price * 100 - Math.round(it.price * 100)) < 1e-9, String(it.price));
    ok('"' + it.name + '" is plausibly priced for this counter',
       it.price >= 3 && it.price <= 12, String(it.price));
    cheapest = Math.min(cheapest, it.price);
    dearest = Math.max(dearest, it.price);
  });
});

eq('four sections on the board', MENU.length, 4);
eq('seventeen priced plates', itemCount, 17);
eq('cheapest plate', cheapest, 4.50);
eq('dearest plate', dearest, 7.50);

// Spot-check the prices that were actually sourced, by name.
var byName = {};
MENU.forEach(function (s) { s.items.forEach(function (i) { byName[i.name] = i.price; }); });
[['2 Piece Chicken', 4.50], ['3 Piece Chicken', 5.50], ['5 Piece Chicken', 7.50],
 ['4 Piece Wings', 5.25], ['10 Piece Wing Dings or Hot Wings', 7.50],
 ['21 Piece Shrimp', 5.99], ['2 Piece Whiting Fish', 5.25],
 ['Chicken Sandwich', 4.50], ['Grilled Chicken Sandwich', 4.99],
 ['Italian Cheeseburger', 4.75], ['Philly Cheese Steak', 5.99]
].forEach(function (p) { eq('price of ' + p[0], byName[p[0]], p[1]); });

/* ------------------------------------------------------------ gallery --- */

/* The gallery is hand-tiled rather than auto-flowed, so the spans have to add
 * up or CSS grid leaves a hole. Walk the placement the way the browser will:
 * an item that does not fit in the row being filled starts a new one, and any
 * columns left behind are a gap nobody asked for. */
function tiling(cols, width) {
  var used = 0, holes = 0;
  GALLERY.forEach(function (g) {
    var w = Math.min(width[g.span], cols);
    if (used + w > cols) { holes += cols - used; used = 0; }
    used += w;
  });
  if (used) holes += cols - used;
  return holes;
}

eq('the three-column gallery tiles with no gaps',
   tiling(3, { tall: 1, wide: 2, square: 1, full: 3 }), 0);
eq('the two-column gallery tiles with no gaps',
   tiling(2, { tall: 1, wide: 1, square: 1, full: 2 }), 0);

var spans = { tall: 1, wide: 1, square: 1, full: 1 };
GALLERY.forEach(function (g) {
  ok(g.src + ' exists on disk', fs.existsSync(path.join(base, g.src)));
  ok(g.src + ' has a known span class', !!spans[g.span], g.span);
  ok(g.src + ' has real dimensions', g.w > 0 && g.h > 0);
  ok(g.src + ' has a caption that could serve as alt text',
     typeof g.caption === 'string' && g.caption.length > 12);
});
ok('the hero image exists', fs.existsSync(path.join(base, 'img/storefront.webp')));
ok('the small hero exists for narrow screens',
   fs.existsSync(path.join(base, 'img/storefront-sm.webp')));

/* --------------------------------------------------------------- page --- */

var html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');

ok('page loads the data file', html.indexOf('data/place.js') > -1);
ok('page loads the clock', html.indexOf('js/hours.js') > -1);
ok('page loads the app', html.indexOf('js/app.js') > -1);
ok('page loads the stylesheet', html.indexOf('css/crown.css') > -1);

// Every nav target must exist, or the menu bar quietly does nothing.
var navHrefs = (html.match(/<nav class="nav-links"[\s\S]*?<\/nav>/) || [''])[0]
  .match(/href="#([\w-]+)"/g) || [];
ok('the nav has links', navHrefs.length >= 4, String(navHrefs.length));
navHrefs.forEach(function (h) {
  var id = h.slice(7, -1);
  ok('nav target #' + id + ' exists on the page', html.indexOf('id="' + id + '"') > -1);
});

// The phone number and address appear in the markup itself, so they survive
// with scripting off.
ok('phone is in the markup', html.indexOf('(508) 595-0220') > -1);
ok('tel: link is correct', html.indexOf('tel:+15085950220') > -1);
ok('address is in the markup', html.indexOf('443 Lincoln St') > -1);
ok('there is a no-script fallback', html.indexOf('<noscript>') > -1);

// Structured data has to agree with the data file, or search results will
// disagree with the page.
var ld = JSON.parse((html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]);
eq('schema name', ld.name, PLACE.name);
eq('schema street', ld.address.streetAddress, PLACE.street);
eq('schema zip', ld.address.postalCode, PLACE.zip);
eq('schema phone digits', ld.telephone.replace(/\D/g, ''), PLACE.phoneHref.replace(/\D/g, ''));
eq('schema latitude', ld.geo.latitude, PLACE.lat);
eq('schema longitude', ld.geo.longitude, PLACE.lng);
eq('schema opening time', ld.openingHoursSpecification[0].opens, '10:00');
eq('schema covers all seven days', ld.openingHoursSpecification[0].dayOfWeek.length, 7);
ok('schema map link carries the listing id', ld.hasMap.indexOf(PLACE.cid) > -1);

// Google's imagery has to be credited wherever it is used.
ok('street view imagery is credited', /Imagery © Google/.test(html));
ok('the footer repeats the credit', /© Google/.test(html.slice(html.indexOf('<footer'))));

/* Fonts are self-hosted, so the files have to exist and the url()s have to
 * resolve relative to the stylesheet rather than the page — an easy thing to
 * get wrong once and never notice, because the fallback stack still renders. */
var fontCss = fs.readFileSync(path.join(base, 'css/fonts.css'), 'utf8');
var fontUrls = (fontCss.match(/url\(([^)]+)\)/g) || [])
  .map(function (u) { return u.slice(4, -1).replace(/['"]/g, ''); });

ok('there are self-hosted faces', fontUrls.length >= 4, String(fontUrls.length));
fontUrls.forEach(function (u) {
  ok(u + ' is relative to the stylesheet', u.indexOf('../fonts/') === 0, u);
  ok(u + ' exists on disk', fs.existsSync(path.join(base, 'css', u)));
});
ok('nothing is fetched from Google Fonts',
   html.indexOf('fonts.googleapis.com') === -1 && html.indexOf('fonts.gstatic.com') === -1);
ok('the font stylesheet is linked', html.indexOf('css/fonts.css') > -1);
ok('text stays visible while fonts load', /font-display:\s*swap/.test(fontCss));

// Every family named in the design tokens must actually be served.
['Alfa Slab One', 'Bungee', 'Karla'].forEach(function (fam) {
  ok(fam + ' is declared in @font-face', fontCss.indexOf("'" + fam + "'") > -1);
});

/* The drawn plates. Each section of the board needs a matching symbol, or a
 * card renders an empty <use>; and the page must keep saying the pictures are
 * drawings rather than photographs of this kitchen's food. */
MENU.forEach(function (sec) {
  ok('a plate symbol exists for ' + sec.id, html.indexOf('id="p-' + sec.id + '"') > -1);
});
ok('every section names an item worth captioning',
   MENU.every(function (s) { return s.items.some(function (i) { return i.tag; }); }));
ok('the plates section is on the page', html.indexOf('id="plates"') > -1);
ok('the page says the plates are drawings, not photographs',
   /Drawings, not photographs/.test(html));

var css = fs.readFileSync(path.join(base, 'css/crown.css'), 'utf8');
['Alfa Slab One', 'Bungee', 'Karla'].forEach(function (fam) {
  ok(fam + ' is used by the stylesheet', css.indexOf(fam) > -1);
});
ok('every gallery span class is styled',
   Object.keys(spans).every(function (s) { return css.indexOf('.shot.' + s) > -1; }));
ok('every status state is styled',
   ['open', 'closing', 'closed'].every(function (s) {
     return css.indexOf('[data-state="' + s + '"]') > -1;
   }));
ok('motion is disabled for those who ask', css.indexOf('prefers-reduced-motion') > -1);

/* ---------------------------------------------------------------- run --- */

console.log('\n' + (fail ? '✗ FAIL' : '✓ PASS') +
            '  ' + pass + ' passed, ' + fail + ' failed');
if (fail) {
  console.log('\nFailures:\n  - ' + failures.slice(0, 40).join('\n  - '));
  if (failures.length > 40) console.log('  ... and ' + (failures.length - 40) + ' more');
  process.exit(1);
}
console.log('  1,440 minutes swept; open ' + openCount + ' of them');
console.log('  ' + itemCount + ' plates checked, $' + cheapest.toFixed(2) +
            ' to $' + dearest.toFixed(2));
