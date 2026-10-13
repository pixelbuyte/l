'use strict';

/**
 * Tests for the Spanish Vocab API.
 *
 * The server exports `app` and accepts an optional `anthropic` client via
 * `app.set('anthropic', client)`, so tests inject a stub without any
 * module-mocking magic.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Load the server; it won't start listening until we call app.listen()
const app = require('../server.js');

// ── In-memory stub for the Anthropic client ────────────────────────────────

let nextResponse = null;
let lastRequest = null;

const stubClient = {
  messages: {
    async create(params) {
      lastRequest = params;
      if (nextResponse instanceof Error) throw nextResponse;
      const text = typeof nextResponse === 'string' ? nextResponse : JSON.stringify(nextResponse);
      return { content: [{ type: 'text', text }] };
    }
  }
};

// Inject stub before tests run
app.set('anthropic', stubClient);

// ── HTTP helper ────────────────────────────────────────────────────────────

let server;

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1',
      port: server.address().port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers
      }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function imageRequest(fields, fileBuffer, mimeType = 'image/png') {
  return new Promise((resolve, reject) => {
    const boundary = '----TestBoundary' + Date.now();
    const parts = [];

    for (const [name, value] of Object.entries(fields)) {
      parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`);
    }

    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.png"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );

    const preamble = Buffer.from(parts.join('\r\n') + '\r\n');
    const closing = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([preamble, fileBuffer, closing]);

    const opts = {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: '/api/analyze-image',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };

    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

before(() => new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); }));
after(() => new Promise(resolve => server.close(resolve)));

// 1×1 transparent PNG for image tests
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// ── /api/health ────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns status ok and model name', async () => {
    const res = await request('GET', '/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(typeof res.body.model === 'string' && res.body.model.length > 0);
  });
});

// ── /api/translate ────────────────────────────────────────────────────────────

describe('POST /api/translate', () => {
  it('translates a Spanish word', async () => {
    nextResponse = { translation: 'apple', part_of_speech: 'noun', notes: '' };
    const res = await request('POST', '/api/translate', { text: 'manzana' });
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.translation, 'apple');
    assert.equal(res.body.part_of_speech, 'noun');
  });

  it('includes the Spanish text in the prompt', async () => {
    nextResponse = { translation: 'good morning', part_of_speech: 'phrase', notes: '' };
    await request('POST', '/api/translate', { text: 'buenos días' });
    const prompt = lastRequest.messages[0].content;
    assert.ok(prompt.includes('buenos días'), 'prompt should contain the query text');
  });

  it('matches the correct choice', async () => {
    nextResponse = {
      translation: 'house',
      part_of_speech: 'noun',
      match: { index: 1, text: 'house', confidence: 'high' },
      notes: ''
    };
    const choices = [
      { id: 'a', text: 'car' },
      { id: 'b', text: 'house' },
      { id: 'c', text: 'tree' }
    ];
    const res = await request('POST', '/api/translate', { text: 'casa', choices });
    assert.equal(res.status, 200);
    assert.equal(res.body.match.index, 1);
    assert.equal(res.body.match.text, 'house');
    assert.equal(res.body.match.confidence, 'high');
  });

  it('returns match.index -1 when no choice matches', async () => {
    nextResponse = {
      translation: 'dog',
      part_of_speech: 'noun',
      match: { index: -1, text: null, confidence: 'high' },
      notes: ''
    };
    const res = await request('POST', '/api/translate', {
      text: 'perro',
      choices: [{ id: 'a', text: 'cat' }]
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.match.index, -1);
    assert.equal(res.body.match.text, null);
  });

  it('returns 400 when text is missing', async () => {
    const res = await request('POST', '/api/translate', {});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('returns 400 when text is whitespace only', async () => {
    const res = await request('POST', '/api/translate', { text: '   ' });
    assert.equal(res.status, 400);
  });

  it('returns 500 when the model throws', async () => {
    nextResponse = new Error('rate limit exceeded');
    const res = await request('POST', '/api/translate', { text: 'hola' });
    assert.equal(res.status, 500);
    assert.ok(res.body.error.includes('rate limit'));
  });
});

// ── /api/analyze-image ────────────────────────────────────────────────────────

describe('POST /api/analyze-image', () => {
  it('extracts text and returns vocab items', async () => {
    nextResponse = {
      extracted_text: 'perro',
      image_quality: 'clear',
      items: [{ spanish: 'perro', english: 'dog', type: 'word' }],
      notes: 'Flash card'
    };
    const res = await imageRequest({}, PNG_1PX);
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.extracted_text, 'perro');
    assert.equal(res.body.items[0].english, 'dog');
  });

  it('matches choices and returns visual positions', async () => {
    nextResponse = {
      extracted_text: 'perro',
      translation: 'dog',
      image_quality: 'clear',
      match: { index: 0, text: 'dog', confidence: 'high' },
      visual_choices: [{
        index: 0,
        text: 'dog',
        position: { region: 'top-left', x_percent: 25, y_percent: 30 },
        background_color: '#ff0000',
        text_color: '#ffffff',
        is_correct: true
      }]
    };
    const choices = JSON.stringify([{ id: 'a', text: 'dog' }]);
    const res = await imageRequest({ choices }, PNG_1PX);
    assert.equal(res.status, 200);
    assert.equal(res.body.match.text, 'dog');
    assert.equal(res.body.visual_choices[0].background_color, '#ff0000');
    assert.equal(res.body.visual_choices[0].position.x_percent, 25);
  });

  it('returns 422 for unreadable images', async () => {
    nextResponse = { image_quality: 'unreadable', error: 'Too blurry to read' };
    const res = await imageRequest({}, PNG_1PX);
    assert.equal(res.status, 422);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error);
  });

  it('returns 400 when no image is provided', async () => {
    const res = await request('POST', '/api/analyze-image', {});
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('rejects non-image MIME types', async () => {
    const res = await imageRequest({}, Buffer.from('not an image'), 'text/plain');
    assert.equal(res.status, 400);
  });

  it('includes the image in the API request', async () => {
    nextResponse = {
      extracted_text: 'libro',
      image_quality: 'clear',
      items: [{ spanish: 'libro', english: 'book', type: 'word' }],
      notes: ''
    };
    await imageRequest({}, PNG_1PX);
    const content = lastRequest.messages[0].content;
    const imageBlock = content.find(b => b.type === 'image');
    assert.ok(imageBlock, 'request should include an image content block');
    assert.equal(imageBlock.source.type, 'base64');
    assert.equal(imageBlock.source.media_type, 'image/png');
  });
});
