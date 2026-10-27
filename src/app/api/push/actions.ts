'use server'

import webpush from 'web-push'
import { createClient } from '@/utils/supabase/server'
import { getActiveClub } from '@/utils/club'
import { NotificationType } from '@/types/database.types'
import {
  NotificationCategory,
  UserNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  inferNotificationCategory,
} from '@/types/notifications.types'

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
  category?: NotificationCategory
}

export async function getEffectivePreferencesForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  clubId?: string
): Promise<UserNotificationPreferences> {
  // 1. Try querying user_notification_preferences table
  try {
    let query = supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)

    if (clubId) {
      query = query.or(`club_id.eq.${clubId},club_id.is.null`)
    }

    const { data, error } = await query

    if (!error && data && data.length > 0) {
      // Find club-specific match first, else global
      const match = data.find((p) => p.club_id === clubId) || data.find((p) => !p.club_id) || data[0]
      return {
        push_enabled: match.push_enabled ?? true,
        in_app_enabled: match.in_app_enabled ?? true,
        convocatorias: match.convocatorias ?? true,
        equipos: match.equipos ?? true,
        recordatorios: match.recordatorios ?? true,
        espera: match.espera ?? true,
        finanzas: match.finanzas ?? true,
        mvp: match.mvp ?? true,
        invitados: match.invitados ?? true,
        admin_alertas: match.admin_alertas ?? true,
      }
    }
  } catch {}

  // 2. Fallback: check profiles.custom_attributes.notification_preferences
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('custom_attributes')
      .eq('id', userId)
      .maybeSingle()

    const customAttrs = profile?.custom_attributes as Record<string, unknown> | null
    const savedPrefs = customAttrs?.notification_preferences as Partial<UserNotificationPreferences> | undefined

    if (savedPrefs) {
      return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...savedPrefs,
      }
    }
  } catch (err) {
    console.error('Error fetching fallback notification preferences:', err)
  }

  return { ...DEFAULT_NOTIFICATION_PREFERENCES }
}

export async function getNotificationPreferencesAction(clubId?: string): Promise<UserNotificationPreferences> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ...DEFAULT_NOTIFICATION_PREFERENCES }

  return getEffectivePreferencesForUser(supabase, user.id, clubId)
}

