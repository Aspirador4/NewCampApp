import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/server'
import { Trophy, CalendarCheck, User, Flame, ArrowLeft } from 'lucide-react'
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
      return b.mvp_count - a.mvp_count
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

  return (
    <div className="flex-1 flex flex-col p-5 pb-nav">
      {/* Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2.5 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-extrabold text-xl text-neutral-900 leading-tight">
              Ranking: {club.name}
            </h1>
            <p className="text-xs text-neutral-500 font-medium">
              Estadísticas oficiales del club activo
            </p>
          </div>
        </div>

        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
          <Trophy className="w-5 h-5" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-neutral-100 p-1 rounded-xl my-4 text-xs font-semibold">
        <Link
          href="/ranking?tab=mvps"
          className={`flex-1 py-2 rounded-lg text-center transition flex items-center justify-center gap-1.5 ${
            tab === 'mvps'
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Ranking MVP</span>
        </Link>

        <Link
          href="/ranking?tab=presencias"
          className={`flex-1 py-2 rounded-lg text-center transition flex items-center justify-center gap-1.5 ${
            tab === 'presencias'
              ? 'bg-white text-neutral-900 shadow-xs font-bold'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Más Presencias</span>
        </Link>
      </div>

      {/* Mobile Podium Top 3 */}
      {sortedStats.length > 0 && (
        <div className="my-2 bg-gradient-to-b from-neutral-900 to-neutral-950 text-white rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Trophy className="w-32 h-32" />
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2">
            <span>Podio del Club</span>
            <span>{tab === 'mvps' ? 'Galardones MVP' : 'Partidos Jugados'}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 items-end pt-2 pb-1">
            {/* Top 2 (Silver) */}
            <div className="flex flex-col items-center text-center">
              {top2 ? (
                <>
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-800 border-2 border-neutral-300 relative flex items-center justify-center shadow-md">
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
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-neutral-300 text-neutral-900 font-extrabold text-[10px] flex items-center justify-center border border-neutral-800">
                      2
                    </span>
                  </div>
                  <p className="font-bold text-xs mt-2 text-neutral-100 truncate w-full">
                    {top2.profiles?.full_name?.split(' ')[0]}
                  </p>
                  <span className="text-sm font-extrabold text-neutral-300 mt-0.5">
                    {tab === 'mvps' ? top2.mvp_count : top2.matches_played}
                  </span>
                </>
              ) : (
                <div className="h-20" />
              )}
            </div>

            {/* Top 1 (Gold) */}
            <div className="flex flex-col items-center text-center -translate-y-2">
              {top1 ? (
                <>
                  <div className="w-18 h-18 rounded-full overflow-hidden bg-neutral-800 border-2 border-amber-400 relative flex items-center justify-center shadow-xl ring-4 ring-amber-400/20">
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
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center border border-neutral-900 shadow-sm">
                      1
                    </span>
                  </div>
                  <p className="font-extrabold text-sm mt-2 text-amber-300 truncate w-full drop-shadow-xs">
                    {top1.profiles?.full_name?.split(' ')[0]}
                  </p>
                  <span className="text-lg font-black text-white mt-0.5 flex items-center gap-1">
                    <Flame className="w-4 h-4 text-amber-400" />
                    {tab === 'mvps' ? top1.mvp_count : top1.matches_played}
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
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-800 border-2 border-amber-700 relative flex items-center justify-center shadow-md">
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
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 text-white font-extrabold text-[10px] flex items-center justify-center border border-neutral-800">
                      3
                    </span>
                  </div>
                  <p className="font-bold text-xs mt-2 text-neutral-100 truncate w-full">
                    {top3.profiles?.full_name?.split(' ')[0]}
                  </p>
                  <span className="text-sm font-extrabold text-amber-600 mt-0.5">
                    {tab === 'mvps' ? top3.mvp_count : top3.matches_played}
                  </span>
                </>
              ) : (
                <div className="h-20" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rest of Leaderboard */}
      <div className="mt-4 space-y-2.5">
        <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
          Tabla General
        </h2>

        {sortedStats.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-neutral-200/80 shadow-sm text-center">
            <Trophy className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-neutral-800">
              Sin estadísticas registradas aún
            </p>
            <p className="text-[11px] text-neutral-500 mt-1">
              Las estadísticas se computarán automáticamente al finalizar cada partido y cerrar la votación de MVP.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
            {sortedStats.map((item, idx) => {
              const p = item.profiles
              const isCurrentUser = item.user_id === user.id
              const custom = p?.custom_attributes || {}

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 transition ${
                    isCurrentUser ? 'bg-amber-50/70 font-semibold' : 'hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-extrabold w-5 text-center ${
                        idx === 0
                          ? 'text-amber-500 text-sm'
                          : idx === 1
                          ? 'text-neutral-400'
                          : idx === 2
                          ? 'text-amber-700'
                          : 'text-neutral-400'
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    <div className="w-9 h-9 rounded-full overflow-hidden bg-neutral-200 relative flex items-center justify-center border border-neutral-200">
                      {p?.avatar_url ? (
                        <Image
                          src={p.avatar_url}
                          alt={p.full_name || 'Jugador'}
                          fill
                          className="object-cover"
                          sizes="36px"
                        />
                      ) : (
                        <User className="w-5 h-5 text-neutral-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-neutral-900">
                          {p?.full_name || 'Socio'}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-500 text-white">
                            Tú
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-neutral-500 capitalize">
                        {Array.isArray(custom.posicion)
                          ? (custom.posicion as string[]).join(', ')
                          : String(custom.posicion || p?.sports_role || 'Jugador')}
                        {custom.numero_camiseta ? ` • #${String(custom.numero_camiseta)}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Main Metric */}
                  <div className="text-right">
                    <span className="text-sm font-black text-neutral-900 font-mono">
                      {tab === 'mvps' ? item.mvp_count : item.matches_played}
                    </span>
                    <span className="text-[10px] text-neutral-500 block">
                      {tab === 'mvps'
                        ? `${item.mvp_votes_received} votos • ${item.matches_played} PJ`
                        : `${item.mvp_count} MVPs`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Global Club Counter */}
      <div className="mt-6 bg-neutral-100 rounded-2xl p-4 border border-neutral-200 grid grid-cols-2 gap-3 text-center">
        <div>
          <span className="text-base font-extrabold text-neutral-900 font-mono block">
            {totalMvpsAwarded}
          </span>
          <span className="text-[11px] text-neutral-500 font-medium">
            Premios MVP Otorgados
          </span>
        </div>

        <div>
          <span className="text-base font-extrabold text-neutral-900 font-mono block">
            {validStats.length}
          </span>
          <span className="text-[11px] text-neutral-500 font-medium">
            Jugadores en el Ranking
          </span>
        </div>
      </div>
    </div>
  )
}
