import { create } from 'zustand'
import { favoritesApi } from '../api/client'

// Favoriten-Store mit Optimistic Updates.
// Fällt auf reinen Local-State zurück, wenn das Backend nicht erreichbar
// oder nicht authentifiziert ist (z.B. lokale Entwicklung ohne Cloudflare-Access).

const LOCAL_KEY = 'radio432_favorites_local'

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []
  } catch {
    return []
  }
}
function saveLocal(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items))
}

let reorderTimer = null

export const useFavoritesStore = create((set, get) => ({
  favorites: [],
  loading: false,
  offline: false, // true wenn Backend nicht nutzbar -> Local-Fallback aktiv

  fetch: async () => {
    set({ loading: true })
    try {
      const rows = await favoritesApi.list()
      set({ favorites: rows, loading: false, offline: false })
    } catch (e) {
      // Backend nicht verfügbar/authentifiziert -> Local-Fallback
      set({ favorites: loadLocal(), loading: false, offline: true })
    }
  },

  add: async (station) => {
    const current = get().favorites
    if (current.some((f) => f.id === station.id)) return
    const optimistic = [...current, { ...station, sort_order: current.length }]
    set({ favorites: optimistic })
    if (get().offline) {
      saveLocal(optimistic)
      return
    }
    try {
      await favoritesApi.add({
        id: station.id,
        name: station.name,
        url: station.url,
        favicon: station.favicon || null,
      })
    } catch {
      set({ offline: true })
      saveLocal(optimistic)
    }
  },

  remove: async (id) => {
    const next = get().favorites.filter((f) => f.id !== id)
    set({ favorites: next })
    if (get().offline) {
      saveLocal(next)
      return
    }
    try {
      await favoritesApi.remove(id)
    } catch {
      set({ offline: true })
      saveLocal(next)
    }
  },

  reorder: (items) => {
    set({ favorites: items })
    if (get().offline) {
      saveLocal(items)
      return
    }
    clearTimeout(reorderTimer)
    reorderTimer = setTimeout(() => {
      favoritesApi.reorder(items.map((f) => f.id)).catch(() => {
        set({ offline: true })
        saveLocal(get().favorites)
      })
    }, 500)
  },
}))
