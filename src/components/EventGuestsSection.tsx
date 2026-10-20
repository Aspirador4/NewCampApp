'use client'

import { useState } from 'react'
import { approveGuest, rejectGuest, cancelGuestRequest } from '@/app/eventos/guest-actions'
import { GuestInviteModal } from '@/components/GuestInviteModal'
import { Check, X, Loader2, UserCheck, Phone, ShieldCheck } from 'lucide-react'

export interface EventGuestItem {
  id: string
  event_id: string
  invited_by_user_id: string
  guest_name: string
  guest_contact: string | null
  status: 'pendiente_aprobacion' | 'aprobado' | 'rechazado'
  created_at: string
  inviter?: {
    full_name: string
  } | null
}

interface EventGuestsSectionProps {
  eventId: string
  guests: EventGuestItem[]
  currentUserId: string
  isAdmin: boolean
  eventClosed: boolean
}

export function EventGuestsSection({
  eventId,
  guests,
  currentUserId,
  isAdmin,
  eventClosed,
}: EventGuestsSectionProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = async (guestId: string) => {
    setError(null)
    setActionLoading(guestId)
    const res = await approveGuest(guestId, eventId)
    setActionLoading(null)
    if (res?.error) setError(res.error)
  }

  const handleReject = async (guestId: string) => {
    setError(null)
    setActionLoading(guestId)
    const res = await rejectGuest(guestId, eventId)
    setActionLoading(null)
    if (res?.error) setError(res.error)
  }

  const handleCancel = async (guestId: string) => {
    if (!confirm('¿Deseas cancelar esta invitación?')) return
    setError(null)
    setActionLoading(guestId)
    const res = await cancelGuestRequest(guestId, eventId)
    setActionLoading(null)
    if (res?.error) setError(res.error)
  }

  const pendingGuests = guests.filter((g) => g.status === 'pendiente_aprobacion')
  const approvedGuests = guests.filter((g) => g.status === 'aprobado')
  const myGuests = guests.filter((g) => g.invited_by_user_id === currentUserId)

  return (
    <div className="mt-6 space-y-4">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-neutral-900">
            Invitados Externos
          </h2>
          {approvedGuests.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
              {approvedGuests.length}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
          {error}
        </div>
      )}

      {/* Button to invite a guest */}
      {!eventClosed && <GuestInviteModal eventId={eventId} eventClosed={eventClosed} />}

      {/* Admin Moderation Box for Pending Guests */}
      {isAdmin && pendingGuests.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Aprobaciones Pendientes ({pendingGuests.length})</span>
            </div>
            <span className="text-[10px] text-amber-700 font-medium">Solo administradores</span>
          </div>

          <div className="divide-y divide-amber-200/60 bg-white rounded-xl border border-amber-200 overflow-hidden shadow-xs">
            {pendingGuests.map((guest) => {
              const isLoading = actionLoading === guest.id

              return (
                <div key={guest.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-900 truncate">
                      {guest.guest_name}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      Invitado por: <span className="font-semibold text-neutral-700">{guest.inviter?.full_name || 'Socio'}</span>
                    </p>
                    {guest.guest_contact && (
                      <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-0.5">
                        <Phone className="w-3 h-3 text-neutral-400" />
                        <span>{guest.guest_contact}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApprove(guest.id)}
                      disabled={isLoading}
                      className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50"
                      title="Aprobar invitado"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReject(guest.id)}
                      disabled={isLoading}
                      className="p-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs transition active:scale-95 disabled:opacity-50"
                      title="Rechazar invitado"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Member's own invited guests */}
      {!isAdmin && myGuests.length > 0 && (
        <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 space-y-2">
          <p className="text-xs font-bold text-neutral-800">
            Mis Invitaciones ({myGuests.length})
          </p>

          <div className="space-y-1.5">
            {myGuests.map((guest) => (
              <div
                key={guest.id}
                className="bg-white p-2.5 rounded-lg border border-neutral-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-neutral-900">{guest.guest_name}</p>
                  <span
                    className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                      guest.status === 'aprobado'
                        ? 'bg-emerald-100 text-emerald-800'
                        : guest.status === 'pendiente_aprobacion'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {guest.status === 'aprobado'
                      ? 'Aprobado'
                      : guest.status === 'pendiente_aprobacion'
                      ? 'Pendiente'
                      : 'Rechazado'}
                  </span>
                </div>

                {guest.status === 'pendiente_aprobacion' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(guest.id)}
                    disabled={actionLoading === guest.id}
                    className="text-[11px] text-red-600 hover:underline font-medium"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
