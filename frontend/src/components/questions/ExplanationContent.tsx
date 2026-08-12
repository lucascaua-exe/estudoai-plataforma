import { Lightbulb, ListChecks, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Block =
  | { type: 'heading'; text: string; kind: SectionKind }
  | { type: 'paragraph'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }

type SectionKind = 'correct' | 'wrong' | 'tip' | 'other'

const SECTION_LABELS =
  /^(resposta\s+correta|alternativa\s+correta|por\s+que(?:\s+as\s+outras(?:\s+alternativas?)?(?:\s+falham)?)?|alternativas?\s+incorretas?|an[aá]lise(?:\s+detalhada)?(?:\s+das\s+alternativas)?|dica(?:\s+de\s+memoriza[cç][aã]o)?|para\s+memorizar|truque|conclus[aã]o|explica[cç][aã]o)\s*:?\s*$/i

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

function sectionKind(label: string): SectionKind {
  const h = label.toLowerCase()
  if (/dica|memoriz|truque/.test(h)) return 'tip'
  if (/resposta|alternativa correta/.test(h)) return 'correct'
  if (/por que|incorret|an[aá]lise/.test(h)) return 'wrong'
  return 'other'
}

function isHeading(line: string): string | null {
  const md = line.match(MD_HEADING_RE)
  if (md) return cleanLabel(md[1])

  const bare = cleanLabel(line)
  if (SECTION_LABELS.test(bare)) return bare

  const numbered = bare.match(/^\d+[.)]\s+(.+)$/)
  if (numbered && SECTION_LABELS.test(numbered[1])) return numbered[1]

  return null
}

function normalizeSource(raw: string): string {
  let text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  text = text.replace(
    /([.!?])\s*(Resposta correta|Alternativa correta|Por que(?: as outras(?: alternativas?)?(?: falham)?)?|Alternativas? incorretas?|Análise(?: detalhada)?(?: das alternativas)?|Dica(?: de memorização)?|Para memorizar|Truque)\s*:/gi,
    '$1\n\n$2:\n',
  )
  // Quebra alternativas coladas no mesmo parágrafo: (A) ... (B) ...
  text = text.replace(/\s*[\(•\-]?\s*([A-Ea-e])\)\s+/g, '\n• $1) ')
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
      blocks.push({ type: 'heading', text: heading, kind: sectionKind(heading) })
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

type Section = {
  kind: SectionKind
  title: string
  blocks: Exclude<Block, { type: 'heading' }>[]
}

function groupSections(blocks: Block[]): Section[] {
  const sections: Section[] = []
  let current: Section | null = null

  const ensure = (kind: SectionKind, title: string) => {
    current = { kind, title, blocks: [] }
    sections.push(current)
  }

  for (const block of blocks) {
    if (block.type === 'heading') {
      ensure(block.kind, block.text)
      continue
    }
    if (!current) ensure('other', 'Resolução')
    current!.blocks.push(block)
  }
  return sections
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

function SectionIcon({ kind }: { kind: SectionKind }) {
  if (kind === 'tip') return <Lightbulb className="h-4 w-4" aria-hidden />
  if (kind === 'correct') return <CheckCircle2 className="h-4 w-4" aria-hidden />
  if (kind === 'wrong') return <ListChecks className="h-4 w-4" aria-hidden />
  return null
}

interface ExplanationContentProps {
  text: string
  className?: string
}

export function ExplanationContent({ text, className }: ExplanationContentProps) {
  const sections = groupSections(parseExplanation(text))

  if (!sections.length) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        Sem explicação disponível para esta questão.
      </p>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {sections.map((section, i) => (
        <section
          key={i}
          className={cn(
            'rounded-xl border px-3.5 py-3',
            section.kind === 'tip' &&
              'border-amber-300/60 bg-gradient-to-b from-amber-50 to-orange-50/80 dark:border-amber-800/50 dark:from-amber-950/40 dark:to-orange-950/20',
            section.kind === 'correct' &&
              'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20',
            section.kind === 'wrong' && 'border-border bg-muted/30',
            section.kind === 'other' && 'border-border bg-card',
          )}
        >
          <div
            className={cn(
              'mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] uppercase',
              section.kind === 'tip' && 'text-amber-800 dark:text-amber-200',
              section.kind === 'correct' && 'text-emerald-800 dark:text-emerald-200',
              section.kind === 'wrong' && 'text-primary',
              section.kind === 'other' && 'text-muted-foreground',
            )}
          >
            <SectionIcon kind={section.kind} />
            <span>{section.title}</span>
          </div>
          <div className="explanation-prose">
            {section.blocks.map((block, j) => {
              if (block.type === 'paragraph') {
                return (
                  <p key={j} className={section.kind === 'tip' ? 'font-medium' : undefined}>
                    <RichText text={block.text} />
                  </p>
                )
              }
              if (block.type === 'ul') {
                return (
                  <ul key={j} className="exp-alt-list">
                    {block.items.map((item, k) => (
                      <li key={k}>
                        <RichText text={item} />
                      </li>
                    ))}
                  </ul>
                )
              }
              return (
                <ol key={j} className="list-decimal">
                  {block.items.map((item, k) => (
                    <li key={k}>
                      <RichText text={item} />
                    </li>
                  ))}
                </ol>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
