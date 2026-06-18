import { useState, useEffect, useMemo, useCallback } from 'react'
import { buildArtworkSources } from '../utils/artwork'

// Verwaltet die Artwork-Fallback-Kette für einen Sender + Track.
// Liefert die aktuelle Bildquelle (oder null → Radio-Icon) und einen
// onError-Handler, der zur nächsten Quelle weiterschaltet.
// Quellen: iTunes Track-Cover (wenn artist+title) → station.favicon → Google S2 Favicon → null.
export function useArtwork(station, artist, title) {
  const stationSources = useMemo(() => buildArtworkSources(station), [station?.favicon, station?.homepage])
  const [trackArtworkUrl, setTrackArtworkUrl] = useState(null)
  const [index, setIndex] = useState(0)

  // iTunes-Lookup wenn artist + title bekannt.
  useEffect(() => {
    if (!artist || !title) {
      setTrackArtworkUrl(null)
      return
    }
    let cancelled = false
    const query = `${artist} ${title}`
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicTrack&media=music&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data.results?.length > 0) {
          const track = data.results[0]
          const url = track.artworkUrl100?.replace('100x100bb', '600x600bb')
          setTrackArtworkUrl(url || null)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [artist, title])

  // Sources zusammenstellen: Track-Cover first, dann Station fallbacks.
  const sources = useMemo(() => {
    const all = []
    if (trackArtworkUrl) all.push(trackArtworkUrl)
    all.push(...stationSources)
    return all
  }, [trackArtworkUrl, stationSources])

  // Bei Senderwechsel zurück zur ersten Quelle.
  // Anhand der Sender-ID (nicht der sources-Referenz), da zwei Sender mit
  // identischem favicon/homepage dieselbe Array-Referenz erzeugen würden
  // und der Reset dann ausbliebe.
  useEffect(() => { setIndex(0) }, [station?.id])

  // Wenn neues Track-Cover verfügbar, auch reset (um es zu versuchen).
  useEffect(() => { if (trackArtworkUrl) setIndex(0) }, [trackArtworkUrl])

  const onError = useCallback(() => {
    setIndex((i) => i + 1)
  }, [])

  const src = index < sources.length ? sources[index] : null
  return { src, onError }
}
