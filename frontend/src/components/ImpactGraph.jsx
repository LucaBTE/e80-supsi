import { useEffect, useState } from 'react'
import { Maximize2, Minimize2, Sparkles } from 'lucide-react'
import { typeIcon } from './icons'

const C = {
  black: '#2D2926',
  gray: '#666666',
  line: '#E0E0E0',
  accent: '#FFDC73',
  accentStrong: '#F0AF10',
}

function GraphSvg({ graph, entityIndex, selectedId, onSelect }) {
  const pos = Object.fromEntries(graph.nodes.map((n) => [n.id, n]))

  // Selecting a node highlights it and its direct neighbours; everything else fades.
  const neighbours = new Set(selectedId ? [selectedId] : [])
  graph.edges.forEach((e) => {
    if (e.from === selectedId) neighbours.add(e.to)
    if (e.to === selectedId) neighbours.add(e.from)
  })
  const dimmed = (id) => selectedId && !neighbours.has(id)

  return (
    <svg viewBox="0 0 640 420" className="h-full w-full select-none" role="img" aria-label="Grafo degli impatti">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.black} />
        </marker>
        <marker id="arrow-hl" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={C.accentStrong} />
        </marker>
      </defs>

      {graph.edges.map((e) => {
        const a = pos[e.from]
        const b = pos[e.to]
        // shorten the line so the arrow tip lands on the node border
        const r = b.kind === 'answer' ? 30 : 22
        const len = Math.hypot(b.x - a.x, b.y - a.y)
        const x2 = b.x - ((b.x - a.x) / len) * r
        const y2 = b.y - ((b.y - a.y) / len) * r
        const hl = selectedId && (e.from === selectedId || e.to === selectedId)
        const faded = selectedId && !hl
        return (
          <line
            key={`${e.from}-${e.to}`}
            x1={a.x}
            y1={a.y}
            x2={x2}
            y2={y2}
            stroke={hl ? C.accentStrong : e.kind === 'impact' ? C.black : C.gray}
            strokeWidth={hl ? 2.5 : 1.3}
            strokeDasharray={e.kind === 'source' ? '5 4' : undefined}
            markerEnd={e.kind === 'impact' ? (hl ? 'url(#arrow-hl)' : 'url(#arrow)') : undefined}
            opacity={faded ? 0.15 : 1}
            style={{ transition: 'opacity 150ms' }}
          />
        )
      })}

      {graph.nodes.map((n) => {
        const isAnswer = n.kind === 'answer'
        const entity = entityIndex[n.id]
        const Icon = isAnswer ? Sparkles : typeIcon[entity?.type]
        const active = selectedId === n.id
        const r = isAnswer ? 28 : 20
        return (
          <g
            key={n.id}
            onClick={() => !isAnswer && onSelect(active ? null : n.id)}
            className={isAnswer ? '' : 'cursor-pointer'}
            opacity={dimmed(n.id) ? 0.2 : 1}
            style={{ transition: 'opacity 150ms' }}
          >
            <circle
              cx={n.x}
              cy={n.y}
              r={r}
              fill={isAnswer ? C.black : active ? C.accent : '#fff'}
              stroke={active || isAnswer ? C.black : C.gray}
              strokeWidth={active ? 2 : 1.2}
            />
            {Icon && (
              <Icon
                x={n.x - r * 0.45}
                y={n.y - r * 0.45}
                width={r * 0.9}
                height={r * 0.9}
                strokeWidth={1.6}
                color={isAnswer ? C.accent : C.black}
              />
            )}
            <text
              x={n.x}
              y={n.y + r + 15}
              textAnchor="middle"
              fontSize="12"
              fontWeight={active || isAnswer ? 700 : 600}
              fill={C.black}
              paintOrder="stroke"
              stroke="#fff"
              strokeWidth="4"
            >
              {entity ? `[${entity.n}] ` : ''}
              {n.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-e80-gray">
      <span className="flex items-center gap-2">
        <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke={C.black} strokeWidth="1.5" /></svg>
        Impatto
      </span>
      <span className="flex items-center gap-2">
        <svg width="28" height="8"><line x1="0" y1="4" x2="28" y2="4" stroke={C.gray} strokeWidth="1.5" strokeDasharray="5 4" /></svg>
        Fonte
      </span>
      <span>Clic su un nodo per tracciarne le relazioni</span>
    </div>
  )
}

export default function ImpactGraph(props) {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!expanded) return
    const onKey = (e) => e.key === 'Escape' && setExpanded(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  const ToggleIcon = expanded ? Minimize2 : Maximize2

  const panel = (
    <section
      className={`flex min-h-0 flex-col border border-line bg-white ${
        expanded ? 'h-full w-full' : 'h-full min-h-[360px]'
      }`}
    >
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span className="h-5 w-[9px] bg-accent" />
        <h2 className="text-sm font-bold uppercase tracking-title">Grafo degli impatti</h2>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto flex items-center gap-2 border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-eyebrow transition-colors hover:border-e80-black hover:bg-accent"
          aria-label={expanded ? 'Riduci grafo' : 'Espandi grafo'}
        >
          <ToggleIcon size={14} strokeWidth={1.8} />
          {expanded ? 'Riduci' : 'Espandi'}
        </button>
      </header>
      <div className="min-h-0 flex-1 bg-[radial-gradient(#E0E0E0_1px,transparent_1px)] [background-size:18px_18px] p-3">
        <GraphSvg {...props} />
      </div>
      <footer className="border-t border-line px-5 py-2.5">
        <Legend />
      </footer>
    </section>
  )

  if (!expanded) return panel

  return (
    <>
      {/* keep the slot in the layout while the graph is shown full-screen */}
      <div className="h-full min-h-[360px] border border-dashed border-line bg-surface" />
      <div
        className="fixed inset-0 z-50 flex bg-e80-black/40 p-4 sm:p-8"
        onClick={(e) => e.target === e.currentTarget && setExpanded(false)}
      >
        {panel}
      </div>
    </>
  )
}
