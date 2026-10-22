import { FileText, Sparkles } from 'lucide-react'
import type { InfoAnswer } from '../types'
import Panel from './Panel'
import MarkdownAnswer from './MarkdownAnswer'

type Props = { answer: InfoAnswer | null; loaded: boolean; selectedCite: number; onSelectCite: (n: number) => void }

export default function InfoView({ answer, loaded, selectedCite, onSelectCite }: Props) {
  if (!loaded || !answer) return <section className="e80-card px-6 py-8 text-e80-gray">Enter a question to search the indexed sources.</section>
  const cite = answer.citations[selectedCite - 1] ?? answer.citations[0]
  return (
    <>
      <section className="e80-card flex shrink-0 flex-col gap-3 px-6 py-4">
        <h2 className="e80-panel-title flex items-center gap-2"><Sparkles size={16} aria-hidden /> Answer</h2>
        <p className="e80-eyebrow">{answer.citations.length} retrieved sources · Confidence n/a</p>
        {answer.sentences.map((s, i) => <MarkdownAnswer key={i} text={s.text} />)}
      </section>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <Panel title="Retrieved sources" meta={answer.citations.length}>
          {!answer.citations.length && <p className="p-5 text-sm text-e80-gray">No excerpts are available. The answer may rely only on graph data.</p>}
          <ul className="divide-y divide-line">
            {answer.citations.map((c, i) => <li key={i}>
              <button type="button" aria-pressed={selectedCite === i + 1} onClick={() => onSelectCite(i + 1)}
                className={`flex w-full gap-3 border-l-4 px-4 py-3 text-left ${selectedCite === i + 1 ? 'border-accent-4 bg-accent/30' : 'border-transparent hover:bg-surface'}`}>
                <FileText size={16} className="mt-1 shrink-0" aria-hidden />
                <span><span className="block font-semibold">[{i + 1}] {c.doc}</span><span className="break-all text-xs text-e80-gray">{c.path} · {c.loc}</span></span>
              </button>
            </li>)}
          </ul>
        </Panel>
        <Panel title="Source excerpt" meta={cite?.loc}>
          {cite ? <div className="space-y-4 p-5"><p className="font-semibold">{cite.doc}</p><p className="break-all text-xs text-e80-gray">{cite.path}</p>
            {cite.url && <a href={cite.url} target="_blank" rel="noreferrer" className="inline-block underline">Open document excerpts</a>}
            <blockquote className="whitespace-pre-wrap border-l-4 border-accent-4 bg-surface p-4 text-sm">{cite.passage || 'Text unavailable.'}</blockquote>
          </div> : <p className="p-5 text-sm text-e80-gray">No source selected.</p>}
        </Panel>
      </div>
    </>
  )
}
