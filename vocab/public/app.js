'use strict';

// ── State ──────────────────────────────────────────────────────────────────

const state = {
  activeTab: 'instant',
  instantChoices: [],
  translateChoices: [],
  imageChoices: [],
  files: { instant: null, image: null },
};

const UNCLEAR = 'Unclear image.';

// ── DOM helpers ──────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// ── Tab switching ──────────────────────────────────────────────────────────

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
  hideResult(tab);
}

// ── Status helpers ──────────────────────────────────────────────────────────

function showLoading(tab, msg) {
  const s = $(`status-${tab}`);
  s.innerHTML = `<span class="spinner"></span>${msg}`;
  s.className = 'status visible loading';
}

function showError(tab, msg) {
  const s = $(`status-${tab}`);
  s.textContent = `⚠ ${msg}`;
  s.className = 'status visible error';
}

function clearStatus(tab) {
  const s = $(`status-${tab}`);
  if (s) s.className = 'status';
}

function hideResult(tab) {
  const r = $(`result-${tab}`);
  if (r) r.className = 'card result-panel';
  clearStatus(tab);
}

// ── Choices builder ──────────────────────────────────────────────────────────

function buildChoicesUI(listId, addBtnId, stateKey) {
  const list = $(listId);
  const addBtn = $(addBtnId);

  function renderChoices() {
    list.innerHTML = '';
    state[stateKey].forEach((choice, i) => {
      const row = el('div', 'choice-row');
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = choice.text;
      inp.placeholder = `Choice ${i + 1}`;
      inp.addEventListener('input', e => { state[stateKey][i].text = e.target.value; });
      const del = el('button', 'btn-icon', '✕');
      del.type = 'button';
      del.title = 'Remove choice';
      del.addEventListener('click', () => {
        state[stateKey].splice(i, 1);
        renderChoices();
      });
      row.append(inp, del);
      list.append(row);
    });
  }

  addBtn.addEventListener('click', () => {
    state[stateKey].push({ id: `c${Date.now()}`, text: '' });
    renderChoices();
    const inputs = list.querySelectorAll('input');
    if (inputs.length) inputs[inputs.length - 1].focus();
  });

  renderChoices();
}

// ── Image drop zones (shared by Instant and Analyze tabs) ──────────────────

function setImage(tab, file) {
  if (!file || !file.type.startsWith('image/')) return;
  state.files[tab] = file;
  $(`${tab}-drop-zone`).classList.add('has-image');
  const preview = $(`${tab}-preview`);
  if (preview.src) URL.revokeObjectURL(preview.src);
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
  $(`${tab}-drop-placeholder`).style.display = 'none';
}

function initDropZone(tab) {
  const zone = $(`${tab}-drop-zone`);
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    setImage(tab, e.dataTransfer?.files?.[0]);
    if (tab === 'instant') submitInstant();
  });
  $(`${tab}-file-input`).addEventListener('change', e => {
    setImage(tab, e.target.files?.[0]);
    if (tab === 'instant') submitInstant();
  });
}

// Paste a screenshot straight into the active image-capable tab.
function handlePaste(e) {
  const tab = state.activeTab;
  if (tab !== 'instant' && tab !== 'image') return;
  const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (!item) return;
  e.preventDefault();
  setImage(tab, item.getAsFile());
  if (tab === 'instant') submitInstant();
}

// ── Instant answer mode ─────────────────────────────────────────────────────

let instantRun = 0;

