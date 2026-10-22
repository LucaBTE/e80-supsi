import { useEffect, useState } from 'react'
import { Minimize2, Network, Table2 } from 'lucide-react'
import type { Graph } from '../lib/graph'
import type { Filter, Model } from '../lib/model'
import DetailDrawer from './DetailDrawer'
import ImpactTable from './ImpactTable'
import { Legend } from './ImpactGraph'
import GraphViewport from './GraphViewport'

type Props = {
  model: Model
  graph: Graph
  filter: Filter
  selectedId: string | null
  hoverId: string | null
  expanded: Set<string>
  onNodeClick: (id: string) => void
  onSelect: (id: string | null) => void
  onClose: () => void
}

export default function ExpandedView({ onClose, onSelect, ...canvas }: Props) {
  const [table, setTable] = useState(false)
  const { model, filter, selectedId } = canvas

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (on: boolean, Icon: typeof Table2, label: string) => (
    <button
      type="button"
      aria-pressed={table === on}
      onClick={() => setTable(on)}
      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-eyebrow ${
        table === on ? 'bg-e80-black text-white' : 'bg-white hover:bg-accent'
      }`}
    >
      <Icon size={14} aria-hidden /> {label}
    </button>
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Graph, expanded view"
      className="fade-in fixed inset-0 z-50 flex bg-e80-black/40 p-3 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex min-w-0 flex-1 flex-col border border-e80-black bg-white">
        <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <span className="h-5 w-[9px] bg-accent" aria-hidden />
          <h2 className="e80-panel-title">Graph</h2>
          <span className="e80-eyebrow hidden md:inline">{model.scenario.label}</span>
          <div className="ml-auto flex border border-e80-black" role="group" aria-label="Display mode">
            {toggle(false, Network, 'Graph')}
            {toggle(true, Table2, 'Table view')}
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="flex items-center gap-2 border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-eyebrow hover:border-e80-black hover:bg-accent"
          >
            <Minimize2 size={14} aria-hidden /> Collapse
          </button>
        </header>
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[1fr_26rem]">
          <div className="min-h-[420px] min-w-0 lg:min-h-0">
            {table ? (
              <ImpactTable model={model} filter={filter} selectedId={selectedId} onSelect={onSelect} />
            ) : (
              <div className="h-full bg-[radial-gradient(#E0E0E0_1px,transparent_1px)] [background-size:18px_18px] p-4">
                <GraphViewport {...canvas} />
              </div>
            )}
          </div>
          {selectedId ? (
            <DetailDrawer model={model} id={selectedId} variant="panel" onClose={() => onSelect(null)} onSelect={onSelect} />
          ) : (
            <aside className="hidden border-l border-line bg-surface p-6 text-sm text-e80-gray lg:block">
              Select a node or row to view its impact, relationship chain and sources.
            </aside>
          )}
        </div>
        {!table && (
          <footer className="border-t border-line px-5 py-2.5">
            <Legend />
          </footer>
        )}
      </div>
    </div>
  )
}
