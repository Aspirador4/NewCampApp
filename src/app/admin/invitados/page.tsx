import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { EventGuestsSection, EventGuestItem } from '@/components/EventGuestsSection'
import { ArrowLeft, ShieldCheck, Calendar, MapPin } from 'lucide-react'

interface EventSummary {
  id: string
  title: string
  start_time: string
  location: string
  max_capacity: number | null
}

export default async function AdminInvitadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/admin/invitados')
  }

  // Check admin privileges
  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'admin') {
    redirect('/eventos')
  }

  // Fetch all pending guests across upcoming events
  const { data: pendingGuestsRaw } = await supabase
    .from('event_guests')
    .select(`
      id,
      event_id,
      invited_by_user_id,
      guest_name,
      guest_contact,
      status,
      created_at,
      events (
        id,
        title,
        start_time,
        location,
        max_capacity
      ),
      inviter:invited_by_user_id (
        full_name
      )
    `)
    .eq('status', 'pendiente_aprobacion')
    .order('created_at', { ascending: false })

  const pendingList = pendingGuestsRaw || []

  // Group by event
  const eventsMap = new Map<string, { event: EventSummary; guests: EventGuestItem[] }>()

  for (const item of pendingList) {
    const eventObj = item.events as unknown as EventSummary | null
    if (!eventObj) continue

    if (!eventsMap.has(eventObj.id)) {
      eventsMap.set(eventObj.id, {
        event: eventObj,
        guests: [],
      })
    }

    eventsMap.get(eventObj.id)!.guests.push({
      id: item.id,
      event_id: item.event_id,
      invited_by_user_id: item.invited_by_user_id,
      guest_name: item.guest_name,
      guest_contact: item.guest_contact,
      status: 'pendiente_aprobacion',
      created_at: item.created_at,
      inviter: item.inviter,
    })
  }

  return (
    <div className="flex-1 flex flex-col p-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <Link
            href="/eventos"
            className="p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-extrabold text-lg text-neutral-900 leading-tight">
              Moderación de Invitados
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              Panel Administrativo
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
          {pendingList.length} pendientes
        </span>
      </div>

      {/* Main Content */}
      <div className="mt-4 space-y-6">
        {eventsMap.size === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-neutral-200/80 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">
              ¡Al día! No hay invitados pendientes
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Todas las postulaciones de invitados externos han sido procesadas.
            </p>
          </div>
        ) : (
          Array.from(eventsMap.values()).map(({ event, guests }) => (
            <div
              key={event.id}
              className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm space-y-3"
            >
              <div className="border-b border-neutral-100 pb-2">
                <Link
                  href={`/eventos/${event.id}`}
                  className="font-bold text-sm text-neutral-900 hover:text-emerald-600 transition"
                >
                  {event.title}
                </Link>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-neutral-400" />
                    <span>
                      {new Date(event.start_time).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-neutral-400" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
              </div>

              <EventGuestsSection
                eventId={event.id}
                guests={guests}
                currentUserId={user.id}
                isAdmin={true}
                eventClosed={false}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}
