import { Radio, Play, Plus, Check } from 'lucide-react'
import { useFavoritesStore } from '../../store/favoritesStore'
import { useArtwork } from '../../hooks/useArtwork'

// Suchergebnis-Zeile: [44px Logo] [Name/Land] [Play] [Hinzufügen].
export default function StationResult({ station, onPlay }) {
  const favorites = useFavoritesStore((s) => s.favorites)
  const add = useFavoritesStore((s) => s.add)
  const isFav = favorites.some((f) => f.id === station.id)

  const { src: imgSrc, onError: onImgError } = useArtwork(station)

  return (
    <div className="flex items-center gap-3 px-3 py-2.5"
      style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-separator)' }}>
      <button onClick={() => onPlay(station)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-background)', border: '1px solid var(--color-separator)' }}>
          {imgSrc ? (
            <img src={imgSrc} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover"
              onError={onImgError} />
          ) : (
            <Radio size={20} style={{ color: 'var(--color-accent)' }} />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
            {station.name}
          </div>
          <div className="text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {[station.country, station.codec, station.bitrate ? `${station.bitrate} kbps` : '']
              .filter(Boolean).join(' · ')}
          </div>
        </div>
      </button>

      <button onClick={() => onPlay(station)} aria-label="Abspielen" className="p-2 shrink-0"
        style={{ color: 'var(--color-accent)' }}>
        <Play size={22} fill="currentColor" />
      </button>

      <button onClick={() => add(station)} disabled={isFav}
        aria-label={isFav ? 'Bereits Favorit' : 'Zu Favoriten hinzufügen'}
        className="p-2 shrink-0 disabled:opacity-60"
        style={{ color: isFav ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}>
        {isFav ? <Check size={20} /> : <Plus size={22} />}
      </button>
    </div>
  )
}
