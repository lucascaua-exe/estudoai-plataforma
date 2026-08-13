import { useId, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { BrandLogo } from '@/components/BrandLogo'
import { CloseIcon, MenuIcon } from '@/components/ui/icons'
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand'
import { useAuthStore } from '@/lib/auth-store'
import { PLANS, type PlanId } from '@/lib/plans'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { FadeIn } from '@/components/motion/FadeIn'

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
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
      role="group"
      aria-labelledby={titleId}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/50 px-4 py-3">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Amostra · Q.184
        </span>
        <span className="text-xs font-medium text-primary">Feedback imediato</span>
      </div>
      <div className="p-4 md:p-6">
        <p
          id={titleId}
          className="max-w-[60ch] text-base font-medium leading-relaxed text-pretty text-foreground"
        >
          Em gestão de projetos de software, qual abordagem organiza o trabalho em sprints curtas
          com entrega incremental de valor?
        </p>
        <ul className="mt-6 space-y-2">
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
                    'flex min-h-12 w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium leading-relaxed transition-colors duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    showOk && 'border-success/40 bg-success/8',
                    showBad && 'border-destructive/35 bg-destructive/5',
                    !showOk && !showBad && selected && 'border-primary bg-primary/5',
                    !showOk && !showBad && !selected && 'border-border bg-card hover:bg-muted/60',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold',
                      showOk && 'bg-success text-white',
                      showBad && 'bg-destructive text-white',
                      !showOk && !showBad && selected && 'bg-primary text-primary-foreground',
                      !showOk && !showBad && !selected && 'bg-secondary text-secondary-foreground',
                    )}
                  >
                    {alt.id}
                  </span>
                  <span className="min-w-0 pt-0.5 text-pretty">{alt.text}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 min-h-5 text-sm text-muted-foreground" aria-live="polite">
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
    <div className="min-h-dvh bg-background text-foreground antialiased">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-primary-foreground"
      >
        Ir para o conteúdo
      </a>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/85 shadow-[0_1px_0_rgba(37,99,235,0.05)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link
            to="/"
            className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={BRAND_NAME}
          >
            <BrandLogo size="sm" compact className="h-10 md:h-11" />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {[
              { href: '#metodo', label: 'Método' },
              { href: '#amostra', label: 'Amostra' },
              { href: '#planos', label: 'Planos' },
              { href: '#faq', label: 'FAQ' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {l.label}
              </a>
            ))}
            <Link
              to="/login"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'ml-2')}
            >
              Entrar
            </Link>
            <a href="#planos" className={cn(buttonVariants({ size: 'sm' }), 'ml-1')}>
              Começar
            </a>
          </nav>

          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-card md:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <CloseIcon className="h-5 w-5" weight="bold" aria-hidden />
            ) : (
              <MenuIcon className="h-5 w-5" weight="bold" aria-hidden />
            )}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-border px-4 py-4 md:hidden">
            <div className="flex flex-col gap-1">
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
                  className="flex min-h-12 cursor-pointer items-center rounded-lg px-3 text-base font-medium"
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className={cn(buttonVariants(), 'mt-2 w-full')}
              >
                Entrar
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <main id="conteudo">
        <section className="relative overflow-hidden border-b border-border py-16 md:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_420px_at_15%_-10%,rgba(37,99,235,0.16),transparent_55%),radial-gradient(700px_360px_at_90%_10%,rgba(14,165,233,0.12),transparent_50%),linear-gradient(180deg,#ffffff_0%,#f4f7fc_100%)]"
          />
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <FadeIn>
              <BrandLogo size="hero" className="origin-left" />
              <h1 className="sr-only">
                {BRAND_NAME}: {BRAND_TAGLINE}
              </h1>
              <p className="mt-6 max-w-[36ch] font-display text-xl font-medium text-foreground md:text-2xl">
                Preparação clara para o edital real.
              </p>
              <p className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground md:text-lg">
                Mais de 2.300 questões oficiais, revisão inteligente e simulados — sem ruído visual,
                com foco no que importa: passar.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#planos" className={cn(buttonVariants({ size: 'lg' }))}>
                  Ver planos
                </a>
                <Link to="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
                  Já tenho conta
                </Link>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Free sem cartão · Cancele quando quiser · Garantia de 7 dias
              </p>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-8">
                {[
                  { n: '2.375', l: 'questões' },
                  { n: '6', l: 'disciplinas' },
                  { n: '3', l: 'planos' },
                ].map((s) => (
                  <div key={s.l}>
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {s.l}
                    </dt>
                    <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{s.n}</dd>
                  </div>
                ))}
              </dl>
            </FadeIn>
          </div>
        </section>

        <section id="metodo" className="scroll-mt-20 border-b border-border py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">Método</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              Três passos objetivos
            </h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {[
                {
                  n: '01',
                  t: 'Escolha o plano',
                  d: 'Free para validar o ritmo. Pro para cobrir o edital. Premium com IA nas fontes.',
                },
                {
                  n: '02',
                  t: 'Pratique no banco',
                  d: 'Sessões guiadas, filtros por disciplina e simulados no formato da prova.',
                },
                {
                  n: '03',
                  t: 'Revise e avance',
                  d: 'Fila de erros, mapa de domínio e metas apontam o próximo bloco.',
                },
              ].map((row) => (
                <li key={row.n} className="border-t border-border pt-5">
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {row.n}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold">{row.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{row.d}</p>
                </li>
              ))}
            </ol>

            <p className="mt-14 text-xs font-semibold tracking-wide text-primary uppercase">
              Edital
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold">Seis disciplinas</h2>
            <ul className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                'Legislação',
                'Tecnologia da Informação',
                'História e Geografia de Araguaína',
                'Informática',
                'Língua Portuguesa',
                'Raciocínio Lógico e Matemático',
              ].map((name, i) => (
                <li
                  key={name}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
                >
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm font-medium">{name}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="amostra" className="scroll-mt-20 border-b border-border py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-semibold tracking-wide text-primary uppercase">
                  Produto
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                  Uma questão do banco
                </h2>
                <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-muted-foreground">
                  Experimente o fluxo de resposta. No painel, cada tentativa atualiza revisão,
                  domínio e metas — com resolução bem formatada.
                </p>
              </div>
              <DemoQuestion />
            </div>
          </div>
        </section>

        <section id="planos" className="scroll-mt-20 border-b border-border py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">Assinatura</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              Três planos
            </h2>
            <p className="mt-3 max-w-[52ch] text-base text-muted-foreground">
              Conta nova nasce pelo plano escolhido. Se você já assinou, use Entrar.
            </p>
            <ul className="mt-10 grid gap-4 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <li
                  key={plan.id}
                  className={cn(
                    'flex flex-col rounded-2xl border bg-card p-5 md:p-6',
                    plan.featured ? 'border-primary shadow-sm' : 'border-border',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                    {plan.featured ? (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                        Recomendado
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {plan.description}
                  </p>
                  <p className="mt-4 font-display text-3xl font-semibold tabular-nums">
                    {plan.priceLabel}
                    <span className="ml-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {plan.priceNote}
                    </span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                        <span className="text-primary" aria-hidden>
                          —
                        </span>
                        <span className="text-pretty">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={planHref(plan.id)}
                    className={cn(
                      buttonVariants({
                        variant: plan.featured ? 'default' : 'outline',
                        size: 'lg',
                      }),
                      'mt-6 w-full',
                    )}
                  >
                    {plan.cta}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-b border-border py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">FAQ</p>
            <h2 className="mt-2 font-display text-3xl font-semibold">Perguntas frequentes</h2>
            <dl className="mt-10 divide-y divide-border border-y border-border">
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
                <div key={item.q} className="grid gap-2 py-6 md:grid-cols-12 md:gap-8">
                  <dt className="font-medium md:col-span-5">{item.q}</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground md:col-span-7">
                    {item.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="rounded-2xl border border-border bg-secondary/60 px-6 py-10 md:px-12 md:py-14">
              <h2 className="max-w-[16ch] font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Escolha o plano e feche o edital
              </h2>
              <p className="mt-4 max-w-[48ch] text-base text-muted-foreground">
                Free sem cartão. Pro e Premium com cancelamento livre e garantia de 7 dias.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#planos" className={cn(buttonVariants({ size: 'lg' }))}>
                  Ver planos
                </a>
                <Link to="/login" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
                  Entrar
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 md:flex-row md:items-start md:justify-between md:px-8">
          <div>
            <BrandLogo size="sm" compact className="h-11" />
            <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-muted-foreground">
              {BRAND_TAGLINE}. Preparação com banco oficial, métricas e revisão inteligente.
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
            <a href="#planos" className="inline-flex min-h-11 items-center hover:text-foreground">
              Planos
            </a>
            <Link to="/login" className="inline-flex min-h-11 items-center hover:text-foreground">
              Entrar
            </Link>
            <Link to="/privacidade" className="inline-flex min-h-11 items-center hover:text-foreground">
              Privacidade
            </Link>
            <Link to="/termos" className="inline-flex min-h-11 items-center hover:text-foreground">
              Termos
            </Link>
          </nav>
        </div>
        <p className="mx-auto mt-10 max-w-6xl px-4 text-xs tracking-wide text-muted-foreground uppercase md:px-8">
          © {new Date().getFullYear()} {BRAND_NAME}
        </p>
      </footer>
    </div>
  )
}
