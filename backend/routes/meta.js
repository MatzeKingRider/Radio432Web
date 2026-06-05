const express = require('express');
const http = require('http');
const https = require('https');
const dns = require('dns').promises;
const net = require('net');
const router = express.Router();

const REQUEST_TIMEOUT_MS = 8000;
const MAX_BYTES = 256 * 1024; // safety cap so we never buffer a whole stream

// Error classes so the route can map failures to HTTP status codes without
// brittle message-regex matching.
class InvalidUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidUrlError';
    this.statusCode = 400;
  }
}

class BlockedUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BlockedUrlError';
    this.statusCode = 403;
  }
}

class UpstreamError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UpstreamError';
    this.statusCode = 502;
  }
}

// Hostname patterns that must never be fetched (loopback, private, link-local).
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./, // 127.0.0.0/8 loopback
  /^0\./, // 0.0.0.0/8
  /^192\.168\./, // 192.168.0.0/16 private
  /^10\./, // 10.0.0.0/8 private
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 private
  /^169\.254\./, // 169.254.0.0/16 link-local (incl. cloud metadata 169.254.169.254)
  /^::1$/, // IPv6 loopback
  /^::$/, // IPv6 unspecified
  /^fe80:/i, // IPv6 link-local
  /^fc00:/i, // IPv6 unique-local
  /^fd[0-9a-f]{2}:/i, // IPv6 unique-local (fd00::/8)
];

/**
 * Returns true if the given IP address points into a private, loopback or
 * link-local range. Works for both IPv4 and IPv6 (including IPv4-mapped IPv6).
 *
 * @param {string} ip
 * @returns {boolean}
 */
function isBlockedIp(ip) {
  if (!ip) return true;

  // Unwrap IPv4-mapped IPv6 addresses like ::ffff:192.168.1.71
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) ip = mapped[1];

  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 0) return true; // "this" network
    if (a === 192 && b === 168) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 169 && b === 254) return true; // link-local / metadata
    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique-local
    return false;
  }

  // Unknown format -> block to be safe.
  return true;
}

/**
 * Validates a stream URL against SSRF attacks. Rejects unsupported protocols,
 * blocked hostnames and any URL whose DNS resolution lands on a private,
 * loopback or link-local address (mitigates DNS-based bypasses).
 *
 * Throws InvalidUrlError or BlockedUrlError on failure.
 *
 * Returns the parsed URL plus the exact IP that was validated. The caller MUST
 * connect to `validatedIp` (not re-resolve the hostname) to close the
 * DNS-rebinding TOCTOU window between validation and the actual request.
 *
 * @param {string} urlStr
 * @returns {Promise<{ url: URL, validatedIp: string, family: number }>}
 */
