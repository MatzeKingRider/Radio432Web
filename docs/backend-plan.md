# Radio432 Web — Backend Entwicklungsplan

## Kontext

Das Backend ist eine schlanke REST-API auf Basis von Node.js/Express mit SQLite-Datenbank.
Es läuft als Docker-Container auf dem Linux Mac Mini und ist **nicht direkt öffentlich erreichbar**
— nur über den nginx-Reverse-Proxy innerhalb des Docker-Netzwerks.

Auth-Konzept:
- **Web-Browser:** Cloudflare Access setzt den Header `Cf-Access-Authenticated-User-Email`.
  Das Backend vertraut diesem Header (da nur über den CF-Tunnel erreichbar).
- **iOS App:** API-Key (UUID), in der DB gespeichert, einmalig in den iOS-Einstellungen eingetragen.

---

## Tech-Stack

| Was | Technologie | Begründung |
|-----|-------------|------------|
| Runtime | Node.js 20 LTS | Stabil, Alpine-Image klein |
| Framework | Express 4 | Bewährt, minimal |
| Datenbank | SQLite via better-sqlite3 | Single-User, kein DB-Server nötig |
| API-Key Auth | UUID v4, in DB gespeichert | Einfach, kein OAuth-Aufwand auf iOS |
| Logging | morgan (stdout) | Docker logs lesbar |

---

## Projektstruktur

```
backend/
├── server.js           ← Einstiegspunkt, Express-App starten
├── package.json
├── db/
│   ├── database.js     ← DB-Verbindung + Migrations-Init
│   └── schema.sql      ← SQL-Schema (zur Referenz)
├── middleware/
│   └── auth.js         ← CF-Access-Header + API-Key Prüfung
└── routes/
    ├── favorites.js    ← GET/POST/DELETE/PUT Favoriten
    ├── apikey.js       ← API-Key generieren + abrufen
    └── sync.js         ← Bulk-Import für iOS-Migration
```

---

## Datenbank-Schema

```sql
-- Wird beim ersten Start automatisch angelegt (db/database.js)

CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL UNIQUE,   -- aus CF-Access-Header
    api_key     TEXT    UNIQUE,            -- UUID, generiert auf Anfrage
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS favorites (
    id          TEXT    PRIMARY KEY,       -- UUID aus iOS (FavoriteStation.id)
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT    NOT NULL,
    url         TEXT    NOT NULL,
    favicon     TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, sort_order);
```

**Warum UUID als favorites.id?** Die iOS-App vergibt bereits UUIDs für `FavoriteStation`.
Beim Sync können wir so Duplikate verhindern ohne extra Mapping.

---

## Auth-Middleware (`middleware/auth.js`)

```
Eingehende Anfrage
    │
    ├─ Header "x-api-key" vorhanden?
    │       → DB: SELECT user WHERE api_key = ?
    │       → req.user = { id, email } → next()
    │
    └─ Header "cf-access-authenticated-user-email" vorhanden?
            → DB: SELECT user WHERE email = ? (INSERT wenn neu)
            → req.user = { id, email } → next()

Kein Auth → 401
```

**Sicherheitsnotiz:** Der CF-Access-Header ist nur vertrauenswürdig, weil die API
ausschließlich über den Docker-internen nginx erreichbar ist (kein publish auf 0.0.0.0).
nginx leitet den Header aus Cloudflare weiter:
```nginx
proxy_set_header CF-Access-Authenticated-User-Email $http_cf_access_authenticated_user_email;
```

---

## API-Endpunkte

Alle Endpunkte unter `/api/`. Auth-Middleware läuft auf allen außer `/api/health`.

### `GET /api/health`
Kein Auth erforderlich.
```json
{ "status": "ok", "version": "1.0.0" }
```

### `GET /api/favorites`
Favoriten des eingeloggten Users, sortiert nach sort_order.
```json
[
  {
    "id": "uuid",
    "name": "Radio Paradise",
    "url": "https://stream.radioparadise.com/aac-320",
    "favicon": "https://...",
    "sort_order": 0,
    "created_at": 1717500000
  }
]
```

