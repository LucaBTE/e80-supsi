import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function MarkdownAnswer({ text }: { text: string }) {
  return (
    <div className="answer-markdown max-w-5xl text-[15px] leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  )
}
