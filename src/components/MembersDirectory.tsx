'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, Trophy, Calendar, User, Flame, Filter, ChevronDown, X, Sparkles, Shield, UserCheck, UserX, Trash2, Check, AlertCircle, Loader2 } from 'lucide-react'
import { approveMemberAction, rejectMemberAction, reconsiderMemberAction, deleteMemberAction, updateMemberRoleAction } from '@/app/miembros/actions'
import { SystemRole } from '@/types/database.types'
import { EmptyState } from '@/components/EmptyState'
import { formatBirthDate, calculateAge } from '@/utils/date'

export interface MemberItem {
  id: string
  full_name: string
  email: string
  avatar_url: string | null
  birth_date: string | null
  gender?: string | null
  system_role: 'admin' | 'member'
  sports_role: 'jugador' | 'hincha' | 'ambos'
  approval_status: 'pendiente' | 'aprobado' | 'rechazado'
  motivation?: string | null
  custom_attributes: Record<string, unknown>
  stats: {
    matches_played: number
    mvp_count: number
    mvp_votes_received: number
    social_events_attended: number
  } | null
}

interface MembersDirectoryProps {
  members: MemberItem[]
  isAdmin: boolean
  currentUserId: string
}

export function MembersDirectory({ members, isAdmin, currentUserId }: MembersDirectoryProps) {
  const [search, setSearch] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<string>('todos')
  const [activeMember, setActiveMember] = useState<MemberItem | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const positions = ['todos', 'Arquero', 'Defensor', 'Mediocampista', 'Delantero']

  const pendingMembers = members.filter((m) => m.approval_status === 'pendiente')
  const approvedMembers = members.filter((m) => m.approval_status === 'aprobado')
  const rejectedMembers = members.filter((m) => m.approval_status === 'rechazado')
  const [showRejected, setShowRejected] = useState(false)

  const displayedList = approvedMembers

  const filteredMembers = displayedList.filter((m) => {
    // Search filter
    const matchesSearch =
      m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())

    if (!matchesSearch) return false

    // Position filter
    if (selectedPosition === 'todos') return true

    const customPos = m.custom_attributes?.posicion
    if (Array.isArray(customPos)) {
      return customPos.includes(selectedPosition)
    }
    return customPos === selectedPosition
  })

  const handleApprove = async (userId: string) => {
    setErrorMsg(null)
    setActionLoading(userId)
    const res = await approveMemberAction(userId)
    setActionLoading(null)
    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      setSuccessMsg('Miembro admitido correctamente.')
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleReject = async (userId: string) => {
    if (!confirm('¿Rechazar esta solicitud de admisión?')) return
    setErrorMsg(null)
    setActionLoading(userId)
    const res = await rejectMemberAction(userId)
    setActionLoading(null)
    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      setSuccessMsg('Solicitud rechazada.')
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleReconsider = async (userId: string) => {
    setErrorMsg(null)
    setActionLoading(userId)
    const res = await reconsiderMemberAction(userId)
    setActionLoading(null)
    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      setSuccessMsg('Solicitud devuelta a pendientes de revisión.')
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`¿Eliminar definitivamente a ${name} del club? Esta acción no se puede deshacer.`)) return
    setErrorMsg(null)
    setActionLoading(userId)
    const res = await deleteMemberAction(userId)
    setActionLoading(null)
    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      if (activeMember?.id === userId) {
        setActiveMember(null)
      }
      setSuccessMsg(`Miembro ${name} eliminado del club.`)
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  const handleRoleChange = async (userId: string, newRole: SystemRole) => {
    const roleLabel = newRole === 'admin' ? 'Administrador' : 'Miembro regular'
    if (!confirm(`¿Confirmas asignar el rol de ${roleLabel}?`)) return
    setErrorMsg(null)
    setActionLoading(userId)
    const res = await updateMemberRoleAction(userId, newRole)
    setActionLoading(null)
    if (res?.error) {
      setErrorMsg(res.error)
    } else {
      if (activeMember) {
        setActiveMember({ ...activeMember, system_role: newRole })
      }
      setSuccessMsg(`Rol actualizado a ${roleLabel}.`)
      setTimeout(() => setSuccessMsg(null), 3000)
    }
  }

  // Format age from birth_date
  const getAgeString = (birthDate: string | null) => {
    if (!birthDate) return null
    const age = calculateAge(birthDate)
    if (age === null) return null
    const formattedDate = formatBirthDate(birthDate, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return `${age} años (${formattedDate})`
  }

  return (
    <div className="space-y-4">
      {/* Messages */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs border border-red-200 dark:border-red-800">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800">
          <Check className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Admin Section: Solicitudes de Admisión Pendientes */}
      {isAdmin && pendingMembers.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                Solicitudes de Admisión ({pendingMembers.length})
              </h3>
            </div>
            <span className="text-[10px] font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full">
              Por Aprobar
            </span>
          </div>

          <div className="divide-y divide-amber-200/60 dark:divide-amber-800/60 bg-white dark:bg-[#14161f] rounded-xl border border-amber-200/80 dark:border-amber-800/80 overflow-hidden">
            {pendingMembers.map((pm) => (
              <div key={pm.id} className="p-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{pm.full_name}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{pm.email}</p>
                  {pm.motivation ? (
                    <div className="mt-1.5 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold block text-[10px] uppercase text-amber-800 dark:text-amber-300">Motivación:</span>
                        <span className="italic">&ldquo;{pm.motivation}&rdquo;</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500 italic mt-0.5">Sin carta de motivación</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                  <button
                    type="button"
                    onClick={() => handleApprove(pm.id)}
                    disabled={actionLoading === pm.id}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 disabled:opacity-50 shadow-xs"
                  >
                    {actionLoading === pm.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Aprobar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(pm.id)}
                    disabled={actionLoading === pm.id}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-xs transition active:scale-95 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Section: Postulaciones Rechazadas */}
      {isAdmin && rejectedMembers.length > 0 && (
        <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-rose-700 dark:text-rose-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900 dark:text-rose-200">
                Postulaciones Rechazadas ({rejectedMembers.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowRejected(!showRejected)}
              className="text-[11px] font-bold text-rose-800 dark:text-rose-300 hover:text-rose-950 dark:hover:text-rose-100 underline cursor-pointer p-1"
            >
              {showRejected ? 'Ocultar' : 'Ver lista'}
            </button>
          </div>

          {showRejected && (
            <div className="divide-y divide-rose-200/60 dark:divide-rose-800/60 bg-white dark:bg-[#14161f] rounded-xl border border-rose-200/80 dark:border-rose-800/60 overflow-hidden">
              {rejectedMembers.map((rm) => (
                <div key={rm.id} className="p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{rm.full_name}</p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">{rm.email}</p>
                    {rm.motivation && (
                      <p className="text-[11px] text-neutral-600 dark:text-neutral-300 italic mt-0.5">&ldquo;{rm.motivation}&rdquo;</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                    <button
                      type="button"
                      onClick={() => handleReconsider(rm.id)}
                      disabled={actionLoading === rm.id}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                      title="Devolver a pendientes de revisión"
                    >
                      {actionLoading === rm.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      <span>Reconsiderar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(rm.id)}
                      disabled={actionLoading === rm.id}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
                    >
                      <span>Aprobar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(rm.id, rm.full_name)}
                      disabled={actionLoading === rm.id}
                      className="min-h-[36px] min-w-[36px] p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/50 text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition flex items-center justify-center active:scale-95"
                      title="Eliminar registro"
                      aria-label="Eliminar registro"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search & Position Filters */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
            <Search className="w-4 h-4 stroke-[2.5]" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar jugador por nombre o correo..."
            className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 text-base sm:text-sm bg-white dark:bg-[#14161f] focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 shadow-tactile-sm"
          />
        </div>

        <div className="relative sm:w-56 flex-shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 dark:text-neutral-400">
            <Filter className="w-4 h-4 stroke-[2.5]" />
          </div>
          <select
            value={selectedPosition}
            onChange={(e) => setSelectedPosition(e.target.value)}
            aria-label="Filtrar por posición"
            className="w-full appearance-none pl-9 pr-9 py-2.5 rounded-2xl border-2 border-neutral-900 dark:border-neutral-700 text-sm font-bold bg-white dark:bg-[#14161f] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white shadow-tactile-sm cursor-pointer"
          >
            {positions.map((pos) => (
              <option key={pos} value={pos} className="bg-white dark:bg-[#14161f] text-neutral-900 dark:text-white">
                {pos === 'todos' ? 'Todas las posiciones' : pos}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-500 dark:text-neutral-400">
            <ChevronDown className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>
      </div>

      {/* Members Count */}
      <div className="flex items-center justify-between text-xs font-mono text-neutral-500 dark:text-neutral-400 px-1 uppercase">
        <span>{filteredMembers.length} socio(s) en plantel</span>
      </div>

      {/* Members Grid / List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredMembers.length === 0 ? (
          <EmptyState
            icon={User}
            title="No se encontraron socios"
            description="Intenta ajustar el término de búsqueda o el filtro de posición."
          />
        ) : (
          filteredMembers.map((member) => {
            const stats = member.stats || {
              matches_played: 0,
              mvp_count: 0,
              mvp_votes_received: 0,
              social_events_attended: 0,
            }
            const positionsArr = Array.isArray(member.custom_attributes?.posicion)
              ? (member.custom_attributes.posicion as string[])
              : member.custom_attributes?.posicion
              ? [String(member.custom_attributes.posicion)]
              : []

            return (
              <div
                key={member.id}
                onClick={() => setActiveMember(member)}
                className="btn-tactile bg-white dark:bg-[#14161f] border-2 border-neutral-900 dark:border-neutral-700 rounded-3xl p-3.5 shadow-tactile hover:border-neutral-950 dark:hover:border-neutral-500 transition cursor-pointer flex items-center justify-between gap-3 min-h-[68px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-neutral-900 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex items-center justify-center relative flex-shrink-0 text-white">
                    {member.avatar_url ? (
                      <Image
                        src={member.avatar_url}
                        alt={member.full_name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <span className="font-display font-bold text-xl text-white">
                        {member.full_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-display font-bold text-base uppercase text-neutral-950 dark:text-white truncate leading-tight">
                        {member.full_name}
                      </h3>
                      {member.system_role === 'admin' && (
                        <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {positionsArr.length > 0 ? (
                        positionsArr.map((p) => (
                          <span
                            key={p}
                            className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                          >
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase">
                          Jugador
                        </span>
                      )}

                      {Boolean(member.custom_attributes?.numero_camiseta) && (
                        <span className="font-display font-bold text-xs text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded border border-neutral-300 dark:border-neutral-700">
                          #{String(member.custom_attributes.numero_camiseta)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats badges */}
                <div className="flex items-center gap-2 text-right flex-shrink-0 pl-1">
                  <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-neutral-900 dark:border-neutral-700 px-2 py-1 rounded-xl text-center min-w-[44px] shadow-tactile-sm">
                    <div className="flex items-center justify-center gap-0.5 text-amber-700 dark:text-amber-400 font-display font-bold text-sm leading-none">
                      <Trophy className="w-3 h-3 stroke-[2.5]" />
                      <span>{stats.mvp_count}</span>
                    </div>
                    <span className="font-mono text-[8px] font-bold text-amber-800 dark:text-amber-300 uppercase block mt-0.5">MVP</span>
                  </div>

                  <div className="bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 px-2 py-1 rounded-xl text-center min-w-[44px] shadow-tactile-sm">
                    <span className="font-display font-bold text-sm text-neutral-900 dark:text-white block leading-none">
                      {stats.matches_played}
                    </span>
                    <span className="font-mono text-[8px] font-bold text-neutral-500 dark:text-neutral-400 uppercase block mt-0.5">PJ</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Modal / Member Dossier */}
      {activeMember && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-950/70 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white dark:bg-[#14161f] w-full max-w-md rounded-t-3xl sm:rounded-3xl border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveMember(null)}
              className="btn-tactile absolute top-4 right-4 w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm transition flex items-center justify-center"
              aria-label="Cerrar ficha de socio"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 pt-1">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden bg-neutral-900 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile flex items-center justify-center relative flex-shrink-0 text-white"
              >
                {activeMember.avatar_url ? (
                  <Image
                    src={activeMember.avatar_url}
                    alt={activeMember.full_name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <span className="font-display font-bold text-3xl text-white">
                    {activeMember.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <h2 className="font-display font-bold text-xl uppercase text-neutral-950 dark:text-white leading-tight">
                  {activeMember.full_name}
                </h2>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {Array.isArray(activeMember.custom_attributes?.posicion)
                      ? (activeMember.custom_attributes.posicion as string[]).join(', ')
                      : (activeMember.custom_attributes?.posicion as string) || 'Jugador'}
                  </span>
                  {activeMember.system_role === 'admin' && (
                    <span className="font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-neutral-950 dark:bg-white text-white dark:text-neutral-950">
                      Administrador
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              <div className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm text-center">
                <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400 mx-auto mb-0.5 stroke-[2.5]" />
                <span className="font-display font-bold text-xl text-neutral-950 dark:text-white block leading-tight">
                  {activeMember.stats?.mvp_count || 0}
                </span>
                <span className="font-mono text-[10px] font-semibold tracking-wider uppercase text-amber-800 dark:text-amber-300">MVPs</span>
              </div>

              <div className="p-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm text-center">
                <Calendar className="w-4 h-4 text-neutral-700 dark:text-neutral-300 mx-auto mb-0.5 stroke-[2.5]" />
                <span className="font-display font-bold text-xl text-neutral-950 dark:text-white block leading-tight">
                  {activeMember.stats?.matches_played || 0}
                </span>
                <span className="font-mono text-[10px] font-semibold tracking-wider uppercase text-neutral-600 dark:text-neutral-400">Partidos</span>
              </div>

              <div className="p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm text-center">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mx-auto mb-0.5 stroke-[2.5]" />
                <span className="font-display font-bold text-xl text-neutral-950 dark:text-white block leading-tight">
                  {activeMember.stats?.mvp_votes_received || 0}
                </span>
                <span className="font-mono text-[10px] font-semibold tracking-wider uppercase text-blue-800 dark:text-blue-300">Votos</span>
              </div>

              <div
                className="p-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm text-center"
                title="Eventos sociales, asados y tercer tiempo"
              >
                <Flame className="w-4 h-4 text-purple-600 dark:text-purple-400 mx-auto mb-0.5 stroke-[2.5]" />
                <span className="font-display font-bold text-xl text-neutral-950 dark:text-white block leading-tight">
                  {activeMember.stats?.social_events_attended || 0}
                </span>
                <span className="font-mono text-[10px] font-semibold tracking-wider uppercase text-purple-800 dark:text-purple-300">Juntadas</span>
              </div>
            </div>

            {/* Custom Attributes & Profile Info */}
            <div className="space-y-2 pt-2 border-t-2 border-neutral-900/10 dark:border-white/10 text-xs">
              <h4 className="font-display font-bold uppercase tracking-wider text-xs text-neutral-500 dark:text-neutral-400">
                Ficha Deportiva & Datos
              </h4>

              {/* Posiciones */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-[#1a1d28] border-2 border-neutral-200 dark:border-neutral-700">
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">Posición(es):</span>
                <span className="font-display font-bold text-sm uppercase text-neutral-950 dark:text-white text-right">
                  {activeMember.custom_attributes?.posicion
                    ? Array.isArray(activeMember.custom_attributes.posicion)
                      ? (activeMember.custom_attributes.posicion as string[])?.join(', ')
                      : String(activeMember.custom_attributes.posicion)
                    : 'No especificada'}
                </span>
              </div>

              {/* Camiseta */}
              {Boolean(activeMember.custom_attributes?.numero_camiseta) && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-[#1a1d28] border-2 border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Dorsal preferido:</span>
                  <span className="font-display font-bold text-base text-neutral-950 dark:text-white">
                    #{String(activeMember.custom_attributes.numero_camiseta)}
                  </span>
                </div>
              )}

              {/* Pie hábil */}
              {Boolean(activeMember.custom_attributes?.pie_habil) && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-[#1a1d28] border-2 border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Pie hábil:</span>
                  <span className="font-display font-bold text-sm uppercase text-neutral-950 dark:text-white">
                    {String(activeMember.custom_attributes.pie_habil)}
                  </span>
                </div>
              )}

              {/* Fecha de nacimiento & Edad */}
              {activeMember.birth_date && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-[#1a1d28] border-2 border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Edad / Nacimiento:</span>
                  <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    {getAgeString(activeMember.birth_date)}
                  </span>
                </div>
              )}

              {/* Género */}
              {activeMember.gender && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-[#1a1d28] border-2 border-neutral-200 dark:border-neutral-700">
                  <span className="text-neutral-500 dark:text-neutral-400 font-medium">Categoría:</span>
                  <span className="font-display font-bold text-xs uppercase text-neutral-950 dark:text-white">
                    {activeMember.gender}
                  </span>
                </div>
              )}
            </div>

            {/* Admin Management Section */}
            {isAdmin && (
              <div className="pt-3 border-t-2 border-neutral-900/10 dark:border-white/10 space-y-2">
                <h4 className="font-display font-bold uppercase tracking-wider text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300 stroke-[2.5]" />
                  <span>Gestión de Miembro (Admin)</span>
                </h4>

                <div className="flex flex-col gap-2">
                  {/* Assign / Remove Admin Role */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-[#1a1d28] border-2 border-neutral-200 dark:border-neutral-700">
                    <div>
                      <p className="font-display font-bold text-xs uppercase text-neutral-950 dark:text-white">
                        Rol: <span>{activeMember.system_role === 'admin' ? 'Administrador' : 'Socio'}</span>
                      </p>
                      <p className="font-mono text-[9px] text-neutral-500 dark:text-neutral-400">
                        {activeMember.system_role === 'admin'
                          ? 'Acceso total de administración'
                          : 'Acceso estándar de socio'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRoleChange(activeMember.id, activeMember.system_role === 'admin' ? 'member' : 'admin')}
                      disabled={actionLoading === activeMember.id}
                      className={`btn-tactile min-h-[40px] py-1.5 px-3.5 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 font-display font-bold text-xs uppercase tracking-wider transition active:scale-95 flex items-center gap-1.5 shadow-tactile-sm ${
                        activeMember.system_role === 'admin'
                          ? 'bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-950 dark:text-white'
                          : 'bg-neutral-950 dark:bg-white hover:bg-neutral-900 dark:hover:bg-neutral-100 text-white dark:text-neutral-950'
                      }`}
                    >
                      {actionLoading === activeMember.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span>{activeMember.system_role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}</span>
                    </button>
                  </div>

                  {/* Delete Member */}
                  {activeMember.id !== currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(activeMember.id, activeMember.full_name)}
                      disabled={actionLoading === activeMember.id}
                      className="btn-tactile w-full min-h-[44px] py-2 px-3 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-98 disabled:opacity-50 shadow-tactile-sm"
                    >
                      {actionLoading === activeMember.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span>Eliminar Miembro del Club</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveMember(null)}
              className="btn-tactile w-full min-h-[44px] py-2.5 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-neutral-950 dark:bg-white hover:bg-neutral-900 dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-display font-bold text-xs uppercase tracking-wider transition active:scale-98 shadow-tactile-sm"
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
