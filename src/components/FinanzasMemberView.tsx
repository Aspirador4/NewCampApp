'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Copy, Check, Calendar } from 'lucide-react'
import { BankDetails } from '@/app/finanzas/actions'
import { EmptyState } from '@/components/EmptyState'

export interface MemberDebtItem {
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
    id: string
    title: string
    start_time: string
  } | null
}

interface FinanzasMemberViewProps {
  debts: MemberDebtItem[]
  userName: string
  bankDetails: BankDetails
}

export function FinanzasMemberView({ debts, userName, bankDetails }: FinanzasMemberViewProps) {
  const [activeTab, setActiveTab] = useState<'pendientes' | 'pagados'>('pendientes')
  const [copied, setCopied] = useState(false)

  const pending = debts.filter((d) => d.status === 'pendiente')
  const paid = debts.filter((d) => d.status === 'pagado')

  const totalOwed = pending.reduce((acc, curr) => acc + curr.amount, 0)
  const ownMatchesOwed = pending.filter((d) => d.debt_type === 'partido_propio').length
  const guestMatchesOwed = pending.filter((d) => d.debt_type === 'invitado').length

  const handleCopyTransfer = () => {
    const textToCopy = `DATOS DE TRANSFERENCIA CLUB:
Banco: ${bankDetails.banco}
Tipo de Cuenta: ${bankDetails.tipo_cuenta}
Nº Cuenta: ${bankDetails.numero_cuenta}
Titular: ${bankDetails.titular}
RUT: ${bankDetails.rut}
Email: ${bankDetails.email}`

    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Debt Status Card */}
      {pending.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 bg-neutral-950 text-white shadow-tactile p-5">
          <div className="absolute inset-0 bg-mesh-pattern-white opacity-10 pointer-events-none" />
          <div className="relative space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                ESTADO FINANCIERO OFICIAL
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase bg-emerald-400 text-neutral-950 px-2.5 py-0.5 rounded-full border border-neutral-900 shadow-tactile-sm">
                <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                <span>Al día ✓</span>
              </span>
            </div>
            <h2 className="font-display font-bold text-2xl uppercase tracking-tight text-white leading-tight">
              ¡Estás al día, {userName.split(' ')[0]}!
            </h2>
            <p className="font-sans text-xs text-neutral-300">
              No registras cuotas pendientes por canchas ni terceros tiempos. ¡Excelente compromiso con el club!
            </p>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border-2 border-neutral-900 dark:border-amber-600 bg-amber-500 text-neutral-950 shadow-tactile p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-950">
              SALDO PENDIENTE POR LIQUIDAR
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase bg-neutral-950 text-amber-400 px-2.5 py-0.5 rounded-full">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{pending.length} cuota(s)</span>
            </span>
          </div>

          <div>
            <p className="font-mono text-[10px] text-neutral-900 uppercase font-bold">Monto Total Adeudado</p>
            <p className="font-display font-bold text-4xl text-neutral-950 tracking-tight leading-none mt-0.5">
              ${totalOwed.toLocaleString('es-CL')}
            </p>
          </div>

          <div className="pt-2 border-t-2 border-neutral-950/20 flex items-center justify-between font-mono text-[11px] text-neutral-950 font-bold">
            <span>{ownMatchesOwed} partido(s) propio(s)</span>
            {guestMatchesOwed > 0 && (
              <span className="bg-neutral-950 text-white px-2 py-0.5 rounded-lg text-[10px]">
                {guestMatchesOwed} invitado(s) a tu cargo
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bank Account Transfer Voucher with 1-Click Copy */}
      <div className="bg-white dark:bg-[#14161f] rounded-3xl p-5 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile space-y-3.5">
        <div className="flex items-center justify-between border-b-2 border-neutral-900/10 dark:border-white/10 pb-2.5">
          <h3 className="font-display font-bold text-base text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
            Datos Oficiales de Transferencia
          </h3>
          <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold">
            Tesorería
          </span>
        </div>

        {bankDetails.numero_cuenta ? (
          <div className="space-y-2.5 font-mono text-xs bg-neutral-50 dark:bg-[#1a1d28] p-3.5 rounded-2xl border-2 border-neutral-300 dark:border-neutral-700">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[9px] text-neutral-400 uppercase block leading-none">Banco</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-200 text-xs mt-0.5 block">{bankDetails.banco || '-'}</span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-400 uppercase block leading-none">Tipo Cuenta</span>
                <span className="font-bold text-neutral-900 dark:text-neutral-200 text-xs mt-0.5 block">{bankDetails.tipo_cuenta || '-'}</span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-400 uppercase block leading-none">Nº de Cuenta</span>
                <span className="font-mono font-semibold text-neutral-950 dark:text-white text-xs mt-0.5 block">{bankDetails.numero_cuenta}</span>
              </div>
              <div>
                <span className="text-[9px] text-neutral-400 uppercase block leading-none">RUT</span>
                <span className="font-mono font-semibold text-neutral-950 dark:text-white text-xs mt-0.5 block">{bankDetails.rut || '-'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-[9px] text-neutral-400 uppercase block leading-none">Titular</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-200 text-xs mt-0.5 block">{bankDetails.titular || '-'}</span>
            </div>
            {bankDetails.email && (
              <div>
                <span className="text-[9px] text-neutral-400 uppercase block leading-none">Email para Comprobante</span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300 text-xs mt-0.5 block">{bankDetails.email}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3.5 bg-neutral-50 dark:bg-[#1a1d28] rounded-2xl border-2 border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-400 text-center font-mono">
            El administrador aún no ha configurado los datos bancarios oficiales.
          </div>
        )}

        {bankDetails.numero_cuenta && (
          <button
            type="button"
            onClick={handleCopyTransfer}
            className={`btn-tactile w-full min-h-[44px] py-2.5 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm transition ${
              copied
                ? 'bg-neutral-950 dark:bg-emerald-950 text-emerald-400'
                : 'bg-white dark:bg-[#1c1f2e] hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-950 dark:text-white'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>¡Datos Copiados al Portapapeles!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Datos de Transferencia</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabs: Pendientes vs Pagados (Segmented Locker Tabs) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('pendientes')}
          className={`btn-tactile min-h-[40px] py-2 rounded-xl transition text-center flex items-center justify-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 ${
            activeTab === 'pendientes'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
              : 'bg-white dark:bg-[#14161f] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 border-neutral-900 dark:border-neutral-700'
          }`}
        >
          <span>Pendientes</span>
          {pending.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-amber-400 text-neutral-950 font-bold">
              {pending.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pagados')}
          className={`btn-tactile min-h-[40px] py-2 rounded-xl transition text-center flex items-center justify-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 ${
            activeTab === 'pagados'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
              : 'bg-white dark:bg-[#14161f] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 border-neutral-900 dark:border-neutral-700'
          }`}
        >
          <span>Historial Pagados</span>
          {paid.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold">
              {paid.length}
            </span>
          )}
        </button>
      </div>

      {/* Debts List */}
      <div className="space-y-3">
        {activeTab === 'pendientes' ? (
          pending.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="¡Todo al día!"
              description="No registras deudas pendientes por partidos ni invitados en este club."
            />
          ) : (
            pending.map((item) => (
              <div
                key={item.id}
                className="btn-tactile bg-white dark:bg-[#14161f] rounded-3xl p-4 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-neutral-900 dark:border-neutral-700 ${
                        item.debt_type === 'invitado'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300'
                      }`}
                    >
                      {item.debt_type === 'invitado' ? 'Invitado' : 'Partido Propio'}
                    </span>
                    <span className="font-mono text-[10px] text-neutral-400">
                      {new Date(item.created_at).toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-base uppercase text-neutral-950 dark:text-white leading-tight">
                    {item.events?.title || item.description}
                  </h4>
                  {item.events && (
                    <p className="font-sans text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0 pl-2">
                  <span className="font-display font-bold text-2xl text-neutral-950 dark:text-white block leading-tight">
                    ${item.amount.toLocaleString('es-CL')}
                  </span>
                  <span className="font-mono text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800/70 inline-block mt-0.5">
                    Pendiente
                  </span>
                </div>
              </div>
            ))
          )
        ) : paid.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Sin historial de pagos"
            description="Aquí aparecerán los recibos de los partidos que ya hayas abonado."
          />
        ) : (
          paid.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#14161f] rounded-3xl p-4 border-2 border-neutral-300 dark:border-neutral-800 shadow-tactile-sm flex items-center justify-between gap-3 opacity-90"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">
                    {item.debt_type === 'invitado' ? 'Invitado' : 'Partido Propio'}
                  </span>
                  {item.paid_at && (
                    <span className="font-mono text-[10px] text-neutral-400">
                      Pagado el {new Date(item.paid_at).toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  )}
                </div>

                <h4 className="font-display font-bold text-base uppercase text-neutral-950 dark:text-white leading-tight">
                  {item.events?.title || item.description}
                </h4>
              </div>

              <div className="text-right flex-shrink-0 pl-2">
                <span className="font-display font-bold text-xl text-neutral-900 dark:text-neutral-200 block leading-tight">
                  ${item.amount.toLocaleString('es-CL')}
                </span>
                <span className="font-mono text-[9px] font-bold uppercase text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/70 inline-block mt-0.5">
                  ✓ Liquidado
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
