export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type SystemRole = 'admin' | 'member'
export type SportsRole = 'jugador' | 'hincha' | 'ambos'
export type EventType = 'partido' | 'entrenamiento' | 'torneo' | 'asado' | 'otro'
export type EventStatus = 'convocado' | 'en_curso' | 'finalizado' | 'cancelado'
export type AttendeeStatus = 'confirmado' | 'lista_espera' | 'cancelado'
export type GuestStatus = 'pendiente_aprobacion' | 'aprobado' | 'rechazado'
export type DebtType = 'partido_propio' | 'invitado'
export type DebtStatus = 'pendiente' | 'pagado'
export type AttendanceAction =
  | 'confirmo'
  | 'bajo'
  | 'entro_espera'
  | 'subio_espera'
  | 'solicito_invitado'
  | 'invitado_aprobado'
  | 'invitado_rechazado'
export type FieldType = 'text' | 'number' | 'select' | 'multiselect' | 'boolean'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          avatar_url: string | null
          birth_date: string | null
          system_role: SystemRole
          sports_role: SportsRole
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
          system_role?: SystemRole
          sports_role?: SportsRole
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
          system_role?: SystemRole
          sports_role?: SportsRole
          custom_attributes?: Record<string, Json>
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_field_definitions: {
        Row: {
          id: string
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
          field_key?: string
          label?: string
          field_type?: FieldType
          options?: Json
          is_required?: boolean
          display_order?: number
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          event_type: EventType
          start_time: string
          end_time: string | null
          location: string
          max_capacity: number | null
          status: EventStatus
          mvp_voting_open: boolean
          mvp_voting_deadline: string | null
          cost_per_player: number
          total_cost: number | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          event_type: EventType
          start_time: string
          end_time?: string | null
          location: string
          max_capacity?: number | null
          status?: EventStatus
          mvp_voting_open?: boolean
          mvp_voting_deadline?: string | null
          cost_per_player?: number
          total_cost?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          event_type?: EventType
          start_time?: string
          end_time?: string | null
          location?: string
          max_capacity?: number | null
          status?: EventStatus
          mvp_voting_open?: boolean
          mvp_voting_deadline?: string | null
          cost_per_player?: number
          total_cost?: number | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
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
          registered_at: string
        }
        Insert: {
          id?: string
          event_id: string
          user_id: string
          status?: AttendeeStatus
          registered_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          user_id?: string
          status?: AttendeeStatus
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
          },
          {
            foreignKeyName: "event_attendance_logs_actor_id_fkey"
            columns: ["actor_id"]
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
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          voter_id: string
          voted_player_id: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          voter_id?: string
          voted_player_id?: string
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
          user_id: string
          matches_played: number
          mvp_count: number
          mvp_votes_received: number
          social_events_attended: number
          mutable_stats: Record<string, Json>
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          matches_played?: number
          mvp_count?: number
          mvp_votes_received?: number
          social_events_attended?: number
          mutable_stats?: Record<string, Json>
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          matches_played?: number
          mvp_count?: number
          mvp_votes_received?: number
          social_events_attended?: number
          mutable_stats?: Record<string, Json>
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      join_event: {
        Args: {
          p_event_id: string
          p_user_id: string
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
        }
        Returns: Json
      }
      revert_debt_to_pending: {
        Args: {
          p_debt_id: string
        }
        Returns: Json
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
