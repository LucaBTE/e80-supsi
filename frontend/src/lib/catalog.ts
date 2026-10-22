import type { Change, Citation, Entity, Gap, Project, Scenario, Scope } from '../types'
import { buildModel, citationsFor, impactOf, related, type Model } from './model'

export type ActivityEntry = {
  id: string; label: string; roles: string[]; systems: string[]; change?: Change; confidence?: number; gaps: Gap[]
}
export type ProcessEntry = {
  key: string; code?: string; label: string; subtitle?: string; scenarioId: string; entityId: string
  activities: ActivityEntry[]; roles: string[]
  impacts: { project?: Project; scope?: Scope; confidence?: number }[]
  gaps: Gap[]; sources: Citation[]
}
export type MapGroup = { key: string; code?: string; label: string; processes: ProcessEntry[] }
const byCode = (a: { code?: string; label: string }, b: { code?: string; label: string }) =>
  (a.code ?? a.label).localeCompare(b.code ?? b.label)

export function processCatalog(scenario: Scenario, projects: Project[]): MapGroup[] {
  const m = buildModel(scenario)
  const processes = scenario.entities.filter((e) => e.type === 'process').map((p): ProcessEntry => {
    const activities = m.children[p.id].map((id) => m.byId[id]).filter((e) => e.type === 'activity').map((a) => ({
      id: a.id, label: a.label,
      roles: related(m, a.id, 'performed_by', 'out').map((r) => r.label),
      systems: related(m, a.id, 'uses_system', 'out').map((s) => s.label),
      change: impactOf(m, a.id)?.change, confidence: impactOf(m, a.id)?.confidence, gaps: m.gapsByEntity[a.id] ?? [],
    }))
    return { key: p.code ?? p.id, code: p.code, label: p.label, subtitle: p.subtitle,
      scenarioId: `Which projects, systems and roles are connected to process "${p.backend?.key ?? p.label}"?`, entityId: p.id,
      activities, roles: [...new Set(activities.flatMap((a) => a.roles))],
      impacts: m.incoming[p.id].filter((r) => r.kind === 'impacts').map((r) => ({
        project: projects.find((project) => project.id === r.from), scope: r.scope, confidence: r.confidence,
      })),
      gaps: [...(m.gapsByEntity[p.id] ?? []), ...activities.flatMap((a) => a.gaps)], sources: citationsFor(m, p.id) }
  }).sort(byCode)
  return [{ key: 'processes', label: 'Processes indexed in Neo4j', processes }]
}

export type ProjectSummary = { model: Model; processes: Entity[]; roles: Entity[]; people: Entity[]; gaps: Gap[] }
export function projectSummary(p: Project, scenario: Scenario): ProjectSummary {
  const model = buildModel(scenario)
  const ids = new Set(model.outgoing[p.id]?.filter((r) => r.kind === 'impacts').map((r) => r.to))
  const visit = (id: string) => {
    for (const child of model.children[id] ?? []) if (!ids.has(child)) { ids.add(child); visit(child) }
  }
  for (const id of [...ids]) visit(id)
  const roles = new Set([...ids].flatMap((id) => related(model, id, 'performed_by', 'out').map((e) => e.id)))
  const people = new Set(scenario.relations.filter((r) => r.to === p.id && r.label === 'WORKS_ON').map((r) => r.from))
  return { model, processes: scenario.entities.filter((e) => e.type === 'process' && ids.has(e.id)).sort(byCode),
    roles: scenario.entities.filter((e) => roles.has(e.id)), people: scenario.entities.filter((e) => people.has(e.id)),
    gaps: model.gaps.filter((g) => ids.has(g.entityId) || roles.has(g.entityId) || g.entityId === p.id) }
}
