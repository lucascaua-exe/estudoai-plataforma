import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/lib/auth-store'

/** Em produção (Netlify): VITE_API_URL=https://seu-backend.onrender.com */
function apiBaseURL(): string {
  const root = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '')
  return root ? `${root}/api` : '/api'
}

const api = axios.create({
  baseURL: apiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().access
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = useAuthStore.getState().refresh
  if (!refresh) return null

  try {
    const { data } = await axios.post(`${apiBaseURL()}/auth/refresh/`, { refresh })
    useAuthStore.getState().setTokens(data.access, data.refresh)
    return data.access as string
  } catch {
    useAuthStore.getState().logout()
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status === 401 && original && !original._retry) {
      const url = original.url || ''
      if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) {
        return Promise.reject(error)
      }

      original._retry = true

      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }

      const newToken = await refreshPromise
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }

      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)

export default api
