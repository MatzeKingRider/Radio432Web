import { Radio, Play, Square } from 'lucide-react'
import { usePlayerStore } from '../../store/playerStore'

// Kopfbereich des Players: Artwork, Sendername/Status, Play-/Stop-Button.
// Tap auf Artwork + Text (nicht den Button) öffnet den Fullscreen-Player via onExpand.
export default function NowPlaying({ onToggle, onExpand }) {
  const station = usePlayerStore((s) => s.currentStation)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const error = usePlayerStore((s) => s.error)

  return (
    <div className="flex items-center gap-3 px-4 pt-3">
      <button
        type="button"
        onClick={onExpand}
        disabled={!station}
        className="flex items-center gap-3 flex-1 min-w-0 text-left disabled:cursor-default"
        aria-label="Vollbild-Player öffnen"
      >
        <div
          className="aspect-square w-[64px] sm:w-[88px] max-w-[88px] rounded-2xl overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}
        >
          {station?.favicon ? (
            <img
              src={station.favicon}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <Radio size={40} style={{ color: 'var(--color-accent)' }} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[15px] sm:text-[17px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
            {station?.name || 'Kein Sender gewählt'}
          </div>
          <div className="text-[12px] sm:text-[13px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {error ? error : isPlaying ? 'Wiedergabe läuft' : station ? 'Bereit' : 'Wähle einen Favoriten oder suche einen Sender'}
          </div>
        </div>
      </button>

      <button
        onClick={onToggle}
        disabled={!station}
        aria-label={isPlaying ? 'Stopp' : 'Wiedergabe'}
        className="btn-material w-14 h-14 flex items-center justify-center shrink-0 disabled:opacity-40"
      >
        {isPlaying ? <Square size={22} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
      </button>
    </div>
  )
}
