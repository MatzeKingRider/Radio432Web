import { useFavoritesStore } from '../../store/favoritesStore'
import { useSettingsStore } from '../../store/settingsStore'
import ThemePicker from './ThemePicker'
import VUMeterPreview from './VUMeterPreview'
import SpectrumPreview from './SpectrumPreview'

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
  const vuColor = useSettingsStore((s) => s.vuColor)
  const setVuColor = useSettingsStore((s) => s.setVuColor)
  const spectrumColor = useSettingsStore((s) => s.spectrumColor)
  const setSpectrumColor = useSettingsStore((s) => s.setSpectrumColor)
  const buttonMaterial = useSettingsStore((s) => s.buttonMaterial)
  const setButtonMaterial = useSettingsStore((s) => s.setButtonMaterial)
  const frequency = useSettingsStore((s) => s.frequency)
  const setFrequency = useSettingsStore((s) => s.setFrequency)

  return (
    <div className="pb-4">
      <SectionTitle>Design</SectionTitle>
      <ThemePicker />

      <SectionTitle>Visualizer</SectionTitle>
      <div className="px-4 pt-1 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>VU-Meter Stil</div>
      <StyleScroller options={VU_STYLES} value={vuStyle} onChange={setVuStyle} PreviewComponent={VUMeterPreview} previewColor={vuColor} />
      <div className="px-4 pt-2 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>Spektrum-Analyser Stil</div>
      <StyleScroller options={SPECTRUM_STYLES} value={spectrumStyle} onChange={setSpectrumStyle} PreviewComponent={SpectrumPreview} previewColor={spectrumColor} />

      <SectionTitle>Visualizer-Farbe</SectionTitle>
      <div className="px-4 py-2 flex flex-col gap-3">
        {/* VU-Meter Farbe */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px]" style={{ color: 'var(--color-text)' }}>VU-Meter</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVuColor('')}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                background: !vuColor ? 'var(--color-accent)' : 'var(--color-surface)',
                color: !vuColor ? 'var(--btn-fg)' : 'var(--color-text)',
                border: '1px solid var(--color-separator)',
              }}
            >
              Theme
            </button>
            <input
              type="color"
              value={vuColor || '#C9A84C'}
              onChange={(e) => setVuColor(e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0"
              style={{ background: 'none' }}
              title="VU-Meter Farbe wählen"
            />
          </div>
        </div>
        {/* Spektrum-Analyser Farbe */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[14px]" style={{ color: 'var(--color-text)' }}>Spektrum</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSpectrumColor('')}
              className="px-3 py-1.5 rounded-full text-[12px] font-medium"
              style={{
                background: !spectrumColor ? 'var(--color-accent)' : 'var(--color-surface)',
                color: !spectrumColor ? 'var(--btn-fg)' : 'var(--color-text)',
                border: '1px solid var(--color-separator)',
              }}
            >
              Theme
            </button>
            <input
              type="color"
              value={spectrumColor || '#1ED12E'}
              onChange={(e) => setSpectrumColor(e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0"
              style={{ background: 'none' }}
              title="Spektrum Farbe wählen"
            />
          </div>
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

      <SectionTitle>Pitch-Shift Frequenz</SectionTitle>
      <div className="px-4 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
        Wird in der iOS-App angewendet. Im Browser gespeichert.
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

      <SectionTitle>Status</SectionTitle>
      <div className="px-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
        {offline
          ? 'Backend nicht verbunden — Favoriten werden lokal gespeichert.'
          : 'Mit Backend verbunden.'}
      </div>
    </div>
  )
}
