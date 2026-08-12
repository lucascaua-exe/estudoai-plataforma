import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import type {
  AnswerResult,
  ChatMessage,
  Concurso,
  DashboardData,
  DisciplinaCatalog,
  EvolutionData,
  Gamification,
  Goals,
  KnowledgeMapDiscipline,
  MasteryItem,
  Paginated,
  Questao,
  ReportGeral,
  ReviewRecommended,
  Simulado,
  SimuladoResult,
  SimuladoStartResponse,
  User,
} from '@/lib/types'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await api.get<DashboardData>('/dashboard/')).data,
  })
}

export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: async () => (await api.get<DisciplinaCatalog[]>('/catalog/disciplinas/')).data,
  })
}

export function useQuestions(params: Record<string, string | number | undefined>) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  )
  return useQuery({
    queryKey: ['questions', clean],
    queryFn: async () =>
      (await api.get<Paginated<Questao>>('/questions/', { params: clean })).data,
  })
}

export function useQuestionBancas() {
  return useQuery({
    queryKey: ['question-bancas'],
    queryFn: async () => (await api.get<string[]>('/questions/bancas/')).data,
  })
}

export function useNextQuestion() {
  return useMutation({
    mutationFn: async (params: Record<string, string | number | undefined>) => {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
      )
      return (
        await api.get<{ id: number | null; detail?: string }>('/questions/next/', {
          params: clean,
        })
      ).data
    },
  })
}

export function useQuestion(id: string | number | undefined) {
  return useQuery({
    queryKey: ['question', id],
    enabled: !!id,
    queryFn: async () => (await api.get<Questao>(`/questions/${id}/`)).data,
  })
}

export function useAnswerQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      alternativa_id,
      letra,
      tempo_segundos,
      filters,
    }: {
      id: number
      alternativa_id?: number
      letra?: string
      tempo_segundos?: number
      filters?: Record<string, string | number | string[] | undefined>
    }) =>
      (
        await api.post<AnswerResult>(`/questions/${id}/answer/`, {
          alternativa_id,
          letra,
          tempo_segundos,
          filters,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['questions'] })
      qc.invalidateQueries({ queryKey: ['errors'] })
      qc.invalidateQueries({ queryKey: ['evolution'] })
    },
  })
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<{ favorita: boolean }>(`/questions/${id}/favorite/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })
}

export function useToggleReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      (await api.post<{ marcar_revisao: boolean }>(`/questions/${id}/mark-review/`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] })
      qc.invalidateQueries({ queryKey: ['review'] })
    },
  })
}

export function useErrors(params: Record<string, string | undefined> = {}) {
  return useQuery({
    queryKey: ['errors', params],
    queryFn: async () => (await api.get<Questao[]>('/errors/', { params })).data,
  })
}

export function useReviewRecommended() {
  return useQuery({
    queryKey: ['review', 'recommended'],
    queryFn: async () => (await api.get<ReviewRecommended>('/review/recommended/')).data,
  })
}

export function useStartReview() {
  return useMutation({
    mutationFn: async (body?: { por_assunto?: number; max_assuntos?: number }) =>
      (
        await api.post<{
          sessao_id: number
          plano: { disciplina: string; assunto: string; quantidade: number; questao_ids: number[] }[]
          questoes: Questao[]
        }>('/review/start/', body ?? { por_assunto: 5, max_assuntos: 4 })
      ).data,
  })
}

export function useMastery() {
  return useQuery({
    queryKey: ['mastery'],
    queryFn: async () => (await api.get<MasteryItem[]>('/mastery/')).data,
  })
}

export function useDeclareMastery() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (assunto_id: number) =>
      (await api.post('/mastery/', { assunto_id })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mastery'] })
      qc.invalidateQueries({ queryKey: ['knowledge-map'] })
    },
  })
}

export function useKnowledgeMap() {
  return useQuery({
    queryKey: ['knowledge-map'],
    queryFn: async () => (await api.get<KnowledgeMapDiscipline[]>('/knowledge-map/')).data,
  })
}

export function useEvolution(periodo = 30) {
  return useQuery({
    queryKey: ['evolution', periodo],
    queryFn: async () =>
      (await api.get<EvolutionData>('/evolution/', { params: { periodo } })).data,
  })
}

export function useSimulados() {
  return useQuery({
    queryKey: ['simulados'],
    queryFn: async () => (await api.get<Paginated<Simulado>>('/simulados/')).data,
  })
}

export function useCreateSimulado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { titulo: string; quantidade: number; filtros?: Record<string, unknown> }) =>
      (await api.post<Simulado>('/simulados/', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['simulados'] }),
  })
}

export function useStartSimulado() {
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: number
      body?: Record<string, unknown>
    }) => (await api.post<SimuladoStartResponse>(`/simulados/${id}/start/`, body ?? {})).data,
  })
}

export function useAnswerSimulado() {
  return useMutation({
    mutationFn: async ({
      id,
      questao_id,
      letra,
    }: {
      id: number
      questao_id: number
      letra: string
    }) =>
      (await api.post(`/simulados/${id}/answer/`, { questao_id, letra })).data,
  })
}

export function useFinishSimulado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      tempo_usado_segundos,
    }: {
      id: number
      tempo_usado_segundos: number
    }) =>
      (
        await api.post<SimuladoResult>(`/simulados/${id}/finish/`, {
          tempo_usado_segundos,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['simulados'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useSimuladoResult(id: string | undefined) {
  return useQuery({
    queryKey: ['simulado-result', id],
    enabled: !!id,
    queryFn: async () =>
      (
        await api.get<{ simulado: Simulado; resultado: SimuladoResult }>(
          `/simulados/${id}/result/`,
        )
      ).data,
  })
}

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => (await api.get<Goals>('/goals/')).data,
  })
}

export function useUpdateGoals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Goals>) =>
      (await api.patch<Goals>('/goals/', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useConcurso() {
  return useQuery({
    queryKey: ['concurso'],
    queryFn: async () => (await api.get<Concurso>('/concurso/')).data,
  })
}

export function useUpdateConcurso() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Concurso>) =>
      (await api.patch<Concurso>('/concurso/', body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['concurso'] }),
  })
}

export function useReports() {
  return useQuery({
    queryKey: ['reports', 'geral'],
    queryFn: async () => (await api.get<ReportGeral>('/reports/geral/')).data,
  })
}

export function useGamification() {
  return useQuery({
    queryKey: ['gamification'],
    queryFn: async () => (await api.get<Gamification>('/gamification/')).data,
  })
}

export function useAiChat() {
  return useMutation({
    mutationFn: async (body: { message: string; conversation_id?: number }) =>
      (
        await api.post<{
          conversation_id: number
          message: ChatMessage
          ai_enabled: boolean
        }>('/ai/chat/', body)
      ).data,
  })
}

export function useGenerateQuestions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { assunto_id: number; quantidade: number }) =>
      (await api.post<{ questoes: Questao[]; detail?: string }>('/ai/generate-questions/', body))
        .data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['questions'] }),
  })
}

export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser)
  return useMutation({
    mutationFn: async (body: Partial<User>) =>
      (await api.patch<User>('/auth/me/', body)).data,
    onSuccess: (user) => setUser(user),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (body: { current_password: string; new_password: string }) =>
      (await api.post('/auth/change-password/', body)).data,
  })
}

export function useMe() {
  const setUser = useAuthStore((s) => s.setUser)
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = (await api.get<User>('/auth/me/')).data
      setUser(user)
      return user
    },
  })
}
