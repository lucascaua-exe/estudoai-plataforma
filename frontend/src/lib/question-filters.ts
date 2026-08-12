import type { QuestionFilters } from '@/lib/types'

const FILTER_KEYS = [
  'disciplina',
  'assunto',
  'assuntos',
  'excluir_assuntos',
  'dificuldade',
  'banca',
  'status',
] as const

export function filtersFromSearchParams(params: URLSearchParams): QuestionFilters {
  const out: QuestionFilters = {}
  for (const key of FILTER_KEYS) {
    const v = params.get(key)
    if (v) out[key] = v
  }
  if (!out.status) out.status = 'nao_acertadas'
  return out
}

export function filtersFromState(
  state: { filters?: QuestionFilters } | null | undefined,
): QuestionFilters {
  const f = state?.filters
  if (!f) return { status: 'nao_acertadas' }
  const out: QuestionFilters = {}
  for (const key of FILTER_KEYS) {
    const v = f[key]
    if (v != null && String(v).trim() !== '') out[key] = String(v)
  }
  if (!out.status) out.status = 'nao_acertadas'
  return out
}

/** Preferência: state da navegação; senão querystring da URL. */
export function resolveQuestionFilters(
  state: { filters?: QuestionFilters } | null | undefined,
  search: string,
): QuestionFilters {
  if (state?.filters && Object.keys(state.filters).length) {
    return filtersFromState(state)
  }
  return filtersFromSearchParams(new URLSearchParams(search))
}

export function filtersToSearchParams(filters: QuestionFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const v = filters[key]
    if (v != null && String(v).trim() !== '' && v !== 'todas') {
      params.set(key, String(v))
    }
  }
  return params
}

export function solvePath(id: number | string, filters: QuestionFilters) {
  const qs = filtersToSearchParams(filters).toString()
  return qs ? `/questoes/${id}?${qs}` : `/questoes/${id}`
}

export function cleanApiFilters(filters: QuestionFilters): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(filters)) {
    if (v == null || String(v).trim() === '' || v === 'todas') continue
    out[k] = String(v)
  }
  if (!out.status) out.status = 'nao_acertadas'
  return out
}
