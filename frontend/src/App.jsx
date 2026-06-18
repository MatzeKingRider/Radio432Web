import { useState, useEffect } from 'react'
import Player from './components/Player/Player'
import FullscreenPlayer from './components/Player/FullscreenPlayer'
import TabBar from './components/common/TabBar'
import ThemedBackground from './components/common/ThemedBackground'
import FavoritesList from './components/Favorites/FavoritesList'
import SearchView from './components/Search/SearchView'
import SettingsView from './components/Settings/SettingsView'
import { usePlayerStore } from './store/playerStore'
import { useSettingsStore } from './store/settingsStore'
import { useFavoritesStore } from './store/favoritesStore'
import { useAudio } from './hooks/useAudio'

export default function App() {
  const [tab, setTab] = useState('favorites')
  const [showFullscreen, setShowFullscreen] = useState(false)
  const { play, stop } = useAudio()

  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentStation = usePlayerStore((s) => s.currentStation)
  const setStation = usePlayerStore((s) => s.setStation)
  const loadFrequency = useSettingsStore((s) => s.loadFrequency)
  const favorites = useFavoritesStore((s) => s.favorites)

  // Frequenz beim Start vom Backend laden.
  useEffect(() => { loadFrequency() }, [loadFrequency])

  // Sender aus Liste/Suche starten.
  function handlePlay(station) {
    if (currentStation?.id === station.id && isPlaying) {
      stop()
      return
    }
    setStation(station)
    play(station.url)
  }

  // Play/Stop-Button im Player.
  function handleToggle() {
    if (!currentStation) return
    if (isPlaying) stop()
    else play(currentStation.url)
  }

  // In der Favoritenliste zum vorherigen/nächsten Sender springen (mit Wrap-Around).
  function playByOffset(offset) {
    if (favorites.length === 0) return
    const idx = favorites.findIndex((f) => f.id === currentStation?.id)
    const base = idx === -1 ? 0 : idx
    const next = (base + offset + favorites.length) % favorites.length
    const station = favorites[next]
    setStation(station)
    play(station.url)
  }
  function handlePrev() { playByOffset(-1) }
  function handleNext() { playByOffset(1) }

  return (
    <div className="flex flex-col h-full">
      <ThemedBackground />

      <Player onToggle={handleToggle} onExpand={() => currentStation && setShowFullscreen(true)} />

      <main className="flex-1 scroll-area">
        {tab === 'favorites' && <FavoritesList onPlay={handlePlay} />}
        {tab === 'search' && <SearchView onPlay={handlePlay} />}
        {tab === 'settings' && <SettingsView />}
      </main>

      <TabBar active={tab} onChange={setTab} />

      <FullscreenPlayer
        open={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        onToggle={handleToggle}
        onStop={stop}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  )
}
