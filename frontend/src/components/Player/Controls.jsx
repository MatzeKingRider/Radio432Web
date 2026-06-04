import { Volume1, Volume2, VolumeX } from 'lucide-react'
import { usePlayerStore } from '../../store/playerStore'

// Lautstärkeregler unter den Visualizern.
export default function Controls() {
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)

  const Icon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Icon size={18} style={{ color: 'var(--color-text-secondary)' }} />
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={volume}
        onChange={(e) => setVolume(parseFloat(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          accentColor: 'var(--color-accent)',
          background: `linear-gradient(to right, var(--color-accent) ${volume * 100}%, var(--color-tabbar-inactive) ${volume * 100}%)`,
        }}
        aria-label="Lautstärke"
      />
    </div>
  )
}
