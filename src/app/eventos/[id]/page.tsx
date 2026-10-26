import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import { EventAttendanceCTA } from '@/components/EventAttendanceCTA'
import { EventAdminControls } from '@/components/EventAdminControls'
import { EventGuestsSection, EventGuestItem } from '@/components/EventGuestsSection'
import { MvpVotingSection, MvpCandidate, MvpWinner } from '@/components/MvpVotingSection'
import { EventRealtimeListener } from '@/components/EventRealtimeListener'
import { ShareEventButton } from '@/components/ShareEventButton'
import { AddToCalendarButton } from '@/components/AddToCalendarButton'
import { EventFinancialClosure } from '@/components/EventFinancialClosure'
import { ArrowLeft, Calendar, MapPin, Users, History, Clock, User, UserCheck, CircleDollarSign } from 'lucide-react'

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
    .select(`
      *,
      creator:created_by (
        id,
        full_name,
        avatar_url,
        system_role,
        sports_role
      )
    `)
    .eq('id', id)
    .single()

  if (eventErr || !event) {
    notFound()
  }

  const creator = event.creator as unknown as {
    id: string
    full_name: string
    avatar_url: string | null
    system_role: string
    sports_role: string
  } | null

  // Check profile & approval
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('system_role, approval_status')
    .eq('id', user.id)
    .single()

  if (userProfile?.approval_status !== 'aprobado') {
    redirect('/')
  }

  const isAdmin = userProfile?.system_role === 'admin'
  const isCreator = event.created_by === user.id
  const canManageEvent = isAdmin || isCreator

  // Fetch debts for this event to reflect exact amounts charged per player
  const { data: debtsRaw } = await supabase
    .from('member_debts')
    .select('id, user_id, guest_id, debt_type, amount, status')
    .eq('event_id', id)

  const eventDebts = debtsRaw || []
  const userOwnDebt = eventDebts.find((d) => d.user_id === user.id && d.debt_type === 'partido_propio')
  const userGuestDebts = eventDebts.filter((d) => d.user_id === user.id && d.debt_type === 'invitado')

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
  const isPendingApproval = event.status === 'pendiente_aprobacion'
  const eventClosed = event.status === 'finalizado' || event.status === 'cancelado' || isPendingApproval

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

  // MVP Voting details
  const { data: userVote } = await supabase
    .from('mvp_votes')
    .select('id, voted_player_id')
    .eq('event_id', id)
    .eq('voter_id', user.id)
    .maybeSingle()

  const hasVoted = Boolean(userVote)

  const candidates: MvpCandidate[] = confirmedAttendees.map((a) => {
    const p = a.profiles
    const custom = p?.custom_attributes || {}
    return {
      id: a.user_id,
      full_name: p?.full_name || 'Socio',
      avatar_url: p?.avatar_url || null,
      sports_role: p?.sports_role || 'jugador',
      posicion: Array.isArray(custom.posicion)
        ? (custom.posicion as string[]).join(', ')
        : custom.posicion
        ? String(custom.posicion)
        : undefined,
      numero_camiseta: custom.numero_camiseta ? String(custom.numero_camiseta) : undefined,
    }
  })

  let winners: MvpWinner[] = []
  let allVoteResults: { player_id: string; full_name: string; vote_count: number }[] = []

  if (!event.mvp_voting_open && event.status === 'finalizado') {
    const { data: allVotes } = await supabase
      .from('mvp_votes')
      .select(`
        voted_player_id,
        player:voted_player_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('event_id', id)

    if (allVotes && allVotes.length > 0) {
      const counts: Record<string, { count: number; name: string; avatar: string | null }> = {}
      for (const v of allVotes) {
        const p = v.player as unknown as { id: string; full_name: string; avatar_url: string | null } | null
        const pId = v.voted_player_id
        if (!counts[pId]) {
          counts[pId] = {
            count: 0,
            name: p?.full_name || 'Socio',
            avatar: p?.avatar_url || null,
          }
        }
        counts[pId].count += 1
      }

      let maxVotes = 0
      allVoteResults = Object.entries(counts)
        .map(([pId, info]) => {
          if (info.count > maxVotes) maxVotes = info.count
          return { player_id: pId, full_name: info.name, vote_count: info.count }
        })
        .sort((a, b) => b.vote_count - a.vote_count)

      if (maxVotes > 0) {
        winners = Object.entries(counts)
          .filter(([, info]) => info.count === maxVotes)
          .map(([pId, info]) => ({
            id: pId,
            full_name: info.name,
            avatar_url: info.avatar,
            vote_count: info.count,
          }))
      }
    }
  }

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
      <EventRealtimeListener eventId={event.id} />

      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-neutral-200">
        <Link
          href="/eventos"
          className="p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          {event.status !== 'pendiente_aprobacion' && event.status !== 'cancelado' && (
            <>
              <AddToCalendarButton
                title={event.title}
                description={event.description}
                location={event.location}
                startTime={event.start_time}
                endTime={event.end_time}
              />
              <ShareEventButton
                eventId={event.id}
                title={event.title}
                eventType={event.event_type}
                startFormatted={formatEventDate(event.start_time)}
                location={event.location}
                costFormatted={
                  event.total_cost && event.total_cost > 0
                    ? `~$${Math.round(event.total_cost / (maxCap || 14)).toLocaleString('es-CL')} p/jugador`
                    : event.cost_per_player > 0
                    ? `$${event.cost_per_player.toLocaleString('es-CL')} p/jugador`
                    : 'Gratis'
                }
                confirmedCount={totalConfirmedCount}
                maxCapacity={maxCap}
              />
            </>
          )}
          <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-800 tracking-wider">
            {event.event_type}
          </span>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="py-4 space-y-3">
        {/* Creator Attribution */}
        {creator && (
          <div className="flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 px-3 py-2 rounded-xl border border-neutral-200/70">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-neutral-200 relative flex items-center justify-center flex-shrink-0">
              {creator.avatar_url ? (
                <Image src={creator.avatar_url} alt={creator.full_name} fill className="object-cover" sizes="20px" />
              ) : (
                <User className="w-3 h-3 text-neutral-400" />
              )}
            </div>
            <span>
              Convocado por <strong className="text-neutral-900 font-bold">{creator.full_name}</strong>
              {creator.system_role === 'admin' && (
                <span className="ml-1 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-neutral-900 text-emerald-400">
                  Admin
                </span>
              )}
            </span>
          </div>
        )}

        {/* Pending Approval Notice */}
        {event.status === 'pendiente_aprobacion' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Convocatoria Pendiente de Aprobación</span>
            </p>
            <p className="text-[11px] text-amber-800 leading-normal">
              {isAdmin
                ? 'Como administrador del club, puedes aprobar o rechazar esta convocatoria en los controles de gestión abajo.'
                : 'Esta convocatoria está siendo revisada por los administradores del club antes de admitir inscripciones.'}
            </p>
          </div>
        )}

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
                : event.status === 'pendiente_aprobacion'
                ? 'bg-amber-100 text-amber-900'
                : 'bg-neutral-200 text-neutral-700'
            }`}
          >
            {event.status === 'convocado' ? 'Abierto' : event.status === 'pendiente_aprobacion' ? 'Por Aprobar' : event.status}
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

          {event.financial_closed ? (
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="text-xs">
                {userOwnDebt ? (
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 inline-flex flex-wrap items-center gap-1.5">
                    <span>Tu cuota liquidada:</span>
                    <span className="font-bold">
                      ${userOwnDebt.amount.toLocaleString('es-CL')}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      userOwnDebt.status === 'pagado' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {userOwnDebt.status === 'pagado' ? '✓ Al día' : 'Pendiente'}
                    </span>
                  </span>
                ) : userAttendee?.status === 'confirmado' ? (
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                    Cuota eximida ($0)
                  </span>
                ) : (
                  <span className="font-semibold text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200">
                    Cierre financiero liquidado
                  </span>
                )}
              </div>
            </div>
          ) : (Boolean(event.total_cost && event.total_cost > 0) || Boolean(event.cost_per_player && event.cost_per_player > 0)) && (
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="text-xs">
                {event.total_cost && event.total_cost > 0 ? (
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80 inline-flex flex-wrap items-center gap-1.5">
                    <span className="font-bold">
                      ${Math.round(event.total_cost / (maxCap || 14)).toLocaleString('es-CL')} por jugador
                    </span>
                    <span className="text-emerald-700 text-[11px]">
                      (Total Cancha: ${event.total_cost.toLocaleString('es-CL')} ÷ {maxCap || 14} cupos)
                    </span>
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/80">
                    ${event.cost_per_player.toLocaleString('es-CL')} por jugador
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Custom dynamic fields for 'otro' or special events */}
        {event.custom_fields && Object.keys(event.custom_fields).length > 0 && (
          <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Detalles adicionales del evento
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(event.custom_fields as Record<string, unknown>).map(([k, v]) => (
                <div key={k} className="bg-white p-2.5 rounded-lg border border-neutral-200/70 shadow-xs">
                  <span className="font-bold text-neutral-500 text-[10px] uppercase block mb-0.5">{k}</span>
                  <span className="text-neutral-900 font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {event.description && (
          <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-xs text-neutral-700 whitespace-pre-wrap">
            {event.description}
          </div>
        )}
      </div>

      {/* Pre-RSVP Cost Callout */}
      {(Boolean(event.total_cost && event.total_cost > 0) || Boolean(event.cost_per_player && event.cost_per_player > 0)) && !userStatus && !eventClosed && (
        <div className="my-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200/90 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="text-emerald-950 font-medium">
              Costo estimado:{' '}
              <strong className="text-emerald-950 font-bold">
                ${(event.total_cost && event.total_cost > 0
                  ? Math.round(event.total_cost / (maxCap || 14))
                  : event.cost_per_player
                ).toLocaleString('es-CL')}
              </strong>{' '}
              por jugador
            </span>
          </div>
          {event.total_cost && event.total_cost > 0 && (
            <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-semibold whitespace-nowrap">
              Cancha: ${event.total_cost.toLocaleString('es-CL')} ÷ {maxCap || 14}
            </span>
          )}
        </div>
      )}

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

      {/* Personalized Settled Quota Callout */}
      {event.financial_closed && userAttendee?.status === 'confirmado' && (
        <div className="my-2 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-emerald-950">Tu cuota por este partido:</span>
            </div>
            <span className="text-sm font-black text-emerald-950">
              {userOwnDebt ? `$${userOwnDebt.amount.toLocaleString('es-CL')}` : '$0 (Eximido)'}
            </span>
          </div>
          {userGuestDebts.length > 0 && (
            <div className="flex items-center justify-between text-[11px] text-emerald-800 pt-1 border-t border-emerald-200/70">
              <span>+ {userGuestDebts.length} invitado(s) a tu cargo:</span>
              <span className="font-bold">
                ${userGuestDebts.reduce((a, b) => a + b.amount, 0).toLocaleString('es-CL')}
              </span>
            </div>
          )}
          {userOwnDebt && (
            <div className="flex items-center justify-between pt-1 border-t border-emerald-200/70 text-[11px]">
              <span className="text-emerald-800 font-medium">Estado en Tesorería:</span>
              <span className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                userOwnDebt.status === 'pagado'
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {userOwnDebt.status === 'pagado' ? '✓ Pagado' : 'Pendiente de pago en Finanzas'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Event Management Controls (Admin or Organizer) */}
      {canManageEvent && (
        <div className="my-3">
          <EventAdminControls eventId={event.id} currentStatus={event.status} isAdmin={isAdmin} />
        </div>
      )}

      {/* Financial Closure Section (Manual per-player rates upon match completion) */}
      {event.status === 'finalizado' && (
        <EventFinancialClosure
          eventId={event.id}
          eventTitle={event.title}
          totalCost={event.total_cost}
          baseCostPerPlayer={
            event.total_cost && event.total_cost > 0
              ? Math.round(event.total_cost / (totalConfirmedCount > 0 ? totalConfirmedCount : (maxCap || 14)))
              : event.cost_per_player
          }
          isFinancialClosed={Boolean(event.financial_closed)}
          financialClosedAt={event.financial_closed_at}
          confirmedAttendees={confirmedAttendees.map((a) => ({
            userId: a.user_id,
            fullName: a.profiles?.full_name || 'Socio',
            avatarUrl: a.profiles?.avatar_url || null,
          }))}
          approvedGuests={approvedGuests.map((g) => ({
            guestId: g.id,
            guestName: g.guest_name,
            invitedByUserId: g.invited_by_user_id,
            inviterName: g.inviter?.full_name || 'Socio',
          }))}
          existingDebts={eventDebts.map((d) => ({
            userId: d.user_id,
            guestId: d.guest_id,
            amount: d.amount,
          }))}
          canManage={canManageEvent}
          isAdmin={isAdmin}
        />
      )}

      {/* MVP Voting & Results Section */}
      <MvpVotingSection
        eventId={event.id}
        mvpVotingOpen={event.mvp_voting_open}
        mvpDeadline={event.mvp_voting_deadline}
        isConfirmedAttendee={userStatus === 'confirmado'}
        hasVoted={hasVoted}
        candidates={candidates}
        currentUserId={user.id}
        isAdmin={canManageEvent}
        winners={winners}
        allVoteResults={allVoteResults}
      />

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
                        <span>
                          {Array.isArray(custom.posicion)
                            ? (custom.posicion as string[]).join(', ')
                            : String(custom.posicion || p?.sports_role || 'Jugador')}
                        </span>
                        {custom.numero_camiseta && (
                          <span className="font-mono font-bold text-emerald-700">
                            #{String(custom.numero_camiseta)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {event.financial_closed && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {(() => {
                          const attDebt = eventDebts.find((d) => d.user_id === attendee.user_id && d.debt_type === 'partido_propio')
                          return attDebt ? `$${attDebt.amount.toLocaleString('es-CL')}` : '$0'
                        })()}
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {new Date(attendee.registered_at).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
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

                <div className="flex items-center gap-2">
                  {event.financial_closed && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {(() => {
                        const gDebt = eventDebts.find((d) => d.guest_id === guest.id)
                        return gDebt ? `$${gDebt.amount.toLocaleString('es-CL')}` : '$0'
                      })()}
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {new Date(guest.created_at).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
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
