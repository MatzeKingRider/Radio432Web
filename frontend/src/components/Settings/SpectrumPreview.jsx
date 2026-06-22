import { useEffect, useRef } from 'react'

// Statische Einzelbild-Vorschau eines Spektrum-Stils mit festen Pegelwerten.
// Reine Render-Logik, kein Store-Zugriff, kein Animations-Loop.

const PREVIEW_VALUES = [
  0.3, 0.5, 0.7, 0.8, 0.6, 0.4, 0.3, 0.5, 0.65, 0.75, 0.8,
  0.7, 0.5, 0.4, 0.3, 0.6, 0.7, 0.5, 0.4, 0.3, 0.5, 0.6,
]
const BARS = PREVIEW_VALUES.length
const SEGMENTS = 22

function resolveAccent(customColor) {
  if (customColor && customColor !== '') return customColor
  return getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#C9A84C'
}

export default function SpectrumPreview({ style = 'classic', customColor = '' }) {
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
    drawSpectrumPreview(ctx, rect.width, rect.height, PREVIEW_VALUES, style, resolveAccent(customColor))
  }, [style, customColor])
  return <canvas ref={canvasRef} style={{ width: '100%', height: '40px', display: 'block', borderRadius: 6 }} />
}

function drawSpectrumPreview(ctx, w, h, values, style, accent) {
  ctx.clearRect(0, 0, w, h)
  roundRect(ctx, 0, 0, w, h, 9)
  ctx.fillStyle = 'rgba(10,10,10,0.96)'
  ctx.fill()

  // Peaks knapp über den Werten simulieren.
  const peaks = values.map((v) => Math.min(1, v + 0.08))

  if (style === 'carbonBlock') {
    drawCarbonBlock(ctx, w, h, values, accent)
  } else if (style === 'softBloom') {
    drawSmoothBars(ctx, w, h, values, accent, accent, 6)
  } else if (style === 'deepOcean') {
    drawSmoothBars(ctx, w, h, values, '#0A1530', '#40E0D0', 8, '#40E0D0')
  } else if (style === 'waveformPeaks') {
    drawWaveform(ctx, w, h, values, accent)
  } else {
    drawSegmentBars(ctx, w, h, values, peaks, style, accent)
  }

  roundRect(ctx, 0.9, 0.9, w - 1.8, h - 1.8, 9)
  ctx.strokeStyle = accent
  ctx.lineWidth = 1.4
  ctx.stroke()
}

function segColor(ratio) {
  if (ratio >= 0.88) return '#EB1414'
  if (ratio >= 0.72) return '#F27312'
  if (ratio >= 0.52) return '#F5D114'
  return '#1ED12E'
}
function peakColor(ratio) {
  const hex = segColor(ratio)
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const f = 0.55
  const mix = (c) => Math.round(c + (255 - c) * f)
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}
function amberColor(ratio) {
  if (ratio >= 0.9) return 'rgba(255,220,50,1.0)'
  if (ratio >= 0.7) return 'rgba(240,180,20,0.9)'
  return 'rgba(210,140,10,0.8)'
}

