# Radio432 Web — Frontend Entwicklungsplan

## ⚠️ Pflicht vor Entwicklungsstart: Design-Specs frisch extrahieren

Die iOS-App wird gerade optisch überarbeitet. **Dieser Plan enthält daher bewusst
keine finalen Farbwerte, Theme-Namen oder genauen Abstände.**

Vor dem ersten Coding-Commit muss ein Develop-Agent folgendes tun:

```
1. iOS-App-Code lesen:
   Pfad: /Users/matze/Entwicklung/Radio432/Radio432CarPlayApp/

2. Extrahieren aus:
   - Theme/ThemeService.swift         → alle Theme-Namen + Farbpaletten
   - Theme/ButtonAppearance.swift     → Radien, Materialien
   - Assets/                          → Texture-Assets (Referenz für CSS)
   - UI/Player/NowPlayingScreen.swift → Player-Layout + Abstände
   - UI/Favorites/FavoritesView.swift → Listenstruktur, Zellen-Design
   - UI/Search/SearchView.swift       → Suchfeld, Ergebnisliste

3. Ergebnis als CSS Custom Properties in:
   frontend/src/styles/themes.css
   dokumentieren und dann entwickeln.
```

**Dieser Schritt darf nicht übersprungen werden.** Eine veraltete Spec führt zu
einem UI, das nicht zur iOS-App passt.

---

## Kontext

Das Frontend ist eine React-PWA, die über nginx ausgeliefert wird.
Die API-Kommunikation läuft über `/api/` (nginx proxyt zum Backend-Container).
Cloudflare Access übernimmt den Login transparent — der User sieht nur die Authentik-Login-Seite.

---

## Tech-Stack

| Was | Technologie | Version |
|-----|-------------|---------|
| Framework | React | 18 |
| Build-Tool | Vite | 5 |
| Styling | Tailwind CSS | 3 |
| State | Zustand | 4 |
| PWA | vite-plugin-pwa + Workbox | aktuell |
| Icons | lucide-react | aktuell |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | aktuell |
| HTTP-Client | fetch (nativ, kein axios) | – |

**Kein React Router** — die App ist eine Single-View-App mit Tab-Navigation.
Kein Server-Side Rendering (nginx liefert statische Dateien aus).

---

## Projektstruktur

```
frontend/
├── package.json
├── vite.config.js
├── index.html
├── public/
│   ├── icons/                 ← PWA-Icons (192, 512, apple-touch)
│   └── favicon.ico
└── src/
    ├── main.jsx               ← React-Einstieg
    ├── App.jsx                ← Root + Tab-Navigation
    ├── styles/
    │   ├── index.css          ← Tailwind directives + global resets
    │   └── themes.css         ← CSS Custom Properties (aus iOS extrahiert!)
    ├── store/
    │   ├── playerStore.js     ← Audio-State (currentStation, isPlaying, volume)
    │   ├── favoritesStore.js  ← Favoriten-Liste, API-Calls
    │   └── settingsStore.js   ← Theme, API-Key
    ├── api/
    │   └── client.js          ← fetch-Wrapper für /api/*
    ├── components/
    │   ├── Player/
    │   │   ├── Player.jsx     ← Haupt-Player (sticky bottom)
    │   │   ├── NowPlaying.jsx ← Senderinfo, Artwork, Metadaten
    │   │   └── Controls.jsx   ← Play/Stop, Lautstärke
    │   ├── Favorites/
    │   │   ├── FavoritesList.jsx   ← DnD-sortierbare Liste
    │   │   └── FavoriteItem.jsx    ← Einzelne Zeile
    │   ├── Search/
    │   │   ├── SearchView.jsx      ← Suchfeld + Ergebnisliste
    │   │   └── StationResult.jsx   ← Ergebnis-Zeile mit "Hinzufügen"
    │   ├── Settings/
    │   │   ├── SettingsView.jsx    ← Theme-Switcher, API-Key-Anzeige
    │   │   └── ThemePicker.jsx     ← Thumbnails der 19 Themes
    │   └── common/
    │       ├── TabBar.jsx          ← Bottom-Navigation
    │       └── LoadingSpinner.jsx
    └── hooks/
        ├── useAudio.js        ← HTML5 Audio + MediaSession API
        └── useRadioBrowser.js ← RadioBrowser-API-Calls
```

