import { useState } from 'react'
import { useFavoritesStore } from '../../store/favoritesStore'
import { useSettingsStore } from '../../store/settingsStore'
import { pairApi } from '../../api/client'
import ThemePicker from './ThemePicker'
import VUMeterPreview from './VUMeterPreview'
import SpectrumPreview from './SpectrumPreview'
import DisplayStylePicker from './DisplayStylePicker'
import QRCode from '../common/QRCode'

const VU_STYLES = [
  ['analogClassic', 'Analog Classic'],
  ['classic', 'Classic'],
  ['modernDark', 'Modern Dark'],
  ['neonArc', 'Neon Arc'],
  ['carbonPro', 'Carbon Pro'],
  ['studioUltra', 'Studio Ultra'],
  ['plasma', 'Plasma'],
  ['vintageBroadcast', 'Vintage Broadcast'],
  ['steelMirror', 'Steel Mirror'],
]

const SPECTRUM_STYLES = [
  ['classic', 'Classic LED'],
  ['neonGlow', 'Neon Glow'],
  ['carbonBlock', 'Carbon Block'],
  ['broadcast', 'Broadcast'],
  ['softBloom', 'Soft Bloom'],
  ['waveformPeaks', 'Waveform'],
  ['ledAmber', 'LED Amber'],
  ['deepOcean', 'Deep Ocean'],
]

const BUTTON_MATERIALS = [
  ['theme', 'Theme (auto)', 'var(--color-accent)', 'color-mix(in srgb, var(--color-accent) 60%, black)'],
  ['gold', 'Gold', '#E8C972', '#9C7A28'],
  ['aluminum', 'Aluminum', '#C8CDD4', '#7A8088'],
  ['bronze', 'Bronze', '#B89160', '#6E5430'],
  ['copper', 'Copper', '#D89466', '#8A4A28'],
  ['standard', 'Standard', 'var(--color-accent)', 'color-mix(in srgb, var(--color-accent) 60%, black)'],
]

const FREQUENCIES = [396, 417, 432, 440, 444, 528, 639, 741, 852, 963]

function SectionTitle({ children }) {
  return (
    <div className="px-4 pt-5 pb-1 text-[13px] font-semibold uppercase tracking-wide"
      style={{ color: 'var(--color-text-secondary)' }}>
      {children}
    </div>
  )
}

