/**
 * Utilidades para manejo de fechas y zonas horarias en CampApp.
 * 
 * Evita problemas de desfase de zona horaria (UTC vs Local) tanto en fechas
 * de calendario (ej. fecha de nacimiento) como en marcas de tiempo (ej. logs y auditoría).
 */

export const DEFAULT_CLUB_TIMEZONE = 'America/Santiago'

/**
 * Formatea una fecha de nacimiento o fecha calendario (formato YYYY-MM-DD)
 * sin desfase por conversión UTC.
 * 
 * En JS estándar, `new Date("YYYY-MM-DD")` se parsea como UTC medianoche,
 * lo que en husos horarios negativos (como Chile o Argentina GMT-3 / -4)
 * hace que al invocar métodos locales se muestre el día anterior (ej. 25/09 -> 24).
 */
export function formatBirthDate(
  birthDate: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
  locale = 'es-CL'
): string | null {
  if (!birthDate) return null
  const clean = String(birthDate).split('T')[0]
  const parts = clean.split('-')
  if (parts.length !== 3) return null

  const [year, month, day] = parts.map((p) => parseInt(p, 10))
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null

  // new Date(year, monthIndex, day) crea la fecha en medianoche local
  // garantizando que el día, mes y año se preserven idénticos
  const localDate = new Date(year, month - 1, day)
  return localDate.toLocaleDateString(locale, options)
}

/**
 * Calcula con exactitud la edad en años a partir de una fecha de nacimiento (YYYY-MM-DD),
 * inmune a desfases de zona horaria.
 */
export function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null
  const clean = String(birthDate).split('T')[0]
  const parts = clean.split('-').map((p) => parseInt(p, 10))
  if (parts.length !== 3 || parts.some(isNaN)) return null

  const [year, month, day] = parts
  const today = new Date()
  let age = today.getFullYear() - year
  const m = today.getMonth() - (month - 1)
  if (m < 0 || (m === 0 && today.getDate() < day)) {
    age--
  }
  return age
}

/**
 * Formatea una marca de tiempo en la zona horaria del club o especificada (formato 24h: HH:mm).
 * Evita que en componentes de servidor de Node (que corren por defecto en UTC / GMT-0)
 * los horarios se muestren adelantados o desfasados.
 */
export function formatTime(
  dateStrOrDate: string | Date | null | undefined,
  timeZone: string = DEFAULT_CLUB_TIMEZONE,
  locale = 'es-CL'
): string {
  if (!dateStrOrDate) return ''
  const d = typeof dateStrOrDate === 'string' ? new Date(dateStrOrDate) : dateStrOrDate
  if (isNaN(d.getTime())) return ''

  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  })
}

/**
 * Formatea el timestamp para la lista de auditoría (logs).
 * - Si la acción ocurrió hoy (en la zona horaria del club): muestra solo 'HH:mm'
 * - Si ocurrió en días anteriores: muestra 'DD MMM, HH:mm' (ej. '24 oct, 19:30')
 */
export function formatLogTimestamp(
  dateStrOrDate: string | Date | null | undefined,
  timeZone: string = DEFAULT_CLUB_TIMEZONE,
  locale = 'es-CL'
): string {
  if (!dateStrOrDate) return ''
  const d = typeof dateStrOrDate === 'string' ? new Date(dateStrOrDate) : dateStrOrDate
  if (isNaN(d.getTime())) return ''

  const now = new Date()
  const todayStr = now.toLocaleDateString('en-CA', { timeZone })
  const targetStr = d.toLocaleDateString('en-CA', { timeZone })

  const timePart = d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  })

  if (todayStr === targetStr) {
    return timePart
  }

  const datePart = d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    timeZone,
  })

  return `${datePart}, ${timePart}`
}
