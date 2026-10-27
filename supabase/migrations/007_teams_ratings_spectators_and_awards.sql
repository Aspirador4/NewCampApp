-- ==============================================================================
-- Migration: 007_teams_ratings_spectators_and_awards.sql
-- Description:
-- 1. Spectator mode in events (attendance_type: 'jugador' | 'espectador')
-- 2. Training overcapacity (is_overcapacity for guest attendees)
-- 3. Match team builder (event_teams, event_team_players, teams_published, result_recorded)
-- 4. Triple post-match awards (mvp, mejor_compañero, jugador_sorpresa)
-- 5. Peer evaluations (match_player_ratings with 1-10 scores, scoped to club)
-- 6. User stats expansions (ratings, awards, match W/L/D, goals, assists)
-- 7. Updated join_event, leave_event, and finalize_event_mvp RPCs
-- ==============================================================================

-- 1. Add attendance_type to event_attendees
ALTER TABLE public.event_attendees 
  ADD COLUMN IF NOT EXISTS attendance_type text NOT NULL DEFAULT 'jugador' CHECK (attendance_type IN ('jugador', 'espectador'));

CREATE INDEX IF NOT EXISTS idx_event_attendees_type ON public.event_attendees(event_id, attendance_type, status);

-- 2. Add is_overcapacity to event_guests
ALTER TABLE public.event_guests
  ADD COLUMN IF NOT EXISTS is_overcapacity boolean NOT NULL DEFAULT false;

-- 3. Add team builder and result flags to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS teams_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS result_recorded boolean NOT NULL DEFAULT false;

-- 4. Create event_teams table
CREATE TABLE IF NOT EXISTS public.event_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#ffffff',
  score integer DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_teams_event ON public.event_teams(event_id);

-- 5. Create event_team_players table
CREATE TABLE IF NOT EXISTS public.event_team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.event_teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_position text DEFAULT 'Jugador',
  goals integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,
  saves integer NOT NULL DEFAULT 0,
  own_goals integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_event_team_player UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_team_players_event ON public.event_team_players(event_id);
CREATE INDEX IF NOT EXISTS idx_event_team_players_team ON public.event_team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_event_team_players_user ON public.event_team_players(user_id);

-- 6. Create match_player_ratings table (Private peer ratings 1-10)
CREATE TABLE IF NOT EXISTS public.match_player_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluated_player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating numeric(3,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 10.0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_match_evaluator_evaluated UNIQUE (event_id, evaluator_id, evaluated_player_id),
  CONSTRAINT chk_no_self_rating CHECK (evaluator_id <> evaluated_player_id)
);

CREATE INDEX IF NOT EXISTS idx_match_ratings_event ON public.match_player_ratings(event_id);
CREATE INDEX IF NOT EXISTS idx_match_ratings_club ON public.match_player_ratings(club_id);
CREATE INDEX IF NOT EXISTS idx_match_ratings_evaluated ON public.match_player_ratings(evaluated_player_id);

-- 7. Expand mvp_votes to support multiple award categories
ALTER TABLE public.mvp_votes
  ADD COLUMN IF NOT EXISTS award_type text NOT NULL DEFAULT 'mvp' 
  CHECK (award_type IN ('mvp', 'mejor_compañero', 'jugador_sorpresa'));

-- Drop old unique constraint and add new one with award_type
ALTER TABLE public.mvp_votes DROP CONSTRAINT IF EXISTS mvp_votes_event_voter_key;
ALTER TABLE public.mvp_votes 
  ADD CONSTRAINT mvp_votes_event_voter_award_key UNIQUE (event_id, voter_id, award_type);