---

## Screen-Struktur & Navigation

```
┌──────────────────────────────┐
│  NowPlaying (sticky top)     │  ← zeigt aktuellen Sender, immer sichtbar
│  Artwork | Name | ▶ Stop     │
├──────────────────────────────┤
│                              │
│  [Aktiver Tab-Inhalt]        │
│                              │
│  - Favoriten                 │
│  - Suche                     │
│  - Einstellungen             │
│                              │
├──────────────────────────────┤
│  ♥ Favoriten | 🔍 Suche | ⚙ │  ← TabBar (sticky bottom)
└──────────────────────────────┘
```

**Standard-Tab beim Öffnen:** Favoriten.

---

## Audio-Architektur (`hooks/useAudio.js`)

```javascript
// HTML5 Audio Element (kein Web Audio API — keine Pitch-Shift nötig)
const audio = new Audio()
audio.crossOrigin = 'anonymous'

// Steuerung
play(url)   → audio.src = url; audio.play()
stop()      → audio.pause(); audio.src = ''

// MediaSession API (Sperr-Bildschirm-Controls, auch als PWA)
navigator.mediaSession.metadata = new MediaMetadata({
  title:  station.name,
  artist: 'Radio432 Web',
  artwork: [{ src: station.favicon, sizes: '96x96' }]
})
navigator.mediaSession.setActionHandler('play', () => play(currentUrl))
navigator.mediaSession.setActionHandler('pause', () => stop())
```

**ICY-Metadaten (Titel des laufenden Stücks):**
Browser können ICY-Metadaten nicht direkt lesen. Workaround:
- Fetch mit `icy-metadata: 1` Header über einen kleinen Proxy-Endpunkt im Backend
- Oder: Titel-Anzeige weglassen (v1), später nachrüsten

**CORS-Hinweis:** Manche Streams haben CORS-Header, manche nicht. Wenn ein Stream
direkt im Browser nicht abspielbar ist, muss das Backend als Proxy dienen
(Endpunkt `/api/stream-proxy?url=...`). **Für v1 nicht implementieren** — erst bei Bedarf.

---

## Favoriten-State & Backend-Sync (`store/favoritesStore.js`)

```
App-Start
  → GET /api/favorites
  → Store mit Daten füllen

User tippt ♥ (hinzufügen)
  → Optimistic Update: sofort im Store anzeigen
  → POST /api/favorites
  → Bei Fehler: Rollback + Fehlermeldung

User tippt 🗑 (entfernen)
  → Optimistic Update
  → DELETE /api/favorites/:id

Drag & Drop (Reihenfolge)
  → Reorder im Store
  → Debounced (500ms): PUT /api/favorites/reorder
```

---

## Theme-System

Die iOS-App hat 19 Themes (A–S). Ziel: gleiche Farbpaletten im Web.

### Implementierung

```css
/* themes.css — Werte VOR Entwicklung aus iOS-Code extrahieren! */
:root[data-theme="theme-a"] {
  --color-primary:    #003660;   /* Beispiel — echte Werte aus Swift holen */
  --color-secondary:  #497677;
  --color-accent:     #E6E569;
  --color-background: #1a1a1a;
  --color-surface:    #2a2a2a;
  --color-text:       #ffffff;
  --radius-button:    8px;
  /* ... */
}

:root[data-theme="theme-b"] {
  /* ... */
}
```

In React: `document.documentElement.setAttribute('data-theme', activeTheme)`

### ThemePicker-Komponente
- Grid mit 19 Vorschau-Kacheln (wie in iOS Settings)
- Aktives Theme hervorgehoben
- Bei Klick: Theme sofort anwenden + in settingsStore speichern (localStorage)

