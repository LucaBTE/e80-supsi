import { TriangleAlert } from 'lucide-react'
import type { Model } from '../lib/model'
import { CiteChip } from './badges'

type Props = { model: Model; selectedId: string | null; onSelect: (id: string) => void }

export default function GapCallout({ model, selectedId, onSelect }: Props) {
  if (!model.gaps.length) return null
  return (
    <section aria-labelledby="gap-title" className="border-l-4 border-accent-4 bg-gap px-4 py-3">
      <h3 id="gap-title" className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-eyebrow">
        <TriangleAlert size={16} strokeWidth={1.8} aria-hidden />
        Mancanze rilevate · {model.gaps.length}
      </h3>
      <ul className="space-y-1 text-sm">
        {model.gaps.map((g) => {
          const e = model.byId[g.entityId]
          return (
            <li key={g.id} className="flex items-baseline gap-2">
              <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-eyebrow text-e80-gray">{g.severity}</span>
              <span className="min-w-0">
                <span className="font-semibold">{e.code ? `${e.code} ` : ''}{e.label}</span>
                <span className="text-e80-gray"> · {g.message}</span>
                {model.numbers[e.id] && (
                  <CiteChip n={model.numbers[e.id]} label={e.label} active={selectedId === e.id} onClick={() => onSelect(e.id)} />
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
