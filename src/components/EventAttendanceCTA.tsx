'use client'

import { useState } from 'react'
import { joinEvent, leaveEvent } from '@/app/eventos/actions'
import { Check, Loader2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'

interface EventAttendanceCTAProps {
  eventId: string
  userStatus: 'confirmado' | 'lista_espera' | null
  isFull: boolean
  eventClosed: boolean
  waitlistPosition?: number
}

export function EventAttendanceCTA({
  eventId,
  userStatus,
  isFull,
  eventClosed,
  waitlistPosition,
}: EventAttendanceCTAProps) {
  const [loading, setLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async () => {
    setError(null)
    setLoading(true)
    const res = await joinEvent(eventId)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    }
  }

  const handleLeave = async () => {
    setError(null)
    setLoading(true)
    const res = await leaveEvent(eventId, cancelReason)
    setLoading(false)
    setShowCancelModal(false)

    if (res?.error) {
      setError(res.error)
    }
  }

  if (eventClosed) {
    return (
      <div className="p-3.5 rounded-xl bg-neutral-100 border border-neutral-200 text-center">
        <p className="text-xs font-semibold text-neutral-600">
          La convocatoria para este evento ya ha concluido.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* State 1: User is confirmed */}
      {userStatus === 'confirmado' && (
        <div
          className="border rounded-2xl p-4 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--club-primary-light, #ecfdf5)',
            borderColor: 'var(--club-primary-border, #a7f3d0)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="p-2 rounded-xl text-white shadow-xs"
              style={{ backgroundColor: 'var(--club-primary, #059669)' }}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p
                className="text-xs font-bold"
                style={{ color: 'var(--club-primary, #059669)' }}
              >
                ¡Tu cupo está confirmado!
              </p>
              <p className="text-[11px] text-neutral-600">
                Estás en la lista oficial de jugadores convocados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            disabled={loading}
            className="w-full min-h-[44px] py-2 px-3 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-semibold transition active:scale-98"
          >
            Darse de baja
          </button>
        </div>
      )}

      {/* State 2: User is in waitlist */}
      {userStatus === 'lista_espera' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Estás en lista de espera
                {waitlistPosition ? ` (Puesto #${waitlistPosition})` : ''}
              </p>
              <p className="text-[11px] text-amber-700">
                Si un jugador confirmado se da de baja, ascenderás automáticamente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            disabled={loading}
            className="w-full min-h-[44px] py-2 px-3 rounded-xl border border-amber-300 bg-white hover:bg-amber-50 text-amber-800 text-xs font-semibold transition active:scale-98"
          >
            Salir de la lista de espera
          </button>
        </div>
      )}

      {/* State 3: User is not registered */}
      {!userStatus && (
        <div>
          <button
            type="button"
            onClick={handleJoin}
            disabled={loading}
            className={`w-full min-h-[48px] py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50`}
            style={{
              backgroundColor: isFull ? '#d97706' : 'var(--club-primary, #059669)',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : isFull ? (
              <>
                <Clock className="w-4 h-4" />
                <span>Entrar a Lista de Espera</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirmar Mi Asistencia (1-Click)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Modal for cancellation */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-neutral-900">
                ¿Confirmas darte de baja?
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {userStatus === 'confirmado'
                  ? 'Tu cupo se liberará y el primer jugador en lista de espera ascenderá de inmediato.'
                  : 'Saldrás de la lista de espera para este evento.'}
              </p>
            </div>

            <div>
              <label htmlFor="cancel-reason" className="block text-xs font-semibold text-neutral-700 mb-1">
                Motivo (opcional)
              </label>
              <input
                id="cancel-reason"
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: Lesión, viaje, trabajo..."
                className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 text-base sm:text-xs bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={loading}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl border border-neutral-300 font-semibold text-xs text-neutral-700 hover:bg-neutral-50 active:scale-95 transition"
              >
                Volver
              </button>

              <button
                type="button"
                onClick={handleLeave}
                disabled={loading}
                className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 font-bold text-xs text-white shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
