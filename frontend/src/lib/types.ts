export interface User {
  id: number
  name: string
  email: string
  tema?: string
  pontos?: number
  sequencia_dias?: number
  meta_questoes_dia?: number
  concurso_alvo?: string
  cargo_alvo?: string
  data_prova?: string | null
  data_cadastro?: string
  plano?: 'free' | 'pro' | 'premium'
  assinatura_status?: 'active' | 'canceling' | 'canceled'
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Alternativa {
  id: number
  letra: string
  texto: string
  correta?: boolean
}

export interface QuestaoFonte {
  documento: string | null
  pagina: number | null
  disciplina: string | null
  assunto: string | null
  origem: string
  banca?: string | null
}

export interface Questao {
  id: number
  numero_origem?: number
  enunciado: string
  dificuldade: string
  origem: string
  banca?: string
  pagina?: number
  disciplina?: number
  disciplina_nome?: string
  assunto?: number
  assunto_nome?: string
  documento_nome?: string
  respondida?: boolean
  acertou?: boolean | null
  favorita?: boolean
  marcar_revisao?: boolean
  gabarito?: string
  explicacao?: string
  trecho_referencia?: string
  alternativas?: Alternativa[]
  fonte?: QuestaoFonte
  imagem_url?: string | null
  vezes_erro?: number
  ponto_atencao?: boolean
}

export interface AnswerResult {
  correta: boolean
  letra_escolhida: string
  gabarito: string
  explicacao: string
  alternativas: Alternativa[]
  fonte: QuestaoFonte
  tentativa_id?: number
  proxima_id?: number | null
}

export interface QuestionFilters {
  disciplina?: string
  assunto?: string
  assuntos?: string
  excluir_assuntos?: string
  dificuldade?: string
  banca?: string
  status?: string
}

export interface DashboardData {
  questoes_respondidas: number
  questoes_acertadas: number
  questoes_erradas: number
  percentual_acerto: number
  pontuacao_total: number
  dias_estudo: number
  sequencia_atual: number
  tempo_total_segundos: number
  dominios_confirmados: number
  pontos_atencao: number
  evolucao_semana: number
  revisao_recomendada: {
    disciplina: string
    assunto: string
    percentual: number
    nivel: string
  } | null
  total_questoes_banco: number
  questoes_nao_respondidas?: number
  meta_questoes_dia: number
  questoes_hoje: number
  evolucao_diaria?: {
    data: string
    total: number
    acertos: number
    erros: number
    percentual: number
  }[]
  por_disciplina?: {
    id: number
    nome: string
    total: number
    acertos: number
    erros: number
    percentual: number
  }[]
  banco_por_disciplina?: { id: number; nome: string; questoes: number }[]
  distribuicao_dificuldade?: {
    dificuldade: string
    total: number
    acertos: number
    percentual: number
  }[]
}

export interface DisciplinaCatalog {
  id: number
  nome: string
  assuntos: { id: number; nome: string }[]
}

export interface ReviewItem {
  assunto_id: number
  assunto: string
  disciplina: string
  percentual: number
  total: number
  nivel: string
}

export interface ReviewRecommended {
  prioridade_alta: ReviewItem[]
  prioridade_media: ReviewItem[]
  prioridade_baixa: ReviewItem[]
  erros_recentes: { questao_id: number; assunto: string | null }[]
}

export interface MasteryItem {
  id: number
  disciplina: string
  assunto: string
  assunto_id: number
  percentual_acerto: number
  total_questoes: number
  ultima_revisao: string | null
  data_confirmacao: string | null
  dominio_declarado: boolean
  dominio_comprovado: boolean
  nivel: string
}

export interface KnowledgeMapDiscipline {
  id: number
  nome: string
  assuntos: {
    id: number
    nome: string
    nivel: string
    percentual_acerto: number
    total_respostas: number
    dominio_declarado: boolean
    dominio_comprovado: boolean
  }[]
}

export interface EvolutionData {
  evolucao_diaria: {
    data: string
    total: number
    acertos: number
    percentual: number
  }[]
  por_disciplina: {
    id: number
    nome: string
    total: number
    acertos: number
    percentual: number
  }[]
}

export interface Simulado {
  id: number
  titulo: string
  status: 'rascunho' | 'em_andamento' | 'finalizado' | string
  quantidade: number
  filtros: Record<string, unknown>
  iniciado_em: string | null
  finalizado_em: string | null
  tempo_usado_segundos: number
  total_acertos: number
  total_erros: number
  percentual: number
  resultado: Record<string, unknown>
  created_at: string
}

export interface SimuladoStartResponse {
  simulado: Simulado
  itens: {
    ordem: number
    questao: Questao
    letra_escolhida: string
  }[]
}

export interface SimuladoResult {
  nota?: number
  percentual: number
  total: number
  acertos: number
  erros: number
  tempo_usado_segundos: number
  por_disciplina: { nome: string; total: number; acertos: number; percentual: number }[]
  por_assunto: {
    nome: string
    total: number
    acertos: number
    disciplina: string
    percentual: number
  }[]
  pontos_fortes: string[]
  pontos_fracos: string[]
  recomendacoes: string[]
}

export interface Goals {
  questoes_dia: number
  questoes_semana: number
  horas_estudo: string | number
  percentual_acerto_desejado: number
  disciplinas_prioritarias: unknown[]
  updated_at?: string
  progresso?: {
    questoes_hoje: number
    questoes_semana: number
    meta_dia: number
    meta_semana: number
  }
}

export interface Concurso {
  id?: number
  nome: string
  orgao: string
  cargo: string
  data_prova: string | null
  banca: string
  observacoes: string
  updated_at?: string
}

export interface ChatMessage {
  id?: number
  role: 'user' | 'assistant' | string
  conteudo: string
  fontes?: { documento?: string; pagina?: number | string | null }[]
}

export interface ReportGeral {
  total_questoes: number
  total_acertos: number
  total_erros: number
  percentual_acerto: number
  disciplinas: {
    nome: string
    total: number
    acertos: number
    erros: number
    percentual: number
  }[]
  disciplinas_fortes: { nome: string; percentual: number }[]
  disciplinas_fracas: { nome: string; percentual: number }[]
  assuntos_dominados: { disciplina: string; assunto: string; percentual: number }[]
  assuntos_criticos: { disciplina: string; assunto: string; percentual: number }[]
  questoes_mais_erradas: {
    questao_id: number
    questao__enunciado: string
    vezes: number
  }[]
}

export interface Gamification {
  pontos: number
  sequencia_dias: number
  conquistas: {
    codigo: string
    nome: string
    descricao: string
    pontos: number
    conquistada: boolean
  }[]
}

export interface DocumentItem {
  id: number
  nome: string
  tipo: string
  status: string
  progresso: number
  total_paginas: number
  questoes_extraidas: number
  mensagem_erro: string
}
