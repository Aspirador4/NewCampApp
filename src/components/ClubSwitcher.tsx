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
import { getClubTheme } from '@/utils/theme'

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

  const currentTheme = getClubTheme(currentClub)

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
      ? 'bg-neutral-900 text-white border-neutral-900'
      : 'bg-neutral-100 text-neutral-700 border-neutral-200'

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2.5 p-1.5 -ml-1 rounded-2xl hover:bg-neutral-100 transition active:scale-98 text-left group min-h-[44px]"
        title="Cambiar de Club"
        aria-label="Abrir selector de club"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:shadow-md transition"
          style={{
            background: `linear-gradient(135deg, ${currentTheme.gradientFrom}, ${currentTheme.gradientTo})`,
          }}
        >
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
            <span className="font-display font-black text-neutral-950 text-base uppercase tracking-tight truncate max-w-[170px] sm:max-w-[210px] leading-tight">
              {currentClub.name}
            </span>
            <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-700 transition flex-shrink-0" />
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            {isAuthenticated ? (
              <span
                className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border inline-flex items-center gap-0.5 ${roleBadgeStyle}`}
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
              • /{currentClub.slug}
            </span>
          </div>
        </div>
      </button>

      {/* Modal / Sheet Dropdown */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-tactile border-2 border-neutral-900 overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b-2 border-neutral-900/10 flex items-center justify-between bg-neutral-50">
              <div>
                <h3 className="font-display font-black text-xl text-neutral-950 uppercase tracking-tight">Mis Clubes</h3>
                <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
                  Cambiar club activo para vestuario y finanzas
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 transition flex items-center justify-center min-h-[44px] min-w-[44px]"
                aria-label="Cerrar modal de clubes"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Club List */}
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {userClubs.length > 0 ? (
                userClubs.map((item) => {
                  const isCurrent = item.club.id === currentClub.id
                  const isItemAdmin = item.membership.system_role === 'admin'
                  const isItemApproved = item.membership.approval_status === 'aprobado'
                  const itemTheme = getClubTheme(item.club)

                  return (
                    <button
                      key={item.club.id}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSelectClub(item.club.id)}
                      className={`btn-tactile w-full flex items-center justify-between p-3 rounded-2xl text-left transition duration-150 min-h-[56px] active:scale-98 border-2 ${
                        isCurrent
                          ? 'bg-neutral-50 border-neutral-900 shadow-tactile-sm'
                          : 'bg-white hover:bg-neutral-50 border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl border border-neutral-900 flex items-center justify-center text-white font-display font-black text-sm shadow-xs flex-shrink-0 overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${itemTheme.gradientFrom}, ${itemTheme.gradientTo})`,
                          }}
                        >
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
                          <p className="font-display font-black text-sm uppercase tracking-tight text-neutral-950 truncate">
                            {item.club.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border inline-flex items-center gap-0.5 ${
                                !isItemApproved
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : isItemAdmin
                                  ? 'bg-neutral-900 text-white border-neutral-900'
                                  : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                              }`}
                            >
                              {!isItemApproved
                                ? 'Pendiente'
                                : isItemAdmin
                                ? 'Admin'
                                : 'Socio'}
                            </span>
                            <span className="font-mono text-[10px] text-neutral-400 truncate">
                              /{item.club.slug}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isCurrent && (
                        <div
                          className="w-6 h-6 rounded-lg border border-neutral-900 text-white flex items-center justify-center flex-shrink-0 shadow-2xs"
                          style={{ backgroundColor: itemTheme.primary }}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  )
                })
              ) : (
                <div className="py-6 text-center text-neutral-400 font-mono text-xs">
                  Aún no estás registrado en ningún club.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-3 border-t-2 border-neutral-900/10 bg-neutral-50 flex flex-col gap-2">
              <Link
                href="/club/nuevo"
                onClick={() => setIsOpen(false)}
                className="btn-tactile w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 border-neutral-900 bg-amber-300 hover:bg-amber-400 text-neutral-950 font-display font-black text-xs uppercase tracking-wider shadow-tactile-sm transition"
              >
                <PlusCircle className="w-4 h-4 stroke-[2.5]" />
                Crear Nuevo Club
              </Link>

              <Link
                href="/club/unirse"
                onClick={() => setIsOpen(false)}
                className="btn-tactile w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-display font-black text-xs uppercase tracking-wider border-2 border-neutral-900 shadow-tactile-sm transition"
              >
                <Compass className="w-4 h-4 stroke-[2.5]" />
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
