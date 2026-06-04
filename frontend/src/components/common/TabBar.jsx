import { Star, Search, Settings } from 'lucide-react'

const TABS = [
  { id: 'favorites', label: 'Favoriten', Icon: Star },
  { id: 'search', label: 'Suche', Icon: Search },
  { id: 'settings', label: 'Einstellungen', Icon: Settings },
]

// Sticky-Tableiste unten, 3 Tabs, respektiert die Safe-Area.
export default function TabBar({ active, onChange }) {
  return (
    <nav
      className="shrink-0 flex safe-bottom"
      style={{
        background: 'var(--color-tabbar-bg)',
        borderTop: '1px solid var(--color-separator)',
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 h-16"
            style={{ color: isActive ? 'var(--color-tabbar-active)' : 'var(--color-tabbar-inactive)' }}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={22} fill={isActive ? 'currentColor' : 'none'} strokeWidth={isActive ? 2 : 1.8} />
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
