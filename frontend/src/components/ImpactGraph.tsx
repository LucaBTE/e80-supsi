import { useMemo } from 'react'
import { Maximize2, TriangleAlert } from 'lucide-react'
import { GAP_SHORT } from '../lib/gaps'
import { pathToRoot, type GEdge, type Graph } from '../lib/graph'
import { matchesFilter, TYPE_LABEL, type Filter, type Model } from '../lib/model'
import { RootIcon, typeIcon } from './icons'
import GraphViewport from './GraphViewport'

const C = { black: '#2D2926', gray: '#666666', soft: '#9A9A9A', accent: '#FFDC73', strong: '#F0AF10' }

const trunc = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function edgeStyle(e: GEdge, hl: boolean) {
  if (e.layoutOnly) return {
    stroke: C.soft,
    strokeWidth: 1.2,
    strokeDasharray: '2 5',
    marker: undefined,
  }
  const source = e.kind === 'source'
  return {
    stroke: hl ? C.strong : source ? C.soft : C.black,
    strokeWidth: source ? 1.2 : 0.8 + (e.confidence ?? 0.5) * 2.4,
    strokeDasharray: source ? '3 3' : e.scope === 'indirect' ? '9 5' : undefined,
    marker: source ? undefined : hl ? 'url(#g-arrow-hl)' : 'url(#g-arrow)',
  }
}

export type CanvasProps = {
  model: Model
  graph: Graph
  filter: Filter
  selectedId: string | null
  hoverId: string | null
  expanded: Set<string>
  onNodeClick: (id: string) => void
}

