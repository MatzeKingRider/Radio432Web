import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { usePlayerStore } from '../../store/playerStore'
import { useSettingsStore } from '../../store/settingsStore'
import ThemedBackground from '../common/ThemedBackground'
import VUMeter from './VUMeter'
import SpectrumAnalyzer from './SpectrumAnalyzer'
import Display from './Display'
import ControlPanel from './ControlPanel'
import { useArtwork } from '../../hooks/useArtwork'

// Vollbild-Player, responsiv: Mobile stapelt vertikal (Portrait, angelehnt an iOS
// NowPlayingScreen), ab md:768px Side-by-Side (Artwork links, rechte Spalte mit
// Display, VU, Spectrum, Bedienpanel). Slide-up beim Öffnen, Schließen via
// X-Button oder Swipe-Down. Kein Scrollen: Flex + min-h-0 + clamp-Höhen.
export default function FullscreenPlayer({ open, onClose, onToggle, onStop, onPrev, onNext }) {
  const station = usePlayerStore((s) => s.currentStation)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const nowPlayingTitle = usePlayerStore((s) => s.nowPlayingTitle)
  const nowPlayingArtist = usePlayerStore((s) => s.nowPlayingArtist)
  const vuStyle = useSettingsStore((s) => s.vuStyle)
  const spectrumStyle = useSettingsStore((s) => s.spectrumStyle)
  const vuColor = useSettingsStore((s) => s.vuColor)
  const spectrumColor = useSettingsStore((s) => s.spectrumColor)
  const displayStyle = useSettingsStore((s) => s.displayStyle)
  const frequency = useSettingsStore((s) => s.frequency)

  const [shown, setShown] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startYRef = useRef(null)

  // Gemessene Höhe der rechten Spalte (Display+VU+Spektrum+Bedienpanel) und
  // ob das zweispaltige md:-Layout aktiv ist. Damit wird das Cover links
  // genau so hoch wie der rechte Block (analog Apple-TV RightColHeightKey).
  const rightColRef = useRef(null)
  const [rightColHeight, setRightColHeight] = useState(0)
  const [isTwoCol, setIsTwoCol] = useState(false)

  const { src: imgSrc, onError: onImgError } = useArtwork(station, nowPlayingArtist, nowPlayingTitle)

  // Slide-up nach dem Mount auslösen.
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    setDragY(0)
  }, [open])

  // md:-Breakpoint (768px) beobachten — nur dort koppeln wir das Cover an die
  // rechte Spaltenhöhe; im Mobile-Layout bleibt das Cover wie bisher.
  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsTwoCol(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [open])

  // Höhe der rechten Spalte messen und bei Größenänderung aktualisieren.
  useEffect(() => {
    if (!open) return
    const el = rightColRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height ?? el.getBoundingClientRect().height
      setRightColHeight(h)
    })
    ro.observe(el)
    setRightColHeight(el.getBoundingClientRect().height)
    return () => ro.disconnect()
  }, [open, shown])

  if (!open) return null

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

  // Live-Daten fürs Display (nur vorhandene Felder — keine neuen Infos).
  const dispStation = station?.name || ''
  const dispTitle = nowPlayingTitle || station?.name || 'Kein Sender'
  const dispArtist = nowPlayingArtist || ''

  return (
    <div
      className="fixed inset-0 flex flex-col safe-top safe-bottom overflow-hidden"
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
      <div className="flex items-center justify-end px-4 pt-2 shrink-0">
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="btn-material w-10 h-10 flex items-center justify-center rounded-full"
        >
          <X size={22} />
        </button>
      </div>

      {/* Zwei gleich breite, logische Spalten.
          Mobile (Portrait): vertikal gestapelt, Cover oben — unverändert.
          Ab md: zwei Spalten gleicher Höhe (items-stretch). Die rechte Spalte
          bestimmt durch ihren Inhalt die Reihenhöhe; das Cover links wird ein
          Quadrat mit height:100% der Reihe → genau so hoch wie der rechte Block
          (analog Apple-TV NowPlayingTVView). */}
      <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-center px-4 md:px-8 pb-3 min-h-0 gap-3 md:gap-8">
        {/* Linke Spalte: Cover. Mobile zentriert im eigenen Halbbereich; ab md
            wird das quadratische Cover an die gemessene rechte Spaltenhöhe
            gekoppelt (analog Apple-TV), begrenzt durch die linke Halbbreite. */}
        <div className="flex items-center justify-center md:justify-end min-h-0 flex-1 basis-[120px] md:basis-0">
          <div
            className="overflow-hidden flex items-center justify-center panel-frame"
            style={{
              aspectRatio: '1 / 1',
              // Mobile: Cover füllt den oberen Halbbereich (height 100%).
              // Zweispaltig: feste Kantenlänge = gemessene rechte Spaltenhöhe.
              height: isTwoCol && rightColHeight > 0 ? `${rightColHeight}px` : '100%',
              width: 'auto',
              maxWidth: '100%',
              maxHeight: '100%',
              background: 'transparent',
              borderRadius: 'min(var(--radius-global, 10px), 24px)',
            }}
          >
            <img
              src={imgSrc || '/fallback-artwork.png'}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
              onError={onImgError}
            />
          </div>
        </div>

        {/* Rechte Spalte: Block (Display, VU, Spectrum, Bedienpanel). Ab md
            bestimmt dieser Block die gemeinsame Reihenhöhe; gleicher Abstand
            (gap) zwischen allen vier Elementen, gleiche Breite. */}
        <div className="flex items-center justify-center md:justify-start min-h-0 md:flex-1 md:basis-0">
        <div ref={rightColRef} className="flex flex-col items-stretch gap-3 md:gap-5 w-full md:max-w-[520px] min-h-0 md:justify-center">
          {/* Display (ersetzt die alte Text-Darstellung) */}
          <div className="shrink-0">
            <Display
              station={dispStation}
              title={dispTitle}
              artist={dispArtist}
              frequency={frequency}
              style={displayStyle}
            />
          </div>

          {/* VU-Meter-Reihe: beide gleich breit, zusammen = Display-/Spectrum-Breite */}
          <div className="flex gap-2 shrink min-h-0" style={{ height: 'clamp(48px, 14vh, 150px)' }}>
            <div
              className="flex-1 panel-frame overflow-hidden"
              style={{ borderRadius: 'min(var(--radius-global, 10px), clamp(35px, 7vh, 75px))' }}
            >
              <VUMeter label="L" style={vuStyle} customColor={vuColor} />
            </div>
            <div
              className="flex-1 panel-frame overflow-hidden"
              style={{ borderRadius: 'min(var(--radius-global, 10px), clamp(35px, 7vh, 75px))' }}
            >
              <VUMeter label="R" style={vuStyle} customColor={vuColor} />
            </div>
          </div>

          {/* Spectrum: volle Breite */}
          <div
            className="w-full shrink min-h-0 panel-frame overflow-hidden"
            style={{
              height: 'clamp(40px, 12vh, 110px)',
              borderRadius: 'min(var(--radius-global, 10px), clamp(28px, 6vh, 55px))',
            }}
          >
            <SpectrumAnalyzer style={spectrumStyle} customColor={spectrumColor} />
          </div>

          {/* Bedienpanel — direkt unter dem Spektrum, gleicher Abstand wie oben.
              Dunkler, leicht transparenter Hintergrund + globaler Radius
              (analog Apple-TV). */}
          <div className="shrink-0">
            <ControlPanel
              station={station}
              isPlaying={isPlaying}
              onToggle={onToggle}
              onStop={onStop}
              onPrev={onPrev}
              onNext={onNext}
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
