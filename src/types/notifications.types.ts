import { NotificationType } from './database.types'

export type NotificationCategory =
  | 'convocatorias'
  | 'equipos'
  | 'recordatorios'
  | 'espera'
  | 'finanzas'
  | 'mvp'
  | 'invitados'
  | 'admin_alertas'
  | 'sistema'

export interface UserNotificationPreferences {
  // Master Channels
  push_enabled: boolean
  in_app_enabled: boolean

  // Categories
  convocatorias: boolean
  equipos: boolean
  recordatorios: boolean
  espera: boolean
  finanzas: boolean
  mvp: boolean
  invitados: boolean
  admin_alertas: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  push_enabled: true,
  in_app_enabled: true,
  convocatorias: true,
  equipos: true,
  recordatorios: true,
  espera: true,
  finanzas: true,
  mvp: true,
  invitados: true,
  admin_alertas: true,
}

export function inferNotificationCategory(payload: {
  title?: string
  type?: NotificationType
  category?: NotificationCategory
}): NotificationCategory {
  if (payload.category) return payload.category

  const title = (payload.title || '').toLowerCase()
  const type = payload.type

  if (type === 'recordatorio' || title.includes('recordatorio')) return 'recordatorios'
  if (type === 'mvp' || title.includes('mvp') || title.includes('figura')) return 'mvp'
  if (type === 'finanzas' || title.includes('cobro') || title.includes('pago')) return 'finanzas'
  if (title.includes('espera')) return 'espera'
  if (title.includes('equipos')) return 'equipos'
  if (title.includes('invitado')) return 'invitados'
  if (
    type === 'admin' ||
    title.includes('pase') ||
    title.includes('solicitud') ||
    title.includes('cupo libre') ||
    title.includes('evaluación')
  ) {
    return 'admin_alertas'
  }
  if (type === 'evento' || title.includes('convocatoria') || title.includes('partido')) return 'convocatorias'

  return 'sistema'
}
