import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildGraph } from '../lib/graph'
import { buildModel, type Filter } from '../lib/model'
import type { Scenario } from '../types'
import DetailDrawer from './DetailDrawer'
import EntityList from './EntityList'
import ExpandedView from './ExpandedView'
import ImpactGraph from './ImpactGraph'
import Overview from './Overview'

type Props = { scenario: Scenario; loading: boolean; initialSelect?: string }

/** Impact analysis: Overview, entities 40% / graph 60%. Remounted on every new answer. */
export default function AnalysisView({ scenario, loading, initialSelect }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [fullscreen, setFullscreen] = useState(false)

  const model = useMemo(() => buildModel(scenario), [scenario])
  const graph = useMemo(() => buildGraph(model, expanded), [model, expanded])

  /** Select from list / overview: also open the collapsed maps that hide it in the graph. */
  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id)
      if (!id) return
      const toOpen: string[] = []
      for (let p = model.byId[id]?.parent; p && p !== model.rootId; p = model.byId[p]?.parent) {
        if (model.byId[p].type === 'map') toOpen.push(p)
      }
      if (toOpen.length) setExpanded((s) => new Set([...s, ...toOpen]))
    },
    [model],
  )

  useEffect(() => {
    if (initialSelect && model.byId[initialSelect]) select(initialSelect)
  }, [initialSelect, model, select])

  const onNodeClick = useCallback(
    (id: string) => {
      if (graph.nodes.find((n) => n.id === id)?.collapsible) {
        setExpanded((s) => {
          const next = new Set(s)
          next.has(id) ? next.delete(id) : next.add(id)
          return next
        })
      }
      if (!(id === model.rootId && model.syntheticRoot)) setSelectedId(id)
    },
    [graph, model],
  )

  const closeDetail = useCallback(() => setSelectedId(null), [])
  const closeFullscreen = useCallback(() => setFullscreen(false), [])
  const canvas = { model, graph, filter, selectedId, hoverId, expanded, onNodeClick }

  return (
    <div className={`flex min-h-0 flex-1 flex-col gap-4 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}>
      <Overview model={model} selectedId={selectedId} onSelect={select} />
      <div className="grid flex-1 grid-cols-1 gap-4 lg:min-h-[440px] lg:grid-cols-[2fr_3fr] lg:grid-rows-1">
        <EntityList
          model={model}
          filter={filter}
          onFilter={setFilter}
          selectedId={selectedId}
          onSelect={select}
          onHover={setHoverId}
        />
        <ImpactGraph {...canvas} onExpand={() => setFullscreen(true)} />
      </div>

      {selectedId && !fullscreen && <DetailDrawer model={model} id={selectedId} onClose={closeDetail} onSelect={select} />}
      {fullscreen && <ExpandedView {...canvas} onSelect={select} onClose={closeFullscreen} />}
    </div>
  )
}
