'use strict';

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const offline = require('./offline');
const { ollamaAvailable, createOllamaClient } = require('./ollama');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
const UNCLEAR = 'Unclear image.';

const INSTANT_SYSTEM = `You are a Spanish-to-English vocabulary answer engine. Output ONLY the answer: one answer, preferably 1-3 words, no explanations, no quotes, no numbering, no formatting, never repeat the question.

Rules:
- Given a Spanish word or phrase (typed or in a screenshot), give its English translation.
- If multiple-choice options are given or visible, reply with the correct option EXACTLY as written in the options.
- Choose the meaning that fits the question and context (school vocabulary, classroom objects, everyday phrases, verbs, nouns, common expressions).
- Ignore browser tabs, scores, timers, and any other screen elements; use only the question and its answer choices.
- If the image is unreadable or no Spanish question can be found, reply exactly: ${UNCLEAR}
- Do not guess when the image is unreadable. Do not search the web.

Examples:
el salón de clase -> classroom
la pluma -> pen
el alumno / la alumna -> pupil
la calculadora -> calculator
la cinta pegante -> tape
el sacapuntas -> pencil sharpener
la puerta -> door
el piso -> floor`;

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, or WebP images are accepted'));
    }
  }
});

// The LLM client is set at startup (see chooseProvider) or by tests. With no client the
// app runs fully offline using the bundled dictionary and on-device OCR.

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model returned non-JSON response');
  return JSON.parse(match[0]);
}

// POST /api/translate
// Body: { text: string, choices?: [{id: string, text: string}] }
app.post('/api/translate', async (req, res) => {
  const { text, choices } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const hasChoices = Array.isArray(choices) && choices.length > 0;

  if (!app.get('anthropic')) {
    const r = offline.translate(text.trim(), hasChoices ? choices.filter(c => c && typeof c.text === 'string') : []);
    return res.status(r.status).json(r.body);
  }

  const prompt = hasChoices
    ? `Translate this Spanish text to English, then identify which of the provided choices is the correct translation.

Spanish: "${text.trim()}"

Choices:
${choices.map((c, i) => `${i}. ${c.text}`).join('\n')}

Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "translation": "<direct English translation>",
  "match": {
    "index": <0-based index of the best matching choice, or -1 if none match>,
    "text": "<the matching choice text, or null if index is -1>",
    "confidence": "high" | "medium" | "low"
  },
  "part_of_speech": "<noun/verb/adjective/adverb/phrase/etc>",
  "notes": "<one short note about usage if useful, otherwise empty string>"
}`
    : `Translate this Spanish text to English.

Spanish: "${text.trim()}"

Respond ONLY with a JSON object in this exact format (no markdown, no explanation):
{
  "translation": "<English translation>",
  "part_of_speech": "<noun/verb/adjective/adverb/phrase/etc>",
  "notes": "<one short note about usage if useful, otherwise empty string>"
}`;

  try {
    const response = await app.get('anthropic').messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    });

    const block = response.content.find(b => b.type === 'text');
    if (!block) throw new Error('No text in model response');

    const result = extractJSON(block.text);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[translate]', err.message);
    res.status(500).json({ error: err.message || 'Translation failed' });
  }
});

// POST /api/analyze-image
// Multipart: image (file), choices (JSON string, optional)
app.post('/api/analyze-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'image file is required' });
  }

  let choices = [];
  if (req.body.choices) {
    try {
      choices = JSON.parse(req.body.choices);
    } catch {
      return res.status(400).json({ error: 'choices must be valid JSON' });
    }
  }

  const imageBase64 = req.file.buffer.toString('base64');
  const mediaType = req.file.mimetype;
  const hasChoices = Array.isArray(choices) && choices.length > 0;

  if (!app.get('anthropic')) {
    const usable = hasChoices ? choices.filter(c => c && typeof c.text === 'string' && c.text.trim()) : [];
    const r = await offline.analyzeImage(req.file.buffer, usable);
    return res.status(r.status).json(r.body);
  }

  const prompt = hasChoices
    ? `This image shows a Spanish vocabulary exercise or quiz. Your tasks:
1. Find the main Spanish word or phrase being tested
2. Translate it to English
3. Among the provided choices, identify which is the correct English translation
4. For each choice visible in the image, describe its approximate position and visible styling

Answer choices:
${choices.map((c, i) => `${i}. ${c.text}`).join('\n')}

Respond ONLY with a JSON object (no markdown) in this exact format:
{
  "extracted_text": "<Spanish word or phrase from the image>",
  "translation": "<English translation>",
  "image_quality": "clear" | "blurry" | "unreadable",
  "match": {
    "index": <0-based index of correct choice, or -1 if none match>,
    "text": "<matching choice text or null>",
    "confidence": "high" | "medium" | "low"
  },
  "visual_choices": [
    {
      "index": <0-based>,
      "text": "<choice text as seen in image>",
      "position": {
        "region": "top-left" | "top-center" | "top-right" | "middle-left" | "middle-center" | "middle-right" | "bottom-left" | "bottom-center" | "bottom-right",
        "x_percent": <estimated horizontal center 0-100>,
        "y_percent": <estimated vertical center 0-100>
      },
      "background_color": "<hex color like #FF0000 or color name, or 'none'>",
      "text_color": "<text color or 'unknown'>",
      "is_correct": <true | false>
    }
  ]
}

If the image is too blurry or unreadable, return ONLY: { "image_quality": "unreadable", "error": "<reason>" }`
    : `Extract all Spanish vocabulary words and phrases from this image and translate each one.

Respond ONLY with a JSON object (no markdown) in this exact format:
{
  "extracted_text": "<all Spanish text found, space-separated>",
  "items": [
    { "spanish": "<word/phrase>", "english": "<translation>", "type": "word" | "phrase" | "sentence" }
  ],
  "image_quality": "clear" | "blurry" | "unreadable",
  "notes": "<brief note about what the image shows>"
}

If the image is unreadable, return ONLY: { "image_quality": "unreadable", "error": "<reason>" }`;

  try {
    const response = await app.get('anthropic').messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 }
          },
          { type: 'text', text: prompt }
        ]
      }]
    });

    const block = response.content.find(b => b.type === 'text');
    if (!block) throw new Error('No text in model response');

    const result = extractJSON(block.text);

    if (result.image_quality === 'unreadable') {
      return res.status(422).json({ success: false, ...result });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[analyze-image]', err.message);
    res.status(500).json({ error: err.message || 'Image analysis failed' });
  }
});

