import { useCallback, useEffect, useRef, useState } from 'react'
import SearchBar from './components/SearchBar'
import TabBar, { type Tab } from './components/TabBar'
import AnalysisView from './components/AnalysisView'
import ProcessesView from './components/ProcessesView'
import ProjectsView from './components/ProjectsView'
import InfoView from './components/InfoView'
import { ask, fetchCatalog } from './lib/api'
import { answerScenario, catalogProjects, graphScenario, infoAnswer } from './lib/adapter'
import type { InfoAnswer, Project, Scenario } from './types'
import kipLogo from '../assets/kip-logo-no-bg.png'
import e80Logo from '../assets/logo-e80.svg'

const PLACEHOLDER: Record<Tab, string> = {
  processes: 'Filter by code, process, activity, role or system…', projects: 'Filter by code, name or owner…',
  analysis: 'Who or what is affected by a project or change?', info: 'Ask a question about the indexed documents…',
}
const EXAMPLES = [
  { id: 'h24', label: 'H24 blueprint', query: 'If I change document 173_H24 OFFERS - Business Blueprint_Rev3.docx, which other documents should I review?' },
  { id: 'invoices', label: 'Document Automation charter', query: 'If I change document Document automation - Project Charter.docx, which other documents should I review?' },
  { id: 'suppliers', label: 'Supplier qualification testbook', query: 'If I change document Testbook_qualifica fornitori 26-06-2026.xlsx, which other documents should I review?' },
]
const EMPTY = graphScenario({ nodes: [], relationships: [] })

