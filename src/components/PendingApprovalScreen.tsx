'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, Clock, Send, LogOut, CheckCircle2, AlertCircle, Loader2, Sparkles, UserX, Compass, PlusCircle } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { submitMotivationAction } from '@/app/miembros/actions'

interface PendingApprovalScreenProps {
  fullName: string
  email: string
  initialMotivation?: string | null
  approvalStatus?: 'pendiente' | 'rechazado' | 'aprobado'
  clubName?: string
  clubId?: string
}

export function PendingApprovalScreen({
  fullName,
  email,
  initialMotivation,
  approvalStatus = 'pendiente',
  clubName = 'Club Deportivo',
  clubId,
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

    const res = await submitMotivationAction(motivation, clubId)
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
            <h1 className="font-extrabold text-base leading-tight truncate max-w-[200px]">
              {clubName}
            </h1>
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
      <div className="py-6 space-y-5 text-center">
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

          <h2 className="text-xl font-bold tracking-tight text-white">
            {isRejected ? 'Acceso No Habilitado' : 'Esperando Admisión del Club'}
          </h2>

          <p className="text-xs text-neutral-400 max-w-xs mx-auto leading-relaxed">
            {isRejected ? (
              <>
                Hola <strong className="text-white">{fullName}</strong>, los administradores de <strong className="text-white">{clubName}</strong> no pudieron aprobar tu postulación. Puedes actualizar tu mensaje abajo para solicitar una reconsideración.
              </>
            ) : (
              <>
                Hola <strong className="text-white">{fullName}</strong> ({email}), tu solicitud para ingresar a <strong className="text-white">{clubName}</strong> está siendo revisada por los administradores.
              </>
            )}
          </p>
        </div>

        {/* Motivation Card */}
        <div className="bg-neutral-800/80 border border-neutral-700/80 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Carta de Presentación / Motivación
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {motivation.length}/100
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <input
              type="text"
              maxLength={100}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              placeholder="Ej: Juego de volante y me invitó Marcos..."
              className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />

            {error && (
              <p className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>{error}</span>
              </p>
            )}

            {success && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                <span>¡Mensaje actualizado! Los administradores fueron notificados.</span>
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !motivation.trim()}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition active:scale-98 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{isRejected ? 'Reenviar Solicitud' : 'Actualizar Mensaje'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Multi-Club switch/explore options */}
        <div className="pt-2 flex flex-col gap-2">
          <Link
            href="/club/unirse"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition active:scale-98"
          >
            <Compass className="w-3.5 h-3.5 text-neutral-400" />
            Explorar o Unirme a Otro Club
          </Link>
          <Link
            href="/club/nuevo"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition active:scale-98"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Crear mi propio Club
          </Link>
        </div>
      </div>

      {/* Footer Info */}
      <div className="py-4 text-center border-t border-neutral-800 text-[11px] text-neutral-500">
        CampApp Multi-Club • Plataforma de Gestión Deportiva
      </div>
    </div>
  )
}
