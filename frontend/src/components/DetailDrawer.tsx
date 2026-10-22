import { useEffect } from 'react'
import { ChevronRight, Quote, X } from 'lucide-react'
import { chainFor, citationsFor, confidenceOf, explain, TYPE_LABEL, type Model } from '../lib/model'
import { GapStrip } from './badges'
import { typeIcon } from './icons'

type Props = {
  model: Model
  id: string
  onClose: () => void
  onSelect: (id: string) => void
  /** drawer = overlay on the main page, panel = inline in the full-screen view */
  variant?: 'drawer' | 'panel'
}

export default function DetailDrawer({ model, id, onClose, onSelect, variant = 'drawer' }: Props) {
  const e = model.byId[id]
  const Icon = typeIcon[e.type]
  const conf = confidenceOf(model, id)
  const chain = chainFor(model, id)
  const cites = citationsFor(model, id)
  const gaps = model.gapsByEntity[id] ?? []

  useEffect(() => {
    if (variant !== 'drawer') return
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [variant, onClose])

  const body = (
    <div key={id} className="fade-in flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-3 text-accent-4">
          <Icon size={18} strokeWidth={1.6} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="e80-eyebrow">
            Perché è impattata · {TYPE_LABEL[e.type]}
            {model.numbers[id] ? ` · [${model.numbers[id]}]` : ''}
          </p>
          <h2 id="detail-title" className="text-lg font-bold leading-snug">
            {e.code ? `${e.code} · ` : ''}
            {e.label}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Chiudi dettaglio" className="p-1 text-e80-gray hover:bg-accent hover:text-e80-black">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="flex items-end gap-4">
          <div>
            <p className="e80-eyebrow">Confidenza</p>
            <p className="border-b-4 border-accent text-5xl font-bold leading-tight">
              {conf !== undefined ? `${Math.round(conf * 100)}%` : 'n/d'}
            </p>
          </div>
          <p className="pb-1 text-sm">{explain(model, id)}</p>
        </div>

        <div>
          <h3 className="e80-eyebrow mb-2">Catena delle relazioni</h3>
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            {chain.map((c, i) => (
              <li key={c} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={14} className="text-e80-gray" aria-hidden />}
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  disabled={c === id || (c === model.rootId && model.syntheticRoot)}
                  className={`border px-1.5 py-0.5 ${c === id ? 'border-e80-black bg-accent font-semibold' : 'border-line bg-white hover:border-e80-black'}`}
                >
                  {model.byId[c].code ?? model.byId[c].label}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h3 className="e80-eyebrow mb-2">Passaggi citati</h3>
          {cites.length === 0 ? (
            <p className="text-sm text-e80-gray">Fonte mancante (TBD).</p>
          ) : (
            <ul className="space-y-2">
              {cites.map((c, i) => (
                <li key={i} className="border-l-2 border-line pl-3 text-sm">
                  <p className="font-semibold">
                    {c.doc}
                    {c.page ? <span className="font-normal text-e80-gray"> · p. {c.page}</span> : null}
                  </p>
                  {c.passage && (
                    <p className="flex gap-1.5 italic text-e80-gray">
                      <Quote size={12} className="mt-1 shrink-0" aria-hidden />
                      {c.passage}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="e80-eyebrow mb-2">Gap collegati</h3>
          {gaps.length === 0 ? (
            <p className="text-sm text-e80-gray">Nessun gap rilevato.</p>
          ) : (
            <ul className="space-y-1.5">
              {gaps.map((g) => (
                <li key={g.id}><GapStrip gap={g} /></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )

  if (variant === 'panel') return <aside aria-labelledby="detail-title" className="h-full border-l border-line bg-white">{body}</aside>

  return (
    <aside
      aria-labelledby="detail-title"
      className="fixed inset-y-0 right-0 z-40 w-[min(26rem,100vw)] border-l border-e80-black bg-white pb-[env(safe-area-inset-bottom,0px)]"
    >
      {body}
    </aside>
  )
}
