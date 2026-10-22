import { SCENARIOS } from '../data'
import { PROJECTS, type Project } from '../data/projects'
import type { Change, Citation, Entity, Gap, Scope } from '../types'
import { buildModel, citationsFor, impactOf, related, type Model } from './model'

/** Every scenario indexed once: the catalog tabs read from the same data as the analysis. */
export const MODELS: Model[] = SCENARIOS.map(buildModel)

export type ActivityEntry = {
  id: string
  label: string
  roles: string[]
  systems: string[]
  change?: Change
  confidence?: number
  gaps: Gap[]
}
export type ProcessEntry = {
  key: string
  code?: string
  label: string
  subtitle?: string
  scenarioId: string
  entityId: string
  activities: ActivityEntry[]
  roles: string[]
  impacts: { project?: Project; scope?: Scope; confidence: number }[]
  gaps: Gap[]
  sources: Citation[]
}
export type MapGroup = { key: string; code?: string; label: string; processes: ProcessEntry[] }

const uniq = (xs: string[]) => [...new Set(xs)]
const byCode = (a: { code?: string; label: string }, b: { code?: string; label: string }) =>
  (a.code ?? `~${a.label}`).localeCompare(b.code ?? `~${b.label}`)

export function projectForScenario(scenarioId: string) {
  return PROJECTS.find((p) => p.scenarioId === scenarioId)
}

function processEntry(m: Model, p: Entity): ProcessEntry {
  const acts = m.children[p.id].map((id) => m.byId[id]).filter((e) => e.type === 'attivita')
  const activities = acts.map((a): ActivityEntry => {
    const imp = impactOf(m, a.id)
    return {
      id: a.id,
      label: a.label,
      roles: related(m, a.id, 'eseguita_da', 'out').map((r) => r.label),
      systems: related(m, a.id, 'usa_sistema', 'out').map((s) => s.label),
      change: imp?.change,
      confidence: imp?.confidence,
      gaps: m.gapsByEntity[a.id] ?? [],
    }
  })
  const impacts = m.incoming[p.id]
    .filter((r) => r.kind === 'impatta')
    .map((r) => ({ project: projectForScenario(m.scenario.id), scope: r.scope, confidence: r.confidence }))
  return {
    key: p.code ?? p.id,
    code: p.code,
    label: p.label,
    subtitle: p.subtitle,
    scenarioId: m.scenario.id,
    entityId: p.id,
    activities,
    roles: uniq([...related(m, p.id, 'eseguita_da', 'out').map((r) => r.label), ...activities.flatMap((a) => a.roles)]),
    impacts,
    gaps: [...(m.gapsByEntity[p.id] ?? []), ...activities.flatMap((a) => a.gaps)],
    sources: citationsFor(m, p.id),
  }
}

/** Maps → processes across all scenarios; processes sharing a code are merged. */
export function processCatalog(): MapGroup[] {
  const groups = new Map<string, MapGroup>()
  for (const m of MODELS) {
    for (const p of m.scenario.entities.filter((e) => e.type === 'processo')) {
      const map = p.parent ? m.byId[p.parent] : undefined
      const key = map?.type === 'mappa' ? map.code ?? map.id : 'none'
      if (!groups.has(key)) {
        groups.set(key, map?.type === 'mappa' ? { key, code: map.code, label: map.label, processes: [] } : { key, label: 'Processi senza mappa PTP', processes: [] })
      }
      const g = groups.get(key)!
      const entry = processEntry(m, p)
      const same = g.processes.find((x) => x.key === entry.key)
      if (same) {
        same.impacts.push(...entry.impacts)
        same.gaps.push(...entry.gaps)
      } else g.processes.push(entry)
    }
  }
  // Processes outside the PTP maps go last
  const out = [...groups.values()].sort((a, b) => (a.key === 'none' ? 1 : b.key === 'none' ? -1 : byCode(a, b)))
  out.forEach((g) => g.processes.sort(byCode))
  return out
}

export type ProjectSummary = {
  model?: Model
  processes: Entity[]
  roles: Entity[]
  people: Entity[]
  gaps: Gap[]
}

export function projectSummary(p: Project): ProjectSummary {
  const m = MODELS.find((x) => x.scenario.id === p.scenarioId)
  if (!m) return { processes: [], roles: [], people: [], gaps: [] }
  const ents = m.scenario.entities
  const impacted = (e: Entity) => m.incoming[e.id].some((r) => r.kind === 'impatta')
  return {
    model: m,
    processes: ents.filter((e) => e.type === 'processo' && impacted(e)).sort(byCode),
    roles: ents.filter((e) => (e.type === 'ruolo' || e.type === 'team') && m.scope[e.id]),
    people: ents.filter((e) => e.type === 'persona' || (e.type === 'esterno' && m.outgoing[e.id].some((r) => r.kind === 'appartiene'))),
    gaps: m.gaps,
  }
}
