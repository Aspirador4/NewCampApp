'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import {
  User,
  Users,
  Edit3,
  Trophy,
  Clock,
  Radio,
  Sparkles,
} from 'lucide-react'
import { TeamBuilderModal, TeamCandidatePlayer } from '@/components/TeamBuilderModal'
import { MatchResultModal } from '@/components/MatchResultModal'
import { LiveMatchTrackerModal, LiveMatchTeam } from '@/components/LiveMatchTrackerModal'
import { MatchGraphicModal } from '@/components/MatchGraphicModal'
import { createClient } from '@/utils/supabase/client'

export interface TeamPlayerView {
  userId: string
  fullName: string
  avatarUrl: string | null
  position: string
  goals?: number
  assists?: number
  saves?: number
  ownGoals?: number
}

export interface TeamView {
  id: string
  name: string
  color: string
  score: number | null
  players: TeamPlayerView[]
}

interface MatchTeamsViewProps {
  eventId: string
  teams: TeamView[]
  isPublished: boolean
  canManage: boolean
  candidates: TeamCandidatePlayer[]
  eventStatus?: string
  resultRecorded?: boolean
  eventTitle?: string
  eventDate?: string
  eventLocation?: string
  clubName?: string
  clubLogo?: string | null
  clubPrimaryColor?: string
}

