export type ApiNode = { id: string; labels: string[]; properties: Record<string, unknown> }
export type ApiRelationship = { id: string; type: string; start: string; end: string; properties: Record<string, unknown> }
export type ApiGraph = { nodes: ApiNode[]; relationships: ApiRelationship[] }
export type ApiSource = {
  n: number; chunk: string; document: string; path: string; loc: string; text: string
  document_id?: string
  cited?: boolean; entities?: string[]
  url?: string
}
export type CatalogResponse = { graph: ApiGraph; sources: ApiSource[]; truncated: boolean }
export type AskResponse = {
  answer: string; cypher: string; cypher_error: string | null
  graph: ApiGraph; sources: ApiSource[]; rows: Record<string, unknown>[]
  root_document_id?: string
}

const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(public status: number, message: string, public retryAfter?: string) {
    super(message)
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${base}${path}`, init)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Cannot reach the backend. Check that the service is running.')
  }
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = typeof body?.detail === 'string' ? body.detail : undefined
    const messages: Record<number, string> = {
      429: 'Gemini rate limit reached. Wait before retrying.',
      502: 'Gemini could not complete the request. Check the model and API key.',
      503: 'Service unavailable. Check the backend and Neo4j configuration.',
      422: 'Invalid request. Questions must contain between 3 and 2000 characters.',
    }
    throw new ApiError(response.status, detail || messages[response.status] || `HTTP error ${response.status}`, response.headers.get('Retry-After') || undefined)
  }
  if (!body) throw new ApiError(502, 'Invalid API response. Check the backend connection.')
  return body as T
}

export const fetchCatalog = (signal?: AbortSignal) => request<CatalogResponse>('/graph/catalog', { signal })
export const ask = (question: string, signal?: AbortSignal) => request<AskResponse>('/ask', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }), signal,
})
export const generateReport = (label: string, key: string) => request<{ markdown: string; sources: ApiSource[] }>('/documents', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'impact', label, key, language: 'English' }),
})
