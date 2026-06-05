import { create } from 'zustand'

const VOLUME_KEY = 'radio432_volume'

const storedVolume = parseFloat(localStorage.getItem(VOLUME_KEY))
const initialVolume = Number.isFinite(storedVolume) ? storedVolume : 0.8

export const usePlayerStore = create((set) => ({
  currentStation: null, // { id, name, url, favicon }
  isPlaying: false,
  volume: initialVolume,
  analyserNode: null,
  simulatedMode: false,
  error: null,
  nowPlayingTitle: null,
  nowPlayingArtist: null,

  setStation: (station) => set({ currentStation: station, error: null }),
  setNowPlayingMetadata: (title, artist) => set({ nowPlayingTitle: title, nowPlayingArtist: artist }),
  setPlaying: (v) => set({ isPlaying: v }),
  setVolume: (v) => {
    localStorage.setItem(VOLUME_KEY, v)
    set({ volume: v })
  },
  setAnalyser: (node) => set({ analyserNode: node }),
  setSimulated: (v) => set({ simulatedMode: v }),
  setError: (e) => set({ error: e }),
}))
