import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { MembersDirectory, MemberItem } from '@/components/MembersDirectory'
import { Users, Trophy, ArrowLeft } from 'lucide-react'

export default async function MiembrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/miembros')
  }

  // Check current user profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('system_role, approval_status')
    .eq('id', user.id)
    .single()

  if (currentProfile?.approval_status !== 'aprobado') {
    redirect('/')
  }

  const isAdmin = currentProfile?.system_role === 'admin'

  // Fetch all profiles and their stats
  const { data: profilesRaw } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      email,
      avatar_url,
      birth_date,
      system_role,
      sports_role,
      approval_status,
      motivation,
      custom_attributes,
      user_stats (
        matches_played,
        mvp_count,
        mvp_votes_received,
        social_events_attended
      )
    `)
    .order('full_name', { ascending: true })

  interface RawProfileItem {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    birth_date: string | null
    system_role: 'admin' | 'member'
    sports_role: 'jugador' | 'hincha' | 'ambos'
    approval_status: 'pendiente' | 'aprobado' | 'rechazado'
    motivation: string | null
    custom_attributes: Record<string, unknown>
    user_stats: {
      matches_played: number
      mvp_count: number
      mvp_votes_received: number
      social_events_attended: number
    }[] | {
      matches_played: number
      mvp_count: number
      mvp_votes_received: number
      social_events_attended: number
    } | null
  }

  const members: MemberItem[] = ((profilesRaw || []) as unknown as RawProfileItem[]).map((p) => {
    const rawStats = Array.isArray(p.user_stats) ? p.user_stats[0] : p.user_stats
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      avatar_url: p.avatar_url,
      birth_date: p.birth_date,
      system_role: p.system_role,
      sports_role: p.sports_role,
      approval_status: p.approval_status || 'aprobado',
      motivation: p.motivation || null,
      custom_attributes: p.custom_attributes || {},
      stats: rawStats || null,
    }
  })

  return (
    <div className="flex-1 flex flex-col p-5 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-xl text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-neutral-900 leading-tight">
                Miembros del Club
              </h1>
              <p className="text-xs text-neutral-500 font-medium">
                Directorio y fichas deportivas
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/ranking"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition active:scale-95"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Ranking</span>
        </Link>
      </div>

      {/* Directory Component */}
      <div className="mt-4 flex-1">
        <MembersDirectory members={members} isAdmin={isAdmin} currentUserId={user.id} />
      </div>
    </div>
  )
}
