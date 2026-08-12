import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPercent(value: number | null | undefined, digits = 0) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || seconds < 0) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m} min`
}

export function truncate(text: string, max = 120) {
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}…`
}

const PT_UNGLUE =
  /([a-záéíóúâêôãõç])(apenas|quando|quanto|sobre|entre|pelas|pelos|antes|desde|também|independentemente|independente|pessoais|privadas|públicas|empresas|anonimizados|tratamento|controlador|operador|aplica|aplicam|disposições|âmbito|aplicação|alternativa|correta|mediante|exceto|inclusive|qualquer|quaisquer|pessoa|natural|jurídica|território|brasileiro|exterior|coleta|armazenamento|assinale|proteção|informação|informações|possibilidade|possibilita|gráfica|acentuação)(?=[a-záéíóúâêôãõç]|$)/gi

const PHRASE_FIXES: [RegExp, string][] = [
  [/ACENTUA[CÇ][AÃ]OGR[AÁ]FICA/gi, 'Acentuação Gráfica'],
  [/ENDERE[CÇ]AMENTOIPEROTEAMENTO/gi, 'Endereçamento IP e Roteamento'],
  [/EQUIPAMENTOSDEREDE:?SWITCHESE?/gi, 'Equipamentos de Rede: Switches e'],
  [/GOVERNAN[CÇ]ADETI:?ITILV3\/?V4ECOBIT/gi, 'Governança de TI: ITIL v3/v4 e COBIT'],
  [/NORMASNBRISO27001ENBRISO27002/gi, 'Normas NBR ISO 27001 e NBR ISO 27002'],
  [/TecnologiadaInforma[cç][aã]o/gi, 'Tecnologia da Informação'],
  [/L[ií]nguaPortuguesa/gi, 'Língua Portuguesa'],
  [/Desenvolvimentode\s*Sistemas/gi, 'Desenvolvimento de Sistemas'],
  [/Linguagensde/gi, 'Linguagens de'],
]

/** Corrige texto colado de PDF e evita estouro no mobile. */
export function formatStudyText(text: string | null | undefined) {
  if (!text) return ''
  let out = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
  for (const [pat, repl] of PHRASE_FIXES) {
    out = out.replace(pat, repl)
  }
  out = out.replace(/(\d+\.)([A-Za-zÀ-ú])/g, '$1 $2')
  out = out.replace(/(\d+\.\d+\.)([A-Za-zÀ-ú])/g, '$1 $2')
  out = out.replace(/([a-záéíóúãõâêôç])·([A-ZÁÉÍÓÚÃÕÂÊÔÇ])/g, '$1 · $2')
  out = out.replace(/([a-záéíóúâêôãõç])([A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g, '$1 $2')
  for (let i = 0; i < 4; i++) {
    const next = out.replace(PT_UNGLUE, '$1 $2')
    if (next === out) break
    out = next
  }
  out = out
    .replace(/([a-zç])(aplica-se)\b/gi, '$1 $2')
    .replace(/([a-záéíóúç])(lei)(?=[a-záéíóúç]|$)/gi, '$1 $2')
    .replace(/([a-záéíóúç])(dados)(?=[a-záéíóúç]|$)/gi, '$1 $2')
    .replace(/(dados)(anonimizados)\b/gi, '$1 $2')
    .replace(/(empresas)(privadas|públicas)\b/gi, '$1 $2')
    .replace(/(apenas)(as|os|a|o)\b/gi, '$1 $2')
  return out.replace(/\s{2,}/g, ' ').trim()
}

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro.') {
  if (!error || typeof error !== 'object') return fallback
  const err = error as {
    response?: { data?: Record<string, unknown> | string }
    message?: string
  }
  const data = err.response?.data
  if (typeof data === 'string') return data
  if (data && typeof data === 'object') {
    if (typeof data.detail === 'string') return data.detail
    // DRF field errors: { campo: ["msg"] } ou { campo: "msg" }
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'string' && val.trim()) {
        return key === 'detail' ? val : `${key}: ${val}`
      }
      if (Array.isArray(val) && typeof val[0] === 'string') {
        return key === 'non_field_errors' ? val[0] : `${key}: ${val[0]}`
      }
    }
    const first = Object.values(data)[0]
    if (typeof first === 'string') return first
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
  }
  return err.message || fallback
}

/** Resolve URL de mídia da API (evita apontar para Netlify/Vite em vez do backend). */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null
  const apiRoot = (import.meta.env.VITE_API_URL as string | undefined)
    ?.trim()
    .replace(/\/$/, '')

  let path = url
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url)
      if (parsed.pathname.startsWith('/media/')) {
        path = `${parsed.pathname}${parsed.search}`
      } else {
        return url
      }
    } catch {
      return url
    }
  }

  if (!path.startsWith('/')) path = `/${path}`
  if (apiRoot) return `${apiRoot}${path}`
  return path
}

const DIFF_LABEL: Record<string, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
  nao_informado: 'N/I',
}

/** Variante de Badge para dificuldade: fácil=verde, médio=amarelo, difícil=vermelho */
export function difficultyBadgeVariant(
  dificuldade?: string | null,
): 'easy' | 'medium' | 'hard' | 'outline' {
  const key = (dificuldade || '').toLowerCase()
  if (key === 'facil' || key === 'fácil') return 'easy'
  if (key === 'medio' || key === 'médio') return 'medium'
  if (key === 'dificil' || key === 'difícil') return 'hard'
  return 'outline'
}

export function difficultyLabel(dificuldade?: string | null) {
  if (!dificuldade) return 'N/I'
  return DIFF_LABEL[dificuldade] || DIFF_LABEL[dificuldade.toLowerCase()] || dificuldade
}
