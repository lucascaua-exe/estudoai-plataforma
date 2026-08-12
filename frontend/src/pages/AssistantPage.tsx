import { useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { toast } from 'sonner'
import { useAiChat } from '@/hooks/use-api'
import { cn, getErrorMessage } from '@/lib/utils'
import type { ChatMessage } from '@/lib/types'
import { PageHeader } from '@/components/ui/page'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function AssistantPage() {
  const chat = useAiChat()
  const [message, setMessage] = useState('')
  const [conversationId, setConversationId] = useState<number | undefined>()
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      conteudo:
        'Olá! Sou o assistente do EstudoAI (Gemini). Posso explicar conteúdos do edital, tirar dúvidas e ajudar na preparação para Analista de TI — Araguaína/TO 2026.',
    },
  ])
  const bottomRef = useRef<HTMLDivElement>(null)

  const send = async () => {
    const text = message.trim()
    if (!text) return
    setMessage('')
    setMessages((prev) => [...prev, { role: 'user', conteudo: text }])
    try {
      const res = await chat.mutateAsync({
        message: text,
        conversation_id: conversationId,
      })
      setConversationId(res.conversation_id)
      setMessages((prev) => [...prev, res.message])
      if (!res.ai_enabled) {
        toast.message('IA em modo limitado no momento.')
      }
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Falha ao enviar mensagem.'))
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="Assistente IA"
        description="Tire dúvidas e peça explicações sobre o conteúdo do concurso."
      />

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                <p className="whitespace-pre-wrap">{m.conteudo}</p>
              </div>
            ))}
            {chat.isPending ? (
              <div className="w-fit rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                Pensando…
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t border-border pt-4">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Pergunte sobre LGPD, redes, banco de dados…"
              className="min-h-[52px] resize-none"
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
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