-- 8. Expand user_stats with performance and award metrics
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS best_teammate_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surprise_player_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating numeric(3,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS last_match_rating numeric(3,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS previous_average_rating numeric(3,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ratings_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_history_ratings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS goals integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assists integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matches_won integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matches_lost integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matches_tied integer NOT NULL DEFAULT 0;

-- 9. Update join_event RPC with attendance_type support
CREATE OR REPLACE FUNCTION public.join_event(
  p_event_id uuid, 
  p_user_id uuid,
  p_attendance_type text DEFAULT 'jugador'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event record;
  v_confirmed_count integer;
  v_approved_guests_count integer;
  v_target_status text;
  v_action text;
  v_existing_status text;
  v_type text := COALESCE(p_attendance_type, 'jugador');
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
    -- If already confirmed as same type, return
    -- Allow switching from spectator to player or vice versa
    UPDATE public.event_attendees
    SET attendance_type = v_type
    WHERE event_id = p_event_id AND user_id = p_user_id;
    
    RETURN jsonb_build_object('success', true, 'status', v_existing_status, 'attendance_type', v_type);
  END IF;

  IF v_type = 'espectador' THEN
    -- Spectator never takes a player slot and never enters waitlist
    v_target_status := 'confirmado';
    v_action := 'confirmo_espectador';
  ELSE
    -- Player slot logic
    SELECT count(*) INTO v_confirmed_count
    FROM public.event_attendees
    WHERE event_id = p_event_id AND status = 'confirmado' AND attendance_type = 'jugador';

    -- Count approved non-overcapacity guests
    SELECT count(*) INTO v_approved_guests_count
    FROM public.event_guests
    WHERE event_id = p_event_id AND status = 'aprobado' AND is_overcapacity IS FALSE;

    -- Determine target status
    IF v_event.max_capacity IS NULL OR (v_confirmed_count + v_approved_guests_count) < v_event.max_capacity THEN
      v_target_status := 'confirmado';
      v_action := 'confirmo';
    ELSE
      v_target_status := 'lista_espera';
      v_action := 'entro_espera';
    END IF;
  END IF;

  -- Upsert attendee
  INSERT INTO public.event_attendees (event_id, user_id, status, attendance_type, registered_at)
  VALUES (p_event_id, p_user_id, v_target_status, v_type, now())
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = v_target_status, attendance_type = v_type, registered_at = now();

  -- Audit log
  INSERT INTO public.event_attendance_logs (event_id, user_id, actor_id, action)
  VALUES (p_event_id, p_user_id, p_user_id, v_action);

  RETURN jsonb_build_object('success', true, 'status', v_target_status, 'attendance_type', v_type);
END;
$function$;

-- 10. Update leave_event RPC to only promote if leaving user was a player
CREATE OR REPLACE FUNCTION public.leave_event(
  p_event_id uuid, 
  p_user_id uuid, 
  p_actor_id uuid, 
  p_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status text;
  v_current_type text;
  v_promoted_user_id uuid := NULL;
  v_promoted_user_name text := NULL;
BEGIN
  -- Check user current status and type
  SELECT status, attendance_type INTO v_current_status, v_current_type
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

  -- If cancelled user was a confirmed player, promote next person from waitlist
  IF v_current_status = 'confirmado' AND v_current_type = 'jugador' THEN
    SELECT a.user_id, p.full_name INTO v_promoted_user_id, v_promoted_user_name
    FROM public.event_attendees a
    JOIN public.profiles p ON p.id = a.user_id
    WHERE a.event_id = p_event_id AND a.status = 'lista_espera'
    ORDER BY a.registered_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_promoted_user_id IS NOT NULL THEN
      UPDATE public.event_attendees
      SET status = 'confirmado', attendance_type = 'jugador'
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
$function$;

-- 11. Update finalize_event_mvp to calculate all 3 awards and respect spectator type
CREATE OR REPLACE FUNCTION public.finalize_event_mvp(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_event record;
  v_category text;
  v_max_votes integer;
  v_winners uuid[];
  v_winner uuid;
  v_vote record;
  v_attendee record;
  v_all_winners jsonb := '{}'::jsonb;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado';
  END IF;

  -- Close voting
  UPDATE public.events
  SET mvp_voting_open = false, status = 'finalizado'
  WHERE id = p_event_id;

  -- Process each award category
  FOREACH v_category IN ARRAY ARRAY['mvp', 'mejor_compañero', 'jugador_sorpresa']
  LOOP
    SELECT COALESCE(MAX(vote_cnt), 0) INTO v_max_votes
    FROM (
      SELECT count(*) as vote_cnt
      FROM public.mvp_votes
      WHERE event_id = p_event_id AND award_type = v_category
      GROUP BY voted_player_id
    ) counts;

    IF v_max_votes > 0 THEN
      SELECT array_agg(voted_player_id) INTO v_winners
      FROM (
        SELECT voted_player_id
        FROM public.mvp_votes
        WHERE event_id = p_event_id AND award_type = v_category
        GROUP BY voted_player_id
        HAVING count(*) = v_max_votes
      ) winners_sub;

      IF v_winners IS NOT NULL THEN
        v_all_winners := v_all_winners || jsonb_build_object(v_category, to_jsonb(v_winners));
        
        FOREACH v_winner IN ARRAY v_winners
        LOOP
          IF v_category = 'mvp' THEN
            INSERT INTO public.user_stats (user_id, club_id, mvp_count)
            VALUES (v_winner, v_event.club_id, 1)
            ON CONFLICT (user_id, club_id)
            DO UPDATE SET mvp_count = public.user_stats.mvp_count + 1, updated_at = now();
          ELSIF v_category = 'mejor_compañero' THEN
            INSERT INTO public.user_stats (user_id, club_id, best_teammate_count)
            VALUES (v_winner, v_event.club_id, 1)
            ON CONFLICT (user_id, club_id)
            DO UPDATE SET best_teammate_count = public.user_stats.best_teammate_count + 1, updated_at = now();
          ELSIF v_category = 'jugador_sorpresa' THEN
            INSERT INTO public.user_stats (user_id, club_id, surprise_player_count)
            VALUES (v_winner, v_event.club_id, 1)
            ON CONFLICT (user_id, club_id)
            DO UPDATE SET surprise_player_count = public.user_stats.surprise_player_count + 1, updated_at = now();
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  -- Update mvp_votes_received for stats
  FOR v_vote IN
    SELECT voted_player_id, count(*) as vote_cnt
    FROM public.mvp_votes
    WHERE event_id = p_event_id AND award_type = 'mvp'
    GROUP BY voted_player_id
  LOOP
    INSERT INTO public.user_stats (user_id, club_id, mvp_votes_received)
    VALUES (v_vote.voted_player_id, v_event.club_id, v_vote.vote_cnt)
    ON CONFLICT (user_id, club_id)
    DO UPDATE SET mvp_votes_received = public.user_stats.mvp_votes_received + v_vote.vote_cnt, updated_at = now();
  END LOOP;

  -- Increment matches_played ONLY for confirmed PLAYERS
  FOR v_attendee IN
    SELECT user_id, attendance_type
    FROM public.event_attendees
    WHERE event_id = p_event_id AND status = 'confirmado'
  LOOP
    IF v_attendee.attendance_type = 'jugador' AND v_event.event_type IN ('partido', 'torneo') THEN
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
    'winners', v_all_winners
  );
END;
$function$;

-- 12. RLS Policies
ALTER TABLE public.event_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_player_ratings ENABLE ROW LEVEL SECURITY;

-- event_teams policies
DROP POLICY IF EXISTS "Members can view event teams" ON public.event_teams;
CREATE POLICY "Members can view event teams"
  ON public.event_teams FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_teams.event_id 
    AND public.is_club_member(e.club_id, auth.uid())
  ));

DROP POLICY IF EXISTS "Admins or creators can manage event teams" ON public.event_teams;
CREATE POLICY "Admins or creators can manage event teams"
  ON public.event_teams FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_teams.event_id 
    AND (e.created_by = auth.uid() OR public.is_club_admin(e.club_id, auth.uid()))
  ));

-- event_team_players policies
DROP POLICY IF EXISTS "Members can view published event team players" ON public.event_team_players;
CREATE POLICY "Members can view published event team players"
  ON public.event_team_players FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_team_players.event_id 
    AND public.is_club_member(e.club_id, auth.uid())
    AND (e.teams_published = true OR e.created_by = auth.uid() OR public.is_club_admin(e.club_id, auth.uid()))
  ));

