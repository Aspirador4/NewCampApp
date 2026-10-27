import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { EditEventForm } from '@/components/EditEventForm'
import { ArrowLeft } from 'lucide-react'
import { getActiveClub } from '@/utils/club'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditarEventoPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/eventos/${id}/editar`)
  }

  const { club, isAdmin, isApproved } = await getActiveClub(supabase)

  if (!isApproved) {
    redirect('/')
  }

  // Fetch event
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select(`
      id,
      club_id,
      created_by,
      title,
      description,
      event_type,
      gender_category,
      start_time,
      location,
      max_capacity,
      total_cost,
      cost_per_player,
      custom_fields,
      status
    `)
    .eq('id', id)
    .single()

  if (eventErr || !event) {
    notFound()
  }

  const isCreator = event.created_by === user.id

  // Only club admins or event creator can edit
  if (!isAdmin && !isCreator) {
    redirect(`/eventos/${id}`)
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Header */}
      <div className="flex items-center gap-2 pt-2 pb-4 border-b-2 border-neutral-900/10 dark:border-white/10">
        <Link
          href={`/eventos/${id}`}
          className="p-2 -ml-1 rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          aria-label="Volver al detalle del evento"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </Link>
        <div>
          <h1 className="font-display font-bold text-2xl text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
            Editar Convocatoria
          </h1>
          <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5 truncate max-w-xs">
            {club.name} • {event.title}
          </p>
        </div>
      </div>

      {/* Form */}
      <EditEventForm
        event={{
          id: event.id,
          title: event.title,
          description: event.description,
          event_type: event.event_type,
          gender_category: (event.gender_category as 'mixto' | 'masculino' | 'femenino') || 'mixto',
          start_time: event.start_time,
          location: event.location,
          max_capacity: event.max_capacity,
          total_cost: event.total_cost,
          cost_per_player: event.cost_per_player,
          custom_fields: event.custom_fields as Record<string, string> | null,
        }}
      />
    </div>
  )
}
