/*
 * corpus-app.js — builds the corpus page from the data files.
 *
 * Nothing on the page is written by hand except the prose in index.html; every
 * figure, bar and table row below is derived from data/corpus.js,
 * data/specimens.js and data/patterns.js at load time.
 */
(function () {
  'use strict';

  var HW = window.HW;
  var M = HW.metrics;
  var PATTERNS = HW.patterns.all;

  function $(sel) { return document.querySelector(sel); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function fmt(n, dp) {
    if (!isFinite(n)) return '—';
    return n.toFixed(dp === undefined ? 1 : dp);
  }

  /* ---------------------------------------------------- measurement sets */

  function measureAll(list) {
    return list.map(function (s) {
      return M.measure(s.text, { patterns: PATTERNS });
    });
  }

  var humanM = measureAll(HW.corpus.samples);
  var specM = measureAll(HW.specimens.all);

  function avg(set, fn) {
    var t = 0;
    for (var i = 0; i < set.length; i++) t += fn(set[i]);
    return set.length ? t / set.length : 0;
  }
  function total(set, key) {
    var t = 0;
    for (var i = 0; i < set.length; i++) t += set[i][key];
    return t;
  }

  /* ------------------------------------------------------------ top stats */

  var totalWords = total(humanM, 'words');
  var totalNotes = HW.corpus.samples.reduce(function (a, s) { return a + s.notes.length; }, 0);

  var stats = [
    [String(HW.corpus.samples.length), 'annotated passages'],
    [totalWords.toLocaleString(), 'words of human prose'],
    [String(totalNotes), 'span annotations'],
    [String(PATTERNS.length), 'machine habits catalogued'],
    [String(HW.specimens.all.length), 'contrast specimens']
  ];
  var sb = $('#topstats');
  stats.forEach(function (s) {
    var d = el('div');
    d.appendChild(el('span', 'n', s[0]));
    d.appendChild(el('span', 'k', s[1]));
    sb.appendChild(d);
  });

  $('#footer-stats').textContent =
    HW.corpus.samples.length + ' passages · ' + totalWords.toLocaleString() +
    ' words · ' + totalNotes + ' annotations · ' + PATTERNS.length +
    ' patterns · all measurements computed in-page';

  /* ----------------------------------------------------------- comparison */

  // higher: which direction is the human corpus expected to sit, used only
  // for the bar colouring, never for the verdict.
  var ROWS = [
    { label: 'Burstiness',
      note: 'Variation in sentence length, as a proportion of the mean. The single most useful measure here.',
      get: function (m) { return m.burstiness; }, dp: 2 },
    { label: 'Machine habits per 1,000 words',
      note: 'Hits against the pattern library below.',
      get: function (m) { return m.tells.density; }, dp: 1 },
    { label: 'Shortest sentence',
      note: 'Words in the shortest sentence, averaged across passages. People write three-word sentences; models rarely do.',
      get: function (m) { return m.sentenceMin; }, dp: 1 },
    { label: 'Sentences of 8 words or fewer',
      note: 'Share of all sentences.',
      get: function (m) { return m.shortSentencePct * 100; }, dp: 1, unit: '%' },
    { label: 'Paragraph length variation',
      note: 'Standard deviation of paragraph length in words. Machine prose builds paragraphs to a size.',
      get: function (m) { return m.paragraphSd; }, dp: 1 },
    { label: 'Nominalisations per 1,000 words',
      note: 'Words like implementation, engagement, utilisation — verbs turned into nouns.',
      get: function (m) { return m.nominalisationRate; }, dp: 1 },
    { label: 'Em dashes per 1,000 words',
      note: 'The most reported surface tell, and a noisier signal than its reputation suggests.',
      get: function (m) { return m.emDashRate; }, dp: 1 },
    { label: 'Lexical diversity',
      note: 'Moving-average type-token ratio over a 100-word window.',
      get: function (m) { return m.lexicalDiversity; }, dp: 3 },
    { label: 'Mean sentence length',
      note: 'The obvious measure, and close to useless on its own.',
      get: function (m) { return m.sentenceMean; }, dp: 1 },
    { label: 'Contraction rate',
      note: 'Contractions as a share of all contractible forms. This corpus includes legal, academic and news registers that contract rarely, which flattens the gap.',
      get: function (m) { return m.contractionRate; }, dp: 2 }
  ];

  var cmp = $('#cmp');
  ROWS.forEach(function (row) {
    var h = avg(humanM, row.get);
    var s = avg(specM, row.get);
    var max = Math.max(h, s) || 1;

    // Separation is the relative gap. It decides the verdict, so a row that
    // fails to separate says so instead of being quietly dropped.
    var sep = Math.abs(h - s) / max;
    var verdict = sep > 0.4 ? 'separates' : (sep > 0.15 ? 'some signal' : 'weak');

    var r = el('div', 'cmp-row');

    var lab = el('div', 'label');
    lab.appendChild(document.createTextNode(row.label));
    lab.appendChild(el('em', null, row.note));
    r.appendChild(lab);

    var bars = el('div', 'cmp-bars');
    [['human', h, ''], ['specimen', s, 'ai']].forEach(function (pair) {
      var b = el('div', 'cmp-bar ' + pair[2]);
      b.appendChild(el('span', 'who', pair[0]));
      var track = el('span', 'track');
      var fill = el('span', 'fill');
      fill.style.width = Math.max(1.5, (pair[1] / max) * 100) + '%';
      track.appendChild(fill);
      b.appendChild(track);
      b.appendChild(el('span', 'v', fmt(pair[1], row.dp) + (row.unit || '')));
      bars.appendChild(b);
    });
    r.appendChild(bars);

    var v = el('div', 'verdict' + (verdict === 'separates' ? ' strong' : ''), verdict);
    v.title = 'Relative gap: ' + Math.round(sep * 100) + '%';
    r.appendChild(v);

    cmp.appendChild(r);
  });

  // Report how many rows failed to separate, rather than asserting a count in
  // the prose that a data change would quietly falsify.
  (function () {
    var vs = Array.prototype.map.call(document.querySelectorAll('.verdict'),
      function (v) { return v.textContent; });
    var weak = vs.filter(function (v) { return v === 'weak'; }).length;
    var words = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
    function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
    var note = document.getElementById('verdict-note');
    if (!note) return;
    note.textContent = 'The verdict column is calculated, not assigned — it is the ' +
      'relative gap between the two figures. ' +
      (weak
        ? cap(words[weak] || String(weak)) + ' of these ' + vs.length + ' rows come out weak' +
          (weak > 1 ? ', and they include the measures most people would guess first. ' +
                      'That result is left in.'
                    : '. That result is left in.')
        : 'Every row separates in this sample, which is a fact about these ' +
          'texts and not a general one.');
  })();

  // The ranges overlap, and saying so is more useful than the averages above.
  (function () {
    function range(set, fn) {
      var vs = set.map(fn);
      return { lo: Math.min.apply(null, vs), hi: Math.max.apply(null, vs) };
    }
    var hb = range(humanM, function (m) { return m.burstiness; });
    var sb2 = range(specM, function (m) { return m.burstiness; });
    var overlaps = hb.lo <= sb2.hi;

    var note = el('p', 'small');
    note.style.marginTop = '1rem';
    note.textContent = 'Read those averages carefully. Burstiness across the ' +
      humanM.length + ' human passages runs from ' + fmt(hb.lo, 2) + ' to ' +
      fmt(hb.hi, 2); 
    note.textContent += '; across the specimens it runs from ' + fmt(sb2.lo, 2) +
      ' to ' + fmt(sb2.hi, 2) + '. ' + (overlaps
        ? 'Those ranges overlap. The flattest human passage here — an academic ' +
          'abstract — is more even than several of the specimens, which is why ' +
          'no single number on this page can tell you who wrote something.'
        : 'The ranges do not overlap in this sample, which is a fact about ' +
          'these 36 texts and not about writing in general.');
    cmp.parentNode.insertBefore(note, cmp.nextSibling);
  })();

  /* -------------------------------------------------------- hero rhythm */

  /*
   * One human passage and one specimen, drawn as a bar per sentence. This is
   * the burstiness row of the table below, made visible: the shape of the two
   * silhouettes is the whole argument of the page.
   */
  (function () {
    var fig = document.getElementById('rhythm');
    if (!fig) return;

    // This pair is chosen because their mean sentence lengths are within half
    // a word of each other. The average tells you nothing; the shape does.
    var human = HW.corpus.get('bug-report');
    var spec = HW.specimens.get('spec-climate');

    fig.appendChild(el('h4', null, 'Sentence rhythm'));
    fig.appendChild(el('p', 'cap',
      'One bar per sentence, scaled to the longest. Human writing lurches; ' +
      'unedited machine prose holds a level.'));

    function band(label, sub, text, cls) {
      var lens = M.sentences(text).map(function (x) { return M.words(x).length; });
      var max = Math.max.apply(null, lens) || 1;
      var m = M.measure(text);

      var wrapEl = el('div', 'band' + (cls ? ' ' + cls : ''));
      var lab = el('div', 'band-label');
      var b = el('b', null, label);
      lab.appendChild(b);
      lab.appendChild(el('span', null, 'burstiness ' + fmt(m.burstiness, 2)));
      wrapEl.appendChild(lab);

      var bars = el('div', 'bars');
      lens.forEach(function (l) {
        var i = el('i');
        i.style.height = Math.max(3, (l / max) * 100) + '%';
        i.title = l + ' words';
        bars.appendChild(i);
      });
      wrapEl.appendChild(bars);

      var cap = el('p', 'cap');
      cap.style.margin = '.45rem 0 0';
      cap.textContent = sub + ' · ' + lens.length + ' sentences, ' +
        Math.min.apply(null, lens) + ' to ' + max + ' words';
      wrapEl.appendChild(cap);
      return wrapEl;
    }

    fig.appendChild(band('Human', human.register, human.text, ''));
    fig.appendChild(band('Machine', 'Contrast specimen', spec.text, 'ai'));

    // State the numbers rather than characterising them, so this caption
    // cannot quietly become false if the passages are edited.
    var hMean = M.measure(human.text).sentenceMean;
    var sMean = M.measure(spec.text).sentenceMean;
    var foot = el('p', 'foot');
    foot.textContent = 'Both texts are on this page. Their average sentence ' +
      'lengths are ' + fmt(hMean, 1) + ' and ' + fmt(sMean, 1) + ' words. ' +
      (Math.abs(hMean - sMean) < 1.5
        ? 'The averages are near enough identical; what differs is the variation around them.'
        : 'The averages differ, but the variation around them differs far more.');
    fig.appendChild(foot);
  })();

  /* ------------------------------------------------------- corpus browser */

  var grid = $('#corpus-grid');
  var detail = $('#corpus-detail');
  var search = $('#corpus-search');
  var countEl = $('#corpus-count');
  var openId = null;

  function snippet(text, n) {
    var flat = text.replace(/\s+/g, ' ').trim();
    return flat.length > n ? flat.slice(0, n).replace(/\s\S*$/, '') + '…' : flat;
  }

  function renderGrid() {
    var q = search.value.trim().toLowerCase();
    grid.textContent = '';
    var shown = 0;

    HW.corpus.samples.forEach(function (s, i) {
      if (q && (s.title + ' ' + s.register + ' ' + s.text + ' ' + s.context)
          .toLowerCase().indexOf(q) === -1) return;
      shown++;

      var b = el('button', 'card-btn');
      b.type = 'button';
      b.setAttribute('aria-pressed', openId === s.id ? 'true' : 'false');
      b.appendChild(el('span', 'reg', s.register));
      b.appendChild(el('h3', null, s.title));
      b.appendChild(el('p', 'snip', snippet(s.text, 110)));

      var m = humanM[i];
      b.appendChild(el('p', 'meta',
        m.words + ' words · burstiness ' + fmt(m.burstiness, 2) +
        ' · ' + s.notes.length + ' notes'));

      b.addEventListener('click', function () {
        openId = openId === s.id ? null : s.id;
        renderGrid();
        renderDetail();
        if (openId) detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      grid.appendChild(b);
    });

    countEl.textContent = shown === HW.corpus.samples.length
      ? shown + ' passages'
      : shown + ' of ' + HW.corpus.samples.length + ' passages';

    if (!shown) {
      var none = el('div');
      none.appendChild(el('p', 'small', 'Nothing matches that search.'));
      grid.appendChild(none);
    }
  }

  /**
   * Highlight every annotated span in a passage. Spans are located by exact
   * string match; if a quote ever stops matching its passage the note is still
   * listed, just without a highlight.
   */
  function renderPassage(sample) {
    var spans = [];
    sample.notes.forEach(function (n, idx) {
      var at = sample.text.indexOf(n.quote);
      if (at === -1) return;
      spans.push({ start: at, end: at + n.quote.length, idx: idx });
    });
    spans.sort(function (a, b) { return a.start - b.start; });

    var frag = document.createDocumentFragment();
    var cursor = 0;
    spans.forEach(function (sp) {
      if (sp.start < cursor) return;           // overlapping quotes: keep the first
      frag.appendChild(document.createTextNode(sample.text.slice(cursor, sp.start)));
      var mk = el('mark', 'human');
      mk.id = 'span-' + sample.id + '-' + sp.idx;
      mk.textContent = sample.text.slice(sp.start, sp.end);
      frag.appendChild(mk);
      cursor = sp.end;
    });
    frag.appendChild(document.createTextNode(sample.text.slice(cursor)));
    return frag;
  }

  function readout(m) {
    var rows = [
      ['Words', m.words],
      ['Sentences', m.sentences],
      ['Mean sentence', fmt(m.sentenceMean) + ' words'],
      ['Shortest / longest', m.sentenceMin + ' / ' + m.sentenceMax],
      ['Burstiness', fmt(m.burstiness, 2)],
      ['Contraction rate', fmt(m.contractionRate, 2)],
      ['Lexical diversity', fmt(m.lexicalDiversity, 3)],
      ['Reading ease', fmt(m.flesch, 0)],
      ['Machine habits / 1k', fmt(m.tells.density, 1)]
    ];
    var box = el('div', 'readout');
    rows.forEach(function (r) {
      var d = el('div');
      d.appendChild(el('span', 'k2', r[0]));
      d.appendChild(el('span', 'v2', String(r[1])));
      box.appendChild(d);
    });
    return box;
  }

  function renderDetail() {
    detail.textContent = '';
    if (!openId) return;
    var sample = HW.corpus.get(openId);
    var idx = HW.corpus.samples.indexOf(sample);
    var m = humanM[idx];

    var box = el('div', 'detail');

    var left = el('div');
    left.appendChild(el('p', 'eyebrow', sample.register));
    left.appendChild(el('h3', null, sample.title));
    var ctx = el('p', 'small');
    ctx.style.marginTop = '.3rem';
    ctx.textContent = sample.context;
    left.appendChild(ctx);
    var pass = el('div', 'passage');
    pass.style.marginTop = '1.2rem';
    pass.appendChild(renderPassage(sample));
    left.appendChild(pass);
    box.appendChild(left);

    var side = el('div', 'side');
    side.appendChild(el('h4', null, 'What marks it as human'));
    var ul = el('ul', 'notelist');
    ul.style.marginTop = '.8rem';
    sample.notes.forEach(function (n, i) {
      var li = el('li');
      li.appendChild(el('span', 'f', n.feature));
      var q = el('blockquote', null, '“' + n.quote + '”');
      li.appendChild(q);
      li.appendChild(el('p', null, n.note));
      li.addEventListener('mouseenter', function () { flash(sample.id, i, true); });
      li.addEventListener('mouseleave', function () { flash(sample.id, i, false); });
      ul.appendChild(li);
    });
    side.appendChild(ul);

    var h4 = el('h4', null, 'Measured');
    h4.style.marginTop = '1.6rem';
    side.appendChild(h4);
    side.appendChild(readout(m));
    box.appendChild(side);

    detail.appendChild(box);
  }

  function flash(id, i, on) {
    var n = document.getElementById('span-' + id + '-' + i);
    if (n) n.classList.toggle('focus', on);
  }

  search.addEventListener('input', renderGrid);
  renderGrid();

  /* ------------------------------------------------------ pattern library */

  var ptable = $('#pattern-table');
  var psearch = $('#pattern-search');
  var pcats = $('#pattern-cats');
  var pcount = $('#pattern-count');
  var activeCat = 'all';

  var catCounts = {};
  PATTERNS.forEach(function (p) {
    catCounts[p.category] = (catCounts[p.category] || 0) + 1;
  });

  function catChip(key, label, n) {
    var c = el('button', 'chip');
    c.type = 'button';
    c.textContent = label + ' (' + n + ')';
    c.setAttribute('aria-pressed', activeCat === key ? 'true' : 'false');
    c.addEventListener('click', function () {
      activeCat = key;
      Array.prototype.forEach.call(pcats.children, function (x) {
        x.setAttribute('aria-pressed', 'false');
      });
      c.setAttribute('aria-pressed', 'true');
      renderPatterns();
    });
    return c;
  }

  pcats.appendChild(catChip('all', 'All', PATTERNS.length));
  Object.keys(HW.patterns.categories).forEach(function (key) {
    if (!catCounts[key]) return;
    pcats.appendChild(catChip(key, HW.patterns.categories[key].label, catCounts[key]));
  });

  // The regular expression is the honest identifier for a rule, but it is not
  // readable. This renders it as something a person can scan: character
  // classes become an ellipsis, alternations become (a/b/c), and the
  // zero-width assertions that exist only to anchor a match are dropped.
  var OPEN = String.fromCharCode(1), CLOSE = String.fromCharCode(2);

  function readablePattern(src) {
    var out = src
      .replace(/\(\?<=[^)]*\)/g, '')       // look-behind anchors
      .replace(/\(\?![^)]*\)/g, '')        // negative look-ahead guards
      .replace(/\(\?=([^)]*)\)/g, ' $1')   // look-ahead: show what must follow
      .replace(/\(\?:/g, '(')
      .replace(/\^\|/g, '')
      .replace(/\\b/g, '')
      .replace(/\\\./g, '.')
      .replace(/\[- \]/g, '-')             // [- ] is "hyphen or space"
      .replace(/\[\^[^\]]*\](?:\{[^}]*\}|[+*])?\??/g, '…')
      .replace(/\[[^\]]*\](?:\{[^}]*\}|[+*])?/g, '…')
      .replace(/\\s[*+]/g, ' ')
      .replace(/\\d/g, '#');

    // Collapse innermost groups repeatedly so nesting unwraps cleanly.
    for (var i = 0; i < 6; i++) {
      var next = out.replace(/\(([^()]*)\)(\?)?/g, function (m, body, opt) {
        var trailing = /\s$/.test(body) ? ' ' : '';
        var parts = body.split('|').map(function (x) { return x.trim(); })
          .filter(function (x) { return x.length; });
        if (!parts.length) return '';
        // A single-alternative group still carries meaning when it is
        // optional: shed(s), (the) landscape, (more) importantly.
        if (parts.length === 1) {
          return (opt ? OPEN + parts[0] + CLOSE : parts[0]) + trailing;
        }
        // Sentinels rather than literal brackets: the next pass of this loop
        // would otherwise match the brackets it had just written and unwrap
        // them again, losing the grouping.
        return OPEN + parts.join('/') + CLOSE + trailing;
      });
      if (next === out) break;
      out = next;
    }

    return out
      // A trailing ? on a bare letter is an optional character, as in "an?".
      .replace(/([a-z])\?/gi, '($1)')
      .replace(/\?/g, '')
      .split(OPEN).join('(')
      .split(CLOSE).join(')')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;:])/g, '$1')
      .trim();
  }

  function renderPatterns() {
    var q = psearch.value.trim().toLowerCase();
    ptable.textContent = '';
    var shown = 0;

    PATTERNS.forEach(function (p) {
      if (activeCat !== 'all' && p.category !== activeCat) return;
      if (q && (p.id + ' ' + p.match + ' ' + p.why + ' ' + p.swap.join(' ') +
                ' ' + HW.patterns.categories[p.category].label)
          .toLowerCase().indexOf(q) === -1) return;
      shown++;

      var row = el('div', 'prow');
      row.id = 'rule-' + p.id;

      var left = el('div');
      var sev = el('span', 'sev', '●'.repeat(p.severity));
      sev.title = ['mild', 'noticeable', 'a giveaway on its own'][p.severity - 1];
      left.appendChild(sev);
      var pat = el('span', 'pat', readablePattern(p.match));
      left.appendChild(pat);
      var cat = el('div');
      cat.style.marginTop = '.4rem';
      var tag = el('span', 'tag', HW.patterns.categories[p.category].label);
      cat.appendChild(tag);
      left.appendChild(cat);
      row.appendChild(left);

      row.appendChild(el('div', 'why', p.why));

      var swaps = el('div', 'swaps');
      if (!p.swap.length) {
        swaps.appendChild(el('span', 'cut', 'delete it'));
      } else {
        p.swap.forEach(function (s) { swaps.appendChild(el('span', null, s)); });
        if (p.inflect) {
          var note = el('span', 'tag', 'tense-matched');
          swaps.appendChild(note);
        }
      }
      row.appendChild(swaps);

      ptable.appendChild(row);
    });

    pcount.textContent = shown + ' of ' + PATTERNS.length + ' patterns' +
      (activeCat === 'all' ? '' : ' · ' + HW.patterns.categories[activeCat].blurb);

    if (!shown) {
      var none = el('div', 'prow');
      none.appendChild(el('p', 'small', 'No patterns match that search.'));
      ptable.appendChild(none);
    }
  }

  psearch.addEventListener('input', renderPatterns);
  renderPatterns();
})();
