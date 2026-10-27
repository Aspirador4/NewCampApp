'use client'

import { useState } from 'react'
import Image from 'next/image'
import { castMvpVote, closeMvpVoting } from '@/app/eventos/mvp-actions'
import { Trophy, CheckCircle2, User, Loader2, AlertCircle, Clock, ShieldCheck, Flame } from 'lucide-react'

export interface MvpCandidate {
  id: string
  full_name: string
  avatar_url: string | null
  sports_role: string
  posicion?: string
  numero_camiseta?: number | string
}

export interface MvpWinner {
  id: string
  full_name: string
  avatar_url: string | null
  vote_count: number
}

interface MvpVotingSectionProps {
  eventId: string
  mvpVotingOpen: boolean
  mvpDeadline: string | null
  isConfirmedAttendee: boolean
  hasVoted: boolean
  candidates: MvpCandidate[]
  currentUserId: string
  isAdmin: boolean
  winners: MvpWinner[]
  allVoteResults: { player_id: string; full_name: string; vote_count: number }[]
}

export function MvpVotingSection({
  eventId,
  mvpVotingOpen,
  mvpDeadline,
  isConfirmedAttendee,
  hasVoted,
  candidates,
  currentUserId,
  isAdmin,
  winners,
  allVoteResults,
}: MvpVotingSectionProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [adminClosing, setAdminClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Eligible voting candidates (all confirmed attendees except oneself)
  const eligibleCandidates = candidates.filter((c) => c.id !== currentUserId)

  const handleVote = async () => {
    if (!selectedPlayerId) {
      setError('Por favor selecciona a un jugador para votar')
      return
    }

    setError(null)
    setLoading(true)
    const res = await castMvpVote(eventId, selectedPlayerId)
    setLoading(false)

    if (res && 'error' in res && res.error) {
      setError(res.error)
    } else if (res?.success) {
      setSuccessMsg('¡Voto registrado! Los votos son anónimos.')
    }
  }

  const handleCloseVoting = async () => {
    if (!confirm('¿Deseas cerrar la votación y procesar los ganadores de MVP en las estadísticas del club?')) {
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
      <div className="mt-5 bg-amber-50 dark:bg-amber-950/40 border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-4 shadow-tactile space-y-4">
        {/* Banner Header */}
        <div className="flex items-center justify-between border-b-2 border-neutral-900/10 dark:border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex-shrink-0">
              <Trophy className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-neutral-950 dark:text-white uppercase tracking-tight leading-none">
                Votación de Jugador del Partido
              </h3>
              <p className="font-mono text-[10px] text-amber-900 dark:text-amber-300 uppercase tracking-wider mt-0.5">
                Voto 100% Anónimo • Exclusivo Asistentes
              </p>
            </div>
          </div>
          <span className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 border border-amber-400 dark:border-amber-700">
            En Curso
          </span>
        </div>

        {mvpDeadline && (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-900 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-900/30 px-2.5 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700">
            <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
            <span>Cierre: {new Date(mvpDeadline).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hrs</span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Voting Options: Eligible Candidates */}
        {isConfirmedAttendee && !hasVoted && !successMsg && (
          <div className="space-y-3">
            <p className="font-display font-bold text-xs uppercase text-neutral-800 dark:text-neutral-200 tracking-wide">
              Selecciona a tu candidato MVP:
            </p>

            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
              {eligibleCandidates.map((cand) => {
                const isSelected = selectedPlayerId === cand.id
                return (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(cand.id)}
                    className={`btn-tactile w-full p-2.5 rounded-2xl border-2 text-left flex items-center justify-between transition ${
                      isSelected
                        ? 'border-neutral-900 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-tactile-sm'
                        : 'border-neutral-300 dark:border-neutral-700 bg-white/70 dark:bg-neutral-900/60 hover:bg-white dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-700 border border-neutral-400 dark:border-neutral-600 relative flex items-center justify-center flex-shrink-0">
                        {cand.avatar_url ? (
                          <Image
                            src={cand.avatar_url}
                            alt={cand.full_name}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <User className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-display font-bold text-sm text-neutral-950 dark:text-white uppercase truncate leading-tight">
                          {cand.full_name}
                        </p>
                        <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase">
                          {cand.posicion || 'Jugador'}
                          {cand.numero_camiseta ? ` • #${cand.numero_camiseta}` : ''}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-neutral-900 dark:border-neutral-700 bg-amber-500 text-neutral-950 shadow-tactile-sm'
                          : 'border-neutral-400 dark:border-neutral-600 bg-white dark:bg-neutral-900'
                      }`}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-sm bg-neutral-950 dark:bg-neutral-950" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleVote}
              disabled={loading || !selectedPlayerId}
              className="btn-tactile w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 font-display font-bold text-xs uppercase tracking-wider text-neutral-950 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Emitir Voto Anónimo</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* State: User already voted */}
        {(hasVoted || successMsg) && (
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-neutral-900 dark:border-neutral-700 text-center space-y-1 shadow-tactile-sm">
            <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
            <p className="font-display font-bold text-sm uppercase text-neutral-950 dark:text-white">
              ¡Tu voto ha sido registrado!
            </p>
            <p className="font-sans text-xs text-neutral-500 dark:text-neutral-400">
              Voto anónimo computado. Los resultados se publicarán al finalizar el partido.
            </p>
          </div>
        )}

        {/* State: User did not attend */}
        {!isConfirmedAttendee && (
          <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-neutral-900/80 border border-amber-300 dark:border-amber-700 text-center font-mono text-xs text-neutral-600 dark:text-neutral-300">
            Solo los jugadores que confirmaron asistencia en este partido pueden emitir voto.
          </div>
        )}

        {/* Admin option to close voting early */}
        {isAdmin && (
          <div className="pt-2 border-t-2 border-neutral-900/10 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleCloseVoting}
              disabled={adminClosing}
              className="btn-tactile w-full py-2.5 px-3 rounded-xl bg-neutral-950 dark:bg-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-800/80 text-amber-400 font-display font-bold text-xs uppercase tracking-wider border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {adminClosing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>Cerrar Votación y Computar Resultados</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // 2. Voting is CLOSED & Winners are computed
  if (winners && winners.length > 0) {
    const isTie = winners.length > 1

    return (
      <div className="mt-5 bg-neutral-950 text-white rounded-3xl border-2 border-neutral-900 p-5 shadow-tactile space-y-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-pattern-white opacity-10 pointer-events-none" />

        <div className="relative flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400 animate-pulse" />
            <h3 className="font-display font-bold text-xl uppercase tracking-tight text-white leading-none">
              {isTie ? 'Ganadores MVP Compartido' : 'Jugador del Partido (MVP)'}
            </h3>
          </div>
          <span className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-400 text-neutral-950">
            Oficial
          </span>
        </div>

        {/* Winner(s) Podium */}
        <div className="relative flex flex-wrap items-center justify-around gap-4 py-2">
          {winners.map((winner) => (
            <div key={winner.id} className="flex flex-col items-center text-center">
              <div className="w-18 h-18 rounded-2xl overflow-hidden bg-neutral-900 border-2 border-amber-400 relative flex items-center justify-center shadow-tactile-sm ring-4 ring-amber-400/20">
                {winner.avatar_url ? (
                  <Image
                    src={winner.avatar_url}
                    alt={winner.full_name}
                    fill
                    className="object-cover"
                    sizes="72px"
                  />
                ) : (
                  <User className="w-9 h-9 text-amber-400" />
                )}
              </div>

              <div className="mt-2.5">
                <p className="font-display font-bold text-base uppercase leading-tight text-white">
                  {winner.full_name}
                </p>
                <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-neutral-950 font-mono font-bold text-[10px]">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{winner.vote_count} {winner.vote_count === 1 ? 'voto' : 'votos'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Breakdown */}
        {allVoteResults && allVoteResults.length > 0 && (
          <div className="relative mt-2 pt-3 border-t border-white/10">
            <p className="font-mono text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">
              Detalle de Votos
            </p>
            <div className="space-y-1.5 font-mono text-xs">
              {allVoteResults.map((r) => (
                <div key={r.player_id} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white/5 border border-white/10">
                  <span className="truncate text-neutral-200">{r.full_name}</span>
                  <span className="font-bold text-amber-400">{r.vote_count} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
