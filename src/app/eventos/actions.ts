'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database, EventStatus, EventType } from '@/types/database.types'
import { sendPushToUser } from '@/app/api/push/actions'

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para crear un evento' }
  }

  // Check admin privileges
  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'admin') {
    return { error: 'Solo los administradores pueden crear eventos' }
  }

  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const eventType = (formData.get('event_type') as EventType) || 'partido'
  const startDate = formData.get('start_date') as string
  const startTime = formData.get('start_time') as string
  const location = (formData.get('location') as string)?.trim()
  const maxCapacityRaw = formData.get('max_capacity') as string

  if (!title || !startDate || !startTime || !location) {
    return { error: 'Por favor completa todos los campos obligatorios' }
  }

  const startTimestamp = new Date(`${startDate}T${startTime}:00`).toISOString()
  const maxCapacity = maxCapacityRaw ? parseInt(maxCapacityRaw, 10) : null

  const { data: newEvent, error: insertError } = await supabase
    .from('events')
    .insert({
      title,
      description,
      event_type: eventType,
      start_time: startTimestamp,
      location,
      max_capacity: maxCapacity && maxCapacity > 0 ? maxCapacity : null,
      status: 'convocado',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError) {
    return { error: `Error al crear el evento: ${insertError.message}` }
  }

  revalidatePath('/eventos')
  revalidatePath('/')
  redirect(`/eventos/${newEvent.id}`)
}

export async function joinEvent(eventId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para inscribirte' }
  }

  // Use atomic RPC function
  const { data, error } = await supabase.rpc('join_event', {
    p_event_id: eventId,
    p_user_id: user.id,
  })

  if (error) {
    // Fallback if RPC encounters issues
    return fallbackJoinEvent(supabase, eventId, user.id)
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  revalidatePath('/')
  return { success: true, data }
}

async function fallbackJoinEvent(supabase: SupabaseClient<Database>, eventId: string, userId: string) {
  // Check event capacity
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('max_capacity, status')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { error: 'Evento no encontrado' }
  }

  if (event.status !== 'convocado' && event.status !== 'en_curso') {
    return { error: 'El evento ya no acepta inscripciones' }
  }

  // Count confirmed attendees
  const { count: confirmedCount } = await supabase
    .from('event_attendees')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('status', 'confirmado')

  const isFull = event.max_capacity && (confirmedCount || 0) >= event.max_capacity
  const targetStatus = isFull ? 'lista_espera' : 'confirmado'
  const action = isFull ? 'entro_espera' : 'confirmo'

  const { error: upsertErr } = await supabase
    .from('event_attendees')
    .upsert({
      event_id: eventId,
      user_id: userId,
      status: targetStatus,
      registered_at: new Date().toISOString(),
    })

  if (upsertErr) {
    return { error: upsertErr.message }
  }

  await supabase.from('event_attendance_logs').insert({
    event_id: eventId,
    user_id: userId,
    actor_id: userId,
    action,
  })

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  return { success: true, status: targetStatus }
}

export async function leaveEvent(eventId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión' }
  }

  // Call atomic leave_event RPC
  const { data, error } = await supabase.rpc('leave_event', {
    p_event_id: eventId,
    p_user_id: user.id,
    p_actor_id: user.id,
    p_reason: reason || 'Baja voluntaria',
  })

  if (error) {
    return fallbackLeaveEvent(supabase, eventId, user.id, reason)
  }

  // Trigger Web Push Notification if a player was promoted from waitlist
  if (data && typeof data === 'object' && 'promoted_user_id' in data && data.promoted_user_id) {
    try {
      await sendPushToUser(data.promoted_user_id as string, {
        title: '¡Subiste de Lista de Espera! 🎉',
        body: 'Se liberó un cupo en el partido y quedaste confirmado automáticamente.',
        url: `/eventos/${eventId}`,
      })
    } catch (e) {
      console.error('Error sending push to promoted user:', e)
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  revalidatePath('/')
  return { success: true, data }
}

async function fallbackLeaveEvent(supabase: SupabaseClient<Database>, eventId: string, userId: string, reason?: string) {
  const { data: attendee } = await supabase
    .from('event_attendees')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  if (!attendee || attendee.status === 'cancelado') {
    return { error: 'No estás registrado en este evento' }
  }

  const wasConfirmed = attendee.status === 'confirmado'

  // Mark as cancelled
  await supabase
    .from('event_attendees')
    .update({ status: 'cancelado' })
    .eq('event_id', eventId)
    .eq('user_id', userId)

  await supabase.from('event_attendance_logs').insert({
    event_id: eventId,
    user_id: userId,
    actor_id: userId,
    action: 'bajo',
    reason: reason || 'Baja voluntaria',
  })

  // Promote next if confirmed cancelled
  if (wasConfirmed) {
    const { data: nextInLine } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'lista_espera')
      .order('registered_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextInLine) {
      await supabase
        .from('event_attendees')
        .update({ status: 'confirmado' })
        .eq('event_id', eventId)
        .eq('user_id', nextInLine.user_id)

      await supabase.from('event_attendance_logs').insert({
        event_id: eventId,
        user_id: nextInLine.user_id,
        actor_id: userId,
        action: 'subio_espera',
        reason: 'Promovido automáticamente por baja de cupo',
      })
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  return { success: true }
}

export async function updateEventStatus(eventId: string, newStatus: EventStatus) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'admin') {
    return { error: 'Solo administradores pueden cambiar el estado del evento' }
  }

  const updatePayload: Database['public']['Tables']['events']['Update'] = {
    status: newStatus,
  }

  // If finalized, automatically open MVP voting for matches
  if (newStatus === 'finalizado') {
    updatePayload.mvp_voting_open = true
    // Set 24 hour deadline for voting
    const deadline = new Date()
    deadline.setHours(deadline.getHours() + 24)
    updatePayload.mvp_voting_deadline = deadline.toISOString()
  }

  const { error } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', eventId)

  if (error) {
    return { error: error.message }
  }

  // If finalized, dispatch push notification to all confirmed attendees to vote for MVP
  if (newStatus === 'finalizado') {
    const { data: attendees } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmado')

    for (const att of attendees || []) {
      try {
        await sendPushToUser(att.user_id, {
          title: '¡Vota al MVP del Partido! 🏆',
          body: 'El partido finalizó. Tienes 24hs para elegir a la figura del encuentro.',
          url: `/eventos/${eventId}`,
        })
      } catch (e) {
        console.error('Push error:', e)
      }
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  return { success: true }
}
