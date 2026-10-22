import type { Citation, Entity, EntityType, Gap, Relation, Scenario, Scope } from '../types'
import { computeGaps } from './gaps'

export type Filter = 'all' | 'direct' | 'indirect' | 'gap'

export const TYPE_LABEL: Record<EntityType, string> = {
  project: 'Project', map: 'Map', process: 'Process', activity: 'Activity', role: 'Role',
  system: 'System', person: 'Person', external: 'External organization', document: 'Document',
  requirement: 'Requirement', component: 'Component', team: 'Team', topic: 'Topic', country: 'Country',
  constraint: 'Constraint',
}

export const GROUPS: { key: string; label: string; types: EntityType[]; collapsed?: boolean }[] = [
  { key: 'project', label: 'Project', types: ['project', 'requirement'] },
  { key: 'documents', label: 'Documents', types: ['document'] },
  { key: 'processes', label: 'Processes', types: ['map', 'process', 'activity'] },
  { key: 'roles', label: 'Roles', types: ['role', 'team'] },
  { key: 'systems', label: 'Systems', types: ['system', 'component'] },
  { key: 'people', label: 'People', types: ['person'] },
  { key: 'external', label: 'External organizations', types: ['external'] },
  { key: 'scope', label: 'Scope', types: ['topic', 'country', 'constraint'], collapsed: true },
]

export type TreeNode = { id: string; children: TreeNode[] }
export type GroupTree = { key: string; label: string; collapsed?: boolean; nodes: TreeNode[] }

export interface Model {
  scenario: Scenario
  rootId: string
  syntheticRoot: boolean
  byId: Record<string, Entity>
  relations: Relation[]
  children: Record<string, string[]>
  incoming: Record<string, Relation[]>
  outgoing: Record<string, Relation[]>
  scope: Record<string, Scope | undefined>
  groups: GroupTree[]
  /** [n] labels shared by overview, list, graph and drawer */
  numbers: Record<string, number>
  gaps: Gap[]
  gapsByEntity: Record<string, Gap[]>
  confidence?: number
}

export function buildModel(s: Scenario): Model {
  const byId: Record<string, Entity> = Object.fromEntries(s.entities.map((e) => [e.id, e]))
  const syntheticRoot = !byId[s.rootId]
  if (syntheticRoot) byId[s.rootId] = { id: s.rootId, type: 'topic', label: 'Overview', sources: [] }

  const children: Record<string, string[]> = {}
  const incoming: Record<string, Relation[]> = {}
  const outgoing: Record<string, Relation[]> = {}
  for (const id of Object.keys(byId)) {
    children[id] = []
    incoming[id] = []
    outgoing[id] = []
  }
  for (const e of s.entities) if (e.parent && children[e.parent]) children[e.parent].push(e.id)
  for (const r of s.relations) {
    incoming[r.to]?.push(r)
    outgoing[r.from]?.push(r)
  }

  // Scope: own impact relation → parent → activities that use / are performed by it.
  const scope: Record<string, Scope | undefined> = {}
  const resolve = (id: string, seen: Set<string>): Scope | undefined => {
    if (id in scope) return scope[id]
    if (seen.has(id)) return undefined
    seen.add(id)
    const merge = (list: (Scope | undefined)[]) => {
      const defined = list.filter(Boolean)
      if (!defined.length) return undefined
      return defined.includes('direct') ? 'direct' : 'indirect'
    }
    const own = merge(incoming[id].filter((r) => r.kind === 'impacts').map((r) => r.scope))
    const parent = byId[id].parent
    const result =
      own ??
      (parent && parent !== s.rootId ? resolve(parent, seen) : undefined) ??
      merge(
        incoming[id]
          .filter((r) => r.kind === 'performed_by' || r.kind === 'uses_system')
          .map((r) => r.scope ?? resolve(r.from, seen)),
      )
    scope[id] = result
    return result
  }
  for (const id of Object.keys(byId)) resolve(id, new Set())

  const groups: GroupTree[] = GROUPS.map((g) => {
    const members = s.entities.filter((e) => g.types.includes(e.type))
    const memberIds = new Set(members.map((e) => e.id))
    const build = (id: string): TreeNode => ({
      id,
      children: children[id].filter((c) => memberIds.has(c)).map(build),
    })
    const nodes = members.filter((e) => !e.parent || !memberIds.has(e.parent)).map((e) => build(e.id))
    // A requirement-centred answer has no project: name the group after what it holds
    const label = g.key === 'project' && !members.some((e) => e.type === 'project') ? 'Requirement' : g.label
    return { key: g.key, label, collapsed: g.collapsed, nodes }
  }).filter((g) => g.nodes.length > 0)

  const numbers: Record<string, number> = {}
  let n = 0
  const number = (t: TreeNode) => {
    numbers[t.id] = ++n
    t.children.forEach(number)
  }
  groups.forEach((g) => g.nodes.forEach(number))

  const gaps = computeGaps(s.entities, s.relations)
  const gapsByEntity: Record<string, Gap[]> = {}
  for (const g of gaps) (gapsByEntity[g.entityId] ??= []).push(g)

  const scores = s.relations.filter((r) => r.kind === 'impacts').flatMap((r) => r.confidence === undefined ? [] : [r.confidence])
  const confidence = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined

  return {
    scenario: s, rootId: s.rootId, syntheticRoot, byId, relations: s.relations,
    children, incoming, outgoing, scope, groups, numbers, gaps, gapsByEntity, confidence,
  }
}

