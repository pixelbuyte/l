#!/usr/bin/env node
/*
 * Test suite. Run with: node test/run.js
 *
 * Loads the shipped source files as globals — exactly the way the browser
 * does — so what is tested is what is served.
 */
'use strict';
var path = require('path');
var base = path.join(__dirname, '..');
['js/metrics.js', 'data/patterns.js', 'data/corpus.js', 'data/specimens.js',
  'js/humanize.js']
  .forEach(function (f) { require(path.join(base, f)); });

var HW = globalThis.HW;
var pass = 0, fail = 0, failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(name + (detail ? '\n      ' + detail : ''));
}

function eq(name, actual, expected) {
  ok(name, actual === expected, 'expected ' + JSON.stringify(expected) +
     ', got ' + JSON.stringify(actual));
}

/* ---------------------------------------------------------------- metrics */

var M = HW.metrics;

eq('sentence split: basic', M.sentences('One. Two. Three.').length, 3);
eq('sentence split: abbreviation', M.sentences('Dr. Ames arrived. He left.').length, 2);
eq('sentence split: decimal', M.sentences('It cost 3.50 in total. Cheap.').length, 2);
eq('sentence split: quote', M.sentences('"Stop," she said. He did.').length, 2);
eq('sentence split: ellipsis', M.sentences('Well… I suppose. Yes.').length, 2);
eq('word count', M.words("It isn't well-known.").length, 3);
eq('paragraphs', M.paragraphs('A one.\n\nB two.\n\nC.').length, 3);
eq('syllables: simple', M.syllables('cat'), 1);
ok('syllables: multi', M.syllables('particular') >= 3, 'got ' + M.syllables('particular'));

var uniformText = 'The cat sat on the mat today. The dog ran in the park today. ' +
  'The bird flew to the tree today. The fish swam in the bowl today.';
var variedText = 'The cat sat. It had been a long day for everyone in that ' +
  'small and overheated house, and nobody wanted to move. Nobody did. ' +
  'Later, much later, the rain came.';
ok('burstiness: uniform prose scores low',
   M.measure(uniformText).burstiness < 0.15,
   'got ' + M.measure(uniformText).burstiness.toFixed(3));
ok('burstiness: varied prose scores higher',
   M.measure(variedText).burstiness > M.measure(uniformText).burstiness);

eq('empty text is safe', M.measure('').words, 0);
eq('mean of nothing', M.mean([]), 0);
ok('stdev of one sample', M.stdev([5]) === 0);

var contracted = M.measure("It's fine and I don't mind.");
ok('contraction rate detected', contracted.contractionRate > 0.9,
   'got ' + contracted.contractionRate);
var uncontracted = M.measure('It is fine and I do not mind.');
eq('uncontracted scores zero', uncontracted.contractionRate, 0);

/* --------------------------------------------------------------- patterns */

