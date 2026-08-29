/*
 * humanize.js — the rewrite engine.
 *
 * Design constraint, and the reason this can run entirely in the browser with
 * no model behind it: the engine may only DELETE text, SUBSTITUTE from the
 * fixed lexicon in data/patterns.js, or SPLIT a sentence at a coordinating
 * joint. It never generates a clause. So it cannot introduce a claim the
 * writer did not make — the failure mode is a flat rewrite, never a false one.
 *
 * Everything is seeded, so the same text and the same seed always produce the
 * same output. "Try another pass" just advances the seed.
 */
(function (root) {
  'use strict';

  var HW = (root.HW = root.HW || {});

  // --- seeded RNG (mulberry32) -------------------------------------------

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* -----------------------------------------------------------------------
   * Splicer — applies non-overlapping edits and keeps previously recorded
   * spans pointing at the right characters afterwards, so the UI can still
   * highlight a pass-one change after pass three has moved it.
   * --------------------------------------------------------------------- */

  function Splicer(text) {
    this.text = text;
    this.marks = [];
  }

  Splicer.prototype.apply = function (edits) {
    if (!edits.length) return;
    edits = edits.slice().sort(function (a, b) { return a.start - b.start; });

    // Drop any edit overlapping one already accepted.
    var accepted = [], lastEnd = -1;
    for (var i = 0; i < edits.length; i++) {
      if (edits[i].start >= lastEnd) {
        accepted.push(edits[i]);
        lastEnd = edits[i].end;
      }
    }

    var out = '', cursor = 0, shift = 0;
    var newMarks = [];
    for (var j = 0; j < accepted.length; j++) {
      var e = accepted[j];
      out += this.text.slice(cursor, e.start);
      var outStart = e.start + shift;
      out += e.replacement;
      shift += e.replacement.length - (e.end - e.start);
      cursor = e.end;
      if (e.meta) {
        newMarks.push({
          start: outStart,
          end: outStart + e.replacement.length,
          from: this.text.slice(e.start, e.end),
          to: e.replacement,
          rule: e.meta.rule,
          category: e.meta.category,
          why: e.meta.why,
          kind: e.replacement.trim() ? 'swap' : 'cut'
        });
      }
    }
    out += this.text.slice(cursor);

    // Move existing marks by the net shift of every edit that starts before
    // them. Marks whose text was consumed by an edit are dropped.
    var old = this.marks;
    this.marks = [];
    for (var k = 0; k < old.length; k++) {
      var m = old[k], delta = 0, killed = false;
      for (var n = 0; n < accepted.length; n++) {
        var a = accepted[n];
        if (a.end <= m.start) {
          delta += a.replacement.length - (a.end - a.start);
        } else if (a.start < m.end) {
          killed = true;
          break;
        }
      }
      if (!killed) {
        m.start += delta;
        m.end += delta;
        this.marks.push(m);
      }
    }
    this.marks = this.marks.concat(newMarks);
    this.marks.sort(function (x, y) { return x.start - y.start; });
    this.text = out;
  };

  /* -----------------------------------------------------------------------
   * Pass 1 — the pattern library
   * --------------------------------------------------------------------- */

  function matchCase(source, replacement) {
    if (!replacement) return replacement;
    var first = source.charAt(0);
    if (first === first.toUpperCase() && first !== first.toLowerCase()) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return replacement;
  }

  function expand(template, m) {
    return template.replace(/\$(\d)/g, function (_, d) {
      return m[Number(d)] || '';
    });
  }

  // Rules flagged `inflect` list their replacements as base / -s / -ed / -ing
  // and capture the matched suffix as group 1, so the rewrite keeps the tense
  // it found. Guessing from the word ending instead would turn "harness" into
  // "uses", because the base form already ends in s.
  var FORM_INDEX = { '': 0, e: 0, s: 1, es: 1, d: 2, ed: 2, ing: 3 };

  function inflected(p, m) {
    var suffix = (m[1] || '').toLowerCase();
    var idx = FORM_INDEX[suffix];
    if (idx === undefined) idx = 0;
    return p.swap[idx] !== undefined ? p.swap[idx] : p.swap[0];
  }

  function patternPass(sp, opts, rand) {
    var edits = [];
    HW.patterns.all.forEach(function (p) {
      if (!opts.categories[p.category]) return;
      if (p.severity < opts.minSeverity) return;

      var re = HW.patterns.toRegExp(p);
      var m;
      re.lastIndex = 0;
      while ((m = re.exec(sp.text)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }

        // Apply mild rules probabilistically so the output does not read as
        // a search-and-replace sweep. Giveaway rules always fire.
        var chance = p.severity === 3 ? 1 : (p.severity === 2 ? 0.85 : 0.6);
        if (rand() > chance) continue;

        var choice;
        if (p.swap.length === 0) {
          choice = '';
        } else {
          choice = p.inflect
            ? inflected(p, m)
            : p.swap[Math.floor(rand() * p.swap.length)];
          choice = expand(choice, m);
          choice = matchCase(m[0], choice);
        }
        edits.push({
          start: m.index,
          end: m.index + m[0].length,
          replacement: choice,
          meta: { rule: p.id, category: p.category, why: p.why }
        });
      }
    });
    sp.apply(edits);
  }

  /* -----------------------------------------------------------------------
   * Pass 2 — contractions
   * --------------------------------------------------------------------- */

  var CONTRACTIONS = [
    ['it is', "it's"], ['that is', "that's"], ['there is', "there's"],
    ['there are', "there're"], ['he is', "he's"], ['she is', "she's"],
    ['what is', "what's"], ['who is', "who's"], ['here is', "here's"],
    ['we are', "we're"], ['you are', "you're"], ['they are', "they're"],
    ['I am', "I'm"], ['do not', "don't"], ['does not', "doesn't"],
    ['did not', "didn't"], ['is not', "isn't"], ['are not', "aren't"],
    ['was not', "wasn't"], ['were not', "weren't"], ['cannot', "can't"],
    ['can not', "can't"], ['could not', "couldn't"], ['would not', "wouldn't"],
    ['should not', "shouldn't"], ['will not', "won't"], ['have not', "haven't"],
    ['has not', "hasn't"], ['had not', "hadn't"], ['I will', "I'll"],
    ['we will', "we'll"], ['you will', "you'll"], ['they will', "they'll"],
    ['I have', "I've"], ['we have', "we've"], ['you have', "you've"],
    ['they have', "they've"], ['I would', "I'd"], ['you would', "you'd"],
    ['let us', "let's"]
  ];

  function contractionPass(sp, opts, rand) {
    var edits = [];
    // Leave roughly one in six uncontracted: real writing is not uniform, and
    // an uncontracted form is often deliberate emphasis.
    var rate = opts.strength >= 3 ? 0.9 : (opts.strength === 2 ? 0.8 : 0.65);

    CONTRACTIONS.forEach(function (pair) {
      var re = new RegExp('\\b' + pair[0].replace(/ /g, '\\s+') + '\\b', 'gi');
      var m;
      while ((m = re.exec(sp.text)) !== null) {
        // "it is" ending a sentence is emphatic ("...is what it is."). Leave it.
        var after = sp.text.slice(m.index + m[0].length, m.index + m[0].length + 2);
        if (/^\s*[.!?,;]/.test(after) && / (is|are|am|have|will|would)$/i.test(m[0])) continue;
        if (rand() > rate) continue;
        edits.push({
          start: m.index,
          end: m.index + m[0].length,
          replacement: matchCase(m[0], pair[1]),
          meta: { rule: 'contraction', category: 'contraction',
                  why: 'Contractions are the clearest single marker of unedited human prose. Formal registers use fewer, never none.' }
        });
      }
    });
    sp.apply(edits);
  }

  /* -----------------------------------------------------------------------
   * Pass 3 — punctuation habits
   * --------------------------------------------------------------------- */

  function punctuationPass(sp, opts, rand) {
    var edits = [];
    var text = sp.text;

    // Em-dash thinning. One or two per page is a style; six is a fingerprint.
    var dashes = [];
    var dashRe = /\s*(—|--)\s*/g, dm;
    while ((dm = dashRe.exec(text)) !== null) dashes.push(dm);
    var keep = Math.max(1, Math.round(dashes.length * 0.35));
    if (dashes.length > 2) {
      for (var i = 0; i < dashes.length; i++) {
        if (i < keep) continue;
        if (rand() > 0.85) continue;
        edits.push({
          start: dashes[i].index,
          end: dashes[i].index + dashes[i][0].length,
          replacement: rand() < 0.6 ? ', ' : ' — ',
          meta: { rule: 'em-dash-thinning', category: 'punctuation',
                  why: 'Heavy em-dash use is one of the most reported surface tells. This thins them out rather than removing them.' }
        });
      }
    }

    // "However," at the head of a sentence is a written-register marker.
    var hre = /(^|[.!?]\s+)However,\s*/g, hm;
    while ((hm = hre.exec(text)) !== null) {
      if (rand() > 0.7) continue;
      var lead = hm[1];
      edits.push({
        start: hm.index,
        end: hm.index + hm[0].length,
        replacement: lead + (rand() < 0.5 ? 'But ' : 'Still, '),
        meta: { rule: 'however-fronted', category: 'punctuation',
                why: 'Sentence-initial "However," is far more common in generated prose than in edited human writing, which prefers "but".' }
      });
    }
    sp.apply(edits);
  }

  /* -----------------------------------------------------------------------
   * Pass 4 — cadence
   *
   * Raises burstiness (the variation in sentence length) by breaking sentences
   * at safe coordinating joints. It only ever splits where the right-hand side
   * already begins with something that can open a sentence, so no clause is
   * invented and none is left dangling.
   *
   * Note the choice of joint. Splitting at the MIDDLE of a sentence produces
   * two sentences of similar length, which lowers variance — the opposite of
   * what this pass is for. So it deliberately picks the most lopsided safe
   * joint available, producing a short sentence next to a long one.
   * --------------------------------------------------------------------- */

  var SAFE_OPENER = /^(?:I|we|you|he|she|it|they|this|that|these|those|there|the|a|an|his|her|its|their|our|my|your|most|many|some|few|each|every|both|no|one|two|three|people|users|customers|companies|researchers|[A-Z][a-z]+)\b/;

  function cadencePass(sp, opts, rand) {
    var edits = [];
    var text = sp.text;
    var sents = HW.metrics.sentences(text);
    var lens = sents.map(function (x) { return HW.metrics.words(x).length; });
    var mean = HW.metrics.mean(lens);

    // A fixed word threshold is the wrong test. What this pass is trying to
    // produce is a sentence that sits well below the document's own mean, so
    // the test is relative to that mean: only split a sentence longer than
    // average, and only where one half lands clearly under it.
    var minLen = Math.max(11, mean);
    var wantUnder = mean * (opts.strength >= 3 ? 0.85 : 0.7);
    var cursor = 0;

    sents.forEach(function (s) {
      var at = text.indexOf(s, cursor);
      if (at === -1) return;
      cursor = at + s.length;

      var len = HW.metrics.words(s).length;
      if (len < minLen) return;
      if (rand() > 0.85) return;

      // Candidate joints, in order of how cleanly they break.
      // An em dash or a colon very often joins two clauses that could each
      // stand alone, so both are treated as joints alongside the coordinators.
      var joints = [];
      var jre = /;\s+|\s+(?:—|--)\s+|:\s+|,\s+(?:and|but|so|yet)\s+/g, jm;
      while ((jm = jre.exec(s)) !== null) joints.push(jm);
      if (!joints.length) return;

      // Prefer the most lopsided safe joint: a short sentence beside a long
      // one is what raises variance, whereas splitting down the middle
      // produces two average sentences and lowers it. Both halves still have
      // to stand on their own.
      var best = null, bestScore = -1;
      joints.forEach(function (j) {
        var leftWords = HW.metrics.words(s.slice(0, j.index)).length;
        var rightWords = HW.metrics.words(s.slice(j.index + j[0].length)).length;
        if (leftWords < 4 || rightWords < 4) return;
        if (Math.min(leftWords, rightWords) > wantUnder) return;
        var rest = s.slice(j.index + j[0].length);
        if (!SAFE_OPENER.test(rest)) return;
        var score = Math.abs(leftWords - rightWords);
        if (score > bestScore) { bestScore = score; best = j; }
      });
      if (!best) return;

      var tail = s.slice(best.index + best[0].length);
      var conj = (best[0].match(/\b(and|but|so|yet)\b/) || [])[1];
      var replacement;
      // Keeping the conjunction at the head of the new sentence reads as
      // speech; dropping it reads as edited prose. Mix both.
      if (conj && rand() < 0.45) {
        replacement = '. ' + conj.charAt(0).toUpperCase() + conj.slice(1) + ' ';
      } else {
        replacement = '. ' + tail.charAt(0).toUpperCase();
      }

      var absStart = at + best.index;
      var absEnd = at + best.index + best[0].length;
      if (replacement.charAt(replacement.length - 1) !== ' ') absEnd += 1;

      edits.push({
        start: absStart,
        end: absEnd,
        replacement: replacement,
        meta: { rule: 'sentence-split', category: 'cadence',
                why: 'Long sentence broken at a coordinating joint. Human paragraphs vary sentence length far more than generated ones do.' }
      });
    });
    sp.apply(edits);
  }

  /* -----------------------------------------------------------------------
   * Pass 5 — repair the seams left by deletion
   * --------------------------------------------------------------------- */

  var AN_EXCEPTIONS = /^(?:hour|honest|honou?r|heir|honorary|honourable|MBA|MP|FBI|NHS|SQL|XML|HTML)/i;
  var A_EXCEPTIONS = /^(?:university|unique|user|useful|unit|union|used|one|once|euro|european|ubiquitous|utility|utopia|eulogy|ewe)/i;

  function cleanupPass(sp) {
    var edits = [];
    var text = sp.text;
    var m;

    // Collapse runs of spaces without touching paragraph breaks.
    var re1 = /[ \t]{2,}/g;
    while ((m = re1.exec(text)) !== null) {
      edits.push({ start: m.index, end: m.index + m[0].length, replacement: ' ' });
    }
    // Space before punctuation, stranded commas, doubled punctuation.
    var re2 = /\s+([,.;:!?])|([,;:])\s*[,;:]|\.\s*\./g;
    while ((m = re2.exec(text)) !== null) {
      var rep = m[1] ? m[1] : (m[2] ? m[2] : '.');
      edits.push({ start: m.index, end: m.index + m[0].length, replacement: rep });
    }
    // Leading punctuation at the start of a paragraph, left by a deletion.
    var re3 = /(^|\n)[ \t]*[,;:]\s*/g;
    while ((m = re3.exec(text)) !== null) {
      edits.push({ start: m.index, end: m.index + m[0].length, replacement: m[1] });
    }
    sp.apply(edits);

    // Re-capitalise sentence openings, then fix a/an. Done as separate passes
    // because the earlier repairs change where the sentences begin.
    text = sp.text;
    edits = [];
    var re4 = /(^|[.!?]\s+|\n\s*)([a-z])/g;
    while ((m = re4.exec(text)) !== null) {
      edits.push({
        start: m.index + m[1].length,
        end: m.index + m[1].length + 1,
        replacement: m[2].toUpperCase()
      });
    }
    sp.apply(edits);

    text = sp.text;
    edits = [];
    var re5 = /\b([Aa])(n?)\s+([A-Za-z][a-z’'-]*)/g;
    while ((m = re5.exec(text)) !== null) {
      var word = m[3];
      var vowelSound = /^[aeiou]/i.test(word);
      if (vowelSound && A_EXCEPTIONS.test(word)) vowelSound = false;
      if (!vowelSound && AN_EXCEPTIONS.test(word)) vowelSound = true;
      var want = m[1] + (vowelSound ? 'n' : '');
      if (want !== m[1] + m[2]) {
        edits.push({
          start: m.index,
          end: m.index + m[1].length + m[2].length,
          replacement: want
        });
      }
    }
    sp.apply(edits);

    // Trim trailing whitespace on each line.
    text = sp.text;
    edits = [];
    var re6 = /[ \t]+(?=\n|$)/g;
    while ((m = re6.exec(text)) !== null) {
      edits.push({ start: m.index, end: m.index + m[0].length, replacement: '' });
    }
    sp.apply(edits);
  }

  /* --------------------------------------------------------------------- */

  var ALL_CATEGORIES = ['vocab', 'phrase', 'transition', 'frame', 'hedge',
    'filler', 'structure'];

  function defaults() {
    var cats = {};
    ALL_CATEGORIES.forEach(function (c) { cats[c] = true; });
    return {
      strength: 2,
      seed: null,
      categories: cats,
      contractions: true,
      punctuation: true,
      cadence: true
    };
  }

  /**
   * Rewrite `text`. Returns the new text, every change made, and the metrics
   * for both versions so the UI can show the shift.
   */
  function run(text, options) {
    var opts = defaults();
    options = options || {};
    Object.keys(options).forEach(function (k) {
      if (k === 'categories' && options.categories) {
        Object.keys(options.categories).forEach(function (c) {
          opts.categories[c] = !!options.categories[c];
        });
      } else if (options[k] !== undefined && options[k] !== null) {
        opts[k] = options[k];
      }
    });
    opts.minSeverity = opts.strength >= 3 ? 1 : (opts.strength === 2 ? 2 : 3);

    var seed = opts.seed === null || opts.seed === undefined
      ? hash(text) : (opts.seed >>> 0);
    var rand = rng(seed);

    var before = String(text || '');
    var sp = new Splicer(before);

    patternPass(sp, opts, rand);
    if (opts.contractions) contractionPass(sp, opts, rand);
    // Cadence runs before punctuation: the punctuation pass thins em dashes,
    // and an em dash is one of the few joints cadence can safely split at.
    if (opts.cadence) cadencePass(sp, opts, rand);
    if (opts.punctuation) punctuationPass(sp, opts, rand);
    cleanupPass(sp);

    var changes = sp.marks.filter(function (m) { return m.rule; });

    return {
      before: before,
      text: sp.text,
      seed: seed,
      changes: changes,
      metricsBefore: HW.metrics.measure(before, { patterns: HW.patterns.all }),
      metricsAfter: HW.metrics.measure(sp.text, { patterns: HW.patterns.all })
    };
  }

  HW.humanize = {
    run: run,
    defaults: defaults,
    categories: ALL_CATEGORIES,
    rng: rng,
    hash: hash
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
