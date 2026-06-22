# MEMORY — Radio432Web

## Projekt
Web-Variante der Radio432 iOS/CarPlay-App.
Entwicklung: /Users/matze/Entwicklung/Radio432/Radio432Web/ (Mac Mini Pro M4)

## ⚠️ DEPLOYMENT-PFAD (KRITISCH)
**Produktiver Stack: `~/docker/radio432/` (OHNE "web"!) auf `ssh linux`.**
NICHT `~/docker/radio432web/` — das war ein versehentlich angelegter Zweit-Stack
mit kaputtem Tunnel (leerer TUNNEL_TOKEN → restart loop). Am 2026-06-05 entfernt.

Der produktive `radio432`-Tunnel-Container bedient radio.claudimatze.online.
Container-Namen: `radio432-radio432-{api,nginx,tunnel}-1`.

**Deploy (nur Frontend-Änderungen — nginx serviert dist/ read-only, kein Neustart nötig):**
```bash
cd /Users/matze/Entwicklung/Radio432/Radio432Web/frontend && npm run build
rsync -avz --delete frontend/dist/ linux:~/docker/radio432/frontend/dist/
# Verifizieren (Hash-Abgleich, umgeht Cloudflare):
ssh linux "docker exec radio432-radio432-nginx-1 grep -o 'assets/index-[A-Za-z0-9]*\.js' /usr/share/nginx/html/index.html"
```
**Bei Backend-Änderungen zusätzlich (WICHTIG — nicht vergessen!):**
```bash
rsync -avz --delete --exclude node_modules --exclude '*.db' --exclude '*.db-*' --exclude .git \
  backend/ linux:~/docker/radio432/backend/
ssh linux "cd ~/docker/radio432 && docker compose restart radio432-api"
```
(backend command ist `sh -c "npm install && node server.js"` → installiert deps beim Start)
DB liegt im Volume `radio432-data` (`/data/radio432.db`), NICHT in ./backend → `--exclude '*.db'` schützt sie.

**Lektion 2026-06-05:** „Nur dist deployen" reichte NICHT — das produktive Backend war veraltet
(fehlende Routes `/api/meta` + `/api/pair`). Folge: kein Cover-Artwork (meta=404) und
kein QR-Pairing (pair=404). Bei Feature-Deploys IMMER backend mit-synchronisieren + api restart.
Verifikation der Endpunkte intern (umgeht Cloudflare Access):
`docker exec radio432-radio432-api-1 wget -qO- --post-data='' --header='Cf-Access-Authenticated-User-Email: <mail>' http://localhost:3001/api/pair/init`

**NIEMALS** am produktiven Stack `docker compose down` ohne Not — der Tunnel-Token
kommt aus der Umgebung; bei `up` ohne gesetzten `CLOUDFLARE_TUNNEL_TOKEN` startet
der Tunnel mit leerem Token und crasht (255).

## Tech-Stack
- Frontend: React 18 + Vite + Tailwind + Zustand + PWA (vite-plugin-pwa)
- Backend: Node.js 20 + Express + better-sqlite3
- Reverse Proxy: nginx (dient Frontend + proxyt /api/ zum Backend)
- Auth: Cloudflare Access + Authentik SSO
- Tunnel: Cloudflare cloudflared

## Infrastruktur (bereits angelegt, Stand 2026-06-04)
- Domain: radio.claudimatze.online
- CF Tunnel ID: 552dde2d-85db-4026-94ba-6eac435406bd (radio432-web)
- CF Tunnel Token: in ~/.config/claude-secrets/.env als CLOUDFLARE_TUNNEL_TOKEN
- DNS: radio.claudimatze.online CNAME → 552dde2d-85db-4026-94ba-6eac435406bd.cfargotunnel.com (proxied)
- Authentik Provider PK: 12 (Radio432 Web), Slug: radio432-web
- CF Access IdP ID: 32c88f22-1f2c-418f-b7d7-d3ab36c36141 (Authentik - Radio432)
- CF Access App ID: 27ceaa82-e344-44fe-8653-7f28602ccd1a (radio.claudimatze.online)
- Zugelassene E-Mail: matthias.schunk@yahoo.com

