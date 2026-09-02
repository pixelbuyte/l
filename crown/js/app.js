/* Crown Fried Chicken — page behaviour.
   The only real logic here is the open/closed clock, which reads the shop's
   hours in its own timezone rather than the visitor's. Everything else is
   rendering the data file and getting things on screen at the right moment. */

(function () {
  'use strict';

  var D = (typeof CrownData !== 'undefined') ? CrownData : null;
  var H = (typeof CrownHours !== 'undefined') ? CrownHours : null;
  if (!D || !H) return;

  var PLACE = D.PLACE, MENU = D.MENU, GALLERY = D.GALLERY;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ——— the clock ——————————————————————————————————————————— */

  function paintStatus() {
    var now = H.wallClock(new Date());
    var s = H.status(now.minutes, PLACE.hours);
    [['statusPill', 'statusText'], ['statusPill2', 'statusText2']].forEach(function (pair) {
      var pill = document.getElementById(pair[0]), txt = document.getElementById(pair[1]);
      if (pill) pill.setAttribute('data-state', s.state);
      if (txt) txt.textContent = s.label;
    });
    var f = document.getElementById('statusText3');
    if (f) f.textContent = s.label;
  }

  /* ——— marquee ——————————————————————————————————————————————— */

  function buildMarquee() {
    var track = document.getElementById('marquee');
    if (!track) return;
    var words = ['Halal', 'Fried Chicken', 'Wing Dings', 'Hot Wings', 'Jumbo Shrimp',
                 'Whiting Fish', 'Philly Cheese Steak', 'Open Till Midnight',
                 '443 Lincoln St', 'Takeout & Delivery'];
    // Twice through, so translateX(-50%) loops seamlessly.
    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < words.length; i++) track.appendChild(el('span', null, words[i]));
    }
  }

  /* ——— menu board ——————————————————————————————————————————— */

  function money(n) { return '$' + n.toFixed(2); }

  function buildBoard() {
    var board = document.getElementById('board'), tabs = document.getElementById('tabs');
    if (!board || !tabs) return;

    MENU.forEach(function (sec) {
      var panel = el('section', 'panel');
      panel.id = 'sec-' + sec.id;
      panel.setAttribute('data-accent', sec.accent);

      var head = el('div', 'panel-head');
      head.appendChild(el('h3', null, sec.label));
      head.appendChild(el('p', 'panel-note', sec.note));
      head.appendChild(el('p', 'panel-blurb', sec.blurb));
      panel.appendChild(head);

      var ul = el('ul', 'items');
      sec.items.forEach(function (it) {
        var li = el('li', 'item');
        var name = el('span', 'item-name');
        name.appendChild(document.createTextNode(it.name));
        if (it.tag) name.appendChild(el('b', 'item-tag', it.tag));
        li.appendChild(name);
        li.appendChild(el('span', 'item-dots'));
        li.appendChild(el('span', 'item-price', money(it.price)));
        ul.appendChild(li);
      });
      panel.appendChild(ul);
      board.appendChild(panel);
    });

    // Tabs highlight one section and dim the rest; "All" clears it.
    var defs = [{ id: 'all', label: 'Everything' }].concat(
      MENU.map(function (s) { return { id: s.id, label: s.label }; }));

    defs.forEach(function (d, i) {
      var b = el('button', 'tab' + (i === 0 ? ' on' : ''), d.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(tabs.children, function (t) {
          t.classList.toggle('on', t === b);
          t.setAttribute('aria-selected', t === b ? 'true' : 'false');
        });
        Array.prototype.forEach.call(board.children, function (p) {
          if (p.tagName !== 'SECTION') return;
          p.classList.toggle('dim', d.id !== 'all' && p.id !== 'sec-' + d.id);
        });
        if (d.id !== 'all') {
          var target = document.getElementById('sec-' + d.id);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
      tabs.appendChild(b);
    });
  }

  /* ——— specials ————————————————————————————————————————————
     Not a separate list to maintain: the cheapest plate from each section of
     the board, so this can never drift out of step with the menu — and so the
     four cards are four different things rather than four sandwiches that
     happen to cost the same. */

  function cheapestPerSection() {
    return MENU.map(function (sec) {
      var best = sec.items.reduce(function (a, b) {
        if (b.price < a.price) return b;
        if (b.price > a.price) return a;
        return a.name.localeCompare(b.name) <= 0 ? a : b;
      });
      return { name: best.name, price: best.price, kind: sec.label, note: sec.note };
    });
  }

  function buildTickets() {
    var wrap = document.getElementById('tickets');
    if (!wrap) return;

    cheapestPerSection().forEach(function (it, i) {
      var t = el('article', 'ticket reveal');
      t.style.transitionDelay = (i * 70) + 'ms';
      t.appendChild(el('p', 'ticket-kind', it.kind));
      t.appendChild(el('h3', 'ticket-name', it.name));

      var dollars = Math.floor(it.price);
      var cents = Math.round((it.price - dollars) * 100);
      var p = el('p', 'ticket-price');
      var sup = el('sup', null, '$');
      p.appendChild(sup);
      p.appendChild(document.createTextNode(dollars + '.' + (cents < 10 ? '0' : '') + cents));
      t.appendChild(p);

      t.appendChild(el('p', 'ticket-sub', it.note));
      wrap.appendChild(t);
    });
  }

  /* ——— plates ————————————————————————————————————————————
     One photographed plate per section of the board, captioned with the real
     item and its real price. Every picture is of this kitchen's food, taken
     from the shop's own Google Maps listing — never a stock photograph of
     somebody else's chicken. */

  function buildPlates() {
    var wrap = document.getElementById('plates-grid');
    if (!wrap) return;

    MENU.forEach(function (sec, i) {
      // The item with a photograph is the one worth showing; failing that the
      // tagged one, failing that the first.
      var pick = sec.items.filter(function (it) { return it.photo; })[0] ||
                 sec.items.filter(function (it) { return it.tag; })[0] || sec.items[0];

      var card = el('article', 'plate reveal');
      card.setAttribute('data-accent', sec.accent);
      card.style.transitionDelay = (i * 70) + 'ms';

      if (pick.photo) {
        var fig = el('figure', 'plate-pic');
        var img = el('img');
        img.src = pick.photo.src;
        img.alt = pick.name + ' at Crown Fried Chicken';
        img.width = pick.photo.w; img.height = pick.photo.h;
        img.loading = 'lazy';
        img.decoding = 'async';
        fig.appendChild(img);
        card.appendChild(fig);
      }

      var body = el('div', 'plate-body');
      body.appendChild(el('p', 'plate-kind', sec.label));
      body.appendChild(el('h3', 'plate-name', pick.name));

      var foot = el('div', 'plate-foot');
      foot.appendChild(el('span', 'plate-note', sec.note));
      foot.appendChild(el('span', 'plate-price', money(pick.price)));
      body.appendChild(foot);
      card.appendChild(body);

      wrap.appendChild(card);
    });
  }

  /* ——— gallery ——————————————————————————————————————————————— */

  function buildGallery() {
    var grid = document.getElementById('grid');
    if (!grid) return;
    GALLERY.forEach(function (g, i) {
      var fig = el('figure', 'shot reveal ' + g.span);
      fig.style.transitionDelay = (i * 60) + 'ms';
      var img = el('img');
      img.src = g.src;
      img.alt = g.caption;
      img.width = g.w; img.height = g.h;
      img.loading = 'lazy';
      img.decoding = 'async';
      fig.appendChild(img);
      fig.appendChild(el('figcaption', null, g.caption));
      grid.appendChild(fig);
    });
  }

  function buildTraits() {
    var ul = document.getElementById('traits');
    if (!ul) return;
    PLACE.traits.forEach(function (t) { ul.appendChild(el('li', null, t)); });
  }

  /* ——— scroll behaviour ——————————————————————————————————————— */

  function wireScroll() {
    var nav = document.getElementById('nav');
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a'));
    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    function onScroll() {
      if (nav) nav.classList.toggle('stuck', window.scrollY > 8);

      // Highlight whichever section owns the top third of the viewport.
      var mark = window.scrollY + window.innerHeight / 3, current = -1;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].offsetTop <= mark) current = i;
      }
      links.forEach(function (a, i) { a.classList.toggle('on', i === current); });
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { onScroll(); ticking = false; });
    }, { passive: true });
    onScroll();
  }

  function wireReveal() {
    var nodes = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(nodes, function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(nodes, function (n) { io.observe(n); });
  }

  function wireBurger() {
    var b = document.getElementById('burger'), nav = document.getElementById('nav');
    if (!b || !nav) return;
    function close() { nav.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); }
    b.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', close);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ——— go ————————————————————————————————————————————————— */

  buildMarquee();
  buildBoard();
  buildTickets();
  buildPlates();
  buildGallery();
  buildTraits();
  paintStatus();
  wireBurger();
  wireScroll();

  // Reveal targets are created above, so observe after they exist.
  wireReveal();

  // The pill goes stale if the page is left open across closing time.
  setInterval(paintStatus, 30000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) paintStatus();
  });
})();
