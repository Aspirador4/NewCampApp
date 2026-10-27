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
  existingDebts?: { userId: string; guestId?: string | null; amount: number }[]
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
  existingDebts,
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
    const existing = existingDebts?.find((x) => x.userId === a.userId && !x.guestId)
    initialAmounts[`member_${a.userId}`] = existing !== undefined ? existing.amount : baseCostPerPlayer
  }
  for (const g of approvedGuests) {
    const existing = existingDebts?.find((x) => x.guestId === g.guestId)
    initialAmounts[`guest_${g.guestId}`] = existing !== undefined ? existing.amount : baseCostPerPlayer
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
        <div className="bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile rounded-3xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-emerald-500 text-neutral-950 shadow-tactile-sm">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <p className="font-display font-bold text-sm uppercase tracking-tight text-neutral-950 dark:text-white">
                Cierre Financiero Emitido
              </p>
              <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                {financialClosedAt
                  ? `Emitido el ${new Date(financialClosedAt).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  : 'Las cuotas de este evento fueron liquidadas en tesorería.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canManage && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="btn-tactile py-2 px-3 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm transition active:scale-95 min-h-[40px]"
              >
                Ajustar
              </button>
            )}
            <Link
              href={isAdmin ? "/finanzas?tab=admin" : "/finanzas"}
              className="btn-tactile py-2 px-3 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-neutral-950 dark:bg-neutral-800 text-white font-display font-bold text-xs uppercase tracking-wider hover:bg-neutral-900 transition flex items-center gap-1 shadow-tactile-sm min-h-[40px]"
            >
              <span>Finanzas</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      ) : (
        /* Pending Closure State */
        <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-amber-700 dark:text-amber-400 stroke-[2.5]" />
              <div>
                <h4 className="font-display font-bold text-sm uppercase tracking-wider text-amber-950 dark:text-amber-200">
                  Cierre Financiero Pendiente
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 font-sans">
                  El partido finalizó. Emite el cierre para liquidar los cobros a los socios.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t-2 border-neutral-900/10 dark:border-neutral-800 text-xs">
            <span className="font-mono text-xs font-bold text-amber-950 dark:text-amber-200">
              {totalCost ? `Cancha: $${totalCost.toLocaleString('es-CL')} (${totalPlayers} jugadores)` : `Base: $${baseCostPerPlayer.toLocaleString('es-CL')} c/u`}
            </span>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="btn-tactile py-2 px-3.5 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-amber-400 hover:bg-amber-500 text-neutral-950 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm transition active:scale-95 flex items-center gap-1.5 min-h-[40px]"
            >
              <span>Emitir Cierre</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Interactive Financial Closing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile p-6 space-y-4 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Modal Header */}
            <div>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-300">
                Liquidación Oficial de Partido
              </span>
              <h3 className="font-display font-bold text-2xl text-neutral-950 dark:text-white uppercase tracking-tight leading-none mt-2">
                Cierre Financiero del Evento
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-sans">
                Ajusta el cobro individual de cada jugador antes de generar las deudas en el club.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-medium">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Quick summary stats */}
            <div className="grid grid-cols-2 gap-3 bg-neutral-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 text-xs">
              <div>
                <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Costo Cancha Club</span>
                <span className="font-display font-bold text-xl text-neutral-950 dark:text-white">
                  {totalCost ? `$${totalCost.toLocaleString('es-CL')}` : 'Por definir'}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">Total a Cobrar</span>
                <span className={`font-display font-bold text-xl ${totalCost && totalCollected < totalCost ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  ${totalCollected.toLocaleString('es-CL')}
                </span>
              </div>
            </div>

            {/* Quick standard reset button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleApplyStandardProrate}
                className="font-mono text-[11px] font-bold text-neutral-900 dark:text-neutral-200 hover:underline uppercase tracking-wider"
              >
                ↺ Restablecer prorrateo (${baseCostPerPlayer.toLocaleString('es-CL')} c/u)
              </button>
            </div>

            {/* Players List with editable amounts */}
            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              <p className="font-display font-bold text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Jugadores Confirmados ({confirmedAttendees.length})
              </p>
              {confirmedAttendees.map((att) => (
                <div
                  key={att.userId}
                  className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-neutral-800/70 border-2 border-neutral-200 dark:border-neutral-700 shadow-2xs gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-700 border-2 border-neutral-900 dark:border-neutral-700 flex items-center justify-center relative flex-shrink-0 shadow-tactile-sm">
                      {att.avatarUrl ? (
                        <Image src={att.avatarUrl} alt={att.fullName} fill className="object-cover" sizes="36px" />
                      ) : (
                        <span className="font-display font-bold text-xs text-neutral-900 dark:text-white">
                          {att.fullName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="font-display font-bold text-sm uppercase text-neutral-950 dark:text-white truncate">
                      {att.fullName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-mono text-xs text-neutral-400 font-bold">$</span>
                    <input
                      type="number"
                      value={amounts[`member_${att.userId}`] ?? 0}
                      onChange={(e) => handleAmountChange(`member_${att.userId}`, e.target.value)}
                      className="input-tactile w-24 px-2.5 py-1 text-xs font-mono font-bold text-neutral-950 dark:text-white text-right"
                    />
                  </div>
                </div>
              ))}

              {approvedGuests.length > 0 && (
                <>
                  <p className="font-display font-bold text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 pt-2">
                    Invitados Aprobados ({approvedGuests.length})
                  </p>
                  {approvedGuests.map((g) => (
                    <div
                      key={g.guestId}
                      className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border-2 border-neutral-200 dark:border-neutral-700 gap-3"
                    >
                      <div className="min-w-0">
                        <span className="font-display font-bold text-sm uppercase text-neutral-950 dark:text-white block truncate">
                          {g.guestName}
                        </span>
                        <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                          A cargo de: <strong className="text-neutral-900 dark:text-neutral-200 font-bold">{g.inviterName}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-mono text-xs text-neutral-400 font-bold">$</span>
                        <input
                          type="number"
                          value={amounts[`guest_${g.guestId}`] ?? 0}
                          onChange={(e) => handleAmountChange(`guest_${g.guestId}`, e.target.value)}
                          className="input-tactile w-24 px-2.5 py-1 text-xs font-mono font-bold text-neutral-950 dark:text-white text-right bg-white dark:bg-neutral-800"
                        />
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Submit Action */}
            <div className="pt-3 border-t-2 border-neutral-900/10 dark:border-neutral-800 flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
                className="btn-tactile py-2.5 px-4 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-xs font-display font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200 shadow-tactile-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmitClosure}
                disabled={loading}
                className="btn-tactile flex-1 py-2.5 px-4 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-neutral-950 dark:bg-neutral-100 hover:bg-neutral-900 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm transition active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Emitir Cierre (${totalCollected.toLocaleString('es-CL')})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
