export type PlanId = 'free' | 'pro' | 'premium'

export interface Plan {
  id: PlanId
  name: string
  priceLabel: string
  priceNote: string
  description: string
  cta: string
  featured?: boolean
  features: string[]
  limits: string[]
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    priceLabel: 'R$ 0',
    priceNote: 'para sempre',
    description: 'Comece a estudar hoje e valide o método sem cartão.',
    cta: 'Começar grátis',
    features: [
      'Até 30 questões por dia do banco oficial',
      '1 simulado por mês',
      'Dashboard com progresso do dia',
      'Registro de erros recentes',
    ],
    limits: [
      'Sem Assistente IA',
      'Sem mapa de domínio completo',
      'Sem relatórios avançados',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceLabel: 'R$ 29,90',
    priceNote: 'por mês',
    description: 'O plano para quem quer cobrir o edital com ritmo e métricas.',
    cta: 'Assinar Pro',
    featured: true,
    features: [
      'Banco completo com mais de 2.300 questões',
      'Simulados ilimitados por disciplina',
      'Revisão inteligente e fila de erros',
      'Mapa de conhecimento e conteúdos dominados',
      'Metas diárias, evolução e relatórios',
    ],
    limits: ['Assistente IA limitado a 10 perguntas por mês'],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceLabel: 'R$ 59,90',
    priceNote: 'por mês',
    description: 'Máximo suporte com IA treinada no material do seu concurso.',
    cta: 'Assinar Premium',
    features: [
      'Tudo do Pro, sem teto de uso',
      'Assistente IA ilimitado com fontes do edital',
      'Sessões de estudo priorizadas por lacuna',
      'Exportação de relatórios para revisão offline',
      'Suporte prioritário em até 1 dia útil',
    ],
    limits: [],
  },
]
