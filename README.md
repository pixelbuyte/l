# LALISA — The Complete Public Archive

A museum-grade, single-project website dedicated to the public career of **Lalisa Manobal (Lisa of BLACKPINK)** — built as a hybrid of a high-fashion exhibition, a career database, and a year-by-year appearance vault. Every photo, video, release, and appearance record carries a **year, date precision, event, location, purpose, era tag, and source type**.

No copyrighted photography is embedded: every visual entry is a **designed Record Card** (generated SVG poster + exact caption), and official videos are linked out to YouTube rather than re-hosted.

**This is a curated public-record fan archive — not an official LLOUD, YG Entertainment, or RCA Records property.**

## Running it

Static site, no build step required:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Single-file distribution (everything inlined into one HTML file):

```bash
python3 tools/build.py     # → dist/lalisa-archive.html
```

## Sitemap

Hash-routed single-page app with persistent top nav (desktop) and bottom nav (mobile):

| Route | Section | Contents |
|---|---|---|
| `#/home` | Home | Cinematic hero, stats row, era carousel, 2026 "featured now" panel, iconic frames strip, On This Day |
| `#/biography` | Identity | Profile table, 7 biography chapters, 12 era essays |
| `#/timeline` | Timeline | 60+ dated nodes 1997→2026, category colors, honest date precision, printable poster view |
| `#/music` | Music | Solo/lead, BLACKPINK, features tabs; release tables with tracklists; video vault filmstrips; chart notes |
| `#/appearances` | Appearances | Searchable/filterable database — year slider, type, solo vs group |
| `#/archive` | Visual Archive | Photo wall (masonry) + video wall + **Compare two years** + **Date this look** quiz; lightbox with full accession data |
| `#/fashion` | Fashion Houses | Ambassadorships with confidence labels, dated fashion frames |
| `#/screen` | Screen | The White Lotus (labeled as acting, Mook/Pearl naming conflict shown), reported projects |
| `#/live` | Live | Tours, residencies, festivals, ceremonies — shows and solo-insert songs |
| `#/records` | Records & Firsts | Plaque wall (Guinness, firsts, chart records) |
| `#/lloud` | LLOUD | Company story and independence framing |
| `#/sources` | Sources & Status | Source classes, dating policy, imagery policy, confirmed vs upcoming |

Global features: search overlay (`/` or `Ctrl/Cmd-K`), keyboard-accessible lightbox (Esc/arrows/focus trap), year scrubber 2013–2026, language-toggle-ready name labels (EN/TH/KR), loading sequence (gold *L* → 0327), reduced-motion support, print stylesheet for the timeline.

## Data model

All content lives in `js/data/*.js` as plain objects on `window.DB` — modular, so records can be appended without touching app code:

- `DB.eras` — 10 era registry (`predebut, debut, iya, thealbum, lalisa, bornpink, lloud, alterego, deadline, pressplay`) with colors
- `DB.timeline[]` — `{id, date, datePrecision(day|month|year|approx), year, title, category, era, body, location, appearedAt, upcoming}`
- `DB.releases[]` — `{id, title, artistLine, type, scope(solo|group|collab), date, datePrecision, year, label, era, tracks[], notes, chartNotes, lisaRole, upcoming}`
- `DB.videos[]` — `{id, title, date, year, director, type(mv|performance|short-film|…), scope, era, visualThesis, premiere, youtubeQuery, stillsNote, upcoming}`
- `DB.appearances[]` — `{id, year, date, datePrecision, event, city, venue, country, capacityOrBroadcast, role, scope, type, setlistOrAction, outfitEra, whyItMatters, era, upcoming}`
- `DB.photos[]` — Record Cards with **Look IDs** (`LISA-2021-LALISA-MV-01`): `{id, year, date, datePrecision, title, type, event, location, era, collection, sourceType, purpose, whyItMatters, alt, palette[2], motif, famous, confusedWith, relatedVideoId, hairEra}`
- `DB.fashion[]` — `{house, role, since, status, campaigns[], notes, confidence(confirmed|reported)}`
- `DB.live[]` — `{name, years, type, scope, dates, shows[], lisaSoloMoments[], notes, era, upcoming}`
- `DB.records[]` — plaques `{title, year, body, category(guinness|first|chart|award)}`
- `DB.essays[]`, `DB.bio` — long-form copy

Poster frames are generated deterministically per record (palette, motif, year numeral, Look ID) in `js/app.js`.

## Content status — as of 27 August 2026

- **Released / occurred:** everything dated on or before 2026-08-27, including BLACKPINK's *Deadline* EP (27 Feb 2026), "Bad Angel" with Anyma (8 Apr), "Goals" with Anitta & Rema (21 May), and the FIFA World Cup opening-ceremony performance (June 2026).
- **Announced / upcoming** (tagged `Upcoming` on every card): "Sawadika" (4 Sep 2026), *Press Play* EP (23 Oct 2026), *VIVA LA LISA* residency at The Colosseum at Caesars Palace (13–14 & 27–28 Nov 2026).
- Dates carry honest precision (`day / month / year / approx`); where sources conflict (e.g. the White Lotus character name Mook vs Pearl), the conflict is shown rather than resolved by guesswork.

## Accuracy & ethics

No dating rumors, no gossip, no invented quotes, no private addresses. Acting stills are labeled as acting. Fashion stays elegant. Where a campaign or date is publicly thinner, records carry `reported` confidence or coarse date precision instead of fabricated specifics.
