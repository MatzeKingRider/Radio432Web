import { create } from 'zustand'
import { settingsApi } from '../api/client'

const THEME_KEY = 'radio432_theme'

export const THEME_IDS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S']

// Theme-Namen 1:1 aus iOS AppTheme.label
export const THEME_NAMES = {
  A: 'Dark Luxury',
  B: 'Mitternacht + Orange',
  C: 'Modern Hell',
  D: 'Studio Anthrazit',
  E: 'Warm Analog',
  F: 'Black Wood + Alu',
  G: 'Nussbaum',
  H: 'Navy Royal',
  I: 'Forest Fire',
  J: 'Olive Storm',
  K: 'Cognac Leather',
  L: 'Onyx Leather',
  M: 'Carbon Blue',
  N: 'Schiefer',
  O: 'Cortenstahl',
  P: 'Walnut Burl',
  Q: 'Burl Amber',
  R: 'Stahl genietet',
  S: 'Kupfer',
}

// Liste der 10 Display-Stile (id + Label), passend zu den Klassen in Display.jsx
// (1:1 aus mockups/display-mockups.html).
export const DISPLAY_STYLES = [
  ['vfd',      'VFD Grün/Cyan'],
  ['amber',    'Bernstein 7-Segment'],
  ['lcd',      'LCD Blau (Backlit)'],
  ['oled',     'OLED Minimal'],
  ['nixie',    'Nixie-Röhre'],
  ['dot',      'Plasma / Dot-Matrix'],
  ['chrome',   'Chrome / Hi-Fi-Skala'],
  ['tuner',    'Tuner-Frequenzband'],
  ['cassette', 'Cassette-Deck'],
  ['term',     'Terminal / Phosphor-Grün'],
]

const DISPLAY_STYLE_IDS = DISPLAY_STYLES.map(([id]) => id)

// ---------------------------------------------------------------------------
// localStorage-Keys
// ---------------------------------------------------------------------------
const CORNER_RADIUS_KEY   = 'radio432_corner_radius'
const ACCENT_OVERRIDE_KEY = 'radio432_accent_override'
const CUSTOM_THEMES_KEY   = 'radio432_custom_themes'
const PEAK_ENABLED_KEY    = 'radio432_peak_enabled'
const PEAK_COLOR_KEY      = 'radio432_peak_color'
const PEAK_HOLD_KEY       = 'radio432_peak_hold_ms'
const PANEL_FRAME_KEY     = 'radio432_panel_frame'
const DISPLAY_STYLE_KEY   = 'radio432_display_style'
// Alt-Keys (Migration)
const OLD_RADIUS_KEY      = 'radio432_button_corner_radius'
const OLD_VU_COLOR_KEY    = 'radio432_vu_color'
const OLD_SPEC_COLOR_KEY  = 'radio432_spectrum_color'

// ---------------------------------------------------------------------------
// Apply-Funktionen (setzen CSS-Variablen auf <html>)
// ---------------------------------------------------------------------------
function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id)
}

function applyButtonMaterial(m) {
  if (!m || m === 'theme') {
    document.documentElement.removeAttribute('data-button-material')
  } else {
    document.documentElement.setAttribute('data-button-material', m)
  }
}

// EINE globale Radius-Variable für alles (Buttons, Panels, Display, Visualizer).
function applyCornerRadius(px) {
  const v = Number.isFinite(px) ? px : 10
  document.documentElement.style.setProperty('--radius-global', v + 'px')
}

// EINE überschreibbare Akzentfarbe. Leer => Theme-Standard (Variable löschen).
function applyAccentOverride(color) {
  if (color && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
    document.documentElement.style.setProperty('--color-accent', color)
  } else {
    document.documentElement.style.removeProperty('--color-accent')
  }
}

// ---------------------------------------------------------------------------
// Migration alter Keys (einmalig)
// ---------------------------------------------------------------------------
const OLD_RADIUS_MAP = { square: 0, slight: 8, rounded: 16, pill: 100 }

function migrateCornerRadius() {
  const existing = localStorage.getItem(CORNER_RADIUS_KEY)
  if (existing !== null) return parseFloat(existing)
  const old = localStorage.getItem(OLD_RADIUS_KEY)
  if (old !== null && old in OLD_RADIUS_MAP) {
    const px = OLD_RADIUS_MAP[old]
    localStorage.setItem(CORNER_RADIUS_KEY, String(px))
    localStorage.removeItem(OLD_RADIUS_KEY)
    return px
  }
  return 10 // Default
}

