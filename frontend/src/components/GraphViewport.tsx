import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import { GraphCanvas, type CanvasProps } from './ImpactGraph'

type View = { scale: number; x: number; y: number }
const INITIAL: View = { scale: 1, x: 0, y: 0 }
const clamp = (value: number) => Math.min(4, Math.max(0.8, value))

export default function GraphViewport(props: CanvasProps) {
  const viewport = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [view, setView] = useState<View>(INITIAL)

  const zoom = useCallback((factor: number, x: number, y: number) => {
    setView((current) => {
      const scale = clamp(current.scale * factor)
      const ratio = scale / current.scale
      return { scale, x: x - (x - current.x) * ratio, y: y - (y - current.y) * ratio }
    })
  }, [])

  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const bounds = element.getBoundingClientRect()
      zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX - bounds.left, event.clientY - bounds.top)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoom])

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    drag.current = { x: event.clientX, y: event.clientY, moved: false }
  }
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const previous = drag.current
    if (!previous) return
    const dx = event.clientX - previous.x
    const dy = event.clientY - previous.y
    if (!previous.moved && Math.hypot(dx, dy) < 4) return
    if (!previous.moved) event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, moved: true }
    setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }))
  }
  const stopDrag = (event: PointerEvent<HTMLDivElement>) => {
    suppressClick.current = !!drag.current?.moved
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    window.setTimeout(() => { suppressClick.current = false }, 0)
  }
  const zoomCenter = (factor: number) => {
    const element = viewport.current
    if (element) zoom(factor, element.clientWidth / 2, element.clientHeight / 2)
  }

  return (
    <div
      ref={viewport}
      role="region"
      tabIndex={0}
      aria-label="Interactive graph. Drag to pan, scroll to zoom, or use the zoom controls."
      className="relative h-full min-h-full w-full overflow-hidden cursor-grab touch-none focus-visible:outline-2 active:cursor-grabbing"
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onClickCapture={(event) => {
        if (suppressClick.current) { event.preventDefault(); event.stopPropagation() }
      }}
      onKeyDown={(event) => {
        if (event.key === '+' || event.key === '=') { event.preventDefault(); zoomCenter(1.25) }
        if (event.key === '-') { event.preventDefault(); zoomCenter(0.8) }
        if (event.key === '0') { event.preventDefault(); setView(INITIAL) }
      }}
    >
      <div className="h-full w-full" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, transformOrigin: 'top left' }}>
        <GraphCanvas {...props} />
      </div>
      <div className="absolute right-3 top-3 flex border border-line bg-white shadow-sm" role="group" aria-label="Graph zoom controls">
        <button type="button" aria-label="Zoom in" title="Zoom in" className="p-2 hover:bg-accent" onClick={() => zoomCenter(1.25)}><Plus size={17} /></button>
        <button type="button" aria-label="Zoom out" title="Zoom out" className="border-x border-line p-2 hover:bg-accent" onClick={() => zoomCenter(0.8)}><Minus size={17} /></button>
        <button type="button" aria-label="Fit graph" title="Fit graph" className="p-2 hover:bg-accent" onClick={() => setView(INITIAL)}><LocateFixed size={17} /></button>
      </div>
    </div>
  )
}
