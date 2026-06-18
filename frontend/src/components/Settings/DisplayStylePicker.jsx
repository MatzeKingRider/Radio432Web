import { useSettingsStore, DISPLAY_STYLES } from '../../store/settingsStore'
import Display from '../Player/Display'

// Beispieldaten für die Vorschau-Kacheln.
const SAMPLE = {
  station: 'RADIO PARADISE',
  title: 'Bohemian Rhapsody',
  artist: 'Queen',
  frequency: 432,
}

// Mini-Vorschau: rendert die echte Display-Komponente verkleinert (CSS-scale),
// damit der Nutzer den realen Stil sieht.
function StylePreview({ id }) {
  // Display ist intern 170px hoch und 100% breit. Wir packen es in einen
  // Container mit fester Breite und skalieren herunter.
  const previewW = 320 // virtuelle Render-Breite
  const scale = 0.42
  return (
    <div
      style={{
        width: previewW * scale,
        height: 170 * scale,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div style={{ width: previewW, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <Display style={id} {...SAMPLE} />
      </div>
    </div>
  )
}

export default function DisplayStylePicker() {
  const displayStyle = useSettingsStore((s) => s.displayStyle)
  const setDisplayStyle = useSettingsStore((s) => s.setDisplayStyle)

  return (
    <div className="flex gap-3 px-4 py-2 overflow-x-auto scroll-area">
      {DISPLAY_STYLES.map(([id, name]) => {
        const isActive = displayStyle === id
        return (
          <button
            key={id}
            onClick={() => setDisplayStyle(id)}
            className="shrink-0 rounded-xl p-2 flex flex-col gap-2 text-left transition-transform"
            style={{
              background: 'var(--color-surface)',
              border: isActive ? '2px solid var(--color-accent)' : '1px solid var(--color-separator)',
              transform: isActive ? 'scale(1.03)' : 'none',
            }}
          >
            <div className="rounded-lg overflow-hidden">
              <StylePreview id={id} />
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
