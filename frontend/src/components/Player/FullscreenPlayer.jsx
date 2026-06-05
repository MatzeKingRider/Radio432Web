import { useEffect, useRef, useState } from 'react'
import { Radio, Play, Pause, X, Volume1, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react' // Volume1 für VolIcon bei niedrigem Pegel
import { usePlayerStore } from '../../store/playerStore'
import { useSettingsStore } from '../../store/settingsStore'
import ThemedBackground from '../common/ThemedBackground'
import VUMeter from './VUMeter'
import SpectrumAnalyzer from './SpectrumAnalyzer'
import { useArtwork } from '../../hooks/useArtwork'

// Vollbild-Player, responsiv: Mobile stapelt vertikal (Portrait, angelehnt an iOS
// NowPlayingScreen), ab md:768px Side-by-Side (Artwork links, Controls rechts).
// Slide-up-Animation beim Öffnen, Schließen via X-Button oder Swipe-Down.
export default function FullscreenPlayer({ open, onClose, onToggle, onPrev, onNext }) {
  const station = usePlayerStore((s) => s.currentStation)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const error = usePlayerStore((s) => s.error)
  const nowPlayingTitle = usePlayerStore((s) => s.nowPlayingTitle)
  const nowPlayingArtist = usePlayerStore((s) => s.nowPlayingArtist)
  const volume = usePlayerStore((s) => s.volume)
  const setVolume = usePlayerStore((s) => s.setVolume)
  const vuStyle = useSettingsStore((s) => s.vuStyle)
  const spectrumStyle = useSettingsStore((s) => s.spectrumStyle)
  const vuColor = useSettingsStore((s) => s.vuColor)
  const spectrumColor = useSettingsStore((s) => s.spectrumColor)

  const [shown, setShown] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef(null)

  const { src: imgSrc, onError: onImgError } = useArtwork(station)

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
  const muted = volume === 0
  function toggleMute() { setVolume(muted ? 0.8 : 0) }

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
        backgroundColor: 'var(--color-background)',
        backgroundImage: 'var(--texture-url)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
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

      <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-center md:gap-8 px-6 md:px-8 py-6 min-h-0 overflow-y-auto">
        {/* Links: Artwork */}
        <div className="flex flex-col items-center shrink-0 mb-6 md:mb-0">
          <div
            className="aspect-square w-[75vw] max-w-[380px] md:w-auto md:h-[min(70vh,600px)] rounded-3xl overflow-hidden flex items-center justify-center"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}
          >
            {imgSrc ? (
              <img
                src={imgSrc}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
                onError={onImgError}
              />
            ) : (
              <Radio size={120} style={{ color: 'var(--color-accent)' }} />
            )}
          </div>
        </div>

        {/* Rechts: Info + Controls */}
        <div className="flex-1 flex flex-col items-center md:items-stretch gap-6 w-full md:min-w-0 md:max-w-[560px]">
          {/* Text */}
          <div className="text-center md:text-left w-full">
            {/* Titel (oder Sendername, falls keine Metadaten) */}
            <div className="text-[22px] font-bold truncate" style={{ color: 'var(--color-text)' }}>
              {nowPlayingTitle || station?.name || 'Kein Sender gewählt'}
            </div>

            {/* Interpret (oder Status, falls keine Metadaten) */}
            <div className="text-[15px] truncate mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {nowPlayingTitle && nowPlayingArtist ? nowPlayingArtist : error ? error : isPlaying ? 'Wiedergabe läuft' : station ? 'Bereit' : '—'}
            </div>

            {/* Sendername (kleiner, nur wenn Metadaten vorhanden) */}
            {nowPlayingTitle && (
              <div className="text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {station?.name}
              </div>
            )}
          </div>

          {/* Sender zurück / Play-Pause / Sender vor */}
          <div className="flex items-center justify-center md:justify-start gap-6 shrink-0">
            <button
              onClick={onPrev}
              disabled={!station}
              aria-label="Vorheriger Sender"
              className="btn-material w-14 h-14 flex items-center justify-center disabled:opacity-40"
            >
              <SkipBack size={22} fill="currentColor" />
            </button>

            <button
              onClick={onToggle}
              disabled={!station}
              aria-label={isPlaying ? 'Pause' : 'Wiedergabe'}
              className="btn-material w-20 h-20 flex items-center justify-center disabled:opacity-40"
            >
              {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={34} fill="currentColor" />}
            </button>

            <button
              onClick={onNext}
              disabled={!station}
              aria-label="Nächster Sender"
              className="btn-material w-14 h-14 flex items-center justify-center disabled:opacity-40"
            >
              <SkipForward size={22} fill="currentColor" />
            </button>
          </div>

          {/* Lautstärke */}
          <div className="flex items-center gap-3 w-full">
            <button
              onClick={toggleMute}
              aria-label={muted ? 'Ton an' : 'Stummschalten'}
              className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
            >
              <VolIcon size={18} />
            </button>
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

          {/* Visualizer: VU-Meter nebeneinander, Spektrum darunter in voller Breite */}
          <div className="flex flex-col gap-2 w-full">
            {/* VU-Meter-Reihe: beide gleich breit */}
            <div className="flex gap-2 h-[80px] sm:h-[100px]">
              <div className="flex-1" style={{ aspectRatio: '4 / 3' }}>
                <VUMeter label="L" style={vuStyle} customColor={vuColor} />
              </div>
              <div className="flex-1" style={{ aspectRatio: '4 / 3' }}>
                <VUMeter label="R" style={vuStyle} customColor={vuColor} />
              </div>
            </div>

            {/* Spektrum-Reihe: volle Breite */}
            <div className="h-[80px] sm:h-[100px] w-full">
              <SpectrumAnalyzer style={spectrumStyle} customColor={spectrumColor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
