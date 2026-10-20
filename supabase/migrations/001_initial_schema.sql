-- Migration: 001_initial_schema.sql
-- Description: Complete initial schema for Sports Club PWA
-- Tables: profiles, profile_field_definitions, events, event_attendees, event_guests, event_attendance_logs, mvp_votes, user_stats, push_subscriptions
-- Includes: RLS policies, triggers, indexes, and atomic helper functions

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. HELPER FUNCTIONS & TRIGGERS (Security Definer)
-- ==============================================================================

-- Admin check function (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND system_role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. TABLE DEFINITIONS
-- ==============================================================================

-- A. PROFILES (Extends auth.users with mutable JSONB attributes)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  avatar_url text,
  birth_date date,
  system_role text NOT NULL DEFAULT 'member' CHECK (system_role IN ('admin', 'member')),
  sports_role text NOT NULL DEFAULT 'jugador' CHECK (sports_role IN ('jugador', 'hincha', 'ambos')),
  custom_attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS tr_profiles_updated_at ON public.profiles;
CREATE TRIGGER tr_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- B. PROFILE FIELD DEFINITIONS (Mutable Profile Configuration)
CREATE TABLE IF NOT EXISTS public.profile_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  label text NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('text', 'number', 'select', 'boolean')),
  options jsonb DEFAULT '[]'::jsonb,
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- C. EVENTS
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL CHECK (event_type IN ('partido', 'entrenamiento', 'torneo', 'asado', 'otro')),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location text NOT NULL,
  max_capacity integer CHECK (max_capacity IS NULL OR max_capacity > 0),
  status text NOT NULL DEFAULT 'convocado' CHECK (status IN ('convocado', 'en_curso', 'finalizado', 'cancelado')),
  mvp_voting_open boolean NOT NULL DEFAULT false,
  mvp_voting_deadline timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS tr_events_updated_at ON public.events;
CREATE TRIGGER tr_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- D. EVENT ATTENDEES (Capacity & Waitlist)
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmado' CHECK (status IN ('confirmado', 'lista_espera', 'cancelado')),
  registered_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_attendees_event_user_key UNIQUE (event_id, user_id)
);

-- E. EVENT GUESTS (Guest Management & Admin Moderation)
CREATE TABLE IF NOT EXISTS public.event_guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  invited_by_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  guest_contact text,
  status text NOT NULL DEFAULT 'pendiente_aprobacion' CHECK (status IN ('pendiente_aprobacion', 'aprobado', 'rechazado')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- F. EVENT ATTENDANCE LOGS (Full Audit Trail)
CREATE TABLE IF NOT EXISTS public.event_attendance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('confirmo', 'bajo', 'entro_espera', 'subio_espera', 'solicito_invitado', 'invitado_aprobado', 'invitado_rechazado')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- G. MVP VOTES (Post-event voting & validation)
CREATE TABLE IF NOT EXISTS public.mvp_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  voted_player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mvp_votes_event_voter_key UNIQUE (event_id, voter_id),
  CONSTRAINT mvp_votes_no_self_vote CHECK (voter_id <> voted_player_id)
);

-- H. USER STATS (Mutable Stats Engine with JSONB)
CREATE TABLE IF NOT EXISTS public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  matches_played integer NOT NULL DEFAULT 0,
  mvp_count integer NOT NULL DEFAULT 0,
  mvp_votes_received integer NOT NULL DEFAULT 0,
  social_events_attended integer NOT NULL DEFAULT 0,
  mutable_stats jsonb NOT NULL DEFAULT '{"matches_won": 0, "matches_lost": 0, "matches_tied": 0, "goals": 0}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS tr_user_stats_updated_at ON public.user_stats;
CREATE TRIGGER tr_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- I. PUSH SUBSCRIPTIONS (VAPID Web Push)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  keys_p256dh text NOT NULL,
  keys_auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_user_endpoint_key UNIQUE (user_id, endpoint)
);

-- ==============================================================================
-- 3. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_system_role ON public.profiles(system_role);
CREATE INDEX IF NOT EXISTS idx_profile_field_defs_order ON public.profile_field_definitions(display_order);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON public.events(start_time);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_status ON public.event_attendees(status);
CREATE INDEX IF NOT EXISTS idx_event_attendees_registered_at ON public.event_attendees(registered_at);
CREATE INDEX IF NOT EXISTS idx_event_guests_event_id ON public.event_guests(event_id);
CREATE INDEX IF NOT EXISTS idx_event_guests_status ON public.event_guests(status);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_event_id ON public.event_attendance_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON public.event_attendance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mvp_votes_event_id ON public.mvp_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_mvp_votes_voted_player ON public.mvp_votes(voted_player_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);

