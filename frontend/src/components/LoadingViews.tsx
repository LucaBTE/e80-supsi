import { Sparkles } from 'lucide-react'
import Panel from './Panel'

function Line({ width = 'w-full', height = 'h-3' }: { width?: string; height?: string }) {
  return <span aria-hidden="true" className={`block ${height} ${width} bg-line motion-safe:animate-pulse`} />
}

function AnswerLines() {
  return (
    <div aria-hidden="true" className="space-y-3">
      <Line width="w-1/3" height="h-5" />
      <Line />
      <Line width="w-11/12" />
      <Line width="w-4/5" />
      <div className="h-2" />
      <Line width="w-1/4" height="h-5" />
      <Line width="w-10/12" />
      <Line width="w-2/3" />
    </div>
  )
}

function SourceRows() {
  return (
    <div aria-hidden="true" className="divide-y divide-line">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="space-y-2 px-5 py-4">
          <Line width="w-3/4" />
          <Line width="w-1/2" height="h-2" />
        </div>
      ))}
    </div>
  )
}

function GraphPlaceholder() {
  return (
    <div className="flex h-[min(60vh,34rem)] min-h-[22rem] min-w-0 flex-col border border-line bg-white lg:h-full lg:min-h-0">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span className="h-5 w-[9px] bg-accent" aria-hidden="true" />
        <h2 className="e80-panel-title">Graph</h2>
        <span className="ml-auto text-xs text-e80-gray">Building graph…</span>
      </header>
      <div className="min-h-0 flex-1 bg-[radial-gradient(#E0E0E0_1px,transparent_1px)] [background-size:18px_18px] p-4">
        <svg viewBox="0 0 620 360" className="h-full w-full motion-safe:animate-pulse" role="img" aria-label="Graph structure loading">
          <g fill="none" stroke="#CFCFCF" strokeWidth="2" strokeDasharray="5 6">
            <path d="M310 76 C310 122 175 130 175 170" />
            <path d="M310 76 C310 122 445 130 445 170" />
            <path d="M175 216 C175 255 105 258 105 282" />
            <path d="M445 216 C445 255 515 258 515 282" />
          </g>
          <g fill="#F5F5F5" stroke="#BDBDBD" strokeWidth="2">
            <circle cx="310" cy="54" r="24" />
            <circle cx="175" cy="192" r="22" />
            <circle cx="445" cy="192" r="22" />
            <circle cx="105" cy="304" r="20" />
            <circle cx="515" cy="304" r="20" />
          </g>
          <g fill="#E0E0E0">
            <rect x="266" y="88" width="88" height="9" />
            <rect x="132" y="227" width="86" height="9" />
            <rect x="402" y="227" width="86" height="9" />
          </g>
        </svg>
      </div>
    </div>
  )
}

export function AnalysisLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy="true">
      <section className="e80-card space-y-4 px-6 py-4">
        <h2 className="e80-panel-title flex items-center gap-2"><Sparkles size={16} className="text-accent-4" aria-hidden="true" /> Overview</h2>
        <p role="status" className="text-sm text-e80-gray">Generating impact analysis…</p>
        <AnswerLines />
      </section>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:h-[min(70vh,44rem)] lg:min-h-[28rem] lg:grid-cols-[2fr_3fr]">
        <Panel title="Entities and sources" className="h-[min(60vh,34rem)] min-h-[18rem] min-w-0 lg:h-full lg:min-h-0">
          <div className="flex gap-3 border-b border-line px-5 py-3" aria-hidden="true">
            {[0, 1, 2, 3].map((item) => <Line key={item} width="w-12" height="h-5" />)}
          </div>
          <SourceRows />
        </Panel>
        <GraphPlaceholder />
      </div>
    </div>
  )
}

export function ChatLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-4" aria-busy="true">
      <section className="e80-card space-y-4 px-6 py-4">
        <h2 className="e80-panel-title flex items-center gap-2"><Sparkles size={16} className="text-accent-4" aria-hidden="true" /> Answer</h2>
        <p role="status" className="text-sm text-e80-gray">Generating answer and retrieving sources…</p>
        <AnswerLines />
      </section>
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <Panel title="Retrieved sources" className="min-h-[18rem] min-w-0 lg:h-[min(65vh,38rem)] lg:min-h-[22rem]">
          <SourceRows />
        </Panel>
        <Panel title="Source excerpt" className="min-h-[18rem] min-w-0 lg:h-[min(65vh,38rem)] lg:min-h-[22rem]">
          <div className="space-y-4 p-5"><Line width="w-2/3" /><Line width="w-4/5" height="h-2" /><div className="space-y-3 border-l-4 border-accent-4 bg-surface p-4"><Line /><Line width="w-11/12" /><Line width="w-3/4" /></div></div>
        </Panel>
      </div>
    </div>
  )
}
