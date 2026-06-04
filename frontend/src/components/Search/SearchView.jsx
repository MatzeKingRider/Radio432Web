import { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import { useRadioBrowser } from '../../hooks/useRadioBrowser'
import StationResult from './StationResult'
import LoadingSpinner from '../common/LoadingSpinner'

// Suchansicht: Eingabefeld + RadioBrowser-Ergebnisse.
export default function SearchView({ onPlay }) {
  const [query, setQuery] = useState('')
  const { results, loading, error, search } = useRadioBrowser()

  function handleSubmit(e) {
    e.preventDefault()
    search(query)
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="p-3 sticky top-0 z-10"
        style={{ background: 'var(--color-background)' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-button"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}>
          <SearchIcon size={18} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sender suchen…"
            className="flex-1 bg-transparent outline-none text-[15px]"
            style={{ color: 'var(--color-text)' }}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
      </form>

      {loading && <LoadingSpinner label="Suche läuft" />}
      {error && (
        <div className="text-center text-[13px] py-6" style={{ color: 'var(--color-text-secondary)' }}>
          Suche fehlgeschlagen: {error}
        </div>
      )}
      {!loading && !error && results.length === 0 && (
        <div className="text-center text-[13px] py-10 px-8" style={{ color: 'var(--color-text-secondary)' }}>
          Gib einen Sendernamen ein und drücke Enter.
        </div>
      )}
      {results.map((station) => (
        <StationResult key={station.id} station={station} onPlay={onPlay} />
      ))}
    </div>
  )
}
