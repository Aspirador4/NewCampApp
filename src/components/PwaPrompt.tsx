'use client'

import { useState, useEffect } from 'react'
import { subscribeToPushNotifications, registerServiceWorker } from '@/utils/push/subscribe'
import { savePushSubscription, sendTestPush } from '@/app/api/push/actions'
import { Bell, Smartphone, Share, CheckCircle2, Loader2, AlertCircle, Send } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default')
  const [pushLoading, setPushLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Register SW on load
    registerServiceWorker()

    // Detect standalone mode
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsStandalone(Boolean(standaloneCheck))

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIos(isIosDevice)

    // Check Notification support and permission
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPushStatus('unsupported')
    } else {
      setPushStatus(Notification.permission as 'default' | 'granted' | 'denied')
    }

    // Capture beforeinstallprompt for Android / Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const handleSubscribePush = async () => {
    setError(null)
    setFeedback(null)
    setPushLoading(true)

    const res = await subscribeToPushNotifications()
    setPushLoading(false)

    if (!res.success || !res.subscription) {
      setError(res.error || 'No se pudo suscribir a notificaciones')
      if (Notification.permission === 'denied') {
        setPushStatus('denied')
      }
      return
    }

    // Save to database
    const subJSON = res.subscription.toJSON()
    if (!subJSON.endpoint || !subJSON.keys?.p256dh || !subJSON.keys?.auth) {
      setError('Formato de suscripción inválido')
      return
    }

    const saveRes = await savePushSubscription({
      endpoint: subJSON.endpoint,
      keys: {
        p256dh: subJSON.keys.p256dh,
        auth: subJSON.keys.auth,
      },
    })

    if (saveRes?.error) {
      setError(saveRes.error)
    } else {
      setPushStatus('granted')
      setFeedback('¡Notificaciones push activadas con éxito!')
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  const handleSendTestPush = async () => {
    setError(null)
    setFeedback(null)
    setTestLoading(true)
    const res = await sendTestPush()
    setTestLoading(false)

    if (res?.error) {
      setError(res.error)
    } else if (res?.success) {
      setFeedback(res.message || 'Notificación enviada')
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  return (
    <div className="space-y-3">
      {/* 1. Install Banner (Android / Chrome) */}
      {!isStandalone && deferredPrompt && (
        <div className="bg-emerald-950 text-white rounded-2xl p-4 shadow-md flex items-center justify-between border border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-xs">Instalar Aplicación</p>
              <p className="text-[11px] text-neutral-300">
                Agrégala a tu pantalla de inicio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="px-3 py-1.5 rounded-xl bg-white text-emerald-950 font-bold text-xs shadow-sm hover:bg-neutral-100 transition active:scale-95"
          >
            Instalar
          </button>
        </div>
      )}

      {/* 2. iOS Safari Add to Home Tip */}
      {!isStandalone && isIos && (
        <div className="bg-neutral-100 border border-neutral-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-neutral-700">
          <div className="p-2 rounded-xl bg-white text-neutral-800 shadow-xs mt-0.5">
            <Share className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-neutral-900">
              Instalar en tu iPhone
            </p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Presiona el botón <span className="font-semibold text-neutral-800">Compartir</span> en Safari y luego selecciona <span className="font-semibold text-neutral-800">&quot;Agregar a Inicio&quot;</span>.
            </p>
          </div>
        </div>
      )}

      {/* 3. Push Notifications Card */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-xs text-neutral-900">
                Notificaciones Push (VAPID)
              </p>
              <p className="text-[11px] text-neutral-500">
                {pushStatus === 'granted'
                  ? 'Alertas activadas para cupos y partidos'
                  : 'Entérate al instante si subes de lista de espera'}
              </p>
            </div>
          </div>

          {pushStatus === 'granted' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Activas
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {feedback && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="pt-1 flex flex-col gap-2">
          {pushStatus !== 'granted' && (
            <button
              type="button"
              onClick={handleSubscribePush}
              disabled={pushLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white shadow-xs transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {pushLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bell className="w-3.5 h-3.5" />
              )}
              <span>Activar Notificaciones en este Dispositivo</span>
            </button>
          )}

          {pushStatus === 'granted' && (
            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={testLoading}
              className="w-full py-2 px-3 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-medium text-xs transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {testLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-neutral-500" />
              )}
              <span>Enviar Notificación de Prueba</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
