import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ProfileForm } from '@/components/ProfileForm'
import { PwaPrompt } from '@/components/PwaPrompt'
import { ThemeToggle } from '@/components/ThemeToggle'
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

  // Fetch stats for active club
  const { data: statsData } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('club_id', club.id)
    .maybeSingle()

  const userStats: UserStats = statsData || {
    id: 'temp',
    user_id: user.id,
    club_id: club.id,
    matches_played: 0,
    mvp_count: 0,
    mvp_votes_received: 0,
    social_events_attended: 0,
    mutable_stats: {},
    updated_at: new Date().toISOString(),
  }

  // Fetch count of pending debts for financial badge
  const { count: pendingDebtsCount } = await supabase
    .from('member_debts')
    .select('id, events!inner(club_id)', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'pendiente')
    .eq('events.club_id', club.id)

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b-2 border-neutral-900/10 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 -ml-1 rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="font-display font-black text-2xl text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
              Ficha del Socio
            </h1>
            <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
              {club.name} • Perfil Oficial
            </p>
          </div>
        </div>

        {/* Financial shortcut badge */}
        <Link
          href="/finanzas"
          className={`btn-tactile min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition ${
            (pendingDebtsCount || 0) > 0
              ? 'bg-amber-400 text-neutral-950'
              : 'bg-emerald-400 text-neutral-950'
          }`}
          title="Ver estado de cuenta"
        >
          <Wallet className="w-4 h-4 stroke-[2.5]" />
          <span>
            {(pendingDebtsCount || 0) > 0
              ? `${pendingDebtsCount} ${(pendingDebtsCount || 0) === 1 ? 'deuda' : 'deudas'}`
              : 'Al día ✓'}
          </span>
        </Link>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5 my-4">
        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex flex-col items-center text-center">
          <div className="w-7 h-7 rounded-lg bg-amber-500 text-neutral-950 flex items-center justify-center mb-1">
            <Trophy className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-display font-black text-2xl text-neutral-950 dark:text-white leading-none">
            {userStats.mvp_count}
          </span>
          <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase font-bold mt-1">
            MVPs
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex flex-col items-center text-center">
          <div
            className="w-7 h-7 rounded-lg text-white flex items-center justify-center mb-1"
            style={{ backgroundColor: 'var(--club-primary, #059669)' }}
          >
            <CalendarCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-display font-black text-2xl text-neutral-950 dark:text-white leading-none">
            {userStats.matches_played}
          </span>
          <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase font-bold mt-1">
            Partidos
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex flex-col items-center text-center">
          <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center mb-1">
            <Award className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-display font-black text-2xl text-neutral-950 dark:text-white leading-none">
            {userStats.mvp_votes_received}
          </span>
          <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase font-bold mt-1">
            Votos
          </span>
        </div>
      </div>

      {/* Theme Appearance Mode Picker */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="font-display font-black text-sm uppercase tracking-wider text-neutral-950 dark:text-white">
              Tema y Apariencia
            </h3>
            <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Personaliza el contraste visual de la aplicación
            </p>
          </div>
        </div>
        <ThemeToggle variant="segmented" />
      </div>

      {/* Main Profile Form */}
      <div className="flex-1 bg-white dark:bg-neutral-900 rounded-3xl p-5 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile">
        <ProfileForm profile={profile} fieldDefinitions={definitions} />
      </div>

      {/* PWA Push Notification & Installation Section */}
      <div className="mt-4">
        <PwaPrompt />
      </div>
    </div>
  )
}
