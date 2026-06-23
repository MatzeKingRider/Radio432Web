import { useCallback, useState } from 'react'

// Primär der Round-Robin-Host (verteilt automatisch auf alle gerade laufenden
// Server), dann de1 als expliziter Fallback. Frühere feste Liste war keine echte
// Redundanz: de2 zeigt auf dieselbe IP wie de1, nl1 existiert nicht mehr.
const MIRRORS = [
  'https://all.api.radio-browser.info/json',
  'https://de1.api.radio-browser.info/json',
]

const FETCH_TIMEOUT_MS = 8000

async function fetchWithFallback(path) {
  for (const base of MIRRORS) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    try {
      const res = await fetch(`${base}${path}`, { signal: ctrl.signal })
      clearTimeout(timer)
      if (res.ok) return res
    } catch {
      clearTimeout(timer)
      /* Server nicht erreichbar/Timeout — nächsten versuchen */
    }
  }
  throw new Error('RadioBrowser gerade nicht erreichbar — bitte später erneut versuchen.')
}

// Stream-URLs aus der crowdsourced API auf http/https beschränken.
// Verhindert data:, javascript:, file: u. a. Schemata aus Fremddaten.
export function isSafeStreamUrl(url) {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// Sucht Sender über die RadioBrowser-API.
// Liefert ein normalisiertes Stations-Objekt (passend zum Backend-Schema).
export function useRadioBrowser() {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const search = useCallback(async (query) => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithFallback(`/stations/search?name=${encodeURIComponent(q)}&limit=30&hidebroken=true&order=clickcount&reverse=true`)
      if (!res.ok) throw new Error(`RadioBrowser ${res.status}`)
      const data = await res.json()
      const mapped = data
        .map((s) => ({ ...s, _url: s.url_resolved || s.url }))
        .filter((s) => isSafeStreamUrl(s._url))
        .map((s) => ({
          id: s.stationuuid,
          name: s.name?.trim() || 'Unbenannt',
          url: s._url,
          favicon: s.favicon || null,
          homepage: s.homepage || '',
          country: s.country || '',
          codec: s.codec || '',
          bitrate: s.bitrate || 0,
        }))
      setResults(mapped)
    } catch (e) {
      setError(e.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { results, loading, error, search }
}
