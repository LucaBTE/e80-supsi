import { useEffect, useMemo, useState } from 'react'
import SearchBar from './components/SearchBar'
import Overview from './components/Overview'
import EntityList from './components/EntityList'
import ImpactGraph from './components/ImpactGraph'
import { fetchRagAnswer, mockResponse } from './data/mockResponse'

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  async function runQuery(q) {
    setLoading(true)
    setSelectedId(null)
    setData(await fetchRagAnswer(q))
    setLoading(false)
  }

  useEffect(() => {
    runQuery(mockResponse.query)
  }, [])

  // Number entities once so overview chips, list and graph share the same [n] labels.
  const entities = useMemo(() => (data?.entities ?? []).map((e, i) => ({ ...e, n: i + 1 })), [data])
  const entityIndex = useMemo(() => Object.fromEntries(entities.map((e) => [e.id, e])), [entities])

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 py-4 sm:px-8 lg:h-screen lg:overflow-hidden">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="h-6 w-[9px] bg-accent" />
          <span className="text-lg font-extrabold uppercase tracking-title">E80 Group</span>
          <span className="e80-eyebrow">Knowledge Trace · Pilot</span>
        </div>
        <SearchBar initialQuery={mockResponse.query} loading={loading} onSearch={runQuery} />
      </header>

      {!data ? (
        <div className="e80-card flex flex-1 items-center justify-center text-e80-gray">Caricamento…</div>
      ) : (
        <main className={`flex min-h-0 flex-1 flex-col gap-4 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}>
          <Overview
            data={data}
            entityIndex={entityIndex}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
            <EntityList entities={entities} selectedId={selectedId} onSelect={setSelectedId} />
            <ImpactGraph
              graph={data.graph}
              entityIndex={entityIndex}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>
        </main>
      )}
    </div>
  )
}
