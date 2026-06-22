import { useEffect, useState } from 'react'
import { X, ChevronDown, Check, AlertTriangle } from 'lucide-react'
import {
  frequencyIntro,
  honestyNote,
  frequencies,
  solfeggioOrigin,
  sources,
} from '../../data/frequencyInfo'

// Erklär-/Infoseite zu den Frequenzen (über die Einstellungen erreichbar).
// Ausklappbare Bereiche je Frequenz, 432 Hz standardmäßig offen. Belegte Fakten
// und unbelegte Behauptungen werden bewusst getrennt dargestellt.
export default function FrequencyInfo({ open, onClose }) {
  const [shown, setShown] = useState(false)
  // Offene Akkordeons (mehrere erlaubt). Start: nur die mit open: true (432 Hz).
  const [openHz, setOpenHz] = useState(() => new Set(frequencies.filter((f) => f.open).map((f) => f.hz)))

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
  }, [open])

  // ESC schließt.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function toggle(hz) {
    setOpenHz((prev) => {
      const next = new Set(prev)
      if (next.has(hz)) next.delete(hz)
      else next.add(hz)
      return next
    })
  }

  const tuning = frequencies.filter((f) => f.group === 'tuning')
  const solfeggio = frequencies.filter((f) => f.group === 'solfeggio')

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col safe-top safe-bottom transition-transform duration-300"
      style={{
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
        backgroundColor: 'var(--color-background)',
        backgroundImage: 'var(--texture-url)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Kopfzeile */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--color-separator)' }}
      >
        <h1 className="text-[17px] font-semibold" style={{ color: 'var(--color-text)' }}>
          Frequenzen verstehen
        </h1>
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="btn-material w-10 h-10 flex items-center justify-center"
        >
          <X size={20} />
        </button>
      </div>

      {/* Inhalt */}
      <div className="flex-1 scroll-area px-4 py-4 space-y-5 overflow-y-auto">
        {/* Einleitung */}
        <section>
          <h2 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            {frequencyIntro.title}
          </h2>
          <div className="space-y-2">
            {frequencyIntro.paragraphs.map((p, i) => (
              <p key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                {p}
              </p>
            ))}
          </div>
        </section>

        {/* Hinweis Beleg vs. Behauptung */}
        <section
          className="rounded-xl p-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}
        >
          <h3 className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-accent)' }}>
            {honestyNote.title}
          </h3>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {honestyNote.text}
          </p>
        </section>

        {/* Stimmton-Referenzen */}
        <GroupLabel>Stimmton-Referenzen</GroupLabel>
        <div className="space-y-2">
          {tuning.map((f) => (
            <FreqAccordion key={f.hz} freq={f} isOpen={openHz.has(f.hz)} onToggle={() => toggle(f.hz)} />
          ))}
        </div>

        {/* Solfeggio */}
        <GroupLabel>Solfeggio-Frequenzen</GroupLabel>
        <section
          className="rounded-xl p-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}
        >
          <h3 className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            {solfeggioOrigin.title}
          </h3>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {solfeggioOrigin.text}
          </p>
        </section>
        <div className="space-y-2">
          {solfeggio.map((f) => (
            <FreqAccordion key={f.hz} freq={f} isOpen={openHz.has(f.hz)} onToggle={() => toggle(f.hz)} />
          ))}
        </div>

        {/* Quellen */}
        <section className="pt-2">
          <h2 className="text-[14px] font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            Quellen
          </h2>
          <ul className="space-y-1">
            {sources.map(([label, url]) => (
              <li key={url} className="text-[12px]">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline break-words"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div className="h-4" />
      </div>
    </div>
  )
}

function GroupLabel({ children }) {
  return (
    <h2
      className="text-[12px] font-semibold uppercase tracking-wide pt-1"
      style={{ color: 'var(--color-text-secondary)' }}
    >
      {children}
    </h2>
  )
}

function FreqAccordion({ freq, isOpen, onToggle }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3 py-3 text-left"
      >
        <span className="flex items-baseline gap-2 min-w-0">
          <span className="text-[16px] font-semibold shrink-0" style={{ color: 'var(--color-accent)' }}>
            {freq.hz} Hz
          </span>
          <span className="text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {freq.subtitle}
          </span>
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 transition-transform"
          style={{ color: 'var(--color-text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3" style={{ borderTop: '1px solid var(--color-separator)' }}>
          {freq.what && (
            <p className="text-[13px] leading-relaxed pt-3" style={{ color: 'var(--color-text)' }}>
              {freq.what}
            </p>
          )}

          {freq.facts?.length > 0 && (
            <div className="space-y-1.5">
              {freq.facts.map((t, i) => (
                <Item key={i} kind="fact" text={t} />
              ))}
            </div>
          )}

          {freq.claims?.length > 0 && (
            <div className="space-y-1.5">
              {freq.claims.map((t, i) => (
                <Item key={i} kind="claim" text={t} />
              ))}
            </div>
          )}

          {freq.study && (
            <div
              className="rounded-lg p-2.5 text-[12px] leading-relaxed"
              style={{ background: 'var(--color-background)', color: 'var(--color-text-secondary)' }}
            >
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>Studienlage: </span>
              {freq.study}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Ein Fakt ("Beleg", grünes Häkchen) oder eine Behauptung ("Behauptung", Warnsymbol).
function Item({ kind, text }) {
  const isFact = kind === 'fact'
  const color = isFact ? '#2FBF5B' : '#E0922A'
  const Icon = isFact ? Check : AlertTriangle
  const label = isFact ? 'Beleg' : 'Behauptung'
  return (
    <div className="flex gap-2">
      <Icon size={15} className="shrink-0 mt-0.5" style={{ color }} />
      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        <span className="font-semibold" style={{ color }}>{label}: </span>
        {text}
      </p>
    </div>
  )
}
