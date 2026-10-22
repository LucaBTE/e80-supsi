import { Check } from 'lucide-react'
import { impactOf, processesOf, related, TYPE_LABEL, type Model } from '../lib/model'
import { ChangeTag, GapStrip, LevelBadge, TypeTag } from './badges'
import { typeIcon } from './icons'

type Props = {
  model: Model
  id: string
  active: boolean
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}

export default function EntityCard({ model, id, active, onSelect, onHover }: Props) {
  const e = model.byId[id]
  const Icon = typeIcon[e.type]
  const imp = impactOf(model, id)
  const indirect = model.scope[id] === 'indirect'
  const gaps = model.gapsByEntity[id] ?? []
  const parent = e.parent ? model.byId[e.parent] : undefined
  const src = e.sources[0] ?? imp?.sources[0]

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(id)}
      onBlur={() => onHover(null)}
      aria-pressed={active}
      className={`flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left transition-colors ${
        active ? 'border-accent-4 bg-accent/30' : 'border-transparent hover:bg-surface'
      }`}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-3 text-accent-4">
        <Icon size={16} strokeWidth={1.6} aria-hidden />
      </span>
      <span className={`flex min-w-0 flex-1 flex-col gap-1 ${indirect ? 'text-e80-gray' : ''}`}>
        {e.type === 'activity' && parent && (
          <span className="truncate text-[11px] font-semibold text-e80-gray">
            {parent.code} · {parent.label}
          </span>
        )}
        <span className="flex items-baseline gap-2">
          <span className="text-[11px] font-bold text-e80-gray">#{model.numbers[id]}</span>
          <span className="min-w-0 font-semibold">
            {e.code && e.type !== 'activity' ? `${e.code} · ` : ''}
            {e.label}
            {indirect && <span className="font-normal italic"> (downstream)</span>}
          </span>
        </span>
        {e.subtitle && <span className="text-sm text-e80-gray">{e.subtitle}</span>}

        {e.type === 'activity' && (
          <span className="flex flex-wrap items-center gap-1.5">
            {imp?.change && <ChangeTag change={imp.change} />}
            {related(model, id, 'uses_system', 'out').map((s) => (
              <span key={s.id} className="border border-line bg-white px-1.5 text-[11px] leading-4">{s.label}</span>
            ))}
          </span>
        )}

        {(e.type === 'role' || e.type === 'team' || e.type === 'external') && (
          <>
            <span className="flex flex-wrap items-center gap-1.5 text-xs">
              {imp?.level && <LevelBadge level={imp.level} />}
              {processesOf(model, id).map((p) => (
                <span key={p.id} className="border border-line bg-white px-1.5 text-[11px] leading-4">{p.code ?? p.label}</span>
              ))}
            </span>
            {imp?.inCharter && (
              <span className="flex items-center gap-1.5 text-xs">
                <Check size={14} strokeWidth={2} aria-hidden /> In charter: {imp.charterRef ?? 'riferimento TBD'}
              </span>
            )}
          </>
        )}

        {gaps.map((g) => <GapStrip key={g.id} gap={g} compact />)}

        <span className="flex flex-wrap items-center gap-2 text-xs text-e80-gray">
          <TypeTag>{TYPE_LABEL[e.type]}</TypeTag>
          {src ? `${src.doc}${src.page ? ` · p. ${src.page}` : ''}` : 'Source TBD'}
        </span>
      </span>
    </button>
  )
}
