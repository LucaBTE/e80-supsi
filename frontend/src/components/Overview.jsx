import { Sparkles } from 'lucide-react'

// Each sentence carries citation chips that point to entities in the left column.
export default function Overview({ data, entityIndex, selectedId, onSelect }) {
  return (
    <section className="e80-card px-6 py-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-title">
          <Sparkles size={16} strokeWidth={1.6} className="text-accent-4" />
          Overview
        </h2>
        <span className="e80-eyebrow">
          Confidenza {Math.round(data.confidence * 100)}% · {data.entities.length} fonti
        </span>
      </div>
      <div className="max-w-5xl space-y-2 text-base leading-relaxed">
        {data.overview.map((s, i) => (
          <p key={i}>
            {s.text}{' '}
            {s.cites.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelect(id)}
                title={entityIndex[id]?.label}
                className={`mx-0.5 inline-block border px-1.5 align-middle text-[11px] font-bold leading-4 transition-colors ${
                  selectedId === id
                    ? 'border-e80-black bg-accent'
                    : 'border-line bg-white text-e80-gray hover:border-accent-4 hover:text-e80-black'
                }`}
              >
                {entityIndex[id]?.n}
              </button>
            ))}
          </p>
        ))}
      </div>
    </section>
  )
}
