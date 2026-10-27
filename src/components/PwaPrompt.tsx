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
        <div className="bg-neutral-950 text-white rounded-3xl p-4 shadow-tactile flex items-center justify-between border-2 border-neutral-900 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-neutral-950 border border-neutral-900 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display font-bold text-sm uppercase tracking-tight text-white">Instalar Aplicación</p>
              <p className="font-mono text-[10px] text-neutral-400">
                Agrégala a tu pantalla de inicio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleInstallClick}
            className="btn-tactile px-3.5 py-2 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-[#1a1d28] text-neutral-950 dark:text-white font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm hover:bg-neutral-100 dark:hover:bg-white/10 transition active:scale-95"
          >
            Instalar
          </button>
        </div>
      )}

      {/* 2. iOS Safari Add to Home Tip */}
      {!isStandalone && isIos && (
        <div className="bg-neutral-50 dark:bg-[#1a1d28] border-2 border-neutral-200 dark:border-neutral-700 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-neutral-700 dark:text-neutral-300">
          <div className="p-2 rounded-xl bg-white dark:bg-[#14161f] border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white shadow-xs mt-0.5">
            <Share className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <p className="font-display font-bold text-xs uppercase tracking-wider text-neutral-950 dark:text-white">
              Instalar en tu iPhone
            </p>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-0.5 font-sans">
              Presiona el botón <span className="font-bold text-neutral-950 dark:text-white">Compartir</span> en Safari y luego selecciona <span className="font-bold text-neutral-950 dark:text-white">&quot;Agregar a Inicio&quot;</span>.
            </p>
          </div>
        </div>
      )}

      {/* 3. Push Notifications Card */}
      <div className="bg-white dark:bg-[#14161f] rounded-3xl p-4 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-amber-100 dark:bg-amber-950/60 text-neutral-950 dark:text-amber-400 shadow-tactile-sm">
              <Bell className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display font-bold text-xs uppercase tracking-wider text-neutral-950 dark:text-white">
                Notificaciones Push Oficiales
              </p>
              <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                {pushStatus === 'granted'
                  ? 'Alertas activadas para cupos y partidos'
                  : 'Entérate al instante si subes de lista de espera'}
              </p>
            </div>
          </div>

          {pushStatus === 'granted' && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase text-emerald-950 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
              Activas
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-medium">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {feedback && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="pt-1 flex flex-col gap-2">
          {pushStatus !== 'granted' && (
            <button
              type="button"
              onClick={handleSubscribePush}
              disabled={pushLoading}
              className="btn-tactile w-full py-2.5 px-4 rounded-xl border-2 border-neutral-900 dark:border-white bg-neutral-950 dark:bg-white hover:bg-neutral-900 dark:hover:bg-neutral-100 font-display font-bold text-xs uppercase tracking-wider text-white dark:text-neutral-950 shadow-tactile-sm transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {pushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>Activar Notificaciones en este Dispositivo</span>
            </button>
          )}

          {pushStatus === 'granted' && (
            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={testLoading}
              className="btn-tactile w-full py-2 px-3 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-[#1a1d28] hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-900 dark:text-white font-display font-bold text-xs uppercase tracking-wider transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-tactile-sm min-h-[40px]"
            >
              {testLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400 stroke-[2.5]" />
              )}
              <span>Enviar Notificación de Prueba</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
