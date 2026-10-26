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
    <div className="flex-1 flex flex-col p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-2 pb-5 border-b border-neutral-200">
        <Link
          href="/"
          className="p-2.5 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
          aria-label="Volver al inicio"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Explorar Clubes</h1>
          <p className="text-xs text-neutral-500">
            Únete a comunidades deportivas o solicita admisión
          </p>
        </div>
      </div>

      {/* Clubs List */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Clubes Disponibles ({clubs.length})
          </h2>
          <Link
            href="/club/nuevo"
            className="text-xs font-bold text-neutral-700 hover:text-neutral-900 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear uno</span>
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
              className="flex items-center justify-between p-4 rounded-2xl bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-xs transition active:scale-98 min-h-[72px]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${c.theme.gradientFrom}, ${c.theme.gradientTo})`,
                  }}
                >
                  {c.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.logo_url}
                      alt={c.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Flame className="w-6 h-6" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-bold text-neutral-900 text-sm truncate">
                    {c.name}
                  </h3>
                  <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                    {c.description || 'Comunidad deportiva'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {c.approvedCount} {c.approvedCount === 1 ? 'socio' : 'socios'}
                    </span>
                    <span>•</span>
                    <span className="font-mono">/{c.slug}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-neutral-700 flex-shrink-0 pl-2">
                <span className="hidden sm:inline">Ver</span>
                <ChevronRight className="w-4 h-4 text-neutral-400" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
