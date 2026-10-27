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
  is_overcapacity?: boolean
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
      <div className="flex items-center justify-between border-b-2 border-neutral-900/10 dark:border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-neutral-900 dark:text-white stroke-[2.5]" />
          <h2 className="font-display font-bold text-lg text-neutral-950 dark:text-white uppercase tracking-tight">
            Invitados Externos
          </h2>
          {approvedGuests.length > 0 && (
            <span className="font-mono text-xs px-2 py-0.5 rounded border-2 border-neutral-900 dark:border-neutral-700 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 font-bold shadow-tactile-sm">
              {approvedGuests.length}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Button to invite a guest */}
      {!eventClosed && <GuestInviteModal eventId={eventId} eventClosed={eventClosed} />}

      {/* Admin Moderation Box for Pending Guests */}
      {isAdmin && pendingGuests.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-display font-bold text-xs text-amber-950 dark:text-amber-200 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 stroke-[2.5]" />
              <span>Aprobaciones Pendientes ({pendingGuests.length})</span>
            </div>
            <span className="font-mono text-[9px] font-bold text-amber-950 dark:text-amber-200 bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700 uppercase">Solo admin</span>
          </div>

          <div className="divide-y-2 divide-neutral-900/10 dark:divide-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 overflow-hidden">
            {pendingGuests.map((guest) => {
              const isLoading = actionLoading === guest.id

              return (
                <div key={guest.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-neutral-950 dark:text-white uppercase tracking-tight truncate">
                      {guest.guest_name}
                    </p>
                    <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                      Invitado por: <span className="font-bold text-neutral-800 dark:text-neutral-200">{guest.inviter?.full_name || 'Socio'}</span>
                    </p>
                    {guest.guest_contact && (
                      <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                        <Phone className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                        <span>{guest.guest_contact}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApprove(guest.id)}
                      disabled={isLoading}
                      className="btn-tactile p-2 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-xs shadow-tactile-sm transition active:scale-95 disabled:opacity-50"
                      title="Aprobar invitado"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReject(guest.id)}
                      disabled={isLoading}
                      className="btn-tactile p-2 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-tactile-sm transition active:scale-95 disabled:opacity-50"
                      title="Rechazar invitado"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
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
        <div className="bg-white dark:bg-neutral-900 rounded-3xl p-4 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile space-y-3">
          <p className="font-display font-bold text-sm uppercase tracking-wider text-neutral-950 dark:text-white">
            Mis Invitaciones ({myGuests.length})
          </p>

          <div className="space-y-2">
            {myGuests.map((guest) => (
              <div
                key={guest.id}
                className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-display font-bold text-sm uppercase tracking-tight text-neutral-950 dark:text-white">{guest.guest_name}</p>
                  <span
                    className={`font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-block mt-0.5 ${
                      guest.status === 'aprobado'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : guest.status === 'pendiente_aprobacion'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
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
                    className="font-mono text-[10px] text-rose-600 dark:text-rose-400 hover:underline font-bold uppercase"
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
