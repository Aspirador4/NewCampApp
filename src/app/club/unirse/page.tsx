import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ArrowLeft, Building2, ChevronRight, Users, Flame } from 'lucide-react'

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
    club_members: { id: string; approval_status: string }[] | null
  }

  const clubs = ((clubsRaw || []) as unknown as RawClubItem[]).map((c) => {
    const approvedCount = (c.club_members || []).filter((m) => m.approval_status === 'aprobado').length
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      logo_url: c.logo_url,
      description: c.description,
      approvedCount,
    }
  })

  return (
    <div className="flex-1 flex flex-col p-5 pb-28">
      {/* Top Header */}
      <div className="flex items-center gap-3 pt-2 pb-5 border-b border-neutral-200">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
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
        <h2 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
          Clubes Disponibles ({clubs.length})
        </h2>

        {clubs.length === 0 ? (
          <div className="py-12 text-center text-neutral-400 text-xs">
            No hay clubes registrados aún. ¡Sé el primero en crear uno!
          </div>
        ) : (
          clubs.map((c) => (
            <Link
              key={c.id}
              href={`/club/unirse/${c.slug}`}
              className="flex items-center justify-between p-4 rounded-2xl bg-white border border-neutral-200 hover:border-emerald-300 hover:shadow-md transition active:scale-98"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-base shadow-sm flex-shrink-0">
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                      <Users className="w-3 h-3 text-neutral-400" />
                      {c.approvedCount} {c.approvedCount === 1 ? 'socio' : 'socios'}
                    </span>
                    <span className="text-[11px] text-neutral-300">•</span>
                    <span className="text-[11px] font-mono text-emerald-600 font-semibold">
                      /{c.slug}
                    </span>
                  </div>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            </Link>
          ))
        )}
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 pt-6 border-t border-neutral-200 text-center space-y-2">
        <p className="text-xs text-neutral-500">¿No encuentras el club que buscas?</p>
        <Link
          href="/club/nuevo"
          className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-98"
        >
          <Building2 className="w-4 h-4" />
          Crear mi propio club
        </Link>
      </div>
    </div>
  )
}
