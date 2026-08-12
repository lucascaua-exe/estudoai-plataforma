import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/theme-provider'
import { DocumentTitle } from '@/components/DocumentTitle'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Skeleton } from '@/components/ui/skeleton'

const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const PrivacyPage = lazy(() =>
  import('@/pages/LegalPages').then((m) => ({ default: m.PrivacyPage })),
)
const TermsPage = lazy(() =>
  import('@/pages/LegalPages').then((m) => ({ default: m.TermsPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const StudyPage = lazy(() =>
  import('@/pages/StudyPage').then((m) => ({ default: m.StudyPage })),
)
const QuestionsPage = lazy(() =>
  import('@/pages/QuestionsPage').then((m) => ({ default: m.QuestionsPage })),
)
const QuestionSolvePage = lazy(() =>
  import('@/pages/QuestionSolvePage').then((m) => ({ default: m.QuestionSolvePage })),
)
const SimuladosPage = lazy(() =>
  import('@/pages/SimuladosPage').then((m) => ({ default: m.SimuladosPage })),
)
const SimuladoTakePage = lazy(() =>
  import('@/pages/SimuladoTakePage').then((m) => ({ default: m.SimuladoTakePage })),
)
const SimuladoResultPage = lazy(() =>
  import('@/pages/SimuladoResultPage').then((m) => ({ default: m.SimuladoResultPage })),
)
const ReviewPage = lazy(() =>
  import('@/pages/ReviewPage').then((m) => ({ default: m.ReviewPage })),
)
const ErrorsPage = lazy(() =>
  import('@/pages/ErrorsPage').then((m) => ({ default: m.ErrorsPage })),
)
const MasteredPage = lazy(() =>
  import('@/pages/MasteredPage').then((m) => ({ default: m.MasteredPage })),
)
const KnowledgeMapPage = lazy(() =>
  import('@/pages/KnowledgeMapPage').then((m) => ({ default: m.KnowledgeMapPage })),
)
const AssistantPage = lazy(() =>
  import('@/pages/AssistantPage').then((m) => ({ default: m.AssistantPage })),
)
const ReportsPage = lazy(() =>
  import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
const GoalsPage = lazy(() =>
  import('@/pages/GoalsPage').then((m) => ({ default: m.GoalsPage })),
)
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const EvolutionPage = lazy(() =>
  import('@/pages/EvolutionPage').then((m) => ({ default: m.EvolutionPage })),
)
const BillingPlansPage = lazy(() =>
  import('@/pages/BillingPlansPage').then((m) => ({ default: m.BillingPlansPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-8" role="status" aria-live="polite">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <span className="sr-only">Carregando página…</span>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <DocumentTitle />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/privacidade" element={<PrivacyPage />} />
              <Route path="/termos" element={<TermsPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="painel" element={<DashboardPage />} />
                  <Route path="estudar" element={<StudyPage />} />
                  <Route path="questoes" element={<QuestionsPage />} />
                  <Route path="questoes/:id" element={<QuestionSolvePage />} />
                  <Route path="simulados" element={<SimuladosPage />} />
                  <Route path="simulados/:id/realizar" element={<SimuladoTakePage />} />
                  <Route path="simulados/:id/resultado" element={<SimuladoResultPage />} />
                  <Route path="revisao" element={<ReviewPage />} />
                  <Route path="erros" element={<ErrorsPage />} />
                  <Route path="dominados" element={<MasteredPage />} />
                  <Route path="mapa" element={<KnowledgeMapPage />} />
                  <Route path="assistente" element={<AssistantPage />} />
                  <Route path="relatorios" element={<ReportsPage />} />
                  <Route path="metas" element={<GoalsPage />} />
                  <Route path="evolucao" element={<EvolutionPage />} />
                  <Route path="planos" element={<BillingPlansPage />} />
                  <Route path="perfil" element={<ProfilePage />} />
                  <Route path="configuracoes" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster richColors position="top-right" closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
