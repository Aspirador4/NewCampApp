export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SystemRole = 'admin' | 'member'
export type SportsRole = 'jugador' | 'hincha' | 'ambos'
export type ApprovalStatus = 'pendiente' | 'aprobado' | 'rechazado'
export type Gender = 'masculino' | 'femenino' | 'otro'
export type GenderCategory = 'masculino' | 'femenino' | 'mixto'
export type EventType = 'partido' | 'entrenamiento' | 'torneo' | 'asado' | 'otro'
export type EventStatus = 'pendiente_aprobacion' | 'convocado' | 'en_curso' | 'finalizado' | 'cancelado'
export type AttendeeStatus = 'confirmado' | 'lista_espera' | 'cancelado'
export type AttendanceType = 'jugador' | 'espectador'
export type AwardType = 'mvp' | 'mejor_compañero' | 'jugador_sorpresa'
export type GuestStatus = 'pendiente_aprobacion' | 'aprobado' | 'lista_espera' | 'rechazado'
export type DebtType = 'partido_propio' | 'invitado'
export type DebtStatus = 'pendiente' | 'pagado'
export type AttendanceAction =
  | 'confirmo'
  | 'confirmo_espectador'
  | 'bajo'
  | 'entro_espera'
  | 'subio_espera'
  | 'solicito_invitado'
  | 'invitado_aprobado'
  | 'invitado_espera'
  | 'invitado_rechazado'
export type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean'
export type NotificationType = 'evento' | 'finanzas' | 'membresia' | 'mvp' | 'admin' | 'recordatorio' | 'sistema'

