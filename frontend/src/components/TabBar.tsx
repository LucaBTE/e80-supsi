import { useRef, type KeyboardEvent } from 'react'
import { FolderKanban, MessageCircle, Network, Workflow, type LucideIcon } from 'lucide-react'

export type Tab = 'processes' | 'projects' | 'analysis' | 'info'

export const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'info', label: 'Chat', icon: MessageCircle },
  { key: 'analysis', label: 'Impact Analysis', icon: Network },
  { key: 'processes', label: 'Processes', icon: Workflow },
  { key: 'projects', label: 'Projects', icon: FolderKanban },
]

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1
      : e.key === 'ArrowRight' ? (i + 1) % TABS.length
        : e.key === 'ArrowLeft' ? (i - 1 + TABS.length) % TABS.length : -1
    if (next < 0) return
    e.preventDefault()
    onChange(TABS[next].key)
    refs.current[next]?.focus()
  }
  const renderTab = (t: (typeof TABS)[number], i: number) => {
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
        className={`flex w-full min-w-0 items-center gap-2 border-b-4 px-2 py-2.5 text-left text-xs font-bold uppercase tracking-eyebrow transition-colors sm:-mb-px sm:w-auto sm:shrink-0 sm:px-4 ${
          on ? 'border-accent-4 text-e80-black' : 'border-transparent text-e80-gray hover:text-e80-black'
        }`}
      >
        <Icon size={15} strokeWidth={1.8} className="shrink-0" aria-hidden />
        {t.label}
      </button>
    )
  }
  return (
    <nav role="tablist" aria-label="Sections" className="grid grid-cols-2 border-b border-line sm:flex">
      <div className="flex min-w-0 flex-col sm:flex-row">{TABS.slice(0, 2).map((t, i) => renderTab(t, i))}</div>
      <div className="flex min-w-0 flex-col border-l-4 border-accent-4 pl-2 sm:ml-3 sm:flex-row sm:pl-3">
        {TABS.slice(2).map((t, i) => renderTab(t, i + 2))}
      </div>
    </nav>
  )
}
