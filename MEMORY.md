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
# Lokaler Start:
NODE20=/Users/matze/.nvm/versions/node/v20.20.2/bin
PATH="$NODE20:$PATH" npm install
DB_PATH=./dev.db PATH="$NODE20:$PATH" node server.js

# Im Docker-Container: läuft automatisch (Dockerfile = node:20-alpine)
```

### Curl-Schnelltest lokal
```bash
curl http://localhost:3001/api/health
curl -H "cf-access-authenticated-user-email: matthias.schunk@yahoo.com" http://localhost:3001/api/favorites
```

### CF-Access-Header simulieren
Für lokale Tests den Header `cf-access-authenticated-user-email` manuell setzen — im echten Betrieb setzt Cloudflare/nginx ihn automatisch.

## Stand Backend (2026-06-04 — fertig)

Alle 10 Dateien implementiert, reviewed, getestet:

| Datei | Status |
|-------|--------|
| package.json | ✅ |
| server.js | ✅ |
| Dockerfile | ✅ |
| db/database.js | ✅ |
| db/schema.sql | ✅ |
| middleware/auth.js | ✅ |
| routes/favorites.js | ✅ |
| routes/apikey.js | ✅ |
| routes/settings.js | ✅ (inkl. Frequenz-Präferenz) |
| routes/sync.js | ✅ |

### Endpunkte
- `GET /api/health` — kein Auth
- `GET/POST/DELETE /api/favorites`, `PUT /api/favorites/reorder`
- `GET /api/apikey`
- `GET/PUT /api/settings` — Frequenz (396/417/432/440/444/528/639/741/852/963 Hz)
- `POST /api/sync/import`

## Offene Schritte
- [ ] Frontend React-App scaffolden (Vite + Tailwind + PWA)
- [ ] iOS WebSyncService.swift implementieren
- [ ] Deployment auf Linux Mac Mini (rsync + docker compose up)
- [ ] GitHub Repo anlegen: Radio432Web
