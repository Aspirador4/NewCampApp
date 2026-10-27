'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendPushToUser, sendPushToClubAdmins } from '@/app/api/push/actions'

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

  // Delete guest if belongs to user
  const { error } = await supabase
    .from('event_guests')
    .delete()
    .eq('id', guestId)
    .eq('invited_by_user_id', user.id)

  if (error) {
    return { error: error.message }
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

  if (event.max_capacity) {
    // Count confirmed attendees + approved guests
    const { count: confirmedCount } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'confirmado')

    const { count: approvedGuestsCount } = await supabase
      .from('event_guests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'aprobado')

    const totalConfirmed = (confirmedCount || 0) + (approvedGuestsCount || 0)

    if (totalConfirmed >= event.max_capacity) {
      return {
        error: `No hay cupos disponibles (${totalConfirmed}/${event.max_capacity}). Debes ampliar el cupo o esperar una baja.`,
      }
    }
  }

  // Update guest status
  const { data: updatedGuest, error: updateErr } = await supabase
    .from('event_guests')
    .update({
      status: 'aprobado',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', guestId)
    .select('guest_name, invited_by_user_id')
    .single()

  if (updateErr) {
    return { error: updateErr.message }
  }

  // Insert audit log
  await supabase.from('event_attendance_logs').insert({
    event_id: eventId,
    user_id: updatedGuest?.invited_by_user_id || null,
    actor_id: user.id,
    action: 'invitado_aprobado',
    reason: `Invitado aprobado: ${updatedGuest?.guest_name}`,
  })

  // Send push notification with club name
  if (updatedGuest?.invited_by_user_id) {
    try {
      await sendPushToUser(updatedGuest.invited_by_user_id, {
        title: `[${clubName}] ¡Invitado Aprobado! ✅`,
        body: `Tu invitado ${updatedGuest.guest_name} fue aprobado y confirmado para el partido.`,
        url: `/eventos/${eventId}`,
        type: 'evento',
        clubId: event.club_id,
      })
    } catch (e) {
      console.error('Push error:', e)
    }
  }

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/admin/invitados')
  return { success: true }
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

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/admin/invitados')
  return { success: true }
}
