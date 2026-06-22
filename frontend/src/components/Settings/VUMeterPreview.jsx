import { useEffect, useRef } from 'react'

// Statische Einzelbild-Vorschau eines VU-Stils bei Pegel 0.65 (65 %).
// Reine Render-Logik, kein Store-Zugriff, kein Animations-Loop.

const NEEDLE = '#E01409'

const DB_MIN = -20
const DB_MAX = 3
const DB_RANGE = DB_MAX - DB_MIN
const ANGLE_MIN = -70
const ANGLE_MAX = 70
const ANGLE_RANGE = ANGLE_MAX - ANGLE_MIN

function dbToAngle(db) {
  return ((db - DB_MIN) / DB_RANGE) * ANGLE_RANGE + ANGLE_MIN
}

function linearToAngle(v) {
  return dbToAngle(-20) + (v / 100.0) * (dbToAngle(0) - dbToAngle(-20))
}

function resolveAccent(customColor) {
  if (customColor && customColor !== '') return customColor
  return getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#C9A84C'
}

export default function VUMeterPreview({ style = 'analogClassic', customColor = '' }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0) return
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawPreviewFrame(ctx, rect.width, rect.height, 0.65, style, resolveAccent(customColor))
  }, [style, customColor])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '40px', display: 'block', borderRadius: 6 }} />
}

function drawPreviewFrame(ctx, w, h, level, style, accent) {
  ctx.clearRect(0, 0, w, h)
  roundRect(ctx, 0, 0, w, h, 9)
  ctx.fillStyle = bgColor(style)
  ctx.fill()

  if (style === 'classic') {
    drawBarStyle(ctx, w, h, level, accent)
  } else if (style === 'carbonPro') {
    drawCarbonProStyle(ctx, w, h, level)
  } else {
    drawArcStyle(ctx, w, h, level, style, accent)
  }

  roundRect(ctx, 0.9, 0.9, w - 1.8, h - 1.8, 9)
  ctx.lineWidth = 1.4
  ctx.strokeStyle = accent
  ctx.stroke()
}

function bgColor(style) {
  if (style === 'vintageBroadcast') return '#0A120A'
  if (style === 'steelMirror') return '#1A1A1A'
  if (style === 'plasma') return '#020203'
  if (style === 'carbonPro') return '#070707'
  return '#0A0A0A'
}

function drawArcStyle(ctx, w, h, level, style, accent) {
  const studio = style === 'studioUltra'
  const minimal = style === 'modernDark' || studio
  const neon = style === 'neonArc'
  const vintage = style === 'vintageBroadcast'
  const plasma = style === 'plasma'
  const steel = style === 'steelMirror'

  const dbVal = level > 0 ? 20 * Math.log10(level) : -60

  if (!minimal) {
    const glow = ctx.createRadialGradient(w / 2, h * 1.05, 6, w / 2, h * 1.05, 90)
    glow.addColorStop(0, accent + '33')
    glow.addColorStop(0.5, accent + '0F')
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
    ctx.shadowBlur = 8
    ctx.shadowColor = accent
  }

  let needleColor = NEEDLE

  if (plasma) {
    drawZone(ctx, cx, cy, R, -20, 3, 'rgba(255,255,255,0.05)')
    const litDb = Math.max(-20, Math.min(3, dbVal))
    drawZoneGradient(ctx, cx, cy, R, -20, litDb, accent, '#FFFFFF')
    drawTicks(ctx, cx, cy, R, 'plasma', accent)
    needleColor = '#FFFFFF'
  } else if (vintage) {
    drawZone(ctx, cx, cy, R, -20, -3, 'rgba(30,180,30,0.8)')
    drawZone(ctx, cx, cy, R, -3, 0, 'rgba(220,180,20,0.85)')
    drawZone(ctx, cx, cy, R, 0, 3, 'rgba(220,40,20,0.9)')
    drawTicks(ctx, cx, cy, R, 'vintageBroadcast', accent)
    needleColor = '#EEEEEE'
  } else if (steel) {
    drawZone(ctx, cx, cy, R, -20, 0, 'rgba(180,185,195,0.7)')
    drawZone(ctx, cx, cy, R, 0, 3, 'rgba(255,90,80,0.85)')
    drawTicks(ctx, cx, cy, R, 'steelMirror', accent)
    needleColor = '#E8EDF2'
  } else if (minimal) {
    drawZone(ctx, cx, cy, R, -20, 3, 'rgba(255,255,255,0.06)')
    drawZone(ctx, cx, cy, R, -20, Math.max(-20, 20 * Math.log10(Math.max(level, 1e-3))), accent)
    if (studio) drawTicks(ctx, cx, cy, R, 'studioUltra', accent)
    else drawTicks(ctx, cx, cy, R, 'modernDark', accent)
    needleColor = NEEDLE
  } else {
    drawZone(ctx, cx, cy, R, -20, 0, neon ? accent : 'rgba(224,158,36,0.75)')
    drawZone(ctx, cx, cy, R, 0, 3, 'rgba(230,35,19,0.88)')
    drawTicks(ctx, cx, cy, R, style, accent)
  }

  // Innere Skala minimal (nur für Preview)
  drawInnerScalePreview(ctx, cx, cy, R, style)

  const clamped = Math.max(DB_MIN, Math.min(DB_MAX, dbVal))
  drawNeedle(ctx, cx, cy, R, dbToAngle(clamped), needleColor)
  ctx.restore()
}

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

