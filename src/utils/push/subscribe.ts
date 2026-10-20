'use client'

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

export async function subscribeToPushNotifications(): Promise<{
  success: boolean
  error?: string
  subscription?: PushSubscription
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Entorno no soportado' }
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      success: false,
      error: 'Tu navegador o dispositivo no soporta notificaciones Web Push.',
    }
  }

  try {
    const registration = await registerServiceWorker()
    if (!registration) {
      return { success: false, error: 'No se pudo registrar el Service Worker' }
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Permiso de notificaciones denegado. Habilítalo en los ajustes de tu navegador.',
      }
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      return { success: false, error: 'Clave pública VAPID no configurada' }
    }

    const applicationServerKey = urlB64ToUint8Array(vapidPublicKey)

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
    }

    return { success: true, subscription }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido al suscribirse a Push'
    return { success: false, error: message }
  }
}
