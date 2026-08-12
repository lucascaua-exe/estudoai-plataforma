import { cn } from '@/lib/utils'

type Block =
  | { type: 'heading'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'tip'; text: string }
  | { type: 'quote'; text: string }

const HEADING_RE =
  /^(resumo|conceito|defini[cç][aã]o|explica[cç][aã]o|por\s+que|pegadinha|aten[cç][aã]o|dica(?:\s+de\s+prova)?|para\s+memorizar|exemplo|passo\s+a\s+passo|conclus[aã]o|fonte)\s*:?\s*$/i

function parseChat(text: string): Block[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []

  const flushPara = () => {
    if (!para.length) return
    const joined = para.join(' ').replace(/\s+/g, ' ').trim()
    if (joined) blocks.push({ type: 'p', text: joined })
    para = []
  }

  const flushList = () => {
    if (!listType || !listItems.length) {
      listType = null
      listItems = []
      return
    }
    blocks.push({ type: listType, items: [...listItems] })
    listType = null
    listItems = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushPara()
      flushList()
      continue
    }

    // Markdown heading
    const mdHead = line.match(/^#{1,3}\s+(.+)$/)
    if (mdHead) {
      flushPara()
      flushList()
      blocks.push({ type: 'heading', text: mdHead[1].replace(/\*\*/g, '').replace(/:$/, '') })
      continue
    }

    // "Dica:" / "Resumo:" inline heading + content
    const labeled = line.match(
      /^(Dica(?:\s+de\s+prova)?|Para\s+memorizar|Pegadinha|Aten[cç][aã]o|Resumo|Conceito|Exemplo)\s*:\s*(.+)$/i,
    )
    if (labeled) {
      flushPara()
      flushList()
      const label = labeled[1]
      const rest = labeled[2]
      if (/^dica|memorizar/i.test(label)) {
        blocks.push({ type: 'tip', text: rest })
      } else {
        blocks.push({ type: 'heading', text: label })
        blocks.push({ type: 'p', text: rest })
      }
      continue
    }

    const bare = line.replace(/\*\*/g, '').replace(/:$/, '').trim()
    if (HEADING_RE.test(bare) || /^\*\*[^*]+\*\*:?\s*$/.test(line)) {
      flushPara()
      flushList()
      blocks.push({ type: 'heading', text: bare })
      continue
    }

    // Quote / fonte
    if (/^fonte\s*:/i.test(line) || line.startsWith('>')) {
      flushPara()
      flushList()
      blocks.push({
        type: 'quote',
        text: line.replace(/^>\s*/, '').replace(/^fonte\s*:\s*/i, 'Fonte: '),
      })
      continue
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/)
    if (ordered) {
      flushPara()
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(ordered[1])
      continue
    }

    const bullet = line.match(/^(?:[-*•●]|\u2022)\s+(.+)$/)
    if (bullet) {
      flushPara()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(bullet[1])
      continue
    }

    // Letter items A) B)
    const letter = line.match(/^([A-Ea-e])[.)]\s+(.+)$/)
    if (letter) {
      flushPara()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(`**${letter[1].toUpperCase()})** ${letter[2]}`)
      continue
    }

    flushList()
    para.push(line.replace(/^#{1,3}\s+/, ''))
  }

  flushPara()
  flushList()
  return blocks
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          )
        }
        if (/^`[^`]+`$/.test(part)) {
          return (
            <code
              key={i}
              className="rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[0.8em] text-primary"
            >
              {part.slice(1, -1)}
            </code>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

/** Renderização rica das respostas do assistente. */
export function ChatBubbleContent({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const blocks = parseChat(text)

  if (!blocks.length) {
    return <p className={cn('text-sm text-muted-foreground', className)}>{text}</p>
  }

  return (
    <div className={cn('chat-prose space-y-2.5 text-sm leading-relaxed', className)}>
      {blocks.map((b, i) => {
        if (b.type === 'heading') {
          return (
            <p
              key={i}
              className="text-[11px] font-bold tracking-[0.12em] text-primary uppercase"
            >
              {b.text}
            </p>
          )
        }
        if (b.type === 'tip') {
          return (
            <div
              key={i}
              className="rounded-xl border border-amber-300/50 bg-amber-50/90 px-3 py-2 text-[13px] text-amber-950 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100"
            >
              <p className="mb-1 text-[10px] font-bold tracking-[0.14em] text-amber-800 uppercase dark:text-amber-200">
                Dica
              </p>
              <Inline text={b.text} />
            </div>
          )
        }
        if (b.type === 'quote') {
          return (
            <p key={i} className="border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground">
              <Inline text={b.text} />
            </p>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="space-y-1.5 pl-0">
              {b.items.map((item, j) => (
                <li
                  key={j}
                  className="relative rounded-lg bg-background/55 px-3 py-1.5 pl-7 before:absolute before:left-2.5 before:top-[0.7rem] before:h-1.5 before:w-1.5 before:rounded-full before:bg-primary/70"
                >
                  <Inline text={item} />
                </li>
              ))}
            </ul>
          )
        }
        if (b.type === 'ol') {
          return (
            <ol key={i} className="list-decimal space-y-1.5 pl-5">
              {b.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} />
                </li>
              ))}
            </ol>
          )
        }
        return (
          <p key={i}>
            <Inline text={b.text} />
          </p>
        )
      })}
    </div>
  )
}

/** Indicador de digitação (3 pontos). */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-2xl bg-muted px-4 py-3',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Assistente digitando"
    >
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="sr-only">Digitando…</span>
    </div>
  )
}