export async function updateNotificationPreferencesAction(
  prefs: Partial<UserNotificationPreferences>,
  clubId?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const currentPrefs = await getEffectivePreferencesForUser(supabase, user.id, clubId)
  const updatedPrefs: UserNotificationPreferences = {
    ...currentPrefs,
    ...prefs,
  }

  let tableSaved = false

  // 1. Try upserting to user_notification_preferences table
  try {
    const { error: upsertErr } = await supabase
      .from('user_notification_preferences')
      .upsert(
        {
          user_id: user.id,
          club_id: clubId || null,
          push_enabled: updatedPrefs.push_enabled,
          in_app_enabled: updatedPrefs.in_app_enabled,
          convocatorias: updatedPrefs.convocatorias,
          equipos: updatedPrefs.equipos,
          recordatorios: updatedPrefs.recordatorios,
          espera: updatedPrefs.espera,
          finanzas: updatedPrefs.finanzas,
          mvp: updatedPrefs.mvp,
          invitados: updatedPrefs.invitados,
          admin_alertas: updatedPrefs.admin_alertas,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,club_id',
        }
      )

    if (!upsertErr) {
      tableSaved = true
    }
  } catch (err) {
    console.warn('Note: user_notification_preferences table upsert skipped, will persist in profiles fallback', err)
  }

  // 2. Always persist in profiles.custom_attributes.notification_preferences as dual-layer guarantee
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('custom_attributes')
      .eq('id', user.id)
      .single()

    const existingAttrs = (profile?.custom_attributes as Record<string, unknown>) || {}
    const newAttrs = {
      ...existingAttrs,
      notification_preferences: updatedPrefs,
    }

    await supabase
      .from('profiles')
      .update({ custom_attributes: newAttrs as unknown as Record<string, import('@/types/database.types').Json>, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  } catch (profileErr) {
    console.error('Error saving notification preferences in profile fallback:', profileErr)
    if (!tableSaved) {
      return { error: 'No se pudieron guardar las preferencias' }
    }
  }

  return { success: true, preferences: updatedPrefs }
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

  // 0. Check User Preferences
  const category = inferNotificationCategory(payload)
  const prefs = await getEffectivePreferencesForUser(supabase, userId, payload.clubId)

  // If user disabled this specific category, skip both push and in-app
  if (category !== 'sistema' && prefs[category] === false) {
    return { sent: 0, suppressed: true, reason: `Category ${category} disabled by user` }
  }

  // 1. Create In-App Notification (always recorded unless explicitly disabled or in-app turned off)
  if (options?.saveInApp !== false && prefs.in_app_enabled !== false) {
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

  // If user disabled Web Push, return without dispatching push
  if (prefs.push_enabled === false) {
    return { sent: 0, pushDisabled: true }
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
  const category = inferNotificationCategory(payload)

  // 1. Record in-app notification for all approved members who allow this category
  try {
    const { data: memberRows } = await supabase.rpc('get_club_member_user_ids', {
      p_club_id: clubId,
      p_exclude_user_id: excludeUserId || undefined,
    })

    const userIds = ((memberRows || []) as { user_id: string }[]).map((r) => r.user_id)
    if (userIds.length > 0) {
      const allowedInAppUserIds: string[] = []

      for (const uid of userIds) {
        const prefs = await getEffectivePreferencesForUser(supabase, uid, clubId)
        if (prefs.in_app_enabled !== false && (category === 'sistema' || prefs[category] !== false)) {
          allowedInAppUserIds.push(uid)
        }
      }

      if (allowedInAppUserIds.length > 0) {
        await supabase.rpc('create_bulk_in_app_notifications', {
          p_user_ids: allowedInAppUserIds,
          p_club_id: clubId,
          p_title: payload.title,
          p_body: payload.body,
          p_url: payload.url || '/',
          p_type: payload.type || 'evento',
        })
      }
    }
  } catch (e) {
    console.error('Error recording bulk member in-app notifications:', e)
  }

  // 2. Send Web Push to devices of approved members who have push enabled for this category
  const { data: subsRpc } = await supabase.rpc('get_club_members_push_subscriptions', {
    p_club_id: clubId,
    p_exclude_user_id: excludeUserId || undefined,
  })

  const subs = (subsRpc || []) as PushSubscriptionRow[]
  if (subs.length === 0) {
    return { sent: 0 }
  }

  const allowedPushSubs: PushSubscriptionRow[] = []
  for (const sub of subs) {
    if (sub.user_id) {
      const prefs = await getEffectivePreferencesForUser(supabase, sub.user_id, clubId)
      if (prefs.push_enabled !== false && (category === 'sistema' || prefs[category] !== false)) {
        allowedPushSubs.push(sub)
      }
    } else {
      allowedPushSubs.push(sub)
    }
  }

  return dispatchWebPushBatch(supabase, allowedPushSubs, payload)
}

export async function sendPushToClubAdmins(
  clubId: string,
  payload: PushPayload,
  excludeUserId?: string
) {
  const supabase = await createClient()

  // 1. Record in-app notification for all admins who allow admin alerts
  try {
    const { data: adminRows } = await supabase.rpc('get_club_admin_user_ids', {
      p_club_id: clubId,
      p_exclude_user_id: excludeUserId || undefined,
    })

    const userIds = ((adminRows || []) as { user_id: string }[]).map((r) => r.user_id)
    if (userIds.length > 0) {
      const allowedAdminUserIds: string[] = []

      for (const uid of userIds) {
        const prefs = await getEffectivePreferencesForUser(supabase, uid, clubId)
        if (prefs.in_app_enabled !== false && prefs.admin_alertas !== false) {
          allowedAdminUserIds.push(uid)
        }
      }

      if (allowedAdminUserIds.length > 0) {
        await supabase.rpc('create_bulk_in_app_notifications', {
          p_user_ids: allowedAdminUserIds,
          p_club_id: clubId,
          p_title: payload.title,
          p_body: payload.body,
          p_url: payload.url || '/',
          p_type: payload.type || 'admin',
        })
      }
    }
  } catch (e) {
    console.error('Error recording bulk admin in-app notifications:', e)
  }

  // 2. Send Web Push to devices belonging to admins who have push & admin_alertas enabled
  const { data: subsRpc } = await supabase.rpc('get_club_admins_push_subscriptions', {
    p_club_id: clubId,
    p_exclude_user_id: excludeUserId || undefined,
  })

  const subs = (subsRpc || []) as PushSubscriptionRow[]
  if (subs.length === 0) {
    return { sent: 0 }
  }

  const allowedAdminSubs: PushSubscriptionRow[] = []
  for (const sub of subs) {
    if (sub.user_id) {
      const prefs = await getEffectivePreferencesForUser(supabase, sub.user_id, clubId)
      if (prefs.push_enabled !== false && prefs.admin_alertas !== false) {
        allowedAdminSubs.push(sub)
      }
    } else {
      allowedAdminSubs.push(sub)
    }
  }

  return dispatchWebPushBatch(supabase, allowedAdminSubs, payload)
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
