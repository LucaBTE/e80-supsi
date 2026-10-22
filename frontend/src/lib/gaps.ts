import type { Entity, Gap, Relation } from '../types'

/**
 * Derives gaps from the graph. Pure: same input, same output, nothing hand-written.
 * Missing sources are reported as TBD and never filled in.
 */
export function computeGaps(entities: Entity[], relations: Relation[]): Gap[] {
  const byId = new Map(entities.map((e) => [e.id, e]))
  const children = new Map<string, string[]>()
  for (const e of entities) {
    if (e.parent) children.set(e.parent, [...(children.get(e.parent) ?? []), e.id])
  }
  const impacted = new Set(relations.filter((r) => r.kind === 'impatta').map((r) => r.to))
  const gaps: Gap[] = []

  // 1. Role performing an impacted activity but declared outside the charter
  const roles = new Set(
    relations.filter((r) => r.kind === 'eseguita_da' && impacted.has(r.from)).map((r) => r.to),
  )
  for (const roleId of roles) {
    if (relations.some((r) => r.to === roleId && r.inCharter === false)) {
      gaps.push({
        id: `charter:${roleId}`,
        kind: 'fuori_charter',
        entityId: roleId,
        message: 'Non presente nel charter',
        severity: 'alta',
      })
    }
  }

  // 2. Activity whose system is unconfirmed or missing
  for (const e of entities) {
    if (e.type !== 'attivita') continue
    const toVerify = relations.some((r) => r.to === e.id && r.change === 'da_verificare')
    const noSystem = !relations.some((r) => r.from === e.id && r.kind === 'usa_sistema')
    if (toVerify || noSystem) {
      gaps.push({
        id: `system:${e.id}`,
        kind: 'sistema_da_verificare',
        entityId: e.id,
        message: noSystem ? 'Sistema da verificare · nessun sistema associato' : 'Sistema da verificare',
        severity: 'media',
      })
    }
  }

  // 3. Process with no performing role on itself or any descendant
  const hasOwner = (id: string): boolean =>
    relations.some((r) => r.from === id && r.kind === 'eseguita_da') ||
    (children.get(id) ?? []).some(hasOwner)
  for (const e of entities) {
    if (e.type === 'processo' && !hasOwner(e.id)) {
      gaps.push({ id: `owner:${e.id}`, kind: 'owner_mancante', entityId: e.id, message: 'Owner mancante', severity: 'alta' })
    }
  }

  // 4. Relation without any citation
  for (const r of relations) {
    if (r.sources.length > 0) continue
    const from = byId.get(r.from)
    gaps.push({
      id: `source:${r.kind}:${r.from}>${r.to}`,
      kind: 'fonte_mancante',
      entityId: r.to,
      message: `Fonte mancante (TBD) · relazione da ${from?.code ?? from?.label ?? r.from}`,
      severity: 'media',
    })
  }

  return gaps
}

export const GAP_SHORT: Record<Gap['kind'], string> = {
  fuori_charter: 'non nel charter',
  sistema_da_verificare: 'sistema da verificare',
  owner_mancante: 'owner mancante',
  fonte_mancante: 'fonte TBD',
}
