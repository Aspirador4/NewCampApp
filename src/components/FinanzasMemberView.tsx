'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Copy, Check, Calendar, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
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
        <div
          className="text-white rounded-2xl p-5 shadow-md space-y-2"
          style={{
            background: 'linear-gradient(135deg, var(--club-gradient-from, #059669), var(--club-gradient-to, #0f766e))',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white">
              Estado Financiero
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs font-bold bg-white px-2.5 py-0.5 rounded-full shadow-xs"
              style={{ color: 'var(--club-primary, #059669)' }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Al día</span>
            </span>
          </div>
          <h2 className="text-xl font-black">¡Estás al día, {userName.split(' ')[0]}!</h2>
          <p className="text-xs text-white/90">
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

      {/* Bank Account Transfer Card with 1-Click Copy */}
      <div className="bg-white rounded-2xl p-4 border border-neutral-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
            Datos de Transferencia
          </h3>
          <span className="text-[10px] text-neutral-400 font-medium">
            Tesorería Oficial
          </span>
        </div>

        {bankDetails.numero_cuenta ? (
          <div className="space-y-2 text-xs bg-neutral-50 p-3 rounded-xl border border-neutral-200/70">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Banco</span>
                <span className="font-semibold text-neutral-800">{bankDetails.banco || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Tipo Cuenta</span>
                <span className="font-semibold text-neutral-800">{bankDetails.tipo_cuenta || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Nº de Cuenta</span>
                <span className="font-mono font-bold text-neutral-900">{bankDetails.numero_cuenta}</span>
              </div>
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">RUT</span>
                <span className="font-mono font-bold text-neutral-900">{bankDetails.rut || '-'}</span>
              </div>
            </div>

            <div className="pt-1 border-t border-neutral-200/60">
              <span className="text-[10px] text-neutral-500 uppercase block">Titular</span>
              <span className="font-semibold text-neutral-800">{bankDetails.titular || '-'}</span>
            </div>
            {bankDetails.email && (
              <div>
                <span className="text-[10px] text-neutral-500 uppercase block">Email Comprobantes</span>
                <span className="font-medium text-neutral-700">{bankDetails.email}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-500 text-center">
            El administrador aún no ha configurado los datos bancarios.
          </div>
        )}

        {bankDetails.numero_cuenta && (
          <button
            type="button"
            onClick={handleCopyTransfer}
            className={`w-full min-h-[44px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 shadow-xs ${
              copied
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>¡Datos Copiados al Portapapeles!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-neutral-500" />
                <span>Copiar Datos de Transferencia</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabs: Pendientes vs Pagados */}
      <div className="flex gap-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('pendientes')}
          className={`flex-1 min-h-[40px] py-2 rounded-xl transition text-center flex items-center justify-center gap-1.5 active:scale-95 ${
            activeTab === 'pendientes'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
          }`}
        >
          <span>Pendientes</span>
          {pending.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {pending.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pagados')}
          className={`flex-1 min-h-[40px] py-2 rounded-xl transition text-center flex items-center justify-center gap-1.5 active:scale-95 ${
            activeTab === 'pagados'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
          }`}
        >
          <span>Historial Pagados</span>
          {paid.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-200 text-neutral-700">
              {paid.length}
            </span>
          )}
        </button>
      </div>

      {/* Debts List */}
      <div className="space-y-2.5">
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
                className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        item.debt_type === 'invitado'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-amber-100 text-amber-800'
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

                  <h4 className="font-bold text-sm text-neutral-900 leading-tight">
                    {item.description}
                  </h4>

                  {item.events && (
                    <Link
                      href={`/eventos/${item.event_id}`}
                      className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800 mt-1"
                    >
                      <Calendar className="w-3 h-3 text-neutral-400" />
                      <span className="truncate">{item.events.title}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-base font-black text-amber-600">
                    ${item.amount.toLocaleString('es-CL')}
                  </p>
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    Pendiente
                  </span>
                </div>
              </div>
            ))
          )
        ) : paid.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Sin historial de pagos"
            description="Aquí aparecerán los partidos y cuotas que hayas saldado con el club."
          />
        ) : (
          paid.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-3.5 border border-neutral-200/80 shadow-xs flex items-center justify-between opacity-80"
            >
              <div className="min-w-0">
                <span className="text-[9px] font-bold uppercase text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                  {item.debt_type === 'invitado' ? 'Invitado' : 'Partido Propio'}
                </span>
                <p className="font-semibold text-xs text-neutral-800 mt-1 truncate">
                  {item.description}
                </p>
                <p className="text-[10px] text-neutral-400">
                  Pagado el{' '}
                  {item.paid_at
                    ? new Date(item.paid_at).toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '-'}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-neutral-700">
                  ${item.amount.toLocaleString('es-CL')}
                </p>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" />
                  Pagado
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