export function matchesFilter(m: Model, id: string, f: Filter): boolean {
  if (f === 'all' || id === m.rootId) return true
  const self = f === 'gap' ? !!m.gapsByEntity[id]?.length : m.scope[id] === (f === 'direct' ? 'direct' : 'indirect')
  return self || m.children[id].some((c) => matchesFilter(m, c, f))
}

/** The impact relation that carries change / level / charter info for an entity. */
export function impactOf(m: Model, id: string): Relation | undefined {
  const rs = m.incoming[id].filter((r) => r.kind === 'impacts')
  return rs.find((r) => r.from === m.rootId) ?? rs[0]
}

export function confidenceOf(m: Model, id: string): number | undefined {
  if (id === m.rootId) return m.confidence
  const rs = m.incoming[id].filter((r) => r.kind !== 'source' && r.kind !== 'belongs_to')
  const imp = rs.filter((r) => r.kind === 'impacts')
  const pool = imp.length ? imp : rs
  const scores = pool.flatMap((r) => r.confidence === undefined ? [] : [r.confidence])
  return scores.length ? Math.max(...scores) : undefined
}

export const related = (m: Model, id: string, kind: Relation['kind'], dir: 'out' | 'in') =>
  (dir === 'out' ? m.outgoing[id] : m.incoming[id])
    .filter((r) => r.kind === kind)
    .map((r) => m.byId[dir === 'out' ? r.to : r.from])
    .filter(Boolean)

/** Activities performed by a role, or using a system. */
function activitiesOf(m: Model, id: string) {
  return m.incoming[id]
    .filter((r) => r.kind === 'performed_by' || r.kind === 'uses_system')
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
    .map((r) => m.byId[r.from])
}

/** Processes (by code) reached through a role's activities. */
export function processesOf(m: Model, id: string): Entity[] {
  const out = new Map<string, Entity>()
  for (const a of activitiesOf(m, id)) {
    const p = a.type === 'process' ? a : a.parent ? m.byId[a.parent] : undefined
    if (p) out.set(p.id, p)
  }
  for (const r of m.incoming[id].filter((r) => r.kind === 'impacts')) {
    const p = m.byId[r.from]
    if (p?.type === 'process') out.set(p.id, p)
  }
  return [...out.values()]
}

/** Root → ancestors → entity (→ role), e.g. Project → PTP.05 → PTP.05.02 → activity → role. */
export function chainFor(m: Model, id: string, seen = new Set<string>()): string[] {
  if (id === m.rootId || seen.has(id)) return [id]
  seen.add(id)
  const e = m.byId[id]
  const via = activitiesOf(m, id)[0]
  if (via) return [...chainFor(m, via.id, seen), id]
  if (e.parent) return [...chainFor(m, e.parent, seen), id]
  const imp = m.incoming[id].find((r) => r.kind === 'impacts' || r.kind === 'belongs_to')
  if (imp) return [...chainFor(m, imp.from, seen), id]
  const out = m.outgoing[id].find((r) => r.kind === 'belongs_to')
  if (out) return [...chainFor(m, out.to, seen), id]
  return [m.rootId, id]
}

