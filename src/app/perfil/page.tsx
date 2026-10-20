import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ProfileForm } from '@/components/ProfileForm'
import { PwaPrompt } from '@/components/PwaPrompt'
import { Trophy, CalendarCheck, Award, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type FieldDefinition = Database['public']['Tables']['profile_field_definitions']['Row']
type UserStats = Database['public']['Tables']['user_stats']['Row']

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch or upsert profile
  let { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // Fallback if trigger hasn't fired
    const defaultProfile: Profile = {
      id: user.id,
      email: user.email ?? '',
      full_name: (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email?.split('@')[0] || 'Nuevo Socio',
      phone: null,
      avatar_url: (user.user_metadata?.avatar_url as string) || (user.user_metadata?.picture as string) || null,
      birth_date: null,
      system_role: 'member',
      sports_role: 'jugador',
      custom_attributes: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await supabase.from('profiles').insert(defaultProfile)
    profile = defaultProfile
  }

  // Fetch field definitions
  const { data: fieldDefs } = await supabase
    .from('profile_field_definitions')
    .select('*')
    .order('display_order', { ascending: true })

  const definitions: FieldDefinition[] = fieldDefs || [
    {
      id: '1',
      field_key: 'posicion',
      label: 'Posición habitual',
      field_type: 'select',
      options: ['Arquero', 'Defensor', 'Mediocampista', 'Delantero'],
      is_required: false,
      display_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
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
      field_key: 'pie_habil',
      label: 'Pie hábil',
      field_type: 'select',
      options: ['Derecho', 'Izquierdo', 'Ambidiestro'],
      is_required: false,
      display_order: 3,
      created_at: new Date().toISOString(),
    },
  ]

  // Fetch user stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const userStats: UserStats = stats || {
    id: '0',
    user_id: user.id,
    matches_played: 0,
    mvp_count: 0,
    mvp_votes_received: 0,
    social_events_attended: 0,
    mutable_stats: { matches_won: 0, matches_lost: 0, matches_tied: 0, goals: 0 },
    updated_at: new Date().toISOString(),
  }

  return (
    <div className="flex-1 flex flex-col p-5 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-neutral-200">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-base text-neutral-900">Mi Perfil Deportivo</h1>
        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
          {profile.system_role === 'admin' ? 'Admin' : 'Socio'}
        </span>
      </div>

      {/* Quick Stats Pill */}
      <div className="grid grid-cols-3 gap-2.5 my-4">
        <div className="bg-white rounded-xl p-2.5 border border-neutral-200/80 shadow-sm text-center">
          <div className="flex items-center justify-center text-emerald-600 mb-1">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <span className="text-base font-extrabold text-neutral-900 leading-tight block">
            {userStats.matches_played}
          </span>
          <span className="text-[10px] text-neutral-500 font-medium">Partidos</span>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-neutral-200/80 shadow-sm text-center">
          <div className="flex items-center justify-center text-amber-500 mb-1">
            <Trophy className="w-4 h-4" />
          </div>
          <span className="text-base font-extrabold text-neutral-900 leading-tight block">
            {userStats.mvp_count}
          </span>
          <span className="text-[10px] text-neutral-500 font-medium">MVPs</span>
        </div>

        <div className="bg-white rounded-xl p-2.5 border border-neutral-200/80 shadow-sm text-center">
          <div className="flex items-center justify-center text-blue-500 mb-1">
            <Award className="w-4 h-4" />
          </div>
          <span className="text-base font-extrabold text-neutral-900 leading-tight block">
            {userStats.mvp_votes_received}
          </span>
          <span className="text-[10px] text-neutral-500 font-medium">Votos MVP</span>
        </div>
      </div>

      {/* Profile Form Card */}
      <div className="bg-white rounded-2xl p-5 border border-neutral-200/80 shadow-sm">
        <ProfileForm profile={profile} fieldDefinitions={definitions} />
      </div>

      {/* PWA & Push Notifications Manager */}
      <div className="mt-4">
        <PwaPrompt />
      </div>
    </div>
  )
}
