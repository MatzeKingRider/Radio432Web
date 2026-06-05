import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { createSimulator, readLevel } from '../../hooks/useVisualizer'

// Analog-Classic VU-Meter auf Canvas — portiert aus iOS VUMeterView.swift.
// Bogen -20..+3 dB, Amber-/Rot-Zone, gedämpfte rote Nadel mit Peak-Hold.

const RED = '#E62313'
const NEEDLE = '#E01409'

// Skalenbereich des VU-Meters in dB und der zugehörige Bogen in Grad.
const DB_MIN = -20
const DB_MAX = 3
const DB_RANGE = DB_MAX - DB_MIN // 23
const ANGLE_MIN = -70
const ANGLE_MAX = 70
const ANGLE_RANGE = ANGLE_MAX - ANGLE_MIN // 140

function dbToAngle(db) {
  // identisch zur iOS-Formel: Bogen -70°..+70°
  return ((db - DB_MIN) / DB_RANGE) * ANGLE_RANGE + ANGLE_MIN
}

export default function VUMeter({ label, style = 'analogClassic', customColor = '' }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const levelRef = useRef(0) // gedämpfter Pegel
  const peakRef = useRef(0)
  const peakTimeRef = useRef(0)
  const simRef = useRef(createSimulator(8))
  const timeBufRef = useRef(null)

  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const analyserNode = usePlayerStore((s) => s.analyserNode)
  const simulatedMode = usePlayerStore((s) => s.simulatedMode)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    function targetLevel() {
      if (!isPlaying) return 0
      if (analyserNode && !simulatedMode) {
        if (!timeBufRef.current) timeBufRef.current = new Uint8Array(analyserNode.fftSize)
        return readLevel(analyserNode, timeBufRef.current)
      }
      // Simulation: ein einzelner pulsender Pegel
      const v = simRef.current()
      const avg = (v[0] + v[1] + v[2] + v[3]) / 4
      return Math.min(1, avg * 1.3 + 0.1)
    }

    function draw() {
      const accent = resolveAccent(customColor)
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      // Pegel mit Trägheit annähern: schnelles Attack, langsamer Abfall.
      const t = targetLevel()
      const speed = t > levelRef.current ? 0.45 : 0.15
      levelRef.current += (t - levelRef.current) * speed

      const now = performance.now()
      if (levelRef.current >= peakRef.current) {
        peakRef.current = levelRef.current
        peakTimeRef.current = now
      } else if (now - peakTimeRef.current > 500) {
        peakRef.current = Math.max(0, peakRef.current - 0.01)
      }

      ctx.clearRect(0, 0, w, h)

      // Hintergrund (stil-abhängig)
      roundRect(ctx, 0, 0, w, h, 9)
      ctx.fillStyle = bgColor(style)
      ctx.fill()

      if (style === 'classic') {
        drawBarStyle(ctx, w, h, levelRef.current, label, accent)
      } else if (style === 'carbonPro') {
        drawCarbonProStyle(ctx, w, h, levelRef.current)
      } else {
        drawArcStyle(ctx, w, h, levelRef.current, label, style, accent)
      }

      // Akzent-Rahmen
      roundRect(ctx, 0.9, 0.9, w - 1.8, h - 1.8, 9)
      ctx.lineWidth = 1.8
      ctx.strokeStyle = accent
      ctx.stroke()

      if (isPlaying || levelRef.current > 0.001 || peakRef.current > 0.001) {
        rafRef.current = requestAnimationFrame(draw)
      } else {
        rafRef.current = 0
      }
    }

    // Bei Größenänderung im Ruhezustand statischen Rahmen neu zeichnen.
    function redrawStatic() {
      resize()
      if (!usePlayerStore.getState().isPlaying) draw()
    }
    window.addEventListener('resize', redrawStatic)

    cancelAnimationFrame(rafRef.current)
    // Zwei gestaffelte Frames: erst nach Layout hat das Canvas seine Endgröße.
    requestAnimationFrame(() => { resize(); draw() })

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('resize', redrawStatic)
    }
  }, [isPlaying, analyserNode, simulatedMode, label, style, customColor])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ aspectRatio: '4 / 3' }}
    />
  )
}

function resolveAccent(customColor) {
  if (customColor && customColor !== '') return customColor
  return getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#C9A84C'
}

// Hintergrundfarbe je nach Stil.
function bgColor(style) {
  if (style === 'vintageBroadcast') return '#0A120A'
  if (style === 'steelMirror') return '#1A1A1A'
  if (style === 'plasma') return '#020203'
  if (style === 'carbonPro') return '#070707'
  return '#0A0A0A'
}

