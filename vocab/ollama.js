'use strict';

// Minimal adapter that exposes the subset of `anthropic.messages.create` the server uses,
// backed by a local Ollama vision model. No API key required.

async function ollamaAvailable(host, model) {
  try {
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return false;
    const { models = [] } = await res.json();
    const base = model.split(':')[0];
    return models.some(m => m.name === model || m.name.split(':')[0] === base);
  } catch {
    return false;
  }
}

function toOllamaMessages(system, messages) {
  const out = [];
  if (system) out.push({ role: 'system', content: system });
  for (const m of messages) {
    if (typeof m.content === 'string') {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    const text = m.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    const images = m.content.filter(b => b.type === 'image').map(b => b.source.data);
    out.push({ role: m.role, content: text, ...(images.length ? { images } : {}) });
  }
  return out;
}

function createOllamaClient({ host, model }) {
  return {
    messages: {
      async create({ system, messages, max_tokens }) {
        const res = await fetch(`${host}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            stream: false,
            messages: toOllamaMessages(system, messages),
            options: { temperature: 0, num_predict: max_tokens }
          })
        });
        if (!res.ok) throw new Error(`Ollama error ${res.status}: ${(await res.text()).slice(0, 200)}`);
        const data = await res.json();
        return { content: [{ type: 'text', text: data.message?.content ?? '' }] };
      }
    }
  };
}

module.exports = { ollamaAvailable, createOllamaClient, toOllamaMessages };
