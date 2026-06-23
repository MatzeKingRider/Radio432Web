// Inhalt der Frequenz-Infoseite — warmer, erfahrungs-/wahlbasierter Ton,
// 1:1 abgestimmt mit der Marketing-Seite (Radio432Marketing/). Solfeggio-Themen
// sind „traditionell zugeordnet", keine Wirkbehauptungen. Disclaimer am Ende.
// Wird auf Web + iOS/tvOS inhaltlich identisch genutzt.

export const frequencyIntro = {
  title: 'Frequenzen, einfach erklärt',
  paragraphs: [
    'Der Kammerton ist der Bezugston, nach dem ein ganzes Stück gestimmt wird. Verschiebt man ihn, rutscht die komplette Musik harmonisch mit — die Melodie bleibt vollständig erhalten. Du wählst, was sich für dich richtig anfühlt.',
    'Radio432 verschiebt den Klang nur in der Tonhöhe („Pitch-Shift"): Die Musik wird nicht langsamer, sie klingt eine Spur tiefer und runder.',
  ],
}

// group: 'tuning' (Stimmton-Referenz) | 'solfeggio'
// open: standardmäßig offener Eintrag (nur 432 Hz)
export const frequencies = [
  {
    hz: 432,
    group: 'tuning',
    subtitle: 'Verdi-Stimmung',
    badge: 'Beliebt',
    open: true,
    description:
      'Etwas tiefer als der Standard — rund 32 Cent unter 440 Hz. Viele Hörer empfinden sie als wärmer, weicher und entspannter. Schon Giuseppe Verdi setzte sich für eine tiefere Orchesterstimmung ein, weil sie die Stimmen schont und voller klingt. 432 Hz steht zudem in der Tradition der „wissenschaftlichen Stimmung" rund um C = 256 Hz — Zahlen, die sich angenehm rund anfühlen.',
  },
  {
    hz: 440,
    group: 'tuning',
    subtitle: 'Der Weltstandard',
    description:
      'Der heute übliche Kammerton A4. Fast jede Aufnahme nutzt ihn — die vertraute Referenz. 1939 international vereinbart, seit 1975 als Norm „ISO 16" festgeschrieben.',
  },
  {
    hz: 444,
    group: 'tuning',
    subtitle: 'Eine Spur heller',
    description:
      'Etwas höher gestimmt. In der Klangwelt rund um 528 Hz beliebt, weil dort das C nahe 528 liegt.',
  },
  {
    hz: 528,
    group: 'solfeggio',
    syllable: 'MI',
    theme: 'Liebe · Transformation',
    subtitle: 'Solfeggio · MI',
    description: 'Die bekannteste Solfeggio-Frequenz. Traditionell den Themen Liebe und Transformation zugeordnet.',
  },
  {
    hz: 396,
    group: 'solfeggio',
    syllable: 'UT',
    theme: 'Loslassen',
    subtitle: 'Solfeggio · UT',
    description: 'Traditionell dem Thema Loslassen zugeordnet.',
  },
  {
    hz: 417,
    group: 'solfeggio',
    syllable: 'RE',
    theme: 'Veränderung',
    subtitle: 'Solfeggio · RE',
    description: 'Traditionell dem Thema Veränderung zugeordnet.',
  },
  {
    hz: 639,
    group: 'solfeggio',
    syllable: 'FA',
    theme: 'Verbindung',
    subtitle: 'Solfeggio · FA',
    description: 'Traditionell dem Thema Verbindung zugeordnet.',
  },
  {
    hz: 741,
    group: 'solfeggio',
    syllable: 'SOL',
    theme: 'Ausdruck',
    subtitle: 'Solfeggio · SOL',
    description: 'Traditionell dem Thema Ausdruck zugeordnet.',
  },
  {
    hz: 852,
    group: 'solfeggio',
    syllable: 'LA',
    theme: 'Intuition',
    subtitle: 'Solfeggio · LA',
    description: 'Traditionell dem Thema Intuition zugeordnet.',
  },
  {
    hz: 963,
    group: 'solfeggio',
    syllable: 'Krone',
    theme: 'Klarheit',
    subtitle: 'Solfeggio · Krone',
    description: 'Traditionell dem Thema Klarheit zugeordnet.',
  },
]

export const solfeggioIntro = {
  title: 'Die Solfeggio-Frequenzen',
  text: 'Sieben besondere Töne mit langer Tradition — ihr Name geht auf die mittelalterlichen Solmisationssilben von Guido von Arezzo zurück (11. Jahrhundert), jenes „Ut–Re–Mi", aus dem unser heutiges „Do–Re–Mi" wurde. Jeder Frequenz wird traditionell ein eigenes Thema zugeordnet.',
}

// Optionaler einklappbarer Vertiefungs-Block.
export const history = {
  title: 'Hintergrund & Geschichte',
  sections: [
    {
      heading: 'Was ist der Kammerton?',
      text: 'Damit ein Orchester zusammen klingt, einigen sich alle auf einen gemeinsamen Bezugston — den Kammerton, das „A" in mittlerer Lage (A4). Er ist kein Klang für sich, sondern ein Maßstab. Heute liegt er bei 440 Hertz (440 Schwingungen pro Sekunde). Stimmt man ihn tiefer, sinken alle Töne gleichmäßig — die Musik bleibt dieselbe, nur eine Spur wärmer.',
    },
    {
      heading: 'Wie 440 Hz zur Norm wurde',
      text: 'Lange gab es keine einheitliche Stimmung. 1834 wurde in Stuttgart erstmals ein A mit 440 Hz vorgeschlagen (Physiker Johann Scheibler), 1939 international in London vereinbart, 1955 von der ISO empfohlen und 1975 als Norm „ISO 16" festgeschrieben.',
    },
    {
      heading: 'Woher 432 Hz kommt',
      text: '432 Hz hat eine lange Tradition und hängt mit der „wissenschaftlichen Stimmung" zusammen, bei der das C bei 256 Hz liegt (schon 1713 von Joseph Sauveur beschrieben) — daraus ergibt sich für das A ein Wert nahe 432 Hz. Giuseppe Verdi bevorzugte eine tiefere Orchesterstimmung (sein Requiem 1874 auf 435 Hz), weil sie die Stimmen schont und voller klingt.',
    },
  ],
}

export const disclaimer =
  'Radio432 verändert die Tonhöhe nach deinem Gehör — es macht keine gesundheitlichen Heilversprechen.'
