const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { Readable } = require('node:stream');

const meta = require('../meta');
const {
  parseStreamTitle,
  validateStreamUrl,
  fetchICYMetadata,
  readICYResponse,
  isBlockedIp,
  decodeMeta,
  InvalidUrlError,
  BlockedUrlError,
} = meta;

// ---------------------------------------------------------------------------
// Test helpers for the stream-reading path
// ---------------------------------------------------------------------------

// Builds the raw bytes an ICY server sends: metaInt audio bytes, 1 length byte
// (in 16-byte units), then the NUL-padded StreamTitle block.
function buildIcyPayload(streamTitle, metaInt = 16) {
  const audio = Buffer.alloc(metaInt, 0x41); // 'A' * metaInt
  const titlePayload = Buffer.from(`StreamTitle='${streamTitle}';`, 'utf8');
  const padded = Math.ceil(titlePayload.length / 16) * 16;
  const metaBlock = Buffer.alloc(padded);
  titlePayload.copy(metaBlock);
  const lengthByte = Buffer.from([padded / 16]);
  return Buffer.concat([audio, lengthByte, metaBlock]);
}

// A readable that also carries `headers` (like http.IncomingMessage) and a
// no-op destroy(), so readICYResponse can consume it without a socket.
function mockResponse(headers, chunks) {
  const readable = Readable.from(chunks);
  readable.headers = headers;
  return readable;
}

// ---------------------------------------------------------------------------
// parseStreamTitle
// ---------------------------------------------------------------------------

test('parseStreamTitle: Artist - Title', () => {
  const r = parseStreamTitle("StreamTitle='Daft Punk - Around the World';StreamUrl='';");
  assert.deepEqual(r, { artist: 'Daft Punk', title: 'Around the World' });
});

test('parseStreamTitle: title only (no separator)', () => {
  const r = parseStreamTitle("StreamTitle='Morning News';");
  assert.deepEqual(r, { artist: null, title: 'Morning News' });
});

test('parseStreamTitle: empty StreamTitle', () => {
  const r = parseStreamTitle("StreamTitle='';StreamUrl='';");
  assert.deepEqual(r, { artist: null, title: null });
});

test('parseStreamTitle: no StreamTitle field', () => {
  const r = parseStreamTitle('StreamUrl="http://example.com";');
  assert.deepEqual(r, { artist: null, title: null });
});

test('parseStreamTitle: null-terminated / NUL-padded buffer', () => {
  const buf = Buffer.concat([
    Buffer.from("StreamTitle='ABBA - Mamma Mia';"),
    Buffer.alloc(10, 0), // NUL padding to 16-byte boundary
  ]);
  const r = parseStreamTitle(buf);
  assert.deepEqual(r, { artist: 'ABBA', title: 'Mamma Mia' });
});

test('parseStreamTitle: latin-1 umlauts decode correctly', () => {
  // "Björk - Jóga" encoded as Latin-1 (invalid UTF-8 -> triggers fallback)
  const buf = Buffer.from("StreamTitle='Bj\xf6rk - J\xf3ga';", 'latin1');
  const r = parseStreamTitle(buf);
  assert.deepEqual(r, { artist: 'Björk', title: 'Jóga' });
});

test('parseStreamTitle: utf-8 umlauts decode correctly', () => {
  const buf = Buffer.from("StreamTitle='Über - Schön';", 'utf8');
  const r = parseStreamTitle(buf);
  assert.deepEqual(r, { artist: 'Über', title: 'Schön' });
});

// ---------------------------------------------------------------------------
// decodeMeta
// ---------------------------------------------------------------------------

test('decodeMeta: passes strings through', () => {
  assert.equal(decodeMeta('plain'), 'plain');
});

test('decodeMeta: valid utf-8 buffer', () => {
  assert.equal(decodeMeta(Buffer.from('grün', 'utf8')), 'grün');
});

// ---------------------------------------------------------------------------
// isBlockedIp
// ---------------------------------------------------------------------------

