import { Json } from '@/types/database.types'

export const ACTIVE_CLUB_COOKIE = 'camp_club_id'

export interface ClubBankDetails {
  banco: string
  tipo_cuenta: string
  numero_cuenta: string
  titular: string
  rut: string
  email: string
}

export interface ClubSettings {
  bank_details?: Partial<ClubBankDetails>
  colors?: {
    primary?: string
  }
  [key: string]: unknown
}

export interface Club {
  id: string
  name: string
  slug: string
  logo_url: string | null
  description: string | null
  settings: ClubSettings
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ClubMembership {
  id: string
  club_id: string
  user_id: string
  system_role: 'admin' | 'member'
  sports_role: 'jugador' | 'hincha' | 'ambos'
  approval_status: 'pendiente' | 'aprobado' | 'rechazado'
  motivation: string | null
  custom_attributes: Record<string, Json>
  joined_at: string
}

export interface UserClubItem {
  club: Club
  membership: ClubMembership
}

export interface ActiveClubContext {
  club: Club
  membership: ClubMembership | null
  userClubs: UserClubItem[]
  isAdmin: boolean
  isApproved: boolean
}
