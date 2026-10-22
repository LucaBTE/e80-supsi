import { useEffect, useState } from 'react'
import { FileOutput, GitCompare, Sparkles } from 'lucide-react'
import { metaLine, type Model } from '../lib/model'
import { CiteChip } from './badges'
import GapCallout from './GapCallout'

type Props = { model: Model; selectedId: string | null; onSelect: (id: string) => void }

export default function Overview({ model, selectedId, onSelect }: Props) {
  const [notice, setNotice] = useState<string | null>(null)
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 2500)
    return () => clearTimeout(t)
  }, [notice])

  const mock = () => setNotice('Funzione prevista nella prossima iterazione del pilot.')

  return (
    <section className="e80-card flex shrink-0 flex-col gap-3 px-6 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="e80-panel-title flex items-center gap-2">
          <Sparkles size={16} strokeWidth={1.6} className="text-accent-4" aria-hidden />
          Overview
        </h2>
        <p className="e80-eyebrow">{metaLine(model).join(' · ')}</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {notice && <span role="status" className="fade-in text-xs text-e80-gray">{notice}</span>}
          <button type="button" className="e80-btn-outline" onClick={mock}>
            <GitCompare size={14} aria-hidden /> Confronta scenari
          </button>
          <button type="button" className="e80-btn px-4 py-2.5 text-xs" onClick={mock}>
            <FileOutput size={14} aria-hidden /> Genera report impatti
          </button>
        </div>
      </div>

      <div className="grid gap-x-6 gap-y-3 xl:grid-cols-[3fr_2fr]">
      <div className="space-y-1.5 text-[15px] leading-relaxed">
        {model.scenario.overview.map((s, i) => (
          <p key={i}>
            {s.text}{' '}
            {s.cites.filter((id) => model.numbers[id]).map((id) => (
              <CiteChip key={id} n={model.numbers[id]} label={model.byId[id].label} active={selectedId === id} onClick={() => onSelect(id)} />
            ))}
          </p>
        ))}
      </div>

      <GapCallout model={model} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </section>
  )
}
