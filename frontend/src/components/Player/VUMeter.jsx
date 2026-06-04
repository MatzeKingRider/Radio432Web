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

export default function VUMeter({ label, style = 'analogClassic' }) {
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
      const rect = canvas.getBoundingClientRect()
      const w = rect.width
      const h = rect.height

      // Pegel mit Trägheit annähern (Damping 0.3)
      const t = targetLevel()
      levelRef.current += (t - levelRef.current) * 0.3

      const now = performance.now()
      if (levelRef.current >= peakRef.current) {
        peakRef.current = levelRef.current
        peakTimeRef.current = now
      } else if (now - peakTimeRef.current > 500) {
        peakRef.current = Math.max(0, peakRef.current - 0.01)
      }

      ctx.clearRect(0, 0, w, h)

      // Hintergrund
      roundRect(ctx, 0, 0, w, h, 9)
      ctx.fillStyle = '#0A0A0A'
      ctx.fill()

      if (style === 'classic') {
        drawBarStyle(ctx, w, h, levelRef.current, label)
      } else {
        drawArcStyle(ctx, w, h, levelRef.current, label, style)
      }

      // Akzent-Rahmen
      roundRect(ctx, 0.9, 0.9, w - 1.8, h - 1.8, 9)
      ctx.lineWidth = 1.8
      ctx.strokeStyle = getAccent()
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
  }, [isPlaying, analyserNode, simulatedMode, label, style])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ aspectRatio: '4 / 3' }}
    />
  )
}

function getAccent() {
  return getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#C9A84C'
}

// Bogen-Darstellung (analogClassic, modernDark, neonArc).
function drawArcStyle(ctx, w, h, level, label, style) {
  const minimal = style === 'modernDark'
  const neon = style === 'neonArc'
  const accent = getAccent()

  if (!minimal) {
    // warmer Glow nur bei analogClassic / neonArc
    const glow = ctx.createRadialGradient(w / 2, h * 1.05, 10, w / 2, h * 1.05, 140)
    glow.addColorStop(0, 'rgba(224,158,36,0.22)')
    glow.addColorStop(0.5, 'rgba(224,158,36,0.06)')
    glow.addColorStop(1, 'rgba(224,158,36,0)')
    roundRect(ctx, 0, 0, w, h, 9)
    ctx.fillStyle = glow
    ctx.fill()
  }

  const cx = w / 2
  const R = Math.min(w * 0.48, h * 0.86)
  const cy = h * 0.5 + R * 0.5

  ctx.save()
  if (neon) {
    ctx.shadowBlur = 12
    ctx.shadowColor = accent
  }

  if (minimal) {
    // gedämpfter Gradient-Bogen dunkel -> accent
    drawZone(ctx, cx, cy, R, -20, 3, 'rgba(255,255,255,0.06)')
    drawZone(ctx, cx, cy, R, -20, Math.max(-20, 20 * Math.log10(Math.max(level, 1e-3))), accent)
  } else {
    // Zonen-Bögen
    drawZone(ctx, cx, cy, R, -20, 0, neon ? accent : 'rgba(224,158,36,0.75)')
    drawZone(ctx, cx, cy, R, 0, 3, 'rgba(230,35,19,0.88)')
    // Ticks nur bei analogClassic / neonArc
    drawTicks(ctx, cx, cy, R)
  }

  // Nadel
  const db = level > 0 ? 20 * Math.log10(level) : -60
  const clamped = Math.max(DB_MIN, Math.min(DB_MAX, db))
  drawNeedle(ctx, cx, cy, R, dbToAngle(clamped))
  ctx.restore()

  // Kanal-Label
  ctx.fillStyle = minimal ? 'rgba(255,255,255,0.4)' : 'rgba(224,158,36,0.6)'
  ctx.font = `600 ${w * 0.11}px ui-rounded, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, cx, cy - R * 0.2)
}

// Einfache Balken-Darstellung (classic) — Balken wächst von unten, Farbe = accent.
function drawBarStyle(ctx, w, h, level, label) {
  const accent = getAccent()
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

function drawTicks(ctx, cx, cy, R) {
  const majors = [
    [-20, '-20', false], [-10, '-10', false], [-5, '-5', false],
    [0, '0', true], [3, '+3', true],
  ]
  // feine Striche alle 0.5 dB
  for (let f = -20; f <= 3.0001; f += 0.5) {
    const db = Math.round(f * 10) / 10
    if (majors.some((m) => m[0] === db)) continue
    const rad = ((dbToAngle(db) - 90) * Math.PI) / 180
    const isRed = db > 0
    line(ctx, cx + R * Math.cos(rad), cy + R * Math.sin(rad),
      cx + R * 0.9 * Math.cos(rad), cy + R * 0.9 * Math.sin(rad),
      isRed ? 'rgba(230,35,19,0.62)' : 'rgba(224,158,36,0.62)', 0.9)
  }
  // Major-Striche + Labels
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const [db, lbl, red] of majors) {
    const rad = ((dbToAngle(db) - 90) * Math.PI) / 180
    line(ctx, cx + R * Math.cos(rad), cy + R * Math.sin(rad),
      cx + R * 0.8 * Math.cos(rad), cy + R * 0.8 * Math.sin(rad),
      red ? 'rgba(230,35,19,0.98)' : 'rgba(224,158,36,0.98)', 1.6)
    const lx = cx + R * 0.74 * Math.cos(rad)
    const ly = cy + R * 0.74 * Math.sin(rad)
    ctx.fillStyle = red ? 'rgba(230,35,19,0.92)' : 'rgba(224,158,36,0.92)'
    ctx.font = `${Math.max(7, R * 0.1)}px ui-monospace, monospace`
    ctx.fillText(lbl, lx, ly)
  }
}

function drawNeedle(ctx, cx, cy, R, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  const len = R * 0.87
  const tx = cx + len * Math.cos(rad)
  const ty = cy + len * Math.sin(rad)
  // Schatten
  line(ctx, cx + 0.6, cy + 0.6, tx + 0.6, ty + 0.6, 'rgba(0,0,0,0.5)', 1.3)
  // Nadel
  line(ctx, cx, cy, tx, ty, NEEDLE, 1.6)
  // Drehpunkt
  ctx.beginPath()
  ctx.arc(cx, cy, 2.6, 0, Math.PI * 2)
  ctx.fillStyle = NEEDLE
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
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
