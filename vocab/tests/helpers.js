'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name));

// Small JSON/multipart client bound to a listening server.
function makeClient(server) {
  const send = (opts, payload) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, ...opts }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });

  function request(method, urlPath, body) {
    const payload = body ? JSON.stringify(body) : null;
    return send({
      path: urlPath,
      method,
      headers: { 'Content-Type': 'application/json', ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}) }
    }, payload);
  }

  function imageRequest(fields, fileBuffer, mimeType = 'image/png', urlPath = '/api/analyze-image') {
    const boundary = '----TestBoundary' + Date.now();
    const fieldChunks = Object.entries(fields)
      .map(([name, value]) => `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`)
      .join('');
    const head = `${fieldChunks}--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="test.png"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const body = Buffer.concat([Buffer.from(head), fileBuffer, Buffer.from(`\r\n--${boundary}--\r\n`)]);
    return send({
      path: urlPath,
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }
    }, body);
  }

  return { request, imageRequest };
}

module.exports = { makeClient, fixture };
