const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

// Point the DB at a throwaway file BEFORE requiring anything that opens it.
const tmpDb = path.join(os.tmpdir(), `radio432-pair-test-${process.pid}.db`);
process.env.DB_PATH = tmpDb;

const express = require('express');
const db = require('../../db/database');
const pairRouter = require('../pair');

// Minimal app that mirrors server.js wiring: the router enforces auth on /init
// via the real auth middleware (x-api-key header), /confirm stays public.
let userId;
let apiKey;
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/pair', pairRouter);
  return app;
}

let server;
let baseUrl;

function request(method, p, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      `${baseUrl}${p}`,
      {
        method,
        headers: { 'content-type': 'application/json', ...headers },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null });
        });
      },
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

before(async () => {
  apiKey = '11111111-1111-1111-1111-111111111111';
  const result = db.prepare('INSERT INTO users (email, api_key) VALUES (?, ?)')
    .run('pair@test.local', apiKey);
  userId = result.lastInsertRowid;

  const app = buildApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  try { db.close(); } catch {}
  for (const ext of ['', '-wal', '-shm']) {
    try { fs.unlinkSync(tmpDb + ext); } catch {}
  }
});

test('init creates a token, confirm redeems it once', async () => {
  // 1. init
  const init = await request('POST', '/api/pair/init', {}, { 'x-api-key': apiKey });
  assert.equal(init.status, 200);
  assert.match(init.body.token, /^[0-9a-f-]{36}$/);
  assert.ok(init.body.expiresAt > Date.now());
  assert.ok(init.body.qrData.includes(`token=${init.body.token}`));
  assert.ok(init.body.qrData.startsWith('radio432://pair?server='));

  // 2. token exists in DB and is not expired
  const row = db.prepare('SELECT user_id, expires_at FROM pairing_tokens WHERE token = ?').get(init.body.token);
  assert.ok(row);
  assert.equal(row.user_id, userId);
  assert.ok(row.expires_at > Date.now());

  // 3. confirm returns an apiKey, and no misleading expiresIn
  const confirm = await request('POST', '/api/pair/confirm', { token: init.body.token });
  assert.equal(confirm.status, 200);
  assert.match(confirm.body.apiKey, /^[0-9a-f-]{36}$/);
  assert.equal(confirm.body.expiresIn, undefined);

  // 4. token removed from DB
  const gone = db.prepare('SELECT token FROM pairing_tokens WHERE token = ?').get(init.body.token);
  assert.equal(gone, undefined);

  // 5. confirming again -> 403 (already consumed)
  const replay = await request('POST', '/api/pair/confirm', { token: init.body.token });
  assert.equal(replay.status, 403);
});

test('init without auth -> 401', async () => {
  // No x-api-key, no cf-access header: the real auth middleware must reject.
  const res = await request('POST', '/api/pair/init', {});
  assert.equal(res.status, 401);
});

test('init with invalid api key -> 401', async () => {
  const res = await request('POST', '/api/pair/init', {}, { 'x-api-key': 'nope' });
  assert.equal(res.status, 401);
});

test('confirm without token -> 400', async () => {
  const res = await request('POST', '/api/pair/confirm', {});
  assert.equal(res.status, 400);
});

test('confirm with unknown token -> 403', async () => {
  const res = await request('POST', '/api/pair/confirm', { token: 'does-not-exist' });
  assert.equal(res.status, 403);
});

test('confirm with expired token -> 403 and token cleaned up', async () => {
  const expired = 'expired-token-fixture';
  db.prepare('INSERT INTO pairing_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(expired, userId, Date.now() - 1000);

  const res = await request('POST', '/api/pair/confirm', { token: expired });
  assert.equal(res.status, 403);

  const gone = db.prepare('SELECT token FROM pairing_tokens WHERE token = ?').get(expired);
  assert.equal(gone, undefined);
});
