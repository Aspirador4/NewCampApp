'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, Clock, Send, LogOut, CheckCircle2, AlertCircle, Loader2, Sparkles, UserX, Compass, PlusCircle, ShieldAlert } from 'lucide-react'
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
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 min-h-screen bg-neutral-50 text-neutral-900 pb-8">
      {/* Top Athletic Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b-2 border-neutral-900/10">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white border-2 border-neutral-900 shadow-tactile-sm flex-shrink-0"
            style={{ backgroundColor: 'var(--club-primary, #059669)' }}
          >
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-neutral-950 uppercase tracking-tight leading-none truncate max-w-[210px]">
              {clubName}
            </h1>
            <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
              Ficha Oficial de Admisión
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="btn-tactile p-2.5 rounded-xl border-2 border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-800 shadow-tactile-sm transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Cerrar Sesión"
          aria-label="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Main Accreditation / Waiting Pass Card */}
      <div className="my-auto py-4 space-y-4">
        {/* Physical Pass Ticket */}
        <div className="bg-white border-2 border-neutral-900 shadow-tactile rounded-3xl overflow-hidden relative">
          {/* Top Pass Header Banner */}
          <div className={`p-4 border-b-2 border-neutral-900 flex items-center justify-between ${
            isRejected ? 'bg-rose-50' : 'bg-amber-50'
          }`}>
            <div className="flex items-center gap-2">
              {isRejected ? (
                <ShieldAlert className="w-4 h-4 text-rose-600" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600" />
              )}
              <span className={`font-mono text-[10px] font-black uppercase tracking-wider ${
                isRejected ? 'text-rose-900' : 'text-amber-900'
              }`}>
                {isRejected ? 'PASE DENEGADO • TRIBUNAL DE CLUB' : 'PASE PROVISIONAL • EN ESPERA DE REVISIÓN'}
              </span>
            </div>

            <span className="font-mono text-[10px] font-bold text-neutral-500 bg-white px-2 py-0.5 rounded border border-neutral-300">
              EXP #2026
            </span>
          </div>

          {/* Pass Body with Notches */}
          <div className="p-5 space-y-4 relative">
            {/* Ticket Notches */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-neutral-50 rounded-full border-r-2 border-neutral-900 pointer-events-none" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-neutral-50 rounded-full border-l-2 border-neutral-900 pointer-events-none" />

            <div className="flex items-start gap-3.5">
              {/* Avatar Icon */}
              <div className={`w-14 h-14 rounded-2xl border-2 border-neutral-900 shadow-tactile-sm flex items-center justify-center flex-shrink-0 ${
                isRejected ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
              }`}>
                {isRejected ? (
                  <UserX className="w-7 h-7 stroke-[2.5]" />
                ) : (
                  <Clock className="w-7 h-7 stroke-[2.5] animate-pulse" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span className={`inline-block font-mono text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border mb-1 ${
                  isRejected
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {isRejected ? 'Solicitud Rechazada' : 'Postulación en Trámite'}
                </span>

                <h2 className="font-display font-black text-2xl text-neutral-950 uppercase tracking-tight leading-none truncate">
                  {fullName}
                </h2>
                <p className="font-mono text-[11px] text-neutral-500 mt-1 truncate">
                  {email}
                </p>
              </div>
            </div>

            {/* Status explanation */}
            <div className="p-3.5 rounded-2xl bg-neutral-50 border-2 border-neutral-200 text-xs text-neutral-700 leading-relaxed font-sans">
              {isRejected ? (
                <>
                  Los administradores de <strong className="font-bold text-neutral-950">{clubName}</strong> no pudieron habilitar tu fichaje en este periodo. Puedes enviar un mensaje de apelación a continuación para reconsideración.
                </>
              ) : (
                <>
                  Tu solicitud de incorporación a <strong className="font-bold text-neutral-950">{clubName}</strong> fue registrada en el sistema. Los capitanes y directivos revisarán tu perfil para darte el visto bueno oficial.
                </>
              )}
            </div>

            {/* Motivation Form */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="font-display font-black text-xs uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Carta de Presentación / Referencia</span>
                </label>
                <span className="font-mono text-[10px] text-neutral-400">
                  {motivation.length}/100
                </span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-2.5">
                <input
                  type="text"
                  maxLength={100}
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Ej: Juego de medio y me invitó Marcos..."
                  className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium placeholder-neutral-400"
                />

                {error && (
                  <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{error}</span>
                  </p>
                )}

                {success && (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-xl border border-emerald-200 flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                    <span>¡Mensaje actualizado! Los administradores fueron notificados.</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !motivation.trim()}
                  className="btn-tactile w-full py-2.5 px-4 rounded-xl border-2 border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-white font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none min-h-[44px]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{isRejected ? 'Reenviar Solicitud de Fichaje' : 'Actualizar Mensaje de Admisión'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Multi-Club switch/explore options */}
        <div className="space-y-2 pt-1">
          <Link
            href="/club/unirse"
            className="btn-tactile w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-900 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition min-h-[44px]"
          >
            <Compass className="w-4 h-4 stroke-[2.5]" />
            <span>Explorar o Unirme a Otro Club</span>
          </Link>
          <Link
            href="/club/nuevo"
            className="btn-tactile w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-neutral-900 bg-amber-300 hover:bg-amber-400 text-neutral-950 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition min-h-[44px]"
          >
            <PlusCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Crear mi propio Club Deportivo</span>
          </Link>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 text-center border-t-2 border-neutral-900/10 font-mono text-[10px] text-neutral-400 uppercase tracking-widest">
        CampApp Athletic Platform • Sistema de Convocatorias
      </div>
    </div>
  )
}