function drawSegmentBars(ctx, w, h, values, peaks, style, accent) {
  const neon = style === 'neonGlow'
  const broadcast = style === 'broadcast'
  const amber = style === 'ledAmber'
  const padX = 6
  const padY = 4
  const gap = Math.max(1, w * 0.008)
  const barW = (w - padX * 2 - gap * (BARS - 1)) / BARS
  const segGap = 1.5
  const innerH = h - padY * 2
  const segH = (innerH - segGap * (SEGMENTS - 1)) / SEGMENTS

  ctx.save()
  if (neon) {
    ctx.shadowBlur = 6
    ctx.shadowColor = accent
  }

  for (let i = 0; i < BARS; i++) {
    const x = padX + i * (barW + gap)
    const level = values[i]
    const peakIdx = peaks[i] > 0 ? Math.min(SEGMENTS - 1, Math.floor(peaks[i] * SEGMENTS)) : -1

    for (let s = 0; s < SEGMENTS; s++) {
      const threshold = s / SEGMENTS
      const ratio = s / SEGMENTS
      const lit = threshold < level
      const isPeak = s === peakIdx && peaks[i] > level
      const y = h - padY - (s + 1) * segH - s * segGap
      ctx.beginPath()
      roundRect(ctx, x, y, barW, segH, 1)
      if (neon) {
        if (isPeak || lit) ctx.fillStyle = accent
        else ctx.fillStyle = '#1C1C1C'
      } else if (broadcast) {
        if (isPeak) ctx.fillStyle = '#FF4030'
        else if (lit) ctx.fillStyle = ratio >= 0.85 ? '#FF4030' : '#E8E8E8'
        else ctx.fillStyle = '#1C1C1C'
      } else if (amber) {
        if (isPeak || lit) ctx.fillStyle = amberColor(ratio)
        else ctx.fillStyle = '#241A06'
      } else {
        if (isPeak) ctx.fillStyle = peakColor(ratio)
        else if (lit) ctx.fillStyle = segColor(ratio)
        else ctx.fillStyle = '#1C1C1C'
      }
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawCarbonBlock(ctx, w, h, values, accent) {
  const BLOCKS = 9
  const SEG = 9
  const padX = 6
  const padY = 4
  const gap = Math.max(2, w * 0.012)
  const blockW = (w - padX * 2 - gap * (BLOCKS - 1)) / BLOCKS
  const segGap = 2
  const innerH = h - padY * 2
  const segH = (innerH - segGap * (SEG - 1)) / SEG
  const per = Math.ceil(values.length / BLOCKS)

  for (let b = 0; b < BLOCKS; b++) {
    let sum = 0, n = 0
    for (let k = b * per; k < (b + 1) * per && k < values.length; k++) { sum += values[k]; n++ }
    const level = n ? sum / n : 0
    const x = padX + b * (blockW + gap)
    const topSeg = Math.min(SEG - 1, Math.floor(level * SEG))

    for (let s = 0; s < SEG; s++) {
      const lit = s / SEG < level
      const isTop = lit && s === topSeg
      const y = h - padY - (s + 1) * segH - s * segGap
      ctx.beginPath()
      roundRect(ctx, x, y, blockW, segH, 2)
      ctx.fillStyle = isTop ? accent : lit ? '#4A4A4A' : '#1A1A1A'
      ctx.fill()
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.stroke()
    }
  }
}

function drawSmoothBars(ctx, w, h, values, botColor, topColor, blur, glowColor) {
  const padX = 6
  const padY = 4
  const gap = Math.max(1, w * 0.008)
  const barW = (w - padX * 2 - gap * (BARS - 1)) / BARS
  const innerH = h - padY * 2

  ctx.save()
  if (blur) {
    ctx.shadowBlur = blur
    ctx.shadowColor = glowColor || topColor
  }
  for (let i = 0; i < BARS; i++) {
    const x = padX + i * (barW + gap)
    const lvl = Math.max(0, Math.min(1, values[i]))
    const fillH = innerH * lvl
    if (fillH < 0.5) continue
    const yTop = h - padY - fillH
    const grad = ctx.createLinearGradient(0, h - padY, 0, yTop)
    grad.addColorStop(0, withAlpha(botColor, botColor === topColor ? 0.3 : 1))
    grad.addColorStop(1, withAlpha(topColor, 0.9))
    roundRect(ctx, x, yTop, barW, fillH, 2)
    ctx.fillStyle = grad
    ctx.fill()
  }
  ctx.restore()
}

function drawWaveform(ctx, w, h, values, accent) {
  const N = 128
  const padY = 4
  const innerH = h - padY * 2
  const pts = []
  for (let i = 0; i < N; i++) {
    const f = (i / (N - 1)) * (values.length - 1)
    const a = Math.floor(f)
    const b = Math.min(values.length - 1, a + 1)
    const v = values[a] + (values[b] - values[a]) * (f - a)
    const x = (i / (N - 1)) * w
    const y = h - padY - Math.max(0, Math.min(1, v)) * innerH
    pts.push([x, y])
  }

  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(pts[0][0], pts[0][1])
  for (let i = 1; i < N; i++) {
    const [px, py] = pts[i - 1]
    const [cx, cy] = pts[i]
    const mx = (px + cx) / 2
    ctx.bezierCurveTo(mx, py, mx, cy, cx, cy)
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  const fill = ctx.createLinearGradient(0, padY, 0, h)
  fill.addColorStop(0, withAlpha(accent, 0.3))
  fill.addColorStop(1, withAlpha(accent, 0))
  ctx.fillStyle = fill
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < N; i++) {
    const [px, py] = pts[i - 1]
    const [cx, cy] = pts[i]
    const mx = (px + cx) / 2
    ctx.bezierCurveTo(mx, py, mx, cy, cx, cy)
  }
  ctx.strokeStyle = accent
  ctx.lineWidth = 1.6
  ctx.lineJoin = 'round'
  ctx.stroke()
}

function withAlpha(color, alpha) {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  return color
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
