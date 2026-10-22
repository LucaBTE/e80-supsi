import { useEffect, useRef, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
type Example = { id: string; label: string; query: string }

type Props = {
  value: string
  onChange: (v: string) => void
  loading: boolean
  onSearch: (query: string, scenarioId?: string) => void
  /** Example questions behind the search glyph; none = live filter tab */
  examples?: Example[]
  placeholder: string
  scopeLabel?: string
  onClearScope: () => void
}

export default function SearchBar({ value, onChange, loading, onSearch, examples, placeholder, scopeLabel, onClearScope }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', close)
    }
  }, [menuOpen])

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!loading && value.trim()) onSearch(value.trim())
        }}
        className="flex w-full border border-e80-black bg-white"
      >
        {/* The search glyph doubles as a discreet scenario picker for demos. */}
        <div ref={menuRef} className="relative flex">
          {!examples?.length ? (
            <span className="flex items-center pl-5 pr-1 text-e80-gray" aria-hidden>
              <Search size={22} strokeWidth={1.6} />
            </span>
          ) : (
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Example questions"
            className="flex items-center pl-5 pr-1 text-e80-gray hover:text-e80-black"
          >
            <Search size={22} strokeWidth={1.6} />
          </button>
          )}
          {menuOpen && examples && (
            <div role="menu" className="fade-in absolute left-0 top-full z-40 mt-px w-[min(28rem,80vw)] border border-e80-black bg-white">
              <p className="e80-eyebrow border-b border-line px-4 py-2">Example questions</p>
              {examples.map((s) => (
                <button
                  key={s.id}
                  role="menuitem"
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onChange(s.query)
                    onSearch(s.query, s.id)
                  }}
                  className="block w-full px-4 py-2.5 text-left hover:bg-surface focus-visible:bg-surface"
                >
                  <span className="block text-xs font-bold uppercase tracking-eyebrow text-e80-gray">{s.label}</span>
                  <span className="block text-sm">{s.query}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <label htmlFor="rag-query" className="sr-only">Question</label>
        <input
          id="rag-query"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-4 py-4 text-lg outline-none placeholder:text-e80-gray/70"
          autoComplete="off"
          maxLength={2000}
        />
        <button type="submit" className="e80-btn shrink-0 px-6" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          <span className="hidden sm:inline">{loading ? 'Searching' : 'Search'}</span>
          {!loading && <Search size={16} className="sm:hidden" aria-hidden />}
        </button>
      </form>

      {scopeLabel && (
        <div className="fade-in flex">
          <span className="inline-flex items-center gap-2 border border-line bg-surface py-1 pl-3 pr-1 text-xs">
            {scopeLabel}
            <button
              type="button"
              onClick={onClearScope}
              aria-label="Clear scope"
              className="p-0.5 text-e80-gray hover:bg-accent hover:text-e80-black"
            >
              <X size={14} />
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
