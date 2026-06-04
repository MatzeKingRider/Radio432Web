import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../store/playerStore'
import { useSettingsStore } from '../store/settingsStore'

// Zentraler Audio-Hook: ein HTML5-Audio-Element + Web Audio API.
//
// Browser-Policy: AudioContext darf erst nach einer Nutzer-Geste erstellt
// werden -> wir bauen ihn beim ersten play()-Aufruf auf.
//
// CORS: createMediaElementSource() kann den Stream nur analysieren, wenn der
// Server CORS-Header sendet. Die meisten Radio-Streams tun das nicht. Wenn der
// AnalyserNode also nur Stille liefert (alle Bins == 0/128), schalten wir auf
// einen simulierten Modus um, der realistische, trägheitsbehaftete Pegel
// erzeugt. So crasht die App nie und die Visualizer bleiben lebendig.

// Hilfsfunktion: Hz → Cents Konversion (identisch zu iOS AVAudioUnitTimePitch)
const CENT_TABLE = {
  396: -180.45,
  417: -91.21,
  432: -31.77,
  440: 0,
  444: 15.67,
  528: 311.98,
  639: 644.58,
  741: 901.96,
  852: 1143.56,
  963: 1356.46,
}

function centForHz(hz) {
  return CENT_TABLE[hz] ?? 1200 * Math.log2(hz / 440)
}

export function useAudio() {
  const audioRef = useRef(null)
  const ctxRef = useRef(null)
  const analyserRef = useRef(null)
  const sourceRef = useRef(null)
  const pitchNodeRef = useRef(null)
  const silenceFramesRef = useRef(0)
  const sourceCreatedRef = useRef(false)
  const silenceIntervalRef = useRef(null)

  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const setAnalyser = usePlayerStore((s) => s.setAnalyser)
  const setSimulated = usePlayerStore((s) => s.setSimulated)
  const setError = usePlayerStore((s) => s.setError)
  const volume = usePlayerStore((s) => s.volume)

  // Audio-Element einmalig erstellen.
  if (!audioRef.current && typeof Audio !== 'undefined') {
    const a = new Audio()
    a.crossOrigin = 'anonymous'
    a.preload = 'none'
    audioRef.current = a
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Reaktive Pitch-Updates bei Frequenz-Wechsel
  useEffect(() => {
    return useSettingsStore.subscribe(
      (state) => state.frequency,
      (freq) => {
        const node = pitchNodeRef.current
        if (!node) return
        const ctx = ctxRef.current
        const cents = centForHz(freq)
        if (ctx) {
          node.parameters
            .get('pitchCents')
            .linearRampToValueAtTime(cents, ctx.currentTime + 0.05)
        } else {
          node.parameters.get('pitchCents').value = cents
        }
      }
    )
  }, [])

  async function ensureContext() {
    if (ctxRef.current) return
    // createMediaElementSource() darf pro Audio-Element nur EINMAL aufgerufen
    // werden. War der Aufbau schon mal erfolgreich oder ist endgueltig
    // fehlgeschlagen -> nie wieder versuchen, sonst InvalidStateError.
    if (sourceCreatedRef.current) return
    let ctx = null
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      ctx = new AudioCtx()

      // Worklet laden (vor Graph-Aufbau)
      await ctx.audioWorklet.addModule('/pitch-shifter-worklet.js')

      const pitchNode = new AudioWorkletNode(ctx, 'pitch-shifter', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      })
      // Initialwert aus Store setzen (Default = 432 Hz → -31.77 Cents)
      const initHz = useSettingsStore.getState().frequency
      pitchNode.parameters.get('pitchCents').value = centForHz(initHz)
      pitchNodeRef.current = pitchNode

      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.8
      const source = ctx.createMediaElementSource(audioRef.current)
      sourceCreatedRef.current = true

      // Graph: source → pitch → analyser → destination
      source.connect(pitchNode)
      pitchNode.connect(analyser)
      analyser.connect(ctx.destination)

      ctxRef.current = ctx
      analyserRef.current = analyser
      sourceRef.current = source
      setAnalyser(analyser)
    } catch (e) {
      // MediaElementSource konnte nicht erstellt werden (z.B. CORS) oder Worklet-Load fehlgeschlagen.
      // Halb-erstellten Context schliessen, damit er nicht leakt.
      if (ctx) {
        try { ctx.close() } catch (_) { /* ignore */ }
      }
      ctxRef.current = null
      analyserRef.current = null
      sourceRef.current = null
      pitchNodeRef.current = null
      // Ein erneuter Aufbau ist auf demselben Element unmoeglich
      // -> permanent in den Simulationsmodus wechseln.
      setSimulated(true)
    }
  }

  // Prüft, ob der Analyser echte Daten liefert; sonst Simulation aktivieren.
  function checkSilence() {
    const analyser = analyserRef.current
    if (!analyser) return
    const buf = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(buf)
    const sum = buf.reduce((a, b) => a + b, 0)
    if (sum === 0) {
      silenceFramesRef.current += 1
      if (silenceFramesRef.current > 90) {
        // ~1.5s nur Stille trotz Wiedergabe -> CORS-blockiert -> simulieren
        setSimulated(true)
      }
    } else {
      silenceFramesRef.current = 0
      setSimulated(false)
    }
  }

  async function play(url) {
    const a = audioRef.current
    if (!a) return
    try {
      await ensureContext()
      if (ctxRef.current && ctxRef.current.state === 'suspended') {
        await ctxRef.current.resume()
      }
      if (a.src !== url) a.src = url
      a.volume = usePlayerStore.getState().volume
      await a.play()
      setPlaying(true)
      setError(null)
      silenceFramesRef.current = 0
      // Vorheriges Stille-Polling stoppen (z.B. bei Senderwechsel),
      // damit keine ueberlappenden Intervalle parallel setSimulated() rufen.
      if (silenceIntervalRef.current) {
        clearInterval(silenceIntervalRef.current)
        silenceIntervalRef.current = null
      }
      // Nach kurzer Zeit Stille prüfen
      setTimeout(() => {
        let checks = 0
        silenceIntervalRef.current = setInterval(() => {
          if (!usePlayerStore.getState().isPlaying) {
            clearInterval(silenceIntervalRef.current)
            silenceIntervalRef.current = null
            return
          }
          checkSilence()
          checks += 1
          if (checks > 20) {
            clearInterval(silenceIntervalRef.current)
            silenceIntervalRef.current = null
          }
        }, 100)
      }, 600)
    } catch (e) {
      setPlaying(false)
      setError('Wiedergabe fehlgeschlagen')
    }
  }

  function stop() {
    const a = audioRef.current
    if (!a) return
    // Laufendes Stille-Polling stoppen.
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current)
      silenceIntervalRef.current = null
    }
    a.pause()
    a.removeAttribute('src')
    a.load()
    setPlaying(false)
    // Simulationsmodus zuruecksetzen, damit der naechste (ggf. CORS-freie)
    // Sender nicht faelschlich im Simulationsmodus startet.
    setSimulated(false)
    silenceFramesRef.current = 0
  }

  return { play, stop }
}
