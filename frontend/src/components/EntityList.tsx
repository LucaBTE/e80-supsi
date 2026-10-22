import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { matchesFilter, type Filter, type Model, type TreeNode } from '../lib/model'
import EntityCard from './EntityCard'

export const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'direct', label: 'Direct' },
  { key: 'indirect', label: 'Indirect' },
  { key: 'gap', label: 'Gap' },
]

type Props = {
  model: Model
  filter: Filter
  onFilter: (f: Filter) => void
  selectedId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

export default function EntityList({ model, filter, onFilter, selectedId, onSelect, onHover }: Props) {
  const [closed, setClosed] = useState<Set<string>>(
    () => new Set(model.groups.filter((g) => g.collapsed).map((g) => g.key)),
  )
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll only the list (scrollIntoView would also move the page)
  useEffect(() => {
    const box = scrollRef.current
    const el = selectedId ? itemRefs.current[selectedId] : null
    if (!box || !el) return
    const b = box.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    if (r.top < b.top || r.top > b.bottom - 40) box.scrollTo({ top: box.scrollTop + r.top - b.top - 8, behavior: 'smooth' })
  }, [selectedId])

  const visible = (n: TreeNode) => matchesFilter(model, n.id, filter)
  const count = (nodes: TreeNode[]): number =>
    nodes.filter(visible).reduce((a, n) => a + 1 + count(n.children), 0)
  const total = model.groups.reduce((a, g) => a + count(g.nodes), 0)

  // Roving focus between tabs with the arrow keys
  const onTabKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    const next = (i + d + FILTERS.length) % FILTERS.length
    onFilter(FILTERS[next].key)
    tabRefs.current[next]?.focus()
  }

  const renderNodes = (nodes: TreeNode[], depth: number) => (
    <ul className={depth ? 'ml-4 border-l border-line sm:ml-6' : 'divide-y divide-line'}>
      {nodes.filter(visible).map((n) => (
        <li key={n.id} ref={(el) => void (itemRefs.current[n.id] = el)}>
          <EntityCard model={model} id={n.id} active={selectedId === n.id} onSelect={onSelect} onHover={onHover} />
          {n.children.length > 0 && renderNodes(n.children, depth + 1)}
        </li>
      ))}
    </ul>
  )

  return (
    <section className="flex h-[min(60vh,34rem)] min-h-[18rem] min-w-0 flex-col border border-line bg-white lg:h-full lg:min-h-0">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span className="h-5 w-[9px] bg-accent" aria-hidden />
        <h2 className="e80-panel-title">Entities and sources</h2>
        <span className="ml-auto e80-eyebrow" aria-live="polite">{total}</span>
      </header>

      <div role="tablist" aria-label="Impact filter" className="flex border-b border-line px-3">
        {FILTERS.map((f, i) => {
          const on = filter === f.key
          return (
            <button
              key={f.key}
              ref={(el) => void (tabRefs.current[i] = el)}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="entity-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => onFilter(f.key)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`-mb-px border-b-4 px-3 py-2 text-xs font-bold uppercase tracking-eyebrow transition-colors ${
                on ? 'border-accent-4 text-e80-black' : 'border-transparent text-e80-gray hover:text-e80-black'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div ref={scrollRef} id="entity-panel" role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
        {total === 0 && <p className="px-5 py-6 text-sm text-e80-gray">No items match this filter.</p>}
        {model.groups.map((g) => {
          const n = count(g.nodes)
          if (!n) return null
          const open = !closed.has(g.key)
          return (
            <div key={g.key} className="border-b border-line last:border-b-0">
              <button
                type="button"
                aria-expanded={open}
                onClick={() =>
                  setClosed((s) => {
                    const next = new Set(s)
                    open ? next.add(g.key) : next.delete(g.key)
                    return next
                  })
                }
                className="flex w-full items-center gap-2 bg-surface px-4 py-2 text-left text-xs font-bold uppercase tracking-eyebrow hover:bg-line/60"
              >
                {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                {g.label}
                <span className="ml-auto text-e80-gray">{n}</span>
              </button>
              {open && renderNodes(g.nodes, 0)}
            </div>
          )
        })}
      </div>
    </section>
  )
}