function drawCarbonProStyle(ctx, w, h, level) {
  ctx.save()
  for (let x = 0; x < w; x += 5) line(ctx, x, 0, x, h, 'rgba(255,255,255,0.04)', 1)
  for (let y = 0; y < h; y += 5) line(ctx, 0, y, w, y, 'rgba(255,255,255,0.04)', 1)
  ctx.restore()

  const padX = w * 0.22
  const padY = h * 0.18
  const barW = w - padX * 2
  const innerH = h - padY * 2
  const lvl = Math.max(0, Math.min(1, level))

  roundRect(ctx, padX, padY, barW, innerH, 4)
  ctx.fillStyle = '#141414'
  ctx.fill()

  const fillH = innerH * lvl
  const grad = ctx.createLinearGradient(0, padY + innerH, 0, padY)
  grad.addColorStop(0, '#3A3A3A')
  grad.addColorStop(1, '#D8D8D8')
  roundRect(ctx, padX, padY + innerH - fillH, barW, fillH, 4)
  ctx.fillStyle = grad
  ctx.fill()
}

function drawBarStyle(ctx, w, h, level, accent) {
  const padX = w * 0.22
  const padY = h * 0.14
  const barW = w - padX * 2
  const innerH = h - padY * 2
  const lvl = Math.max(0, Math.min(1, level))

  roundRect(ctx, padX, padY, barW, innerH, 4)
  ctx.fillStyle = '#1C1C1C'
  ctx.fill()

  const fillH = innerH * lvl
  roundRect(ctx, padX, padY + innerH - fillH, barW, fillH, 4)
  ctx.fillStyle = accent
  ctx.fill()
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

// Minimale innere Skala für Preview (nur Ticks, keine Labels — zu klein)
function drawInnerScalePreview(ctx, cx, cy, R, style) {
  const tickColor = style === 'vintageBroadcast'
    ? 'rgba(80,200,80,0.5)'
    : style === 'steelMirror'
      ? 'rgba(200,200,200,0.5)'
      : 'rgba(224,158,36,0.5)'

  // Nur Ticks alle 20, keine Labels (Preview ist zu klein)
  for (let v = 0; v <= 100.0001; v += 20) {
    const rad = ((linearToAngle(v) - 90) * Math.PI) / 180
    const outer = R * 0.58
    const inner = R * 0.50
    line(ctx, cx + outer * Math.cos(rad), cy + outer * Math.sin(rad),
      cx + inner * Math.cos(rad), cy + inner * Math.sin(rad),
      tickColor, 0.6)
  }
}

// Vereinfachte Tick-Darstellung — nur feine Striche, keine Labels (Vorschau ist klein).
function drawTicks(ctx, cx, cy, R, style, accent) {
  if (style === 'carbonPro') return
  let fineColor = 'rgba(224,158,36,0.55)'
  let redColor = 'rgba(230,35,19,0.55)'
  if (style === 'modernDark') { fineColor = 'rgba(255,255,255,0.2)'; redColor = 'rgba(255,255,255,0.2)' }
  else if (style === 'vintageBroadcast') { fineColor = 'rgba(60,200,60,0.5)'; redColor = 'rgba(220,40,20,0.6)' }
  else if (style === 'studioUltra') { fineColor = 'rgba(255,255,255,0.4)'; redColor = 'rgba(255,255,255,0.4)' }
  else if (style === 'steelMirror') { fineColor = 'rgba(210,215,225,0.55)'; redColor = 'rgba(255,120,110,0.6)' }
  else if (style === 'plasma') { fineColor = accent + '88'; redColor = 'rgba(255,255,255,0.5)' }

  for (let f = -20; f <= 3.0001; f += 1) {
    const db = Math.round(f * 10) / 10
    const rad = ((dbToAngle(db) - 90) * Math.PI) / 180
    const isRed = db > 0
    line(ctx, cx + R * Math.cos(rad), cy + R * Math.sin(rad),
      cx + R * 0.9 * Math.cos(rad), cy + R * 0.9 * Math.sin(rad),
      isRed ? redColor : fineColor, 0.6)
  }
}

function drawNeedle(ctx, cx, cy, R, angleDeg, color = NEEDLE) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  const len = R * 0.87
  const tx = cx + len * Math.cos(rad)
  const ty = cy + len * Math.sin(rad)
  line(ctx, cx + 0.6, cy + 0.6, tx + 0.6, ty + 0.6, 'rgba(0,0,0,0.5)', 1.1)
  line(ctx, cx, cy, tx, ty, color, 1.2)
  ctx.beginPath()
  ctx.arc(cx, cy, 2, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
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
  // Bei extrem kleinen/negativen Flächen (sehr niedriger Viewport) nichts zeichnen,
  // sonst wirft arcTo IndexSizeError (negativer Radius).
  if (w <= 0 || h <= 0) { ctx.beginPath(); return }
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
