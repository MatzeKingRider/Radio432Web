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

const stored = localStorage.getItem(THEME_KEY)
const initial = THEME_IDS.includes(stored) ? stored : 'A'
applyTheme(initial)

const initialButtonMaterial = localStorage.getItem('radio432_button_material') || 'theme'
applyButtonMaterial(initialButtonMaterial)

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

  // Button-Material (Override für aktives Theme)
  buttonMaterial: initialButtonMaterial,
  setButtonMaterial: (m) => {
    localStorage.setItem('radio432_button_material', m)
    applyButtonMaterial(m)
    set({ buttonMaterial: m })
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