### `POST /api/favorites`
Neuen Favoriten hinzufügen.
```json
// Request Body:
{ "id": "uuid", "name": "...", "url": "...", "favicon": "..." }

// Response 201:
{ "id": "uuid", "sort_order": 5 }
```
Wenn `id` bereits existiert → 200 (idempotent, kein Fehler).

### `DELETE /api/favorites/:id`
Favoriten entfernen.
```
Response 204 No Content
```

### `PUT /api/favorites/reorder`
Reihenfolge aktualisieren.
```json
// Request Body:
{ "order": ["uuid1", "uuid2", "uuid3"] }

// Response 200:
{ "updated": 3 }
```

### `GET /api/apikey`
Eigenen API-Key abrufen. Wenn noch keiner existiert → wird generiert und gespeichert.
```json
{ "api_key": "550e8400-e29b-41d4-a716-446655440000" }
```

### `POST /api/sync/import`
Bulk-Import aller iOS-Favoriten (einmalige Migration). Vorhandene IDs werden übersprungen.
```json
// Request Body:
{
  "favorites": [
    { "id": "uuid", "name": "...", "url": "...", "favicon": "..." }
  ]
}

// Response 200:
{ "imported": 12, "skipped": 3 }
```

---

## package.json

```json
{
  "name": "radio432-api",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "express": "^4.18.3",
    "morgan": "^1.10.0",
    "uuid": "^9.0.1"
  }
}
```

---

## Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
VOLUME ["/data"]
EXPOSE 3001
CMD ["node", "server.js"]
```

---

## Umgebungsvariablen

| Variable | Pflicht | Default | Bedeutung |
|----------|---------|---------|-----------|
| PORT | nein | 3001 | Listening-Port |
| DB_PATH | nein | /data/radio432.db | Pfad zur SQLite-Datei |
| NODE_ENV | nein | development | production deaktiviert Stack-Traces in Responses |

---

## Lokale Entwicklung (ohne Docker)

```bash
cd /Users/matze/Entwicklung/Radio432/Radio432Web/backend
npm install
DB_PATH=./dev.db node server.js
```

Testen (Terminal):
```bash
# Health-Check
curl http://localhost:3001/api/health

# Mit CF-Access simulieren (für lokale Tests)
curl -H "cf-access-authenticated-user-email: matthias.schunk@yahoo.com" \
     http://localhost:3001/api/favorites

# Favorit hinzufügen
curl -X POST -H "Content-Type: application/json" \
     -H "cf-access-authenticated-user-email: matthias.schunk@yahoo.com" \
     -d '{"id":"test-uuid-1","name":"Radio Paradise","url":"https://stream.radioparadise.com/aac-320","favicon":""}' \
     http://localhost:3001/api/favorites
```

---

## Deployment auf Linux Mac Mini

```bash
# Vom Mac Mini Pro M4:
rsync -avz --exclude node_modules \
  /Users/matze/Entwicklung/Radio432/Radio432Web/backend/ \
  linux:~/docker/radio432web/backend/

# .env anlegen (einmalig):
ssh linux "echo 'CLOUDFLARE_TUNNEL_TOKEN=<token-aus-claude-secrets>' > ~/docker/radio432web/.env"

# Starten:
ssh linux "cd ~/docker/radio432web && docker compose up -d"

# Logs:
ssh linux "cd ~/docker/radio432web && docker compose logs -f radio432-api"
```

---

## Session-Start-Checkliste für die Backend-Entwicklungs-Session

Vor der Entwicklung diesen Kontext dem Agenten mitgeben:

1. **Projektpfad:** `/Users/matze/Entwicklung/Radio432/Radio432Web/backend/`
2. **Diesen Plan** als Referenz übergeben
3. **Reihenfolge:** server.js → db/database.js → middleware/auth.js → routes/* → Dockerfile
4. **Test:** nach jedem Route-File curl-Test durchführen
5. **Kein Frontend nötig** — Backend ist unabhängig entwickelbar
6. **Kein ORM** — direkt better-sqlite3 SQL, keine Abstraktionsschicht
7. **Kein TypeScript** — plain JavaScript (Node.js 20 unterstützt alles was gebraucht wird)
