import type { ReactNode } from 'react'
import { Check, Circle, Network, TriangleAlert } from 'lucide-react'
import { PROJECTS, STATUS_LABEL, type Project } from '../data/projects'
import { projectSummary } from '../lib/catalog'
import { GapStrip } from './badges'
import Panel from './Panel'

type Props = {
  query: string
  selectedId: string | null
  onSelect: (id: string) => void
  onOpenAnalysis: (scenarioId: string) => void
  onOpenProcess: (key: string) => void
}

const SUMMARIES = Object.fromEntries(PROJECTS.map((p) => [p.id, projectSummary(p)]))

const matches = (p: Project, q: string) =>
  !q || [p.code, p.name, p.owner, p.objective, ...p.themes].some((s) => s.toLowerCase().includes(q))

function StatusTag({ status }: { status: Project['status'] }) {
  const cls = status === 'in_corso' ? 'bg-e80-black text-white border-e80-black' : status === 'pianificato' ? 'border-dashed border-e80-black' : 'border-line text-e80-gray'
  return <span className={`inline-flex whitespace-nowrap border px-1.5 py-px text-[10px] font-bold uppercase leading-4 tracking-eyebrow ${cls}`}>{STATUS_LABEL[status]}</span>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="e80-eyebrow mb-1.5">{label}</h4>
      {children}
    </div>
  )
}

const tbd = <p className="text-sm text-e80-gray">TBD</p>

export default function ProjectsView({ query, selectedId, onSelect, onOpenAnalysis, onOpenProcess }: Props) {
  const q = query.trim().toLowerCase()
  const list = PROJECTS.filter((p) => matches(p, q))
  const selected = list.find((p) => p.id === selectedId) ?? list[0]
  const s = selected && SUMMARIES[selected.id]

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
      <Panel title="Progetti" meta={list.length} className="max-h-[75vh] lg:max-h-none">
        {list.length === 0 && <p className="px-5 py-6 text-sm text-e80-gray">Nessun progetto corrisponde alla ricerca.</p>}
        <ul className="divide-y divide-line">
          {list.map((p) => {
            const on = selected?.id === p.id
            const gaps = SUMMARIES[p.id].gaps.length
            return (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSelect(p.id)}
                  className={`flex w-full flex-col gap-1 border-l-4 px-4 py-3 text-left transition-colors ${
                    on ? 'border-accent-4 bg-accent/30' : 'border-transparent hover:bg-surface'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{p.code} · {p.name}</span>
                    <span className="ml-auto"><StatusTag status={p.status} /></span>
                  </span>
                  <span className="text-sm text-e80-gray">{p.owner} · {p.period}</span>
                  <span className="flex items-center gap-3 text-xs text-e80-gray">
                    {p.scenarioId ? `${SUMMARIES[p.id].processes.length} processi impattati` : 'Analisi impatto non disponibile'}
                    {gaps > 0 && (
                      <span className="flex items-center gap-1 font-semibold text-e80-black">
                        <TriangleAlert size={13} aria-hidden /> {gaps} gap
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </Panel>

      <Panel
        title="Scheda progetto"
        className="min-h-[420px] lg:min-h-0"
        actions={
          selected?.scenarioId && (
            <button type="button" className="e80-btn ml-auto px-4 py-2 text-xs" onClick={() => onOpenAnalysis(selected.scenarioId!)}>
              <Network size={14} aria-hidden /> Apri analisi impatto
            </button>
          )
        }
      >
        {!selected || !s ? (
          <p className="p-6 text-sm text-e80-gray">Selezionare un progetto.</p>
        ) : (
          <div key={selected.id} className="fade-in space-y-5 px-5 py-4">
            <div>
              <p className="e80-eyebrow">{selected.code}</p>
              <h3 className="flex flex-wrap items-center gap-3 text-xl font-bold">
                {selected.name} <StatusTag status={selected.status} />
              </h3>
              <p className="mt-1 max-w-3xl">{selected.objective}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Responsabile · periodo">
                <p className="text-sm">{selected.owner} · {selected.period}</p>
              </Field>
              <Field label="Milestone">
                <ol className="space-y-1 text-sm">
                  {selected.milestones.map((m) => (
                    <li key={m.label} className="flex items-center gap-2">
                      {m.done ? <Check size={14} strokeWidth={2.2} aria-label="Completata" /> : <Circle size={12} aria-label="Da completare" />}
                      <span className={m.done ? '' : 'text-e80-gray'}>{m.label}</span>
                      <span className="ml-auto tabular-nums text-e80-gray">{m.date}</span>
                    </li>
                  ))}
                </ol>
              </Field>
              <Field label="Temi">
                <div className="flex flex-wrap gap-1.5">
                  {selected.themes.map((t) => <span key={t} className="border border-line bg-surface px-2 py-0.5 text-sm">{t}</span>)}
                </div>
              </Field>
              <Field label="Esclusioni">
                {selected.exclusions.length ? (
                  <ul className="list-inside list-disc text-sm marker:text-accent-4">
                    {selected.exclusions.map((x) => <li key={x}>{x}</li>)}
                  </ul>
                ) : tbd}
              </Field>
              <Field label="Processi impattati">
                {s.processes.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {s.processes.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onOpenProcess(p.code ?? p.id)}
                        title={`Apri ${p.label} nella scheda Processi`}
                        className="border border-line bg-white px-2 py-0.5 text-sm hover:border-e80-black hover:bg-accent"
                      >
                        {p.code ?? p.label}
                      </button>
                    ))}
                  </div>
                ) : tbd}
              </Field>
              <Field label="Ruoli coinvolti">
                {s.roles.length ? <p className="text-sm">{s.roles.map((r) => r.label).join(' · ')}</p> : tbd}
              </Field>
              <Field label="Persone e partner">
                {s.people.length ? (
                  <ul className="space-y-0.5 text-sm">
                    {s.people.map((p) => (
                      <li key={p.id}>{p.label}{p.subtitle && <span className="text-e80-gray"> · {p.subtitle}</span>}</li>
                    ))}
                  </ul>
                ) : tbd}
              </Field>
              <Field label="Documenti">
                {selected.documents.length ? (
                  <ul className="space-y-0.5 text-sm">
                    {selected.documents.map((d) => (
                      <li key={d.doc}>{d.doc}{d.page && <span className="text-e80-gray"> · p. {d.page}</span>}</li>
                    ))}
                  </ul>
                ) : tbd}
              </Field>
            </div>

            {s.gaps.length > 0 && (
              <Field label={`Gap dall'analisi impatto · ${s.gaps.length}`}>
                <ul className="space-y-1.5">
                  {s.gaps.map((g) => (
                    <li key={g.id} className="flex flex-col gap-0.5">
                      <GapStrip gap={g} />
                      <span className="pl-3.5 text-xs text-e80-gray">{s.model!.byId[g.entityId].label}</span>
                    </li>
                  ))}
                </ul>
              </Field>
            )}
          </div>
        )}
      </Panel>
    </div>
  )
}
