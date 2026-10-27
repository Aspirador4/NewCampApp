'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Bell,
  Smartphone,
  CheckCircle2,
  Calendar,
  ShieldAlert,
  Wallet,
  Trophy,
  Users,
  Clock,
  Sparkles,
  Loader2,
  SlidersHorizontal,
  Send,
} from 'lucide-react'
import {
  UserNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '@/types/notifications.types'
import {
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
  sendTestPush,
  savePushSubscription,
} from '@/app/api/push/actions'
import { subscribeToPushNotifications } from '@/utils/push/subscribe'
import { createClient } from '@/utils/supabase/client'

interface NotificationPreferencesPanelProps {
  clubId?: string
  isAdmin?: boolean
  className?: string
}

export function NotificationPreferencesPanel({
  clubId,
  isAdmin: initialIsAdmin,
  className = '',
}: NotificationPreferencesPanelProps) {
  const [prefs, setPrefs] = useState<UserNotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [isAdminUser, setIsAdminUser] = useState<boolean>(initialIsAdmin ?? false)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [testStatus, setTestStatus] = useState<{ loading: boolean; message?: string; error?: string }>({
    loading: false,
  })

  // Device push status
  const [pushPerm, setPushPerm] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default')
  const [enablingPush, setEnablingPush] = useState(false)

  useEffect(() => {
    // Check admin status if not explicitly passed
    if (initialIsAdmin === undefined) {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        if (clubId) {
          supabase
            .from('club_members')
            .select('system_role, approval_status')
            .eq('club_id', clubId)
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data?.system_role === 'admin' && data?.approval_status === 'aprobado') {
                setIsAdminUser(true)
              }
            })
        } else {
          supabase
            .from('profiles')
            .select('system_role')
            .eq('id', user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data?.system_role === 'admin') {
                setIsAdminUser(true)
              }
            })
        }
      })
    } else {
      setIsAdminUser(initialIsAdmin)
    }

    // Check browser notification permission
    if (typeof window !== 'undefined') {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setPushPerm('unsupported')
      } else {
        setPushPerm(Notification.permission as 'default' | 'granted' | 'denied')
      }
    }

    // Load saved preferences
    getNotificationPreferencesAction(clubId).then((data) => {
      if (data) {
        setPrefs(data)
      }
      setLoading(false)
    })
  }, [clubId, initialIsAdmin])

  const triggerAutoSave = (newPrefs: UserNotificationPreferences) => {
    setPrefs(newPrefs)
    startTransition(async () => {
      const res = await updateNotificationPreferencesAction(newPrefs, clubId)
      if (res && 'success' in res && res.success) {
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 2200)
      }
    })
  }

  const handleToggle = (key: keyof UserNotificationPreferences) => {
    const nextVal = !prefs[key]
    const updated = {
      ...prefs,
      [key]: nextVal,
    }
    triggerAutoSave(updated)
  }

  const applyPreset = (preset: 'essential' | 'all' | 'minimal') => {
    let presetPrefs: UserNotificationPreferences = { ...prefs }
    if (preset === 'essential') {
      presetPrefs = {
        ...prefs,
        convocatorias: true,
        equipos: false,
        recordatorios: false,
        espera: true,
        finanzas: true,
        mvp: false,
        invitados: true,
        admin_alertas: true,
      }
    } else if (preset === 'all') {
      presetPrefs = {
        ...prefs,
        convocatorias: true,
        equipos: true,
        recordatorios: true,
        espera: true,
        finanzas: true,
        mvp: true,
        invitados: true,
        admin_alertas: true,
      }
    } else if (preset === 'minimal') {
      presetPrefs = {
        ...prefs,
        convocatorias: false,
        equipos: false,
        recordatorios: false,
        espera: false,
        finanzas: true,
        mvp: false,
        invitados: false,
        admin_alertas: false,
      }
    }
    triggerAutoSave(presetPrefs)
  }

  const handleEnableDevicePush = async () => {
    setEnablingPush(true)
    try {
      const res = await subscribeToPushNotifications()
      if (res.success && res.subscription) {
        const subJson = res.subscription.toJSON()
        if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
          await savePushSubscription({
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
          })
          setPushPerm('granted')
          // ensure push_enabled is on
          if (!prefs.push_enabled) {
            triggerAutoSave({ ...prefs, push_enabled: true })
          }
        }
      } else if (res.error) {
        alert(res.error)
      }
    } catch (e) {
      console.error('Error enabling push:', e)
    } finally {
      setEnablingPush(false)
    }
  }

  const handleSendTestPush = async () => {
    setTestStatus({ loading: true })
    try {
      const res = await sendTestPush()
      if (res.error) {
        setTestStatus({ loading: false, error: res.error })
      } else {
        setTestStatus({
          loading: false,
          message: res.message || 'Notificación de prueba enviada con éxito.',
        })
        setTimeout(() => setTestStatus({ loading: false }), 4000)
      }
    } catch {
      setTestStatus({ loading: false, error: 'Error al enviar prueba' })
    }
  }

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="font-mono text-xs uppercase tracking-wider">Cargando preferencias...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Info with Auto-save indicator */}
      <div className="bg-neutral-50 dark:bg-[#161824] p-3.5 rounded-2xl border-2 border-neutral-900/10 dark:border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center shadow-tactile-sm">
            <SlidersHorizontal className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white leading-none">
              Gestión de Notificaciones
            </h3>
            <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Personaliza qué avisos llegan a tu teléfono
            </p>
          </div>
        </div>

        {/* Status pill */}
        <div>
          {savedSuccess ? (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 px-2 py-0.5 rounded-full animate-in fade-in">
              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
              Guardado
            </span>
          ) : isPending ? (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-neutral-400 px-2 py-0.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Guardando...
            </span>
          ) : (
            <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              En vivo ✓
            </span>
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <div>
        <label className="font-mono text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider mb-1.5 block">
          Configuración rápida
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset('essential')}
            className="btn-tactile p-2 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition"
          >
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-display font-black text-xs uppercase">
              <span>🎯</span>
              <span>Esencial</span>
            </div>
            <p className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-tight">
              Partidos, dinero y cupos
            </p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('all')}
            className="btn-tactile p-2 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition"
          >
            <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-display font-black text-xs uppercase">
              <span>⭐</span>
              <span>Completo</span>
            </div>
            <p className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-tight">
              Todas las alertas activas
            </p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('minimal')}
            className="btn-tactile p-2 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-left transition"
          >
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-display font-black text-xs uppercase">
              <span>🔕</span>
              <span>Mínimo</span>
            </div>
            <p className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-tight">
              Solo cobros y pagos
            </p>
          </button>
        </div>
      </div>

      {/* Master Channels Box */}
      <div className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm space-y-3">
        <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">
          Canales de Entrega
        </span>

        {/* Web Push Master Switch */}
        <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Smartphone className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white block">
                Notificaciones Web Push
              </span>
              <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Alertas emergentes con sonido y vibración en tu móvil o PC
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={prefs.push_enabled}
            onClick={() => handleToggle('push_enabled')}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border-2 border-neutral-900 dark:border-neutral-700 p-0.5 ${
              prefs.push_enabled ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                prefs.push_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* In-App Bell Switch */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white block">
                Buzón In-App (Campana)
              </span>
              <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Registrar historial en la campana dentro de la aplicación
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={prefs.in_app_enabled}
            onClick={() => handleToggle('in_app_enabled')}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border-2 border-neutral-900 dark:border-neutral-700 p-0.5 ${
              prefs.in_app_enabled ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                prefs.in_app_enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Device Status & Test Push Action */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-neutral-400">Navegador:</span>
            {pushPerm === 'granted' ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Permitido
              </span>
            ) : pushPerm === 'denied' ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold">Bloqueado en el navegador</span>
            ) : pushPerm === 'unsupported' ? (
              <span className="text-neutral-400">No soportado</span>
            ) : (
              <button
                type="button"
                onClick={handleEnableDevicePush}
                disabled={enablingPush}
                className="text-amber-600 dark:text-amber-400 font-bold underline cursor-pointer"
              >
                {enablingPush ? 'Activando...' : 'Vincular dispositivo'}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSendTestPush}
            disabled={testStatus.loading}
            className="btn-tactile text-[10px] font-display uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg border border-neutral-900 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center gap-1 text-neutral-800 dark:text-neutral-200 transition"
          >
            {testStatus.loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-2.5 h-2.5" />
            )}
            <span>Probar alerta 🔔</span>
          </button>
        </div>

        {testStatus.message && (
          <p className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800/60 animate-in fade-in">
            {testStatus.message}
          </p>
        )}
        {testStatus.error && (
          <p className="font-mono text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-800/60 animate-in fade-in">
            {testStatus.error}
          </p>
        )}
      </div>

      {/* Categories Toggle List */}
      <div className="space-y-2">
        <span className="font-mono text-[10px] uppercase font-bold text-neutral-500 dark:text-neutral-400 tracking-wider block">
          Categorías de Alertas
        </span>

        {/* 1. Convocatorias Nuevas */}
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Calendar className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white block">
                Nuevas Convocatorias
              </span>
              <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Cuando se abre la lista para un nuevo partido o entrenamiento
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={prefs.convocatorias}
            onClick={() => handleToggle('convocatorias')}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border-2 border-neutral-900 dark:border-neutral-700 p-0.5 ${
              prefs.convocatorias ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                prefs.convocatorias ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 2. Equipos Confirmados */}
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white block">
                Equipos y Formaciones
              </span>
              <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Aviso cuando se publican las escuadras y formaciones del partido
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={prefs.equipos}
            onClick={() => handleToggle('equipos')}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border-2 border-neutral-900 dark:border-neutral-700 p-0.5 ${
              prefs.equipos ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                prefs.equipos ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 3. Recordatorio 24 horas */}
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Clock className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white block">
                Recordatorio 24 Horas
              </span>
              <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Aviso el día antes para preparar hora, cancha o bajarse a tiempo
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={prefs.recordatorios}
            onClick={() => handleToggle('recordatorios')}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border-2 border-neutral-900 dark:border-neutral-700 p-0.5 ${
              prefs.recordatorios ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                prefs.recordatorios ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 4. Lista de Espera (Ascensos) */}
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white block">
                Lista de Espera y Cupos
              </span>
              <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Alerta inmediata cuando se libera un cupo y pasas a confirmado
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={prefs.espera}
            onClick={() => handleToggle('espera')}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border-2 border-neutral-900 dark:border-neutral-700 p-0.5 ${
              prefs.espera ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                prefs.espera ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 5. Finanzas y Deudas */}
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Wallet className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white block">
                Cobros y Pagos (Finanzas)
              </span>
              <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Cobros de partidos a transferir y confirmación de pagos recibidos
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={prefs.finanzas}
            onClick={() => handleToggle('finanzas')}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border-2 border-neutral-900 dark:border-neutral-700 p-0.5 ${
              prefs.finanzas ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                prefs.finanzas ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 6. Votaciones y Premios MVP */}
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Trophy className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white block">
                Votación y Ganadores MVP
              </span>
              <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Apertura para votar a la figura, recordatorios de cierre y resultados
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={prefs.mvp}
            onClick={() => handleToggle('mvp')}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border-2 border-neutral-900 dark:border-neutral-700 p-0.5 ${
              prefs.mvp ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                prefs.mvp ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 7. Mis Invitados Externos */}
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Users className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <span className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white block">
                Mis Invitados Externos
              </span>
              <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                Avisos cuando el capitán aprueba, pasa a espera o rechaza a tus invitados
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={prefs.invitados}
            onClick={() => handleToggle('invitados')}
            className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border-2 border-neutral-900 dark:border-neutral-700 p-0.5 ${
              prefs.invitados ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                prefs.invitados ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* 8. Alertas Directivas (Visible solo si es Admin/Capitán) */}
        {isAdminUser && (
          <div className="bg-purple-500/5 dark:bg-purple-950/20 p-3 rounded-2xl border-2 border-purple-500/30 dark:border-purple-500/40 shadow-tactile-sm flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-bold text-xs uppercase tracking-tight text-neutral-950 dark:text-white block">
                    Capitanía y Administración
                  </span>
                  <span className="font-mono text-[8px] bg-purple-500 text-white font-bold px-1.5 py-0.2 rounded-md">
                    ADMIN
                  </span>
                </div>
                <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                  Solicitudes de ingreso, invitados por validar y cupos libres sin espera
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={prefs.admin_alertas}
              onClick={() => handleToggle('admin_alertas')}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 border-2 border-neutral-900 dark:border-neutral-700 p-0.5 ${
                prefs.admin_alertas ? 'bg-purple-600' : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  prefs.admin_alertas ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
