'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database, EventStatus, EventType, GenderCategory, Json, AttendanceType, AttendeeStatus, AttendanceAction } from '@/types/database.types'
import { sendPushToUser, sendPushToClubMembers, sendPushToClubAdmins } from '@/app/api/push/actions'
import { getActiveClub } from '@/utils/club'

export async function createEvent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para crear un evento' }
  }

  // Get active club context
  const { club, isAdmin: isClubAdminActive, isApproved } = await getActiveClub(supabase)

  if (!isApproved) {
    return { error: `Tu cuenta está pendiente de admisión por los administradores de ${club.name}.` }
  }

  const initialStatus: EventStatus = isClubAdminActive ? 'convocado' : 'pendiente_aprobacion'

  const title = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const eventType = (formData.get('event_type') as EventType) || 'partido'
  const genderCategory = (formData.get('gender_category') as GenderCategory) || 'mixto'
  const startDate = formData.get('start_date') as string
  const startTime = formData.get('start_time') as string
  const location = (formData.get('location') as string)?.trim()
  const maxCapacityRaw = formData.get('max_capacity') as string
  const totalCostRaw = formData.get('total_cost') as string
  const costPerPlayerRaw = formData.get('cost_per_player') as string
  const customFieldsRaw = formData.get('custom_fields') as string

  if (!title || !startDate || !startTime || !location) {
    return { error: 'Por favor completa todos los campos obligatorios' }
  }

  const startTimestamp = new Date(`${startDate}T${startTime}:00`).toISOString()
  const maxCapacity = maxCapacityRaw ? parseInt(maxCapacityRaw, 10) : null
  const totalCost = totalCostRaw !== null && totalCostRaw !== '' ? parseInt(totalCostRaw, 10) : null

  let customFields = {}
  if (customFieldsRaw) {
    try {
      customFields = JSON.parse(customFieldsRaw)
    } catch {}
  }

  let costPerPlayer = 0
  if (costPerPlayerRaw !== null && costPerPlayerRaw !== '') {
    costPerPlayer = parseInt(costPerPlayerRaw, 10) || 0
  } else if (totalCost && totalCost > 0) {
    costPerPlayer = maxCapacity && maxCapacity > 0 ? Math.round(totalCost / maxCapacity) : Math.round(totalCost / 14)
  }

  const { data: newEvent, error: insertError } = await supabase
    .from('events')
    .insert({
      club_id: club.id,
      title,
      description,
      event_type: eventType,
      gender_category: genderCategory,
      start_time: startTimestamp,
      location,
      max_capacity: maxCapacity && maxCapacity > 0 ? maxCapacity : null,
      total_cost: totalCost && totalCost > 0 ? totalCost : null,
      cost_per_player: costPerPlayer,
      custom_fields: customFields,
      status: initialStatus,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (insertError) {
    return { error: `Error al crear el evento: ${insertError.message}` }
  }

  // Multi-club notifications
  if (initialStatus === 'convocado') {
    try {
      await sendPushToClubMembers(
        club.id,
        {
          title: `[${club.name}] ⚽ Nueva Convocatoria: ${title}`,
          body: `Se abrió la lista para el encuentro en ${location}. ¡Asegura tu lugar!`,
          url: `/eventos/${newEvent.id}`,
          type: 'evento',
          clubId: club.id,
        },
        user.id
      )
    } catch (e) {
      console.error('Error broadcasting new event to club members:', e)
    }
  } else if (initialStatus === 'pendiente_aprobacion') {
    try {
      await sendPushToClubAdmins(
        club.id,
        {
          title: `[${club.name}] 📝 Nueva Propuesta de Convocatoria`,
          body: `"${title}" espera tu validación para abrirse a los socios.`,
          url: `/eventos/${newEvent.id}`,
          type: 'admin',
          clubId: club.id,
        },
        user.id
      )
    } catch (e) {
      console.error('Error notifying admins of new proposed event:', e)
    }
  }

  revalidatePath('/eventos')
  revalidatePath('/')
  redirect(`/eventos/${newEvent.id}`)
}

export async function joinEvent(eventId: string, attendanceType: AttendanceType = 'jugador') {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para inscribirte' }
  }

  // Fetch event and club info
  const { data: targetEvent, error: eventErr } = await supabase
    .from('events')
    .select(`
      club_id,
      gender_category,
      clubs (
        name
      )
    `)
    .eq('id', eventId)
    .single()

  if (eventErr || !targetEvent) {
    return { error: 'Evento no encontrado' }
  }

  const clubName = (targetEvent.clubs as unknown as { name?: string })?.name || 'Club Deportivo'

  // Check user membership in the event's club
  const { data: membership } = await supabase
    .from('club_members')
    .select('approval_status')
    .eq('club_id', targetEvent.club_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || membership.approval_status === 'pendiente') {
    return { error: `Tu cuenta está pendiente de admisión en ${clubName}.` }
  }
  if (membership.approval_status === 'rechazado') {
    return { error: `Tu cuenta no ha sido admitida en ${clubName}.` }
  }

  // Check event gender category compatibility (only for players)
  if (attendanceType === 'jugador') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('gender')
      .eq('id', user.id)
      .single()

    if (targetEvent.gender_category && targetEvent.gender_category !== 'mixto') {
      if (!profile?.gender) {
        return { error: 'Para inscribirte a este evento debes indicar tu género en tu perfil.' }
      }
      if (profile.gender !== targetEvent.gender_category) {
        const catLabel = targetEvent.gender_category === 'femenino' ? 'Femenina' : 'Masculina'
        return { error: `Este evento está reservado para la categoría ${catLabel}.` }
      }
    }
  }

  // Use atomic RPC function
  const { data, error } = await supabase.rpc('join_event', {
    p_event_id: eventId,
    p_user_id: user.id,
    p_attendance_type: attendanceType,
  })

  if (error) {
    return fallbackJoinEvent(supabase, eventId, user.id, attendanceType)
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  revalidatePath('/')
  return { success: true, data }
}

