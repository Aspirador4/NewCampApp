import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Plus, Calendar, MapPin, Users, ChevronRight, CheckCircle2, Clock, CircleDollarSign, User } from 'lucide-react'
import { EventType, GenderCategory } from '@/types/database.types'

interface AttendeeSummary {
  id: string
  user_id: string
  status: string
  registered_at: string
}

interface GuestSummary {
  id: string
  status: string
}

interface EventWithAttendees {
  id: string
  title: string
  description: string | null
  event_type: EventType
  gender_category?: GenderCategory | null
  start_time: string
  location: string
  max_capacity: number | null
  cost_per_player: number
  total_cost: number | null
  status: string
  financial_closed?: boolean | null
  event_attendees: AttendeeSummary[] | null
  event_guests: GuestSummary[] | null
  creator?: {
    id: string
    full_name: string
    avatar_url: string | null
    system_role: string
  } | null
}

interface EventosPageProps {
  searchParams: Promise<{
    tipo?: string
    filtro?: string
  }>
}

export default async function EventosPage({ searchParams }: EventosPageProps) {
  const { tipo, filtro = 'proximos' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('system_role, approval_status')
      .eq('id', user.id)
      .single()

    if (prof?.approval_status !== 'aprobado') {
      redirect('/')
    }
    isAdmin = prof?.system_role === 'admin'
  }

  // Count pending financial closures
  const { count: pendingClosureCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'finalizado')
    .eq('financial_closed', false)

  // Fetch events
  let query = supabase
    .from('events')
    .select(`
      *,
      creator:created_by (
        id,
        full_name,
        avatar_url,
        system_role
      ),
      event_attendees (
        id,
        user_id,
        status,
        registered_at
      ),
      event_guests (
        id,
        status
      )
    `)
    .order('start_time', { ascending: filtro === 'finalizados' || filtro === 'pendientes_cierre' ? false : true })

  if (filtro === 'finalizados') {
    query = query.eq('status', 'finalizado')
  } else if (filtro === 'pendientes') {
    query = query.eq('status', 'pendiente_aprobacion')
  } else if (filtro === 'pendientes_cierre') {
    query = query.eq('status', 'finalizado').eq('financial_closed', false)
  } else {
    query = query.in('status', ['convocado', 'en_curso'])
  }

  if (tipo && tipo !== 'todos') {
    query = query.eq('event_type', tipo as EventType)
  }

  const { data: rawEvents } = await query
  const events = (rawEvents || []) as unknown as EventWithAttendees[]

  const formatEventDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="flex-1 flex flex-col p-5 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="font-extrabold text-xl text-neutral-900 leading-tight">
            Eventos & Partidos
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            Convocatorias oficiales del club
          </p>
        </div>

        <Link
          href="/eventos/nuevo"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Crear</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 my-3.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
        <Link
          href={`/eventos?filtro=proximos${tipo ? `&tipo=${tipo}` : ''}`}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap transition ${
            filtro === 'proximos'
              ? 'bg-neutral-900 text-white'
              : 'bg-white text-neutral-600 border border-neutral-200'
          }`}
        >
          Próximos
        </Link>
        <Link
          href={`/eventos?filtro=finalizados${tipo ? `&tipo=${tipo}` : ''}`}
          className={`px-3 py-1.5 rounded-full whitespace-nowrap transition ${
            filtro === 'finalizados'
              ? 'bg-neutral-900 text-white'
              : 'bg-white text-neutral-600 border border-neutral-200'
          }`}
        >
          Finalizados
        </Link>
        {isAdmin && pendingClosureCount && pendingClosureCount > 0 && (
          <Link
            href={`/eventos?filtro=pendientes_cierre${tipo ? `&tipo=${tipo}` : ''}`}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition flex items-center gap-1.5 ${
              filtro === 'pendientes_cierre'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 text-amber-900 border border-amber-300 font-semibold'
            }`}
          >
            <span>⚠️ Cierre Pendiente</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
              {pendingClosureCount}
            </span>
          </Link>
        )}
        {isAdmin && (
          <Link
            href={`/eventos?filtro=pendientes${tipo ? `&tipo=${tipo}` : ''}`}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition flex items-center gap-1.5 ${
              filtro === 'pendientes'
                ? 'bg-amber-500 text-white font-bold'
                : 'bg-white text-amber-700 border border-amber-300'
            }`}
          >
            <span>Por Aprobar</span>
          </Link>
        )}
      </div>

      {/* Type Filter Chips */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 text-[11px] font-medium no-scrollbar">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'partido', label: '⚽ Partidos' },
          { key: 'entrenamiento', label: '🏃 Entrenamientos' },
          { key: 'otro', label: '✨ Otros' },
        ].map((item) => {
          const isActive = (!tipo && item.key === 'todos') || tipo === item.key
          return (
            <Link
              key={item.key}
              href={`/eventos?filtro=${filtro}&tipo=${item.key}`}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
                isActive
                  ? 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Events List */}
      <div className="space-y-3.5">
        {events.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-neutral-200/80 shadow-sm text-center">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-neutral-800">
              No hay eventos convocados
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              Presiona &quot;+ Crear&quot; arriba para convocar el próximo partido o evento.
            </p>
          </div>
        ) : (
          events.map((event) => {
            const attendees = event.event_attendees || []
            const guests = event.event_guests || []
            const confirmedAttendeesCount = attendees.filter((a) => a.status === 'confirmado').length
            const approvedGuestsCount = guests.filter((g) => g.status === 'aprobado').length
            const totalConfirmed = confirmedAttendeesCount + approvedGuestsCount
            const waitlistCount = attendees.filter((a) => a.status === 'lista_espera').length

            // Check if current user is registered
            const userAttendee = user
              ? attendees.find((a) => a.user_id === user.id)
              : null
            const userStatus = userAttendee?.status

            const maxCap = event.max_capacity
            const isFull = maxCap ? totalConfirmed >= maxCap : false
            const percentFilled = maxCap ? Math.min(100, (totalConfirmed / maxCap) * 100) : 0

            return (
              <Link
                key={event.id}
                href={`/eventos/${event.id}`}
                className="block bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-sm hover:border-emerald-500 transition active:scale-[0.99]"
              >
                {/* Card Top: Type & Status */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 tracking-wider">
                      {event.event_type === 'partido'
                        ? '⚽ Partido'
                        : event.event_type === 'entrenamiento'
                        ? '🏃 Entrenamiento'
                        : '✨ ' + event.event_type}
                    </span>

                    {event.gender_category && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                        event.gender_category === 'femenino'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : event.gender_category === 'masculino'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {event.gender_category === 'femenino' ? '👩 Femenino' : event.gender_category === 'masculino' ? '👨 Masculino' : '👫 Mixto'}
                      </span>
                    )}

                    {(Boolean(event.total_cost && event.total_cost > 0) || Boolean(event.cost_per_player && event.cost_per_player > 0)) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 inline-flex items-center gap-1">
                        <CircleDollarSign className="w-3 h-3 text-emerald-600" />
                        {event.total_cost && event.total_cost > 0 ? (
                          <span>
                            ~${Math.round(event.total_cost / (event.max_capacity || 14)).toLocaleString('es-CL')} p/p
                          </span>
                        ) : (
                          <span>${event.cost_per_player.toLocaleString('es-CL')} p/p</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {event.status === 'pendiente_aprobacion' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                        Por Aprobar
                      </span>
                    )}
                    {event.status === 'finalizado' && !event.financial_closed && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <span>⚠️ Cierre Pendiente</span>
                      </span>
                    )}
                    {event.status === 'finalizado' && event.financial_closed && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-700">
                        Finalizado ✓
                      </span>
                    )}
                    {event.status === 'convocado' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Convocatoria Abierta
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Title */}
                <h2 className="text-base font-bold text-neutral-900 leading-snug">
                  {event.title}
                </h2>

                {/* Date and Location */}
                <div className="mt-2.5 space-y-1 text-xs text-neutral-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="font-medium capitalize">{formatEventDate(event.start_time)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>

                  {event.creator && (
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 pt-0.5">
                      <User className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                      <span>
                        Convocado por <strong className="text-neutral-700 font-semibold">{event.creator.full_name}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Capacity Bar */}
                <div className="mt-3.5 pt-3 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-neutral-700">
                      <Users className="w-3.5 h-3.5 text-neutral-500" />
                      <span>
                        {maxCap ? `${totalConfirmed} / ${maxCap} cupos` : `${totalConfirmed} confirmados`}
                      </span>
                    </div>

                    {waitlistCount > 0 && (
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                        +{waitlistCount} en espera
                      </span>
                    )}
                  </div>

                  {maxCap && (
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFull ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Bottom User Status / CTA */}
                <div className="mt-3 flex items-center justify-between pt-2">
                  {userStatus === 'confirmado' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Estás confirmado
                    </span>
                  ) : userStatus === 'lista_espera' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
                      <Clock className="w-3 h-3 text-amber-600" />
                      En lista de espera
                    </span>
                  ) : (
                    <span className="text-[11px] text-neutral-400 font-medium">
                      Toca para inscribirte
                    </span>
                  )}

                  <div className="flex items-center gap-1 text-xs font-semibold text-neutral-700">
                    <span>Ver detalle</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
