'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { joinClubAction, switchClubAction } from '@/app/club/actions'

interface JoinClubFormProps {
  clubId: string
  initialStatus: string | null
  initialMotivation?: string
}

export function JoinClubForm({ clubId, initialStatus, initialMotivation = '' }: JoinClubFormProps) {
  const [motivation, setMotivation] = useState(initialMotivation)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  if (initialStatus === 'aprobado') {
    const handleSwitch = async () => {
      setLoading(true)
      await switchClubAction(clubId)
      router.push('/')
      router.refresh()
    }

    return (
      <button
        type="button"
        onClick={handleSwitch}
        disabled={loading}
        className="btn-tactile w-full py-3 px-4 rounded-xl border-2 border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-white font-display font-black text-xs uppercase tracking-wider shadow-tactile transition active:scale-98 flex items-center justify-center gap-2 min-h-[44px]"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Entrar al Vestuario de este Club
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    )
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await joinClubAction(clubId, motivation)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      router.refresh()
    }
  }

  if (success) {
    return (
      <div className="p-5 rounded-3xl bg-white border-2 border-neutral-900 shadow-tactile text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
        <h4 className="font-display font-black text-lg text-neutral-950 uppercase tracking-tight">¡Solicitud Enviada!</h4>
        <p className="text-xs text-neutral-600 font-sans">
          Los administradores han recibido tu solicitud. Te notificaremos cuando tu pase sea validado.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs flex items-center gap-2.5 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="font-display font-black text-xs text-neutral-900 uppercase tracking-wider">
            Carta de Presentación / Referencia Deportiva
          </label>
          <span className="font-mono text-[10px] text-neutral-400">
            {motivation.length}/100
          </span>
        </div>
        <textarea
          rows={3}
          maxLength={100}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="Ej: Juego de medio campo y me invitó Marcos. Quiero sumarme a las convocatorias..."
          className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium placeholder-neutral-400"
        />
        <p className="text-[11px] text-neutral-500 font-sans">
          Indica tu posición en cancha o quién del club te recomendó para agilizar la aprobación.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-tactile w-full py-3 px-4 rounded-xl border-2 border-neutral-900 bg-neutral-950 hover:bg-neutral-900 text-white font-display font-black text-xs uppercase tracking-wider shadow-tactile transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Enviar Solicitud de Fichaje</span>
          </>
        )}
      </button>
    </form>
  )
}
