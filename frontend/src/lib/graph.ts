import type { Entity, EntityType, RelationKind, Scope } from '../types'
import type { Model } from './model'

export type GNode = {
  id: string
  entity: Entity
  x: number
  y: number
  isRoot: boolean
  collapsible: boolean
}
export type GEdge = { id: string; from: string; to: string; kind: RelationKind; scope: Scope; confidence?: number }
export type Graph = {
  nodes: GNode[]
  edges: GEdge[]
  width: number
  height: number
  /** Nearest node drawn for an entity (an activity folded into its map, …) */
  proxy: (id: string) => string | undefined
}

const NEVER_DRAWN: EntityType[] = ['topic']
// Top-down layering: layers are rows, siblings spread horizontally (fits wide panels).
const SLOT_W = 140
const LAYER_H = 104
const PAD_X = 90
const PAD_Y = 40
/** Layers longer than this zigzag over two staggered rows so labels don't collide */
const DENSE = 7
const DENSE_W = 92

/**
 * Builds the visible graph. Default level of detail: Root → Maps → Roles.
 * Expanding a map reveals its activities (processes fold into the map, their code
 * stays on the activity label) and the systems they use.
 */
export function buildGraph(m: Model, expanded: Set<string>): Graph {
  const { byId, rootId } = m

  // A process under a map is a pass-through level, never its own node.
  const passThrough = (e: Entity) => e.type === 'process' && !!e.parent && byId[e.parent]?.type === 'map'
  const collapsible = (e: Entity) =>
    e.id !== rootId && !passThrough(e) && m.children[e.id].length > 0

  const shown = (id: string): boolean => {
    const e = byId[id]
    if (!e) return false
    if (id === rootId) return true
    if (NEVER_DRAWN.includes(e.type) || passThrough(e)) return false
    for (let p = e.parent ? byId[e.parent] : undefined; p && p.id !== rootId; p = p.parent ? byId[p.parent] : undefined) {
      if (collapsible(p) && !expanded.has(p.id)) return false
    }
    return true
  }
  const proxy = (id: string): string | undefined => {
    const e = byId[id]
    if (id === rootId) return id
    if (!e || NEVER_DRAWN.includes(e.type)) return undefined
    return shown(id) ? id : e.parent ? proxy(e.parent) : undefined
  }

  const edges = new Map<string, GEdge>()
  const add = (from: string, to: string, kind: RelationKind, scope: Scope, confidence?: number) => {
    const id = `${from}>${to}`
    const prev = edges.get(id)
    if (!prev) return void edges.set(id, { id, from, to, kind, scope, confidence })
    prev.confidence = confidence === undefined ? prev.confidence : Math.max(prev.confidence ?? 0, confidence)
    if (scope === 'direct') prev.scope = 'direct'
    if (prev.kind === 'belongs_to') prev.kind = kind
  }

  const structural = (id: string) => m.incoming[id].some((r) => r.kind === 'performed_by' || r.kind === 'uses_system')
  for (const r of m.relations) {
    if (r.kind === 'belongs_to') continue
    if (r.kind === 'uses_system' && !shown(r.from)) continue
    const to = byId[r.to]
    const a = proxy(r.from)
    const b = proxy(r.to)
    if (!a || !b || a === b || !to) continue
    // Root-level summary of a role already reached through its activities
    if (r.kind === 'impacts' && a === rootId && structural(r.to)) continue
    // Impact on a nested entity is drawn as the hierarchy edge from its parent
    if (r.kind === 'impacts' && to.parent && proxy(to.parent) !== a) continue
    add(a, b, r.kind, r.scope ?? m.scope[r.from] ?? m.scope[r.to] ?? 'direct', r.confidence)
  }
  for (const e of Object.values(byId)) {
    if (!e.parent || !shown(e.id)) continue
    const p = proxy(e.parent)
    if (!p || p === e.id) continue
    const imp = m.incoming[e.id].find((r) => r.kind === 'impacts')
    add(p, e.id, 'belongs_to', m.scope[e.id] ?? 'direct', imp?.confidence)
  }

  const ids = new Set<string>([rootId])
  for (const e of edges.values()) ids.add(e.from).add(e.to)
  for (const e of Object.values(byId)) if (shown(e.id)) ids.add(e.id)
  const edgeList = [...edges.values()]

  // Live graphs may contain cycles. Shortest-path layers stay finite and
  // retain the original relationship directions when drawing arrows.
  const layer: Record<string, number> = {}
  const visit = (seed: string, depth: number) => {
    layer[seed] = depth
    const queue = [seed]
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i]
      for (const edge of edgeList) {
        const next = edge.from === id ? edge.to : edge.to === id ? edge.from : undefined
        if (next && layer[next] === undefined) {
          layer[next] = layer[id] + 1
          queue.push(next)
        }
      }
    }
  }
  visit(rootId, 0)
  // A synthetic overview has no invented edges. Lay out each real component
  // from one of its roots, then handle components made entirely of cycles.
  for (const id of ids) if (layer[id] === undefined && !edgeList.some((e) => e.to === id)) visit(id, 1)
  for (const id of ids) if (layer[id] === undefined) visit(id, 1)
  const layers: string[][] = []
  ids.forEach((id) => (layers[layer[id]] ??= []).push(id))

  // Barycentre ordering, one sweep down then up, to limit crossings.
  const index: Record<string, number> = {}
  const reindex = () => layers.forEach((l) => l.forEach((id, i) => (index[id] = i / Math.max(1, l.length - 1))))
  reindex()
  const bary = (id: string, dir: 'in' | 'out') => {
    const near = edgeList.filter((e) => (dir === 'in' ? e.to === id : e.from === id)).map((e) => index[dir === 'in' ? e.from : e.to])
    return near.length ? near.reduce((a, b) => a + b, 0) / near.length : index[id]
  }
  for (let l = 1; l < layers.length; l++) {
    layers[l].sort((a, b) => bary(a, 'in') - bary(b, 'in'))
    reindex()
  }
  for (let l = layers.length - 2; l >= 0; l--) {
    layers[l].sort((a, b) => bary(a, 'out') - bary(b, 'out'))
    reindex()
  }

  const slot = (l: string[]) => (l.length > DENSE ? DENSE_W : SLOT_W)
  const span = Math.max(0, ...layers.map((l) => (l.length - 1) * slot(l)))
  const width = PAD_X * 2 + span
  const top: number[] = []
  let y = PAD_Y
  for (const l of layers) {
    top.push(y)
    y += l.length > DENSE ? LAYER_H * 1.55 : LAYER_H
  }
  const height = y - LAYER_H + PAD_Y + 40
  const nodes: GNode[] = layers.flatMap((l, li) =>
    l.map((id, i) => ({
      id,
      entity: byId[id],
      x: PAD_X + (span - (l.length - 1) * slot(l)) / 2 + i * slot(l),
      y: top[li] + (l.length > DENSE && i % 2 ? LAYER_H * 0.55 : 0),
      isRoot: id === rootId,
      collapsible: collapsible(byId[id]),
    })),
  )

  return { nodes, edges: edgeList, width, height, proxy }
}

/** Nodes and edges on any path from the root down to `id`. */
export function pathToRoot(g: Graph, rootId: string, id: string) {
  const reach = new Set([rootId])
  for (let changed = true; changed; ) {
    changed = false
    for (const e of g.edges) if (reach.has(e.from) && !reach.has(e.to)) (reach.add(e.to), (changed = true))
  }
  const nodes = new Set([id])
  const edges = new Set<string>()
  if (!reach.has(id)) {
    // Not under the root (e.g. a source document): show its own links instead.
    g.edges.filter((e) => e.from === id || e.to === id).forEach((e) => (edges.add(e.id), nodes.add(e.from), nodes.add(e.to)))
    return { nodes, edges }
  }
  const walk = (n: string) => {
    for (const e of g.edges) {
      if (e.to !== n || !reach.has(e.from)) continue
      edges.add(e.id)
      if (!nodes.has(e.from)) (nodes.add(e.from), walk(e.from))
    }
  }
  walk(id)
  return { nodes, edges }
}
