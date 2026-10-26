'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { getActiveClub } from '@/utils/club'
import { Json } from '@/types/database.types'

export async function settleMemberDebtsAction(targetUserId: string, debtIds?: string[], targetClubId?: string) {
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
    return { error: 'Solo los administradores del club pueden marcar jugadores al día' }
  }

  const { data, error } = await supabase.rpc('settle_member_debts', {
    p_user_id: targetUserId,
    p_debt_ids: debtIds && debtIds.length > 0 ? debtIds : undefined,
    p_club_id: clubId,
  })

  if (error) {
    return { error: `Error al sanear deudas: ${error.message}` }
  }

  revalidatePath('/finanzas')
  revalidatePath('/perfil')
  revalidatePath('/')
  return { success: true, data }
}

export async function revertDebtAction(debtId: string) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { club, isAdmin: isClubAdminActive } = await getActiveClub(supabase)

  const { data: debt } = await supabase
    .from('member_debts')
    .select('club_id')
    .eq('id', debtId)
    .single()

  const targetClubId = debt?.club_id || club.id

  let isAdmin = isClubAdminActive && targetClubId === club.id
  if (!isAdmin) {
    const { data: callerMember } = await supabase
      .from('club_members')
      .select('system_role, approval_status')
      .eq('club_id', targetClubId)
      .eq('user_id', user.id)
      .maybeSingle()
    isAdmin = callerMember?.system_role === 'admin' && callerMember?.approval_status === 'aprobado'
  }

  if (!isAdmin) {
    return { error: 'Solo los administradores del club pueden revertir deudas' }
  }

  const { error } = await supabase.rpc('revert_debt_to_pending', {
    p_debt_id: debtId,
  })

  if (error) {
    return { error: `Error al revertir deuda: ${error.message}` }
  }

  revalidatePath('/finanzas')
  return { success: true }
}

export async function generateEventDebtsAction(eventId: string, costPerPlayer?: number) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  const { data, error } = await supabase.rpc('generate_event_debts', {
    p_event_id: eventId,
    p_cost_per_player: costPerPlayer,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/finanzas')
  revalidatePath(`/eventos/${eventId}`)
  return { success: true, data }
}

export interface BankDetails {
  banco: string
  tipo_cuenta: string
  numero_cuenta: string
  titular: string
  rut: string
  email: string
}

export async function updateBankDetailsAction(details: BankDetails, targetClubId?: string) {
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
    return { error: 'Solo los administradores pueden modificar los datos bancarios de este club' }
  }

  // Update in clubs.settings
  const { data: currentClub } = await supabase
    .from('clubs')
    .select('settings')
    .eq('id', clubId)
    .single()

  const currentSettings = (currentClub?.settings as Record<string, Json>) || {}
  const updatedSettings = {
    ...currentSettings,
    bank_details: details as unknown as Json,
  }

  const { error: clubErr } = await supabase
    .from('clubs')
    .update({
      settings: updatedSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clubId)

  if (clubErr) {
    return { error: clubErr.message }
  }

  // Also update legacy club_settings if available
  try {
    await supabase.from('club_settings').upsert({
      key: 'bank_details',
      value: details as unknown as Record<string, string>,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
  } catch {}

  revalidatePath('/finanzas')
  return { success: true }
}
