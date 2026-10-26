'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronDown,
  Shield,
  User,
  Clock,
  PlusCircle,
  Compass,
  Check,
  Flame,
  Loader2,
  X
} from 'lucide-react'
import type { Club, UserClubItem } from '@/types/club.types'
import { switchClubAction } from '@/app/club/actions'

interface ClubSwitcherProps {
  currentClub: Club
  userClubs: UserClubItem[]
  currentRole?: 'admin' | 'member' | null
  currentApproval?: 'pendiente' | 'aprobado' | 'rechazado' | null
  isAuthenticated: boolean
}

export function ClubSwitcher({
  currentClub,
  userClubs,
  currentRole,
  currentApproval,
  isAuthenticated,
}: ClubSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSelectClub = (clubId: string) => {
    if (clubId === currentClub.id) {
      setIsOpen(false)
      return
    }

    startTransition(async () => {
      await switchClubAction(clubId)
      setIsOpen(false)
      router.refresh()
    })
  }

  const roleLabel =
    currentApproval === 'pendiente'
      ? 'Pendiente'
      : currentApproval === 'rechazado'
      ? 'Rechazado'
      : currentRole === 'admin'
      ? 'Admin'
      : 'Socio'

  const roleBadgeStyle =
    currentApproval === 'pendiente'
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : currentApproval === 'rechazado'
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : currentRole === 'admin'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-neutral-100 text-neutral-700 border-neutral-200'

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 p-1.5 -ml-1 rounded-2xl hover:bg-neutral-100 transition active:scale-98 text-left group"
        title="Cambiar de Club"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:shadow-lg transition">
          {currentClub.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentClub.logo_url}
              alt={currentClub.name}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <Flame className="w-5 h-5 text-white" />
          )}
        </div>

        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-neutral-900 text-sm truncate max-w-[170px] sm:max-w-[210px] leading-tight">
              {currentClub.name}
            </span>
            <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 transition flex-shrink-0" />
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            {isAuthenticated ? (
              <span
                className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border inline-flex items-center gap-0.5 ${roleBadgeStyle}`}
              >
                {currentRole === 'admin' ? (
                  <Shield className="w-2.5 h-2.5" />
                ) : currentApproval === 'pendiente' ? (
                  <Clock className="w-2.5 h-2.5" />
                ) : (
                  <User className="w-2.5 h-2.5" />
                )}
                {roleLabel}
              </span>
            ) : (
              <span className="text-[10px] text-neutral-500 font-medium">
                Club Deportivo
              </span>
            )}
            <span className="text-[10px] text-neutral-400 font-normal">
              • {currentClub.slug}
            </span>
          </div>
        </div>
      </button>

      {/* Modal / Sheet Dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
              <div>
                <h3 className="font-bold text-neutral-900 text-base">Mis Clubes</h3>
                <p className="text-xs text-neutral-500">
                  Selecciona el club activo para gestionar tus eventos y finanzas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Club List */}
            <div className="p-3 overflow-y-auto space-y-1.5 flex-1 divide-y divide-neutral-100">
              {userClubs.length > 0 ? (
                userClubs.map((item) => {
                  const isCurrent = item.club.id === currentClub.id
                  const isItemAdmin = item.membership.system_role === 'admin'
                  const isItemApproved = item.membership.approval_status === 'aprobado'

                  return (
                    <button
                      key={item.club.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSelectClub(item.club.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition duration-150 pt-3 ${
                        isCurrent
                          ? 'bg-emerald-50/80 border border-emerald-200'
                          : 'hover:bg-neutral-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
                          {item.club.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.club.logo_url}
                              alt={item.club.name}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            item.club.name.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 text-sm truncate">
                            {item.club.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border inline-flex items-center gap-0.5 ${
                                !isItemApproved
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : isItemAdmin
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                              }`}
                            >
                              {!isItemApproved
                                ? 'Pendiente'
                                : isItemAdmin
                                ? 'Admin'
                                : 'Socio'}
                            </span>
                            <span className="text-[10px] text-neutral-400 truncate">
                              /{item.club.slug}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  )
                })
              ) : (
                <div className="py-6 text-center text-neutral-400 text-xs">
                  Aún no estás registrado en ningún club.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-3 border-t border-neutral-100 bg-neutral-50/60 flex flex-col gap-2">
              <Link
                href="/club/nuevo"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition active:scale-98"
              >
                <PlusCircle className="w-4 h-4" />
                Crear Nuevo Club
              </Link>

              <Link
                href="/club/unirse"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold border border-neutral-200 transition active:scale-98"
              >
                <Compass className="w-4 h-4 text-neutral-500" />
                Explorar o Unirme a otro Club
              </Link>
            </div>

            {isPending && (
              <div className="p-3 bg-neutral-900 text-white text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Cambiando de club...
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
