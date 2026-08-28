/*
 * metrics.js — measurement engine.
 *
 * Every number shown anywhere on this site comes from here, including the
 * corpus statistics. Nothing is hand-entered, so the corpus page and the
 * humanizer always agree with each other.
 *
 * Works as a browser global (window.HW.metrics) and under Node via the same
 * global object, so the test suite exercises exactly the shipped code.
 */
(function (root) {
  'use strict';

  var HW = (root.HW = root.HW || {});

  // --- tokenising ---------------------------------------------------------

  // Abbreviations that end in a period but do not end a sentence.
  var ABBREV = ['mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc',
    'e.g', 'i.e', 'approx', 'fig', 'no', 'inc', 'ltd', 'co', 'dept', 'est',
    'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct',
    'nov', 'dec', 'a.m', 'p.m'];

  function sentences(text) {
    if (!text) return [];
    var out = [];
    var buf = '';
    var chars = String(text).replace(/\s+/g, ' ').trim();
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      buf += c;
      // '…' is deliberately absent: in running prose it marks a trailing off
      // inside a sentence far more often than it ends one.
      if (c === '.' || c === '!' || c === '?') {
        // Absorb trailing quotes/brackets that belong to this sentence.
        while (i + 1 < chars.length && /["'”’)\]]/.test(chars[i + 1])) {
          buf += chars[++i];
        }
        var next = chars[i + 1];
        var after = chars[i + 2];
        if (next === undefined) break;
        if (next !== ' ') continue;               // 3.14, U.S.A
        if (after && !/[A-Z"'“‘(\[—\d]/.test(after)) continue;
        var tail = buf.trim().toLowerCase().match(/([a-z.]+)\.$/);
        if (tail && ABBREV.indexOf(tail[1].replace(/\.$/, '')) !== -1) continue;
        out.push(buf.trim());
        buf = '';
      }
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function words(text) {
    var m = String(text || '').toLowerCase().match(/[a-z’']+(?:-[a-z’']+)*/g);
    return m || [];
  }

  function paragraphs(text) {
    return String(text || '').split(/\n\s*\n/).map(function (p) {
      return p.trim();
    }).filter(Boolean);
  }

  // --- descriptive statistics --------------------------------------------

  function mean(xs) {
    if (!xs.length) return 0;
    var s = 0;
    for (var i = 0; i < xs.length; i++) s += xs[i];
    return s / xs.length;
  }

  function stdev(xs) {
    if (xs.length < 2) return 0;
    var m = mean(xs), s = 0;
    for (var i = 0; i < xs.length; i++) s += (xs[i] - m) * (xs[i] - m);
    return Math.sqrt(s / (xs.length - 1));
  }

  function median(xs) {
    if (!xs.length) return 0;
    var a = xs.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  // --- syllables (Flesch needs them) --------------------------------------

  function syllables(word) {
    var w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 0;
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    var m = w.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }

  // --- vocabulary richness ------------------------------------------------

  // Moving-average type-token ratio: TTR averaged over a sliding window, so
  // that long and short texts stay comparable (plain TTR falls with length).
  function mattr(tokens, window) {
    window = window || 100;
    if (tokens.length === 0) return 0;
    if (tokens.length <= window) {
      return uniq(tokens).length / tokens.length;
    }
    var ratios = [];
    for (var i = 0; i + window <= tokens.length; i++) {
      ratios.push(uniq(tokens.slice(i, i + window)).length / window);
    }
    return mean(ratios);
  }

  function uniq(list) {
    var seen = Object.create(null), out = [];
    for (var i = 0; i < list.length; i++) {
      if (!seen[list[i]]) { seen[list[i]] = 1; out.push(list[i]); }
    }
    return out;
  }

  // --- feature counters ---------------------------------------------------

  var CONTRACTIBLE = /\b(?:it is|that is|there is|there are|he is|she is|we are|you are|they are|i am|do not|does not|did not|is not|are not|was not|were not|cannot|can not|could not|would not|should not|will not|have not|has not|had not|i will|we will|you will|they will|i have|we have|you have|they have|let us)\b/gi;
  var CONTRACTION = /\b[a-z]+n[’']t\b|\b[a-z]+[’'](?:s|re|ve|ll|d|m)\b/gi;

  var PASSIVE = /\b(?:am|is|are|was|were|be|been|being)\s+(?:\w+ly\s+)?(?:\w+(?:ed|en|wn|ne|ung|ought|aught))\b/gi;

  var NOMINALISATION = /\b\w{4,}(?:tion|sion|ment|ance|ence|ness|ity|ism)s?\b/gi;

  function countMatches(text, re) {
    var m = String(text).match(re);
    return m ? m.length : 0;
  }

  /**
   * Full measurement of a text. All rates are per 1,000 words unless the key
   * says otherwise; `perSentence` and `pct` keys are what they say.
   */
  function measure(text, opts) {
    opts = opts || {};
    var raw = String(text || '');
    var sents = sentences(raw);
    var toks = words(raw);
    var paras = paragraphs(raw);
    var lens = sents.map(function (s) { return words(s).length; });
    var per1k = toks.length ? 1000 / toks.length : 0;

    var sentMean = mean(lens);
    var sentSd = stdev(lens);
    // Burstiness = coefficient of variation of sentence length. Human prose
    // sits around 0.5-0.7; unedited model output clusters near 0.25-0.40.
    var burstiness = sentMean ? sentSd / sentMean : 0;

    var syl = 0, longWords = 0;
    for (var i = 0; i < toks.length; i++) {
      var s = syllables(toks[i]);
      syl += s;
      if (s >= 3) longWords++;
    }

    var flesch = (toks.length && sents.length)
      ? 206.835 - 1.015 * (toks.length / sents.length) - 84.6 * (syl / toks.length)
      : 0;

    var contractions = countMatches(raw, CONTRACTION);
    var expandable = countMatches(raw, CONTRACTIBLE);
    var contractionRate = (contractions + expandable)
      ? contractions / (contractions + expandable)
      : 0;

    var tells = opts.patterns ? scoreTells(raw, opts.patterns) : null;

    return {
      chars: raw.length,
      words: toks.length,
      sentences: sents.length,
      paragraphs: paras.length,
      sentenceLengths: lens,
      sentenceMean: sentMean,
      sentenceMedian: median(lens),
      sentenceSd: sentSd,
      sentenceMin: lens.length ? Math.min.apply(null, lens) : 0,
      sentenceMax: lens.length ? Math.max.apply(null, lens) : 0,
      burstiness: burstiness,
      shortSentencePct: lens.length
        ? lens.filter(function (l) { return l <= 8; }).length / lens.length : 0,
      longSentencePct: lens.length
        ? lens.filter(function (l) { return l >= 30; }).length / lens.length : 0,
      paragraphMean: mean(paras.map(function (p) { return words(p).length; })),
      paragraphSd: stdev(paras.map(function (p) { return words(p).length; })),
      wordLength: mean(toks.map(function (w) { return w.length; })),
      syllablesPerWord: toks.length ? syl / toks.length : 0,
      longWordPct: toks.length ? longWords / toks.length : 0,
      flesch: flesch,
      lexicalDiversity: mattr(toks, 100),
      contractions: contractions,
      contractionRate: contractionRate,
      // Counts as well as rates. A rate per 1,000 words rises when a text is
      // shortened even if nothing was added, which reads as a regression when
      // it is really just arithmetic.
      emDashes: countMatches(raw, /—|--/g),
      nominalisations: countMatches(raw, NOMINALISATION),
      commaRate: countMatches(raw, /,/g) * per1k,
      semicolonRate: countMatches(raw, /;/g) * per1k,
      emDashRate: countMatches(raw, /—|--/g) * per1k,
      parentheticalRate: countMatches(raw, /\(/g) * per1k,
      questionPct: sents.length
        ? sents.filter(function (s) { return /\?$/.test(s); }).length / sents.length : 0,
      exclamationPct: sents.length
        ? sents.filter(function (s) { return /!$/.test(s); }).length / sents.length : 0,
      passiveRate: countMatches(raw, PASSIVE) * per1k,
      nominalisationRate: countMatches(raw, NOMINALISATION) * per1k,
      firstPersonRate: (countMatches(raw, /\b(?:I|we|me|us|my|our|mine|ours)\b/g)) * per1k,
      secondPersonRate: (countMatches(raw, /\b(?:you|your|yours)\b/gi)) * per1k,
      tells: tells
    };
  }

  /**
   * Find every pattern-library hit in the text. Returns hit objects with
   * character offsets so the UI can highlight them in place.
   */
  function scoreTells(text, patterns) {
    var hits = [];
    var raw = String(text);
    patterns.forEach(function (p) {
      var re = HW.patterns.toRegExp(p);
      var m;
      re.lastIndex = 0;
      while ((m = re.exec(raw)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        hits.push({
          id: p.id,
          pattern: p,
          text: m[0],
          start: m.index,
          end: m.index + m[0].length
        });
        if (!re.global) break;
      }
    });
    hits.sort(function (a, b) { return a.start - b.start; });

    var toks = words(raw);
    var byCategory = {};
    hits.forEach(function (h) {
      byCategory[h.pattern.category] = (byCategory[h.pattern.category] || 0) + 1;
    });

    return {
      hits: hits,
      count: hits.length,
      density: toks.length ? hits.length * 1000 / toks.length : 0,
      byCategory: byCategory
    };
  }

  HW.metrics = {
    sentences: sentences,
    words: words,
    paragraphs: paragraphs,
    syllables: syllables,
    mean: mean,
    stdev: stdev,
    median: median,
    mattr: mattr,
    measure: measure,
    scoreTells: scoreTells
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
