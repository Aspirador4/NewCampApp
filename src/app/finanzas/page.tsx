import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { FinanzasAdminPanel, AdminDebtItem } from '@/components/FinanzasAdminPanel'
import { FinanzasMemberView, MemberDebtItem } from '@/components/FinanzasMemberView'
import { Wallet, ArrowLeft } from 'lucide-react'
import { BankDetails } from './actions'
import { getActiveClub } from '@/utils/club'

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

  // Get active club & permissions
  const { club, isAdmin, isApproved } = await getActiveClub(supabase)

  if (!isApproved) {
    redirect('/')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Fetch user's debts for this club
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
      events!inner (
        id,
        club_id,
        title,
        start_time
      )
    `)
    .eq('user_id', user.id)
    .eq('events.club_id', club.id)
    .order('created_at', { ascending: false })

  const myDebts = (myDebtsRaw || []) as unknown as MemberDebtItem[]

  // If admin, fetch all club debts and pending closure events for this club
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
          events!inner (
            title,
            start_time,
            club_id
          ),
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('events.club_id', club.id)
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
          )
        `)
        .eq('club_id', club.id)
        .eq('status', 'finalizado')
        .eq('financial_closed', false)
        .order('start_time', { ascending: false }),
    ])

    allDebts = (allDebtsRes.data || []) as unknown as AdminDebtItem[]

    if (pEventsRes.data) {
      pendingClosureEvents = pEventsRes.data.map((ev) => {
        const confirmed = (ev.event_attendees || []).filter(
          (a: { status: string }) => a.status === 'confirmado'
        ).length
        return {
          id: ev.id,
          title: ev.title,
          start_time: ev.start_time,
          event_type: ev.event_type,
          total_cost: ev.total_cost,
          cost_per_player: ev.cost_per_player,
          confirmed_count: confirmed,
        }
      })
    }
  }

  // Fetch bank details from active club settings, fallback to club_settings
  let bankDetails: BankDetails = {
    banco: '',
    tipo_cuenta: '',
    numero_cuenta: '',
    titular: '',
    rut: '',
    email: '',
  }

  if (club.settings?.bank_details && typeof club.settings.bank_details === 'object') {
    bankDetails = {
      ...bankDetails,
      ...(club.settings.bank_details as Partial<BankDetails>),
    }
  } else {
    const { data: legacySettings } = await supabase
      .from('club_settings')
      .select('value')
      .eq('key', 'bank_details')
      .limit(1)
      .maybeSingle()

    if (legacySettings?.value && typeof legacySettings.value === 'object') {
      bankDetails = {
        ...bankDetails,
        ...(legacySettings.value as Partial<BankDetails>),
      }
    }
  }

  const activeView = isAdmin && tab === 'admin' ? 'admin' : 'socio'

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b-2 border-neutral-900/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 -ml-1 rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-2xl text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
              Tercer Tiempo & Finanzas
            </h1>
            <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
              {club.name} • Tesorería Oficial
            </p>
          </div>
        </div>

        <div className="w-10 h-10 rounded-xl bg-amber-400 text-neutral-950 flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm">
          <Wallet className="w-5 h-5 stroke-[2.5]" />
        </div>
      </div>

      {/* Admin / Socio Segmented Locker Tabs */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-2 my-3">
          <Link
            href="/finanzas?tab=socio"
            className={`btn-tactile py-2.5 px-3 rounded-xl text-center flex items-center justify-center font-display font-bold text-xs uppercase tracking-wider border-2 ${
              activeView === 'socio'
                ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
                : 'bg-white dark:bg-[#14161f] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 border-neutral-900 dark:border-neutral-700'
            }`}
          >
            Mi Cuenta (Socio)
          </Link>
          <Link
            href="/finanzas?tab=admin"
            className={`btn-tactile py-2.5 px-3 rounded-xl text-center flex items-center justify-center font-display font-bold text-xs uppercase tracking-wider border-2 ${
              activeView === 'admin'
                ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
                : 'bg-white dark:bg-[#14161f] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 border-neutral-900 dark:border-neutral-700'
            }`}
          >
            Tesorería General
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
            clubId={club.id}
            currentPalette={(club.settings as { palette?: string })?.palette || 'emerald'}
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
