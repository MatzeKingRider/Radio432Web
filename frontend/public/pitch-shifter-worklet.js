/**
 * Pitch-Shifter AudioWorklet — vereinfachter Phase-Vocoder mit korrektem Ringpuffer
 * Pitch-Bereich: -1200 bis +1200 Cents
 * Algorithmus: STFT (Short-Time Fourier Transform) mit Phase-Synchronisierung
 * Latenz: ~46ms (FRAME_SIZE=2048 @ 44.1kHz)
 */

const FRAME_SIZE = 2048
const HOP_SIZE = 512          // 25% hop (75% overlap)
const FFT_SIZE = FRAME_SIZE

class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'pitchCents',
        defaultValue: 0,
        minValue: -2400,
        maxValue: 2400,
        automationRate: 'k-rate',
      },
    ]
  }

  constructor() {
    super()

    // Ringpuffer für Input (FRAME_SIZE):
    // Älteste Samples am Anfang, neuste am Ende
    this.inputRing = new Float32Array(FRAME_SIZE)
    this.inputRingPos = 0

    // Output-Ringpuffer (4x FRAME_SIZE für OLA-Akkumulation)
    this.outputRing = new Float32Array(FRAME_SIZE * 4)
    this.outputRingPos = 0

    // FFT-Buffer
    this.fftReal = new Float32Array(FFT_SIZE)
    this.fftImag = new Float32Array(FFT_SIZE)

    // Phase-Tracking für jeden Bin
    this.prevPhase = new Float32Array(FFT_SIZE / 2 + 1)
    this.phaseAccum = new Float32Array(FFT_SIZE / 2 + 1)

    // Hann-Fenster
    this.window = this._makeHannWindow(FRAME_SIZE)

    // Bit-Reversal für FFT
    this.bitReverse = this._makeBitReversal(FFT_SIZE)

    // Frame-Counter
    this.frameSampleCount = 0
  }

  _makeHannWindow(size) {
    const w = new Float32Array(size)
    for (let n = 0; n < size; n++) {
      w[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (size - 1)))
    }
    return w
  }

  _makeBitReversal(size) {
    const br = new Uint16Array(size)
    for (let i = 0; i < size; i++) {
      let j = 0
      let m = i
      for (let k = 1; k < size; k *= 2) {
        j = (j * 2) | (m & 1)
        m >>= 1
      }
      br[i] = j
    }
    return br
  }

  _fft(real, imag) {
    const N = real.length

    // Bit-reversal reordering
    for (let i = 0; i < N; i++) {
      const j = this.bitReverse[i]
      if (i < j) {
        let tmp = real[i]
        real[i] = real[j]
        real[j] = tmp
        tmp = imag[i]
        imag[i] = imag[j]
        imag[j] = tmp
      }
    }

    // Cooley-Tukey radix-2 FFT
    for (let stage = 1; stage <= Math.log2(N); stage++) {
      const stride = 1 << stage
      const halfStride = stride >> 1
      const angle = -2 * Math.PI / stride

      for (let offset = 0; offset < N; offset += stride) {
        for (let i = 0; i < halfStride; i++) {
          const aIdx = offset + i
          const bIdx = offset + i + halfStride

          // Twiddle factor (rotation)
          const wReal = Math.cos(angle * i)
          const wImag = Math.sin(angle * i)

          // Butterfly operation: b = b * w
          const bReal = real[bIdx] * wReal - imag[bIdx] * wImag
          const bImag = real[bIdx] * wImag + imag[bIdx] * wReal

          // Update
          real[bIdx] = real[aIdx] - bReal
          imag[bIdx] = imag[aIdx] - bImag
          real[aIdx] = real[aIdx] + bReal
          imag[aIdx] = imag[aIdx] + bImag
        }
      }
    }
  }

  _ifft(real, imag) {
    // Conjugate input
    for (let i = 0; i < real.length; i++) {
      imag[i] = -imag[i]
    }

    // FFT
    this._fft(real, imag)

    // Conjugate output and scale
    const scale = 1 / real.length
    for (let i = 0; i < real.length; i++) {
      real[i] *= scale
      imag[i] *= -scale
    }
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0]
    const output = outputs[0]?.[0]
    if (!input || !output) return true

    const pitchCents = parameters.pitchCents[0]
    const pitchRatio = Math.pow(2, pitchCents / 1200)

    // Bypass bei 440 Hz (0 Cents)
    if (Math.abs(pitchCents) < 0.5) {
      output.set(input)
      return true
    }

    // Verarbeite jeden eingehenden Sample
    for (let i = 0; i < input.length; i++) {
      // Schreibe in Input-Ringpuffer
      this.inputRing[this.inputRingPos] = input[i]
      this.inputRingPos = (this.inputRingPos + 1) % FRAME_SIZE
      this.frameSampleCount++

      // Wenn wir HOP_SIZE Samples haben: Frame verarbeiten
      if (this.frameSampleCount === HOP_SIZE) {
        this._processFrame(pitchRatio)
        this.frameSampleCount = 0
      }

      // Lese aus Output-Ringpuffer
      output[i] = this.outputRing[this.outputRingPos]
      this.outputRing[this.outputRingPos] = 0 // Clear für nächsten OLA
      this.outputRingPos = (this.outputRingPos + 1) % (FRAME_SIZE * 4)
    }

    return true
  }

  _processFrame(pitchRatio) {
    // 1. Kopiere Ringpuffer in lineares Array (älteste → neuste)
    const frame = new Float32Array(FRAME_SIZE)
    for (let i = 0; i < FRAME_SIZE; i++) {
      frame[i] = this.inputRing[(this.inputRingPos + i) % FRAME_SIZE]
    }

    // 2. Fenster anwenden
    for (let i = 0; i < FRAME_SIZE; i++) {
      frame[i] *= this.window[i]
    }

    // 3. FFT
    for (let i = 0; i < FFT_SIZE; i++) {
      this.fftReal[i] = frame[i]
      this.fftImag[i] = 0
    }
    this._fft(this.fftReal, this.fftImag)

    // 4. Phasen-Vocoder: Phase-Propagation mit Pitch-Shift
    const numBins = FFT_SIZE / 2 + 1
    const binHz = 44100 / FFT_SIZE // Hz pro Bin
    const expectedPhaseAdv = (2 * Math.PI * HOP_SIZE) / FFT_SIZE

    for (let k = 0; k < numBins; k++) {
      const real = this.fftReal[k]
      const imag = this.fftImag[k]

      // Magnitude
      const mag = Math.sqrt(real * real + imag * imag)

      // Phase
      const phase = Math.atan2(imag, real)

      // Phase-Differenz unwrapping
      let dPhase = phase - this.prevPhase[k]
      while (dPhase > Math.PI) dPhase -= 2 * Math.PI
      while (dPhase < -Math.PI) dPhase += 2 * Math.PI

      // True frequency
      const df = (dPhase / (2 * Math.PI) * 44100) / HOP_SIZE
      const trueFreq = k * binHz + df

      // Neue Phase nach Pitch-Shift
      const newPhase = this.phaseAccum[k] + (2 * Math.PI * trueFreq * HOP_SIZE) / 44100 * pitchRatio
      this.phaseAccum[k] = newPhase

      // Update FFT mit neuer Phase
      const shiftedPhase = newPhase % (2 * Math.PI)
      this.fftReal[k] = mag * Math.cos(shiftedPhase)
      this.fftImag[k] = mag * Math.sin(shiftedPhase)

      this.prevPhase[k] = phase
    }

    // Mirror für reelles Signal
    for (let k = numBins; k < FFT_SIZE; k++) {
      this.fftReal[k] = this.fftReal[FFT_SIZE - k]
      this.fftImag[k] = -this.fftImag[FFT_SIZE - k]
    }

    // 5. IFFT
    this._ifft(this.fftReal, this.fftImag)

    // 6. OLA (Overlap-Add) in Output-Ringpuffer
    const outStartIdx = (this.outputRingPos + FRAME_SIZE - HOP_SIZE) % (FRAME_SIZE * 4)
    for (let i = 0; i < FRAME_SIZE; i++) {
      const outIdx = (outStartIdx + i) % (FRAME_SIZE * 4)
      this.outputRing[outIdx] += this.fftReal[i] * this.window[i]
    }
  }
}

registerProcessor('pitch-shifter', PitchShifterProcessor)
