import type { ReactNode } from 'react'

type Props = { title: string; meta?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }

/** White hairline panel with the E80 amber bar title, shared by the tab views. */
export default function Panel({ title, meta, actions, children, className = '' }: Props) {
  return (
    <section className={`flex min-h-0 flex-col border border-line bg-white ${className}`}>
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
        <span className="h-5 w-[9px] bg-accent" aria-hidden />
        <h2 className="e80-panel-title">{title}</h2>
        {actions}
        {meta !== undefined && <span className="ml-auto e80-eyebrow">{meta}</span>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  )
}