-- ==============================================================================
-- 4. AUTH TRIGGER: AUTO-CREATE PROFILE & USER_STATS ON SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, system_role, sports_role, custom_attributes)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    'member',
    'jugador',
    '{}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 5. ATOMIC BUSINESS LOGIC RPCs
-- ==============================================================================

-- Atomic Join Event with Automatic Waitlist
CREATE OR REPLACE FUNCTION public.join_event(
  p_event_id uuid,
  p_user_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_max_capacity integer;
  v_event_status text;
  v_confirmed_count integer;
  v_approved_guests_count integer;
  v_target_status text;
  v_action text;
  v_existing_status text;
BEGIN
  -- Get event details
  SELECT max_capacity, status INTO v_max_capacity, v_event_status
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado';
  END IF;

  IF v_event_status NOT IN ('convocado', 'en_curso') THEN
    RAISE EXCEPTION 'El evento ya no acepta inscripciones';
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

  -- Determine if user is confirmed or waitlisted
  IF v_max_capacity IS NULL OR (v_confirmed_count + v_approved_guests_count) < v_max_capacity THEN
    v_target_status := 'confirmado';
    v_action := 'confirmo';
  ELSE
    v_target_status := 'lista_espera';
    v_action := 'entro_espera';
  END IF;

  -- Upsert attendee record
  INSERT INTO public.event_attendees (event_id, user_id, status, registered_at)
  VALUES (p_event_id, p_user_id, v_target_status, now())
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = v_target_status, registered_at = now();

  -- Insert audit log
  INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action)
  VALUES (p_event_id, p_user_id, p_user_id, v_action);

  RETURN jsonb_build_object('success', true, 'status', v_target_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic Finalize Event MVP & Increment Stats
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

    -- Update mvp_count for winners
    UPDATE public.user_stats
    SET mvp_count = mvp_count + 1
    WHERE user_id = ANY(v_winners);
  END IF;

  -- Update votes received for all who got votes
  FOR v_vote IN
    SELECT voted_player_id, count(*) as vote_cnt
    FROM public.mvp_votes
    WHERE event_id = p_event_id
    GROUP BY voted_player_id
  LOOP
    UPDATE public.user_stats
    SET mvp_votes_received = mvp_votes_received + v_vote.vote_cnt
    WHERE user_id = v_vote.voted_player_id;
  END LOOP;

  -- Increment matches_played for confirmed attendees
  FOR v_attendee IN
    SELECT user_id
    FROM public.event_attendees
    WHERE event_id = p_event_id AND status = 'confirmado'
  LOOP
    IF v_event.event_type IN ('partido', 'torneo') THEN
      UPDATE public.user_stats
      SET matches_played = matches_played + 1
      WHERE user_id = v_attendee.user_id;
    ELSE
      UPDATE public.user_stats
      SET social_events_attended = social_events_attended + 1
      WHERE user_id = v_attendee.user_id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'max_votes', v_max_votes,
    'winner_ids', COALESCE(v_winners, ARRAY[]::uuid[])
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mvp_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile, admins can update any" ON public.profiles;
CREATE POLICY "Users can update own profile, admins can update any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (
    (auth.uid() = id AND (system_role = (SELECT system_role FROM public.profiles WHERE id = auth.uid()) OR public.is_admin(auth.uid())))
    OR public.is_admin(auth.uid())
  );

-- Profile Field Definitions Policies
DROP POLICY IF EXISTS "Field definitions viewable by authenticated users" ON public.profile_field_definitions;
CREATE POLICY "Field definitions viewable by authenticated users"
  ON public.profile_field_definitions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can modify field definitions" ON public.profile_field_definitions;
CREATE POLICY "Only admins can modify field definitions"
  ON public.profile_field_definitions FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Events Policies
DROP POLICY IF EXISTS "Events viewable by authenticated users" ON public.events;
CREATE POLICY "Events viewable by authenticated users"
  ON public.events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert events" ON public.events;
