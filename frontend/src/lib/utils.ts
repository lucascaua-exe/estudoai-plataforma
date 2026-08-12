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
  /([a-záéíóúâêôãõç])(apenas|quando|quanto|sobre|entre|pelas|pelos|antes|desde|também|independentemente|independente|pessoais|privadas|públicas|empresas|anonimizados|tratamento|controlador|operador|aplica|aplicam|disposições|âmbito|aplicação|alternativa|correta|mediante|exceto|inclusive|qualquer|quaisquer|pessoa|natural|jurídica|território|brasileiro|exterior|coleta|armazenamento|assinale|proteção|informação|informações|possibilidade|possibilita)(?=[a-záéíóúâêôãõç]|$)/gi

/** Corrige texto colado de PDF e evita estouro no mobile. */
export function formatStudyText(text: string | null | undefined) {
  if (!text) return ''
  let out = text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
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
