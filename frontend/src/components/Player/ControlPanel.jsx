import { useRef } from 'react'
import {
  Play, Pause, Square, SkipBack, SkipForward,
  Volume1, Volume2, VolumeX,
} from 'lucide-react'
import { usePlayerStore } from '../../store/playerStore'
import { useSettingsStore } from '../../store/settingsStore'

// Gebündeltes Bedienpanel: Prev, Play/Pause, Next, separater Stop, separater
// Mute + Lautstärke-Slider. Rahmen über .panel-frame, abschaltbar via
// panelFrameEnabled. Buttons nutzen .btn-material (Hover/Fokus aus index.css).
//
// Props:
//   station   aktueller Sender (für disabled-States)
//   isPlaying läuft Wiedergabe?
//   onToggle  Play/Pause-Toggle
//   onStop    Wiedergabe stoppen
//   onPrev / onNext  Sender wechseln
export default function ControlPanel({ station, isPlaying, onToggle, onStop, onPrev, onNext }) {
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const panelFrameEnabled = useSettingsStore((s) => s.panelFrameEnabled)

  // Vorherige Lautstärke für den separaten Mute-Button merken.
  const prevVolRef = useRef(volume > 0 ? volume : 0.8)
  const muted = volume === 0
  const VolIcon = muted ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  function toggleMute() {
    if (muted) {
      setVolume(prevVolRef.current || 0.8)
    } else {
      prevVolRef.current = volume
      setVolume(0)
    }
  }

  return (
    <div
      className={`w-full flex flex-col gap-3 px-4 py-3 ${panelFrameEnabled ? 'panel-frame' : ''}`}
      style={{
        // Dunkler, leicht transparenter Hintergrund + globaler Radius
        // (analog Apple-TV NowPlayingTVView). Der Akzentrahmen kommt bei
        // aktiviertem panelFrameEnabled über .panel-frame dazu.
        background: 'rgba(0, 0, 0, 0.35)',
        borderRadius: 'var(--radius-global, 10px)',
      }}
    >
      {/* Transport-Buttons */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={onPrev}
          disabled={!station}
          aria-label="Vorheriger Sender"
          className="btn-material w-12 h-12 flex items-center justify-center disabled:opacity-40"
        >
          <SkipBack size={20} fill="currentColor" />
        </button>

        <button
          onClick={onToggle}
          disabled={!station}
          aria-label={isPlaying ? 'Pause' : 'Wiedergabe'}
          className="btn-material w-12 h-12 flex items-center justify-center disabled:opacity-40"
          style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
        >
          {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
        </button>

        <button
          onClick={onStop}
          disabled={!station || !isPlaying}
          aria-label="Stopp"
          className="btn-material w-12 h-12 flex items-center justify-center disabled:opacity-40"
        >
          <Square size={20} fill="currentColor" />
        </button>

        <button
          onClick={onNext}
          disabled={!station}
          aria-label="Nächster Sender"
          className="btn-material w-12 h-12 flex items-center justify-center disabled:opacity-40"
        >
          <SkipForward size={20} fill="currentColor" />
        </button>

        <button
          onClick={toggleMute}
          aria-label={muted ? 'Ton an' : 'Stummschalten'}
          aria-pressed={muted}
          className="btn-material w-12 h-12 flex items-center justify-center"
        >
          <VolumeX size={20} style={muted ? { color: 'var(--color-accent)' } : undefined} />
        </button>
      </div>

      {/* Lautstärke */}
      <div className="flex items-center gap-3 w-full">
        <VolIcon size={18} style={{ color: 'var(--color-text-secondary)' }} className="shrink-0" />
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
        <Volume2 size={18} style={{ color: 'var(--color-text-secondary)' }} className="shrink-0" />
      </div>
    </div>
  )
}
