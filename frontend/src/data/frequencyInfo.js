// Inhalt der Frequenz-Infoseite. Bewusst ehrlich gehalten: belegte Fakten und
// unbelegte (Wellness-/Esoterik-)Behauptungen sind klar getrennt.
// Quelle: eigene Recherche, Stand 2026-06. Wird auf Web + iOS/tvOS identisch genutzt.

export const frequencyIntro = {
  title: 'Was bedeutet die Frequenz-Einstellung?',
  paragraphs: [
    'Die App verschiebt den Klang des Radio-Streams in der Tonhöhe („Pitch-Shift"): Die Tonhöhe ändert sich, das Tempo bleibt gleich (anders als bei einer langsamer gedrehten Schallplatte).',
    'Die zehn Werte gehören zu zwei verschiedenen Konzepten, die oft verwechselt werden:',
    'Stimmton-Referenzen (432, 440, 444 Hz) sind Bezugstöne für den Kammerton A4, nach dem ein ganzes Stück gestimmt wird. Verschiebt man ihn, rutscht das ganze Stück proportional mit — die Melodie bleibt erhalten.',
    'Solfeggio-Frequenzen (396, 417, 528, 639, 741, 852, 963 Hz) sind keine Stimmreferenzen, sondern einzelne feste Töne aus einem esoterischen Zahlensystem (1970er/1999). Die ihnen zugeschriebenen Heilwirkungen sind wissenschaftlich nicht belegt.',
  ],
}

export const honestyNote = {
  title: 'Beleg vs. Behauptung',
  text: 'Auf dieser Seite steht „Beleg" für historisch/physikalisch Nachweisbares und „Behauptung" für verbreitete Wellness-/Esoterik-Aussagen ohne wissenschaftlichen Nachweis. Dass Musik allgemein das Wohlbefinden beeinflusst, ist anerkannt — das ist aber etwas anderes als die Behauptung, eine exakte Einzelfrequenz habe eine spezifische körperliche Wirkung. Letzteres ist nicht belegt.',
}

