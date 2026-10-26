'use client'

import { useState } from 'react'
import { CircleDollarSign, CheckCircle2, ChevronRight, X, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { closeEventFinancesAction, CustomDebtInput } from '@/app/eventos/actions'

interface AttendeeItem {
  userId: string
  fullName: string
  avatarUrl: string | null
}

interface GuestItem {
  guestId: string
  guestName: string
  invitedByUserId: string
  inviterName: string
}

interface EventFinancialClosureProps {
  eventId: string
  eventTitle: string
  totalCost: number | null
  baseCostPerPlayer: number
  isFinancialClosed: boolean
  financialClosedAt: string | null
  confirmedAttendees: AttendeeItem[]
  approvedGuests: GuestItem[]
  canManage: boolean
  isAdmin: boolean
}

export function EventFinancialClosure({
  eventId,
  eventTitle,
  totalCost,
  baseCostPerPlayer,
  isFinancialClosed,
  financialClosedAt,
  confirmedAttendees,
  approvedGuests,
  canManage,
  isAdmin,
}: EventFinancialClosureProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Mapping amounts: key -> amount
  // key for member: `member_${userId}`
  // key for guest: `guest_${guestId}`
  const initialAmounts: Record<string, number> = {}
  for (const a of confirmedAttendees) {
    initialAmounts[`member_${a.userId}`] = baseCostPerPlayer
  }
  for (const g of approvedGuests) {
    initialAmounts[`guest_${g.guestId}`] = baseCostPerPlayer
  }

  const [amounts, setAmounts] = useState<Record<string, number>>(initialAmounts)

  const handleAmountChange = (key: string, val: string) => {
    const num = parseInt(val, 10)
    setAmounts((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : Math.max(0, num),
    }))
  }

  const totalCollected = Object.values(amounts).reduce((a, b) => a + b, 0)
  const totalPlayers = confirmedAttendees.length + approvedGuests.length

  const handleApplyStandardProrate = () => {
    const newAmounts: Record<string, number> = {}
    for (const a of confirmedAttendees) {
      newAmounts[`member_${a.userId}`] = baseCostPerPlayer
    }
    for (const g of approvedGuests) {
      newAmounts[`guest_${g.guestId}`] = baseCostPerPlayer
    }
    setAmounts(newAmounts)
  }

  const handleSubmitClosure = async () => {
    setError(null)
    setLoading(true)

    const customDebts: CustomDebtInput[] = []

    // 1. Members
    for (const a of confirmedAttendees) {
      const amt = amounts[`member_${a.userId}`] ?? baseCostPerPlayer
      customDebts.push({
        userId: a.userId,
        amount: amt,
        description: `Asistencia: ${eventTitle}`,
      })
    }

    // 2. Guests
    for (const g of approvedGuests) {
      const amt = amounts[`guest_${g.guestId}`] ?? baseCostPerPlayer
      customDebts.push({
        userId: g.invitedByUserId,
        guestId: g.guestId,
        amount: amt,
        description: `Invitado (${g.guestName}): ${eventTitle}`,
      })
    }

    const res = await closeEventFinancesAction(eventId, customDebts)
    setLoading(false)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccess(true)
      setIsModalOpen(false)
    }
  }

  if (!canManage && !isFinancialClosed) {
    return null
  }

  return (
    <div className="my-3">
      {/* Closed State */}
      {isFinancialClosed || success ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Cierre Financiero Emitido
              </p>
              <p className="text-[11px] text-emerald-700">
                {financialClosedAt
                  ? `Emitido el ${new Date(financialClosedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : 'Las cuotas de este evento fueron generadas en el sistema.'}
              </p>
            </div>
          </div>

          <Link
            href={isAdmin ? "/finanzas?tab=admin" : "/finanzas"}
            className="py-1.5 px-3 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition flex items-center gap-1 shadow-xs flex-shrink-0"
          >
            <span>Ver Finanzas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        /* Pending Closure State */
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-amber-700" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Cierre Financiero Pendiente
                </h4>
                <p className="text-[11px] text-amber-700">
                  El partido finalizó. Emite el cierre para liquidar los cobros a los socios.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-amber-200/80 text-xs">
            <span className="text-amber-800 font-medium">
              {totalCost ? `Cancha: $${totalCost.toLocaleString('es-CL')} (${totalPlayers} jugadores)` : `Base: $${baseCostPerPlayer.toLocaleString('es-CL')} c/u`}
            </span>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <span>Emitir Cierre</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Financial Closing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 space-y-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 relative shadow-2xl">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Liquidación de Partido
              </span>
              <h3 className="font-black text-lg text-neutral-900 leading-tight mt-1">
                Cierre Financiero del Evento
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Puedes ajustar el cobro individual de cada jugador antes de emitir las deudas.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick summary stats */}
            <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-200 text-xs">
              <div>
                <span className="text-neutral-500 block text-[11px]">Costo Cancha Club</span>
                <span className="text-sm font-black text-neutral-900">
                  {totalCost ? `$${totalCost.toLocaleString('es-CL')}` : 'Por definir'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-neutral-500 block text-[11px]">Total a Cobrar</span>
                <span className={`text-sm font-black ${totalCost && totalCollected < totalCost ? 'text-amber-600' : 'text-emerald-700'}`}>
                  ${totalCollected.toLocaleString('es-CL')}
                </span>
              </div>
            </div>

            {/* Quick standard reset button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleApplyStandardProrate}
                className="text-[11px] font-bold text-emerald-700 hover:underline"
              >
                Restablecer prorrateo igualitario (${baseCostPerPlayer.toLocaleString('es-CL')} c/u)
              </button>
            </div>

            {/* Players List with editable amounts */}
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Jugadores Confirmados ({confirmedAttendees.length})
              </p>
              {confirmedAttendees.map((att) => (
                <div
                  key={att.userId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-neutral-200 shadow-2xs gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 flex items-center justify-center relative flex-shrink-0">
                      {att.avatarUrl ? (
                        <Image src={att.avatarUrl} alt={att.fullName} fill className="object-cover" sizes="32px" />
                      ) : (
                        <span className="font-bold text-xs text-neutral-600">
                          {att.fullName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-neutral-900 truncate">
                      {att.fullName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs text-neutral-400 font-semibold">$</span>
                    <input
                      type="number"
                      value={amounts[`member_${att.userId}`] ?? 0}
                      onChange={(e) => handleAmountChange(`member_${att.userId}`, e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-900 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              ))}

              {approvedGuests.length > 0 && (
                <>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 pt-2">
                    Invitados Aprobados ({approvedGuests.length})
                  </p>
                  {approvedGuests.map((g) => (
                    <div
                      key={g.guestId}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 gap-3"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-neutral-900 block truncate">
                          {g.guestName}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          A cargo de: <strong className="text-neutral-700">{g.inviterName}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs text-neutral-400 font-semibold">$</span>
                        <input
                          type="number"
                          value={amounts[`guest_${g.guestId}`] ?? 0}
                          onChange={(e) => handleAmountChange(`guest_${g.guestId}`, e.target.value)}
                          className="w-20 px-2 py-1 rounded-lg border border-neutral-300 text-xs font-bold text-neutral-900 text-right focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-2 border-t border-neutral-100 flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
                className="py-2.5 px-4 rounded-xl border border-neutral-300 text-xs font-semibold text-neutral-600 hover:bg-neutral-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitClosure}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Confirmar y Emitir Cierre (${totalCollected.toLocaleString('es-CL')})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