const LEVEL_TEXT = { high: 'high', medium: 'medium', low: 'low' }
const CHANGE_TEXT = { automated: 'automated', changed: 'changed', needs_review: 'with impact requiring review' }
const list = (es: Entity[]) => es.map((e) => e.code ?? e.label).join(', ')

/** 1–2 lines of "why", generated from the relations — never free text. */
export function explain(m: Model, id: string): string {
  const e = m.byId[id]
  const imp = impactOf(m, id)
  const downstream = m.scope[id] === 'indirect' ? ' downstream' : ''
  switch (e.type) {
    case 'activity': {
      const proc = e.parent ? m.byId[e.parent] : undefined
      const roles = related(m, id, 'performed_by', 'out')
      const systems = related(m, id, 'uses_system', 'out')
      return `Activity ${imp?.change ? CHANGE_TEXT[imp.change] : 'involved'}${downstream} in process ${proc?.code ?? ''} ${proc?.label ?? ''}. Performed by ${list(roles) || 'role not specified'}${systems.length ? ` using ${list(systems)}` : '; system not specified'}.`
    }
    case 'role':
    case 'team':
    case 'external': {
      const acts = activitiesOf(m, id)
      const procs = processesOf(m, id)
      const charter = imp?.inCharter === true ? ' Listed in the charter.' : imp?.inCharter === false ? ' Not listed in the project charter.' : ''
      const what = acts.length ? `${acts.length} activities` : `${procs.length || 1} items`
      return `Involvement${imp?.level ? ` ${LEVEL_TEXT[imp.level]}` : ''}${downstream} in ${what}${procs.length ? ` (${list(procs)})` : ''}.${charter}`
    }
    case 'map':
    case 'process': {
      const acts = descendants(m, id).filter((d) => d.type === 'activity')
      if (!acts.length) return `Affected item${downstream}${imp ? ` by ${m.byId[imp.from].label}` : ''}.`
      const auto = acts.filter((a) => impactOf(m, a.id)?.change === 'automated').length
      return `${acts.length} affected activities${downstream}, of which ${auto} automated.`
    }
    case 'system':
    case 'component': {
      const acts = activitiesOf(m, id)
      if (acts.length) return `System used in ${acts.length} affected activities (${list(acts.map((a) => (a.parent ? m.byId[a.parent] : a)))}).`
      break
    }
    case 'document':
      if (id === m.rootId) return 'Selected document. The connected documents are candidates for review after a change.'
      if (imp) return `Review candidate because of ${imp.label ?? 'a recorded link'} to the selected document.`
      return `Source for ${m.outgoing[id].length} analysis relationships.`
  }
  if (imp) return `Affected${downstream} by ${m.byId[imp.from].label}.`
  return 'Explanation unavailable (TBD).'
}

export function descendants(m: Model, id: string): Entity[] {
  return m.children[id].flatMap((c) => [m.byId[c], ...descendants(m, c)])
}

/** Entity citations first, then those of every relation touching it. Deduplicated. */
export function citationsFor(m: Model, id: string): Citation[] {
  const all = [
    ...m.byId[id].sources,
    ...m.incoming[id].flatMap((r) => r.sources),
    ...m.outgoing[id].filter((r) => r.kind !== 'source').flatMap((r) => r.sources),
  ]
  const seen = new Set<string>()
  return all.filter((c) => {
    const k = `${c.doc}|${c.page}|${c.passage}`
    return seen.has(k) ? false : (seen.add(k), true)
  })
}

const META_TYPES: [EntityType, string, string][] = [
  ['map', 'map', 'maps'],
  ['activity', 'activity', 'activities'],
  ['process', 'process', 'processes'],
  ['requirement', 'requirement', 'requirements'],
  ['component', 'component', 'components'],
  ['role', 'role', 'roles'],
  ['team', 'team', 'team'],
]

/** "Confidence 81% · 3 maps · 12 activities · 5 gaps" — all derived. */
export function metaLine(m: Model): string[] {
  const parts = [m.confidence === undefined ? 'Confidence n/a' : `Confidence ${Math.round(m.confidence * 100)}%`]
  for (const [type, one, many] of META_TYPES) {
    if (parts.length >= 3) break
    const n = m.scenario.entities.filter((e) => e.type === type).length
    if (n) parts.push(`${n} ${n === 1 ? one : many}`)
  }
  parts.push(`${m.gaps.length} gap`)
  return parts
}