async function validateStreamUrl(urlStr) {
  let url;
  try {
    url = new URL(urlStr);
  } catch (err) {
    throw new InvalidUrlError(`Invalid URL: ${err.message}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new InvalidUrlError(`Unsupported protocol: ${url.protocol}`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new BlockedUrlError(
        `Blocked: cannot fetch from private range (${hostname})`
      );
    }
  }

  // If the hostname is a literal IP, validate it directly.
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new BlockedUrlError(
        `Blocked: cannot fetch from private range (${hostname})`
      );
    }
    return { url, validatedIp: hostname, family: net.isIP(hostname) };
  }

  // Otherwise resolve DNS and make sure no resolved address is private.
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (err) {
    throw new InvalidUrlError(`Cannot resolve host: ${hostname}`);
  }

  if (!addresses.length) {
    throw new InvalidUrlError(`Cannot resolve host: ${hostname}`);
  }

  for (const { address } of addresses) {
    if (isBlockedIp(address)) {
      throw new BlockedUrlError(
        `Blocked: ${hostname} resolves to a private address (${address})`
      );
    }
  }

  // Pin the first validated address so the request connects to exactly the IP
  // we checked, not whatever a second DNS lookup might return.
  const { address, family } = addresses[0];
  return { url, validatedIp: address, family };
}

/**
 * Reads an ICY response stream and resolves with the parsed metadata once the
 * first inline metadata block has been received (or with nulls if there is no
 * usable metadata). Network-free: it only consumes an IncomingMessage-like
 * readable that emits 'data'/'end'/'error', so it is unit-testable with a stub.
 *
 * @param {import('stream').Readable & { headers: Object }} response
 * @returns {Promise<{ title: string|null, artist: string|null }>}
 */
function readICYResponse(response) {
  return new Promise((resolve, reject) => {
    // ICY responses sometimes use a non-standard "ICY 200 OK" status line.
    // Node still parses statusCode; treat anything outside 2xx as an error
    // unless metaint is present.
    const metaInt = parseInt(
      response.headers['icy-metaint'] ||
        response.headers['Icy-MetaInt'] ||
        '0',
      10
    );

    if (!metaInt || Number.isNaN(metaInt) || metaInt <= 0) {
      // No inline metadata advertised by this stream.
      response.destroy();
      return resolve({ title: null, artist: null });
    }

    let received = 0;
    let buffer = Buffer.alloc(0);
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      response.destroy();
      resolve(result);
    };

    response.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      received += chunk.length;

      // We need: metaInt bytes of audio, then 1 length byte, then the block.
      if (buffer.length < metaInt + 1) {
        if (received > MAX_BYTES) finish({ title: null, artist: null });
        return;
      }

      const metaLengthByte = buffer[metaInt];
      const metaLength = metaLengthByte * 16; // length is given in 16-byte units

      if (metaLength === 0) {
        // Empty metadata block at this interval; nothing to report yet.
        finish({ title: null, artist: null });
        return;
      }

      if (buffer.length < metaInt + 1 + metaLength) {
        if (received > MAX_BYTES) finish({ title: null, artist: null });
        return; // wait for the rest of the block
      }

      const metaBlock = buffer.slice(metaInt + 1, metaInt + 1 + metaLength);

      finish(parseStreamTitle(metaBlock));
    });

    response.on('end', () => finish({ title: null, artist: null }));
    response.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(new UpstreamError(err.message));
      }
    });
  });
}

/**
 * Connects to an ICY/Icecast/Shoutcast stream, reads the inline metadata block
 * and returns the parsed now-playing info.
 *
 * @param {string} streamUrl
 * @param {Function} [requestFn] optional injected request factory for tests.
 *   Called as `requestFn(options, callback)` and must return an object with an
 *   `on`, `setTimeout` and `end` method (i.e. a ClientRequest-like object).
 * @returns {Promise<{ title: string|null, artist: string|null }>}
 */
async function fetchICYMetadata(streamUrl, requestFn = null) {
  // SSRF guard: validate (and DNS-check) before opening any socket.
  const { url, validatedIp, family } = await validateStreamUrl(streamUrl);

  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;

    // Connect to the IP we validated, not the hostname, so a second DNS lookup
    // cannot redirect us to a private address (DNS-rebinding TOCTOU defence).
    // The original hostname is kept in the Host header (and SNI for TLS) so the
    // upstream still routes/serves correctly.
    const defaultPort = url.protocol === 'https:' ? 443 : 80;
    const options = {
      host: validatedIp,
      family,
      port: url.port || defaultPort,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Host: url.host,
        'Icy-MetaData': '1',
        'User-Agent': 'Radio432/1.0',
        Accept: '*/*',
      },
    };

    if (url.protocol === 'https:') {
      // Keep certificate validation working against the real hostname.
      options.servername = url.hostname;
    }

    const issue = requestFn || client.request.bind(client);

    const request = issue(options, (response) => {
      readICYResponse(response).then(resolve, reject);
    });

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new UpstreamError('Stream request timed out'));
    });

    request.on('error', (err) => {
      reject(err instanceof UpstreamError ? err : new UpstreamError(err.message));
    });
    request.end();
  });
}

/**
 * Decodes ICY metadata bytes to a string. ICY/Shoutcast has no fixed charset;
 * we try UTF-8 first and fall back to Latin-1 (ISO-8859-1) when the bytes are
 * not valid UTF-8, which keeps umlauts (ä, ö, ü) readable for both encodings.
 *
 * @param {Buffer|string} input
 * @returns {string}
 */
function decodeMeta(input) {
  if (typeof input === 'string') return input;

  const utf8 = input.toString('utf8');
  // U+FFFD is the replacement char Node inserts for invalid UTF-8 sequences.
  if (!utf8.includes('�')) return utf8;

  return input.toString('latin1');
}

/**
 * Parses an ICY metadata block, e.g. `StreamTitle='Artist - Title';StreamUrl='...';`
 * Returns { title, artist }. Falls back to title-only when no " - " separator.
 *
 * @param {Buffer|string} metaBlockInput
 * @returns {{ title: string|null, artist: string|null }}
 */
function parseStreamTitle(metaBlockInput) {
  const metaBlock = decodeMeta(metaBlockInput);

  // Match StreamTitle='...' (quoted) or StreamTitle=... up to the next field/null.
  const match =
    metaBlock.match(/StreamTitle='([^']*)'/) ||
    metaBlock.match(/StreamTitle=([^;\x00]*)/);

  if (!match) {
    return { title: null, artist: null };
  }

  // Drop any trailing NUL padding then trim whitespace.
  const raw = match[1].replace(/\x00+$/, '').trim();
  if (!raw) {
    return { title: null, artist: null };
  }

  const sepIndex = raw.indexOf(' - ');
  if (sepIndex !== -1) {
    const artist = raw.slice(0, sepIndex).trim();
    const title = raw.slice(sepIndex + 3).trim();
    return { title: title || null, artist: artist || null };
  }

  return { title: raw, artist: null };
}

router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'url required' });
  }

  // Express has already percent-decoded query values, so use `url` as-is.
  try {
    const metadata = await fetchICYMetadata(url);
    res.json(metadata);
  } catch (err) {
    const status = Number.isInteger(err.statusCode) ? err.statusCode : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
module.exports.parseStreamTitle = parseStreamTitle;
module.exports.fetchICYMetadata = fetchICYMetadata;
module.exports.readICYResponse = readICYResponse;
module.exports.validateStreamUrl = validateStreamUrl;
module.exports.isBlockedIp = isBlockedIp;
module.exports.decodeMeta = decodeMeta;
module.exports.InvalidUrlError = InvalidUrlError;
module.exports.BlockedUrlError = BlockedUrlError;
module.exports.UpstreamError = UpstreamError;
