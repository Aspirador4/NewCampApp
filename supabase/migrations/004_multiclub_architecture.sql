-- Migration: 004_multiclub_architecture.sql
-- Description: Evolve CampApp from single-club to Multi-Club (Row-Level Multi-Tenant) architecture.
-- Preserves 100% of existing data by migrating it to a Default Initial Club ('Club Principal').

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 0. IDEMPOTENT PREREQUISITES FROM PREVIOUS MIGRATIONS
-- ==============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('masculino', 'femenino', 'otro')),
  ADD COLUMN IF NOT EXISTS motivation text,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'aprobado' CHECK (approval_status IN ('pendiente', 'aprobado', 'rechazado'));

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS gender_category text NOT NULL DEFAULT 'mixto' CHECK (gender_category IN ('masculino', 'femenino', 'mixto')),
  ADD COLUMN IF NOT EXISTS cost_per_player integer NOT NULL DEFAULT 3500,
  ADD COLUMN IF NOT EXISTS total_cost integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS financial_closed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS financial_closed_at timestamptz DEFAULT NULL;

-- ==============================================================================
-- 1. CREATE CLUBS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at on clubs
DROP TRIGGER IF EXISTS tr_clubs_updated_at ON public.clubs;
CREATE TRIGGER tr_clubs_updated_at
BEFORE UPDATE ON public.clubs
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_clubs_slug ON public.clubs(slug);
CREATE INDEX IF NOT EXISTS idx_clubs_created_by ON public.clubs(created_by);

-- ==============================================================================
-- 2. CREATE CLUB_MEMBERS TABLE (Membership & Multi-Tenant Roles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  system_role text NOT NULL DEFAULT 'member' CHECK (system_role IN ('admin', 'member')),
  sports_role text NOT NULL DEFAULT 'jugador' CHECK (sports_role IN ('jugador', 'hincha', 'ambos')),
  approval_status text NOT NULL DEFAULT 'pendiente' CHECK (approval_status IN ('pendiente', 'aprobado', 'rechazado')),
  motivation text,
  custom_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  joined_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT club_members_club_user_key UNIQUE (club_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON public.club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON public.club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_members_status ON public.club_members(approval_status);
CREATE INDEX IF NOT EXISTS idx_club_members_system_role ON public.club_members(system_role);

-- ==============================================================================
-- 3. MODIFY EXISTING TABLES FOR MULTI-TENANCY
-- ==============================================================================

-- A. events: add club_id
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_club_id ON public.events(club_id);

-- B. profile_field_definitions: add club_id and adjust unique constraint
ALTER TABLE public.profile_field_definitions
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Drop previous global unique on field_key if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profile_field_definitions'::regclass
      AND conname = 'profile_field_definitions_field_key_key'
  ) THEN
    ALTER TABLE public.profile_field_definitions DROP CONSTRAINT profile_field_definitions_field_key_key;
  END IF;
END $$;

-- Add compound unique constraint per club
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profile_field_definitions'::regclass
      AND conname = 'profile_field_defs_club_field_key_key'
  ) THEN
    ALTER TABLE public.profile_field_definitions
      ADD CONSTRAINT profile_field_defs_club_field_key_key UNIQUE (club_id, field_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profile_field_defs_club_id ON public.profile_field_definitions(club_id);

-- C. user_stats: add club_id and adjust unique constraint
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Drop previous unique constraint on user_id if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_stats'::regclass
      AND conname = 'user_stats_user_id_key'
  ) THEN
    ALTER TABLE public.user_stats DROP CONSTRAINT user_stats_user_id_key;
  END IF;
END $$;

