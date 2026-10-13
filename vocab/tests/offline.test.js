'use strict';

// Offline mode: no API key, no network. Runs the real OCR on rendered quiz screenshots.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const dict = require('../dictionary');
const offline = require('../offline');
const { ollamaAvailable, createOllamaClient } = require('../ollama');
const app = require('../server.js'); // no stub client => offline
const { makeClient, fixture } = require('./helpers');

let server;
let request;
let imageRequest;

before(() => new Promise(resolve => {
  server = app.listen(0, '127.0.0.1', () => {
    ({ request, imageRequest } = makeClient(server));
    resolve();
  });
}));

after(async () => {
  await new Promise(resolve => server.close(resolve));
  await offline.shutdown();
});

describe('dictionary', () => {
  it('knows the classroom examples', () => {
    const cases = {
      'el salón de clase': 'classroom',
      'la pluma': 'pen',
      'el alumno / la alumna': 'pupil',
      'la calculadora': 'calculator',
      'la cinta pegante': 'tape',
      'el sacapuntas': 'pencil sharpener',
      'la puerta': 'door',
      'el piso': 'floor'
    };
    for (const [es, en] of Object.entries(cases)) {
      assert.equal(dict.lookup(es)?.english[0], en, es);
    }
  });

  it('ignores articles, accents, case, and punctuation', () => {
    assert.equal(dict.lookup('SALON DE CLASE!')?.english[0], 'classroom');
    assert.equal(dict.lookup('puerta')?.english[0], 'door');
    assert.equal(dict.lookup('la alumna')?.english[0], 'pupil');
  });

  it('returns null for unknown words', () => {
    assert.equal(dict.lookup('xyzzy'), null);
  });
});

describe('matching', () => {
  it('tolerates small OCR typos but not near-words', () => {
    assert.ok(offline.similarity('pencil', 'pencii') >= 0.8);
    assert.ok(offline.similarity('pen', 'pencil') < 0.85);
  });

  it('prefers the first (preferred) translation among matches', () => {
    const m = offline.matchOption(['pupil', 'student'], ['student', 'pupil']);
    assert.equal(m.index, 1);
  });
});

describe('offline /api/answer (text)', () => {
  it('answers with the preferred translation', async () => {
    const res = await request('POST', '/api/answer', { text: 'la cinta pegante' });
    assert.deepEqual(res.body, { answer: 'tape' });
  });

  it('returns the option exactly as written', async () => {
    const res = await request('POST', '/api/answer', { text: 'el alumno / la alumna', choices: ['Teacher', 'Student', 'Principal'] });
    assert.equal(res.body.answer, 'Student');
  });

  it('says "Unknown word." for words outside the dictionary', async () => {
    const res = await request('POST', '/api/answer', { text: 'xyzzy' });
    assert.deepEqual(res.body, { answer: 'Unknown word.' });
  });
});

describe('offline /api/answer (screenshots)', () => {
  it('reads the question and picks the visible option', async () => {
    const res = await imageRequest({}, fixture('quiz.png'), 'image/png', '/api/answer');
    assert.deepEqual(res.body, { answer: 'pen' });
  });

  it('works on dark-mode screenshots with light text', async () => {
    const res = await imageRequest({}, fixture('quiz-dark.png'), 'image/png', '/api/answer');
    assert.deepEqual(res.body, { answer: 'pencil sharpener' });
  });

  it('ignores scores and timers', async () => {
    const res = await imageRequest({}, fixture('quiz.png'), 'image/png', '/api/answer');
    assert.ok(!/puntos|tiempo|12/i.test(res.body.answer));
  });

  it('returns "Unclear image." for an unreadable image', async () => {
    const res = await imageRequest({}, fixture('blank.png'), 'image/png', '/api/answer');
    assert.deepEqual(res.body, { answer: 'Unclear image.' });
  });
});

