'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendPushToUser, sendPushToClubAdmins } from '@/app/api/push/actions'
import { SystemRole } from '@/types/database.types'
import { getActiveClub } from '@/utils/club'

export async function approveMemberAction(targetUserId: string, targetClubId?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { club, isAdmin: isClubAdminActive } = await getActiveClub(supabase)
  const clubId = targetClubId || club.id

  // Verify caller is admin in this specific club
  let isAdmin = isClubAdminActive && clubId === club.id
  if (!isAdmin) {
    const { data: callerMember } = await supabase
      .from('club_members')
      .select('system_role, approval_status')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .maybeSingle()
    isAdmin = callerMember?.system_role === 'admin' && callerMember?.approval_status === 'aprobado'
  }

  if (!isAdmin) {
    return { error: 'Solo los administradores del club pueden admitir nuevos miembros' }
  }

  // Update membership in club_members
  const { error } = await supabase
    .from('club_members')
    .update({ approval_status: 'aprobado' })
    .eq('club_id', clubId)
    .eq('user_id', targetUserId)

  if (error) {
    return { error: error.message }
  }

  // Backwards compatibility: also update profile approval_status
  await supabase
    .from('profiles')
    .update({ approval_status: 'aprobado', updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  // Ensure user_stats row exists for this club
  await supabase
    .from('user_stats')
    .upsert({ user_id: targetUserId, club_id: clubId }, { onConflict: 'user_id,club_id' })

  try {
    await sendPushToUser(targetUserId, {
      title: `[${club.name}] ¡Bienvenido al Club! 🎉`,
      body: `Tu cuenta ha sido admitida en ${club.name}. Ya puedes inscribirte a partidos y eventos.`,
      url: '/eventos',
      type: 'membresia',
      clubId,
    })
  } catch (e) {
    console.error('Error sending push notification:', e)
  }

  revalidatePath('/miembros')
  revalidatePath('/')
  return { success: true }
}

export async function rejectMemberAction(targetUserId: string, targetClubId?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { club, isAdmin: isClubAdminActive } = await getActiveClub(supabase)
  const clubId = targetClubId || club.id

  let isAdmin = isClubAdminActive && clubId === club.id
  if (!isAdmin) {
    const { data: callerMember } = await supabase
      .from('club_members')
      .select('system_role, approval_status')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .maybeSingle()
    isAdmin = callerMember?.system_role === 'admin' && callerMember?.approval_status === 'aprobado'
  }

  if (!isAdmin) {
    return { error: 'Solo los administradores del club pueden rechazar miembros' }
  }

  const { error } = await supabase
    .from('club_members')
    .update({ approval_status: 'rechazado' })
    .eq('club_id', clubId)
    .eq('user_id', targetUserId)

  if (error) {
    return { error: error.message }
  }

  try {
    await sendPushToUser(targetUserId, {
      title: `[${club.name}] Solicitud de Membresía`,
      body: `Tu solicitud de ingreso a ${club.name} fue revisada por los capitanes y no fue admitida en esta ocasión.`,
      url: '/club/unirse',
      type: 'membresia',
      clubId,
    })
  } catch (pushErr) {
    console.error('Error sending push on member reject:', pushErr)
  }

  revalidatePath('/miembros')
  return { success: true }
}

export async function deleteMemberAction(targetUserId: string, targetClubId?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { club, isAdmin: isClubAdminActive } = await getActiveClub(supabase)
  const clubId = targetClubId || club.id

  if (user.id === targetUserId) {
    return { error: 'No puedes eliminarte a ti mismo del club desde aquí' }
  }

  let isAdmin = isClubAdminActive && clubId === club.id
  if (!isAdmin) {
    const { data: callerMember } = await supabase
      .from('club_members')
      .select('system_role, approval_status')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .maybeSingle()
    isAdmin = callerMember?.system_role === 'admin' && callerMember?.approval_status === 'aprobado'
  }

  if (!isAdmin) {
    return { error: 'Solo los administradores del club pueden eliminar miembros' }
  }

  const { error } = await supabase
    .from('club_members')
    .delete()
    .eq('club_id', clubId)
    .eq('user_id', targetUserId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/miembros')
  revalidatePath('/')
  return { success: true }
}

export async function updateMemberRoleAction(targetUserId: string, newRole: SystemRole, targetClubId?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { club, isAdmin: isClubAdminActive } = await getActiveClub(supabase)
  const clubId = targetClubId || club.id

  let isAdmin = isClubAdminActive && clubId === club.id
  if (!isAdmin) {
    const { data: callerMember } = await supabase
      .from('club_members')
      .select('system_role, approval_status')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .maybeSingle()
    isAdmin = callerMember?.system_role === 'admin' && callerMember?.approval_status === 'aprobado'
  }

  if (!isAdmin) {
    return { error: 'Solo los administradores pueden asignar roles' }
  }

  // If removing admin from oneself, ensure there is at least one other admin in this club
  if (user.id === targetUserId && newRole === 'member') {
    const { count } = await supabase
      .from('club_members')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('system_role', 'admin')

    if ((count || 0) <= 1) {
      return { error: 'No puedes quitarte el rol de administrador siendo el único admin del club' }
    }
  }

  const { error } = await supabase
    .from('club_members')
    .update({ system_role: newRole })
    .eq('club_id', clubId)
    .eq('user_id', targetUserId)

  if (error) {
    return { error: error.message }
  }

  if (newRole === 'admin') {
    try {
      await sendPushToUser(targetUserId, {
        title: `[${club.name}] 🛡️ Ahora eres Administrador`,
        body: `Se te han otorgado permisos de administrador en ${club.name}. Puedes gestionar convocatorias y miembros.`,
        url: '/miembros',
        type: 'admin',
        clubId,
      })
    } catch (e) {
      console.error('Error sending push on role update:', e)
    }
  }

  revalidatePath('/miembros')
  revalidatePath('/perfil')
  return { success: true }
}

export async function reconsiderMemberAction(targetUserId: string, targetClubId?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { club, isAdmin: isClubAdminActive } = await getActiveClub(supabase)
  const clubId = targetClubId || club.id

  let isAdmin = isClubAdminActive && clubId === club.id
  if (!isAdmin) {
    const { data: callerMember } = await supabase
      .from('club_members')
      .select('system_role, approval_status')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .maybeSingle()
    isAdmin = callerMember?.system_role === 'admin' && callerMember?.approval_status === 'aprobado'
  }

  if (!isAdmin) {
    return { error: 'Solo los administradores pueden cambiar el estado' }
  }

  const { error } = await supabase
    .from('club_members')
    .update({ approval_status: 'pendiente' })
    .eq('club_id', clubId)
    .eq('user_id', targetUserId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/miembros')
  revalidatePath('/')
  return { success: true }
}

export async function submitMotivationAction(motivationText: string, targetClubId?: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const cleanText = motivationText.trim().slice(0, 100)
  if (!cleanText) {
    return { error: 'Por favor escribe una breve motivación (máximo 100 caracteres)' }
  }

  const { club } = await getActiveClub(supabase)
  const clubId = targetClubId || club.id

  // Update motivation AND reset approval_status to 'pendiente' in club_members
  const { error } = await supabase
    .from('club_members')
    .upsert(
      {
        club_id: clubId,
        user_id: user.id,
        motivation: cleanText,
        approval_status: 'pendiente',
        joined_at: new Date().toISOString(),
      },
      { onConflict: 'club_id,user_id' }
    )

  if (error) {
    return { error: error.message }
  }

  // Also update profiles for compatibility
  await supabase
    .from('profiles')
    .update({
      motivation: cleanText,
      approval_status: 'pendiente',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  // Notify club admins of updated motivation / reconsideration
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const applicantName = profile?.full_name || 'Un socio'
    await sendPushToClubAdmins(
      clubId,
      {
        title: `[${club.name}] 📨 Solicitud Reenviada`,
        body: `${applicantName} ha actualizado su carta de presentación para unirse al club.`,
        url: '/miembros',
        type: 'admin',
        clubId,
      },
      user.id
    )
  } catch (pushErr) {
    console.error('Error notifying admins on submitMotivationAction:', pushErr)
  }

  revalidatePath('/')
  revalidatePath('/miembros')
  return { success: true }
}

export async function adminEvaluatePlayerAction(
  targetUserId: string,
  rating: number,
  comment?: string,
  targetClubId?: string
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { club, isAdmin: isClubAdminActive } = await getActiveClub(supabase)
  const clubId = targetClubId || club.id

  let isAdmin = isClubAdminActive && clubId === club.id
  if (!isAdmin) {
    const { data: callerMember } = await supabase
      .from('club_members')
      .select('system_role, approval_status')
      .eq('club_id', clubId)
      .eq('user_id', user.id)
      .maybeSingle()
    isAdmin = callerMember?.system_role === 'admin' && callerMember?.approval_status === 'aprobado'
  }

  if (!isAdmin) {
    return { error: 'Solo los administradores del club pueden registrar evaluaciones de jugadores' }
  }

  if (user.id === targetUserId) {
    return { error: 'No puedes autoevaluarte. La evaluación debe ser registrada por otro capitán o compañero.' }
  }

  const numericRating = Number(rating)
  if (isNaN(numericRating) || numericRating < 1.0 || numericRating > 10.0) {
    return { error: 'La nota debe estar entre 1.0 y 10.0' }
  }

  // Check if admin already registered a direct evaluation for this player in this club
  const { data: existingRating } = await supabase
    .from('match_player_ratings')
    .select('id')
    .eq('club_id', clubId)
    .eq('evaluator_id', user.id)
    .eq('evaluated_player_id', targetUserId)
    .is('event_id', null)
    .maybeSingle()

  if (existingRating) {
    const { error: updateErr } = await supabase
      .from('match_player_ratings')
      .update({
        rating: numericRating,
        comment: comment?.trim() || null,
        created_at: new Date().toISOString(),
      })
      .eq('id', existingRating.id)

    if (updateErr) {
      return { error: `Error actualizando evaluación: ${updateErr.message}` }
    }
  } else {
    const { error: insertErr } = await supabase
      .from('match_player_ratings')
      .insert({
        event_id: null,
        club_id: clubId,
        evaluator_id: user.id,
        evaluated_player_id: targetUserId,
        rating: numericRating,
        comment: comment?.trim() || null,
      })

    if (insertErr) {
      return { error: `Error registrando evaluación: ${insertErr.message}` }
    }
  }

  // Recalculate average rating for target player across all club ratings
  const { data: allRatings } = await supabase
    .from('match_player_ratings')
    .select('rating')
    .eq('club_id', clubId)
    .eq('evaluated_player_id', targetUserId)

  const totalCount = allRatings?.length || 0
  const sum = allRatings?.reduce((acc, r) => acc + Number(r.rating), 0) || 0
  const newAverage = totalCount > 0 ? Number((sum / totalCount).toFixed(1)) : numericRating

  // Get current user_stats
  const { data: currentStats } = await supabase
    .from('user_stats')
    .select('average_rating, match_history_ratings')
    .eq('user_id', targetUserId)
    .eq('club_id', clubId)
    .maybeSingle()

  const prevAvg = currentStats?.average_rating ?? null

  interface RatingHistoryItem {
    event_id?: string
    date: string
    rating: number
    source?: string
    [key: string]: string | number | undefined
  }

  const history = (currentStats?.match_history_ratings as unknown as RatingHistoryItem[]) || []
  const historyItem: RatingHistoryItem = {
    date: new Date().toISOString(),
    rating: numericRating,
    source: 'admin_eval',
  }
  const updatedHistory = [...history, historyItem]

  await supabase
    .from('user_stats')
    .upsert({
      user_id: targetUserId,
      club_id: clubId,
      average_rating: newAverage,
      last_match_rating: numericRating,
      previous_average_rating: prevAvg,
      ratings_count: totalCount,
      match_history_ratings: updatedHistory.slice(-10),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,club_id' })

  // Send push notification to evaluated member
  try {
    await sendPushToUser(targetUserId, {
      title: `[${club.name}] Evaluación de Jugador 📋`,
      body: `La capitanía ha registrado una nueva evaluación de desempeño. Revisa tu ficha confidencial en tu perfil.`,
      url: '/perfil',
      type: 'admin',
      clubId,
    })
  } catch {}

  revalidatePath('/miembros')
  revalidatePath('/perfil')
  revalidatePath('/ranking')
  return { success: true, newAverage, totalCount }
}
