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

## Hintergrundtexturen nicht sichtbar (gelöst)

**Problem:** Hintergrundtexturen wurden per `z-index: -10` auf `position: fixed`-Divs angezeigt — die `body`-Hintergrundfarbe überdeckte sie.

**Ursache:** Fixed-Elemente mit negativem z-index landen unter dem Viewport-Hintergrund wenn `body`/`html` eine explizite Hintergrundfarbe hat.

**Lösung:** Textur direkt auf `html`-Element per CSS Custom Property (`--texture-url`) + `background-image` — funktioniert zuverlässig ohne z-index-Konflikte. `body::before` Pseudo-Element-Ansatz hatte das gleiche Problem.

---

## Pitch-Shift / Frequenzumwandlung (nicht implementiert — komplexe Anforderung)

**Problem:** Die Frequenzauswahl (432 Hz, 528 Hz etc.) in den Web-Einstellungen hat im Browser keine hörbare Wirkung.

**Ursache:** Web Audio API Pitch-Shifting braucht einen Phase-Vocoder (STFT + Phasenpropagation). Das ist ein komplexer Algorithmus mit vielen Fallstricken (Fensterüberlap, FFT-Fehler, Ringpuffer-Synchronisation).

**Versuche:**
- Erste Implementierung: Radix-2 FFT mit Larson-Schema Phase-Propagation → zu viele subtile Bugs
- Zweite Implementierung: Verbesserter Ringpuffer + bessere FFT → immer noch nicht funktionsfähig

**Stand:** Die Frequenzauswahl speichert die Präferenz im Backend (`PUT /api/settings`) und synchronisiert sie zur iOS-App. Im Browser findet kein Pitch-Shifting statt — diese Einschränkung ist bewusst dokumentiert.

**Wenn doch gewünscht:** Eine getestete externe Bibliothek wie `Tone.js` Pitch-Shifter oder eine voll-validierte AudioWorklet-Implementierung (z.B. aus WebRTC/Chrome Sources) nutzen. Custom Phase-Vocoder ist für Production nicht empfohlen.

---
