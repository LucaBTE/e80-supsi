import { Sparkles } from 'lucide-react'
import { metaLine, type Model } from '../lib/model'
import { CiteChip } from './badges'
import MarkdownAnswer from './MarkdownAnswer'

type Props = { model: Model; selectedId: string | null; onSelect: (id: string) => void }

export default function Overview({ model, selectedId, onSelect }: Props) {

  return (
    <section className="e80-card flex shrink-0 flex-col gap-3 px-6 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="e80-panel-title flex items-center gap-2">
          <Sparkles size={16} strokeWidth={1.6} className="text-accent-4" aria-hidden />
          Overview
        </h2>
        <p className="e80-eyebrow">{metaLine(model).join(' · ')}</p>
        <p className="ml-auto text-xs text-e80-gray">{model.byId[model.rootId]?.type === 'document' ? 'Select a document to inspect why it should be reviewed.' : 'Select an entity to generate an impact report.'}</p>
      </div>

      <div className="space-y-1.5 text-[15px] leading-relaxed">
        {model.scenario.overview.map((s, i) => (
          <div key={i}>
            <MarkdownAnswer text={s.text} />
            {s.cites.filter((id) => model.numbers[id]).map((id) => (
              <CiteChip key={id} n={model.numbers[id]} label={model.byId[id].label} active={selectedId === id} onClick={() => onSelect(id)} />
            ))}
          </div>
        ))}
      </div>

      {!!model.scenario.sources?.length && <details className="border-t border-line pt-3 text-sm">
        <summary className="cursor-pointer font-semibold">Retrieved sources ({model.scenario.sources.length})</summary>
        <ol className="mt-3 space-y-3">{model.scenario.sources.map((source, i) => <li key={i}>
          <p className="font-semibold">[{i + 1}] {source.doc} · {source.loc}</p>
          <p className="break-all text-xs text-e80-gray">{source.path}</p>
          {source.url && <a href={source.url} target="_blank" rel="noreferrer" className="text-xs underline">Open document excerpts</a>}
          <blockquote className="mt-1 whitespace-pre-wrap border-l-2 border-accent pl-3">{source.passage}</blockquote>
        </li>)}</ol>
      </details>}

    </section>
  )
}
