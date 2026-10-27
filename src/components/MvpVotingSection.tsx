'use client'

import { useState } from 'react'
import Image from 'next/image'
import { castAwardVoteAction, submitPeerRatingAction } from '@/app/eventos/team-actions'
import { closeMvpVoting } from '@/app/eventos/mvp-actions'
import { Trophy, User, Loader2, ShieldCheck, HeartHandshake, Zap } from 'lucide-react'
import { AwardType } from '@/types/database.types'

export interface MvpCandidate {
  id: string
  full_name: string
  avatar_url: string | null
  sports_role: string
  posicion?: string
  numero_camiseta?: number | string
}

export interface AwardWinnerItem {
  id: string
  full_name: string
  avatar_url: string | null
  vote_count: number
}

// Backward compatible alias
export type MvpWinner = AwardWinnerItem

interface MvpVotingSectionProps {
  eventId: string
  mvpVotingOpen: boolean
  mvpDeadline: string | null
  isConfirmedAttendee: boolean
  hasVoted: boolean
  candidates: MvpCandidate[]
  currentUserId: string
  isAdmin: boolean
  winners?: AwardWinnerItem[]
  allWinnersByCategory?: Record<AwardType, AwardWinnerItem[]>
  initialUserVotes?: Partial<Record<AwardType, string>>
  initialUserRatings?: Record<string, number>
  allVoteResults?: { player_id: string; full_name: string; vote_count: number }[]
}

