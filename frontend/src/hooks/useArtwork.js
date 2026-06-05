import { useState, useEffect, useMemo, useCallback } from 'react'
import { buildArtworkSources } from '../utils/artwork'

// Verwaltet die Artwork-Fallback-Kette für einen Sender.
// Liefert die aktuelle Bildquelle (oder null → Radio-Icon) und einen
// onError-Handler, der zur nächsten Quelle weiterschaltet.
// Quellen: station.favicon → Google S2 Favicon → null.
export function useArtwork(station) {
  const sources = useMemo(() => buildArtworkSources(station), [station?.favicon, station?.homepage])
  const [index, setIndex] = useState(0)

  // Bei Quellenwechsel zurück zur ersten Quelle.
  useEffect(() => { setIndex(0) }, [sources])

  const onError = useCallback(() => {
    setIndex((i) => i + 1)
  }, [])

  const src = index < sources.length ? sources[index] : null
  return { src, onError }
}
