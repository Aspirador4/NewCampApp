'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function settleMemberDebtsAction(targetUserId: string, debtIds?: string[]) {
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
    return { error: 'Solo los administradores pueden marcar jugadores al día' }
  }

  const { data, error } = await supabase.rpc('settle_member_debts', {
    p_user_id: targetUserId,
    p_debt_ids: debtIds && debtIds.length > 0 ? debtIds : undefined,
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('system_role')
    .eq('id', user.id)
    .single()

  if (profile?.system_role !== 'admin') {
    return { error: 'Solo los administradores pueden revertir deudas' }
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
