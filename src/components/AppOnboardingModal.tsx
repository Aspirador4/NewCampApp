'use client'

import { useState, useEffect } from 'react'
import { Bell, Smartphone, Share, CheckCircle2, Loader2, X, Sparkles } from 'lucide-react'
import { subscribeToPushNotifications, registerServiceWorker } from '@/utils/push/subscribe'
import { savePushSubscription } from '@/app/api/push/actions'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface AppOnboardingModalProps {
  isLoggedIn: boolean
  userId?: string
  hasPushSub?: boolean
}

export function AppOnboardingModal({ isLoggedIn, userId, hasPushSub = false }: AppOnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default')
  const [pushLoading, setPushLoading] = useState(false)
  const [pushSuccess, setPushSuccess] = useState(Boolean(hasPushSub))
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dismissalKey = userId ? `campapp_onboarding_dismissed_${userId}` : 'campapp_onboarding_dismissed'

  useEffect(() => {
    if (!isLoggedIn) return

    // Only run on client
    registerServiceWorker()

    // Detect standalone PWA mode
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    setIsStandalone(Boolean(standaloneCheck))

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase()
    setIsIos(/iphone|ipad|ipod/.test(ua))

    // Check browser notification permission
    let currentPerm: 'default' | 'granted' | 'denied' | 'unsupported' = 'default'
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      currentPerm = 'unsupported'
    } else {
      currentPerm = Notification.permission as 'default' | 'granted' | 'denied'
    }
    setPushStatus(currentPerm)

    // Capture install prompt
    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)

    // Check account-scoped dismissal in localStorage
    const dismissedAt = localStorage.getItem(dismissalKey)
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000
    const isDismissedRecently = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < threeDaysMs

    // If browser permission is already granted but this account does not have a DB subscription,
    // attempt auto-registration in the background for a seamless experience
    if (currentPerm === 'granted' && !hasPushSub && !pushSuccess) {
      subscribeToPushNotifications().then(async (res) => {
        if (res.success && res.subscription) {
          const subJSON = res.subscription.toJSON()
          if (subJSON.endpoint && subJSON.keys?.p256dh && subJSON.keys?.auth) {
            const saveRes = await savePushSubscription({
              endpoint: subJSON.endpoint,
              keys: {
                p256dh: subJSON.keys.p256dh,
                auth: subJSON.keys.auth,
              },
            })
            if (saveRes?.success) {
              setPushSuccess(true)
              return
            }
          }
        }
      })
    }

    // Show popup if account is not subscribed or permission not granted, and not recently dismissed
    const needsSetup = (!hasPushSub && !pushSuccess) || currentPerm !== 'granted'
    if (needsSetup && !isDismissedRecently) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 1200)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handlePrompt)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handlePrompt)
  }, [isLoggedIn, userId, hasPushSub, pushSuccess, dismissalKey])

  const handleDismiss = () => {
    localStorage.setItem(dismissalKey, Date.now().toString())
    setIsOpen(false)
  }

  const handleActivatePush = async () => {
    setError(null)
    setPushLoading(true)

    const res = await subscribeToPushNotifications()
    setPushLoading(false)

    if (!res.success || !res.subscription) {
      setError(res.error || 'No se pudo activar las notificaciones. Verifica los permisos de tu navegador.')
      if (Notification.permission === 'denied') {
        setPushStatus('denied')
      }
      return
    }

    const subJSON = res.subscription.toJSON()
    if (!subJSON.endpoint || !subJSON.keys?.p256dh || !subJSON.keys?.auth) {
      setError('Formato de suscripción no válido')
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
      setPushSuccess(true)
      setTimeout(() => {
        handleDismiss()
      }, 2000)
    }
  }

  const handleInstallApp = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex items-center gap-3 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shadow-md">
            <Bell className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Bienvenido al Club
            </span>
            <h3 className="font-extrabold text-lg text-neutral-900 leading-tight mt-0.5">
              ¡No te pierdas de nada!
            </h3>
          </div>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed">
          Activa las notificaciones y agrega la app a tu pantalla de inicio para enterarte al instante de convocatorias y avisos clave del club.
        </p>

        {/* Benefits list */}
        <div className="space-y-2 bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200/80 text-xs text-neutral-700">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>Avisos instantáneos de nuevas convocatorias a partidos y entrenamientos.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>Alerta inmediata si subes de la Lista de Espera a Cupo Confirmado.</span>
          </div>
          <div className="flex items-start gap-2.5">
            <Bell className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>Votaciones de MVP de la fecha y recordatorios de pago.</span>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
            {error}
          </p>
        )}

        {/* Action 1: Notifications */}
        <div>
          {pushSuccess ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>¡Notificaciones activadas en tu cuenta!</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleActivatePush}
              disabled={pushLoading || pushStatus === 'unsupported'}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {pushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              <span>
                {pushStatus === 'granted'
                  ? 'Vincular Notificaciones a mi Cuenta'
                  : 'Activar Notificaciones Push'}
              </span>
            </button>
          )}
        </div>

        {/* Action 2: Add to Home Screen (PWA) */}
        {!isStandalone && (
          <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-xs space-y-2">
            <div className="flex items-center gap-2 text-neutral-800 font-bold">
              <Smartphone className="w-4 h-4 text-neutral-600" />
              <span>Instalar en tu Pantalla de Inicio</span>
            </div>

            {deferredPrompt ? (
              <button
                type="button"
                onClick={handleInstallApp}
                className="w-full py-2 px-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Instalar App en el Celular</span>
              </button>
            ) : isIos ? (
              <p className="text-[11px] text-neutral-600 leading-normal">
                En Safari de iPhone: toca el botón compartir{' '}
                <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> y luego selecciona{' '}
                <strong className="text-neutral-900 font-bold">&quot;Agregar a inicio&quot;</strong>.
              </p>
            ) : (
              <p className="text-[11px] text-neutral-600">
                Abre el menú de tu navegador (tres puntos) y selecciona{' '}
                <strong className="text-neutral-900 font-bold">&quot;Instalar aplicación&quot;</strong> o{' '}
                <strong className="text-neutral-900 font-bold">&quot;Agregar a pantalla principal&quot;</strong>.
              </p>
            )}
          </div>
        )}

        {/* Secondary Action */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full py-2.5 text-center text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition"
        >
          Continuar a la App
        </button>
      </div>
    </div>
  )
}
