'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database.types'

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
    .select('mvp_voting_open, status')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { error: 'Evento no encontrado' }
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
    return { error: 'El jugador seleccionado no participó del encuentro' }
  }

  // Insert vote
  const { error: insertErr } = await supabase
    .from('mvp_votes')
    .insert({
      event_id: eventId,
      voter_id: user.id,
      voted_player_id: votedPlayerId,
    })

  if (insertErr) {
    if (insertErr.code === '23505') {
      return { error: 'Ya has emitido tu voto para este partido' }
    }
    return { error: `Error al registrar voto: ${insertErr.message}` }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/ranking')
  return { success: true, message: '¡Voto registrado con éxito!' }
}

export async function closeMvpVoting(eventId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'admin') {
    return { success: false, error: 'Solo los administradores pueden cerrar la votación' }
  }

  // Call atomic finalize_event_mvp RPC
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('finalize_event_mvp', {
    p_event_id: eventId,
  })

  if (rpcErr) {
    // Fallback: update status and compute manually
    return fallbackCloseMvp(supabase, eventId)
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/ranking')
  revalidatePath('/perfil')
  revalidatePath('/')
  return { success: true, error: null, data: rpcRes }
}

async function fallbackCloseMvp(supabase: SupabaseClient<Database>, eventId: string) {
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
      .maybeSingle()

    await supabase
      .from('user_stats')
      .upsert({
        user_id: winnerId,
        mvp_count: (currentStats?.mvp_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
  }

  // Update votes received
  for (const [playerId, count] of Object.entries(voteCounts)) {
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('mvp_votes_received')
      .eq('user_id', playerId)
      .maybeSingle()

    await supabase
      .from('user_stats')
      .upsert({
        user_id: playerId,
        mvp_votes_received: (currentStats?.mvp_votes_received || 0) + count,
        updated_at: new Date().toISOString(),
      })
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
      .maybeSingle()

    await supabase
      .from('user_stats')
      .upsert({
        user_id: att.user_id,
        matches_played: (currentStats?.matches_played || 0) + 1,
        updated_at: new Date().toISOString(),
      })
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/ranking')
  return { success: true, error: null }
}