const normalize = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

// Reduce model output to a bare answer: first line, no markdown/quotes.
function cleanAnswer(raw) {
  const line = String(raw).split('\n').map(l => l.trim()).find(Boolean) || '';
  const stripped = line.replace(/^[\s"'`*_>#-]+|[\s"'`*_]+$/g, '');
  if (normalize(stripped) === normalize(UNCLEAR)) return UNCLEAR;
  return stripped.replace(/\.$/, '');
}

// Return the supplied choice text the answer corresponds to, exactly as written.
function snapToChoice(answer, choices) {
  if (answer === UNCLEAR || !choices.length) return answer;
  const a = normalize(answer);
  const exact = choices.find(c => normalize(c) === a);
  if (exact) return exact;
  const partial = choices.filter(c => a && (normalize(c).includes(a) || a.includes(normalize(c))));
  return partial.length === 1 ? partial[0] : answer;
}

// POST /api/answer
// JSON { text?, choices? } or multipart (image?, text?, choices?). Returns { answer } only.
app.post('/api/answer', upload.single('image'), async (req, res) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!req.file && !text) {
    return res.status(400).json({ error: 'text or image is required' });
  }

  let rawChoices = req.body.choices || [];
  if (typeof rawChoices === 'string') {
    try {
      rawChoices = JSON.parse(rawChoices);
    } catch {
      return res.status(400).json({ error: 'choices must be valid JSON' });
    }
  }
  const choices = (Array.isArray(rawChoices) ? rawChoices : [])
    .map(c => (typeof c === 'string' ? c : c && c.text))
    .filter(t => typeof t === 'string' && t.trim())
    .map(t => t.trim());

  if (!app.get('anthropic')) {
    const answer = req.file ? await offline.answerImage(req.file.buffer, text, choices) : offline.answerText(text, choices);
    return res.json({ answer });
  }

  const content = [];
  if (req.file) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: req.file.mimetype, data: req.file.buffer.toString('base64') }
    });
  }
  const parts = [];
  if (text) parts.push(text);
  if (choices.length) parts.push(`Options:\n${choices.map(c => `- ${c}`).join('\n')}`);
  if (req.file && !parts.length) parts.push('Answer the vocabulary question in the screenshot.');
  content.push({ type: 'text', text: parts.join('\n\n') });

  try {
    const response = await app.get('anthropic').messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system: INSTANT_SYSTEM,
      messages: [{ role: 'user', content }]
    });

    const block = response.content.find(b => b.type === 'text');
    const answer = block ? snapToChoice(cleanAnswer(block.text), choices) : UNCLEAR;
    res.json({ answer: answer || UNCLEAR });
  } catch (err) {
    console.error('[answer]', err.message);
    res.status(500).json({ error: err.message || 'Answer failed' });
  }
});

// GET /api/health
app.get('/api/health', (_req, res) => {
  const provider = app.get('provider') || (app.get('anthropic') ? 'custom' : 'offline');
  res.json({ status: 'ok', provider, model: provider === 'offline' ? 'offline' : provider === 'ollama' ? process.env.OLLAMA_MODEL || 'qwen2.5vl' : MODEL });
});

// JSON error handler (catches multer rejections and other Express errors)
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 400;
  res.status(status).json({ error: err.message || 'Bad request' });
});

// PROVIDER=auto (default): Anthropic if ANTHROPIC_API_KEY is set, else a local Ollama
// vision model if one is running, else fully offline. Force one with PROVIDER=anthropic|ollama|offline.
async function chooseProvider(env = process.env) {
  const want = (env.PROVIDER || 'auto').toLowerCase();
  if (want === 'offline') return { name: 'offline', client: null };

  if ((want === 'auto' || want === 'anthropic') && env.ANTHROPIC_API_KEY) {
    return { name: 'anthropic', client: new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) };
  }
  if (want === 'anthropic') throw new Error('PROVIDER=anthropic requires ANTHROPIC_API_KEY');

  const host = (env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '');
  const model = env.OLLAMA_MODEL || 'qwen2.5vl';
  if (await ollamaAvailable(host, model)) {
    return { name: 'ollama', client: createOllamaClient({ host, model }) };
  }
  if (want === 'ollama') throw new Error(`PROVIDER=ollama: model "${model}" not found at ${host} (run: ollama pull ${model})`);

  return { name: 'offline', client: null };
}

if (require.main === module) {
  chooseProvider()
    .then(({ name, client }) => {
      app.set('provider', name);
      if (client) app.set('anthropic', client);
      else offline.warmUp();
      app.listen(PORT, () => {
        console.log(`Spanish Vocab App → http://localhost:${PORT}`);
        console.log(name === 'offline' ? 'Mode: offline (no API key; bundled dictionary + on-device OCR)' : `Mode: ${name}`);
      });
    })
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}

module.exports = app;
module.exports.chooseProvider = chooseProvider;
