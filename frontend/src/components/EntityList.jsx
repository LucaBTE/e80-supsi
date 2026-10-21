import { useEffect, useRef } from 'react'
import { ENTITY_TYPES } from '../data/mockResponse'
import { typeIcon } from './icons'

export default function EntityList({ entities, selectedId, onSelect }) {
  const refs = useRef({})

  useEffect(() => {
    refs.current[selectedId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  return (
    <section className="flex min-h-0 flex-col border border-line bg-white">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span className="h-5 w-[9px] bg-accent" />
        <h2 className="text-sm font-bold uppercase tracking-title">Entità e fonti</h2>
        <span className="ml-auto e80-eyebrow">{entities.length}</span>
      </header>
      <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {entities.map((e) => {
          const Icon = typeIcon[e.type]
          const active = selectedId === e.id
          return (
            <li key={e.id} ref={(el) => (refs.current[e.id] = el)}>
              <button
                type="button"
                onClick={() => onSelect(active ? null : e.id)}
                className={`flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left transition-colors ${
                  active ? 'border-accent-4 bg-accent/30' : 'border-transparent hover:bg-surface'
                }`}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-3 text-accent-4">
                  <Icon size={16} strokeWidth={1.6} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="text-[11px] font-bold text-e80-gray">[{e.n}]</span>
                    <span className="truncate font-semibold">{e.label}</span>
                  </span>
                  <span className="block text-sm text-e80-gray">{e.detail}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-e80-gray">
                    <span className="border border-line bg-white px-1.5 py-px font-bold uppercase tracking-eyebrow text-[10px]">
                      {ENTITY_TYPES[e.type]}
                    </span>
                    {e.source}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