## Auth-Konzept
- Web: Cloudflare Access → Authentik → Header Cf-Access-Authenticated-User-Email im Backend
- iOS Sync: API-Key (UUID) pro User, in DB gespeichert, einmalig in iOS-Einstellungen eintragen

## Port auf Linux Mac Mini
- Kein externer Port nötig — Tunnel zeigt auf Container-intern radio432-nginx:80
- Backend API nur docker-intern auf radio432-api:3001

## Lokale Entwicklung — wichtige Hinweise

### Node.js Version
**Pflicht: Node 20** — `better-sqlite3` kompiliert NICHT unter Node 25 (aktuelles Homebrew-Default).

```bash
# Lokaler Start Backend:
NODE20=/Users/matze/.nvm/versions/node/v20.20.2/bin
DB_PATH=/Users/matze/Entwicklung/Radio432/Radio432Web/backend/dev.db \
PATH="$NODE20:$PATH" node /Users/matze/Entwicklung/Radio432/Radio432Web/backend/server.js

# Lokaler Start Frontend (separates Terminal):
cd /Users/matze/Entwicklung/Radio432/Radio432Web/frontend && npm run dev
# → http://localhost:5173 (oder nächster freier Port)
```

### CF-Access-Header im Vite-Proxy
`vite.config.js` injiziert automatisch `cf-access-authenticated-user-email: dev@local` für alle `/api/`-Anfragen. Kein manueller Header-Set nötig.

### Curl-Schnelltest lokal
```bash
curl http://localhost:3001/api/health
curl -H "cf-access-authenticated-user-email: matthias.schunk@yahoo.com" http://localhost:3001/api/favorites
```

---

## Stand Backend (fertig ✅)

Alle Endpunkte implementiert und getestet:
- `GET /api/health`
- `GET/POST/DELETE /api/favorites`, `PUT /api/favorites/reorder`
- `GET /api/apikey`
- `GET/PUT /api/settings` — Frequenz-Präferenz (396/417/432/440/444/528/639/741/852/963 Hz)
- `POST /api/sync/import`

---

## Stand Frontend (✅ FERTIG mit Pitch-Shift + VU-Meter iOS-Parität, Stand 2026-06-05)

### Implementiert
- React 18 + Vite 5 + Tailwind 3 + Zustand 4 + PWA
- 19 Themes (A–S) mit CSS Custom Properties + Hintergrundtexturen (PNGs aus iOS-App)
- Theme-Kacheln im ThemePicker zeigen echte Textur-Vorschau
- Player (sticky oben): VU-Meter L+R + Spektrum-Analyser, Lautstärke
- Fullscreen-Player: Artwork, ⏮ Pause/Play ⏭, Mute, Lautstärke, VU+Spektrum, Textur-Hintergrund
- **VU-Meter iOS-Parität** (2026-06-05): innere 0–100-Skala, Tick-Richtung korrigiert (nach außen), Pivot 4-schichtig mit Highlight
- 9 VU-Meter-Stile mit Live-Vorschau in Settings + Farbwähler
- 8 Spektrum-Stile mit Live-Vorschau in Settings + Farbwähler
- Favoriten-Tab: Backend-Sync, DnD-Sortierung, Offline-Fallback localStorage
- Suche-Tab: RadioBrowser API, Mirror-Fallback (de1→de2→nl1)
- Einstellungen: Theme, Visualizer-Stil, Visualizer-Farbe, Button-Material, Frequenz-Auswahl
- Web Audio API für echte VU/Spektrum-Analyse, CORS-Fallback auf Simulation
- PWA-Manifest, iOS-Safari-Meta-Tags, Safe-Area-Insets
- Responsive: sm-Breakpoint für kompaktere Mobile-Ansicht, VU-Meter responsive via aspectRatio

