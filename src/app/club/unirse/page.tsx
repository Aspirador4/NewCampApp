import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ArrowLeft, Building2, ChevronRight, Users, Flame, Plus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { getClubTheme } from '@/utils/theme'
import { Club } from '@/types/club.types'

export default async function UnirseDirectorioPage() {
  const supabase = await createClient()

  // Fetch all public clubs with member count
  const { data: clubsRaw } = await supabase
    .from('clubs')
    .select(`
      id,
      name,
      slug,
      logo_url,
      description,
      settings,
      club_members (
        id,
        approval_status
      )
    `)
    .order('name', { ascending: true })

  interface RawClubItem {
    id: string
    name: string
    slug: string
    logo_url: string | null
    description: string | null
    settings: Record<string, unknown>
    club_members: { id: string; approval_status: string }[] | null
  }

  const clubs = ((clubsRaw || []) as unknown as RawClubItem[]).map((c) => {
    const approvedCount = (c.club_members || []).filter((m) => m.approval_status === 'aprobado').length
    const theme = getClubTheme(c as unknown as Club)
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      logo_url: c.logo_url,
      description: c.description,
      approvedCount,
      theme,
    }
  })

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center gap-2 pt-2 pb-4 border-b-2 border-neutral-900/10 dark:border-white/10">
        <Link
          href="/"
          className="p-2 -ml-1 rounded-xl text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </Link>
        <div>
          <h1 className="font-display font-black text-2xl uppercase tracking-tight text-neutral-950 dark:text-white leading-none">
            Explorar Clubes
          </h1>
          <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
            Directorio Deportivo General
          </p>
        </div>
      </div>

      {/* Clubs List */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-black text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Clubes Disponibles ({clubs.length})
          </h2>
          <Link
            href="/club/nuevo"
            className="btn-tactile font-display font-black text-xs uppercase tracking-wider text-neutral-950 bg-amber-300 hover:bg-amber-400 border border-neutral-900 dark:border-neutral-700 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>+ Fundar Club</span>
          </Link>
        </div>

        {clubs.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No hay clubes registrados"
            description="Sé el primero en crear y fundar un club en CampApp."
            action={{ label: '+ Crear Nuevo Club', href: '/club/nuevo' }}
          />
        ) : (
          clubs.map((c) => (
            <Link
              key={c.id}
              href={`/club/unirse/${c.slug}`}
              className="btn-tactile flex items-center justify-between p-4 rounded-3xl bg-white dark:bg-[#14161f] border-2 border-neutral-900 dark:border-neutral-700 shadow-tactile transition min-h-[76px]"
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
                  <h3 className="font-display font-black text-base uppercase text-neutral-950 dark:text-white truncate leading-tight">
                    {c.name}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                    {c.description || 'Comunidad deportiva'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {c.approvedCount} {c.approvedCount === 1 ? 'socio' : 'socios'}
                    </span>
                    <span>•</span>
                    <span className="font-mono">/{c.slug}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex-shrink-0 pl-2">
                <span className="hidden sm:inline">Ver</span>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
