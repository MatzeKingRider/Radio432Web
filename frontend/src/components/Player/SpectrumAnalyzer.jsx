import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../../store/playerStore'
import { createSimulator, readSpectrum } from '../../hooks/useVisualizer'

// Classic-LED Spektrum-Analyser auf Canvas — portiert aus iOS
// SpectrumAnalyzerView.swift (ClassicLEDRenderer).
// 22 Balken, 22 LED-Segmente je Balken, Grün/Gelb/Orange/Rot, Peak-Hold 0.5s.

const BARS = 22
const SEGMENTS = 22

// Segmentfarbe nach relativer Höhe (1:1 aus iOS segRGB)
function segColor(ratio) {
  if (ratio >= 0.88) return '#EB1414' // Rot
  if (ratio >= 0.72) return '#F27312' // Orange
  if (ratio >= 0.52) return '#F5D114' // Gelb
  return '#1ED12E' // Grün
}
function peakColor(ratio) {
  // aufgehellte Segmentfarbe (f=0.55 wie iOS)
  const hex = segColor(ratio)
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const f = 0.55
  const mix = (c) => Math.round(c + (255 - c) * f)
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}

export default function SpectrumAnalyzer({ style = 'classic' }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)
  const valuesRef = useRef(new Array(BARS).fill(0))
  const peaksRef = useRef(new Array(BARS).fill(0))
  const peakTimesRef = useRef(new Array(BARS).fill(0))
  const simRef = useRef(createSimulator(BARS))
  const freqBufRef = useRef(null)

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

    function targets() {
      if (!isPlaying) return new Array(BARS).fill(0)
      if (analyserNode && !simulatedMode) {
        if (!freqBufRef.current) freqBufRef.current = new Uint8Array(analyserNode.frequencyBinCount)
        return readSpectrum(analyserNode, freqBufRef.current, BARS)
      }
      return simRef.current()
    }

    function draw() {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const now = performance.now()

      const t = targets()
      const values = valuesRef.current
      const peaks = peaksRef.current
      const peakTimes = peakTimesRef.current

      for (let i = 0; i < BARS; i++) {
        // schnell hoch, langsam runter
        if (t[i] > values[i]) values[i] += (t[i] - values[i]) * 0.6
        else values[i] += (t[i] - values[i]) * 0.25

        if (values[i] >= peaks[i]) {
          peaks[i] = values[i]
          peakTimes[i] = now
        } else if (now - peakTimes[i] > 500) {
          peaks[i] = Math.max(values[i], peaks[i] - 0.06)
        }
      }

      ctx.clearRect(0, 0, w, h)
      roundRect(ctx, 0, 0, w, h, 9)
      ctx.fillStyle = '#0A0A0A'
      ctx.fill()

      if (style === 'carbonBlock') {
        drawCarbonBlock(ctx, w, h, values)
      } else {
        drawSegmentBars(ctx, w, h, values, peaks, style)
      }

      // Akzent-Rahmen
      roundRect(ctx, 0.9, 0.9, w - 1.8, h - 1.8, 9)
      ctx.strokeStyle = getAccent()
      ctx.lineWidth = 1.8
      ctx.stroke()

      const active = isPlaying || values.some((v) => v > 0.001) || peaks.some((p) => p > 0.001)
      if (active) rafRef.current = requestAnimationFrame(draw)
      else rafRef.current = 0
    }

    function redrawStatic() {
      resize()
      if (!usePlayerStore.getState().isPlaying) draw()
    }
    window.addEventListener('resize', redrawStatic)

    cancelAnimationFrame(rafRef.current)
    requestAnimationFrame(() => { resize(); draw() })

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      window.removeEventListener('resize', redrawStatic)
    }
  }, [isPlaying, analyserNode, simulatedMode, style])

  return <canvas ref={canvasRef} className="w-full h-full block" />
}

function getAccent() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#C9A84C'
}

// 22 LED-Balken (classic, neonGlow, broadcast).
function drawSegmentBars(ctx, w, h, values, peaks, style) {
  const accent = getAccent()
  const neon = style === 'neonGlow'
  const broadcast = style === 'broadcast'
  const padX = 6
  const padY = 5
  const gap = Math.max(1, w * 0.008)
  const barW = (w - padX * 2 - gap * (BARS - 1)) / BARS
  const segGap = 1.2
  const innerH = h - padY * 2
  const segH = (innerH - segGap * (SEGMENTS - 1)) / SEGMENTS

  ctx.save()
  if (neon) {
    ctx.shadowBlur = 8
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
        // Top-Segmente rot, Rest weiß (Studio-Monitor)
        if (isPeak) ctx.fillStyle = '#FF4030'
        else if (lit) ctx.fillStyle = ratio >= 0.85 ? '#FF4030' : '#E8E8E8'
        else ctx.fillStyle = '#1C1C1C'
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

// 9 breite Blöcke statt 22 Balken (carbonBlock).
function drawCarbonBlock(ctx, w, h, values) {
  const accent = getAccent()
  const BLOCKS = 9
  const SEG = 9
  const padX = 6
  const padY = 5
  const gap = Math.max(2, w * 0.012)
  const blockW = (w - padX * 2 - gap * (BLOCKS - 1)) / BLOCKS
  const segGap = 2
  const innerH = h - padY * 2
  const segH = (innerH - segGap * (SEG - 1)) / SEG
  const per = Math.ceil(values.length / BLOCKS)

  for (let b = 0; b < BLOCKS; b++) {
    // Mittelwert der zugehörigen Roh-Balken
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
      // heller Rand
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.stroke()
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
