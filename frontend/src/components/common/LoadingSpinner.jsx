import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10" style={{ color: 'var(--color-text-secondary)' }}>
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
      {label && <span className="text-[13px]">{label}</span>}
    </div>
  )
}