export default function App() {
  const [tab, setTab] = useState<Tab>('info')
  const [queries, setQueries] = useState<Record<Tab, string>>({ processes: '', projects: '', analysis: '', info: '' })
  const [catalog, setCatalog] = useState(EMPTY)
  const [projects, setProjects] = useState<Project[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [truncated, setTruncated] = useState(false)
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [analysisVersion, setAnalysisVersion] = useState(0)
  const [info, setInfo] = useState<InfoAnswer | null>(null)
  const [busy, setBusy] = useState<'analysis' | 'info' | null>(null)
  const [errors, setErrors] = useState<Partial<Record<Tab, string>>>({})
  const [pendingSelect, setPendingSelect] = useState<string>()
  const [processKey, setProcessKey] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [cite, setCite] = useState(1)
  const [scopeVisible, setScopeVisible] = useState(true)
  const controller = useRef<AbortController>()
  const catalogController = useRef<AbortController>()

  const loadCatalog = useCallback(async () => {
    catalogController.current?.abort()
    const current = new AbortController()
    catalogController.current = current
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const data = await fetchCatalog(current.signal)
      if (current.signal.aborted) return
      const next = graphScenario(data.graph, data.sources)
      setCatalog(next)
      setProjects(catalogProjects(data, next))
      setTruncated(data.truncated)
    } catch (error) {
      if (!current.signal.aborted) setCatalogError(error instanceof Error ? error.message : 'Could not load the catalog.')
    } finally {
      if (!current.signal.aborted) setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalog()
    return () => { catalogController.current?.abort(); controller.current?.abort() }
  }, [loadCatalog])

  const run = async (q: string, target: 'analysis' | 'info', select?: string) => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    setBusy(target)
    setErrors((prev) => ({ ...prev, [target]: undefined }))
    try {
      const result = await ask(q, current.signal)
      if (current.signal.aborted) return
      if (target === 'analysis') {
        setScenario(answerScenario(result, q))
        setAnalysisVersion((n) => n + 1)
        setPendingSelect(select)
        setScopeVisible(true)
      } else { setInfo(infoAnswer(result, q)); setCite(1) }
      if (result.cypher_error) setErrors((prev) => ({ ...prev, [target]: 'The graph query failed. The answer uses only the available excerpts.' }))
    } catch (error) {
      if (!current.signal.aborted) {
        setErrors((prev) => ({ ...prev, [target]: error instanceof Error ? error.message : 'The request failed.' }))
        if (target === 'analysis') setScenario(null)
        else setInfo(null)
      }
    } finally {
      if (!current.signal.aborted) setBusy(null)
    }
  }
  const openAnalysis = (query: string, id?: string) => {
    setQueries((q) => ({ ...q, analysis: query })); setTab('analysis'); void run(query, 'analysis', id)
  }

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 py-4 sm:px-8 lg:h-screen lg:overflow-y-auto">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <img src={kipLogo} alt="KiP" className="h-12 w-[68px] object-contain" />
          <span className="flex h-12 items-center bg-e80-black px-3"><img src={e80Logo} alt="E80 Group" className="h-8 w-[108px] object-contain" /></span>
          <span className="e80-eyebrow">Knowledge Trace</span>
          <span role="status" className="ml-auto text-xs text-e80-gray">{catalogLoading ? 'Loading catalog…' : catalogError ? 'Catalog unavailable' : `${catalog.entities.length} indexed entities`}</span>
          <button className="e80-btn-outline" disabled={catalogLoading} onClick={() => void loadCatalog()}>Refresh catalog</button>
          <a href="/docs" target="_blank" rel="noreferrer" className="text-xs underline">API</a>
        </div>
        <TabBar tab={tab} onChange={setTab} />
        <SearchBar value={queries[tab]} onChange={(v) => setQueries((q) => ({ ...q, [tab]: v }))}
          loading={busy !== null} onSearch={(q) => { if (tab === 'analysis' || tab === 'info') void run(q, tab) }}
          examples={tab === 'analysis' || tab === 'info' ? EXAMPLES : undefined} placeholder={PLACEHOLDER[tab]}
          scopeLabel={tab === 'analysis' && scopeVisible ? scenario?.scopeLabel : undefined} onClearScope={() => setScopeVisible(false)} />
      </header>
      {catalogError && <p role="alert" className="border-l-4 border-accent-4 bg-surface p-4 text-sm">{catalogError}</p>}
      {truncated && <p role="status" className="bg-surface p-3 text-sm">The catalog exceeds the display limit. Questions still query the entire graph.</p>}
      {!catalogLoading && !catalogError && !catalog.entities.length && <p role="status" className="bg-surface p-4 text-sm">The database is empty. Load the sample seed, then refresh the catalog.</p>}
      {errors[tab] && <p role="alert" className="border-l-4 border-accent-4 bg-surface p-4 text-sm">{errors[tab]}</p>}
      {busy && <p role="status" className="text-sm text-e80-gray">Searching…</p>}
      <main id="view-analysis" role="tabpanel" aria-labelledby="tab-analysis" hidden={tab !== 'analysis'} className="flex min-h-0 flex-1 flex-col">
        {scenario ? <AnalysisView key={analysisVersion} scenario={scenario} loading={busy === 'analysis'} initialSelect={pendingSelect} /> :
          <div className="e80-card p-8 text-e80-gray">Enter a question to analyze connected processes, systems and people in the graph.</div>}
      </main>
      <main id="view-processes" role="tabpanel" aria-labelledby="tab-processes" hidden={tab !== 'processes'} className="flex min-h-0 flex-1 flex-col">
        <ProcessesView catalog={catalog} projects={projects} query={queries.processes} selectedKey={processKey} onSelect={setProcessKey} onOpenAnalysis={openAnalysis} />
      </main>
      <main id="view-projects" role="tabpanel" aria-labelledby="tab-projects" hidden={tab !== 'projects'} className="flex min-h-0 flex-1 flex-col">
        <ProjectsView projects={projects} catalog={catalog} query={queries.projects} selectedId={projectId} onSelect={setProjectId}
          onOpenAnalysis={openAnalysis} onOpenProcess={(key) => { setProcessKey(key); setQueries((q) => ({ ...q, processes: '' })); setTab('processes') }} />
      </main>
      <main id="view-info" role="tabpanel" aria-labelledby="tab-info" hidden={tab !== 'info'} className="flex min-h-0 flex-1 flex-col gap-4">
        <InfoView answer={info} loaded={info !== null} selectedCite={cite} onSelectCite={setCite} />
      </main>
    </div>
  )
}
