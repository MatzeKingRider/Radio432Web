# Radio432 — Eingebettete Display-Schriften

Dieser Ordner (`Radio432Web/public/fonts/`) ist der **Repo-Ablageort** der
TTFs fuer das spaetere iOS/tvOS-Bundling. Die Web-App liest sie zur Laufzeit
aus `frontend/public/fonts/` (Vite-`publicDir`) — beide Ordner enthalten
dieselben Dateien. Eingebunden werden sie self-hosted in der Web-App
(`frontend/src/styles/fonts.css`, geladen ueber `/fonts/...`) und sind so
gewaehlt, dass sie spaeter **1:1 in die iOS/tvOS-App gebuendelt** werden koennen
(gleiche Dateien, gleiche Family-Namen).

Alle Schriften stehen unter der **SIL Open Font License (OFL)**.

## Zuordnung Schrift → Display-Stil

| TTF-Datei                          | CSS-Family-Name    | Genutzt von Display-Stil(en)                          |
|------------------------------------|--------------------|-------------------------------------------------------|
| `VT323-Regular.ttf`                | `VT323`            | `dot` (Plasma/Dot-Matrix), `term` (Terminal)          |
| `ShareTechMono-Regular.ttf`        | `Share Tech Mono`  | `vfd`, `lcd`, `tuner`, `cassette`                      |
| `Orbitron-VariableFont_wght.ttf`   | `Orbitron`         | `nixie` (Nixie-Roehre)                                 |
| `Inter-VariableFont.ttf`           | `Inter`            | `oled`, `chrome`, UI-Fallback                          |
| `DSEG14Classic-Regular.ttf`        | `DSEG14 Classic`   | `amber` (Bernstein 14-Segment, Text + Ziffern)        |
| `DSEG14Classic-Bold.ttf`           | `DSEG14 Classic` (700) | `amber` (fett)                                    |
| `DSEG7Classic-Regular.ttf`         | `DSEG7 Classic`    | reine 7-Segment-Ziffern (Reserve, z.B. Frequenz-Readout)|
| `DSEG7Classic-Bold.ttf`            | `DSEG7 Classic` (700)  | reine 7-Segment-Ziffern (fett)                    |

## Hinweise fuer iOS/tvOS-Bundling

- Die exakt selben TTF-Dateien in das App-Bundle aufnehmen und in der
  `Info.plist` unter `UIAppFonts` registrieren.
- Family-Namen in SwiftUI muessen ggf. dem internen PostScript-/Family-Namen
  der TTF entsprechen (nicht zwingend identisch mit den CSS-`font-family`-Namen
  oben) — vor dem Einsatz mit `UIFont.familyNames` / `fontNames(forFamilyName:)`
  pruefen.
- Variable Fonts (Orbitron, Inter): iOS unterstuetzt variable TTFs; falls ein
  fixes Gewicht gewuenscht ist, kann eine statische Instanz exportiert werden.

## Quellen

- VT323, Share Tech Mono, Orbitron, Inter: Google Fonts (github.com/google/fonts), OFL.
- DSEG7/DSEG14: keshikan/DSEG (npm-Paket `dseg`), OFL.