// group: 'tuning' (Stimmton-Referenz) | 'solfeggio'
// open: standardmäßig offener Eintrag (nur 432 Hz)
export const frequencies = [
  {
    hz: 432,
    group: 'tuning',
    subtitle: '„Verdi-/wissenschaftliche Stimmung"',
    open: true,
    what: 'Eine alternative, etwas tiefere Stimmung (ca. 32 Cent tiefer als 440 Hz). Heute vor allem in der Wellness-Szene beliebt.',
    facts: [
      'Verwandt mit der „wissenschaftlichen Stimmung" C = 256 Hz (Physiker Joseph Sauveur, 1713). Bei C = 256 Hz ist jede C-Oktave eine glatte Zweierpotenz (256, 512, 1024 …) — reine Rechenbequemlichkeit, kein akustischer oder biologischer Effekt.',
      'Giuseppe Verdi trat für tiefere Stimmung ein (sein Requiem 1874 auf 435 Hz) und nannte 432 Hz für Orchester etwas vorteilhafter. Seine Gründe waren praktisch (Schonung der Sängerstimmen), nicht mystisch. Eine italienische Regelung dazu (1880er) wurde nie umgesetzt.',
    ],
    claims: [
      '„432 Hz sei die natürliche Frequenz des Universums, resoniere mit der Erde, mit Wasser im Körper oder mit der DNA, oder sei universell beruhigender." Dafür gibt es keinen wissenschaftlichen Beleg; diese Zahlenbezüge sind numerologisch, nicht physikalisch.',
    ],
    study: 'Zwei kleine Pilotstudien geben Hinweise (keine Beweise): Pflegekräfte (Italien 2022, n=54) zeigten bei 432 Hz leicht gesenkte Atemfrequenz/Blutdruck — allerdings wurde die 432-Hz-Musik leiser gehört (Störfaktor). Krebspatienten (2025, n=43) zeigten bei 432 Hz eine etwas stärker gesenkte Herzfrequenz, nur kurzfristig. Plausibelste Deutung: tiefer gestimmte Musik entspannt allgemein etwas mehr — nicht wegen der „magischen" Zahl 432.',
  },
  {
    hz: 440,
    group: 'tuning',
    subtitle: 'Weltstandard',
    what: 'Der heute international gültige Kammerton A4. Fast die gesamte produzierte Musik nutzt ihn — er ist die Referenz (0 Cent).',
    facts: [
      '1834 in Stuttgart erstmals empfohlen (Scheibler), 1939 auf einer Konferenz in London international vereinbart.',
      '1955 von der ISO als Empfehlung übernommen, 1975 als Norm ISO 16 festgeschrieben.',
    ],
    claims: [
      '„440 Hz sei künstlich, dissonant oder aus politischen Motiven eingeführt worden, um Menschen negativ zu beeinflussen." Dafür gibt es keinen historischen Beleg — die Standardisierung war ein technisch-praktischer Prozess.',
    ],
  },
  {
    hz: 444,
    group: 'tuning',
    subtitle: '„528-Variante"',
    what: 'Eine selten genutzte, leicht höhere Stimmung (ca. 16 Cent höher als 440 Hz). In der Sound-Healing-Szene beliebt, weil bei A = 444 Hz das C nahe an 528 Hz liegt.',
    facts: [
      'Entstand aus inkrementeller Stimmgabel-Praxis im frühen 20. Jahrhundert — es gibt keinen einzelnen „Erfinder".',
      'Der Reiz für die Szene ist die rechnerische Nähe zu C ≈ 528 Hz.',
    ],
    claims: [
      'Verknüpfungen zur „Liebesfrequenz" 528 Hz. Die oft erzählte Geschichte „John Lennon stimmte auf 444/528" ist anekdotisch und unbelegt. Eigene wissenschaftliche Studien zu 444 Hz gibt es nicht.',
    ],
  },
  {
    hz: 396,
    group: 'solfeggio',
    subtitle: 'Solfeggio „UT"',
    what: 'Einzelner fester Ton aus dem Solfeggio-System (keine Stimmreferenz).',
    claims: ['Zugeschrieben (unbelegt): „Befreiung von Angst und Schuld". Keine belastbaren wissenschaftlichen Wirknachweise.'],
  },
  {
    hz: 417,
    group: 'solfeggio',
    subtitle: 'Solfeggio „RE"',
    what: 'Einzelner fester Ton aus dem Solfeggio-System.',
    claims: ['Zugeschrieben (unbelegt): „Veränderung erleichtern, Situationen lösen". Keine belastbaren wissenschaftlichen Wirknachweise.'],
  },
  {
    hz: 528,
    group: 'solfeggio',
    subtitle: 'Solfeggio „MI" — „Liebesfrequenz"',
    what: 'Die prominenteste Solfeggio-Frequenz, oft „Wunderton" genannt.',
    claims: [
      'Zugeschrieben (unbelegt): „Liebe, Transformation, Wunder" und eine angebliche „DNA-Reparatur". Letzteres ist wissenschaftlich nicht belegt — es ist kein Mechanismus bekannt, über den eine Schallwelle DNA gezielt reparieren könnte (DNA-Reparatur läuft chemisch-enzymatisch ab).',
    ],
    study: 'Zwei kleine reale Studien beweisen nichts dergleichen: Japan 2018 (nur 9 Personen, 5 Minuten) — 528 Hz senkte kurzfristig das Stresshormon Cortisol; sehr kleine, unausgewogene Stichprobe. Eine Zellkultur-Studie 2017 (Reagenzglas, nicht auf Menschen übertragbar) erschien zudem in einem Verlag mit umstrittenem Ruf und wurde nicht repliziert.',
  },
  {
    hz: 639,
    group: 'solfeggio',
    subtitle: 'Solfeggio „FA"',
    what: 'Einzelner fester Ton aus dem Solfeggio-System.',
    claims: ['Zugeschrieben (unbelegt): „Beziehungen, Verbindung, Kommunikation". Keine belastbaren wissenschaftlichen Wirknachweise.'],
  },
  {
    hz: 741,
    group: 'solfeggio',
    subtitle: 'Solfeggio „SOL"',
    what: 'Einzelner fester Ton aus dem Solfeggio-System.',
    claims: ['Zugeschrieben (unbelegt): „Ausdruck, Lösungen, Entgiftung". Keine belastbaren wissenschaftlichen Wirknachweise.'],
  },
  {
    hz: 852,
    group: 'solfeggio',
    subtitle: 'Solfeggio „LA"',
    what: 'Einzelner fester Ton aus dem Solfeggio-System.',
    claims: ['Zugeschrieben (unbelegt): „Intuition, spirituelle Ordnung". Keine belastbaren wissenschaftlichen Wirknachweise.'],
  },
  {
    hz: 963,
    group: 'solfeggio',
    subtitle: 'Solfeggio „Krone" (später ergänzt)',
    what: 'Einzelner fester Ton; gehört zu den drei nachträglich ergänzten Solfeggio-Tönen (174, 285, 963).',
    claims: ['Zugeschrieben (unbelegt): „Erwachen, Verbindung zum Höheren". Keine belastbaren wissenschaftlichen Wirknachweise.'],
  },
]

