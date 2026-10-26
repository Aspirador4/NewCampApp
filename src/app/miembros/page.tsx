import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { MembersDirectory, MemberItem } from '@/components/MembersDirectory'
import { Users, ArrowLeft } from 'lucide-react'
import { getActiveClub } from '@/utils/club'

export default async function MiembrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/miembros')
  }

  // Get active club & check caller permissions
  const { club, isAdmin, isApproved } = await getActiveClub(supabase)

  if (!isApproved) {
    redirect('/')
  }

  // Fetch all members of the active club with their profiles
  const { data: clubMembersRaw } = await supabase
    .from('club_members')
    .select(`
      id,
      club_id,
      user_id,
      system_role,
      sports_role,
      approval_status,
      motivation,
      custom_attributes,
      profiles (
        id,
        full_name,
        email,
        avatar_url,
        birth_date,
        gender
      )
    `)
    .eq('club_id', club.id)

  // Fetch stats for members in this club
  const { data: statsRaw } = await supabase
    .from('user_stats')
    .select('user_id, matches_played, mvp_count, mvp_votes_received, social_events_attended')
    .eq('club_id', club.id)

  const statsMap = new Map<string, { matches_played: number; mvp_count: number; mvp_votes_received: number; social_events_attended: number }>()
  for (const s of statsRaw || []) {
    statsMap.set(s.user_id, s)
  }

  interface RawClubMemberWithProfile {
    id: string
    club_id: string
    user_id: string
    system_role: 'admin' | 'member'
    sports_role: 'jugador' | 'hincha' | 'ambos'
    approval_status: 'pendiente' | 'aprobado' | 'rechazado'
    motivation: string | null
    custom_attributes: Record<string, unknown>
    profiles: {
      id: string
      full_name: string
      email: string
      avatar_url: string | null
      birth_date: string | null
      gender: string | null
    } | null
  }

  const rawList = (clubMembersRaw || []) as unknown as RawClubMemberWithProfile[]

  const members: MemberItem[] = rawList.map((m) => {
    const prof = m.profiles
    const memberStats = statsMap.get(m.user_id) || null
    return {
      id: m.user_id, // keep user_id as member ID for actions
      full_name: prof?.full_name || 'Socio',
      email: prof?.email || '',
      avatar_url: prof?.avatar_url || null,
      birth_date: prof?.birth_date || null,
      gender: prof?.gender || null,
      system_role: m.system_role,
      sports_role: m.sports_role,
      approval_status: m.approval_status,
      motivation: m.motivation,
      custom_attributes: m.custom_attributes || {},
      stats: memberStats,
    }
  })

  // Sort alphabetically
  members.sort((a, b) => a.full_name.localeCompare(b.full_name))

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-5 pb-nav">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-2 pb-4 border-b-2 border-neutral-900/10">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="p-2 -ml-1 rounded-xl text-neutral-800 hover:bg-neutral-100 transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="font-display font-black text-2xl text-neutral-950 uppercase tracking-tight leading-none">
              Plantel Oficial
            </h1>
            <p className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider mt-0.5">
              {club.name} • Directorio de Socios
            </p>
          </div>
        </div>

        <div
          className="w-10 h-10 rounded-xl text-white flex items-center justify-center border-2 border-neutral-900 shadow-tactile-sm"
          style={{ backgroundColor: 'var(--club-primary, #059669)' }}
        >
          <Users className="w-5 h-5 stroke-[2.5]" />
        </div>
      </div>

      {/* Directory Component */}
      <div className="mt-4 flex-1">
        <MembersDirectory
          members={members}
          isAdmin={isAdmin}
          currentUserId={user.id}
        />
      </div>
    </div>
  )
}
