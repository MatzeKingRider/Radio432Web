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

## Pitch-Shift / Frequenzumwandlung (gelöst 2026-06-04)

**Problem:** Die Frequenzauswahl (432 Hz, 528 Hz etc.) in den Web-Einstellungen hat im Browser keine hörbare Wirkung.

**Ursache:** Fehlende Web Audio API Implementierung. iOS nutzt `AVAudioUnitTimePitch`, Browser brauchte einen Phase-Vocoder.

**Lösung:** Custom AudioWorklet mit Phase-Vocoder (Radix-2 FFT, Larson-Schema Phasenpropagation, Overlap-Add Synthese).

**Implementierung:**
- `frontend/public/pitch-shifter-worklet.js`: 248 Zeilen, FRAME_SIZE=2048, HOP_SIZE=512 (75% Overlap), Latenz ~46ms
- `frontend/src/hooks/useAudio.js`: AudioWorklet laden, pitchNode im Graph zwischen source/analyser, reactive Subscription auf `frequency` State
- `frontend/src/components/Settings/SettingsView.jsx`: Hint-Text aktualisiert
- Formel: `pitchCents = 1200 * log2(hz/440)` — identisch zu iOS
- Bypass bei 440 Hz (0 Cents) — direkte Kopie ohne FFT-Overhead

**Testing (lokal erfolgreich):**
- Worklet lädt fehlerfrei unter Vite Dev-Server
- AudioContext wird korrekt aufgebaut mit 4 Nodes (source → pitch → analyser → destination)
- Frequenzwechsel wird im Frontend-State aktualisiert
- Pitch-Parameter werden via linearRampToValueAtTime aktualisiert (sanfte Übergänge)

---