async function fallbackJoinEvent(
  supabase: SupabaseClient<Database>, 
  eventId: string, 
  userId: string, 
  attendanceType: AttendanceType = 'jugador'
) {
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

  let targetStatus: AttendeeStatus = 'confirmado'
  let action: AttendanceAction = 'confirmo'

  if (attendanceType === 'espectador') {
    targetStatus = 'confirmado'
    action = 'confirmo_espectador'
  } else {
    // Count confirmed players
    const { count: confirmedCount } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmado')
      .eq('attendance_type', 'jugador')

    // Count approved non-overcapacity guests
    const { count: approvedGuestsCount } = await supabase
      .from('event_guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'aprobado')
      .eq('is_overcapacity', false)

    const totalConfirmed = (confirmedCount || 0) + (approvedGuestsCount || 0)
    const isFull = event.max_capacity && totalConfirmed >= event.max_capacity
    targetStatus = isFull ? 'lista_espera' : 'confirmado'
    action = isFull ? 'entro_espera' : 'confirmo'
  }

  const { error: upsertErr } = await supabase
    .from('event_attendees')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        status: targetStatus,
        attendance_type: attendanceType,
        registered_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,user_id' }
    )

  if (upsertErr) {
    return { error: upsertErr.message }
  }

  await supabase.from('event_attendance_logs').insert({
    event_id: eventId,
    user_id: userId,
    actor_id: userId,
    action: action,
  })

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  return { success: true, status: targetStatus, attendance_type: attendanceType }
}

