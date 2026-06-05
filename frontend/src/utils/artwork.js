// Cover-Artwork-Fallback-Kette für Sender-Logos.
// 1) station.favicon (RadioBrowser) → 2) Google S2 Favicon (aus Homepage-Domain)
// → 3) null (Aufrufer zeigt dann das Radio-Icon).
// Reihenfolge der zu probierenden Quellen für einen Sender bauen.
export function buildArtworkSources(station) {
  const sources = []
  if (station?.favicon) sources.push(station.favicon)
  const domain = homepageDomain(station?.homepage)
  if (domain) sources.push(`https://www.google.com/s2/favicons?sz=256&domain=${domain}`)
  return sources
}

function homepageDomain(homepage) {
  if (!homepage) return null
  try {
    return new URL(homepage).hostname
  } catch {
    return null
  }
}
