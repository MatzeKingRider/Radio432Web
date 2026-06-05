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

const BUTTON_RADIUS_MAP = {
  square: '0px',
  slight: '8px',
  rounded: '16px',
  pill: '100px',
}

function applyButtonCornerRadius(value) {
  const radius = BUTTON_RADIUS_MAP[value] || BUTTON_RADIUS_MAP.rounded
  document.documentElement.style.setProperty('--radius-button', radius)
}

const stored = localStorage.getItem(THEME_KEY)
const initial = THEME_IDS.includes(stored) ? stored : 'A'
applyTheme(initial)

const initialButtonMaterial = localStorage.getItem('radio432_button_material') || 'theme'
applyButtonMaterial(initialButtonMaterial)

const initialButtonCornerRadius = localStorage.getItem('radio432_button_corner_radius') || 'rounded'
applyButtonCornerRadius(initialButtonCornerRadius)

export const useSettingsStore = create((set) => ({
  activeTheme: initial,
  setTheme: (id) => {
    if (!THEME_IDS.includes(id)) return
    localStorage.setItem(THEME_KEY, id)
    applyTheme(id)
    set({ activeTheme: id })
  },

  // VU-Meter Stil
  vuStyle: localStorage.getItem('radio432_vu_style') || 'analogClassic',
  setVuStyle: (s) => { localStorage.setItem('radio432_vu_style', s); set({ vuStyle: s }) },

  // Spektrum-Analyser Stil
  spectrumStyle: localStorage.getItem('radio432_spectrum_style') || 'classic',
  setSpectrumStyle: (s) => { localStorage.setItem('radio432_spectrum_style', s); set({ spectrumStyle: s }) },

  // Visualizer-Farben — '' bedeutet accent-Farbe des aktiven Themes nutzen
  vuColor:        localStorage.getItem('radio432_vu_color')        || '',
  setVuColor:     (c) => { localStorage.setItem('radio432_vu_color', c);        set({ vuColor: c }) },
  spectrumColor:  localStorage.getItem('radio432_spectrum_color')  || '',
  setSpectrumColor:(c) => { localStorage.setItem('radio432_spectrum_color', c); set({ spectrumColor: c }) },

  // Button-Material (Override für aktives Theme)
  buttonMaterial: initialButtonMaterial,
  setButtonMaterial: (m) => {
    localStorage.setItem('radio432_button_material', m)
    applyButtonMaterial(m)
    set({ buttonMaterial: m })
  },

  // Button-Eckenradius (Form der Buttons)
  buttonCornerRadius: initialButtonCornerRadius,
  setButtonCornerRadius: (value) => {
    localStorage.setItem('radio432_button_corner_radius', value)
    applyButtonCornerRadius(value)
    set({ buttonCornerRadius: value })
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
