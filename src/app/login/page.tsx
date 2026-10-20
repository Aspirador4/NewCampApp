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
      <div className="pt-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mx-auto shadow-lg mb-4">
          <Flame className="w-9 h-9" />
        </div>
        <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
          Club Deportivo
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Ingresa a tu cuenta para confirmar asistencias, votar MVP y ver estadísticas
        </p>
      </div>

      {/* Login Card Form */}
      <div className="my-auto py-6">
        <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-sm">
          <LoginForm initialError={error} />
        </div>
      </div>

      {/* Footer Info */}
      <div className="pb-4 text-center">
        <p className="text-xs text-neutral-400">
          Acceso seguro sin contraseña mediante Supabase Auth SSR
        </p>
      </div>
    </div>
  )
}
