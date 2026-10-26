'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { sendPushToUser } from '@/app/api/push/actions'
import { SystemRole } from '@/types/database.types'

export async function approveMemberAction(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  // Check admin
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.system_role !== 'admin') {
    return { error: 'Solo los administradores pueden admitir nuevos miembros' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ approval_status: 'aprobado', updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) {
    return { error: error.message }
  }

  try {
    await sendPushToUser(targetUserId, {
      title: '¡Bienvenido al Club! 🎉',
      body: 'Tu cuenta ha sido admitida oficialmente. Ya puedes inscribirte a partidos y eventos.',
      url: '/eventos',
    })
  } catch (e) {
    console.error('Error sending push notification:', e)
  }

  revalidatePath('/miembros')
  revalidatePath('/')
  return { success: true }
}

export async function rejectMemberAction(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.system_role !== 'admin') {
    return { error: 'Solo los administradores pueden rechazar miembros' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ approval_status: 'rechazado', updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/miembros')
  return { success: true }
}

export async function deleteMemberAction(targetUserId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  if (user.id === targetUserId) {
    return { error: 'No puedes eliminarte a ti mismo del club' }
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.system_role !== 'admin') {
    return { error: 'Solo los administradores pueden eliminar miembros' }
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', targetUserId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/miembros')
  revalidatePath('/')
  return { success: true }
}

export async function updateMemberRoleAction(targetUserId: string, newRole: SystemRole) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.system_role !== 'admin') {
    return { error: 'Solo los administradores pueden asignar roles' }
  }

  // If removing admin from oneself, ensure there is at least one other admin
  if (user.id === targetUserId && newRole === 'member') {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('system_role', 'admin')

    if ((count || 0) <= 1) {
      return { error: 'No puedes quitarte el rol de administrador siendo el único admin del club' }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ system_role: newRole, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/miembros')
  revalidatePath('/perfil')
  return { success: true }
}

export async function submitMotivationAction(motivationText: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const cleanText = motivationText.trim().slice(0, 50)
  if (!cleanText) {
    return { error: 'Por favor escribe una breve motivación (máximo 50 caracteres)' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ motivation: cleanText, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/miembros')
  return { success: true }
}
