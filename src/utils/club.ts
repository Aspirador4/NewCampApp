import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { Database, Json } from '@/types/database.types'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  ACTIVE_CLUB_COOKIE,
  Club,
  ClubMembership,
  UserClubItem,
  ActiveClubContext,
} from '@/types/club.types'

export * from '@/types/club.types'

const FALLBACK_CLUB: Club = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Club Principal',
  slug: 'club-principal',
  logo_url: null,
  description: 'Club Deportivo Principal',
  settings: {
    bank_details: {
      banco: 'Banco Santander',
      tipo_cuenta: 'Cuenta Corriente',
      numero_cuenta: '78-90123-4',
      titular: 'Club Deportivo',
      rut: '76.543.210-K',
      email: 'admin@clubdeportivo.com',
    },
  },
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

/**
 * Retrieves the currently active club and user's membership for the current session.
 * Uses the `camp_club_id` cookie, falling back to user's first approved club or the default club.
 */
export async function getActiveClub(client?: SupabaseClient<Database>): Promise<ActiveClubContext> {
  const supabase = client || (await createClient())
  const cookieStore = await cookies()
  const cookieClubId = cookieStore.get(ACTIVE_CLUB_COOKIE)?.value

  const { data: { user } } = await supabase.auth.getUser()

  let userClubs: UserClubItem[] = []

  if (user) {
    const { data: rawMemberships } = await supabase
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
        joined_at,
        clubs (
          id,
          name,
          slug,
          logo_url,
          description,
          settings,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)

    if (rawMemberships && rawMemberships.length > 0) {
      userClubs = rawMemberships
        .filter((m) => Boolean(m.clubs))
        .map((m) => {
          const club = m.clubs as unknown as Club
          const membership: ClubMembership = {
            id: m.id,
            club_id: m.club_id,
            user_id: m.user_id,
            system_role: m.system_role,
            sports_role: m.sports_role,
            approval_status: m.approval_status,
            motivation: m.motivation,
            custom_attributes: m.custom_attributes as Record<string, Json>,
            joined_at: m.joined_at,
          }
          return { club, membership }
        })
    }
  }

  // Determine active club
  let activeItem: UserClubItem | undefined

  if (cookieClubId && userClubs.length > 0) {
    activeItem = userClubs.find((item) => item.club.id === cookieClubId)
  }

  // Fallback to first approved club
  if (!activeItem && userClubs.length > 0) {
    activeItem = userClubs.find((item) => item.membership.approval_status === 'aprobado')
  }

  // Fallback to any club the user is part of
  if (!activeItem && userClubs.length > 0) {
    activeItem = userClubs[0]
  }

  if (activeItem) {
    return {
      club: activeItem.club,
      membership: activeItem.membership,
      userClubs,
      isAdmin: activeItem.membership.system_role === 'admin' && activeItem.membership.approval_status === 'aprobado',
      isApproved: activeItem.membership.approval_status === 'aprobado',
    }
  }

  // If user has no memberships or not logged in, fetch club from cookie or default
  let targetClub: Club | null = null

  if (cookieClubId) {
    const { data: foundClub } = await supabase
      .from('clubs')
      .select('*')
      .eq('id', cookieClubId)
      .maybeSingle()

    if (foundClub) {
      targetClub = foundClub as unknown as Club
    }
  }

  if (!targetClub) {
    const { data: defaultClub } = await supabase
      .from('clubs')
      .select('*')
      .eq('slug', 'club-principal')
      .maybeSingle()

    if (defaultClub) {
      targetClub = defaultClub as unknown as Club
    }
  }

  if (!targetClub) {
    const { data: firstClub } = await supabase
      .from('clubs')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (firstClub) {
      targetClub = firstClub as unknown as Club
    }
  }

  const finalClub = targetClub || FALLBACK_CLUB

  return {
    club: finalClub,
    membership: null,
    userClubs,
    isAdmin: false,
    isApproved: false,
  }
}
