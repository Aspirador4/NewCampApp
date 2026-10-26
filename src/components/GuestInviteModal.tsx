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
        className="w-full py-2.5 px-4 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-800 font-bold text-xs transition active:scale-[0.98] flex items-center justify-center gap-1.5 shadow-xs"
      >
        <UserPlus className="w-4 h-4 text-emerald-600" />
        <span>+ Sumar un Invitado</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-neutral-900">
                  Postular Invitado Externo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
                <p className="text-sm font-bold text-neutral-900">
                  ¡Solicitud Enviada!
                </p>
                <p className="text-xs text-neutral-500">
                  El invitado quedó pendiente de aprobación por los administradores.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="guest_name" className="block text-xs font-semibold text-neutral-700 mb-1">
                    Nombre y Apellido <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="guest_name"
                    type="text"
                    required
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Ej: Juan González"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900"
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-500">
                  Los invitados son revisados por los administradores del club y suman al cupo del evento una vez aprobados.
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={loading}
                    className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 font-semibold text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white shadow-sm flex items-center justify-center gap-1.5"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Enviar Solicitud'
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
