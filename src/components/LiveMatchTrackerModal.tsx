'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Copy,
  Check,
  Radio,
  Trophy,
  Loader2,
} from 'lucide-react'
import {
  updateLiveScoreAction,
  recordMatchResultAction,
  PlayerStatPayload,
} from '@/app/eventos/team-actions'
import { createClient } from '@/utils/supabase/client'

export interface LiveMatchPlayer {
  userId: string
  fullName: string
  avatarUrl: string | null
  position: string
  goals?: number
  assists?: number
  saves?: number
  ownGoals?: number
}

export interface LiveMatchTeam {
  id: string
  name: string
  color: string
  score: number | null
  players: LiveMatchPlayer[]
}

interface MatchEventLog {
  id: string
  sec: number
  desc: string
  type: 'goal' | 'goal_minus' | 'assist' | 'assist_minus' | 'save' | 'save_minus'
  teamId: string
  playerId: string
  playerName: string
  teamName: string
}

interface LiveMatchTrackerModalProps {
  eventId: string
  eventTitle: string
  eventDate?: string
  eventLocation?: string
  isOpen: boolean
  onClose: () => void
  teams: LiveMatchTeam[]
  onMatchFinalized?: () => void
}

export function LiveMatchTrackerModal({
  eventId,
  eventTitle,
  eventDate,
  eventLocation,
  isOpen,
  onClose,
  teams,
  onMatchFinalized,
}: LiveMatchTrackerModalProps) {
  const team1 = teams[0]
  const team2 = teams[1]

  const storageKey = `campapp_live_match_${eventId}`

  // Active tab in tracker: team1 or team2
  const [activeTeamTab, setActiveTeamTab] = useState<'a' | 'b'>('a')

  // Timer state
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [accumulatedSecs, setAccumulatedSecs] = useState<number>(0)
  const [displaySecs, setDisplaySecs] = useState<number>(0)
  const [period, setPeriod] = useState<string>('1T')

  // Scores state
  const [scores, setScores] = useState<Record<string, number>>(() => ({
    [team1?.id || 't1']: team1?.score ?? 0,
    [team2?.id || 't2']: team2?.score ?? 0,
  }))

  // Player stats map: userId -> { goals, assists, saves, ownGoals }
  const [stats, setStats] = useState<
    Record<string, { goals: number; assists: number; saves: number; ownGoals: number }>
  >(() => {
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

  // Action log for events & undo
  const [eventLog, setEventLog] = useState<MatchEventLog[]>([])

  // UI state
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false)
  const [showConfirmFinish, setShowConfirmFinish] = useState<boolean>(false)
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Supabase client for realtime broadcast
  const supabase = useMemo(() => createClient(), [])

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur))
    }, 2200)
  }, [])

  // 1. Load from localStorage when opened
  useEffect(() => {
    if (!isOpen) return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.scores) setScores(parsed.scores)
        if (parsed.stats) setStats(parsed.stats)
        if (parsed.eventLog) setEventLog(parsed.eventLog)
        if (parsed.period) setPeriod(parsed.period)
        if (typeof parsed.accumulatedSecs === 'number') {
          setAccumulatedSecs(parsed.accumulatedSecs)
          let currentTotal = parsed.accumulatedSecs
          if (parsed.isRunning && parsed.startedAt) {
            currentTotal += Math.floor((Date.now() - parsed.startedAt) / 1000)
            setStartedAt(parsed.startedAt)
            setIsRunning(true)
          } else {
            setIsRunning(false)
            setStartedAt(null)
          }
          setDisplaySecs(currentTotal)
        }
      }
    } catch (e) {
      console.warn('Error reading live match storage:', e)
    }
  }, [isOpen, storageKey])

  // 2. Save state to localStorage whenever changed
  useEffect(() => {
    if (!isOpen) return
    try {
      const payload = {
        scores,
        stats,
        eventLog,
        period,
        accumulatedSecs,
        isRunning,
        startedAt,
        savedAt: Date.now(),
      }
      localStorage.setItem(storageKey, JSON.stringify(payload))
    } catch {}
  }, [isOpen, storageKey, scores, stats, eventLog, period, accumulatedSecs, isRunning, startedAt])

  // 3. Robust Timer tick with timestamp calculation (immune to phone lock)
  useEffect(() => {
    if (!isRunning || !startedAt) {
      setDisplaySecs(accumulatedSecs)
      return
    }

    const interval = setInterval(() => {
      const elapsedSinceStart = Math.floor((Date.now() - startedAt) / 1000)
      setDisplaySecs(accumulatedSecs + Math.max(0, elapsedSinceStart))
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, startedAt, accumulatedSecs])

  const toggleTimer = () => {
    if (isRunning) {
      // Pause
      const elapsedSinceStart = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0
      const newAccumulated = accumulatedSecs + elapsedSinceStart
      setAccumulatedSecs(newAccumulated)
      setDisplaySecs(newAccumulated)
      setIsRunning(false)
      setStartedAt(null)
      showToast('⏸ Cronómetro pausado')
    } else {
      // Start / Resume
      setStartedAt(Date.now())
      setIsRunning(true)
      showToast('▶ Cronómetro en marcha')
    }
  }

  const addOneMinute = () => {
    setAccumulatedSecs((prev) => {
      const next = prev + 60
      setDisplaySecs(next)
      return next
    })
    showToast('+1 minuto agregado')
  }

  const resetTimer = () => {
    if (confirm('¿Reiniciar el cronómetro a 00:00?')) {
      setIsRunning(false)
      setStartedAt(null)
      setAccumulatedSecs(0)
      setDisplaySecs(0)
      showToast('↺ Cronómetro reiniciado')
    }
  }

  const formatTimer = (sec: number) => {
    const s = Math.max(0, Number(sec) || 0)
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, '0')
      .slice(-2)
    const r = Math.floor(s % 60)
      .toString()
      .padStart(2, '0')
    return `${m}:${r}`
  }

  // Realtime Broadcast helper
  const broadcastScore = (currentScores: Record<string, number>) => {
    try {
      const channel = supabase.channel(`event-realtime-${eventId}`)
      channel.send({
        type: 'broadcast',
        event: 'score-update',
        payload: {
          scores: currentScores,
          updatedAt: new Date().toISOString(),
        },
      })
    } catch {}
  }

  // Quick Stat handler
  const handleStatChange = (
    team: LiveMatchTeam,
    player: LiveMatchPlayer,
    stat: 'goals' | 'assists' | 'saves',
    delta: number
  ) => {
    const currentVal = stats[player.userId]?.[stat] || 0
    const nextVal = Math.max(0, currentVal + delta)
    const diff = nextVal - currentVal
    if (diff === 0) return

    // 1. Update Player Stats
    setStats((prev) => ({
      ...prev,
      [player.userId]: {
        ...(prev[player.userId] || { goals: 0, assists: 0, saves: 0, ownGoals: 0 }),
        [stat]: nextVal,
      },
    }))

    // 2. If Goal, update Score and Broadcast
    let updatedScores = { ...scores }
    if (stat === 'goals') {
      const curScore = scores[team.id] ?? 0
      const nextScore = Math.max(0, curScore + delta)
      updatedScores = { ...scores, [team.id]: nextScore }
      setScores(updatedScores)
      broadcastScore(updatedScores)

      // Light haptic feedback if available on device
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([60, 40, 60])
      }
    }

    // 3. Add to event log
    const logId = 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
    const logType: MatchEventLog['type'] =
      stat === 'goals'
        ? (delta > 0 ? 'goal' : 'goal_minus')
        : stat === 'assists'
        ? (delta > 0 ? 'assist' : 'assist_minus')
        : (delta > 0 ? 'save' : 'save_minus')

    let icon = '⚽'
    let label = 'Gol'
    if (stat === 'assists') {
      icon = '🎯'
      label = 'Asistencia'
    } else if (stat === 'saves') {
      icon = '🧤'
      label = 'Atajada'
    }

    if (delta < 0) {
      label = `${label} anulado`
    }

    const logDesc = `${icon} ${label} de ${player.fullName} (${team.name})`

    setEventLog((prev) => [
      {
        id: logId,
        sec: displaySecs,
        desc: logDesc,
        type: logType,
        teamId: team.id,
        playerId: player.userId,
        playerName: player.fullName,
        teamName: team.name,
      },
      ...prev,
    ])

    showToast(logDesc)
  }

  // Undo Last Action
  const handleUndoLastAction = () => {
    if (eventLog.length === 0) {
      showToast('No hay acciones para deshacer')
      return
    }

    const lastEvent = eventLog[0]
    const remainingEvents = eventLog.slice(1)
    setEventLog(remainingEvents)

    // Revert stat
    const statKey = lastEvent.type.startsWith('goal')
      ? 'goals'
      : lastEvent.type.startsWith('assist')
      ? 'assists'
      : 'saves'

    const isMinus = lastEvent.type.endsWith('_minus')
    const revertDelta = isMinus ? 1 : -1

    setStats((prev) => {
      const curVal = prev[lastEvent.playerId]?.[statKey] || 0
      return {
        ...prev,
        [lastEvent.playerId]: {
          ...(prev[lastEvent.playerId] || { goals: 0, assists: 0, saves: 0, ownGoals: 0 }),
          [statKey]: Math.max(0, curVal + revertDelta),
        },
      }
    })

    if (statKey === 'goals') {
      setScores((prev) => {
        const curScore = prev[lastEvent.teamId] || 0
        const updated = {
          ...prev,
          [lastEvent.teamId]: Math.max(0, curScore + revertDelta),
        }
        broadcastScore(updated)
        return updated
      })
    }

    showToast(`↩ Deshecho: ${lastEvent.desc}`)
  }

  // Sync to database
  const handleSyncToDatabase = async () => {
    setIsSyncing(true)
    try {
      const teamScoresPayload = teams.map((t) => ({
        teamId: t.id,
        score: scores[t.id] ?? 0,
      }))

      const playerStatsPayload: PlayerStatPayload[] = []
      teams.forEach((t) => {
        t.players.forEach((p) => {
          const st = stats[p.userId] || { goals: 0, assists: 0, saves: 0, ownGoals: 0 }
          playerStatsPayload.push({
            userId: p.userId,
            teamId: t.id,
            goals: st.goals,
            assists: st.assists,
            saves: st.saves,
            ownGoals: st.ownGoals,
          })
        })
      })

      const res = await updateLiveScoreAction(eventId, teamScoresPayload, playerStatsPayload, true)
      if (res?.error) {
        showToast(`❌ Error: ${res.error}`)
      } else {
        showToast('✓ Marcador sincronizado en vivo')
        broadcastScore(scores)
      }
    } catch {
      showToast('❌ Error de conexión al sincronizar')
    } finally {
      setIsSyncing(false)
    }
  }

  // Finalize Match officially
  const handleFinalizeMatch = async () => {
    setIsFinalizing(true)
    try {
      const teamScoresPayload = teams.map((t) => ({
        teamId: t.id,
        score: scores[t.id] ?? 0,
      }))

      const playerStatsPayload: PlayerStatPayload[] = []
      teams.forEach((t) => {
        t.players.forEach((p) => {
          const st = stats[p.userId] || { goals: 0, assists: 0, saves: 0, ownGoals: 0 }
          playerStatsPayload.push({
            userId: p.userId,
            teamId: t.id,
            goals: st.goals,
            assists: st.assists,
            saves: st.saves,
            ownGoals: st.ownGoals,
          })
        })
      })

      const res = await recordMatchResultAction(eventId, teamScoresPayload, playerStatsPayload)
      if (res?.error) {
        showToast(`❌ Error: ${res.error}`)
      } else {
        // Clear local storage
        localStorage.removeItem(storageKey)
        showToast('🏆 ¡Partido finalizado y rankings actualizados!')
        setShowConfirmFinish(false)
        onMatchFinalized?.()
        setTimeout(() => {
          onClose()
        }, 800)
      }
    } catch {
      showToast('❌ Error al finalizar partido')
    } finally {
      setIsFinalizing(false)
    }
  }

  // Copy WhatsApp summary message
  const handleCopyWhatsAppSummary = async () => {
    const s1 = scores[team1?.id || 't1'] ?? 0
    const s2 = scores[team2?.id || 't2'] ?? 0

    // Goals breakdown
    const scorersMap: Record<string, { name: string; team: string; count: number }> = {}
    teams.forEach((t) => {
      t.players.forEach((p) => {
        const g = stats[p.userId]?.goals || 0
        if (g > 0) {
          scorersMap[p.userId] = { name: p.fullName, team: t.name, count: g }
        }
      })
    })

    const scorersList = Object.values(scorersMap).sort((a, b) => b.count - a.count)

    // Assists breakdown
    const assistersMap: Record<string, { name: string; count: number }> = {}
    teams.forEach((t) => {
      t.players.forEach((p) => {
        const a = stats[p.userId]?.assists || 0
        if (a > 0) {
          assistersMap[p.userId] = { name: p.fullName, count: a }
        }
      })
    })
    const assistersList = Object.values(assistersMap).sort((a, b) => b.count - a.count)

    // Saves breakdown
    const savesMap: Record<string, { name: string; count: number }> = {}
    teams.forEach((t) => {
      t.players.forEach((p) => {
        const s = stats[p.userId]?.saves || 0
        if (s > 0) {
          savesMap[p.userId] = { name: p.fullName, count: s }
        }
      })
    })
    const savesList = Object.values(savesMap).sort((a, b) => b.count - a.count)

    const lines: string[] = [
      `🏆 *INFORME DE PARTIDO — ${eventTitle.toUpperCase()}*`,
      ...(eventDate ? [`📅 ${eventDate}`] : []),
      ...(eventLocation ? [`🏟️ ${eventLocation}`] : []),
      '',
      `⚔️ *${team1?.name || 'Equipo 1'} vs ${team2?.name || 'Equipo 2'}*`,
      `🔥 *RESULTADO FINAL: ${team1?.name} ${s1} — ${s2} ${team2?.name}*`,
      '',
      '⚽ *GOLEADORES:*',
      ...(scorersList.length > 0
        ? scorersList.map((sc) => `• ${sc.name} (${sc.team}): ${sc.count} gol(es)`)
        : ['• Sin goles registrados']),
      '',
      '🎯 *ASISTENCIAS:*',
      ...(assistersList.length > 0
        ? assistersList.map((asst) => `• ${asst.name}: ${asst.count}`)
        : ['• Sin asistencias']),
      '',
      '🧤 *ATAJADAS:*',
      ...(savesList.length > 0
        ? savesList.map((sv) => `• ${sv.name}: ${sv.count}`)
        : ['• Sin atajadas registradas']),
      '',
      '📱 *Registrado en vivo desde CampApp*',
    ]

    const textToCopy = lines.join('\n')

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopiedSummary(true)
      showToast('✓ Resumen copiado para WhatsApp')
      setTimeout(() => setCopiedSummary(false), 2500)
    } catch {
      showToast('❌ No se pudo copiar al portapapeles')
    }
  }

  if (!isOpen) return null

  const activeTeam = activeTeamTab === 'a' ? team1 : team2
  const score1 = scores[team1?.id || 't1'] ?? 0
  const score2 = scores[team2?.id || 't2'] ?? 0

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex flex-col justify-end sm:justify-center items-center sm:p-4">
      {/* Toast message floating */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-neutral-900 border-2 border-amber-500 text-amber-300 px-4 py-2 rounded-2xl shadow-tactile text-xs font-bold font-mono animate-bounce">
          {toastMessage}
        </div>
      )}

      <div className="bg-neutral-950 border-2 border-neutral-800 text-white w-full sm:max-w-xl max-h-[92vh] sm:rounded-3xl rounded-t-3xl shadow-tactile flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-3.5 sm:p-4 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm">
              📋
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-tight text-white truncate">
                  Planillero en Vivo
                </h2>
                {isRunning && (
                  <span className="flex items-center gap-1 font-mono text-[9px] uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse font-bold">
                    <Radio className="w-2.5 h-2.5" />
                    En Juego
                  </span>
                )}
              </div>
              <p className="font-mono text-[10px] text-neutral-400 truncate">
                {eventTitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Central Stopwatch & Big Scoreboard */}
        <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 p-4 border-b border-neutral-800 space-y-3">
          {/* Digital Timer */}
          <div className="flex items-center justify-between bg-neutral-950/80 rounded-2xl p-2.5 sm:p-3 border border-neutral-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase text-neutral-400 tracking-wider">
                  Cronómetro
                </span>
                <span className="font-mono font-bold text-2xl sm:text-3xl text-amber-400 tracking-wider">
                  {formatTimer(displaySecs)}
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 self-center">
                {period}
              </span>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTimer}
                className={`py-2 px-3 rounded-xl font-display font-bold text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-tactile-sm ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-600 text-neutral-950'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-neutral-950'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Iniciar</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={addOneMinute}
                className="py-2 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-mono text-xs font-bold transition active:scale-95"
                title="Sumar 1 minuto"
              >
                +1m
              </button>

              <button
                type="button"
                onClick={resetTimer}
                className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white border border-neutral-700 transition active:scale-95"
                title="Reiniciar cronómetro"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Big Scoreboard Banner */}
          <div className="grid grid-cols-5 items-center bg-neutral-900/90 rounded-2xl p-3 border border-neutral-800">
            {/* Team 1 */}
            <div
              onClick={() => setActiveTeamTab('a')}
              className={`col-span-2 text-center p-2 rounded-xl cursor-pointer transition ${
                activeTeamTab === 'a' ? 'bg-neutral-800/90 ring-2 ring-amber-400/50' : 'hover:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-neutral-500"
                  style={{ backgroundColor: team1?.color || '#ffffff' }}
                />
                <span className="font-display font-bold text-xs uppercase text-neutral-200 truncate max-w-[110px]">
                  {team1?.name}
                </span>
              </div>
              <span className="font-display font-extrabold text-4xl sm:text-5xl text-white">
                {score1}
              </span>
            </div>

            {/* VS divider */}
            <div className="col-span-1 text-center font-mono text-xs font-bold text-neutral-500">
              VS
            </div>

            {/* Team 2 */}
            <div
              onClick={() => setActiveTeamTab('b')}
              className={`col-span-2 text-center p-2 rounded-xl cursor-pointer transition ${
                activeTeamTab === 'b' ? 'bg-neutral-800/90 ring-2 ring-amber-400/50' : 'hover:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full border border-neutral-500"
                  style={{ backgroundColor: team2?.color || '#111111' }}
                />
                <span className="font-display font-bold text-xs uppercase text-neutral-200 truncate max-w-[110px]">
                  {team2?.name}
                </span>
              </div>
              <span className="font-display font-extrabold text-4xl sm:text-5xl text-white">
                {score2}
              </span>
            </div>
          </div>

          {/* Quick sync & Undo bar */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={handleUndoLastAction}
              disabled={eventLog.length === 0}
              className="py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:pointer-events-none text-neutral-300 font-mono text-[11px] font-bold flex items-center gap-1.5 border border-neutral-700 transition active:scale-95"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Deshacer {eventLog.length > 0 && `(${eventLog.length})`}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncToDatabase}
              disabled={isSyncing}
              className="py-1.5 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-mono text-[11px] font-bold flex items-center gap-1.5 border border-blue-500/40 transition active:scale-95"
            >
              {isSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-blue-400" />
              )}
              <span>Sincronizar en Vivo</span>
            </button>
          </div>
        </div>

        {/* Team Selector Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-900/60">
          <button
            type="button"
            onClick={() => setActiveTeamTab('a')}
            className={`flex-1 py-2.5 px-3 font-display font-bold text-xs uppercase flex items-center justify-center gap-2 border-b-2 transition ${
              activeTeamTab === 'a'
                ? 'border-amber-400 text-amber-300 bg-neutral-800/40'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full border border-neutral-400"
              style={{ backgroundColor: team1?.color || '#ffffff' }}
            />
            <span className="truncate">{team1?.name}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-neutral-800">
              {score1}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTeamTab('b')}
            className={`flex-1 py-2.5 px-3 font-display font-bold text-xs uppercase flex items-center justify-center gap-2 border-b-2 transition ${
              activeTeamTab === 'b'
                ? 'border-amber-400 text-amber-300 bg-neutral-800/40'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full border border-neutral-400"
              style={{ backgroundColor: team2?.color || '#111111' }}
            />
            <span className="truncate">{team2?.name}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-neutral-800">
              {score2}
            </span>
          </button>
        </div>

        {/* Scrollable Player Roster with Touch Buttons */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 divide-y divide-neutral-800/80 space-y-2">
          {activeTeam?.players.map((p) => {
            const curStats = stats[p.userId] || { goals: 0, assists: 0, saves: 0, ownGoals: 0 }
            const isGoalkeeper =
              p.position.toLowerCase().includes('arquer') ||
              p.position.toLowerCase().includes('porter') ||
              p.position.toLowerCase().includes('gk')

            return (
              <div
                key={p.userId}
                className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2"
              >
                {/* Player info */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl overflow-hidden bg-neutral-800 relative flex items-center justify-center flex-shrink-0 border border-neutral-700">
                    {p.avatarUrl ? (
                      <Image src={p.avatarUrl} alt={p.fullName} fill className="object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-neutral-400">
                        {p.fullName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-white truncate">{p.fullName}</p>
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700 inline-block">
                      {p.position || 'Jugador'}
                    </span>
                  </div>
                </div>

                {/* Stat Counters & Touch Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                  {/* GOL */}
                  <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
                    <div className="flex flex-col items-center px-1">
                      <span className="font-mono text-[8px] uppercase text-emerald-400 font-bold">
                        GOL
                      </span>
                      <span className="font-mono font-bold text-sm text-emerald-300">
                        {curStats.goals}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleStatChange(activeTeam, p, 'goals', 1)}
                        className="w-7 h-6 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-neutral-950 font-bold text-xs flex items-center justify-center transition active:scale-95"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatChange(activeTeam, p, 'goals', -1)}
                        disabled={curStats.goals <= 0}
                        className="w-7 h-5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none text-neutral-400 text-xs flex items-center justify-center transition active:scale-95"
                      >
                        −
                      </button>
                    </div>
                  </div>

                  {/* ASISTENCIA */}
                  <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
                    <div className="flex flex-col items-center px-1">
                      <span className="font-mono text-[8px] uppercase text-blue-400 font-bold">
                        ASIST
                      </span>
                      <span className="font-mono font-bold text-sm text-blue-300">
                        {curStats.assists}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleStatChange(activeTeam, p, 'assists', 1)}
                        className="w-7 h-6 rounded-lg bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-neutral-950 font-bold text-xs flex items-center justify-center transition active:scale-95"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatChange(activeTeam, p, 'assists', -1)}
                        disabled={curStats.assists <= 0}
                        className="w-7 h-5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none text-neutral-400 text-xs flex items-center justify-center transition active:scale-95"
                      >
                        −
                      </button>
                    </div>
                  </div>

                  {/* ATAJADA (highlighted for GK) */}
                  <div className={`flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1 ${isGoalkeeper ? 'ring-1 ring-amber-500/40 bg-amber-500/5' : ''}`}>
                    <div className="flex flex-col items-center px-1">
                      <span className="font-mono text-[8px] uppercase text-amber-400 font-bold">
                        ATAJ
                      </span>
                      <span className="font-mono font-bold text-sm text-amber-300">
                        {curStats.saves}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleStatChange(activeTeam, p, 'saves', 1)}
                        className="w-7 h-6 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-neutral-950 font-bold text-xs flex items-center justify-center transition active:scale-95"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatChange(activeTeam, p, 'saves', -1)}
                        disabled={curStats.saves <= 0}
                        className="w-7 h-5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none text-neutral-400 text-xs flex items-center justify-center transition active:scale-95"
                      >
                        −
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Footer: WhatsApp Summary & Finalize Match */}
        <div className="p-3.5 sm:p-4 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyWhatsAppSummary}
            className="py-2.5 px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-display font-bold text-xs uppercase flex items-center gap-1.5 border border-neutral-700 transition active:scale-95"
          >
            {copiedSummary ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-amber-400" />
                <span>WhatsApp</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowConfirmFinish(true)}
            className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-display font-bold text-xs uppercase flex items-center gap-1.5 transition active:scale-95 shadow-tactile-sm"
          >
            <Trophy className="w-4 h-4" />
            <span>Finalizar Partido</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal to Finalize Match */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border-2 border-neutral-700 rounded-3xl p-5 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto text-xl">
              🏆
            </div>
            <div>
              <h3 className="font-display font-bold text-base uppercase text-white">
                ¿Finalizar Partido Oficial?
              </h3>
              <p className="text-xs text-neutral-400 mt-1 font-sans">
                Marcador final: <strong className="text-white">{team1?.name} {score1} — {score2} {team2?.name}</strong>.
                Se actualizarán los goles, asistencias y rankings individuales del club, y se abrirá la votación de MVP.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmFinish(false)}
                disabled={isFinalizing}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 font-display font-bold text-xs uppercase hover:bg-neutral-700"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleFinalizeMatch}
                disabled={isFinalizing}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-display font-bold text-xs uppercase flex items-center justify-center gap-1.5 shadow-tactile-sm"
              >
                {isFinalizing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Sí, Finalizar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
