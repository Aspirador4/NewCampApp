import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import { Trophy, CalendarCheck, User, Flame, ArrowLeft, HeartHandshake } from 'lucide-react'
import { Json } from '@/types/database.types'
import { getActiveClub } from '@/utils/club'

interface RankingPageProps {
  searchParams: Promise<{
    tab?: string
  }>
}

interface UserStatItem {
  id: string
  user_id: string
  matches_played: number
  mvp_count: number
  mvp_votes_received: number
  social_events_attended: number
  goals: number | null
  assists: number | null
  saves: number | null
  matches_won: number | null
  matches_lost: number | null
  matches_tied: number | null
  best_teammate_count: number | null
  surprise_player_count: number | null
  average_rating: number | null
  mutable_stats: Record<string, Json>
  profiles: {
    id: string
    full_name: string
    avatar_url: string | null
    sports_role: string
    custom_attributes: Record<string, Json>
  } | null
}

export default async function RankingPage({ searchParams }: RankingPageProps) {
  const { tab = 'mvps' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/ranking')
  }

  // Get active club & permissions
  const { club, isApproved } = await getActiveClub(supabase)

  if (!isApproved) {
    redirect('/')
  }

  // Fetch all user stats with profiles for the active club
  const { data: statsRaw } = await supabase
    .from('user_stats')
    .select(`
      id,
      club_id,
      user_id,
      matches_played,
      mvp_count,
      mvp_votes_received,
      social_events_attended,
      goals,
      assists,
      saves,
      matches_won,
      matches_lost,
      matches_tied,
      best_teammate_count,
      surprise_player_count,
      average_rating,
      mutable_stats,
      profiles (
        id,
        full_name,
        avatar_url,
        sports_role,
        custom_attributes
      )
    `)
    .eq('club_id', club.id)

  const allStats = (statsRaw || []) as unknown as UserStatItem[]

  // Filter out profiles with no name or deleted
  const validStats = allStats.filter((s) => s.profiles?.full_name)

  // Sort based on active tab
  let sortedStats: UserStatItem[] = []
  if (tab === 'presencias') {
    sortedStats = [...validStats].sort((a, b) => {
      if (b.matches_played !== a.matches_played) {
        return b.matches_played - a.matches_played
      }
      return (b.matches_won || 0) - (a.matches_won || 0)
    })
  } else if (tab === 'goleadores') {
    sortedStats = [...validStats].sort((a, b) => {
      const gB = b.goals || 0
      const gA = a.goals || 0
      if (gB !== gA) return gB - gA
      return (b.assists || 0) - (a.assists || 0)
    })
  } else if (tab === 'asistencias') {
    sortedStats = [...validStats].sort((a, b) => {
      const aB = b.assists || 0
      const aA = a.assists || 0
      if (aB !== aA) return aB - aA
      return (b.goals || 0) - (a.goals || 0)
    })
  } else if (tab === 'premios') {
    sortedStats = [...validStats].sort((a, b) => {
      const scoreB = (b.best_teammate_count || 0) + (b.surprise_player_count || 0) + (b.mvp_count || 0)
      const scoreA = (a.best_teammate_count || 0) + (a.surprise_player_count || 0) + (a.mvp_count || 0)
      if (scoreB !== scoreA) return scoreB - scoreA
      return (b.best_teammate_count || 0) - (a.best_teammate_count || 0)
    })
  } else {
    // Default: MVPs
    sortedStats = [...validStats].sort((a, b) => {
      if (b.mvp_count !== a.mvp_count) {
        return b.mvp_count - a.mvp_count
      }
      if (b.mvp_votes_received !== a.mvp_votes_received) {
        return b.mvp_votes_received - a.mvp_votes_received
      }
      return b.matches_played - a.matches_played
    })
  }

  // Top 3 for podium
  const top1 = sortedStats[0] || null
  const top2 = sortedStats[1] || null
  const top3 = sortedStats[2] || null

  // Club summary aggregates
  const totalMvpsAwarded = allStats.reduce((acc, curr) => acc + (curr.mvp_count || 0), 0)
  const totalGoals = allStats.reduce((acc, curr) => acc + (curr.goals || 0), 0)
  const totalAssists = allStats.reduce((acc, curr) => acc + (curr.assists || 0), 0)

  const getMetricDisplay = (item: UserStatItem) => {
    switch (tab) {
      case 'goleadores':
        return {
          main: `${item.goals || 0} ⚽`,
          sub: `${item.assists || 0} asistencias • ${item.matches_played} PJ`,
          podium: `${item.goals || 0} Goles`,
        }
      case 'asistencias':
        return {
          main: `${item.assists || 0} 👟`,
          sub: `${item.goals || 0} goles • ${item.matches_played} PJ`,
          podium: `${item.assists || 0} Asist.`,
        }
      case 'premios':
        return {
          main: `${(item.best_teammate_count || 0) + (item.surprise_player_count || 0)} 🎖️`,
          sub: `🤝 ${item.best_teammate_count || 0} comp. • ⚡ ${item.surprise_player_count || 0} sorp.`,
          podium: `${(item.best_teammate_count || 0) + (item.surprise_player_count || 0)} Premios`,
        }
      case 'presencias':
        return {
          main: `${item.matches_played} PJ`,
          sub: `${item.matches_won || 0}V - ${item.matches_tied || 0}E - ${item.matches_lost || 0}D`,
          podium: `${item.matches_played} PJ`,
        }
      default:
        return {
          main: `${item.mvp_count} 🏆`,
          sub: `${item.mvp_votes_received} votos • ${item.matches_played} PJ`,
          podium: `${item.mvp_count} MVPs`,
        }
    }
  }

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Header */}
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
              Estadísticas & Salón
            </h1>
            <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
              {club.name} • Salón de la Fama
            </p>
          </div>
        </div>

        <div className="w-10 h-10 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm">
          <Trophy className="w-5 h-5 stroke-[2.5]" />
        </div>
      </div>

      {/* Segmented Category Filter (Horizontal Scrollable Tabs) */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2 my-2 no-scrollbar">
        <Link
          href="/ranking?tab=mvps"
          className={`btn-tactile flex-shrink-0 py-2 px-3 rounded-xl text-center flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 ${
            tab === 'mvps'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
              : 'bg-white dark:bg-[#14161f] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 border-neutral-900 dark:border-neutral-700'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Ranking MVP</span>
        </Link>

        <Link
          href="/ranking?tab=goleadores"
          className={`btn-tactile flex-shrink-0 py-2 px-3 rounded-xl text-center flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 ${
            tab === 'goleadores'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
              : 'bg-white dark:bg-[#14161f] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 border-neutral-900 dark:border-neutral-700'
          }`}
        >
          <span>⚽ Goleadores</span>
        </Link>

        <Link
          href="/ranking?tab=asistencias"
          className={`btn-tactile flex-shrink-0 py-2 px-3 rounded-xl text-center flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 ${
            tab === 'asistencias'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
              : 'bg-white dark:bg-[#14161f] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 border-neutral-900 dark:border-neutral-700'
          }`}
        >
          <span>👟 Asistencias</span>
        </Link>

        <Link
          href="/ranking?tab=premios"
          className={`btn-tactile flex-shrink-0 py-2 px-3 rounded-xl text-center flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 ${
            tab === 'premios'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
              : 'bg-white dark:bg-[#14161f] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 border-neutral-900 dark:border-neutral-700'
          }`}
        >
          <HeartHandshake className="w-3.5 h-3.5 text-blue-500" />
          <span>Compañerismo</span>
        </Link>

        <Link
          href="/ranking?tab=presencias"
          className={`btn-tactile flex-shrink-0 py-2 px-3 rounded-xl text-center flex items-center gap-1.5 font-display font-bold text-xs uppercase tracking-wider border-2 ${
            tab === 'presencias'
              ? 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-tactile-sm'
              : 'bg-white dark:bg-[#14161f] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 border-neutral-900 dark:border-neutral-700'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Presencias</span>
        </Link>
      </div>

      {/* Mobile Podium Top 3 (Athletic Trading Cards) */}
      {sortedStats.length > 0 && (
        <div className="my-2 bg-neutral-950 text-white rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 p-5 shadow-tactile relative overflow-hidden">
          <div className="absolute inset-0 bg-mesh-pattern-white opacity-10 pointer-events-none" />

          <div className="relative flex items-center justify-between font-mono text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">
            <span>PODIO OFICIAL</span>
            <span>
              {tab === 'mvps'
                ? 'GALARDONES MVP'
                : tab === 'goleadores'
                ? 'PICHICHI DE ORO'
                : tab === 'asistencias'
                ? 'MÁXIMOS ASISTIDORES'
                : tab === 'premios'
                ? 'DISTINCIONES DEL CLUB'
                : 'PARTIDOS JUGADOS'}
            </span>
          </div>

          <div className="relative grid grid-cols-3 gap-2 items-end pt-3 pb-1">
            {/* Top 2 (Silver) */}
            <div className="flex flex-col items-center text-center">
              {top2 ? (
                <>
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-neutral-300 relative flex items-center justify-center shadow-tactile-sm">
                    {top2.profiles?.avatar_url ? (
                      <Image
                        src={top2.profiles.avatar_url}
                        alt={top2.profiles.full_name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <User className="w-7 h-7 text-neutral-400" />
                    )}
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-neutral-300 text-neutral-950 font-mono font-bold text-[10px] flex items-center justify-center border border-neutral-900 shadow-sm">
                      2
                    </span>
                  </div>
                  <p className="font-display font-bold text-xs uppercase mt-2 text-neutral-200 truncate w-full">
                    {top2.profiles?.full_name?.split(' ')[0]}
                  </p>
                  <span className="font-mono text-sm font-bold text-neutral-300 mt-0.5">
                    {getMetricDisplay(top2).podium}
                  </span>
                </>
              ) : (
                <div className="h-20" />
              )}
            </div>

            {/* Top 1 (Gold) */}
            <div className="flex flex-col items-center text-center -translate-y-3">
              {top1 ? (
                <>
                  <div className="w-18 h-18 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-amber-400 relative flex items-center justify-center shadow-tactile ring-4 ring-amber-400/20">
                    {top1.profiles?.avatar_url ? (
                      <Image
                        src={top1.profiles.avatar_url}
                        alt={top1.profiles.full_name}
                        fill
                        className="object-cover"
                        sizes="72px"
                      />
                    ) : (
                      <User className="w-9 h-9 text-amber-400" />
                    )}
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-md bg-amber-400 text-amber-950 font-mono font-bold text-xs flex items-center justify-center border-2 border-neutral-900 shadow-tactile-sm">
                      1
                    </span>
                  </div>
                  <p className="font-display font-bold text-sm uppercase mt-2 text-amber-300 truncate w-full">
                    {top1.profiles?.full_name?.split(' ')[0]}
                  </p>
                  <span className="font-display font-bold text-2xl text-white mt-0.5 flex items-center gap-1 leading-none">
                    <Flame className="w-4 h-4 text-amber-400 fill-current" />
                    {getMetricDisplay(top1).podium}
                  </span>
                </>
              ) : (
                <div className="h-24" />
              )}
            </div>

            {/* Top 3 (Bronze) */}
            <div className="flex flex-col items-center text-center">
              {top3 ? (
                <>
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-amber-700 relative flex items-center justify-center shadow-tactile-sm">
                    {top3.profiles?.avatar_url ? (
                      <Image
                        src={top3.profiles.avatar_url}
                        alt={top3.profiles.full_name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <User className="w-7 h-7 text-neutral-400" />
                    )}
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-amber-700 text-white font-mono font-bold text-[10px] flex items-center justify-center border border-neutral-900 shadow-sm">
                      3
                    </span>
                  </div>
                  <p className="font-display font-bold text-xs uppercase mt-2 text-neutral-200 truncate w-full">
                    {top3.profiles?.full_name?.split(' ')[0]}
                  </p>
                  <span className="font-mono text-sm font-bold text-amber-500 mt-0.5">
                    {getMetricDisplay(top3).podium}
                  </span>
                </>
              ) : (
                <div className="h-20" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rest of Leaderboard Table */}
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display font-bold text-sm text-neutral-950 dark:text-white uppercase tracking-wider">
            Tabla General de Posiciones
          </h2>
          <span className="font-mono text-[10px] text-neutral-400 uppercase">
            {sortedStats.length} Jugadores
          </span>
        </div>

        {sortedStats.length === 0 ? (
          <div className="bg-white dark:bg-[#14161f] rounded-3xl p-8 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile text-center">
            <Trophy className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
            <p className="font-display font-bold text-base uppercase text-neutral-950 dark:text-white">
              Sin estadísticas registradas aún
            </p>
            <p className="font-sans text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Las estadísticas se actualizarán automáticamente al finalizar los partidos, registrar actas y computar las votaciones.
            </p>
          </div>
        ) : (
          <div className="divide-y-2 divide-neutral-100 dark:divide-white/5 bg-white dark:bg-[#14161f] rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile overflow-hidden">
            {sortedStats.map((item, idx) => {
              const p = item.profiles
              const isCurrentUser = item.user_id === user.id
              const custom = p?.custom_attributes || {}
              const metric = getMetricDisplay(item)

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 transition ${
                    isCurrentUser ? 'bg-amber-50/80 dark:bg-amber-950/40' : 'hover:bg-neutral-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-mono font-bold text-xs w-6 text-center flex-shrink-0 ${
                        idx === 0
                          ? 'text-amber-500 text-sm'
                          : idx === 1
                          ? 'text-neutral-500 dark:text-neutral-400'
                          : idx === 2
                          ? 'text-amber-700 dark:text-amber-500'
                          : 'text-neutral-400 dark:text-neutral-500'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 relative flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex-shrink-0">
                      {p?.avatar_url ? (
                        <Image
                          src={p.avatar_url}
                          alt={p.full_name || 'Jugador'}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <span className="font-display font-bold text-sm text-neutral-700 dark:text-neutral-300">
                          {p?.full_name?.charAt(0).toUpperCase() || 'J'}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-display font-bold text-sm uppercase text-neutral-950 dark:text-white truncate leading-tight">
                          {p?.full_name || 'Socio'}
                        </p>
                        {isCurrentUser && (
                          <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-neutral-950 dark:bg-white text-amber-400 dark:text-amber-600">
                            Tú
                          </span>
                        )}
                      </div>

                      <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase truncate">
                        {Array.isArray(custom.posicion)
                          ? (custom.posicion as string[]).join(', ')
                          : String(custom.posicion || p?.sports_role || 'Jugador')}
                        {custom.numero_camiseta ? ` • #${String(custom.numero_camiseta)}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Main Metric */}
                  <div className="text-right flex-shrink-0 pl-2">
                    <span className="font-display font-bold text-xl text-neutral-950 dark:text-white block leading-tight">
                      {metric.main}
                    </span>
                    <span className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400 uppercase block">
                      {metric.sub}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Global Club Counter */}
      <div className="mt-5 bg-white dark:bg-[#14161f] rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile p-4 grid grid-cols-4 gap-1 text-center">
        <div>
          <span className="font-display font-bold text-xl sm:text-2xl text-neutral-950 dark:text-white block leading-tight">
            {totalGoals}
          </span>
          <span className="font-mono text-[9px] uppercase text-neutral-500 dark:text-neutral-400 font-bold">
            Goles
          </span>
        </div>

        <div className="border-l-2 border-neutral-200 dark:border-neutral-800">
          <span className="font-display font-bold text-xl sm:text-2xl text-neutral-950 dark:text-white block leading-tight">
            {totalAssists}
          </span>
          <span className="font-mono text-[9px] uppercase text-neutral-500 dark:text-neutral-400 font-bold">
            Asistencias
          </span>
        </div>

        <div className="border-l-2 border-neutral-200 dark:border-neutral-800">
          <span className="font-display font-bold text-xl sm:text-2xl text-neutral-950 dark:text-white block leading-tight">
            {totalMvpsAwarded}
          </span>
          <span className="font-mono text-[9px] uppercase text-neutral-500 dark:text-neutral-400 font-bold">
            MVPs
          </span>
        </div>

        <div className="border-l-2 border-neutral-200 dark:border-neutral-800">
          <span className="font-display font-bold text-xl sm:text-2xl text-neutral-950 dark:text-white block leading-tight">
            {validStats.length}
          </span>
          <span className="font-mono text-[9px] uppercase text-neutral-500 dark:text-neutral-400 font-bold">
            Jugadores
          </span>
        </div>
      </div>
    </div>
  )
}
