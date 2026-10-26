'use client'

import { useState } from 'react'
import { updateEventStatus, approveEventAction, rejectEventAction } from '@/app/eventos/actions'
import { EventStatus, EventType } from '@/types/database.types'
import { CheckCircle2, Ban, Loader2, Shield, Check, X } from 'lucide-react'

interface EventAdminControlsProps {
  eventId: string
  currentStatus: EventStatus
  isAdmin?: boolean
  eventType?: EventType
}

export function EventAdminControls({ eventId, currentStatus, isAdmin, eventType = 'partido' }: EventAdminControlsProps) {
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
    <div className="bg-neutral-950 text-white rounded-3xl p-5 border-2 border-neutral-900 shadow-tactile space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
        <h3 className="font-display font-black text-xs uppercase tracking-wider text-neutral-100">
          Control de Convocatoria (Capitán / Admin)
        </h3>
      </div>

      {error && (
        <p className="text-[11px] text-rose-300 bg-rose-950/70 p-2.5 rounded-xl border border-rose-800 font-medium">
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
                className="btn-tactile flex-1 py-2.5 px-3 rounded-xl border-2 border-neutral-900 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>Aprobar Convocatoria</span>
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={loading}
                className="btn-tactile py-2.5 px-3 rounded-xl border-2 border-neutral-900 bg-rose-500 hover:bg-rose-600 text-white font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5 stroke-[2.5]" />}
                <span>Rechazar</span>
              </button>
            </div>
          ) : (
            <p className="text-xs text-amber-300 bg-amber-950/60 p-3 rounded-2xl border border-amber-800">
              ⏳ Tu evento está pendiente de aprobación por los administradores del club antes de publicarse.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 text-xs">
          {currentStatus !== 'finalizado' && currentStatus !== 'cancelado' && (
            <button
              type="button"
              onClick={() => handleStatusChange('finalizado')}
              disabled={loading}
              className="btn-tactile flex-1 min-w-[130px] py-2.5 px-3.5 rounded-xl border-2 border-neutral-900 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />}
              <span>{eventType === 'partido' ? 'Finalizar y Abrir MVP' : 'Finalizar Evento'}</span>
            </button>
          )}

          {currentStatus !== 'cancelado' && currentStatus !== 'finalizado' && (
            <button
              type="button"
              onClick={() => handleStatusChange('cancelado')}
              disabled={loading}
              className="btn-tactile py-2.5 px-3 rounded-xl border-2 border-neutral-900 bg-neutral-900 hover:bg-rose-950 text-neutral-300 hover:text-rose-200 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
            >
              <Ban className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Cancelar</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
