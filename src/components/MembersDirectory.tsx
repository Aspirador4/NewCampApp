'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Search, Trophy, Calendar, User, X, Sparkles } from 'lucide-react'

export interface MemberItem {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  birth_date: string | null
  system_role: 'admin' | 'member'
  sports_role: 'jugador' | 'hincha' | 'ambos'
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
}

export function MembersDirectory({ members }: MembersDirectoryProps) {
  const [search, setSearch] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<string>('todos')
  const [activeMember, setActiveMember] = useState<MemberItem | null>(null)

  const positions = ['todos', 'Arquero', 'Defensor', 'Mediocampista', 'Delantero']

  const filteredMembers = members.filter((m) => {
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

  // Format age from birth_date
  const getAgeString = (birthDate: string | null) => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const now = new Date()
    let age = now.getFullYear() - birth.getFullYear()
    const m = now.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--
    }
    const formattedDate = birth.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return `${age} años (${formattedDate})`
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o apodo..."
          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-neutral-900 shadow-xs"
        />
      </div>

      {/* Position Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
        {positions.map((pos) => {
          const isActive = selectedPosition === pos
          return (
            <button
              key={pos}
              type="button"
              onClick={() => setSelectedPosition(pos)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition active:scale-95 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200/80 hover:bg-neutral-50'
              }`}
            >
              {pos === 'todos' ? 'Todos los roles' : pos}
            </button>
          )
        })}
      </div>

      {/* Members Count */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-1">
        <span>{filteredMembers.length} socio(s) encontrado(s)</span>
      </div>

      {/* Members Grid / List */}
      <div className="grid grid-cols-1 gap-2.5">
        {filteredMembers.map((member) => {
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
              className="bg-white border border-neutral-200/90 rounded-2xl p-3.5 shadow-xs hover:border-emerald-500 transition cursor-pointer active:scale-[0.99] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 flex items-center justify-center relative flex-shrink-0">
                  {member.avatar_url ? (
                    <Image
                      src={member.avatar_url}
                      alt={member.full_name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <span className="font-bold text-sm text-neutral-600">
                      {member.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-bold text-sm text-neutral-900 truncate leading-tight">
                      {member.full_name}
                    </h3>
                    {member.system_role === 'admin' && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-neutral-900 text-emerald-400">
                        Admin
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {positionsArr.length > 0 ? (
                      positionsArr.map((p) => (
                        <span
                          key={p}
                          className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-1.5 py-0.5 rounded-md"
                        >
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-neutral-500 capitalize">
                        {member.sports_role}
                      </span>
                    )}

                    {Boolean(member.custom_attributes?.numero_camiseta) && (
                      <span className="text-[10px] font-extrabold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded-md">
                        #{String(member.custom_attributes.numero_camiseta)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-2 text-right flex-shrink-0">
                <div className="bg-amber-50 border border-amber-200 px-2 py-1 rounded-xl text-center min-w-[42px]">
                  <div className="flex items-center justify-center gap-0.5 text-amber-700 font-black text-xs">
                    <Trophy className="w-3 h-3" />
                    <span>{stats.mvp_count}</span>
                  </div>
                  <span className="text-[8px] font-bold text-amber-600 uppercase block">MVP</span>
                </div>

                <div className="bg-neutral-100 border border-neutral-200 px-2 py-1 rounded-xl text-center min-w-[42px]">
                  <span className="font-black text-xs text-neutral-800 block">
                    {stats.matches_played}
                  </span>
                  <span className="text-[8px] font-bold text-neutral-500 uppercase block">PJ</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Member Profile Drawer / Modal */}
      {activeMember && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200 relative">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveMember(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 pt-1">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-100 border-2 border-emerald-500 shadow-md flex items-center justify-center relative flex-shrink-0">
                {activeMember.avatar_url ? (
                  <Image
                    src={activeMember.avatar_url}
                    alt={activeMember.full_name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                ) : (
                  <span className="font-extrabold text-2xl text-neutral-600">
                    {activeMember.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-lg font-black text-neutral-900 leading-tight">
                  {activeMember.full_name}
                </h2>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {activeMember.sports_role}
                  </span>
                  {activeMember.system_role === 'admin' && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-900 text-emerald-400">
                      Administrador
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <Trophy className="w-4 h-4 text-amber-600 mx-auto mb-0.5" />
                <span className="text-sm font-black text-amber-900 block">
                  {activeMember.stats?.mvp_count || 0}
                </span>
                <span className="text-[9px] font-bold uppercase text-amber-700">MVPs</span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-100 border border-neutral-200 text-center">
                <Calendar className="w-4 h-4 text-neutral-600 mx-auto mb-0.5" />
                <span className="text-sm font-black text-neutral-900 block">
                  {activeMember.stats?.matches_played || 0}
                </span>
                <span className="text-[9px] font-bold uppercase text-neutral-600">Partidos</span>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <Sparkles className="w-4 h-4 text-blue-600 mx-auto mb-0.5" />
                <span className="text-sm font-black text-blue-900 block">
                  {activeMember.stats?.mvp_votes_received || 0}
                </span>
                <span className="text-[9px] font-bold uppercase text-blue-700">Votos</span>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <User className="w-4 h-4 text-purple-600 mx-auto mb-0.5" />
                <span className="text-sm font-black text-purple-900 block">
                  {activeMember.stats?.social_events_attended || 0}
                </span>
                <span className="text-[9px] font-bold uppercase text-purple-700">Social</span>
              </div>
            </div>

            {/* Custom Attributes & Profile Info */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-100 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-neutral-400">
                Ficha Deportiva & Datos
              </h4>

              {/* Posiciones */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                <span className="text-neutral-500 font-medium">Posición(es):</span>
                <span className="font-bold text-neutral-900 text-right">
                  {activeMember.custom_attributes?.posicion
                    ? Array.isArray(activeMember.custom_attributes.posicion)
                      ? (activeMember.custom_attributes.posicion as string[]).join(', ')
                      : String(activeMember.custom_attributes.posicion)
                    : 'No especificada'}
                </span>
              </div>

              {/* Camiseta */}
              {Boolean(activeMember.custom_attributes?.numero_camiseta) && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-neutral-500 font-medium">Número preferido:</span>
                  <span className="font-bold text-neutral-900">
                    #{String(activeMember.custom_attributes.numero_camiseta)}
                  </span>
                </div>
              )}

              {/* Pie hábil */}
              {Boolean(activeMember.custom_attributes?.pie_habil) && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-neutral-500 font-medium">Pie hábil:</span>
                  <span className="font-bold text-neutral-900">
                    {String(activeMember.custom_attributes.pie_habil)}
                  </span>
                </div>
              )}

              {/* Fecha de nacimiento & Edad */}
              {activeMember.birth_date && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-neutral-500 font-medium">Edad / Nacimiento:</span>
                  <span className="font-bold text-neutral-900">
                    {getAgeString(activeMember.birth_date)}
                  </span>
                </div>
              )}

              {/* Teléfono */}
              {activeMember.phone && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80">
                  <span className="text-neutral-500 font-medium">Contacto:</span>
                  <span className="font-bold text-neutral-900">{activeMember.phone}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveMember(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition"
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
