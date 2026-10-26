import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { FinanzasAdminPanel, AdminDebtItem } from '@/components/FinanzasAdminPanel'
import { FinanzasMemberView, MemberDebtItem } from '@/components/FinanzasMemberView'
import { Wallet, ArrowLeft, ShieldCheck } from 'lucide-react'
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
    <div className="flex-1 flex flex-col p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-2.5 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div
              className="p-2.5 rounded-xl text-white shadow-xs"
              style={{ backgroundColor: 'var(--club-primary, #059669)' }}
            >
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-neutral-900 leading-tight">
                Finanzas: {club.name}
              </h1>
              <p className="text-xs text-neutral-500 font-medium">
                Control de aranceles y tesorería del club activo
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
        <div className="my-3 flex rounded-xl bg-neutral-200/70 p-1 text-xs font-bold min-h-[44px] items-center">
          <Link
            href="/finanzas?tab=socio"
            className={`flex-1 py-2 rounded-lg text-center transition min-h-[38px] flex items-center justify-center active:scale-95 ${
              activeView === 'socio'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Mi Cuenta
          </Link>
          <Link
            href="/finanzas?tab=admin"
            className={`flex-1 py-2 rounded-lg text-center transition min-h-[38px] flex items-center justify-center active:scale-95 ${
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
