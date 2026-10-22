import assert from 'node:assert/strict'
import test from 'node:test'
import { answerScenario, catalogProjects, graphScenario, infoAnswer } from '../src/lib/adapter.ts'
import { buildGraph } from '../src/lib/graph.ts'
import type { ApiGraph, AskResponse } from '../src/lib/api.ts'
import type { Model } from '../src/lib/model.ts'

const graph: ApiGraph = {
  nodes: [
    { id: 'p', labels: ['__Entity__', 'Project'], properties: { name: 'Rinnovi Offerte H24', code: '173', status: 'UAT' } },
    { id: 'process', labels: ['Process'], properties: { code: 'PTP.01', name: 'Supplier Qualification' } },
    { id: 'a', labels: ['Activity'], properties: { id: 'PTP.01#Review', name: 'Review' } },
    { id: 'source', labels: ['Document'], properties: { title: 'Restricted document' } },
  ],
  relationships: [
    { id: 'change', type: 'CHANGES', start: 'p', end: 'process', properties: {} },
    { id: 'step', type: 'HAS_STEP', start: 'process', end: 'a', properties: {} },
    { id: 'ignored', type: 'ABOUT', start: 'source', end: 'p', properties: {} },
  ],
}
const sources = [{ n: 1, chunk: 'c', document: 'Requirements', path: 'Projects/notes.md', loc: 'p.3', text: 'An excerpt.', entities: ['a'] }]

test('adapts real graph labels and keys without inventing evidence or confidence', () => {
  const scenario = graphScenario(graph, sources)
  assert.equal(scenario.entities.length, 3)
  assert.equal(scenario.entities.find((e) => e.id === 'a')?.parent, 'process')
  assert.deepEqual(scenario.entities.find((e) => e.id === 'p')?.backend, { label: 'Project', key: 'Rinnovi Offerte H24' })
  assert.equal(scenario.entities.find((e) => e.id === 'a')?.sources[0].page, 3)
  assert.equal(scenario.entities.find((e) => e.id === 'p')?.sources.length, 0)
  assert.equal(scenario.relations.length, 2)
  assert.equal(scenario.relations[0].confidence, undefined)
  assert.deepEqual(scenario.relations[0].sources, [])
})

test('preserves answer, citations and query failure notices, including an empty graph', () => {
  const result: AskResponse = { answer: 'Found in the source [1].', graph: { nodes: [], relationships: [] },
    sources, cypher: '', cypher_error: 'Invalid query', rows: [] }
  const scenario = answerScenario(result, 'Example question')
  assert.equal(scenario.overview[0].text, result.answer)
  assert.equal(scenario.cypherError, 'Invalid query')
  assert.equal(infoAnswer(result, 'Example question').citations[0].passage, 'An excerpt.')
})

test('shows linked documents for a document change without adding source nodes to regular graphs', () => {
  const impact: AskResponse = {
    answer: 'Review the linked charter.', cypher: '', cypher_error: null, rows: [],
    root_document_id: 'changed',
    graph: {
      nodes: [
        { id: 'changed', labels: ['Document'], properties: { id: 'changed', name: 'Blueprint_Rev3.docx' } },
        { id: 'review', labels: ['Document'], properties: { id: 'review', name: 'Charter.pdf' } },
      ],
      relationships: [{ id: 'edge', type: 'REVIEW_CANDIDATE', start: 'changed', end: 'review', properties: { reason: 'same subject: H24', scope: 'indirect' } }],
    },
    sources: [{ n: 1, chunk: 'c', document_id: 'review', document: 'Charter', path: 'Charter.pdf', loc: 'p.1', text: 'Project scope.' }],
  }
  const scenario = answerScenario(impact, 'If I change this document, which documents should I review?')
  assert.equal(scenario.rootId, 'changed')
  assert.deepEqual(scenario.entities.map((entity) => entity.type), ['document', 'document'])
  assert.equal(scenario.entities[1].sources[0].passage, 'Project scope.')
  assert.equal(scenario.relations[0].scope, 'indirect')
})

test('catalog preserves actual project status and marks missing metadata', () => {
  const data = { graph, sources, truncated: false }
  const projects = catalogProjects(data, graphScenario(graph, sources))
  assert.equal(projects[0].status, 'UAT')
  assert.equal(projects[0].code, '173')
  assert.equal(projects[0].owner, 'TBD')
  assert.deepEqual(projects[0].milestones, [])
})

test('rejects cyclic hierarchy while retaining actual relationships', () => {
  const cyclic = { ...graph, relationships: [
    { id: '1', type: 'PART_OF', start: 'p', end: 'process', properties: {} },
    { id: '2', type: 'PART_OF', start: 'process', end: 'p', properties: {} },
  ] }
  const scenario = graphScenario(cyclic)
  assert.equal(scenario.entities.filter((e) => e.parent).length, 1)
  assert.equal(scenario.relations.length, 2)
})

test('graph layout handles cyclic relationships and isolated nodes', () => {
  const scenario = graphScenario({ ...graph, relationships: [
    { id: '1', type: 'DEPENDS_ON', start: 'p', end: 'process', properties: {} },
    { id: '2', type: 'DEPENDS_ON', start: 'process', end: 'p', properties: {} },
  ] }, [], '', 'p')
  const ids = scenario.entities.map((e) => e.id)
  const byId = Object.fromEntries(scenario.entities.map((e) => [e.id, e]))
  const model = { scenario, rootId: 'p', byId, scope: {}, relations: scenario.relations,
    children: Object.fromEntries(ids.map((id) => [id, []])),
    incoming: Object.fromEntries(ids.map((id) => [id, scenario.relations.filter((r) => r.to === id)])),
  } as unknown as Model
  const output = buildGraph(model, new Set())
  assert.equal(output.nodes.length, 3)
  assert.ok(Number.isFinite(output.width) && Number.isFinite(output.height))
  assert.ok(output.height < 1000)
})
