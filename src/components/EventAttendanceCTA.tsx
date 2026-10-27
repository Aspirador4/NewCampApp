'use client'

import { useState } from 'react'
import { joinEvent, leaveEvent } from '@/app/eventos/actions'
import { AttendanceType } from '@/types/database.types'
import { Check, Loader2, AlertCircle, Clock, CheckCircle2, UserMinus, Eye } from 'lucide-react'

interface EventAttendanceCTAProps {
  eventId: string
  userStatus: 'confirmado' | 'lista_espera' | null
  userAttendanceType?: AttendanceType | null
  isFull: boolean
  eventClosed: boolean
  waitlistPosition?: number
}

export function EventAttendanceCTA({
  eventId,
  userStatus,
  userAttendanceType = 'jugador',
  isFull,
  eventClosed,
  waitlistPosition,
}: EventAttendanceCTAProps) {
  const [loading, setLoading] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async (type: AttendanceType = 'jugador') => {
    setError(null)
    setLoading(true)
    const res = await joinEvent(eventId, type)
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
      <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60 border-2 border-neutral-300 dark:border-neutral-700 text-center font-mono text-xs text-neutral-600 dark:text-neutral-400">
        🏁 Convocatoria finalizada. Inscripciones cerradas.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs border-2 border-red-300 dark:border-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* State 1: User is confirmed as PLAYER */}
      {userStatus === 'confirmado' && userAttendanceType === 'jugador' && (
        <div className="border-2 border-neutral-900 dark:border-neutral-700 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl p-4 shadow-tactile flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display font-bold text-base text-emerald-950 dark:text-emerald-200 uppercase tracking-tight leading-tight">
                ¡Tu cupo en cancha está confirmado!
              </p>
              <p className="font-sans text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                Estás registrado en la nómina oficial como jugador titular.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleJoin('espectador')}
              disabled={loading}
              className="btn-tactile py-2.5 px-3 rounded-xl border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-800 dark:text-neutral-200 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-blue-500" />
              <span>Pasar a Tribuna</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={loading}
              className="btn-tactile py-2.5 px-3 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-rose-50 text-rose-700 dark:text-rose-400 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm flex items-center justify-center gap-1.5"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Darme de baja</span>
            </button>
          </div>
        </div>
      )}

      {/* State 2: User is confirmed as SPECTATOR */}
      {userStatus === 'confirmado' && userAttendanceType === 'espectador' && (
        <div className="border-2 border-neutral-900 dark:border-neutral-700 bg-blue-50 dark:bg-blue-950/40 rounded-3xl p-4 shadow-tactile flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex-shrink-0">
              <Eye className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display font-bold text-base text-blue-950 dark:text-blue-200 uppercase tracking-tight leading-tight">
                ¡Confirmado en la Tribuna! 📣
              </p>
              <p className="font-sans text-xs text-blue-800 dark:text-blue-300 mt-0.5">
                Vas como espectador/tercer tiempo sin ocupar cupo de juego en cancha.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleJoin('jugador')}
              disabled={loading}
              className="btn-tactile py-2.5 px-3 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm flex items-center justify-center gap-1.5"
            >
              <span>{isFull ? 'Entrar a Espera' : 'Jugar en Cancha'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={loading}
              className="btn-tactile py-2.5 px-3 rounded-xl border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-rose-50 text-rose-700 dark:text-rose-400 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm flex items-center justify-center gap-1.5"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>No podré asistir</span>
            </button>
          </div>
        </div>
      )}

      {/* State 3: User is in waitlist */}
      {userStatus === 'lista_espera' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-4 shadow-tactile flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex-shrink-0">
              <Clock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display font-bold text-base text-amber-950 dark:text-amber-200 uppercase tracking-tight leading-tight">
                En Lista de Espera {waitlistPosition ? `• Puesto #${waitlistPosition}` : ''}
              </p>
              <p className="font-sans text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Si un jugador se da de baja, ascenderás automáticamente de forma atómica.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleJoin('espectador')}
              disabled={loading}
              className="btn-tactile py-2.5 px-3 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-blue-500 hover:bg-blue-600 text-white font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ir de Espectador</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              disabled={loading}
              className="btn-tactile py-2.5 px-3 rounded-xl border-2 border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 text-neutral-900 dark:text-neutral-100 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm transition"
            >
              Salir de Espera
            </button>
          </div>
        </div>
      )}

      {/* State 4: User is NOT registered */}
      {!userStatus && (
        <div className="space-y-2">
          {/* Main Action: Player spot */}
          <button
            type="button"
            onClick={() => handleJoin('jugador')}
            disabled={loading}
            className="btn-tactile w-full py-3.5 px-4 rounded-2xl text-white font-display font-bold text-base uppercase tracking-wider border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile flex items-center justify-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: isFull ? '#d97706' : 'var(--club-primary, #059669)',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Procesando...</span>
              </>
            ) : isFull ? (
              <>
                <Clock className="w-5 h-5 stroke-[2.5]" />
                <span>Entrar a Lista de Espera en Cancha</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 stroke-[3]" />
                <span>Confirmar en Cancha (Jugador)</span>
              </>
            )}
          </button>

          {/* Secondary Action: Spectator */}
          <button
            type="button"
            onClick={() => handleJoin('espectador')}
            disabled={loading}
            className="btn-tactile w-full py-2.5 px-3 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border-2 border-neutral-300 dark:border-neutral-700 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4 text-blue-500" />
            <span>Voy como Espectador / Tribuna (Sin jugar)</span>
          </button>
        </div>
      )}

      {/* Modal for cancellation */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-neutral-950/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile p-5 w-full max-w-sm space-y-4">
            <div>
              <h3 className="font-display font-bold text-xl uppercase tracking-tight text-neutral-950 dark:text-white">
                ¿Confirmas darte de baja?
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 font-sans">
                {userStatus === 'confirmado' && userAttendanceType === 'jugador'
                  ? 'Tu cupo se liberará y el primer jugador en lista de espera ascenderá de inmediato.'
                  : 'Saldrás de la nómina de esta convocatoria.'}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-neutral-700 dark:text-neutral-300 mb-1">
                Motivo (opcional):
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej. Lesión, trabajo..."
                className="w-full text-xs p-3 rounded-xl border-2 border-neutral-300 dark:border-neutral-700 focus:border-neutral-900 dark:focus:border-neutral-400 focus:outline-none bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="btn-tactile flex-1 py-2.5 px-3 rounded-xl border-2 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 font-display font-bold text-xs uppercase"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleLeave}
                disabled={loading}
                className="btn-tactile flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-display font-bold text-xs uppercase border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm"
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
