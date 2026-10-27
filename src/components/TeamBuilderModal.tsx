'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { User, Sparkles, ArrowRightLeft, Check, Loader2, X } from 'lucide-react'
import { saveTeamsAction, TeamDraftPayload } from '@/app/eventos/team-actions'

export interface TeamCandidatePlayer {
  id: string
  fullName: string
  avatarUrl: string | null
  posicion: string
  averageRating: number | null
  matchesWon: number
  matchesLost: number
  matchesPlayed: number
}

interface TeamBuilderModalProps {
  eventId: string
  isOpen: boolean
  onClose: () => void
  candidates: TeamCandidatePlayer[]
  initialTeams?: {
    name: string
    color: string
    players: { userId: string; position: string }[]
  }[]
  isPublished?: boolean
}

export function TeamBuilderModal({
  eventId,
  isOpen,
  onClose,
  candidates,
  initialTeams,
  isPublished = false,
}: TeamBuilderModalProps) {
  // Team 1 (Blanco) and Team 2 (Negro)
  const [team1Players, setTeam1Players] = useState<TeamCandidatePlayer[]>(() => {
    if (initialTeams && initialTeams[0]) {
      const ids = new Set(initialTeams[0].players.map((p) => p.userId))
      return candidates.filter((c) => ids.has(c.id))
    }
    return []
  })

  const [team2Players, setTeam2Players] = useState<TeamCandidatePlayer[]>(() => {
    if (initialTeams && initialTeams[1]) {
      const ids = new Set(initialTeams[1].players.map((p) => p.userId))
      return candidates.filter((c) => ids.has(c.id))
    }
    return []
  })

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Unassigned players
  const unassignedPlayers = useMemo(() => {
    const assignedIds = new Set([...team1Players.map((p) => p.id), ...team2Players.map((p) => p.id)])
    return candidates.filter((c) => !assignedIds.has(c.id))
  }, [candidates, team1Players, team2Players])

  // Calculate composite player rating (0-10)
  const getPlayerSkill = (p: TeamCandidatePlayer) => {
    const baseRating = p.averageRating ?? 6.0
    const winRate = p.matchesPlayed > 0 ? p.matchesWon / p.matchesPlayed : 0.5
    // 70% peer rating + 30% win rate
    return Number((baseRating * 0.7 + winRate * 10 * 0.3).toFixed(1))
  }

  // Calculate team averages
  const team1Avg = useMemo(() => {
    if (team1Players.length === 0) return 0
    const sum = team1Players.reduce((acc, p) => acc + getPlayerSkill(p), 0)
    return Number((sum / team1Players.length).toFixed(1))
  }, [team1Players])

  const team2Avg = useMemo(() => {
    if (team2Players.length === 0) return 0
    const sum = team2Players.reduce((acc, p) => acc + getPlayerSkill(p), 0)
    return Number((sum / team2Players.length).toFixed(1))
  }, [team2Players])

  const balanceScore = useMemo(() => {
    if (team1Players.length === 0 || team2Players.length === 0) return 100
    const diff = Math.abs(team1Avg - team2Avg)
    return Math.max(50, Math.min(100, Math.round(100 - diff * 15)))
  }, [team1Avg, team2Avg, team1Players.length, team2Players.length])

  // Auto-Balancing Algorithm: 1-3-2-1 tactical scheme + skill ratings
  const handleAutoBalance = () => {
    const all = [...candidates]
    if (all.length === 0) return

    // Helper to categorize position
    const normalizePos = (pos: string) => {
      const p = (pos || '').toLowerCase()
      if (p.includes('arquero') || p.includes('portero')) return 'Arquero'
      if (p.includes('defens') || p.includes('central') || p.includes('lateral')) return 'Defensor'
      if (p.includes('medio') || p.includes('volante') || p.includes('pivote')) return 'Mediocampista'
      if (p.includes('delant') || p.includes('punta') || p.includes('atacante')) return 'Delantero'
      return 'Mediocampista'
    }

    const clusters: Record<string, TeamCandidatePlayer[]> = {
      Arquero: [],
      Defensor: [],
      Mediocampista: [],
      Delantero: [],
    }

    all.forEach((player) => {
      const cat = normalizePos(player.posicion)
      clusters[cat].push(player)
    })

    // Sort players in each cluster by skill descending
    Object.keys(clusters).forEach((k) => {
      clusters[k].sort((a, b) => getPlayerSkill(b) - getPlayerSkill(a))
    })

    const t1: TeamCandidatePlayer[] = []
    const t2: TeamCandidatePlayer[] = []

    const distributeCluster = (group: TeamCandidatePlayer[]) => {
      group.forEach((player) => {
        // Assign to team with fewer players; if tied, to team with lower sum skill
        const sum1 = t1.reduce((acc, p) => acc + getPlayerSkill(p), 0)
        const sum2 = t2.reduce((acc, p) => acc + getPlayerSkill(p), 0)

        if (t1.length < t2.length) {
          t1.push(player)
        } else if (t2.length < t1.length) {
          t2.push(player)
        } else {
          // Tied count, assign to weaker team
          if (sum1 <= sum2) {
            t1.push(player)
          } else {
            t2.push(player)
          }
        }
      })
    }

    // 1-3-2-1 Priority Order: Arqueros first, then Defensores, then Delanteros, then Mediocampistas
    distributeCluster(clusters.Arquero)
    distributeCluster(clusters.Defensor)
    distributeCluster(clusters.Delantero)
    distributeCluster(clusters.Mediocampista)

    setTeam1Players(t1)
    setTeam2Players(t2)
    setSelectedPlayerId(null)
  }

  // Handle Player Click (Swap or Move)
  const handlePlayerClick = (clickedPlayer: TeamCandidatePlayer, currentTeam: 1 | 2 | 'unassigned') => {
    if (!selectedPlayerId) {
      setSelectedPlayerId(clickedPlayer.id)
      return
    }

    if (selectedPlayerId === clickedPlayer.id) {
      setSelectedPlayerId(null)
      return
    }

    // Swap players between teams
    const findSelectedTeam = (): 1 | 2 | 'unassigned' => {
      if (team1Players.some((p) => p.id === selectedPlayerId)) return 1
      if (team2Players.some((p) => p.id === selectedPlayerId)) return 2
      return 'unassigned'
    }

    const selTeam = findSelectedTeam()
    const all = [...candidates]
    const selPlayer = all.find((p) => p.id === selectedPlayerId)
    if (!selPlayer) return

    // Execute swap
    if (selTeam === 1 && currentTeam === 2) {
      setTeam1Players((prev) => prev.map((p) => (p.id === selPlayer.id ? clickedPlayer : p)))
      setTeam2Players((prev) => prev.map((p) => (p.id === clickedPlayer.id ? selPlayer : p)))
    } else if (selTeam === 2 && currentTeam === 1) {
      setTeam2Players((prev) => prev.map((p) => (p.id === selPlayer.id ? clickedPlayer : p)))
      setTeam1Players((prev) => prev.map((p) => (p.id === clickedPlayer.id ? selPlayer : p)))
    } else if (selTeam === 'unassigned' && currentTeam === 1) {
      setTeam1Players((prev) => prev.map((p) => (p.id === clickedPlayer.id ? selPlayer : p)))
    } else if (selTeam === 'unassigned' && currentTeam === 2) {
      setTeam2Players((prev) => prev.map((p) => (p.id === clickedPlayer.id ? selPlayer : p)))
    }

    setSelectedPlayerId(null)
  }

  // Quick move to other team
  const moveToTeam = (player: TeamCandidatePlayer, targetTeam: 1 | 2) => {
    setTeam1Players((prev) => prev.filter((p) => p.id !== player.id))
    setTeam2Players((prev) => prev.filter((p) => p.id !== player.id))

    if (targetTeam === 1) {
      setTeam1Players((prev) => [...prev, player])
    } else {
      setTeam2Players((prev) => [...prev, player])
    }
    setSelectedPlayerId(null)
  }

  const handleSave = async (publish: boolean) => {
    setError(null)
    setSaving(true)

    const payload: TeamDraftPayload[] = [
      {
        name: 'Equipo Blanco',
        color: '#ffffff',
        players: team1Players.map((p) => ({ userId: p.id, position: p.posicion || 'Jugador' })),
      },
      {
        name: 'Equipo Negro',
        color: '#171717',
        players: team2Players.map((p) => ({ userId: p.id, position: p.posicion || 'Jugador' })),
      },
    ]

    const res = await saveTeamsAction(eventId, payload, publish)
    setSaving(false)

    if (res?.error) {
      setError(res.error)
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-neutral-950 text-white rounded-3xl border-2 border-neutral-800 shadow-tactile p-4 sm:p-5 w-full max-w-4xl max-h-[92vh] flex flex-col space-y-4 my-auto">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-neutral-950 flex items-center justify-center font-bold">
              ⚽
            </div>
            <div>
              <h2 className="font-display font-bold text-lg uppercase tracking-tight text-white leading-none">
                Armador de Equipos Táctico
              </h2>
              <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-wider mt-1">
                {candidates.length} Jugadores Confirmados en Cancha
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

        {/* Toolbar: Auto-Balance Button & Metric Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900 p-3 rounded-2xl border border-neutral-800">
          <button
            type="button"
            onClick={handleAutoBalance}
            className="btn-tactile py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-neutral-950 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition"
          >
            <Sparkles className="w-4 h-4 fill-neutral-950" />
            <span>Sugerir Equipos Automáticos (1-3-2-1)</span>
          </button>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-neutral-400 block text-[9px] uppercase">Equilibrio Calculado</span>
              <span className={`font-bold text-sm ${balanceScore >= 85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {balanceScore}% Parejo
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[9px] uppercase">Diferencia de Media</span>
              <span className="font-bold text-sm text-white">
                {Math.abs(team1Avg - team2Avg).toFixed(1)} pts
              </span>
            </div>
          </div>
        </div>

        {/* Instruction badge */}
        <p className="text-[11px] text-neutral-400 font-sans px-1">
          💡 <strong>Tip táctico:</strong> Toca un jugador para seleccionarlo y luego toca a otro jugador para <strong>intercambiarlos (swap)</strong> entre equipos, o usa las flechas rápidas.
        </p>

        {/* Pitch / Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto min-h-[300px]">
          {/* Team 1: Blanco */}
          <div className="bg-neutral-900/90 rounded-2xl border-2 border-white/20 p-3.5 space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-white border border-neutral-400 inline-block" />
                <h3 className="font-display font-bold text-sm uppercase text-white">
                  Equipo Blanco ({team1Players.length})
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-neutral-300 bg-white/10 px-2 py-0.5 rounded-md">
                Media: {team1Avg}
              </span>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[340px] pr-1">
              {team1Players.length === 0 ? (
                <p className="text-xs text-neutral-500 font-mono text-center py-8">
                  Sin jugadores asignados
                </p>
              ) : (
                team1Players.map((player) => {
                  const isSelected = selectedPlayerId === player.id
                  const skill = getPlayerSkill(player)

                  return (
                    <div
                      key={player.id}
                      onClick={() => handlePlayerClick(player, 1)}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition select-none ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-950/60 shadow-tactile-sm'
                          : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-800 relative flex items-center justify-center flex-shrink-0">
                          {player.avatarUrl ? (
                            <Image src={player.avatarUrl} alt={player.fullName} fill className="object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-xs uppercase text-white truncate leading-tight">
                            {player.fullName}
                          </p>
                          <span className="font-mono text-[9px] text-neutral-400 truncate block">
                            {player.posicion || 'Jugador'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ★ {skill}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveToTeam(player, 2)
                          }}
                          title="Pasar a Equipo Negro"
                          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Team 2: Negro */}
          <div className="bg-neutral-900/90 rounded-2xl border-2 border-neutral-700 p-3.5 space-y-3 flex flex-col">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-neutral-950 border border-neutral-600 inline-block" />
                <h3 className="font-display font-bold text-sm uppercase text-white">
                  Equipo Negro ({team2Players.length})
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-neutral-300 bg-white/10 px-2 py-0.5 rounded-md">
                Media: {team2Avg}
              </span>
            </div>

            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[340px] pr-1">
              {team2Players.length === 0 ? (
                <p className="text-xs text-neutral-500 font-mono text-center py-8">
                  Sin jugadores asignados
                </p>
              ) : (
                team2Players.map((player) => {
                  const isSelected = selectedPlayerId === player.id
                  const skill = getPlayerSkill(player)

                  return (
                    <div
                      key={player.id}
                      onClick={() => handlePlayerClick(player, 2)}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition select-none ${
                        isSelected
                          ? 'border-emerald-400 bg-emerald-950/60 shadow-tactile-sm'
                          : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-800 relative flex items-center justify-center flex-shrink-0">
                          {player.avatarUrl ? (
                            <Image src={player.avatarUrl} alt={player.fullName} fill className="object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-display font-bold text-xs uppercase text-white truncate leading-tight">
                            {player.fullName}
                          </p>
                          <span className="font-mono text-[9px] text-neutral-400 truncate block">
                            {player.posicion || 'Jugador'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ★ {skill}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveToTeam(player, 1)
                          }}
                          title="Pasar a Equipo Blanco"
                          className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Unassigned Players tray (if any) */}
        {unassignedPlayers.length > 0 && (
          <div className="bg-neutral-900 p-3 rounded-2xl border border-neutral-800 space-y-2">
            <p className="text-[10px] font-mono uppercase font-bold text-amber-400">
              Jugadores Sin Asignar ({unassignedPlayers.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {unassignedPlayers.map((player) => (
                <div
                  key={player.id}
                  onClick={() => moveToTeam(player, team1Players.length <= team2Players.length ? 1 : 2)}
                  className="bg-neutral-950 border border-neutral-800 hover:border-emerald-400 px-2.5 py-1.5 rounded-xl flex items-center gap-2 cursor-pointer text-xs"
                >
                  <span className="font-bold text-white">{player.fullName}</span>
                  <span className="font-mono text-[9px] text-neutral-400">({player.posicion || 'Jugador'})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-neutral-700 text-neutral-300 hover:text-white text-xs font-display font-bold uppercase transition"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="btn-tactile py-2.5 px-3.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar Borrador'}
            </button>

            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving || (team1Players.length === 0 && team2Players.length === 0)}
              className="btn-tactile py-2.5 px-4 rounded-xl border-2 border-neutral-900 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-display font-bold text-xs uppercase tracking-wider shadow-tactile-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
              <span>{isPublished ? 'Actualizar Equipos' : 'Publicar Equipos'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
