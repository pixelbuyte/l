'use strict';

// Fully local engine: bundled dictionary + on-device OCR (tesseract.js) +
// pixel analysis (sharp). No API key, no network.

const path = require('path');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');
const dict = require('./dictionary');

const UNCLEAR = 'Unclear image.';
const UNKNOWN = 'Unknown word.';

// ── Text matching ────────────────────────────────────────────────────────────

const norm = s => dict.normalize(s);

function bigrams(s) {
  const out = new Map();
  for (let i = 0; i < s.length - 1; i++) {
    const g = s.slice(i, i + 2);
    out.set(g, (out.get(g) || 0) + 1);
  }
  return out;
}

// 1 for equal, otherwise Dice coefficient on character bigrams (tolerates OCR typos).
function similarity(a, b) {
  a = norm(a);
  b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const A = bigrams(a);
  const B = bigrams(b);
  let hit = 0;
  for (const [g, n] of A) hit += Math.min(n, B.get(g) || 0);
  return (2 * hit) / (a.length - 1 + b.length - 1);
}

// Best option for a ranked list of acceptable English translations.
function matchOption(english, options) {
  let best = { index: -1, score: 0, rank: Infinity };
  options.forEach((opt, index) => {
    const o = ` ${norm(opt)} `;
    english.forEach((e, rank) => {
      const ne = norm(e).replace(/^to /, '');
      const no = norm(opt).replace(/^to /, '');
      let score = similarity(no, ne);
      if (score < 0.9 && ne.length >= 3 && o.includes(` ${ne} `)) score = 0.9;
      if (score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && rank < best.rank)) {
        best = { index, score, rank };
      }
    });
  });
  return best.score >= 0.85 ? best : { index: -1, score: 0, rank: Infinity };
}

// ── Text-only answers ────────────────────────────────────────────────────────

function answerText(text, choices) {
  const entry = dict.lookup(text) || dict.findInText(text)[0];
  if (!entry) return UNKNOWN;
  if (choices.length) {
    const m = matchOption(entry.english, choices);
    if (m.index >= 0) return choices[m.index];
  }
  return entry.english[0];
}

function translate(text, choices) {
  const entry = dict.lookup(text);
  if (!entry) {
    return { status: 422, body: { success: false, error: 'Not in the offline dictionary. Try a simpler word, or set up Ollama or an API key.' } };
  }
  const body = {
    success: true,
    translation: entry.english[0],
    part_of_speech: '',
    notes: entry.english.length > 1 ? `Also: ${entry.english.slice(1).join('; ')}` : ''
  };
  if (choices.length) {
    const m = matchOption(entry.english, choices.map(c => c.text));
    body.match = {
      index: m.index,
      text: m.index >= 0 ? choices[m.index].text : null,
      confidence: m.index < 0 ? 'low' : m.score >= 0.99 ? 'high' : 'medium'
    };
  }
  return { status: 200, body };
}

// ── OCR worker ───────────────────────────────────────────────────────────────

let workerPromise = null;
let queue = Promise.resolve();

function getWorker() {
  if (!workerPromise) {
    const langPath = path.join(path.dirname(require.resolve('@tesseract.js-data/spa')), '4.0.0_best_int');
    workerPromise = createWorker('spa', 1, { langPath, gzip: true, cacheMethod: 'none' });
  }
  return workerPromise;
}

// Tesseract's worker keeps per-job parameters, so serialize whole analyses.
function serialized(fn) {
  const run = queue.catch(() => {}).then(fn);
  queue = run;
  return run;
}

// Load the OCR engine ahead of the first request.
function warmUp() {
  getWorker().catch(() => {});
}

async function shutdown() {
  if (!workerPromise) return;
  const w = await workerPromise;
  workerPromise = null;
  await w.terminate();
}

// ── Image analysis ───────────────────────────────────────────────────────────

const hex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

function colorName(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 510;
  const d = max - min;
  if (d < 28) return l < 0.15 ? 'black' : l > 0.85 ? 'white' : 'gray';
  let h;
  if (max === r) h = ((g - b) / d + 6) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 15 || h >= 345) return l > 0.7 ? 'pink' : 'red';
  if (h < 40) return l < 0.4 ? 'brown' : 'orange';
  if (h < 70) return 'yellow';
  if (h < 160) return 'green';
  if (h < 200) return 'teal';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

