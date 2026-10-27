'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'
import { sendPushToUser } from '@/app/api/push/actions'

export async function castMvpVote(eventId: string, votedPlayerId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para votar' }
  }

  // Prevent self-voting
  if (user.id === votedPlayerId) {
    return { error: 'No puedes votarte a ti mismo como MVP' }
  }

  // Check event exists and voting is open
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('mvp_voting_open, status, event_type, club_id')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { error: 'Evento no encontrado' }
  }

  if (event.event_type !== 'partido') {
    return { error: 'La votación de MVP solo está disponible para partidos' }
  }

  if (!event.mvp_voting_open) {
    return { error: 'La votación de MVP está cerrada para este partido' }
  }

  // Check voter was a confirmed attendee
  const { data: attendee } = await supabase
    .from('event_attendees')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()

  if (!attendee || attendee.status !== 'confirmado') {
    return { error: 'Solo los jugadores que confirmaron y jugaron el partido pueden votar' }
  }

  // Check voted player was also a confirmed attendee
  const { data: votedAttendee } = await supabase
    .from('event_attendees')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', votedPlayerId)
    .single()

  if (!votedAttendee || votedAttendee.status !== 'confirmado') {
    return { error: 'Solo puedes votar por un jugador que haya jugado y confirmado este partido' }
  }

  // Upsert vote
  const { error: voteErr } = await supabase
    .from('mvp_votes')
    .upsert(
      {
        event_id: eventId,
        voter_id: user.id,
        voted_player_id: votedPlayerId,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,voter_id' }
    )

  if (voteErr) {
    return { error: `Error al registrar tu voto: ${voteErr.message}` }
  }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

export async function closeMvpVoting(eventId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'No autorizado' }
  }

  // Check if user is admin of the event's club OR creator of the event
  const { data: event } = await supabase
    .from('events')
    .select('club_id, created_by, event_type')
    .eq('id', eventId)
    .single()

  if (!event) {
    return { success: false, error: 'Evento no encontrado' }
  }

  const { data: member } = await supabase
    .from('club_members')
    .select('system_role, approval_status')
    .eq('club_id', event.club_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = member?.system_role === 'admin' && member?.approval_status === 'aprobado'
  const isCreator = event.created_by === user.id

  if (!isAdmin && !isCreator) {
    return { success: false, error: 'Solo el creador del evento o un administrador del club pueden cerrar la votación' }
  }

  // Ensure debts are generated if they weren't generated before
  try {
    await supabase.rpc('generate_event_debts', { p_event_id: eventId })
  } catch (debtsErr) {
    console.error('Error in generate_event_debts on close:', debtsErr)
  }

  // Call atomic finalize_event_mvp RPC
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('finalize_event_mvp', {
    p_event_id: eventId,
  })

  if (rpcErr) {
    // Fallback: update status and compute manually
    return fallbackCloseMvp(supabase, eventId, event.club_id)
  }

  const winnerIds = ((rpcRes as unknown as { winner_ids?: string[] })?.winner_ids || []) as string[]
  await dispatchMvpWinnerNotifications(supabase, eventId, event.club_id, winnerIds)

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/ranking')
  revalidatePath('/perfil')
  revalidatePath('/')
  return { success: true, error: null, data: rpcRes }
}

async function fallbackCloseMvp(supabase: SupabaseClient<Database>, eventId: string, clubId: string) {
  // Close voting
  await supabase
    .from('events')
    .update({
      mvp_voting_open: false,
      status: 'finalizado',
    })
    .eq('id', eventId)

  // Fetch all votes
  const { data: votes } = await supabase
    .from('mvp_votes')
    .select('voted_player_id')
    .eq('event_id', eventId)

  const voteCounts: Record<string, number> = {}
  for (const v of votes || []) {
    voteCounts[v.voted_player_id] = (voteCounts[v.voted_player_id] || 0) + 1
  }

  let maxVotes = 0
  for (const count of Object.values(voteCounts)) {
    if (count > maxVotes) maxVotes = count
  }

  const winners = Object.keys(voteCounts).filter((id) => voteCounts[id] === maxVotes)

  // Update MVP count for winner(s)
  for (const winnerId of winners) {
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('mvp_count')
      .eq('user_id', winnerId)
      .eq('club_id', clubId)
      .maybeSingle()

    await supabase
      .from('user_stats')
      .upsert(
        {
          user_id: winnerId,
          club_id: clubId,
          mvp_count: (currentStats?.mvp_count || 0) + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,club_id' }
      )
  }

  // Update votes received
  for (const [playerId, count] of Object.entries(voteCounts)) {
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('mvp_votes_received')
      .eq('user_id', playerId)
      .eq('club_id', clubId)
      .maybeSingle()

    await supabase
      .from('user_stats')
      .upsert(
        {
          user_id: playerId,
          club_id: clubId,
          mvp_votes_received: (currentStats?.mvp_votes_received || 0) + count,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,club_id' }
      )
  }

  // Increment matches played for confirmed attendees
  const { data: attendees } = await supabase
    .from('event_attendees')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('status', 'confirmado')

  for (const att of attendees || []) {
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('matches_played')
      .eq('user_id', att.user_id)
      .eq('club_id', clubId)
      .maybeSingle()

    await supabase
      .from('user_stats')
      .upsert(
        {
          user_id: att.user_id,
          club_id: clubId,
          matches_played: (currentStats?.matches_played || 0) + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,club_id' }
      )
  }

  await dispatchMvpWinnerNotifications(supabase, eventId, clubId, winners)

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/ranking')
  return { success: true, error: null }
}

async function dispatchMvpWinnerNotifications(
  supabase: SupabaseClient<Database>,
  eventId: string,
  clubId: string,
  winnerIds: string[]
) {
  if (!winnerIds || winnerIds.length === 0) return

  try {
    const { data: event } = await supabase
      .from('events')
      .select('title, clubs(name)')
      .eq('id', eventId)
      .single()

    const clubName = (event?.clubs as unknown as { name?: string })?.name || 'Club Deportivo'
    const eventTitle = event?.title || 'Partido'

    // Fetch winner profiles
    const { data: winners } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', winnerIds)

    const winnerMap = new Map((winners || []).map((w) => [w.id, w.full_name]))
    const winnerNames = winnerIds.map((id) => winnerMap.get(id) || 'Jugador').join(' y ')

    // 1. Notify winners
    for (const winnerId of winnerIds) {
      await sendPushToUser(winnerId, {
        title: `[${clubName}] 🌟 ¡Elegido MVP del Partido!`,
        body: `¡Felicitaciones! Fuiste votado como el Jugador Más Valioso de "${eventTitle}".`,
        url: `/eventos/${eventId}`,
        type: 'mvp',
        clubId,
      })
    }

    // 2. Notify other confirmed attendees
    const { data: attendees } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmado')

    const winnerSet = new Set(winnerIds)
    const otherAttendees = (attendees || []).filter((a) => !winnerSet.has(a.user_id))

    for (const att of otherAttendees) {
      await sendPushToUser(att.user_id, {
        title: `[${clubName}] 🏆 Resultado MVP: ${winnerNames}`,
        body: `${winnerNames} fue elegido como la figura del encuentro en "${eventTitle}".`,
        url: `/eventos/${eventId}`,
        type: 'mvp',
        clubId,
      })
    }
  } catch (err) {
    console.error('Error dispatching MVP winner notifications:', err)
  }
}
