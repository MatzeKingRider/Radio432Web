import { useEffect, useRef, useState } from 'react'
import { Radio, Play, Square, X, Volume1, Volume2, VolumeX } from 'lucide-react'
import { usePlayerStore } from '../../store/playerStore'
import { useSettingsStore } from '../../store/settingsStore'
import ThemedBackground from '../common/ThemedBackground'
import VUMeter from './VUMeter'
import SpectrumAnalyzer from './SpectrumAnalyzer'

// Vollbild-Player im Portrait-Layout (angelehnt an iOS NowPlayingScreen).
// Slide-up-Animation beim Öffnen, Schließen via X-Button oder Swipe-Down.
export default function FullscreenPlayer({ open, onClose, onToggle }) {
  const station = usePlayerStore((s) => s.currentStation)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const error = usePlayerStore((s) => s.error)
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const vuStyle = useSettingsStore((s) => s.vuStyle)
  const spectrumStyle = useSettingsStore((s) => s.spectrumStyle)

  const [shown, setShown] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef(null)

  // Slide-up nach dem Mount auslösen.
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    setDragY(0)
  }, [open])

  if (!open) return null

  const VolIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  function onTouchStart(e) { startYRef.current = e.touches[0].clientY }
  function onTouchMove(e) {
    if (startYRef.current == null) return
    const dy = e.touches[0].clientY - startYRef.current
    if (dy > 0) setDragY(dy)
  }
  function onTouchEnd() {
    if (dragY > 120) onClose()
    else setDragY(0)
    startYRef.current = null
  }

  const translate = shown ? dragY : window.innerHeight

  return (
    <div
      className="fixed inset-0 flex flex-col safe-top safe-bottom"
      style={{
        zIndex: 50,
        transform: `translateY(${translate}px)`,
        transition: startYRef.current == null ? 'transform 0.32s cubic-bezier(0.32,0.72,0,1)' : 'none',
        background: 'var(--color-background)',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <ThemedBackground />

      {/* Schließen */}
      <div className="flex items-center justify-end px-4 pt-3">
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="w-10 h-10 flex items-center justify-center rounded-full"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
        >
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 min-h-0">
        {/* Artwork */}
        <div
          className="aspect-square w-[80vw] max-w-[460px] rounded-3xl overflow-hidden flex items-center justify-center shrink-0"
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
            <Radio size={120} style={{ color: 'var(--color-accent)' }} />
          )}
        </div>

        {/* Text */}
        <div className="text-center w-full">
          <div className="text-[22px] font-bold truncate" style={{ color: 'var(--color-text)' }}>
            {station?.name || 'Kein Sender gewählt'}
          </div>
          <div className="text-[15px] truncate mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {error ? error : isPlaying ? 'Wiedergabe läuft' : station ? 'Bereit' : '—'}
          </div>
        </div>

        {/* Play/Stop */}
        <button
          onClick={onToggle}
          disabled={!station}
          aria-label={isPlaying ? 'Stopp' : 'Wiedergabe'}
          className="btn-material w-20 h-20 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
        >
          {isPlaying ? <Square size={30} fill="currentColor" /> : <Play size={34} fill="currentColor" />}
        </button>

        {/* Lautstärke */}
        <div className="flex items-center gap-3 w-full max-w-[460px]">
          <VolIcon size={20} style={{ color: 'var(--color-text-secondary)' }} />
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
          <Volume2 size={20} style={{ color: 'var(--color-text-secondary)' }} />
        </div>

        {/* Visualizer-Reihe */}
        <div className="flex items-stretch gap-2 w-full max-w-[460px] h-[90px]">
          <div className="h-full" style={{ aspectRatio: '4 / 3' }}>
            <VUMeter label="L" style={vuStyle} />
          </div>
          <div className="flex-1 h-full">
            <SpectrumAnalyzer style={spectrumStyle} />
          </div>
          <div className="h-full" style={{ aspectRatio: '4 / 3' }}>
            <VUMeter label="R" style={vuStyle} />
          </div>
        </div>
      </div>
    </div>
  )
}
