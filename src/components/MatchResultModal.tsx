'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User, Check, X, Loader2, Trophy, Minus, Plus } from 'lucide-react'
import { recordMatchResultAction, PlayerStatPayload } from '@/app/eventos/team-actions'

interface TeamWithPlayers {
  id: string
  name: string
  color: string
  score: number | null
  players: {
    userId: string
    fullName: string
    avatarUrl: string | null
    position: string
    goals?: number
    assists?: number
    saves?: number
    ownGoals?: number
  }[]
}

interface MatchResultModalProps {
  eventId: string
  isOpen: boolean
  onClose: () => void
  teams: TeamWithPlayers[]
}

export function MatchResultModal({
  eventId,
  isOpen,
  onClose,
  teams,
}: MatchResultModalProps) {
  const team1 = teams[0]
  const team2 = teams[1]

  const [score1, setScore1] = useState<number>(team1?.score ?? 0)
  const [score2, setScore2] = useState<number>(team2?.score ?? 0)

  // Map of userId -> { goals, assists, saves, ownGoals }
  const [statsMap, setStatsMap] = useState<Record<string, { goals: number; assists: number; saves: number; ownGoals: number }>>(() => {
    const initial: Record<string, { goals: number; assists: number; saves: number; ownGoals: number }> = {}
    teams.forEach((t) => {
      t.players.forEach((p) => {
        initial[p.userId] = {
          goals: p.goals || 0,
          assists: p.assists || 0,
          saves: p.saves || 0,
          ownGoals: p.ownGoals || 0,
        }
      })
    })
    return initial
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !team1 || !team2) return null

  const updateStat = (userId: string, delta: number) => {
    setStatsMap((prev) => {
      const current = prev[userId] || { goals: 0, assists: 0, saves: 0, ownGoals: 0 }
      const newVal = Math.max(0, (current.goals || 0) + delta)
      return {
        ...prev,
        [userId]: {
          ...current,
          goals: newVal,
        },
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const teamScores = [
      { teamId: team1.id, score: Number(score1) },
      { teamId: team2.id, score: Number(score2) },
    ]

    const playerStats: PlayerStatPayload[] = []
    teams.forEach((t) => {
      t.players.forEach((p) => {
        const s = statsMap[p.userId] || { goals: 0, assists: 0, saves: 0, ownGoals: 0 }
        playerStats.push({
          userId: p.userId,
          teamId: t.id,
          goals: s.goals,
          assists: s.assists,
          saves: s.saves,
          ownGoals: s.ownGoals,
        })
      })
    })

    const res = await recordMatchResultAction(eventId, teamScores, playerStats)
    setSaving(false)

    if (res?.error) {
      setError(res.error)
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-neutral-950 text-white rounded-3xl border-2 border-neutral-800 shadow-tactile p-4 sm:p-5 w-full max-w-3xl max-h-[92vh] flex flex-col space-y-4 my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-bold">
              <Trophy className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg uppercase tracking-tight text-white leading-none">
                Ficha Técnica & Marcador Final
              </h2>
              <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider mt-1">
                Detalla el resultado e incidencias de los jugadores
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <p className="text-xs text-rose-300 bg-rose-950/70 p-2.5 rounded-xl border border-rose-800 font-medium">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto">
          {/* Big Scoreboard Input */}
          <div className="bg-neutral-900 p-4 rounded-2xl border-2 border-neutral-800 flex items-center justify-around gap-4 text-center">
            <div className="space-y-1">
              <span className="font-display font-bold text-xs uppercase text-neutral-300 block">
                {team1.name}
              </span>
              <input
                type="number"
                min="0"
                value={score1}
                onChange={(e) => setScore1(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 text-center font-display font-bold text-3xl p-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <span className="font-mono text-sm text-neutral-500 font-bold uppercase">VS</span>

            <div className="space-y-1">
              <span className="font-display font-bold text-xs uppercase text-neutral-300 block">
                {team2.name}
              </span>
              <input
                type="number"
                min="0"
                value={score2}
                onChange={(e) => setScore2(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 text-center font-display font-bold text-3xl p-2 rounded-xl bg-neutral-950 border border-neutral-700 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Player stats input for each team */}
          <div className="space-y-4">
            {teams.map((team, tIdx) => {
              const rivalScore = tIdx === 0 ? Number(score2) : Number(score1)

              return (
                <div key={team.id} className="bg-neutral-900/90 rounded-2xl border border-neutral-800 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-neutral-300">
                      Goleadores: {team.name}
                    </h3>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase">
                      ⚽ Goles individuales
                    </span>
                  </div>

                  <div className="divide-y divide-neutral-800/80">
                    {team.players.map((player) => {
                      const s = statsMap[player.userId] || { goals: 0, assists: 0, saves: 0, ownGoals: 0 }
                      const isGK =
                        player.position?.toLowerCase().includes('arquer') ||
                        player.position?.toLowerCase().includes('porter') ||
                        player.position?.toLowerCase().includes('gk')

                      return (
                        <div key={player.userId} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-800 relative flex items-center justify-center flex-shrink-0">
                              {player.avatarUrl ? (
                                <Image src={player.avatarUrl} alt={player.fullName} fill className="object-cover" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-white truncate text-xs block">{player.fullName}</span>
                              {isGK && (
                                <span className="font-mono text-[10px] text-amber-300 font-bold block mt-0.5">
                                  🧤 Arquero · {rivalScore} recibidos
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Goles Counter */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => updateStat(player.userId, -1)}
                              disabled={s.goals <= 0}
                              className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-neutral-300 hover:text-white"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-7 text-center font-mono font-bold text-sm text-emerald-400">
                              {s.goals}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateStat(player.userId, 1)}
                              className="w-7 h-7 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-neutral-950 flex items-center justify-center transition active:scale-95 font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white text-xs font-display font-bold uppercase transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-tactile py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
              <span>Guardar Resultado Oficial</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