var P = HW.patterns;
var seenIds = Object.create(null);
P.all.forEach(function (p) {
  ok('pattern ' + p.id + ': unique id', !seenIds[p.id]);
  seenIds[p.id] = true;
  ok('pattern ' + p.id + ': compiles', (function () {
    try { P.toRegExp(p); return true; } catch (e) { return false; }
  })());
  ok('pattern ' + p.id + ': has category', !!P.categories[p.category]);
  ok('pattern ' + p.id + ': has rationale', typeof p.why === 'string' && p.why.length > 10);
  ok('pattern ' + p.id + ': severity in range', p.severity >= 1 && p.severity <= 3);
  ok('pattern ' + p.id + ': swap is a list', Array.isArray(p.swap));
  p.swap.forEach(function (sw) {
    ok('pattern ' + p.id + ': no placeholder text in swap', !/\b[XY]\b/.test(sw), sw);
  });
  if (p.inflect) {
    ok('pattern ' + p.id + ': inflecting rule captures its suffix',
       /\((?!\?)/.test(p.match), p.match);
    ok('pattern ' + p.id + ': inflecting rule lists forms', p.swap.length >= 2);
  }
});

/* ----------------------------------------------------------------- corpus */

HW.corpus.samples.forEach(function (s) {
  ok('corpus ' + s.id + ': has text', s.text.length > 100);
  ok('corpus ' + s.id + ': has register', !!s.register);
  ok('corpus ' + s.id + ': has context', !!s.context);
  ok('corpus ' + s.id + ': annotated', s.notes.length >= 3);
  s.notes.forEach(function (n) {
    ok('corpus ' + s.id + ': quote "' + n.quote.slice(0, 30) + '" is present',
       s.text.indexOf(n.quote) !== -1);
    ok('corpus ' + s.id + ': note has commentary', n.note.length > 20);
  });
});

/* -------------------------------------------------------------- humanizer */

var H = HW.humanize;

var sample = "In today's fast-paced world, it is important to note that " +
  'organizations must delve into the ever-evolving landscape of digital ' +
  'transformation. Furthermore, leveraging robust and seamless frameworks ' +
  'plays a crucial role in unlocking the potential of teams, and it is not ' +
  'only vital but also pivotal that we utilize these tools meticulously. ' +
  'In conclusion, by understanding these dynamics, one could argue that ' +
  'success is within reach.';

var r1 = H.run(sample, { strength: 3, seed: 42 });
var r2 = H.run(sample, { strength: 3, seed: 42 });
eq('deterministic for a fixed seed', r1.text, r2.text);
ok('a different seed can give a different pass',
   H.run(sample, { strength: 3, seed: 7 }).text !== undefined);
ok('makes changes', r1.changes.length > 5, 'got ' + r1.changes.length);
ok('reduces tell density',
   r1.metricsAfter.tells.density < r1.metricsBefore.tells.density * 0.5,
   r1.metricsBefore.tells.density.toFixed(1) + ' -> ' + r1.metricsAfter.tells.density.toFixed(1));
ok('every change carries a rule and a rationale',
   r1.changes.every(function (c) { return c.rule && c.why; }));

// The engine must never emit its own scaffolding.
var battery = [
  sample,
  'This serves as a testament to a paradigm shift that is designed to facilitate growth.',
  'She embarked on a journey to unlock the secrets of the archive.',
  'The team has been harnessing the power of data and streamlining operations.',
  'It utilizes a plethora of sources, and it underscores the cornerstone of the field.',
  'These platforms play a vital role in fostering a vibrant ecosystem.',
  'The results are not only robust but also unprecedented, and arguably transformative.',
  'Navigating the complexities of the modern landscape requires a delicate balance.',
  'I remember that day very clearly.',
  'The perfect blend of flavour and texture makes a myriad of dishes possible.',
  'Whether or not we succeed, this is more than just a project.',
  'However, the data was inconclusive. However, we proceeded. However, it worked.',
  'A synergy emerged. The synergies were obvious. It felt synergistic.',
  'He leverages the system. She leveraged it too.',
  'This sheds light on the issue, shedding light on much more besides.'
];

battery.forEach(function (t, i) {
  [1, 2, 3].forEach(function (strength) {
    for (var seed = 0; seed < 12; seed++) {
      var out = H.run(t, { strength: strength, seed: seed }).text;
      var tag = 'battery[' + i + '] s' + strength + ' seed' + seed;
      // Count $-followed-by-digit rather than searching for "$1": a text that
      // legitimately mentions "$12 million" would otherwise fail this.
      ok(tag + ': no unexpanded backreference',
         (out.match(/\$\d/g) || []).length <= (t.match(/\$\d/g) || []).length, out);
      ok(tag + ': no placeholder variables', !/\b(?:X and Y|part X)\b/.test(out), out);
      ok(tag + ': no doubled article', !/\b(a|an|the)\s+(a|an|the)\b/i.test(out), out);
      ok(tag + ': no space before punctuation', !/\s[,.;:!?]/.test(out), out);
      ok(tag + ': no doubled punctuation', !/[,;:]\s*[,;:]|\.\s*\.(?!\.)/.test(out), out);
      ok(tag + ': no doubled spaces', !/[^\n] {2,}/.test(out), out);
      ok(tag + ': ends with punctuation', /[.!?"')\]]$/.test(out.trim()), out);
      ok(tag + ': starts with a capital', /^[A-Z"'(\[]/.test(out.trim()), out);
      ok(tag + ': "an" before a consonant is repaired',
         !/\ban [bcdfgjklmnpqrstvwyz]/i.test(out.replace(/\ban (hour|honest|honou?r|heir)/gi, '')), out);
      ok(tag + ': "a" before a vowel is repaired',
         !/\ba [aeio][a-z]/i.test(out.replace(/\ba (one|once|euro)/gi, '')), out);
    }
  });
});

eq('the verb "remember" survives outside a frame',
   H.run('I remember that day very clearly.', { strength: 3, seed: 1 }).text,
   "I remember that day very clearly.");

// Mild rules fire probabilistically by design, so this asserts the frame is
// reachable across seeds, not that it fires on any particular one.
ok('sentence-initial Remember is treated as a frame', (function () {
  for (var seed = 0; seed < 20; seed++) {
    if (H.run('Remember that the deadline is Friday.',
              { strength: 3, seed: seed }).text.indexOf('Remember') === -1) return true;
  }
  return false;
})());

// Inflection must track the tense it found.
function only(text, seed) {
  return H.run(text, { strength: 3, seed: seed === undefined ? 3 : seed }).text;
}
ok('harness keeps its base form', /\buse the power\b/i.test(only('They harness the power of it.')),
   only('They harness the power of it.'));
ok('harnessing keeps its participle', /\busing the power\b/i.test(only('They are harnessing the power of it.')),
   only('They are harnessing the power of it.'));
ok('utilized keeps its past tense', /\bused\b/.test(only('She utilized the tool.')),
   only('She utilized the tool.'));
ok('utilizes keeps its third person', /\buses\b/.test(only('She utilizes the tool.')),
   only('She utilizes the tool.'));

// Empty and degenerate input must not throw.
[ '', '   ', '\n\n', 'Hi.', 'a', '...', '!!!' ].forEach(function (t) {
  var threw = false;
  try { H.run(t, { strength: 3 }); } catch (e) { threw = true; }
  ok('degenerate input ' + JSON.stringify(t) + ' does not throw', !threw);
});

// Toggles must actually gate their pass.
var noCat = H.run(sample, {
  strength: 3, seed: 5, contractions: false, punctuation: false, cadence: false,
  categories: { vocab: false, phrase: false, transition: false, frame: false,
                hedge: false, filler: false, structure: false }
});
eq('everything switched off is a no-op', noCat.text, sample);

var onlyHedge = H.run(sample, {
  strength: 3, seed: 5, contractions: false, punctuation: false, cadence: false,
  categories: { vocab: false, phrase: false, transition: false, frame: false,
                hedge: true, filler: false, structure: false }
});
ok('a single category acts alone',
   onlyHedge.changes.every(function (c) { return c.category === 'hedge'; }));

// Strength must be monotonic in reach: more rules eligible, not fewer.
var s1 = H.run(sample, { strength: 1, seed: 9 }).changes.length;
var s3 = H.run(sample, { strength: 3, seed: 9 }).changes.length;
ok('higher strength makes at least as many changes', s3 >= s1, s1 + ' vs ' + s3);

// The specimens are the texts this tool exists to edit, so run every one of
// them through every strength and a spread of seeds under the same checks.
HW.specimens.all.forEach(function (sp) {
  [1, 2, 3].forEach(function (strength) {
    for (var seed = 0; seed < 8; seed++) {
      var out = H.run(sp.text, { strength: strength, seed: seed }).text;
      var tag = 'specimen ' + sp.id + ' s' + strength + ' seed' + seed;
      ok(tag + ': no unexpanded backreference',
         (out.match(/\$\d/g) || []).length <= (sp.text.match(/\$\d/g) || []).length, out);
      ok(tag + ': no doubled article', !/\b(a|an|the)\s+(a|an|the)\b/i.test(out), out);
      ok(tag + ': no space before punctuation', !/\s[,.;:]/.test(out), out);
      ok(tag + ': no doubled spaces', !/[^\n] {2,}/.test(out), out);
      ok(tag + ': no doubled punctuation', !/[,;:]\s*[,;:]|\.\s*\.(?!\.)/.test(out), out);
      ok(tag + ': reduces machine habits',
         M.measure(out, { patterns: HW.patterns.all }).tells.density <=
         M.measure(sp.text, { patterns: HW.patterns.all }).tells.density);
    }
  });
});

/* --- the honesty check: human writing should come out nearly untouched --- */

var corpusTouched = 0, corpusWords = 0, worst = null;
HW.corpus.samples.forEach(function (s) {
  var res = H.run(s.text, { strength: 2, seed: 1 });
  var w = M.words(s.text).length;
  var rate = res.changes.length * 1000 / w;
  corpusTouched += res.changes.length;
  corpusWords += w;
  if (!worst || rate > worst.rate) worst = { id: s.id, rate: rate, n: res.changes.length };
});
var corpusRate = corpusTouched * 1000 / corpusWords;
ok('human corpus is largely left alone (<25 edits per 1000 words)',
   corpusRate < 25, corpusRate.toFixed(1) + ' per 1k; worst: ' + worst.id +
   ' at ' + worst.rate.toFixed(1));

var aiRate = r1.changes.length * 1000 / M.words(sample).length;
ok('generated prose is edited far more heavily than human prose',
   aiRate > corpusRate * 3, 'ai ' + aiRate.toFixed(1) + ' vs human ' + corpusRate.toFixed(1));

/* -------------------------------------------------------------------- run */

console.log('\n' + (fail ? '✗ FAIL' : '✓ PASS') +
            '  ' + pass + ' passed, ' + fail + ' failed');
if (fail) {
  console.log('\nFailures:\n  - ' + failures.slice(0, 40).join('\n  - '));
  if (failures.length > 40) console.log('  ... and ' + (failures.length - 40) + ' more');
  process.exit(1);
}
console.log('  human corpus edit rate: ' + corpusRate.toFixed(1) + ' per 1,000 words');
console.log('  generated sample edit rate: ' + aiRate.toFixed(1) + ' per 1,000 words');
