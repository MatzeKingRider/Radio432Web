// Zentraler API-Client für das Radio432-Backend.
//
// Auth in Produktion: Cloudflare Access setzt automatisch den Header
// 'cf-access-authenticated-user-email' — kein API-Key nötig.
//
// Auth lokal (Dev): Vite-Proxy injiziert den CF-Header (vite.config.js).
// Alternativ: localStorage('radio432_api_key') setzen für x-api-key-Auth.
// HINWEIS: Der API-Key liegt im localStorage und ist daher bei XSS auslesbar.
// Nur für lokale Entwicklung verwenden — niemals in Produktion benötigt.

function authHeaders() {
  const key = localStorage.getItem('radio432_api_key')
  return key ? { 'x-api-key': key } : {}
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = new Error(`API ${res.status}: ${path}`)
    err.status = res.status
    throw err
  }
  return res.status === 204 ? null : res.json()
}

export const favoritesApi = {
  list: () => apiFetch('/favorites'),
  // station: { id, name, url, favicon }
  add: (station) => apiFetch('/favorites', { method: 'POST', body: JSON.stringify(station) }),
  remove: (id) => apiFetch(`/favorites/${id}`, { method: 'DELETE' }),
  reorder: (order) => apiFetch('/favorites/reorder', { method: 'PUT', body: JSON.stringify({ order }) }),
}

export const settingsApi = {
  get: () => apiFetch('/settings'),
  setFrequency: (frequency) => apiFetch('/settings', { method: 'PUT', body: JSON.stringify({ frequency }) }),
}

export const metaApi = {
  // ICY-Metadaten ({ title, artist }) für eine Stream-URL abrufen.
  get: (url) => apiFetch(`/meta?url=${encodeURIComponent(url)}`),
}

export const pairApi = {
  // Pairing-Token + QR-Daten für die Kopplung mit einem Mobilgerät erzeugen.
  // Antwort: { token, expiresAt, qrData }
  init: () => apiFetch('/pair/init', { method: 'POST' }),
}

