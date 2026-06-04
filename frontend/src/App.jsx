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
import { useAudio } from './hooks/useAudio'

export default function App() {
  const [tab, setTab] = useState('favorites')
  const [showFullscreen, setShowFullscreen] = useState(false)
  const { play, stop } = useAudio()

  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const currentStation = usePlayerStore((s) => s.currentStation)
  const setStation = usePlayerStore((s) => s.setStation)
  const loadFrequency = useSettingsStore((s) => s.loadFrequency)

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
      />
    </div>
  )
}
