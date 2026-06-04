# Pitch-Shifting Analysis — Radio432Web

## Problem
Die Frequenzauswahl (396–963 Hz) ist die **Kernfunktion** der App. Ohne funktionierendes Pitch-Shifting ist die App für den Nutzer wertlos.

**Status:** Nicht implementiert. Custom Web Audio API AudioWorklet-Ansatz gescheitert.

---

## Gescheiterte Versuche (2026-06-04)

### Versuch 1: Radix-2 FFT mit Phase-Vocoder
- **Ansatz:** Custom STFT + Phasenpropagation + Overlap-Add
- **Problem:** Ringpuffer-Synchronisation fehlerhaft, FFT-Implementierung zu fehleranfällig
- **Fehlgeschlagen:** Phase-Vocoder ist Production-Code, keine 2h Schnellimplementierung

### Versuch 2: Verbesserter Ringpuffer + bessere FFT
- **Ansatz:** Korrigierte Buffer-Logik, sauberer Sliding-Window
- **Problem:** Immer noch nicht funktionsfähig nach lokalem Test
- **Grund:** Zu viele subtile Timing/Synchronisations-Fehler bei echtem Audio-Stream

---

## Realistische Optionen

### Option A: Tone.js PitchShift Effect (schnell, aber externe Dependency)
- **Was:** npm-Package `tone` mit `Tone.PitchShift()` Effect
- **Aufwand:** ~2h (Install, Wire up, Test)
- **Qualität:** Gut (Tone.js ist Production-Grade)
- **Nachteile:** +250kb Bundle-Size, externe Dependency
- **Vorteil:** Funktioniert sofort, getestet, mit Warranty
- **Risiko:** Gering

### Option B: SoundTouch.js (spezialisiert auf Pitch-Shifting, veraltet)
- **Was:** npm-Package `soundtouchjs` — spezialisierte Pitch-Shifter-Library
- **Aufwand:** ~3h (Integration, Bugs reparieren)
- **Qualität:** OK (aber seit 2020 nicht gewartet)
- **Nachteile:** Veraltet, möglicherweise Browser-Inkompatibilität
- **Vorteil:** Spezialisiert auf Pitch-Shifting
- **Risiko:** Mittel (Wartung unsicher)

### Option C: Web Audio Modules (WAM) Plugin (komplex, Zukunft)
- **Was:** Dezentralisierte Audio-Plugin-Architektur
- **Aufwand:** ~8h (Lernkurve, Plugin-Integration, Testing)
- **Qualität:** Exzellent (wenn fertiges Plugin existiert)
- **Nachteile:** Noch nicht weit verbreitet
- **Vorteil:** Modularer, wiederverwendbar
- **Risiko:** Hoch (neue Technologie, wenig Dokumentation)

### Option D: Backend-seitiges Pitch-Shifting (teuer, aber stabil)
- **Was:** Backend speichert Audio mit Pitch-Shift, streamt zu Client
- **Aufwand:** ~12h (FFmpeg/Rubberband Integration, Performance-Tuning)
- **Qualität:** Exzellent (Server-seitig, getestet)
- **Nachteile:** Server-CPU teuer, Latenz möglich
- **Vorteil:** Keine Client-Limitierungen, stabil
- **Risiko:** Niedrig (getestete Server-Libraries)

---

## Empfehlung

**Option A (Tone.js)** ist die beste Balance:
- ✅ Schnell (2h)
- ✅ Funktioniert zuverlässig
- ✅ Getesteter Production-Code
- ✅ Gute Dokumentation
- ⚠️ Kleine externe Dependency

---

## Sub-Agent-Ansatz für Implementierung

```
Phase 1 (Parallel):
  - Agent 1: Tone.js Integration planen (useAudio.js, SettingsView.jsx)
  - Agent 2: SoundTouch.js Alternative recherchieren (Fallback-Option)
  
Phase 2 (Sequential):
  - Agent 3: Tone.js installieren + Audio-Graph aufbauen
  - Agent 4: Pitch-Parameter reaktiv mit settingsStore verbinden
  - Agent 5: Local Testing (Browser-Audio hören)
  
Phase 3:
  - Agent 6: Finale Verifizierung + Dokumentation
```

---

## Zeitbudget

| Option | Estimate | Confidence |
|--------|----------|------------|
| A (Tone.js) | 2–3h | Hoch |
| B (SoundTouch) | 3–4h | Mittel |
| C (WAM) | 8h | Niedrig |
| D (Backend) | 12h | Hoch |

**Empfehlung:** Option A, Agent-gesteuert → 2h, dann Session beenden.