### Pitch-Shift-Implementierung (✅ FERTIG — Session 2026-06-04)
- **Tone.js v14.9.17** integriert für Browser-basiertes Pitch-Shifting
- **Semitone-Berechnung:** 12 * log2(frequency / 432) für 396–963 Hz Frequenzen
- **Getestet:** 432 Hz → 528 Hz zeigt hörbaren Unterschied (+3.47 Halbtöne)
- **Live-Reaktivität:** Frequenz-Wechsel aktualisiert Pitch-Parameter in Echtzeit
- **Graph:** Source → Analyser (für VU/Spektrum) → PitchShift → Destination
- **Feature-Branch:** feat/tone-pitch-shift merged zu main (6 Commits, 0 Bugs)

### Bekannte Einschränkungen / Offene Punkte
- **ICY-Metadaten:** gelöst über Backend-Endpunkt `/api/meta` (liest ICY-Header serverseitig) → Titel + Künstler + iTunes-Cover funktionieren (Stand 2026-06-05).
- **Textur-Filter** (brightness/contrast wie in iOS): CSS `filter` auf `html`-Element würde den gesamten Inhalt filtern. Aktuell werden Texturen ungefiltert angezeigt — sehen trotzdem gut aus.

---

## Deployment Status (Stand 2026-06-05)
- ✅ **Live unter https://radio.claudimatze.online** (produktiv: `~/docker/radio432/` — NICHT radio432web!)
- ✅ Cloudflare Tunnel `radio432-radio432-tunnel-1` stabil (3 Verbindungen)
- ✅ Authentik SSO aktiv
- ✅ Cover-Artwork (via /api/meta) funktioniert
- ✅ QR-Pairing iOS ↔ Web funktioniert (verifiziert am Gerät)

## Session-Stand 2026-06-05 (Session-Ende)

**Woran gearbeitet:** VU-Meter iOS-Parität + Artwork + QR-Pairing zum Laufen gebracht.

**Fertig ✅:**
- VU-Meter Redesign (innere 0–100-Skala, Ticks nach außen, 4-Schicht-Pivot, responsive, weniger Label-Clutter) — Commits 56ddfb5, 132bc14, 5bc4c4d
- Artwork-Loading: NowPlaying.jsx übergibt artist/title an useArtwork — Commit 07837b0
- **Deploy-Chaos behoben:** Hatte fälschlich nach `~/docker/radio432web/` deployed (kaputter Zweit-Stack mit leerem Tunnel-Token). Produktiv ist `~/docker/radio432/`. Zweit-Stack entfernt.
- **Backend war veraltet** → Routes `/api/meta` + `/api/pair` fehlten produktiv → komplettes Backend nach `~/docker/radio432/` deployed + api-Container neu gestartet.
- **QR-Pairing gefixt (2 Ursachen):**
  1. CF Access Bypass-App für `/api/pair/confirm` angelegt (App-ID `83b8ea8e-0565-4c70-98f5-7cc7c5dc1e7e`) → liefert JSON statt HTML-Login.
  2. Backend pair.js Feldname `apiKey` → `api_key` (iOS JSONDecoder erwartet snake_case).

**Offen / Nächste Schritte:**
- [ ] **iOS-Sync (favorites/settings/sync mit x-api-key) durch Cloudflare Access** — selbe Access-Hürde wie Pairing. Entscheidung nötig: **A)** separater API-Hostname ohne Access (z.B. radio432-api.claudimatze.online) ODER **B)** CF Service Token in iOS-App (+ TestFlight). Backend kann beide Auth-Wege. Details im `infrastructure`-Skill (Bypass-Apps).
- [ ] iOS WebSyncService.swift fertig implementieren/testen (Favoriten + Settings bidirektional)
- [ ] GitHub Repo anlegen: Radio432Web
- [ ] Optional: .gitignore für *.db-wal, *.db-shm erweitern

