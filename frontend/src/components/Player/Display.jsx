import { useEffect, useRef, useLayoutEffect } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import './Display.css'

// ---------------------------------------------------------------------------
// Radio432 Display — drei Zeilen (Sender/Titel/Interpret) + Frequenz-Label,
// 10 Stile, Marquee pro Zeile (konstante Geschwindigkeit), Tuner-Messgerät
// mit wandernder Nadel, Titelwechsel-Animation. 1:1 portiert aus
// mockups/display-mockups.html. Akzentfarbe via var(--color-accent),
// Rahmenradius via var(--radius-global).
//
// Props:
//   station        Sendername
//   title          Titel
//   artist         Interpret
//   frequency      Zahl (Hz), z.B. 432  — steuert Tuner-Nadel/Readout
//   frequencyLabel optionaler Anzeigetext fürs r-freq-Label (Default "<freq> Hz")
//   style          einer von: vfd|amber|lcd|oled|nixie|dot|chrome|tuner|cassette|term
// ---------------------------------------------------------------------------

const SPEED = 90 // px/s — gemeinsame Geschwindigkeit für Laufschrift UND Titelwechsel

// Tuner-Skala (1:1 aus Mockup)
const FREQS = [396, 417, 432, 440, 444, 528, 639, 741, 852, 963]
const LABELS = [400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950]
const SMIN = 390
const SMAX = 970

function needlePct(freq) {
  return ((freq - SMIN) / (SMAX - SMIN)) * 100
}

const STYLE_CLASS = {
  vfd: 'vfd',
  amber: 'amber',
  lcd: 'lcd tinted',
  oled: 'oled',
  nixie: 'nixie',
  dot: 'dot',
  chrome: 'chrome',
  tuner: 'tuner',
  cassette: 'cassette',
  term: 'term',
}

