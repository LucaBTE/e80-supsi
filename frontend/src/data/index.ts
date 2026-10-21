import type { Scenario } from '../types'
import { documentAutomation } from './scenarios/documentAutomation'
import { pallet } from './scenarios/pallet'

export const SCENARIOS: Scenario[] = [documentAutomation, pallet]

/** Mock router: picks the scenario whose keywords best match the query. */
function resolve(query: string): Scenario {
  const q = query.toLowerCase()
  const score = (s: Scenario) => s.keywords.filter((k) => q.includes(k)).length
  return [...SCENARIOS].sort((a, b) => score(b) - score(a))[0]
}

/** Replace with the real RAG backend call; the UI only depends on `Scenario`. */
export function fetchRagAnswer(query: string, scenarioId?: string): Promise<Scenario> {
  const s = SCENARIOS.find((x) => x.id === scenarioId) ?? resolve(query)
  return new Promise((ok) => setTimeout(() => ok({ ...s, query }), 600))
}
