import { TriangleAlert } from 'lucide-react'
import type { Change, Gap, Level } from '../types'

const tag = 'inline-flex items-center whitespace-nowrap px-1.5 py-px text-[10px] font-bold uppercase leading-4 tracking-eyebrow'

const CHANGE: Record<Change, [string, string]> = {
  automated: ['Automated', 'bg-e80-black text-white border border-e80-black'],
  changed: ['Changed', 'border border-e80-black'],
  needs_review: ['Needs review', 'border border-dashed border-e80-black'],
}
export function ChangeTag({ change }: { change: Change }) {
  const [label, cls] = CHANGE[change]
  return <span className={`${tag} ${cls}`}>{label}</span>
}

const LEVEL: Record<Level, string> = {
  high: 'bg-e80-black text-white border border-e80-black',
  medium: 'bg-accent border border-accent',
  low: 'border border-e80-black',
}
export function LevelBadge({ level }: { level: Level }) {
  return <span className={`${tag} ${LEVEL[level]}`}>Impact {level}</span>
}

export function TypeTag({ children }: { children: React.ReactNode }) {
  return <span className={`${tag} border border-line bg-white text-e80-gray`}>{children}</span>
}

export function CiteChip({ n, active, label, onClick }: { n: number; active?: boolean; label?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={`Source ${n}${label ? `: ${label}` : ''}`}
      className={`mx-0.5 inline-block border px-1.5 align-middle text-[11px] font-bold leading-4 transition-colors ${
        active ? 'border-e80-black bg-accent' : 'border-line bg-white text-e80-gray hover:border-accent-4 hover:text-e80-black'
      }`}
    >
      {n}
    </button>
  )
}

/** Amber strip: icon + text, so a gap never relies on colour alone. */
export function GapStrip({ gap, compact }: { gap: Gap; compact?: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 border-l-4 border-accent-4 bg-gap font-semibold ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}>
      <TriangleAlert size={compact ? 12 : 14} strokeWidth={1.8} aria-hidden />
      <span className="sr-only">Gap: </span>
      {gap.message}
    </span>
  )
}
