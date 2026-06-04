import { useEffect } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Star } from 'lucide-react'
import { useFavoritesStore } from '../../store/favoritesStore'
import FavoriteItem from './FavoriteItem'
import LoadingSpinner from '../common/LoadingSpinner'

// Sortierbare Favoritenliste. Drag & Drop schreibt mit 500ms Debounce zum Backend.
export default function FavoritesList({ onPlay }) {
  const favorites = useFavoritesStore((s) => s.favorites)
  const loading = useFavoritesStore((s) => s.loading)
  const fetch = useFavoritesStore((s) => s.fetch)
  const remove = useFavoritesStore((s) => s.remove)
  const reorder = useFavoritesStore((s) => s.reorder)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  useEffect(() => { fetch() }, [fetch])

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = favorites.findIndex((f) => f.id === active.id)
    const newIndex = favorites.findIndex((f) => f.id === over.id)
    reorder(arrayMove(favorites, oldIndex, newIndex))
  }

  if (loading) return <LoadingSpinner label="Favoriten werden geladen" />

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-8 text-center">
        <Star size={44} style={{ color: 'var(--color-tabbar-inactive)' }} />
        <div className="text-[16px] font-semibold" style={{ color: 'var(--color-text)' }}>
          Noch keine Favoriten
        </div>
        <div className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
          Suche Sender im Tab „Suche“ und füge sie hinzu.
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={favorites.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        {favorites.map((station) => (
          <FavoriteItem key={station.id} station={station} onPlay={onPlay} onRemove={remove} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