// Find flat-coloured rectangles (buttons, cards) so each can be read on its own;
// global thresholding loses light text on mid-tone buttons.
async function findPanels(img, W, H) {
  const GW = 200;
  const GH = Math.max(1, Math.round((GW * H) / W));
  const { data } = await sharp(img).resize(GW, GH, { fit: 'fill', kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
  const key = i => ((data[i * 3] >> 5) << 6) | ((data[i * 3 + 1] >> 5) << 3) | (data[i * 3 + 2] >> 5);
  const seen = new Uint8Array(GW * GH);
  const panels = [];

  for (let start = 0; start < GW * GH; start++) {
    if (seen[start]) continue;
    const k = key(start);
    const stack = [start];
    seen[start] = 1;
    let area = 0, x0 = GW, y0 = GH, x1 = 0, y1 = 0, sr = 0, sg = 0, sb = 0;
    while (stack.length) {
      const p = stack.pop();
      const x = p % GW, y = (p / GW) | 0;
      area++;
      sr += data[p * 3]; sg += data[p * 3 + 1]; sb += data[p * 3 + 2];
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        const n = ny * GW + nx;
        if (!seen[n] && key(n) === k) { seen[n] = 1; stack.push(n); }
      }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    const fill = area / (w * h);
    const pageSized = w >= GW * 0.92 && h >= GH * 0.92;
    if (area >= GW * GH * 0.004 && area <= GW * GH * 0.55 && w >= GW * 0.08 && h >= GH * 0.035 && fill >= 0.55 && !pageSized) {
      panels.push({
        area,
        box: { x0: (x0 / GW) * W, y0: (y0 / GH) * H, x1: ((x1 + 1) / GW) * W, y1: ((y1 + 1) / GH) * H },
        rgb: [Math.round(sr / area), Math.round(sg / area), Math.round(sb / area)]
      });
    }
  }
  return panels.sort((a, b) => b.area - a.area).slice(0, 16);
}

function linesOf(data) {
  return (data.blocks || []).flatMap(b => b.paragraphs.flatMap(p => p.lines));
}

// A line must have a real word (2+ letters/digits in a row) and decent confidence.
const usable = (text, conf) => conf >= 30 && /[\p{L}\p{N}]{2,}/u.test(text);

const cleanLine = t => t.replace(/\s+/g, ' ').replace(/^[\s|_~—–\-=•*]+|[\s|_~—–\-=•*]+$/g, '').trim();

// Background (mode of the surrounding ring) and text colour (farthest pixel) for a box.
function sampleColors(raw, W, H, box) {
  const pad = Math.max(6, Math.round((box.y1 - box.y0) * 0.35));
  const X0 = Math.max(0, Math.floor(box.x0 - pad)), Y0 = Math.max(0, Math.floor(box.y0 - pad));
  const X1 = Math.min(W, Math.ceil(box.x1 + pad)), Y1 = Math.min(H, Math.ceil(box.y1 + pad));
  const counts = new Map();
  const px = (x, y) => { const i = (y * W + x) * 3; return [raw[i], raw[i + 1], raw[i + 2]]; };
  for (let y = Y0; y < Y1; y += 1) {
    for (let x = X0; x < X1; x += 1) {
      const inside = x >= box.x0 && x < box.x1 && y >= box.y0 && y < box.y1;
      if (inside) continue;
      const [r, g, b] = px(x, y);
      const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const c = counts.get(k) || { n: 0, r: 0, g: 0, b: 0 };
      c.n++; c.r += r; c.g += g; c.b += b;
      counts.set(k, c);
    }
  }
  let bg = [255, 255, 255];
  let top = null;
  for (const c of counts.values()) if (!top || c.n > top.n) top = c;
  if (top) bg = [Math.round(top.r / top.n), Math.round(top.g / top.n), Math.round(top.b / top.n)];
  return { bg, fg: farthestColor(raw, W, box, bg) };
}

function farthestColor(raw, W, box, bg) {
  let best = null, bestD = -1;
  const x0 = Math.floor(box.x0), x1 = Math.ceil(box.x1), y0 = Math.floor(box.y0), y1 = Math.ceil(box.y1);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * W + x) * 3;
      const c = [raw[i], raw[i + 1], raw[i + 2]];
      const d = dist(c, bg);
      if (d > bestD) { bestD = d; best = c; }
    }
  }
  return best || (lum(...bg) > 128 ? [0, 0, 0] : [255, 255, 255]);
}

// A page-level line that mostly lies over panels already read individually is a duplicate
// (or a row-spanning artefact like "pencil pen").
function overlapsPanelText(line, panelLines) {
  const a = line.box;
  const area = Math.max(1, (a.x1 - a.x0) * (a.y1 - a.y0));
  let covered = 0;
  for (const pl of panelLines) {
    const w = Math.min(a.x1, pl.box.x1) - Math.max(a.x0, pl.box.x0);
    const h = Math.min(a.y1, pl.box.y1) - Math.max(a.y0, pl.box.y0);
    if (w > 0 && h > 0) covered += w * h;
  }
  return covered / area >= 0.3;
}

