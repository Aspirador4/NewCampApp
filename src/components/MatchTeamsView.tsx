'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User, Users, Edit3, Trophy } from 'lucide-react'
import { TeamBuilderModal, TeamCandidatePlayer } from '@/components/TeamBuilderModal'
import { MatchResultModal } from '@/components/MatchResultModal'

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
}

export function MatchTeamsView({
  eventId,
  teams,
  isPublished,
  canManage,
  candidates,
  eventStatus = 'convocado',
  resultRecorded = false,
}: MatchTeamsViewProps) {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [isResultOpen, setIsResultOpen] = useState(false)

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

  // If teams exist but not published yet and user is not admin, hide
  if (!isPublished && !canManage) return null

  const team1 = teams[0]
  const team2 = teams[1]

  const initialTeamsPayload = teams.map((t) => ({
    name: t.name,
    color: t.color,
    players: t.players.map((p) => ({ userId: p.userId, position: p.position })),
  }))

  const teamsWithPlayers = teams.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    score: t.score,
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

        {canManage && (
          <div className="flex items-center gap-2">
            {(eventStatus === 'finalizado' || eventStatus === 'en_curso') && (
              <button
                type="button"
                onClick={() => setIsResultOpen(true)}
                className="btn-tactile py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-display font-bold text-xs uppercase flex items-center gap-1.5 shadow-tactile-sm"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>{resultRecorded ? 'Editar Resultado' : 'Cargar Resultado'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsBuilderOpen(true)}
              className="btn-tactile py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-display font-bold text-xs uppercase flex items-center gap-1.5 border border-neutral-700 shadow-tactile-sm"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Equipos</span>
            </button>
          </div>
        )}
      </div>

      {/* Match Scoreboard header if scores recorded */}
      {(team1?.score !== null && team2?.score !== null && team1?.score !== undefined && team2?.score !== undefined) && (
        <div className="bg-neutral-900 p-3 rounded-2xl border border-neutral-800 flex items-center justify-center gap-6 text-center">
          <div className="min-w-0">
            <span className="font-display font-bold text-xs uppercase text-neutral-300 block truncate">
              {team1.name}
            </span>
            <span className="font-display font-bold text-3xl text-white">
              {team1.score}
            </span>
          </div>

          <span className="font-mono text-xs text-neutral-500 font-bold">VS</span>

          <div className="min-w-0">
            <span className="font-display font-bold text-xs uppercase text-neutral-300 block truncate">
              {team2.name}
            </span>
            <span className="font-display font-bold text-3xl text-white">
              {team2.score}
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
              {team.players.map((player) => (
                <div key={player.userId} className="py-1.5 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg overflow-hidden bg-neutral-800 relative flex items-center justify-center flex-shrink-0">
                      {player.avatarUrl ? (
                        <Image src={player.avatarUrl} alt={player.fullName} fill className="object-cover" />
                      ) : (
                        <User className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </div>
                    <span className="font-bold text-white truncate">{player.fullName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                      {player.position}
                    </span>
                    {(player.goals || 0) > 0 && (
                      <span className="font-mono text-[9px] font-bold text-emerald-400">
                        ⚽ {player.goals}
                      </span>
                    )}
                    {(player.assists || 0) > 0 && (
                      <span className="font-mono text-[9px] font-bold text-blue-400">
                        👟 {player.assists}
                      </span>
                    )}
                    {(player.saves || 0) > 0 && (
                      <span className="font-mono text-[9px] font-bold text-amber-400">
                        🧤 {player.saves}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <TeamBuilderModal
        eventId={eventId}
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        candidates={candidates}
        initialTeams={initialTeamsPayload}
        isPublished={isPublished}
      />

      <MatchResultModal
        eventId={eventId}
        isOpen={isResultOpen}
        onClose={() => setIsResultOpen(false)}
        teams={teamsWithPlayers}
      />
    </div>
  )
}
