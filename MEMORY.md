# MEMORY — Radio432Web

## Projekt
Web-Variante der Radio432 iOS/CarPlay-App.
Entwicklung: /Users/matze/Entwicklung/Radio432/Radio432Web/ (Mac Mini Pro M4)
Deployment: ~/docker/radio432web/ auf Linux Mac Mini (ssh linux)

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

## Stand Frontend (✅ FERTIG mit Pitch-Shift, Stand 2026-06-04)

### Implementiert
- React 18 + Vite 5 + Tailwind 3 + Zustand 4 + PWA
- 19 Themes (A–S) mit CSS Custom Properties + Hintergrundtexturen (PNGs aus iOS-App)
- Theme-Kacheln im ThemePicker zeigen echte Textur-Vorschau
- Player (sticky oben): VU-Meter L+R + Spektrum-Analyser, Lautstärke
- Fullscreen-Player: Artwork, ⏮ Pause/Play ⏭, Mute, Lautstärke, VU+Spektrum, Textur-Hintergrund
- 9 VU-Meter-Stile mit Live-Vorschau in Settings + Farbwähler
- 8 Spektrum-Stile mit Live-Vorschau in Settings + Farbwähler
- Favoriten-Tab: Backend-Sync, DnD-Sortierung, Offline-Fallback localStorage
- Suche-Tab: RadioBrowser API, Mirror-Fallback (de1→de2→nl1)
- Einstellungen: Theme, Visualizer-Stil, Visualizer-Farbe, Button-Material, Frequenz-Auswahl
- Web Audio API für echte VU/Spektrum-Analyse, CORS-Fallback auf Simulation
- PWA-Manifest, iOS-Safari-Meta-Tags, Safe-Area-Insets
- Responsive: sm-Breakpoint für kompaktere Mobile-Ansicht

### Pitch-Shift-Implementierung (✅ FERTIG — Session 2026-06-04)
- **Tone.js v14.9.17** integriert für Browser-basiertes Pitch-Shifting
- **Semitone-Berechnung:** 12 * log2(frequency / 432) für 396–963 Hz Frequenzen
- **Getestet:** 432 Hz → 528 Hz zeigt hörbaren Unterschied (+3.47 Halbtöne)
- **Live-Reaktivität:** Frequenz-Wechsel aktualisiert Pitch-Parameter in Echtzeit
- **Graph:** Source → Analyser (für VU/Spektrum) → PitchShift → Destination
- **Feature-Branch:** feat/tone-pitch-shift merged zu main (6 Commits, 0 Bugs)

### Bekannte Einschränkungen / Offene Punkte
- **ICY-Metadaten** (Titel des laufenden Songs): Browser können ICY-Headers nicht direkt lesen. Aktuell nur Sendername angezeigt, kein Titel. Nachrüstbar über Backend-Proxy-Endpunkt.
- **Textur-Filter** (brightness/contrast wie in iOS): CSS `filter` auf `html`-Element würde den gesamten Inhalt filtern. Aktuell werden Texturen ungefiltert angezeigt — sehen trotzdem gut aus.

---

## Deployment Status (Stand 2026-06-04)
- ✅ **Live unter https://radio.claudimatze.online**
- ✅ Docker-Compose auf Linux Mac Mini (~docker/radio432/)
- ✅ Cloudflare Tunnel (3 aktive Verbindungen)
- ✅ Authentik SSO aktiv (Redirect zu login.annonym.online)
- ⚠️ nginx.conf Syntax-Fehler gefixt (worker_processes außerhalb events block)
- 🔄 Testen nach Anmeldung — sollte jetzt funktionieren (502 Error war nginx-Config-Fehler)

## Nächste Schritte
- [ ] **Verifizieren:** App nach Anmeldung laden, Pitch-Shift testen
- [ ] Falls 502 bleibt: Backend-API-Logs prüfen (docker compose logs radio432-api)
- [ ] Optional: .gitignore für *.db-wal, *.db-shm erweitern
- [ ] iOS WebSyncService.swift implementieren (Favoriten + Settings sync)
- [ ] GitHub Repo anlegen: Radio432Web
- [ ] ICY-Metadaten Proxy im Backend (optionale Erweiterung)
