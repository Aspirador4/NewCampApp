'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendPushToUser } from '@/app/api/push/actions'
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

  revalidatePath('/')
  revalidatePath('/miembros')
  return { success: true }
}
