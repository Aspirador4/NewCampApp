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
        className="btn-tactile w-full py-3 px-4 rounded-xl border-2 border-neutral-900 dark:border-white bg-neutral-950 dark:bg-white hover:bg-neutral-900 dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-display font-black text-xs uppercase tracking-wider shadow-tactile transition active:scale-98 flex items-center justify-center gap-2 min-h-[44px]"
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
      <div className="p-5 rounded-3xl bg-white dark:bg-[#14161f] border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
        <h4 className="font-display font-black text-lg text-neutral-950 dark:text-white uppercase tracking-tight">¡Solicitud Enviada!</h4>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 font-sans">
          Los administradores han recibido tu solicitud. Te notificaremos cuando tu pase sea validado.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center gap-2.5 font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="font-display font-black text-xs text-neutral-900 dark:text-white uppercase tracking-wider">
            Carta de Presentación / Referencia Deportiva
          </label>
          <span className="font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
            {motivation.length}/100
          </span>
        </div>
        <textarea
          rows={3}
          maxLength={100}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="Ej: Juego de medio campo y me invitó Marcos. Quiero sumarme a las convocatorias..."
          className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium placeholder-neutral-400 dark:placeholder-neutral-500"
        />
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-sans">
          Indica tu posición en cancha o quién del club te recomendó para agilizar la aprobación.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-tactile w-full py-3 px-4 rounded-xl border-2 border-neutral-900 dark:border-white bg-neutral-950 dark:bg-white hover:bg-neutral-900 dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-display font-black text-xs uppercase tracking-wider shadow-tactile transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
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
