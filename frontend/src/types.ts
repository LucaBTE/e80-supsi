export type EntityType =
  | 'project' | 'map' | 'process' | 'activity' | 'role' | 'system' | 'person' | 'external'
  | 'document' | 'requirement' | 'component' | 'team' | 'topic' | 'country' | 'constraint'

export type Citation = { doc: string; page?: number; passage?: string; path?: string; loc?: string; url?: string }

export type Entity = {
  id: string
  type: EntityType
  label: string
  /** Stable business id, e.g. PTP.05.02 */
  code?: string
  /** Hierarchy: Project → Map → Process → Activity */
  parent?: string
  subtitle?: string
  sources: Citation[]
  backend?: { label: string; key: string }
}

export type RelationKind = 'impacts' | 'source' | 'belongs_to' | 'performed_by' | 'uses_system' | 'related_to'
export type Scope = 'direct' | 'indirect'
export type Change = 'automated' | 'changed' | 'needs_review'
export type Level = 'high' | 'medium' | 'low'

export type Relation = {
  from: string
  to: string
  kind: RelationKind
  scope?: Scope
  change?: Change
  level?: Level
  inCharter?: boolean
  charterRef?: string
  /** 0–1, per relation */
  confidence?: number
  label?: string
  sources: Citation[]
}

export type GapKind = 'outside_charter' | 'system_needs_review' | 'missing_owner' | 'missing_source'
export type Severity = 'high' | 'medium' | 'low'

export type Gap = { id: string; kind: GapKind; entityId: string; message: string; severity: Severity }

export type OverviewSentence = { text: string; cites: string[] }

/** One graph-backed answer, adapted from the HTTP API. */
export type Scenario = {
  id: string
  label: string
  query: string
  /** Mock routing only: query words that select this scenario */
  keywords: string[]
  /** Graph root. If no entity has this id an "Overview" root is synthesised. */
  rootId: string
  scopeLabel?: string
  overview: OverviewSentence[]
  entities: Entity[]
  relations: Relation[]
  sources?: Citation[]
  cypherError?: string | null
}

export type Project = {
  id: string
  code: string
  name: string
  status: string
  owner: string
  period: string
  objective: string
  themes: string[]
  exclusions: string[]
  milestones: { label: string; date: string; done: boolean }[]
  documents: Citation[]
  scenarioId?: string
}

export type InfoAnswer = {
  id: string
  label: string
  query: string
  confidence?: number
  sentences: { text: string; cites: number[] }[]
  citations: Citation[]
}