// Bogen-Darstellung (analogClassic, modernDark, neonArc, studioUltra,
// vintageBroadcast, plasma, steelMirror).
function drawArcStyle(ctx, w, h, level, label, style, accent) {
  const studio = style === 'studioUltra'
  const minimal = style === 'modernDark' || studio
  const neon = style === 'neonArc'
  const vintage = style === 'vintageBroadcast'
  const plasma = style === 'plasma'
  const steel = style === 'steelMirror'

  // dB-Wert des aktuellen Pegels (für Studio-Anzeige).
  const dbVal = level > 0 ? 20 * Math.log10(level) : -60

  if (!minimal) {
    // Accent-basierter Glow (theme-aware) — vorher amber-fest.
    const glow = ctx.createRadialGradient(w / 2, h * 1.05, 10, w / 2, h * 1.05, 140)
    glow.addColorStop(0, accent + '55')
    glow.addColorStop(0.5, accent + '18')
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    roundRect(ctx, 0, 0, w, h, 9)
    ctx.fillStyle = glow
    ctx.fill()
  }

  const cx = w / 2
  const R = Math.min(w * 0.48, h * 0.86) * 0.84
  const cy = h * 0.5 + R * 0.5

  ctx.save()
  if (neon) {
    ctx.shadowBlur = 12
    ctx.shadowColor = accent
  }

  let needleColor = NEEDLE
  let labelColor = 'rgba(224,158,36,0.6)'

  if (plasma) {
    // Hintergrund-Spur + heißer Gradient-Bogen accent -> weiß.
    drawZone(ctx, cx, cy, R, -20, 3, 'rgba(255,255,255,0.05)')
    const litDb = Math.max(-20, Math.min(3, dbVal))
    drawZoneGradient(ctx, cx, cy, R, -20, litDb, accent, '#FFFFFF')
    drawTicks(ctx, cx, cy, R, 'plasma', accent)
    needleColor = '#FFFFFF'
    labelColor = 'rgba(255,255,255,0.5)'
  } else if (vintage) {
    // Grün / Gelb / Rot-Zonen.
    drawZone(ctx, cx, cy, R, -20, -3, 'rgba(30,180,30,0.8)')
    drawZone(ctx, cx, cy, R, -3, 0, 'rgba(220,180,20,0.85)')
    drawZone(ctx, cx, cy, R, 0, 3, 'rgba(220,40,20,0.9)')
    drawTicks(ctx, cx, cy, R, 'vintageBroadcast', accent)
    needleColor = '#EEEEEE'
    labelColor = 'rgba(60,200,60,0.85)'
  } else if (steel) {
    // Chrome-Silber-Zonen + Hellrot bei Übersteuerung.
    drawZone(ctx, cx, cy, R, -20, 0, 'rgba(180,185,195,0.7)')
    drawZone(ctx, cx, cy, R, 0, 3, 'rgba(255,90,80,0.85)')
    drawTicks(ctx, cx, cy, R, 'steelMirror', accent)
    needleColor = '#E8EDF2'
    labelColor = 'rgba(210,215,225,0.7)'
  } else if (minimal) {
    // gedämpfter Gradient-Bogen dunkel -> accent
    drawZone(ctx, cx, cy, R, -20, 3, 'rgba(255,255,255,0.06)')
    drawZone(ctx, cx, cy, R, -20, Math.max(-20, 20 * Math.log10(Math.max(level, 1e-3))), accent)
    // modernDark: feine Ticks ohne Labels; studioUltra: Ticks + Labels.
    drawTicks(ctx, cx, cy, R, studio ? 'studioUltra' : 'modernDark', accent)
    needleColor = NEEDLE
    labelColor = 'rgba(255,255,255,0.4)'
  } else {
    // Zonen-Bögen (analogClassic, neonArc)
    drawZone(ctx, cx, cy, R, -20, 0, neon ? accent : 'rgba(224,158,36,0.75)')
    drawZone(ctx, cx, cy, R, 0, 3, 'rgba(230,35,19,0.88)')
    drawTicks(ctx, cx, cy, R, style, accent)
  }

  // Innere Skala (0–100)
  drawInnerScale(ctx, cx, cy, R, style)

  // Nadel
  const clamped = Math.max(DB_MIN, Math.min(DB_MAX, dbVal))
  drawNeedle(ctx, cx, cy, R, dbToAngle(clamped), needleColor)

  ctx.restore()

  // Studio: digitale dB-Anzeige rechts unten.
  if (studio) {
    ctx.fillStyle = accent
    ctx.font = `${Math.max(6, R * 0.12)}px ui-monospace, monospace`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${Math.max(-60, dbVal).toFixed(1)} dB`, w - 5, h - 4)
  }

  // Kanal-Label
  ctx.fillStyle = labelColor
  ctx.font = `600 ${Math.max(8, R * 0.22)}px ui-rounded, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy - R * 0.2)
}

