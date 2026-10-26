import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { FinanzasMemberView, MemberDebtItem } from '@/components/FinanzasMemberView'
import { FinanzasAdminPanel, AdminDebtItem } from '@/components/FinanzasAdminPanel'
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
    .select('full_name, system_role')
    .eq('id', user.id)
    .single()

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

  // If admin, fetch all club debts
  let allDebts: AdminDebtItem[] = []
  if (isAdmin) {
    const { data: allDebtsRaw, error: allDebtsErr } = await supabase
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
      .order('created_at', { ascending: false })

    if (allDebtsErr) {
      console.error('Error fetching admin debts:', allDebtsErr)
    }

    allDebts = (allDebtsRaw || []) as unknown as AdminDebtItem[]
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
          <FinanzasAdminPanel debts={allDebts} />
        ) : (
          <FinanzasMemberView
            debts={myDebts}
            userName={profile?.full_name || user.email || 'Socio'}
          />
        )}
      </div>
    </div>
  )
}
