import { useRef, useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useSettingsStore, THEME_IDS, THEME_NAMES } from '../../store/settingsStore'
import { fileToDownscaledDataURL } from '../../utils/imageResize'

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
  const activeCustomThemeId = useSettingsStore((s) => s.activeCustomThemeId)
  const customThemes = useSettingsStore((s) => s.customThemes)
  const setCustomTheme = useSettingsStore((s) => s.setCustomTheme)
  const addCustomTheme = useSettingsStore((s) => s.addCustomTheme)
  const removeCustomTheme = useSettingsStore((s) => s.removeCustomTheme)

  const [name, setName] = useState('')
  const [accent, setAccent] = useState('#C9A84C')
  const [bgImage, setBgImage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setBusy(true)
    try {
      const dataUrl = await fileToDownscaledDataURL(file, 1600, 0.8)
      setBgImage(dataUrl)
    } catch {
      setError('Bild konnte nicht verarbeitet werden.')
    } finally {
      setBusy(false)
    }
  }

  const handleSave = () => {
    setError('')
    const ok = addCustomTheme({ name: name.trim() || 'Eigenes Theme', accent, backgroundImage: bgImage })
    if (!ok) {
      setError('Speicher voll — Bild ist zu groß. Bitte kleineres Bild wählen.')
      return
    }
    setName('')
    setBgImage('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Standard-Themes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {THEME_IDS.map((id) => {
          const [bg, acc] = THEME_PREVIEW[id]
          const isActive = activeTheme === id && !activeCustomThemeId
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
                border: isActive ? `2px solid ${acc}` : '1px solid var(--color-separator)',
                transform: isActive ? 'scale(1.03)' : 'none',
              }}
            >
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full" style={{ background: acc }} />
              <span className="relative text-[11px] font-mono opacity-80" style={{ color: acc }}>{id}</span>
              <span className="relative text-[12px] font-semibold leading-tight"
                style={{ color: LIGHT_THEMES.has(id) ? '#1A1A1A' : '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
                {THEME_NAMES[id]}
              </span>
            </button>
          )
        })}
      </div>

      {/* Eigene Themes */}
      <div className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
        Eigene Themes
      </div>

      {customThemes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {customThemes.map((t) => {
            const isActive = activeCustomThemeId === t.id
            return (
              <div
                key={t.id}
                className="relative rounded-xl h-24 overflow-hidden"
                style={{
                  border: isActive ? `2px solid ${t.accent || 'var(--color-accent)'}` : '1px solid var(--color-separator)',
                  transform: isActive ? 'scale(1.03)' : 'none',
                }}
              >
                <button
                  onClick={() => setCustomTheme(t.id)}
                  className="absolute inset-0 p-3 flex flex-col justify-end text-left"
                  style={{
                    background: t.backgroundImage ? `url('${t.backgroundImage}')` : 'var(--color-surface)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <span className="relative text-[12px] font-semibold leading-tight"
                    style={{ color: '#FFFFFF', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                    {t.name}
                  </span>
                </button>
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
                  style={{ background: t.accent || 'var(--color-accent)' }} />
                <button
                  onClick={() => removeCustomTheme(t.id)}
                  className="absolute top-1.5 left-1.5 p-1 rounded-md"
                  style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
                  title="Theme löschen"
                  aria-label={`Theme ${t.name} löschen`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Neues Custom-Theme anlegen */}
      <div className="rounded-xl p-3 flex flex-col gap-3"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-separator)' }}
          />
          <input
            type="color"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
            className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0"
            style={{ background: 'none' }}
            title="Akzentfarbe"
          />
        </div>
        <div className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile}
            className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }} />
          {bgImage && (
            <img src={bgImage} alt="Vorschau" className="w-12 h-8 object-cover rounded-md"
              style={{ border: '1px solid var(--color-separator)' }} />
          )}
        </div>
        {error && <div className="text-[12px]" style={{ color: '#dc2626' }}>{error}</div>}
        <button
          onClick={handleSave}
          disabled={busy}
          className="self-start inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium disabled:opacity-60"
          style={{ background: 'var(--color-accent)', color: 'var(--btn-fg)' }}
        >
          <Plus size={15} /> {busy ? 'Verarbeite…' : 'Theme speichern'}
        </button>
      </div>
    </div>
  )
}