async function panelToDarkOnLight(img, region, rgb, scale) {
  const { left, top, width, height } = region;
  const { data } = await sharp(img).extract(region).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(width * height);
  for (let i = 0; i < out.length; i++) {
    const d = Math.abs(data[i * 3] - rgb[0]) + Math.abs(data[i * 3 + 1] - rgb[1]) + Math.abs(data[i * 3 + 2] - rgb[2]);
    out[i] = Math.max(0, 255 - Math.round(d * 1.7));
  }
  let g = sharp(out, { raw: { width, height, channels: 1 } });
  if (scale > 1) g = g.resize({ width: width * scale });
  return g.extend({ top: 12, bottom: 12, left: 12, right: 12, background: { r: 255, g: 255, b: 255 } }).png().toBuffer();
}

// OCR a screenshot/photo. Returns text lines with pixel boxes and colours.
async function readImage(buffer) {
  return serialized(async () => {
    const meta = await sharp(buffer).metadata();
    const targetW = Math.min(2200, Math.max(1400, meta.width || 1400));
    const base = await sharp(buffer).rotate().removeAlpha().resize({ width: targetW }).png().toBuffer();
    const { data: raw, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true });
    const { width: W, height: H } = info;

    const worker = await getWorker();
    const lines = [];

    // Pass 1: the whole image (question text, plain-text options).
    const gray = sharp(base).grayscale().normalise();
    const mean = (await sharp(base).grayscale().stats()).channels[0].mean;
    const page = await (mean < 110 ? gray.negate() : gray).png().toBuffer();
    await worker.setParameters({ tessedit_pageseg_mode: '3', user_defined_dpi: '300' });
    const pageRes = await worker.recognize(page, {}, { blocks: true });
    const panels = await findPanels(base, W, H);

    // Pass 2: each coloured panel on its own. Pixels are mapped by their distance from the
    // panel colour, so text of any colour comes out dark-on-white.
    await worker.setParameters({ tessedit_pageseg_mode: '6', user_defined_dpi: '300' });
    const panelLines = [];
    for (const p of panels) {
      const inset = Math.max(3, Math.round((p.box.y1 - p.box.y0) * 0.12));
      const left = Math.round(p.box.x0) + inset, top = Math.round(p.box.y0) + inset;
      const width = Math.round(p.box.x1 - p.box.x0) - 2 * inset, height = Math.round(p.box.y1 - p.box.y0) - 2 * inset;
      if (width < 20 || height < 12) continue;
      const scale = height < 90 ? 2 : 1;
      const buf = await panelToDarkOnLight(base, { left, top, width, height }, p.rgb, scale);
      const res = await worker.recognize(buf, {}, { blocks: true });
      const ls = linesOf(res.data).map(l => ({ text: cleanLine(l.text), conf: l.confidence, h: (l.bbox.y1 - l.bbox.y0) / scale })).filter(l => usable(l.text, l.conf));
      if (!ls.length) continue;
      const fg = farthestColor(raw, W, { x0: left, y0: top, x1: left + width, y1: top + height }, p.rgb);
      panelLines.push({
        text: ls.map(l => l.text).join(' '),
        conf: ls.reduce((s, l) => s + l.conf, 0) / ls.length,
        textHeight: Math.max(...ls.map(l => l.h)),
        box: p.box,
        bg: p.rgb,
        fg,
        panel: true
      });
    }

    for (const l of linesOf(pageRes.data)) {
      const text = cleanLine(l.text);
      if (!usable(text, l.confidence)) continue;
      const line = { text, conf: l.confidence, textHeight: l.bbox.y1 - l.bbox.y0, box: { ...l.bbox } };
      if (overlapsPanelText(line, panelLines)) continue;
      const { bg, fg } = sampleColors(raw, W, H, line.box);
      lines.push({ ...line, bg, fg, panel: false });
    }
    lines.push(...panelLines);
    lines.sort((a, b) => a.box.y0 - b.box.y0 || a.box.x0 - b.box.x0);

    const totalChars = lines.reduce((s, l) => s + l.text.length, 0);
    const meanConf = totalChars ? lines.reduce((s, l) => s + l.conf * l.text.length, 0) / totalChars : 0;
    return { width: W, height: H, lines, meanConf };
  });
}

// ── Reading a quiz screenshot ────────────────────────────────────────────────