export function GraphCanvas({ model, graph, filter, selectedId, hoverId, expanded, onNodeClick }: CanvasProps) {
  const selected = selectedId ? graph.proxy(selectedId) : undefined
  const hovered = hoverId ? graph.proxy(hoverId) : undefined
  const path = useMemo(() => (selected ? pathToRoot(graph, model.rootId, selected) : null), [graph, model.rootId, selected])
  const pos = Object.fromEntries(graph.nodes.map((n) => [n.id, n]))
  const passes = (id: string) => matchesFilter(model, id, filter)
  const labelLines = (id: string) => {
    const e = model.byId[id]
    return 1 + (e.code ? 1 : 0) + (model.gapsByEntity[id]?.length ? 1 : 0)
  }

  return (
    <svg
      viewBox={`0 0 ${graph.width} ${graph.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full select-none"
      role="group"
      aria-label="Graph"
    >
      <defs>
        {[['g-arrow', C.black], ['g-arrow-hl', C.strong]].map(([id, fill]) => (
          <marker key={id} id={id} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={fill} />
          </marker>
        ))}
      </defs>

      {graph.edges.map((e) => {
        const a = pos[e.from]
        const b = pos[e.to]
        const down = b.y > a.y
        const sameRow = Math.abs(b.y - a.y) < 8
        const side = b.x >= a.x ? 1 : -1
        const x1 = sameRow ? a.x + side * (a.isRoot ? 26 : 19) : a.x
        const x2 = sameRow ? b.x - side * (b.isRoot ? 26 : 19) : b.x
        const y1 = sameRow ? a.y : down ? a.y + (a.isRoot ? 26 : 19) + 8 + labelLines(a.id) * 13 : a.y - (a.isRoot ? 26 : 19) - 1
        const y2 = sameRow ? b.y : down ? b.y - (b.isRoot ? 26 : 19) - 1 : b.y + (b.isRoot ? 26 : 19) + 1
        const mid = (y1 + y2) / 2
        const curve = sameRow
          ? `M${x1},${y1} C${x1},${y1 - 35} ${x2},${y2 - 35} ${x2},${y2}`
          : `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`
        const hl = !!path?.edges.has(e.id)
        const faded = (path && !hl) || !passes(e.from) || !passes(e.to)
        const s = edgeStyle(e, hl)
        return (
          <path
            key={e.id}
            d={curve}
            fill="none"
            stroke={s.stroke}
            strokeWidth={s.strokeWidth}
            strokeDasharray={s.strokeDasharray}
            markerEnd={s.marker}
            opacity={faded ? 0.12 : 1}
            style={{ transition: 'opacity 150ms' }}
          />
        )
      })}

      {graph.nodes.map((n) => {
        const e = n.entity
        const Icon = n.isRoot && model.syntheticRoot ? RootIcon : typeIcon[e.type]
        const r = n.isRoot ? 26 : 19
        const active = selected === n.id
        const gaps = model.gapsByEntity[n.id] ?? []
        const indirect = model.scope[n.id] === 'indirect'
        const faded = (path && !path.nodes.has(n.id)) || !passes(n.id)
        const line1 = e.code ?? e.label
        const line2 = e.code ? e.label : undefined
        const open = expanded.has(n.id)
        const name = `${TYPE_LABEL[e.type]} ${e.code ?? ''} ${e.label}${gaps.length ? `, gap: ${gaps.map((g) => g.message).join('; ')}` : ''}${n.collapsible ? (open ? ', expanded' : ', collapsible: press to expand') : ''}`
        return (
          <g
            key={n.id}
            className="gnode cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={name}
            aria-pressed={active}
            onClick={() => onNodeClick(n.id)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault()
                onNodeClick(n.id)
              }
            }}
            opacity={faded ? 0.18 : 1}
            style={{ transition: 'opacity 150ms' }}
          >
            <title>{name}</title>
            <circle className="focus-ring" cx={n.x} cy={n.y} r={r + 7} fill="none" stroke={C.black} strokeWidth={2} />
            {hovered === n.id && <circle cx={n.x} cy={n.y} r={r + 6} fill="none" stroke={C.strong} strokeWidth={2.5} />}
            <circle
              cx={n.x}
              cy={n.y}
              r={r}
              fill={n.isRoot ? C.black : active ? C.accent : '#fff'}
              stroke={gaps.length ? (active ? C.black : C.strong) : active || n.isRoot ? C.black : C.gray}
              strokeWidth={gaps.length || active ? 2 : 1.2}
              strokeDasharray={gaps.length ? '4 3' : undefined}
            />
            <Icon
              x={n.x - r * 0.45}
              y={n.y - r * 0.45}
              width={r * 0.9}
              height={r * 0.9}
              strokeWidth={1.6}
              color={n.isRoot ? C.accent : C.black}
              aria-hidden
            />
            {gaps.length > 0 && (
              <g>
                <circle cx={n.x + r * 0.75} cy={n.y - r * 0.75} r={8} fill={C.accent} stroke={C.black} strokeWidth={1} />
                <TriangleAlert x={n.x + r * 0.75 - 5} y={n.y - r * 0.75 - 5.5} width={10} height={10} strokeWidth={2.2} color={C.black} aria-hidden />
              </g>
            )}
            {n.collapsible && (
              <g>
                <rect x={n.x + r * 0.55} y={n.y + r * 0.45} width={13} height={13} fill="#fff" stroke={C.black} strokeWidth={1} />
                <text x={n.x + r * 0.55 + 6.5} y={n.y + r * 0.45 + 10.5} textAnchor="middle" fontSize="12" fontWeight={700} fill={C.black}>
                  {open ? '−' : '+'}
                </text>
              </g>
            )}
            <text textAnchor="middle" fontSize="11.5" fill={indirect ? C.gray : C.black} paintOrder="stroke" stroke="#fff" strokeWidth={4} strokeLinejoin="round">
              <tspan x={n.x} y={n.y + r + 15} fontWeight={700}>{trunc(line1, 21)}</tspan>
              {line2 && <tspan x={n.x} dy={13} fontWeight={400}>{trunc(line2, 22)}</tspan>}
              {gaps.length > 0 && (
                <tspan x={n.x} dy={13} fontWeight={700} fontStyle="italic" fill={C.black}>
                  {GAP_SHORT[gaps[0].kind]}
                </tspan>
              )}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function Legend() {
  const line = (dash?: string, color = C.black, w = 2) => (
    <svg width="30" height="8" aria-hidden>
      <line x1="0" y1="4" x2="30" y2="4" stroke={color} strokeWidth={w} strokeDasharray={dash} />
    </svg>
  )
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-e80-gray">
      <span className="flex items-center gap-2">{line()} Direct</span>
      <span className="flex items-center gap-2">{line('9 5')} Indirect</span>
      <span className="flex items-center gap-2">{line('3 3', C.soft, 1.4)} Source</span>
      <span className="flex items-center gap-2">{line('2 5', C.soft, 1.2)} Visual grouping</span>
      <span className="flex items-center gap-2">
        <svg width="16" height="16" aria-hidden>
          <circle cx="8" cy="8" r="6.5" fill="#fff" stroke={C.strong} strokeWidth="2" strokeDasharray="3 2" />
        </svg>
        <TriangleAlert size={13} aria-hidden /> Gap
      </span>
      <span className="text-e80-gray/80">Line width reflects confidence when available · click a map to expand its activities</span>
    </div>
  )
}

type Props = CanvasProps & { onExpand: () => void }

export default function ImpactGraph({ onExpand, ...canvas }: Props) {
  return (
    <section className="flex h-[min(60vh,34rem)] min-h-[22rem] min-w-0 flex-col border border-line bg-white lg:h-full lg:min-h-0">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span className="h-5 w-[9px] bg-accent" aria-hidden />
        <h2 className="e80-panel-title">Graph</h2>
        <button
          type="button"
          onClick={onExpand}
          className="ml-2 flex items-center gap-2 border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-eyebrow transition-colors hover:border-e80-black hover:bg-accent"
        >
          <Maximize2 size={14} strokeWidth={1.8} aria-hidden />
          Expand
        </button>
        {/* Kept left of centre: the detail drawer slides over the right edge */}
      </header>
      <div className="min-h-0 flex-1 bg-[radial-gradient(#E0E0E0_1px,transparent_1px)] [background-size:18px_18px] p-3">
        <GraphViewport {...canvas} />
      </div>
      <footer className="border-t border-line px-5 py-2.5">
        <Legend />
      </footer>
    </section>
  )
}
