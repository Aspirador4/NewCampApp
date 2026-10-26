'use client'

import { useState } from 'react'
import { updateEventStatus, approveEventAction, rejectEventAction } from '@/app/eventos/actions'
import { EventStatus } from '@/types/database.types'
import { Play, CheckCircle2, Ban, Loader2, Shield, Check, X } from 'lucide-react'

interface EventAdminControlsProps {
  eventId: string
  currentStatus: EventStatus
  isAdmin?: boolean
}

export function EventAdminControls({ eventId, currentStatus, isAdmin }: EventAdminControlsProps) {
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

  const handleApprove = async () => {
    setError(null)
    setLoading(true)
    const res = await approveEventAction(eventId)
    setLoading(false)
    if (res?.error) {
      setError(res.error)
    }
  }

  const handleReject = async () => {
    if (!confirm('¿Rechazar y eliminar esta convocatoria?')) return
    setError(null)
    setLoading(true)
    const res = await rejectEventAction(eventId)
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
          Gestión del Evento (Admin / Organizador)
        </h3>
      </div>

      {error && (
        <p className="text-[11px] text-red-400 bg-red-950/50 p-2 rounded-lg border border-red-800">
          {error}
        </p>
      )}

      {currentStatus === 'pendiente_aprobacion' ? (
        <div className="space-y-2">
          {isAdmin ? (
            <div className="flex gap-2 text-xs">
              <button
                type="button"
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Aprobar Convocatoria</span>
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={loading}
                className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                <span>Rechazar</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-amber-300 bg-amber-950/60 p-2.5 rounded-xl border border-amber-800">
              ⏳ Tu evento está pendiente de aprobación por los administradores del club antes de publicarse.
            </p>
          )}
        </div>
      ) : (
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
      )}
    </div>
  )
}
