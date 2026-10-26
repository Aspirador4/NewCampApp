'use client'

import { useState } from 'react'
import { requestGuest } from '@/app/eventos/guest-actions'
import { UserPlus, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface GuestInviteModalProps {
  eventId: string
  eventClosed: boolean
}

export function GuestInviteModal({ eventId, eventClosed }: GuestInviteModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestContact, setGuestContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (eventClosed) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('event_id', eventId)
    formData.append('guest_name', guestName)
    formData.append('guest_contact', guestContact)

    const res = await requestGuest(formData)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else if (res?.success) {
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setIsOpen(false)
        setGuestName('')
        setGuestContact('')
      }, 1500)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="btn-tactile w-full py-3 px-4 rounded-2xl border-2 border-neutral-900 bg-white hover:bg-neutral-100 text-neutral-950 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition active:scale-[0.98] flex items-center justify-center gap-2 min-h-[44px]"
      >
        <UserPlus className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
        <span>+ Sumar un Invitado al Partido</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border-2 border-neutral-900 shadow-tactile p-6 w-full max-w-sm space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b-2 border-neutral-900/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl border-2 border-neutral-900 bg-emerald-100 text-emerald-950 shadow-tactile-sm">
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-neutral-950 uppercase tracking-tight">
                    Postular Invitado
                  </h3>
                  <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider">
                    Convocatoria Externa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 flex items-center justify-center transition"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-medium">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce stroke-[2.5]" />
                <p className="font-display font-black text-base uppercase text-neutral-950">
                  ¡Postulación Enviada!
                </p>
                <p className="text-xs text-neutral-500 font-sans">
                  El invitado quedó registrado a la espera de la validación del capitán o administrador.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="guest_name" className="block font-display font-black text-xs uppercase tracking-wider text-neutral-900 mb-1">
                    Nombre y Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="guest_name"
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ej: Juan González"
                    className="input-tactile w-full px-3.5 py-2.5 text-xs font-medium placeholder-neutral-400"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 border-2 border-neutral-200 text-[11px] text-neutral-600 font-sans leading-relaxed">
                  Los invitados son revisados por los capitanes y pasan a ocupar cupo oficial una vez autorizados.
                </div>

                <div className="flex gap-2 pt-2 border-t-2 border-neutral-900/10">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={loading}
                    className="btn-tactile flex-1 py-2.5 px-3 rounded-xl border-2 border-neutral-900 bg-white hover:bg-neutral-100 font-display font-black text-xs uppercase tracking-wider text-neutral-800 shadow-tactile-sm"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-tactile flex-1 py-2.5 px-3 rounded-xl border-2 border-neutral-900 bg-neutral-950 hover:bg-neutral-900 font-display font-black text-xs uppercase tracking-wider text-white shadow-tactile-sm flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Postular Invitado'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
