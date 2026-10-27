import { createClient } from '@/utils/supabase/server'
import { sendPushToUser } from '@/app/api/push/actions'
import { formatTime } from '@/utils/date'

export async function processAutomatedReminders() {
  const supabase = await createClient()

  const results = {
    events24hReminded: 0,
    attendeesReminded: 0,
    mvpReminded: 0,
    errors: [] as string[],
  }

  const now = new Date()
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const in4Hours = new Date(now.getTime() + 4 * 60 * 60 * 1000)

  // ==============================================================================
  // 1. EVENT REMINDERS (24 HOURS BEFORE MATCH)
  // ==============================================================================
  try {
    const { data: upcomingEvents, error: eventsErr } = await supabase
      .from('events')
      .select('id, title, start_time, location, club_id, clubs(name)')
      .eq('status', 'convocado')
      .eq('reminder_24h_sent', false)
      .gt('start_time', now.toISOString())
      .lte('start_time', in24Hours.toISOString())

    if (eventsErr) {
      results.errors.push(`Error fetching upcoming events: ${eventsErr.message}`)
    } else if (upcomingEvents && upcomingEvents.length > 0) {
      for (const event of upcomingEvents) {
        const clubName = (event.clubs as unknown as { name?: string })?.name || 'Club Deportivo'
        const timeStr = formatTime(event.start_time)

        // Fetch confirmed attendees
        const { data: attendees } = await supabase
          .from('event_attendees')
          .select('user_id')
          .eq('event_id', event.id)
          .eq('status', 'confirmado')

        for (const att of attendees || []) {
          try {
            await sendPushToUser(att.user_id, {
              title: `[${clubName}] ⏰ Recordatorio: Partido próximo`,
              body: `"${event.title}" a las ${timeStr} en ${event.location}. Recuerda llegar a tiempo o darte de baja si no asistes.`,
              url: `/eventos/${event.id}`,
              type: 'recordatorio',
              clubId: event.club_id,
            })
            results.attendeesReminded++
          } catch (e) {
            console.error(`Error sending 24h reminder to user ${att.user_id}:`, e)
          }
        }

        // Mark reminder as sent on event
        await supabase
          .from('events')
          .update({ reminder_24h_sent: true })
          .eq('id', event.id)

        results.events24hReminded++
      }
    }
  } catch (e) {
    results.errors.push(`Exception in 24h reminder check: ${e instanceof Error ? e.message : String(e)}`)
  }

  // ==============================================================================
  // 2. MVP VOTING CLOSING SOON REMINDER (4 HOURS BEFORE DEADLINE)
  // ==============================================================================
  try {
    const { data: expiringMvpEvents, error: mvpErr } = await supabase
      .from('events')
      .select('id, title, mvp_voting_deadline, club_id, clubs(name)')
      .eq('mvp_voting_open', true)
      .eq('reminder_mvp_sent', false)
      .not('mvp_voting_deadline', 'is', null)
      .gt('mvp_voting_deadline', now.toISOString())
      .lte('mvp_voting_deadline', in4Hours.toISOString())

    if (mvpErr) {
      results.errors.push(`Error fetching MVP events: ${mvpErr.message}`)
    } else if (expiringMvpEvents && expiringMvpEvents.length > 0) {
      for (const event of expiringMvpEvents) {
        const clubName = (event.clubs as unknown as { name?: string })?.name || 'Club Deportivo'

        // Fetch confirmed attendees
        const { data: attendees } = await supabase
          .from('event_attendees')
          .select('user_id')
          .eq('event_id', event.id)
          .eq('status', 'confirmado')

        // Fetch attendees who already voted
        const { data: existingVotes } = await supabase
          .from('mvp_votes')
          .select('voter_id')
          .eq('event_id', event.id)

        const votedUserIds = new Set((existingVotes || []).map((v) => v.voter_id))
        const pendingAttendees = (attendees || []).filter((a) => !votedUserIds.has(a.user_id))

        for (const att of pendingAttendees) {
          try {
            await sendPushToUser(att.user_id, {
              title: `[${clubName}] ⏳ ¡Últimas horas para votar al MVP!`,
              body: `Quedan pocas horas para que cierre la votación de "${event.title}". ¡Elige a la figura del encuentro!`,
              url: `/eventos/${event.id}`,
              type: 'mvp',
              clubId: event.club_id,
            })
            results.mvpReminded++
          } catch (e) {
            console.error(`Error sending MVP reminder to user ${att.user_id}:`, e)
          }
        }

        // Mark reminder as sent
        await supabase
          .from('events')
          .update({ reminder_mvp_sent: true })
          .eq('id', event.id)
      }
    }
  } catch (e) {
    results.errors.push(`Exception in MVP reminder check: ${e instanceof Error ? e.message : String(e)}`)
  }

  return results
}
