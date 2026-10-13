'use strict';

// ── State ──────────────────────────────────────────────────────────────────

const state = {
  activeTab: 'translate',
  translateChoices: [],
  imageChoices: [],
  imageFile: null,
};

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
  if (r) r.className = 'result-panel';
  clearStatus(tab);
}

// ── Choices builder ──────────────────────────────────────────────────────────

function buildChoicesUI(containerId, listId, addBtnId, stateKey) {
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

  // Header: Spanish word + POS
  const hdr = el('div', 'result-header');
  const sp = el('span', 'result-spanish', query);
  hdr.append(sp);
  if (data.part_of_speech) {
    hdr.append(el('span', 'result-pos', data.part_of_speech));
  }
  panel.append(hdr);

  // Translation
  const tr = el('div', 'result-translation', `"${data.translation}"`);
  panel.append(tr);

  // Notes
  if (data.notes) panel.append(el('div', 'result-notes', data.notes));

  // Choice matching
  if (choices.length > 0 && data.match) {
    panel.append(renderChoiceMatch(choices, data.match));
  }

  panel.className = 'result-panel visible';
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
      const icon = el('span', 'chip-icon', '✓');
      chip.append(icon);
    }
    chip.append(document.createTextNode(choice.text));
    if (isMatch && match.confidence) {
      const meta = el('div', 'chip-meta');
      const badge = el('span', `conf-badge ${match.confidence}`, match.confidence);
      meta.append('Confidence: ', badge);
      chip.append(meta);
    }
    grid.append(chip);
  });

  if (match.index === -1) {
    const note = el('p');
    note.style.cssText = 'font-size:.85rem;color:var(--text-muted);margin-top:8px;';
    note.textContent = 'No matching choice found for this translation.';
    section.append(grid, note);
  } else {
    section.append(grid);
  }

  return section;
}

// ── Image mode ──────────────────────────────────────────────────────────────

function handleImageDrop(e) {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;
  state.imageFile = file;
  previewImage(file);
}

function previewImage(file) {
  const zone = $('drop-zone');
  const placeholder = $('drop-placeholder');
  const preview = $('image-preview');

  zone.classList.add('has-image');
  const url = URL.createObjectURL(file);
  preview.src = url;
  preview.style.display = 'block';
  placeholder.style.display = 'none';
}

async function handleImageAnalyze(e) {
  e.preventDefault();
  if (!state.imageFile) {
    showError('image', 'Please select an image first');
    return;
  }

  const choices = state.imageChoices.filter(c => c.text.trim());
  showLoading('image', 'Analyzing image…');
  hideResult('image');
  $('btn-analyze').disabled = true;

  try {
    const form = new FormData();
    form.append('image', state.imageFile);
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

  // Image quality badge
  if (data.image_quality) {
    const badge = el('div', `quality-badge ${data.image_quality}`);
    badge.textContent = data.image_quality === 'clear' ? '✓ Clear image' : '⚠ Image may be blurry';
    panel.append(badge);
  }

  if (data.extracted_text) {
    // Main result: extracted text + translation
    const hdr = el('div', 'result-header');
    hdr.append(el('span', 'result-spanish', data.extracted_text));
    panel.append(hdr);

    if (data.translation) {
      panel.append(el('div', 'result-translation', `"${data.translation}"`));
    }
  }

  if (data.notes) panel.append(el('div', 'result-notes', data.notes));

  // Choice match
  if (choices.length > 0 && data.match) {
    panel.append(renderChoiceMatch(choices, data.match));
  }

  // Visual position map
  if (data.visual_choices && data.visual_choices.length > 0) {
    panel.append(renderVisualMap(data.visual_choices));
  }

  // OCR items (no-choice mode)
  if (data.items && data.items.length > 0) {
    panel.append(renderItemsList(data.items));
  }

  panel.className = 'result-panel visible';
}

function renderVisualMap(visualChoices) {
  const section = el('div', 'visual-map-section');
  section.append(el('div', 'visual-map-label', 'Position in image'));

  const map = el('div', 'visual-map');

  visualChoices.forEach(vc => {
    const chip = el('div', 'map-choice');
    chip.textContent = vc.text;
    chip.style.left = `${vc.position.x_percent ?? 50}%`;
    chip.style.top = `${vc.position.y_percent ?? 50}%`;

    // Apply actual background color from image if detected
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

// Estimate contrast color (black or white) for a given hex background
function getContrastColor(hex) {
  try {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return 'var(--text)';
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.5 ? '#111' : '#fff';
  } catch {
    return 'var(--text)';
  }
}

// ── Theme toggle ──────────────────────────────────────────────────────────────

function initTheme() {
  const stored = localStorage.getItem('vocab-theme');
  if (stored) document.documentElement.dataset.theme = stored;
  $('theme-btn').addEventListener('click', () => {
    const curr = document.documentElement.dataset.theme;
    const next = curr === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('vocab-theme', next); } catch {}
  });
}

// ── Bootstrap ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Translate form
  buildChoicesUI('choices-container-t', 'choices-list-t', 'add-choice-t', 'translateChoices');
  $('translate-form').addEventListener('submit', handleTranslate);

  // Image upload
  const zone = $('drop-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => { zone.classList.remove('drag-over'); handleImageDrop(e); });
  $('file-input').addEventListener('change', handleImageDrop);

  buildChoicesUI('choices-container-i', 'choices-list-i', 'add-choice-i', 'imageChoices');
  $('image-form').addEventListener('submit', handleImageAnalyze);

  // Set initial tab
  switchTab('translate');
});