DROP POLICY IF EXISTS "Admins or creators can manage event team players" ON public.event_team_players;
CREATE POLICY "Admins or creators can manage event team players"
  ON public.event_team_players FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_team_players.event_id 
    AND (e.created_by = auth.uid() OR public.is_club_admin(e.club_id, auth.uid()))
  ));

-- match_player_ratings policies
DROP POLICY IF EXISTS "Users can view their own cast ratings or admins view all" ON public.match_player_ratings;
CREATE POLICY "Users can view their own cast ratings or admins view all"
  ON public.match_player_ratings FOR SELECT
  USING (
    evaluator_id = auth.uid() 
    OR public.is_club_admin(club_id, auth.uid())
    OR evaluated_player_id = auth.uid()
  );

DROP POLICY IF EXISTS "Eligible users can insert peer ratings" ON public.match_player_ratings;
CREATE POLICY "Eligible users can insert peer ratings"
  ON public.match_player_ratings FOR INSERT
  WITH CHECK (
    evaluator_id = auth.uid()
    AND evaluator_id <> evaluated_player_id
    AND (
      public.is_club_admin(club_id, auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.event_attendees a1
        JOIN public.event_attendees a2 ON a1.event_id = a2.event_id
        WHERE a1.event_id = match_player_ratings.event_id
        AND a1.user_id = auth.uid() AND a1.status = 'confirmado'
        AND a2.user_id = match_player_ratings.evaluated_player_id AND a2.status = 'confirmado'
      )
    )
  );
