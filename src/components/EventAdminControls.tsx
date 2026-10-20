'use client'

import { useState } from 'react'
import { updateEventStatus } from '@/app/eventos/actions'
import { EventStatus } from '@/types/database.types'
import { Play, CheckCircle2, Ban, Loader2, Shield } from 'lucide-react'

interface EventAdminControlsProps {
  eventId: string
  currentStatus: EventStatus
}

export function EventAdminControls({ eventId, currentStatus }: EventAdminControlsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!confirm(`¿Estás seguro de cambiar el estado del evento a "${newStatus}"?`)) {
      return
    }

    setError(null)
    setLoading(true)
    const res = await updateEventStatus(eventId, newStatus)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    }
  }

  return (
    <div className="bg-neutral-900 text-white rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
          Panel de Control Administrador
        </h3>
      </div>

      {error && (
        <p className="text-[11px] text-red-400 bg-red-950/50 p-2 rounded-lg border border-red-800">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs">
        {currentStatus === 'convocado' && (
          <button
            type="button"
            onClick={() => handleStatusChange('en_curso')}
            disabled={loading}
            className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Iniciar Partido</span>
          </button>
        )}

        {currentStatus !== 'finalizado' && currentStatus !== 'cancelado' && (
          <button
            type="button"
            onClick={() => handleStatusChange('finalizado')}
            disabled={loading}
            className="flex-1 min-w-[120px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>Finalizar y Abrir MVP</span>
          </button>
        )}

        {currentStatus !== 'cancelado' && currentStatus !== 'finalizado' && (
          <button
            type="button"
            onClick={() => handleStatusChange('cancelado')}
            disabled={loading}
            className="py-2 px-3 rounded-xl bg-neutral-800 hover:bg-red-900/60 text-neutral-300 hover:text-red-300 font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Cancelar</span>
          </button>
        )}
      </div>
    </div>
  )
}
