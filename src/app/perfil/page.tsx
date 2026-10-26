import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ProfileForm } from '@/components/ProfileForm'
import { PwaPrompt } from '@/components/PwaPrompt'
import { Trophy, CalendarCheck, Award, ArrowLeft, Wallet } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/types/database.types'
import { getActiveClub } from '@/utils/club'

type Profile = Database['public']['Tables']['profiles']['Row']
type FieldDefinition = Database['public']['Tables']['profile_field_definitions']['Row']
type UserStats = Database['public']['Tables']['user_stats']['Row']

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get active club & check approval
  const { club, membership, isApproved } = await getActiveClub(supabase)

  if (!isApproved) {
    redirect('/')
  }

  // Fetch or upsert profile
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    const defaultProfile: Profile = {
      id: user.id,
      email: user.email ?? '',
      full_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Nuevo Socio',
      phone: null,
      avatar_url: (user.user_metadata?.avatar_url as string) || (user.user_metadata?.picture as string) || null,
      birth_date: null,
      gender: null,
      system_role: membership?.system_role || 'member',
      sports_role: membership?.sports_role || 'jugador',
      approval_status: membership?.approval_status || 'pendiente',
      motivation: membership?.motivation || null,
      custom_attributes: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await supabase.from('profiles').insert(defaultProfile)
    profile = defaultProfile
  }

  // Fetch field definitions for this club
  const { data: fieldDefs } = await supabase
    .from('profile_field_definitions')
    .select('*')
    .eq('club_id', club.id)
    .order('display_order', { ascending: true })

  const definitions: FieldDefinition[] = (fieldDefs && fieldDefs.length > 0) ? fieldDefs : [
    {
      id: '1',
      club_id: club.id,
      field_key: 'posicion',
      label: 'Posición(es) en la cancha',
      field_type: 'multiselect',
      options: ['Arquero', 'Defensor', 'Mediocampista', 'Delantero'],
      is_required: false,
      display_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      club_id: club.id,
      field_key: 'numero_camiseta',
      label: 'Número de camiseta preferido',
      field_type: 'number',
      options: [],
      is_required: false,
      display_order: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      club_id: club.id,
      field_key: 'pie_habil',
      label: 'Pie hábil',
      field_type: 'select',
      options: ['Derecho', 'Izquierdo', 'Ambidiestro'],
      is_required: false,
      display_order: 3,
      created_at: new Date().toISOString(),
    },
  ]

  // Fetch user stats for active club
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('club_id', club.id)
    .maybeSingle()

  const userStats: UserStats = stats || {
    id: '0',
    club_id: club.id,
    user_id: user.id,
    matches_played: 0,
    mvp_count: 0,
    mvp_votes_received: 0,
    social_events_attended: 0,
    mutable_stats: { matches_won: 0, matches_lost: 0, matches_tied: 0, goals: 0 },
    updated_at: new Date().toISOString(),
  }

  // Fetch pending debts count for active club
  const { count: pendingDebtsCount } = await supabase
    .from('member_debts')
    .select('id, events!inner(club_id)', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('events.club_id', club.id)
    .eq('status', 'pendiente')

  return (
    <div className="flex-1 flex flex-col p-5 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-extrabold text-xl text-neutral-900 leading-tight">
              Mi Perfil
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              Socio en {club.name}
            </p>
          </div>
        </div>

        {/* Financial shortcut badge */}
        <Link
          href="/finanzas"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 ${
            (pendingDebtsCount || 0) > 0
              ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs animate-pulse'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
          title="Ver estado de cuenta"
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>
            {(pendingDebtsCount || 0) > 0
              ? `${pendingDebtsCount} ${(pendingDebtsCount || 0) === 1 ? 'deuda' : 'deudas'}`
              : 'Al día'}
          </span>
        </Link>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5 my-4">
        <div className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 mb-1">
            <Trophy className="w-4 h-4" />
          </div>
          <span className="text-base font-extrabold text-neutral-900 leading-none">
            {userStats.mvp_count}
          </span>
          <span className="text-[10px] text-neutral-400 font-medium mt-1">
            MVPs Ganados
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 mb-1">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <span className="text-base font-extrabold text-neutral-900 leading-none">
            {userStats.matches_played}
          </span>
          <span className="text-[10px] text-neutral-400 font-medium mt-1">
            Partidos
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col items-center text-center">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 mb-1">
            <Award className="w-4 h-4" />
          </div>
          <span className="text-base font-extrabold text-neutral-900 leading-none">
            {userStats.mvp_votes_received}
          </span>
          <span className="text-[10px] text-neutral-400 font-medium mt-1">
            Votos MVP
          </span>
        </div>
      </div>

      {/* Main Profile Form */}
      <div className="flex-1 bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-xs">
        <ProfileForm profile={profile} fieldDefinitions={definitions} />
      </div>

      {/* PWA Push Notification & Installation Section */}
      <div className="mt-4">
        <PwaPrompt />
      </div>
    </div>
  )
}
