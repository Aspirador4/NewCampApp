'use client'

import { useState } from 'react'
import { Bell, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { NotificationPreferencesPanel } from '@/components/NotificationPreferencesPanel'

interface ProfileNotificationCardProps {
  clubId: string
  isAdmin: boolean
}

export function ProfileNotificationCard({ clubId, isAdmin }: ProfileNotificationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile mb-4 overflow-hidden transition-all">
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition"
        role="button"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-2xl text-white flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex-shrink-0"
            style={{ backgroundColor: 'var(--club-primary, #059669)' }}
          >
            <Bell className="w-5 h-5 stroke-[2.3]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-neutral-950 dark:text-white truncate">
                Gestión de Notificaciones
              </h3>
              <span className="font-mono text-[9px] bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                Pestaña y Ajustes
              </span>
            </div>
            <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
              Personaliza qué avisos llegan a tu teléfono (partidos, dinero, recordatorios)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="btn-tactile py-1.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white font-display font-bold text-[11px] uppercase tracking-wider border border-neutral-900/20 dark:border-neutral-700 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 stroke-[2.2]" />
            <span>{isExpanded ? 'Ocultar' : 'Configurar'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5 stroke-[2.5]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5 stroke-[2.5]" />
            )}
          </span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 pt-0 border-t border-neutral-200 dark:border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="mt-4">
            <NotificationPreferencesPanel clubId={clubId} isAdmin={isAdmin} />
          </div>
        </div>
      )}
    </div>
  )
}
