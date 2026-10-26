'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Copy, Check, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
}

export function FinanzasMemberView({ debts, userName }: FinanzasMemberViewProps) {
  const [activeTab, setActiveTab] = useState<'pendientes' | 'pagados'>('pendientes')
  const [copied, setCopied] = useState(false)

  const pending = debts.filter((d) => d.status === 'pendiente')
  const paid = debts.filter((d) => d.status === 'pagado')

  const totalOwed = pending.reduce((acc, curr) => acc + curr.amount, 0)
  const ownMatchesOwed = pending.filter((d) => d.debt_type === 'partido_propio').length
  const guestMatchesOwed = pending.filter((d) => d.debt_type === 'invitado').length

  const handleCopyTransfer = () => {
    navigator.clipboard.writeText('admin@clubdeportivo.com')
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Debt Status Card */}
      {pending.length === 0 ? (
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl p-5 shadow-md space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white">
              Estado Financiero
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-white text-emerald-800 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Al día</span>
            </span>
          </div>
          <h2 className="text-xl font-black">¡Estás al día, {userName.split(' ')[0]}!</h2>
          <p className="text-xs text-emerald-100">
            No tienes partidos pendientes de pago. ¡Gracias por mantener tu compromiso con el club!
          </p>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-black/20 text-white">
              Saldo Pendiente
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold bg-white text-amber-900 px-2 py-0.5 rounded-full shadow-xs">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>{pending.length} partido(s)</span>
            </span>
          </div>

          <div>
            <p className="text-xs text-amber-100 font-medium">Monto total adeudado</p>
            <p className="text-3xl font-black tracking-tight">
              ${totalOwed.toLocaleString('es-CL')}
            </p>
          </div>

          <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs text-amber-100">
            <span>{ownMatchesOwed} partido(s) propio(s)</span>
            {guestMatchesOwed > 0 && (
              <span className="font-semibold text-white bg-black/20 px-2 py-0.5 rounded-md">
                {guestMatchesOwed} invitado(s)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bank Account Transfer Info Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
            Datos de Transferencia
          </h3>
          <button
            type="button"
            onClick={handleCopyTransfer}
            className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-1 px-2.5 rounded-lg border border-emerald-200 flex items-center gap-1 transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? '¡Copiado!' : 'Copiar email'}</span>
          </button>
        </div>

        <div className="text-xs text-neutral-600 space-y-1 bg-neutral-50 p-3 rounded-xl border border-neutral-200/70 font-mono">
          <p><span className="text-neutral-400 font-sans">Banco:</span> Banco Santander</p>
          <p><span className="text-neutral-400 font-sans">Cuenta Corriente:</span> 78-90123-4</p>
          <p><span className="text-neutral-400 font-sans">RUT:</span> 76.543.210-K</p>
          <p><span className="text-neutral-400 font-sans">Email:</span> admin@clubdeportivo.com</p>
        </div>
        <p className="text-[11px] text-neutral-500">
          Una vez transferido, el administrador verificará el pago y marcará tu cuenta como saneada.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-neutral-100 p-1 text-xs font-bold text-neutral-600">
        <button
          type="button"
          onClick={() => setActiveTab('pendientes')}
          className={`flex-1 py-2 rounded-lg transition text-center ${
            activeTab === 'pendientes'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          Pendientes ({pending.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pagados')}
          className={`flex-1 py-2 rounded-lg transition text-center ${
            activeTab === 'pagados'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          Historial Pagados ({paid.length})
        </button>
      </div>

      {/* Tab Content: Pendientes */}
      {activeTab === 'pendientes' && (
        <div className="space-y-2">
          {pending.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">
              No tienes partidos pendientes de pago.
            </p>
          ) : (
            pending.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-neutral-200 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                        item.debt_type === 'invitado'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.debt_type === 'invitado' ? 'Invitado' : 'Partido Propio'}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {new Date(item.created_at).toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-neutral-900">
                    {item.description}
                  </h4>
                  {item.events && (
                    <Link
                      href={`/eventos/${item.events.id}`}
                      className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Ver partido</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-base font-black text-amber-600">
                    ${item.amount.toLocaleString('es-CL')}
                  </p>
                  <span className="text-[10px] font-semibold text-neutral-400">
                    Pendiente
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Pagados */}
      {activeTab === 'pagados' && (
        <div className="space-y-2">
          {paid.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">
              Aún no tienes historial de pagos registrados.
            </p>
          ) : (
            paid.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-neutral-200/80 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3 opacity-90"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                      {item.debt_type === 'invitado' ? 'Invitado' : 'Propio'}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Pagado el {item.paid_at ? new Date(item.paid_at).toLocaleDateString('es-CL') : ''}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-neutral-800 mt-0.5">
                    {item.description}
                  </h4>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold text-emerald-600">
                    ${item.amount.toLocaleString('es-CL')}
                  </p>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5 justify-end">
                    <Check className="w-2.5 h-2.5" />
                    <span>Al día</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