export function MvpVotingSection({
  eventId,
  mvpVotingOpen,
  isConfirmedAttendee,
  candidates,
  currentUserId,
  isAdmin,
  winners = [],
  allWinnersByCategory,
  initialUserVotes = {},
  initialUserRatings = {},
}: MvpVotingSectionProps) {
  const [activeTab, setActiveTab] = useState<'premios' | 'evaluaciones'>('premios')
  const [activeAward, setActiveAward] = useState<AwardType>('mvp')

  // User's cast votes
  const [userVotes, setUserVotes] = useState<Partial<Record<AwardType, string>>>(initialUserVotes)
  const [votingLoading, setVotingLoading] = useState<string | null>(null)

  // User's peer ratings: { [playerId]: ratingNumber }
  const [userRatings, setUserRatings] = useState<Record<string, number>>(initialUserRatings)
  const [ratingLoading, setRatingLoading] = useState<string | null>(null)

  const [adminClosing, setAdminClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Eligible voting candidates (all confirmed attendees except oneself)
  const eligibleCandidates = candidates.filter((c) => c.id !== currentUserId)

  const handleVote = async (awardType: AwardType, votedPlayerId: string) => {
    setError(null)
    setVotingLoading(`${awardType}-${votedPlayerId}`)
    const res = await castAwardVoteAction(eventId, awardType, votedPlayerId)
    setVotingLoading(null)

    if (res?.error) {
      setError(res.error)
    } else {
      setUserVotes((prev) => ({ ...prev, [awardType]: votedPlayerId }))
      setSuccessMsg('¡Voto registrado! Si todos terminan de votar se cerrará automáticamente.')
    }
  }

  const handleRate = async (evaluatedPlayerId: string, rating: number) => {
    setError(null)
    setRatingLoading(evaluatedPlayerId)
    const res = await submitPeerRatingAction(eventId, evaluatedPlayerId, rating)
    setRatingLoading(null)

    if (res?.error) {
      setError(res.error)
    } else {
      setUserRatings((prev) => ({ ...prev, [evaluatedPlayerId]: rating }))
    }
  }

  const handleCloseVoting = async () => {
    if (!confirm('¿Deseas cerrar la votación y procesar los ganadores de los premios en el club?')) {
      return
    }

    setError(null)
    setAdminClosing(true)
    const res = await closeMvpVoting(eventId)
    setAdminClosing(false)

    if (res && 'error' in res && res.error) {
      setError(res.error)
    }
  }

  // 1. Voting is OPEN
  if (mvpVotingOpen) {
    return (
      <div className="mt-5 bg-neutral-950 text-white rounded-3xl p-4 sm:p-5 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile space-y-4">
        {/* Banner Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-bold shadow-tactile-sm">
              <Trophy className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base uppercase text-white tracking-tight">
                  Tercer Tiempo: Premios & Notas
                </h3>
                <span className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-neutral-950 animate-pulse">
                  Abierto
                </span>
              </div>
              <p className="font-mono text-[10px] text-neutral-400 uppercase mt-0.5">
                Votación confidencial • Se cierra al 100% de votos o a las 24 hrs
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Premios vs Evaluaciones */}
        <div className="grid grid-cols-2 gap-2 bg-neutral-900 p-1 rounded-2xl border border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('premios')}
            className={`py-2 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition ${
              activeTab === 'premios'
                ? 'bg-amber-400 text-neutral-950 shadow-tactile-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            🏆 Premios de la Fecha
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('evaluaciones')}
            className={`py-2 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition ${
              activeTab === 'evaluaciones'
                ? 'bg-emerald-500 text-neutral-950 shadow-tactile-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            🔒 Evaluación de Pares (1-10)
          </button>
        </div>

        {error && (
          <p className="text-xs text-rose-300 bg-rose-950/70 p-2.5 rounded-xl border border-rose-800">
            {error}
          </p>
        )}

        {successMsg && (
          <p className="text-xs text-emerald-300 bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-800">
            {successMsg}
          </p>
        )}

        {/* TAB 1: PREMIOS POST-PARTIDO */}
        {activeTab === 'premios' && (
          <div className="space-y-3.5">
            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveAward('mvp')}
                className={`py-1.5 px-3 rounded-xl font-display font-bold text-xs uppercase flex items-center gap-1.5 border transition ${
                  activeAward === 'mvp'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Figura (MVP)</span>
                {userVotes.mvp && <span className="text-[10px]">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveAward('mejor_compañero')}
                className={`py-1.5 px-3 rounded-xl font-display font-bold text-xs uppercase flex items-center gap-1.5 border transition ${
                  activeAward === 'mejor_compañero'
                    ? 'border-blue-400 bg-blue-400/20 text-blue-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Mejor Compañero</span>
                {userVotes.mejor_compañero && <span className="text-[10px]">✓</span>}
              </button>

              <button
                type="button"
                onClick={() => setActiveAward('jugador_sorpresa')}
                className={`py-1.5 px-3 rounded-xl font-display font-bold text-xs uppercase flex items-center gap-1.5 border transition ${
                  activeAward === 'jugador_sorpresa'
                    ? 'border-purple-400 bg-purple-400/20 text-purple-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Jugador Sorpresa</span>
                {userVotes.jugador_sorpresa && <span className="text-[10px]">✓</span>}
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 font-sans">
              {activeAward === 'mvp' && '🏆 Elige a la figura deportiva más determinante del partido.'}
              {activeAward === 'mejor_compañero' && '🤝 Elige al jugador con mayor entrega, compañerismo y fair play.'}
              {activeAward === 'jugador_sorpresa' && '⚡ Elige a la revelación: quien dio la sorpresa con un partidazo.'}
            </p>

            {/* Candidates grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {eligibleCandidates.map((cand) => {
                const isSelected = userVotes[activeAward] === cand.id
                const loadingKey = `${activeAward}-${cand.id}`
                const isLoading = votingLoading === loadingKey

                return (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => handleVote(activeAward, cand.id)}
                    disabled={Boolean(votingLoading) || !isConfirmedAttendee}
                    className={`p-2.5 rounded-2xl border text-left flex items-center justify-between gap-2.5 transition active:scale-95 disabled:opacity-50 ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/15 shadow-tactile-sm'
                        : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-neutral-800 relative flex items-center justify-center flex-shrink-0">
                        {cand.avatar_url ? (
                          <Image src={cand.avatar_url} alt={cand.full_name} fill className="object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-display font-bold text-xs uppercase text-white truncate">
                          {cand.full_name}
                        </p>
                        <span className="font-mono text-[9px] text-neutral-400 truncate block">
                          {cand.posicion || 'Jugador'}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      ) : isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-neutral-950 flex items-center justify-center font-bold text-[10px]">
                          ✓
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-neutral-500 hover:text-white uppercase">
                          Votar
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: EVALUACIÓN DE PARES (1-10) */}
        {activeTab === 'evaluaciones' && (
          <div className="space-y-3">
            <div className="bg-neutral-900 p-3 rounded-2xl border border-neutral-800">
              <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                🔒 <strong>Evaluación Secreta:</strong> Ponle nota del 1 al 10 a tus compañeros de partido.
                Nadie verá qué nota pusiste. Se consolidará el promedio general que alimenta el nivel de cada socio y el algoritmo de balanceo.
              </p>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {eligibleCandidates.map((cand) => {
                const currentRating = userRatings[cand.id] || 0
                const isUpdating = ratingLoading === cand.id

                return (
                  <div
                    key={cand.id}
                    className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-800 relative flex items-center justify-center flex-shrink-0">
                          {cand.avatar_url ? (
                            <Image src={cand.avatar_url} alt={cand.full_name} fill className="object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                        <span className="font-display font-bold text-xs uppercase text-white truncate">
                          {cand.full_name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span className="text-neutral-400 text-[10px] uppercase">Tu nota:</span>
                        <span className="font-bold text-emerald-400">
                          {currentRating > 0 ? `${currentRating}/10` : '—'}
                        </span>
                        {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 ml-1" />}
                      </div>
                    </div>

                    {/* Quick 1..10 Chips */}
                    <div className="grid grid-cols-10 gap-1 pt-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                        const isSelected = currentRating === num
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => handleRate(cand.id, num)}
                            disabled={isUpdating || !isConfirmedAttendee}
                            className={`py-1 rounded-lg font-mono font-bold text-[11px] transition text-center ${
                              isSelected
                                ? 'bg-emerald-500 text-neutral-950 shadow-tactile-sm font-extrabold'
                                : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800'
                            }`}
                          >
                            {num}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Admin manual early close */}
        {isAdmin && (
          <div className="pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={handleCloseVoting}
              disabled={adminClosing}
              className="btn-tactile w-full py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-display font-bold text-xs uppercase tracking-wider border border-neutral-700 shadow-tactile-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {adminClosing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>Cerrar Votación y Publicar Podios Oficiales</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // 2. Voting is CLOSED & Winners exist
  const hasAnyWinners = Boolean(
    (winners && winners.length > 0) ||
    (allWinnersByCategory?.mvp && allWinnersByCategory.mvp.length > 0) ||
    (allWinnersByCategory?.mejor_compañero && allWinnersByCategory.mejor_compañero.length > 0) ||
    (allWinnersByCategory?.jugador_sorpresa && allWinnersByCategory.jugador_sorpresa.length > 0)
  )

  if (hasAnyWinners) {
    const mvpWinners = allWinnersByCategory?.mvp || winners || []
    const teammateWinners = allWinnersByCategory?.mejor_compañero || []
    const surpriseWinners = allWinnersByCategory?.jugador_sorpresa || []

    return (
      <div className="mt-5 bg-neutral-950 text-white rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 p-5 shadow-tactile space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
            <h3 className="font-display font-bold text-xl uppercase tracking-tight text-white leading-none">
              Podio Oficial de la Fecha
            </h3>
          </div>
          <span className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400 text-neutral-950">
            Oficial
          </span>
        </div>

        {/* 3 Podiums Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* MVP Podium */}
          {mvpWinners.length > 0 && (
            <div className="bg-neutral-900 p-3.5 rounded-2xl border-2 border-amber-400/40 text-center space-y-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400 block">
                🏆 Figura del Partido
              </span>
              {mvpWinners.map((w) => (
                <div key={w.id} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-neutral-800 border-2 border-amber-400 relative flex items-center justify-center shadow-tactile-sm">
                    {w.avatar_url ? (
                      <Image src={w.avatar_url} alt={w.full_name} fill className="object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-amber-400" />
                    )}
                  </div>
                  <p className="font-display font-bold text-sm uppercase text-white mt-1.5 leading-tight">
                    {w.full_name}
                  </p>
                  <span className="font-mono text-[9px] text-amber-300">
                    {w.vote_count} {w.vote_count === 1 ? 'voto' : 'votos'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Mejor Compañero Podium */}
          {teammateWinners.length > 0 && (
            <div className="bg-neutral-900 p-3.5 rounded-2xl border-2 border-blue-400/40 text-center space-y-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-blue-400 block">
                🤝 Mejor Compañero
              </span>
              {teammateWinners.map((w) => (
                <div key={w.id} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-neutral-800 border-2 border-blue-400 relative flex items-center justify-center shadow-tactile-sm">
                    {w.avatar_url ? (
                      <Image src={w.avatar_url} alt={w.full_name} fill className="object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-blue-400" />
                    )}
                  </div>
                  <p className="font-display font-bold text-sm uppercase text-white mt-1.5 leading-tight">
                    {w.full_name}
                  </p>
                  <span className="font-mono text-[9px] text-blue-300">
                    {w.vote_count} {w.vote_count === 1 ? 'voto' : 'votos'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Jugador Sorpresa Podium */}
          {surpriseWinners.length > 0 && (
            <div className="bg-neutral-900 p-3.5 rounded-2xl border-2 border-purple-400/40 text-center space-y-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-purple-400 block">
                ⚡ Jugador Sorpresa
              </span>
              {surpriseWinners.map((w) => (
                <div key={w.id} className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-neutral-800 border-2 border-purple-400 relative flex items-center justify-center shadow-tactile-sm">
                    {w.avatar_url ? (
                      <Image src={w.avatar_url} alt={w.full_name} fill className="object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-purple-400" />
                    )}
                  </div>
                  <p className="font-display font-bold text-sm uppercase text-white mt-1.5 leading-tight">
                    {w.full_name}
                  </p>
                  <span className="font-mono text-[9px] text-purple-300">
                    {w.vote_count} {w.vote_count === 1 ? 'voto' : 'votos'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
