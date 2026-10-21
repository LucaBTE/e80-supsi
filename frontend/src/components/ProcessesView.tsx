import { useMemo } from 'react'
import { ArrowRight, GitBranch, TriangleAlert } from 'lucide-react'
import { processCatalog, type ProcessEntry } from '../lib/catalog'
import { ChangeTag, GapStrip } from './badges'
import Panel from './Panel'

type Props = {
  query: string
  selectedKey: string | null
  onSelect: (key: string) => void
  onOpenAnalysis: (scenarioId: string, entityId: string) => void
}

const CATALOG = processCatalog()

const matches = (p: ProcessEntry, q: string) =>
  !q ||
  [p.code, p.label, ...p.roles, ...p.activities.flatMap((a) => [a.label, ...a.systems])]
    .filter(Boolean)
    .some((s) => s!.toLowerCase().includes(q))

export default function ProcessesView({ query, selectedKey, onSelect, onOpenAnalysis }: Props) {
  const q = query.trim().toLowerCase()
  const groups = useMemo(
    () => CATALOG.map((g) => ({ ...g, processes: g.processes.filter((p) => matches(p, q)) })).filter((g) => g.processes.length),
    [q],
  )
  const visible = groups.flatMap((g) => g.processes)
  const total = visible.length
  // Detail follows the filter: a hidden selection falls back to the first match
  const selected = visible.find((p) => p.key === selectedKey) ?? visible[0]

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
      <Panel title="Mappe e processi" meta={total} className="max-h-[75vh] lg:max-h-none">
        {total === 0 && <p className="px-5 py-6 text-sm text-e80-gray">Nessun processo corrisponde alla ricerca.</p>}
        {groups.map((g) => (
          <div key={g.key} className="border-b border-line last:border-b-0">
            <p className="flex items-center gap-2 bg-surface px-4 py-2 text-xs font-bold uppercase tracking-eyebrow">
              <GitBranch size={14} aria-hidden />
              {g.code ? `${g.code} · ` : ''}
              {g.label}
            </p>
            <ul className="divide-y divide-line">
              {g.processes.map((p) => {
                const on = selected?.key === p.key
                return (
                  <li key={p.key}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => onSelect(p.key)}
                      className={`flex w-full items-start gap-3 border-l-4 px-4 py-2.5 text-left transition-colors ${
                        on ? 'border-accent-4 bg-accent/30' : 'border-transparent hover:bg-surface'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">
                          {p.code ? `${p.code} · ` : ''}
                          {p.label}
                        </span>
                        <span className="text-xs text-e80-gray">
                          {p.activities.length ? `${p.activities.length} attività` : 'Attività non mappate'} ·{' '}
                          {p.impacts.length ? `${p.impacts.length} impatti di progetto` : 'nessun impatto'}
                        </span>
                      </span>
                      {p.gaps.length > 0 && (
                        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                          <TriangleAlert size={13} aria-hidden /> {p.gaps.length} gap
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </Panel>

      <Panel title="Dettaglio processo" className="min-h-[420px] lg:min-h-0">
        {!selected ? (
          <p className="p-6 text-sm text-e80-gray">Selezionare un processo.</p>
        ) : (
          <div key={selected.key} className="fade-in space-y-5 px-5 py-4">
            <div>
              <p className="e80-eyebrow">Processo</p>
              <h3 className="text-xl font-bold">
                {selected.code ? `${selected.code} · ` : ''}
                {selected.label}
              </h3>
              {selected.subtitle && <p className="text-sm text-e80-gray">{selected.subtitle}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="e80-eyebrow mb-1.5">Ruoli esecutori</h4>
                {selected.roles.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selected.roles.map((r) => (
                      <span key={r} className="border border-line bg-surface px-2 py-0.5 text-sm">{r}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-e80-gray">Owner mancante (TBD).</p>
                )}
              </div>
              <div>
                <h4 className="e80-eyebrow mb-1.5">Impattato da</h4>
                {selected.impacts.length ? (
                  <ul className="space-y-1.5">
                    {selected.impacts.map((i, k) => (
                      <li key={k}>
                        <button
                          type="button"
                          onClick={() => onOpenAnalysis(selected.scenarioId, selected.entityId)}
                          className="group flex items-center gap-2 text-left text-sm hover:underline hover:decoration-accent-4"
                        >
                          <span className="font-semibold">{i.project ? `${i.project.code} · ${i.project.name}` : 'Analisi di requisito'}</span>
                          <span className="text-e80-gray">
                            {i.scope ?? 'n/d'} · {Math.round(i.confidence * 100)}%
                          </span>
                          <ArrowRight size={14} aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-e80-gray">Nessun progetto attivo sul processo.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="e80-eyebrow mb-1.5">Attività</h4>
              {selected.activities.length === 0 ? (
                <p className="text-sm text-e80-gray">Attività non ancora mappate (TBD).</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse text-sm">
                    <thead>
                      <tr className="bg-e80-black text-left text-white">
                        {['Attività', 'Ruolo', 'Sistema', 'Tipo', 'Conf.'].map((c) => (
                          <th key={c} scope="col" className="px-3 py-2 text-[11px] font-bold uppercase tracking-eyebrow">{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.activities.map((a, i) => (
                        <tr key={a.id} className={`border-b border-line align-top ${a.gaps.length ? 'bg-gap' : i % 2 ? 'bg-surface' : 'bg-white'}`}>
                          <td className="px-3 py-2">
                            <span className="flex items-start gap-1.5">
                              {a.gaps.length > 0 && <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-label="Gap" />}
                              {a.label}
                            </span>
                          </td>
                          <td className="px-3 py-2">{a.roles.join(', ') || 'TBD'}</td>
                          <td className="px-3 py-2">{a.systems.join(', ') || <span className="italic">TBD</span>}</td>
                          <td className="px-3 py-2">{a.change && <ChangeTag change={a.change} />}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{a.confidence !== undefined ? `${Math.round(a.confidence * 100)}%` : 'n/d'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {selected.gaps.length > 0 && (
              <div>
                <h4 className="e80-eyebrow mb-1.5">Gap</h4>
                <ul className="space-y-1.5">
                  {selected.gaps.map((g) => <li key={g.id}><GapStrip gap={g} /></li>)}
                </ul>
              </div>
            )}

            <div>
              <h4 className="e80-eyebrow mb-1.5">Fonti</h4>
              {selected.sources.length ? (
                <ul className="space-y-1 text-sm">
                  {selected.sources.map((c, i) => (
                    <li key={i}>
                      <span className="font-semibold">{c.doc}</span>
                      {c.page && <span className="text-e80-gray"> · p. {c.page}</span>}
                      {c.passage && <span className="italic text-e80-gray"> · {c.passage}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-e80-gray">Fonte mancante (TBD).</p>
              )}
            </div>
          </div>
        )}
      </Panel>
    </div>
  )
}
