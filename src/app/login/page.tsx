import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { LoginForm } from '@/components/LoginForm'
import { Flame } from 'lucide-react'

interface LoginPageProps {
  searchParams: Promise<{
    error?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If already authenticated, redirect to home
  if (user) {
    redirect('/')
  }

  return (
    <div className="flex-1 flex flex-col justify-between p-6">
      {/* Top Branding */}
      <div className="pt-8 text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-neutral-950 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center text-emerald-400 mx-auto shadow-tactile mb-4">
          <Flame className="w-9 h-9 fill-current" />
        </div>
        <h1 className="font-display font-bold text-3xl uppercase tracking-tight text-neutral-950 dark:text-white leading-tight">
          Club Deportivo
        </h1>
        <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wider max-w-xs mx-auto">
          Portal Oficial de Acceso para Socios y Jugadores
        </p>
      </div>

      {/* Login Card Form */}
      <div className="my-auto py-6">
        <div className="bg-white dark:bg-[#14161f] rounded-3xl p-6 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile">
          <LoginForm initialError={error} />
        </div>
      </div>

      {/* Footer Info */}
      <div className="pb-4 text-center">
        <p className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
          Autenticación Rápida y Segura • Acceso Exclusivo
        </p>
      </div>
    </div>
  )
}
