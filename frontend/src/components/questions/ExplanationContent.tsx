import { cn } from '@/lib/utils'

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

const SECTION_LABELS =
  /^(resposta\s+correta|alternativa\s+correta|por\s+que(?:\s+as\s+outras(?:\s+alternativas?)?(?:\s+falham)?)?|alternativas?\s+incorretas?|an[aá]lise(?:\s+detalhada)?(?:\s+das\s+alternativas)?|dica(?:\s+de\s+memoriza[cç][aã]o)?|para\s+memorizar|conclus[aã]o|explica[cç][aã]o)\s*:?\s*$/i

const BULLET_RE = /^\s*(?:[-*•●]|\u2022)\s+(.+)$/
const ORDERED_RE = /^\s*(?:\d+[.)])\s+(.+)$/
const LETTER_ITEM_RE = /^\s*([A-Ea-e])[.)]\s+(.+)$/
const MD_HEADING_RE = /^\s{0,3}#{1,3}\s+(.+?)\s*$/

function cleanLabel(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/^#+\s*/, '')
    .replace(/:$/, '')
    .trim()
}

function isHeading(line: string): string | null {
  const md = line.match(MD_HEADING_RE)
  if (md) return cleanLabel(md[1])

  const bare = cleanLabel(line)
  if (SECTION_LABELS.test(bare)) return bare

  // "1) Resposta correta" / "1. Dica"
  const numbered = bare.match(/^\d+[.)]\s+(.+)$/)
  if (numbered && SECTION_LABELS.test(numbered[1])) return numbered[1]

  return null
}

function normalizeSource(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  text = text.replace(
    /([.!?])\s*(Resposta correta|Alternativa correta|Por que(?: as outras(?: alternativas?)?(?: falham)?)?|Alternativas? incorretas?|Análise(?: detalhada)?(?: das alternativas)?|Dica(?: de memorização)?|Para memorizar)\s*:/gi,
    '$1\n\n$2:\n',
  )
  text = text.replace(/(^|\n)\s*(#{1,3})\s*/g, '$1$2 ')
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

export function parseExplanation(raw: string): Block[] {
  if (!raw?.trim()) return []
  const lines = normalizeSource(raw).split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []

  const flushPara = () => {
    if (!para.length) return
    const text = para.join(' ').replace(/\s+/g, ' ').trim()
    if (text) blocks.push({ type: 'paragraph', text })
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

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushPara()
      flushList()
      continue
    }

    const heading = isHeading(trimmed)
    if (heading) {
      flushPara()
      flushList()
      blocks.push({ type: 'heading', text: heading })
      continue
    }

    const letter = trimmed.match(LETTER_ITEM_RE)
    if (letter) {
      flushPara()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(`**${letter[1].toUpperCase()})** ${letter[2]}`)
      continue
    }

    const bullet = trimmed.match(BULLET_RE)
    if (bullet) {
      flushPara()
      if (listType && listType !== 'ul') flushList()
      listType = 'ul'
      listItems.push(bullet[1])
      continue
    }

    const ordered = trimmed.match(ORDERED_RE)
    if (ordered) {
      flushPara()
      if (listType && listType !== 'ol') flushList()
      listType = 'ol'
      listItems.push(ordered[1])
      continue
    }

    if (listType) flushList()
    para.push(trimmed)
  }

  flushPara()
  flushList()
  return blocks
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).filter(Boolean)
  return (
    <>
      {parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part) || /^__[^_]+__$/.test(part)) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

interface ExplanationContentProps {
  text: string
  className?: string
}

export function ExplanationContent({ text, className }: ExplanationContentProps) {
  const blocks = parseExplanation(text)

  if (!blocks.length) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Sem explicação disponível para esta questão.
      </p>
    )
  }

  return (
    <div className={cn('explanation-prose', className)}>
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          return (
            <p key={i} className="exp-heading">
              {block.text}
            </p>
          )
        }
        if (block.type === 'paragraph') {
          return (
            <p key={i}>
              <RichText text={block.text} />
            </p>
          )
        }
        if (block.type === 'ul') {
          return (
            <ul key={i} className="list-disc">
              {block.items.map((item, j) => (
                <li key={j}>
                  <RichText text={item} />
                </li>
              ))}
            </ul>
          )
        }
        return (
          <ol key={i} className="list-decimal">
            {block.items.map((item, j) => (
              <li key={j}>
                <RichText text={item} />
              </li>
            ))}
          </ol>
        )
      })}
    </div>
  )
}
