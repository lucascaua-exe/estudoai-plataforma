import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useAiChat } from '@/hooks/use-api'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'
import { PageHeader } from '@/components/ui/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ChatBubbleContent, TypingIndicator } from '@/components/ai/ChatBubbleContent'

const SUGGESTIONS = [
  'Oi! Como você pode me ajudar hoje?',
  'O que é controlador e operador na LGPD?',
  'Me dá uma dica rápida de ITIL cobrada em prova.',
]

export function AssistantPage() {
  const chat = useAiChat()
  const [message, setMessage] = useState('')
  const [conversationId, setConversationId] = useState<number | undefined>()
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      conteudo:
        'Oi! Eu sou o tutor do EstudoAI. Pode mandar desde um “bom dia” até uma dúvida pesada do edital — eu respondo com linguagem clara, uso meu conhecimento de concurso e, quando fizer sentido, cruzo com o material da sua base. Bora estudar?',
    },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chat.isPending])

  const send = async (textRaw?: string) => {
    const text = (textRaw ?? message).trim()
    if (!text || chat.isPending) return
    setMessage('')
    setMessages((prev) => [...prev, { role: 'user', conteudo: text }])
    try {
      const res = await chat.mutateAsync({
        message: text,
        conversation_id: conversationId,
      })
      setConversationId(res.conversation_id)
      setAiEnabled(res.ai_enabled)
      setMessages((prev) => [...prev, res.message])
      if (!res.ai_enabled) {
        toast.message('IA em modo limitado — configure GEMINI_API_KEY no servidor.')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Falha ao enviar mensagem.'))
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          conteudo: 'Não consegui responder agora. Verifique a conexão com a API e tente de novo.',
        },
      ])
    }
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col">
      <PageHeader
        title="Assistente IA"
        description="Tutor humano: conhecimento de concurso + sua base de estudos."
        actions={
          aiEnabled == null ? null : (
            <Badge variant={aiEnabled ? 'success' : 'warning'}>
              <Sparkles className="mr-1 h-3 w-3" aria-hidden />
              {aiEnabled ? 'Gemini ativo' : 'IA limitada'}
            </Badge>
          )
        }
      />

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn(
                  'max-w-[92%] rounded-2xl px-4 py-3 shadow-sm',
                  m.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'border border-border/70 bg-card text-foreground',
                )}
              >
                {m.role === 'assistant' ? (
                  <ChatBubbleContent text={m.conteudo} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.conteudo}</p>
                )}
                {m.role === 'assistant' && m.fontes?.length ? (
                  <div className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                    Fontes:{' '}
                    {m.fontes
                      .slice(0, 3)
                      .map((f) => `${f.documento || 'Material'}${f.pagina ? ` p.${f.pagina}` : ''}`)
                      .join(' · ')}
                  </div>
                ) : null}
              </div>
            ))}
            {chat.isPending ? <TypingIndicator /> : null}
            <div ref={bottomRef} />
          </div>

          {!conversationId && !chat.isPending ? (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex gap-2 border-t border-border pt-4">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Pergunte sobre LGPD, redes, banco de dados…"
              className="min-h-[52px] resize-none"
              aria-label="Mensagem para o assistente"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
            />
            <Button
              className="h-auto shrink-0"
              onClick={() => void send()}
              disabled={chat.isPending || !message.trim()}
              aria-label="Enviar mensagem"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
