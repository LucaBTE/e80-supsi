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
  const impacted = new Set(relations.filter((r) => r.kind === 'impacts').map((r) => r.to))
  const gaps: Gap[] = []

  // 1. Role performing an impacted activity but declared outside the charter
  const roles = new Set(
    relations.filter((r) => r.kind === 'performed_by' && impacted.has(r.from)).map((r) => r.to),
  )
  for (const roleId of roles) {
    if (relations.some((r) => r.to === roleId && r.inCharter === false)) {
      gaps.push({
        id: `charter:${roleId}`,
        kind: 'outside_charter',
        entityId: roleId,
        message: 'Not listed in the charter',
        severity: 'high',
      })
    }
  }

  // 2. Activity whose system is unconfirmed or missing
  for (const e of entities) {
    if (e.type !== 'activity') continue
    const toVerify = relations.some((r) => r.to === e.id && r.change === 'needs_review')
    const noSystem = !relations.some((r) => r.from === e.id && r.kind === 'uses_system')
    if (toVerify || noSystem) {
      gaps.push({
        id: `system:${e.id}`,
        kind: 'system_needs_review',
        entityId: e.id,
        message: noSystem ? 'System needs review · no linked system' : 'System needs review',
        severity: 'medium',
      })
    }
  }

  // 3. Process with no performing role on itself or any descendant
  const hasOwner = (id: string): boolean =>
    relations.some((r) => r.from === id && r.kind === 'performed_by') ||
    (children.get(id) ?? []).some(hasOwner)
  for (const e of entities) {
    if (e.type === 'process' && !hasOwner(e.id)) {
      gaps.push({ id: `owner:${e.id}`, kind: 'missing_owner', entityId: e.id, message: 'Owner not specified', severity: 'high' })
    }
  }

  // 4. Relation without any citation
  for (const r of relations) {
    if (r.sources.length > 0) continue
    const from = byId.get(r.from)
    if (from?.type === 'document' && byId.get(r.to)?.type === 'document') continue
    gaps.push({
      id: `source:${r.kind}:${r.from}>${r.to}`,
      kind: 'missing_source',
      entityId: r.to,
      message: `Source not available (TBD) · relationship from ${from?.code ?? from?.label ?? r.from}`,
      severity: 'medium',
    })
  }

  return gaps
}

export const GAP_SHORT: Record<Gap['kind'], string> = {
  outside_charter: 'not in charter',
  system_needs_review: 'system needs review',
  missing_owner: 'owner not specified',
  missing_source: 'source TBD',
}
