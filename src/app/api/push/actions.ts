'use server'

import webpush from 'web-push'
import { createClient } from '@/utils/supabase/server'
import { getActiveClub } from '@/utils/club'
import { NotificationType } from '@/types/database.types'

// Configure VAPID
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@clubdeportivo.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  type?: NotificationType
  clubId?: string
}

export async function savePushSubscription(subscriptionJSON: {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'No autorizado' }
  }

  if (!subscriptionJSON.endpoint || !subscriptionJSON.keys?.p256dh || !subscriptionJSON.keys?.auth) {
    return { error: 'Datos de suscripción incompletos' }
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: subscriptionJSON.endpoint,
        keys_p256dh: subscriptionJSON.keys.p256dh,
        keys_auth: subscriptionJSON.keys.auth,
      },
      {
        onConflict: 'user_id,endpoint',
      }
    )

  if (error) {
    return { error: `Error al guardar suscripción push: ${error.message}` }
  }

  return { success: true }
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'No autorizado' }
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

interface PushSubscriptionRow {
  id: string
  user_id?: string
  endpoint: string
  keys_p256dh: string
  keys_auth: string
}

async function dispatchWebPushBatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subs: PushSubscriptionRow[],
  payload: PushPayload
) {
  if (!subs || subs.length === 0) return { sent: 0 }

  let sentCount = 0
  const staleSubIds: string[] = []

  const notificationString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: payload.icon || '/icons/icon-192.png',
  })

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys_p256dh,
        auth: sub.keys_auth,
      },
    }

    try {
      await webpush.sendNotification(pushSub, notificationString)
      sentCount++
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        staleSubIds.push(sub.id)
      }
    }
  }

  if (staleSubIds.length > 0) {
    try {
      await supabase.rpc('delete_stale_push_subscriptions', { p_sub_ids: staleSubIds })
    } catch (err) {
      console.error('Error cleaning stale push subscriptions:', err)
    }
  }

  return { sent: sentCount }
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  options?: { saveInApp?: boolean }
) {
  const supabase = await createClient()

  // 1. Create In-App Notification (always recorded unless explicitly disabled)
  if (options?.saveInApp !== false) {
    try {
      await supabase.rpc('create_in_app_notification', {
        p_user_id: userId,
        p_club_id: payload.clubId || undefined,
        p_title: payload.title,
        p_body: payload.body,
        p_url: payload.url || '/',
        p_type: payload.type || 'sistema',
      })
    } catch (e) {
      console.error('Error saving in-app notification:', e)
    }
  }

  // 2. Fetch push tokens via SECURITY DEFINER RPC
  const { data: subsRpc, error } = await supabase.rpc('get_user_push_subscriptions', {
    p_user_id: userId,
  })

  const subs = (subsRpc || []) as PushSubscriptionRow[]
  if (error || subs.length === 0) {
    return { sent: 0 }
  }

  return dispatchWebPushBatch(supabase, subs, payload)
}

export async function sendPushToClubMembers(
  clubId: string,
  payload: PushPayload,
  excludeUserId?: string
) {
  const supabase = await createClient()

  // 1. Record in-app notification for all approved members
  try {
    const { data: memberRows } = await supabase.rpc('get_club_member_user_ids', {
      p_club_id: clubId,
      p_exclude_user_id: excludeUserId || undefined,
    })

    const userIds = ((memberRows || []) as { user_id: string }[]).map((r) => r.user_id)
    if (userIds.length > 0) {
      await supabase.rpc('create_bulk_in_app_notifications', {
        p_user_ids: userIds,
        p_club_id: clubId,
        p_title: payload.title,
        p_body: payload.body,
        p_url: payload.url || '/',
        p_type: payload.type || 'evento',
      })
    }
  } catch (e) {
    console.error('Error recording bulk member in-app notifications:', e)
  }

  // 2. Send Web Push to all devices belonging to approved members of this club
  const { data: subsRpc } = await supabase.rpc('get_club_members_push_subscriptions', {
    p_club_id: clubId,
    p_exclude_user_id: excludeUserId || undefined,
  })

  const subs = (subsRpc || []) as PushSubscriptionRow[]
  return dispatchWebPushBatch(supabase, subs, payload)
}

export async function sendPushToClubAdmins(
  clubId: string,
  payload: PushPayload,
  excludeUserId?: string
) {
  const supabase = await createClient()

  // 1. Record in-app notification for all admins
  try {
    const { data: adminRows } = await supabase.rpc('get_club_admin_user_ids', {
      p_club_id: clubId,
      p_exclude_user_id: excludeUserId || undefined,
    })

    const userIds = ((adminRows || []) as { user_id: string }[]).map((r) => r.user_id)
    if (userIds.length > 0) {
      await supabase.rpc('create_bulk_in_app_notifications', {
        p_user_ids: userIds,
        p_club_id: clubId,
        p_title: payload.title,
        p_body: payload.body,
        p_url: payload.url || '/',
        p_type: payload.type || 'admin',
      })
    }
  } catch (e) {
    console.error('Error recording bulk admin in-app notifications:', e)
  }

  // 2. Send Web Push to all devices belonging to admins of this club
  const { data: subsRpc } = await supabase.rpc('get_club_admins_push_subscriptions', {
    p_club_id: clubId,
    p_exclude_user_id: excludeUserId || undefined,
  })

  const subs = (subsRpc || []) as PushSubscriptionRow[]
  return dispatchWebPushBatch(supabase, subs, payload)
}

export async function sendPushToAll(payload: PushPayload) {
  const supabase = await createClient()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys_p256dh, keys_auth')

  if (!subs || subs.length === 0) {
    return { sent: 0 }
  }

  return dispatchWebPushBatch(supabase, subs as PushSubscriptionRow[], payload)
}

export async function sendTestPush() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Debes iniciar sesión' }
  }

  const { club } = await getActiveClub(supabase)

  const res = await sendPushToUser(user.id, {
    title: `[${club.name}] ¡Gol! Notificación de Prueba ⚽`,
    body: `Las notificaciones de ${club.name} están funcionando correctamente.`,
    url: '/',
    type: 'sistema',
    clubId: club.id,
  })

  if (res.sent === 0) {
    return {
      success: true,
      message: 'Notificación registrada en tu buzón in-app (no hay dispositivos web push vinculados actualmente).',
    }
  }

  return { success: true, message: `Notificación enviada a ${res.sent} dispositivo(s).` }
}

export async function getInAppNotifications(clubId?: string, limit = 25) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('in_app_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (clubId) {
    query = query.or(`club_id.eq.${clubId},club_id.is.null`)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching in-app notifications:', error)
    return []
  }

  return data || []
}

export async function markNotificationAsReadAction(notificationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase
    .from('in_app_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function markAllNotificationsAsReadAction(clubId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const { error } = await supabase.rpc('mark_all_notifications_as_read', {
    p_club_id: clubId || undefined,
  })

  if (error) return { error: error.message }
  return { success: true }
}
