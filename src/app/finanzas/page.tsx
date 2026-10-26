import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { FinanzasMemberView, MemberDebtItem } from '@/components/FinanzasMemberView'
import { FinanzasAdminPanel, AdminDebtItem } from '@/components/FinanzasAdminPanel'
import { BankDetails } from '@/app/finanzas/actions'
import { Wallet, ShieldCheck, ArrowLeft } from 'lucide-react'

interface FinanzasPageProps {
  searchParams: Promise<{
    tab?: string
  }>
}

export default async function FinanzasPage({ searchParams }: FinanzasPageProps) {
  const { tab = 'socio' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/finanzas')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, system_role, approval_status')
    .eq('id', user.id)
    .single()

  if (profile?.approval_status !== 'aprobado') {
    redirect('/')
  }

  const isAdmin = profile?.system_role === 'admin'

  // Fetch user's debts
  const { data: myDebtsRaw } = await supabase
    .from('member_debts')
    .select(`
      id,
      event_id,
      user_id,
      guest_id,
      debt_type,
      description,
      amount,
      status,
      created_at,
      paid_at,
      events (
        id,
        title,
        start_time
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const myDebts = (myDebtsRaw || []) as unknown as MemberDebtItem[]

  // If admin, fetch all club debts and pending closure events
  let allDebts: AdminDebtItem[] = []
  let pendingClosureEvents: {
    id: string
    title: string
    start_time: string
    event_type: string
    total_cost: number | null
    cost_per_player: number
    confirmed_count: number
  }[] = []

  if (isAdmin) {
    const [allDebtsRes, pEventsRes] = await Promise.all([
      supabase
        .from('member_debts')
        .select(`
          id,
          event_id,
          user_id,
          guest_id,
          debt_type,
          description,
          amount,
          status,
          created_at,
          paid_at,
          events (
            title,
            start_time
          ),
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select(`
          id,
          title,
          start_time,
          event_type,
          total_cost,
          cost_per_player,
          event_attendees (
            id,
            status
          ),
          event_guests (
            id,
            status
          )
        `)
        .eq('status', 'finalizado')
        .eq('financial_closed', false)
        .order('start_time', { ascending: false }),
    ])

    if (allDebtsRes.error) {
      console.error('Error fetching admin debts:', allDebtsRes.error)
    }
    allDebts = (allDebtsRes.data || []) as unknown as AdminDebtItem[]

    if (pEventsRes.data) {
      pendingClosureEvents = pEventsRes.data.map((pe) => {
        const confAttendees = pe.event_attendees?.filter((a: { status: string }) => a.status === 'confirmado').length || 0
        const appGuests = pe.event_guests?.filter((g: { status: string }) => g.status === 'aprobado').length || 0
        return {
          id: pe.id,
          title: pe.title,
          start_time: pe.start_time,
          event_type: pe.event_type,
          total_cost: pe.total_cost,
          cost_per_player: pe.cost_per_player,
          confirmed_count: confAttendees + appGuests,
        }
      })
    }
  }

  // Fetch bank details from club_settings
  const { data: bankSettingsRaw } = await supabase
    .from('club_settings')
    .select('value')
    .eq('key', 'bank_details')
    .maybeSingle()

  const bankDetails = (bankSettingsRaw?.value as unknown as BankDetails) || {
    banco: 'Banco Santander',
    tipo_cuenta: 'Cuenta Corriente',
    numero_cuenta: '78-90123-4',
    titular: 'Club Deportivo',
    rut: '76.543.210-K',
    email: 'admin@clubdeportivo.com',
  }

  const activeView = isAdmin && tab === 'admin' ? 'admin' : 'socio'

  return (
    <div className="flex-1 flex flex-col p-5 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-neutral-900 leading-tight">
                Finanzas del Club
              </h1>
              <p className="text-xs text-neutral-500 font-medium">
                Control de aranceles y estado de cuenta
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-900 text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>Admin</span>
          </span>
        )}
      </div>

      {/* Admin / Socio Toggle Pills */}
      {isAdmin && (
        <div className="my-3 flex rounded-xl bg-neutral-200/70 p-1 text-xs font-bold">
          <Link
            href="/finanzas?tab=socio"
            className={`flex-1 py-1.5 rounded-lg text-center transition ${
              activeView === 'socio'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Mi Cuenta
          </Link>
          <Link
            href="/finanzas?tab=admin"
            className={`flex-1 py-1.5 rounded-lg text-center transition ${
              activeView === 'admin'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Tesorería Admin
          </Link>
        </div>
      )}

      {/* Main View */}
      <div className="mt-2 flex-1">
        {activeView === 'admin' ? (
          <FinanzasAdminPanel
            debts={allDebts}
            initialBankDetails={bankDetails}
            pendingClosureEvents={pendingClosureEvents}
          />
        ) : (
          <FinanzasMemberView
            debts={myDebts}
            userName={profile?.full_name || user.email || 'Socio'}
            bankDetails={bankDetails}
          />
        )}
      </div>
    </div>
  )
}