function migrateAccentOverride() {
  const existing = localStorage.getItem(ACCENT_OVERRIDE_KEY)
  if (existing !== null) return existing
  // Alte getrennte Farben zusammenführen: VU bevorzugt, sonst Spectrum.
  const oldVu = localStorage.getItem(OLD_VU_COLOR_KEY)
  const oldSpec = localStorage.getItem(OLD_SPEC_COLOR_KEY)
  const merged = (oldVu && oldVu.trim()) || (oldSpec && oldSpec.trim()) || ''
  if (oldVu !== null || oldSpec !== null) {
    localStorage.setItem(ACCENT_OVERRIDE_KEY, merged)
    localStorage.removeItem(OLD_VU_COLOR_KEY)
    localStorage.removeItem(OLD_SPEC_COLOR_KEY)
  }
  return merged
}

function loadCustomThemes() {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function persistCustomThemes(list) {
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(list))
    return true
  } catch {
    // localStorage-Limit gesprengt (zu große Bilder)
    return false
  }
}

// ---------------------------------------------------------------------------
// Initialisierung
// ---------------------------------------------------------------------------
const stored = localStorage.getItem(THEME_KEY)
const initialTheme = THEME_IDS.includes(stored) ? stored : 'A'
applyTheme(initialTheme)

const initialButtonMaterial = localStorage.getItem('radio432_button_material') || 'theme'
applyButtonMaterial(initialButtonMaterial)

const initialCornerRadius = migrateCornerRadius()
applyCornerRadius(initialCornerRadius)

const initialAccentOverride = migrateAccentOverride()
applyAccentOverride(initialAccentOverride)

const initialCustomThemes = loadCustomThemes()

const initialPeakEnabled = localStorage.getItem(PEAK_ENABLED_KEY)
const peakEnabledStart = initialPeakEnabled === null ? true : initialPeakEnabled === 'true'
const peakColorStart = localStorage.getItem(PEAK_COLOR_KEY) || ''
const peakHoldStart = (() => {
  const v = parseInt(localStorage.getItem(PEAK_HOLD_KEY), 10)
  return Number.isFinite(v) ? v : 500
})()

const initialPanelFrame = localStorage.getItem(PANEL_FRAME_KEY)
const panelFrameStart = initialPanelFrame === null ? true : initialPanelFrame === 'true'

const storedDisplayStyle = localStorage.getItem(DISPLAY_STYLE_KEY)
const displayStyleStart = DISPLAY_STYLE_IDS.includes(storedDisplayStyle) ? storedDisplayStyle : 'vfd'

