import { useEffect, useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import {
  frequencyIntro,
  frequencies,
  solfeggioIntro,
  history,
  disclaimer,
} from '../../data/frequencyInfo'

// Erklär-/Infoseite zu den Frequenzen (über die Einstellungen erreichbar).
// Warmer, erfahrungs-/wahlbasierter Ton (abgestimmt mit der Marketing-Seite);
// ausklappbare Bereiche je Frequenz, 432 Hz standardmäßig offen.
export default function FrequencyInfo({ open, onClose }) {
  const [shown, setShown] = useState(false)
  const [openHz, setOpenHz] = useState(() => new Set(frequencies.filter((f) => f.open).map((f) => f.hz)))
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
  }, [open])

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
            {solfeggioIntro.title}
          </h3>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {solfeggioIntro.text}
          </p>
        </section>
        <div className="space-y-2">
          {solfeggio.map((f) => (
            <FreqAccordion key={f.hz} freq={f} isOpen={openHz.has(f.hz)} onToggle={() => toggle(f.hz)} />
          ))}
        </div>

        {/* Hintergrund & Geschichte (einklappbar) */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-separator)' }}
        >
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="w-full flex items-center justify-between px-3 py-3 text-left"
          >
            <span className="text-[14px] font-semibold" style={{ color: 'var(--color-text)' }}>
              {history.title}
            </span>
            <ChevronDown
              size={18}
              className="shrink-0 transition-transform"
              style={{ color: 'var(--color-text-secondary)', transform: historyOpen ? 'rotate(180deg)' : 'none' }}
            />
          </button>
          {historyOpen && (
            <div className="px-3 pb-3 space-y-3" style={{ borderTop: '1px solid var(--color-separator)' }}>
              {history.sections.map((s, i) => (
                <div key={i} className="pt-3">
                  <h4 className="text-[13px] font-semibold mb-1" style={{ color: 'var(--color-text)' }}>{s.heading}</h4>
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{s.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] leading-relaxed pt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {disclaimer}
        </p>

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
        className="w-full flex items-center justify-between gap-2 px-3 py-3 text-left"
      >
        <span className="flex items-baseline gap-2 min-w-0">
          <span className="text-[16px] font-semibold shrink-0" style={{ color: 'var(--color-accent)' }}>
            {freq.hz} Hz
          </span>
          <span className="text-[12px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {freq.subtitle}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {freq.badge && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-accent)', color: 'var(--btn-fg)' }}
            >
              {freq.badge}
            </span>
          )}
          {freq.theme && !freq.badge && (
            <span className="text-[11px] hidden sm:inline" style={{ color: 'var(--color-accent)' }}>
              {freq.theme}
            </span>
          )}
          <ChevronDown
            size={18}
            className="transition-transform"
            style={{ color: 'var(--color-text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'none' }}
          />
        </span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--color-separator)' }}>
          {freq.theme && (
            <div className="text-[12px] font-medium" style={{ color: 'var(--color-accent)' }}>
              Thema: {freq.theme}
            </div>
          )}
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text)' }}>
            {freq.description}
          </p>
        </div>
      )}
    </div>
  )
}