async function submitInstant() {
  const text = $('instant-text').value.trim();
  const file = state.files.instant;
  if (!text && !file) {
    showError('instant', 'Enter Spanish text or add a screenshot');
    return;
  }

  const run = ++instantRun;
  const choices = state.instantChoices.map(c => c.text.trim()).filter(Boolean);
  showLoading('instant', 'Answering…');
  hideResult('instant');
  $('btn-instant').disabled = true;

  try {
    const form = new FormData();
    if (file) form.append('image', file);
    if (text) form.append('text', text);
    if (choices.length) form.append('choices', JSON.stringify(choices));

    const res = await fetch('/api/answer', { method: 'POST', body: form });
    const data = await res.json();
    if (run !== instantRun) return;
    if (!res.ok) throw new Error(data.error || 'Request failed');

    clearStatus('instant');
    const panel = $('result-instant');
    panel.innerHTML = '';
    panel.append(el('div', data.answer === UNCLEAR ? 'answer-big unclear' : 'answer-big', data.answer));
    panel.className = 'card result-panel visible';
  } catch (err) {
    if (run === instantRun) showError('instant', err.message);
  } finally {
    if (run === instantRun) $('btn-instant').disabled = false;
  }
}

// ── Translate mode ──────────────────────────────────────────────────────────

async function handleTranslate(e) {
  e.preventDefault();
  const text = $('translate-text').value.trim();
  if (!text) return;

  const choices = state.translateChoices.filter(c => c.text.trim());
  showLoading('translate', 'Translating…');
  hideResult('translate');
  $('btn-translate').disabled = true;

  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, choices })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'Translation failed');

    clearStatus('translate');
    renderTranslateResult(text, data, choices);
  } catch (err) {
    showError('translate', err.message);
  } finally {
    $('btn-translate').disabled = false;
  }
}

function renderTranslateResult(query, data, choices) {
  const panel = $('result-translate');
  panel.innerHTML = '';

  const hdr = el('div', 'result-header');
  hdr.append(el('span', 'result-spanish', query));
  if (data.part_of_speech) hdr.append(el('span', 'result-pos', data.part_of_speech));
  panel.append(hdr);

  panel.append(el('div', 'result-translation', `"${data.translation}"`));
  if (data.notes) panel.append(el('div', 'result-notes', data.notes));

  if (choices.length > 0 && data.match) {
    panel.append(renderChoiceMatch(choices, data.match));
  }

  panel.className = 'card result-panel visible';
}

function renderChoiceMatch(choices, match) {
  const section = el('div', 'match-section');
  section.append(el('div', 'match-label', 'Answer choices'));

  const grid = el('div', 'choices-grid');
  choices.forEach((choice, i) => {
    const chip = el('div', 'choice-chip');
    const isMatch = match.index === i;
    if (isMatch) {
      chip.classList.add('correct');
      chip.append(el('span', 'chip-icon', '✓'));
    }
    chip.append(document.createTextNode(choice.text));
    if (isMatch && match.confidence) {
      const meta = el('div', 'chip-meta');
      meta.append('Confidence: ', el('span', `conf-badge ${match.confidence}`, match.confidence));
      chip.append(meta);
    }
    grid.append(chip);
  });
  section.append(grid);

  if (match.index === -1) {
    const note = el('p', null, 'No matching choice found for this translation.');
    note.style.cssText = 'font-size:.85rem;color:var(--text-muted);margin-top:8px;';
    section.append(note);
  }

  return section;
}

// ── Analyze image mode ─────────────────────────────────────────────────────

async function handleImageAnalyze(e) {
  e.preventDefault();
  if (!state.files.image) {
    showError('image', 'Please select an image first');
    return;
  }

  const choices = state.imageChoices.filter(c => c.text.trim());
  showLoading('image', 'Analyzing image…');
  hideResult('image');
  $('btn-analyze').disabled = true;

  try {
    const form = new FormData();
    form.append('image', state.files.image);
    if (choices.length > 0) form.append('choices', JSON.stringify(choices));

    const res = await fetch('/api/analyze-image', { method: 'POST', body: form });
    const data = await res.json();

    if (res.status === 422) throw new Error(data.error || 'Image unreadable');
    if (!res.ok || !data.success) throw new Error(data.error || 'Analysis failed');

    clearStatus('image');
    renderImageResult(data, choices);
  } catch (err) {
    showError('image', err.message);
  } finally {
    $('btn-analyze').disabled = false;
  }
}