export interface Database {
  public: {
    Tables: {
      clubs: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          description: string | null
          is_private: boolean
          settings: Record<string, Json>
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          description?: string | null
          is_private?: boolean
          settings?: Record<string, Json>
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          description?: string | null
          is_private?: boolean
          settings?: Record<string, Json>
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      club_members: {
        Row: {
          id: string
          club_id: string
          user_id: string
          system_role: SystemRole
          sports_role: SportsRole
          approval_status: ApprovalStatus
          motivation: string | null
          custom_attributes: Record<string, Json>
          joined_at: string
        }
        Insert: {
          id?: string
          club_id: string
          user_id: string
          system_role?: SystemRole
          sports_role?: SportsRole
          approval_status?: ApprovalStatus
          motivation?: string | null
          custom_attributes?: Record<string, Json>
          joined_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          user_id?: string
          system_role?: SystemRole
          sports_role?: SportsRole
          approval_status?: ApprovalStatus
          motivation?: string | null
          custom_attributes?: Record<string, Json>
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          avatar_url: string | null
          birth_date: string | null
          gender: Gender | null
          system_role: SystemRole
          sports_role: SportsRole
          approval_status: ApprovalStatus
          motivation: string | null
          custom_attributes: Record<string, Json>
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          phone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          gender?: Gender | null
          system_role?: SystemRole
          sports_role?: SportsRole
          approval_status?: ApprovalStatus
          motivation?: string | null
          custom_attributes?: Record<string, Json>
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          avatar_url?: string | null
          birth_date?: string | null
          gender?: Gender | null
          system_role?: SystemRole
          sports_role?: SportsRole
          approval_status?: ApprovalStatus
          motivation?: string | null
          custom_attributes?: Record<string, Json>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_field_definitions: {
        Row: {
          id: string
          club_id: string
          field_key: string
          label: string
          field_type: FieldType
          options: Json
          is_required: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          club_id: string
          field_key: string
          label: string
          field_type: FieldType
          options?: Json
          is_required?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          field_key?: string
          label?: string
          field_type?: FieldType
          options?: Json
          is_required?: boolean
          display_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_field_definitions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          }
        ]
      }
      events: {
        Row: {
          id: string
          club_id: string
          title: string
          description: string | null
          event_type: EventType
          gender_category: GenderCategory
          start_time: string
          end_time: string | null
          location: string
          max_capacity: number | null
          status: EventStatus
          mvp_voting_open: boolean
          mvp_voting_deadline: string | null
          cost_per_player: number
          total_cost: number | null
          custom_fields: Record<string, Json>
          financial_closed: boolean
          financial_closed_at: string | null
          reminder_24h_sent: boolean
          reminder_mvp_sent: boolean
          teams_published: boolean
          result_recorded: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          club_id: string
          title: string
          description?: string | null
          event_type: EventType
          gender_category: GenderCategory
          start_time: string
          end_time?: string | null
          location: string
          max_capacity?: number | null
          status?: EventStatus
          mvp_voting_open?: boolean
          mvp_voting_deadline?: string | null
          cost_per_player?: number
          total_cost?: number | null
          custom_fields?: Record<string, Json>
          financial_closed?: boolean
          financial_closed_at?: string | null
          reminder_24h_sent?: boolean
          reminder_mvp_sent?: boolean
          teams_published?: boolean
          result_recorded?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          title?: string
          description?: string | null
          event_type?: EventType
          gender_category?: GenderCategory
          start_time?: string
          end_time?: string | null
          location?: string
          max_capacity?: number | null
          status?: EventStatus
          mvp_voting_open?: boolean
          mvp_voting_deadline?: string | null
          cost_per_player?: number
          total_cost?: number | null
          custom_fields?: Record<string, Json>
          financial_closed?: boolean
          financial_closed_at?: string | null
          reminder_24h_sent?: boolean
          reminder_mvp_sent?: boolean
          teams_published?: boolean
          result_recorded?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      event_attendees: {
        Row: {
          id: string
          event_id: string
          user_id: string
          status: AttendeeStatus
          attendance_type: AttendanceType
          registered_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: AttendeeStatus
          attendance_type?: AttendanceType
          registered_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: AttendeeStatus
          attendance_type?: AttendanceType
          registered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      event_guests: {
        Row: {
          id: string
          event_id: string
          invited_by_user_id: string
          guest_name: string
          guest_contact: string | null
          status: GuestStatus
          is_overcapacity: boolean
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          invited_by_user_id: string
          guest_name: string
          guest_contact?: string | null
          status?: GuestStatus
          is_overcapacity?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          invited_by_user_id?: string
          guest_name?: string
          guest_contact?: string | null
          status?: GuestStatus
          is_overcapacity?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_guests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guests_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_guests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      event_attendance_logs: {
        Row: {
          id: string
          event_id: string
          user_id: string | null
          actor_id: string | null
          action: AttendanceAction
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id?: string | null
          actor_id?: string | null
          action: AttendanceAction
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string | null
          actor_id?: string | null
          action?: AttendanceAction
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      mvp_votes: {
        Row: {
          id: string
          event_id: string
          voter_id: string
          voted_player_id: string
          award_type: AwardType
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          voter_id: string
          voted_player_id: string
          award_type?: AwardType
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          voter_id?: string
          voted_player_id?: string
          award_type?: AwardType
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mvp_votes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mvp_votes_voted_player_id_fkey"
            columns: ["voted_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_stats: {
        Row: {
          id: string
          club_id: string
          user_id: string
          matches_played: number
          mvp_count: number
          mvp_votes_received: number
          social_events_attended: number
          best_teammate_count: number
          surprise_player_count: number
          average_rating: number | null
          last_match_rating: number | null
          previous_average_rating: number | null
          ratings_count: number
          match_history_ratings: Json[]
          goals: number
          assists: number
          saves: number
          matches_won: number
          matches_lost: number
          matches_tied: number
          mutable_stats: Record<string, Json>
          updated_at: string
        }
        Insert: {
          id?: string
          club_id: string
          user_id: string
          matches_played?: number
          mvp_count?: number
          mvp_votes_received?: number
          social_events_attended?: number
          best_teammate_count?: number
          surprise_player_count?: number
          average_rating?: number | null
          last_match_rating?: number | null
          previous_average_rating?: number | null
          ratings_count?: number
          match_history_ratings?: Json[]
          goals?: number
          assists?: number
          saves?: number
          matches_won?: number
          matches_lost?: number
          matches_tied?: number
          mutable_stats?: Record<string, Json>
          updated_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          user_id?: string
          matches_played?: number
          mvp_count?: number
          mvp_votes_received?: number
          social_events_attended?: number
          best_teammate_count?: number
          surprise_player_count?: number
          average_rating?: number | null
          last_match_rating?: number | null
          previous_average_rating?: number | null
          ratings_count?: number
          match_history_ratings?: Json[]
          goals?: number
          assists?: number
          saves?: number
          matches_won?: number
          matches_lost?: number
          matches_tied?: number
          mutable_stats?: Record<string, Json>
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      in_app_notifications: {
        Row: {
          id: string
          user_id: string
          club_id: string | null
          title: string
          body: string
          url: string
          type: NotificationType
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          club_id?: string | null
          title: string
          body: string
          url?: string
          type: NotificationType
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          club_id?: string | null
          title?: string
          body?: string
          url?: string
          type?: NotificationType
          is_read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "in_app_notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          keys_p256dh?: string
          keys_auth?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      member_debts: {
        Row: {
          id: string
          club_id: string | null
          event_id: string
          user_id: string
          guest_id: string | null
          debt_type: DebtType
          description: string
          amount: number
          status: DebtStatus
          paid_at: string | null
          settled_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          club_id?: string | null
          event_id: string
          user_id: string
          guest_id?: string | null
          debt_type: DebtType
          description: string
          amount?: number
          status?: DebtStatus
          paid_at?: string | null
          settled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          club_id?: string | null
          event_id?: string
          user_id?: string
          guest_id?: string | null
          debt_type?: DebtType
          description?: string
          amount?: number
          status?: DebtStatus
          paid_at?: string | null
          settled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_debts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_debts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_debts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_debts_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "event_guests"
            referencedColumns: ["id"]
          }
        ]
      }
      club_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      event_teams: {
        Row: {
          id: string
          event_id: string
          name: string
          color: string
          score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          color?: string
          score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          color?: string
          score?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_teams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      event_team_players: {
        Row: {
          id: string
          event_id: string
          team_id: string
          user_id: string | null
          guest_id: string | null
          assigned_position: string
          goals: number
          assists: number
          saves: number
          own_goals: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          team_id: string
          user_id?: string | null
          guest_id?: string | null
          assigned_position?: string
          goals?: number
          assists?: number
          saves?: number
          own_goals?: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          team_id?: string
          user_id?: string | null
          guest_id?: string | null
          assigned_position?: string
          goals?: number
          assists?: number
          saves?: number
          own_goals?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_team_players_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_team_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "event_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_team_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      match_player_ratings: {
        Row: {
          id: string
          event_id: string | null
          club_id: string
          evaluator_id: string
          evaluated_player_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id?: string | null
          club_id: string
          evaluator_id: string
          evaluated_player_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string | null
          club_id?: string
          evaluator_id?: string
          evaluated_player_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_player_ratings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_player_ratings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_player_ratings_evaluator_id_fkey"
            columns: ["evaluator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_player_ratings_evaluated_player_id_fkey"
            columns: ["evaluated_player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      is_club_member: {
        Args: {
          p_club_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_club_admin: {
        Args: {
          p_club_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_event_club_admin: {
        Args: {
          p_event_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_event_club_member: {
        Args: {
          p_event_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      create_new_club: {
        Args: {
          p_name: string
          p_slug: string
          p_description?: string
          p_logo_url?: string
        }
        Returns: Json
      }
      request_join_club: {
        Args: {
          p_club_id: string
          p_motivation?: string
        }
        Returns: Json
      }
      join_event: {
        Args: {
          p_event_id: string
          p_user_id: string
          p_attendance_type?: 'jugador' | 'espectador'
        }
        Returns: Json
      }
      leave_event: {
        Args: {
          p_event_id: string
          p_user_id: string
          p_actor_id: string
          p_reason?: string
        }
        Returns: Json
      }
      promote_waitlist: {
        Args: {
          p_event_id: string
          p_actor_id: string
        }
        Returns: Json
      }
      finalize_event_mvp: {
        Args: {
          p_event_id: string
        }
        Returns: Json
      }
      get_user_push_subscriptions: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
        }[]
      }
      delete_stale_push_subscriptions: {
        Args: {
          p_sub_ids: string[]
        }
        Returns: void
      }
      generate_event_debts: {
        Args: {
          p_event_id: string
          p_cost_per_player?: number
        }
        Returns: Json
      }
      settle_member_debts: {
        Args: {
          p_user_id: string
          p_debt_ids?: string[]
          p_club_id?: string
        }
        Returns: Json
      }
      revert_debt_to_pending: {
        Args: {
          p_debt_id: string
        }
        Returns: Json
      }
      close_event_finances: {
        Args: {
          p_event_id: string
          p_custom_debts?: Json
        }
        Returns: Json
      }
      get_club_members_push_subscriptions: {
        Args: {
          p_club_id: string
          p_exclude_user_id?: string
        }
        Returns: {
          id: string
          user_id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
        }[]
      }
      get_club_admins_push_subscriptions: {
        Args: {
          p_club_id: string
          p_exclude_user_id?: string
        }
        Returns: {
          id: string
          user_id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
        }[]
      }
      get_club_admin_user_ids: {
        Args: {
          p_club_id: string
          p_exclude_user_id?: string
        }
        Returns: {
          user_id: string
        }[]
      }
      get_club_member_user_ids: {
        Args: {
          p_club_id: string
          p_exclude_user_id?: string
        }
        Returns: {
          user_id: string
        }[]
      }
      create_in_app_notification: {
        Args: {
          p_user_id: string
          p_club_id?: string | null
          p_title: string
          p_body: string
          p_url?: string
          p_type?: string
        }
        Returns: string
      }
      create_bulk_in_app_notifications: {
        Args: {
          p_user_ids: string[]
          p_club_id?: string | null
          p_title: string
          p_body: string
          p_url?: string
          p_type?: string
        }
        Returns: number
      }
      mark_all_notifications_as_read: {
        Args: {
          p_club_id?: string
        }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
