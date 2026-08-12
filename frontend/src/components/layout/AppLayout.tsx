import { useState } from 'react'

import { Outlet, useNavigate } from 'react-router-dom'

import { LogOut, Menu } from 'lucide-react'

import { Sidebar } from '@/components/layout/Sidebar'

import { Button } from '@/components/ui/button'

import { useAuthStore } from '@/lib/auth-store'



export function AppLayout() {

  const [open, setOpen] = useState(false)

  const logout = useAuthStore((s) => s.logout)

  const navigate = useNavigate()



  const handleLogout = () => {

    logout()

    navigate('/login')

  }



  return (

    <div className="flex min-h-screen bg-background">

      <a href="#conteudo-principal" className="skip-link">

        Ir para o conteúdo principal

      </a>

      <Sidebar open={open} onClose={() => setOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">

        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur lg:hidden">

          <button

            type="button"

            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

            onClick={() => setOpen(true)}

            aria-label="Abrir menu"

            aria-expanded={open}

            aria-controls="app-sidebar"

          >

            <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden />

          </button>

          <span translate="no" className="font-brand text-lg text-primary">
            EstudoAI
          </span>

          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">

            <LogOut className="h-4 w-4" aria-hidden />

          </Button>

        </header>

        <main id="conteudo-principal" className="flex-1 px-4 py-6 md:px-8 md:py-8" tabIndex={-1}>

          <div className="mx-auto w-full max-w-6xl">

            <Outlet />

          </div>

        </main>

      </div>

    </div>

  )

}