// Gradient-Zonenbogen von Farbe A (innen/Anfang) nach B (außen/Ende).
function drawZoneGradient(ctx, cx, cy, R, dbA, dbB, colorA, colorB) {
  if (dbB <= dbA) return
  const aS = ((dbToAngle(dbA) - 90) * Math.PI) / 180
  const aE = ((dbToAngle(dbB) - 90) * Math.PI) / 180
  const grad = ctx.createLinearGradient(
    cx + R * Math.cos(aS), cy + R * Math.sin(aS),
    cx + R * Math.cos(aE), cy + R * Math.sin(aE),
  )
  grad.addColorStop(0, colorA)
  grad.addColorStop(1, colorB)
  ctx.beginPath()
  ctx.arc(cx, cy, R, aS, aE, false)
  ctx.arc(cx, cy, R * 0.905, aE, aS, true)
  ctx.closePath()
  ctx.fillStyle = grad
  ctx.fill()
}

// Carbon-Pro: Balken-Stil mit Graustufen-Gradient, Carbon-Raster, LED-Punkt.
function drawCarbonProStyle(ctx, w, h, level) {
  // Carbon-Textur: feine dunkle Rasterlinien.
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  for (let x = 0; x < w; x += 5) line(ctx, x, 0, x, h, 'rgba(255,255,255,0.04)', 1)
  for (let y = 0; y < h; y += 5) line(ctx, 0, y, w, y, 'rgba(255,255,255,0.04)', 1)
  ctx.restore()

  const padX = w * 0.22
  const padY = h * 0.18
  const barW = w - padX * 2
  const innerH = h - padY * 2
  const lvl = Math.max(0, Math.min(1, level))

  // Track
  roundRect(ctx, padX, padY, barW, innerH, 4)
  ctx.fillStyle = '#141414'
  ctx.fill()

  // Pegel mit Graustufen-Gradient (dunkel unten -> hell oben)
  const fillH = innerH * lvl
  const grad = ctx.createLinearGradient(0, padY + innerH, 0, padY)
  grad.addColorStop(0, '#3A3A3A')
  grad.addColorStop(1, '#D8D8D8')
  roundRect(ctx, padX, padY + innerH - fillH, barW, fillH, 4)
  ctx.fillStyle = grad
  ctx.fill()

  // LED-Punkt oben: leuchtet bei Level > 0.8.
  const hot = lvl > 0.8
  ctx.beginPath()
  ctx.arc(w / 2, padY * 0.55, Math.max(2.5, w * 0.04), 0, Math.PI * 2)
  ctx.fillStyle = hot ? '#FF3322' : '#3A1010'
  if (hot) { ctx.shadowBlur = 8; ctx.shadowColor = '#FF3322' }
  ctx.fill()
  ctx.shadowBlur = 0
}