// Falls beim Start ein Custom-Theme aktiv war, dessen Accent/Background anwenden.
function applyCustomTheme(theme) {
  if (!theme) return
  if (theme.accent) {
    document.documentElement.style.setProperty('--color-accent', theme.accent)
  }
  if (theme.backgroundImage) {
    document.documentElement.style.setProperty('--texture-url', `url('${theme.backgroundImage}')`)
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useSettingsStore = create((set, get) => ({
  activeTheme: initialTheme,
  // ID eines aktiven Custom-Themes (oder null wenn Standard-Theme aktiv)
  activeCustomThemeId: null,

  setTheme: (id) => {
    if (!THEME_IDS.includes(id)) return
    localStorage.setItem(THEME_KEY, id)
    applyTheme(id)
    // Standard-Theme aktiv -> evtl. von Custom-Theme gesetztes Bild zurücksetzen,
    // Accent-Override wieder anwenden (oder Theme-Standard).
    document.documentElement.style.removeProperty('--texture-url')
    applyAccentOverride(get().accentOverride)
    set({ activeTheme: id, activeCustomThemeId: null })
  },

  // Custom-Theme als aktives Theme wählen: setzt Accent + Hintergrundbild.
  setCustomTheme: (themeId) => {
    const theme = get().customThemes.find((t) => t.id === themeId)
    if (!theme) return
    applyCustomTheme(theme)
    set({ activeCustomThemeId: themeId })
  },

  // --- Custom-Themes (mehrere) ---
  customThemes: initialCustomThemes,
  // theme: { name, accent, backgroundImage(DataURL, bereits herunterskaliert) }
  // Gibt true bei Erfolg, false wenn localStorage-Limit gesprengt wurde.
  addCustomTheme: (theme) => {
    const id = 'ct_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const entry = {
      id,
      name: theme.name || 'Eigenes Theme',
      accent: theme.accent || '',
      backgroundImage: theme.backgroundImage || '',
    }
    const next = [...get().customThemes, entry]
    const ok = persistCustomThemes(next)
    if (ok) set({ customThemes: next })
    return ok
  },
  removeCustomTheme: (id) => {
    const next = get().customThemes.filter((t) => t.id !== id)
    persistCustomThemes(next)
    const patch = { customThemes: next }
    if (get().activeCustomThemeId === id) {
      // Aktives Custom-Theme gelöscht -> zurück auf Standard-Theme.
      patch.activeCustomThemeId = null
      document.documentElement.style.removeProperty('--texture-url')
      applyAccentOverride(get().accentOverride)
    }
    set(patch)
  },

  // VU-Meter Stil
  vuStyle: localStorage.getItem('radio432_vu_style') || 'analogClassic',
  setVuStyle: (s) => { localStorage.setItem('radio432_vu_style', s); set({ vuStyle: s }) },

  // Spektrum-Analyser Stil
  spectrumStyle: localStorage.getItem('radio432_spectrum_style') || 'classic',
  setSpectrumStyle: (s) => { localStorage.setItem('radio432_spectrum_style', s); set({ spectrumStyle: s }) },

  // EINE Akzentfarbe (Override). '' = Theme-Standardfarbe.
  accentOverride: initialAccentOverride,
  setAccentOverride: (c) => {
    const val = c || ''
    localStorage.setItem(ACCENT_OVERRIDE_KEY, val)
    applyAccentOverride(val)
    set({ accentOverride: val })
  },

  // Rückwärtskompatibel: VU/Spectrum lesen jetzt dieselbe Akzentfarbe.
  // '' => Komponenten nutzen CSS var(--color-accent), die per accentOverride
  // bereits gesetzt wird. (Bestehende Selektoren s.vuColor/s.spectrumColor bleiben gültig.)
  vuColor: '',
  spectrumColor: '',

  // Button-Material (Override für aktives Theme)
  buttonMaterial: initialButtonMaterial,
  setButtonMaterial: (m) => {
    localStorage.setItem('radio432_button_material', m)
    applyButtonMaterial(m)
    set({ buttonMaterial: m })
  },

  // Globaler Eckenradius (stufenlos, px)
  cornerRadius: initialCornerRadius,
  setCornerRadius: (px) => {
    const v = Math.max(0, Math.round(px))
    localStorage.setItem(CORNER_RADIUS_KEY, String(v))
    applyCornerRadius(v)
    set({ cornerRadius: v })
  },

  // Display-Stil
  displayStyle: displayStyleStart,
  setDisplayStyle: (s) => {
    if (!DISPLAY_STYLE_IDS.includes(s)) return
    localStorage.setItem(DISPLAY_STYLE_KEY, s)
    set({ displayStyle: s })
  },

  // Spectrum Peak-Hold
  peakEnabled: peakEnabledStart,
  setPeakEnabled: (v) => {
    localStorage.setItem(PEAK_ENABLED_KEY, String(!!v))
    set({ peakEnabled: !!v })
  },
  peakColor: peakColorStart,
  setPeakColor: (c) => {
    const val = c || ''
    localStorage.setItem(PEAK_COLOR_KEY, val)
    set({ peakColor: val })
  },
  peakHoldMs: peakHoldStart,
  setPeakHoldMs: (ms) => {
    const v = Math.max(100, Math.min(2000, Math.round(ms)))
    localStorage.setItem(PEAK_HOLD_KEY, String(v))
    set({ peakHoldMs: v })
  },

  // Bedienpanel-Rahmen
  panelFrameEnabled: panelFrameStart,
  setPanelFrameEnabled: (v) => {
    localStorage.setItem(PANEL_FRAME_KEY, String(!!v))
    set({ panelFrameEnabled: !!v })
  },

  // Frequenz (sync mit Backend)
  frequency: 432,
  setFrequency: async (f) => {
    set({ frequency: f })
    try { await settingsApi.setFrequency(f) } catch {}
  },
  loadFrequency: async () => {
    try {
      const data = await settingsApi.get()
      if (data?.frequency) set({ frequency: data.frequency })
    } catch {}
  },
}))
