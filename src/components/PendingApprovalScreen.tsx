'use client'

import { useState } from 'react'
import { Flame, Clock, Send, LogOut, CheckCircle2, AlertCircle, Loader2, Sparkles, UserX } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { submitMotivationAction } from '@/app/miembros/actions'

interface PendingApprovalScreenProps {
  fullName: string
  email: string
  initialMotivation?: string | null
  approvalStatus?: 'pendiente' | 'rechazado' | 'aprobado'
}

export function PendingApprovalScreen({
  fullName,
  email,
  initialMotivation,
  approvalStatus = 'pendiente',
}: PendingApprovalScreenProps) {
  const [motivation, setMotivation] = useState(initialMotivation || '')
  const [currentStatus, setCurrentStatus] = useState<'pendiente' | 'rechazado' | 'aprobado'>(approvalStatus)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await submitMotivationAction(motivation)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      setCurrentStatus('pendiente')
      setTimeout(() => setSuccess(false), 4000)
    }
  }

  const isRejected = currentStatus === 'rechazado'

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Brand Header */}
      <div className="flex items-center justify-between pt-4 pb-6 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight">Club Deportivo</h1>
            <p className="text-[11px] text-neutral-400">Temporada Oficial 2026</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition active:scale-95"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Main Waiting / Rejected Card */}
      <div className="py-8 space-y-6 text-center">
        {isRejected ? (
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
            <UserX className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner animate-pulse">
            <Clock className="w-8 h-8" />
          </div>
        )}

        <div className="space-y-2">
          {isRejected ? (
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Solicitud No Aprobada
            </span>
          ) : (
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Solicitud Recibida
            </span>
          )}

          <h2 className="text-xl font-black text-white leading-tight">
            {isRejected ? 'Tu solicitud anterior fue rechazada' : 'Tu aprobación aún está pendiente'}
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
            {isRejected ? (
              <>
                Hola, <strong className="text-neutral-200">{fullName}</strong>. Tu postulación anterior no fue aceptada. Puedes actualizar tu carta de motivación y volver a enviar tu postulación para que los administradores la revisen nuevamente.
              </>
            ) : (
              <>
                Hola, <strong className="text-neutral-200">{fullName}</strong>. Un administrador del club revisará tu postulación para habilitar tu acceso a las convocatorias y partidos.
              </>
            )}
          </p>
        </div>

        {/* Motivation Letter Form (max 50 chars) */}
        <form onSubmit={handleSubmit} className="bg-neutral-800/80 border border-neutral-700 rounded-2xl p-4 text-left space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <label htmlFor="motivation" className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isRejected ? 'Nueva carta de motivación' : 'Carta de motivación breve'}</span>
            </label>
            <span className={`text-[10px] font-mono font-bold ${motivation.length >= 50 ? 'text-red-400' : 'text-neutral-400'}`}>
              {motivation.length}/50
            </span>
          </div>

          <p className="text-[11px] text-neutral-400 leading-tight">
            {isRejected
              ? 'Indica a los administradores detalles para reconsiderar tu ingreso (posición, quién te invita, etc.).'
              : 'Escribe un breve mensaje para los administradores (ej: tu posición, si vienes recomendado por alguien, etc.).'}
          </p>

          <input
            id="motivation"
            type="text"
            maxLength={50}
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Ej: Juego de central, amigo de Seba con ganas de sumar."
            className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-900">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{isRejected ? '¡Solicitud reenviada con éxito para revisión!' : '¡Carta de motivación enviada con éxito!'}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !motivation.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isRejected ? 'Reenviar Postulación al Club' : (initialMotivation ? 'Actualizar Carta de Motivación' : 'Enviar Carta a los Admin')}</span>
          </button>
        </form>
      </div>

      {/* Footer Logout Action */}
      <div className="pt-6 pb-2 text-center space-y-3 border-t border-neutral-800">
        <p className="text-[11px] text-neutral-500">
          Sesión iniciada con: {email}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  )
}
