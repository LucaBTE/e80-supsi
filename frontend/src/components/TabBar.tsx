import { useRef, type KeyboardEvent } from 'react'
import { FolderKanban, Info, Network, Workflow, type LucideIcon } from 'lucide-react'

export type Tab = 'processi' | 'progetti' | 'analisi' | 'info'

export const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'processi', label: 'Processi', icon: Workflow },
  { key: 'progetti', label: 'Progetti', icon: FolderKanban },
  { key: 'analisi', label: 'Analisi impatto', icon: Network },
  { key: 'info', label: 'Informazioni', icon: Info },
]

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    const next = (i + d + TABS.length) % TABS.length
    onChange(TABS[next].key)
    refs.current[next]?.focus()
  }
  return (
    <nav role="tablist" aria-label="Sezioni" className="flex overflow-x-auto border-b border-line">
      {TABS.map((t, i) => {
        const on = tab === t.key
        const Icon = t.icon
        return (
          <button
            key={t.key}
            ref={(el) => void (refs.current[i] = el)}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={on}
            aria-controls={`view-${t.key}`}
            tabIndex={on ? 0 : -1}
            type="button"
            onClick={() => onChange(t.key)}
            onKeyDown={(e) => onKey(e, i)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-4 px-4 py-2.5 text-xs font-bold uppercase tracking-eyebrow transition-colors ${
              on ? 'border-accent-4 text-e80-black' : 'border-transparent text-e80-gray hover:text-e80-black'
            }`}
          >
            <Icon size={15} strokeWidth={1.8} aria-hidden />
            {t.label}
          </button>
        )
      })}
    </nav>
  )
}