describe('offline /api/translate', () => {
  it('translates and matches a choice', async () => {
    const res = await request('POST', '/api/translate', {
      text: 'la puerta',
      choices: [{ text: 'window' }, { text: 'door' }]
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.translation, 'door');
    assert.equal(res.body.match.index, 1);
  });

  it('reports unknown words clearly', async () => {
    const res = await request('POST', '/api/translate', { text: 'xyzzy' });
    assert.equal(res.status, 422);
    assert.match(res.body.error, /offline dictionary/);
  });
});

describe('offline /api/analyze-image', () => {
  it('returns the matching choice with its colour and position', async () => {
    const choices = JSON.stringify(['pencil', 'pen', 'eraser', 'ruler'].map((text, i) => ({ id: String(i), text })));
    const res = await imageRequest({ choices }, fixture('quiz.png'));
    assert.equal(res.status, 200);
    assert.equal(res.body.extracted_text, 'la pluma');
    assert.equal(res.body.match.text, 'pen');
    const pen = res.body.visual_choices.find(v => v.is_correct);
    assert.equal(pen.text, 'pen');
    assert.equal(pen.color_name, 'green');
    assert.equal(pen.background_color, '#1f9d55');
    assert.equal(pen.position.region, 'middle-right');
    assert.ok(pen.position.x_percent > 60 && pen.position.y_percent > 40 && pen.position.y_percent < 60);
    assert.equal(res.body.visual_choices.length, 4);
  });

  it('lists vocabulary found when no choices are given', async () => {
    const res = await imageRequest({}, fixture('quiz.png'));
    assert.equal(res.status, 200);
    assert.ok(res.body.items.some(i => i.spanish === 'la pluma' && i.english === 'pen'));
  });

  it('rejects unreadable images with 422', async () => {
    const res = await imageRequest({}, fixture('blank.png'));
    assert.equal(res.status, 422);
    assert.equal(res.body.image_quality, 'unreadable');
  });
});

describe('server health', () => {
  it('reports offline provider', async () => {
    const res = await request('GET', '/api/health');
    assert.equal(res.body.provider, 'offline');
  });
});

describe('chooseProvider', () => {
  const closedPort = 'http://127.0.0.1:9';

  it('uses offline when no key and no local model', async () => {
    const p = await app.chooseProvider({ OLLAMA_HOST: closedPort });
    assert.equal(p.name, 'offline');
    assert.equal(p.client, null);
  });

  it('uses Anthropic when a key is present', async () => {
    const p = await app.chooseProvider({ ANTHROPIC_API_KEY: 'sk-test' });
    assert.equal(p.name, 'anthropic');
  });

  it('lets PROVIDER=offline win over a key', async () => {
    const p = await app.chooseProvider({ ANTHROPIC_API_KEY: 'sk-test', PROVIDER: 'offline' });
    assert.equal(p.name, 'offline');
  });

  it('errors when PROVIDER=anthropic has no key', async () => {
    await assert.rejects(app.chooseProvider({ PROVIDER: 'anthropic' }), /ANTHROPIC_API_KEY/);
  });

  it('errors when PROVIDER=ollama has no model available', async () => {
    await assert.rejects(app.chooseProvider({ PROVIDER: 'ollama', OLLAMA_HOST: closedPort }), /ollama pull/);
  });
});

describe('ollama adapter', () => {
  let fake;
  let host;
  let lastChat;

  before(() => new Promise(resolve => {
    fake = http.createServer((req, res) => {
      let body = '';
      req.on('data', c => (body += c));
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json');
        if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: 'qwen2.5vl:7b' }] }));
        lastChat = JSON.parse(body);
        res.end(JSON.stringify({ message: { content: 'door' } }));
      });
    }).listen(0, '127.0.0.1', () => {
      host = `http://127.0.0.1:${fake.address().port}`;
      resolve();
    });
  }));

  after(() => new Promise(resolve => fake.close(resolve)));

  it('detects an installed model by base name', async () => {
    assert.equal(await ollamaAvailable(host, 'qwen2.5vl'), true);
    assert.equal(await ollamaAvailable(host, 'llava'), false);
  });

  it('is selected automatically when available', async () => {
    const p = await app.chooseProvider({ OLLAMA_HOST: host });
    assert.equal(p.name, 'ollama');
  });

  it('sends system prompt, text, and base64 images; returns Messages-style content', async () => {
    const client = createOllamaClient({ host, model: 'qwen2.5vl' });
    const out = await client.messages.create({
      max_tokens: 64,
      system: 'Answer only.',
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'QUJD' } },
        { type: 'text', text: 'la puerta' }
      ] }]
    });
    assert.deepEqual(out.content, [{ type: 'text', text: 'door' }]);
    assert.equal(lastChat.model, 'qwen2.5vl');
    assert.equal(lastChat.stream, false);
    assert.equal(lastChat.messages[0].role, 'system');
    assert.deepEqual(lastChat.messages[1].images, ['QUJD']);
    assert.equal(lastChat.messages[1].content, 'la puerta');
  });
});
