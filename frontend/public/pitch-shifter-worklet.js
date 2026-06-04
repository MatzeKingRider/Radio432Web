/**
 * Pitch-Shifter AudioWorklet — Phase-Vocoder mit Overlap-Add
 * Shift-Bereich: -1200 bis +1200 Cents (eine Oktave in beide Richtungen)
 * Vorberechnung: Hann-Fenster, FFT-Lookup-Tabellen für Radix-2
 * Latenz: ~46ms (FRAME_SIZE=2048 @ 44.1kHz)
 */

const FRAME_SIZE = 2048
const HOP_SIZE = 512          // 75% overlap (4 frames pro Fenster)
const OVERLAP_COUNT = 4       // frames pro full cycle
const FFT_SIZE = FRAME_SIZE   // 1:1

class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'pitchCents',
        defaultValue: 0,
        minValue: -2400,
        maxValue: 2400,
        automationRate: 'k-rate', // Freq-Wechsel sind diskret, brauchen keine a-rate Ramping
      },
    ]
  }

  constructor() {
    super()
    this.frameIndex = 0
    this.outputIndex = 0

    // Input & Output Ringpuffer für OLA
    this.inputBuffer = new Float32Array(FRAME_SIZE)
    this.outputBuffer = new Float32Array(FRAME_SIZE * OVERLAP_COUNT)

    // FFT State
    this.fftReal = new Float32Array(FFT_SIZE)
    this.fftImag = new Float32Array(FFT_SIZE)
    this.lastPhase = new Float32Array(FFT_SIZE / 2 + 1)
    this.sumPhase = new Float32Array(FFT_SIZE / 2 + 1)

    // Fenster
    this.window = this._createHannWindow(FRAME_SIZE)

    // Bit-Reversal-Lookup für FFT
    this.bitReverseTable = this._createBitReverseTable(FFT_SIZE)

    // Dispatch-Cache für STFT-Bins
    this.expectedPhase = new Float32Array(FFT_SIZE / 2 + 1)
    for (let k = 0; k < FFT_SIZE / 2 + 1; k++) {
      this.expectedPhase[k] = (2 * Math.PI * k * HOP_SIZE) / FFT_SIZE
    }
  }

  _createHannWindow(size) {
    const w = new Float32Array(size)
    for (let i = 0; i < size; i++) {
      w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)))
    }
    return w
  }

  _createBitReverseTable(size) {
    const table = new Uint16Array(size)
    for (let i = 0; i < size; i++) {
      let j = 0
      let k = i
      for (let m = 1; m < size; m <<= 1) {
        j = (j << 1) | (k & 1)
        k >>= 1
      }
      table[i] = j
    }
    return table
  }

  _radix2FFT(real, imag, inverse = false) {
    const N = real.length
    if (N === 1) return

    // Bit-Reversal
    for (let i = 0; i < N; i++) {
      const j = this.bitReverseTable[i]
      if (i < j) {
        ;[real[i], real[j]] = [real[j], real[i]]
        ;[imag[i], imag[j]] = [imag[j], imag[i]]
      }
    }

    // FFT-Stages
    for (let stage = 1; stage <= Math.log2(N); stage++) {
      const step = 1 << stage
      const halfStep = step >> 1
      const angle = (inverse ? 1 : -1) * (2 * Math.PI) / step

      for (let k = 0; k < N; k += step) {
        let w = 1
        let wReal = Math.cos(0)
        let wImag = Math.sin(0)

        for (let j = 0; j < halfStep; j++) {
          const even = k + j
          const odd = k + j + halfStep

          const t0 = real[odd] * wReal - imag[odd] * wImag
          const t1 = real[odd] * wImag + imag[odd] * wReal

          real[odd] = real[even] - t0
          imag[odd] = imag[even] - t1
          real[even] = real[even] + t0
          imag[even] = imag[even] + t1

          // Update twiddle: w *= exp(i * angle)
          const cosA = Math.cos(angle * (j + 1))
          const sinA = Math.sin(angle * (j + 1))
          const newWReal = wReal * cosA - wImag * sinA
          const newWImag = wReal * sinA + wImag * cosA
          wReal = newWReal
          wImag = newWImag
        }
      }
    }

    if (inverse) {
      const scale = 1 / N
      for (let i = 0; i < N; i++) {
        real[i] *= scale
        imag[i] *= scale
      }
    }
  }

  _unwrap(phase) {
    // Vereinfacht: schon in [-π, π] durch atan2 Konvention
    return phase
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0]
    const output = outputs[0]?.[0]

    if (!input || !output) return true

    const pitchCents = parameters.pitchCents[0]
    const pitchRatio = Math.pow(2, pitchCents / 1200)

    // Bypass bei ~0 Cents
    if (Math.abs(pitchCents) < 0.5) {
      output.set(input)
      return true
    }

    // Auswahl je nach Pitch-Richtung (Forward / Backward Time-Stretch)
    const isSlowDown = pitchRatio < 1

    for (let i = 0; i < input.length; i++) {
      this.inputBuffer[this.frameIndex] = input[i]
      this.frameIndex++

      if (this.frameIndex === HOP_SIZE) {
        // Frame vollständig — verarbeite ihn
        this._processFrame(pitchRatio)
        this.frameIndex = 0
      }

      // Output aus ringpuffer lesen
      if (this.outputIndex < FRAME_SIZE * OVERLAP_COUNT) {
        output[i] = this.outputBuffer[this.outputIndex]
        this.outputIndex++
        if (this.outputIndex >= FRAME_SIZE * OVERLAP_COUNT) {
          this.outputIndex = 0
        }
      } else {
        output[i] = 0
      }
    }

    return true
  }

  _processFrame(pitchRatio) {
    // 1. Fenster-Input
    const windowed = new Float32Array(FRAME_SIZE)
    for (let i = 0; i < FRAME_SIZE; i++) {
      windowed[i] = (this.inputBuffer[i] || 0) * this.window[i]
    }

    // 2. FFT (kopiere zu Real/Imag, führe FFT durch)
    for (let i = 0; i < FRAME_SIZE; i++) {
      this.fftReal[i] = windowed[i]
      this.fftImag[i] = 0
    }
    this._radix2FFT(this.fftReal, this.fftImag, false)

    // 3. Phasen-Vocoder: Magn bleiben gleich, Phasen Zeit-strecken
    const bins = FRAME_SIZE / 2 + 1
    for (let k = 0; k < bins; k++) {
      const real = this.fftReal[k]
      const imag = this.fftImag[k]

      // Magnitude
      const mag = Math.sqrt(real * real + imag * imag)

      // Aktuelle Phase
      let phase = Math.atan2(imag, real)

      // Expected phase (Phase ohne Pitch-Shift)
      const expected = this.expectedPhase[k]

      // Phase-Differenz (unwrap)
      let delta = phase - this.lastPhase[k] - expected
      // Unwrap in [-π, π]
      while (delta > Math.PI) delta -= 2 * Math.PI
      while (delta < -Math.PI) delta += 2 * Math.PI

      // True frequency offset
      const trueFreq = expected + delta / HOP_SIZE

      // Neue Phase nach Pitch-Shift
      const newSumPhase = this.sumPhase[k] + trueFreq * HOP_SIZE * pitchRatio
      this.sumPhase[k] = newSumPhase

      // Polar → Cartesian zurück
      const shiftedPhase = newSumPhase % (2 * Math.PI)
      this.fftReal[k] = mag * Math.cos(shiftedPhase)
      this.fftImag[k] = mag * Math.sin(shiftedPhase)

      this.lastPhase[k] = phase
    }

    // Mirror für negative Freq (Real-Signal)
    for (let k = bins; k < FRAME_SIZE; k++) {
      this.fftReal[k] = this.fftReal[FRAME_SIZE - k]
      this.fftImag[k] = -this.fftImag[FRAME_SIZE - k]
    }

    // 4. IFFT
    this._radix2FFT(this.fftReal, this.fftImag, true)

    // 5. OLA: Output in Ringpuffer schreiben mit Fenster
    const outPos = (this.outputIndex + FRAME_SIZE - HOP_SIZE) % (FRAME_SIZE * OVERLAP_COUNT)
    for (let i = 0; i < FRAME_SIZE; i++) {
      const outIdx = (outPos + i) % (FRAME_SIZE * OVERLAP_COUNT)
      this.outputBuffer[outIdx] += this.fftReal[i] * this.window[i]
    }
  }
}

registerProcessor('pitch-shifter', PitchShifterProcessor)
