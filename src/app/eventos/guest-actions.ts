'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendPushToUser, sendPushToClubAdmins } from '@/app/api/push/actions'

interface WaitlistPromotionResult {
  success?: boolean
  promoted?: boolean
  kind?: 'attendee' | 'guest'
  user_id?: string
  user_name?: string
  guest_id?: string
  guest_name?: string
  inviter_id?: string
}

export async function requestGuest(formData: FormData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión para invitar a alguien' }
  }

  const eventId = formData.get('event_id') as string
  const guestName = (formData.get('guest_name') as string)?.trim()
  const guestContact = (formData.get('guest_contact') as string)?.trim() || null

  if (!eventId || !guestName) {
    return { error: 'El nombre del invitado es obligatorio' }
  }

  // Check event exists and is open
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('status, club_id')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { error: 'Evento no encontrado' }
  }

  if (event.status !== 'convocado' && event.status !== 'en_curso') {
    return { error: 'El evento ya no acepta solicitudes de invitados' }
  }

  // Insert guest
  const { data: guest, error: insertErr } = await supabase
    .from('event_guests')
    .insert({
      event_id: eventId,
      invited_by_user_id: user.id,
      guest_name: guestName,
      guest_contact: guestContact,
      status: 'pendiente_aprobacion',
    })
    .select('id')
    .single()

  if (insertErr) {
    return { error: `Error al solicitar invitado: ${insertErr.message}` }
  }

  // Insert audit log
  await supabase.from('event_attendance_logs').insert({
    event_id: eventId,
    user_id: user.id,
    actor_id: user.id,
    action: 'solicito_invitado',
    reason: `Invitado solicitado: ${guestName}`,
  })

  // Notify club admins of new guest request
  try {
    const { data: eventWithClub } = await supabase
      .from('events')
      .select('title, clubs(name)')
      .eq('id', eventId)
      .single()
    const clubName = (eventWithClub?.clubs as unknown as { name?: string })?.name || 'Club Deportivo'
    const { data: userProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    const requesterName = userProfile?.full_name || 'Un socio'

    await sendPushToClubAdmins(
      event.club_id,
      {
        title: `[${clubName}] 👤 Solicitud de Invitado`,
        body: `${requesterName} propuso a "${guestName}" para el encuentro. Requiere tu validación.`,
        url: '/admin/invitados',
        type: 'admin',
        clubId: event.club_id,
      },
      user.id
    )
  } catch (pushErr) {
    console.error('Error notifying admins of guest request:', pushErr)
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/admin/invitados')
  return { success: true, guestId: guest.id }
}

export async function cancelGuestRequest(guestId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Fetch guest first to know if they held a confirmed spot
  const { data: guest } = await supabase
    .from('event_guests')
    .select('status, is_overcapacity, events(club_id, clubs(name))')
    .eq('id', guestId)
    .eq('invited_by_user_id', user.id)
    .single()

  const wasConfirmed = guest?.status === 'aprobado' && !guest?.is_overcapacity
  const eventDetails = guest?.events as unknown as { club_id?: string; clubs?: { name?: string } } | null
  const clubId = eventDetails?.club_id
  const clubName = eventDetails?.clubs?.name || 'Club Deportivo'

  // Delete guest if belongs to user
  const { error } = await supabase
    .from('event_guests')
    .delete()
    .eq('id', guestId)
    .eq('invited_by_user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  // Remove from team roster
  await supabase
    .from('event_team_players')
    .delete()
    .eq('event_id', eventId)
    .eq('guest_id', guestId)

  // If was confirmed, promote next in line
  if (wasConfirmed) {
    const { data: promoData } = await supabase.rpc('promote_waitlist', {
      p_event_id: eventId,
      p_actor_id: user.id,
    })
    const promo = promoData as WaitlistPromotionResult | null
    if (promo && promo.promoted) {
      if (promo.kind === 'attendee' && promo.user_id) {
        try {
          await sendPushToUser(promo.user_id, {
            title: `[${clubName}] ¡Subiste de Lista de Espera! 🎉`,
            body: 'Se liberó un cupo en el partido y quedaste confirmado automáticamente.',
            url: `/eventos/${eventId}`,
            type: 'evento',
            clubId,
          })
        } catch (e) {
          console.error('Push error:', e)
        }
      } else if (promo.kind === 'guest' && promo.inviter_id) {
        try {
          await sendPushToUser(promo.inviter_id, {
            title: `[${clubName}] ¡Tu Invitado Subió de Lista de Espera! 🎉`,
            body: `Se liberó un cupo y tu invitado ${promo.guest_name || ''} quedó confirmado automáticamente.`,
            url: `/eventos/${eventId}`,
            type: 'evento',
            clubId,
          })
        } catch (e) {
          console.error('Push error:', e)
        }
      }
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/admin/invitados')
  return { success: true }
}

export async function approveGuest(guestId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Fetch event and club name
  const { data: event } = await supabase
    .from('events')
    .select('club_id, max_capacity, clubs(name)')
    .eq('id', eventId)
    .single()

  if (!event) {
    return { error: 'Evento no encontrado' }
  }

  const clubName = (event.clubs as unknown as { name?: string })?.name || 'Club Deportivo'

  // Verify caller is admin of the event's club
  const { data: member } = await supabase
    .from('club_members')
    .select('system_role, approval_status')
    .eq('club_id', event.club_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = member?.system_role === 'admin' && member?.approval_status === 'aprobado'

  if (!isAdmin) {
    return { error: 'Solo los administradores del club pueden aprobar invitados' }
  }

  let targetStatus: 'aprobado' | 'lista_espera' = 'aprobado'
  let isWaitlist = false

  if (event.max_capacity) {
    // Count confirmed attendees + approved non-overcapacity guests
    const { count: confirmedCount } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmado')
      .neq('attendance_type', 'espectador')

    const { count: approvedGuestsCount } = await supabase
      .from('event_guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'aprobado')
      .eq('is_overcapacity', false)

    const totalConfirmed = (confirmedCount || 0) + (approvedGuestsCount || 0)

    if (totalConfirmed >= event.max_capacity) {
      targetStatus = 'lista_espera'
      isWaitlist = true
    }
  }

  // Update guest status
  const { data: updatedGuest, error: updateErr } = await supabase
    .from('event_guests')
    .update({
      status: targetStatus,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', guestId)
    .select('guest_name, invited_by_user_id')
    .single()

  if (updateErr) {
    return { error: updateErr.message }
  }

  // If placed on waitlist, ensure not assigned in team roster
  if (isWaitlist) {
    await supabase
      .from('event_team_players')
      .delete()
      .eq('event_id', eventId)
      .eq('guest_id', guestId)
  }

  // Insert audit log
  await supabase.from('event_attendance_logs').insert({
    event_id: eventId,
    user_id: updatedGuest?.invited_by_user_id || null,
    actor_id: user.id,
    action: isWaitlist ? 'invitado_espera' : 'invitado_aprobado',
    reason: isWaitlist
      ? `Invitado aprobado en lista de espera por cupo lleno: ${updatedGuest?.guest_name}`
      : `Invitado aprobado: ${updatedGuest?.guest_name}`,
  })

  // Send push notification with club name
  if (updatedGuest?.invited_by_user_id) {
    try {
      if (isWaitlist) {
        await sendPushToUser(updatedGuest.invited_by_user_id, {
          title: `[${clubName}] Invitado en Lista de Espera ⏳`,
          body: `Tu invitado ${updatedGuest.guest_name} fue aprobado pero quedó en lista de espera por cupo completo.`,
          url: `/eventos/${eventId}`,
          type: 'evento',
          clubId: event.club_id,
        })
      } else {
        await sendPushToUser(updatedGuest.invited_by_user_id, {
          title: `[${clubName}] ¡Invitado Aprobado! ✅`,
          body: `Tu invitado ${updatedGuest.guest_name} fue aprobado y confirmado para el partido.`,
          url: `/eventos/${eventId}`,
          type: 'evento',
          clubId: event.club_id,
        })
      }
    } catch (e) {
      console.error('Push error:', e)
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/admin/invitados')
  return { 
    success: true, 
    waitlist: isWaitlist,
    message: isWaitlist 
      ? 'El cupo está completo. El invitado fue aprobado y añadido a la lista de espera.' 
      : 'Invitado aprobado con éxito.' 
  }
}

export async function rejectGuest(guestId: string, eventId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Fetch event and club name
  const { data: event } = await supabase
    .from('events')
    .select('club_id, clubs(name)')
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
    return { error: 'Solo los administradores del club pueden rechazar invitados' }
  }

  // Check if guest held a confirmed spot
  const { data: currentGuest } = await supabase
    .from('event_guests')
    .select('status, is_overcapacity')
    .eq('id', guestId)
    .single()

  const wasConfirmed = currentGuest?.status === 'aprobado' && !currentGuest?.is_overcapacity

  const { data: rejectedGuest, error: updateErr } = await supabase
    .from('event_guests')
    .update({
      status: 'rechazado',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', guestId)
    .select('guest_name, invited_by_user_id')
    .single()

  if (updateErr) {
    return { error: updateErr.message }
  }

  // Remove rejected guest from event_team_players if they were assigned to a team
  await supabase
    .from('event_team_players')
    .delete()
    .eq('event_id', eventId)
    .eq('guest_id', guestId)

  // Insert audit log
  await supabase.from('event_attendance_logs').insert({
    event_id: eventId,
    user_id: rejectedGuest?.invited_by_user_id || null,
    actor_id: user.id,
    action: 'invitado_rechazado',
    reason: `Invitado rechazado: ${rejectedGuest?.guest_name}`,
  })

  // Send push notification with club name
  if (rejectedGuest?.invited_by_user_id) {
    try {
      await sendPushToUser(rejectedGuest.invited_by_user_id, {
        title: `[${clubName}] Solicitud de Invitado ❌`,
        body: `La postulación de ${rejectedGuest.guest_name} no pudo ser aprobada.`,
        url: `/eventos/${eventId}`,
        type: 'evento',
        clubId: event.club_id,
      })
    } catch (e) {
      console.error('Push error:', e)
    }
  }

  // If was confirmed, promote next in line from unified waitlist
  if (wasConfirmed) {
    const { data: promoData } = await supabase.rpc('promote_waitlist', {
      p_event_id: eventId,
      p_actor_id: user.id,
    })
    const promo = promoData as WaitlistPromotionResult | null
    if (promo && promo.promoted) {
      if (promo.kind === 'attendee' && promo.user_id) {
        try {
          await sendPushToUser(promo.user_id, {
            title: `[${clubName}] ¡Subiste de Lista de Espera! 🎉`,
            body: 'Se liberó un cupo en el partido y quedaste confirmado automáticamente.',
            url: `/eventos/${eventId}`,
            type: 'evento',
            clubId: event.club_id,
          })
        } catch (e) {
          console.error('Push error:', e)
        }
      } else if (promo.kind === 'guest' && promo.inviter_id) {
        try {
          await sendPushToUser(promo.inviter_id, {
            title: `[${clubName}] ¡Tu Invitado Subió de Lista de Espera! 🎉`,
            body: `Se liberó un cupo y tu invitado ${promo.guest_name || ''} quedó confirmado automáticamente.`,
            url: `/eventos/${eventId}`,
            type: 'evento',
            clubId: event.club_id,
          })
        } catch (e) {
          console.error('Push error:', e)
        }
      }
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/admin/invitados')
  return { success: true }
}

export async function addTrainingOvercapacityGuest(eventId: string, guestName: string, guestContact?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión' }
  }

  const trimmedName = guestName?.trim()
  if (!trimmedName) {
    return { error: 'El nombre del invitado es requerido' }
  }

  // Check event exists and is a training
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('club_id, created_by, event_type')
    .eq('id', eventId)
    .single()

  if (eventErr || !event) {
    return { error: 'Evento no encontrado' }
  }

  if (event.event_type !== 'entrenamiento') {
    return { error: 'El sobrecupo solo está disponible para entrenamientos' }
  }

  // Check authorization: must be admin or creator
  const { data: member } = await supabase
    .from('club_members')
    .select('system_role, approval_status')
    .eq('club_id', event.club_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = member?.system_role === 'admin' && member?.approval_status === 'aprobado'
  const isCreator = event.created_by === user.id

  if (!isAdmin && !isCreator) {
    return { error: 'Solo el creador del entrenamiento o un administrador pueden gestionar el sobrecupo' }
  }

  const { error: insertErr } = await supabase
    .from('event_guests')
    .insert({
      event_id: eventId,
      invited_by_user_id: user.id,
      guest_name: trimmedName,
      guest_contact: guestContact?.trim() || null,
      status: 'aprobado',
      is_overcapacity: true,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })

  if (insertErr) {
    return { error: insertErr.message }
  }

  await supabase.from('event_attendance_logs').insert({
    event_id: eventId,
    user_id: user.id,
    actor_id: user.id,
    action: 'invitado_aprobado',
    reason: `Sobrecupo de entrenamiento añadido: ${trimmedName}`,
  })

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}

export async function removeTrainingOvercapacityGuest(eventId: string, guestId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Debes iniciar sesión' }
  }

  const { data: event } = await supabase
    .from('events')
    .select('club_id, created_by')
    .eq('id', eventId)
    .single()

  if (!event) return { error: 'Evento no encontrado' }

  const { data: member } = await supabase
    .from('club_members')
    .select('system_role, approval_status')
    .eq('club_id', event.club_id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = member?.system_role === 'admin' && member?.approval_status === 'aprobado'
  const isCreator = event.created_by === user.id

  if (!isAdmin && !isCreator) {
    return { error: 'No autorizado' }
  }

  const { error: delErr } = await supabase
    .from('event_guests')
    .delete()
    .eq('id', guestId)
    .eq('event_id', eventId)
    .eq('is_overcapacity', true)

  if (delErr) {
    return { error: delErr.message }
  }

  revalidatePath(`/eventos/${eventId}`)
  return { success: true }
}