function renderImageResult(data, choices) {
  const panel = $('result-image');
  panel.innerHTML = '';

  if (data.image_quality) {
    const badge = el('div', `quality-badge ${data.image_quality}`);
    badge.textContent = data.image_quality === 'clear' ? '✓ Clear image' : '⚠ Image may be blurry';
    panel.append(badge);
  }

  if (data.extracted_text) {
    const hdr = el('div', 'result-header');
    hdr.append(el('span', 'result-spanish', data.extracted_text));
    panel.append(hdr);
    if (data.translation) panel.append(el('div', 'result-translation', `"${data.translation}"`));
  }

  if (data.notes) panel.append(el('div', 'result-notes', data.notes));

  if (choices.length > 0 && data.match) panel.append(renderChoiceMatch(choices, data.match));
  if (data.visual_choices && data.visual_choices.length > 0) panel.append(renderVisualMap(data.visual_choices));
  if (data.items && data.items.length > 0) panel.append(renderItemsList(data.items));

  panel.className = 'card result-panel visible';
}

function renderVisualMap(visualChoices) {
  const section = el('div', 'visual-map-section');
  section.append(el('div', 'visual-map-label', 'Position in image'));

  const map = el('div', 'visual-map');

  visualChoices.forEach(vc => {
    const chip = el('div', 'map-choice');
    chip.textContent = vc.text;
    chip.style.left = `${vc.position?.x_percent ?? 50}%`;
    chip.style.top = `${vc.position?.y_percent ?? 50}%`;

    const bg = vc.background_color;
    if (bg && bg !== 'none' && bg !== 'transparent') {
      chip.style.background = bg;
      chip.style.color = getContrastColor(bg);
    } else {
      chip.style.background = 'var(--surface)';
      chip.style.color = 'var(--text)';
      chip.style.border = '1px solid var(--border)';
    }

    if (vc.is_correct) chip.classList.add('correct');
    map.append(chip);
  });

  section.append(map);
  return section;
}

function renderItemsList(items) {
  const section = el('div', 'match-section');
  section.append(el('div', 'match-label', 'Vocabulary found'));
  const list = el('div', 'items-list');
  items.forEach(item => {
    const row = el('div', 'vocab-item');
    row.append(el('span', 'es', item.spanish));
    row.append(el('span', 'arrow', '→'));
    row.append(el('span', 'en', item.english));
    if (item.type) row.append(el('span', 'type-badge', item.type));
    list.append(row);
  });
  section.append(list);
  return section;
}

function getContrastColor(hex) {
  const clean = String(hex).replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return 'var(--text)';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#111' : '#fff';
}

// ── Theme toggle ──────────────────────────────────────────────────────────────

function initTheme() {
  try {
    const stored = localStorage.getItem('vocab-theme');
    if (stored) document.documentElement.dataset.theme = stored;
  } catch {}
  $('theme-btn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('vocab-theme', next); } catch {}
  });
}

// ── Engine badge ──────────────────────────────────────────────────────────────

async function showProvider() {
  try {
    const res = await fetch('/api/health');
    const { provider } = await res.json();
    const labels = { offline: 'Offline', ollama: 'Local model', anthropic: 'Claude' };
    const badge = $('provider-badge');
    badge.textContent = labels[provider] || provider;
    badge.title = provider === 'offline' ? 'No API key: bundled dictionary + on-device OCR' : `Engine: ${provider}`;
    badge.hidden = false;
  } catch {}
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  showProvider();

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Instant answer
  buildChoicesUI('choices-list-n', 'add-choice-n', 'instantChoices');
  initDropZone('instant');
  $('instant-form').addEventListener('submit', e => { e.preventDefault(); submitInstant(); });
  $('instant-text').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitInstant(); }
  });

  // Translate
  buildChoicesUI('choices-list-t', 'add-choice-t', 'translateChoices');
  $('translate-form').addEventListener('submit', handleTranslate);

  // Analyze image
  initDropZone('image');
  buildChoicesUI('choices-list-i', 'add-choice-i', 'imageChoices');
  $('image-form').addEventListener('submit', handleImageAnalyze);

  document.addEventListener('paste', handlePaste);

  switchTab('instant');
});
