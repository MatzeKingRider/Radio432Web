import { useSettingsStore, THEME_IDS, THEME_NAMES } from '../../store/settingsStore'

// Theme-Vorschau pro Kachel: liest die CSS-Variablen aus einem versteckten
// Element mit data-theme=<id>, damit Hintergrund + Akzent original wirken.
const THEME_PREVIEW = {
  A: ['#0A0A08', '#C9A84C'], B: ['#0A0E18', '#E87722'], C: ['#F2F2F7', '#1A7B6B'],
  D: ['#1A1810', '#D4890A'], E: ['#1C0C04', '#C8922A'], F: ['#0E0E0E', '#C8CDD4'],
  G: ['#2A1A08', '#C8CDD4'], H: ['#0D1528', '#C9A84C'], I: ['#0C1A0A', '#E87722'],
  J: ['#151A08', '#D4890A'], K: ['#1A0A02', '#C4803A'], L: ['#080606', '#8A9BA8'],
  M: ['#06080C', '#4A9FE0'], N: ['#080A0C', '#3A7FCC'], O: ['#120A04', '#E07020'],
  P: ['#0A0806', '#C9A84C'], Q: ['#180A02', '#C87830'], R: ['#060810', '#8090A8'],
  S: ['#120800', '#B87040'],
}

// Textur-Vorschau pro Theme (aus public/textures). Themes ohne Eintrag bleiben
// einfarbig.
const THEME_TEXTURE = {
  F: 'BlackWoodTexture.png',
  G: 'WalnutWoodTexture.png',
  H: 'TextileNavyTexture.png',
  I: 'TextileForestTexture.png',
  J: 'TextileOliveTexture.png',
  K: 'CognacLeatherTexture.png',
  L: 'BlackLeatherTexture.png',
  M: 'CarbonTexture.png',
  N: 'SlateTexture.png',
  O: 'CortenSteelTexture.png',
  P: 'WalnutBurlTexture.png',
  Q: 'WalnutBurlWarmTexture.png',
  R: 'RivetedSteelTexture.png',
  S: 'CopperTexture.png',
}

// Helle Themes (--theme-light: 1 in themes.css) brauchen dunklen Text statt weiß.
const LIGHT_THEMES = new Set(['C'])

export default function ThemePicker() {
  const activeTheme = useSettingsStore((s) => s.activeTheme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
      {THEME_IDS.map((id) => {
        const [bg, accent] = THEME_PREVIEW[id]
        const isActive = activeTheme === id
        return (
          <button
            key={id}
            onClick={() => setTheme(id)}
            className="relative rounded-xl p-3 h-24 flex flex-col justify-end text-left transition-transform overflow-hidden"
            style={{
              background: bg,
              backgroundImage: THEME_TEXTURE[id] ? `url('/textures/${THEME_TEXTURE[id]}')` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: isActive ? `2px solid ${accent}` : '1px solid var(--color-separator)',
              transform: isActive ? 'scale(1.03)' : 'none',
            }}
          >
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
            <span className="relative text-[11px] font-mono opacity-80" style={{ color: accent }}>{id}</span>
            <span className="relative text-[12px] font-semibold leading-tight"
              style={{ color: LIGHT_THEMES.has(id) ? '#1A1A1A' : '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
              {THEME_NAMES[id]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
