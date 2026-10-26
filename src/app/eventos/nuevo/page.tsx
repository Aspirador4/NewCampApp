import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { CreateEventForm } from '@/components/CreateEventForm'
import { ArrowLeft } from 'lucide-react'
import { getActiveClub } from '@/utils/club'

export default async function NuevoEventoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { club, isApproved } = await getActiveClub(supabase)

  if (!isApproved) {
    redirect('/')
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Header */}
      <div className="flex items-center gap-2 pt-2 pb-4 border-b-2 border-neutral-900/10">
        <Link
          href="/eventos"
          className="p-2 -ml-1 rounded-xl text-neutral-800 hover:bg-neutral-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          aria-label="Volver al listado de eventos"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </Link>
        <div>
          <h1 className="font-display font-black text-2xl text-neutral-950 uppercase tracking-tight leading-none">
            Convocar Evento
          </h1>
          <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
            {club.name} • Nueva Convocatoria
          </p>
        </div>
      </div>

      {/* Form */}
      <CreateEventForm />
    </div>
  )
}
