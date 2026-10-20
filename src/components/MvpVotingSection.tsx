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

  // Eligible voting candidates (all confirmed attendees except oneself to disable self-voting)
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
      <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-4">
        {/* Banner Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900 leading-tight">
                Votación de Jugador del Partido (MVP)
              </h3>
              <p className="text-[11px] text-amber-800 font-medium">
                Votación anónima abierta a los asistentes
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 animate-pulse">
            Votación Abierta
          </span>
        </div>

        {mvpDeadline && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Cierra el:{' '}
              {new Date(mvpDeadline).toLocaleDateString('es-AR', {
                weekday: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* State: Confirmed user has NOT voted yet */}
        {isConfirmedAttendee && !hasVoted && !successMsg && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-neutral-800">
              Elige al mejor jugador del encuentro (autovoto deshabilitado):
            </p>

            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
              {eligibleCandidates.map((cand) => {
                const isSelected = selectedPlayerId === cand.id

                return (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => setSelectedPlayerId(cand.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition text-left active:scale-[0.99] ${
                      isSelected
                        ? 'border-amber-500 bg-amber-100/70 shadow-xs'
                        : 'border-neutral-200 bg-white hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-neutral-200 relative flex items-center justify-center">
                        {cand.avatar_url ? (
                          <Image
                            src={cand.avatar_url}
                            alt={cand.full_name}
                            fill
                            className="object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <User className="w-4 h-4 text-neutral-400" />
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-bold text-neutral-900">
                          {cand.full_name}
                        </p>
                        <p className="text-[10px] text-neutral-500 capitalize">
                          {cand.posicion || cand.sports_role}
                          {cand.numero_camiseta ? ` • #${cand.numero_camiseta}` : ''}
                        </p>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-amber-600 bg-amber-500 text-white'
                          : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={handleVote}
              disabled={loading || !selectedPlayerId}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-xs text-white shadow-sm transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
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
          <div className="p-3.5 rounded-xl bg-white/90 border border-amber-200 text-center space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-neutral-900">
              ¡Tu voto ha sido registrado!
            </p>
            <p className="text-[11px] text-neutral-500">
              Los votos son anónimos. Los resultados se publicarán al finalizar el plazo.
            </p>
          </div>
        )}

        {/* State: User did not attend */}
        {!isConfirmedAttendee && (
          <div className="p-3 rounded-xl bg-white/70 border border-amber-200 text-center">
            <p className="text-xs text-neutral-600">
              Solo los jugadores que asistieron al partido pueden votar por el MVP.
            </p>
          </div>
        )}

        {/* Admin option to close voting early */}
        {isAdmin && (
          <div className="pt-2 border-t border-amber-200">
            <button
              type="button"
              onClick={handleCloseVoting}
              disabled={adminClosing}
              className="w-full py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
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
      <div className="mt-6 bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between border-b border-amber-400/40 pb-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-200 animate-pulse" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-amber-100">
              {isTie ? 'Ganadores MVP Compartido' : 'Jugador del Partido (MVP)'}
            </h3>
          </div>
          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/20 text-white">
            Oficial
          </span>
        </div>

        {/* Winner(s) Podium */}
        <div className="flex flex-wrap items-center justify-around gap-3 py-2">
          {winners.map((winner) => (
            <div key={winner.id} className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white/20 border-2 border-amber-200 relative flex items-center justify-center shadow-lg">
                {winner.avatar_url ? (
                  <Image
                    src={winner.avatar_url}
                    alt={winner.full_name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>

              <div className="mt-2">
                <p className="font-extrabold text-sm leading-tight text-white drop-shadow-xs">
                  {winner.full_name}
                </p>
                <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-extrabold text-[10px]">
                  <Flame className="w-3 h-3" />
                  <span>{winner.vote_count} {winner.vote_count === 1 ? 'voto' : 'votos'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Breakdown Accordion / List */}
        {allVoteResults && allVoteResults.length > 0 && (
          <div className="mt-2 pt-2 border-t border-amber-400/40">
            <p className="text-[11px] font-bold text-amber-200 mb-1.5 uppercase tracking-wider">
              Detalle de Votos
            </p>
            <div className="space-y-1 text-xs">
              {allVoteResults.map((r) => (
                <div key={r.player_id} className="flex items-center justify-between py-0.5 text-amber-50">
                  <span className="font-medium truncate">{r.full_name}</span>
                  <span className="font-bold font-mono">{r.vote_count}</span>
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