-- Add compound unique constraint per club and user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_stats'::regclass
      AND conname = 'user_stats_user_club_key'
  ) THEN
    ALTER TABLE public.user_stats
      ADD CONSTRAINT user_stats_user_club_key UNIQUE (user_id, club_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_stats_club_id ON public.user_stats(club_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_club ON public.user_stats(user_id, club_id);

-- D. member_debts: add club_id for optimized multi-tenant debt filtering
ALTER TABLE public.member_debts
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES public.clubs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_member_debts_club_id ON public.member_debts(club_id);

-- ==============================================================================
-- 4. DATA MIGRATION: SEED INITIAL DEFAULT CLUB & MIGRATE ALL EXISTING DATA
-- ==============================================================================

DO $$
DECLARE
  v_default_club_id uuid;
  v_initial_admin_id uuid;
  v_existing_bank_details jsonb;
BEGIN
  -- Look for an existing default club or find the first created club
  SELECT id INTO v_default_club_id FROM public.clubs WHERE slug = 'club-principal' LIMIT 1;

  -- Look for existing bank details from club_settings if present
  BEGIN
    SELECT value INTO v_existing_bank_details FROM public.club_settings WHERE key = 'bank_details' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_existing_bank_details := NULL;
  END;

  IF v_existing_bank_details IS NULL THEN
    v_existing_bank_details := jsonb_build_object(
      'banco', 'Banco Santander',
      'tipo_cuenta', 'Cuenta Corriente',
      'numero_cuenta', '78-90123-4',
      'titular', 'Club Deportivo',
      'rut', '76.543.210-K',
      'email', 'admin@clubdeportivo.com'
    );
  END IF;

  -- Look for the first admin profile
  SELECT id INTO v_initial_admin_id FROM public.profiles WHERE system_role = 'admin' ORDER BY created_at ASC LIMIT 1;
  IF v_initial_admin_id IS NULL THEN
    SELECT id INTO v_initial_admin_id FROM public.profiles ORDER BY created_at ASC LIMIT 1;
  END IF;

  -- Create Default Initial Club if not exists
  IF v_default_club_id IS NULL THEN
    INSERT INTO public.clubs (
      id,
      name,
      slug,
      description,
      settings,
      created_by
    ) VALUES (
      '00000000-0000-0000-0000-000000000001'::uuid,
      'Club Principal',
      'club-principal',
      'Club Deportivo Principal - Espacio oficial de partidos, eventos y gestión de socios.',
      jsonb_build_object('bank_details', v_existing_bank_details, 'colors', jsonb_build_object('primary', '#059669')),
      v_initial_admin_id
    )
    ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name
    RETURNING id INTO v_default_club_id;
  END IF;

  -- Associate all existing events to default club
  UPDATE public.events
  SET club_id = v_default_club_id
  WHERE club_id IS NULL;

  -- Associate all existing profile field definitions to default club
  UPDATE public.profile_field_definitions
  SET club_id = v_default_club_id
  WHERE club_id IS NULL;

  -- Associate all existing user stats to default club
  UPDATE public.user_stats
  SET club_id = v_default_club_id
  WHERE club_id IS NULL;

  -- Associate all existing member debts to club of the corresponding event
  UPDATE public.member_debts md
  SET club_id = e.club_id
  FROM public.events e
  WHERE md.event_id = e.id AND md.club_id IS NULL;

  -- Fallback for any leftover debts
  UPDATE public.member_debts
  SET club_id = v_default_club_id
  WHERE club_id IS NULL;

  -- Migrate all existing profiles into club_members for the default club
  INSERT INTO public.club_members (
    club_id,
    user_id,
    system_role,
    sports_role,
    approval_status,
    motivation,
    custom_attributes,
    joined_at
  )
  SELECT
    v_default_club_id,
    p.id,
    p.system_role,
    p.sports_role,
    p.approval_status,
    p.motivation,
    p.custom_attributes,
    p.created_at
  FROM public.profiles p
  ON CONFLICT (club_id, user_id) DO UPDATE
    SET system_role = EXCLUDED.system_role,
        sports_role = EXCLUDED.sports_role,
        approval_status = EXCLUDED.approval_status;

  -- Make sure the club created_by is assigned
  IF v_initial_admin_id IS NOT NULL THEN
    UPDATE public.clubs
    SET created_by = v_initial_admin_id
    WHERE id = v_default_club_id AND created_by IS NULL;
  END IF;

END $$;

-- Enforce NOT NULL on migrated columns now that all records have been assigned
ALTER TABLE public.events
  ALTER COLUMN club_id SET NOT NULL;

ALTER TABLE public.profile_field_definitions
  ALTER COLUMN club_id SET NOT NULL;

ALTER TABLE public.user_stats
  ALTER COLUMN club_id SET NOT NULL;

-- ==============================================================================
-- 5. HELPER RLS SECURITY FUNCTIONS (Multi-Tenant & Security Definer)
-- ==============================================================================

-- Check if user is an approved member of a specific club
CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  IF p_club_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = p_club_id
      AND user_id = p_user_id
      AND approval_status = 'aprobado'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if user is an admin of a specific club
CREATE OR REPLACE FUNCTION public.is_club_admin(p_club_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  IF p_club_id IS NULL OR p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = p_club_id
      AND user_id = p_user_id
      AND system_role = 'admin'
      AND approval_status = 'aprobado'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if user is an admin of the club that owns a given event
CREATE OR REPLACE FUNCTION public.is_event_club_admin(p_event_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_club_id uuid;
BEGIN
  SELECT club_id INTO v_club_id FROM public.events WHERE id = p_event_id;
  IF v_club_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN public.is_club_admin(v_club_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Check if user is an approved member of the club that owns a given event
CREATE OR REPLACE FUNCTION public.is_event_club_member(p_event_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_club_id uuid;
BEGIN
  SELECT club_id INTO v_club_id FROM public.events WHERE id = p_event_id;
  IF v_club_id IS NULL THEN
    RETURN false;
  END IF;
  RETURN public.is_club_member(v_club_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 6. UPDATED RPCs FOR MULTI-CLUB CONTEXT
-- ==============================================================================

-- Atomic Join Event with Club Context & Waitlist
CREATE OR REPLACE FUNCTION public.join_event(
  p_event_id uuid,
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_event record;
  v_confirmed_count integer;
  v_approved_guests_count integer;
  v_target_status text;
  v_action text;
  v_existing_status text;
BEGIN
  -- Get event details
  SELECT * INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado';
  END IF;

  IF v_event.status NOT IN ('convocado', 'en_curso') THEN
    RAISE EXCEPTION 'El evento ya no acepta inscripciones';
  END IF;

  -- Ensure user is an approved member of this club
  IF NOT public.is_club_member(v_event.club_id, p_user_id) THEN
    RAISE EXCEPTION 'Debes ser un socio aprobado de este club para inscribirte';
  END IF;

  -- Check existing attendance
  SELECT status INTO v_existing_status
  FROM public.event_attendees
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF v_existing_status IN ('confirmado', 'lista_espera') THEN
    RETURN jsonb_build_object('success', true, 'status', v_existing_status, 'message', 'Ya estabas registrado en este evento');
  END IF;

  -- Count confirmed attendees
  SELECT count(*) INTO v_confirmed_count
  FROM public.event_attendees
  WHERE event_id = p_event_id AND status = 'confirmado';

  -- Count approved guests
  SELECT count(*) INTO v_approved_guests_count
  FROM public.event_guests
  WHERE event_id = p_event_id AND status = 'aprobado';

  -- Determine target status
  IF v_event.max_capacity IS NULL OR (v_confirmed_count + v_approved_guests_count) < v_event.max_capacity THEN
    v_target_status := 'confirmado';
    v_action := 'confirmo';
  ELSE
    v_target_status := 'lista_espera';
    v_action := 'entro_espera';
  END IF;

  -- Upsert attendee
  INSERT INTO public.event_attendees (event_id, user_id, status, registered_at)
  VALUES (p_event_id, p_user_id, v_target_status, now())
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = v_target_status, registered_at = now();

  -- Audit log
  INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action)
  VALUES (p_event_id, p_user_id, p_user_id, v_action);

  RETURN jsonb_build_object('success', true, 'status', v_target_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atomic Cancel Attendance with Auto-Promotion from Waitlist
CREATE OR REPLACE FUNCTION public.leave_event(
  p_event_id uuid,
  p_user_id uuid,
  p_actor_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_current_status text;
  v_promoted_user_id uuid := NULL;
  v_promoted_user_name text := NULL;
BEGIN
  -- Check user current status
  SELECT status INTO v_current_status
  FROM public.event_attendees
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF NOT FOUND OR v_current_status = 'cancelado' THEN
    RETURN jsonb_build_object('success', false, 'message', 'El usuario no está registrado en el evento');
  END IF;

  -- Mark as cancelled
  UPDATE public.event_attendees
  SET status = 'cancelado'
  WHERE event_id = p_event_id AND user_id = p_user_id;

  -- Log cancellation
  INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action, reason)
  VALUES (p_event_id, p_user_id, p_actor_id, 'bajo', p_reason);

  -- If cancelled user was confirmed, promote next person from waitlist
  IF v_current_status = 'confirmado' THEN
    SELECT a.user_id, p.full_name INTO v_promoted_user_id, v_promoted_user_name
    FROM public.event_attendees a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.event_id = p_event_id AND a.status = 'lista_espera'
    ORDER BY a.registered_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_promoted_user_id IS NOT NULL THEN
      UPDATE public.event_attendees
      SET status = 'confirmado'
      WHERE event_id = p_event_id AND user_id = v_promoted_user_id;

      INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action, reason)
      VALUES (p_event_id, v_promoted_user_id, p_actor_id, 'subio_espera', 'Promovido automáticamente por baja de cupo');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'promoted_user_id', v_promoted_user_id,
    'promoted_user_name', v_promoted_user_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Atomic Finalize Event MVP & Increment Stats Scoped to Club
CREATE OR REPLACE FUNCTION public.finalize_event_mvp(p_event_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_event record;
  v_max_votes integer := 0;
  v_winners uuid[];
  v_vote record;
  v_attendee record;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado';
  END IF;

  -- Close voting
  UPDATE public.events
  SET mvp_voting_open = false, status = 'finalizado'
  WHERE id = p_event_id;

  -- Find highest vote count
  SELECT COALESCE(MAX(vote_cnt), 0) INTO v_max_votes
  FROM (
    SELECT count(*) as vote_cnt
    FROM public.mvp_votes
    WHERE event_id = p_event_id
    GROUP BY voted_player_id
  ) counts;

  -- Find winner(s)
  IF v_max_votes > 0 THEN
    SELECT array_agg(voted_player_id) INTO v_winners
    FROM (
      SELECT voted_player_id
      FROM public.mvp_votes
      WHERE event_id = p_event_id
      GROUP BY voted_player_id
      HAVING count(*) = v_max_votes
    ) winners_sub;

    -- Update or insert user_stats for winners scoped to this club
    IF v_winners IS NOT NULL THEN
      FOREACH v_attendee IN ARRAY v_winners
      LOOP
        INSERT INTO public.user_stats (user_id, club_id, mvp_count)
        VALUES (v_attendee, v_event.club_id, 1)
        ON CONFLICT (user_id, club_id)
        DO UPDATE SET mvp_count = public.user_stats.mvp_count + 1, updated_at = now();
      END LOOP;
    END IF;
  END IF;

  -- Update votes received for all who got votes in this club
  FOR v_vote IN
    SELECT voted_player_id, count(*) as vote_cnt
    FROM public.mvp_votes
    WHERE event_id = p_event_id
    GROUP BY voted_player_id
  LOOP
    INSERT INTO public.user_stats (user_id, club_id, mvp_votes_received)
    VALUES (v_vote.voted_player_id, v_event.club_id, v_vote.vote_cnt)
    ON CONFLICT (user_id, club_id)
    DO UPDATE SET mvp_votes_received = public.user_stats.mvp_votes_received + v_vote.vote_cnt, updated_at = now();
  END LOOP;

  -- Increment matches_played for confirmed attendees in this club
  FOR v_attendee IN
    SELECT user_id
    FROM public.event_attendees
    WHERE event_id = p_event_id AND status = 'confirmado'
  LOOP
    IF v_event.event_type IN ('partido', 'torneo') THEN
      INSERT INTO public.user_stats (user_id, club_id, matches_played)
      VALUES (v_attendee.user_id, v_event.club_id, 1)
      ON CONFLICT (user_id, club_id)
      DO UPDATE SET matches_played = public.user_stats.matches_played + 1, updated_at = now();
    ELSE
      INSERT INTO public.user_stats (user_id, club_id, social_events_attended)
      VALUES (v_attendee.user_id, v_event.club_id, 1)
      ON CONFLICT (user_id, club_id)
      DO UPDATE SET social_events_attended = public.user_stats.social_events_attended + 1, updated_at = now();
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'max_votes', v_max_votes,
    'winner_ids', COALESCE(v_winners, ARRAY[]::uuid[])
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Generate Debts for an Event Scoped to Club
CREATE OR REPLACE FUNCTION public.generate_event_debts(
  p_event_id uuid,
  p_cost_per_player integer DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_event record;
  v_cost integer;
  v_confirmed_count integer := 0;
  v_approved_guests_count integer := 0;
  v_total_players integer := 0;
  v_attendee record;
  v_guest record;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado';
  END IF;

  -- Count total players
  SELECT count(*) INTO v_confirmed_count
  FROM public.event_attendees
  WHERE event_id = p_event_id AND status = 'confirmado';

  SELECT count(*) INTO v_approved_guests_count
  FROM public.event_guests
  WHERE event_id = p_event_id AND status = 'aprobado';

  v_total_players := v_confirmed_count + v_approved_guests_count;

  IF v_total_players <= 0 THEN
    v_total_players := COALESCE(v_event.max_capacity, 14);
  END IF;

  IF v_event.total_cost IS NOT NULL AND v_event.total_cost > 0 THEN
    v_cost := ROUND(v_event.total_cost::numeric / v_total_players);
  ELSE
    v_cost := COALESCE(p_cost_per_player, v_event.cost_per_player, 0);
  END IF;

  IF v_cost <= 0 THEN
    RETURN jsonb_build_object('success', true, 'created', 0, 'message', 'Evento sin costo');
  END IF;

  UPDATE public.events
  SET cost_per_player = v_cost
  WHERE id = p_event_id;

  -- 1. Asistencia del jugador propio
  FOR v_attendee IN
    SELECT user_id FROM public.event_attendees
    WHERE event_id = p_event_id AND status = 'confirmado'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.member_debts
      WHERE event_id = p_event_id AND user_id = v_attendee.user_id AND debt_type = 'partido_propio'
    ) THEN
      INSERT INTO public.member_debts (event_id, club_id, user_id, debt_type, description, amount, status)
      VALUES (p_event_id, v_event.club_id, v_attendee.user_id, 'partido_propio', 'Asistencia: ' || v_event.title, v_cost, 'pendiente');
      v_count := v_count + 1;
    ELSE
      UPDATE public.member_debts
      SET amount = v_cost, club_id = v_event.club_id, updated_at = now()
      WHERE event_id = p_event_id AND user_id = v_attendee.user_id AND debt_type = 'partido_propio' AND status = 'pendiente';
    END IF;
  END LOOP;

  -- 2. Invitados aprobados
  FOR v_guest IN
    SELECT id, invited_by_user_id, guest_name FROM public.event_guests
    WHERE event_id = p_event_id AND status = 'aprobado'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.member_debts
      WHERE event_id = p_event_id AND guest_id = v_guest.id
    ) THEN
      INSERT INTO public.member_debts (event_id, club_id, user_id, guest_id, debt_type, description, amount, status)
      VALUES (p_event_id, v_event.club_id, v_guest.invited_by_user_id, v_guest.id, 'invitado', 'Invitado (' || v_guest.guest_name || '): ' || v_event.title, v_cost, 'pendiente');
      v_count := v_count + 1;
    ELSE
      UPDATE public.member_debts
      SET amount = v_cost, club_id = v_event.club_id, updated_at = now()
      WHERE event_id = p_event_id AND guest_id = v_guest.id AND status = 'pendiente';
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'created', v_count,
    'total_cost', v_event.total_cost,
    'total_players', v_total_players,
    'prorrated_cost', v_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Close Event Finances with Custom Debts Scoped to Club
CREATE OR REPLACE FUNCTION public.close_event_finances(
  p_event_id uuid,
  p_custom_debts jsonb DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_event record;
  v_item jsonb;
  v_user_id uuid;
  v_guest_id uuid;
  v_amount integer;
  v_desc text;
  v_debt_type text;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado';
  END IF;

  -- Verify caller is club admin or event creator
  IF NOT (public.is_club_admin(v_event.club_id, auth.uid()) OR auth.uid() = v_event.created_by) THEN
    RAISE EXCEPTION 'Solo el creador o un administrador del club pueden cerrar financieramente el evento';
  END IF;

  IF p_custom_debts IS NOT NULL AND jsonb_array_length(p_custom_debts) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_custom_debts)
    LOOP
      v_user_id := (v_item->>'user_id')::uuid;
      v_guest_id := CASE WHEN v_item->>'guest_id' IS NOT NULL AND v_item->>'guest_id' != '' THEN (v_item->>'guest_id')::uuid ELSE NULL END;
      v_amount := COALESCE((v_item->>'amount')::integer, 0);
      v_desc := COALESCE(v_item->>'description', 'Cuota evento: ' || v_event.title);
      v_debt_type := CASE WHEN v_guest_id IS NOT NULL THEN 'invitado' ELSE 'partido_propio' END;

      IF v_amount > 0 THEN
        IF v_guest_id IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.member_debts
            WHERE event_id = p_event_id AND guest_id = v_guest_id
          ) THEN
            INSERT INTO public.member_debts (event_id, club_id, user_id, guest_id, debt_type, description, amount, status)
            VALUES (p_event_id, v_event.club_id, v_user_id, v_guest_id, v_debt_type, v_desc, v_amount, 'pendiente');
            v_count := v_count + 1;
          ELSE
            UPDATE public.member_debts
            SET amount = v_amount, description = v_desc, club_id = v_event.club_id, updated_at = now()
            WHERE event_id = p_event_id AND guest_id = v_guest_id AND status = 'pendiente';
          END IF;
        ELSE
          IF NOT EXISTS (
            SELECT 1 FROM public.member_debts
            WHERE event_id = p_event_id AND user_id = v_user_id AND debt_type = 'partido_propio'
          ) THEN
            INSERT INTO public.member_debts (event_id, club_id, user_id, debt_type, description, amount, status)
            VALUES (p_event_id, v_event.club_id, v_user_id, v_debt_type, v_desc, v_amount, 'pendiente');
            v_count := v_count + 1;
          ELSE
            UPDATE public.member_debts
            SET amount = v_amount, description = v_desc, club_id = v_event.club_id, updated_at = now()
            WHERE event_id = p_event_id AND user_id = v_user_id AND debt_type = 'partido_propio' AND status = 'pendiente';
          END IF;
        END IF;
      END IF;
    END LOOP;
  ELSE
    PERFORM public.generate_event_debts(p_event_id);
  END IF;

  UPDATE public.events
  SET financial_closed = true,
      financial_closed_at = now()
  WHERE id = p_event_id;

  RETURN jsonb_build_object('success', true, 'processed', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Settle Member Debts Scoped to Club
CREATE OR REPLACE FUNCTION public.settle_member_debts(
  p_user_id uuid,
  p_debt_ids uuid[] DEFAULT NULL,
  p_club_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_settled_count integer := 0;
  v_target_club_id uuid := p_club_id;
BEGIN
  -- If club_id is not passed, deduce from debts or check if actor is admin of user's clubs
  IF v_target_club_id IS NULL AND p_debt_ids IS NOT NULL AND array_length(p_debt_ids, 1) > 0 THEN
    SELECT club_id INTO v_target_club_id FROM public.member_debts WHERE id = p_debt_ids[1];
  END IF;

  IF v_target_club_id IS NOT NULL THEN
    IF NOT public.is_club_admin(v_target_club_id, v_actor_id) THEN
      RAISE EXCEPTION 'Solo los administradores del club pueden sanear deudas';
    END IF;
  ELSE
    -- General admin check
    IF NOT EXISTS (SELECT 1 FROM public.club_members WHERE user_id = v_actor_id AND system_role = 'admin') THEN
      RAISE EXCEPTION 'Solo los administradores pueden sanear deudas';
    END IF;
  END IF;

  IF p_debt_ids IS NOT NULL AND array_length(p_debt_ids, 1) > 0 THEN
    UPDATE public.member_debts
    SET status = 'pagado', paid_at = now(), settled_by = v_actor_id, updated_at = now()
    WHERE id = ANY(p_debt_ids)
      AND user_id = p_user_id
      AND status = 'pendiente'
      AND (v_target_club_id IS NULL OR club_id = v_target_club_id);
  ELSE
    UPDATE public.member_debts
    SET status = 'pagado', paid_at = now(), settled_by = v_actor_id, updated_at = now()
    WHERE user_id = p_user_id
      AND status = 'pendiente'
      AND (v_target_club_id IS NULL OR club_id = v_target_club_id);
  END IF;

  GET DIAGNOSTICS v_settled_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'settled_count', v_settled_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revert Debt to Pending Scoped to Club
CREATE OR REPLACE FUNCTION public.revert_debt_to_pending(p_debt_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_club_id uuid;
BEGIN
  SELECT club_id INTO v_club_id FROM public.member_debts WHERE id = p_debt_id;
  IF v_club_id IS NOT NULL AND NOT public.is_club_admin(v_club_id, v_actor_id) THEN
    RAISE EXCEPTION 'Solo los administradores del club pueden revertir deudas';
  END IF;

  UPDATE public.member_debts
  SET status = 'pendiente', paid_at = NULL, settled_by = NULL, updated_at = now()
  WHERE id = p_debt_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create New Club Atomic RPC
CREATE OR REPLACE FUNCTION public.create_new_club(
  p_name text,
  p_slug text,
  p_description text DEFAULT NULL,
  p_logo_url text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_club_id uuid;
  v_clean_slug text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para crear un club';
  END IF;

  v_clean_slug := lower(regexp_replace(trim(p_slug), '[^a-zA-Z0-9\-]', '', 'g'));
  IF length(v_clean_slug) < 3 THEN
    RAISE EXCEPTION 'El identificador (slug) debe tener al menos 3 caracteres alfanuméricos';
  END IF;

  IF EXISTS (SELECT 1 FROM public.clubs WHERE slug = v_clean_slug) THEN
    RAISE EXCEPTION 'El identificador "%" ya está en uso. Elige otro por favor.', v_clean_slug;
  END IF;

  INSERT INTO public.clubs (name, slug, description, logo_url, created_by, settings)
  VALUES (
    trim(p_name),
    v_clean_slug,
    trim(p_description),
    p_logo_url,
    v_user_id,
    '{"bank_details": {"banco": "", "tipo_cuenta": "", "numero_cuenta": "", "titular": "", "rut": "", "email": ""}}'::jsonb
  )
  RETURNING id INTO v_club_id;

  -- Creator becomes first admin of the club
  INSERT INTO public.club_members (
    club_id,
    user_id,
    system_role,
    sports_role,
    approval_status
  ) VALUES (
    v_club_id,
    v_user_id,
    'admin',
    'jugador',
    'aprobado'
  )
  ON CONFLICT (club_id, user_id)
  DO UPDATE SET system_role = 'admin', approval_status = 'aprobado';

  -- Seed default profile field definitions for the new club
  INSERT INTO public.profile_field_definitions (club_id, field_key, label, field_type, options, is_required, display_order)
  VALUES
    (v_club_id, 'posicion', 'Posición habitual', 'select', '["Arquero", "Defensor", "Mediocampista", "Delantero"]'::jsonb, false, 1),
    (v_club_id, 'numero_camiseta', 'Número de camiseta preferido', 'number', '[]'::jsonb, false, 2),
    (v_club_id, 'pie_habil', 'Pie hábil', 'select', '["Derecho", "Izquierdo", "Ambidiestro"]'::jsonb, false, 3)
  ON CONFLICT DO NOTHING;

  -- Seed initial user stats for creator in this club
  INSERT INTO public.user_stats (user_id, club_id)
  VALUES (v_user_id, v_club_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'club_id', v_club_id, 'slug', v_clean_slug);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Request to Join a Club Atomic RPC
CREATE OR REPLACE FUNCTION public.request_join_club(
  p_club_id uuid,
  p_motivation text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para unirte a un club';
  END IF;

  SELECT * INTO v_existing FROM public.club_members WHERE club_id = p_club_id AND user_id = v_user_id;

  IF FOUND THEN
    IF v_existing.approval_status = 'aprobado' THEN
      RETURN jsonb_build_object('success', true, 'status', 'aprobado', 'message', 'Ya eres miembro de este club');
    ELSE
      -- Re-apply
      UPDATE public.club_members
      SET approval_status = 'pendiente',
          motivation = COALESCE(trim(p_motivation), motivation),
          joined_at = now()
      WHERE club_id = p_club_id AND user_id = v_user_id;
      RETURN jsonb_build_object('success', true, 'status', 'pendiente', 'message', 'Solicitud actualizada');
    END IF;
  END IF;

  INSERT INTO public.club_members (club_id, user_id, system_role, sports_role, approval_status, motivation)
  VALUES (p_club_id, v_user_id, 'member', 'jugador', 'pendiente', trim(p_motivation));

  -- Ensure stats row exists
  INSERT INTO public.user_stats (user_id, club_id)
  VALUES (v_user_id, p_club_id)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'status', 'pendiente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 7. AUTH TRIGGER UPDATE: Link New Users to Default Club
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_default_club_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, system_role, sports_role, approval_status, custom_attributes)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    'member',
    'jugador',
    'pendiente',
    '{}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- Associate new user to default club as 'pendiente'
  SELECT id INTO v_default_club_id FROM public.clubs WHERE slug = 'club-principal' LIMIT 1;
  IF v_default_club_id IS NOT NULL THEN
    INSERT INTO public.club_members (club_id, user_id, system_role, sports_role, approval_status)
    VALUES (v_default_club_id, NEW.id, 'member', 'jugador', 'pendiente')
    ON CONFLICT (club_id, user_id) DO NOTHING;

    INSERT INTO public.user_stats (user_id, club_id)
    VALUES (NEW.id, v_default_club_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES FOR MULTI-CLUB
-- ==============================================================================

-- A. CLUBS POLICIES
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clubs are viewable by authenticated users" ON public.clubs;
CREATE POLICY "Clubs are viewable by authenticated users"
  ON public.clubs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create a club" ON public.clubs;
CREATE POLICY "Authenticated users can create a club"
  ON public.clubs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Club admins can update their club" ON public.clubs;
CREATE POLICY "Club admins can update their club"
  ON public.clubs FOR UPDATE
  TO authenticated
  USING (public.is_club_admin(id, auth.uid()))
  WITH CHECK (public.is_club_admin(id, auth.uid()));

DROP POLICY IF EXISTS "Club admins can delete their club" ON public.clubs;
CREATE POLICY "Club admins can delete their club"
  ON public.clubs FOR DELETE
  TO authenticated
  USING (public.is_club_admin(id, auth.uid()));

-- B. CLUB_MEMBERS POLICIES
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members are viewable by club members or self" ON public.club_members;
CREATE POLICY "Members are viewable by club members or self"
  ON public.club_members FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_club_member(club_id, auth.uid())
    OR public.is_club_admin(club_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert their own membership or admin can" ON public.club_members;
CREATE POLICY "Users can insert their own membership or admin can"
  ON public.club_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_club_admin(club_id, auth.uid())
  );

DROP POLICY IF EXISTS "Club admins can update members or user updates self attributes" ON public.club_members;
CREATE POLICY "Club admins can update members or user updates self attributes"
  ON public.club_members FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_club_admin(club_id, auth.uid())
  )
  WITH CHECK (
    (user_id = auth.uid() AND system_role = (SELECT system_role FROM public.club_members WHERE club_id = club_members.club_id AND user_id = auth.uid()))
    OR public.is_club_admin(club_id, auth.uid())
  );

DROP POLICY IF EXISTS "Club admins or self can delete membership" ON public.club_members;
CREATE POLICY "Club admins or self can delete membership"
  ON public.club_members FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_club_admin(club_id, auth.uid())
  );

-- C. EVENTS POLICIES
DROP POLICY IF EXISTS "Events viewable by authenticated users" ON public.events;
DROP POLICY IF EXISTS "Events viewable by club members" ON public.events;
CREATE POLICY "Events viewable by club members"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    public.is_club_member(club_id, auth.uid())
    OR public.is_club_admin(club_id, auth.uid())
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Members can insert events" ON public.events;
DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
DROP POLICY IF EXISTS "Club members can insert events" ON public.events;
CREATE POLICY "Club members can insert events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_club_member(club_id, auth.uid())
    OR public.is_club_admin(club_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins and creators can update events" ON public.events;
CREATE POLICY "Admins and creators can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.is_club_admin(club_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = created_by
    OR public.is_club_admin(club_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR public.is_club_admin(club_id, auth.uid())
  );

-- D. EVENT ATTENDEES POLICIES
DROP POLICY IF EXISTS "Attendees viewable by authenticated users" ON public.event_attendees;
DROP POLICY IF EXISTS "Attendees viewable by club members" ON public.event_attendees;
CREATE POLICY "Attendees viewable by club members"
  ON public.event_attendees FOR SELECT
  TO authenticated
  USING (
    public.is_event_club_member(event_id, auth.uid())
    OR public.is_event_club_admin(event_id, auth.uid())
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can register themselves or admin" ON public.event_attendees;
CREATE POLICY "Users can register themselves or admin"
  ON public.event_attendees FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id AND public.is_event_club_member(event_id, auth.uid()))
    OR public.is_event_club_admin(event_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own attendance or admin" ON public.event_attendees;
CREATE POLICY "Users can update own attendance or admin"
  ON public.event_attendees FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_event_club_admin(event_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_event_club_admin(event_id, auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own attendance or admin" ON public.event_attendees;
CREATE POLICY "Users can delete own attendance or admin"
  ON public.event_attendees FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_event_club_admin(event_id, auth.uid())
  );

-- E. EVENT GUESTS POLICIES
DROP POLICY IF EXISTS "Guests viewable by authenticated users" ON public.event_guests;
DROP POLICY IF EXISTS "Guests viewable by club members" ON public.event_guests;
CREATE POLICY "Guests viewable by club members"
  ON public.event_guests FOR SELECT
  TO authenticated
  USING (
    public.is_event_club_member(event_id, auth.uid())
    OR public.is_event_club_admin(event_id, auth.uid())
    OR invited_by_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can submit guest invitations" ON public.event_guests;
CREATE POLICY "Users can submit guest invitations"
  ON public.event_guests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = invited_by_user_id
    AND public.is_event_club_member(event_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins or inviter can update guest" ON public.event_guests;
CREATE POLICY "Admins or inviter can update guest"
  ON public.event_guests FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = invited_by_user_id
    OR public.is_event_club_admin(event_id, auth.uid())
  )
  WITH CHECK (
    auth.uid() = invited_by_user_id
    OR public.is_event_club_admin(event_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins or inviter can delete guest" ON public.event_guests;
CREATE POLICY "Admins or inviter can delete guest"
  ON public.event_guests FOR DELETE
  TO authenticated
  USING (
    auth.uid() = invited_by_user_id
    OR public.is_event_club_admin(event_id, auth.uid())
  );

-- F. MEMBER DEBTS POLICIES
DROP POLICY IF EXISTS "Users can view own debts, admins view all" ON public.member_debts;
CREATE POLICY "Users can view own debts, admins view all"
  ON public.member_debts FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_club_admin(club_id, auth.uid())
    OR public.is_event_club_admin(event_id, auth.uid())
  );

DROP POLICY IF EXISTS "Admins and event creators can insert debts" ON public.member_debts;
CREATE POLICY "Admins and event creators can insert debts"
  ON public.member_debts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_club_admin(club_id, auth.uid())
    OR public.is_event_club_admin(event_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events WHERE id = event_id AND created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only admins can update debts" ON public.member_debts;
CREATE POLICY "Only admins can update debts"
  ON public.member_debts FOR UPDATE
  TO authenticated
  USING (
    public.is_club_admin(club_id, auth.uid())
    OR public.is_event_club_admin(event_id, auth.uid())
  )
  WITH CHECK (
    public.is_club_admin(club_id, auth.uid())
    OR public.is_event_club_admin(event_id, auth.uid())
  );

DROP POLICY IF EXISTS "Only admins can delete debts" ON public.member_debts;
CREATE POLICY "Only admins can delete debts"
  ON public.member_debts FOR DELETE
  TO authenticated
  USING (
    public.is_club_admin(club_id, auth.uid())
    OR public.is_event_club_admin(event_id, auth.uid())
  );

-- G. MVP VOTES POLICIES
DROP POLICY IF EXISTS "Voters view own vote, all viewable when closed or by admin" ON public.mvp_votes;
CREATE POLICY "Voters view own vote, all viewable when closed or by admin"
  ON public.mvp_votes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = voter_id
    OR public.is_event_club_admin(event_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = mvp_votes.event_id
        AND e.mvp_voting_open = false
        AND e.status = 'finalizado'
        AND public.is_club_member(e.club_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can cast their MVP vote when open" ON public.mvp_votes;
CREATE POLICY "Users can cast their MVP vote when open"
  ON public.mvp_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND voter_id <> voted_player_id
    AND public.is_event_club_member(event_id, auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = mvp_votes.event_id
        AND e.mvp_voting_open = true
    )
  );

-- H. USER STATS POLICIES
DROP POLICY IF EXISTS "Stats viewable by authenticated users" ON public.user_stats;
CREATE POLICY "Stats viewable by authenticated users"
  ON public.user_stats FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_club_member(club_id, auth.uid())
    OR public.is_club_admin(club_id, auth.uid())
  );

DROP POLICY IF EXISTS "Stats modified by admin" ON public.user_stats;
CREATE POLICY "Stats modified by admin"
  ON public.user_stats FOR ALL
  TO authenticated
  USING (
    public.is_club_admin(club_id, auth.uid())
  )
  WITH CHECK (
    public.is_club_admin(club_id, auth.uid())
  );

-- I. PROFILE FIELD DEFINITIONS POLICIES
DROP POLICY IF EXISTS "Field definitions viewable by authenticated users" ON public.profile_field_definitions;
CREATE POLICY "Field definitions viewable by authenticated users"
  ON public.profile_field_definitions FOR SELECT
  TO authenticated
  USING (
    public.is_club_member(club_id, auth.uid())
    OR public.is_club_admin(club_id, auth.uid())
  );

DROP POLICY IF EXISTS "Only admins can modify field definitions" ON public.profile_field_definitions;
CREATE POLICY "Only admins can modify field definitions"
  ON public.profile_field_definitions FOR ALL
  TO authenticated
  USING (
    public.is_club_admin(club_id, auth.uid())
  )
  WITH CHECK (
    public.is_club_admin(club_id, auth.uid())
  );

-- ==============================================================================
-- 9. SUPABASE REALTIME CONFIGURATION FOR CLUBS AND CLUB_MEMBERS
-- ==============================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.clubs;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.club_members;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
