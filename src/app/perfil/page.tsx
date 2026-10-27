import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { ProfileForm } from '@/components/ProfileForm'
import { PwaPrompt } from '@/components/PwaPrompt'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ProfileNotificationCard } from '@/components/ProfileNotificationCard'
import { Trophy, CalendarCheck, Award, ArrowLeft, Wallet, Shield, Settings2, Lock, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react'
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
    best_teammate_count: 0,
    surprise_player_count: 0,
    average_rating: null,
    last_match_rating: null,
    previous_average_rating: null,
    ratings_count: 0,
    match_history_ratings: [],
    goals: 0,
    assists: 0,
    saves: 0,
    matches_won: 0,
    matches_lost: 0,
    matches_tied: 0,
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

  const deltaRating = userStats.average_rating !== null && userStats.previous_average_rating !== null
    ? Number((userStats.average_rating - userStats.previous_average_rating).toFixed(1))
    : 0

  interface RatingHistoryEntry {
    event_id: string
    date: string
    rating: number
  }

  const matchHistory = (userStats.match_history_ratings as unknown as RatingHistoryEntry[]) || []

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
            <h1 className="font-display font-bold text-2xl text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
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
          className={`btn-tactile min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm transition ${
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
          <span className="font-display font-bold text-2xl text-neutral-950 dark:text-white leading-none">
            {userStats.mvp_count}
          </span>
          <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-semibold tracking-wider mt-1">
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
          <span className="font-display font-bold text-2xl text-neutral-950 dark:text-white leading-none">
            {userStats.matches_played}
          </span>
          <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-semibold tracking-wider mt-1">
            Partidos
          </span>
        </div>

        <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex flex-col items-center text-center">
          <div className="w-7 h-7 rounded-lg bg-blue-500 text-white flex items-center justify-center mb-1">
            <Award className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-display font-bold text-2xl text-neutral-950 dark:text-white leading-none">
            {userStats.mvp_votes_received}
          </span>
          <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-400 uppercase font-semibold tracking-wider mt-1">
            Votos
          </span>
        </div>
      </div>

      {/* Private Athletic Performance & Evaluation Console */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl p-4 sm:p-5 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile mb-4">
        <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-900/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500 text-white flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm">
              <Zap className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-neutral-950 dark:text-white uppercase tracking-tight">
                Rendimiento Deportivo
              </h2>
              <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                Métricas acotadas a {club.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700">
            <Lock className="w-3 h-3 stroke-[2.5]" />
            <span>CONFIDENCIAL</span>
          </div>
        </div>

        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-2.5 mb-3 leading-relaxed">
          Evaluaciones anónimas de tus compañeros de partido y estadísticas individuales. Solo visible para ti y la capitanía del club para calibrar el algoritmo de equipos.
        </p>

        {/* Grades & Evolution Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {/* Nota Promedio */}
          <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border-2 border-neutral-900/20 dark:border-white/10 flex flex-col items-center text-center">
            <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider">
              Nota Global
            </span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-display font-black text-2xl text-neutral-950 dark:text-white">
                {userStats.average_rating !== null ? Number(userStats.average_rating).toFixed(1) : '—'}
              </span>
              <span className="font-mono text-xs text-neutral-400">/10</span>
            </div>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
              {userStats.ratings_count} {userStats.ratings_count === 1 ? 'evaluación' : 'evaluaciones'}
            </span>
          </div>

          {/* Última Nota */}
          <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border-2 border-neutral-900/20 dark:border-white/10 flex flex-col items-center text-center">
            <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider">
              Última Nota
            </span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-display font-black text-2xl text-neutral-950 dark:text-white">
                {userStats.last_match_rating !== null ? Number(userStats.last_match_rating).toFixed(1) : '—'}
              </span>
              <span className="font-mono text-xs text-neutral-400">/10</span>
            </div>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
              Último partido
            </span>
          </div>

          {/* Tendencia / Evolución */}
          <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border-2 border-neutral-900/20 dark:border-white/10 flex flex-col items-center text-center">
            <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider">
              Evolución
            </span>
            <div className="flex items-center gap-1 my-1">
              {deltaRating > 0 ? (
                <>
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                  <span className="font-display font-black text-2xl text-emerald-600 dark:text-emerald-400">
                    +{deltaRating}
                  </span>
                </>
              ) : deltaRating < 0 ? (
                <>
                  <TrendingDown className="w-5 h-5 text-rose-600 dark:text-rose-400 stroke-[3]" />
                  <span className="font-display font-black text-2xl text-rose-600 dark:text-rose-400">
                    {deltaRating}
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-5 h-5 text-neutral-400 stroke-[2.5]" />
                  <span className="font-display font-black text-2xl text-neutral-500 dark:text-neutral-400">
                    0.0
                  </span>
                </>
              )}
            </div>
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-mono">
              vs promedio ant.
            </span>
          </div>
        </div>

        {/* Historial de Notas Recientes */}
        {matchHistory.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase font-bold tracking-wider">
                Rendimiento por Partido Reciente
              </span>
              <span className="font-mono text-[10px] text-neutral-400">
                Últimos {matchHistory.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {matchHistory.slice(-8).map((h, i) => (
                <div
                  key={`${h.event_id}-${i}`}
                  className="flex-shrink-0 px-2.5 py-1 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 flex flex-col items-center"
                >
                  <span className="font-display font-bold text-xs text-neutral-900 dark:text-white">
                    {Number(h.rating).toFixed(1)}
                  </span>
                  <span className="font-mono text-[8px] text-neutral-400 uppercase">
                    {h.date ? new Date(h.date).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : `P${i + 1}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extended Stats: Record & Match Metrics */}
        {(() => {
          const concededGoals = Number((userStats.mutable_stats as Record<string, unknown> | null)?.goals_conceded || 0)
          const posVal = profile?.custom_attributes?.posicion
          const isGoalkeeper = Array.isArray(posVal)
            ? posVal.some((p) => String(p).toLowerCase().includes('arquero') || String(p).toLowerCase().includes('portero'))
            : typeof posVal === 'string'
              ? posVal.toLowerCase().includes('arquero') || posVal.toLowerCase().includes('portero')
              : concededGoals > 0

          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-center">
                <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase font-bold block">
                  Récord (V-E-D)
                </span>
                <span className="font-display font-bold text-sm text-neutral-950 dark:text-white mt-0.5 block">
                  {userStats.matches_won}V - {userStats.matches_tied}E - {userStats.matches_lost}D
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-center">
                <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase font-bold block">
                  Partidos
                </span>
                <span className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100 mt-0.5 block">
                  🏟️ {userStats.matches_played} PJ
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-center">
                <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase font-bold block">
                  Goles Marcados
                </span>
                <span className="font-display font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  ⚽ {userStats.goals}
                </span>
              </div>
              {isGoalkeeper ? (
                <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-center">
                  <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase font-bold block">
                    Goles Recibidos
                  </span>
                  <span className="font-display font-bold text-sm text-amber-600 dark:text-amber-400 mt-0.5 block">
                    🧤 {concededGoals}
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-center">
                  <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase font-bold block">
                    Promedio Goles
                  </span>
                  <span className="font-display font-bold text-sm text-blue-600 dark:text-blue-400 mt-0.5 block">
                    ⚡ {userStats.matches_played > 0 ? (userStats.goals / userStats.matches_played).toFixed(2) : '0.00'} / PJ
                  </span>
                </div>
              )}
            </div>
          )
        })()}

        {/* Accolades & Distinctions Showcase */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
            <span className="font-mono text-[9px] text-amber-700 dark:text-amber-400 uppercase font-bold block">
              🏆 MVP
            </span>
            <span className="font-display font-black text-sm text-amber-800 dark:text-amber-300">
              {userStats.mvp_count} veces
            </span>
          </div>
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
            <span className="font-mono text-[9px] text-blue-700 dark:text-blue-400 uppercase font-bold block">
              🤝 Compañero
            </span>
            <span className="font-display font-black text-sm text-blue-800 dark:text-blue-300">
              {userStats.best_teammate_count} veces
            </span>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center">
            <span className="font-mono text-[9px] text-purple-700 dark:text-purple-400 uppercase font-bold block">
              ⚡ Sorpresa
            </span>
            <span className="font-display font-black text-sm text-purple-800 dark:text-purple-300">
              {userStats.surprise_player_count} veces
            </span>
          </div>
        </div>
      </div>

      {/* Club Admin Management Card */}
      {membership?.system_role === 'admin' && (
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-neutral-950 flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex-shrink-0">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-sm uppercase tracking-wider text-neutral-950 dark:text-white truncate">
                Administración de {club.name}
              </h3>
              <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                Editar nombre, escudo y colores institucionales
              </p>
            </div>
          </div>
          <Link
            href="/club/editar"
            className="btn-tactile py-2 px-3 rounded-xl bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-display font-bold text-xs uppercase tracking-wider border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center gap-1.5 flex-shrink-0 transition active:scale-95"
          >
            <Settings2 className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Editar</span>
          </Link>
        </div>
      )}

      {/* Theme Appearance Mode Picker */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-neutral-950 dark:text-white">
              Tema y Apariencia
            </h3>
            <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              Personaliza el contraste visual de la aplicación
            </p>
          </div>
        </div>
        <ThemeToggle variant="segmented" />
      </div>

      {/* Notification Management Card */}
      <ProfileNotificationCard clubId={club.id} isAdmin={membership?.system_role === 'admin'} />

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
