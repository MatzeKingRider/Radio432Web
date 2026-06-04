# ERRORS — Radio432Web

Probleme die mehr als 2 Versuche brauchten oder wichtige Gotchas.

---

## better-sqlite3 kompiliert nicht unter Node 25

**Problem:** `npm install` schlägt fehl mit C++-Kompilierungsfehlern (v8-memory-span.h Fehler).

**Ursache:** better-sqlite3@9.x hat keine Prebuilt-Binaries für Node 25 + arm64 darwin. Die nativen Bindings kompilieren nicht gegen die neuen V8-Headers von Node 25.

**Lösung:** Node 20 LTS verwenden:
```bash
NODE20=/Users/matze/.nvm/versions/node/v20.20.2/bin
PATH="$NODE20:$PATH" npm install
```

**Im Docker-Container** (node:20-alpine): kein Problem, läuft out-of-the-box.

**Gilt für alle Sessions:** Wenn `npm install` oder `node server.js` lokal fehlschlägt, zuerst Node-Version prüfen (`node --version`). System-Node via Homebrew ist aktuell v25.

---
