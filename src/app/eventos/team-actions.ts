'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendPushToUser } from '@/app/api/push/actions'
import { closeMvpVoting } from '@/app/eventos/mvp-actions'

export interface TeamDraftPayload {
  name: string
  color: string
  players: {
    userId: string
    position: string
  }[]
}

/**
 * Saves team assignments (draft or published)
 */
export async function saveTeamsAction(
  eventId: string,
  teams: TeamDraftPayload[],
  publish: boolean = false
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión' }
  }

  // Fetch event and verify permissions
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, club_id, created_by, title, clubs(name)')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { error: 'Evento no encontrado' }
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
    return { error: 'Solo el creador o un administrador pueden armar los equipos' }
  }

  // 1. Delete existing team players and teams for this event
  await supabase.from('event_team_players').delete().eq('event_id', eventId)
  await supabase.from('event_teams').delete().eq('event_id', eventId)

  // 2. Insert new teams and their assigned players
  for (const t of teams) {
    const { data: insertedTeam, error: teamErr } = await supabase
      .from('event_teams')
      .insert({
        event_id: eventId,
        name: t.name,
        color: t.color,
      })
      .select('id')
      .single()

    if (teamErr || !insertedTeam) {
      return { error: `Error creando ${t.name}: ${teamErr?.message}` }
    }

    if (t.players && t.players.length > 0) {
      const playerRows = t.players.map((p) => {
        const isGuest = p.userId.startsWith('guest_')
        return {
          event_id: eventId,
          team_id: insertedTeam.id,
          user_id: isGuest ? null : p.userId,
          guest_id: isGuest ? p.userId.replace('guest_', '') : null,
          assigned_position: p.position || 'Jugador',
        }
      })

      const { error: playersErr } = await supabase
        .from('event_team_players')
        .insert(playerRows)

      if (playersErr) {
        return { error: `Error asignando jugadores: ${playersErr.message}` }
      }
    }
  }

  // 3. Update events published status
  await supabase
    .from('events')
    .update({ teams_published: publish })
    .eq('id', eventId)

  // 4. If published, notify confirmed players
  if (publish) {
    const clubName = (event.clubs as unknown as { name?: string })?.name || 'Club Deportivo'
    const { data: attendees } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmado')

    for (const att of attendees || []) {
      try {
        await sendPushToUser(att.user_id, {
          title: `[${clubName}] ¡Equipos confirmados! ⚽`,
          body: `Se armaron los equipos para "${event.title}". Revisa tu escuadra en la app.`,
          url: `/eventos/${eventId}`,
          type: 'evento',
          clubId: event.club_id,
        })
      } catch {}
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  revalidatePath('/')
  return { success: true }
}

export interface PlayerStatPayload {
  userId: string
  teamId: string
  goals: number
  assists: number
  saves: number
  ownGoals: number
}

/**
 * Records final match score and detailed player stats (goals, assists, saves, own goals).
 * Automatically updates user_stats W/L/D and stats counters.
 */
export async function recordMatchResultAction(
  eventId: string,
  teamScores: { teamId: string; score: number }[],
  playerStats: PlayerStatPayload[]
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión' }
  }

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, club_id, created_by, status')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { error: 'Evento no encontrado' }
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
    return { error: 'Solo el creador o un administrador pueden registrar el resultado' }
  }

  // 1. Update scores on event_teams
  for (const ts of teamScores) {
    await supabase
      .from('event_teams')
      .update({ score: ts.score })
      .eq('id', ts.teamId)
  }

  // 2. Update player stats on event_team_players
  for (const ps of playerStats) {
    const isGuest = ps.userId.startsWith('guest_')
    if (isGuest) {
      const guestId = ps.userId.replace('guest_', '')
      await supabase
        .from('event_team_players')
        .update({
          goals: ps.goals || 0,
          assists: ps.assists || 0,
          saves: ps.saves || 0,
          own_goals: ps.ownGoals || 0,
        })
        .eq('event_id', eventId)
        .eq('guest_id', guestId)
    } else {
      await supabase
        .from('event_team_players')
        .update({
          goals: ps.goals || 0,
          assists: ps.assists || 0,
          saves: ps.saves || 0,
          own_goals: ps.ownGoals || 0,
        })
        .eq('event_id', eventId)
        .eq('user_id', ps.userId)
    }
  }

  // 3. Mark result recorded and ensure finalized + mvp voting open
  const deadline = new Date()
  deadline.setHours(deadline.getHours() + 24)

  await supabase
    .from('events')
    .update({
      result_recorded: true,
      status: 'finalizado',
      mvp_voting_open: true,
      mvp_voting_deadline: deadline.toISOString(),
    })
    .eq('id', eventId)

  // 4. Determine winning team / tie
  let winningTeamId: string | null = null
  let isTie = false

  if (teamScores.length === 2) {
    if (teamScores[0].score > teamScores[1].score) {
      winningTeamId = teamScores[0].teamId
    } else if (teamScores[1].score > teamScores[0].score) {
      winningTeamId = teamScores[1].teamId
    } else {
      isTie = true
    }
  }

  // 5. Update user_stats for each participant (skip guests who do not have member profiles)
  for (const ps of playerStats) {
    if (ps.userId.startsWith('guest_')) {
      continue
    }

    const isWinner = winningTeamId && ps.teamId === winningTeamId
    const isLoser = winningTeamId && ps.teamId !== winningTeamId

    // Fetch existing stats to increment accurately
    const { data: existingStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', ps.userId)
      .eq('club_id', event.club_id)
      .maybeSingle()

    const currentWon = existingStats?.matches_won || 0
    const currentLost = existingStats?.matches_lost || 0
    const currentTied = existingStats?.matches_tied || 0
    const currentGoals = existingStats?.goals || 0
    const currentAssists = existingStats?.assists || 0
    const currentSaves = existingStats?.saves || 0

    await supabase
      .from('user_stats')
      .upsert({
        user_id: ps.userId,
        club_id: event.club_id,
        matches_won: isWinner ? currentWon + 1 : currentWon,
        matches_lost: isLoser ? currentLost + 1 : currentLost,
        matches_tied: isTie ? currentTied + 1 : currentTied,
        goals: currentGoals + (ps.goals || 0),
        assists: currentAssists + (ps.assists || 0),
        saves: currentSaves + (ps.saves || 0),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,club_id' })
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/ranking')
  revalidatePath('/perfil')
  revalidatePath('/')
  return { success: true }
}

/**
 * Submits an anonymous peer rating (1-10) for a teammate post-match.
 * Recalculates the evaluated player's average, last match grade, and history.
 */
export async function submitPeerRatingAction(
  eventId: string,
  evaluatedPlayerId: string,
  rating: number
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para calificar' }
  }

  if (user.id === evaluatedPlayerId) {
    return { error: 'No puedes autoevaluarte' }
  }

  if (rating < 1 || rating > 10) {
    return { error: 'La nota debe ser entre 1 y 10' }
  }

  // Fetch event and club
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, club_id, status, start_time')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { error: 'Evento no encontrado' }
  }

  // Check evaluator is admin OR confirmed attendee in the same event
  const { data: member } = await supabase
    .from('club_members')
    .select('system_role, approval_status')
    .eq('club_id', event.club_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = member?.system_role === 'admin' && member?.approval_status === 'aprobado'

  const { data: evaluatorAttendee } = await supabase
    .from('event_attendees')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()

  const playedInSameMatch = evaluatorAttendee?.status === 'confirmado'

  if (!isAdmin && !playedInSameMatch) {
    return { error: 'Solo los administradores o quienes jugaron en este partido pueden evaluar' }
  }

  // 1. Upsert peer rating into match_player_ratings
  const { error: ratingErr } = await supabase
    .from('match_player_ratings')
    .upsert({
      event_id: eventId,
      club_id: event.club_id,
      evaluator_id: user.id,
      evaluated_player_id: evaluatedPlayerId,
      rating,
      created_at: new Date().toISOString(),
    }, { onConflict: 'event_id,evaluator_id,evaluated_player_id' })

  if (ratingErr) {
    return { error: ratingErr.message }
  }

  // 2. Recalculate consolidated metrics in user_stats for this club
  const { data: allRatings } = await supabase
    .from('match_player_ratings')
    .select('rating, event_id, created_at')
    .eq('club_id', event.club_id)
    .eq('evaluated_player_id', evaluatedPlayerId)

  if (allRatings && allRatings.length > 0) {
    const totalCount = allRatings.length
    const sumRatings = allRatings.reduce((acc, r) => acc + Number(r.rating), 0)
    const newAverage = Math.round((sumRatings / totalCount) * 10) / 10

    // Fetch ratings for the current event specifically to set last_match_rating
    const eventRatings = allRatings.filter((r) => r.event_id === eventId)
    const lastMatchAvg = eventRatings.length > 0
      ? Math.round((eventRatings.reduce((acc, r) => acc + Number(r.rating), 0) / eventRatings.length) * 10) / 10
      : newAverage

    // Fetch existing user_stats to preserve previous_average_rating
    const { data: currentStats } = await supabase
      .from('user_stats')
      .select('average_rating, match_history_ratings')
      .eq('user_id', evaluatedPlayerId)
      .eq('club_id', event.club_id)
      .maybeSingle()

    interface RatingHistoryItem {
      event_id: string
      date: string
      rating: number
      [key: string]: string | number | undefined
    }

    const prevAvg = currentStats?.average_rating ?? null
    const history = (currentStats?.match_history_ratings as unknown as RatingHistoryItem[]) || []
    
    // Add/update entry in history for this event
    const existingIndex = history.findIndex((h) => h.event_id === eventId)
    const historyItem = {
      event_id: eventId,
      date: event.start_time,
      rating: lastMatchAvg,
    }

    const updatedHistory = [...history]
    if (existingIndex >= 0) {
      updatedHistory[existingIndex] = historyItem
    } else {
      updatedHistory.push(historyItem)
    }

    await supabase
      .from('user_stats')
      .upsert({
        user_id: evaluatedPlayerId,
        club_id: event.club_id,
        average_rating: newAverage,
        last_match_rating: lastMatchAvg,
        previous_average_rating: prevAvg,
        ratings_count: totalCount,
        match_history_ratings: updatedHistory.slice(-10), // Keep last 10 for trend display
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,club_id' })
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/perfil')
  return { success: true }
}

/**
 * Casts a vote for one of the 3 post-match awards:
 * 'mvp' | 'mejor_compañero' | 'jugador_sorpresa'
 * If 100% of confirmed players have voted, closes voting automatically!
 */
export async function castAwardVoteAction(
  eventId: string,
  awardType: 'mvp' | 'mejor_compañero' | 'jugador_sorpresa',
  votedPlayerId: string
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para votar' }
  }

  if (user.id === votedPlayerId) {
    return { error: 'No puedes votarte a ti mismo' }
  }

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, club_id, mvp_voting_open, status')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { error: 'Evento no encontrado' }
  }

  if (!event.mvp_voting_open || event.status !== 'finalizado') {
    return { error: 'La votación está cerrada para este partido' }
  }

  // Verify voter was confirmed attendee
  const { data: voterAttendee } = await supabase
    .from('event_attendees')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()

  if (!voterAttendee || voterAttendee.status !== 'confirmado') {
    return { error: 'Solo los socios confirmados pueden votar' }
  }

  // 1. Upsert vote for this award category
  const { error: voteErr } = await supabase
    .from('mvp_votes')
    .upsert({
      event_id: eventId,
      voter_id: user.id,
      voted_player_id: votedPlayerId,
      award_type: awardType,
      created_at: new Date().toISOString(),
    }, { onConflict: 'event_id,voter_id,award_type' })

  if (voteErr) {
    return { error: voteErr.message }
  }

  // 2. Check if 100% of confirmed players have voted -> AUTO-CLOSE IMMEDIATELY!
  const { count: totalConfirmedPlayers } = await supabase
    .from('event_attendees')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'confirmado')
    .eq('attendance_type', 'jugador')

  const { data: distinctVoters } = await supabase
    .from('mvp_votes')
    .select('voter_id')
    .eq('event_id', eventId)

  const uniqueVoterIds = new Set((distinctVoters || []).map((v) => v.voter_id))

  // If every confirmed player has participated, auto-close!
  if (totalConfirmedPlayers && totalConfirmedPlayers > 0 && uniqueVoterIds.size >= totalConfirmedPlayers) {
    try {
      await closeMvpVoting(eventId)
    } catch (e) {
      console.error('Error auto-closing voting:', e)
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}
