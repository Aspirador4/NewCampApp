'use client'

import { useState } from 'react'
import { joinEvent, leaveEvent } from '@/app/eventos/actions'
import { Check, Loader2, AlertCircle, Clock, CheckCircle2, UserMinus } from 'lucide-react'

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
      <div className="p-4 rounded-2xl bg-neutral-100 border-2 border-neutral-300 text-center font-mono text-xs text-neutral-600">
        🏁 Convocatoria finalizada. Inscripciones cerradas.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border-2 border-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* State 1: User is confirmed */}
      {userStatus === 'confirmado' && (
        <div className="border-2 border-neutral-900 bg-emerald-50 rounded-3xl p-4 shadow-tactile flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center border-2 border-neutral-900 shadow-tactile-sm flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display font-black text-base text-emerald-950 uppercase tracking-tight leading-tight">
                ¡Tu cupo está confirmado!
              </p>
              <p className="font-sans text-xs text-emerald-800 mt-0.5">
                Estás registrado en la nómina oficial del partido.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            disabled={loading}
            className="btn-tactile w-full py-2.5 px-3 rounded-xl border-2 border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-900 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition flex items-center justify-center gap-1.5"
          >
            <UserMinus className="w-3.5 h-3.5 text-neutral-600" />
            <span>Darme de baja</span>
          </button>
        </div>
      )}

      {/* State 2: User is in waitlist */}
      {userStatus === 'lista_espera' && (
        <div className="bg-amber-50 border-2 border-neutral-900 rounded-3xl p-4 shadow-tactile flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center border-2 border-neutral-900 shadow-tactile-sm flex-shrink-0">
              <Clock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display font-black text-base text-amber-950 uppercase tracking-tight leading-tight">
                En Lista de Espera {waitlistPosition ? `• Puesto #${waitlistPosition}` : ''}
              </p>
              <p className="font-sans text-xs text-amber-800 mt-0.5">
                Si un titular se da de baja, ascenderás automáticamente de forma atómica.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            disabled={loading}
            className="btn-tactile w-full py-2.5 px-3 rounded-xl border-2 border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-900 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition"
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
            className={`btn-tactile w-full py-3.5 px-4 rounded-2xl text-white font-display font-black text-base uppercase tracking-wider border-2 border-neutral-900 shadow-tactile flex items-center justify-center gap-2 disabled:opacity-50`}
            style={{
              backgroundColor: isFull ? '#d97706' : 'var(--club-primary, #059669)',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Procesando inscripción...</span>
              </>
            ) : isFull ? (
              <>
                <Clock className="w-5 h-5 stroke-[2.5]" />
                <span>Entrar a Lista de Espera</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                <span>Confirmar Mi Asistencia (1-Click)</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Modal for cancellation */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border-2 border-neutral-900 shadow-tactile p-5 w-full max-w-sm space-y-4">
            <div>
              <h3 className="font-display font-black text-xl uppercase tracking-tight text-neutral-950">
                ¿Confirmas darte de baja?
              </h3>
              <p className="text-xs text-neutral-600 mt-1 font-sans">
                {userStatus === 'confirmado'
                  ? 'Tu cupo se liberará y el primer jugador en lista de espera ascenderá de inmediato.'
                  : 'Saldrás de la fila de espera de esta convocatoria.'}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-neutral-700 mb-1">
                Motivo (opcional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej. Lesión, trabajo..."
                className="w-full text-xs p-3 rounded-xl border-2 border-neutral-300 focus:border-neutral-900 focus:outline-none bg-white text-neutral-900"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn-tactile flex-1 py-2.5 px-3 rounded-xl border-2 border-neutral-300 text-neutral-800 font-display font-black text-xs uppercase"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleLeave}
                disabled={loading}
                className="btn-tactile flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display font-black text-xs uppercase border-2 border-neutral-900 shadow-tactile-sm"
              >
                {loading ? 'Liberando...' : 'Confirmar Baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
