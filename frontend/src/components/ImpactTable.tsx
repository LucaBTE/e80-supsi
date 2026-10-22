import { TriangleAlert } from 'lucide-react'
import { impactOf, matchesFilter, related, type Filter, type Model } from '../lib/model'
import { ChangeTag } from './badges'

type Props = { model: Model; filter: Filter; selectedId: string | null; onSelect: (id: string) => void }

const COLS = ['Process', 'Activity', 'Role', 'System', 'Type', 'Confidence']

export default function ImpactTable({ model, filter, selectedId, onSelect }: Props) {
  const rows = model.scenario.entities
    .filter((e) => e.type === 'activity' && matchesFilter(model, e.id, filter))
    .sort((a, b) => (model.byId[a.parent!]?.code ?? '').localeCompare(model.byId[b.parent!]?.code ?? ''))

  if (!rows.length) {
    return <p className="p-6 text-sm text-e80-gray">No activities are mapped for this scenario or filter.</p>
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="sticky top-0">
          <tr className="bg-e80-black text-left text-white">
            {COLS.map((c) => (
              <th key={c} scope="col" className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-eyebrow">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => {
            const proc = a.parent ? model.byId[a.parent] : undefined
            const imp = impactOf(model, a.id)
            const roles = related(model, a.id, 'performed_by', 'out')
            const systems = related(model, a.id, 'uses_system', 'out')
            const gaps = [a, ...roles].flatMap((x) => model.gapsByEntity[x.id] ?? [])
            const indirect = model.scope[a.id] === 'indirect'
            const bg = selectedId === a.id ? 'bg-accent/40' : gaps.length ? 'bg-gap' : i % 2 ? 'bg-surface' : 'bg-white'
            return (
              <tr
                key={a.id}
                tabIndex={0}
                onClick={() => onSelect(a.id)}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(a.id)}
                aria-selected={selectedId === a.id}
                className={`cursor-pointer border-b border-line align-top hover:bg-accent/25 ${bg} ${indirect ? 'text-e80-gray' : ''}`}
              >
                <td className="px-3 py-2">
                  <span className="block font-semibold">{proc?.code}</span>
                  <span className="text-xs text-e80-gray">{proc?.label}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-start gap-1.5">
                    {gaps.length > 0 && <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />}
                    <span>
                      {a.label}
                      {indirect && <span className="italic"> (downstream)</span>}
                      {gaps.length > 0 && <span className="block text-xs font-semibold text-e80-black">{gaps.map((g) => g.message).join(' · ')}</span>}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2">{roles.map((r) => r.label).join(', ') || 'TBD'}</td>
                <td className="px-3 py-2">{systems.map((s) => s.label).join(', ') || <span className="italic">TBD</span>}</td>
                <td className="px-3 py-2">{imp?.change && <ChangeTag change={imp.change} />}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{imp?.confidence !== undefined ? `${Math.round(imp.confidence * 100)}%` : 'n/a'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