// Horizontaler Scroll mit Vorschau-Kacheln (Name + Farb-Preview).
function StyleScroller({ options, value, onChange, PreviewComponent, previewColor = '' }) {
  return (
    <div className="flex gap-3 px-4 py-2 overflow-x-auto scroll-area">
      {options.map(([id, name]) => {
        const isActive = value === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="shrink-0 w-28 rounded-xl p-3 flex flex-col gap-2 text-left transition-transform"
            style={{
              background: 'var(--color-surface)',
              border: isActive ? '2px solid var(--color-accent)' : '1px solid var(--color-separator)',
              transform: isActive ? 'scale(1.03)' : 'none',
            }}
          >
            <div className="h-10 rounded-lg overflow-hidden">
              {PreviewComponent ? (
                <PreviewComponent style={id} customColor={previewColor} />
              ) : (
                <div className="h-full w-full"
                  style={{ background: 'linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 30%, black))' }} />
              )}
            </div>
            <span className="text-[12px] font-medium leading-tight" style={{ color: 'var(--color-text)' }}>
              {name}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Einstellungen: Theme, Visualizer-Stile, Button-Material, Frequenz, Status.
export default function SettingsView() {
  const offline = useFavoritesStore((s) => s.offline)
  const vuStyle = useSettingsStore((s) => s.vuStyle)
  const setVuStyle = useSettingsStore((s) => s.setVuStyle)
  const spectrumStyle = useSettingsStore((s) => s.spectrumStyle)
  const setSpectrumStyle = useSettingsStore((s) => s.setSpectrumStyle)
  const accentOverride = useSettingsStore((s) => s.accentOverride)
  const setAccentOverride = useSettingsStore((s) => s.setAccentOverride)
  const buttonMaterial = useSettingsStore((s) => s.buttonMaterial)
  const setButtonMaterial = useSettingsStore((s) => s.setButtonMaterial)
  const cornerRadius = useSettingsStore((s) => s.cornerRadius)
  const setCornerRadius = useSettingsStore((s) => s.setCornerRadius)
  const panelFrameEnabled = useSettingsStore((s) => s.panelFrameEnabled)
  const setPanelFrameEnabled = useSettingsStore((s) => s.setPanelFrameEnabled)
  const peakEnabled = useSettingsStore((s) => s.peakEnabled)
  const setPeakEnabled = useSettingsStore((s) => s.setPeakEnabled)
  const peakColor = useSettingsStore((s) => s.peakColor)
  const setPeakColor = useSettingsStore((s) => s.setPeakColor)
  const peakHoldMs = useSettingsStore((s) => s.peakHoldMs)
  const setPeakHoldMs = useSettingsStore((s) => s.setPeakHoldMs)
  const frequency = useSettingsStore((s) => s.frequency)
  const setFrequency = useSettingsStore((s) => s.setFrequency)

  const [qrLoading, setQrLoading] = useState(false)
  const [qrData, setQrData] = useState(null)
  const [qrError, setQrError] = useState(null)

  const generateQR = async () => {
    setQrLoading(true)
    setQrError(null)
    try {
      const data = await pairApi.init()
      setQrData(data.qrData)
    } catch (err) {
      setQrError(
        err.status === 401 || err.status === 403
          ? 'Nicht angemeldet — Verbindung zum Backend nötig.'
          : 'QR-Code konnte nicht erzeugt werden.'
      )
    } finally {
      setQrLoading(false)
    }
  }

  return (
    <div className="pb-4">
      <SectionTitle>Design</SectionTitle>
      <ThemePicker />

      <SectionTitle>Display</SectionTitle>
      <div className="px-4 pt-1 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>Display-Stil</div>
      <DisplayStylePicker />

      <SectionTitle>Visualizer</SectionTitle>
      <div className="px-4 pt-1 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>VU-Meter Stil</div>
      <StyleScroller options={VU_STYLES} value={vuStyle} onChange={setVuStyle} PreviewComponent={VUMeterPreview} />
      <div className="px-4 pt-2 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>Spektrum-Analyser Stil</div>
      <StyleScroller options={SPECTRUM_STYLES} value={spectrumStyle} onChange={setSpectrumStyle} PreviewComponent={SpectrumPreview} />

      <SectionTitle>Spektrum Peak-Hold</SectionTitle>
      <div className="px-4 py-2 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px]" style={{ color: 'var(--color-text)' }}>Peak-Anzeige</span>
          <button
            onClick={() => setPeakEnabled(!peakEnabled)}
            role="switch"
            aria-checked={peakEnabled}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium"
            style={{
              background: peakEnabled ? 'var(--color-accent)' : 'var(--color-surface)',
              color: peakEnabled ? 'var(--btn-fg)' : 'var(--color-text)',
              border: '1px solid var(--color-separator)',
            }}
          >
            {peakEnabled ? 'An' : 'Aus'}
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px]" style={{ color: 'var(--color-text)' }}>Peak-Farbe</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPeakColor('')}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                background: !peakColor ? 'var(--color-accent)' : 'var(--color-surface)',
                color: !peakColor ? 'var(--btn-fg)' : 'var(--color-text)',
                border: '1px solid var(--color-separator)',
              }}
            >
              Auto
            </button>
            <input
              type="color"
              value={peakColor || '#FFFFFF'}
              onChange={(e) => setPeakColor(e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0"
              style={{ background: 'none' }}
              title="Peak-Farbe wählen"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px]" style={{ color: 'var(--color-text)' }}>Haltezeit</span>
          <div className="flex items-center gap-3 flex-1 max-w-[60%]">
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={peakHoldMs}
              onChange={(e) => setPeakHoldMs(parseInt(e.target.value, 10))}
              className="flex-1"
              style={{ accentColor: 'var(--color-accent)' }}
            />
            <span className="text-[13px] tabular-nums w-[64px] text-right" style={{ color: 'var(--color-text)' }}>
              {peakHoldMs} ms
            </span>
          </div>
        </div>
      </div>

      <SectionTitle>Akzentfarbe</SectionTitle>
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        <span className="text-[14px]" style={{ color: 'var(--color-text)' }}>Farbe für Visualizer, Rahmen & Display</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAccentOverride('')}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium"
            style={{
              background: !accentOverride ? 'var(--color-accent)' : 'var(--color-surface)',
              color: !accentOverride ? 'var(--btn-fg)' : 'var(--color-text)',
              border: '1px solid var(--color-separator)',
            }}
          >
            Theme-Standard
          </button>
          <input
            type="color"
            value={accentOverride || '#C9A84C'}
            onChange={(e) => setAccentOverride(e.target.value)}
            className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0"
            style={{ background: 'none' }}
            title="Akzentfarbe wählen"
          />
        </div>
      </div>

      <SectionTitle>Button-Material</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-4 py-2">
        {BUTTON_MATERIALS.map(([id, name, top, bottom]) => {
          const isActive = buttonMaterial === id
          return (
            <button
              key={id}
              onClick={() => setButtonMaterial(id)}
              className="rounded-xl p-3 flex flex-col gap-2 text-left transition-transform"
              style={{
                background: 'var(--color-surface)',
                border: isActive ? '2px solid var(--color-accent)' : '1px solid var(--color-separator)',
                transform: isActive ? 'scale(1.02)' : 'none',
              }}
            >
              <div className="h-9 rounded-lg" style={{ background: `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)` }} />
              <span className="text-[12px] font-medium" style={{ color: 'var(--color-text)' }}>{name}</span>
            </button>
          )
        })}
      </div>

      <SectionTitle>Eckenradius</SectionTitle>
      <div className="px-4 py-3 flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={60}
          step={1}
          value={cornerRadius}
          onChange={(e) => setCornerRadius(parseInt(e.target.value, 10))}
          className="flex-1"
          style={{ accentColor: 'var(--color-accent)' }}
          aria-label="Eckenradius"
        />
        <span className="text-[13px] tabular-nums w-[52px] text-right" style={{ color: 'var(--color-text)' }}>
          {cornerRadius} px
        </span>
        <div
          className="w-10 h-10 shrink-0"
          style={{
            background: 'linear-gradient(180deg, var(--btn-top), var(--btn-bottom))',
            border: '1px solid var(--btn-border)',
            borderRadius: 'var(--radius-global)',
          }}
        />
      </div>

      <SectionTitle>Bedienpanel</SectionTitle>
      <div className="px-4 py-2 flex items-center justify-between gap-3">
        <span className="text-[14px]" style={{ color: 'var(--color-text)' }}>Rahmen um die Bedienelemente</span>
        <button
          onClick={() => setPanelFrameEnabled(!panelFrameEnabled)}
          role="switch"
          aria-checked={panelFrameEnabled}
          className="px-3 py-1.5 rounded-full text-[12px] font-medium"
          style={{
            background: panelFrameEnabled ? 'var(--color-accent)' : 'var(--color-surface)',
            color: panelFrameEnabled ? 'var(--btn-fg)' : 'var(--color-text)',
            border: '1px solid var(--color-separator)',
          }}
        >
          {panelFrameEnabled ? 'An' : 'Aus'}
        </button>
      </div>

      <SectionTitle>Pitch-Shift Frequenz</SectionTitle>
      <div className="px-4 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
        Pitch-Shift ist im Browser aktiv und wird im Konto gespeichert.
      </div>
      <div className="flex gap-2 px-4 py-2 overflow-x-auto scroll-area">
        {FREQUENCIES.map((f) => {
          const isActive = frequency === f
          return (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className="shrink-0 px-4 py-2 rounded-full text-[13px] font-medium transition-colors"
              style={{
                background: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
                color: isActive ? 'var(--btn-fg)' : 'var(--color-text)',
                border: isActive ? '2px solid var(--color-accent)' : '1px solid var(--color-separator)',
              }}
            >
              {f} Hz{f === 440 ? ' (Standard)' : ''}
            </button>
          )
        })}
      </div>

      <SectionTitle>Mit Mobilgerät verbinden</SectionTitle>
      <div className="px-4 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
        QR-Code erzeugen und in der iOS-App scannen, um dieses Konto zu koppeln.
      </div>
      <div className="px-4 py-2 flex flex-col gap-3">
        <button
          onClick={generateQR}
          disabled={qrLoading}
          className="self-start px-4 py-2 rounded-full text-[13px] font-medium transition-colors disabled:opacity-60"
          style={{ background: 'var(--color-accent)', color: 'var(--btn-fg)' }}
        >
          {qrLoading ? 'Wird generiert…' : 'QR-Code generieren'}
        </button>

        {qrData && (
          <div
            className="flex flex-col items-center gap-2 p-4 rounded-xl self-start"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}
          >
            <QRCode text={qrData} size={224} />
            <p className="text-[12px] text-center" style={{ color: 'var(--color-text-secondary)' }}>
              In der iOS-App scannen zum Verbinden
            </p>
            <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              Gültig für 5 Minuten
            </p>
            <button
              onClick={() => setQrData(null)}
              className="text-[13px] underline"
              style={{ color: 'var(--color-text)' }}
            >
              Schließen
            </button>
          </div>
        )}

        {qrError && (
          <div
            className="px-3 py-2 rounded-lg text-[13px]"
            style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626' }}
          >
            {qrError}
          </div>
        )}
      </div>

      <SectionTitle>Status</SectionTitle>
      <div className="px-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
        {offline
          ? 'Backend nicht verbunden — Favoriten werden lokal gespeichert.'
          : 'Mit Backend verbunden.'}
      </div>
    </div>
  )
}
