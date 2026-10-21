import type { Citation, Entity, EntityType, Gap, Relation, Scenario, Scope } from '../types'
import { computeGaps } from './gaps'

export type Filter = 'tutte' | 'dirette' | 'indirette' | 'gap'

export const TYPE_LABEL: Record<EntityType, string> = {
  progetto: 'Progetto', mappa: 'Mappa', processo: 'Processo', attivita: 'Attività', ruolo: 'Ruolo',
  sistema: 'Sistema', persona: 'Persona', esterno: 'Esterno', documento: 'Documento',
  requisito: 'Requisito', componente: 'Componente', team: 'Team', tema: 'Tema', paese: 'Paese',
  vincolo: 'Vincolo',
}

export const GROUPS: { key: string; label: string; types: EntityType[]; collapsed?: boolean }[] = [
  { key: 'progetto', label: 'Progetto', types: ['progetto', 'requisito'] },
  { key: 'documenti', label: 'Documenti', types: ['documento'] },
  { key: 'processi', label: 'Processi', types: ['mappa', 'processo', 'attivita'] },
  { key: 'ruoli', label: 'Ruoli', types: ['ruolo', 'team'] },
  { key: 'sistemi', label: 'Sistemi', types: ['sistema', 'componente'] },
  { key: 'persone', label: 'Persone', types: ['persona'] },
  { key: 'esterni', label: 'Esterni', types: ['esterno'] },
  { key: 'perimetro', label: 'Perimetro', types: ['tema', 'paese', 'vincolo'], collapsed: true },
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
  confidence: number
}

export function buildModel(s: Scenario): Model {
  const byId: Record<string, Entity> = Object.fromEntries(s.entities.map((e) => [e.id, e]))
  const syntheticRoot = !byId[s.rootId]
  if (syntheticRoot) byId[s.rootId] = { id: s.rootId, type: 'tema', label: 'Overview', sources: [] }

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
      return defined.includes('diretto') ? 'diretto' : 'indiretto'
    }
    const own = merge(incoming[id].filter((r) => r.kind === 'impatta').map((r) => r.scope))
    const parent = byId[id].parent
    const result =
      own ??
      (parent && parent !== s.rootId ? resolve(parent, seen) : undefined) ??
      merge(
        incoming[id]
          .filter((r) => r.kind === 'eseguita_da' || r.kind === 'usa_sistema')
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
    const label = g.key === 'progetto' && !members.some((e) => e.type === 'progetto') ? 'Requisito' : g.label
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

  const impacts = s.relations.filter((r) => r.kind === 'impatta')
  const confidence = impacts.length ? impacts.reduce((a, r) => a + r.confidence, 0) / impacts.length : 0

  return {
    scenario: s, rootId: s.rootId, syntheticRoot, byId, relations: s.relations,
    children, incoming, outgoing, scope, groups, numbers, gaps, gapsByEntity, confidence,
  }
}

export function matchesFilter(m: Model, id: string, f: Filter): boolean {
  if (f === 'tutte' || id === m.rootId) return true
  const self = f === 'gap' ? !!m.gapsByEntity[id]?.length : m.scope[id] === (f === 'dirette' ? 'diretto' : 'indiretto')
  return self || m.children[id].some((c) => matchesFilter(m, c, f))
}

/** The impact relation that carries change / level / charter info for an entity. */
export function impactOf(m: Model, id: string): Relation | undefined {
  const rs = m.incoming[id].filter((r) => r.kind === 'impatta')
  return rs.find((r) => r.from === m.rootId) ?? rs[0]
}

export function confidenceOf(m: Model, id: string): number | undefined {
  if (id === m.rootId) return m.confidence
  const rs = m.incoming[id].filter((r) => r.kind !== 'fonte' && r.kind !== 'appartiene')
  const imp = rs.filter((r) => r.kind === 'impatta')
  const pool = imp.length ? imp : rs
  return pool.length ? Math.max(...pool.map((r) => r.confidence)) : undefined
}

export const related = (m: Model, id: string, kind: Relation['kind'], dir: 'out' | 'in') =>
  (dir === 'out' ? m.outgoing[id] : m.incoming[id])
    .filter((r) => r.kind === kind)
    .map((r) => m.byId[dir === 'out' ? r.to : r.from])
    .filter(Boolean)

/** Activities performed by a role, or using a system. */
function activitiesOf(m: Model, id: string) {
  return m.incoming[id]
    .filter((r) => r.kind === 'eseguita_da' || r.kind === 'usa_sistema')
    .sort((a, b) => b.confidence - a.confidence)
    .map((r) => m.byId[r.from])
}

/** Processes (by code) reached through a role's activities. */
export function processesOf(m: Model, id: string): Entity[] {
  const out = new Map<string, Entity>()
  for (const a of activitiesOf(m, id)) {
    const p = a.type === 'processo' ? a : a.parent ? m.byId[a.parent] : undefined
    if (p) out.set(p.id, p)
  }
  for (const r of m.incoming[id].filter((r) => r.kind === 'impatta')) {
    const p = m.byId[r.from]
    if (p?.type === 'processo') out.set(p.id, p)
  }
  return [...out.values()]
}