CREATE POLICY "Admins can insert events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update events" ON public.events;
CREATE POLICY "Admins can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete events" ON public.events;
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Event Attendees Policies
DROP POLICY IF EXISTS "Attendees viewable by authenticated users" ON public.event_attendees;
CREATE POLICY "Attendees viewable by authenticated users"
  ON public.event_attendees FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can register themselves or admin" ON public.event_attendees;
CREATE POLICY "Users can register themselves or admin"
  ON public.event_attendees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can update own attendance or admin" ON public.event_attendees;
CREATE POLICY "Users can update own attendance or admin"
  ON public.event_attendees FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can delete own attendance or admin" ON public.event_attendees;
CREATE POLICY "Users can delete own attendance or admin"
  ON public.event_attendees FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Event Guests Policies
DROP POLICY IF EXISTS "Guests viewable by authenticated users" ON public.event_guests;
CREATE POLICY "Guests viewable by authenticated users"
  ON public.event_guests FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can submit guest invitations" ON public.event_guests;
CREATE POLICY "Users can submit guest invitations"
  ON public.event_guests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = invited_by_user_id);

DROP POLICY IF EXISTS "Admins or inviter can update guest" ON public.event_guests;
CREATE POLICY "Admins or inviter can update guest"
  ON public.event_guests FOR UPDATE
  TO authenticated
  USING (auth.uid() = invited_by_user_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = invited_by_user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins or inviter can delete guest" ON public.event_guests;
CREATE POLICY "Admins or inviter can delete guest"
  ON public.event_guests FOR DELETE
  TO authenticated
  USING (auth.uid() = invited_by_user_id OR public.is_admin(auth.uid()));

-- Event Attendance Logs Policies
DROP POLICY IF EXISTS "Attendance logs viewable by authenticated users" ON public.event_attendance_logs;
CREATE POLICY "Attendance logs viewable by authenticated users"
  ON public.event_attendance_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users and admins can record logs" ON public.event_attendance_logs;
CREATE POLICY "Authenticated users and admins can record logs"
  ON public.event_attendance_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = actor_id OR public.is_admin(auth.uid()));

-- MVP Votes Policies
DROP POLICY IF EXISTS "Voters view own vote, all viewable when closed or by admin" ON public.mvp_votes;
CREATE POLICY "Voters view own vote, all viewable when closed or by admin"
  ON public.mvp_votes FOR SELECT
  TO authenticated
  USING (
    auth.uid() = voter_id 
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = mvp_votes.event_id 
        AND e.mvp_voting_open = false 
        AND e.status = 'finalizado'
    )
  );

DROP POLICY IF EXISTS "Users can cast their MVP vote when open" ON public.mvp_votes;
CREATE POLICY "Users can cast their MVP vote when open"
  ON public.mvp_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = voter_id
    AND voter_id <> voted_player_id
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = mvp_votes.event_id 
        AND e.mvp_voting_open = true
    )
  );

-- User Stats Policies
DROP POLICY IF EXISTS "Stats viewable by authenticated users" ON public.user_stats;
CREATE POLICY "Stats viewable by authenticated users"
  ON public.user_stats FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Stats modified by admin" ON public.user_stats;
CREATE POLICY "Stats modified by admin"
  ON public.user_stats FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Push Subscriptions Policies
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users view own subscriptions"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users insert own subscriptions"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users delete own subscriptions"
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ==============================================================================
-- 7. SEED DATA & STORAGE
-- ==============================================================================

-- Seed initial dynamic profile field definitions
INSERT INTO public.profile_field_definitions (field_key, label, field_type, options, is_required, display_order)
VALUES
  ('posicion', 'Posición habitual', 'select', '["Arquero", "Defensor", "Mediocampista", "Delantero"]'::jsonb, false, 1),
  ('numero_camiseta', 'Número de camiseta preferido', 'number', '[]'::jsonb, false, 2),
  ('pie_habil', 'Pie hábil', 'select', '["Derecho", "Izquierdo", "Ambidiestro"]'::jsonb, false, 3)
ON CONFLICT (field_key) DO NOTHING;

-- Storage Bucket: avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatar images" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatar images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can update their avatar images" ON storage.objects;
CREATE POLICY "Authenticated users can update their avatar images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can delete their avatar images" ON storage.objects;
CREATE POLICY "Authenticated users can delete their avatar images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');
