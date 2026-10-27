'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Building2,
  ChevronRight,
  Users,
  Flame,
  Plus,
  KeyRound,
  ArrowRight,
  X,
  Globe,
} from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

export interface DirectoryClubItem {
  id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  approvedCount: number
  theme: {
    primary: string
    primaryLight: string
    gradientFrom: string
    gradientTo: string
  }
}

interface ClubDirectoryExplorerProps {
  initialClubs: DirectoryClubItem[]
}

export function ClubDirectoryExplorer({ initialClubs }: ClubDirectoryExplorerProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [directSlug, setDirectSlug] = useState('')
  const [showDirectJoin, setShowDirectJoin] = useState(false)

  // Filter clubs based on search term
  const filteredClubs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return initialClubs
    return initialClubs.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    )
  }, [initialClubs, searchTerm])

  const handleDirectJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    let clean = directSlug.trim().toLowerCase()
    if (!clean) return

    // If user pasted a full URL like https://.../club/unirse/mi-club
    if (clean.includes('/club/unirse/')) {
      const parts = clean.split('/club/unirse/')
      clean = parts[parts.length - 1]
    }
    clean = clean.replace(/[^a-z0-9\-]/g, '')

    if (clean) {
      router.push(`/club/unirse/${clean}`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar & Direct Join Toggle */}
      <div className="space-y-2.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-neutral-400 dark:text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, lema o /slug..."
            className="input-tactile w-full pl-10 pr-9 py-2.5 text-xs font-semibold placeholder:font-normal placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 p-1 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Direct Code Access Banner */}
        <div className="rounded-2xl border-2 border-neutral-900/10 dark:border-neutral-800 bg-neutral-100/60 dark:bg-neutral-900/60 p-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDirectJoin(!showDirectJoin)}
              className="flex items-center gap-2 text-left group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center flex-shrink-0 shadow-2xs">
                <KeyRound className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div>
                <p className="font-display font-bold text-xs uppercase tracking-wide text-neutral-900 dark:text-white group-hover:underline">
                  ¿Tienes un código o enlace privado?
                </p>
                <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
                  {showDirectJoin ? 'Ocultar acceso directo' : 'Toca aquí para ingresar directamente con el slug'}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setShowDirectJoin(!showDirectJoin)}
              className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400 p-1.5 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800"
            >
              {showDirectJoin ? 'Cerrar' : 'Abrir'}
            </button>
          </div>

          {showDirectJoin && (
            <form onSubmit={handleDirectJoinSubmit} className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
              <div className="flex-1 flex items-center rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-white dark:bg-[#14161f] overflow-hidden shadow-2xs px-2.5 py-1.5">
                <span className="text-[11px] font-mono text-neutral-400 select-none mr-1">
                  /club/unirse/
                </span>
                <input
                  type="text"
                  required
                  value={directSlug}
                  onChange={(e) => setDirectSlug(e.target.value)}
                  placeholder="slug-del-club"
                  className="w-full bg-transparent text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="btn-tactile px-3.5 py-2.5 rounded-xl border-2 border-neutral-900 dark:border-neutral-700 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-tactile-sm flex-shrink-0"
              >
                <span>Ir</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Header with Results Count & Fundar Club */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="font-display font-bold text-xs uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
            {searchTerm ? (
              <>
                Resultados ({filteredClubs.length} de {initialClubs.length})
              </>
            ) : (
              <>Clubes Públicos Disponibles ({initialClubs.length})</>
            )}
          </h2>
        </div>

        <Link
          href="/club/nuevo"
          className="btn-tactile font-display font-bold text-xs uppercase tracking-wider text-neutral-950 bg-amber-300 hover:bg-amber-400 border-2 border-neutral-900 dark:border-neutral-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-tactile-sm"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span>Fundar Club</span>
        </Link>
      </div>

      {/* List of Clubs */}
      {filteredClubs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={searchTerm ? 'No se encontraron clubes' : 'No hay clubes públicos registrados'}
          description={
            searchTerm
              ? `No encontramos clubes públicos que coincidan con "${searchTerm}". Revisa la ortografía o intenta buscar por slug.`
              : 'Sé el primero en fundar un club público en CampApp.'
          }
          action={
            searchTerm
              ? { label: 'Limpiar Búsqueda', onClick: () => setSearchTerm('') }
              : { label: '+ Fundar Nuevo Club', href: '/club/nuevo' }
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredClubs.map((c) => (
            <Link
              key={c.id}
              href={`/club/unirse/${c.slug}`}
              className="btn-tactile flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-[#14161f] border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile transition min-h-[76px] group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-base border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile-sm flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${c.theme.gradientFrom}, ${c.theme.gradientTo})`,
                  }}
                >
                  {c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logo_url}
                      alt={c.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    <Flame className="w-6 h-6 stroke-[2.5]" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display font-bold text-base uppercase text-neutral-950 dark:text-white truncate leading-tight group-hover:text-primary transition">
                      {c.name}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                    {c.description || 'Comunidad deportiva en CampApp'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                    <span className="flex items-center gap-1 font-semibold text-neutral-600 dark:text-neutral-300">
                      <Users className="w-3 h-3 text-neutral-400" />
                      {c.approvedCount} {c.approvedCount === 1 ? 'socio' : 'socios'}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-neutral-400 dark:text-neutral-500 truncate">
                      /{c.slug}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex-shrink-0 pl-2">
                <span className="hidden sm:inline font-display uppercase tracking-wide">Fichar</span>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
