import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export function PrivacyPage() {
  return (
    <LegalShell title="Privacidade">
      <p>
        A EstudoAI trata dados de conta (nome, email) e progresso de estudo apenas para operar o
        painel. Não vendemos dados a terceiros.
      </p>
      <p>
        Tokens de sessão ficam no seu navegador. Você pode solicitar exclusão da conta pelo suporte
        informado no painel.
      </p>
    </LegalShell>
  )
}

export function TermsPage() {
  return (
    <LegalShell title="Termos de uso">
      <p>
        Ao criar conta você concorda em usar a plataforma para estudo pessoal. O conteúdo do banco
        respeita o material oficial ingerido; a responsabilidade pelo resultado na prova é sua.
      </p>
      <p>
        Planos pagos renovam mensalmente até o cancelamento. A garantia de 7 dias cobre reembolso
        integral do primeiro ciclo se solicitado dentro do prazo.
      </p>
    </LegalShell>
  )
}

function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="landing min-h-dvh bg-white px-6 py-16 text-black [font-family:var(--font-landing)]">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="text-sm font-semibold text-black/60 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
        >
          Voltar
        </Link>
        <h1 className="mt-8 text-4xl font-semibold text-balance">{title}</h1>
        <div className="mt-6 space-y-4 text-pretty text-base leading-relaxed text-black/70">
          {children}
        </div>
      </div>
    </div>
  )
}