export async function leaveEvent(eventId: string, reason?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión' }
  }

  // Fetch event and club name for notification
  const { data: event } = await supabase
    .from('events')
    .select('club_id, clubs(name)')
    .eq('id', eventId)
    .maybeSingle()

  const clubName = (event?.clubs as unknown as { name?: string })?.name || 'Club Deportivo'

  // Call atomic leave_event RPC
  const { data, error } = await supabase.rpc('leave_event', {
    p_event_id: eventId,
    p_user_id: user.id,
    p_actor_id: user.id,
    p_reason: reason || 'Baja voluntaria',
  })

  if (error) {
    return fallbackLeaveEvent(supabase, eventId, user.id, reason, clubName)
  }

  // Trigger Web Push Notification if a player was promoted from waitlist
  if (data && typeof data === 'object' && 'promoted_user_id' in data && data.promoted_user_id) {
    try {
      await sendPushToUser(data.promoted_user_id as string, {
        title: `[${clubName}] ¡Subiste de Lista de Espera! 🎉`,
        body: 'Se liberó un cupo en el partido y quedaste confirmado automáticamente.',
        url: `/eventos/${eventId}`,
        type: 'evento',
        clubId: event?.club_id,
      })
    } catch (e) {
      console.error('Error sending push to promoted user:', e)
    }
  } else if (event?.club_id) {
    // If a confirmed attendee left and no one was in waitlist, alert club admins of the vacant spot
    try {
      const { data: userProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
      const leaverName = userProfile?.full_name || 'Un socio'
      await sendPushToClubAdmins(
        event.club_id,
        {
          title: `[${clubName}] ⚠️ Cupo Libre en Convocatoria`,
          body: `${leaverName} se dio de baja del partido y no hay lista de espera. Hay un cupo disponible.`,
          url: `/eventos/${eventId}`,
          type: 'evento',
          clubId: event.club_id,
        },
        user.id
      )
    } catch (e) {
      console.error('Error alerting admins of vacant slot:', e)
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  revalidatePath('/')
  return { success: true, data }
}

async function fallbackLeaveEvent(
  supabase: SupabaseClient<Database>,
  eventId: string,
  userId: string,
  reason?: string,
  clubName = 'Club Deportivo'
) {
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

      try {
        await sendPushToUser(nextInLine.user_id, {
          title: `[${clubName}] ¡Subiste de Lista de Espera! 🎉`,
          body: 'Se liberó un cupo en el partido y quedaste confirmado automáticamente.',
          url: `/eventos/${eventId}`,
        })
      } catch (e) {
        console.error('Error sending push to promoted user:', e)
      }
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

  // Check if user is admin of the event's club OR creator of the event
  const { data: event } = await supabase
    .from('events')
    .select('club_id, created_by, event_type, clubs(name)')
    .eq('id', eventId)
    .single()

  if (!event) {
    return { error: 'Evento no encontrado' }
  }

  const clubName = (event.clubs as unknown as { name?: string })?.name || 'Club Deportivo'

  const { data: member } = await supabase
    .from('club_members')
    .select('system_role, approval_status')
    .eq('club_id', event.club_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = member?.system_role === 'admin' && member?.approval_status === 'aprobado'
  const isCreator = event.created_by === user.id

  if (!isAdmin && !isCreator) {
    return { error: 'Solo el creador del evento o un administrador del club pueden cambiar el estado' }
  }

  const updatePayload: Database['public']['Tables']['events']['Update'] = {
    status: newStatus,
  }

  // If finalized, automatically open MVP voting ONLY for matches
  if (newStatus === 'finalizado' && event.event_type === 'partido') {
    updatePayload.mvp_voting_open = true
    const deadline = new Date()
    deadline.setHours(deadline.getHours() + 24)
    updatePayload.mvp_voting_deadline = deadline.toISOString()
  } else if (newStatus === 'finalizado') {
    updatePayload.mvp_voting_open = false
    updatePayload.mvp_voting_deadline = null
  }

  const { error } = await supabase
    .from('events')
    .update(updatePayload)
    .eq('id', eventId)

  if (error) {
    return { error: error.message }
  }

  // If finalized match, dispatch push notification to all confirmed attendees with club name
  if (newStatus === 'finalizado' && event.event_type === 'partido') {
    const { data: attendees } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'confirmado')

    for (const att of attendees || []) {
      try {
        await sendPushToUser(att.user_id, {
          title: `[${clubName}] ¡Vota al MVP del Partido! 🏆`,
          body: 'El partido finalizó. Tienes 24hs para elegir a la figura del encuentro.',
          url: `/eventos/${eventId}`,
          type: 'mvp',
          clubId: event.club_id,
        })
      } catch (e) {
        console.error('Push error:', e)
      }
    }
  }

  // If match was cancelled, notify confirmed and waitlist attendees
  if (newStatus === 'cancelado') {
    const { data: attendees } = await supabase
      .from('event_attendees')
      .select('user_id')
      .eq('event_id', eventId)
      .in('status', ['confirmado', 'lista_espera'])

    for (const att of attendees || []) {
      try {
        await sendPushToUser(att.user_id, {
          title: `[${clubName}] ❌ Partido Cancelado`,
          body: 'El encuentro ha sido cancelado por la administración.',
          url: '/eventos',
          type: 'evento',
          clubId: event.club_id,
        })
      } catch (e) {
        console.error('Push error on cancel:', e)
      }
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/eventos')
  return { success: true }
}

export async function approveEventAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('club_id, title, created_by, clubs(name)')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { error: 'Evento no encontrado' }
  }

  const clubName = (event.clubs as unknown as { name?: string })?.name || 'Club Deportivo'

  const { data: member } = await supabase
    .from('club_members')
    .select('system_role, approval_status')
    .eq('club_id', event.club_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = member?.system_role === 'admin' && member?.approval_status === 'aprobado'

  if (!isAdmin) {
    return { error: 'Solo los administradores del club pueden aprobar eventos' }
  }

  const { error } = await supabase
    .from('events')
    .update({ status: 'convocado' })
    .eq('id', eventId)

  if (error) {
    return { error: error.message }
  }

  if (event.created_by) {
    try {
      await sendPushToUser(event.created_by, {
        title: `[${clubName}] ¡Tu Convocatoria fue Aprobada! ⚽`,
        body: `"${event.title}" ya está visible y abierta para inscripciones de los socios.`,
        url: `/eventos/${eventId}`,
        type: 'evento',
        clubId: event.club_id,
      })
    } catch (e) {
      console.error('Push error:', e)
    }
  }

  // Broadcast to all club members that this match is open
  try {
    await sendPushToClubMembers(
      event.club_id,
      {
        title: `[${clubName}] ⚽ Nueva Convocatoria: ${event.title}`,
        body: 'Se abrió la lista para este encuentro. ¡Asegura tu lugar en la cancha!',
        url: `/eventos/${eventId}`,
        type: 'evento',
        clubId: event.club_id,
      },
      event.created_by || undefined
    )
  } catch (e) {
    console.error('Error broadcasting event approval to members:', e)
  }

  revalidatePath('/eventos')
  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/')
  return { success: true }
}

export async function rejectEventAction(eventId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { data: event } = await supabase
    .from('events')
    .select('club_id, title, clubs(name)')
    .eq('id', eventId)
    .single()

  if (!event) {
    return { error: 'Evento no encontrado' }
  }

  const clubName = (event.clubs as unknown as { name?: string })?.name || 'Club Deportivo'

  const { data: member } = await supabase
    .from('club_members')
    .select('system_role, approval_status')
    .eq('club_id', event.club_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = member?.system_role === 'admin' && member?.approval_status === 'aprobado'

  if (!isAdmin) {
    return { error: 'Solo los administradores del club pueden rechazar eventos' }
  }

  // Notify confirmed & waitlist attendees before deletion
  const { data: attendees } = await supabase
    .from('event_attendees')
    .select('user_id')
    .eq('event_id', eventId)
    .in('status', ['confirmado', 'lista_espera'])

  for (const att of attendees || []) {
    try {
      await sendPushToUser(att.user_id, {
        title: `[${clubName}] ❌ Partido Cancelado`,
        body: `El encuentro "${event.title}" fue suspendido por la administración.`,
        url: '/eventos',
        type: 'evento',
        clubId: event.club_id,
      })
    } catch (e) {
      console.error('Error sending cancellation push:', e)
    }
  }

  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/eventos')
  revalidatePath('/')
  return { success: true }
}

export interface CustomDebtInput {
  userId: string
  guestId?: string | null
  amount: number
  description?: string
}

export async function closeEventFinancesAction(
  eventId: string,
  customDebts?: CustomDebtInput[]
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { data: event } = await supabase
    .from('events')
    .select('club_id, created_by, title, clubs(name)')
    .eq('id', eventId)
    .single()

  if (!event) {
    return { error: 'Evento no encontrado' }
  }

  const clubName = (event.clubs as unknown as { name?: string })?.name || 'Club Deportivo'

  const { data: member } = await supabase
    .from('club_members')
    .select('system_role, approval_status')
    .eq('club_id', event.club_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = member?.system_role === 'admin' && member?.approval_status === 'aprobado'
  const isCreator = event.created_by === user.id

  if (!isAdmin && !isCreator) {
    return { error: 'Solo el creador del evento o un administrador pueden emitir el cierre financiero' }
  }

  const formattedDebts = customDebts?.map((d) => ({
    user_id: d.userId,
    guest_id: d.guestId || null,
    amount: d.amount,
    description: d.description,
  }))

  const { data, error } = await supabase.rpc('close_event_finances', {
    p_event_id: eventId,
    p_custom_debts: formattedDebts && formattedDebts.length > 0 ? (formattedDebts as unknown as Json) : undefined,
  })

  if (error) {
    return { error: error.message }
  }

  // Notify each debtor with their total balance
  try {
    const { data: debts } = await supabase
      .from('member_debts')
      .select('user_id, amount')
      .eq('event_id', eventId)
      .eq('status', 'pendiente')

    const debtTotals: Record<string, number> = {}
    for (const d of debts || []) {
      debtTotals[d.user_id] = (debtTotals[d.user_id] || 0) + d.amount
    }

    for (const [debtorId, total] of Object.entries(debtTotals)) {
      if (total > 0) {
        await sendPushToUser(debtorId, {
          title: `[${clubName}] 💳 Cobro de Partido: ${event.title}`,
          body: `Tu aporte a transferir es de $${total.toLocaleString('es-CL')}. Revisa los datos de transferencia en Finanzas.`,
          url: '/finanzas',
          type: 'finanzas',
          clubId: event.club_id,
        })
      }
    }
  } catch (notifyErr) {
    console.error('Error sending debts notifications:', notifyErr)
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/finanzas')
  return { success: true, data }
}
