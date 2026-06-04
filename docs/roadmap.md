# Radio432 Web — Roadmap

## Überblick

Die Web-App entsteht in drei unabhängig entwickelbaren Phasen:

```
Phase 1: Backend API     → lauffähige REST-API mit DB + Auth
Phase 2: Frontend v1     → Player, Favoriten, Suche, Themes, PWA
Phase 3: iOS-Sync        → WebSyncService.swift in Radio432CarPlayApp
```

Jede Phase ist eigenständig nutzbar. Die iOS-Sync-Phase setzt voraus,
dass Backend und Frontend laufen.

---

## Phase 1 — Backend API

**Ziel:** Vollständige REST-API auf dem Linux Mac Mini, erreichbar intern.
**Eingabe-Session:** `docs/backend-plan.md`

| # | Aufgabe | Status |
|---|---------|--------|
| 1.1 | Projektstruktur + package.json anlegen | ☐ |
| 1.2 | Express-Server mit Health-Endpoint | ☐ |
| 1.3 | SQLite-DB + Schema-Migration | ☐ |
| 1.4 | Auth-Middleware (CF-Access-Header + API-Key) | ☐ |
| 1.5 | Favoriten-Endpunkte (CRUD + Reorder) | ☐ |
| 1.6 | API-Key-Endpunkt (generieren + abrufen) | ☐ |
| 1.7 | Bulk-Import-Endpunkt für iOS-Migration | ☐ |
| 1.8 | Dockerfile | ☐ |
| 1.9 | Lokal testen (curl/Postman) | ☐ |
| 1.10 | Deployment auf Linux Mac Mini via docker-compose | ☐ |

---

## Phase 2 — Frontend

**Ziel:** React-PWA mit Player, Favoriten, Suche, Themes.

> ⚠️ **WICHTIG:** Vor Entwicklungsstart die aktuellen iOS-App-Designs frisch auslesen.
> Der optische Umbau der iOS-App muss abgeschlossen sein, bevor hier begonnen wird.
> Anleitung dazu in `docs/frontend-plan.md` → Abschnitt „Design-Specs extrahieren".

**Eingabe-Session:** `docs/frontend-plan.md`

| # | Aufgabe | Status |
|---|---------|--------|
| 2.1 | Vite + React + Tailwind + Zustand scaffolden | ☐ |
| 2.2 | vite-plugin-pwa konfigurieren (manifest, icons, SW) | ☐ |
| 2.3 | Themes als CSS Custom Properties portieren (aus iOS-App) | ☐ |
| 2.4 | Layout-Grundstruktur + Navigation | ☐ |
| 2.5 | Player-Komponente (Audio, Metadaten, Cover, Controls) | ☐ |
| 2.6 | MediaSession API (Sperrbildschirm-Controls) | ☐ |
| 2.7 | Favoriten-View (Liste, Abspielen, Entfernen, Drag & Drop) | ☐ |
| 2.8 | RadioBrowser-Suche + Sender zu Favoriten hinzufügen | ☐ |
| 2.9 | Settings-View (Theme-Switcher, API-Key anzeigen) | ☐ |
| 2.10 | Backend-Integration (Favoriten-API) | ☐ |
| 2.11 | Build + Deployment nach Linux Mac Mini | ☐ |
| 2.12 | End-to-End Test (Cloudflare Access → Login → App) | ☐ |

---

## Phase 3 — iOS Sync

**Ziel:** iOS-App synchronisiert Favoriten mit dem Backend.
**Voraussetzung:** Phase 1 (Backend) ist deployed und erreichbar.

| # | Aufgabe | Status |
|---|---------|--------|
| 3.1 | WebSyncService.swift anlegen | ☐ |
| 3.2 | Settings: API-Key + Server-URL Eingabefeld | ☐ |
| 3.3 | Sync bei Favoriten-Änderung (add/remove/reorder) | ☐ |
| 3.4 | Pull beim App-Start (merge mit iCloud) | ☐ |
| 3.5 | Konflikt-Strategie (neueste created_at gewinnt) | ☐ |
| 3.6 | Bulk-Import: einmalig iCloud → Backend migrieren | ☐ |
| 3.7 | Testen: Web-Favorit → auf iOS sichtbar | ☐ |

---

## Spätere Versionen (Backlog)

Diese Features sind bewusst für v2+ zurückgestellt:

| Feature | Warum zurückgestellt |
|---------|---------------------|
| Telegram-Audiobooks im Web | Komplexe TDLib-Integration, kein Web-Client |
| Synology-Musik im Web | Abhängig von NAS-Session/Auth |
| Multi-Room Sync (Web als Follower) | Benötigt WebAudio + WebSocket |
| Pitch-Shift im Web | WebAudio API, niedrige Priorität |
| Mehrere Nutzer-Accounts | Aktuell Single-User-App |
| Offline-Wiedergabe (gecachte Streams) | Technisch schwierig bei Live-Streams |

---

## Deployment-Ablauf (für jede Phase)

```bash
# 1. Build auf Mac Mini Pro M4
cd /Users/matze/Entwicklung/Radio432/Radio432Web
# Frontend: npm run build (im frontend/-Ordner)
# Backend: kein Build-Step nötig (plain Node.js)

# 2. Dateien nach Linux kopieren
rsync -avz --exclude node_modules --exclude .git \
  /Users/matze/Entwicklung/Radio432/Radio432Web/ \
  linux:~/docker/radio432web/

# 3. Auf Linux starten
ssh linux "cd ~/docker/radio432web && docker compose up -d --build"
```

---

## Infrastruktur-Referenz

Bereits angelegt (Stand 2026-06-04):

| Was | Wert |
|-----|------|
| URL | https://radio.claudimatze.online |
| CF Tunnel ID | 552dde2d-85db-4026-94ba-6eac435406bd |
| Authentik Provider | PK 12, Slug: radio432-web |
| CF Access App | radio.claudimatze.online |
| Tunnel-Token | in ~/.config/claude-secrets/.env |
| Linux Deploy-Pfad | ~/docker/radio432web/ |