/** Root → ancestors → entity (→ role), e.g. Progetto → PTP.05 → PTP.05.02 → attività → ruolo. */
export function chainFor(m: Model, id: string, seen = new Set<string>()): string[] {
  if (id === m.rootId || seen.has(id)) return [id]
  seen.add(id)
  const e = m.byId[id]
  const via = activitiesOf(m, id)[0]
  if (via) return [...chainFor(m, via.id, seen), id]
  if (e.parent) return [...chainFor(m, e.parent, seen), id]
  const imp = m.incoming[id].find((r) => r.kind === 'impatta' || r.kind === 'appartiene')
  if (imp) return [...chainFor(m, imp.from, seen), id]
  const out = m.outgoing[id].find((r) => r.kind === 'appartiene')
  if (out) return [...chainFor(m, out.to, seen), id]
  return [m.rootId, id]
}

const LEVEL_TEXT = { alta: 'alto', media: 'medio', bassa: 'basso' }
const CHANGE_TEXT = { automatizzata: 'automatizzata', modificata: 'modificata', da_verificare: 'con impatto da verificare' }
const list = (es: Entity[]) => es.map((e) => e.code ?? e.label).join(', ')

/** 1–2 lines of "why", generated from the relations — never free text. */
export function explain(m: Model, id: string): string {
  const e = m.byId[id]
  const imp = impactOf(m, id)
  const downstream = m.scope[id] === 'indiretto' ? ' a valle' : ''
  switch (e.type) {
    case 'attivita': {
      const proc = e.parent ? m.byId[e.parent] : undefined
      const roles = related(m, id, 'eseguita_da', 'out')
      const systems = related(m, id, 'usa_sistema', 'out')
      return `Attività ${imp?.change ? CHANGE_TEXT[imp.change] : 'coinvolta'}${downstream} nel processo ${proc?.code ?? ''} ${proc?.label ?? ''}. Eseguita da ${list(roles) || 'ruolo non indicato'}${systems.length ? ` tramite ${list(systems)}` : '; sistema non indicato'}.`
    }
    case 'ruolo':
    case 'team':
    case 'esterno': {
      const acts = activitiesOf(m, id)
      const procs = processesOf(m, id)
      const charter = imp?.inCharter === true ? ' Previsto nel charter.' : imp?.inCharter === false ? ' Non citato nel charter di progetto.' : ''
      const what = acts.length ? `${acts.length} attività` : `${procs.length || 1} elementi`
      return `Coinvolgimento${imp?.level ? ` ${LEVEL_TEXT[imp.level]}` : ''}${downstream} su ${what}${procs.length ? ` (${list(procs)})` : ''}.${charter}`
    }
    case 'mappa':
    case 'processo': {
      const acts = descendants(m, id).filter((d) => d.type === 'attivita')
      if (!acts.length) return `Elemento impattato${downstream}${imp ? ` da ${m.byId[imp.from].label}` : ''}.`
      const auto = acts.filter((a) => impactOf(m, a.id)?.change === 'automatizzata').length
      return `${acts.length} attività impattate${downstream}, di cui ${auto} automatizzate.`
    }
    case 'sistema':
    case 'componente': {
      const acts = activitiesOf(m, id)
      if (acts.length) return `Sistema utilizzato in ${acts.length} attività impattate (${list(acts.map((a) => (a.parent ? m.byId[a.parent] : a)))}).`
      break
    }
    case 'documento':
      return `Fonte di ${m.outgoing[id].length} relazioni dell'analisi.`
  }
  if (imp) return `Impattato${downstream} da ${m.byId[imp.from].label}.`
  return 'Motivazione non disponibile (TBD).'
}

export function descendants(m: Model, id: string): Entity[] {
  return m.children[id].flatMap((c) => [m.byId[c], ...descendants(m, c)])
}

/** Entity citations first, then those of every relation touching it. Deduplicated. */
export function citationsFor(m: Model, id: string): Citation[] {
  const all = [
    ...m.byId[id].sources,
    ...m.incoming[id].flatMap((r) => r.sources),
    ...m.outgoing[id].filter((r) => r.kind !== 'fonte').flatMap((r) => r.sources),
  ]
  const seen = new Set<string>()
  return all.filter((c) => {
    const k = `${c.doc}|${c.page}|${c.passage}`
    return seen.has(k) ? false : (seen.add(k), true)
  })
}

const META_TYPES: [EntityType, string, string][] = [
  ['mappa', 'mappa', 'mappe'],
  ['attivita', 'attività', 'attività'],
  ['processo', 'processo', 'processi'],
  ['requisito', 'requisito', 'requisiti'],
  ['componente', 'componente', 'componenti'],
  ['ruolo', 'ruolo', 'ruoli'],
  ['team', 'team', 'team'],
]

/** "Confidenza 81% · 3 mappe · 12 attività · 5 gap" — all derived. */
export function metaLine(m: Model): string[] {
  const parts = [`Confidenza ${Math.round(m.confidence * 100)}%`]
  for (const [type, one, many] of META_TYPES) {
    if (parts.length >= 3) break
    const n = m.scenario.entities.filter((e) => e.type === type).length
    if (n) parts.push(`${n} ${n === 1 ? one : many}`)
  }
  parts.push(`${m.gaps.length} gap`)
  return parts
}