---

## PWA-Konfiguration (`vite.config.js`)

```javascript
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'Radio432',
    short_name: 'Radio432',
    display: 'standalone',
    background_color: '#1a1a1a',  // ← aus aktivem Theme ziehen
    theme_color: '#003660',        // ← aus aktivem Theme ziehen
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  },
  workbox: {
    // Statische App-Shell cachen
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    // Audio-Streams explizit NICHT cachen
    runtimeCaching: []
  }
})
```

**iOS Safari-Hinweise** (in `index.html`):
```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
```

---

## RadioBrowser-API (`hooks/useRadioBrowser.js`)

Direkt vom Browser aufrufen (kein Backend-Proxy nötig — öffentliche API).

```javascript
const BASE = 'https://de1.api.radio-browser.info/json'

// Suche
fetch(`${BASE}/stations/search?name=${q}&limit=30&hidebroken=true`)

// Nach Tags
fetch(`${BASE}/stations/bytag/${tag}?limit=30&hidebroken=true`)
```

Gleiche API-Basis wie in der iOS-App (`RadioBrowserService.swift`).

---

## API-Client (`api/client.js`)

```javascript
// Basis-URL ist immer /api/ (relativ) — nginx proxyt zum Backend
async function apiFetch(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  return res.status === 204 ? null : res.json()
}

export const favoritesApi = {
  list:    ()         => apiFetch('/favorites'),
  add:     (station)  => apiFetch('/favorites', { method: 'POST', body: JSON.stringify(station) }),
  remove:  (id)       => apiFetch(`/favorites/${id}`, { method: 'DELETE' }),
  reorder: (order)    => apiFetch('/favorites/reorder', { method: 'PUT', body: JSON.stringify({ order }) }),
  getKey:  ()         => apiFetch('/apikey')
}
```

---

## Lokale Entwicklung

```bash
cd /Users/matze/Entwicklung/Radio432/Radio432Web/frontend
npm create vite@latest . -- --template react
npm install

# Vite-Dev-Server
npm run dev   # http://localhost:5173

# Wichtig: Backend muss laufen für API-Calls
# Proxy in vite.config.js:
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

---

## Build & Deployment

```bash
# Build (auf Mac Mini Pro M4)
cd /Users/matze/Entwicklung/Radio432/Radio432Web/frontend
npm run build
# Erzeugt: frontend/dist/

# Nach Linux deployen
rsync -avz \
  /Users/matze/Entwicklung/Radio432/Radio432Web/ \
  --exclude frontend/node_modules \
  --exclude frontend/src \
  --exclude .git \
  linux:~/docker/radio432web/

# Auf Linux starten (nginx + API + Tunnel)
ssh linux "cd ~/docker/radio432web && docker compose up -d --build"
```

---

## Session-Start-Checkliste für die Frontend-Entwicklungs-Session

**Vor der ersten Session:**
1. iOS-App-Umbau abwarten/prüfen
2. Design-Specs extrahieren (siehe oben, ⚠️ Pflicht-Abschnitt)
3. `themes.css` mit echten Werten befüllen

**In der Session:**
1. **Projektpfad:** `/Users/matze/Entwicklung/Radio432/Radio432Web/frontend/`
2. **Diesen Plan** + extrahierte Theme-Daten übergeben
3. **Backend-Plan** als Referenz für API-Endpunkte mitgeben
4. **Reihenfolge:**
   - Scaffolding (Vite + Tailwind + Zustand + PWA)
   - themes.css + App-Shell
   - useAudio.js
   - Player-Komponente
   - Favoriten (Liste + API-Integration)
   - Suche
   - Settings + ThemePicker
   - PWA-Icons + manifest testen
5. Nach jeder Haupt-Komponente: `npm run dev` + Browser-Test
6. Am Ende: `npm run build` + docker compose Test

**Abhängigkeit:** Backend muss nicht deployed sein für Frontend-Entwicklung.
Vite-Proxy auf `localhost:3001` reicht für lokale Tests.