**Lektion (siehe auch Deploy-Pfad-Block oben):** Bei Feature-Deploys IMMER Backend mitdenken, nicht nur dist. Und Endpunkte am Live-System verifizieren (intern via `docker exec`, umgeht Cloudflare), nicht nur lokal.

---

## Session-Stand 2026-06-11 (Session-Ende) — Infra/Stabilität

**Woran gearbeitet:** Stabilitätsprüfung + Wiederherstellung der Live-Erreichbarkeit (UI meldete „Backend nicht erreichbar").

**Diagnose:**
- Lokaler Dev-Stack war stabil (Backend 3001 `{"status":"ok"}`, Build aktuell, Frontend lädt 0 Console-Errors) — der Fehler kam vom **produktiven Linux-Stack**, nicht lokal.
- **Root-Cause:** Cloudflare-Tunnel hatte am 2026-06-09 ~16:02 UTC QUIC-Abbrüche („no recent network activity") → seitdem erreichten keine Requests mehr das Backend.
- cloudflared war veraltet (2026.2.0).

**Erledigt ✅ (alles auf `ssh linux`, Stack `~/docker/radio432`):**
- Sauberer Komplett-Neustart (`docker compose down && up`) → Tunnel neu registriert (4 Verbindungen, fra03/06/08/20).
- Cloudflare-Cache geleert (Zone `claudimatze.online`, `purge_everything` → success).
- cloudflared aktualisiert auf **2026.6.0** (`docker compose pull radio432-tunnel` + recreate; api/nginx liefen durch).
- Obsolete `version:`-Zeile aus der **Server**-`docker-compose.yml` entfernt (Backup als `docker-compose.yml.bak` daneben).
- Verifiziert: intern `/api/health` = ok, extern `radio.claudimatze.online` → 302 CF-Access-Login, `/api/pair/confirm` → 400 (Backend durch Tunnel erreichbar, kein 502/Timeout).

**Hinweis:** Diese Arbeit fand auf dem Server statt (nicht im Repo). Die Server-`docker-compose.yml` weicht jetzt minimal von der Repo-Version ab (fehlende `version:`-Zeile — kosmetisch). Bei künftigem Tunnel-Flackern zuerst cloudflared-Version + Tunnel-Logs prüfen.

**Offen / Nächste Schritte:** unverändert wie 2026-06-05 (iOS-Sync durch CF Access, WebSyncService, .gitignore für *.db-*). Zusätzlich: WIP `feat/artwork-fallback-chain` noch nicht committet/gepusht.

---

## Backlog: Anbindung externer Streaming-Dienste (Recherche 2026-06-22)

**Frage:** Spotify / Amazon Music / Deezer / Apple Music / YouTube Music / TIDAL / Qobuz als Quelle anbinden?

**Kernproblem:** Das Pitch-Shift-Feature braucht Zugriff auf das rohe, dekodierte Audiosignal (PCM). Genau das verriegeln alle großen Dienste per DRM (Widevine/FairPlay) — man bekommt nur eine versiegelte Blackbox zum Abspielen, nie die Samples.

- **Spotify, Apple Music, TIDAL, YouTube Music, Amazon Music:** technisch ausgeschlossen (DRM, kein PCM-Zugriff; teils per ToS ausdrücklich verboten, Pitch zu ändern).
- **Deezer:** SDKs eingestellt, API nur 30-Sek-Previews → nicht gangbar.
- **Qobuz:** EINZIGER technischer Kandidat (DRM-freie FLAC → dekodierbar). Aber: kein offenes Developer-Programm, nur Partneranfrage (api@qobuz.com); ob Audio-Modifikation vertraglich erlaubt ist, unbestätigt.

**Fazit:** Für Pitch-Shift bleiben PCM-Quellen nötig (Radio/ICY-Streams wie heute, lokale Dateien, ggf. Qobuz per Partnervertrag). Die großen DRM-Dienste sind keine gangbare Quelle. → Nicht jetzt umsetzen; bei Bedarf Qobuz-Partnerschaft prüfen.
