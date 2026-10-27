import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { ArrowLeft } from 'lucide-react'
import { getClubTheme } from '@/utils/theme'
import { Club } from '@/types/club.types'
import { ClubDirectoryExplorer, DirectoryClubItem } from '@/components/ClubDirectoryExplorer'

export default async function UnirseDirectorioPage() {
  const supabase = await createClient()

  // Fetch only public clubs with member count
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
    .neq('is_private', true)
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

  const clubs: DirectoryClubItem[] = ((clubsRaw || []) as unknown as RawClubItem[]).map((c) => {
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
          <h1 className="font-display font-bold text-2xl uppercase tracking-tight text-neutral-950 dark:text-white leading-none">
            Explorar Clubes
          </h1>
          <p className="font-mono text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mt-0.5">
            Directorio Deportivo y Buscador
          </p>
        </div>
      </div>

      {/* Interactive Explorer & Search */}
      <div className="mt-5">
        <ClubDirectoryExplorer initialClubs={clubs} />
      </div>
    </div>
  )
}
