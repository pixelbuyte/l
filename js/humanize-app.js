/*
 * humanize-app.js — wiring for the rewriter page.
 *
 * Holds no rewriting logic of its own. Everything comes from js/humanize.js,
 * so the page and the test suite exercise the same code path.
 */
(function () {
  'use strict';

  var HW = window.HW;
  var M = HW.metrics;

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function fmt(n, dp) { return isFinite(n) ? n.toFixed(dp === undefined ? 1 : dp) : '—'; }

  var input = $('input');
  var output = $('output');
  var results = $('results');
  var seed = 1;
  var last = null;

  /* -------------------------------------------- human corpus reference band */

  var humanRef = (function () {
    var ms = HW.corpus.samples.map(function (s) {
      return M.measure(s.text, { patterns: HW.patterns.all });
    });
    function avg(fn) {
      return ms.reduce(function (a, m) { return a + fn(m); }, 0) / ms.length;
    }
    var bursts = ms.map(function (m) { return m.burstiness; });
    return {
      burstiness: avg(function (m) { return m.burstiness; }),
      // The range matters more than the average. Human burstiness varies
      // enormously by register — an academic abstract is nearly as even as
      // generated prose — so anything compared against the mean alone will
      // flag real human writing as machine-like.
      burstMin: Math.min.apply(null, bursts),
      burstMax: Math.max.apply(null, bursts),
      tells: avg(function (m) { return m.tells.density; }),
      shortest: avg(function (m) { return m.sentenceMin; }),
      words: ms.reduce(function (a, m) { return a + m.words; }, 0),
      n: ms.length
    };
  })();

  $('footer-stats').textContent =
    HW.patterns.all.length + ' patterns · reference band from ' + humanRef.n +
    ' human passages (' + humanRef.words.toLocaleString() + ' words) · ' +
    'burstiness ' + fmt(humanRef.burstMin, 2) + '–' + fmt(humanRef.burstMax, 2) +
    ', mean ' + fmt(humanRef.burstiness, 2) +
    ' · machine habits ' + fmt(humanRef.tells, 1) + ' per 1,000 words';

  /* ---------------------------------------------------------- the controls */

  var catBox = $('cat-toggles');
  var catInputs = {};
  Object.keys(HW.patterns.categories).forEach(function (key) {
    var n = HW.patterns.all.filter(function (p) { return p.category === key; }).length;
    if (!n) return;
    var label = el('label');
    var box = el('input');
    box.type = 'checkbox';
    box.checked = true;
    box.addEventListener('change', run);
    catInputs[key] = box;
    label.appendChild(box);
    label.appendChild(document.createTextNode(' ' + HW.patterns.categories[key].label));
    label.appendChild(el('span', 'count', String(n)));
    label.title = HW.patterns.categories[key].blurb;
    catBox.appendChild(label);
  });

  function options() {
    var cats = {};
    Object.keys(catInputs).forEach(function (k) { cats[k] = catInputs[k].checked; });
    var strength = 2;
    Array.prototype.forEach.call(
      document.querySelectorAll('input[name="strength"]'), function (r) {
        if (r.checked) strength = Number(r.value);
      });
    return {
      strength: strength,
      seed: seed,
      categories: cats,
      contractions: $('opt-contractions').checked,
      punctuation: $('opt-punctuation').checked,
      cadence: $('opt-cadence').checked
    };
  }

  /* ------------------------------------------------------------- rendering */

  function renderOutput(res) {
    output.textContent = '';
    var frag = document.createDocumentFragment();
    var cursor = 0;

    res.changes.forEach(function (c, i) {
      if (c.start < cursor || c.end <= c.start) return;   // cuts have no span
      frag.appendChild(document.createTextNode(res.text.slice(cursor, c.start)));
      var mk = el('mark', 'edit');
      mk.id = 'chg-' + i;
      mk.textContent = res.text.slice(c.start, c.end);
      mk.title = c.rule + ' — was: “' + c.from.trim() + '”';
      frag.appendChild(mk);
      cursor = c.end;
    });
    frag.appendChild(document.createTextNode(res.text.slice(cursor)));
    output.appendChild(frag);
  }

  function deltaRow(label, before, after, dp, betterUp, ref, refLabel) {
    var row = el('div');
    row.appendChild(el('span', 'k2', label));
    var v = el('span', 'v2');
    var diff = after - before;
    var improved = betterUp ? diff > 0 : diff < 0;
    v.appendChild(document.createTextNode(fmt(before, dp) + '  →  ' + fmt(after, dp) + '  '));
    if (Math.abs(diff) > (dp >= 2 ? 0.005 : 0.05)) {
      var d = el('span', improved ? 'up' : 'down',
                 (diff > 0 ? '+' : '') + fmt(diff, dp));
      d.className = 'delta ' + (improved ? 'up' : 'down');
      v.appendChild(d);
    }
    if (ref !== undefined) {
      v.appendChild(el('span', 'k2', '   corpus ' + (refLabel || fmt(ref, dp))));
    }
    row.appendChild(v);
    return row;
  }

  /**
   * The honest limit of this tool.
   *
   * Sentence-length variation is the strongest single signal separating the
   * corpus from the contrast set, and it is the one thing a rule-based editor
   * mostly cannot fix. Splitting only works where a sentence already contains
   * two clauses that could stand alone; prose that runs to sixteen even words
   * of single-clause statement offers nothing to split, and inventing a clause
   * is exactly what this engine refuses to do.
   *
   * So when the rewrite comes out still flat, the tool says so and hands back
   * the specific sentences to work on rather than quietly reporting success.
   */
  function cadenceAdvice(m, text) {
    if (m.sentences < 4) return null;
    // Fire only when the text is flatter than every human passage in the
    // corpus, and flatter by a clear margin. Measuring against the mean would
    // flag the academic abstract and the product review, both of which people
    // wrote; measuring against the bare minimum makes the panel appear and
    // disappear on a rounding difference, since burstiness is noisy over a few
    // hundred words.
    if (m.burstiness >= humanRef.burstMin * 0.9) return null;

    var sents = M.sentences(text);
    var lens = sents.map(function (x) { return M.words(x).length; });
    var mean = m.sentenceMean;

    // How much of the text sits in a narrow band around its own average.
    var band = Math.max(3, mean * 0.25);
    var clustered = lens.filter(function (l) { return Math.abs(l - mean) <= band; }).length;

    var box = el('div', 'callout');
    box.style.marginTop = '1.5rem';
    box.appendChild(el('h4', null, 'What the rewriter cannot do for you'));

    var p1 = el('p', 'small');
    p1.textContent = 'Sentence rhythm is still flatter than all ' + humanRef.n +
      ' passages in the corpus: burstiness ' + fmt(m.burstiness, 2) +
      ', against a human range of ' +
      fmt(humanRef.burstMin, 2) + ' to ' + fmt(humanRef.burstMax, 2) + '. ' +
      clustered + ' of your ' + m.sentences + ' sentences fall within ' +
      Math.round(band) + ' words of the ' + fmt(mean, 0) + '-word average.';
    box.appendChild(p1);

    var p2 = el('p', 'small');
    p2.textContent = 'No rule can fix this. Splitting a sentence is only safe ' +
      'where it already holds two clauses that could stand alone, and this ' +
      'draft mostly does not — inventing one is the thing this engine will not ' +
      'do. It is five minutes of work by hand: break one of these in two, and ' +
      'let the sentence after it run long.';
    box.appendChild(p2);

    var order = lens.map(function (l, i) { return { l: l, i: i }; })
      .sort(function (x, y) { return y.l - x.l; })
      .slice(0, 3);

    var ul = el('ul', 'notelist');
    ul.style.marginTop = '.6rem';
    order.forEach(function (o) {
      var li = el('li');
      li.appendChild(el('span', 'f', o.l + ' words'));
      li.appendChild(el('blockquote', null, sents[o.i]));
      ul.appendChild(li);
    });
    box.appendChild(ul);

    var shortest = Math.min.apply(null, lens);
    if (shortest > 7) {
      var p3 = el('p', 'small');
      p3.style.marginTop = '.6rem';
      p3.textContent = 'Your shortest sentence is ' + shortest + ' words. ' +
        'Across the human corpus the average passage contains one of ' +
        fmt(humanRef.shortest, 0) + '. A three-word sentence is the cheapest ' +
        'rhythm change available.';
      box.appendChild(p3);
    }
    return box;
  }

  function renderResults(res) {
    results.textContent = '';
    var b = res.metricsBefore, a = res.metricsAfter;

    var panes = el('div', 'grid c2');

    /* --- measurements --- */
    var mBox = el('div');
    mBox.appendChild(el('h4', null, 'Before and after'));
    var note = el('p', 'small');
    note.style.margin = '.3rem 0 .8rem';
    note.textContent = 'The corpus column is the average across the ' + humanRef.n +
      ' human passages, for reference — not a target to hit.';
    mBox.appendChild(note);

    var read = el('div', 'readout');
    read.appendChild(deltaRow('Machine habits / 1,000 words',
      b.tells.density, a.tells.density, 1, false, humanRef.tells));
    read.appendChild(deltaRow('Burstiness',
      b.burstiness, a.burstiness, 2, true, humanRef.burstiness,
      fmt(humanRef.burstMin, 2) + '–' + fmt(humanRef.burstMax, 2)));
    read.appendChild(deltaRow('Contraction rate', b.contractionRate, a.contractionRate, 2, true));
    read.appendChild(deltaRow('Mean sentence length', b.sentenceMean, a.sentenceMean, 1, false));
    read.appendChild(deltaRow('Longest sentence', b.sentenceMax, a.sentenceMax, 0, false));
    // Counts, not rates: shortening the text raises a per-1,000-word rate on
    // its own, and flagging that as a regression would be misleading.
    read.appendChild(deltaRow('Em dashes', b.emDashes, a.emDashes, 0, false));
    read.appendChild(deltaRow('Nominalisations', b.nominalisations, a.nominalisations, 0, false));
    read.appendChild(deltaRow('Words', b.words, a.words, 0, false));
    mBox.appendChild(read);
    panes.appendChild(mBox);

    /* --- what was found --- */
    var fBox = el('div');
    fBox.appendChild(el('h4', null, 'Habits found in the original'));
    var counts = b.tells.byCategory;
    var keys = Object.keys(counts).sort(function (x, y) { return counts[y] - counts[x]; });
    if (!keys.length) {
      var clean = el('p', 'small');
      clean.style.marginTop = '.6rem';
      clean.textContent = 'None of the 169 catalogued habits appear in this text. ' +
        'That is what the human passages in the corpus look like.';
      fBox.appendChild(clean);
    } else {
      var list = el('div', 'readout');
      keys.forEach(function (k) {
        var row = el('div');
        row.appendChild(el('span', 'k2', HW.patterns.categories[k].label));
        row.appendChild(el('span', 'v2', String(counts[k])));
        list.appendChild(row);
      });
      fBox.appendChild(list);

      var stillThere = a.tells.count;
      var p = el('p', 'small');
      p.style.marginTop = '.8rem';
      p.textContent = stillThere
        ? stillThere + ' still present after the rewrite — either the rule is switched off, ' +
          'or it fires probabilistically so the output does not read as a search-and-replace sweep. ' +
          'Try another pass.'
        : 'None remain after the rewrite.';
      fBox.appendChild(p);
    }
    panes.appendChild(fBox);
    results.appendChild(panes);

    /* --- what the rules cannot do --- */
    var adv = cadenceAdvice(a, res.text);
    if (adv) results.appendChild(adv);

    /* --- the change log --- */
    var log = el('div');
    log.style.marginTop = '1.5rem';
    log.appendChild(el('h4', null, res.changes.length + ' change' +
      (res.changes.length === 1 ? '' : 's')));
    var sub = el('p', 'small');
    sub.style.margin = '.3rem 0 .8rem';
    sub.textContent = 'Every edit, with the reason it was made. Nothing here was generated; ' +
      'each replacement comes from the pattern library.';
    log.appendChild(sub);

    var ul = el('ul', 'changelog');
    res.changes.slice(0, 120).forEach(function (c, i) {
      var li = el('li');
      var line = el('div', 'swap');
      line.appendChild(el('span', 'from', '“' + c.from.trim() + '”'));
      line.appendChild(document.createTextNode('  →  '));
      line.appendChild(el('span', 'to', c.to.trim() ? '“' + c.to.trim() + '”' : 'deleted'));
      li.appendChild(line);
      li.appendChild(el('span', 'rule', c.rule));
      li.appendChild(el('p', null, c.why));
      li.addEventListener('mouseenter', function () { focusChange(i, true); });
      li.addEventListener('mouseleave', function () { focusChange(i, false); });
      ul.appendChild(li);
    });
    log.appendChild(ul);
    if (res.changes.length > 120) {
      log.appendChild(el('p', 'small', 'Showing the first 120 changes.'));
    }
    results.appendChild(log);
  }

  function focusChange(i, on) {
    var n = document.getElementById('chg-' + i);
    if (n) n.classList.toggle('focus', on);
  }

  /* ----------------------------------------------------------------- run */

  function run() {
    var text = input.value;
    var stats = $('in-stats');

    if (!text.trim()) {
      output.textContent = '';
      output.appendChild(el('span', 'placeholder',
        'The rewrite appears here as you type. Changed spans are highlighted.'));
      results.textContent = '';
      stats.textContent = 'empty';
      $('copy').disabled = true;
      $('reroll').disabled = true;
      last = null;
      return;
    }

    var res = HW.humanize.run(text, options());
    last = res;
    renderOutput(res);
    renderResults(res);

    stats.textContent = res.metricsBefore.words + ' words · ' +
      res.metricsBefore.sentences + ' sentences · ' +
      fmt(res.metricsBefore.tells.density, 1) + ' habits/1k';
    $('copy').disabled = false;
    $('reroll').disabled = false;
  }

  var timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(run, 160);
  }

  input.addEventListener('input', schedule);
  Array.prototype.forEach.call(
    document.querySelectorAll('input[name="strength"]'), function (r) {
      r.addEventListener('change', run);
    });
  ['opt-contractions', 'opt-punctuation', 'opt-cadence'].forEach(function (id) {
    $(id).addEventListener('change', run);
  });

  $('reroll').addEventListener('click', function () {
    seed = (seed + 1013904223) >>> 0;
    run();
  });

  $('clear').addEventListener('click', function () {
    input.value = '';
    run();
    input.focus();
  });

  $('copy').addEventListener('click', function () {
    if (!last) return;
    var btn = $('copy');
    var done = function () {
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = 'Copy'; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(last.text).then(done, fallback);
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = last.text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* nothing to do */ }
      document.body.removeChild(ta);
    }
  });

  /* ------------------------------------------------------------ specimens */

  var chips = $('specimen-chips');
  HW.specimens.all.forEach(function (s) {
    var c = el('button', 'chip', s.title);
    c.type = 'button';
    c.title = 'Prompt: ' + s.prompt;
    c.addEventListener('click', function () {
      input.value = s.text;
      seed = 1;
      run();
      document.querySelector('.panes').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    chips.appendChild(c);
  });

  var human = el('button', 'chip', 'A human passage, for contrast');
  human.type = 'button';
  human.title = 'Runs a passage from the corpus through the same rules. Very little should change.';
  human.addEventListener('click', function () {
    var s = HW.corpus.get('review-boots');
    input.value = s.text;
    seed = 1;
    run();
    document.querySelector('.panes').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  chips.appendChild(human);

  run();
})();
