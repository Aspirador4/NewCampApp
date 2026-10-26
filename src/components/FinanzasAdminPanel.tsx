'use client'

import { useState } from 'react'
import { settleMemberDebtsAction, revertDebtAction } from '@/app/finanzas/actions'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, AlertCircle, RefreshCw, UserCheck, Shield } from 'lucide-react'

export interface AdminDebtItem {
  id: string
  event_id: string
  user_id: string
  guest_id: string | null
  debt_type: 'partido_propio' | 'invitado'
  description: string
  amount: number
  status: 'pendiente' | 'pagado'
  created_at: string
  paid_at: string | null
  events: {
    title: string
    start_time: string
  } | null
  profiles: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
}

export interface PlayerDebtSummary {
  user_id: string
  full_name: string
  avatar_url: string | null
  total_amount: number
  pending_debts: AdminDebtItem[]
  own_matches_count: number
  guest_matches_count: number
}

interface FinanzasAdminPanelProps {
  debts: AdminDebtItem[]
}

export function FinanzasAdminPanel({ debts }: FinanzasAdminPanelProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)
  const [loadingDebtId, setLoadingDebtId] = useState<string | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filter pending debts
  const pendingDebts = debts.filter((d) => d.status === 'pendiente')
  const paidDebts = debts.filter((d) => d.status === 'pagado')

  // Group by player
  const playerMap = new Map<string, PlayerDebtSummary>()
  for (const debt of pendingDebts) {
    const userId = debt.user_id
    if (!playerMap.has(userId)) {
      playerMap.set(userId, {
        user_id: userId,
        full_name: debt.profiles?.full_name || 'Socio',
        avatar_url: debt.profiles?.avatar_url || null,
        total_amount: 0,
        pending_debts: [],
        own_matches_count: 0,
        guest_matches_count: 0,
      })
    }
    const p = playerMap.get(userId)!
    p.total_amount += debt.amount
    p.pending_debts.push(debt)
    if (debt.debt_type === 'partido_propio') {
      p.own_matches_count++
    } else {
      p.guest_matches_count++
    }
  }

  const playerSummaries = Array.from(playerMap.values()).sort((a, b) => b.total_amount - a.total_amount)
  const totalClubDebt = pendingDebts.reduce((acc, curr) => acc + curr.amount, 0)

  const handleSettleAll = async (player: PlayerDebtSummary) => {
    if (!confirm(`¿Confirmas que ${player.full_name} pagó $${player.total_amount.toLocaleString('es-CL')} y queda al día?`)) {
      return
    }

    setError(null)
    setSuccessMsg(null)
    setLoadingUserId(player.user_id)
    const res = await settleMemberDebtsAction(player.user_id)
    setLoadingUserId(null)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccessMsg(`Deuda de ${player.full_name} saneada con éxito.`)
      setTimeout(() => setSuccessMsg(null), 4000)
    }
  }

  const handleSettleSingle = async (userId: string, debtId: string) => {
    setError(null)
    setLoadingDebtId(debtId)
    const res = await settleMemberDebtsAction(userId, [debtId])
    setLoadingDebtId(null)

    if (res?.error) {
      setError(res.error)
    }
  }

  const handleRevert = async (debtId: string) => {
    if (!confirm('¿Deseas revertir este pago a pendiente?')) return
    setError(null)
    setLoadingDebtId(debtId)
    const res = await revertDebtAction(debtId)
    setLoadingDebtId(null)

    if (res?.error) {
      setError(res.error)
    }
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Admin KPI Header Card */}
      <div className="bg-neutral-900 text-white rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Panel Tesorería & Cobranzas
            </h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
            {playerSummaries.length} con saldo pendiente
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-neutral-800/80 p-3 rounded-xl border border-neutral-700">
            <p className="text-[10px] uppercase font-semibold text-neutral-400">Total por Cobrar</p>
            <p className="text-lg font-black text-amber-400">
              ${totalClubDebt.toLocaleString('es-CL')}
            </p>
          </div>
          <div className="bg-neutral-800/80 p-3 rounded-xl border border-neutral-700">
            <p className="text-[10px] uppercase font-semibold text-neutral-400">Partidos Pendientes</p>
            <p className="text-lg font-black text-white">
              {pendingDebts.length} cargos
            </p>
          </div>
        </div>
      </div>

      {/* Debtors List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 px-1">
          Jugadores con Saldo Pendiente ({playerSummaries.length})
        </h4>

        {playerSummaries.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <UserCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-emerald-900">¡Todo el club está al día!</p>
            <p className="text-xs text-emerald-700 mt-1">No hay deudas pendientes por cobrar.</p>
          </div>
        ) : (
          playerSummaries.map((player) => {
            const isExpanded = expandedUser === player.user_id
            const isUserLoading = loadingUserId === player.user_id

            return (
              <div
                key={player.user_id}
                className="bg-white border border-neutral-200 rounded-2xl p-3.5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 text-neutral-700 font-bold flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                      {player.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-neutral-900 leading-tight">
                        {player.full_name}
                      </h5>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-neutral-500">
                        <span>{player.pending_debts.length} partido(s)</span>
                        {player.guest_matches_count > 0 && (
                          <span className="text-amber-700 font-medium">
                            • {player.guest_matches_count} invitado(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-amber-600">
                      ${player.total_amount.toLocaleString('es-CL')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setExpandedUser(isExpanded ? null : player.user_id)}
                      className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5 ml-auto mt-0.5"
                    >
                      <span>{isExpanded ? 'Ocultar' : 'Detalle'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Settle All Button */}
                <div className="pt-2 border-t border-neutral-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSettleAll(player)}
                    disabled={isUserLoading}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {isUserLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Marcar al día (${player.total_amount.toLocaleString('es-CL')})</span>
                  </button>
                </div>

                {/* Expanded Details List */}
                {isExpanded && (
                  <div className="pt-2 space-y-2 border-t border-neutral-100">
                    <p className="text-[10px] font-bold uppercase text-neutral-400">Detalle de partidos:</p>
                    {player.pending_debts.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/70 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-neutral-900 leading-tight">
                            {item.description}
                          </p>
                          <p className="text-[10px] text-neutral-500 mt-0.5">
                            {new Date(item.created_at).toLocaleDateString('es-CL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-900">
                            ${item.amount.toLocaleString('es-CL')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSettleSingle(player.user_id, item.id)}
                            disabled={loadingDebtId === item.id}
                            className="p-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition"
                            title="Marcar este partido como pagado"
                          >
                            {loadingDebtId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Recently Paid Section */}
      {paidDebts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-neutral-200 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-1">
            Historial de Pagos Recientes Saneados ({paidDebts.length})
          </h4>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {paidDebts.slice(0, 5).map((paid) => (
              <div
                key={paid.id}
                className="p-2 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-between text-xs text-neutral-600"
              >
                <div>
                  <p className="font-medium text-neutral-800">{paid.profiles?.full_name}: {paid.description}</p>
                  <p className="text-[10px] text-neutral-400">
                    Saneado: {paid.paid_at ? new Date(paid.paid_at).toLocaleDateString('es-CL') : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-700">${paid.amount.toLocaleString('es-CL')}</span>
                  <button
                    type="button"
                    onClick={() => handleRevert(paid.id)}
                    disabled={loadingDebtId === paid.id}
                    className="p-1 rounded-lg text-neutral-400 hover:text-amber-700 transition"
                    title="Revertir a pendiente"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