export function MatchTeamsView({
  eventId,
  teams,
  isPublished,
  canManage,
  candidates,
  eventStatus = 'convocado',
  resultRecorded = false,
  eventTitle = 'Partido Oficial',
  eventDate,
  eventLocation,
  clubName = "CAMPANARIO'S OLD BOYS",
  clubLogo,
  clubPrimaryColor = '#059669',
}: MatchTeamsViewProps) {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [isResultOpen, setIsResultOpen] = useState(false)
  const [isTrackerOpen, setIsTrackerOpen] = useState(false)
  const [isGraphicOpen, setIsGraphicOpen] = useState(false)

  // Real-time optimistic score state
  const [liveScores, setLiveScores] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    teams?.forEach((t) => {
      map[t.id] = t.score ?? 0
    })
    return map
  })

  // Sync state if teams prop updates from server
  useEffect(() => {
    const map: Record<string, number> = {}
    teams?.forEach((t) => {
      map[t.id] = t.score ?? 0
    })
    setLiveScores(map)
  }, [teams])

  // Listen for broadcast score updates in real-time
  const supabase = useMemo(() => createClient(), [])
  useEffect(() => {
    const channel = supabase
      .channel(`match-broadcast-${eventId}`)
      .on(
        'broadcast',
        { event: 'score-update' },
        (payload: { payload?: { scores?: Record<string, number> } }) => {
          if (payload?.payload?.scores) {
            setLiveScores((prev) => ({
              ...prev,
              ...payload.payload?.scores,
            }))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, supabase])

  if (!teams || teams.length === 0) {
    if (!canManage) return null

    return (
      <div className="bg-neutral-900 text-white rounded-3xl p-5 border-2 border-neutral-800 shadow-tactile text-center space-y-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-base uppercase text-white tracking-tight">
            Equipos del Partido
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto font-sans">
            El quórum está listo. Como administrador, puedes armar las escuadras y balancearlas de forma automática.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsBuilderOpen(true)}
          className="btn-tactile py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm inline-flex items-center gap-1.5"
        >
          <span>Armar Equipos (Team Builder)</span>
        </button>

        <TeamBuilderModal
          eventId={eventId}
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          candidates={candidates}
          isPublished={isPublished}
        />
      </div>
    )
  }

  // If teams exist but not published yet and match is not live/completed and user is not admin, hide
  const isMatchLiveOrFinal =
    eventStatus === 'en_curso' ||
    eventStatus === 'finalizado' ||
    resultRecorded ||
    (teams[0]?.score !== null && teams[0]?.score !== undefined)
  if (!isPublished && !canManage && !isMatchLiveOrFinal) return null

  const team1 = teams[0]
  const team2 = teams[1]

  const initialTeamsPayload = teams.map((t) => ({
    name: t.name,
    color: t.color,
    players: t.players.map((p) => ({ userId: p.userId, position: p.position })),
  }))

  const teamsWithPlayers: LiveMatchTeam[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    score: liveScores[t.id] ?? t.score,
    players: t.players.map((p) => ({
      userId: p.userId,
      fullName: p.fullName,
      avatarUrl: p.avatarUrl,
      position: p.position,
      goals: p.goals,
      assists: p.assists,
      saves: p.saves,
      ownGoals: p.ownGoals,
    })),
  }))

  const hasRecordedScore =
    (team1?.score !== null && team2?.score !== null && team1?.score !== undefined && team2?.score !== undefined) ||
    eventStatus === 'en_curso' ||
    resultRecorded

  const score1 = liveScores[team1?.id || ''] ?? team1?.score ?? 0
  const score2 = liveScores[team2?.id || ''] ?? team2?.score ?? 0

  return (
    <div className="bg-neutral-950 text-white rounded-3xl p-4 sm:p-5 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-neutral-950 flex items-center justify-center font-bold">
            ⚽
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-base uppercase text-white tracking-tight">
                Equipos Oficiales
              </h3>
              {!isPublished && (
                <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Borrador Admin
                </span>
              )}
              {eventStatus === 'en_curso' && (
                <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                  <Radio className="w-2.5 h-2.5" />
                  En Vivo
                </span>
              )}
              {resultRecorded && (
                <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Resultado Oficial ✓
                </span>
              )}
            </div>
            <p className="font-mono text-[10px] text-neutral-400 uppercase">
              Formación & Planteles Tácticos
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Social Graphic Generator (Available to all) */}
          <button
            type="button"
            onClick={() => setIsGraphicOpen(true)}
            className="py-1.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-display font-bold text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-tactile-sm"
            title="Generar placa para Instagram"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Gráfica Redes</span>
          </button>

          {canManage && (
            <>
              {/* Live Match Tracker (Only for Admin / Creator) */}
              <button
                type="button"
                onClick={() => setIsTrackerOpen(true)}
                className={`btn-tactile py-1.5 px-3 rounded-xl font-display font-bold text-xs uppercase flex items-center gap-1.5 shadow-tactile-sm transition active:scale-95 ${
                  eventStatus === 'en_curso'
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
                }`}
                title="Abrir cronómetro y registro en vivo"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{eventStatus === 'en_curso' ? 'Planillero Activo' : 'Planillero en Vivo'}</span>
              </button>

              {/* Edit Result manual modal (when match finished) */}
              {(eventStatus === 'finalizado' || resultRecorded) && (
                <button
                  type="button"
                  onClick={() => setIsResultOpen(true)}
                  className="py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-display font-bold text-xs uppercase flex items-center gap-1.5 border border-neutral-700 shadow-tactile-sm transition active:scale-95"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Editar Ficha</span>
                </button>
              )}

              {/* Edit Teams builder */}
              {!resultRecorded && (
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(true)}
                  className="py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-display font-bold text-xs uppercase flex items-center gap-1.5 border border-neutral-700 shadow-tactile-sm transition active:scale-95"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar Equipos</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Match Scoreboard banner */}
      {hasRecordedScore && (
        <div className="bg-neutral-900/95 p-3.5 rounded-2xl border border-neutral-800 flex items-center justify-center gap-6 text-center relative overflow-hidden">
          {eventStatus === 'en_curso' && (
            <div className="absolute top-2 right-3 flex items-center gap-1 text-[9px] font-mono text-red-400 font-bold uppercase">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Directo
            </div>
          )}

          <div className="min-w-0">
            <span className="font-display font-bold text-xs uppercase text-neutral-300 block truncate max-w-[130px]">
              {team1?.name}
            </span>
            <span className="font-display font-extrabold text-3xl sm:text-4xl text-white">
              {score1}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="font-mono text-xs text-neutral-500 font-bold">VS</span>
            {eventStatus === 'en_curso' && (
              <span className="font-mono text-[9px] text-amber-400 uppercase font-bold">
                EN JUEGO
              </span>
            )}
          </div>

          <div className="min-w-0">
            <span className="font-display font-bold text-xs uppercase text-neutral-300 block truncate max-w-[130px]">
              {team2?.name}
            </span>
            <span className="font-display font-extrabold text-3xl sm:text-4xl text-white">
              {score2}
            </span>
          </div>
        </div>
      )}

      {/* 2-Column Squad Roster */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {teams.map((team, idx) => (
          <div
            key={team.id || idx}
            className="bg-neutral-900/90 rounded-2xl border-2 border-neutral-800 p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full border border-neutral-400 inline-block"
                  style={{ backgroundColor: team.color || (idx === 0 ? '#ffffff' : '#171717') }}
                />
                <span className="font-display font-bold text-sm uppercase text-white">
                  {team.name}
                </span>
              </div>
              <span className="font-mono text-[10px] text-neutral-400 font-bold">
                {team.players.length} jugadores
              </span>
            </div>

            <div className="divide-y divide-neutral-800/80">
              {team.players.map((player) => {
                const isGK =
                  player.position?.toLowerCase().includes('arquer') ||
                  player.position?.toLowerCase().includes('porter') ||
                  player.position?.toLowerCase().includes('gk')
                const conceded = idx === 0 ? score2 : score1

                return (
                  <div key={player.userId} className="py-2 flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-800 relative flex items-center justify-center flex-shrink-0">
                        {player.avatarUrl ? (
                          <Image src={player.avatarUrl} alt={player.fullName} fill className="object-cover" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                        )}
                      </div>
                      <span className="font-semibold text-white truncate text-xs">{player.fullName}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(player.goals || 0) > 0 && (
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          ⚽ {player.goals}
                        </span>
                      )}
                      {isGK && (
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700 flex items-center gap-1" title="Goles recibidos">
                          🧤 {conceded} rec.
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Team Builder Modal */}
      <TeamBuilderModal
        eventId={eventId}
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        candidates={candidates}
        initialTeams={initialTeamsPayload}
        isPublished={isPublished}
      />

      {/* Manual Match Result Modal */}
      <MatchResultModal
        eventId={eventId}
        isOpen={isResultOpen}
        onClose={() => setIsResultOpen(false)}
        teams={teamsWithPlayers}
      />

      {/* Live Match Planillero Modal */}
      <LiveMatchTrackerModal
        eventId={eventId}
        eventTitle={eventTitle}
        eventDate={eventDate}
        eventLocation={eventLocation}
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
        teams={teamsWithPlayers}
      />

      {/* Canvas Social Graphic Modal */}
      <MatchGraphicModal
        isOpen={isGraphicOpen}
        onClose={() => setIsGraphicOpen(false)}
        eventTitle={eventTitle}
        eventDate={eventDate}
        eventLocation={eventLocation}
        clubName={clubName}
        clubLogo={clubLogo}
        clubPrimaryColor={clubPrimaryColor}
        teams={teamsWithPlayers}
        resultRecorded={resultRecorded}
      />
    </div>
  )
}
