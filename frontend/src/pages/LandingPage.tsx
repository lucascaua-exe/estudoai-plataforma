import { useId, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'
import { PLANS, type PlanId } from '@/lib/plans'
import { cn } from '@/lib/utils'

function planHref(id: PlanId) {
  return `/register?plano=${id}`
}

function DemoQuestion() {
  const titleId = useId()
  const [picked, setPicked] = useState<string | null>(null)
  const ok = 'C'
  const alts = [
    { id: 'A', text: 'Modelo em cascata' },
    { id: 'B', text: 'Modelo em espiral' },
    { id: 'C', text: 'Scrum / iterativo incremental' },
    { id: 'D', text: 'Big Bang' },
  ] as const

  return (
    <div
      className="border border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-900"
      role="group"
      aria-labelledby={titleId}
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
        <span className="text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
          Q.184 · TI
        </span>
        <span className="text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
          Amostra
        </span>
      </div>
      <div className="p-4 md:p-8">
        <p
          id={titleId}
          className="max-w-[60ch] text-base font-normal leading-relaxed text-pretty text-stone-900 dark:text-stone-50"
        >
          Em gestão de projetos de software, qual abordagem organiza o trabalho em sprints curtas
          com entrega incremental de valor?
        </p>
        <ul className="mt-8 space-y-2">
          {alts.map((alt) => {
            const selected = picked === alt.id
            const showOk = picked !== null && alt.id === ok
            const showBad = picked !== null && selected && alt.id !== ok
            return (
              <li key={alt.id}>
                <button
                  type="button"
                  onClick={() => setPicked(alt.id)}
                  aria-pressed={selected}
                  className={cn(
                    'flex min-h-[44px] w-full items-start gap-4 border px-4 py-3 text-left text-sm leading-relaxed',
                    'motion-safe:transition-[background-color,border-color,opacity] motion-safe:duration-200 motion-reduce:transition-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-stone-50 dark:focus-visible:ring-offset-stone-950',
                    'active:opacity-90',
                    showOk && 'border-[#003B8E] bg-[#003B8E]/10',
                    showBad && 'border-stone-900/40 bg-stone-200 dark:border-stone-50/40 dark:bg-stone-800',
                    !showOk &&
                      !showBad &&
                      selected &&
                      'border-stone-900 bg-stone-200 dark:border-stone-50 dark:bg-stone-800',
                    !showOk &&
                      !showBad &&
                      !selected &&
                      'border-stone-200 bg-stone-50 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:hover:bg-stone-900',
                  )}
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center border border-current text-xs font-medium tabular-nums">
                    {alt.id}
                  </span>
                  <span className="min-w-0 pt-0.5 text-pretty text-stone-900 dark:text-stone-50">
                    {alt.text}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        <p
          className="mt-4 min-h-5 max-w-[60ch] text-sm leading-relaxed text-stone-900/40 dark:text-stone-50/40"
          aria-live="polite"
        >
          {picked === null && 'Selecione uma alternativa…'}
          {picked === ok && 'Correto. No painel, isso alimenta revisão e domínio.'}
          {picked !== null && picked !== ok && `Gabarito: ${ok}. O erro entra na fila de revisão.`}
        </p>
      </div>
    </div>
  )
}

export function LandingPage() {
  const access = useAuthStore((s) => s.access)
  const [menuOpen, setMenuOpen] = useState(false)

  if (access) return <Navigate to="/painel" replace />

  return (
    <div className="swiss-landing min-h-dvh bg-stone-50 text-stone-900 antialiased dark:bg-stone-950 dark:text-stone-50">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-stone-900 focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-stone-50 dark:focus:bg-stone-50 dark:focus:text-stone-900"
      >
        Ir para o conteúdo
      </a>

      {/* Nav */}
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link
            to="/"
            translate="no"
            className="text-base font-medium tracking-tight text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 dark:text-stone-50 dark:focus-visible:ring-stone-50"
          >
            EstudoAI
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
            {[
              { href: '#metodo', label: 'Método' },
              { href: '#amostra', label: 'Amostra' },
              { href: '#planos', label: 'Planos' },
              { href: '#faq', label: 'FAQ' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="min-h-[44px] inline-flex items-center text-sm font-normal text-stone-900/70 motion-safe:transition-opacity hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 dark:text-stone-50/70 dark:hover:text-stone-50 dark:focus-visible:ring-stone-50"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              className="inline-flex min-h-[44px] items-center border border-stone-900 px-4 text-sm font-medium text-stone-900 motion-safe:transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 dark:border-stone-50 dark:text-stone-50 dark:focus-visible:ring-stone-50"
            >
              Entrar
            </Link>
          </nav>

          <button
            type="button"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-stone-200 text-sm md:hidden dark:border-stone-800"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? 'Fechar' : 'Menu'}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-stone-200 px-4 py-4 md:hidden dark:border-stone-800">
            <div className="flex flex-col gap-2">
              {[
                { href: '#metodo', label: 'Método' },
                { href: '#amostra', label: 'Amostra' },
                { href: '#planos', label: 'Planos' },
                { href: '#faq', label: 'FAQ' },
              ].map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-[44px] items-center text-base text-stone-900/70 dark:text-stone-50/70"
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-2 flex min-h-[44px] items-center justify-center bg-[#003B8E] text-sm font-medium text-stone-50"
              >
                Entrar
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main id="conteudo">
        {/* Hero */}
        <section className="border-b border-stone-200 py-16 md:py-24 lg:py-32 dark:border-stone-800">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid grid-cols-12 gap-4 md:gap-8">
              <div className="col-span-12 lg:col-span-8">
                <p className="text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
                  Analista de TI · Prefeitura de Araguaína · 2026
                </p>
                <h1 className="mt-8 text-4xl font-light tracking-tight text-balance text-stone-900 sm:text-5xl md:text-6xl lg:text-7xl lg:leading-none dark:text-stone-50">
                  Estudo medido
                  <br />
                  no edital real
                </h1>
                <p className="mt-8 max-w-[60ch] text-base font-normal leading-relaxed text-pretty text-stone-900/70 dark:text-stone-50/70">
                  Mais de 2.300 questões dos PDFs oficiais, simulados, revisão inteligente e mapa de
                  domínio. Quem já tem conta entra. Quem começa escolhe um plano.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href="#planos"
                    className="inline-flex min-h-[44px] items-center justify-center bg-[#003B8E] px-8 text-sm font-medium text-stone-50 motion-safe:transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B8E] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50 dark:focus-visible:ring-offset-stone-950"
                  >
                    Ver planos
                  </a>
                  <Link
                    to="/login"
                    className="inline-flex min-h-[44px] items-center justify-center border border-stone-900 px-8 text-sm font-medium text-stone-900 motion-safe:transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 dark:border-stone-50 dark:text-stone-50 dark:focus-visible:ring-stone-50"
                  >
                    Já tenho conta
                  </Link>
                </div>
                <p className="mt-8 text-sm text-stone-900/40 dark:text-stone-50/40">
                  Free sem cartão · Cancelamento a qualquer momento · Garantia de 7&nbsp;dias
                </p>
              </div>
              <div className="col-span-12 hidden lg:col-span-4 lg:block">
                <div className="grid h-full grid-rows-3 gap-4 border border-stone-200 p-4 dark:border-stone-800">
                  {[
                    { n: '2.375', l: 'questões' },
                    { n: '6', l: 'disciplinas' },
                    { n: '3', l: 'planos' },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className="flex flex-col justify-end border-t border-stone-200 pt-4 dark:border-stone-800"
                    >
                      <p className="text-3xl font-light tracking-tight tabular-nums text-stone-900 dark:text-stone-50">
                        {s.n}
                      </p>
                      <p className="mt-2 text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
                        {s.l}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Método */}
        <section
          id="metodo"
          className="scroll-mt-8 border-b border-stone-200 py-16 md:py-24 lg:py-32 dark:border-stone-800"
        >
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid grid-cols-12 gap-4 md:gap-8">
              <div className="col-span-12 md:col-span-4">
                <p className="text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
                  Método
                </p>
                <h2 className="mt-4 text-3xl font-light tracking-tight text-balance text-stone-900 dark:text-stone-50">
                  Três passos.
                  <br />
                  Sem ruído.
                </h2>
              </div>
              <div className="col-span-12 md:col-span-8">
                <ol className="divide-y divide-stone-200 border-y border-stone-200 dark:divide-stone-800 dark:border-stone-800">
                  {[
                    {
                      n: '01',
                      t: 'Assine',
                      d: 'Free para validar o ritmo. Pro para cobrir o edital. Premium com IA nas fontes.',
                    },
                    {
                      n: '02',
                      t: 'Pratique',
                      d: 'Sessões guiadas, banco filtrável e simulados no formato da prova.',
                    },
                    {
                      n: '03',
                      t: 'Corrija',
                      d: 'Fila de erros, mapa de domínio e metas apontam o próximo bloco.',
                    },
                  ].map((row) => (
                    <li key={row.n} className="grid grid-cols-12 gap-4 py-8">
                      <span className="col-span-2 font-mono text-sm tabular-nums text-stone-900/40 dark:text-stone-50/40">
                        {row.n}
                      </span>
                      <div className="col-span-10 md:col-span-9">
                        <h3 className="text-xl font-normal text-stone-900 dark:text-stone-50">
                          {row.t}
                        </h3>
                        <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-pretty text-stone-900/70 dark:text-stone-50/70">
                          {row.d}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="mt-16 grid grid-cols-12 gap-4 md:gap-8">
              <div className="col-span-12">
                <p className="text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
                  Edital
                </p>
                <h2 className="mt-4 text-3xl font-light tracking-tight dark:text-stone-50">
                  Seis disciplinas
                </h2>
              </div>
              {[
                'Legislação',
                'Tecnologia da Informação',
                'História e Geografia de Araguaína',
                'Informática',
                'Língua Portuguesa',
                'Raciocínio Lógico e Matemático',
              ].map((name, i) => (
                <div
                  key={name}
                  className="col-span-12 border border-stone-200 p-4 sm:col-span-6 lg:col-span-4 dark:border-stone-800"
                >
                  <p className="font-mono text-xs tabular-nums text-stone-900/40 dark:text-stone-50/40">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="mt-4 text-base font-normal text-stone-900 dark:text-stone-50">
                    {name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Amostra */}
        <section
          id="amostra"
          className="scroll-mt-8 border-b border-stone-200 py-16 md:py-24 lg:py-32 dark:border-stone-800"
        >
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid grid-cols-12 gap-8">
              <div className="col-span-12 lg:col-span-5">
                <p className="text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
                  Produto
                </p>
                <h2 className="mt-4 text-3xl font-light tracking-tight text-balance dark:text-stone-50">
                  Uma questão do banco
                </h2>
                <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-pretty text-stone-900/70 dark:text-stone-50/70">
                  Experimente o fluxo de resposta. No painel completo, cada tentativa atualiza
                  revisão, domínio e metas.
                </p>
              </div>
              <div className="col-span-12 lg:col-span-7">
                <DemoQuestion />
              </div>
            </div>
          </div>
        </section>

        {/* Planos */}
        <section
          id="planos"
          className="scroll-mt-8 border-b border-stone-200 py-16 md:py-24 lg:py-32 dark:border-stone-800"
        >
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid grid-cols-12 gap-4 md:gap-8">
              <div className="col-span-12 md:col-span-5">
                <p className="text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
                  Assinatura
                </p>
                <h2 className="mt-4 text-3xl font-light tracking-tight text-balance dark:text-stone-50">
                  Três planos.
                  <br />
                  Um caminho.
                </h2>
                <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-pretty text-stone-900/70 dark:text-stone-50/70">
                  Conta nova nasce pelo plano escolhido. Se você já assinou, use Entrar.
                </p>
                <Link
                  to="/login"
                  className="mt-8 inline-flex min-h-[44px] items-center text-sm font-medium text-[#003B8E] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B8E]"
                >
                  Já tenho conta → Entrar
                </Link>
              </div>
              <div className="col-span-12 md:col-span-7">
                <ul className="divide-y divide-stone-200 border border-stone-200 dark:divide-stone-800 dark:border-stone-800">
                  {PLANS.map((plan) => (
                    <li
                      key={plan.id}
                      className={cn(
                        'p-4 md:p-8',
                        plan.featured && 'bg-stone-100 dark:bg-stone-900',
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-4">
                            <h3 className="text-xl font-normal text-stone-900 dark:text-stone-50">
                              {plan.name}
                            </h3>
                            {plan.featured ? (
                              <span className="text-xs font-normal tracking-wide text-[#003B8E] uppercase">
                                Recomendado
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-pretty text-stone-900/70 dark:text-stone-50/70">
                            {plan.description}
                          </p>
                        </div>
                        <p className="text-2xl font-light tracking-tight tabular-nums text-stone-900 dark:text-stone-50">
                          {plan.priceLabel}
                          <span className="ml-2 text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
                            {plan.priceNote}
                          </span>
                        </p>
                      </div>
                      <ul className="mt-8 space-y-2">
                        {plan.features.map((f) => (
                          <li
                            key={f}
                            className="flex gap-4 text-sm leading-relaxed text-stone-900/70 dark:text-stone-50/70"
                          >
                            <span className="text-[#003B8E]" aria-hidden>
                              —
                            </span>
                            <span className="text-pretty">{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to={planHref(plan.id)}
                        className={cn(
                          'mt-8 inline-flex min-h-[44px] w-full items-center justify-center px-8 text-sm font-medium motion-safe:transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto',
                          plan.featured
                            ? 'bg-[#003B8E] text-stone-50 focus-visible:ring-[#003B8E]'
                            : 'border border-stone-900 text-stone-900 focus-visible:ring-stone-900 dark:border-stone-50 dark:text-stone-50 dark:focus-visible:ring-stone-50',
                        )}
                      >
                        {plan.cta}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="scroll-mt-8 border-b border-stone-200 py-16 md:py-24 lg:py-32 dark:border-stone-800"
        >
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <p className="text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
              FAQ
            </p>
            <h2 className="mt-4 text-3xl font-light tracking-tight dark:text-stone-50">
              Perguntas frequentes
            </h2>
            <dl className="mt-16 divide-y divide-stone-200 border-y border-stone-200 dark:divide-stone-800 dark:border-stone-800">
              {[
                {
                  q: 'Preciso de cartão para o plano Free?',
                  a: 'Não. O Free abre na hora. Cartão só ao subir para Pro ou Premium.',
                },
                {
                  q: 'As questões são inventadas por IA?',
                  a: 'Não. O banco vem dos PDFs oficiais do concurso. A IA do Premium responde com base nesse material.',
                },
                {
                  q: 'Posso cancelar quando quiser?',
                  a: 'Sim. Planos pagos cancelam a qualquer momento. Você mantém o acesso até o fim do ciclo já pago.',
                },
                {
                  q: 'Já tenho conta. Como entro?',
                  a: 'Use Entrar no topo. Planos, troca e faturas ficam em Planos e faturas no painel.',
                },
              ].map((item) => (
                <div key={item.q} className="grid grid-cols-12 gap-4 py-8 md:gap-8">
                  <dt className="col-span-12 text-base font-medium text-stone-900 md:col-span-5 dark:text-stone-50">
                    {item.q}
                  </dt>
                  <dd className="col-span-12 max-w-[60ch] text-base leading-relaxed text-pretty text-stone-900/70 md:col-span-7 dark:text-stone-50/70">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-16 md:py-24 lg:py-32">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid grid-cols-12 gap-8 border border-stone-200 bg-stone-100 p-8 md:p-16 dark:border-stone-800 dark:bg-stone-900">
              <div className="col-span-12 lg:col-span-8">
                <h2 className="text-3xl font-light tracking-tight text-balance md:text-5xl dark:text-stone-50">
                  Escolha o plano
                  <br />
                  e feche o edital
                </h2>
                <p className="mt-8 max-w-[60ch] text-base leading-relaxed text-pretty text-stone-900/70 dark:text-stone-50/70">
                  Free sem cartão. Pro e Premium com cancelamento livre e garantia de 7&nbsp;dias.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href="#planos"
                    className="inline-flex min-h-[44px] items-center justify-center bg-[#003B8E] px-8 text-sm font-medium text-stone-50 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B8E] focus-visible:ring-offset-2"
                  >
                    Ver planos
                  </a>
                  <Link
                    to="/login"
                    className="inline-flex min-h-[44px] items-center justify-center border border-stone-900 px-8 text-sm font-medium text-stone-900 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 dark:border-stone-50 dark:text-stone-50 dark:focus-visible:ring-stone-50"
                  >
                    Entrar
                  </Link>
                </div>
              </div>
              <div className="col-span-12 flex items-end lg:col-span-4">
                <p className="text-xs font-normal tracking-wide text-stone-900/40 uppercase dark:text-stone-50/40">
                  Um concurso · Um painel · Três planos
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 py-16 dark:border-stone-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 md:flex-row md:items-start md:justify-between md:px-8">
          <div>
            <p translate="no" className="text-base font-medium">
              EstudoAI
            </p>
            <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-pretty text-stone-900/40 dark:text-stone-50/40">
              Preparação para concursos com banco oficial, métricas e revisão inteligente.
            </p>
          </div>
          <nav className="flex flex-wrap gap-8 text-sm text-stone-900/70 dark:text-stone-50/70">
            <a href="#planos" className="min-h-[44px] inline-flex items-center hover:text-stone-900 dark:hover:text-stone-50">
              Planos
            </a>
            <Link to="/login" className="min-h-[44px] inline-flex items-center hover:text-stone-900 dark:hover:text-stone-50">
              Entrar
            </Link>
            <Link to="/privacidade" className="min-h-[44px] inline-flex items-center hover:text-stone-900 dark:hover:text-stone-50">
              Privacidade
            </Link>
            <Link to="/termos" className="min-h-[44px] inline-flex items-center hover:text-stone-900 dark:hover:text-stone-50">
              Termos
            </Link>
          </nav>
        </div>
        <p className="mx-auto mt-16 max-w-6xl px-4 text-xs tracking-wide text-stone-900/40 uppercase md:px-8 dark:text-stone-50/40">
          © {new Date().getFullYear()} EstudoAI
        </p>
      </footer>
    </div>
  )
}
