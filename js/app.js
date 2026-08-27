/* ============================================================
   LALISA — The Complete Public Archive
   Application: hash router, renderers, search, lightbox, quiz.
   Vanilla JS. Data lives in window.DB (js/data/*).
   ============================================================ */
(function () {
  "use strict";

  var DB = window.DB || {};
  DB.timeline = DB.timeline || [];
  DB.releases = DB.releases || [];
  DB.videos = DB.videos || [];
  DB.appearances = DB.appearances || [];
  DB.photos = DB.photos || [];
  DB.fashion = DB.fashion || [];
  DB.live = DB.live || [];
  DB.records = DB.records || [];
  DB.essays = DB.essays || [];
  DB.bio = DB.bio || { chapters: [], homeIntro: "", missionNote: "", sourcesCopy: "", lloudCopy: [], screenCopy: [], onThisArchive: "" };

  /* ---------------- utilities ---------------- */
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }
  function hash(s) {
    var h = 5381; s = String(s);
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function fmtDate(date, precision) {
    var d = String(date || "");
    var parts = d.split("-");
    if (precision === "approx") return "c. " + parts[0];
    if (precision === "year" || parts.length === 1) return parts[0];
    if (precision === "month" || parts.length === 2) return parts[0] + "." + parts[1];
    return parts[0] + "." + parts[1] + "." + parts[2];
  }
  function sortKey(date) {
    var n = String(date || "").replace(/[^0-9]/g, "");
    while (n.length < 8) n += "0";
    return n;
  }
  function era(id) { return DB.eraById && DB.eraById[id] ? DB.eraById[id] : { name: id || "—", color: "#A7A7A7", years: "" }; }
  function catOf(id) { return (DB.categories && DB.categories[id]) || { name: id || "—", color: "#A7A7A7" }; }
  function uniq(arr) { return arr.filter(function (v, i) { return v && arr.indexOf(v) === i; }); }
  function byDate(a, b) { return sortKey(a.date) < sortKey(b.date) ? -1 : 1; }
  function ytLink(q) { return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q || ""); }

  /* ---------------- poster generator ----------------
     Every visual entry is a designed Record Card, never a raw dump. */
  function poster(o) {
    var video = o.kind === "video";
    var w = video ? 640 : 600, h = video ? 360 : 800;
    var p = o.palette || ["#C8B273", "#221a08"];
    var c1 = p[0] || "#C8B273", c2 = p[1] || "#221a08";
    var hs = hash(o.id || o.title || "L");
    var gid = "g" + hs.toString(36);
    var variant = hs % 4;
    var glyph = (o.motif || o.title || "L").trim().charAt(0).toUpperCase();
    var deco = "";
    if (variant === 0) {
      deco = '<circle cx="' + w * 0.78 + '" cy="' + h * 0.3 + '" r="' + h * 0.34 + '" fill="none" stroke="' + c1 + '" stroke-opacity="0.22"/>' +
        '<circle cx="' + w * 0.78 + '" cy="' + h * 0.3 + '" r="' + h * 0.23 + '" fill="none" stroke="' + c1 + '" stroke-opacity="0.14"/>' +
        '<circle cx="' + w * 0.78 + '" cy="' + h * 0.3 + '" r="' + h * 0.12 + '" fill="none" stroke="' + c1 + '" stroke-opacity="0.3"/>';
    } else if (variant === 1) {
      var lines = "";
      for (var i = -4; i < 14; i++) lines += '<line x1="' + (i * w / 7) + '" y1="0" x2="' + (i * w / 7 + h * 0.5) + '" y2="' + h + '" stroke="' + c1 + '" stroke-opacity="0.09"/>';
      deco = lines;
    } else if (variant === 2) {
      var dots = "";
      for (var r = 1; r < 7; r++) for (var q = 1; q < 6; q++)
        dots += '<circle cx="' + (w * 0.55 + q * 26) + '" cy="' + (h * 0.12 + r * 26) + '" r="1.6" fill="' + c1 + '" fill-opacity="0.3"/>';
      deco = dots;
    } else {
      deco = '<circle cx="' + w * 0.2 + '" cy="' + h * 0.22 + '" r="' + h * 0.3 + '" fill="none" stroke="' + c1 + '" stroke-opacity="0.2" stroke-dasharray="1 7"/>' +
        '<line x1="0" y1="' + h * 0.62 + '" x2="' + w + '" y2="' + h * 0.62 + '" stroke="' + c1 + '" stroke-opacity="0.16"/>';
    }
    var yearTxt = o.hideYear ? "····" : String(o.year || "");
    var motifTxt = (o.motif || "").toUpperCase();
    var typeTxt = (o.typeLabel || "").toUpperCase();
    var idTxt = o.hideYear ? "LISA-????-??" : (o.id || "").toUpperCase();
    return '<svg viewBox="0 0 ' + w + " " + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(o.alt || o.title || "") + '" preserveAspectRatio="xMidYMid slice">' +
      '<defs>' +
      '<linearGradient id="' + gid + '" x1="0" y1="0" x2="0.9" y2="1">' +
      '<stop offset="0" stop-color="' + c2 + '"/>' +
      '<stop offset="0.55" stop-color="#0a0a0a"/>' +
      '<stop offset="1" stop-color="' + c2 + '"/>' +
      '</linearGradient>' +
      '<radialGradient id="' + gid + 'r" cx="0.75" cy="0.2" r="0.9">' +
      '<stop offset="0" stop-color="' + c1 + '" stop-opacity="0.32"/>' +
      '<stop offset="0.6" stop-color="' + c1 + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '</defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#' + gid + ')"/>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#' + gid + 'r)"/>' +
      deco +
      '<rect x="14" y="14" width="' + (w - 28) + '" height="' + (h - 28) + '" fill="none" stroke="' + c1 + '" stroke-opacity="0.34"/>' +
      '<text x="' + w / 2 + '" y="' + (video ? h * 0.58 : h * 0.52) + '" text-anchor="middle" font-family="Bodoni Moda, Didot, serif" font-style="italic" font-size="' + (video ? h * 0.62 : w * 0.62) + '" fill="none" stroke="' + c1 + '" stroke-opacity="0.5" stroke-width="1.5">' + esc(glyph) + '</text>' +
      (video
        ? '<circle cx="' + w / 2 + '" cy="' + h / 2 + '" r="34" fill="none" stroke="' + c1 + '" stroke-opacity="0.9"/>' +
        '<path d="M ' + (w / 2 - 8) + " " + (h / 2 - 13) + " L " + (w / 2 + 15) + " " + (h / 2) + " L " + (w / 2 - 8) + " " + (h / 2 + 13) + ' Z" fill="' + c1 + '"/>'
        : "") +
      '<text x="26" y="' + (h - 30) + '" font-family="Bodoni Moda, Didot, serif" font-style="italic" font-size="' + (video ? 54 : 86) + '" fill="' + c1 + '" fill-opacity="0.92">' + esc(yearTxt) + '</text>' +
      '<text x="27" y="40" font-family="IBM Plex Mono, monospace" font-size="12" letter-spacing="4" fill="' + c1 + '" fill-opacity="0.8">' + esc(motifTxt) + '</text>' +
      '<text x="' + (w - 26) + '" y="40" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="10" letter-spacing="3" fill="#A7A7A7" fill-opacity="0.75">' + esc(typeTxt) + '</text>' +
      '<text x="' + (w - 26) + '" y="' + (h - 26) + '" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="9" letter-spacing="2" fill="#A7A7A7" fill-opacity="0.6">' + esc(idTxt) + '</text>' +
      '</svg>';
  }

  var TYPE_LABELS = {
    "photo": "Photo", "mv-still": "MV still", "live": "Live", "fashion": "Fashion",
    "red-carpet": "Red carpet", "campaign": "Campaign", "acting-still": "Acting still",
    "bts": "Behind the scenes", "magazine": "Magazine", "press": "Press",
    "mv": "Official MV", "performance": "Performance video", "live-clip": "Live clip",
    "short-film": "Short film", "lyric": "Lyric video", "collab-mv": "Collab MV",
    "dance": "Dance film", "personal": "Self-directed"
  };
  function typeLabel(t) { return TYPE_LABELS[t] || t || "—"; }

  /* ---------------- card builders ---------------- */
  function photoCard(p, i, listName) {
    var e = era(p.era);
    return '<button class="record-card reveal" data-lb="' + listName + '" data-i="' + i + '" aria-haspopup="dialog">' +
      '<div class="rc-poster">' + poster({ id: p.id, year: p.year, palette: p.palette, motif: p.motif, alt: p.alt, typeLabel: typeLabel(p.type) }) +
      '<div class="rc-hover">' + esc(p.whyItMatters || p.purpose || "") + "</div></div>" +
      '<div class="rc-body">' +
      '<div class="rc-date">' + fmtDate(p.date, p.datePrecision) + (p.datePrecision !== "day" ? ' <span class="approx">± ' + esc(p.datePrecision) + "</span>" : "") + "</div>" +
      '<div class="rc-title">' + esc(p.title) + "</div>" +
      '<div class="rc-sub">' + esc(p.event || "") + (p.location ? " — " + esc(p.location) : "") + "</div>" +
      '<div class="rc-tags"><span class="tag t-era">' + esc(e.name) + '</span><span class="tag">' + esc(typeLabel(p.type)) + "</span>" +
      (p.famous ? '<span class="tag t-famous">Iconic</span>' : "") +
      (p.upcoming ? '<span class="tag t-up">Upcoming</span>' : "") +
      "</div></div></button>";
  }

  function videoCard(v, i, listName) {
    var e = era(v.era);
    return '<button class="record-card vc-wide reveal" data-lb="' + listName + '" data-i="' + i + '" aria-haspopup="dialog">' +
      '<div class="rc-poster">' + poster({ id: v.id, year: v.year, palette: eraPalette(v.era), motif: v.type === "mv" ? "MV" : typeLabel(v.type), alt: v.title, kind: "video", typeLabel: v.director ? "dir. " + v.director : "" }) + "</div>" +
      '<div class="rc-body">' +
      '<div class="rc-date">' + fmtDate(v.date, v.datePrecision) + "</div>" +
      '<div class="rc-title">' + esc(v.title) + "</div>" +
      '<div class="rc-sub">' + esc(v.director ? "Directed by " + v.director : (v.premiere || "")) + "</div>" +
      '<div class="rc-tags"><span class="tag t-era">' + esc(e.name) + '</span><span class="tag">' + esc(typeLabel(v.type)) + "</span>" +
      (v.upcoming ? '<span class="tag t-up">Upcoming</span>' : "") + "</div></div></button>";
  }

  function eraPalette(id) {
    var e = era(id);
    return [e.color || "#C8B273", "#131313"];
  }

  function emptyState(msg) {
    return '<div class="empty-state"><div class="es-mark">L</div><p>' + esc(msg || "Records pending accession.") + "</p></div>";
  }

  function sectionHead(num, kicker, title, standfirst, ghost) {
    return (ghost ? '<div class="bigyear" aria-hidden="true">' + esc(ghost) + "</div>" : "") +
      '<div class="kicker">' + esc(num) + " — " + esc(kicker) + "</div>" +
      '<h1 class="display">' + title + "</h1>" +
      (standfirst ? '<p class="standfirst">' + standfirst + "</p>" : "");
  }

  /* ---------------- state & router ---------------- */
  var state = {
    route: "home",
    arch: { view: "photos", year: 0, eraF: "", typeF: "", collF: "", sort: "date" },
    app: { year: 0, typeF: "", scopeF: "", q: "" },
    music: { tab: "solo" },
    quiz: { order: [], i: 0, score: 0, answered: false },
    compare: { a: 2016, b: 2025 },
    lb: { list: [], i: 0, kind: "photo", prevFocus: null },
    native: false
  };

  var ROUTES = ["home", "biography", "timeline", "music", "appearances", "archive", "fashion", "screen", "live", "records", "lloud", "sources"];
  var NAV_LABELS = {
    home: "Home", biography: "Biography", timeline: "Timeline", music: "Music",
    appearances: "Appearances", archive: "Archive", fashion: "Fashion", screen: "Screen",
    live: "Live", records: "Records", lloud: "LLOUD", sources: "Sources"
  };

  function currentRoute() {
    var h = (location.hash || "#/home").replace(/^#\/?/, "");
    h = h.split("?")[0].split("/")[0];
    return ROUTES.indexOf(h) >= 0 ? h : "home";
  }

  function go(route) { location.hash = "#/" + route; }

  /* ---------------- search index ---------------- */
  var searchIndex = null;
  function buildIndex() {
    if (searchIndex) return searchIndex;
    var ix = [];
    DB.timeline.forEach(function (t) { ix.push({ y: t.year, label: t.title, sub: "Timeline", route: "timeline", kw: (t.title + " " + t.body + " " + (t.location || "") + " " + (t.appearedAt || "")).toLowerCase() }); });
    DB.releases.forEach(function (r) { ix.push({ y: r.year, label: r.title, sub: "Release", route: "music", kw: (r.title + " " + r.artistLine + " " + r.label + " " + (r.tracks || []).map(function (t) { return t.title; }).join(" ")).toLowerCase() }); });
    DB.videos.forEach(function (v) { ix.push({ y: v.year, label: v.title, sub: "Video", route: "music", kw: (v.title + " " + (v.director || "") + " " + v.visualThesis).toLowerCase() }); });
    DB.appearances.forEach(function (a) { ix.push({ y: a.year, label: a.event, sub: "Appearance", route: "appearances", kw: (a.event + " " + a.city + " " + (a.venue || "") + " " + a.country + " " + a.setlistOrAction).toLowerCase() }); });
    DB.photos.forEach(function (p) { ix.push({ y: p.year, label: p.title, sub: "Photo", route: "archive", kw: (p.id + " " + p.title + " " + p.event + " " + (p.location || "") + " " + (p.hairEra || "") + " " + p.whyItMatters).toLowerCase() }); });
    DB.fashion.forEach(function (f) { ix.push({ y: f.since, label: f.house + " — " + f.role, sub: "Fashion", route: "fashion", kw: (f.house + " " + f.role + " " + f.notes + " " + (f.campaigns || []).join(" ")).toLowerCase() }); });
    DB.live.forEach(function (l) { ix.push({ y: parseInt(l.years, 10) || "", label: l.name, sub: "Live", route: "live", kw: (l.name + " " + l.notes + " " + (l.shows || []).join(" ")).toLowerCase() }); });
    DB.records.forEach(function (r) { ix.push({ y: r.year, label: r.title, sub: "Record", route: "records", kw: (r.title + " " + r.body).toLowerCase() }); });
    searchIndex = ix;
    return ix;
  }

  /* ---------------- lightbox ---------------- */
  var lbLists = {};

  function lbVisual(item, kind) {
    if (kind === "video") {
      return poster({ id: item.id, year: item.year, palette: eraPalette(item.era), motif: typeLabel(item.type), alt: item.title, kind: "video", typeLabel: item.director ? "dir. " + item.director : "" });
    }
    if (kind === "photo") {
      return poster({ id: item.id, year: item.year, palette: item.palette, motif: item.motif, alt: item.alt, typeLabel: typeLabel(item.type) });
    }
    return poster({ id: item.id || item.event || item.title, year: item.year, palette: eraPalette(item.era), motif: kind, alt: item.event || item.title });
  }

  function lbMeta(item, kind) {
    var rows = [];
    function row(k, v) { if (v) rows.push('<div class="lb-row"><dt>' + k + "</dt><dd>" + esc(v) + "</dd></div>"); }
    var html = "";
    if (kind === "photo") {
      html += '<div class="lb-id">' + esc(item.id) + "</div>";
      html += '<div class="lb-date">' + fmtDate(item.date, item.datePrecision) + (item.datePrecision !== "day" ? " · " + esc(item.datePrecision) + " precision" : "") + "</div>";
      html += '<h2 class="lb-title" id="lb-title">' + esc(item.title) + "</h2><dl>";
      row("Event", item.event); row("Location", item.location);
      row("Era", era(item.era).name + " · " + era(item.era).years);
      row("Type", typeLabel(item.type)); row("Source", item.sourceType);
      row("Collection", item.collection); row("Styling", item.hairEra);
      row("Purpose", item.purpose);
      html += "</dl>";
      if (item.whyItMatters) html += '<div class="lb-why"><strong>Why it matters</strong>' + esc(item.whyItMatters) + "</div>";
      if (item.confusedWith) html += '<div class="lb-confused"><strong>Often confused with</strong>' + esc(item.confusedWith) + "</div>";
      if (item.relatedVideoId) {
        var rv = DB.videos.filter(function (v) { return v.id === item.relatedVideoId; })[0];
        if (rv) html += '<a class="lb-watch" href="' + ytLink(rv.youtubeQuery || rv.title) + '" target="_blank" rel="noopener">Watch: ' + esc(rv.title) + " ↗</a>";
      }
    } else if (kind === "video") {
      html += '<div class="lb-id">' + esc(item.id).toUpperCase() + "</div>";
      html += '<div class="lb-date">' + fmtDate(item.date, item.datePrecision) + "</div>";
      html += '<h2 class="lb-title" id="lb-title">' + esc(item.title) + "</h2><dl>";
      row("Director", item.director); row("Type", typeLabel(item.type));
      row("Era", era(item.era).name + " · " + era(item.era).years);
      row("Premiered", item.premiere); row("Runtime", item.runtime);
      row("Lisa timestamp", item.stillsNote);
      html += "</dl>";
      if (item.visualThesis) html += '<div class="lb-why"><strong>Visual thesis</strong>' + esc(item.visualThesis) + "</div>";
      html += '<a class="lb-watch" href="' + ytLink(item.youtubeQuery || item.title) + '" target="_blank" rel="noopener">' + (item.upcoming ? "Preview on YouTube ↗" : "Watch on YouTube ↗") + "</a>";
      var stills = DB.photos.filter(function (p) { return p.relatedVideoId === item.id; });
      if (stills.length) {
        html += '<div class="lb-why"><strong>Photos from this video</strong>' +
          stills.map(function (s) { return esc(s.id) + " — " + esc(s.title) + " (" + fmtDate(s.date, s.datePrecision) + ")"; }).join(" · ") + "</div>";
      }
    } else if (kind === "appearance") {
      html += '<div class="lb-date">' + fmtDate(item.date, item.datePrecision) + (item.datePrecision !== "day" ? " · " + esc(item.datePrecision) + " precision" : "") + "</div>";
      html += '<h2 class="lb-title" id="lb-title">' + esc(item.event) + "</h2><dl>";
      row("City / venue", [item.city, item.venue].filter(Boolean).join(" — ")); row("Country", item.country);
      row("Capacity / broadcast", item.capacityOrBroadcast);
      row("Role", item.role + " · " + item.scope); row("Type", item.type);
      row("Setlist / action", item.setlistOrAction); row("Outfit era", item.outfitEra);
      html += "</dl>";
      if (item.whyItMatters) html += '<div class="lb-why"><strong>Why it matters</strong>' + esc(item.whyItMatters) + "</div>";
    } else if (kind === "release") {
      html += '<div class="lb-date">' + fmtDate(item.date, item.datePrecision) + "</div>";
      html += '<h2 class="lb-title" id="lb-title">' + esc(item.title) + "</h2><dl>";
      row("Artist", item.artistLine); row("Label", item.label);
      row("Format", item.type + " · " + item.scope);
      row("Era", era(item.era).name);
      if (item.lisaRole) row("Lisa's part", item.lisaRole);
      if (item.chartNotes) row("Chart notes", item.chartNotes);
      html += "</dl>";
      if ((item.tracks || []).length) {
        html += '<div class="lb-why"><strong>Tracklist</strong>' +
          item.tracks.map(function (t) { return String(t.n).padStart(2, "0") + ". " + esc(t.title) + (t.note ? " — " + esc(t.note) : ""); }).join("<br>") + "</div>";
      }
      if (item.notes) html += '<div class="lb-why"><strong>Notes</strong>' + esc(item.notes) + "</div>";
      html += '<a class="lb-watch" href="' + ytLink("LISA " + item.title) + '" target="_blank" rel="noopener">Find on YouTube ↗</a>';
    }
    return html;
  }

  function lbRender() {
    var lb = state.lb;
    var item = lb.list[lb.i];
    if (!item) return;
    $("#lb-visual").innerHTML = lbVisual(item, lb.kind);
    $("#lb-metabox").innerHTML = lbMeta(item, lb.kind);
    $("#lb-count").textContent = (lb.i + 1) + " / " + lb.list.length;
  }

  function lbOpen(listName, i, kind) {
    var list = lbLists[listName] || [];
    if (!list.length) return;
    state.lb = { list: list, i: i, kind: kind, prevFocus: document.activeElement };
    lbRender();
    $("#lightbox").classList.add("open");
    document.body.style.overflow = "hidden";
    $(".lb-close").focus();
  }
  function lbClose() {
    $("#lightbox").classList.remove("open");
    document.body.style.overflow = "";
    if (state.lb.prevFocus && state.lb.prevFocus.focus) state.lb.prevFocus.focus();
  }
  function lbStep(d) {
    var lb = state.lb;
    lb.i = (lb.i + d + lb.list.length) % lb.list.length;
    lbRender();
  }

  /* ---------------- shared widgets ---------------- */
  function yearBar(cur, onAttr) {
    var years = [0, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    return '<div class="yearbar" role="toolbar" aria-label="Filter by year">' + years.map(function (y) {
      return '<button data-' + onAttr + '="' + y + '" aria-pressed="' + (cur === y) + '">' + (y === 0 ? "ALL" : y) + "</button>";
    }).join("") + "</div>";
  }

  function chips(items, cur, attr, extraClass) {
    return items.map(function (c) {
      return '<button class="chip ' + (extraClass || "") + '" data-' + attr + '="' + esc(c.v) + '" aria-pressed="' + (cur === c.v) + '">' + esc(c.n) + "</button>";
    }).join("");
  }

  /* ---------------- HOME ---------------- */
  function onThisDay() {
    var now = new Date();
    var mmdd = String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    var pool = [];
    DB.timeline.forEach(function (t) { if (String(t.date).slice(5, 10) === mmdd && t.datePrecision === "day") pool.push({ y: t.year, t: t.title, s: "Timeline" }); });
    DB.releases.forEach(function (r) { if (String(r.date).slice(5, 10) === mmdd && r.datePrecision === "day") pool.push({ y: r.year, t: r.title, s: "Release" }); });
    DB.appearances.forEach(function (a) { if (String(a.date).slice(5, 10) === mmdd && a.datePrecision === "day") pool.push({ y: a.year, t: a.event, s: "Appearance" }); });
    if (mmdd === "03-27") pool.unshift({ y: 1997, t: "Lalisa Manobal is born in Buriram Province, Thailand", s: "Origin" });
    return { mmdd: mmdd, pool: pool, dateLabel: now.toLocaleDateString("en-GB", { day: "numeric", month: "long" }) };
  }

  function renderHome() {
    var stats = [
      { n: "2016.08.08", l: "BLACKPINK debut" },
      { n: "2021.09.10", l: "Solo debut — Lalisa" },
      { n: "2024", l: "LLOUD founded" },
      { n: "100M+", l: "Instagram followers" },
      { n: DB.records.length || "12", l: "Records & firsts logged" }
    ];
    var otd = onThisDay();
    var famous = DB.photos.filter(function (p) { return p.famous; }).sort(byDate);
    lbLists.homeFamous = famous;
    var upcomingPanel =
      '<div class="panel panel-gold reveal">' +
      '<h3><span class="live-dot" aria-hidden="true"></span>Now — the <em>2026</em> chapter</h3>' +
      '<p><strong>“Sawadika”</strong> pre-release single — 4 September 2026. <strong>Press Play</strong> EP — 23 October 2026. <strong>VIVA LA LISA</strong>, the first K-pop Las Vegas residency — The Colosseum at Caesars Palace, 13–14 & 27–28 November 2026. Earlier this year: “Bad Angel” with Anyma (8 April, surprised at Coachella 18 April), “Goals” with Anitta & Rema for the FIFA World Cup (21 May, opening-ceremony performance in June), and BLACKPINK’s <em>Deadline</em> EP (27 February).</p>' +
      '<div class="hero-cta-row" style="margin-top:18px"><a class="cta cta-line" href="#/timeline">Open 2026 in the timeline</a><a class="cta cta-line" href="#/live">Residency &amp; live</a></div>' +
      "</div>";

    return '<section class="hero wrap">' +
      '<div class="hero-ghost" aria-hidden="true">0327</div>' +
      '<div class="hero-kicker">The Complete Public Archive · 1997—2026</div>' +
      '<h1 class="hero-name">LALISA</h1>' +
      '<div class="hero-native">ลลิษา มโนบาล · 리사 · b. 27.03.1997 · Buriram, Thailand</div>' +
      '<p class="hero-thesis">' + esc(DB.bio.homeIntro || "") + "</p>" +
      '<div class="hero-cta-row">' +
      '<a class="cta cta-gold" href="#/archive">Enter the Archive</a>' +
      '<a class="cta cta-line" href="#/timeline">Timeline 1997–2026</a>' +
      '<a class="cta cta-line" href="#/music">Discography</a>' +
      "</div>" +
      '<div class="stat-row">' + stats.map(function (s) {
        return '<div class="stat"><div class="stat-num">' + esc(s.n) + '</div><div class="stat-label">' + esc(s.l) + "</div></div>";
      }).join("") + "</div>" +
      "</section>" +

      '<section class="section wrap">' +
      sectionHead("01", "Eras", "Ten eras, <em>one</em> archive", "Every photo, video, release, and appearance in this archive carries an era tag. Click an era to open its records.") +
      '<div class="era-carousel">' + DB.eras.map(function (e) {
        return '<button class="era-card" data-era-go="' + e.id + '" style="--ec:' + e.color + '">' +
          '<div class="ec-years">' + esc(e.years) + '</div><div class="ec-name">' + esc(e.name) + '</div><div class="ec-desc">' + esc(e.desc) + "</div></button>";
      }).join("") + "</div>" +
      upcomingPanel +
      "</section>" +

      '<section class="section wrap">' +
      sectionHead("02", "Icons", "The frames people <em>misdate</em>", "The most famous images in the catalog, each locked to its year, event, and purpose. Click any card for full accession data.") +
      '<div class="filmstrip">' + famous.map(function (p, i) { return photoCard(p, i, "homeFamous"); }).join("") + "</div>" +
      "</section>" +

      '<section class="section wrap">' +
      sectionHead("03", "Today", "On this day — <em>" + esc(otd.dateLabel) + "</em>") +
      (otd.pool.length
        ? '<div class="panel reveal"><dl>' + otd.pool.map(function (x) {
          return '<div class="lb-row"><dt>' + esc(String(x.y)) + "</dt><dd>" + esc(x.t) + ' <span class="sr-sub">' + esc(x.s) + "</span></dd></div>";
        }).join("") + "</dl></div>"
        : '<div class="panel reveal"><p>No day-precise record matches today’s date. The spine of this archive runs 27 March 1997 → 23 October 2026 — open the <a href="#/timeline">timeline</a> to scrub it.</p></div>') +
      '<div class="hero-cta-row" style="margin-top:26px"><a class="cta cta-line" href="#/archive" data-quiz-go="1">Play “Date this look”</a><a class="cta cta-line" href="#/records">Records &amp; firsts wall</a></div>' +
      "</section>";
  }

  /* ---------------- BIOGRAPHY ---------------- */
  function renderBiography() {
    var profile = [
      ["Stage name", "Lisa / LISA"],
      ["Legal name", "Lalisa Manobal — ลลิษา มโนบาล"],
      ["Birth name", "Pranpriya Manobal"],
      ["Born", "27 March 1997 · Buriram Province, Thailand"],
      ["Nationality", "Thai"],
      ["Group", "BLACKPINK — main dancer, lead rapper, sub-vocalist, maknae"],
      ["Solo company", "LLOUD (founded February 2024) · RCA Records partnership"],
      ["Height", "commonly listed ≈ 167 cm"],
      ["Blood type", "O"],
      ["Zodiac", "Aries"],
      ["Languages", "Thai, Korean, English — Japanese and other phrases in performance context"],
      ["Family (public)", "Raised by Thai mother Chitthip and Swiss stepfather, chef Marco Brüschweiler"],
      ["Instagram", "@lalalalisa_m"]
    ];
    return '<section class="section wrap">' +
      sectionHead("04", "Identity", "Biography — <em>Lalisa</em> Manobal", "“The one being praised.” She chose the name herself; the public record did the rest. Seven chapters, museum-length.", "1997") +
      '<table class="profile-table reveal"><tbody>' + profile.map(function (r) {
        return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>";
      }).join("") + "</tbody></table>" +
      '<div class="prose dropcap" style="margin-top:20px">' +
      (DB.bio.chapters || []).map(function (c, i) {
        return '<div class="chapter-num" style="margin-top:46px">CHAPTER ' + String(i + 1).padStart(2, "0") + "</div>" +
          "<h2>" + esc(c.title) + "</h2>" +
          (c.paragraphs || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
      }).join("") +
      "</div>" +
      '<div class="panel reveal" style="max-width:760px"><h3>Why this archive exists</h3><p>' + esc(DB.bio.missionNote || "") + "</p></div>" +
      "</section>" +
      '<section class="section wrap"><div class="kicker">Era essays</div>' +
      '<h1 class="display" style="font-size:clamp(30px,4vw,52px)">Twelve <em>essays</em>, ten eras</h1>' +
      '<div class="prose">' +
      (DB.essays || []).map(function (es, i) {
        var e = era(es.era);
        return '<div class="chapter-num" style="margin-top:52px">' + String(i + 1).padStart(2, "0") + " · " + esc(e.name.toUpperCase()) + " · " + esc(e.years) + "</div>" +
          "<h2>" + esc(es.title) + "</h2>" +
          '<div class="deck">' + esc(es.deck || "") + "</div>" +
          (es.paragraphs || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
      }).join("") +
      "</div></section>";
  }

  /* ---------------- TIMELINE ---------------- */
  function renderTimeline() {
    var evts = DB.timeline.slice().sort(byDate);
    var byYear = {};
    evts.forEach(function (t) { (byYear[t.year] = byYear[t.year] || []).push(t); });
    var years = Object.keys(byYear).sort();
    var html = "", side = 0;
    years.forEach(function (y) {
      html += '<div class="tl-yearmark" data-tl-era="' + esc(byYear[y][0].era) + '"><span>' + y + "</span></div>";
      byYear[y].forEach(function (t) {
        var c = catOf(t.category);
        html += '<article class="tl-node ' + (side++ % 2 ? "right" : "left") + ' reveal" style="--dot:' + c.color + '" data-tl-era="' + esc(t.era) + '">' +
          '<div class="tl-date">' + fmtDate(t.date, t.datePrecision) + (t.datePrecision !== "day" ? " · " + esc(t.datePrecision) : "") + "</div>" +
          '<h3 class="tl-title">' + esc(t.title) + "</h3>" +
          '<p class="tl-body">' + esc(t.body) + "</p>" +
          '<div class="tl-meta"><span class="tag" style="color:' + c.color + ';border-color:' + c.color + '44">' + esc(c.name) + "</span>" +
          '<span class="tag t-era">' + esc(era(t.era).name) + "</span>" +
          (t.appearedAt ? '<span class="tag">' + esc(t.appearedAt) + "</span>" : "") +
          (t.upcoming ? '<span class="tag t-up">Upcoming</span>' : "") +
          "</div></article>";
      });
    });
    return '<section class="section wrap">' +
      sectionHead("05", "Timeline", "The complete <em>public</em> timeline", esc(evts.length) + " dated nodes, 1997 → 2026. Category colors: <strong style='color:#FF2D7B'>group</strong> · <strong style='color:#C8B273'>solo</strong> · <strong style='color:#E03131'>live</strong> · <strong style='color:#8e7cc3'>acting</strong> · <strong style='color:#F4F1EA'>fashion</strong>. Dates carry honest precision — <em>c.</em> marks approximation.", "26") +
      '<div class="hero-cta-row" style="margin-top:22px"><button class="cta cta-line" onclick="window.print()">Print timeline poster</button></div>' +
      '<div class="timeline">' + (html || emptyState()) + "</div>" +
      "</section>";
  }

  /* ---------------- MUSIC ---------------- */
  function renderMusic() {
    var tab = state.music.tab;
    var tabs = [
      { v: "solo", n: "Solo / Lead" }, { v: "group", n: "BLACKPINK" },
      { v: "features", n: "Features & Collabs" }, { v: "videos", n: "Video Vault" }, { v: "charts", n: "Chart Notes" }
    ];
    var body = "";

    function releaseTable(rows, showRole) {
      if (!rows.length) return emptyState();
      lbLists["rel_" + tab] = rows;
      return '<div class="table-scroll"><table class="data-table"><thead><tr><th>Date</th><th>Title</th><th>Format</th><th>Label</th><th>' + (showRole ? "Lisa’s part" : "Notes") + "</th></tr></thead><tbody>" +
        rows.map(function (r, i) {
          return '<tr class="rel-row" data-lb="rel_' + tab + '" data-i="' + i + '" tabindex="0" role="button">' +
            "<td>" + fmtDate(r.date, r.datePrecision) + (r.upcoming ? ' <span class="tag t-up">Upcoming</span>' : "") + "</td>" +
            '<td><span class="dt-title">' + esc(r.title) + '</span><br><span style="font-size:11px;color:var(--silver-dim)">' + esc(r.artistLine) + "</span></td>" +
            "<td>" + esc(r.type) + "</td><td>" + esc(r.label) + "</td>" +
            "<td>" + esc(showRole ? (r.lisaRole || "—") : (r.notes || "")) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
    }

    if (tab === "solo") {
      var solo = DB.releases.filter(function (r) { return r.scope === "solo"; }).sort(byDate);
      body = releaseTable(solo, false);
      var albums = solo.filter(function (r) { return (r.tracks || []).length >= 5; });
      body += '<div class="panel-grid">' + albums.map(function (a) {
        return '<div class="panel panel-gold reveal"><h3><em>' + esc(a.title) + "</em> — " + a.year + "</h3>" +
          '<p style="font-family:var(--mono);font-size:11px;letter-spacing:0.08em">' +
          (a.tracks || []).map(function (t) { return String(t.n).padStart(2, "0") + " · " + esc(t.title); }).join("<br>") + "</p>" +
          "<p>" + esc(a.notes || "") + "</p></div>";
      }).join("") + "</div>";
    } else if (tab === "group") {
      body = releaseTable(DB.releases.filter(function (r) { return r.scope === "group"; }).sort(byDate), true);
    } else if (tab === "features") {
      body = releaseTable(DB.releases.filter(function (r) { return r.scope === "collab"; }).sort(byDate), false);
    } else if (tab === "videos") {
      var groups = [
        { n: "Official music videos", f: function (v) { return v.type === "mv" || v.type === "collab-mv"; } },
        { n: "Performance videos & short films", f: function (v) { return v.type === "performance" || v.type === "short-film" || v.type === "dance"; } },
        { n: "Group videography — Lisa time-stamped", f: function (v) { return v.scope === "group"; } },
        { n: "Self-directed / personal camera", f: function (v) { return v.type === "personal" || v.scope === "personal"; } }
      ];
      var used = {};
      body = groups.map(function (g, gi) {
        var list = DB.videos.filter(function (v) { return !used[v.id] && g.f(v); }).sort(byDate);
        list.forEach(function (v) { used[v.id] = 1; });
        if (!list.length) return "";
        lbLists["vid" + gi] = list;
        return '<div class="filmstrip-block"><div class="filmstrip-title"><h3>' + esc(g.n) + '</h3><span class="fs-count">' + list.length + ' RECORDS</span></div>' +
          '<div class="filmstrip">' + list.map(function (v, i) { return videoCard(v, i, "vid" + gi); }).join("") + "</div></div>";
      }).join("") || emptyState();
    } else if (tab === "charts") {
      var chartRows = DB.releases.filter(function (r) { return r.chartNotes; }).sort(byDate);
      body = '<div class="panel-grid">' + chartRows.map(function (r) {
        return '<div class="panel reveal"><h3>' + esc(r.title) + " <em>" + r.year + "</em></h3><p>" + esc(r.chartNotes) + "</p></div>";
      }).join("") + "</div>" +
        '<div class="plaque-wall">' + DB.records.filter(function (r) { return r.category === "chart" || r.category === "guinness"; }).map(plaque).join("") + "</div>";
    }

    return '<section class="section wrap">' +
      sectionHead("06", "Music", "Discography as a <em>database</em>", "Every release is a dated object: format, label, era, tracklist, Lisa’s part. " + DB.releases.length + " release records. Click a row for the full record.", "21") +
      '<div class="chips">' + chips(tabs, tab, "mtab") + "</div>" + body + "</section>";
  }

  /* ---------------- APPEARANCES ---------------- */
  function renderAppearances() {
    var f = state.app;
    var types = uniq(DB.appearances.map(function (a) { return a.type; })).sort();
    var rows = DB.appearances.filter(function (a) {
      if (f.year && a.year !== f.year) return false;
      if (f.typeF && a.type !== f.typeF) return false;
      if (f.scopeF && a.scope !== f.scopeF) return false;
      return true;
    }).sort(byDate);
    lbLists.apps = rows;
    var table = rows.length
      ? '<div class="table-scroll"><table class="data-table"><thead><tr><th>Date</th><th>Event</th><th>City</th><th>Role</th><th>Type</th><th>Why it matters</th></tr></thead><tbody>' +
      rows.map(function (a, i) {
        return '<tr data-lb="apps" data-i="' + i + '" tabindex="0" role="button">' +
          "<td>" + fmtDate(a.date, a.datePrecision) + (a.datePrecision !== "day" ? "<br><span style='color:var(--silver-dim);font-size:9px'>" + esc(a.datePrecision) + " precision</span>" : "") + (a.upcoming ? ' <span class="tag t-up">Upcoming</span>' : "") + "</td>" +
          '<td><span class="dt-title">' + esc(a.event) + "</span></td>" +
          "<td>" + esc(a.city) + (a.venue ? "<br><span style='font-size:10px;color:var(--silver-dim)'>" + esc(a.venue) + "</span>" : "") + "</td>" +
          "<td>" + esc(a.role) + " · " + esc(a.scope) + "</td><td>" + esc(a.type) + "</td>" +
          '<td style="max-width:300px">' + esc(a.whyItMatters) + "</td></tr>";
      }).join("") + "</tbody></table></div>"
      : emptyState("No appearance records match this filter.");
    return '<section class="section wrap">' +
      sectionHead("07", "Appearances", "Where she <em>showed up</em>", DB.appearances.length + " appearance records — award shows, festivals, fashion weeks, broadcasts, ceremonies, tours. Filter by year, type, and solo vs group. Where only a year is public, the record says so.", "24") +
      yearBar(f.year, "appyear") +
      '<div class="filter-row"><span class="filter-label">Type</span><div class="chips" style="margin:0">' +
      chips([{ v: "", n: "All" }].concat(types.map(function (t) { return { v: t, n: t }; })), f.typeF, "apptype") +
      '</div><span class="filter-label">Scope</span><div class="chips" style="margin:0">' +
      chips([{ v: "", n: "All" }, { v: "solo", n: "Solo" }, { v: "group", n: "BLACKPINK" }], f.scopeF, "appscope") +
      '</div><span class="result-count">' + rows.length + " / " + DB.appearances.length + " RECORDS</span></div>" +
      table + "</section>";
  }

  /* ---------------- VISUAL ARCHIVE ---------------- */
  function quizSet() {
    if (state.quiz.order.length) return state.quiz.order;
    var preferred = ["LISA-2021-LALISA-MV-01", "LISA-2024-VSFS-01", "LISA-2025-OSCARS-01", "LISA-2013-RINGA-01", "LISA-2019-COACHELLA-01"];
    var picks = [];
    preferred.forEach(function (id) {
      var p = DB.photos.filter(function (x) { return x.id === id; })[0];
      if (p) picks.push(p);
    });
    DB.photos.filter(function (p) { return p.famous && picks.indexOf(p) < 0; }).some(function (p) {
      if (picks.length >= 5) return true;
      picks.push(p); return false;
    });
    state.quiz.order = picks;
    return picks;
  }

  function renderArchive() {
    var f = state.arch;
    var view = f.view;
    var viewsRow = '<div class="chips">' + chips([
      { v: "photos", n: "Photo wall" }, { v: "videos", n: "Video wall" },
      { v: "compare", n: "Compare two years" }, { v: "quiz", n: "Date this look" }
    ], view, "aview", "chip-pink") + "</div>";
    var inner = "";

    if (view === "photos") {
      var colls = uniq(DB.photos.map(function (p) { return p.collection; })).sort();
      var types = uniq(DB.photos.map(function (p) { return p.type; })).sort();
      var list = DB.photos.filter(function (p) {
        if (f.year && p.year !== f.year) return false;
        if (f.eraF && p.era !== f.eraF) return false;
        if (f.typeF && p.type !== f.typeF) return false;
        if (f.collF && p.collection !== f.collF) return false;
        return true;
      });
      list = f.sort === "date" ? list.sort(byDate) : list.sort(function (a, b) { return (b.famous ? 1 : 0) - (a.famous ? 1 : 0) || (sortKey(a.date) < sortKey(b.date) ? -1 : 1); });
      lbLists.arch = list;
      inner = yearBar(f.year, "archyear") +
        '<div class="filter-row">' +
        '<span class="filter-label">Era</span><select class="archive-select" data-sel="eraF"><option value="">All eras</option>' +
        DB.eras.map(function (e) { return '<option value="' + e.id + '"' + (f.eraF === e.id ? " selected" : "") + ">" + esc(e.name) + " " + esc(e.years) + "</option>"; }).join("") + "</select>" +
        '<span class="filter-label">Type</span><select class="archive-select" data-sel="typeF"><option value="">All types</option>' +
        types.map(function (t) { return '<option value="' + esc(t) + '"' + (f.typeF === t ? " selected" : "") + ">" + esc(typeLabel(t)) + "</option>"; }).join("") + "</select>" +
        '<span class="filter-label">Collection</span><select class="archive-select" data-sel="collF"><option value="">All collections</option>' +
        colls.map(function (c) { return '<option value="' + esc(c) + '"' + (f.collF === c ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select>" +
        '<span class="filter-label">Sort</span><select class="archive-select" data-sel="sort"><option value="date"' + (f.sort === "date" ? " selected" : "") + '>By date</option><option value="famous"' + (f.sort === "famous" ? " selected" : "") + '>Iconic first</option></select>' +
        '<span class="result-count">' + list.length + " / " + DB.photos.length + " RECORDS</span></div>" +
        (list.length ? '<div class="masonry">' + list.map(function (p, i) { return photoCard(p, i, "arch"); }).join("") + "</div>" : emptyState("No photo records match this filter — clear a chip or two."));
    } else if (view === "videos") {
      var vlist = DB.videos.filter(function (v) { return !f.year || v.year === f.year; }).sort(byDate);
      lbLists.archvid = vlist;
      inner = yearBar(f.year, "archyear") +
        (vlist.length ? '<div class="cardgrid">' + vlist.map(function (v, i) { return videoCard(v, i, "archvid"); }).join("") + "</div>" : emptyState("No video records for this year."));
    } else if (view === "compare") {
      inner = renderCompare();
    } else {
      inner = renderQuiz();
    }

    return '<section class="section wrap">' +
      sectionHead("08", "Visual Archive", "What year was <em>this</em> pic?", "Every card answers: what year, where, what event, what it was for. " + DB.photos.length + " photo records and " + DB.videos.length + " video records — designed frames with exact captions, in place of embeds this archive cannot legally host.", "27") +
      viewsRow + inner + "</section>";
  }

  function renderCompare() {
    var years = [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    function col(y) {
      var ph = DB.photos.filter(function (p) { return p.year === y; });
      var rel = DB.releases.filter(function (r) { return r.year === y; });
      var ap = DB.appearances.filter(function (a) { return a.year === y; });
      var evEra = (DB.timeline.filter(function (t) { return t.year === y; })[0] || {}).era;
      return '<div class="compare-col reveal"><h4>' + y + '</h4><div class="cc-era">' + esc(era(evEra).name) + " era · " + ph.length + " photos · " + rel.length + " releases · " + ap.length + " appearances</div>" +
        '<ul class="cc-list">' +
        rel.slice(0, 4).map(function (r) { return '<li><span class="mono">' + fmtDate(r.date, r.datePrecision) + "</span>" + esc(r.title) + "</li>"; }).join("") +
        ap.slice(0, 4).map(function (a) { return '<li><span class="mono">' + fmtDate(a.date, a.datePrecision) + "</span>" + esc(a.event) + "</li>"; }).join("") +
        ph.slice(0, 3).map(function (p) { return '<li><span class="mono">' + esc(p.id) + "</span>" + esc(p.title) + "</li>"; }).join("") +
        "</ul></div>";
    }
    return '<div class="compare-controls"><span class="filter-label">Year A</span>' +
      '<select class="archive-select" data-cmp="a">' + years.map(function (y) { return "<option" + (state.compare.a === y ? " selected" : "") + ">" + y + "</option>"; }).join("") + "</select>" +
      '<span class="compare-vs">vs</span><span class="filter-label">Year B</span>' +
      '<select class="archive-select" data-cmp="b">' + years.map(function (y) { return "<option" + (state.compare.b === y ? " selected" : "") + ">" + y + "</option>"; }).join("") + "</select></div>" +
      '<div class="compare-grid">' + col(state.compare.a) + col(state.compare.b) + "</div>";
  }

  function renderQuiz() {
    var qs = quizSet();
    if (!qs.length) return emptyState("The quiz needs the photo archive to load.");
    var q = state.quiz;
    if (q.i >= qs.length) {
      return '<div class="panel panel-gold" style="text-align:center"><h3>Archive literacy: <em>' + q.score + " / " + qs.length + '</em></h3>' +
        "<p>You can now separate a 2021 <em>Lalisa</em> throne still from a 2025 <em>Alter Ego</em> frame. That is the whole point of this site.</p>" +
        '<div class="hero-cta-row" style="justify-content:center"><button class="cta cta-gold" data-quiz-reset="1">Play again</button></div></div>';
    }
    var item = qs[q.i];
    var correct = item.year;
    var opts = [correct];
    var offs = [1, -2, 3, -1, 2, -3, 4];
    for (var i = 0; opts.length < 4 && i < offs.length; i++) {
      var cand = correct + offs[(hash(item.id) + i) % offs.length];
      if (cand >= 2009 && cand <= 2026 && opts.indexOf(cand) < 0) opts.push(cand);
    }
    opts.sort();
    return '<div class="quiz-stage">' +
      '<div class="record-card" style="cursor:default"><div class="rc-poster">' +
      poster({ id: item.id, year: item.year, palette: item.palette, motif: item.motif, alt: "Mystery look — date this image", hideYear: !q.answered, typeLabel: typeLabel(item.type) }) +
      "</div>" + (q.answered ? '<div class="rc-body"><div class="rc-date">' + fmtDate(item.date, item.datePrecision) + '</div><div class="rc-title">' + esc(item.title) + "</div></div>" : "") + "</div>" +
      "<div>" +
      '<div class="kicker">Date this look · ' + (q.i + 1) + " / " + qs.length + "</div>" +
      '<h3 class="display" style="font-size:clamp(24px,3vw,36px)">Which <em>year</em> is this frame from?</h3>' +
      '<div class="quiz-options" style="margin-top:22px">' + opts.map(function (o) {
        var cls = q.answered ? (o === correct ? " correct" : (o === q.picked ? " wrong" : "")) : "";
        return '<button class="quiz-opt' + cls + '" data-quiz-pick="' + o + '"' + (q.answered ? " disabled" : "") + ">" + o + "</button>";
      }).join("") + "</div>" +
      (q.answered
        ? '<div class="quiz-reveal"><strong>' + fmtDate(item.date, item.datePrecision) + " — " + esc(item.event) + ".</strong> " + esc(item.whyItMatters) +
        '</div><div class="hero-cta-row" style="margin-top:20px"><button class="cta cta-gold" data-quiz-next="1">' + (q.i + 1 >= qs.length ? "See score" : "Next frame") + "</button></div>"
        : "") +
      '<div class="quiz-score">SCORE ' + q.score + " / " + qs.length + "</div>" +
      "</div></div>";
  }

  /* ---------------- FASHION ---------------- */
  function renderFashion() {
    var fRecs = DB.photos.filter(function (p) { return p.type === "fashion" || p.type === "campaign" || p.type === "magazine" || p.type === "red-carpet"; }).sort(byDate);
    lbLists.fash = fRecs;
    return '<section class="section wrap">' +
      sectionHead("09", "Fashion Houses", "Fashion as a <em>career pillar</em>", "Ambassadorships and campaigns as publicly announced — with start years, roles, and confidence labels where the record is thinner.", "20") +
      '<div class="panel-grid">' + DB.fashion.map(function (h) {
        return '<div class="panel ' + (h.confidence === "confirmed" ? "panel-gold" : "") + ' reveal">' +
          '<h3>' + esc(h.house) + " <em>" + esc(String(h.since)) + "—</em></h3>" +
          '<p style="font-family:var(--mono);font-size:10.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold)">' + esc(h.role) + " · " + esc(h.status) + (h.confidence === "reported" ? " · reported" : "") + "</p>" +
          "<p>" + esc(h.notes) + "</p>" +
          ((h.campaigns || []).length ? '<p style="font-size:11.5px;color:var(--silver-dim)">' + h.campaigns.map(esc).join("<br>") + "</p>" : "") +
          "</div>";
      }).join("") + "</div>" +
      '<div class="filmstrip-block"><div class="filmstrip-title"><h3>Fashion frames, dated</h3><span class="fs-count">' + fRecs.length + ' RECORDS</span></div>' +
      '<div class="filmstrip">' + fRecs.map(function (p, i) { return photoCard(p, i, "fash"); }).join("") + "</div></div>" +
      "</section>";
  }

  /* ---------------- SCREEN ---------------- */
  function renderScreen() {
    var stills = DB.photos.filter(function (p) { return p.type === "acting-still"; }).sort(byDate);
    lbLists.screen = stills;
    return '<section class="section wrap">' +
      sectionHead("10", "Screen", "Acting, labeled <em>as acting</em>", "Character stills never mix into the performance archive unlabeled. Where sources conflict on a name, the conflict is shown, not resolved by guesswork.", "25") +
      '<div class="prose" style="margin-top:26px">' + (DB.bio.screenCopy || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" +
      (stills.length ? '<div class="cardgrid">' + stills.map(function (p, i) { return photoCard(p, i, "screen"); }).join("") + "</div>" : "") +
      "</section>";
  }

  /* ---------------- LIVE ---------------- */
  function renderLive() {
    var rows = DB.live.slice().sort(function (a, b) { return (parseInt(a.years, 10) || 0) - (parseInt(b.years, 10) || 0); });
    return '<section class="section wrap">' +
      sectionHead("11", "Live", "Stages, <em>dated</em>", DB.live.length + " live records — group tours, solo stages inside them, festivals, cabaret, ceremonies, and the first K-pop Las Vegas residency.", "26") +
      rows.map(function (l) {
        return '<div class="panel ' + (l.upcoming ? "panel-gold" : "") + ' reveal">' +
          '<div class="kicker" style="margin-bottom:10px">' + esc(l.years) + " · " + esc(l.type) + " · " + esc(l.scope) + (l.upcoming ? ' · <span style="color:var(--red)">UPCOMING</span>' : "") + "</div>" +
          "<h3>" + esc(l.name) + "</h3>" +
          '<p style="font-family:var(--mono);font-size:11px;color:var(--gold)">' + esc(l.dates) + "</p>" +
          "<p>" + esc(l.notes) + "</p>" +
          ((l.shows || []).length ? '<p style="font-size:11.5px;color:var(--silver-dim);line-height:1.9">' + l.shows.map(esc).join("<br>") + "</p>" : "") +
          ((l.lisaSoloMoments || []).length ? '<div class="rc-tags">' + l.lisaSoloMoments.map(function (m) { return '<span class="tag t-live">' + esc(m) + "</span>"; }).join("") + "</div>" : "") +
          "</div>";
      }).join("") +
      "</section>";
  }

  /* ---------------- RECORDS ---------------- */
  function plaque(r) {
    return '<div class="plaque reveal"><div class="plaque-cat">' + esc(r.category) + '</div><div class="plaque-year">' + r.year + '</div><div class="plaque-title">' + esc(r.title) + '</div><div class="plaque-body">' + esc(r.body) + "</div></div>";
  }
  function renderRecords() {
    return '<section class="section wrap">' +
      sectionHead("12", "Records & Firsts", "A wall of <em>plaques</em>", "Guinness entries and industry firsts, each dated. A first is a fact about a year — so every plaque names one.", "01") +
      '<div class="plaque-wall">' + (DB.records.length ? DB.records.slice().sort(function (a, b) { return a.year - b.year; }).map(plaque).join("") : emptyState()) + "</div>" +
      "</section>";
  }

  /* ---------------- LLOUD ---------------- */
  function renderLloud() {
    return '<section class="section wrap">' +
      sectionHead("13", "LLOUD", "The <em>independence</em> company", "Founded February 2024. The corporate hinge of the whole archive: before it, eras belong to labels; after it, they belong to her.", "24") +
      '<div class="prose dropcap" style="margin-top:30px">' + (DB.bio.lloudCopy || []).map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" +
      '<div class="panel-grid">' +
      '<div class="panel reveal"><h3>2024 <em>output</em></h3><p>Rockstar (June) · New Woman feat. Rosalía (August) · Moonlit Floor (October) — three singles that walked Alter Ego into the world, released through LLOUD in partnership with RCA Records.</p></div>' +
      '<div class="panel reveal"><h3>The <em>structure</em></h3><p>Group activities remain with YG Entertainment; solo music, brand, and image run through LLOUD. The archive tags every record accordingly — scope: group or solo is never ambiguous here.</p></div>' +
      "</div></section>";
  }

  /* ---------------- SOURCES ---------------- */
  function renderSources() {
    return '<section class="section wrap">' +
      sectionHead("14", "Sources & Status", "A <em>sober</em> sources page", "This is a curated public-record fan archive — not an official LLOUD, YG Entertainment, or RCA Records property.") +
      '<div class="prose" style="margin-top:26px"><p>' + esc(DB.bio.sourcesCopy || "") + "</p></div>" +
      '<div class="panel-grid">' +
      '<div class="panel reveal"><h3>Source classes</h3><p>Wikipedia and its cited press · Billboard and chart trades · official YouTube channels (BLACKPINK, LLOUD, Lilifilm) · award-show broadcasts · label and brand announcements · Guinness World Records listings.</p></div>' +
      '<div class="panel panel-gold reveal"><h3>Confirmed vs upcoming — as of <em>27 Aug 2026</em></h3><p><strong>Released / occurred:</strong> everything dated on or before 27 August 2026, including Deadline EP (Feb 2026), Bad Angel (Apr 2026), Goals (May 2026), the FIFA World Cup opening performance (June 2026).</p><p><strong>Announced, not yet occurred:</strong> “Sawadika” (4 Sep 2026) · Press Play EP (23 Oct 2026) · VIVA LA LISA residency nights (13–14 &amp; 27–28 Nov 2026). These carry an Upcoming tag on every card.</p></div>' +
      '<div class="panel reveal"><h3>Dating policy</h3><p>day precision = full date public · month = month public, day not · year = only the year is solid · c. = approximate. Where sources conflict (a character name, a ceremony’s exact billing), the card shows the conflict instead of silently picking a side.</p></div>' +
      '<div class="panel reveal"><h3>Imagery policy</h3><p>No copyrighted photography is embedded. Every visual entry is a designed Record Card — year, event, purpose, source type — so the archive stays legal and the dating stays the point. Official videos are linked out to YouTube, never re-hosted.</p></div>' +
      "</div></section>";
  }

  /* ---------------- footer / shell ---------------- */
  function renderFooter() {
    return '<div class="wrap"><div class="footer-grid">' +
      '<div><div class="footer-mark">LALISA <em>/ 0327</em></div><p class="footer-note">' + esc(DB.bio.onThisArchive || "") + " " + esc(DB.bio.missionNote || "") + "</p></div>" +
      '<div class="footer-col"><h5>Archive</h5><a href="#/timeline">Timeline</a><a href="#/music">Music</a><a href="#/archive">Visual archive</a><a href="#/appearances">Appearances</a><a href="#/live">Live</a></div>' +
      '<div class="footer-col"><h5>Index</h5><a href="#/biography">Biography</a><a href="#/fashion">Fashion</a><a href="#/screen">Screen</a><a href="#/records">Records</a><a href="#/lloud">LLOUD</a><a href="#/sources">Sources</a></div>' +
      '</div><div class="footer-bottom"><span>CURATED PUBLIC-RECORD FAN ARCHIVE · NOT AFFILIATED WITH LLOUD / YG / RCA</span><span>EN · ไทย · 한국어 READY — 1997–2026</span></div></div>';
  }

  var RENDER = {
    home: renderHome, biography: renderBiography, timeline: renderTimeline, music: renderMusic,
    appearances: renderAppearances, archive: renderArchive, fashion: renderFashion, screen: renderScreen,
    live: renderLive, records: renderRecords, lloud: renderLloud, sources: renderSources
  };

  function updateNav() {
    $$(".mainnav a, .bottomnav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === state.route);
    });
  }

  function updateEraChip(text) {
    var chip = $("#era-chip");
    if (chip) chip.textContent = text || "1997—2026";
  }

  var revealIO = null;
  function observeReveals() {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal").forEach(function (el) { el.classList.add("in"); });
      return;
    }
    if (revealIO) revealIO.disconnect();
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); revealIO.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(function (el) { revealIO.observe(el); });
  }

  var tiltBound = false;
  function bindTilt() {
    if (tiltBound) return;
    tiltBound = true;
    if (!window.matchMedia || !matchMedia("(hover:hover)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".record-card");
      if (!card) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--ry", (x * 5).toFixed(2) + "deg");
      card.style.setProperty("--rx", (-y * 5).toFixed(2) + "deg");
    });
    document.addEventListener("pointerout", function (e) {
      var card = e.target.closest && e.target.closest(".record-card");
      if (card) { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); }
    });
  }

  function render() {
    state.route = currentRoute();
    var view = $("#view");
    view.innerHTML = (RENDER[state.route] || renderHome)();
    updateNav();
    window.scrollTo(0, 0);
    observeReveals();
    var chipText = { home: "1997—2026", timeline: "SCRUB THE SPINE", archive: state.arch.eraF ? era(state.arch.eraF).name.toUpperCase() : "ALL ERAS" }[state.route];
    updateEraChip(chipText || NAV_LABELS[state.route].toUpperCase());
    document.title = "LISA (Lalisa Manobal) — " + (state.route === "home" ? "Complete Career Archive | Photos, Videos, Appearances by Year" : NAV_LABELS[state.route] + " | Complete Career Archive");
  }

  /* ---------------- event delegation ---------------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    var el;

    if ((el = t.closest("[data-lb]"))) {
      var kindMap = { arch: "photo", homeFamous: "photo", fash: "photo", screen: "photo", apps: "appearance", archvid: "video" };
      var ln = el.getAttribute("data-lb");
      var kind = kindMap[ln] || (ln.indexOf("vid") === 0 ? "video" : ln.indexOf("rel") === 0 ? "release" : "photo");
      lbOpen(ln, parseInt(el.getAttribute("data-i"), 10), kind);
      return;
    }
    if ((el = t.closest("[data-era-go]"))) {
      state.arch.eraF = el.getAttribute("data-era-go");
      state.arch.view = "photos"; state.arch.year = 0; state.arch.collF = ""; state.arch.typeF = "";
      if (state.route === "archive") render(); else go("archive");
      return;
    }
    if ((el = t.closest("[data-quiz-go]"))) {
      state.arch.view = "quiz";
      if (state.route === "archive") render(); else go("archive");
      return;
    }
    if ((el = t.closest("[data-mtab]"))) { state.music.tab = el.getAttribute("data-mtab"); render(); return; }
    if ((el = t.closest("[data-aview]"))) { state.arch.view = el.getAttribute("data-aview"); render(); return; }
    if ((el = t.closest("[data-archyear]"))) { state.arch.year = parseInt(el.getAttribute("data-archyear"), 10); render(); return; }
    if ((el = t.closest("[data-appyear]"))) { state.app.year = parseInt(el.getAttribute("data-appyear"), 10); render(); return; }
    if ((el = t.closest("[data-apptype]"))) { state.app.typeF = el.getAttribute("data-apptype"); render(); return; }
    if ((el = t.closest("[data-appscope]"))) { state.app.scopeF = el.getAttribute("data-appscope"); render(); return; }
    if ((el = t.closest("[data-quiz-pick]"))) {
      if (!state.quiz.answered) {
        state.quiz.picked = parseInt(el.getAttribute("data-quiz-pick"), 10);
        state.quiz.answered = true;
        if (state.quiz.picked === state.quiz.order[state.quiz.i].year) state.quiz.score++;
        render();
      }
      return;
    }
    if ((el = t.closest("[data-quiz-next]"))) { state.quiz.i++; state.quiz.answered = false; render(); return; }
    if ((el = t.closest("[data-quiz-reset]"))) { state.quiz = { order: [], i: 0, score: 0, answered: false }; render(); return; }
    if (t.closest("#search-open")) { openSearch(); return; }
    if (t.closest("#lang-toggle")) {
      state.native = !state.native;
      document.body.classList.toggle("show-native", state.native);
      $("#lang-toggle").textContent = state.native ? "TH·KR" : "EN";
      return;
    }
    if (t.closest(".lb-close") || (t.id === "lightbox" && !t.closest(".lightbox-inner"))) { lbClose(); return; }
    if (t.closest(".lb-prev")) { lbStep(-1); return; }
    if (t.closest(".lb-next")) { lbStep(1); return; }
    if (t.id === "search-overlay") { closeSearch(); return; }
  });

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.matches("[data-sel]")) { state.arch[t.getAttribute("data-sel")] = t.value; render(); }
    if (t.matches("[data-cmp]")) { state.compare[t.getAttribute("data-cmp")] = parseInt(t.value, 10); render(); }
  });

  document.addEventListener("keydown", function (e) {
    var lbOpenNow = $("#lightbox").classList.contains("open");
    var seOpenNow = $("#search-overlay").classList.contains("open");
    if (e.key === "Escape") { if (lbOpenNow) lbClose(); if (seOpenNow) closeSearch(); return; }
    if (lbOpenNow) {
      if (e.key === "ArrowLeft") lbStep(-1);
      if (e.key === "ArrowRight") lbStep(1);
      if (e.key === "Tab") trapFocus(e, $(".lightbox-inner").parentElement);
      return;
    }
    if (seOpenNow) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { moveSearchSel(e.key === "ArrowDown" ? 1 : -1); e.preventDefault(); }
      if (e.key === "Enter") { var sel = $(".sr-item.sel"); if (sel) sel.click(); }
      return;
    }
    if (e.key === "/" && !e.target.matches("input,textarea,select")) { e.preventDefault(); openSearch(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
    // Enter/Space activate row "buttons"
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("tr[data-lb]")) { e.preventDefault(); e.target.click(); }
  });

  function trapFocus(e, container) {
    var focusables = $$("button, a, input, select, [tabindex]", container).filter(function (el) { return !el.disabled; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  }

  /* ---------------- search ---------------- */
  function openSearch() {
    $("#search-overlay").classList.add("open");
    var inp = $("#search-input");
    inp.value = ""; runSearch("");
    setTimeout(function () { inp.focus(); }, 60);
    document.body.style.overflow = "hidden";
  }
  function closeSearch() {
    $("#search-overlay").classList.remove("open");
    document.body.style.overflow = "";
  }
  function runSearch(q) {
    var ix = buildIndex();
    q = q.trim().toLowerCase();
    var out = !q ? ix.slice().sort(function (a, b) { return (b.y || 0) - (a.y || 0); }).slice(0, 12)
      : ix.filter(function (r) { return r.kw.indexOf(q) >= 0 || String(r.y) === q; }).slice(0, 30);
    $("#search-results").innerHTML = out.length
      ? out.map(function (r, i) {
        return '<button class="sr-item' + (i === 0 ? " sel" : "") + '" data-sr-route="' + r.route + '"><span class="sr-year">' + esc(String(r.y || "—")) + '</span><span class="sr-label">' + esc(r.label) + '</span><span class="sr-sub">' + esc(r.sub) + "</span></button>";
      }).join("")
      : '<div class="sr-empty">Nothing in the catalog matches “' + esc(q) + "”.</div>";
  }
  function moveSearchSel(d) {
    var items = $$(".sr-item");
    if (!items.length) return;
    var cur = items.findIndex(function (el) { return el.classList.contains("sel"); });
    var next = Math.max(0, Math.min(items.length - 1, cur + d));
    items.forEach(function (el, i) { el.classList.toggle("sel", i === next); });
    items[next].scrollIntoView({ block: "nearest" });
  }
  document.addEventListener("input", function (e) {
    if (e.target.id === "search-input") runSearch(e.target.value);
  });
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-sr-route]");
    if (el) { closeSearch(); go(el.getAttribute("data-sr-route")); }
  });

  /* ---------------- boot ---------------- */
  function boot() {
    // top nav
    $("#mainnav").innerHTML = ROUTES.map(function (r) {
      return '<a href="#/' + r + '" data-route="' + r + '">' + NAV_LABELS[r] + "</a>";
    }).join("");
    $("#bottomnav").innerHTML = [
      ["home", "L", "Home"], ["timeline", "26", "Timeline"], ["music", "♪", "Music"],
      ["archive", "◧", "Photos"], ["live", "●", "Live"]
    ].map(function (r) {
      return '<a href="#/' + r[0] + '" data-route="' + r[0] + '"><span class="bn-glyph">' + r[1] + "</span>" + r[2] + "</a>";
    }).join("");
    $("#site-footer").innerHTML = renderFooter();

    window.addEventListener("hashchange", render);
    render();
    bindTilt();

    // loading veil: play once per session
    var veil = $("#load-veil");
    var seen = false;
    try { seen = sessionStorage.getItem("lalisa-veil") === "1"; } catch (err) { }
    if (seen) { veil.classList.add("gone"); }
    else {
      setTimeout(function () {
        veil.classList.add("gone");
        try { sessionStorage.setItem("lalisa-veil", "1"); } catch (err) { }
      }, 1900);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