// The question is the line that is itself a dictionary entry, preferring larger text.
function findQuestion(lines) {
  const cands = [];
  for (const line of lines) {
    const direct = dict.lookup(line.text);
    const entries = direct ? [direct] : dict.findInText(line.text);
    for (const entry of entries) cands.push({ line, entry, direct: !!direct });
  }
  cands.sort((a, b) => (b.direct - a.direct) || (b.line.textHeight - a.line.textHeight) || (b.line.conf - a.line.conf));
  return cands[0] || null;
}

function isReadable(img) {
  return img.lines.length > 0 && img.meanConf >= 35;
}

async function answerImage(buffer, text, choices) {
  let img;
  try {
    img = await readImage(buffer);
  } catch {
    return UNCLEAR;
  }
  if (text) {
    const typed = dict.lookup(text) || dict.findInText(text)[0];
    if (typed) return finish(typed, choices, img.lines, null);
  }
  if (!isReadable(img)) return UNCLEAR;
  const q = findQuestion(img.lines);
  if (!q) return UNKNOWN;
  return finish(q.entry, choices, img.lines, q.line);
}

function finish(entry, choices, lines, questionLine) {
  const options = choices.length ? choices : lines.filter(l => l !== questionLine).map(l => l.text);
  const m = matchOption(entry.english, options);
  return m.index >= 0 ? options[m.index] : entry.english[0];
}

function pct(v, total) {
  return Math.round((v / total) * 1000) / 10;
}

function regionOf(xp, yp) {
  const row = yp < 33.4 ? 'top' : yp < 66.7 ? 'middle' : 'bottom';
  const col = xp < 33.4 ? 'left' : xp < 66.7 ? 'center' : 'right';
  return `${row}-${col}`;
}

async function analyzeImage(buffer, choices) {
  let img;
  try {
    img = await readImage(buffer);
  } catch {
    return { status: 422, body: { success: false, image_quality: 'unreadable', error: 'Could not read this image.' } };
  }
  if (!isReadable(img)) {
    return { status: 422, body: { success: false, image_quality: 'unreadable', error: 'Image is too blurry or contains no readable text.' } };
  }

  const quality = img.meanConf >= 65 ? 'clear' : 'blurry';
  const extracted = img.lines.map(l => l.text).join(' ');

  if (!choices.length) {
    const items = [];
    const seen = new Set();
    for (const l of img.lines) {
      const direct = dict.lookup(l.text);
      for (const e of direct ? [direct] : dict.findInText(l.text)) {
        if (seen.has(e.spanish)) continue;
        seen.add(e.spanish);
        items.push({ spanish: e.spanish, english: e.english[0], type: e.spanish.includes(' ') ? 'phrase' : 'word' });
      }
    }
    return { status: 200, body: { success: true, extracted_text: extracted, items, image_quality: quality, notes: 'Offline dictionary mode' } };
  }

  const q = findQuestion(img.lines);
  if (!q) {
    return { status: 200, body: { success: true, extracted_text: extracted, translation: '', image_quality: quality, match: { index: -1, text: null, confidence: 'low' }, visual_choices: [], notes: 'No known Spanish word found in the image.' } };
  }

  const texts = choices.map(c => c.text);
  const m = matchOption(q.entry.english, texts);
  const candidates = img.lines.filter(l => l !== q.line);
  const visual = [];
  texts.forEach((t, index) => {
    let best = null;
    for (const l of candidates) {
      const s = similarity(l.text, t);
      if (s >= 0.8 && (!best || s > best.s)) best = { l, s };
    }
    if (!best) return;
    const { l } = best;
    const xp = pct((l.box.x0 + l.box.x1) / 2, img.width);
    const yp = pct((l.box.y0 + l.box.y1) / 2, img.height);
    visual.push({
      index,
      text: t,
      position: { region: regionOf(xp, yp), x_percent: xp, y_percent: yp },
      background_color: hex(...l.bg),
      color_name: colorName(...l.bg),
      text_color: hex(...l.fg),
      is_correct: index === m.index
    });
  });

  return {
    status: 200,
    body: {
      success: true,
      extracted_text: q.line.text,
      translation: q.entry.english[0],
      image_quality: quality,
      match: { index: m.index, text: m.index >= 0 ? texts[m.index] : null, confidence: m.index < 0 ? 'low' : m.score >= 0.99 ? 'high' : 'medium' },
      visual_choices: visual
    }
  };
}

module.exports = { warmUp, findPanels, UNCLEAR, UNKNOWN, answerText, answerImage, translate, analyzeImage, shutdown, similarity, matchOption };
