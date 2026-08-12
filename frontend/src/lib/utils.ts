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
