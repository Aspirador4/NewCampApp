import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Plus, Calendar, MapPin, Users, ArrowLeft, Clock, ArrowRight } from 'lucide-react'
import { EventType, GenderCategory } from '@/types/database.types'
import { getActiveClub } from '@/utils/club'
import { EmptyState } from '@/components/EmptyState'
import { NotificationBell } from '@/components/NotificationBell'

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

  // Get active club & permissions
  const { club, isAdmin, isApproved } = await getActiveClub(supabase)

  if (user && !isApproved) {
    redirect('/')
  }

  // Count pending financial closures for this club
  const { count: pendingClosureCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', club.id)
    .eq('status', 'finalizado')
    .eq('financial_closed', false)

  // Fetch events for active club
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
    .eq('club_id', club.id)
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
    const weekday = date.toLocaleDateString('es-AR', { weekday: 'short' }).toUpperCase()
    const day = date.getDate()
    const month = date.toLocaleDateString('es-AR', { month: 'short' }).toUpperCase()
    const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    return { weekday, day, month, time }
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b-2 border-neutral-900/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 -ml-1 rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-2xl text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
              Partidos & Eventos
            </h1>
            <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
              {club.name} • Fixture Oficial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {Boolean(user) && <NotificationBell clubId={club.id} />}
          <Link
            href="/eventos/nuevo"
            className="btn-tactile min-h-[42px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-display font-bold text-xs uppercase tracking-wider border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm"
            style={{ backgroundColor: 'var(--club-primary, #059669)' }}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Convocar</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs (Segmented Locker Navigation) */}
      <div className="flex gap-2 my-3 overflow-x-auto pb-1 text-xs no-scrollbar">
        <Link
          href={`/eventos?filtro=proximos${tipo ? `&tipo=${tipo}` : ''}`}
          className={`btn-tactile min-h-[38px] px-4 py-2 rounded-xl whitespace-nowrap transition flex items-center justify-center font-display uppercase tracking-wider text-xs font-bold border-2 border-neutral-900 dark:border-neutral-700 ${
            filtro === 'proximos'
              ? 'bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-tactile-sm'
              : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          Próximos
        </Link>
        <Link
          href={`/eventos?filtro=finalizados${tipo ? `&tipo=${tipo}` : ''}`}
          className={`btn-tactile min-h-[38px] px-4 py-2 rounded-xl whitespace-nowrap transition flex items-center justify-center font-display uppercase tracking-wider text-xs font-bold border-2 border-neutral-900 dark:border-neutral-700 ${
            filtro === 'finalizados'
              ? 'bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-tactile-sm'
              : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          Historial Finalizados
        </Link>
        {isAdmin && pendingClosureCount && pendingClosureCount > 0 && (
          <Link
            href={`/eventos?filtro=pendientes_cierre${tipo ? `&tipo=${tipo}` : ''}`}
            className={`btn-tactile min-h-[38px] px-3.5 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 font-display uppercase tracking-wider text-xs font-bold border-2 border-neutral-900 dark:border-neutral-700 ${
              filtro === 'pendientes_cierre'
                ? 'bg-amber-400 text-neutral-950 shadow-tactile-sm'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60'
            }`}
          >
            <span>⚠️ Liquidar ({pendingClosureCount})</span>
          </Link>
        )}
        {isAdmin && (
          <Link
            href={`/eventos?filtro=pendientes${tipo ? `&tipo=${tipo}` : ''}`}
            className={`btn-tactile min-h-[38px] px-3.5 py-2 rounded-xl whitespace-nowrap transition flex items-center gap-1.5 font-display uppercase tracking-wider text-xs font-bold border-2 border-neutral-900 dark:border-neutral-700 ${
              filtro === 'pendientes'
                ? 'bg-amber-400 text-neutral-950 shadow-tactile-sm'
                : 'bg-white dark:bg-neutral-900 text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-neutral-800'
            }`}
          >
            <span>Por Aprobar</span>
          </Link>
        )}
      </div>

      {/* Type Filter Pills */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { key: 'todos', label: 'TODOS' },
          { key: 'partido', label: '⚽ PARTIDOS' },
          { key: 'entrenamiento', label: '🏃 ENTRENAMIENTOS' },
          { key: 'otro', label: '✨ OTROS' },
        ].map((item) => {
          const isActive = (!tipo && item.key === 'todos') || tipo === item.key
          return (
            <Link
              key={item.key}
              href={`/eventos?filtro=${filtro}&tipo=${item.key}`}
              className={`btn-tactile min-h-[32px] px-3 py-1 rounded-xl whitespace-nowrap transition flex items-center justify-center font-display font-bold text-xs uppercase tracking-wider border-2 border-neutral-900 dark:border-neutral-700 ${
                isActive
                  ? 'bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 shadow-tactile-sm'
                  : 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Events Feed (Matchday Ticket Stubs) */}
      <div className="space-y-4">
        {events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sin eventos en esta sección"
            description={
              filtro === 'pendientes_cierre'
                ? 'No hay eventos pendientes de liquidación y cierre financiero.'
                : 'No se encontraron convocatorias activas para los filtros seleccionados.'
            }
            action={
              isAdmin && filtro === 'proximos'
                ? { label: '+ Convocar Partido', href: '/eventos/nuevo' }
                : undefined
            }
          />
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
            const percentFilled = maxCap ? Math.min(100, Math.round((totalConfirmed / maxCap) * 100)) : 0
            const { weekday, day, month, time } = formatEventDate(event.start_time)

            return (
              <Link
                key={event.id}
                href={`/eventos/${event.id}`}
                className="btn-tactile block bg-white dark:bg-neutral-900 rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile overflow-hidden relative"
              >
                {/* Perforated notches on sides */}
                <div className="absolute -left-2.5 top-[60%] -translate-y-1/2 w-5 h-5 bg-neutral-50 dark:bg-[#0c0d12] rounded-full border-2 border-neutral-900 dark:border-neutral-700 z-10" />
                <div className="absolute -right-2.5 top-[60%] -translate-y-1/2 w-5 h-5 bg-neutral-50 dark:bg-[#0c0d12] rounded-full border-2 border-neutral-900 dark:border-neutral-700 z-10" />

                {/* Ticket Top Header Bar */}
                <div className="bg-neutral-900 dark:bg-neutral-950 text-white px-4 py-2 flex items-center justify-between border-b-2 border-neutral-900 dark:border-neutral-800">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-emerald-400">
                      {event.status === 'convocado'
                        ? '🟢 ABIERTO'
                        : event.status === 'en_curso'
                        ? '🔴 EN VIVO'
                        : event.status === 'finalizado'
                        ? '🏁 FINALIZADO'
                        : '🟡 POR APROBAR'}
                    </span>
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/10 text-white border border-white/20">
                      {event.event_type}
                    </span>
                    {event.gender_category && (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded bg-white/10 text-neutral-300">
                        {event.gender_category === 'femenino' ? 'Fem' : event.gender_category === 'masculino' ? 'Masc' : 'Mixto'}
                      </span>
                    )}
                  </div>

                  {userStatus === 'confirmado' ? (
                    <span className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-neutral-950">
                      ✓ Anotado
                    </span>
                  ) : userStatus === 'lista_espera' ? (
                    <span className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400 text-neutral-950">
                      En Espera
                    </span>
                  ) : (
                    <span className="font-mono text-[9px] text-neutral-400 uppercase">
                      MATCH #{event.id.slice(0, 4)}
                    </span>
                  )}
                </div>

                {/* Ticket Body */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400 font-mono text-[11px] uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <h2 className="font-display font-bold text-2xl uppercase tracking-tight text-neutral-950 dark:text-white leading-tight mt-0.5">
                      {event.title}
                    </h2>
                  </div>

                  {/* Kickoff and Date Box */}
                  <div className="grid grid-cols-2 gap-2 bg-neutral-100 dark:bg-neutral-800/60 p-2.5 rounded-2xl border border-neutral-300 dark:border-neutral-700">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center font-display font-bold text-sm text-neutral-900 dark:text-neutral-100 shadow-tactile-sm flex-shrink-0">
                        {day}
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase block leading-none">Fecha</span>
                        <span className="font-display font-bold text-xs uppercase text-neutral-900 dark:text-neutral-100 truncate block mt-0.5">{weekday} • {month}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center font-mono font-bold text-xs text-neutral-900 dark:text-neutral-100 shadow-tactile-sm flex-shrink-0">
                        <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase block leading-none">Kickoff</span>
                        <span className="font-mono font-semibold text-xs tracking-wider text-neutral-900 dark:text-neutral-100 truncate block mt-0.5">{time} HRS</span>
                      </div>
                    </div>
                  </div>

                  {/* Cupos Bar */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Cupos</span>
                      </span>
                      <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {totalConfirmed} {maxCap ? `/ ${maxCap}` : ''}
                        {waitlistCount > 0 && (
                          <span className="ml-1 text-amber-700 dark:text-amber-400 font-bold">(+{waitlistCount} espera)</span>
                        )}
                      </span>
                    </div>

                    {maxCap && (
                      <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-2 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percentFilled}%`,
                            backgroundColor: isFull ? '#dc2626' : 'var(--club-primary, #059669)',
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Perforation Line */}
                  <div className="border-b-2 border-dashed border-neutral-300 dark:border-neutral-700 -mx-4 my-2" />

                  {/* Action Strip */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-mono text-[9px] uppercase text-neutral-500 dark:text-neutral-400 block">Cuota Cancha</span>
                      <span className="font-display font-bold text-base text-neutral-950 dark:text-white">
                        {event.total_cost && event.total_cost > 0
                          ? `~$${Math.round(event.total_cost / (maxCap || 14)).toLocaleString('es-CL')}`
                          : event.cost_per_player && event.cost_per_player > 0
                          ? `$${event.cost_per_player.toLocaleString('es-CL')}`
                          : 'Gratis'}
                        <span className="text-[10px] font-sans font-normal text-neutral-500 dark:text-neutral-400 ml-1">p/jugador</span>
                      </span>
                    </div>

                    <div className="btn-tactile bg-neutral-950 dark:bg-neutral-800 text-white font-display text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl border border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center gap-1">
                      <span>Ver Ficha</span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
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