// Einfache Balken-Darstellung (classic) — Balken wächst von unten, Farbe = accent.
function drawBarStyle(ctx, w, h, level, label, accent) {
  const cx = w / 2
  const R = Math.min(w * 0.48, h * 0.86) * 0.84
  const cy = h * 0.5 + R * 0.5

  // Innere Skala (0–100)
  drawInnerScale(ctx, cx, cy, R, 'classic')

  const padX = w * 0.22
  const padY = h * 0.14
  const barW = w - padX * 2
  const innerH = h - padY * 2
  const lvl = Math.max(0, Math.min(1, level))

  // Track
  roundRect(ctx, padX, padY, barW, innerH, 4)
  ctx.fillStyle = '#1C1C1C'
  ctx.fill()

  // Pegel
  const fillH = innerH * lvl
  roundRect(ctx, padX, padY + innerH - fillH, barW, fillH, 4)
  ctx.fillStyle = accent
  ctx.fill()

  // Kanal-Label
  ctx.fillStyle = accent
  ctx.font = `600 ${w * 0.13}px ui-rounded, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, w / 2, padY * 0.6)
}

function drawZone(ctx, cx, cy, R, dbA, dbB, color) {
  const aS = ((dbToAngle(dbA) - 90) * Math.PI) / 180
  const aE = ((dbToAngle(dbB) - 90) * Math.PI) / 180
  ctx.beginPath()
  ctx.arc(cx, cy, R, aS, aE, false)
  ctx.arc(cx, cy, R * 0.905, aE, aS, true)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

// Innere Skala: 0–100 prozentual, linear entsprechend dB (-20 dB = 0 %, 0 dB = 100 %)
function linearToAngle(v) {
  return dbToAngle(-20) + (v / 100.0) * (dbToAngle(0) - dbToAngle(-20))
}

function drawInnerScale(ctx, cx, cy, R, style) {
  const tickColor = style === 'vintageBroadcast'
    ? 'rgba(80,200,80,0.7)'
    : style === 'steelMirror'
      ? 'rgba(200,200,200,0.7)'
      : 'rgba(224,158,36,0.7)'

  // Ticks alle 10, Labels nur bei 0, 50, 100
  for (let v = 0; v <= 100.0001; v += 10) {
    const rad = ((linearToAngle(v) - 90) * Math.PI) / 180
    const outer = R * 0.58
    const inner = R * 0.50
    line(ctx, cx + outer * Math.cos(rad), cy + outer * Math.sin(rad),
      cx + inner * Math.cos(rad), cy + inner * Math.sin(rad),
      tickColor, 0.9)

    // Label nur bei 0, 50, 100 (weniger Clutter)
    if ([0, 50, 100].includes(v)) {
      const lx = cx + R * 0.38 * Math.cos(rad)
      const ly = cy + R * 0.38 * Math.sin(rad)
      ctx.fillStyle = tickColor
      ctx.font = `${Math.max(5, R * 0.09)}px ui-monospace, monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${Math.round(v)}`, lx, ly)
    }
  }
}

// Stil-abhängige Tick-Palette. showLabels steuert dB-Zahlenwerte.
function tickPalette(style, accent) {
  switch (style) {
    case 'modernDark':
      return { fine: 'rgba(255,255,255,0.2)', fineRed: 'rgba(255,255,255,0.2)',
        major: 'rgba(255,255,255,0.4)', majorRed: 'rgba(255,255,255,0.4)',
        label: 'rgba(255,255,255,0.45)', labelRed: 'rgba(255,255,255,0.45)', showLabels: false }
    case 'studioUltra':
      return { fine: 'rgba(255,255,255,0.35)', fineRed: 'rgba(255,255,255,0.35)',
        major: 'rgba(255,255,255,0.7)', majorRed: 'rgba(255,255,255,0.7)',
        label: 'rgba(255,255,255,0.7)', labelRed: 'rgba(255,255,255,0.7)', showLabels: true }
    case 'vintageBroadcast':
      return { fine: 'rgba(60,200,60,0.5)', fineRed: 'rgba(220,40,20,0.55)',
        major: 'rgba(60,200,60,0.9)', majorRed: 'rgba(220,40,20,0.9)',
        label: 'rgba(80,220,80,0.9)', labelRed: 'rgba(230,60,40,0.9)', showLabels: true }
    case 'steelMirror':
      return { fine: 'rgba(210,215,225,0.45)', fineRed: 'rgba(255,120,110,0.5)',
        major: 'rgba(225,230,240,0.85)', majorRed: 'rgba(255,120,110,0.85)',
        label: 'rgba(225,230,240,0.8)', labelRed: 'rgba(255,130,120,0.85)', showLabels: true }
    case 'plasma':
      return { fine: accent + '99', fineRed: 'rgba(255,255,255,0.5)',
        major: accent + 'DD', majorRed: 'rgba(255,255,255,0.85)',
        label: accent + 'CC', labelRed: 'rgba(255,255,255,0.8)', showLabels: true }
    default: // analogClassic, neonArc
      return { fine: 'rgba(224,158,36,0.62)', fineRed: 'rgba(230,35,19,0.62)',
        major: 'rgba(224,158,36,0.98)', majorRed: 'rgba(230,35,19,0.98)',
        label: 'rgba(224,158,36,0.92)', labelRed: 'rgba(230,35,19,0.92)', showLabels: true }
  }
}

function drawTicks(ctx, cx, cy, R, style = 'analogClassic', accent) {
  const p = tickPalette(style, accent)
  const majors = [
    [-20, '-20', false], [-10, '-10', false], [-5, '-5', false],
    [0, '0', true], [3, '+3', true],
  ]
  // Fine ticks — nach AUSSEN (R → R*1.06)
  for (let f = -20; f <= 3.0001; f += 0.5) {
    const db = Math.round(f * 10) / 10
    if (majors.some((m) => m[0] === db)) continue
    const rad = ((dbToAngle(db) - 90) * Math.PI) / 180
    const isRed = db > 0
    line(ctx, cx + R * Math.cos(rad), cy + R * Math.sin(rad),
      cx + R * 1.06 * Math.cos(rad), cy + R * 1.06 * Math.sin(rad),
      isRed ? p.fineRed : p.fine, 0.6)
  }
  // Mid ticks (Zwischenmarken) — nach AUSSEN (R → R*1.09)
  const midTicks = [-15, -7, -3, 1]
  for (const db of midTicks) {
    const rad = ((dbToAngle(db) - 90) * Math.PI) / 180
    const isRed = db > 0
    line(ctx, cx + R * Math.cos(rad), cy + R * Math.sin(rad),
      cx + R * 1.09 * Math.cos(rad), cy + R * 1.09 * Math.sin(rad),
      isRed ? p.majorRed : p.major, 0.9)
  }
  // Major ticks — nach AUSSEN (R → R*1.13)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const [db, lbl, red] of majors) {
    const rad = ((dbToAngle(db) - 90) * Math.PI) / 180
    line(ctx, cx + R * Math.cos(rad), cy + R * Math.sin(rad),
      cx + R * 1.13 * Math.cos(rad), cy + R * 1.13 * Math.sin(rad),
      red ? p.majorRed : p.major, 1.5)
    if (p.showLabels) {
      const lx = cx + R * 1.19 * Math.cos(rad)
      const ly = cy + R * 1.19 * Math.sin(rad)
      ctx.fillStyle = red ? p.labelRed : p.label
      ctx.font = `${Math.max(6, R * 0.12)}px ui-monospace, monospace`
      ctx.fillText(lbl, lx, ly)
    }
  }
}

function drawNeedle(ctx, cx, cy, R, angleDeg, color = NEEDLE) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  const len = R * 0.87
  const tx = cx + len * Math.cos(rad)
  const ty = cy + len * Math.sin(rad)
  // Schatten
  line(ctx, cx + 0.6, cy + 0.6, tx + 0.6, ty + 0.6, 'rgba(0,0,0,0.5)', 1.1)
  // Nadel (filigran)
  line(ctx, cx, cy, tx, ty, color, 1.2)
  // Drehpunkt detailliert
  drawPivot(ctx, cx, cy, R)
}

function drawPivot(ctx, cx, cy, R) {
  const pivR = R * 0.062   // äußerer Ring (Schatten)
  const pivB = R * 0.048   // Körper
  const axR = pivB * 0.48  // Achse (center)
  const hlR = axR * 0.45   // Highlight

  // 1. Schatten-Ring (offset +1px): R * 0.062, schwarz
  ctx.beginPath()
  ctx.arc(cx + 1, cy + 1, pivR, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fill()

  // 2. Äußerer Ring: R * 0.062, schwarz
  ctx.beginPath()
  ctx.arc(cx, cy, pivR, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.fill()

  // 3. Körper: R * 0.048, Accent-Farbe (Amber für analogClassic, sonst neutral)
  ctx.beginPath()
  ctx.arc(cx, cy, pivB, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(165,165,165,1)'  // Grauton
  ctx.fill()

  // 4. Achse: R * 0.048 * 0.48, schwarz
  ctx.beginPath()
  ctx.arc(cx, cy, axR, 0, Math.PI * 2)
  ctx.fillStyle = '#000000'
  ctx.fill()

  // 5. Highlight: klein, weiß, oben-links bei (-pivB*0.35, -pivB*0.35)
  const hlx = cx - pivB * 0.35
  const hly = cy - pivB * 0.35
  ctx.beginPath()
  ctx.arc(hlx, hly, hlR, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fill()
}

function drawCornerMarkers(ctx, cx, cy, R, accent) {
  // − Marker links oben bei -20 dB (start), + Marker rechts oben bei +3 dB (end)
  const fontSize = Math.max(7, R * 0.16)
  ctx.fillStyle = 'rgba(224,158,36,0.92)'  // Amber für −
  ctx.font = `${fontSize}px ui-monospace, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // − Marker (links oben, -20 dB)
  const radMin = ((dbToAngle(-20) - 90) * Math.PI) / 180
  const lx = cx + R * 1.25 * Math.cos(radMin)
  const ly = cy + R * 1.25 * Math.sin(radMin)
  ctx.fillText('−', lx, ly)

  // + Marker (rechts oben, +3 dB)
  ctx.fillStyle = 'rgba(230,35,19,0.92)'  // Rot für +
  const radMax = ((dbToAngle(3) - 90) * Math.PI) / 180
  const rx = cx + R * 1.25 * Math.cos(radMax)
  const ry = cy + R * 1.25 * Math.sin(radMax)
  ctx.fillText('+', rx, ry)
}

function line(ctx, x1, y1, x2, y2, color, width) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.stroke()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
