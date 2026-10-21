import { useCallback, useEffect, useState } from 'react'
import SearchBar from './components/SearchBar'
import TabBar, { type Tab } from './components/TabBar'
import AnalysisView from './components/AnalysisView'
import ProcessesView from './components/ProcessesView'
import ProjectsView from './components/ProjectsView'
import InfoView from './components/InfoView'
import { fetchRagAnswer, SCENARIOS } from './data'
import { fetchInfoAnswer, INFO_ANSWERS, type InfoAnswer } from './data/info'
import type { Scenario } from './types'

const PLACEHOLDER: Record<Tab, string> = {
  processi: 'Filtrare per codice PTP, processo, attività, ruolo o sistema…',
  progetti: 'Filtrare per codice, nome, responsabile o tema…',
  analisi: 'Chi o cosa è impattato da un progetto o da una modifica?',
  info: 'Domanda su documenti, specifiche o charter…',
}

export default function App() {
  const [tab, setTab] = useState<Tab>('analisi')
  const [queries, setQueries] = useState<Record<Tab, string>>({
    processi: '',
    progetti: '',
    analisi: SCENARIOS[0].query,
    info: INFO_ANSWERS[0].query,
  })
  const setQuery = (v: string) => setQueries((q) => ({ ...q, [tab]: v }))

  // Analisi impatto
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadId, setLoadId] = useState(0)
  const [pendingSelect, setPendingSelect] = useState<string>()
  const [scopeVisible, setScopeVisible] = useState(true)

  // Informazioni
  const [info, setInfo] = useState<InfoAnswer | null>(null)
  const [infoLoaded, setInfoLoaded] = useState(false)
  const [cite, setCite] = useState(1)

  // Catalog selections
  const [processKey, setProcessKey] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)

  const runAnalysis = useCallback(async (q: string, scenarioId?: string, select?: string) => {
    setLoading(true)
    const next = await fetchRagAnswer(q, scenarioId)
    setScenario(next)
    setPendingSelect(select)
    setLoadId((n) => n + 1)
    setScopeVisible(true)
    setLoading(false)
  }, [])

  const runInfo = useCallback(async (q: string, id?: string) => {
    setLoading(true)
    setInfo(await fetchInfoAnswer(q, id))
    setInfoLoaded(true)
    setCite(1)
    setLoading(false)
  }, [])

  useEffect(() => {
    runAnalysis(SCENARIOS[0].query, SCENARIOS[0].id)
    runInfo(INFO_ANSWERS[0].query, INFO_ANSWERS[0].id)
  }, [runAnalysis, runInfo])

  const onSearch = (q: string, exampleId?: string) => {
    if (tab === 'analisi') runAnalysis(q, exampleId)
    if (tab === 'info') runInfo(q, exampleId)
    // Processi / Progetti filter live while typing
  }

  const openAnalysis = (scenarioId: string, entityId?: string) => {
    const s = SCENARIOS.find((x) => x.id === scenarioId)!
    setQueries((q) => ({ ...q, analisi: s.query }))
    setTab('analisi')
    runAnalysis(s.query, s.id, entityId)
  }

  const openProcess = (key: string) => {
    setProcessKey(key)
    setQueries((q) => ({ ...q, processi: '' }))
    setTab('processi')
  }

  const examples = tab === 'analisi' ? SCENARIOS : tab === 'info' ? INFO_ANSWERS : undefined

  return (
    <div className="flex min-h-full flex-col gap-4 px-4 py-4 sm:px-8 lg:h-screen lg:overflow-y-auto">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="h-6 w-[9px] bg-accent" aria-hidden />
          <span className="text-lg font-extrabold uppercase tracking-title">E80 Group</span>
          <span className="e80-eyebrow">Knowledge Trace · Pilot</span>
        </div>
        <TabBar tab={tab} onChange={setTab} />
        <SearchBar
          value={queries[tab]}
          onChange={setQuery}
          loading={loading && (tab === 'analisi' || tab === 'info')}
          onSearch={onSearch}
          examples={examples}
          placeholder={PLACEHOLDER[tab]}
          scopeLabel={tab === 'analisi' && scopeVisible ? scenario?.scopeLabel : undefined}
          onClearScope={() => setScopeVisible(false)}
        />
      </header>

      {/* Views stay mounted so each tab keeps its state; inactive ones are hidden */}
      <main id="view-analisi" role="tabpanel" aria-labelledby="tab-analisi" hidden={tab !== 'analisi'} className="flex min-h-0 flex-1 flex-col">
        {scenario ? (
          <AnalysisView key={loadId} scenario={scenario} loading={loading} initialSelect={pendingSelect} />
        ) : (
          <div className="e80-card flex flex-1 items-center justify-center py-16 text-e80-gray">Caricamento…</div>
        )}
      </main>
      <main id="view-processi" role="tabpanel" aria-labelledby="tab-processi" hidden={tab !== 'processi'} className="flex min-h-0 flex-1 flex-col">
        <ProcessesView query={queries.processi} selectedKey={processKey} onSelect={setProcessKey} onOpenAnalysis={openAnalysis} />
      </main>
      <main id="view-progetti" role="tabpanel" aria-labelledby="tab-progetti" hidden={tab !== 'progetti'} className="flex min-h-0 flex-1 flex-col">
        <ProjectsView
          query={queries.progetti}
          selectedId={projectId}
          onSelect={setProjectId}
          onOpenAnalysis={(id) => openAnalysis(id)}
          onOpenProcess={openProcess}
        />
      </main>
      <main id="view-info" role="tabpanel" aria-labelledby="tab-info" hidden={tab !== 'info'} className={`flex min-h-0 flex-1 flex-col gap-4 transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}>
        <InfoView answer={info} loaded={infoLoaded} selectedCite={cite} onSelectCite={setCite} />
      </main>
    </div>
  )
}