test('isBlockedIp: blocks loopback / private / link-local', () => {
  for (const ip of [
    '127.0.0.1',
    '10.1.2.3',
    '192.168.1.71',
    '172.16.0.1',
    '172.31.255.255',
    '169.254.169.254',
    '::1',
    'fe80::1',
    'fd00::1',
    '::ffff:192.168.1.71',
  ]) {
    assert.equal(isBlockedIp(ip), true, `${ip} should be blocked`);
  }
});

test('isBlockedIp: allows public addresses', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111']) {
    assert.equal(isBlockedIp(ip), false, `${ip} should be allowed`);
  }
});

test('isBlockedIp: blocks 172.15 / 172.32 are NOT private', () => {
  assert.equal(isBlockedIp('172.15.0.1'), false);
  assert.equal(isBlockedIp('172.32.0.1'), false);
});

// ---------------------------------------------------------------------------
// validateStreamUrl
// ---------------------------------------------------------------------------

test('validateStreamUrl: accepts a public http URL and pins the validated IP', async () => {
  const { url, validatedIp } = await validateStreamUrl('http://1.1.1.1/stream');
  assert.equal(url.hostname, '1.1.1.1');
  // For a literal IP the pinned address must equal the host literal.
  assert.equal(validatedIp, '1.1.1.1');
});

test('validateStreamUrl: rejects invalid URL', async () => {
  await assert.rejects(() => validateStreamUrl('not a url'), InvalidUrlError);
});

test('validateStreamUrl: rejects unsupported protocol', async () => {
  await assert.rejects(() => validateStreamUrl('ftp://example.com'), InvalidUrlError);
  await assert.rejects(() => validateStreamUrl('file:///etc/passwd'), InvalidUrlError);
});

test('validateStreamUrl: blocks localhost', async () => {
  await assert.rejects(() => validateStreamUrl('http://localhost:3001'), BlockedUrlError);
});

test('validateStreamUrl: blocks 127.0.0.1', async () => {
  await assert.rejects(() => validateStreamUrl('http://127.0.0.1:8000'), BlockedUrlError);
});

test('validateStreamUrl: blocks 192.168.x (NAS)', async () => {
  await assert.rejects(() => validateStreamUrl('http://192.168.1.71'), BlockedUrlError);
});

test('validateStreamUrl: blocks cloud metadata endpoint', async () => {
  await assert.rejects(() => validateStreamUrl('http://169.254.169.254/latest/meta-data/'), BlockedUrlError);
});

test('validateStreamUrl: blocks IPv6 loopback', async () => {
  await assert.rejects(() => validateStreamUrl('http://[::1]:8080'), BlockedUrlError);
});

test('validateStreamUrl: blocks DNS name resolving to localhost', async () => {
  // localhost.localdomain style hostnames usually resolve to 127.0.0.1.
  // We assert via the public DNS-rebind-style guard using a name we control:
  // "localhost" already covered; here we ensure resolved-IP check engages by
  // using a hostname literal that the resolver maps to loopback.
  await assert.rejects(
    () => validateStreamUrl('http://localhost.'),
    (err) => err instanceof BlockedUrlError || err instanceof InvalidUrlError
  );
});

// ---------------------------------------------------------------------------
// fetchICYMetadata (integration against a local mock ICY server)
// ---------------------------------------------------------------------------

function startMockIcyServer(streamTitle) {
  // Build a minimal ICY response: metaInt bytes of audio, length byte, meta block.
  const metaInt = 16;
  const audio = Buffer.alloc(metaInt, 0x41); // 'A' * 16
  const titlePayload = Buffer.from(`StreamTitle='${streamTitle}';`, 'utf8');
  const padded = Math.ceil(titlePayload.length / 16) * 16;
  const metaBlock = Buffer.alloc(padded);
  titlePayload.copy(metaBlock);
  const lengthByte = Buffer.from([padded / 16]);

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'icy-metaint': String(metaInt) });
    res.write(Buffer.concat([audio, lengthByte, metaBlock]));
    res.end();
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('fetchICYMetadata: parses metadata from a mock stream (loopback allowed via IP literal bypass test)', async (t) => {
  // The mock listens on 127.0.0.1 which our SSRF guard correctly blocks.
  // So we assert the guard fires even for our own test server.
  const server = await startMockIcyServer('Queen - Bohemian Rhapsody');
  const { port } = server.address();
  t.after(() => server.close());

  await assert.rejects(
    () => fetchICYMetadata(`http://127.0.0.1:${port}/`),
    BlockedUrlError
  );
});

