export type EntityType =
  | 'progetto' | 'mappa' | 'processo' | 'attivita' | 'ruolo' | 'sistema' | 'persona' | 'esterno'
  | 'documento' | 'requisito' | 'componente' | 'team' | 'tema' | 'paese' | 'vincolo'

export type Citation = { doc: string; page?: number; passage?: string }

export type Entity = {
  id: string
  type: EntityType
  label: string
  /** Stable business id, e.g. PTP.05.02 */
  code?: string
  /** Hierarchy: Progetto → Mappa → Processo → Attività */
  parent?: string
  subtitle?: string
  sources: Citation[]
}

export type RelationKind = 'impatta' | 'fonte' | 'appartiene' | 'eseguita_da' | 'usa_sistema'
export type Scope = 'diretto' | 'indiretto'
export type Change = 'automatizzata' | 'modificata' | 'da_verificare'
export type Level = 'alta' | 'media' | 'bassa'

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
  confidence: number
  sources: Citation[]
}

export type GapKind = 'fuori_charter' | 'sistema_da_verificare' | 'owner_mancante' | 'fonte_mancante'
export type Severity = 'alta' | 'media' | 'bassa'

export type Gap = { id: string; kind: GapKind; entityId: string; message: string; severity: Severity }

export type OverviewSentence = { text: string; cites: string[] }

/** One mocked RAG answer. The UI only depends on this shape. */
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
}
