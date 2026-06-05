const express = require('express');
const http = require('http');
const https = require('https');
const router = express.Router();

const REQUEST_TIMEOUT_MS = 8000;
const MAX_BYTES = 256 * 1024; // safety cap so we never buffer a whole stream

/**
 * Connects to an ICY/Icecast/Shoutcast stream, reads the inline metadata block
 * and returns the parsed now-playing info.
 *
 * @param {string} streamUrl
 * @returns {Promise<{ title: string|null, artist: string|null }>}
 */
function fetchICYMetadata(streamUrl) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(streamUrl);
    } catch (e) {
      return reject(new Error('Invalid stream URL'));
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return reject(new Error('Unsupported protocol'));
    }

    const client = parsed.protocol === 'https:' ? https : http;

    const request = client.request(
      streamUrl,
      {
        method: 'GET',
        headers: {
          'Icy-MetaData': '1',
          'User-Agent': 'Radio432/1.0',
          Accept: '*/*',
        },
      },
      (response) => {
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

          const metaBlock = buffer
            .slice(metaInt + 1, metaInt + 1 + metaLength)
            .toString('utf8');

          finish(parseStreamTitle(metaBlock));
        });

        response.on('end', () => finish({ title: null, artist: null }));
        response.on('error', (err) => {
          if (!settled) {
            settled = true;
            reject(err);
          }
        });
      }
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error('Stream request timed out'));
    });

    request.on('error', (err) => reject(err));
    request.end();
  });
}

/**
 * Parses an ICY metadata block, e.g. `StreamTitle='Artist - Title';StreamUrl='...';`
 * Returns { title, artist }. Falls back to title-only when no " - " separator.
 *
 * @param {string} metaBlock
 * @returns {{ title: string|null, artist: string|null }}
 */
function parseStreamTitle(metaBlock) {
  // Match StreamTitle='...' (quoted) or StreamTitle=... up to the next field/null.
  const match =
    metaBlock.match(/StreamTitle='([^']*)'/) ||
    metaBlock.match(/StreamTitle=([^;\x00]*)/);

  if (!match) {
    return { title: null, artist: null };
  }

  const raw = match[1].trim();
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

  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid url encoding' });
  }

  try {
    const metadata = await fetchICYMetadata(decoded);
    res.json(metadata);
  } catch (err) {
    const status = /invalid|unsupported/i.test(err.message) ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
