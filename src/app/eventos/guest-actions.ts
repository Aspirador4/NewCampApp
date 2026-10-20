'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

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
    .select('status')
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

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'admin') {
    return { error: 'Solo los administradores pueden aprobar invitados' }
  }

  // Fetch event to verify capacity
  const { data: event } = await supabase
    .from('events')
    .select('max_capacity')
    .eq('id', eventId)
    .single()

  if (event?.max_capacity) {
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

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'admin') {
    return { error: 'Solo los administradores pueden rechazar invitados' }
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

  revalidatePath(`/eventos/${eventId}`)
  revalidatePath('/admin/invitados')
  return { success: true }
}
