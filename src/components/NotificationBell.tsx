'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCheck,
  X,
  Calendar,
  Wallet,
  Trophy,
  UserCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { NotificationType } from '@/types/database.types'
import {
  getInAppNotifications,
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from '@/app/api/push/actions'
import { NotificationPreferencesPanel } from '@/components/NotificationPreferencesPanel'

export interface InAppNotificationItem {
  id: string
  user_id: string
  club_id: string | null
  title: string
  body: string
  url: string
  type: NotificationType
  is_read: boolean
  created_at: string
}

interface NotificationBellProps {
  initialNotifications?: InAppNotificationItem[]
  clubId?: string
}

export function NotificationBell({ initialNotifications = [], clubId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>(initialNotifications)
  const [filter, setFilter] = useState<'all' | 'unread' | 'preferences'>('all')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Fetch initial notifications if not provided
  useEffect(() => {
    getInAppNotifications(clubId).then((data) => {
      if (data && data.length > 0) {
        setNotifications(data as InAppNotificationItem[])
      }
    })
  }, [clubId])

  // Realtime subscription for incoming notifications
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      const channel = supabase
        .channel(`user-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'in_app_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as InAppNotificationItem
            // Only add if applies to current club or is general
            if (!clubId || !newNotif.club_id || newNotif.club_id === clubId) {
              setNotifications((prev) => [newNotif, ...prev])
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'in_app_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as InAppNotificationItem
            setNotifications((prev) =>
              prev.map((n) => (n.id === updated.id ? updated : n))
            )
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    })
  }, [clubId])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAsRead = (notification: InAppNotificationItem) => {
    if (!notification.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      )
      startTransition(async () => {
        await markNotificationAsReadAction(notification.id)
      })
    }

    if (notification.url) {
      setIsOpen(false)
      router.push(notification.url)
    }
  }

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    startTransition(async () => {
      await markAllNotificationsAsReadAction(clubId)
    })
  }

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'evento':
        return <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
      case 'finanzas':
        return <Wallet className="w-4 h-4 text-amber-700 dark:text-amber-400" />
      case 'mvp':
        return <Trophy className="w-4 h-4 text-amber-600 dark:text-yellow-400" />
      case 'membresia':
        return <UserCheck className="w-4 h-4 text-blue-700 dark:text-blue-400" />
      case 'admin':
        return <ShieldAlert className="w-4 h-4 text-purple-700 dark:text-purple-400" />
      case 'recordatorio':
        return <Clock className="w-4 h-4 text-sky-700 dark:text-sky-400" />
      default:
        return <Bell className="w-4 h-4 text-neutral-700 dark:text-neutral-400" />
    }
  }

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString)
      const diffMs = Date.now() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Recién'
      if (diffMins < 60) return `hace ${diffMins} min`
      if (diffHours < 24) return `hace ${diffHours} h`
      if (diffDays === 1) return 'Ayer'
      if (diffDays < 7) return `hace ${diffDays} d`
      return date.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative w-11 h-11 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition flex items-center justify-center shadow-tactile-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none min-h-[44px] min-w-[44px]"
        title="Centro de Notificaciones"
        aria-label="Abrir centro de notificaciones"
      >
        <Bell className="w-5 h-5 stroke-[2.2]" />

        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-neutral-900 dark:border-neutral-700 shadow-sm animate-pulse min-w-[20px] text-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-over / Modal Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white dark:bg-[#12141c] border-t-2 sm:border-2 border-neutral-900 dark:border-neutral-700 rounded-t-3xl sm:rounded-3xl shadow-tactile overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Buzón de Notificaciones"
          >
            {/* Header */}
            <div className="p-4 border-b-2 border-neutral-900/10 dark:border-white/10 flex items-center justify-between bg-neutral-50/80 dark:bg-[#161824]/80">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm"
                  style={{ backgroundColor: 'var(--club-primary, #059669)' }}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base uppercase tracking-tight text-neutral-950 dark:text-white leading-none">
                    Notificaciones
                  </h2>
                  <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
                    {unreadCount === 0
                      ? 'Todo al día'
                      : `${unreadCount} ${unreadCount === 1 ? 'sin leer' : 'sin leer'}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    disabled={isPending}
                    className="btn-tactile p-2 rounded-xl border border-neutral-900/20 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-[11px] font-bold font-display uppercase tracking-wider flex items-center gap-1 transition"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span className="hidden sm:inline">Leídas</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-tactile p-2 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  aria-label="Cerrar notificaciones"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-neutral-900/10 dark:border-white/10 px-3 pt-2 bg-white dark:bg-[#12141c]">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`flex-1 py-2 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                  filter === 'all'
                    ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white'
                    : 'border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`flex-1 py-2 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition ${
                  filter === 'unread'
                    ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white'
                    : 'border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-700'
                }`}
              >
                Sin leer ({unreadCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('preferences')}
                className={`flex-1 py-2 font-display text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center justify-center gap-1.5 ${
                  filter === 'preferences'
                    ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white'
                    : 'border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Ajustes</span>
              </button>
            </div>

            {/* Notification Body: Either Preferences Tab or Notifications List */}
            {filter === 'preferences' ? (
              <div className="flex-1 overflow-y-auto p-3.5">
                <NotificationPreferencesPanel clubId={clubId} />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-transparent">
                {displayedNotifications.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center mx-auto text-neutral-400">
                      <Sparkles className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <h3 className="font-display font-bold text-sm uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                      {filter === 'unread' ? 'Sin notificaciones pendientes' : 'No tienes notificaciones aún'}
                    </h3>
                    <p className="font-sans text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                      {filter === 'unread'
                        ? 'Has leído todos tus avisos y alertas del club.'
                        : 'Aquí verás las convocatorias, cierres financieros, votaciones de MVP y avisos oficiales.'}
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleMarkAsRead(notif)}
                      className={`cursor-pointer rounded-2xl p-3 border-2 transition active:scale-[0.99] flex items-start gap-3 relative ${
                        notif.is_read
                          ? 'bg-neutral-50/60 dark:bg-[#161824]/40 border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 opacity-80 hover:opacity-100'
                          : 'bg-white dark:bg-[#181a28] border-neutral-900 dark:border-neutral-600 shadow-tactile-sm text-neutral-900 dark:text-white'
                      }`}
                    >
                      {/* Unread indicator dot */}
                      {!notif.is_read && (
                        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-950" />
                      )}

                      {/* Icon container */}
                      <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-300 dark:border-neutral-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`font-display text-xs uppercase tracking-tight truncate leading-snug ${
                              notif.is_read ? 'font-semibold' : 'font-bold text-neutral-950 dark:text-white'
                            }`}
                          >
                            {notif.title}
                          </h4>
                        </div>

                        <p className="font-sans text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 mt-0.5 leading-relaxed">
                          {notif.body}
                        </p>

                        <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-neutral-900/5 dark:border-white/5 font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
                          <span>{formatRelativeTime(notif.created_at)}</span>
                          {notif.url && notif.url !== '/' && (
                            <span className="flex items-center gap-0.5 text-neutral-500 dark:text-neutral-400 font-sans font-semibold">
                              <span>Ver</span>
                              <ExternalLink className="w-2.5 h-2.5 stroke-[2.5]" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Footer */}
            <div className="p-3 bg-neutral-50 dark:bg-[#161824] border-t border-neutral-900/10 dark:border-white/10 text-center font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
              CampApp Athletic • Notificaciones Oficiales
            </div>
          </div>
        </div>
      )}
    </>
  )
}