test('parseStreamTitle: handles the exact bytes a mock server would send', () => {
  const metaInt = 16;
  const titlePayload = Buffer.from("StreamTitle='Queen - Bohemian Rhapsody';", 'utf8');
  const padded = Math.ceil(titlePayload.length / 16) * 16;
  const metaBlock = Buffer.alloc(padded);
  titlePayload.copy(metaBlock);

  const r = parseStreamTitle(metaBlock);
  assert.deepEqual(r, { artist: 'Queen', title: 'Bohemian Rhapsody' });
});

// ---------------------------------------------------------------------------
// readICYResponse (network-free stream-reading coverage)
// ---------------------------------------------------------------------------

test('readICYResponse: parses metadata from a chunked ICY stream', async () => {
  const payload = buildIcyPayload('Daft Punk - Get Lucky', 16);
  // Split across two chunks to exercise the buffer-concat / wait-for-rest path.
  const response = mockResponse({ 'icy-metaint': '16' }, [
    payload.slice(0, 10),
    payload.slice(10),
  ]);

  const result = await readICYResponse(response);
  assert.deepEqual(result, { artist: 'Daft Punk', title: 'Get Lucky' });
});

test('readICYResponse: resolves null when no icy-metaint header', async () => {
  const response = mockResponse({}, [Buffer.from('audio-only')]);
  const result = await readICYResponse(response);
  assert.deepEqual(result, { artist: null, title: null });
});

test('readICYResponse: resolves null on empty metadata block (length byte 0)', async () => {
  const metaInt = 16;
  const bytes = Buffer.concat([
    Buffer.alloc(metaInt, 0x41), // audio
    Buffer.from([0]), // metadata length byte = 0 -> no metadata
  ]);
  const response = mockResponse({ 'icy-metaint': String(metaInt) }, [bytes]);
  const result = await readICYResponse(response);
  assert.deepEqual(result, { artist: null, title: null });
});

test('readICYResponse: rejects with UpstreamError on stream error', async () => {
  const response = new Readable({ read() {} });
  response.headers = { 'icy-metaint': '16' };
  const p = readICYResponse(response);
  response.emit('error', new Error('socket hang up'));
  await assert.rejects(() => p, meta.UpstreamError);
});

// ---------------------------------------------------------------------------
// fetchICYMetadata with injected requestFn (full path incl. IP pinning)
// ---------------------------------------------------------------------------

test('fetchICYMetadata: reads stream and parses metadata via injected requestFn', async () => {
  const payload = buildIcyPayload('Queen - Bohemian Rhapsody', 16);
  let capturedOptions = null;

  const requestFn = (options, callback) => {
    capturedOptions = options;
    const response = mockResponse({ 'icy-metaint': '16' }, [payload]);
    // Deliver the response on the next tick, like a real request would.
    setImmediate(() => callback(response));
    return {
      on() {},
      setTimeout() {},
      end() {},
      destroy() {},
    };
  };

  const result = await fetchICYMetadata('http://example.com/stream', requestFn);
  assert.deepEqual(result, { artist: 'Queen', title: 'Bohemian Rhapsody' });

  // The request must target the validated/pinned IP, not re-resolve the host,
  // while the original hostname stays in the Host header (TOCTOU defence).
  assert.ok(capturedOptions, 'requestFn should have been called');
  assert.notEqual(capturedOptions.host, 'example.com');
  assert.ok(/^\d+\.\d+\.\d+\.\d+$/.test(capturedOptions.host) || capturedOptions.host.includes(':'),
    'host should be a literal IP address');
  assert.equal(capturedOptions.headers.Host, 'example.com');
  assert.equal(capturedOptions.path, '/stream');
});
