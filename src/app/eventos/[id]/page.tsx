import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import { EventAttendanceCTA } from '@/components/EventAttendanceCTA'
import { EventAdminControls } from '@/components/EventAdminControls'
import { EventGuestsSection, EventGuestItem } from '@/components/EventGuestsSection'
import { ArrowLeft, Calendar, MapPin, Users, History, Clock, User, UserCheck } from 'lucide-react'

interface AttendeeProfile {
  id: string
  full_name: string
  avatar_url: string | null
  sports_role: string
  custom_attributes: Record<string, string | number | boolean | null>
}

interface AttendeeWithProfile {
  id: string
  event_id: string
  user_id: string
  status: string
  registered_at: string
  profiles: AttendeeProfile | null
}

interface LogWithUser {
  id: string
  action: string
  reason: string | null
  created_at: string
  profiles: {
    full_name: string
  } | null
}

interface EventDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/eventos/${id}`)
  }

  // Fetch event details
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (eventErr || !event) {
    notFound()
  }

  // Check admin
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()
  const isAdmin = userProfile?.system_role === 'admin'

  // Fetch attendees with profile details
  const { data: attendeesRaw } = await supabase
    .from('event_attendees')
    .select(`
      id,
      event_id,
      user_id,
      status,
      registered_at,
      profiles (
        id,
        full_name,
        avatar_url,
        sports_role,
        custom_attributes
      )
    `)
    .eq('event_id', id)
    .order('registered_at', { ascending: true })

  const attendees = (attendeesRaw || []) as unknown as AttendeeWithProfile[]

  // Fetch guests
  const { data: guestsRaw } = await supabase
    .from('event_guests')
    .select(`
      id,
      event_id,
      invited_by_user_id,
      guest_name,
      guest_contact,
      status,
      created_at,
      inviter:invited_by_user_id (
        full_name
      )
    `)
    .eq('event_id', id)
    .order('created_at', { ascending: true })

  const guests = (guestsRaw || []) as unknown as EventGuestItem[]
  const approvedGuests = guests.filter((g) => g.status === 'aprobado')

  // Categorize attendees
  const confirmedAttendees = attendees.filter((a) => a.status === 'confirmado')
  const waitlistAttendees = attendees.filter((a) => a.status === 'lista_espera')

  const totalConfirmedCount = confirmedAttendees.length + approvedGuests.length

  const userAttendee = attendees.find((a) => a.user_id === user.id)
  const userStatus = userAttendee?.status === 'cancelado' ? null : (userAttendee?.status as 'confirmado' | 'lista_espera' | null)

  const waitlistIndex = waitlistAttendees.findIndex((a) => a.user_id === user.id)
  const waitlistPosition = waitlistIndex !== -1 ? waitlistIndex + 1 : undefined

  const maxCap = event.max_capacity
  const isFull = maxCap ? totalConfirmedCount >= maxCap : false
  const eventClosed = event.status === 'finalizado' || event.status === 'cancelado'

  // Fetch attendance audit logs
  const { data: logsRaw } = await supabase
    .from('event_attendance_logs')
    .select(`
      id,
      action,
      reason,
      created_at,
      profiles:user_id (
        full_name
      )
    `)
    .eq('event_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const logs = (logsRaw || []) as unknown as LogWithUser[]

  const formatEventDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatLogAction = (action: string) => {
    switch (action) {
      case 'confirmo':
        return 'confirmó su asistencia'
      case 'bajo':
        return 'se dio de baja'
      case 'entro_espera':
        return 'entró a lista de espera'
      case 'subio_espera':
        return 'ascendió a confirmado'
      case 'solicito_invitado':
        return 'postuló a un invitado'
      case 'invitado_aprobado':
        return 'aprobó un invitado'
      case 'invitado_rechazado':
        return 'rechazó un invitado'
      default:
        return action
    }
  }

  return (
    <div className="flex-1 flex flex-col p-5 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-neutral-200">
        <Link
          href="/eventos"
          className="p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 tracking-wider">
          {event.event_type}
        </span>
      </div>

      {/* Main Info Card */}
      <div className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-extrabold text-neutral-900 leading-tight">
            {event.title}
          </h1>
          <span
            className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${
              event.status === 'convocado'
                ? 'bg-emerald-100 text-emerald-800'
                : event.status === 'en_curso'
                ? 'bg-blue-100 text-blue-800 animate-pulse'
                : 'bg-neutral-200 text-neutral-700'
            }`}
          >
            {event.status === 'convocado' ? 'Abierto' : event.status}
          </span>
        </div>

        <div className="space-y-2 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold text-neutral-900 capitalize">
              {formatEventDate(event.start_time)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium text-neutral-800">{event.location}</span>
          </div>

          {maxCap && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-medium">
                Cupo: {totalConfirmedCount} / {maxCap} jugadores
                {waitlistAttendees.length > 0 && ` (${waitlistAttendees.length} en espera)`}
              </span>
            </div>
          )}
        </div>

        {event.description && (
          <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 whitespace-pre-wrap">
            {event.description}
          </div>
        )}
      </div>

      {/* 1-Click Attendance CTA */}
      <div className="my-2">
        <EventAttendanceCTA
          eventId={event.id}
          userStatus={userStatus}
          isFull={isFull}
          eventClosed={eventClosed}
          waitlistPosition={waitlistPosition}
        />
      </div>

      {/* Admin Controls */}
      {isAdmin && (
        <div className="my-3">
          <EventAdminControls eventId={event.id} currentStatus={event.status} />
        </div>
      )}

      {/* Confirmed Players List (Includes Socios and Approved Guests) */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <span>Jugadores Confirmados</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
              {totalConfirmedCount}{maxCap ? `/${maxCap}` : ''}
            </span>
          </h2>
        </div>

        {totalConfirmedCount === 0 ? (
          <p className="text-xs text-neutral-400 py-3 text-center">
            Aún no hay jugadores confirmados. ¡Sé el primero!
          </p>
        ) : (
          <div className="divide-y divide-neutral-100 bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            {/* Confirmed Socios */}
            {confirmedAttendees.map((attendee, index) => {
              const p = attendee.profiles
              const custom = p?.custom_attributes || {}
              const isCurrentUser = attendee.user_id === user.id

              return (
                <div
                  key={attendee.id}
                  className={`flex items-center justify-between p-3 transition ${
                    isCurrentUser ? 'bg-emerald-50/70' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-neutral-400 w-5 text-center">
                      #{index + 1}
                    </span>

                    <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-200 relative flex items-center justify-center border border-neutral-200">
                      {p?.avatar_url ? (
                        <Image
                          src={p.avatar_url}
                          alt={p.full_name || 'Jugador'}
                          fill
                          className="object-cover"
                          sizes="36px"
                        />
                      ) : (
                        <User className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-neutral-900">
                          {p?.full_name || 'Socio'}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-600 text-white">
                            Tú
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-neutral-500 capitalize">
                        <span>{String(custom.posicion || p?.sports_role || 'Jugador')}</span>
                        {custom.numero_camiseta && (
                          <span className="font-mono font-bold text-emerald-700">
                            #{String(custom.numero_camiseta)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(attendee.registered_at).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )
            })}

            {/* Approved Guests */}
            {approvedGuests.map((guest, index) => (
              <div
                key={guest.id}
                className="flex items-center justify-between p-3 bg-neutral-50/70"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-neutral-400 w-5 text-center">
                    #{confirmedAttendees.length + index + 1}
                  </span>

                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200">
                    <UserCheck className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-neutral-900">
                        {guest.guest_name}
                      </p>
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                        Invitado
                      </span>
                    </div>
                    <p className="text-[10px] text-neutral-500">
                      Invitado por: <span className="font-medium text-neutral-700">{guest.inviter?.full_name || 'Socio'}</span>
                    </p>
                  </div>
                </div>

                <span className="text-[10px] text-neutral-400 font-mono">
                  {new Date(guest.created_at).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Guest Management & Invitation Section */}
      <EventGuestsSection
        eventId={event.id}
        guests={guests}
        currentUserId={user.id}
        isAdmin={isAdmin}
        eventClosed={eventClosed}
      />

      {/* Waitlist Section */}
      {waitlistAttendees.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Lista de Espera</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold">
                {waitlistAttendees.length}
              </span>
            </h2>
          </div>

          <div className="divide-y divide-neutral-100 bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            {waitlistAttendees.map((attendee, index) => {
              const p = attendee.profiles
              const isCurrentUser = attendee.user_id === user.id

              return (
                <div
                  key={attendee.id}
                  className={`flex items-center justify-between p-3 ${
                    isCurrentUser ? 'bg-amber-50/70' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-amber-600 w-5 text-center">
                      #{index + 1}
                    </span>

                    <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 relative flex items-center justify-center border border-neutral-200">
                      {p?.avatar_url ? (
                        <Image
                          src={p.avatar_url}
                          alt={p.full_name || 'Jugador'}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <User className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-neutral-900">
                          {p?.full_name || 'Socio'}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500 text-white">
                            Tú
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-500">
                        Entró a espera {new Date(attendee.registered_at).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Live Audit Log Section */}
      <div className="mt-6 space-y-2.5">
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
          <History className="w-4 h-4 text-neutral-500" />
          <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Auditoría de Asistencias (Logs)
          </h2>
        </div>

        {logs.length === 0 ? (
          <p className="text-[11px] text-neutral-400 italic">
            Sin movimientos registrados aún en este evento.
          </p>
        ) : (
          <div className="bg-neutral-100 rounded-xl p-3 space-y-2">
            {logs.map((log) => {
              const userName = log.profiles?.full_name || 'Un socio'
              const dateStr = new Date(log.created_at).toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <div key={log.id} className="text-[11px] text-neutral-600 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-neutral-900">{userName}</span>{' '}
                    <span>{formatLogAction(log.action)}</span>
                    {log.reason && (
                      <span className="text-neutral-500 italic ml-1">({log.reason})</span>
                    )}
                  </div>
                  <span className="text-neutral-400 text-[10px] whitespace-nowrap">{dateStr}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
