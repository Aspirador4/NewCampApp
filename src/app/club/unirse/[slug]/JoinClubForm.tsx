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
        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Entrar a este club
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
      <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
        <h4 className="font-bold text-emerald-950 text-sm">¡Solicitud Enviada!</h4>
        <p className="text-xs text-emerald-700">
          Los administradores han recibido tu solicitud. Te notificaremos cuando seas admitido.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
            Carta de Presentación / Motivación
          </label>
          <span className="text-[11px] text-neutral-400">
            {motivation.length}/100
          </span>
        </div>
        <textarea
          rows={3}
          maxLength={100}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          placeholder="Ej: Juego de volante y me invitó Marcos. Quiero sumarme a los partidos..."
          className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
        <p className="text-[11px] text-neutral-400">
          Cuéntale brevemente a los administradores tu motivación o quién te invitó.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando solicitud...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Enviar Solicitud de Admisión
          </>
        )}
      </button>
    </form>
  )
}
