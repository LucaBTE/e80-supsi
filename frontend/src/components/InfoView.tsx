import { FileText, Sparkles } from 'lucide-react'
import type { InfoAnswer } from '../data/info'
import { CiteChip } from './badges'
import Panel from './Panel'

type Props = {
  answer: InfoAnswer | null
  loaded: boolean
  selectedCite: number
  onSelectCite: (n: number) => void
}

/** Factual Q&A: an answer, the passages it cites, and where each passage sits in its document. */
export default function InfoView({ answer, loaded, selectedCite, onSelectCite }: Props) {
  if (!loaded) return <div className="e80-card flex flex-1 items-center justify-center py-16 text-e80-gray">Caricamento…</div>
  if (!answer) {
    return (
      <section className="e80-card px-6 py-5">
        <h2 className="e80-panel-title mb-2">Risposta</h2>
        <p>Nessuna risposta trovata nelle fonti indicizzate. Provare a riformulare la domanda o usare la scheda Analisi impatto.</p>
      </section>
    )
  }
  const cite = answer.citations[selectedCite - 1] ?? answer.citations[0]

  return (
    <>
      <section className="e80-card flex shrink-0 flex-col gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h2 className="e80-panel-title flex items-center gap-2">
            <Sparkles size={16} strokeWidth={1.6} className="text-accent-4" aria-hidden />
            Risposta
          </h2>
          <p className="e80-eyebrow">
            Confidenza {Math.round(answer.confidence * 100)}% · {answer.citations.length} {answer.citations.length === 1 ? 'fonte' : 'fonti'}
          </p>
        </div>
        <div className="max-w-5xl space-y-1.5 text-[15px] leading-relaxed">
          {answer.sentences.map((s, i) => (
            <p key={i}>
              {s.text}{' '}
              {s.cites.map((n) => (
                <CiteChip key={n} n={n} label={answer.citations[n - 1]?.doc} active={selectedCite === n} onClick={() => onSelectCite(n)} />
              ))}
            </p>
          ))}
        </div>
      </section>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:min-h-[360px] lg:grid-cols-[2fr_3fr]">
        <Panel title="Fonti citate" meta={answer.citations.length}>
          <ul className="divide-y divide-line">
            {answer.citations.map((c, i) => {
              const n = i + 1
              const on = selectedCite === n
              return (
                <li key={n}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSelectCite(n)}
                    className={`flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left transition-colors ${
                      on ? 'border-accent-4 bg-accent/30' : 'border-transparent hover:bg-surface'
                    }`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent-3 text-accent-4">
                      <FileText size={16} strokeWidth={1.6} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="text-[11px] font-bold text-e80-gray">[{n}]</span>
                        <span className="font-semibold">{c.doc}</span>
                      </span>
                      <span className="block text-xs text-e80-gray">
                        {c.path ?? 'Percorso TBD'}
                        {c.page ? ` · p. ${c.page}` : ''}
                      </span>
                      {c.passage && <span className="mt-1 block text-sm italic">“{c.passage}”</span>}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Documento" meta={cite.page ? `Pagina ${cite.page}` : undefined} className="min-h-[420px] lg:min-h-0">
          <div key={`${cite.doc}${cite.page}`} className="fade-in flex h-full flex-col gap-3 bg-surface p-5">
            <p className="text-sm">
              <span className="font-semibold">{cite.doc}</span>
              <span className="text-e80-gray"> · {cite.path ?? 'Percorso TBD'}</span>
            </p>
            {/* Simulated page: grey lines stand in for the text, the cited passage is highlighted */}
            <div className="mx-auto w-full max-w-xl flex-1 border border-line bg-white px-8 py-7" aria-label="Anteprima simulata della pagina">
              {[92, 100, 85, 97, 60].map((w, i) => <div key={i} className="mb-2.5 h-2 bg-line" style={{ width: `${w}%` }} />)}
              <p className="my-4 border-l-4 border-accent-4 bg-accent/40 px-3 py-2 text-sm">{cite.passage ?? 'Passaggio non disponibile (TBD).'}</p>
              {[95, 88, 100, 72, 90, 40].map((w, i) => <div key={i} className="mb-2.5 h-2 bg-line" style={{ width: `${w}%` }} />)}
            </div>
            <p className="text-xs text-e80-gray">Anteprima simulata nel pilot: il collegamento al documento reale è TBD.</p>
          </div>
        </Panel>
      </div>
    </>
  )
}
