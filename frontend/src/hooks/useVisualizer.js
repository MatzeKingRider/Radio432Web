// Helfer für die Visualizer (VU-Meter + Spektrum).
// Liefert pro Frame entweder echte Daten aus dem AnalyserNode oder — wenn
// kein/CORS-blockierter Analyser vorhanden ist — eine realistische Simulation
// mit Trägheit (Damping), damit Nadel und Balken natürlich wirken.

// Erzeugt einen wiederverwendbaren Simulator mit internem Zustand.
export function createSimulator(bands = 22) {
  const values = new Array(bands).fill(0)
  const targets = new Array(bands).fill(0)
  let beat = 0

  return function step() {
    beat += 0.08
    // gelegentlich neue Ziele setzen -> wirkt wie Musik
    for (let i = 0; i < bands; i++) {
      if (Math.random() < 0.06) {
        // tiefe Bänder lauter, hohe leiser
        const tilt = 1 - i / (bands * 1.6)
        targets[i] = Math.pow(Math.random(), 1.6) * tilt
      }
      // Beat-Pulsation auf die unteren Bänder
      const pulse = i < bands * 0.4 ? (Math.sin(beat) * 0.5 + 0.5) * 0.25 : 0
      const target = Math.min(1, targets[i] + pulse)
      // Damping: schnell hoch, langsam runter
      if (target > values[i]) {
        values[i] += (target - values[i]) * 0.5
      } else {
        values[i] += (target - values[i]) * 0.12
      }
    }
    return values
  }
}

// Liefert ein normalisiertes Spektrum [0..1] mit `bands` Werten aus dem Analyser.
// Logarithmische Verteilung der FFT-Bins auf die Bänder.
export function readSpectrum(analyser, freqBuffer, bands) {
  analyser.getByteFrequencyData(freqBuffer)
  const out = new Array(bands)
  const binCount = freqBuffer.length
  for (let i = 0; i < bands; i++) {
    // logarithmisch: niedrige Bänder schmal, hohe breit
    const lo = Math.floor(Math.pow(i / bands, 2) * binCount)
    const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / bands, 2) * binCount))
    let sum = 0
    for (let b = lo; b < hi && b < binCount; b++) sum += freqBuffer[b]
    const avg = sum / (hi - lo)
    out[i] = Math.min(1, (avg / 255) * 1.4)
  }
  return out
}

// Liefert den RMS-Pegel [0..1] für die VU-Nadel aus dem Zeitbereich.
export function readLevel(analyser, timeBuffer) {
  analyser.getByteTimeDomainData(timeBuffer)
  let sum = 0
  for (let i = 0; i < timeBuffer.length; i++) {
    const v = (timeBuffer[i] - 128) / 128
    sum += v * v
  }
  const rms = Math.sqrt(sum / timeBuffer.length)
  return Math.min(1, rms * 2.5)
}
