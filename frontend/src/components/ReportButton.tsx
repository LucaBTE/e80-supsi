import { useState } from 'react'
import { FileOutput } from 'lucide-react'
import { generateReport } from '../lib/api'

export default function ReportButton({ target }: { target: { label: string; key: string } }) {
  const [notice, setNotice] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const report = async () => {
    if (!target || generating) return
    setGenerating(true)
    setNotice(null)
    try {
      const result = await generateReport(target.label, target.key)
      const sources = result.sources.map((s) => `[${s.n}] ${s.document} — ${s.path} · ${s.loc}`).join('\n\n')
      const markdown = result.markdown + (sources ? `\n\n## Sources\n\n${sources}\n` : '')
      const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'impact-report.md'
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('Report downloaded.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Report generation failed.')
    } finally { setGenerating(false) }
  }

  return <div className="space-y-2">
    <button type="button" className="e80-btn px-4 py-2.5 text-xs" disabled={generating} onClick={() => void report()}>
      <FileOutput size={14} aria-hidden /> {generating ? 'Generating…' : 'Generate impact report'}
    </button>
    {notice && <p role="status" className="text-xs text-e80-gray">{notice}</p>}
  </div>
}
