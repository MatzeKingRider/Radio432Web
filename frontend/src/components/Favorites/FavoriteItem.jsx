import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Radio, Play, Square, Trash2, GripVertical } from 'lucide-react'
import { usePlayerStore } from '../../store/playerStore'

// Eine Favoriten-Zeile: [Drag] [44px Logo] [Name/Host] [Play] [Löschen].
export default function FavoriteItem({ station, onPlay, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: station.id })

  const currentId = usePlayerStore((s) => s.currentStation?.id)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const isCurrent = currentId === station.id

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    background: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-separator)',
  }

  let host = ''
  try { host = new URL(station.url).hostname } catch { host = station.url }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-3 py-2.5">
      <button
        {...attributes}
        {...listeners}
        className="touch-none p-1 cursor-grab active:cursor-grabbing"
        style={{ color: 'var(--color-tabbar-inactive)' }}
        aria-label="Verschieben"
      >
        <GripVertical size={18} />
      </button>

      <button onClick={() => onPlay(station)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div
          className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-background)', border: '1px solid var(--color-separator)' }}
        >
          {station.favicon ? (
            <img src={station.favicon} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none' }} />
          ) : (
            <Radio size={20} style={{ color: 'var(--color-accent)' }} />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-[15px] font-semibold truncate" style={{ color: 'var(--color-text)' }}>
            {station.name}
          </div>
          <div className="text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {host}
          </div>
        </div>
      </button>

      <button onClick={() => onPlay(station)} aria-label="Abspielen" className="p-2 shrink-0"
        style={{ color: 'var(--color-accent)' }}>
        {isCurrent && isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
      </button>

      <button onClick={() => onRemove(station.id)} aria-label="Löschen" className="p-2 shrink-0"
        style={{ color: 'var(--color-text-secondary)' }}>
        <Trash2 size={18} />
      </button>
    </div>
  )
}
