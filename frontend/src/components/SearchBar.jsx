import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'

export default function SearchBar({ initialQuery, loading, onSearch }) {
  const [value, setValue] = useState(initialQuery)

  function handleSubmit(e) {
    e.preventDefault()
    if (value.trim()) onSearch(value.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full border border-e80-black bg-white">
      <label htmlFor="rag-query" className="sr-only">Domanda</label>
      <div className="flex items-center pl-5 text-e80-gray">
        <Search size={22} strokeWidth={1.6} />
      </div>
      <input
        id="rag-query"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Fai una domanda su documenti, requisiti o processi…"
        className="min-w-0 flex-1 bg-transparent px-4 py-4 text-lg outline-none placeholder:text-e80-gray/70"
        autoComplete="off"
      />
      <button type="submit" className="e80-btn shrink-0 px-6" disabled={loading}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        <span className="hidden sm:inline">{loading ? 'Ricerca' : 'Cerca'}</span>
        {!loading && <Search size={16} className="sm:hidden" />}
      </button>
    </form>
  )
}
