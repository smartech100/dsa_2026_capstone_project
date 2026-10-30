import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { createApp } from '../src/http/app.js';

let server;
let baseUrl;

function sendRequest(path, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const outgoing = request(url, { method, headers }, (response) => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        text += chunk;
      });
      response.on('end', () => {
        resolve({ status: response.statusCode, headers: response.headers, body: text });
      });
    });
    outgoing.on('error', reject);
    if (body !== undefined) outgoing.write(body);
    outgoing.end();
  });
}

describe('HTTP app', () => {
  before(async () => {
    server = createApp();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    if (server?.listening) {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it('answers a real HTTP request to GET /health', async () => {
    const response = await sendRequest('/health');

    assert.equal(response.status, 200);
    assert.match(response.headers['content-type'], /^application\/json/);
    assert.deepEqual(JSON.parse(response.body), { status: 'ok' });
  });

  it('returns a consistent JSON 404 for unknown API routes', async () => {
    const response = await sendRequest('/api/not-a-route');

    assert.equal(response.status, 404);
    assert.deepEqual(JSON.parse(response.body), {
      error: { code: 'NOT_FOUND', message: 'Route not found' }
    });
  });

  it('returns a consistent JSON 400 for malformed JSON', async () => {
    const response = await sendRequest('/api/example', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{'
    });

    assert.equal(response.status, 400);
    assert.deepEqual(JSON.parse(response.body), {
      error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON' }
    });
  });

  it('serves public files and refuses paths outside the public directory', async () => {
    const index = await sendRequest('/');
    assert.equal(index.status, 200);
    assert.match(index.body, /<title>Event Ticketing<\/title>/);

    const escaped = await sendRequest('/..%2fREADME.md');
    assert.equal(escaped.status, 404);
    assert.deepEqual(JSON.parse(escaped.body), {
      error: { code: 'NOT_FOUND', message: 'File not found' }
    });
  });
});