export default function Display({
  station = 'RADIO PARADISE',
  title = 'Bohemian Rhapsody',
  artist = 'Queen',
  frequency = 432,
  frequencyLabel,
  style = 'vfd',
}) {
  const stationRowRef = useRef(null)
  const titleRowRef = useRef(null)
  const artistRowRef = useRef(null)
  const isBuffering = usePlayerStore((s) => s.isBuffering)
  // letzte angezeigte Werte (für Wechsel-Erkennung)
  const prev = useRef({ station, title, artist })
  const isFirst = useRef(true)

  const cls = STYLE_CLASS[style] || 'vfd'
  const isTuner = style === 'tuner'
  const isTerm = style === 'term'
  const freqText = frequencyLabel ?? `${frequency} Hz`
  const freqDisplay = isTerm ? `FREQ: ${freqText}` : freqText

  // --- Marquee pro Zeile: nur scrollen, wenn Text breiter als Container ---
  function marqueeRow(row) {
    if (!row) return
    row.classList.remove('scroll')
    const inner = row.querySelector('.inner')
    if (!inner) return
    if (inner.scrollWidth > row.clientWidth + 1) {
      row.classList.add('scroll')
      inner.style.animationDuration = ((inner.scrollWidth / 2) / SPEED).toFixed(2) + 's'
    } else {
      inner.style.animationDuration = ''
    }
  }

  function applyMarqueeAll() {
    ;[stationRowRef.current, titleRowRef.current, artistRowRef.current].forEach(marqueeRow)
  }

  // Setzt Text + data-text einer Zeile
  function setRow(row, text) {
    if (!row) return
    const inner = row.querySelector('.inner')
    if (inner) {
      inner.textContent = text
      inner.setAttribute('data-text', text)
    }
  }

  // --- Titelwechsel-Animation (1:1 aus Mockup swapTrack) ---
  function swapRows(rows, next, keepStation) {
    // RAUS nach links — lineare Bewegung mit SPEED
    let maxOut = 0
    rows.forEach((row) => {
      if (!row) return
      row.classList.remove('scroll')
      const inner = row.querySelector('.inner')
      inner.style.animation = 'none'
      const dist = Math.max(inner.offsetWidth, row.clientWidth) + 24
      const dur = dist / SPEED
      maxOut = Math.max(maxOut, dur)
      inner.style.transition = `transform ${dur.toFixed(2)}s linear`
      inner.style.transform = `translateX(-${dist}px)`
    })

    setTimeout(() => {
      // Text tauschen
      if (!keepStation) setRow(stationRowRef.current, next.station)
      setRow(titleRowRef.current, next.title)
      setRow(artistRowRef.current, next.artist)

      // REIN von rechts — gleiche SPEED
      const fresh = rows
      fresh.forEach((row) => {
        if (!row) return
        const inner = row.querySelector('.inner')
        const dist = row.clientWidth + 24
        inner.style.transition = 'none'
        inner.style.transform = `translateX(${dist}px)`
      })
      // Reflow erzwingen
      void document.body.offsetWidth
      let maxIn = 0
      fresh.forEach((row) => {
        if (!row) return
        const inner = row.querySelector('.inner')
        const dist = row.clientWidth + 24
        const dur = dist / SPEED
        maxIn = Math.max(maxIn, dur)
        inner.style.transition = `transform ${dur.toFixed(2)}s linear`
        inner.style.transform = 'translateX(0)'
      })
      setTimeout(() => {
        fresh.forEach((row) => {
          if (!row) return
          const inner = row.querySelector('.inner')
          inner.style.transition = ''
          inner.style.transform = ''
          inner.style.animation = ''
          marqueeRow(row)
        })
      }, maxIn * 1000 + 40)
    }, maxOut * 1000 + 20)
  }

  // Initiales Setzen + Marquee-Messung (auch nach Font-Load und Style-Wechsel)
  useLayoutEffect(() => {
    setRow(stationRowRef.current, station)
    setRow(titleRowRef.current, title)
    setRow(artistRowRef.current, artist)
    applyMarqueeAll()
    requestAnimationFrame(applyMarqueeAll)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(applyMarqueeAll)
    }
    prev.current = { station, title, artist }
    isFirst.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style])

  // Bei Daten-Änderung: Animation, sofern nicht der erste Render/Style-Wechsel
  useEffect(() => {
    if (isFirst.current) return
    const p = prev.current
    const changed = p.station !== station || p.title !== title || p.artist !== artist
    if (!changed) return
    const keepStation = p.station === station
    const rows = keepStation
      ? [titleRowRef.current, artistRowRef.current]
      : [stationRowRef.current, titleRowRef.current, artistRowRef.current]
    swapRows(rows, { station, title, artist }, keepStation)
    prev.current = { station, title, artist }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station, title, artist])

  // Resize → Marquee neu messen
  useEffect(() => {
    window.addEventListener('resize', applyMarqueeAll)
    return () => window.removeEventListener('resize', applyMarqueeAll)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Tuner-Skala (statische Ticks/Labels einmal aufgebaut, Nadel via inline left)
  const tunerTicks = []
  if (isTuner) {
    for (let hz = SMIN; hz <= SMAX; hz += 10) {
      tunerTicks.push(<span key={`t${hz}`} className="tk" style={{ left: needlePct(hz) + '%' }} />)
    }
    LABELS.forEach((hz) => {
      const p = needlePct(hz)
      tunerTicks.push(<span key={`m${hz}`} className="tk maj" style={{ left: p + '%' }} />)
      tunerTicks.push(<span key={`l${hz}`} className="tlab" style={{ left: p + '%' }}>{hz}</span>)
    })
    FREQS.forEach((hz) => {
      tunerTicks.push(<span key={`f${hz}`} className="tk mid" style={{ left: needlePct(hz) + '%' }} />)
    })
  }

  return (
    <div className={`r432-display ${cls}`} data-style={style}>
      {isBuffering && (
        <div className="r-buffer" aria-live="polite">
          <span className="r-buffer-dot" />BUFFERING…
        </div>
      )}
      <div className="row r-station" ref={stationRowRef}>
        <span className="inner" data-text={station}>{station}</span>
      </div>
      <div className="row r-title" ref={titleRowRef}>
        <span className="inner" data-text={title}>{title}</span>
      </div>
      <div className="row r-artist" ref={artistRowRef}>
        <span className="inner" data-text={artist}>{artist}</span>
      </div>

      {isTuner && (
        <div className="gauge">
          <div className="readout">
            {frequency.toFixed ? frequency.toFixed(1) : frequency}
            <span className="u">Hz</span>
          </div>
          <div className="scale">
            <div className="tickline" />
            {tunerTicks}
            <span className="needle" style={{ left: needlePct(frequency) + '%' }} />
          </div>
        </div>
      )}

      {style === 'cassette' && (
        <div className="reels"><div className="reel" /><div className="reel" /></div>
      )}

      <div className="r-freq">{freqDisplay}</div>
    </div>
  )
}
