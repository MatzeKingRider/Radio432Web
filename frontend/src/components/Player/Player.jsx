import NowPlaying from './NowPlaying'
import Controls from './Controls'
import VUMeter from './VUMeter'
import SpectrumAnalyzer from './SpectrumAnalyzer'
import { useSettingsStore } from '../../store/settingsStore'

// Sticky-Player oben: NowPlaying + Visualizer-Reihe (VU-L | Spektrum | VU-R) + Lautstärke.
export default function Player({ onToggle, onExpand }) {
  const vuStyle = useSettingsStore((s) => s.vuStyle)
  const spectrumStyle = useSettingsStore((s) => s.spectrumStyle)
  const vuColor = useSettingsStore((s) => s.vuColor)
  const spectrumColor = useSettingsStore((s) => s.spectrumColor)

  return (
    <div
      className="shrink-0 safe-top"
      style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-separator)' }}
    >
      <NowPlaying onToggle={onToggle} onExpand={onExpand} />

      {/* Visualizer: VU-Meter nebeneinander, Spektrum darunter in voller Breite */}
      <div className="flex flex-col gap-2 px-4 pt-3 w-full">
        {/* VU-Meter-Reihe: beide gleich breit */}
        <div className="flex gap-2 h-[80px] sm:h-[100px]">
          <div className="flex-1" style={{ aspectRatio: '4 / 3' }}>
            <VUMeter label="L" style={vuStyle} customColor={vuColor} />
          </div>
          <div className="flex-1" style={{ aspectRatio: '4 / 3' }}>
            <VUMeter label="R" style={vuStyle} customColor={vuColor} />
          </div>
        </div>

        {/* Spektrum-Reihe: volle Breite */}
        <div className="h-[80px] sm:h-[100px] w-full">
          <SpectrumAnalyzer style={spectrumStyle} customColor={spectrumColor} />
        </div>
      </div>

      <Controls />
    </div>
  )
}
