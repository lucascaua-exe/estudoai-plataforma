import { cn } from '@/lib/utils'

/** Renderização leve de respostas do assistente (listas + negrito simples). */
export function ChatBubbleContent({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: Array<{ type: 'p' | 'ul'; items: string[] }> = []
  let para: string[] = []
  let bullets: string[] = []

  const flushPara = () => {
    if (!para.length) return
    blocks.push({ type: 'p', items: [para.join(' ').replace(/\s+/g, ' ').trim()] })
    para = []
  }
  const flushUl = () => {
    if (!bullets.length) return
    blocks.push({ type: 'ul', items: [...bullets] })
    bullets = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushPara()
      flushUl()
      continue
    }
    const bullet = line.match(/^(?:[-*•●]|\d+[.)])\s+(.+)$/)
    if (bullet) {
      flushPara()
      bullets.push(bullet[1])
      continue
    }
    flushUl()
    para.push(line.replace(/^#{1,3}\s+/, '').replace(/^\*\*(.+)\*\*$/, '$1'))
  }
  flushPara()
  flushUl()

  return (
    <div className={cn('space-y-2 text-sm leading-relaxed', className)}>
      {blocks.map((b, i) =>
        b.type === 'ul' ? (
          <ul key={i} className="list-disc space-y-1 pl-4">
            {b.items.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Inline text={b.items[0]} />
          </p>
        ),
      )}
    </div>
  )
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, i) =>
        /^\*\*[^*]+\*\*$/.test(part) ? (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}
