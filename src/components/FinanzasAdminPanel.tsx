'use client'

import { useState } from 'react'
import Link from 'next/link'
import { settleMemberDebtsAction, revertDebtAction, updateBankDetailsAction, BankDetails } from '@/app/finanzas/actions'
import { updateClubThemeAction } from '@/app/club/actions'
import { PalettePicker } from '@/components/PalettePicker'
import { EmptyState } from '@/components/EmptyState'
import { CheckCircle2, ChevronDown, ChevronUp, ChevronRight, Loader2, AlertCircle, RefreshCw, UserCheck, Settings2, X, Save, Palette } from 'lucide-react'

export interface PendingClosureEventItem {
  id: string
  title: string
  start_time: string
  event_type: string
  total_cost: number | null
  cost_per_player: number
  confirmed_count: number
}

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
  initialBankDetails: BankDetails
  pendingClosureEvents?: PendingClosureEventItem[]
  clubId?: string
  currentPalette?: string
}

export function FinanzasAdminPanel({
  debts,
  initialBankDetails,
  pendingClosureEvents = [],
  clubId,
  currentPalette = 'emerald',
}: FinanzasAdminPanelProps) {
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)
  const [loadingDebtId, setLoadingDebtId] = useState<string | null>(null)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Bank & Theme settings modal state
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [bankForm, setBankForm] = useState<BankDetails>(initialBankDetails)
  const [selectedPalette, setSelectedPalette] = useState<string>(currentPalette)
  const [savingSettings, setSavingSettings] = useState(false)

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
    if (!confirm(`¿Confirmas marcar como PAGADOS todos los partidos de ${player.full_name}?`)) return
    setError(null)
    setLoadingUserId(player.user_id)

    const debtIds = player.pending_debts.map((d) => d.id)
    const res = await settleMemberDebtsAction(player.user_id, debtIds, clubId)
    setLoadingUserId(null)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccessMsg(`Deuda de ${player.full_name} liquidada exitosamente.`)
      setTimeout(() => setSuccessMsg(null), 3500)
    }
  }

  const handleSettleSingle = async (userId: string, debtId: string) => {
    setError(null)
    setLoadingDebtId(debtId)
    const res = await settleMemberDebtsAction(userId, [debtId], clubId)
    setLoadingDebtId(null)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccessMsg('Partido marcado como pagado.')
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleRevert = async (debtId: string) => {
    if (!confirm('¿Revertir este pago a estado pendiente?')) return
    setError(null)
    setLoadingDebtId(debtId)
    const res = await revertDebtAction(debtId)
    setLoadingDebtId(null)

    if (res?.error) {
      setError(res.error)
    } else {
      setSuccessMsg('Pago revertido a pendiente.')
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSavingSettings(true)

    // 1. Update bank details
    const bankRes = await updateBankDetailsAction(bankForm)
    if (bankRes?.error) {
      setError(bankRes.error)
      setSavingSettings(false)
      return
    }

    // 2. Update theme palette if clubId is provided
    if (clubId && selectedPalette !== currentPalette) {
      const themeRes = await updateClubThemeAction(clubId, selectedPalette)
      if (themeRes?.error) {
        setError(themeRes.error)
        setSavingSettings(false)
        return
      }
    }

    setSavingSettings(false)
    setIsEditingSettings(false)
    setSuccessMsg('Configuración del club guardada exitosamente.')
    setTimeout(() => setSuccessMsg(null), 3500)
  }

  return (
    <div className="space-y-4">
      {/* Alert Messages */}
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

      {/* Global Club Financial Health Card */}
      <div className="bg-neutral-900 text-white rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
            Resumen General de Tesorería
          </span>
          <span className="text-xs font-semibold text-neutral-400">
            {pendingDebts.length} cobro(s) pendiente(s)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-[11px] text-neutral-400">Por Cobrar en el Club</p>
            <p className="text-2xl font-black text-amber-400 tracking-tight">
              ${totalClubDebt.toLocaleString('es-CL')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-neutral-400">Jugadores Deudores</p>
            <p className="text-2xl font-black text-white tracking-tight">
              {playerSummaries.length}
            </p>
          </div>
        </div>

        {/* Club Settings & Bank Config Button */}
        <div className="pt-2 border-t border-neutral-800 flex justify-end">
          <button
            type="button"
            onClick={() => setIsEditingSettings(true)}
            className="min-h-[44px] text-xs font-bold text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-700 py-2 px-3 rounded-xl border border-neutral-700 flex items-center gap-1.5 transition active:scale-95"
          >
            <Settings2 className="w-4 h-4 text-emerald-400" />
            <span>Configuración & Colores del Club</span>
          </button>
        </div>
      </div>

      {/* Partidos Pendientes de Cierre Financiero */}
      {pendingClosureEvents.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                Partidos Pendientes de Cierre ({pendingClosureEvents.length})
              </h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
              Por Liquidar
            </span>
          </div>

          <p className="text-xs text-amber-800 leading-relaxed">
            Los siguientes partidos finalizaron en cancha pero aún no se han liquidado las cuotas a los jugadores. Haz clic en <strong>Cerrar Finanzas</strong> para liquidar los cobros.
          </p>

          <div className="divide-y divide-amber-200/80 bg-white rounded-xl border border-amber-200 overflow-hidden">
            {pendingClosureEvents.map((ev) => (
              <div key={ev.id} className="p-3 flex items-center justify-between gap-3 hover:bg-amber-50/50 transition">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-neutral-900 truncate">{ev.title}</p>
                  <p className="text-[11px] text-neutral-500">
                    {new Date(ev.start_time).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })} • {ev.confirmed_count} jugadores
                    {ev.total_cost ? ` • Total Cancha: $${ev.total_cost.toLocaleString('es-CL')}` : ''}
                  </p>
                </div>
                <Link
                  href={`/eventos/${ev.id}`}
                  className="min-h-[44px] py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 shadow-xs flex-shrink-0"
                >
                  <span>Cerrar Finanzas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal (Bank details + Palette Picker) */}
      {isEditingSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="font-extrabold text-base text-neutral-900">
                Ajustes & Finanzas del Club
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="w-10 h-10 rounded-full text-neutral-400 hover:text-neutral-700 flex items-center justify-center"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              {/* 10-Color Palette Customizer */}
              {clubId && (
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
                  <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-neutral-600" />
                    Color Institucional del Club (10 Paletas)
                  </label>
                  <p className="text-[11px] text-neutral-500">
                    Cambia la personalidad de los botones, medallas y navegación de todos los miembros.
                  </p>
                  <PalettePicker
                    selectedId={selectedPalette}
                    onSelect={(id) => setSelectedPalette(id)}
                    disabled={savingSettings}
                  />
                </div>
              )}

              {/* Bank Details */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  Cuenta de Transferencia para Socios
                </h4>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Banco</label>
                  <input
                    type="text"
                    required
                    value={bankForm.banco}
                    onChange={(e) => setBankForm({ ...bankForm, banco: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 font-medium text-base sm:text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Tipo de Cuenta</label>
                  <input
                    type="text"
                    required
                    value={bankForm.tipo_cuenta}
                    onChange={(e) => setBankForm({ ...bankForm, tipo_cuenta: e.target.value })}
                    placeholder="Ej: Cuenta Corriente / Cuenta Vista"
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 font-medium text-base sm:text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Número de Cuenta</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={bankForm.numero_cuenta}
                    onChange={(e) => setBankForm({ ...bankForm, numero_cuenta: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 font-medium text-base sm:text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Titular</label>
                  <input
                    type="text"
                    required
                    value={bankForm.titular}
                    onChange={(e) => setBankForm({ ...bankForm, titular: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 font-medium text-base sm:text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">RUT</label>
                    <input
                      type="text"
                      required
                      value={bankForm.rut}
                      onChange={(e) => setBankForm({ ...bankForm, rut: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 font-medium text-base sm:text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={bankForm.email}
                      onChange={(e) => setBankForm({ ...bankForm, email: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 bg-white text-neutral-900 font-medium text-base sm:text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingSettings(false)}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-neutral-100 font-bold text-neutral-700 active:scale-95 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Guardar Ajustes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Debtors List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 px-1">
          Jugadores con Saldo Pendiente ({playerSummaries.length})
        </h4>

        {playerSummaries.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="¡Todo el club está al día!"
            description="No hay deudas pendientes por cobrar en este momento."
          />
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
                      className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-700 flex items-center gap-0.5 ml-auto mt-0.5 min-h-[32px]"
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
                    className="flex-1 min-h-[44px] py-2 px-3 rounded-xl text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 active:scale-95"
                    style={{
                      backgroundColor: 'var(--club-primary, #059669)',
                    }}
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
                            className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition flex items-center justify-center active:scale-95"
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
                  <span className="font-semibold text-neutral-900">{paid.profiles?.full_name}</span>
                  <span className="text-[10px] text-neutral-400 block">{paid.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">${paid.amount.toLocaleString('es-CL')}</span>
                  <button
                    type="button"
                    onClick={() => handleRevert(paid.id)}
                    disabled={loadingDebtId === paid.id}
                    className="p-1 text-neutral-400 hover:text-amber-600 transition"
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
