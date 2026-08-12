import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

interface AuthState {
  user: User | null
  access: string | null
  refresh: string | null
  setAuth: (payload: { user: User; access: string; refresh: string }) => void
  setUser: (user: User) => void
  setTokens: (access: string, refresh?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access: null,
      refresh: null,
      setAuth: ({ user, access, refresh }) => set({ user, access, refresh }),
      setUser: (user) => set({ user }),
      setTokens: (access, refresh) =>
        set((state) => ({
          access,
          refresh: refresh ?? state.refresh,
        })),
      logout: () => set({ user: null, access: null, refresh: null }),
    }),
    {
      name: 'estudoai-auth',
      partialize: (state) => ({
        user: state.user,
        access: state.access,
        refresh: state.refresh,
      }),
    },
  ),
)
