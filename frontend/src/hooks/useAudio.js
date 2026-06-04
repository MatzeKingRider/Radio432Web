import { useEffect, useRef } from 'react'
import * as Tone from 'tone'
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
//
// Lifecycle: Der PitchShift-Node (und der AudioContext) werden bewusst nicht
// disposed. Der Hook ist ein Singleton -> Context-Lifetime = App-Lifetime.

export function useAudio() {
  const audioRef = useRef(null)
  const ctxRef = useRef(null)
  const analyserRef = useRef(null)
  const pitchShiftRef = useRef(null)
  const sourceRef = useRef(null)
  const silenceFramesRef = useRef(0)
  const sourceCreatedRef = useRef(false)
  const silenceIntervalRef = useRef(null)

  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const setAnalyser = usePlayerStore((s) => s.setAnalyser)
  const setSimulated = usePlayerStore((s) => s.setSimulated)
  const setError = usePlayerStore((s) => s.setError)
  const volume = usePlayerStore((s) => s.volume)
  const frequency = useSettingsStore((s) => s.frequency)

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

  // Frequenz -> Pitch in Halbtoenen umrechnen und auf PitchShift anwenden.
  // 432 Hz = Referenz (0 Halbtoene, keine Verschiebung).
  useEffect(() => {
    if (!pitchShiftRef.current) return
    let semitones = 12 * Math.log2(frequency / 432)
    semitones = Math.round(semitones * 100) / 100
    pitchShiftRef.current.pitch = semitones
  }, [frequency])

  function ensureContext() {
    if (ctxRef.current) return
    // createMediaElementSource() darf pro Audio-Element nur EINMAL aufgerufen
    // werden. War der Aufbau schon mal erfolgreich oder ist endgueltig
    // fehlgeschlagen -> nie wieder versuchen, sonst InvalidStateError.
    if (sourceCreatedRef.current) return
    let ctx = null
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      ctx = new AudioCtx()
      // Tone.js auf denselben AudioContext setzen, damit Source, Analyser und
      // PitchShift im selben Audio-Graphen haengen.
      Tone.setContext(ctx)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.8
      const source = ctx.createMediaElementSource(audioRef.current)
      sourceCreatedRef.current = true
      // PitchShift hinter dem Analyser einhaengen, damit der Visualizer die
      // Original-Frequenzen sieht. .toDestination() verbindet ihn mit dem Output.
      // windowSize: Fensterlaenge des Pitch-Shift-Algorithmus; 0.08s =
      // Kompromiss zwischen Latenz und Artefakten.
      const pitchShift = new Tone.PitchShift({ pitch: 0, windowSize: 0.08 }).toDestination()
      // Initialen Pitch sofort aus dem Store setzen. Der frequency-useEffect
      // kann schon gelaufen sein, als pitchShiftRef noch null war (early return).
      // Ohne das spielt der erste Stream faelschlich mit Pitch 0 (= 432 Hz Basis),
      // obwohl das Backend evtl. eine andere Frequenz geladen hat.
      const initialFrequency = useSettingsStore.getState().frequency || 432
      const initialSemitones = 12 * Math.log2(initialFrequency / 432)
      // Rundung verhindert Float-Jitter bei kleinen Frequenzaenderungen.
      pitchShift.pitch = Math.round(initialSemitones * 100) / 100
      source.connect(analyser)
      // analyser ist ein nativer AudioNode, pitchShift.input ein Tone.js-Wrapper
      // (_Gain). Nativer analyser.connect(pitchShift.input) wirft zur Laufzeit
      // TypeError ("Overload resolution failed") -> Tone.connect() ueberbruegt
      // nativen und Tone-Graphen korrekt.
      Tone.connect(analyser, pitchShift)
      ctxRef.current = ctx
      analyserRef.current = analyser
      pitchShiftRef.current = pitchShift
      sourceRef.current = source
      setAnalyser(analyser)
    } catch (e) {
      // MediaElementSource konnte nicht erstellt werden (z.B. CORS).
      // Halb-erstellten Context schliessen, damit er nicht leakt.
      if (ctx) {
        try { ctx.close() } catch (_) { /* ignore */ }
      }
      ctxRef.current = null
      analyserRef.current = null
      pitchShiftRef.current = null
      sourceRef.current = null
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
      ensureContext()
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
