import type { Citation, Entity, EntityType, InfoAnswer, Project, Relation, Scenario } from '../types'
import type { ApiGraph, ApiSource, AskResponse, CatalogResponse } from './api'

const TYPES: Record<string, EntityType> = {
  Project: 'project', Process: 'process', Activity: 'activity', Role: 'role', Person: 'person',
  OrgUnit: 'team', Company: 'external', Organization: 'external', System: 'system',
  BusinessObject: 'component', Requirement: 'requirement', TestCase: 'constraint', Issue: 'constraint',
  Document: 'document',
}
const KEYS: Record<string, string> = { Process: 'code', Activity: 'id', Company: 'code', Requirement: 'id', TestCase: 'id', Issue: 'id', Document: 'id' }
const KINDS: Record<string, Relation['kind']> = {
  PART_OF: 'belongs_to', VARIANT_OF: 'belongs_to', HAS_STEP: 'belongs_to',
  CHANGES: 'impacts', IMPACTS: 'impacts', AFFECTS: 'impacts', DONE_BY: 'performed_by', USES: 'uses_system',
  REVIEW_CANDIDATE: 'impacts',
}
const value = (x: unknown) => typeof x === 'string' || typeof x === 'number' ? String(x) : ''

export function citation(source: ApiSource): Citation {
  return { doc: source.document, path: source.path, loc: source.loc, passage: source.text, url: source.url,
    page: Number(/^p\.(\d+)/.exec(source.loc)?.[1]) || undefined }
}

export function graphScenario(graph: ApiGraph, sources: ApiSource[] = [], query = '', root?: string): Scenario {
  const includeDocuments = graph.nodes.some((node) => node.id === root && node.labels.includes('Document'))
  const entities: Entity[] = graph.nodes.flatMap((node) => {
    const label = node.labels.find((l) => TYPES[l])
    if (!label || (label === 'Document' && !includeDocuments)) return []
    const key = value(node.properties[KEYS[label] || 'name'])
    const name = value(node.properties.name || node.properties.title || node.properties.description) || key || label
    return [{ id: node.id, type: TYPES[label], label: name, code: label !== 'Document' && key !== name ? key : undefined,
      subtitle: value(node.properties.status || node.properties.title) || undefined,
      backend: key ? { label, key } : undefined,
      sources: sources.filter((s) => label === 'Document' ? s.document_id === node.id : s.entities?.includes(node.id)).map(citation) }]
  })
  const byId = new Map(entities.map((e) => [e.id, e]))
  const parent = (childId: string, parentId: string) => {
    const child = byId.get(childId)
    if (!child || !byId.has(parentId) || child.parent || childId === parentId) return
    const seen = new Set([childId])
    for (let p: Entity | undefined = byId.get(parentId); p; p = p.parent ? byId.get(p.parent) : undefined) {
      if (seen.has(p.id)) return
      seen.add(p.id)
    }
    child.parent = parentId
  }
  const relations: Relation[] = graph.relationships.flatMap((r) => {
    if (!byId.has(r.start) || !byId.has(r.end)) return []
    if (r.type === 'HAS_STEP') parent(r.end, r.start)
    if (r.type === 'PART_OF' || r.type === 'VARIANT_OF') parent(r.start, r.end)
    const kind = KINDS[r.type] || 'related_to'
    const confidence = r.properties.confidence
    return [{ from: r.start, to: r.end, kind, label: r.type === 'REVIEW_CANDIDATE' ? value(r.properties.reason) : r.type,
      scope: kind === 'impacts' ? (r.properties.scope === 'indirect' ? 'indirect' as const : 'direct' as const) : undefined,
      confidence: typeof confidence === 'number' && confidence >= 0 && confidence <= 1 ? confidence : undefined,
      // The backend does not store per-relationship provenance. Do not attach
      // unrelated excerpts to an edge or invent confidence scores.
      sources: [] }]
  })
  return { id: query || 'catalog', label: query || 'Knowledge graph', query, keywords: [],
    rootId: root && byId.has(root) ? root : '__overview__', entities, relations, overview: [], sources: sources.map(citation) }
}

export function answerScenario(result: AskResponse, query: string): Scenario {
  const scenario = graphScenario(result.graph, result.sources, query, result.root_document_id)
  scenario.overview = [{ text: result.answer, cites: [] }]
  scenario.cypherError = result.cypher_error
  return scenario
}

export function infoAnswer(result: AskResponse, query: string): InfoAnswer {
  return { id: query, label: query, query, sentences: [{ text: result.answer, cites: [] }], citations: result.sources.map(citation) }
}

export function catalogProjects(data: CatalogResponse, scenario: Scenario): Project[] {
  return scenario.entities.filter((e) => e.type === 'project').map((entity) => {
    const props = data.graph.nodes.find((n) => n.id === entity.id)!.properties
    const owners = data.graph.relationships.filter((r) => r.end === entity.id && r.type === 'WORKS_ON' && /^(pm|owner|sponsor)$/i.test(value(r.properties.role)))
      .map((r) => scenario.entities.find((e) => e.id === r.start)?.label).filter(Boolean)
    return { id: entity.id, name: entity.label, code: value(props.code) || '—', status: value(props.status) || 'TBD',
      owner: owners.join(' · ') || 'TBD', period: value(props.period) || 'TBD', objective: value(props.objective) || 'The project objective is not available in the graph properties.',
      themes: [], exclusions: [], milestones: [], documents: entity.sources, scenarioId: entity.id }
  })
}
