import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { CreateEventForm } from '@/components/CreateEventForm'
import { ArrowLeft } from 'lucide-react'

export default async function NuevoEventoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex-1 flex flex-col p-5 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2 pb-4 border-b border-neutral-200">
        <Link
          href="/eventos"
          className="p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-extrabold text-lg text-neutral-900 leading-tight">
            Crear Nuevo Evento
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Convoca a los socios del club
          </p>
        </div>
      </div>

      {/* Form */}
      <CreateEventForm />
    </div>
  )
}
