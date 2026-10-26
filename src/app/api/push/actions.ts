'use server'

import webpush from 'web-push'
import { createClient } from '@/utils/supabase/server'
import { getActiveClub } from '@/utils/club'

// Configure VAPID
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@clubdeportivo.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
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

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const supabase = await createClient()

  // Use SECURITY DEFINER RPC to safely fetch push tokens even when called by another user (e.g. waitlist promotion)
  const { data: subsRpc, error } = await supabase.rpc('get_user_push_subscriptions', {
    p_user_id: userId,
  })

  const subs = subsRpc || []
  if (error || subs.length === 0) {
    return { sent: 0 }
  }

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
        // Subscription is expired or unregistered
        staleSubIds.push(sub.id)
      }
    }
  }

  // Clean stale subscriptions safely
  if (staleSubIds.length > 0) {
    await supabase.rpc('delete_stale_push_subscriptions', { p_sub_ids: staleSubIds })
  }

  return { sent: sentCount }
}

export async function sendPushToAll(payload: PushPayload) {
  const supabase = await createClient()

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys_p256dh, keys_auth')

  if (!subs || subs.length === 0) {
    return { sent: 0 }
  }

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
    await supabase.from('push_subscriptions').delete().in('id', staleSubIds)
  }

  return { sent: sentCount }
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
    body: `Las notificaciones Web Push de ${club.name} están funcionando correctamente.`,
    url: '/',
  })

  if (res.sent === 0) {
    return { error: 'No se encontraron dispositivos suscritos para este usuario.' }
  }

  return { success: true, message: `Notificación enviada a ${res.sent} dispositivo(s).` }
}