// Gemeinsame Herkunft der Solfeggio-Frequenzen (belegt) — als Hinweis über der Solfeggio-Gruppe.
export const solfeggioOrigin = {
  title: 'Herkunft der Solfeggio-Frequenzen',
  text: 'Die Solfeggio-Frequenzen sind keine antike Überlieferung. Sie wurden von Dr. Joseph Puleo (Naturheilkundler) über eine numerologische Zahlen-Deutung „wiederentdeckt" und durch das Buch „Healing Codes for the Biological Apocalypse" (Horowitz & Puleo, 1999) populär gemacht. Der Name verweist auf die mittelalterlichen Solmisationssilben (Guido von Arezzo, 11. Jh.) — die Zuordnung exakter Hertz-Werte dazu ist aber nachträglich und unbelegt (im Mittelalter gab es weder Hertz-Messung noch Tonhöhen-Standard). Der Faktencheck-Dienst Science Feedback stuft die Wirkungsversprechen als „nicht belegt" ein.',
}

export const sources = [
  ['A440 / ISO 16 (Geschichte)', 'https://en.wikipedia.org/wiki/A440_(pitch_standard)'],
  ['Wissenschaftliche Stimmung C=256, Sauveur, Verdi', 'https://en.wikipedia.org/wiki/Scientific_pitch'],
  ['Kammerton (Concert pitch)', 'https://en.wikipedia.org/wiki/Concert_pitch'],
  ['ISO 16:1975', 'https://www.iso.org/standard/3601.html'],
  ['Pitch-Shift vs. Time-Stretch', 'https://en.wikipedia.org/wiki/Audio_time_stretching_and_pitch_scaling'],
  ['Solfeggio-Ursprung (Puleo/Horowitz)', 'https://www.soundmedicineacademy.com/pages/sound-healing-blog/solfeggio-frequencies'],
  ['Guido von Arezzo / Ut queant laxis', 'https://en.wikipedia.org/wiki/Ut_queant_laxis'],
  ['Faktencheck Solfeggio (Science Feedback)', 'https://science.feedback.org/review/no-evidence-support-claim-solfeggio-frequencies-remove-toxins-from-body/'],
  ['Studie 432 vs 440 (Pflegekräfte 2022)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9534204/'],
  ['Studie 432 vs 443 (Krebspatienten 2025)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11755923/'],
  ['Studie 528 Hz Cortisol (Japan 2018)', 'https://www.scirp.org/journal/paperinformation?paperid=87146'],
]
